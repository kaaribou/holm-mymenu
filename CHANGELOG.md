# Changelog

## 1.0.0 — première version

- Intégration `holm_mymenu` : base locale de recettes, d'ingrédients, de menus (midi et soir) et de liste de courses, stockée dans Home Assistant.
- Recettes :
  - recherche **Marmiton** puis choix d'un résultat ;
  - import depuis n'importe quel lien de recette (schema.org) ;
  - import de vos recettes **Mealie** ;
  - saisie à la main.
- Les ingrédients des recettes sont reconnus (quantité, unité, nom) et reliés automatiquement à la base, avec le rayon deviné.
- Ingrédients **Open Food Facts** : recherche de produits, fiche complète (marque, conditionnement, Nutri-Score, Éco-Score, NOVA, valeurs nutritionnelles, composition, allergènes, labels) et photo enregistrée localement.
- Planning de la semaine : plusieurs recettes, ingrédients et notes par repas, glisser-déposer, copie, portions ajustables.
- Liste de courses générée depuis le planning : quantités mises à l'échelle et additionnées, rangées par rayon, articles ajoutés à la main ; envoi par notification (e-mail…), par la messagerie de l'appareil, ou copie.
- Carte `holm-mymenu-card` incluse, sans ressource à ajouter : vues **Complet**, **Menu du jour** et **Semaine** (consultation), choix des repas affichés, listes chargées au fil du défilement.
- Capteurs `sensor.holm_mymenu_midi`, `sensor.holm_mymenu_soir` et `sensor.holm_mymenu_next`.
