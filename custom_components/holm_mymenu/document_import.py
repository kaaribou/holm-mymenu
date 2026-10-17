"""Import ponctuel de documents culinaires. Aucun document n'est conservé."""
from __future__ import annotations

import base64
from io import BytesIO
from PIL import Image, ImageOps
from pathlib import Path

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


async def analyze(hass, data: bytes, filename: str = "") -> dict:
    """Analyse un PDF transmis depuis la carte (envoi par fragments) et renvoie un brouillon."""
    if len(data) > MAX_BYTES:
        raise DocumentImportError("Document supérieur à 8 Mo")
    if not data.startswith(b"%PDF-"):
        raise DocumentImportError("Seuls les fichiers PDF sont acceptés pour l'import de recettes")
    try:
        text = await hass.async_add_executor_job(_extract_pdf, data)
    except Exception as err:
        raise DocumentImportError(f"Lecture PDF impossible : {err}") from err
    # Pas d’OCR : seuls les PDF contenant du texte sélectionnable sont pris en charge.
    # Un PDF scanné doit être converti en PDF texte avant son importation.
    if len(text.strip()) < 90:
        raise DocumentImportError("PDF sans texte exploitable : les documents scannés ne sont pas pris en charge (OCR supprimé).")
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
    return result
