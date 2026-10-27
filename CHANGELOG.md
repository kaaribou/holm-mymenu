# Changelog

## 1.1.9

- **Liste de courses entre deux dates** ([#12](https://github.com/kaaribou/holm-mymenu/issues/12)) : dans l'onglet Courses, un choix **Semaine / Dates**. En mode Dates, choisissez **Du** et **Au** (31 jours au maximum) pour préparer par exemple un week-end prolongé du samedi au mardi, à cheval sur deux semaines.
- La période s'affiche partout avec le bon libellé : « Semaine du … » pour une semaine du lundi au dimanche, sinon « Courses du … au … » (liste, copie, e-mail, Telegram, notifications, rappels).
- Nouvelle action **`holm_mymenu.generate_shopping_list`** (`start`, `end` facultatifs, semaine en cours par défaut) pour générer la liste depuis une automatisation.
- L'intégration refuse une période inversée ou de plus de 31 jours.

## 1.1.8

- **Recherche Jow** ([#10](https://github.com/kaaribou/holm-mymenu/issues/10)) : à côté de Marmiton, un sélecteur Marmiton / Jow dans « Ajouter une recette » et dans les résultats, et une ligne « Chercher sur Jow » dans le champ de recherche des repas. Import avec photo, ingrédients, étapes et temps ; les quantités (données par Jow pour une personne) sont ramenées au nombre de personnes par défaut. ⚠️ Jow n'a pas d'API officielle : cette recherche peut cesser de fonctionner si Jow modifie son site.
- **Dupliquer une recette** ([#11](https://github.com/kaaribou/holm-mymenu/issues/11)) : copie complète « … (revisitée) », ouverte directement en modification, avec un lien « Inspirée de » vers l'original, qui reste intact.
- Unité « pinc. » reconnue comme une pincée.

## 1.1.7

- **Export vers Mealie** : une toque discrète sur la fiche d'une recette l'envoie vers Mealie. Une recette web est importée par Mealie depuis sa page d'origine (photo, étapes, temps) ; une recette PDF ou saisie à la main est envoyée au format `schema.org/Recipe` avec sa photo. Pas de doublon : une recette déjà présente dans Mealie s'ouvre directement.
- **Correction** : après un rechargement de l'intégration, les rappels et la synchronisation Telegram redémarrent (ils restaient arrêtés jusqu'au redémarrage de Home Assistant), et les actions `get_shopping_list` / `set_shopping_item` agissent sur les données courantes.
- **Import PDF** : suppression des modes « lien » et « dossier partagé », inutilisables faute d'options ; l'import par fichier depuis la carte est inchangé.
- **Correction** : le texte non classé d'un PDF s'affiche bien ligne par ligne dans l'éditeur.
- Nettoyage du code (fonctions et imports inutilisés), version unifiée.
- ⚠️ La version 1.1.6 ajoute la dépendance `pypdf` : Home Assistant l'installe au redémarrage qui suit la mise à jour.

## 1.1.6

- **Courses** : regroupement des ingrédients équivalents pour l’affichage sans perdre les articles originaux, catégories personnalisables, exclusions temporaires et restauration des articles. La période de génération est conservée dans les messages envoyés.
- **Telegram** : envoi interactif de la liste par chat ou sujet de supergroupe, boutons de cochage synchronisés avec Home Assistant, pagination des listes longues et actualisation des messages existants. Les rappels restent indépendants de cette liste.
- **Rappels** : programmation ponctuelle, quotidienne ou hebdomadaire selon le fuseau horaire Home Assistant, avec notifications HA, Telegram et e-mail SMTP ; option « uniquement si nécessaire », test manuel et protection contre les doublons de déclenchement.
- **Calendriers** : export manuel du planning vers une entité calendrier Home Assistant (local, Google Calendar ou CalDAV) ; ajout des repas manquants ou synchronisation des événements HOLM, avec confirmation préalable aux suppressions. Les autres rendez-vous restent intacts.
- **Recettes PDF** : import d’un PDF texte (8 Mo et 15 pages maximum), transfert par fragments, extraction des données de recette et, si disponible, d’une illustration intégrée. **OCR supprimé** : les documents scannés sans texte sélectionnable ne sont plus acceptés.
- **Correction** : l’envoi de la liste de courses par e-mail ne plante plus lorsque le titre est enrichi avec la période (variable `title` initialisée).
- **Documentation** : commentaires des fonctions Telegram, rappels, API WebSocket et export calendrier harmonisés ; README enrichi pour les intégrations de notification, l’import PDF et les calendriers.

## 1.1.5
- **Plusieurs recettes dans un même repas : toutes les photos s'affichent** (#6). Avec deux recettes illustrées, le fond du repas est partagé en deux, en diagonale ; avec trois, en trois bandes, et un badge « +1 », « +2 »… indique les photos en plus. Dans la vue Semaine comme dans le menu du jour.
- iPhone / iPad : la carte ne garde plus une hauteur figée quand elle est rafraîchie dans un onglet caché.

## 1.1.4
- **iPhone / iPad : la page ne remonte plus toute seule.** Changer d'onglet, cocher un article ou ouvrir un élément pouvait faire remonter la page d'un coup sur iOS (Safari et application Home Assistant). La carte garde maintenant sa hauteur pendant qu'elle se redessine, et la position de défilement est conservée.

## 1.1.3

- Le dossier des photos `www/holm_mymenu/` est créé dès l'installation, et les photos sont servies par l'intégration elle-même (`/holm_mymenu_media/…`) : elles s'affichent même si le dossier `www` n'existait pas au démarrage de Home Assistant. Les adresses déjà enregistrées sont converties automatiquement.

## 1.1.2

- Sur téléphone et tablette, les listes de recettes et d'ingrédients n'ont plus de zone de défilement imbriquée : la page défile normalement au doigt, et la suite se charge à l'approche du bas. Sur ordinateur, la zone de défilement reste, et la page reprend la main une fois en haut ou en bas de la liste.

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
