"""Constantes de HOLM My Menu."""
DOMAIN = "holm_mymenu"
VERSION = "1.0.0"
STORAGE_KEY = "holm_mymenu"
STORAGE_VERSION = 1
SLOTS = ("midi", "soir")
CARD_URL = "/holm_mymenu_static/holm-mymenu-card.js"
STATIC_PATH = "/holm_mymenu_static"
USER_AGENT = "HOLM-MyMenu/1.0 (Home Assistant; https://github.com/kaaribou/holm-mymenu)"
CONF_MEALIE_URL = "mealie_url"
CONF_MEALIE_TOKEN = "mealie_token"
CONF_SERVINGS = "servings"
SIGNAL_UPDATED = "holm_mymenu_updated"

# Rayons pour la liste de courses (ordre d'affichage)
AISLES = [
    ("fruits_legumes", "Fruits & légumes"),
    ("boucherie", "Viandes & poissons"),
    ("cremerie", "Crèmerie & œufs"),
    ("fromage", "Fromages"),
    ("boulangerie", "Boulangerie"),
    ("epicerie", "Épicerie"),
    ("epicerie_sucree", "Épicerie sucrée"),
    ("condiments", "Condiments, épices & herbes"),
    ("surgeles", "Surgelés"),
    ("boissons", "Boissons"),
    ("maison", "Maison & hygiène"),
    ("autre", "Divers"),
]
