"""Import ponctuel de documents culinaires. Aucun document n'est conservé."""
from __future__ import annotations

import asyncio
import base64
from io import BytesIO
from PIL import Image, ImageOps
import ipaddress
import re
import socket
from pathlib import Path
from urllib.parse import urlsplit

import aiohttp
from pypdf import PdfReader
from .recipe_document_parser import parse_recipe_text

MAX_BYTES = 8 * 1024 * 1024
MAX_PAGES = 15


class DocumentImportError(ValueError):
    pass


def _extract_pdf(data: bytes) -> str:
    reader = PdfReader(BytesIO(data), strict=False)
    if len(reader.pages) > MAX_PAGES:
        raise DocumentImportError(f"PDF trop long (maximum {MAX_PAGES} pages)")
    return "\n".join(page.extract_text(extraction_mode="layout") or "" for page in reader.pages)


def _preview_image(raw: bytes) -> tuple[int, str] | None:
    """Convertit une illustration en miniature JPEG ; aucun original n'est conservé."""
    try:
        with Image.open(BytesIO(raw)) as image:
            width, height = image.size
            if width < 220 or height < 150 or width * height < 100_000:
                return None
            image = ImageOps.exif_transpose(image)
            image.thumbnail((960, 960))
            if image.mode in ("RGBA", "LA", "P"):
                rgba = image.convert("RGBA")
                background = Image.new("RGB", rgba.size, "white")
                background.paste(rgba, mask=rgba.getchannel("A"))
                image = background
            else:
                image = image.convert("RGB")
            output = BytesIO()
            image.save(output, format="JPEG", quality=78, optimize=True)
            if output.tell() > 350_000:
                return None
            return width * height, "data:image/jpeg;base64," + base64.b64encode(output.getvalue()).decode("ascii")
    except (OSError, ValueError):
        return None


def _extract_pdf_image(data: bytes) -> str | None:
    """Choisit la plus grande illustration exploitable du PDF (logos écartés)."""
    reader = PdfReader(BytesIO(data), strict=False)
    if len(reader.pages) > MAX_PAGES:
        return None
    candidates = []
    for page in reader.pages:
        try:
            images = page.images
        except Exception:
            continue
        for image in list(images)[:30]:
            try:
                preview = _preview_image(image.data)
                if preview:
                    candidates.append(preview)
            except Exception:
                continue
    return max(candidates, key=lambda x: x[0])[1] if candidates else None


def _parse_text(text: str, filename: str = "") -> dict:
    try:
        return parse_recipe_text(text, filename)
    except ValueError as err:
        raise DocumentImportError(str(err)) from err


async def _fetch_url(session: aiohttp.ClientSession, url: str, allowed_hosts: str) -> tuple[bytes, str]:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname or parts.username or parts.password:
        raise DocumentImportError("Adresse HTTP(S) invalide")
    host = parts.hostname.lower().rstrip(".")
    allowed = {x.strip().lower().rstrip(".") for x in allowed_hosts.split(",") if x.strip()}
    if host not in allowed:
        raise DocumentImportError("Hôte non autorisé : ajoutez-le aux options HOLM (hôtes d'importation HTTP)")
    # Reject loopback, link-local, unspecified, multicast and metadata endpoints.
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, parts.port or (443 if parts.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except OSError as err:
        raise DocumentImportError(f"Nom d'hôte introuvable : {err}") from err
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_unspecified or ip.is_reserved:
            raise DocumentImportError("Adresse réseau non autorisée")
    try:
        async with session.get(url, allow_redirects=False, timeout=aiohttp.ClientTimeout(total=35)) as resp:
            if resp.status != 200:
                raise DocumentImportError(f"Téléchargement HTTP {resp.status} (redirections non suivies)")
            if int(resp.headers.get("Content-Length", "0")) > MAX_BYTES:
                raise DocumentImportError("Document trop volumineux (8 Mo maximum)")
            data = await resp.content.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise DocumentImportError("Document trop volumineux (8 Mo maximum)")
            return data, Path(parts.path).name
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        raise DocumentImportError(f"Téléchargement impossible : {err}") from err


async def _read_share(hass, path: str, root: str) -> tuple[bytes, str]:
    if not root:
        raise DocumentImportError("Configurez d'abord le dossier SMB monté dans les options HOLM")
    base = Path(root).resolve()
    file = Path(path)
    if not file.is_absolute():
        file = base / file
    file = file.resolve()
    if not file.is_relative_to(base) or file == base:
        raise DocumentImportError("Fichier hors du dossier SMB autorisé")
    def read():
        if not file.is_file() or file.stat().st_size > MAX_BYTES:
            raise DocumentImportError("Fichier absent ou supérieur à 8 Mo")
        return file.read_bytes()
    return await hass.async_add_executor_job(read), file.name


async def _ocr(session, url: str, token: str, data: bytes, filename: str) -> str:
    if not url:
        raise DocumentImportError("OCR requis : configurez l'URL du serveur OCR local dans les options HOLM")
    if not url.startswith(("http://", "https://")):
        raise DocumentImportError("URL OCR invalide")
    try:
        async with session.post(url.rstrip("/") + "/ocr", data=data,
                                headers={"Content-Type": "application/octet-stream", "X-File-Name": filename[:160], "Authorization": f"Bearer {token}"},
                                timeout=aiohttp.ClientTimeout(total=120)) as resp:
            if resp.status != 200:
                raise DocumentImportError(f"Serveur OCR : HTTP {resp.status} — {(await resp.text())[:180]}")
            obj = await resp.json()
            return obj.get("text", "")
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        raise DocumentImportError(f"Serveur OCR inaccessible : {err}") from err


async def analyze(hass, session, *, url=None, path=None, file_data=None, filename="", options=None) -> dict:
    options = options or {}
    if sum(x is not None for x in (url, path, file_data)) != 1:
        raise DocumentImportError("Choisissez une seule source")
    if url is not None:
        data, filename = await _fetch_url(session, url, options.get("import_hosts", ""))
    elif path is not None:
        data, filename = await _read_share(hass, path, options.get("import_share_root", ""))
    else:
        try:
            data = base64.b64decode(file_data, validate=True)
        except Exception as err:
            raise DocumentImportError("Fichier encodé invalide") from err
    if len(data) > MAX_BYTES:
        raise DocumentImportError("Document supérieur à 8 Mo")
    if not data.startswith(b"%PDF-"):
        raise DocumentImportError("Seuls les fichiers PDF sont acceptés pour l'import de recettes")
    try:
        text = await hass.async_add_executor_job(_extract_pdf, data)
    except Exception as err:
        raise DocumentImportError(f"Lecture PDF impossible : {err}") from err
    if len(text.strip()) < 90:
        text = await _ocr(session, options.get("import_ocr_url", ""), options.get("import_ocr_token", ""), data, filename or "document.pdf")
    result = _parse_text(text, filename)
    # Pour un document PDF importé, son nom de fichier est le titre attendu.
    if filename:
        name = Path(filename).stem.replace("_", " ").strip()
        if name:
            result["name"] = name[:180]
    # La photo n'est transmise qu'en miniature. Elle est persistée uniquement
    # si l'utilisateur enregistre la recette dans l'éditeur.
    try:
        result["import_image"] = await hass.async_add_executor_job(_extract_pdf_image, data)
    except Exception:
        result["import_image"] = None
    if url:
        result["source_url"] = url
    return result
