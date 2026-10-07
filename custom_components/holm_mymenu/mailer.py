"""Envoi de la liste de courses par e-mail à plusieurs adresses.

Les réglages du serveur sont repris de l'intégration SMTP de Home Assistant (serveur, port,
chiffrement, identifiants, expéditeur) : il n'y a rien à ressaisir. Un seul message est envoyé,
avec toutes les adresses en destinataires, en texte et en HTML.
"""
from __future__ import annotations

import html
import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


class MailError(Exception):
    """Erreur lisible renvoyée à la carte."""


def smtp_settings(hass: HomeAssistant) -> dict | None:
    """Réglages de la première intégration SMTP chargée, ou None."""
    for entry in hass.config_entries.async_entries("smtp"):
        if entry.disabled_by:
            continue
        cfg = {**entry.data, **entry.options}
        server = cfg.get("server") or cfg.get("host")
        if not server:
            continue
        username = cfg.get("username") or ""
        return {
            "server": server,
            "port": int(cfg.get("port") or 587),
            "encryption": str(cfg.get("encryption") or "starttls").lower(),
            "username": username,
            "password": cfg.get("password") or "",
            "sender": cfg.get("sender") or username,
            "sender_name": cfg.get("sender_name") or "HOLM My Menu",
            "timeout": int(cfg.get("timeout") or 15),
            "verify_ssl": cfg.get("verify_ssl", True),
            "title": entry.title,
        }
    return None


def build_bodies(title: str, groups: list[tuple[str, list[dict]]], footer: str) -> tuple[str, str]:
    """Texte brut et HTML de la liste, rangée par rayon."""
    lines = [title, ""]
    for aisle, items in groups:
        lines.append(aisle.upper())
        lines += [f"- {i['name']}{' : ' + i['display'] if i.get('display') else ''}" for i in items]
        lines.append("")
    lines.append(footer)
    text = "\n".join(lines)
    blocks = []
    for aisle, items in groups:
        rows = "".join(
            f'<tr><td style="width:22px;padding:7px 0;vertical-align:top"><span style="display:inline-block;width:14px;height:14px;border:2px solid #0a9f9f;border-radius:4px"></span></td>'
            f'<td style="padding:7px 8px;font-size:15px;color:#1b2a2e">{html.escape(i["name"])}</td>'
            f'<td style="padding:7px 0;font-size:14px;color:#0a8f8f;font-weight:600;text-align:right;white-space:nowrap">{html.escape(i.get("display") or "")}</td></tr>'
            for i in items)
        blocks.append(f'<h3 style="margin:22px 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7c80">{html.escape(aisle)}</h3>'
                      f'<table style="width:100%;border-collapse:collapse;border-top:1px solid #e3e9ea">{rows}</table>')
    body = (f'<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px">'
            f'<div style="background:linear-gradient(135deg,#12c2b4,#1f6f8b);color:#fff;border-radius:16px;padding:18px 20px">'
            f'<div style="font-size:13px;opacity:.85">🍽️ HOLM My Menu</div><div style="font-size:20px;font-weight:700;margin-top:4px">{html.escape(title)}</div></div>'
            f'{"".join(blocks)}<p style="margin-top:26px;font-size:12px;color:#8a989b">{html.escape(footer)}</p></div>')
    return text, body


def send_mail(settings: dict, recipients: list[str], subject: str, text: str, body_html: str) -> None:
    """Envoi bloquant (à lancer dans un exécuteur)."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((settings["sender_name"], settings["sender"]))
    msg["To"] = ", ".join(recipients)
    msg["Message-ID"] = make_msgid(domain=(settings["sender"].split("@")[-1] or None))
    msg.set_content(text)
    msg.add_alternative(body_html, subtype="html")
    ctx = ssl.create_default_context()
    if not settings["verify_ssl"]:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    try:
        if settings["encryption"] == "tls":
            conn = smtplib.SMTP_SSL(settings["server"], settings["port"], timeout=settings["timeout"], context=ctx)
        else:
            conn = smtplib.SMTP(settings["server"], settings["port"], timeout=settings["timeout"])
            if settings["encryption"] == "starttls":
                conn.starttls(context=ctx)
        with conn:
            if settings["username"]:
                conn.login(settings["username"], settings["password"])
            refused = conn.send_message(msg)
    except smtplib.SMTPAuthenticationError as err:
        raise MailError("Le serveur de messagerie refuse l'identification (vérifiez l'intégration SMTP)") from err
    except (smtplib.SMTPException, OSError) as err:
        raise MailError(f"Envoi impossible : {err}") from err
    if refused:
        raise MailError("Adresses refusées : " + ", ".join(refused))
