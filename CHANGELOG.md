# Changelog

## 1.1.1

- « Prendre une photo » ouvre maintenant l'appareil photo **dans la carte** (déclencheur, caméra avant/arrière). L'application mobile Home Assistant ouvrait la galerie à la place. Si l'accès à la caméra est refusé, la carte revient au sélecteur du système.

## 1.1.0

- **Envoi de la liste par e-mail à plusieurs personnes** (#5, #4) : carnet d'adresses (nom + adresse) dans la fenêtre d'envoi ; un seul message, mis en forme par rayon, vers toutes les adresses cochées, avec les réglages de l'intégration SMTP de Home Assistant. Envoi possible en notification vers les téléphones et tablettes (entités `notify`). L'ancienne action `notify.<service>`, déclarée obsolète par Home Assistant, n'est plus utilisée.
- **Photo d'une recette** prise avec l'appareil ou choisie dans la galerie, réduite puis enregistrée localement (#3). Même chose sur la fiche d'un ingrédient.
- **Ajout d'un ingrédient par son code-barre** : caméra, photo du code ou saisie du numéro, puis fiche Open Food Facts (#2).
- **Statistiques** : onglet « Stats » et vue `view: stats` — chiffres clés, recettes les plus planifiées, ingrédients les plus utilisés, repas par semaine, origine des recettes, taille de la base (#1). Le compteur des recettes est conservé indéfiniment.
- L'unité « fluid ounce » des recettes Mealie est reconnue ; les ingrédients concernés sont réparés au démarrage.
- L'option de carte `notify_service` est retirée (remplacée par la fenêtre d'envoi).

## 1.0.1

- La carte est maintenant déclarée automatiquement comme **ressource Lovelace** (mode stockage), avec un numéro de version qui change à chaque mise à jour. Corrige l'erreur « Custom element doesn't exist: holm-mymenu-card » qui pouvait apparaître au rechargement, sur ordinateur comme sur mobile, notamment dans une carte à onglets.

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
