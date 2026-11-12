/* HOLM My Menu Card — menus de la semaine, recettes, ingrédients et liste de courses.
 * Fait partie de HOLM — Home Orchestration & Living Management. https://github.com/kaaribou/holm-mymenu — licence MIT
 *   type: custom:holm-mymenu-card
 *   title: Menus            view: full | today | week | stats        tab: week | recipes | ingredients | shopping | stats
 *   today_slots: [midi, soir]   list_height: 620   show_frame: false
 *   week_start: monday | today   (semaine du lundi, ou aujourd'hui + 6 jours)
 */
(() => {
  // ---- HOLM i18n : textes écrits en français, traduits à l'affichage (en, de, es, it, nl, pt, pl) ----
  // Langue : option `language` de la carte, sinon celle du profil Home Assistant ; anglais si la langue n'est pas traduite.
  const HOLM_LANGS = ["en", "de", "es", "it", "nl", "pt", "pl"];
  const LANG_NAMES = { fr: "Français", en: "English", de: "Deutsch", es: "Español", it: "Italiano", nl: "Nederlands", pt: "Português", pl: "Polski" };
  const LOCALES = { fr: "fr-FR", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT", nl: "nl-NL", pt: "pt-PT", pl: "pl-PL" };
  const I18N = {
    "Du {a} au {b}": ["From {a} to {b}", "Vom {a} bis {b}", "Del {a} al {b}", "Dal {a} al {b}", "Van {a} tot {b}", "De {a} a {b}", "Od {a} do {b}"],
    "Afficher aujourd'hui et les 6 jours suivants": ["Show today and the next 6 days", "Heute und die nächsten 6 Tage anzeigen", "Mostrar hoy y los 6 días siguientes", "Mostra oggi e i 6 giorni successivi", "Vandaag en de volgende 6 dagen tonen", "Mostrar hoje e os 6 dias seguintes", "Pokaż dziś i 6 kolejnych dni"],
    "Afficher la semaine du lundi au dimanche": ["Show the week from Monday to Sunday", "Woche von Montag bis Sonntag anzeigen", "Mostrar la semana de lunes a domingo", "Mostra la settimana da lunedì a domenica", "Week van maandag tot zondag tonen", "Mostrar a semana de segunda a domingo", "Pokaż tydzień od poniedziałku do niedzieli"],
    "Début du planning": ["Planning starts on", "Planungsbeginn", "Inicio de la planificación", "Inizio della pianificazione", "Begin van de planning", "Início do planeamento", "Początek planu"],
    "Lundi (semaine en cours)": ["Monday (current week)", "Montag (aktuelle Woche)", "Lunes (semana actual)", "Lunedì (settimana corrente)", "Maandag (huidige week)", "Segunda-feira (semana atual)", "Poniedziałek (bieżący tydzień)"],
    "Aujourd'hui (7 prochains jours)": ["Today (next 7 days)", "Heute (nächste 7 Tage)", "Hoy (próximos 7 días)", "Oggi (prossimi 7 giorni)", "Vandaag (volgende 7 dagen)", "Hoje (próximos 7 dias)", "Dziś (następne 7 dni)"],
    "Suggérer": ["Suggest", "Vorschlagen", "Sugerir", "Suggerisci", "Voorstellen", "Sugerir", "Zaproponuj"],
    "Suggérer des repas": ["Suggest meals", "Mahlzeiten vorschlagen", "Sugerir comidas", "Suggerisci pasti", "Maaltijden voorstellen", "Sugerir refeições", "Zaproponuj posiłki"],
    "Repas à remplir": ["Meals to fill", "Zu füllende Mahlzeiten", "Comidas por rellenar", "Pasti da riempire", "In te vullen maaltijden", "Refeições a preencher", "Posiłki do uzupełnienia"],
    "Plats (sans entrées ni desserts)": ["Mains (no starters or desserts)", "Hauptgerichte (ohne Vorspeisen und Desserts)", "Platos (sin entrantes ni postres)", "Piatti (senza antipasti né dolci)", "Hoofdgerechten (zonder voorgerechten en desserts)", "Pratos (sem entradas nem sobremesas)", "Dania (bez przystawek i deserów)"],
    "Toutes": ["All", "Alle", "Todas", "Tutte", "Alle", "Todas", "Wszystkie"],
    "Tous": ["All", "Alle", "Todos", "Tutti", "Alle", "Todos", "Wszystkie"],
    "Temps max": ["Max time", "Max. Zeit", "Tiempo máx.", "Tempo max", "Max. tijd", "Tempo máx.", "Maks. czas"],
    "Note min": ["Min rating", "Min. Bewertung", "Nota mín.", "Voto min", "Min. score", "Nota mín.", "Min. ocena"],
    "Favoris uniquement": ["Favourites only", "Nur Favoriten", "Solo favoritos", "Solo preferiti", "Alleen favorieten", "Só favoritos", "Tylko ulubione"],
    "Ingrédients à éviter": ["Ingredients to avoid", "Zu vermeidende Zutaten", "Ingredientes a evitar", "Ingredienti da evitare", "Te vermijden ingrediënten", "Ingredientes a evitar", "Składniki do unikania"],
    "Ajouter un ingrédient à éviter…": ["Add an ingredient to avoid…", "Zu vermeidende Zutat hinzufügen…", "Añadir un ingrediente a evitar…", "Aggiungi un ingrediente da evitare…", "Te vermijden ingrediënt toevoegen…", "Adicionar um ingrediente a evitar…", "Dodaj składnik do unikania…"],
    "Simple filtre sur le nom des ingrédients : vérifiez toujours la recette en cas d'allergie.": ["A simple filter on ingredient names: always check the recipe in case of allergy.", "Einfacher Filter nach Zutatennamen: Bei Allergien das Rezept immer prüfen.", "Simple filtro por el nombre de los ingredientes: compruebe siempre la receta en caso de alergia.", "Semplice filtro sul nome degli ingredienti: in caso di allergia controllate sempre la ricetta.", "Eenvoudige filter op ingrediëntnamen: controleer bij allergie altijd het recept.", "Simples filtro pelo nome dos ingredientes: verifique sempre a receita em caso de alergia.", "Prosty filtr nazw składników: przy alergii zawsze sprawdź przepis."],
    "{n} recettes possibles": ["{n} possible recipes", "{n} mögliche Rezepte", "{n} recetas posibles", "{n} ricette possibili", "{n} mogelijke recepten", "{n} receitas possíveis", "{n} możliwych przepisów"],
    "Autre recette": ["Another recipe", "Anderes Rezept", "Otra receta", "Altra ricetta", "Ander recept", "Outra receita", "Inny przepis"],
    "Ne pas remplir": ["Leave empty", "Leer lassen", "Dejar vacío", "Lascia vuoto", "Leeg laten", "Deixar vazio", "Zostaw puste"],
    "Tout regénérer": ["Regenerate all", "Alles neu erzeugen", "Regenerar todo", "Rigenera tutto", "Alles opnieuw", "Regenerar tudo", "Wygeneruj wszystko ponownie"],
    "Planifier {n} repas": ["Plan {n} meals", "{n} Mahlzeiten planen", "Planificar {n} comidas", "Pianifica {n} pasti", "{n} maaltijden plannen", "Planear {n} refeições", "Zaplanuj posiłki: {n}"],
    "{n} repas planifiés": ["{n} meals planned", "{n} Mahlzeiten geplant", "{n} comidas planificadas", "{n} pasti pianificati", "{n} maaltijden gepland", "{n} refeições planeadas", "Zaplanowano posiłki: {n}"],
    "Aucun repas vide à remplir sur cette période.": ["No empty meal to fill in this period.", "Keine leere Mahlzeit in diesem Zeitraum.", "No hay comidas vacías en este periodo.", "Nessun pasto vuoto da riempire in questo periodo.", "Geen lege maaltijd in deze periode.", "Nenhuma refeição vazia neste período.", "Brak pustych posiłków w tym okresie."],
    "Aucune recette ne correspond à ces critères.": ["No recipe matches these criteria.", "Kein Rezept entspricht diesen Kriterien.", "Ninguna receta cumple estos criterios.", "Nessuna ricetta corrisponde a questi criteri.", "Geen recept voldoet aan deze criteria.", "Nenhuma receita corresponde a estes critérios.", "Żaden przepis nie spełnia tych kryteriów."],
    "Seuls les repas vides sont remplis : rien de déjà prévu n'est remplacé.": ["Only empty meals are filled: nothing already planned is replaced.", "Nur leere Mahlzeiten werden gefüllt: bereits Geplantes wird nicht ersetzt.", "Solo se rellenan las comidas vacías: no se sustituye nada ya previsto.", "Vengono riempiti solo i pasti vuoti: nulla di già previsto viene sostituito.", "Alleen lege maaltijden worden gevuld: niets wat al gepland is wordt vervangen.", "Só as refeições vazias são preenchidas: nada já previsto é substituído.", "Uzupełniane są tylko puste posiłki: nic już zaplanowanego nie jest zastępowane."],
    "Filtres": ["Filters", "Filter", "Filtros", "Filtri", "Filters", "Filtros", "Filtry"],
    "Effacer les filtres": ["Clear filters", "Filter löschen", "Borrar filtros", "Cancella filtri", "Filters wissen", "Limpar filtros", "Wyczyść filtry"],
    "≤ {n} min": ["≤ {n} min", "≤ {n} Min.", "≤ {n} min", "≤ {n} min", "≤ {n} min", "≤ {n} min", "≤ {n} min"],
    "Automatique (profil)": ["Automatic (profile)", "Automatisch (Profil)", "Automático (perfil)", "Automatica (profilo)", "Automatisch (profiel)", "Automático (perfil)", "Automatycznie (profil)"],
    "Langue": ["Language", "Sprache", "Idioma", "Lingua", "Taal", "Idioma", "Język"],
    "Titre": ["Title", "Titel", "Título", "Titolo", "Titel", "Título", "Tytuł"],
    "Titre (optionnel)": ["Title (optional)", "Titel (optional)", "Título (opcional)", "Titolo (facoltativo)", "Titel (optioneel)", "Título (opcional)", "Tytuł (opcjonalnie)"],
    "Nom": ["Name", "Name", "Nombre", "Nome", "Naam", "Nome", "Nazwa"],
    "Nom affiché": ["Display name", "Anzeigename", "Nombre mostrado", "Nome visualizzato", "Weergavenaam", "Nome apresentado", "Wyświetlana nazwa"],
    "Icône": ["Icon", "Symbol", "Icono", "Icona", "Pictogram", "Ícone", "Ikona"],
    "Couleur": ["Colour", "Farbe", "Color", "Colore", "Kleur", "Cor", "Kolor"],
    "Couleurs": ["Colours", "Farben", "Colores", "Colori", "Kleuren", "Cores", "Kolory"],
    "Entité": ["Entity", "Entität", "Entidad", "Entità", "Entiteit", "Entidade", "Encja"],
    "Entités": ["Entities", "Entitäten", "Entidades", "Entità", "Entiteiten", "Entidades", "Encje"],
    "Chargement…": ["Loading…", "Wird geladen…", "Cargando…", "Caricamento…", "Laden…", "A carregar…", "Ładowanie…"],
    "Erreur": ["Error", "Fehler", "Error", "Errore", "Fout", "Erro", "Błąd"],
    "Fermer": ["Close", "Schließen", "Cerrar", "Chiudi", "Sluiten", "Fechar", "Zamknij"],
    "Annuler": ["Cancel", "Abbrechen", "Cancelar", "Annulla", "Annuleren", "Cancelar", "Anuluj"],
    "Enregistrer": ["Save", "Speichern", "Guardar", "Salva", "Opslaan", "Guardar", "Zapisz"],
    "Supprimer": ["Delete", "Löschen", "Eliminar", "Elimina", "Verwijderen", "Eliminar", "Usuń"],
    "Ajouter": ["Add", "Hinzufügen", "Añadir", "Aggiungi", "Toevoegen", "Adicionar", "Dodaj"],
    "Monter": ["Move up", "Nach oben", "Subir", "Sposta su", "Omhoog", "Mover para cima", "W górę"],
    "Descendre": ["Move down", "Nach unten", "Bajar", "Sposta giù", "Omlaag", "Mover para baixo", "W dół"],
    "Afficher le cadre de la carte": ["Show the card frame", "Kartenrahmen anzeigen", "Mostrar el marco de la tarjeta", "Mostra la cornice della scheda", "Kaartkader tonen", "Mostrar a moldura do cartão", "Pokaż ramkę karty"],
    "Indisponible": ["Unavailable", "Nicht verfügbar", "No disponible", "Non disponibile", "Niet beschikbaar", "Indisponível", "Niedostępne"],
    "Aujourd'hui": ["Today", "Heute", "Hoy", "Oggi", "Vandaag", "Hoje", "Dziś"],
    "Hier": ["Yesterday", "Gestern", "Ayer", "Ieri", "Gisteren", "Ontem", "Wczoraj"],
    "Demain": ["Tomorrow", "Morgen", "Mañana", "Domani", "Morgen", "Amanhã", "Jutro"],
    "Batterie": ["Battery", "Batterie", "Batería", "Batteria", "Batterij", "Bateria", "Bateria"],
    "Aucune donnée sur cette période.": ["No data for this period.", "Keine Daten für diesen Zeitraum.", "No hay datos en este periodo.", "Nessun dato per questo periodo.", "Geen gegevens voor deze periode.", "Sem dados neste período.", "Brak danych w tym okresie."],
    "à l'instant": ["just now", "gerade eben", "ahora mismo", "proprio ora", "zojuist", "agora mesmo", "przed chwilą"],
    "il y a {n} min": ["{n} min ago", "vor {n} Min.", "hace {n} min", "{n} min fa", "{n} min geleden", "há {n} min", "{n} min temu"],
    "il y a {n} h": ["{n} h ago", "vor {n} Std.", "hace {n} h", "{n} h fa", "{n} u geleden", "há {n} h", "{n} godz. temu"],
    "il y a {n} j": ["{n} d ago", "vor {n} T.", "hace {n} d", "{n} g fa", "{n} d geleden", "há {n} d", "{n} dni temu"],
    "Midi": ["Lunch", "Mittag", "Comida", "Pranzo", "Lunch", "Almoço", "Obiad"],
    "Soir": ["Dinner", "Abend", "Cena", "Cena", "Diner", "Jantar", "Kolacja"],
    "Menus": ["Menus", "Menüs", "Menús", "Menu", "Menu's", "Menus", "Menu"],
    "L'intégration HOLM My Menu n'est pas installée ou pas encore chargée.": ["The HOLM My Menu integration isn't installed or hasn't loaded yet.", "Die Integration HOLM My Menu ist nicht installiert oder noch nicht geladen.", "La integración HOLM My Menu no está instalada o aún no se ha cargado.", "L'integrazione HOLM My Menu non è installata o non è ancora caricata.", "De integratie HOLM My Menu is niet geïnstalleerd of nog niet geladen.", "A integração HOLM My Menu não está instalada ou ainda não foi carregada.", "Integracja HOLM My Menu nie jest zainstalowana lub jeszcze się nie załadowała."],
    "Semaine": ["Week", "Woche", "Semana", "Settimana", "Week", "Semana", "Tydzień"],
    "Recettes": ["Recipes", "Rezepte", "Recetas", "Ricette", "Recepten", "Receitas", "Przepisy"],
    "Ingrédients": ["Ingredients", "Zutaten", "Ingredientes", "Ingredienti", "Ingrediënten", "Ingredientes", "Składniki"],
    "Courses": ["Shopping", "Einkauf", "Compra", "Spesa", "Boodschappen", "Compras", "Zakupy"],
    "Rappels": ["Reminders", "Erinnerungen", "Recordatorios", "Promemoria", "Herinneringen", "Lembretes", "Przypomnienia"],
    "Stats": ["Stats", "Statistik", "Estadísticas", "Statistiche", "Statistieken", "Estatísticas", "Statystyki"],
    "Afficher la suite · {n} sur {t}": ["Show more · {n} of {t}", "Mehr anzeigen · {n} von {t}", "Mostrar más · {n} de {t}", "Mostra altro · {n} su {t}", "Meer tonen · {n} van {t}", "Mostrar mais · {n} de {t}", "Pokaż więcej · {n} z {t}"],
    "Test du rappel effectué": ["Reminder test sent", "Erinnerungstest gesendet", "Prueba del recordatorio realizada", "Test del promemoria eseguito", "Herinneringstest verzonden", "Teste do lembrete efetuado", "Test przypomnienia wykonany"],
    "Supprimer ce rappel ?": ["Delete this reminder?", "Diese Erinnerung löschen?", "¿Eliminar este recordatorio?", "Eliminare questo promemoria?", "Deze herinnering verwijderen?", "Eliminar este lembrete?", "Usunąć to przypomnienie?"],
    "La date de fin est avant la date de début": ["The end date is before the start date", "Das Enddatum liegt vor dem Startdatum", "La fecha de fin es anterior a la de inicio", "La data di fine è precedente a quella di inizio", "De einddatum ligt vóór de begindatum", "A data de fim é anterior à de início", "Data końca jest przed datą początku"],
    "Période trop longue ({n} jours au maximum)": ["Period too long ({n} days maximum)", "Zeitraum zu lang (höchstens {n} Tage)", "Periodo demasiado largo ({n} días como máximo)", "Periodo troppo lungo (massimo {n} giorni)", "Periode te lang (maximaal {n} dagen)", "Período demasiado longo (máximo {n} dias)", "Za długi okres (maks. {n} dni)"],
    "Liste de courses générée": ["Shopping list generated", "Einkaufsliste erstellt", "Lista de la compra generada", "Lista della spesa generata", "Boodschappenlijst aangemaakt", "Lista de compras gerada", "Lista zakupów wygenerowana"],
    "Vider toute la liste de courses ?": ["Empty the whole shopping list?", "Die ganze Einkaufsliste leeren?", "¿Vaciar toda la lista de la compra?", "Svuotare tutta la lista della spesa?", "De hele boodschappenlijst leegmaken?", "Esvaziar toda a lista de compras?", "Wyczyścić całą listę zakupów?"],
    "Liste copiée": ["List copied", "Liste kopiert", "Lista copiada", "Lista copiata", "Lijst gekopieerd", "Lista copiada", "Lista skopiowana"],
    "Copie impossible sur cet appareil": ["Can't copy on this device", "Kopieren auf diesem Gerät nicht möglich", "No se puede copiar en este dispositivo", "Impossibile copiare su questo dispositivo", "Kopiëren niet mogelijk op dit apparaat", "Não é possível copiar neste dispositivo", "Nie można skopiować na tym urządzeniu"],
    "Semaine du {a} au {b}": ["Week of {a} to {b}", "Woche vom {a} bis {b}", "Semana del {a} al {b}", "Settimana dal {a} al {b}", "Week van {a} tot {b}", "Semana de {a} a {b}", "Tydzień od {a} do {b}"],
    "Ajouter au calendrier": ["Add to calendar", "Zum Kalender hinzufügen", "Añadir al calendario", "Aggiungi al calendario", "Aan agenda toevoegen", "Adicionar ao calendário", "Dodaj do kalendarza"],
    "Toucher un repas pour le choisir · glisser un repas sur un autre pour les échanger (Ctrl pour copier)": ["Tap a meal to choose it · drag a meal onto another to swap them (Ctrl to copy)", "Mahlzeit antippen, um sie zu wählen · auf eine andere ziehen, um sie zu tauschen (Strg zum Kopieren)", "Toca una comida para elegirla · arrastra una comida sobre otra para intercambiarlas (Ctrl para copiar)", "Tocca un pasto per sceglierlo · trascinalo su un altro per scambiarli (Ctrl per copiare)", "Tik op een maaltijd om te kiezen · sleep een maaltijd op een andere om te wisselen (Ctrl om te kopiëren)", "Toque numa refeição para a escolher · arraste uma refeição para outra para as trocar (Ctrl para copiar)", "Dotknij posiłku, aby go wybrać · przeciągnij na inny, aby zamienić (Ctrl, aby skopiować)"],
    "{n} pers.": ["{n} serv.", "{n} Pers.", "{n} pers.", "{n} pers.", "{n} pers.", "{n} pess.", "{n} os."],
    "Rien de prévu": ["Nothing planned", "Nichts geplant", "Nada previsto", "Niente in programma", "Niets gepland", "Nada previsto", "Nic nie zaplanowano"],
    "Ajouter les recettes au calendrier": ["Add the recipes to the calendar", "Rezepte zum Kalender hinzufügen", "Añadir las recetas al calendario", "Aggiungi le ricette al calendario", "Recepten aan de agenda toevoegen", "Adicionar as receitas ao calendário", "Dodaj przepisy do kalendarza"],
    "Calendrier de destination": ["Target calendar", "Zielkalender", "Calendario de destino", "Calendario di destinazione", "Doelagenda", "Calendário de destino", "Kalendarz docelowy"],
    "Choisir un calendrier…": ["Choose a calendar…", "Kalender wählen…", "Elegir un calendario…", "Scegli un calendario…", "Kies een agenda…", "Escolher um calendário…", "Wybierz kalendarz…"],
    "Aucun calendrier Home Assistant disponible.": ["No Home Assistant calendar available.", "Kein Home-Assistant-Kalender verfügbar.", "Ningún calendario de Home Assistant disponible.", "Nessun calendario di Home Assistant disponibile.", "Geen Home Assistant-agenda beschikbaar.", "Nenhum calendário do Home Assistant disponível.", "Brak dostępnego kalendarza Home Assistant."],
    "Préfixe des événements": ["Event prefix", "Präfix der Termine", "Prefijo de los eventos", "Prefisso degli eventi", "Voorvoegsel van afspraken", "Prefixo dos eventos", "Prefiks wydarzeń"],
    "Aperçu · {n} événement": ["Preview · {n} event", "Vorschau · {n} Termin", "Vista previa · {n} evento", "Anteprima · {n} evento", "Voorbeeld · {n} afspraak", "Pré-visualização · {n} evento", "Podgląd · {n} wydarzenie"],
    "Aperçu · {n} événements": ["Preview · {n} events", "Vorschau · {n} Termine", "Vista previa · {n} eventos", "Anteprima · {n} eventi", "Voorbeeld · {n} afspraken", "Pré-visualização · {n} eventos", "Podgląd · {n} wydarzeń"],
    "Aucune recette planifiée cette semaine.": ["No recipes planned this week.", "Keine Rezepte für diese Woche geplant.", "Ninguna receta planificada esta semana.", "Nessuna ricetta pianificata questa settimana.", "Geen recepten gepland deze week.", "Nenhuma receita planeada esta semana.", "Brak zaplanowanych przepisów w tym tygodniu."],
    "La synchronisation recherche les événements HOLM déjà présents et évite les doublons. Les modifications et suppressions nécessitent des services pris en charge par le calendrier.": ["Syncing looks for existing HOLM events and avoids duplicates. Edits and deletions need services supported by the calendar.", "Die Synchronisierung sucht vorhandene HOLM-Termine und vermeidet Duplikate. Änderungen und Löschungen erfordern vom Kalender unterstützte Dienste.", "La sincronización busca los eventos HOLM ya existentes y evita duplicados. Las modificaciones y eliminaciones requieren servicios compatibles con el calendario.", "La sincronizzazione cerca gli eventi HOLM già presenti ed evita i doppioni. Modifiche ed eliminazioni richiedono servizi supportati dal calendario.", "De synchronisatie zoekt bestaande HOLM-afspraken en voorkomt dubbele. Wijzigen en verwijderen vereist diensten die de agenda ondersteunt.", "A sincronização procura os eventos HOLM já existentes e evita duplicados. As alterações e eliminações requerem serviços suportados pelo calendário.", "Synchronizacja wyszukuje istniejące wydarzenia HOLM i unika duplikatów. Zmiany i usuwanie wymagają usług obsługiwanych przez kalendarz."],
    "Mode d’export": ["Export mode", "Exportmodus", "Modo de exportación", "Modalità di esportazione", "Exportmodus", "Modo de exportação", "Tryb eksportu"],
    "Synchroniser la semaine (ajouter, modifier, supprimer)": ["Sync the week (add, edit, delete)", "Woche synchronisieren (hinzufügen, ändern, löschen)", "Sincronizar la semana (añadir, modificar, eliminar)", "Sincronizza la settimana (aggiungi, modifica, elimina)", "Week synchroniseren (toevoegen, wijzigen, verwijderen)", "Sincronizar a semana (adicionar, alterar, eliminar)", "Synchronizuj tydzień (dodaj, zmień, usuń)"],
    "Ajouter uniquement les événements manquants": ["Only add missing events", "Nur fehlende Termine hinzufügen", "Añadir solo los eventos que faltan", "Aggiungi solo gli eventi mancanti", "Alleen ontbrekende afspraken toevoegen", "Adicionar apenas os eventos em falta", "Dodaj tylko brakujące wydarzenia"],
    "Confirmer la synchronisation": ["Confirm sync", "Synchronisierung bestätigen", "Confirmar la sincronización", "Conferma la sincronizzazione", "Synchronisatie bevestigen", "Confirmar a sincronização", "Potwierdź synchronizację"],
    "Les événements HOLM de cette semaine seront mis à jour. Ceux qui correspondent à des repas supprimés pourront être effacés du calendrier sélectionné. Les autres événements ne seront pas touchés.": ["This week's HOLM events will be updated. Those matching deleted meals may be removed from the selected calendar. Other events won't be touched.", "Die HOLM-Termine dieser Woche werden aktualisiert. Termine gelöschter Mahlzeiten können aus dem gewählten Kalender entfernt werden. Andere Termine bleiben unberührt.", "Los eventos HOLM de esta semana se actualizarán. Los que correspondan a comidas eliminadas podrán borrarse del calendario seleccionado. Los demás eventos no se tocarán.", "Gli eventi HOLM di questa settimana saranno aggiornati. Quelli dei pasti eliminati potranno essere cancellati dal calendario selezionato. Gli altri eventi non saranno toccati.", "De HOLM-afspraken van deze week worden bijgewerkt. Afspraken van verwijderde maaltijden kunnen uit de gekozen agenda worden gewist. Andere afspraken blijven ongemoeid.", "Os eventos HOLM desta semana serão atualizados. Os que correspondem a refeições eliminadas poderão ser apagados do calendário selecionado. Os outros eventos não serão tocados.", "Wydarzenia HOLM z tego tygodnia zostaną zaktualizowane. Te dotyczące usuniętych posiłków mogą zostać usunięte z wybranego kalendarza. Inne wydarzenia pozostaną nietknięte."],
    "Retour": ["Back", "Zurück", "Volver", "Indietro", "Terug", "Voltar", "Wstecz"],
    "Créer {n} événement": ["Create {n} event", "{n} Termin erstellen", "Crear {n} evento", "Crea {n} evento", "{n} afspraak maken", "Criar {n} evento", "Utwórz {n} wydarzenie"],
    "Créer {n} événements": ["Create {n} events", "{n} Termine erstellen", "Crear {n} eventos", "Crea {n} eventi", "{n} afspraken maken", "Criar {n} eventos", "Utwórz {n} wydarzeń"],
    "Calendrier : {c} créé(s), {u} modifié(s), {d} supprimé(s), {n} inchangé(s)": ["Calendar: {c} created, {u} updated, {d} deleted, {n} unchanged", "Kalender: {c} erstellt, {u} geändert, {d} gelöscht, {n} unverändert", "Calendario: {c} creado(s), {u} modificado(s), {d} eliminado(s), {n} sin cambios", "Calendario: {c} creati, {u} modificati, {d} eliminati, {n} invariati", "Agenda: {c} aangemaakt, {u} gewijzigd, {d} verwijderd, {n} ongewijzigd", "Calendário: {c} criado(s), {u} alterado(s), {d} eliminado(s), {n} inalterado(s)", "Kalendarz: utworzono {c}, zmieniono {u}, usunięto {d}, bez zmian {n}"],
    "Export calendrier :": ["Calendar export:", "Kalenderexport:", "Exportación de calendario:", "Esportazione calendario:", "Agenda-export:", "Exportação do calendário:", "Eksport kalendarza:"],
    "Calendrier :": ["Calendar:", "Kalender:", "Calendario:", "Calendario:", "Agenda:", "Calendário:", "Kalendarz:"],
    "Sélectionne un calendrier": ["Select a calendar", "Wähle einen Kalender", "Selecciona un calendario", "Seleziona un calendario", "Kies een agenda", "Seleciona um calendário", "Wybierz kalendarz"],
    "Rechercher une recette ou un ingrédient…": ["Search for a recipe or an ingredient…", "Rezept oder Zutat suchen…", "Buscar una receta o un ingrediente…", "Cerca una ricetta o un ingrediente…", "Zoek een recept of ingrediënt…", "Pesquisar uma receita ou um ingrediente…", "Szukaj przepisu lub składnika…"],
    "Favoris": ["Favourites", "Favoriten", "Favoritos", "Preferiti", "Favorieten", "Favoritos", "Ulubione"],
    "Aucune recette ne correspond.": ["No matching recipe.", "Kein passendes Rezept.", "Ninguna receta coincide.", "Nessuna ricetta corrisponde.", "Geen overeenkomend recept.", "Nenhuma receita corresponde.", "Brak pasujących przepisów."],
    "Aucune recette pour l'instant : ajoutez-en depuis Marmiton, Jow, un lien, Mealie ou à la main.": ["No recipes yet: add some from Marmiton, Jow, a link, Mealie or by hand.", "Noch keine Rezepte: Fügen Sie welche aus Marmiton, Jow, einem Link, Mealie oder von Hand hinzu.", "Aún no hay recetas: añade desde Marmiton, Jow, un enlace, Mealie o a mano.", "Ancora nessuna ricetta: aggiungine da Marmiton, Jow, un link, Mealie o a mano.", "Nog geen recepten: voeg ze toe vanuit Marmiton, Jow, een link, Mealie of met de hand.", "Ainda sem receitas: adicione a partir do Marmiton, Jow, um link, Mealie ou à mão.", "Brak przepisów: dodaj je z Marmiton, Jow, linku, Mealie lub ręcznie."],
    "Rechercher un ingrédient…": ["Search for an ingredient…", "Zutat suchen…", "Buscar un ingrediente…", "Cerca un ingrediente…", "Zoek een ingrediënt…", "Pesquisar um ingrediente…", "Szukaj składnika…"],
    "{n} recette": ["{n} recipe", "{n} Rezept", "{n} receta", "{n} ricetta", "{n} recept", "{n} receita", "{n} przepis"],
    "{n} recettes": ["{n} recipes", "{n} Rezepte", "{n} recetas", "{n} ricette", "{n} recepten", "{n} receitas", "{n} przepisów"],
    "Aucun ingrédient « {q} ».": ["No ingredient \"{q}\".", "Keine Zutat „{q}“.", "Ningún ingrediente «{q}».", "Nessun ingrediente «{q}».", "Geen ingrediënt \"{q}\".", "Nenhum ingrediente «{q}».", "Brak składnika „{q}”."],
    "Le chercher sur Open Food Facts": ["Look it up on Open Food Facts", "Auf Open Food Facts suchen", "Buscarlo en Open Food Facts", "Cercalo su Open Food Facts", "Zoeken op Open Food Facts", "Procurar no Open Food Facts", "Szukaj w Open Food Facts"],
    "Aucun ingrédient pour l'instant.": ["No ingredients yet.", "Noch keine Zutaten.", "Aún no hay ingredientes.", "Ancora nessun ingrediente.", "Nog geen ingrediënten.", "Ainda sem ingredientes.", "Brak składników."],
    "ingrédient": ["ingredient", "Zutat", "ingrediente", "ingrediente", "ingrediënt", "ingrediente", "składnik"],
    "Fruits & légumes": ["Fruit & vegetables", "Obst & Gemüse", "Frutas y verduras", "Frutta e verdura", "Groente & fruit", "Frutas e legumes", "Owoce i warzywa"],
    "Viandes & poissons": ["Meat & fish", "Fleisch & Fisch", "Carnes y pescados", "Carne e pesce", "Vlees & vis", "Carne e peixe", "Mięso i ryby"],
    "Crèmerie & œufs": ["Dairy & eggs", "Milchprodukte & Eier", "Lácteos y huevos", "Latticini e uova", "Zuivel & eieren", "Laticínios e ovos", "Nabiał i jajka"],
    "Fromages": ["Cheese", "Käse", "Quesos", "Formaggi", "Kaas", "Queijos", "Sery"],
    "Boulangerie": ["Bakery", "Bäckerei", "Panadería", "Panetteria", "Bakkerij", "Padaria", "Pieczywo"],
    "Épicerie": ["Groceries", "Lebensmittel", "Despensa", "Drogheria", "Kruidenierswaren", "Mercearia", "Spożywcze"],
    "Épicerie sucrée": ["Sweet groceries", "Süßwaren", "Dulces", "Dolciumi", "Zoetwaren", "Doces", "Słodycze"],
    "Condiments, épices & herbes": ["Condiments, spices & herbs", "Würzmittel, Gewürze & Kräuter", "Condimentos, especias y hierbas", "Condimenti, spezie ed erbe", "Smaakmakers, specerijen & kruiden", "Condimentos, especiarias e ervas", "Przyprawy i zioła"],
    "Surgelés": ["Frozen", "Tiefkühl", "Congelados", "Surgelati", "Diepvries", "Congelados", "Mrożonki"],
    "Boissons": ["Drinks", "Getränke", "Bebidas", "Bevande", "Dranken", "Bebidas", "Napoje"],
    "Maison & hygiène": ["Household & hygiene", "Haushalt & Hygiene", "Hogar e higiene", "Casa e igiene", "Huishouden & verzorging", "Casa e higiene", "Dom i higiena"],
    "Divers": ["Other", "Sonstiges", "Varios", "Varie", "Overig", "Diversos", "Różne"],
    "Calcul des statistiques…": ["Calculating statistics…", "Statistiken werden berechnet…", "Calculando estadísticas…", "Calcolo delle statistiche…", "Statistieken berekenen…", "A calcular estatísticas…", "Obliczanie statystyk…"],
    "Mo": ["MB", "MB", "MB", "MB", "MB", "MB", "MB"],
    "Ko": ["KB", "KB", "KB", "KB", "KB", "KB", "KB"],
    "Revisitée": ["Revisited", "Abgewandelt", "Versionada", "Rivisitata", "Bewerkt", "Revisitada", "Zmodyfikowany"],
    "Lien": ["Link", "Link", "Enlace", "Link", "Link", "Link", "Link"],
    "À la main": ["By hand", "Von Hand", "A mano", "A mano", "Met de hand", "À mão", "Ręcznie"],
    "Votre base HOLM My Menu": ["Your HOLM My Menu database", "Ihre HOLM-My-Menu-Datenbank", "Tu base HOLM My Menu", "Il tuo database HOLM My Menu", "Uw HOLM My Menu-database", "A sua base HOLM My Menu", "Twoja baza HOLM My Menu"],
    "Actualiser": ["Refresh", "Aktualisieren", "Actualizar", "Aggiorna", "Vernieuwen", "Atualizar", "Odśwież"],
    "recettes": ["recipes", "Rezepte", "recetas", "ricette", "recepten", "receitas", "przepisy"],
    "ingrédients": ["ingredients", "Zutaten", "ingredientes", "ingredienti", "ingrediënten", "ingredientes", "składniki"],
    "repas planifiés": ["meals planned", "geplante Mahlzeiten", "comidas planificadas", "pasti pianificati", "geplande maaltijden", "refeições planeadas", "zaplanowane posiłki"],
    "sur les 8 dernières semaines et à venir": ["over the last 8 weeks and upcoming", "in den letzten 8 Wochen und demnächst", "en las últimas 8 semanas y próximas", "nelle ultime 8 settimane e in arrivo", "de afgelopen 8 weken en komende", "nas últimas 8 semanas e próximas", "w ostatnich 8 tygodniach i nadchodzące"],
    "occupés": ["used", "belegt", "ocupados", "occupati", "in gebruik", "ocupados", "zajęte"],
    "{n} favori": ["{n} favourite", "{n} Favorit", "{n} favorito", "{n} preferito", "{n} favoriet", "{n} favorito", "{n} ulubiony"],
    "{n} favoris": ["{n} favourites", "{n} Favoriten", "{n} favoritos", "{n} preferiti", "{n} favorieten", "{n} favoritos", "{n} ulubionych"],
    "{n} jamais planifiée": ["{n} never planned", "{n} nie geplant", "{n} nunca planificada", "{n} mai pianificata", "{n} nooit gepland", "{n} nunca planeada", "{n} nigdy nie zaplanowany"],
    "{n} jamais planifiées": ["{n} never planned", "{n} nie geplant", "{n} nunca planificadas", "{n} mai pianificate", "{n} nooit gepland", "{n} nunca planeadas", "{n} nigdy nie zaplanowanych"],
    "{a} avec fiche produit · {b} avec photo": ["{a} with product sheet · {b} with photo", "{a} mit Produktdaten · {b} mit Foto", "{a} con ficha de producto · {b} con foto", "{a} con scheda prodotto · {b} con foto", "{a} met productfiche · {b} met foto", "{a} com ficha de produto · {b} com foto", "{a} z kartą produktu · {b} ze zdjęciem"],
    "base {a} · {n} photos {b}": ["database {a} · {n} photos {b}", "Datenbank {a} · {n} Fotos {b}", "base {a} · {n} fotos {b}", "database {a} · {n} foto {b}", "database {a} · {n} foto's {b}", "base {a} · {n} fotos {b}", "baza {a} · {n} zdjęć {b}"],
    "Recettes les plus planifiées": ["Most planned recipes", "Am häufigsten geplante Rezepte", "Recetas más planificadas", "Ricette più pianificate", "Meest geplande recepten", "Receitas mais planeadas", "Najczęściej planowane przepisy"],
    "Dernière fois : {d}": ["Last time: {d}", "Zuletzt: {d}", "Última vez: {d}", "Ultima volta: {d}", "Laatste keer: {d}", "Última vez: {d}", "Ostatnio: {d}"],
    "Planifiez des repas : les recettes les plus cuisinées apparaîtront ici.": ["Plan some meals: the most cooked recipes will appear here.", "Planen Sie Mahlzeiten: Die meistgekochten Rezepte erscheinen hier.", "Planifica comidas: aquí aparecerán las recetas más cocinadas.", "Pianifica dei pasti: qui appariranno le ricette più cucinate.", "Plan maaltijden: de meest gekookte recepten verschijnen hier.", "Planeie refeições: as receitas mais cozinhadas aparecerão aqui.", "Zaplanuj posiłki: tu pojawią się najczęściej gotowane przepisy."],
    "Repas planifiés par semaine": ["Meals planned per week", "Geplante Mahlzeiten pro Woche", "Comidas planificadas por semana", "Pasti pianificati a settimana", "Geplande maaltijden per week", "Refeições planeadas por semana", "Zaplanowane posiłki na tydzień"],
    "Semaine du {d} : {n} repas": ["Week of {d}: {n} meals", "Woche vom {d}: {n} Mahlzeiten", "Semana del {d}: {n} comidas", "Settimana del {d}: {n} pasti", "Week van {d}: {n} maaltijden", "Semana de {d}: {n} refeições", "Tydzień od {d}: {n} posiłków"],
    "Ingrédients les plus utilisés": ["Most used ingredients", "Meistverwendete Zutaten", "Ingredientes más usados", "Ingredienti più usati", "Meest gebruikte ingrediënten", "Ingredientes mais usados", "Najczęściej używane składniki"],
    "Origine des recettes": ["Recipe sources", "Herkunft der Rezepte", "Origen de las recetas", "Origine delle ricette", "Herkomst van recepten", "Origem das receitas", "Źródła przepisów"],
    "🔔 Mes rappels": ["🔔 My reminders", "🔔 Meine Erinnerungen", "🔔 Mis recordatorios", "🔔 I miei promemoria", "🔔 Mijn herinneringen", "🔔 Os meus lembretes", "🔔 Moje przypomnienia"],
    "Nouveau rappel": ["New reminder", "Neue Erinnerung", "Nuevo recordatorio", "Nuovo promemoria", "Nieuwe herinnering", "Novo lembrete", "Nowe przypomnienie"],
    "Rappels ponctuels ou récurrents · Heure locale Home Assistant · Notifications Telegram et mobiles": ["One-off or recurring reminders · Home Assistant local time · Telegram and mobile notifications", "Einmalige oder wiederkehrende Erinnerungen · Home-Assistant-Ortszeit · Telegram- und Mobilbenachrichtigungen", "Recordatorios puntuales o recurrentes · Hora local de Home Assistant · Notificaciones Telegram y móviles", "Promemoria singoli o ricorrenti · Ora locale di Home Assistant · Notifiche Telegram e mobili", "Eenmalige of terugkerende herinneringen · Lokale tijd van Home Assistant · Telegram- en mobiele meldingen", "Lembretes pontuais ou recorrentes · Hora local do Home Assistant · Notificações Telegram e móveis", "Przypomnienia jednorazowe lub cykliczne · Czas lokalny Home Assistant · Powiadomienia Telegram i mobilne"],
    "Hebdomadaire": ["Weekly", "Wöchentlich", "Semanal", "Settimanale", "Wekelijks", "Semanal", "Co tydzień"],
    "Quotidien": ["Daily", "Täglich", "Diario", "Giornaliero", "Dagelijks", "Diário", "Codziennie"],
    "Une fois": ["Once", "Einmalig", "Una vez", "Una volta", "Eenmalig", "Uma vez", "Jednorazowo"],
    "Actif": ["Active", "Aktiv", "Activo", "Attivo", "Actief", "Ativo", "Aktywne"],
    "En pause": ["Paused", "Pausiert", "En pausa", "In pausa", "Gepauzeerd", "Em pausa", "Wstrzymane"],
    "Activer ou suspendre": ["Enable or pause", "Aktivieren oder pausieren", "Activar o pausar", "Attiva o sospendi", "Inschakelen of pauzeren", "Ativar ou suspender", "Włącz lub wstrzymaj"],
    "Tester": ["Test", "Testen", "Probar", "Prova", "Testen", "Testar", "Testuj"],
    "Modifier": ["Edit", "Bearbeiten", "Editar", "Modifica", "Bewerken", "Editar", "Edytuj"],
    "Aucun rappel. Créez votre premier rappel pour les courses, les menus, les recettes ou une tâche personnalisée.": ["No reminders. Create your first reminder for shopping, menus, recipes or a custom task.", "Keine Erinnerungen. Erstellen Sie Ihre erste Erinnerung für Einkauf, Menüs, Rezepte oder eine eigene Aufgabe.", "Sin recordatorios. Crea tu primer recordatorio para la compra, los menús, las recetas o una tarea personalizada.", "Nessun promemoria. Crea il tuo primo promemoria per la spesa, i menu, le ricette o un'attività personalizzata.", "Geen herinneringen. Maak uw eerste herinnering voor boodschappen, menu's, recepten of een eigen taak.", "Sem lembretes. Crie o seu primeiro lembrete para as compras, os menus, as receitas ou uma tarefa personalizada.", "Brak przypomnień. Utwórz pierwsze przypomnienie o zakupach, menu, przepisach lub własnym zadaniu."],
    "Modifier le rappel": ["Edit reminder", "Erinnerung bearbeiten", "Editar recordatorio", "Modifica promemoria", "Herinnering bewerken", "Editar lembrete", "Edytuj przypomnienie"],
    "Courses de la semaine": ["Weekly shopping", "Wocheneinkauf", "Compra de la semana", "Spesa della settimana", "Weekboodschappen", "Compras da semana", "Zakupy na tydzień"],
    "Type": ["Type", "Typ", "Tipo", "Tipo", "Type", "Tipo", "Typ"],
    "🛒 Courses": ["🛒 Shopping", "🛒 Einkauf", "🛒 Compra", "🛒 Spesa", "🛒 Boodschappen", "🛒 Compras", "🛒 Zakupy"],
    "📅 Menus incomplets": ["📅 Incomplete menus", "📅 Unvollständige Menüs", "📅 Menús incompletos", "📅 Menu incompleti", "📅 Onvolledige menu's", "📅 Menus incompletos", "📅 Niepełne menu"],
    "🍳 Préparation / recette": ["🍳 Prep / recipe", "🍳 Vorbereitung / Rezept", "🍳 Preparación / receta", "🍳 Preparazione / ricetta", "🍳 Voorbereiding / recept", "🍳 Preparação / receita", "🍳 Przygotowanie / przepis"],
    "🔔 Personnalisé": ["🔔 Custom", "🔔 Benutzerdefiniert", "🔔 Personalizado", "🔔 Personalizzato", "🔔 Aangepast", "🔔 Personalizado", "🔔 Własne"],
    "Fréquence": ["Frequency", "Häufigkeit", "Frecuencia", "Frequenza", "Frequentie", "Frequência", "Częstotliwość"],
    "Chaque jour": ["Every day", "Jeden Tag", "Cada día", "Ogni giorno", "Elke dag", "Todos os dias", "Codziennie"],
    "Chaque semaine": ["Every week", "Jede Woche", "Cada semana", "Ogni settimana", "Elke week", "Todas as semanas", "Co tydzień"],
    "Heure": ["Time", "Uhrzeit", "Hora", "Ora", "Tijd", "Hora", "Godzina"],
    "Date du rappel": ["Reminder date", "Datum der Erinnerung", "Fecha del recordatorio", "Data del promemoria", "Datum van de herinnering", "Data do lembrete", "Data przypomnienia"],
    "Jours de rappel": ["Reminder days", "Erinnerungstage", "Días del recordatorio", "Giorni del promemoria", "Herinneringsdagen", "Dias do lembrete", "Dni przypomnienia"],
    "Message / consigne": ["Message / instruction", "Nachricht / Anweisung", "Mensaje / indicación", "Messaggio / istruzione", "Bericht / instructie", "Mensagem / instrução", "Wiadomość / polecenie"],
    "📱 Notifications mobiles Home Assistant": ["📱 Home Assistant mobile notifications", "📱 Home-Assistant-Mobilbenachrichtigungen", "📱 Notificaciones móviles de Home Assistant", "📱 Notifiche mobili di Home Assistant", "📱 Mobiele meldingen van Home Assistant", "📱 Notificações móveis do Home Assistant", "📱 Powiadomienia mobilne Home Assistant"],
    "Envoie une notification push aux téléphones ou tablettes sélectionnés. Les appareils sont repris des entités de notification Home Assistant.": ["Sends a push notification to the selected phones or tablets. Devices come from Home Assistant's notification entities.", "Sendet eine Push-Benachrichtigung an die gewählten Telefone oder Tablets. Die Geräte stammen aus den Benachrichtigungsentitäten von Home Assistant.", "Envía una notificación push a los teléfonos o tabletas seleccionados. Los dispositivos proceden de las entidades de notificación de Home Assistant.", "Invia una notifica push ai telefoni o tablet selezionati. I dispositivi provengono dalle entità di notifica di Home Assistant.", "Stuurt een pushmelding naar de gekozen telefoons of tablets. De apparaten komen uit de meldingsentiteiten van Home Assistant.", "Envia uma notificação push para os telemóveis ou tablets selecionados. Os dispositivos vêm das entidades de notificação do Home Assistant.", "Wysyła powiadomienie push na wybrane telefony lub tablety. Urządzenia pochodzą z encji powiadomień Home Assistant."],
    "Aucune entité notify disponible.": ["No notify entity available.", "Keine notify-Entität verfügbar.", "Ninguna entidad notify disponible.", "Nessuna entità notify disponibile.", "Geen notify-entiteit beschikbaar.", "Nenhuma entidade notify disponível.", "Brak dostępnych encji notify."],
    "Envoie un message de rappel dans les conversations ou sujets déjà configurés pour la liste de courses. Il ne remplace pas le message interactif des courses.": ["Sends a reminder message to the chats or topics already set up for the shopping list. It doesn't replace the interactive shopping message.", "Sendet eine Erinnerung in die bereits für die Einkaufsliste eingerichteten Chats oder Themen. Sie ersetzt nicht die interaktive Einkaufsnachricht.", "Envía un mensaje de recordatorio a las conversaciones o temas ya configurados para la lista de la compra. No sustituye al mensaje interactivo de la compra.", "Invia un messaggio di promemoria nelle conversazioni o argomenti già configurati per la lista della spesa. Non sostituisce il messaggio interattivo della spesa.", "Stuurt een herinnering naar de chats of onderwerpen die al voor de boodschappenlijst zijn ingesteld. Het vervangt het interactieve boodschappenbericht niet.", "Envia uma mensagem de lembrete para as conversas ou tópicos já configurados para a lista de compras. Não substitui a mensagem interativa das compras.", "Wysyła przypomnienie do czatów lub wątków skonfigurowanych dla listy zakupów. Nie zastępuje interaktywnej wiadomości z zakupami."],
    "Conversation": ["Chat", "Chat", "Conversación", "Conversazione", "Chat", "Conversa", "Czat"],
    "Sujet": ["Topic", "Thema", "Tema", "Argomento", "Onderwerp", "Tópico", "Wątek"],
    "Aucune conversation enregistrée. Configure d'abord Telegram dans « Envoyer la liste de courses ».": ["No saved chat. First set up Telegram in \"Send the shopping list\".", "Kein gespeicherter Chat. Richte Telegram zuerst unter „Einkaufsliste senden“ ein.", "Ninguna conversación guardada. Configura primero Telegram en «Enviar la lista de la compra».", "Nessuna conversazione salvata. Configura prima Telegram in «Invia la lista della spesa».", "Geen opgeslagen chat. Stel Telegram eerst in bij \"Boodschappenlijst versturen\".", "Nenhuma conversa guardada. Configura primeiro o Telegram em «Enviar a lista de compras».", "Brak zapisanych czatów. Najpierw skonfiguruj Telegram w „Wyślij listę zakupów”."],
    "Envoie le rappel par e-mail avec le serveur SMTP configuré dans Home Assistant. Sélectionne des contacts du carnet ou saisis d'autres adresses.": ["Sends the reminder by e-mail using the SMTP server set up in Home Assistant. Pick contacts from the address book or enter other addresses.", "Sendet die Erinnerung per E-Mail über den in Home Assistant eingerichteten SMTP-Server. Wähle Kontakte aus dem Adressbuch oder gib andere Adressen ein.", "Envía el recordatorio por correo con el servidor SMTP configurado en Home Assistant. Selecciona contactos de la agenda o escribe otras direcciones.", "Invia il promemoria via e-mail con il server SMTP configurato in Home Assistant. Seleziona contatti dalla rubrica o inserisci altri indirizzi.", "Stuurt de herinnering per e-mail via de SMTP-server die in Home Assistant is ingesteld. Kies contacten uit het adresboek of vul andere adressen in.", "Envia o lembrete por e-mail com o servidor SMTP configurado no Home Assistant. Seleciona contactos do livro de endereços ou escreve outros endereços.", "Wysyła przypomnienie e-mailem przez serwer SMTP skonfigurowany w Home Assistant. Wybierz kontakty z książki adresowej lub wpisz inne adresy."],
    "Autres adresses e-mail (une par ligne)": ["Other e-mail addresses (one per line)", "Weitere E-Mail-Adressen (eine pro Zeile)", "Otras direcciones de correo (una por línea)", "Altri indirizzi e-mail (uno per riga)", "Andere e-mailadressen (één per regel)", "Outros endereços de e-mail (um por linha)", "Inne adresy e-mail (jeden w wierszu)"],
    "Envoyer uniquement si nécessaire": ["Only send if needed", "Nur bei Bedarf senden", "Enviar solo si es necesario", "Invia solo se necessario", "Alleen verzenden indien nodig", "Enviar apenas se necessário", "Wysyłaj tylko w razie potrzeby"],
    "Courses : uniquement s'il reste des articles. Menus : uniquement si des repas ne sont pas planifiés.": ["Shopping: only if items are left. Menus: only if some meals aren't planned.", "Einkauf: nur wenn noch Artikel übrig sind. Menüs: nur wenn Mahlzeiten nicht geplant sind.", "Compra: solo si quedan artículos. Menús: solo si hay comidas sin planificar.", "Spesa: solo se restano articoli. Menu: solo se ci sono pasti non pianificati.", "Boodschappen: alleen als er nog artikelen zijn. Menu's: alleen als er maaltijden niet gepland zijn.", "Compras: apenas se restarem artigos. Menus: apenas se houver refeições por planear.", "Zakupy: tylko jeśli zostały produkty. Menu: tylko jeśli są niezaplanowane posiłki."],
    "Rappel actif": ["Reminder active", "Erinnerung aktiv", "Recordatorio activo", "Promemoria attivo", "Herinnering actief", "Lembrete ativo", "Przypomnienie aktywne"],
    "🛒 Courses : vérifie les articles restant à acheter. Avec « Envoyer uniquement si nécessaire », aucun rappel n'est envoyé si la liste est terminée.": ["🛒 Shopping: checks the items left to buy. With \"Only send if needed\", no reminder is sent when the list is done.", "🛒 Einkauf: prüft die noch zu kaufenden Artikel. Mit „Nur bei Bedarf senden“ wird keine Erinnerung gesendet, wenn die Liste erledigt ist.", "🛒 Compra: comprueba los artículos pendientes. Con «Enviar solo si es necesario», no se envía nada si la lista está terminada.", "🛒 Spesa: controlla gli articoli ancora da comprare. Con «Invia solo se necessario», nessun promemoria se la lista è finita.", "🛒 Boodschappen: controleert wat er nog gekocht moet worden. Met \"Alleen verzenden indien nodig\" wordt niets verstuurd als de lijst af is.", "🛒 Compras: verifica os artigos por comprar. Com «Enviar apenas se necessário», nenhum lembrete é enviado se a lista estiver concluída.", "🛒 Zakupy: sprawdza produkty do kupienia. Z opcją „Wysyłaj tylko w razie potrzeby” nic nie zostanie wysłane, gdy lista jest gotowa."],
    "📅 Menus : vérifie les repas non planifiés sur les sept prochains jours. Avec « Envoyer uniquement si nécessaire », aucun rappel n'est envoyé si tous les menus sont complets.": ["📅 Menus: checks unplanned meals over the next seven days. With \"Only send if needed\", no reminder is sent when all menus are complete.", "📅 Menüs: prüft ungeplante Mahlzeiten der nächsten sieben Tage. Mit „Nur bei Bedarf senden“ wird keine Erinnerung gesendet, wenn alle Menüs vollständig sind.", "📅 Menús: comprueba las comidas sin planificar en los próximos siete días. Con «Enviar solo si es necesario», no se envía nada si todos los menús están completos.", "📅 Menu: controlla i pasti non pianificati nei prossimi sette giorni. Con «Invia solo se necessario», nessun promemoria se tutti i menu sono completi.", "📅 Menu's: controleert niet-geplande maaltijden in de komende zeven dagen. Met \"Alleen verzenden indien nodig\" wordt niets verstuurd als alle menu's compleet zijn.", "📅 Menus: verifica as refeições por planear nos próximos sete dias. Com «Enviar apenas se necessário», nenhum lembrete é enviado se todos os menus estiverem completos.", "📅 Menu: sprawdza niezaplanowane posiłki na najbliższe siedem dni. Z opcją „Wysyłaj tylko w razie potrzeby” nic nie zostanie wysłane, gdy wszystkie menu są pełne."],
    "🍳 Préparation : envoie la consigne saisie ci-dessous au moment choisi (par exemple « Décongeler le poulet »). Le délai n'est pas calculé automatiquement depuis la recette.": ["🍳 Prep: sends the instruction entered below at the chosen time (for example \"Defrost the chicken\"). The lead time isn't calculated from the recipe.", "🍳 Vorbereitung: sendet die unten eingegebene Anweisung zur gewählten Zeit (zum Beispiel „Hähnchen auftauen“). Die Vorlaufzeit wird nicht aus dem Rezept berechnet.", "🍳 Preparación: envía la indicación escrita abajo a la hora elegida (por ejemplo «Descongelar el pollo»). El plazo no se calcula a partir de la receta.", "🍳 Preparazione: invia l'istruzione inserita qui sotto all'ora scelta (ad esempio «Scongelare il pollo»). L'anticipo non è calcolato dalla ricetta.", "🍳 Voorbereiding: stuurt de instructie hieronder op het gekozen moment (bijvoorbeeld \"Kip ontdooien\"). De voorlooptijd wordt niet uit het recept berekend.", "🍳 Preparação: envia a instrução escrita abaixo à hora escolhida (por exemplo «Descongelar o frango»). O prazo não é calculado a partir da receita.", "🍳 Przygotowanie: wysyła wpisane poniżej polecenie o wybranej porze (np. „Rozmrozić kurczaka”). Czas nie jest liczony z przepisu."],
    "🔔 Personnalisé : envoie le texte saisi ci-dessous à l'heure programmée (par exemple « Acheter les pommes de terre à la ferme »), indépendamment des courses et des menus.": ["🔔 Custom: sends the text entered below at the scheduled time (for example \"Buy potatoes at the farm\"), regardless of shopping and menus.", "🔔 Benutzerdefiniert: sendet den unten eingegebenen Text zur geplanten Zeit (zum Beispiel „Kartoffeln beim Hof kaufen“), unabhängig von Einkauf und Menüs.", "🔔 Personalizado: envía el texto escrito abajo a la hora programada (por ejemplo «Comprar patatas en la granja»), independientemente de la compra y los menús.", "🔔 Personalizzato: invia il testo inserito qui sotto all'ora programmata (ad esempio «Comprare le patate alla fattoria»), indipendentemente da spesa e menu.", "🔔 Aangepast: stuurt de tekst hieronder op het geplande tijdstip (bijvoorbeeld \"Aardappelen kopen bij de boerderij\"), los van boodschappen en menu's.", "🔔 Personalizado: envia o texto escrito abaixo à hora programada (por exemplo «Comprar batatas na quinta»), independentemente das compras e dos menus.", "🔔 Własne: wysyła wpisany poniżej tekst o zaplanowanej porze (np. „Kupić ziemniaki w gospodarstwie”), niezależnie od zakupów i menu."],
    "Rappel enregistré": ["Reminder saved", "Erinnerung gespeichert", "Recordatorio guardado", "Promemoria salvato", "Herinnering opgeslagen", "Lembrete guardado", "Przypomnienie zapisane"],
    "semaine du {d}": ["week of {d}", "Woche vom {d}", "semana del {d}", "settimana del {d}", "week van {d}", "semana de {d}", "tydzień od {d}"],
    "le {d}": ["on {d}", "am {d}", "el {d}", "il {d}", "op {d}", "em {d}", "{d}"],
    "du {a} au {b}": ["from {a} to {b}", "vom {a} bis {b}", "del {a} al {b}", "dal {a} al {b}", "van {a} tot {b}", "de {a} a {b}", "od {a} do {b}"],
    "Générée pour la semaine du {d}": ["Generated for the week of {d}", "Erstellt für die Woche vom {d}", "Generada para la semana del {d}", "Generata per la settimana del {d}", "Aangemaakt voor de week van {d}", "Gerada para a semana de {d}", "Wygenerowana na tydzień od {d}"],
    "Générée pour le {d}": ["Generated for {d}", "Erstellt für den {d}", "Generada para el {d}", "Generata per il {d}", "Aangemaakt voor {d}", "Gerada para {d}", "Wygenerowana na {d}"],
    "Générée du {a} au {b}": ["Generated from {a} to {b}", "Erstellt vom {a} bis {b}", "Generada del {a} al {b}", "Generata dal {a} al {b}", "Aangemaakt van {a} tot {b}", "Gerada de {a} a {b}", "Wygenerowana od {a} do {b}"],
    "Dates": ["Dates", "Daten", "Fechas", "Date", "Datums", "Datas", "Daty"],
    "Du": ["From", "Vom", "Del", "Dal", "Van", "De", "Od"],
    "au": ["to", "bis", "al", "al", "tot", "a", "do"],
    "dates inversées": ["dates reversed", "Daten vertauscht", "fechas invertidas", "date invertite", "datums omgedraaid", "datas invertidas", "odwrócone daty"],
    "{n} jour": ["{n} day", "{n} Tag", "{n} día", "{n} giorno", "{n} dag", "{n} dia", "{n} dzień"],
    "{n} jours": ["{n} days", "{n} Tage", "{n} días", "{n} giorni", "{n} dagen", "{n} dias", "{n} dni"],
    "Générer": ["Generate", "Erstellen", "Generar", "Genera", "Aanmaken", "Gerar", "Generuj"],
    "Ajouter un article (Entrée)…": ["Add an item (Enter)…", "Artikel hinzufügen (Eingabe)…", "Añadir un artículo (Intro)…", "Aggiungi un articolo (Invio)…", "Artikel toevoegen (Enter)…", "Adicionar um artigo (Enter)…", "Dodaj produkt (Enter)…"],
    "Rayons": ["Aisles", "Abteilungen", "Secciones", "Reparti", "Afdelingen", "Secções", "Działy"],
    "Voir et restaurer les articles retirés": ["View and restore removed items", "Entfernte Artikel ansehen und wiederherstellen", "Ver y restaurar los artículos quitados", "Vedi e ripristina gli articoli rimossi", "Verwijderde artikelen bekijken en terugzetten", "Ver e restaurar os artigos retirados", "Pokaż i przywróć usunięte produkty"],
    "Articles retirés": ["Removed items", "Entfernte Artikel", "Artículos quitados", "Articoli rimossi", "Verwijderde artikelen", "Artigos retirados", "Usunięte produkty"],
    "{d}/{n} pris": ["{d}/{n} picked up", "{d}/{n} erledigt", "{d}/{n} cogidos", "{d}/{n} presi", "{d}/{n} gepakt", "{d}/{n} apanhados", "{d}/{n} w koszyku"],
    "Retirer les articles pris": ["Remove picked-up items", "Erledigte Artikel entfernen", "Quitar los artículos cogidos", "Rimuovi gli articoli presi", "Gepakte artikelen verwijderen", "Retirar os artigos apanhados", "Usuń produkty z koszyka"],
    "Envoyer (mail / Telegram)": ["Send (mail / Telegram)", "Senden (Mail / Telegram)", "Enviar (correo / Telegram)", "Invia (mail / Telegram)", "Versturen (mail / Telegram)", "Enviar (mail / Telegram)", "Wyślij (mail / Telegram)"],
    "Copier": ["Copy", "Kopieren", "Copiar", "Copia", "Kopiëren", "Copiar", "Kopiuj"],
    "Vider la liste": ["Empty the list", "Liste leeren", "Vaciar la lista", "Svuota la lista", "Lijst leegmaken", "Esvaziar a lista", "Wyczyść listę"],
    "ajouté": ["added", "hinzugefügt", "añadido", "aggiunto", "toegevoegd", "adicionado", "dodano"],
    "La liste est vide. Choisissez une semaine (ou des dates) et touchez <b>Générer</b> : les ingrédients des repas prévus sont additionnés et rangés par rayon.": ["The list is empty. Choose a week (or dates) and tap <b>Generate</b>: the ingredients of the planned meals are added up and sorted by aisle.", "Die Liste ist leer. Wählen Sie eine Woche (oder Daten) und tippen Sie auf <b>Erstellen</b>: Die Zutaten der geplanten Mahlzeiten werden addiert und nach Abteilung sortiert.", "La lista está vacía. Elige una semana (o fechas) y toca <b>Generar</b>: los ingredientes de las comidas previstas se suman y se ordenan por sección.", "La lista è vuota. Scegli una settimana (o delle date) e tocca <b>Genera</b>: gli ingredienti dei pasti previsti vengono sommati e ordinati per reparto.", "De lijst is leeg. Kies een week (of datums) en tik op <b>Aanmaken</b>: de ingrediënten van de geplande maaltijden worden opgeteld en per afdeling gesorteerd.", "A lista está vazia. Escolha uma semana (ou datas) e toque em <b>Gerar</b>: os ingredientes das refeições previstas são somados e arrumados por secção.", "Lista jest pusta. Wybierz tydzień (lub daty) i dotknij <b>Generuj</b>: składniki zaplanowanych posiłków zostaną zsumowane i posortowane według działów."],
    "Ces articles ne seront pas ajoutés à nouveau lors de la génération de cette période. Les recettes restent inchangées.": ["These items won't be added again when this period is generated. Recipes stay unchanged.", "Diese Artikel werden beim Erstellen dieses Zeitraums nicht erneut hinzugefügt. Die Rezepte bleiben unverändert.", "Estos artículos no se volverán a añadir al generar este periodo. Las recetas no cambian.", "Questi articoli non saranno aggiunti di nuovo generando questo periodo. Le ricette restano invariate.", "Deze artikelen worden niet opnieuw toegevoegd bij het aanmaken van deze periode. De recepten blijven ongewijzigd.", "Estes artigos não serão adicionados novamente ao gerar este período. As receitas ficam inalteradas.", "Te produkty nie zostaną ponownie dodane przy generowaniu tego okresu. Przepisy pozostają bez zmian."],
    "Restaurer": ["Restore", "Wiederherstellen", "Restaurar", "Ripristina", "Terugzetten", "Restaurar", "Przywróć"],
    "Tout restaurer": ["Restore all", "Alle wiederherstellen", "Restaurar todo", "Ripristina tutto", "Alles terugzetten", "Restaurar tudo", "Przywróć wszystko"],
    "Terminer": ["Done", "Fertig", "Terminar", "Fine", "Klaar", "Concluir", "Gotowe"],
    "Les articles restaurés réapparaîtront à la prochaine génération de la liste.": ["Restored items will reappear the next time the list is generated.", "Wiederhergestellte Artikel erscheinen beim nächsten Erstellen der Liste wieder.", "Los artículos restaurados reaparecerán en la próxima generación de la lista.", "Gli articoli ripristinati riappariranno alla prossima generazione della lista.", "Teruggezette artikelen verschijnen weer bij het volgende aanmaken van de lijst.", "Os artigos restaurados reaparecerão na próxima geração da lista.", "Przywrócone produkty pojawią się przy następnym generowaniu listy."],
    "Article réautorisé pour la prochaine génération": ["Item allowed again for the next generation", "Artikel für die nächste Erstellung wieder zugelassen", "Artículo permitido de nuevo para la próxima generación", "Articolo riammesso per la prossima generazione", "Artikel weer toegestaan bij het volgende aanmaken", "Artigo novamente permitido na próxima geração", "Produkt ponownie dozwolony przy następnym generowaniu"],
    "Tous les articles sont réautorisés pour la prochaine génération": ["All items are allowed again for the next generation", "Alle Artikel sind für die nächste Erstellung wieder zugelassen", "Todos los artículos vuelven a estar permitidos para la próxima generación", "Tutti gli articoli sono riammessi per la prossima generazione", "Alle artikelen zijn weer toegestaan bij het volgende aanmaken", "Todos os artigos estão novamente permitidos na próxima geração", "Wszystkie produkty ponownie dozwolone przy następnym generowaniu"],
    "Gérer les rayons": ["Manage aisles", "Abteilungen verwalten", "Gestionar las secciones", "Gestisci i reparti", "Afdelingen beheren", "Gerir as secções", "Zarządzaj działami"],
    "Catégories personnalisées": ["Custom categories", "Eigene Kategorien", "Categorías personalizadas", "Categorie personalizzate", "Eigen categorieën", "Categorias personalizadas", "Własne kategorie"],
    "Aucune catégorie personnalisée.": ["No custom categories.", "Keine eigenen Kategorien.", "Ninguna categoría personalizada.", "Nessuna categoria personalizzata.", "Geen eigen categorieën.", "Nenhuma categoria personalizada.", "Brak własnych kategorii."],
    "Nouvelle catégorie": ["New category", "Neue Kategorie", "Nueva categoría", "Nuova categoria", "Nieuwe categorie", "Nova categoria", "Nowa kategoria"],
    "Créer": ["Create", "Erstellen", "Crear", "Crea", "Aanmaken", "Criar", "Utwórz"],
    "Les rayons standards restent disponibles. La suppression déplace les articles vers Divers.": ["Standard aisles remain available. Deleting moves the items to Other.", "Die Standardabteilungen bleiben verfügbar. Beim Löschen werden die Artikel nach Sonstiges verschoben.", "Las secciones estándar siguen disponibles. Al eliminar, los artículos pasan a Varios.", "I reparti standard restano disponibili. L'eliminazione sposta gli articoli in Varie.", "De standaardafdelingen blijven beschikbaar. Verwijderen verplaatst de artikelen naar Overig.", "As secções padrão continuam disponíveis. Eliminar move os artigos para Diversos.", "Standardowe działy pozostają dostępne. Usunięcie przenosi produkty do Różne."],
    "Ex. Bricolage": ["e.g. DIY", "z. B. Heimwerken", "Ej. Bricolaje", "Es. Fai da te", "Bijv. Doe-het-zelf", "Ex. Bricolage", "Np. Majsterkowanie"],
    "Indique un nom de rayon": ["Enter an aisle name", "Gib einen Abteilungsnamen ein", "Indica un nombre de sección", "Indica un nome di reparto", "Vul een afdelingsnaam in", "Indica um nome de secção", "Podaj nazwę działu"],
    "Rayon créé": ["Aisle created", "Abteilung erstellt", "Sección creada", "Reparto creato", "Afdeling aangemaakt", "Secção criada", "Dział utworzony"],
    "Nom du rayon": ["Aisle name", "Name der Abteilung", "Nombre de la sección", "Nome del reparto", "Naam van de afdeling", "Nome da secção", "Nazwa działu"],
    "Pastille ou emoji": ["Badge or emoji", "Symbol oder Emoji", "Distintivo o emoji", "Pallino o emoji", "Badge of emoji", "Distintivo ou emoji", "Znaczek lub emoji"],
    "Supprimer ce rayon ? Ses articles seront déplacés vers Divers.": ["Delete this aisle? Its items will be moved to Other.", "Diese Abteilung löschen? Ihre Artikel werden nach Sonstiges verschoben.", "¿Eliminar esta sección? Sus artículos pasarán a Varios.", "Eliminare questo reparto? I suoi articoli saranno spostati in Varie.", "Deze afdeling verwijderen? De artikelen gaan naar Overig.", "Eliminar esta secção? Os seus artigos serão movidos para Diversos.", "Usunąć ten dział? Jego produkty trafią do Różne."],
    "Modifier un article": ["Edit an item", "Artikel bearbeiten", "Editar un artículo", "Modifica un articolo", "Artikel bewerken", "Editar um artigo", "Edytuj produkt"],
    "Article": ["Item", "Artikel", "Artículo", "Articolo", "Artikel", "Artigo", "Produkt"],
    "Quantité affichée": ["Displayed quantity", "Angezeigte Menge", "Cantidad mostrada", "Quantità mostrata", "Getoonde hoeveelheid", "Quantidade apresentada", "Wyświetlana ilość"],
    "Quantités regroupées : modifier les quantités dans les recettes sources pour éviter de les compter plusieurs fois.": ["Grouped quantities: edit the quantities in the source recipes to avoid counting them several times.", "Zusammengefasste Mengen: Ändern Sie die Mengen in den Quellrezepten, um sie nicht mehrfach zu zählen.", "Cantidades agrupadas: modifica las cantidades en las recetas de origen para no contarlas varias veces.", "Quantità raggruppate: modifica le quantità nelle ricette di origine per non contarle più volte.", "Samengevoegde hoeveelheden: wijzig de hoeveelheden in de bronrecepten om dubbel tellen te voorkomen.", "Quantidades agrupadas: altere as quantidades nas receitas de origem para não as contar várias vezes.", "Zgrupowane ilości: zmień ilości w przepisach źródłowych, by nie liczyć ich kilka razy."],
    "Rayon": ["Aisle", "Abteilung", "Sección", "Reparto", "Afdeling", "Secção", "Dział"],
    "+ Nouveau rayon": ["+ New aisle", "+ Neue Abteilung", "+ Nueva sección", "+ Nuovo reparto", "+ Nieuwe afdeling", "+ Nova secção", "+ Nowy dział"],
    "Les modifications ne changent pas les recettes d'origine.": ["Changes don't alter the original recipes.", "Änderungen wirken sich nicht auf die Originalrezepte aus.", "Los cambios no modifican las recetas originales.", "Le modifiche non cambiano le ricette originali.", "Wijzigingen veranderen de oorspronkelijke recepten niet.", "As alterações não mudam as receitas originais.", "Zmiany nie wpływają na oryginalne przepisy."],
    "Nom requis": ["Name required", "Name erforderlich", "Nombre obligatorio", "Nome obbligatorio", "Naam verplicht", "Nome obrigatório", "Nazwa wymagana"],
    "Liste de courses": ["Shopping list", "Einkaufsliste", "Lista de la compra", "Lista della spesa", "Boodschappenlijst", "Lista de compras", "Lista zakupów"],
    "(liste vide)": ["(empty list)", "(leere Liste)", "(lista vacía)", "(lista vuota)", "(lege lijst)", "(lista vazia)", "(pusta lista)"],
    "Envoyer la liste de courses": ["Send the shopping list", "Einkaufsliste senden", "Enviar la lista de la compra", "Invia la lista della spesa", "Boodschappenlijst versturen", "Enviar a lista de compras", "Wyślij listę zakupów"],
    "Par e-mail": ["By e-mail", "Per E-Mail", "Por correo", "Via e-mail", "Per e-mail", "Por e-mail", "E-mailem"],
    "Retirer du carnet": ["Remove from address book", "Aus dem Adressbuch entfernen", "Quitar de la agenda", "Rimuovi dalla rubrica", "Uit adresboek verwijderen", "Remover do livro de endereços", "Usuń z książki adresowej"],
    "Votre carnet d'adresses est vide : ajoutez les personnes à qui envoyer la liste.": ["Your address book is empty: add the people to send the list to.", "Ihr Adressbuch ist leer: Fügen Sie die Personen hinzu, an die die Liste gehen soll.", "Tu agenda está vacía: añade las personas a las que enviar la lista.", "La tua rubrica è vuota: aggiungi le persone a cui inviare la lista.", "Uw adresboek is leeg: voeg de mensen toe naar wie de lijst moet.", "O seu livro de endereços está vazio: adicione as pessoas a quem enviar a lista.", "Książka adresowa jest pusta: dodaj osoby, którym chcesz wysłać listę."],
    "Nom (Marie, Paul…)": ["Name (Mary, Paul…)", "Name (Marie, Paul…)", "Nombre (María, Pablo…)", "Nome (Maria, Paolo…)", "Naam (Marie, Paul…)", "Nome (Maria, Paulo…)", "Imię (Maria, Paweł…)"],
    "adresse e-mail": ["e-mail address", "E-Mail-Adresse", "dirección de correo", "indirizzo e-mail", "e-mailadres", "endereço de e-mail", "adres e-mail"],
    "Aucune intégration SMTP n'est configurée dans Home Assistant : utilisez « Ouvrir ma messagerie », ou ajoutez l'intégration SMTP pour envoyer directement.": ["No SMTP integration is set up in Home Assistant: use \"Open my mail app\", or add the SMTP integration to send directly.", "In Home Assistant ist keine SMTP-Integration eingerichtet: Verwenden Sie „Mein E-Mail-Programm öffnen“ oder fügen Sie die SMTP-Integration hinzu, um direkt zu senden.", "No hay ninguna integración SMTP configurada en Home Assistant: usa «Abrir mi correo» o añade la integración SMTP para enviar directamente.", "Nessuna integrazione SMTP configurata in Home Assistant: usa «Apri la mia posta» o aggiungi l'integrazione SMTP per inviare direttamente.", "Er is geen SMTP-integratie ingesteld in Home Assistant: gebruik \"Mijn mailprogramma openen\" of voeg de SMTP-integratie toe om direct te versturen.", "Nenhuma integração SMTP configurada no Home Assistant: use «Abrir o meu e-mail» ou adicione a integração SMTP para enviar diretamente.", "W Home Assistant nie skonfigurowano integracji SMTP: użyj „Otwórz moją pocztę” lub dodaj integrację SMTP, by wysyłać bezpośrednio."],
    "Envoyé par {s} (intégration {i}), en un seul message à toutes les adresses cochées.": ["Sent by {s} ({i} integration), in a single message to all ticked addresses.", "Gesendet von {s} (Integration {i}), in einer einzigen Nachricht an alle angekreuzten Adressen.", "Enviado por {s} (integración {i}), en un solo mensaje a todas las direcciones marcadas.", "Inviato da {s} (integrazione {i}), in un unico messaggio a tutti gli indirizzi selezionati.", "Verzonden door {s} (integratie {i}), in één bericht naar alle aangevinkte adressen.", "Enviado por {s} (integração {i}), numa só mensagem para todos os endereços marcados.", "Wysyłane przez {s} (integracja {i}) jedną wiadomością do wszystkich zaznaczonych adresów."],
    "Sur un téléphone ou une tablette (notification)": ["On a phone or tablet (notification)", "Auf ein Telefon oder Tablet (Benachrichtigung)", "En un teléfono o tableta (notificación)", "Su un telefono o tablet (notifica)", "Op een telefoon of tablet (melding)", "Num telemóvel ou tablet (notificação)", "Na telefon lub tablet (powiadomienie)"],
    "Par Telegram (liste interactive synchronisée)": ["By Telegram (synced interactive list)", "Per Telegram (synchronisierte interaktive Liste)", "Por Telegram (lista interactiva sincronizada)", "Via Telegram (lista interattiva sincronizzata)", "Via Telegram (gesynchroniseerde interactieve lijst)", "Por Telegram (lista interativa sincronizada)", "Przez Telegram (zsynchronizowana lista interaktywna)"],
    "Tout sélectionner / désélectionner": ["Select / deselect all", "Alle aus- / abwählen", "Seleccionar / deseleccionar todo", "Seleziona / deseleziona tutto", "Alles (de)selecteren", "Selecionar / desmarcar tudo", "Zaznacz / odznacz wszystko"],
    "Sélectionne les conversations destinataires. Le numéro du sujet est facultatif.": ["Pick the target chats. The topic number is optional.", "Wähle die Ziel-Chats. Die Themennummer ist optional.", "Selecciona las conversaciones destinatarias. El número de tema es opcional.", "Seleziona le conversazioni di destinazione. Il numero dell'argomento è facoltativo.", "Kies de doelchats. Het onderwerpnummer is optioneel.", "Seleciona as conversas de destino. O número do tópico é opcional.", "Wybierz czaty docelowe. Numer wątku jest opcjonalny."],
    "Chat ID (ex. -1001234567890)": ["Chat ID (e.g. -1001234567890)", "Chat-ID (z. B. -1001234567890)", "Chat ID (ej. -1001234567890)", "Chat ID (es. -1001234567890)", "Chat-ID (bijv. -1001234567890)", "Chat ID (ex. -1001234567890)", "Chat ID (np. -1001234567890)"],
    "Sujet / thread ID (facultatif)": ["Topic / thread ID (optional)", "Thema / Thread-ID (optional)", "Tema / thread ID (opcional)", "Argomento / thread ID (facoltativo)", "Onderwerp / thread-ID (optioneel)", "Tópico / thread ID (opcional)", "Wątek / thread ID (opcjonalnie)"],
    "Conversation Telegram": ["Telegram chat", "Telegram-Chat", "Conversación de Telegram", "Conversazione Telegram", "Telegram-chat", "Conversa Telegram", "Czat Telegram"],
    "Sujet :": ["Topic:", "Thema:", "Tema:", "Argomento:", "Onderwerp:", "Tópico:", "Wątek:"],
    "Sans sujet": ["No topic", "Ohne Thema", "Sin tema", "Senza argomento", "Zonder onderwerp", "Sem tópico", "Bez wątku"],
    "Retirer cette conversation": ["Remove this chat", "Diesen Chat entfernen", "Quitar esta conversación", "Rimuovi questa conversazione", "Deze chat verwijderen", "Remover esta conversa", "Usuń ten czat"],
    "Ouvrir ma messagerie": ["Open my mail app", "Mein E-Mail-Programm öffnen", "Abrir mi correo", "Apri la mia posta", "Mijn mailprogramma openen", "Abrir o meu e-mail", "Otwórz moją pocztę"],
    "Envoyer": ["Send", "Senden", "Enviar", "Invia", "Versturen", "Enviar", "Wyślij"],
    "Aperçu de la liste": ["List preview", "Vorschau der Liste", "Vista previa de la lista", "Anteprima della lista", "Voorbeeld van de lijst", "Pré-visualização da lista", "Podgląd listy"],
    "Identifiant Telegram invalide": ["Invalid Telegram ID", "Ungültige Telegram-ID", "Identificador de Telegram no válido", "Identificativo Telegram non valido", "Ongeldige Telegram-ID", "Identificador Telegram inválido", "Nieprawidłowy identyfikator Telegram"],
    "Retirer {n} du carnet d'adresses ?": ["Remove {n} from the address book?", "{n} aus dem Adressbuch entfernen?", "¿Quitar a {n} de la agenda?", "Rimuovere {n} dalla rubrica?", "{n} uit het adresboek verwijderen?", "Remover {n} do livro de endereços?", "Usunąć {n} z książki adresowej?"],
    "Indiquez une adresse e-mail": ["Enter an e-mail address", "E-Mail-Adresse angeben", "Indique una dirección de correo", "Indica un indirizzo e-mail", "Vul een e-mailadres in", "Indique um endereço de e-mail", "Podaj adres e-mail"],
    "{n} ajouté au carnet": ["{n} added to the address book", "{n} zum Adressbuch hinzugefügt", "{n} añadido a la agenda", "{n} aggiunto alla rubrica", "{n} toegevoegd aan het adresboek", "{n} adicionado ao livro de endereços", "Dodano {n} do książki adresowej"],
    "Envoi…": ["Sending…", "Senden…", "Enviando…", "Invio…", "Versturen…", "A enviar…", "Wysyłanie…"],
    "Liste envoyée": ["List sent", "Liste gesendet", "Lista enviada", "Lista inviata", "Lijst verzonden", "Lista enviada", "Lista wysłana"],
    "à {n} adresse": ["to {n} address", "an {n} Adresse", "a {n} dirección", "a {n} indirizzo", "naar {n} adres", "para {n} endereço", "na {n} adres"],
    "à {n} adresses": ["to {n} addresses", "an {n} Adressen", "a {n} direcciones", "a {n} indirizzi", "naar {n} adressen", "para {n} endereços", "na {n} adresów"],
    "et": ["and", "und", "y", "e", "en", "e", "i"],
    "à {n} appareil": ["to {n} device", "an {n} Gerät", "a {n} dispositivo", "a {n} dispositivo", "naar {n} apparaat", "para {n} dispositivo", "na {n} urządzenie"],
    "à {n} appareils": ["to {n} devices", "an {n} Geräte", "a {n} dispositivos", "a {n} dispositivi", "naar {n} apparaten", "para {n} dispositivos", "na {n} urządzeń"],
    "Envoi impossible": ["Sending failed", "Senden fehlgeschlagen", "No se pudo enviar", "Invio non riuscito", "Verzenden mislukt", "Envio impossível", "Wysyłanie nieudane"],
    "Notes": ["Notes", "Notizen", "Notas", "Note", "Notities", "Notas", "Notatki"],
    "note": ["note", "Notiz", "nota", "nota", "notitie", "nota", "notatka"],
    "Rien de prévu pour ce repas.": ["Nothing planned for this meal.", "Für diese Mahlzeit ist nichts geplant.", "Nada previsto para esta comida.", "Niente in programma per questo pasto.", "Niets gepland voor deze maaltijd.", "Nada previsto para esta refeição.", "Nic nie zaplanowano na ten posiłek."],
    "Vous pouvez ajouter plusieurs recettes et plusieurs ingrédients à ce repas.": ["You can add several recipes and ingredients to this meal.", "Sie können dieser Mahlzeit mehrere Rezepte und Zutaten hinzufügen.", "Puedes añadir varias recetas e ingredientes a esta comida.", "Puoi aggiungere più ricette e più ingredienti a questo pasto.", "U kunt meerdere recepten en ingrediënten aan deze maaltijd toevoegen.", "Pode adicionar várias receitas e ingredientes a esta refeição.", "Do tego posiłku możesz dodać kilka przepisów i składników."],
    "Ajouter : recette, ingrédient ou texte libre…": ["Add: recipe, ingredient or free text…", "Hinzufügen: Rezept, Zutat oder freier Text…", "Añadir: receta, ingrediente o texto libre…", "Aggiungi: ricetta, ingrediente o testo libero…", "Toevoegen: recept, ingrediënt of vrije tekst…", "Adicionar: receita, ingrediente ou texto livre…", "Dodaj: przepis, składnik lub dowolny tekst…"],
    "Déplacer vers": ["Move to", "Verschieben nach", "Mover a", "Sposta a", "Verplaatsen naar", "Mover para", "Przenieś do"],
    "copier": ["copy", "kopieren", "copiar", "copia", "kopiëren", "copiar", "kopiuj"],
    "Déjà dans ce repas": ["Already in this meal", "Bereits in dieser Mahlzeit", "Ya está en esta comida", "Già in questo pasto", "Al in deze maaltijd", "Já está nesta refeição", "Już w tym posiłku"],
    "Mes recettes": ["My recipes", "Meine Rezepte", "Mis recetas", "Le mie ricette", "Mijn recepten", "As minhas receitas", "Moje przepisy"],
    "Autres choix": ["Other options", "Weitere Möglichkeiten", "Otras opciones", "Altre scelte", "Andere opties", "Outras opções", "Inne opcje"],
    "Chercher « {q} » sur {s}": ["Search \"{q}\" on {s}", "„{q}“ auf {s} suchen", "Buscar «{q}» en {s}", "Cerca «{q}» su {s}", "\"{q}\" zoeken op {s}", "Procurar «{q}» no {s}", "Szukaj „{q}” w {s}"],
    "Ajouter « {q} » comme ingrédient": ["Add \"{q}\" as an ingredient", "„{q}“ als Zutat hinzufügen", "Añadir «{q}» como ingrediente", "Aggiungi «{q}» come ingrediente", "\"{q}\" als ingrediënt toevoegen", "Adicionar «{q}» como ingrediente", "Dodaj „{q}” jako składnik"],
    "Ajouter « {q} » comme note": ["Add \"{q}\" as a note", "„{q}“ als Notiz hinzufügen", "Añadir «{q}» como nota", "Aggiungi «{q}» come nota", "\"{q}\" als notitie toevoegen", "Adicionar «{q}» como nota", "Dodaj „{q}” jako notatkę"],
    "Recherche…": ["Searching…", "Suche…", "Buscando…", "Ricerca…", "Zoeken…", "A pesquisar…", "Wyszukiwanie…"],
    "Aucun produit.": ["No products.", "Keine Produkte.", "Ningún producto.", "Nessun prodotto.", "Geen producten.", "Nenhum produto.", "Brak produktów."],
    "« {n} » ajouté à vos ingrédients": ["\"{n}\" added to your ingredients", "„{n}“ zu Ihren Zutaten hinzugefügt", "«{n}» añadido a tus ingredientes", "«{n}» aggiunto ai tuoi ingredienti", "\"{n}\" toegevoegd aan uw ingrediënten", "«{n}» adicionado aos seus ingredientes", "Dodano „{n}” do składników"],
    "Photo illisible": ["Unreadable photo", "Foto nicht lesbar", "Foto ilegible", "Foto illeggibile", "Foto onleesbaar", "Foto ilegível", "Nieczytelne zdjęcie"],
    "Ouverture de l'appareil photo…": ["Opening the camera…", "Kamera wird geöffnet…", "Abriendo la cámara…", "Apertura della fotocamera…", "Camera openen…", "A abrir a câmara…", "Otwieranie aparatu…"],
    "Prendre la photo": ["Take the photo", "Foto aufnehmen", "Hacer la foto", "Scatta la foto", "Foto maken", "Tirar a foto", "Zrób zdjęcie"],
    "Changer de caméra": ["Switch camera", "Kamera wechseln", "Cambiar de cámara", "Cambia fotocamera", "Andere camera", "Mudar de câmara", "Zmień aparat"],
    "Choisir une photo": ["Choose a photo", "Foto wählen", "Elegir una foto", "Scegli una foto", "Foto kiezen", "Escolher uma foto", "Wybierz zdjęcie"],
    "Prendre une photo": ["Take a photo", "Foto aufnehmen", "Hacer una foto", "Scatta una foto", "Foto maken", "Tirar uma foto", "Zrób zdjęcie"],
    "Recherche sur {s}…": ["Searching {s}…", "Suche auf {s}…", "Buscando en {s}…", "Ricerca su {s}…", "Zoeken op {s}…", "A pesquisar no {s}…", "Wyszukiwanie w {s}…"],
    "Aucune recette trouvée sur {s}.": ["No recipe found on {s}.", "Kein Rezept auf {s} gefunden.", "No se encontró ninguna receta en {s}.", "Nessuna ricetta trovata su {s}.", "Geen recept gevonden op {s}.", "Nenhuma receita encontrada no {s}.", "Nie znaleziono przepisów w {s}."],
    "{n} résultats": ["{n} results", "{n} Ergebnisse", "{n} resultados", "{n} risultati", "{n} resultaten", "{n} resultados", "{n} wyników"],
    "{n} résultat": ["{n} result", "{n} Ergebnis", "{n} resultado", "{n} risultato", "{n} resultaat", "{n} resultado", "{n} wynik"],
    "déjà importée": ["already imported", "bereits importiert", "ya importada", "già importata", "al geïmporteerd", "já importada", "już zaimportowany"],
    "« {n} » importée": ["\"{n}\" imported", "„{n}“ importiert", "«{n}» importada", "«{n}» importata", "\"{n}\" geïmporteerd", "«{n}» importada", "Zaimportowano „{n}”"],
    "Import impossible": ["Import failed", "Import fehlgeschlagen", "No se pudo importar", "Importazione non riuscita", "Importeren mislukt", "Importação impossível", "Import nieudany"],
    "Copie créée : « {n} (revisitée) »": ["Copy created: \"{n} (revisited)\"", "Kopie erstellt: „{n} (abgewandelt)“", "Copia creada: «{n} (versionada)»", "Copia creata: «{n} (rivisitata)»", "Kopie gemaakt: \"{n} (bewerkt)\"", "Cópia criada: «{n} (revisitada)»", "Utworzono kopię: „{n} (zmodyfikowany)”"],
    "Recette introuvable": ["Recipe not found", "Rezept nicht gefunden", "Receta no encontrada", "Ricetta non trovata", "Recept niet gevonden", "Receita não encontrada", "Nie znaleziono przepisu"],
    "Prépa": ["Prep", "Vorb.", "Prep.", "Prep.", "Voorb.", "Prep.", "Przyg."],
    "Cuisson": ["Cooking", "Garzeit", "Cocción", "Cottura", "Bereiding", "Cozedura", "Gotowanie"],
    "Ouvrir dans Mealie": ["Open in Mealie", "In Mealie öffnen", "Abrir en Mealie", "Apri in Mealie", "Openen in Mealie", "Abrir no Mealie", "Otwórz w Mealie"],
    "Envoyer vers Mealie": ["Send to Mealie", "An Mealie senden", "Enviar a Mealie", "Invia a Mealie", "Naar Mealie sturen", "Enviar para o Mealie", "Wyślij do Mealie"],
    "Voir la recette d'origine": ["See the original recipe", "Originalrezept ansehen", "Ver la receta original", "Vedi la ricetta originale", "Origineel recept bekijken", "Ver a receita original", "Zobacz oryginalny przepis"],
    "Planifier": ["Plan", "Planen", "Planificar", "Pianifica", "Plannen", "Planear", "Zaplanuj"],
    "Favori": ["Favourite", "Favorit", "Favorito", "Preferito", "Favoriet", "Favorito", "Ulubiony"],
    "Ajouter aux favoris": ["Add to favourites", "Zu Favoriten hinzufügen", "Añadir a favoritos", "Aggiungi ai preferiti", "Aan favorieten toevoegen", "Adicionar aos favoritos", "Dodaj do ulubionych"],
    "Dupliquer": ["Duplicate", "Duplizieren", "Duplicar", "Duplica", "Dupliceren", "Duplicar", "Duplikuj"],
    "Créer une copie à modifier, l'original reste intact": ["Create a copy to edit, the original stays untouched", "Eine bearbeitbare Kopie erstellen, das Original bleibt unverändert", "Crear una copia para modificar; el original queda intacto", "Crea una copia da modificare, l'originale resta intatto", "Een kopie maken om te bewerken, het origineel blijft intact", "Criar uma cópia para editar; o original fica intacto", "Utwórz kopię do edycji, oryginał pozostaje bez zmian"],
    "Source": ["Source", "Quelle", "Fuente", "Fonte", "Bron", "Fonte", "Źródło"],
    "Inspirée de": ["Inspired by", "Inspiriert von", "Inspirada en", "Ispirata a", "Geïnspireerd op", "Inspirada em", "Na podstawie"],
    "Préparation": ["Method", "Zubereitung", "Preparación", "Preparazione", "Bereiding", "Preparação", "Przygotowanie"],
    "Aucune étape.": ["No steps.", "Keine Schritte.", "Ningún paso.", "Nessun passaggio.", "Geen stappen.", "Nenhum passo.", "Brak kroków."],
    "Supprimer « {n} » ?": ["Delete \"{n}\"?", "„{n}“ löschen?", "¿Eliminar «{n}»?", "Eliminare «{n}»?", "\"{n}\" verwijderen?", "Eliminar «{n}»?", "Usunąć „{n}”?"],
    "« {n} » envoyée vers Mealie": ["\"{n}\" sent to Mealie", "„{n}“ an Mealie gesendet", "«{n}» enviada a Mealie", "«{n}» inviata a Mealie", "\"{n}\" naar Mealie gestuurd", "«{n}» enviada para o Mealie", "Wysłano „{n}” do Mealie"],
    "« {n} » est déjà dans Mealie": ["\"{n}\" is already in Mealie", "„{n}“ ist bereits in Mealie", "«{n}» ya está en Mealie", "«{n}» è già in Mealie", "\"{n}\" staat al in Mealie", "«{n}» já está no Mealie", "„{n}” jest już w Mealie"],
    "Planifier « {n} »": ["Plan \"{n}\"", "„{n}“ planen", "Planificar «{n}»", "Pianifica «{n}»", "\"{n}\" plannen", "Planear «{n}»", "Zaplanuj „{n}”"],
    "{n} personnes · choisissez un repas": ["{n} servings · choose a meal", "{n} Personen · Mahlzeit wählen", "{n} personas · elige una comida", "{n} persone · scegli un pasto", "{n} personen · kies een maaltijd", "{n} pessoas · escolha uma refeição", "{n} os. · wybierz posiłek"],
    "Ajoutée au {s} du {d}": ["Added to {s} on {d}", "Zum {s} am {d} hinzugefügt", "Añadida a la {s} del {d}", "Aggiunta al {s} di {d}", "Toegevoegd aan {s} op {d}", "Adicionada ao {s} de {d}", "Dodano do: {s}, {d}"],
    "Nouvelle recette": ["New recipe", "Neues Rezept", "Nueva receta", "Nuova ricetta", "Nieuw recept", "Nova receita", "Nowy przepis"],
    "Modifier « {n} »": ["Edit \"{n}\"", "„{n}“ bearbeiten", "Editar «{n}»", "Modifica «{n}»", "\"{n}\" bewerken", "Editar «{n}»", "Edytuj „{n}”"],
    "Personnes": ["Servings", "Personen", "Personas", "Persone", "Personen", "Pessoas", "Porcje"],
    "Préparation (min)": ["Prep (min)", "Vorbereitung (Min.)", "Preparación (min)", "Preparazione (min)", "Voorbereiding (min)", "Preparação (min)", "Przygotowanie (min)"],
    "Cuisson (min)": ["Cooking (min)", "Garzeit (Min.)", "Cocción (min)", "Cottura (min)", "Bereiding (min)", "Cozedura (min)", "Gotowanie (min)"],
    "Catégorie": ["Category", "Kategorie", "Categoría", "Categoria", "Categorie", "Categoria", "Kategoria"],
    "Plat principal, dessert…": ["Main course, dessert…", "Hauptgericht, Dessert…", "Plato principal, postre…", "Piatto principale, dessert…", "Hoofdgerecht, dessert…", "Prato principal, sobremesa…", "Danie główne, deser…"],
    "Photo": ["Photo", "Foto", "Foto", "Foto", "Foto", "Foto", "Zdjęcie"],
    "Ou une adresse d'image sur Internet": ["Or an image address on the web", "Oder eine Bildadresse im Internet", "O una dirección de imagen en Internet", "Oppure un indirizzo di immagine su Internet", "Of een afbeeldingsadres op internet", "Ou um endereço de imagem na Internet", "Lub adres obrazu w internecie"],
    "Ingrédients — un par ligne (ex. « 200 g de farine »)": ["Ingredients — one per line (e.g. \"200 g flour\")", "Zutaten — eine pro Zeile (z. B. „200 g Mehl“)", "Ingredientes — uno por línea (ej. «200 g de harina»)", "Ingredienti — uno per riga (es. «200 g di farina»)", "Ingrediënten — één per regel (bijv. \"200 g bloem\")", "Ingredientes — um por linha (ex. «200 g de farinha»)", "Składniki — jeden w wierszu (np. „200 g mąki”)"],
    "Étapes — une par ligne": ["Steps — one per line", "Schritte — einer pro Zeile", "Pasos — uno por línea", "Passaggi — uno per riga", "Stappen — één per regel", "Passos — um por linha", "Kroki — jeden w wierszu"],
    "Texte non classé ({n} lignes) — à vérifier": ["Unsorted text ({n} lines) — to check", "Nicht zugeordneter Text ({n} Zeilen) — bitte prüfen", "Texto sin clasificar ({n} líneas) — a revisar", "Testo non classificato ({n} righe) — da verificare", "Niet ingedeelde tekst ({n} regels) — controleren", "Texto não classificado ({n} linhas) — a verificar", "Niesklasyfikowany tekst ({n} wierszy) — do sprawdzenia"],
    "Donnez un nom à la recette": ["Give the recipe a name", "Geben Sie dem Rezept einen Namen", "Pon un nombre a la receta", "Dai un nome alla ricetta", "Geef het recept een naam", "Dê um nome à receita", "Nadaj przepisowi nazwę"],
    "Recette enregistrée": ["Recipe saved", "Rezept gespeichert", "Receta guardada", "Ricetta salvata", "Recept opgeslagen", "Receita guardada", "Przepis zapisany"],
    "Recette et photo enregistrées": ["Recipe and photo saved", "Rezept und Foto gespeichert", "Receta y foto guardadas", "Ricetta e foto salvate", "Recept en foto opgeslagen", "Receita e foto guardadas", "Przepis i zdjęcie zapisane"],
    "Ajouter une recette": ["Add a recipe", "Rezept hinzufügen", "Añadir una receta", "Aggiungi una ricetta", "Recept toevoegen", "Adicionar uma receita", "Dodaj przepis"],
    "Recherche": ["Search", "Suche", "Búsqueda", "Ricerca", "Zoeken", "Pesquisa", "Szukaj"],
    "Chercher": ["Search", "Suchen", "Buscar", "Cerca", "Zoeken", "Procurar", "Szukaj"],
    "Ex. lasagnes, gratin dauphinois, tarte aux pommes…": ["e.g. lasagne, potato gratin, apple pie…", "z. B. Lasagne, Kartoffelgratin, Apfelkuchen…", "Ej. lasaña, gratén de patatas, tarta de manzana…", "Es. lasagne, gratin di patate, torta di mele…", "Bijv. lasagne, aardappelgratin, appeltaart…", "Ex. lasanha, gratinado de batata, tarte de maçã…", "Np. lasagne, zapiekanka ziemniaczana, szarlotka…"],
    "Collez l'adresse d'une recette : Marmiton, 750g, CuisineAZ, Journal des Femmes… (tout site qui décrit ses recettes au format standard).": ["Paste a recipe address: Marmiton, 750g, CuisineAZ, Journal des Femmes… (any site that describes its recipes in the standard format).", "Fügen Sie die Adresse eines Rezepts ein: Marmiton, 750g, CuisineAZ, Journal des Femmes… (jede Website, die ihre Rezepte im Standardformat beschreibt).", "Pega la dirección de una receta: Marmiton, 750g, CuisineAZ, Journal des Femmes… (cualquier web que describa sus recetas en el formato estándar).", "Incolla l'indirizzo di una ricetta: Marmiton, 750g, CuisineAZ, Journal des Femmes… (qualsiasi sito che descrive le ricette nel formato standard).", "Plak het adres van een recept: Marmiton, 750g, CuisineAZ, Journal des Femmes… (elke site die recepten in het standaardformaat beschrijft).", "Cole o endereço de uma receita: Marmiton, 750g, CuisineAZ, Journal des Femmes… (qualquer site que descreva as receitas no formato padrão).", "Wklej adres przepisu: Marmiton, 750g, CuisineAZ, Journal des Femmes… (każda strona opisująca przepisy w standardowym formacie)."],
    "Importer": ["Import", "Importieren", "Importar", "Importa", "Importeren", "Importar", "Importuj"],
    "Adresse invalide": ["Invalid address", "Ungültige Adresse", "Dirección no válida", "Indirizzo non valido", "Ongeldig adres", "Endereço inválido", "Nieprawidłowy adres"],
    "Import…": ["Importing…", "Import…", "Importando…", "Importazione…", "Importeren…", "A importar…", "Importowanie…"],
    "Cette recette est déjà dans votre base": ["This recipe is already in your database", "Dieses Rezept ist bereits in Ihrer Datenbank", "Esta receta ya está en tu base", "Questa ricetta è già nel tuo database", "Dit recept staat al in uw database", "Esta receita já está na sua base", "Ten przepis jest już w bazie"],
    "Choisissez un fichier PDF (8 Mo maximum). L'extraction peut ne pas fonctionner avec les PDF scannés ou constitués uniquement d'images. Le fichier n'est pas conservé.": ["Choose a PDF file (8 MB maximum). Extraction may not work with scanned or image-only PDFs. The file isn't kept.", "Wählen Sie eine PDF-Datei (höchstens 8 MB). Bei gescannten oder reinen Bild-PDFs funktioniert die Extraktion eventuell nicht. Die Datei wird nicht gespeichert.", "Elige un archivo PDF (8 MB como máximo). La extracción puede no funcionar con PDF escaneados o solo de imágenes. El archivo no se conserva.", "Scegli un file PDF (massimo 8 MB). L'estrazione potrebbe non funzionare con PDF scansionati o di sole immagini. Il file non viene conservato.", "Kies een PDF-bestand (maximaal 8 MB). Extractie werkt mogelijk niet bij gescande of alleen-beeld-PDF's. Het bestand wordt niet bewaard.", "Escolha um ficheiro PDF (máximo 8 MB). A extração pode não funcionar com PDF digitalizados ou só de imagens. O ficheiro não é guardado.", "Wybierz plik PDF (maks. 8 MB). Wyodrębnianie może nie działać z zeskanowanymi PDF lub złożonymi z samych obrazów. Plik nie jest przechowywany."],
    "Fichier depuis cet appareil": ["File from this device", "Datei von diesem Gerät", "Archivo de este dispositivo", "File da questo dispositivo", "Bestand van dit apparaat", "Ficheiro deste dispositivo", "Plik z tego urządzenia"],
    "Analyser le fichier": ["Analyse the file", "Datei analysieren", "Analizar el archivo", "Analizza il file", "Bestand analyseren", "Analisar o ficheiro", "Analizuj plik"],
    "Sélectionnez un PDF": ["Select a PDF", "Wählen Sie ein PDF", "Selecciona un PDF", "Seleziona un PDF", "Kies een PDF", "Selecione um PDF", "Wybierz PDF"],
    "Seuls les fichiers PDF sont acceptés": ["Only PDF files are accepted", "Nur PDF-Dateien werden akzeptiert", "Solo se aceptan archivos PDF", "Sono accettati solo file PDF", "Alleen PDF-bestanden worden geaccepteerd", "Só são aceites ficheiros PDF", "Akceptowane są tylko pliki PDF"],
    "Fichier supérieur à 8 Mo": ["File larger than 8 MB", "Datei größer als 8 MB", "Archivo de más de 8 MB", "File superiore a 8 MB", "Bestand groter dan 8 MB", "Ficheiro maior do que 8 MB", "Plik większy niż 8 MB"],
    "Le fichier est vide": ["The file is empty", "Die Datei ist leer", "El archivo está vacío", "Il file è vuoto", "Het bestand is leeg", "O ficheiro está vazio", "Plik jest pusty"],
    "Lecture du fichier impossible": ["Can't read the file", "Datei kann nicht gelesen werden", "No se puede leer el archivo", "Impossibile leggere il file", "Bestand kan niet worden gelezen", "Não é possível ler o ficheiro", "Nie można odczytać pliku"],
    "Transfert": ["Upload", "Übertragung", "Transferencia", "Trasferimento", "Overdracht", "Transferência", "Przesyłanie"],
    "Analyse du document en cours…": ["Analysing the document…", "Dokument wird analysiert…", "Analizando el documento…", "Analisi del documento in corso…", "Document wordt geanalyseerd…", "A analisar o documento…", "Analiza dokumentu…"],
    "Analyse impossible": ["Analysis failed", "Analyse fehlgeschlagen", "No se pudo analizar", "Analisi non riuscita", "Analyse mislukt", "Análise impossível", "Analiza nieudana"],
    "Lecture de vos recettes Mealie…": ["Reading your Mealie recipes…", "Ihre Mealie-Rezepte werden gelesen…", "Leyendo tus recetas de Mealie…", "Lettura delle tue ricette Mealie…", "Uw Mealie-recepten lezen…", "A ler as suas receitas Mealie…", "Odczytywanie przepisów z Mealie…"],
    "{n} recettes · {i} déjà importées": ["{n} recipes · {i} already imported", "{n} Rezepte · {i} bereits importiert", "{n} recetas · {i} ya importadas", "{n} ricette · {i} già importate", "{n} recepten · {i} al geïmporteerd", "{n} receitas · {i} já importadas", "{n} przepisów · {i} już zaimportowanych"],
    "Tout cocher": ["Tick all", "Alle ankreuzen", "Marcar todo", "Seleziona tutto", "Alles aanvinken", "Marcar tudo", "Zaznacz wszystko"],
    "Tout décocher": ["Untick all", "Alle abwählen", "Desmarcar todo", "Deseleziona tutto", "Alles uitvinken", "Desmarcar tudo", "Odznacz wszystko"],
    "importée": ["imported", "importiert", "importada", "importata", "geïmporteerd", "importada", "zaimportowany"],
    "Importer {n} recette": ["Import {n} recipe", "{n} Rezept importieren", "Importar {n} receta", "Importa {n} ricetta", "{n} recept importeren", "Importar {n} receita", "Importuj {n} przepis"],
    "Importer {n} recettes": ["Import {n} recipes", "{n} Rezepte importieren", "Importar {n} recetas", "Importa {n} ricette", "{n} recepten importeren", "Importar {n} receitas", "Importuj {n} przepisów"],
    "Import de {n} recettes…": ["Importing {n} recipes…", "{n} Rezepte werden importiert…", "Importando {n} recetas…", "Importazione di {n} ricette…", "{n} recepten importeren…", "A importar {n} receitas…", "Importowanie {n} przepisów…"],
    "{n} recette(s) importée(s) depuis Mealie": ["{n} recipe(s) imported from Mealie", "{n} Rezept(e) aus Mealie importiert", "{n} receta(s) importada(s) desde Mealie", "{n} ricetta/e importata/e da Mealie", "{n} recept(en) geïmporteerd uit Mealie", "{n} receita(s) importada(s) do Mealie", "Zaimportowano z Mealie: {n}"],
    "{n} erreur(s)": ["{n} error(s)", "{n} Fehler", "{n} error(es)", "{n} errore/i", "{n} fout(en)", "{n} erro(s)", "błędów: {n}"],
    "Ajouter un ingrédient": ["Add an ingredient", "Zutat hinzufügen", "Añadir un ingrediente", "Aggiungi un ingrediente", "Ingrediënt toevoegen", "Adicionar um ingrediente", "Dodaj składnik"],
    "Ex. purée, Nutella… ou un code-barre": ["e.g. mash, Nutella… or a barcode", "z. B. Püree, Nutella… oder ein Barcode", "Ej. puré, Nutella… o un código de barras", "Es. purè, Nutella… o un codice a barre", "Bijv. puree, Nutella… of een barcode", "Ex. puré, Nutella… ou um código de barras", "Np. puree, Nutella… lub kod kreskowy"],
    "Scanner": ["Scan", "Scannen", "Escanear", "Scansiona", "Scannen", "Digitalizar", "Skanuj"],
    "Scanner un code-barre": ["Scan a barcode", "Barcode scannen", "Escanear un código de barras", "Scansiona un codice a barre", "Barcode scannen", "Digitalizar um código de barras", "Skanuj kod kreskowy"],
    "Recherche dans votre base et sur Open Food Facts…": ["Searching your database and Open Food Facts…", "Suche in Ihrer Datenbank und auf Open Food Facts…", "Buscando en tu base y en Open Food Facts…", "Ricerca nel tuo database e su Open Food Facts…", "Zoeken in uw database en op Open Food Facts…", "A pesquisar na sua base e no Open Food Facts…", "Wyszukiwanie w bazie i w Open Food Facts…"],
    "Déjà dans votre base": ["Already in your database", "Bereits in Ihrer Datenbank", "Ya en tu base", "Già nel tuo database", "Al in uw database", "Já na sua base", "Już w bazie"],
    "Nom dans votre base": ["Name in your database", "Name in Ihrer Datenbank", "Nombre en tu base", "Nome nel tuo database", "Naam in uw database", "Nome na sua base", "Nazwa w bazie"],
    "Ajouter sans produit": ["Add without a product", "Ohne Produkt hinzufügen", "Añadir sin producto", "Aggiungi senza prodotto", "Toevoegen zonder product", "Adicionar sem produto", "Dodaj bez produktu"],
    "vous pourrez associer un produit plus tard": ["you can link a product later", "Sie können später ein Produkt zuordnen", "podrás asociar un producto más tarde", "potrai associare un prodotto più tardi", "u kunt later een product koppelen", "poderá associar um produto mais tarde", "produkt możesz powiązać później"],
    "Ou choisir un produit Open Food Facts": ["Or choose an Open Food Facts product", "Oder ein Open-Food-Facts-Produkt wählen", "O elige un producto de Open Food Facts", "Oppure scegli un prodotto Open Food Facts", "Of kies een Open Food Facts-product", "Ou escolha um produto Open Food Facts", "Lub wybierz produkt z Open Food Facts"],
    "« {n} » ajouté": ["\"{n}\" added", "„{n}“ hinzugefügt", "«{n}» añadido", "«{n}» aggiunto", "\"{n}\" toegevoegd", "«{n}» adicionado", "Dodano „{n}”"],
    "« {n} » ajouté avec sa fiche produit": ["\"{n}\" added with its product sheet", "„{n}“ mit Produktdaten hinzugefügt", "«{n}» añadido con su ficha de producto", "«{n}» aggiunto con la scheda prodotto", "\"{n}\" toegevoegd met productfiche", "«{n}» adicionado com a ficha de produto", "Dodano „{n}” z kartą produktu"],
    "Code-barre": ["Barcode", "Barcode", "Código de barras", "Codice a barre", "Barcode", "Código de barras", "Kod kreskowy"],
    "Recherche du produit sur Open Food Facts…": ["Looking up the product on Open Food Facts…", "Produkt wird auf Open Food Facts gesucht…", "Buscando el producto en Open Food Facts…", "Ricerca del prodotto su Open Food Facts…", "Product zoeken op Open Food Facts…", "A procurar o produto no Open Food Facts…", "Wyszukiwanie produktu w Open Food Facts…"],
    "Scanner à nouveau": ["Scan again", "Erneut scannen", "Escanear de nuevo", "Scansiona di nuovo", "Opnieuw scannen", "Digitalizar novamente", "Skanuj ponownie"],
    "« {n} » est déjà dans vos ingrédients": ["\"{n}\" is already in your ingredients", "„{n}“ ist bereits in Ihren Zutaten", "«{n}» ya está en tus ingredientes", "«{n}» è già tra i tuoi ingredienti", "\"{n}\" staat al bij uw ingrediënten", "«{n}» já está nos seus ingredientes", "„{n}” jest już w składnikach"],
    "Ajouter à mes ingrédients": ["Add to my ingredients", "Zu meinen Zutaten hinzufügen", "Añadir a mis ingredientes", "Aggiungi ai miei ingredienti", "Aan mijn ingrediënten toevoegen", "Adicionar aos meus ingredientes", "Dodaj do moich składników"],
    "Ouverture de la caméra…": ["Opening the camera…", "Kamera wird geöffnet…", "Abriendo la cámara…", "Apertura della fotocamera…", "Camera openen…", "A abrir a câmara…", "Otwieranie aparatu…"],
    "Valider": ["Confirm", "Bestätigen", "Confirmar", "Conferma", "Bevestigen", "Confirmar", "Zatwierdź"],
    "Photographier le code": ["Photograph the code", "Code fotografieren", "Fotografiar el código", "Fotografa il codice", "Code fotograferen", "Fotografar o código", "Sfotografuj kod"],
    "ou tapez le numéro sous le code-barre": ["or type the number under the barcode", "oder die Nummer unter dem Barcode eingeben", "o escribe el número bajo el código de barras", "oppure digita il numero sotto il codice a barre", "of typ het nummer onder de barcode", "ou escreva o número por baixo do código de barras", "lub wpisz numer pod kodem kreskowym"],
    "Lecture de la photo…": ["Reading the photo…", "Foto wird gelesen…", "Leyendo la foto…", "Lettura della foto…", "Foto lezen…", "A ler a foto…", "Odczytywanie zdjęcia…"],
    "Aucun code-barre lu sur la photo. Réessayez de plus près.": ["No barcode read on the photo. Try again closer.", "Kein Barcode auf dem Foto erkannt. Versuchen Sie es näher.", "No se leyó ningún código en la foto. Inténtalo más cerca.", "Nessun codice a barre letto nella foto. Riprova più da vicino.", "Geen barcode gelezen op de foto. Probeer het dichterbij.", "Nenhum código lido na foto. Tente mais de perto.", "Nie odczytano kodu ze zdjęcia. Spróbuj bliżej."],
    "Caméra indisponible ici : photographiez le code ou tapez son numéro.": ["Camera unavailable here: photograph the code or type its number.", "Kamera hier nicht verfügbar: Fotografieren Sie den Code oder geben Sie die Nummer ein.", "Cámara no disponible aquí: fotografía el código o escribe su número.", "Fotocamera non disponibile qui: fotografa il codice o digitane il numero.", "Camera hier niet beschikbaar: fotografeer de code of typ het nummer.", "Câmara indisponível aqui: fotografe o código ou escreva o número.", "Aparat niedostępny: sfotografuj kod lub wpisz numer."],
    "Visez le code-barre": ["Aim at the barcode", "Auf den Barcode richten", "Apunta al código de barras", "Inquadra il codice a barre", "Richt op de barcode", "Aponte para o código de barras", "Wyceluj w kod kreskowy"],
    "Chargement du lecteur…": ["Loading the reader…", "Leser wird geladen…", "Cargando el lector…", "Caricamento del lettore…", "Lezer laden…", "A carregar o leitor…", "Ładowanie czytnika…"],
    "Caméra refusée ou indisponible : photographiez le code ou tapez son numéro.": ["Camera denied or unavailable: photograph the code or type its number.", "Kamera verweigert oder nicht verfügbar: Fotografieren Sie den Code oder geben Sie die Nummer ein.", "Cámara denegada o no disponible: fotografía el código o escribe su número.", "Fotocamera negata o non disponibile: fotografa il codice o digitane il numero.", "Camera geweigerd of niet beschikbaar: fotografeer de code of typ het nummer.", "Câmara recusada ou indisponível: fotografe o código ou escreva o número.", "Brak dostępu do aparatu: sfotografuj kod lub wpisz numer."],
    "Énergie": ["Energy", "Energie", "Energía", "Energia", "Energie", "Energia", "Energia"],
    "Matières grasses": ["Fat", "Fett", "Grasas", "Grassi", "Vetten", "Lípidos", "Tłuszcz"],
    "dont saturées": ["of which saturates", "davon gesättigte", "de las cuales saturadas", "di cui saturi", "waarvan verzadigd", "dos quais saturados", "w tym nasycone"],
    "Glucides": ["Carbohydrates", "Kohlenhydrate", "Hidratos de carbono", "Carboidrati", "Koolhydraten", "Hidratos de carbono", "Węglowodany"],
    "dont sucres": ["of which sugars", "davon Zucker", "de los cuales azúcares", "di cui zuccheri", "waarvan suikers", "dos quais açúcares", "w tym cukry"],
    "Fibres": ["Fibre", "Ballaststoffe", "Fibra", "Fibre", "Vezels", "Fibra", "Błonnik"],
    "Protéines": ["Protein", "Eiweiß", "Proteínas", "Proteine", "Eiwitten", "Proteínas", "Białko"],
    "Sel": ["Salt", "Salz", "Sal", "Sale", "Zout", "Sal", "Sól"],
    "Sans marque": ["No brand", "Ohne Marke", "Sin marca", "Senza marca", "Geen merk", "Sem marca", "Bez marki"],
    "Fiche Open Food Facts": ["Open Food Facts sheet", "Open-Food-Facts-Seite", "Ficha de Open Food Facts", "Scheda Open Food Facts", "Open Food Facts-fiche", "Ficha Open Food Facts", "Karta Open Food Facts"],
    "Pour 100 g": ["Per 100 g", "Pro 100 g", "Por 100 g", "Per 100 g", "Per 100 g", "Por 100 g", "Na 100 g"],
    "Composition": ["Ingredients list", "Zusammensetzung", "Composición", "Composizione", "Samenstelling", "Composição", "Skład"],
    "Allergènes": ["Allergens", "Allergene", "Alérgenos", "Allergeni", "Allergenen", "Alergénios", "Alergeny"],
    "Labels": ["Labels", "Siegel", "Sellos", "Etichette", "Keurmerken", "Selos", "Oznaczenia"],
    "Dans les recettes": ["In recipes", "In Rezepten", "En las recetas", "Nelle ricette", "In recepten", "Nas receitas", "W przepisach"],
    "Fiche": ["Details", "Details", "Ficha", "Scheda", "Fiche", "Ficha", "Karta"],
    "Créer un rayon": ["Create an aisle", "Abteilung erstellen", "Crear una sección", "Crea un reparto", "Afdeling aanmaken", "Criar uma secção", "Utwórz dział"],
    "Marque": ["Brand", "Marke", "Marca", "Marca", "Merk", "Marca", "Marka"],
    "Conditionnement": ["Packaging", "Packungsgröße", "Envase", "Confezione", "Verpakking", "Embalagem", "Opakowanie"],
    "Magasins": ["Shops", "Geschäfte", "Tiendas", "Negozi", "Winkels", "Lojas", "Sklepy"],
    "500 g, 1 l…": ["500 g, 1 l…", "500 g, 1 l…", "500 g, 1 l…", "500 g, 1 l…", "500 g, 1 l…", "500 g, 1 l…", "500 g, 1 l…"],
    "Ex. prendre la version bio": ["e.g. get the organic version", "z. B. die Bio-Version nehmen", "Ej. coger la versión ecológica", "Es. prendere la versione bio", "Bijv. de biologische versie nemen", "Ex. levar a versão biológica", "Np. wybierz wersję bio"],
    "Changer de produit": ["Change product", "Produkt wechseln", "Cambiar de producto", "Cambia prodotto", "Ander product", "Mudar de produto", "Zmień produkt"],
    "Associer un produit Open Food Facts": ["Link an Open Food Facts product", "Open-Food-Facts-Produkt zuordnen", "Asociar un producto de Open Food Facts", "Associa un prodotto Open Food Facts", "Open Food Facts-product koppelen", "Associar um produto Open Food Facts", "Powiąż produkt z Open Food Facts"],
    "Utilisé dans {n} recette": ["Used in {n} recipe", "In {n} Rezept verwendet", "Usado en {n} receta", "Usato in {n} ricetta", "Gebruikt in {n} recept", "Usado em {n} receita", "Użyty w {n} przepisie"],
    "Utilisé dans {n} recettes": ["Used in {n} recipes", "In {n} Rezepten verwendet", "Usado en {n} recetas", "Usato in {n} ricette", "Gebruikt in {n} recepten", "Usado em {n} receitas", "Użyty w {n} przepisach"],
    "Aucune.": ["None.", "Keine.", "Ninguna.", "Nessuna.", "Geen.", "Nenhuma.", "Brak."],
    "Supprimer l'ingrédient": ["Delete ingredient", "Zutat löschen", "Eliminar el ingrediente", "Elimina l'ingrediente", "Ingrediënt verwijderen", "Eliminar o ingrediente", "Usuń składnik"],
    "Photo enregistrée": ["Photo saved", "Foto gespeichert", "Foto guardada", "Foto salvata", "Foto opgeslagen", "Foto guardada", "Zdjęcie zapisane"],
    "Ingrédient enregistré": ["Ingredient saved", "Zutat gespeichert", "Ingrediente guardado", "Ingrediente salvato", "Ingrediënt opgeslagen", "Ingrediente guardado", "Składnik zapisany"],
    "Supprimer « {n} » ? Les recettes garderont le texte de l'ingrédient.": ["Delete \"{n}\"? Recipes will keep the ingredient's text.", "„{n}“ löschen? Die Rezepte behalten den Text der Zutat.", "¿Eliminar «{n}»? Las recetas conservarán el texto del ingrediente.", "Eliminare «{n}»? Le ricette manterranno il testo dell'ingrediente.", "\"{n}\" verwijderen? De recepten behouden de tekst van het ingrediënt.", "Eliminar «{n}»? As receitas manterão o texto do ingrediente.", "Usunąć „{n}”? Przepisy zachowają tekst składnika."],
    "Produit pour « {n} »": ["Product for \"{n}\"", "Produkt für „{n}“", "Producto para «{n}»", "Prodotto per «{n}»", "Product voor \"{n}\"", "Produto para «{n}»", "Produkt dla „{n}”"],
    "Recherche sur Open Food Facts…": ["Searching Open Food Facts…", "Suche auf Open Food Facts…", "Buscando en Open Food Facts…", "Ricerca su Open Food Facts…", "Zoeken op Open Food Facts…", "A pesquisar no Open Food Facts…", "Wyszukiwanie w Open Food Facts…"],
    "Aucun produit trouvé.": ["No product found.", "Kein Produkt gefunden.", "No se encontró ningún producto.", "Nessun prodotto trovato.", "Geen product gevonden.", "Nenhum produto encontrado.", "Nie znaleziono produktu."],
    "Produit associé": ["Product linked", "Produkt zugeordnet", "Producto asociado", "Prodotto associato", "Product gekoppeld", "Produto associado", "Produkt powiązany"],
    "Affichage": ["Display", "Anzeige", "Visualización", "Visualizzazione", "Weergave", "Apresentação", "Widok"],
    "Onglet à l'ouverture": ["Tab on opening", "Tab beim Öffnen", "Pestaña al abrir", "Scheda all'apertura", "Tabblad bij openen", "Separador ao abrir", "Karta przy otwarciu"],
    "Afficher le cadre": ["Show the frame", "Rahmen anzeigen", "Mostrar el marco", "Mostra la cornice", "Kader tonen", "Mostrar a moldura", "Pokaż ramkę"],
    "Repas affichés (toutes les vues)": ["Meals shown (all views)", "Angezeigte Mahlzeiten (alle Ansichten)", "Comidas mostradas (todas las vistas)", "Pasti mostrati (tutte le viste)", "Getoonde maaltijden (alle weergaven)", "Refeições apresentadas (todas as vistas)", "Wyświetlane posiłki (wszystkie widoki)"],
    "Hauteur des listes en px (0 = sans limite)": ["List height in px (0 = no limit)", "Listenhöhe in px (0 = unbegrenzt)", "Altura de las listas en px (0 = sin límite)", "Altezza delle liste in px (0 = senza limite)", "Lijsthoogte in px (0 = onbeperkt)", "Altura das listas em px (0 = sem limite)", "Wysokość list w px (0 = bez limitu)"],
    "Complet (semaine, recettes, ingrédients, courses)": ["Full (week, recipes, ingredients, shopping)", "Vollständig (Woche, Rezepte, Zutaten, Einkauf)", "Completo (semana, recetas, ingredientes, compra)", "Completo (settimana, ricette, ingredienti, spesa)", "Volledig (week, recepten, ingrediënten, boodschappen)", "Completo (semana, receitas, ingredientes, compras)", "Pełny (tydzień, przepisy, składniki, zakupy)"],
    "Menu du jour (compact, consultation)": ["Today's menu (compact, view only)", "Tagesmenü (kompakt, nur Ansicht)", "Menú del día (compacto, consulta)", "Menu del giorno (compatto, consultazione)", "Menu van vandaag (compact, alleen bekijken)", "Menu do dia (compacto, consulta)", "Menu dnia (kompaktowe, podgląd)"],
    "Semaine (planning, consultation)": ["Week (planner, view only)", "Woche (Planung, nur Ansicht)", "Semana (planificación, consulta)", "Settimana (pianificazione, consultazione)", "Week (planning, alleen bekijken)", "Semana (planeamento, consulta)", "Tydzień (plan, podgląd)"],
    "Statistiques": ["Statistics", "Statistiken", "Estadísticas", "Statistiche", "Statistieken", "Estatísticas", "Statystyki"],
    "Menus de la semaine, recettes (Marmiton, Jow, Mealie), ingrédients (Open Food Facts) et liste de courses": ["Weekly menus, recipes (Marmiton, Jow, Mealie), ingredients (Open Food Facts) and shopping list", "Wochenmenüs, Rezepte (Marmiton, Jow, Mealie), Zutaten (Open Food Facts) und Einkaufsliste", "Menús semanales, recetas (Marmiton, Jow, Mealie), ingredientes (Open Food Facts) y lista de la compra", "Menu della settimana, ricette (Marmiton, Jow, Mealie), ingredienti (Open Food Facts) e lista della spesa", "Weekmenu's, recepten (Marmiton, Jow, Mealie), ingrediënten (Open Food Facts) en boodschappenlijst", "Menus da semana, receitas (Marmiton, Jow, Mealie), ingredientes (Open Food Facts) e lista de compras", "Menu tygodnia, przepisy (Marmiton, Jow, Mealie), składniki (Open Food Facts) i lista zakupów"],
    "Aucun envoi": ["Nothing sent yet", "Noch nichts gesendet", "Ningún envío", "Nessun invio", "Nog niets verzonden", "Nenhum envio", "Brak wysyłek"]
  };
  let LANG = "fr", NUMLOC = "fr-FR";
  const langOf = (hass, c) => { const l = String((c && c.language) || (hass && ((hass.locale && hass.locale.language) || hass.language)) || navigator.language || "en").toLowerCase().split(/[-_]/)[0]; return l === "fr" || HOLM_LANGS.includes(l) ? l : "en"; };
  const setLang = (hass, c) => { LANG = langOf(hass, c); const p = hass && hass.locale && hass.locale.language; NUMLOC = !(c && c.language) && p && p.toLowerCase().startsWith(LANG) ? p : LOCALES[LANG]; return LANG; };
  const _ = (s, v) => { let o = LANG === "fr" ? s : ((I18N[s] && I18N[s][HOLM_LANGS.indexOf(LANG)]) || s); if (v) for (const k in v) o = o.split("{" + k + "}").join(v[k]); return o; };
  // champ « Langue » pour les éditeurs visuels (ha-form)
  const langField = () => ({ name: "language", selector: { select: { mode: "dropdown", options: [{ value: "", label: _("Automatique (profil)") }, ...Object.entries(LANG_NAMES).map(([value, label]) => ({ value, label }))] } } });
  // traduit les titres de sections et les libellés d'options d'un schéma ha-form (écrits en français)
  const locSchema = (sc) => (sc || []).map((x) => { const o = { ...x }; if (o.title) o.title = _(o.title); if (o.schema) o.schema = locSchema(o.schema);
    if (o.selector && o.selector.select && o.name !== "language") o.selector = { ...o.selector, select: { ...o.selector.select, options: (o.selector.select.options || []).map((op) => (typeof op === "string" ? op : { ...op, label: _(op.label) })) } };
    if (o.name === "language" && o.selector && o.selector.select) o.selector = { ...o.selector, select: { ...o.selector.select, options: o.selector.select.options.map((op) => (op.value ? op : { ...op, label: _("Automatique (profil)") })) } };
    return o; });
const VERSION = "1.3.1";
// Shared by the Telegram sharing dialog and the calendar export dialog.
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (_) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monday = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); const k = (x.getDay() + 6) % 7; return addDays(x, -k); };
const fdate = (d, o) => d.toLocaleDateString(NUMLOC, o);
const SHOP_MAX_DAYS = 31;   // même limite que l'intégration
// libellé d'une période de courses : « semaine du … » pour un lundi → dimanche, sinon « du … au … » (#12)
const shopRange = (start, end, long = false, gen = false) => {
  const a = typeof start === "string" ? new Date(start + "T00:00") : start, b = typeof end === "string" ? new Date(end + "T00:00") : end;
  const o = long ? { day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" };
  if (a.getDay() === 1 && Math.round((b - a) / 864e5) === 6) return _(gen ? _("Générée pour la semaine du {d}") : _("semaine du {d}"), { d: fdate(a, { day: "numeric", month: long ? "long" : "short" }) });
  if (iso(a) === iso(b)) return _(gen ? _("Générée pour le {d}") : _("le {d}"), { d: fdate(a, o) });
  return _(gen ? _("Générée du {a} au {b}") : _("du {a} au {b}"), { a: fdate(a, o), b: fdate(b, o) });
};
const mins = (m) => (!m ? "" : m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const _T = (o) => new Proxy(o, { get: (t, k) => { const v = t[k]; return typeof v === "string" ? _(v) : v && typeof v === "object" ? _T(v) : v; } });
const SLOT_LBL = _T({ midi: _("Midi"), soir: _("Soir") });
// catégories écartées par défaut des suggestions de repas (entrées, desserts, accompagnements…)
const NOT_MAIN = /entree|dessert|accompagnement|aperitif|boisson|sauce|petit[- ]?dej|gouter|condiment|starter|side|drink|snack/;
const NUTRI = { a: "#038141", b: "#85bb2f", c: "#fecb02", d: "#ee8100", e: "#e63e11" };
const fq = (q) => { if (q == null) return ""; const r = Math.round(q * 100) / 100; return (r === Math.floor(r) ? String(r) : String(r).replace(".", ",")); };

// Garde la position de défilement pendant un nouveau rendu complet de la carte.
// Sur iOS (WebKit, sans « scroll anchoring »), remplacer le contenu de la carte la fait rétrécir un instant :
// la page, plus courte, remonte d'un coup. On fige la hauteur de la carte et on remet le défilement en place.
const keepScroll = (host, fn) => {
  const saved = [];
  let n = host;
  while (n) {
    n = n.assignedSlot || n.parentNode || n.host;
    if (n && n.nodeType === 1 && n.scrollHeight > n.clientHeight) saved.push([n, n.scrollTop]);
  }
  const se = document.scrollingElement;
  if (se) saved.push([se, se.scrollTop]);
  const h = host.offsetHeight;
  if (h) host.style.minHeight = `${h}px`;
  try { fn(); } finally {
    const restore = () => saved.forEach(([el, t]) => { if (Math.abs(el.scrollTop - t) > 1) el.scrollTop = t; });
    restore();
    let done = false;
    const release = () => { if (done) return; done = true; restore(); host.style.minHeight = ""; requestAnimationFrame(restore); };
    requestAnimationFrame(release);
    setTimeout(release, 500); // onglet caché : requestAnimationFrame ne se déclenche pas

  }
};
// fond d'un repas : une photo, ou plusieurs photos côte à côte quand le repas compte plusieurs recettes illustrées (#6)
const heroBg = (recs) => {
  const imgs = [...new Set(recs.filter((r) => r && r.image).map((r) => r.image))];
  if (!imgs.length) return { cls: "", attr: "", html: "" };
  if (imgs.length === 1) return { cls: "img", attr: `style="--img:url('${esc(imgs[0])}')"`, html: "" };
  const shown = imgs.slice(0, 3), more = imgs.length - shown.length;
  return { cls: "img multi", attr: "", html: `<div class="hims n${shown.length}">${shown.map((u) => `<span style="background-image:url('${esc(u)}')"></span>`).join("")}</div>${more ? `<span class="hmore">+${more}</span>` : ""}` };
};
class HolmMyMenuCard extends HTMLElement {
  setConfig(c) {
    this._c = { title: "Menus", view: "full", tab: "week", ...c };
    this._tab = this._tab || this._c.tab;
    if (this._rolling === undefined) this._rolling = load("holm-mymenu-rolling", null) ?? (this._c.week_start === "today");
    this._week = this._week || this._start(new Date());
    if (!this._rf) this._rf = { cat: "", time: 0, rating: 0, ...load("holm-mymenu-rfilters", {}) };
    this._q = this._q || { recipes: "", ingredients: "" };
    this._lim = { recipes: 12, ingredients: 36 };
    if (this.shadowRoot && !this._editingRecipe && !this._editingReminder) this._render();
  }
  // début de la période affichée : lundi de la semaine, ou le jour même (« 7 prochains jours », #13)
  _start(d) { if (!this._rolling) return monday(d); const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  _wkLabel(w0, w1) {
    const a = fdate(w0, { day: "numeric", month: w0.getMonth() === w1.getMonth() ? undefined : "short" }), b = fdate(w1, { day: "numeric", month: "long" });
    return this._rolling ? _("Du {a} au {b}", { a, b }) : _("Semaine du {a} au {b}", { a, b });
  }
  _modeBtn() {
    return `<button class="ib wm ${this._rolling ? "act" : ""}" data-act="week-mode" title="${this._rolling ? _("Afficher la semaine du lundi au dimanche") : _("Afficher aujourd'hui et les 6 jours suivants")}"><ha-icon icon="${this._rolling ? "mdi:calendar-arrow-right" : "mdi:calendar-week"}"></ha-icon></button>`;
  }
  set hass(h) {
    const _pl = this._lang;
    this._hass = h;
    if (!this.shadowRoot) { this.attachShadow({ mode: "open" }); this._render(); }
    else if (_pl && langOf(h, this._c) !== _pl && !this._editingRecipe && !this._editingReminder) this._render();
    if (!this._sub && h.connection) this._subscribe();
  }
  connectedCallback() { if (this._hass && !this._sub) this._subscribe(); }
  disconnectedCallback() { if (this._sub) { this._sub.then((u) => u && u()).catch(() => {}); this._sub = null; } }
  _subscribe() {
    this._sub = this._hass.connection.subscribeMessage((m) => { this._s = m.state; this._update(); this._refreshModal(); }, { type: "holm_mymenu/subscribe" });
    this._sub.catch((e) => { this._err = e && e.code === "unknown_command" ? _("L'intégration HOLM My Menu n'est pas installée ou pas encore chargée.") : (e && e.message) || String(e); this._sub = null; this._render(); });
  }
  _update() {
    // Les notifications Home Assistant peuvent arriver pendant une sélection
    // ou une suppression de texte. Ne jamais recréer le DOM de l'éditeur.
    if (this._editingRecipe || this._editingReminder) return;
    const a = this.shadowRoot && this.shadowRoot.activeElement;
    if (a && a.matches("input.search, input.shop-add") && this._renderList !== undefined) {
      if (a.matches("input.search") && this._renderList()) return;
      if (a.matches("input.shop-add")) { const v = a.value; this._render(); const n = this.shadowRoot.querySelector("input.shop-add"); if (n) { n.value = v; n.focus(); } return; }
    }
    this._render();
  }
  _ws(type, data = {}) { return this._hass.callWS({ type: `holm_mymenu/${type}`, ...data }); }
  _toast(msg) { const ev = new Event("hass-notification", { bubbles: true, composed: true }); ev.detail = { message: msg }; (document.querySelector("home-assistant") || this).dispatchEvent(ev); }
  async _do(p, ok) { try { const r = await p; if (ok) this._toast(ok); return r; } catch (e) { this._toast(`HOLM My Menu : ${(e && e.message) || e}`); throw e; } }

  // ---------------- rendu principal ----------------
  _render() {
    if (!this.shadowRoot || !this._c) return;
    keepScroll(this, () => this._renderNow());
  }
  _renderNow() {
    this._lang = setLang(this._hass, this._c);
    const c = this._c, s = this._s;
    let body;
    if (this._err) body = `<div class="empty">${esc(this._err)}</div>`;
    else if (!s) body = `<div class="empty">${_("Chargement…")}</div>`;
    else if (c.view === "today") body = this._today();
    else if (c.view === "week") body = this._weekRO();
    else if (c.view === "stats") body = this._statsView();
    else body = ({ week: this._weekView, recipes: this._recipesView, ingredients: this._ingView, shopping: this._shopView, reminders: this._remindersView, stats: this._statsView }[this._tab] || this._weekView).call(this);
    const tabs = [["week", "mdi:calendar-week", _("Semaine")], ["recipes", "mdi:book-open-page-variant", _("Recettes")], ["ingredients", "mdi:food-apple", _("Ingrédients")], ["shopping", "mdi:cart-outline", _("Courses")], ["reminders", "mdi:bell-outline", _("Rappels")], ["stats", "mdi:chart-box-outline", _("Stats")]];
    const nShop = s ? (s.shopping.items || []).filter((i) => !i.checked).length : 0;
    const keepModal = this.shadowRoot.querySelector(".modal-root");
    this.shadowRoot.innerHTML = `<style>${CSS}</style>
      <ha-card class="${c.show_frame === false ? "noframe" : ""}">
        <div class="hd"><div class="tt"><ha-icon icon="mdi:silverware-variant"></ha-icon>${esc(c.title === "Menus" ? _("Menus") : c.title)}</div>
          ${c.view === "today" || c.view === "week" || c.view === "stats" ? "" : `<div class="tabs">${tabs.map(([k, i, l]) => `<button class="tab ${this._tab === k ? "on" : ""}" data-tab="${k}"><ha-icon icon="${i}"></ha-icon><span>${l}</span>${k === "shopping" && nShop ? `<em>${nShop}</em>` : ""}</button>`).join("")}</div>`}
        </div>
        <div class="bd">${body}</div>
      </ha-card>`;
    if (keepModal) this.shadowRoot.appendChild(keepModal);
    this._bind();
  }
  _moreHtml(more, total, word) {
    return more > 0 ? `<button class="more" data-act="more">${_("Afficher la suite · {n} sur {t}", { n: more, t: total })}</button>` : "";
  }
  _watchMore(lst, root) {
    if (this._moreObs) this._moreObs.disconnect();
    if (!("IntersectionObserver" in window)) return;
    this._moreObs = new IntersectionObserver((ents) => { if (ents.some((e) => e.isIntersecting)) this._more(); }, { root, rootMargin: "0px 0px 300px 0px" });
    this._moreList = lst;
    const m = lst.querySelector(".more"); if (m) this._moreObs.observe(m);
  }
  _more() {
    const k = this._tab === "recipes" ? "recipes" : "ingredients";
    this._lim[k] += k === "recipes" ? 12 : 36;
    this._renderList();
  }
  // met à jour la seule liste (le champ de recherche garde le focus)
  _renderList() {
    const box = this.shadowRoot && this.shadowRoot.querySelector(".lst");
    if (!box || !this._s) return false;
    keepScroll(this, () => { box.innerHTML = this._tab === "recipes" ? this._recipesList() : this._ingList(); });
    if (this._moreObs) { this._moreObs.disconnect(); const m = box.querySelector(".more"); if (m) setTimeout(() => this._moreObs && this._moreObs.observe(m), 50); }
    box.querySelectorAll("[data-act]").forEach((el) => el.addEventListener(el.dataset.ev || "click", (e) => this._act(el.dataset.act, el, e)));
    return true;
  }
  _bind() {
    const r = this.shadowRoot;
    r.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => { this._tab = b.dataset.tab; this._render(); }));
    r.querySelectorAll("[data-act]").forEach((el) => el.addEventListener(el.dataset.ev || "click", (e) => this._act(el.dataset.act, el, e)));
    // glisser-déposer des créneaux
    r.querySelectorAll(".slot[draggable]").forEach((el) => {
      el.addEventListener("dragstart", (e) => { this._drag = { day: el.dataset.day, slot: el.dataset.slot }; e.dataTransfer.effectAllowed = "copyMove"; el.classList.add("dragging"); });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
    });
    r.querySelectorAll(".slot").forEach((el) => {
      el.addEventListener("dragover", (e) => { if (this._drag) { e.preventDefault(); el.classList.add("over"); } });
      el.addEventListener("dragleave", () => el.classList.remove("over"));
      el.addEventListener("drop", (e) => {
        e.preventDefault(); el.classList.remove("over");
        const d = this._drag; this._drag = null;
        if (!d || (d.day === el.dataset.day && d.slot === el.dataset.slot)) return;
        this._do(this._ws("plan/move", { src_day: d.day, src_slot: d.slot, dst_day: el.dataset.day, dst_slot: el.dataset.slot, copy: e.ctrlKey || e.altKey }));
      });
    });
    const qi = r.querySelector("input.search");
    if (qi) {
      qi.addEventListener("input", () => { this._q[qi.dataset.k] = qi.value; this._lim = { recipes: 12, ingredients: 36 }; clearTimeout(this._qt); this._qt = setTimeout(() => this._renderList(), 150); });
      qi.addEventListener("keydown", (e) => e.stopPropagation());
    }
    const lst = r.querySelector(".lst");
    if (lst) {
      // Sur écran tactile, pas de zone de défilement imbriquée : la page défile normalement
      // (une liste qui défile dans une page qui défile bloque le doigt). La suite se charge à l'approche du bas.
      const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (!touch && this._c.list_height !== 0) lst.style.maxHeight = `${this._c.list_height || 620}px`;
      this._watchMore(lst, touch || this._c.list_height === 0 ? null : lst);
    }
    const ai = r.querySelector("input.shop-add");
    if (ai) ai.addEventListener("keydown", (e) => { if (e.key === "Enter" && ai.value.trim()) { this._do(this._ws("shopping/add", { name: ai.value.trim() })); ai.value = ""; } });
  }
  async _act(a, el, e) {
    const s = this._s, d = el.dataset;
    switch (a) {
      case "week-prev": this._week = addDays(this._week, -7); return this._render();
      case "week-next": this._week = addDays(this._week, 7); return this._render();
      case "week-now": this._week = this._start(new Date()); return this._render();
      case "week-mode": this._rolling = !this._rolling; save("holm-mymenu-rolling", this._rolling); this._week = this._start(new Date()); return this._render();
      case "suggest": return this._suggestModal();
      case "rf-toggle": this._rfOpen = !this._rfOpen; return this._render();
      case "rf": { const v = el.value; this._rf[d.k] = d.k === "cat" ? v : Number(v) || 0; save("holm-mymenu-rfilters", this._rf); this._lim.recipes = 12; return this._render(); }
      case "rf-clear": this._rf = { cat: "", time: 0, rating: 0 }; save("holm-mymenu-rfilters", this._rf); this._lim.recipes = 12; return this._render();
      case "calendar-export": return this._calendarModal();
      case "slot": return this._slotModal(d.day, d.slot);
      case "recipe": return this._recipeModal(d.id);
      case "add-recipe": return this._addRecipeModal();
      case "fav-filter": this._favOnly = !this._favOnly; this._lim.recipes = 12; return this._render();
      case "more": return this._more();
      case "stats-refresh": this._stats = null; return this._render();
      case "ing": return this._ingModal(d.id);
      case "add-ing": return this._addIngModal(this._q.ingredients || "");
      case "reminder-add": return this._reminderModal();
      case "reminder-edit": return this._reminderModal(d.id);
      case "reminder-test": return this._do(this._ws("reminder/test", {reminder_id:d.id}), _("Test du rappel effectué"));
      case "reminder-toggle": { const r=(this._s.reminders||[]).find(x=>x.id===d.id); if(r) return this._ws("reminder/save",{reminder_id:r.id,reminder:{...r,enabled:!r.enabled}}); return; }
      case "reminder-delete": if(confirm(_("Supprimer ce rappel ?"))) return this._ws("reminder/delete",{reminder_id:d.id}); return;
      case "shop-gen": {
        if (this._shopMode === "dates") {
          const [f, t] = this._shopDates();
          if (t < f) return this._toast(_("La date de fin est avant la date de début"));
          if (Math.round((t - f) / 864e5) + 1 > SHOP_MAX_DAYS) return this._toast(_("Période trop longue ({n} jours au maximum)", { n: SHOP_MAX_DAYS }));
          await this._do(this._ws("shopping/generate", { start: iso(f), end: iso(t) }), _("Liste de courses générée"));
          return;
        }
        const st = this._shopWeek || monday(new Date());
        await this._do(this._ws("shopping/generate", { start: iso(st), end: iso(addDays(st, 6)) }), _("Liste de courses générée"));
        return;
      }
      case "shop-mode": {
        if (this._shopMode !== "dates" && d.m === "dates" && !this._shopFrom) {   // dates libres : partir de la semaine affichée
          const w0 = this._shopWeek || monday(new Date());
          this._shopFrom = w0; this._shopTo = addDays(w0, 6);
        }
        this._shopMode = d.m; return this._render();
      }
      case "shop-from": case "shop-to": {
        if (!el.value) return;
        const v = new Date(el.value + "T00:00");
        if (a === "shop-from") { const len = this._shopTo && this._shopFrom ? Math.round((this._shopTo - this._shopFrom) / 864e5) : 6; this._shopFrom = v; if (!this._shopTo || this._shopTo < v) this._shopTo = addDays(v, Math.max(0, len)); }
        else this._shopTo = v;
        return this._render();
      }
      case "shop-week-prev": this._shopWeek = addDays(this._shopWeek || monday(new Date()), -7); return this._render();
      case "shop-week-next": this._shopWeek = addDays(this._shopWeek || monday(new Date()), 7); return this._render();
      case "shop-toggle": return this._ws("shopping/toggle", { item_id: d.id });
      case "shop-toggle-group": return this._ws("shopping/toggle_group", { item_ids: JSON.parse(d.ids) });
      case "shop-del": e.stopPropagation(); return this._ws("shopping/remove", { item_id: d.id });
      case "shop-del-group": e.stopPropagation(); return this._ws("shopping/remove_group", { item_ids: JSON.parse(d.ids) });
      case "shop-edit": e.stopPropagation(); return this._shopEdit(JSON.parse(d.ids));
      case "shop-category": return this._categoryModal();
      case "shop-restore": return this._restoreShopModal();
      case "shop-clear-checked": return this._ws("shopping/remove", { checked_only: true });
      case "shop-clear": if (confirm(_("Vider toute la liste de courses ?"))) return this._ws("shopping/remove", {}); return;
      case "shop-share": return this._shareModal();
      case "shop-copy": try { await navigator.clipboard.writeText(this._shopText()); this._toast(_("Liste copiée")); } catch (_) { this._toast(_("Copie impossible sur cet appareil")); } return;
      case "today-slot": return this._slotModal(d.day, d.slot);
      case "view-recipe": return this._recipeModal(d.id, null, { readonly: true, servings: +d.sv || 0 });
      case "view-ing": return this._ingModal(d.id, true);
    }
  }

  // ---------------- Semaine ----------------
  _slotHtml(day, slot, compact = false) {
    const s = this._s, entries = (s.plan[day] || {})[slot] || [];
    const recs = entries.filter((e) => e.type === "recipe").map((e) => s.recipes[e.recipe_id]).filter(Boolean);
    const bg = heroBg(recs);
    const lbl = recs.map((r) => r.name);
    const ings = entries.filter((e) => e.type === "ingredient").map((e) => s.ingredients[e.ingredient_id]).filter(Boolean);
    const txt = entries.filter((e) => e.type === "text").map((e) => e.text);
    const top = lbl.length || txt.length;
    return `<div class="slot ${entries.length ? "full" : ""}" draggable="${entries.length ? "true" : "false"}" data-act="slot" data-day="${day}" data-slot="${slot}">
        <div class="shero ${bg.cls} ${!top && ings.length ? "mini" : ""}" ${bg.attr}>${bg.html}<span class="sl">${SLOT_LBL[slot]}</span>
          ${top ? `<div class="sx">${lbl.map((l) => `<b>${esc(l)}</b>`).join("")}${txt.map((l) => `<i>${esc(l)}</i>`).join("")}</div>` : entries.length ? "" : `<div class="sx add"><ha-icon icon="mdi:plus"></ha-icon></div>`}</div>
        ${ings.length ? `<div class="sxi">${ings.map((i) => `<span>${i.image ? `<em style="background-image:url('${esc(i.image)}')"></em>` : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}${esc(i.name)}</span>`).join("")}</div>` : ""}</div>`;
  }
  _weekView() {
    const s = this._s, w0 = this._week, today = iso(new Date());
    const days = [...Array(7)].map((_, i) => addDays(w0, i));
    const w1 = days[6];
    return `<div class="bar"><button class="ib" data-act="week-prev"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
        <div class="wk">${this._wkLabel(w0, w1)}</div>
        <button class="ib" data-act="week-next"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
        <button class="pill" data-act="week-now">${_("Aujourd'hui")}</button>
        ${this._modeBtn()}
        <button class="pill" data-act="suggest"><ha-icon icon="mdi:auto-fix"></ha-icon>${_("Suggérer")}</button>
        <button class="pill" data-act="calendar-export"><ha-icon icon="mdi:calendar-plus"></ha-icon>${_("Ajouter au calendrier")}</button></div>
      <div class="week">${days.map((d) => { const k = iso(d); return `<div class="day ${k === today ? "today" : ""} ${k < today ? "past" : ""}">
          <div class="dn"><b>${fdate(d, { weekday: "short" })}</b><span>${d.getDate()}</span></div>
          ${this._viewSlots().map((sl) => this._slotHtml(k, sl)).join("")}</div>`; }).join("")}</div>
      <div class="hint">${_("Toucher un repas pour le choisir · glisser un repas sur un autre pour les échanger (Ctrl pour copier)")}</div>`;
  }
  _viewSlots() {
    const s = this._s, want = Array.isArray(this._c.today_slots) && this._c.today_slots.length ? this._c.today_slots : s.slots;
    return s.slots.filter((sl) => want.includes(sl));
  }
  // tuile en consultation (vues « Menu du jour » et « Semaine ») : recettes, puis ingrédients, puis notes
  _tile(day, sl, small = false) {
    const s = this._s, entries = (s.plan[day] || {})[sl] || [];
    const recs = entries.filter((e) => e.type === "recipe" && s.recipes[e.recipe_id]);
    const ings = entries.filter((e) => e.type === "ingredient" && s.ingredients[e.ingredient_id]);
    const txts = entries.filter((e) => e.type === "text");
    const bg = heroBg(recs.map((e) => s.recipes[e.recipe_id]));
    const top = recs.length || txts.length;
    return `<div class="tslot ${small ? "sm" : ""}">
      <div class="thero ${bg.cls} ${!top && ings.length ? "mini" : ""}" ${bg.attr}>${bg.html}
        <span class="sl">${SLOT_LBL[sl]}</span>
        ${top ? `<div class="tents">
          ${recs.map((e) => { const r = s.recipes[e.recipe_id]; return `<button class="te" data-act="view-recipe" data-id="${r.id}" data-sv="${e.servings || ""}"><b>${esc(r.name)}</b>${small ? "" : `<small>${[r.total ? mins(r.total) : "", e.servings ? _("{n} pers.", { n: e.servings }) : ""].filter(Boolean).join(" · ")}</small>`}</button>`; }).join("")}
          ${txts.map((e) => `<div class="te txt"><i>${esc(e.text)}</i></div>`).join("")}</div>` : entries.length ? "" : `<div class="tempty">${_("Rien de prévu")}</div>`}
      </div>
      ${ings.length ? `<div class="tings">${ings.map((e) => { const i = s.ingredients[e.ingredient_id]; return `<button class="tchip" data-act="view-ing" data-id="${i.id}">${i.image ? `<span class="ti" style="background-image:url('${esc(i.image)}')"></span>` : `<span class="ti no"><ha-icon icon="mdi:food-apple-outline"></ha-icon></span>`}<span class="tn">${esc(i.name)}</span></button>`; }).join("")}</div>` : ""}</div>`;
  }
  _today() {
    const k = iso(new Date()), slots = this._viewSlots();
    return `<div class="todayv n${slots.length}">${slots.map((sl) => this._tile(k, sl)).join("")}</div>`;
  }
  _weekRO() {
    const w0 = this._week, today = iso(new Date()), slots = this._viewSlots();
    const days = [...Array(7)].map((_, i) => addDays(w0, i)), w1 = days[6];
    return `<div class="bar"><button class="ib" data-act="week-prev"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
        <div class="wk">${this._wkLabel(w0, w1)}</div>
        <button class="ib" data-act="week-next"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
        ${iso(w0) === iso(this._start(new Date())) ? "" : `<button class="pill" data-act="week-now">${_("Aujourd'hui")}</button>`}
        ${this._modeBtn()}
        <button class="pill" data-act="calendar-export"><ha-icon icon="mdi:calendar-plus"></ha-icon>${_("Ajouter au calendrier")}</button></div>
      <div class="weekro n${slots.length}">${days.map((d) => { const k = iso(d); return `<div class="rday ${k === today ? "today" : ""} ${k < today ? "past" : ""}">
          <div class="rdn"><b>${fdate(d, { weekday: "long" })}</b><span>${d.getDate()}</span></div>
          <div class="rsl">${slots.map((sl) => this._tile(k, sl, true)).join("")}</div></div>`; }).join("")}</div>`;
  }

  // ---------------- Export calendrier (déclenché manuellement) ----------------
  _calendarModal() {
    const w0 = this._week, start = iso(w0), end = iso(addDays(w0, 6));
    const calendars = Object.values(this._hass.states || {})
      .filter((e) => e.entity_id.startsWith("calendar.") && e.state !== "unavailable")
      .sort((a, b) => (a.attributes.friendly_name || a.entity_id).localeCompare(b.attributes.friendly_name || b.entity_id));
    const savedCalendar = load("holm-mymenu-calendar-target", "");
    const prefix = load("holm-mymenu-calendar-prefix", "HOLM - ");
    const preview = [];
    for (let i = 0; i < 7; i++) {
      const day = iso(addDays(w0, i)), slots = this._s.plan[day] || {};
      for (const [slot, hour] of [["midi", "12h–13h"], ["soir", "19h–20h"]]) {
        const recipes = (slots[slot] || []).filter(e => e.type === "recipe")
          .map(e => this._s.recipes[e.recipe_id]).filter(Boolean);
        if (recipes.length) preview.push({ day, slot, hour, names: recipes.map(r => r.name) });
      }
    }
    const mb = this._modal(_("Ajouter les recettes au calendrier"), `
      <div class="muted">${esc(this._wkLabel(w0, addDays(w0, 6)))}</div>
      <div class="sh" style="margin-top:14px">${_("Calendrier de destination")}</div>
      <select class="f cal-target" style="width:100%">
        <option value="">${_("Choisir un calendrier…")}</option>
        ${calendars.map(c => `<option value="${esc(c.entity_id)}" ${savedCalendar === c.entity_id ? "selected" : ""}>${esc(c.attributes.friendly_name || c.entity_id)} (${esc(c.entity_id)})</option>`).join("")}
      </select>
      ${!calendars.length ? `<div class="muted">${_("Aucun calendrier Home Assistant disponible.")}</div>` : ""}
      <div class="sh" style="margin-top:14px">${_("Préfixe des événements")}</div>
      <input class="f cal-prefix" style="width:100%;box-sizing:border-box" maxlength="80" placeholder="Ex. HOLM - " value="${esc(prefix)}">
      <div class="sh" style="margin-top:16px">${_(preview.length > 1 ? _("Aperçu · {n} événements") : _("Aperçu · {n} événement"), { n: preview.length })}</div>
      <div style="max-height:260px;overflow:auto">
        ${preview.length ? preview.map(p => `<div style="padding:9px 0;border-bottom:1px solid var(--divider-color)">
          <b>${esc(fdate(new Date(p.day + "T12:00:00"), { weekday: "long", day: "numeric", month: "short" }))} · ${p.slot === "midi" ? _("Midi") : _("Soir")} (${p.hour})</b>
          <div class="muted">${esc(p.names.join(" · "))}</div></div>`).join("") : `<div class="muted">${_("Aucune recette planifiée cette semaine.")}</div>`}
      </div>
      <div class="muted" style="margin-top:12px">${_("La synchronisation recherche les événements HOLM déjà présents et évite les doublons. Les modifications et suppressions nécessitent des services pris en charge par le calendrier.")}</div>
      <div class="sh" style="margin-top:14px">${_("Mode d’export")}</div>
      <select class="f cal-mode" style="width:100%"><option value="sync">${_("Synchroniser la semaine (ajouter, modifier, supprimer)")}</option><option value="missing">${_("Ajouter uniquement les événements manquants")}</option></select>
      <div class="cal-confirm" hidden style="margin-top:16px;padding:16px;border:1px solid var(--divider-color);border-radius:16px;background:var(--secondary-background-color)">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <ha-icon icon="mdi:calendar-sync" style="color:var(--primary-color);flex-shrink:0;margin-top:2px"></ha-icon>
          <div>
            <div style="font-weight:700;font-size:1.05em">${_("Confirmer la synchronisation")}</div>
            <div class="muted" style="margin-top:6px;line-height:1.5">${_("Les événements HOLM de cette semaine seront mis à jour. Ceux qui correspondent à des repas supprimés pourront être effacés du calendrier sélectionné. Les autres événements ne seront pas touchés.")}</div>
            <div class="muted cal-confirm-target" style="margin-top:10px;font-weight:600"></div>
          </div>
        </div>
        <div class="row end" style="margin-top:16px;gap:8px;flex-wrap:wrap">
          <button class="pill" data-x="back-confirm"><ha-icon icon="mdi:arrow-left"></ha-icon>${_("Retour")}</button>
          <button class="pill main" data-x="confirm-sync"><ha-icon icon="mdi:check"></ha-icon>${_("Confirmer la synchronisation")}</button>
        </div>
      </div>
      <div class="row end cal-actions" style="margin-top:16px"><button class="pill" data-x="cancel">${_("Annuler")}</button>
        <button class="pill main" data-x="create" ${!preview.length || !calendars.length ? "disabled" : ""}><ha-icon icon="mdi:calendar-plus"></ha-icon>${_(preview.length > 1 ? _("Créer {n} événements") : _("Créer {n} événement"), { n: preview.length })}</button></div>
    `, { wide: true });
    mb.querySelector('[data-x="cancel"]').addEventListener("click", () => this._close());
    const confirmPanel = mb.querySelector(".cal-confirm");
    const actionRow = mb.querySelector(".cal-actions");
    confirmPanel.style.display = "none";
    const btn = mb.querySelector('[data-x="create"]');
    let request = null;
    const runExport = async (confirm_delete) => {
      if (!request) return;
      const confirmBtn = mb.querySelector('[data-x="confirm-sync"]');
      btn.disabled = true;
      confirmBtn.disabled = true;
      try {
        const result = await this._ws("calendar/export", { ...request, confirm_delete });
        this._toast(_("Calendrier : {c} créé(s), {u} modifié(s), {d} supprimé(s), {n} inchangé(s)", { c: result.created, u: result.updated, d: result.deleted, n: result.unchanged }));
        this._close();
      } catch (e) {
        this._toast(`${_("Export calendrier :")} ${e.message || e}`);
        btn.disabled = false;
        confirmBtn.disabled = false;
      }
    };
    mb.querySelector('[data-x="back-confirm"]').addEventListener("click", () => {
      confirmPanel.style.display = "none";
      actionRow.style.display = "flex";
      request = null;
    });
    mb.querySelector('[data-x="confirm-sync"]').addEventListener("click", () => runExport(true));
    mb.querySelector('[data-x="create"]').addEventListener("click", async () => {
      const target = mb.querySelector(".cal-target").value;
      const pfx = mb.querySelector(".cal-prefix").value;
      if (!target) { this._toast(_("Sélectionne un calendrier")); return; }
      save("holm-mymenu-calendar-target", target);
      save("holm-mymenu-calendar-prefix", pfx);
      const mode = mb.querySelector(".cal-mode").value;
      request = { entity_id: target, start, end, prefix: pfx, mode };
      if (mode === "sync") {
        mb.querySelector(".cal-confirm-target").textContent = `${_("Calendrier :")} ${calendars.find(c => c.entity_id === target)?.attributes?.friendly_name || target}`;
        confirmPanel.style.display = "block";
        actionRow.style.display = "none";
        return;
      }
      await runExport(false);
    });
  }

  // ---------------- Recettes ----------------
  _recipesView() {
    return `<div class="bar"><input class="search" data-k="recipes" placeholder="${_("Rechercher une recette ou un ingrédient…")}" value="${esc(this._q.recipes)}">
        <button class="ib ${this._favOnly ? "on" : ""}" data-act="fav-filter" title="${_("Favoris")}"><ha-icon icon="mdi:heart${this._favOnly ? "" : "-outline"}"></ha-icon></button>
        <button class="ib wm ${this._rfOpen || this._rfActive() ? "act" : ""}" data-act="rf-toggle" title="${_("Filtres")}"><ha-icon icon="mdi:filter-variant"></ha-icon></button>
        <button class="pill main" data-act="add-recipe"><ha-icon icon="mdi:plus"></ha-icon>${_("Ajouter")}</button></div>
      ${this._rfOpen || this._rfActive() ? `<div class="rfbar">${this._filterFields(this._rf, "rf")}${this._rfActive() ? `<button class="lnk" data-act="rf-clear">${_("Effacer les filtres")}</button>` : ""}</div>` : ""}
      <div class="lst">${this._recipesList()}</div>`;
  }
  _rfActive() { const f = this._rf || {}; return !!(f.cat || f.time || f.rating); }
  // durée d'une recette en minutes : total, sinon préparation + cuisson (0 = inconnue)
  _rtime(r) { return Number(r.total) || (Number(r.prep) || 0) + (Number(r.cook) || 0); }
  _cats() { return [...new Set(Object.values(this._s.recipes).map((r) => String(r.category || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, LANG)); }
  // champs de filtre partagés par la liste des recettes et la fenêtre « Suggérer »
  _filterFields(f, act, withMain) {
    const sel = (k, opts, v) => `<select class="f rff" data-act="${act}" data-ev="change" data-k="${k}">${opts.map(([val, l]) => `<option value="${esc(val)}" ${String(v) === String(val) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    return `<label><span>${_("Catégorie")}</span>${sel("cat", [...(withMain ? [["__main", _("Plats (sans entrées ni desserts)")]] : []), ["", _("Toutes")], ...this._cats().map((c) => [c, c])], f.cat)}</label>
      <label><span>${_("Temps max")}</span>${sel("time", [[0, _("Tous")], ...[15, 30, 45, 60, 90].map((n) => [n, _("≤ {n} min", { n })])], f.time || 0)}</label>
      <label><span>${_("Note min")}</span>${sel("rating", [[0, _("Toutes")], [4, "≥ 4"], [4.5, "≥ 4,5"]], f.rating || 0)}</label>`;
  }
  _matchFilters(r, f) {
    if (f.cat === "__main") { if (NOT_MAIN.test(norm(r.category))) return false; }
    else if (f.cat && String(r.category || "").trim() !== f.cat) return false;
    if (f.time) { const t = this._rtime(r); if (!t || t > f.time) return false; }
    if (f.rating && !(Number(r.rating) >= f.rating)) return false;
    if (f.fav && !r.favorite) return false;
    return true;
  }
  _recipesList() {
    const s = this._s, q = norm(this._q.recipes);
    let list = Object.values(s.recipes).filter((r) => !q || norm(r.name).includes(q) || (r.ingredients || []).some((l) => norm(l.name).includes(q)));
    if (this._favOnly) list = list.filter((r) => r.favorite);
    if (this._rfActive()) list = list.filter((r) => this._matchFilters(r, this._rf));
    list.sort((a, b) => (b.favorite - a.favorite) || a.name.localeCompare(b.name, LANG));
    const total = list.length, more = total - this._lim.recipes;
    list = list.slice(0, this._lim.recipes);
    return `${list.length ? `<div class="rgrid">${list.map((r) => `<div class="rc" data-act="recipe" data-id="${r.id}">
          <div class="ri" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}>${r.image ? "" : `<ha-icon icon="mdi:chef-hat"></ha-icon>`}${r.favorite ? `<i class="fav"><ha-icon icon="mdi:heart"></ha-icon></i>` : ""}</div>
          <div class="rn">${esc(r.name)}</div>
          <div class="rm">${r.total ? `<span><ha-icon icon="mdi:clock-outline"></ha-icon>${mins(r.total)}</span>` : ""}<span><ha-icon icon="mdi:account-multiple-outline"></ha-icon>${r.servings}</span>${r.rating ? `<span><ha-icon icon="mdi:star"></ha-icon>${fq(r.rating)}</span>` : ""}</div></div>`).join("")}</div>${this._moreHtml(more, total)}`
      : `<div class="empty">${q || this._rfActive() || this._favOnly ? _("Aucune recette ne correspond.") : _("Aucune recette pour l'instant : ajoutez-en depuis Marmiton, Jow, un lien, Mealie ou à la main.")}</div>`}`;
  }

  // ---------------- Ingrédients ----------------
  _ingView() {
    return `<div class="bar"><input class="search" data-k="ingredients" placeholder="${_("Rechercher un ingrédient…")}" value="${esc(this._q.ingredients)}">
        <button class="pill main" data-act="add-ing"><ha-icon icon="mdi:plus"></ha-icon>${_("Ajouter")}</button></div>
      <div class="lst">${this._ingList()}</div>`;
  }
  _ingList() {
    const s = this._s, q = norm(this._q.ingredients);
    const all = Object.values(s.ingredients).filter((i) => !q || norm(i.name).includes(q))
      .sort((a, b) => (s.aisles.findIndex((x) => x[0] === (a.aisle || "autre")) - s.aisles.findIndex((x) => x[0] === (b.aisle || "autre"))) || a.name.localeCompare(b.name, LANG));
    const list = all.slice(0, this._lim.ingredients), more = all.length - list.length;
    const used = {};
    Object.values(s.recipes).forEach((r) => (r.ingredients || []).forEach((l) => { if (l.ingredient_id) used[l.ingredient_id] = (used[l.ingredient_id] || 0) + 1; }));
    const groups = s.aisles.map(([k, l]) => [k, l, list.filter((i) => (i.aisle || "autre") === k)]).filter((g) => g[2].length);
    return `${groups.length ? groups.map(([k, l, items]) => `<div class="grp"><div class="gh">${esc(_(l))}<em>${items.length}</em></div><div class="igrid">
          ${items.map((i) => `<div class="ic" data-act="ing" data-id="${i.id}"><div class="ii" ${i.image ? `style="background-image:url('${esc(i.image)}')"` : ""}>${i.image ? "" : esc(i.name.slice(0, 1))}</div>
            <div class="in"><b>${esc(i.name)}</b><small>${esc(i.brand || "")}${used[i.id] ? `${i.brand ? " · " : ""}${_(used[i.id] > 1 ? _("{n} recettes") : _("{n} recette"), { n: used[i.id] })}` : ""}</small></div>
            ${i.nutriscore ? `<span class="ns" style="background:${NUTRI[i.nutriscore] || "#888"}">${i.nutriscore.toUpperCase()}</span>` : ""}</div>`).join("")}</div></div>`).join("") + this._moreHtml(more, all.length)
      : `<div class="empty">${q ? `${_("Aucun ingrédient « {q} ».", { q: esc(this._q.ingredients) })} <button class="lnk" data-act="add-ing">${_("Le chercher sur Open Food Facts")}</button>` : _("Aucun ingrédient pour l'instant.")}</div>`}`;
  }

  // ---------------- Statistiques ----------------
  _loadStats() {
    if (this._statsBusy) return;
    this._statsBusy = true;
    this._ws("stats").then((st) => { this._stats = st; this._statsAt = Date.now(); }).catch((e) => { this._stats = { error: (e && e.message) || String(e) }; })
      .finally(() => { this._statsBusy = false; if (this._c.view === "stats" || this._tab === "stats") this._render(); });
  }
  _statsView() {
    const st = this._stats;
    if (!st || Date.now() - (this._statsAt || 0) > 60000) this._loadStats();
    if (!st) return `<div class="empty">${_("Calcul des statistiques…")}</div>`;
    if (st.error) return `<div class="empty">${esc(st.error)}</div>`;
    const size = (b) => b >= 1048576 ? `${fq(Math.round(b / 104857.6) / 10)} ${_("Mo")}` : `${Math.max(1, Math.round(b / 1024))} ${_("Ko")}`;
    const SRC = { marmiton: "Marmiton", jow: "Jow", revisitee: _("Revisitée"), mealie: "Mealie", web: _("Lien"), manual: _("À la main"), manuel: _("À la main") };
    const tile = (icon, n, label, sub = "") => `<div class="stile"><ha-icon icon="${icon}"></ha-icon><b>${n}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;
    const wmax = Math.max(1, ...st.weeks.map((w) => w.meals));
    const thisMon = iso(monday(new Date()));
    const tmax = Math.max(1, ...st.top_recipes.map((r) => r.count));
    const imax = Math.max(1, ...st.top_ingredients.map((r) => r.count));
    const srcs = Object.entries(st.sources).sort((a, b) => b[1] - a[1]);
    return `<div class="bar"><div class="wk">${_("Votre base HOLM My Menu")}</div><button class="ib" data-act="stats-refresh" title="${_("Actualiser")}"><ha-icon icon="mdi:refresh"></ha-icon></button></div>
      <div class="stiles">
        ${tile("mdi:book-open-page-variant", st.recipes, _("recettes"), _(st.favorites > 1 ? _("{n} favoris") : _("{n} favori"), { n: st.favorites }) + " · " + _(st.never_planned > 1 ? _("{n} jamais planifiées") : _("{n} jamais planifiée"), { n: st.never_planned }))}
        ${tile("mdi:food-apple", st.ingredients, _("ingrédients"), _("{a} avec fiche produit · {b} avec photo", { a: st.ingredients_off, b: st.ingredients_img }))}
        ${tile("mdi:calendar-check", st.meals_planned, _("repas planifiés"), _("sur les 8 dernières semaines et à venir"))}
        ${tile("mdi:database", size(st.db_bytes + st.img_bytes), _("occupés"), _("base {a} · {n} photos {b}", { a: size(st.db_bytes), n: st.img_files, b: size(st.img_bytes) }))}
      </div>
      <div class="scols">
        <div class="sbox"><div class="sh">${_("Recettes les plus planifiées")}</div>
          ${st.top_recipes.length ? `<div class="toplist">${st.top_recipes.map((r, k) => `<div class="tr" data-act="recipe" data-id="${r.id}" title="${_("Dernière fois : {d}", { d: r.last ? fdate(new Date(r.last + "T00:00"), { day: "numeric", month: "long" }) : "—" })}">
              <span class="rk">${k + 1}</span><span class="ti" ${r.image ? `style="background-image:url('${esc(r.image)}');background-size:cover"` : ""}></span>
              <span class="tn2"><b>${esc(r.name)}</b><span class="tbar"><i style="width:${Math.round((r.count / tmax) * 100)}%"></i></span></span><em>${r.count}×</em></div>`).join("")}</div>`
            : `<div class="muted pad">${_("Planifiez des repas : les recettes les plus cuisinées apparaîtront ici.")}</div>`}</div>
        <div class="sbox"><div class="sh">${_("Repas planifiés par semaine")}</div>
          <div class="wbars" role="img" aria-label="${_("Repas planifiés par semaine")}">${st.weeks.map((w) => { const d = new Date(w.start + "T00:00"); return `<div class="wb ${w.start === thisMon ? "now" : ""}" title="${_("Semaine du {d} : {n} repas", { d: fdate(d, { day: "numeric", month: "long" }), n: w.meals })}">
              <span class="wv">${w.meals || ""}</span><span class="wcol"><i style="height:${Math.round((w.meals / wmax) * 100)}%"></i></span><span class="wl">${d.getDate()}/${d.getMonth() + 1}</span></div>`; }).join("")}</div>
          <div class="sh">${_("Ingrédients les plus utilisés")}</div>
          ${st.top_ingredients.length ? `<div class="toplist sm">${st.top_ingredients.slice(0, 10).map((r) => `<div class="tr" data-act="ing" data-id="${r.id}">
              <span class="ti ${r.image ? "" : "no"}" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}>${r.image ? "" : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}</span>
              <span class="tn2"><b>${esc(r.name)}</b><span class="tbar"><i style="width:${Math.round((r.count / imax) * 100)}%"></i></span></span><em>${r.count}</em></div>`).join("")}</div>` : `<div class="muted pad">—</div>`}
          <div class="sh">${_("Origine des recettes")}</div>
          <div class="srcs">${srcs.map(([k, n]) => `<span class="chip">${esc(SRC[k] || k)} <b>${n}</b></span>`).join("") || "—"}</div>
        </div>
      </div>`;
  }

  // ---------------- Rappels ----------------
  // Les rappels sont stockés côté intégration. Le formulaire ne doit jamais
  // être reconstruit pendant sa saisie (voir _update et _editingReminder).
  // Rappels persistants : l'onglet lit les données du Store HA ; les tests
  // n'effacent ni les réglages ni les messages de courses Telegram.
  _remindersView() {
    const list = this._s.reminders || [];
    return `<div class="bar"><h3 style="flex:1;margin:0">${_("🔔 Mes rappels")}</h3><button class="pill main" data-act="reminder-add"><ha-icon icon="mdi:plus"></ha-icon>${_("Nouveau rappel")}</button></div>
      <div class="muted" style="margin:8px 0 14px">${_("Rappels ponctuels ou récurrents · Heure locale Home Assistant · Notifications Telegram et mobiles")}</div>
      ${list.length ? list.map(r=>`<div class="rem-row"><div class="rem-text"><b>${({shopping:"🛒",planning:"📅",recipe:"🍳",custom:"🔔"})[r.kind]||"🔔"} ${esc(r.title)}</b><small>${esc(r.frequency==="weekly"?_("Hebdomadaire"):r.frequency==="daily"?_("Quotidien"):_("Une fois"))} · ${esc(r.time)}${r.frequency==="once"?" · "+esc(r.date):""} · ${r.enabled?_("Actif"):_("En pause")}</small><small>${esc(r.last_status||_("Aucun envoi"))}</small></div><div class="rem-actions"><button class="ib" data-act="reminder-toggle" data-id="${r.id}" title="${_("Activer ou suspendre")}"><ha-icon icon="mdi:${r.enabled?"bell-ring":"bell-off"}"></ha-icon></button><button class="ib" data-act="reminder-test" data-id="${r.id}" title="${_("Tester")}"><ha-icon icon="mdi:send-check"></ha-icon></button><button class="ib" data-act="reminder-edit" data-id="${r.id}" title="${_("Modifier")}"><ha-icon icon="mdi:pencil"></ha-icon></button><button class="ib" data-act="reminder-delete" data-id="${r.id}" title="${_("Supprimer")}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div></div>`).join("") : `<div class="empty">${_("Aucun rappel. Créez votre premier rappel pour les courses, les menus, les recettes ou une tâche personnalisée.")}</div>`}`;
  }
  // Formulaire de rappel : protéger les champs contre les rerenders Lovelace
  // et empêcher qu'un clic sur le fond ne ferme une saisie non enregistrée.
  // RAPPELS : conserver la saisie pendant les mises à jour HA ; un clic sur le fond ne ferme pas le formulaire.
  _reminderModal(id=null) {
    const r=(this._s.reminders||[]).find(x=>x.id===id)||{};
    const input=(label,key,type="text",value="")=>`<label class="rem-field">${label}<input class="f" data-key="${key}" type="${type}" value="${esc(String(r[key]??value))}"></label>`;
    const devices=Object.keys(this._hass.states).filter(e=>e.startsWith("notify.") && ((this._hass.entities||{})[e]||{}).platform!=="smtp").map(e=>[e,this._hass.states[e].attributes.friendly_name||e]).sort((a,b)=>a[1].localeCompare(b[1], LANG));
    const selectedDevices=new Set(r.notify_entities|| (r.notify_service?[r.notify_service]:[]));
    const contacts=(this._s.contacts||[]).filter(c=>c.email);
    const selectedEmails=new Set(r.emails||[]);
    const savedTargets=load("holm-mymenu-telegram-targets-v2",[]);
    const tgKey=t=>String(t.chat_id)+":"+String(t.thread_id||"");
    const selectedTargets=new Set((r.telegram_targets||[]).map(tgKey));
    const mb=this._modal(id?_("Modifier le rappel"):_("Nouveau rappel"),`<div class="rem-form">
      ${input(_("Titre"), "title", "text", _("Courses de la semaine"))}
      <label class="rem-field">${_("Type")}<select class="f" data-key="kind">${[["shopping",_("🛒 Courses")],["planning",_("📅 Menus incomplets")],["recipe",_("🍳 Préparation / recette")],["custom",_("🔔 Personnalisé")]].map(([v,l])=>`<option value="${v}" ${r.kind===v?"selected":""}>${l}</option>`).join("")}</select></label>
      <div class="rem-kind-help muted small2" role="status" aria-live="polite"></div>
      <label class="rem-field">${_("Fréquence")}<select class="f" data-key="frequency">${[["once",_("Une fois")],["daily",_("Chaque jour")],["weekly",_("Chaque semaine")]].map(([v,l])=>`<option value="${v}" ${r.frequency===v||(!r.frequency&&v==="weekly")?"selected":""}>${l}</option>`).join("")}</select></label>
      ${input(_("Heure"), "time", "time", "18:00")}
      <div data-frequency="once">${input(_("Date du rappel"), "date", "date", iso(new Date()))}</div>
      <div data-frequency="weekly"><label class="rem-field">${_("Jours de rappel")}<div class="rem-days">${[0,1,2,3,4,5,6].map((i)=>new Date(2024,0,1+i).toLocaleDateString(NUMLOC,{weekday:"narrow"})).map((d,i)=>`<label><input type="checkbox" data-day="${i}" ${(r.days||[4]).includes(i)?"checked":""}>${d}</label>`).join("")}</div></label></div>
      <div data-kind="recipe custom"><label class="rem-field">${_("Message / consigne")}<textarea class="f" data-key="message" rows="3">${esc(r.message||"")}</textarea></label></div>
      <div class="sh">${_("📱 Notifications mobiles Home Assistant")}</div>
      <div class="muted small2">${_("Envoie une notification push aux téléphones ou tablettes sélectionnés. Les appareils sont repris des entités de notification Home Assistant.")}</div>
      ${devices.length?`<div class="dlist">${devices.map(([e,n])=>`<label class="chip"><input type="checkbox" data-notify="${esc(e)}" ${selectedDevices.has(e)?"checked":""}>${esc(n)}</label>`).join("")}</div>`:`<div class="muted">${_("Aucune entité notify disponible.")}</div>`}
      <div class="sh">✈️ Telegram</div>
      <div class="muted small2">${_("Envoie un message de rappel dans les conversations ou sujets déjà configurés pour la liste de courses. Il ne remplace pas le message interactif des courses.")}</div>
      ${savedTargets.length?`<div class="clist">${savedTargets.map((t,i)=>`<label class="ct"><input type="checkbox" data-telegram="${i}" ${selectedTargets.has(tgKey(t))?"checked":""}><span class="cn">${_("Conversation")} ${esc(t.chat_id)}${t.thread_id?` · ${_("Sujet")} ${esc(t.thread_id)}`:""}</span></label>`).join("")}</div>`:`<div class="muted">${_("Aucune conversation enregistrée. Configure d'abord Telegram dans « Envoyer la liste de courses ».")}</div>`}
      <div class="sh">✉️ E-mail</div>
      <div class="muted small2">${_("Envoie le rappel par e-mail avec le serveur SMTP configuré dans Home Assistant. Sélectionne des contacts du carnet ou saisis d'autres adresses.")}</div>
      ${contacts.length?`<div class="clist">${contacts.map(c=>`<label class="ct"><input type="checkbox" data-email="${esc(c.email)}" ${selectedEmails.has(c.email)?"checked":""}><span class="cn">${esc(c.name)} · ${esc(c.email)}</span></label>`).join("")}</div>`:""}
      <label class="rem-field">${_("Autres adresses e-mail (une par ligne)")}<textarea class="f" data-key="emails" rows="2" placeholder="exemple@domaine.fr">${esc((r.emails||[]).filter(e=>!contacts.some(c=>c.email===e)).join("\n"))}</textarea></label>
      <div data-kind="shopping planning"><label><input type="checkbox" data-key="only_if_needed" ${r.only_if_needed!==false?"checked":""}> ${_("Envoyer uniquement si nécessaire")}</label><div class="muted small2">${_("Courses : uniquement s'il reste des articles. Menus : uniquement si des repas ne sont pas planifiés.")}</div></div>
      <label><input type="checkbox" data-key="enabled" ${r.enabled!==false?"checked":""}> ${_("Rappel actif")}</label>
      <div class="bar" style="justify-content:flex-end"><button class="pill" data-cancel>${_("Annuler")}</button><button class="pill main" data-save>${_("Enregistrer")}</button></div>
      </div>`, {dismissOnBackdrop:false});
    // Empêche le rafraîchissement de la carte de détruire le formulaire ouvert.
    // Le clic sur le fond est désactivé via dismissOnBackdrop:false dans _modal.
    this._editingReminder = true;
    // Évite que les interactions du formulaire déclenchent des actions Lovelace.
    const reminderDialog = mb.closest(".mdl");
    const stopPropagation = event => event.stopPropagation();
    for (const eventName of ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "touchstart", "touchend"]) {
      reminderDialog.addEventListener(eventName, stopPropagation);
    }
    const kindHelp = {
      shopping: _("🛒 Courses : vérifie les articles restant à acheter. Avec « Envoyer uniquement si nécessaire », aucun rappel n'est envoyé si la liste est terminée."),
      planning: _("📅 Menus : vérifie les repas non planifiés sur les sept prochains jours. Avec « Envoyer uniquement si nécessaire », aucun rappel n'est envoyé si tous les menus sont complets."),
      recipe: _("🍳 Préparation : envoie la consigne saisie ci-dessous au moment choisi (par exemple « Décongeler le poulet »). Le délai n'est pas calculé automatiquement depuis la recette."),
      custom: _("🔔 Personnalisé : envoie le texte saisi ci-dessous à l'heure programmée (par exemple « Acheter les pommes de terre à la ferme »), indépendamment des courses et des menus.")
    };
    // Affiche uniquement les champs pertinents selon le type et la fréquence.
    // L'aide est contextuelle : elle explique les quatre types de rappels.
    const refresh = () => {
      const frequency = mb.querySelector('[data-key="frequency"]').value;
      const kind = mb.querySelector('[data-key="kind"]').value;
      for (const field of mb.querySelectorAll('[data-frequency]')) {
        field.hidden = field.dataset.frequency !== frequency;
      }
      for (const field of mb.querySelectorAll('[data-kind]')) {
        field.hidden = !field.dataset.kind.split(" ").includes(kind);
      }
      mb.querySelector(".rem-kind-help").textContent = kindHelp[kind] || "";
    };
    mb.querySelector('[data-key="frequency"]').onchange=refresh;
    mb.querySelector('[data-key="kind"]').onchange=refresh;
    refresh();
    mb.querySelector('[data-cancel]').onclick=()=>this._close();
    mb.querySelector('[data-save]').onclick=async()=>{
      const v=k=>mb.querySelector(`[data-key="${k}"]`)?.value||"";
      const telegram_targets=[...mb.querySelectorAll('[data-telegram]:checked')].map(x=>savedTargets[Number(x.dataset.telegram)]).map(t=>({chat_id:Number(t.chat_id),thread_id:t.thread_id?Number(t.thread_id):null}));
      const notify_entities=[...mb.querySelectorAll('[data-notify]:checked')].map(x=>x.dataset.notify);
      const emails=[...new Set([...mb.querySelectorAll('[data-email]:checked')].map(x=>x.dataset.email).concat(v("emails").split(/[\n,;]/).map(x=>x.trim()).filter(Boolean)))];
      const reminder={title:v("title"),kind:v("kind"),frequency:v("frequency"),time:v("time"),date:v("date"),days:[...mb.querySelectorAll('[data-day]:checked')].map(x=>Number(x.dataset.day)),message:v("message"),notify_service:"",notify_entities,emails,telegram_targets,only_if_needed:mb.querySelector('[data-key="only_if_needed"]').checked,enabled:mb.querySelector('[data-key="enabled"]').checked};
      try {await this._ws("reminder/save",{reminder,...(id?{reminder_id:id}:{})});this._close();this._toast(_("Rappel enregistré"));}catch(e){this._toast(e.message||String(e));}
    };
  }

  // ---------------- Courses ----------------
  // Liste de courses : regroupement visuel, modification/suppression sur une
  // seule ligne et rayons personnalisés ; ne pas modifier les recettes sources.
  // COURSES : les lignes regroupées conservent les IDs des ingrédients issus des recettes.
  _shopDates() {
    const w0 = this._shopWeek || monday(new Date());
    return [this._shopFrom || w0, this._shopTo || addDays(this._shopFrom || w0, 6)];
  }
  _shopView() {
    const s = this._s, sh = s.shopping || {}, items = sh.items || [];
    const w0 = this._shopWeek || monday(new Date()), w1 = addDays(w0, 6);
    const dates = this._shopMode === "dates", [df, dt] = this._shopDates();
    const ndays = Math.round((dt - df) / 864e5) + 1;
    const viewItems = sh.groups || items;
    const groups = s.aisles.map(([k, l]) => [l, viewItems.filter((i) => (i.aisle || "autre") === k)]).filter((g) => g[1].length);
    const done = items.filter((i) => i.checked).length;
    const rng = sh.range ? shopRange(sh.range.start, sh.range.end, false, true) : "";
    const seg = `<span class="seg mini shopmode">${[["week", _("Semaine")], ["dates", _("Dates")]].map(([k, l]) => `<button class="${(dates ? "dates" : "week") === k ? "on" : ""}" data-act="shop-mode" data-m="${k}">${l}</button>`).join("")}</span>`;
    const picker = dates
      ? `<div class="wk dates"><label>${_("Du")} <input type="date" class="f dt" data-act="shop-from" data-ev="change" value="${iso(df)}"></label>
          <label>${_("au")} <input type="date" class="f dt" data-act="shop-to" data-ev="change" value="${iso(dt)}" min="${iso(df)}" max="${iso(addDays(df, SHOP_MAX_DAYS - 1))}"></label>
          <small class="${ndays < 1 || ndays > SHOP_MAX_DAYS ? "bad" : ""}">${ndays < 1 ? _("dates inversées") : _(ndays > 1 ? _("{n} jours") : _("{n} jour"), { n: ndays })}</small></div>`
      : `<button class="ib" data-act="shop-week-prev"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
        <div class="wk">${_("Semaine du {a} au {b}", { a: fdate(w0, { day: "numeric", month: "short" }), b: fdate(w1, { day: "numeric", month: "short" }) })}</div>
        <button class="ib" data-act="shop-week-next"><ha-icon icon="mdi:chevron-right"></ha-icon></button>`;
    return `<div class="bar shopbar">${seg}${picker}
        <button class="pill main" data-act="shop-gen"><ha-icon icon="mdi:cart-arrow-down"></ha-icon>${_("Générer")}</button></div>
      <div class="bar"><input class="shop-add" placeholder="${_("Ajouter un article (Entrée)…")}"><button class="pill" data-act="shop-category"><ha-icon icon="mdi:shape-plus"></ha-icon>${_("Rayons")}</button>${(sh.excluded || []).length ? `<button class="pill" data-act="shop-restore" title="${_("Voir et restaurer les articles retirés")}">${_("Articles retirés")} (${sh.excluded.length})</button>` : ""}</div>
      ${items.length ? `<div class="shopmeta">${rng}${rng ? " · " : ""}${_("{d}/{n} pris", { d: done, n: items.length })}
          ${done ? `<button class="lnk" data-act="shop-clear-checked">${_("Retirer les articles pris")}</button>` : ""}</div>
        <div class="row act shopact"><button class="pill" data-act="shop-share"><ha-icon icon="mdi:send-outline"></ha-icon>${_("Envoyer (mail / Telegram)")}</button><button class="pill" data-act="shop-copy"><ha-icon icon="mdi:content-copy"></ha-icon>${_("Copier")}</button><button class="pill danger" data-act="shop-clear"><ha-icon icon="mdi:delete-sweep-outline"></ha-icon>${_("Vider la liste")}</button></div>
        ${groups.map(([l, its]) => `<div class="grp"><div class="gh">${esc(_(l))}<em>${its.filter((i) => !i.checked).length}</em></div>
          ${its.sort((a, b) => a.checked - b.checked || a.name.localeCompare(b.name, LANG)).map((i) => `<div class="si ${i.checked ? "ck" : ""}" data-act="shop-toggle-group" data-ids='${JSON.stringify(i.ids || [i.id])}' title="${esc((i.items || [i]).flatMap(x => x.sources || []).join(", "))}">
            <span class="cb"><ha-icon icon="mdi:check"></ha-icon></span><b>${esc(i.name)}</b><span class="q">${esc(i.display || "")}</span>
            ${(i.items || [i]).some(x => x.sources?.length) ? `<small>${esc([...new Set((i.items || [i]).flatMap(x => x.sources || []))].slice(0, 2).join(", "))}</small>` : (i.items || [i]).some(x => x.manual) ? `<small>${_("ajouté")}</small>` : "<small></small>"}
            <button class="ib" data-act="shop-edit" data-ids='${JSON.stringify(i.ids || [i.id])}' title="${_("Modifier")}"><ha-icon icon="mdi:pencil-outline"></ha-icon></button><button class="x" data-act="shop-del-group" data-ids='${JSON.stringify(i.ids || [i.id])}' ><ha-icon icon="mdi:close"></ha-icon></button></div>`).join("")}</div>`).join("")}`
      : `<div class="empty">${_("La liste est vide. Choisissez une semaine (ou des dates) et touchez <b>Générer</b> : les ingrédients des repas prévus sont additionnés et rangés par rayon.")}</div>`}`;
  }

  _restoreShopModal() {
    const sh = this._s.shopping || {};
    const excluded = sh.excluded || [];
    const details = sh.excluded_details || {};
    const mb = this._modal(_("Articles retirés"), `
      <div class="muted">${_("Ces articles ne seront pas ajoutés à nouveau lors de la génération de cette période. Les recettes restent inchangées.")}</div>
      <div class="clist">${excluded.map(key => {
        const item = details[key] || {};
        const name = item.name || key.split("|")[0];
        return `<div class="ct" style="display:flex;align-items:center;gap:12px;padding:10px 12px">
          <span class="cn grow"><b>${esc(name)}</b>${item.display ? `<small>${esc(item.display)}</small>` : ""}</span>
          <button class="pill" data-restore="${esc(key)}"><ha-icon icon="mdi:backup-restore"></ha-icon>${_("Restaurer")}</button>
        </div>`;
      }).join("")}</div>
      <div class="row end"><button class="pill" data-all>${_("Tout restaurer")}</button><button class="pill main" data-close>${_("Terminer")}</button></div>
      <small>${_("Les articles restaurés réapparaîtront à la prochaine génération de la liste.")}</small>`);
    mb.querySelectorAll("[data-restore]").forEach(btn => btn.addEventListener("click", async () => {
      await this._ws("shopping/restore", {keys: [btn.dataset.restore]});
      this._toast(_("Article réautorisé pour la prochaine génération"));
      this._close();
    }));
    mb.querySelector("[data-all]").addEventListener("click", async () => {
      await this._ws("shopping/restore", {});
      this._toast(_("Tous les articles sont réautorisés pour la prochaine génération"));
      this._close();
    });
    mb.querySelector("[data-close]").addEventListener("click", () => this._close());
  }

  // RAYONS : création et modification depuis les courses et les fiches ingrédients.
  _categoryModal(onCreated = null) {
    const s = this._s;
    const mb = this._modal(_("Gérer les rayons"), `
      <div class="sh">${_("Catégories personnalisées")}</div>
      ${(s.custom_aisles || []).map(a => `<div class="row"><span class="grow">${esc(a.icon || "🟣")} ${esc(a.name)}</span><button class="pill" data-edit="${esc(a.id)}">${_("Modifier")}</button><button class="pill danger" data-del="${esc(a.id)}">${_("Supprimer")}</button></div>`).join("") || `<div class="muted">${_("Aucune catégorie personnalisée.")}</div>`}
      <div class="sh">${_("Nouvelle catégorie")}</div>
      <div class="row"><input class="f grow" data-newname placeholder="${_("Ex. Bricolage")}"><input class="f" data-newicon value="🟣" maxlength="8" style="max-width:75px"><button class="pill main" data-create>${_("Créer")}</button></div>
      <small>${_("Les rayons standards restent disponibles. La suppression déplace les articles vers Divers.")}</small>`);
    mb.querySelector('[data-create]').addEventListener('click', async () => {
      const name = mb.querySelector('[data-newname]').value.trim(), icon = mb.querySelector('[data-newicon]').value.trim();
      if (!name) return this._toast(_("Indique un nom de rayon"));
      try { const a = await this._ws('aisle/create', {name, icon}); this._close(); if (onCreated) onCreated(a.id); else this._toast(_("Rayon créé")); } catch(e) { this._toast(e.message || String(e)); }
    });
    mb.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', async () => {
      const a = s.custom_aisles.find(x => x.id === b.dataset.edit);
      const name = prompt(_("Nom du rayon"), a.name); if (name === null) return;
      const icon = prompt(_("Pastille ou emoji"), a.icon || '🟣'); if (icon === null) return;
      try { await this._ws('aisle/update', {aisle_id:a.id,name,icon}); this._categoryModal(onCreated); } catch(e) {this._toast(e.message || String(e));}
    }));
    mb.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(_("Supprimer ce rayon ? Ses articles seront déplacés vers Divers."))) return;
      try { await this._ws('aisle/delete', {aisle_id:b.dataset.del}); this._categoryModal(onCreated); } catch(e) {this._toast(e.message || String(e));}
    }));
  }
  // ÉDITION : modifier un article sans changer la recette qui l’a généré.
  _shopEdit(ids) {
    const originals = (this._s.shopping.items || []).filter(i => ids.includes(i.id));
    if (!originals.length) return;
    const group = (this._s.shopping.groups || []).find(g => JSON.stringify(g.ids) === JSON.stringify(ids));
    const item = originals[0];
    const mb = this._modal(_("Modifier un article"), `
      <label class="fl">${_("Article")}<input class="f" data-f="name" value="${esc(group?.name || item.name)}"></label>
      ${ids.length === 1 ? `<label class="fl">${_("Quantité affichée")}<input class="f" data-f="display" value="${esc(item.display || '')}"></label>` : `<small>${_("Quantités regroupées : modifier les quantités dans les recettes sources pour éviter de les compter plusieurs fois.")}</small>`}
      <label class="fl">${_("Rayon")}<select class="f" data-f="aisle">${this._s.aisles.map(([k,l]) => `<option value="${esc(k)}" ${k === item.aisle ? 'selected' : ''}>${esc(_(l))}</option>`).join('')}</select></label>
      <div class="row"><button class="pill" data-newrayon>${_("+ Nouveau rayon")}</button><button class="pill main" data-save>${_("Enregistrer")}</button></div>
      <small>${_("Les modifications ne changent pas les recettes d'origine.")}</small>`);
    mb.querySelector('[data-newrayon]').addEventListener('click', () => this._categoryModal(() => this._shopEdit(ids)));
    mb.querySelector('[data-save]').addEventListener('click', async () => {
      const changes = {}; mb.querySelectorAll('[data-f]').forEach(f => changes[f.dataset.f] = f.value.trim());
      if (!changes.name) return this._toast(_("Nom requis"));
      try { await this._ws('shopping/update', {item_ids:ids, changes}); this._close(); } catch(e) {this._toast(e.message || String(e));}
    });
  }

  // PARTAGE : conserver la période sélectionnée et les quantités de la liste.
  _shopText(withChecked = false) {
    const s = this._s, sh = s.shopping || {}, items = (sh.groups || sh.items || []).filter((i) => withChecked || !i.checked);
    const head = sh.range ? `${_("Liste de courses")} — ${shopRange(sh.range.start, sh.range.end, true)}` : _("Liste de courses");
    const parts = s.aisles.map(([k, l]) => [l, items.filter((i) => (i.aisle || "autre") === k)]).filter((g) => g[1].length)
      .map(([l, its]) => `${_(l).toUpperCase()}\n${its.sort((a, b) => a.name.localeCompare(b.name, LANG)).map((i) => `- ${i.name}${i.display ? ` : ${i.display}` : ""}`).join("\n")}`);
    return `${head}\n\n${parts.join("\n\n") || _("(liste vide)")}\n\n— HOLM My Menu`;
  }
  _shareModal() {
    const selC = new Set(load("holm-mymenu-to", [])), selE = new Set(load("holm-mymenu-devices", []));
    let telegramTargets = load("holm-mymenu-telegram-targets-v2", []);
    if (!Array.isArray(telegramTargets)) telegramTargets = [];
    // Keep target selection independent from the stored Telegram address book.
    const tgKey = (t) => `${t.chat_id}:${t.thread_id || ""}`;
    const tgSelectionKey = "holm-mymenu-telegram-selected-v1";
    let tgSelected = load(tgSelectionKey, null);
    if (!Array.isArray(tgSelected)) tgSelected = telegramTargets.map(tgKey);
    const selectedTelegram = () => telegramTargets.filter((t) => tgSelected.includes(tgKey(t)));
    const saveTelegramSelection = () => save(tgSelectionKey, tgSelected);
    let info = null;
    this._ws("mail/info").then((x) => { info = x; draw(); }).catch(() => {});
    const devices = () => Object.keys(this._hass.states).filter((e) => e.startsWith("notify.") && ((this._hass.entities || {})[e] || {}).platform !== "smtp")
      .map((e) => [e, this._hass.states[e].attributes.friendly_name || e]).sort((a, b) => a[1].localeCompare(b[1], LANG));
    let draw = () => {
      const contacts = (this._s.contacts || []).slice().sort((a, b) => a.name.localeCompare(b.name, LANG));
      const text = this._shopText();
      const picked = contacts.filter((c) => selC.has(c.id));
      const mailto = `mailto:${encodeURIComponent(picked.map((c) => c.email).join(","))}?subject=${encodeURIComponent(text.split("\n")[0])}&body=${encodeURIComponent(text)}`;
      const devs = devices();
      const mb = this._modal(_("Envoyer la liste de courses"), `
        <div class="sh">${_("Par e-mail")}</div>
        ${contacts.length ? `<div class="clist">${contacts.map((c) => `<label class="ct ${selC.has(c.id) ? "on" : ""}"><input type="checkbox" data-c="${c.id}" ${selC.has(c.id) ? "checked" : ""}>
            <span class="av">${esc(c.name.slice(0, 1).toUpperCase())}</span><span class="cn"><b>${esc(c.name)}</b><small>${esc(c.email)}</small></span>
            <button class="ib" data-del="${c.id}" title="${_("Retirer du carnet")}"><ha-icon icon="mdi:close"></ha-icon></button></label>`).join("")}</div>`
          : `<div class="muted">${_("Votre carnet d'adresses est vide : ajoutez les personnes à qui envoyer la liste.")}</div>`}
        <div class="row addc"><input class="f cnm" placeholder="${_("Nom (Marie, Paul…)")}"><input class="f grow cem" type="email" placeholder="${_("adresse e-mail")}"><button class="pill" data-x="addc"><ha-icon icon="mdi:account-plus"></ha-icon>${_("Ajouter")}</button></div>
        ${info && !info.smtp ? `<div class="warn">${_("Aucune intégration SMTP n'est configurée dans Home Assistant : utilisez « Ouvrir ma messagerie », ou ajoutez l'intégration SMTP pour envoyer directement.")}</div>` : info ? `<div class="muted small2">${_("Envoyé par {s} (intégration {i}), en un seul message à toutes les adresses cochées.", { s: esc(info.sender), i: esc(info.name) })}</div>` : ""}
        ${devs.length ? `<div class="sh">${_("Sur un téléphone ou une tablette (notification)")}</div>
          <div class="dlist">${devs.map(([e, n]) => `<label class="chip ${selE.has(e) ? "on" : ""}"><input type="checkbox" data-e="${e}" ${selE.has(e) ? "checked" : ""}>${esc(n)}</label>`).join("")}</div>` : ""}
        <div class="row" style="align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div class="sh">${_("Par Telegram (liste interactive synchronisée)")}</div>
          ${telegramTargets.length ? `<label class="chip ${selectedTelegram().length === telegramTargets.length ? "on" : ""}" style="cursor:pointer">
            <input type="checkbox" data-tgall ${selectedTelegram().length === telegramTargets.length ? "checked" : ""}>
            ${_("Tout sélectionner / désélectionner")}
          </label>` : ""}
        </div>
        <div class="muted small2">${_("Sélectionne les conversations destinataires. Le numéro du sujet est facultatif.")}</div>
        <div class="row addc"><input class="f tg-chat" placeholder="${_("Chat ID (ex. -1001234567890)")}"><input class="f tg-thread" placeholder="${_("Sujet / thread ID (facultatif)")}"><button class="pill" data-x="addtg"><ha-icon icon="mdi:plus"></ha-icon>${_("Ajouter")}</button></div>
        ${telegramTargets.length ? `<div class="clist">${telegramTargets.map((t, i) => `
          <div class="ct ${tgSelected.includes(tgKey(t)) ? "on" : ""}" style="display:flex;align-items:center;gap:12px;padding:12px 14px">
            <label style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;cursor:pointer">
              <input type="checkbox" data-tg="${i}" ${tgSelected.includes(tgKey(t)) ? "checked" : ""}>
              <span class="av"><ha-icon icon="mdi:telegram"></ha-icon></span>
              <span class="cn" style="min-width:0">
                <b style="display:block">${_("Conversation Telegram")}</b>
                <small style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px">
                  <span><ha-icon icon="mdi:account-group-outline" style="--mdc-icon-size:16px;vertical-align:middle"></ha-icon> Chat ID : <strong>${esc(String(t.chat_id))}</strong></span>
                  ${t.thread_id ? `<span><ha-icon icon="mdi:forum-outline" style="--mdc-icon-size:16px;vertical-align:middle"></ha-icon> ${_("Sujet :")} <strong>${esc(String(t.thread_id))}</strong></span>` : `<span>${_("Sans sujet")}</span>`}
                </small>
              </span>
            </label>
            <button class="ib" data-tgdel="${i}" title="${_("Retirer cette conversation")}"><ha-icon icon="mdi:close"></ha-icon></button>
          </div>`).join("")}</div>` : ""}
        <div class="row end sendrow"><a class="pill" href="${mailto}"><ha-icon icon="mdi:email-edit-outline"></ha-icon>${_("Ouvrir ma messagerie")}</a>
          <button class="pill main" data-x="send" ${selC.size || selE.size || selectedTelegram().length ? "" : "disabled"}><ha-icon icon="mdi:send"></ha-icon>${_("Envoyer")}${selC.size + selE.size + selectedTelegram().length ? ` (${selC.size + selE.size + selectedTelegram().length})` : ""}</button></div>
        <details class="adv"><summary>${_("Aperçu de la liste")}</summary><pre class="prev">${esc(text)}</pre></details>`, { wide: true });
      mb.querySelectorAll("input").forEach((x) => { x.addEventListener("keydown", (e) => e.stopPropagation()); x.addEventListener("keyup", (e) => e.stopPropagation()); });
      mb.querySelector('[data-x="addtg"]').addEventListener("click", () => {
        const chat = mb.querySelector(".tg-chat").value.trim();
        const thread = mb.querySelector(".tg-thread").value.trim();
        if (!/^-?\d+$/.test(chat) || (thread && !/^\d+$/.test(thread))) return this._toast(_("Identifiant Telegram invalide"));
        if (!telegramTargets.some((t) => t.chat_id === chat && (t.thread_id || "") === thread)) {
          const target = { chat_id: chat, thread_id: thread };
          telegramTargets.push(target);
          tgSelected.push(tgKey(target));
          save("holm-mymenu-telegram-targets-v2", telegramTargets);
          saveTelegramSelection();
        }
        draw();
      });
      mb.querySelectorAll("[data-tgdel]").forEach((b) => b.addEventListener("click", () => {
        const removed = telegramTargets.splice(Number(b.dataset.tgdel), 1)[0];
        tgSelected = tgSelected.filter((key) => key !== tgKey(removed));
        save("holm-mymenu-telegram-targets-v2", telegramTargets);
        saveTelegramSelection(); draw();
      }));
      mb.querySelectorAll("[data-tg]").forEach((x) => x.addEventListener("change", () => {
        const key = tgKey(telegramTargets[Number(x.dataset.tg)]);
        tgSelected = x.checked ? [...new Set([...tgSelected, key])] : tgSelected.filter((v) => v !== key);
        saveTelegramSelection(); draw();
      }));
      mb.querySelector("[data-tgall]")?.addEventListener("change", (e) => {
        tgSelected = e.currentTarget.checked ? telegramTargets.map(tgKey) : [];
        saveTelegramSelection(); draw();
      });
      mb.querySelectorAll("[data-c]").forEach((x) => x.addEventListener("change", () => { x.checked ? selC.add(x.dataset.c) : selC.delete(x.dataset.c); save("holm-mymenu-to", [...selC]); draw(); }));
      mb.querySelectorAll("[data-e]").forEach((x) => x.addEventListener("change", () => { x.checked ? selE.add(x.dataset.e) : selE.delete(x.dataset.e); save("holm-mymenu-devices", [...selE]); draw(); }));
      mb.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async (e) => {
        e.preventDefault(); e.stopPropagation();
        const c = contacts.find((x) => x.id === b.dataset.del);
        if (!confirm(_("Retirer {n} du carnet d'adresses ?", { n: c.name }))) return;
        selC.delete(c.id); save("holm-mymenu-to", [...selC]);
        await this._do(this._ws("contact/delete", { contact_id: c.id }));
      }));
      const add = async () => {
        const nm = mb.querySelector(".cnm").value.trim(), em = mb.querySelector(".cem").value.trim();
        if (!em) return this._toast(_("Indiquez une adresse e-mail"));
        const c = await this._do(this._ws("contact/save", { name: nm, email: em }), _("{n} ajouté au carnet", { n: nm || em }));
        selC.add(c.id); save("holm-mymenu-to", [...selC]);
      };
      mb.querySelector('[data-x="addc"]').addEventListener("click", add);
      mb.querySelector(".cem").addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });
      mb.querySelector('[data-x="send"]').addEventListener("click", async (e) => {
        const btn = e.currentTarget; btn.disabled = true; btn.lastChild.textContent = _("Envoi…");
        try {
          const out = await this._ws("shopping/send", { contacts: [...selC], entities: [...selE], telegram_targets: selectedTelegram() });
          const n = out.emails.length, d = out.entities.length, t = (out.telegram_targets || []).length;
          this._toast(_("Liste envoyée") + (n ? " " + _(n > 1 ? _("à {n} adresses") : _("à {n} adresse"), { n }) : "") + (n && d ? " " + _("et") : "") + (d ? " " + _(d > 1 ? _("à {n} appareils") : _("à {n} appareil"), { n: d }) : "") + (t ? ` · Telegram (${t})` : ""));
          this._close();
        } catch (err) { this._toast(`${_("Envoi impossible")} : ${(err && err.message) || err}`); draw(); }
      });
    };
    const refresh = () => { const a = this.shadowRoot.activeElement; if (!a || !a.matches("input.cnm, input.cem")) draw(); };
    const _draw = draw;
    draw = () => { _draw(); this._refresher = refresh; };
    draw();
  }

  // ---------------- fenêtres ----------------
  // FENÊTRES : fermeture explicite pour les formulaires qui ne doivent pas perdre leur contenu.
  _modal(title, html, opts = {}) {
    setLang(this._hass, this._c);
    this._editingRecipe = false;
    let root = this.shadowRoot.querySelector(".modal-root");
    if (!root) { root = document.createElement("div"); root.className = "modal-root"; this.shadowRoot.appendChild(root); }
    root.innerHTML = `<div class="ov"><div class="mdl ${opts.wide ? "wide" : ""}"><div class="mh">${opts.back ? `<button class="ib mback"><ha-icon icon="mdi:arrow-left"></ha-icon></button>` : ""}<div class="mt">${title}</div><button class="ib mclose"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="mb">${html}</div></div></div>`;
    // Certaines fenêtres se ferment au clic extérieur ; pas le formulaire de rappel.
    root.querySelector(".ov").addEventListener("click", (e) => { if (opts.dismissOnBackdrop !== false && e.target.classList.contains("ov")) this._close(); e.stopPropagation(); });
    root.querySelector(".mclose").addEventListener("click", () => this._close());
    if (opts.back) root.querySelector(".mback").addEventListener("click", opts.back);
    this._refresher = opts.refresh || null;
    return root.querySelector(".mb");
  }
  _close() { this._editingRecipe = false; this._editingReminder = false; const r = this.shadowRoot.querySelector(".modal-root"); if (r) r.remove(); this._refresher = null; }
  _refreshModal() { if (this._refresher) this._refresher(); }

  // ----- « Suggérer » : remplit les repas vides avec ses propres recettes (#15) -----
  _suggestModal() {
    const st = this._sg = { avoid: [...(this._s.settings?.avoid || [])], slots: this._viewSlots(), f: { cat: "__main", time: 0, rating: 0, fav: false, ...load("holm-mymenu-sgfilters", {}) }, picks: {} };
    const s = () => this._s;
    const today = iso(new Date());
    const holes = () => {
      const out = [];
      for (let i = 0; i < 7; i++) {
        const k = iso(addDays(this._week, i));
        if (k < today) continue;
        for (const sl of st.slots) if (!((s().plan[k] || {})[sl] || []).length) out.push(`${k}|${sl}`);
      }
      return out;
    };
    const pool = () => {
      const avoid = st.avoid.map(norm).filter(Boolean);
      return Object.values(s().recipes).filter((r) => this._matchFilters(r, st.f)
        && !avoid.some((a) => norm(r.name).includes(a) || (r.ingredients || []).some((l) => norm(l.name).includes(a) || norm((s().ingredients[l.ingredient_id] || {}).name).includes(a))));
    };
    // recettes déjà prévues sur la période ou dans les 14 jours précédents : évitées si possible
    const recent = () => {
      const set = new Set(), from = iso(addDays(this._week, -14)), to = iso(addDays(this._week, 6));
      for (const [k, d] of Object.entries(s().plan)) if (k >= from && k <= to) for (const es of Object.values(d)) for (const e of es) if (e.type === "recipe") set.add(e.recipe_id);
      return set;
    };
    const pick = (cands, used) => {
      const rec = recent();
      let c = cands.filter((r) => !used.has(r.id) && !rec.has(r.id));
      if (!c.length) c = cands.filter((r) => !used.has(r.id));
      if (!c.length) return null;
      const w = c.map((r) => 1 + (r.favorite ? 2 : 0) + Math.log1p((s().history || {})[r.id] || 0) + (Number(r.rating) >= 4.5 ? 0.5 : 0));
      let x = Math.random() * w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < c.length; i++) { x -= w[i]; if (x <= 0) return c[i]; }
      return c[c.length - 1];
    };
    const regen = (only) => {
      const cands = pool(), keys = holes();
      const used = new Set(Object.entries(st.picks).filter(([k, v]) => v && keys.includes(k) && (only ? k !== only : false)).map(([, v]) => v));
      for (const k of keys) {
        if (only && k !== only) continue;
        if (st.picks[k] === null && !only) continue; // « ne pas remplir » conservé
        const r = pick(cands, used); st.picks[k] = r ? r.id : undefined; if (r) used.add(r.id);
      }
      for (const k of Object.keys(st.picks)) if (!keys.includes(k)) delete st.picks[k];
    };
    const draw = () => {
      const keys = holes(), n = pool().length;
      const chosen = keys.filter((k) => st.picks[k]);
      const avoid = st.avoid;
      const names = [...new Set(Object.values(s().ingredients).map((i) => i.name))].sort((a, b) => a.localeCompare(b, LANG));
      const mb = this._modal(_("Suggérer des repas"), `
        <div class="muted">${esc(this._wkLabel(this._week, addDays(this._week, 6)))} · ${_("Seuls les repas vides sont remplis : rien de déjà prévu n'est remplacé.")}</div>
        <div class="sh" style="margin-top:12px">${_("Repas à remplir")}</div>
        <div class="chips">${s().slots.map((sl) => `<button class="chip sgs ${st.slots.includes(sl) ? "on" : ""}" data-sl="${sl}">${SLOT_LBL[sl]}</button>`).join("")}
          <button class="chip sgfav ${st.f.fav ? "on" : ""}"><ha-icon icon="mdi:heart${st.f.fav ? "" : "-outline"}"></ha-icon>${_("Favoris uniquement")}</button></div>
        <div class="rfbar sg">${this._filterFields(st.f, "sgf", true)}</div>
        <div class="sh" style="margin-top:12px">${_("Ingrédients à éviter")}</div>
        <div class="chips">${avoid.map((a, i) => `<span class="chip av">${esc(a)}<button class="avx" data-i="${i}">✕</button></span>`).join("")}
          <input class="f avin" list="sg-ings" placeholder="${_("Ajouter un ingrédient à éviter…")}" style="flex:1 1 180px"><datalist id="sg-ings">${names.map((x) => `<option value="${esc(x)}">`).join("")}</datalist></div>
        <div class="muted" style="margin-top:4px">${_("Simple filtre sur le nom des ingrédients : vérifiez toujours la recette en cas d'allergie.")}</div>
        <div class="sh" style="margin-top:14px">${_("{n} recettes possibles", { n })}<button class="lnk sgall">${_("Tout regénérer")}</button></div>
        ${!keys.length ? `<div class="muted">${_("Aucun repas vide à remplir sur cette période.")}</div>` : !n ? `<div class="muted">${_("Aucune recette ne correspond à ces critères.")}</div>` : `<div class="sglist">${keys.map((k) => {
          const [day, sl] = k.split("|"), r = st.picks[k] ? s().recipes[st.picks[k]] : null;
          return `<div class="sgl ${r ? "" : "off"}"><div class="sgd"><b>${esc(fdate(new Date(day + "T12:00:00"), { weekday: "short", day: "numeric" }))}</b><small>${SLOT_LBL[sl]}</small></div>
            <div class="sgi" ${r && r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}>${r && r.image ? "" : `<ha-icon icon="mdi:chef-hat"></ha-icon>`}</div>
            <div class="sgn">${r ? `<b>${esc(r.name)}</b><small>${[this._rtime(r) ? mins(this._rtime(r)) : "", r.category || ""].filter(Boolean).map(esc).join(" · ")}</small>` : `<i class="muted">${_("Ne pas remplir")}</i>`}</div>
            <button class="ib sgre" data-k="${k}" title="${_("Autre recette")}"><ha-icon icon="mdi:dice-multiple-outline"></ha-icon></button>
            <button class="ib sgno" data-k="${k}" title="${_("Ne pas remplir")}"><ha-icon icon="mdi:close"></ha-icon></button></div>`; }).join("")}</div>`}
        <div class="mf"><button class="pill sgcancel">${_("Annuler")}</button><button class="pill main sgok" ${chosen.length ? "" : "disabled"}><ha-icon icon="mdi:calendar-check"></ha-icon>${_("Planifier {n} repas", { n: chosen.length })}</button></div>`, { wide: true });
      const q = (sel) => mb.querySelectorAll(sel);
      q(".sgs").forEach((b) => b.addEventListener("click", () => { const sl = b.dataset.sl; st.slots = st.slots.includes(sl) ? st.slots.filter((x) => x !== sl) : [...st.slots, sl]; regen(); draw(); }));
      q(".sgfav").forEach((b) => b.addEventListener("click", () => { st.f.fav = !st.f.fav; save("holm-mymenu-sgfilters", st.f); st.picks = {}; regen(); draw(); }));
      q('select[data-act="sgf"]').forEach((el) => el.addEventListener("change", () => { const k = el.dataset.k; st.f[k] = k === "cat" ? el.value : Number(el.value) || 0; save("holm-mymenu-sgfilters", st.f); st.picks = {}; regen(); draw(); }));
      q(".sgre").forEach((b) => b.addEventListener("click", () => { regen(b.dataset.k); draw(); }));
      q(".sgno").forEach((b) => b.addEventListener("click", () => { st.picks[b.dataset.k] = null; draw(); }));
      q(".sgall").forEach((b) => b.addEventListener("click", () => { st.picks = {}; regen(); draw(); }));
      const setAvoid = (list) => { st.avoid = list; st.picks = {}; regen(); draw(); this._do(this._ws("settings/avoid", { items: list })).catch(() => {}); };
      q(".avx").forEach((b) => b.addEventListener("click", () => setAvoid(avoid.filter((_x, i) => i !== Number(b.dataset.i)))));
      q(".avin").forEach((inp) => {
        inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter" && inp.value.trim()) setAvoid([...avoid, inp.value.trim()]); });
        inp.addEventListener("change", () => { if (inp.value.trim() && names.includes(inp.value.trim())) setAvoid([...avoid, inp.value.trim()]); });
      });
      q(".sgcancel").forEach((b) => b.addEventListener("click", () => this._close()));
      q(".sgok").forEach((b) => b.addEventListener("click", async () => {
        const items = holes().filter((k) => st.picks[k]).map((k) => { const [day, slot] = k.split("|"); return { day, slot, recipe_id: st.picks[k] }; });
        b.disabled = true;
        try { const r = await this._ws("plan/fill", { items }); this._close(); this._toast(_("{n} repas planifiés", { n: (r && r.filled) ?? items.length })); }
        catch (e) { b.disabled = false; this._toast(`HOLM My Menu : ${(e && e.message) || e}`); }
      }));
    };
    regen(); draw();
  }

  // ----- créneau -----
  _slotModal(day, slot) {
    let picked = false;
    const same = (a, b) => a.type === b.type && ((a.type === "recipe" && a.recipe_id === b.recipe_id) || (a.type === "ingredient" && a.ingredient_id === b.ingredient_id) || (a.type === "text" && norm(a.text) === norm(b.text)));
    const draw = () => {
      const s = this._s, entries = (s.plan[day] || {})[slot] || [];
      const dt = new Date(day + "T00:00");
      const mb = this._modal(`${SLOT_LBL[slot]} · ${fdate(dt, { weekday: "long", day: "numeric", month: "long" })}`, `
        ${entries.length ? [["recipe", _("Recettes"), "mdi:chef-hat"], ["ingredient", _("Ingrédients"), "mdi:food-apple-outline"], ["text", _("Notes"), "mdi:text"]].map(([t, lbl, ic]) => {
          const list = entries.map((e, i) => [e, i]).filter(([e]) => e.type === t);
          if (!list.length) return "";
          return `<div class="egrp"><div class="rh"><ha-icon icon="${ic}"></ha-icon>${lbl}<em>${list.length}</em></div><div class="ents">${list.map(([e, i]) => {
            if (t === "recipe") { const r = s.recipes[e.recipe_id] || {}; return `<div class="ent"><div class="ei op" data-open="${e.recipe_id}" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}></div>
                <div class="en"><b class="lnk2" data-open="${e.recipe_id}">${esc(r.name || "?")}</b><small>${r.total ? mins(r.total) + " · " : ""}<span class="stp"><button data-sv="${i}" data-d="-1">−</button>${_("{n} pers.", { n: e.servings })}<button data-sv="${i}" data-d="1">+</button></span></small></div>
                <button class="ib" data-rm="${i}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`; }
            if (t === "ingredient") { const g = s.ingredients[e.ingredient_id] || {}; return `<div class="ent"><div class="ei sm op ${g.image ? "pic" : ""}" data-oping="${e.ingredient_id}" ${g.image ? `style="background-image:url('${esc(g.image)}')"` : ""}>${g.image ? "" : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}</div>
                <div class="en"><b class="lnk2" data-oping="${e.ingredient_id}">${esc(g.name || "?")}</b><small>${esc([g.brand, g.quantity].filter(Boolean).join(" · ") || _("ingrédient"))}</small></div>
                <button class="ib" data-rm="${i}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`; }
            return `<div class="ent"><div class="ei sm"><ha-icon icon="mdi:text"></ha-icon></div><div class="en"><b>${esc(e.text)}</b><small>${_("note")}</small></div><button class="ib" data-rm="${i}"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`;
          }).join("")}</div></div>`;
        }).join("") : `<div class="muted">${_("Rien de prévu pour ce repas.")}</div>`}
        ${entries.length ? `<div class="muted small2">${_("Vous pouvez ajouter plusieurs recettes et plusieurs ingrédients à ce repas.")}</div>` : ""}
        <div class="addbox"><input class="pick" placeholder="${_("Ajouter : recette, ingrédient ou texte libre…")}" autofocus><div class="res"></div></div>
        ${entries.length ? `<div class="row"><span class="muted">${_("Déplacer vers")}</span><select class="mv"><option value="">—</option>${this._weekOptions(day, slot)}</select><label class="muted"><input type="checkbox" class="cp"> ${_("copier")}</label></div>` : ""}`,
        { refresh: () => {
          const root = this.shadowRoot.querySelector(".modal-root"), res = root && root.querySelector(".res"), old = root && root.querySelector(".pick");
          if (res && res.querySelector(".mgrid") && !picked) return; // résultats Marmiton / Jow affichés : on ne les efface pas
          picked = false;
          const v = old ? old.value : "", focus = old && this.shadowRoot.activeElement === old;
          draw();
          const n = this.shadowRoot.querySelector(".modal-root .pick");
          if (n && v) { n.value = v; n.dispatchEvent(new Event("input")); }
          if (n && focus) n.focus();
        } });
      const save = (ents) => this._do(this._ws("plan/set", { day, slot, entries: ents }));
      mb.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { const n = entries.slice(); n.splice(+b.dataset.rm, 1); save(n); }));
      mb.querySelectorAll("[data-sv]").forEach((b) => b.addEventListener("click", () => { const n = entries.map((x) => ({ ...x })); const x = n[+b.dataset.sv]; x.servings = Math.max(1, (x.servings || 1) + +b.dataset.d); save(n); }));
      mb.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => this._recipeModal(b.dataset.open, () => this._slotModal(day, slot))));
      mb.querySelectorAll("[data-oping]").forEach((b) => b.addEventListener("click", () => this._ingModal(b.dataset.oping, false, () => this._slotModal(day, slot))));
      const mv = mb.querySelector(".mv");
      if (mv) mv.addEventListener("change", () => { if (!mv.value) return; const [dd, ss] = mv.value.split("|"); this._do(this._ws("plan/move", { src_day: day, src_slot: slot, dst_day: dd, dst_slot: ss, copy: mb.querySelector(".cp").checked })); this._close(); });
      this._picker(mb.querySelector(".pick"), mb.querySelector(".res"), (entry) => {
        const cur = ((this._s.plan[day] || {})[slot] || []);
        if (cur.some((x) => same(x, entry))) return this._toast(_("Déjà dans ce repas"));
        picked = true;
        return this._do(this._ws("plan/add", { day, slot, entry }));
      });
    };
    draw();
  }
  _weekOptions(day, slot) {
    const w0 = monday(new Date(day + "T00:00")), out = [];
    for (let i = -7; i < 14; i++) { const d = addDays(w0, i), k = iso(d); for (const sl of this._s.slots) if (!(k === day && sl === slot)) out.push(`<option value="${k}|${sl}">${fdate(d, { weekday: "short", day: "numeric", month: "short" })} · ${SLOT_LBL[sl]}</option>`); }
    return out.join("");
  }
  // champ de recherche commun : recettes locales, ingrédients, Marmiton, texte libre
  _picker(input, res, onPick) {
    const s = this._s;
    const draw = () => {
      const q = input.value.trim(), nq = norm(q);
      if (!q) { const favs = Object.values(s.recipes).filter((r) => r.favorite).slice(0, 8);
        res.innerHTML = favs.length ? `<div class="rh">${_("Favoris")}</div>${favs.map((r) => this._resRecipe(r)).join("")}` : ""; bind(); return; }
      const recs = Object.values(s.recipes).filter((r) => norm(r.name).includes(nq)).slice(0, 8);
      const ings = Object.values(s.ingredients).filter((i) => norm(i.name).includes(nq)).slice(0, 5);
      res.innerHTML = `${recs.length ? `<div class="rh">${_("Mes recettes")}</div>${recs.map((r) => this._resRecipe(r)).join("")}` : ""}
        ${ings.length ? `<div class="rh">${_("Ingrédients")}</div>${ings.map((i) => `<div class="ri2" data-ing="${i.id}"><div class="ei sm" ${i.image ? `style="background-image:url('${esc(i.image)}')"` : ""}>${i.image ? "" : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}</div><b>${esc(i.name)}</b></div>`).join("")}` : ""}
        <div class="rh">${_("Autres choix")}</div>
        <div class="ri2" data-web="marmiton"><div class="ei sm mm"><ha-icon icon="mdi:magnify"></ha-icon></div><b>${_("Chercher « {q} » sur {s}", { q: esc(q), s: "Marmiton" })}</b></div>
        <div class="ri2" data-web="jow"><div class="ei sm mm jw"><ha-icon icon="mdi:magnify"></ha-icon></div><b>${_("Chercher « {q} » sur {s}", { q: esc(q), s: "Jow" })}</b></div>
        ${ings.some((i) => norm(i.name) === nq) ? "" : `<div class="ri2" data-newing="1"><div class="ei sm"><ha-icon icon="mdi:food-apple-outline"></ha-icon></div><b>${_("Ajouter « {q} » comme ingrédient", { q: esc(q) })}</b></div>`}
        <div class="ri2" data-text="1"><div class="ei sm"><ha-icon icon="mdi:text"></ha-icon></div><b>${_("Ajouter « {q} » comme note", { q: esc(q) })}</b></div>
        <div class="offbox">${q.length >= 3 ? `<div class="rh">Open Food Facts</div><div class="muted pad">${_("Recherche…")}</div>` : ""}</div>`;
      bind();
      clearTimeout(offT);
      if (q.length >= 3) offT = setTimeout(() => offSearch(q), 450);
    };
    let offT, offSeq = 0;
    const cap = (v) => v.charAt(0).toUpperCase() + v.slice(1);
    const offSearch = async (q) => {
      const seq = ++offSeq;
      let out;
      try { out = await this._ws("ingredient/search", { query: q, off: true }); } catch (e) { out = { off: [], off_error: (e && e.message) || String(e) }; }
      const box = res.querySelector(".offbox");
      if (seq !== offSeq || input.value.trim() !== q || !box) return;
      box.innerHTML = `<div class="rh">Open Food Facts${out.off_error ? ` — ${esc(out.off_error)}` : ""}</div>
        ${out.off.length ? `<div class="offg">${out.off.slice(0, 8).map((p, i) => this._offTile(p, i)).join("")}</div>` : out.off_error ? "" : `<div class="muted pad">${_("Aucun produit.")}</div>`}`;
      box.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", async () => {
        const p = out.off[+b.dataset.off];
        b.classList.add("busy");
        const ing = await this._do(this._ws("ingredient/add", { name: cap(q), off: p }), _("« {n} » ajouté à vos ingrédients", { n: cap(q) }));
        onPick({ type: "ingredient", ingredient_id: ing.id }); input.value = ""; draw();
      }));
    };
    const bind = () => {
      res.querySelectorAll("[data-rec]").forEach((b) => b.addEventListener("click", () => { onPick({ type: "recipe", recipe_id: b.dataset.rec }); input.value = ""; draw(); }));
      res.querySelectorAll("[data-ing]").forEach((b) => b.addEventListener("click", () => { onPick({ type: "ingredient", ingredient_id: b.dataset.ing }); input.value = ""; draw(); }));
      res.querySelector("[data-text]")?.addEventListener("click", () => { onPick({ type: "text", text: input.value.trim() }); input.value = ""; draw(); });
      res.querySelector("[data-newing]")?.addEventListener("click", async () => { const v = cap(input.value.trim()); const ing = await this._do(this._ws("ingredient/add", { name: v })); onPick({ type: "ingredient", ingredient_id: ing.id }); input.value = ""; draw(); });
      res.querySelectorAll("[data-web]").forEach((b) => b.addEventListener("click", () => this._webResults(input.value.trim(), res, (rid) => { onPick({ type: "recipe", recipe_id: rid }); input.value = ""; draw(); }, b.dataset.web)));
    };
    input.addEventListener("focus", () => (this._typing = true));
    input.addEventListener("blur", () => setTimeout(() => (this._typing = false), 300));
    input.addEventListener("input", draw);
    input.addEventListener("keyup", (e) => e.stopPropagation());
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) { const first = res.querySelector("[data-rec],[data-ing]"); if (first) first.click(); else res.querySelector(`[data-web="${this._webSrc()}"]`)?.click(); } });
    draw();
  }
  _offTile(p, i) {
    return `<div class="off" data-off="${i}"><div class="oi" ${p.image ? `style="background-image:url('${esc(p.image)}')"` : ""}></div><div class="otn"><b>${esc(p.name)}</b><small>${esc([p.brand, p.quantity].filter(Boolean).join(" · "))}</small></div>${p.nutriscore ? `<span class="ns" style="background:${NUTRI[p.nutriscore] || "#888"}">${p.nutriscore.toUpperCase()}</span>` : ""}</div>`;
  }
  // choisir une photo (galerie / fichier) ou la prendre avec l'appareil, réduite à 1280 px en JPEG
  async _pickImage(capture = false) {
    // « Prendre une photo » : caméra intégrée à la carte (l'application Home Assistant ignore souvent
    // l'attribut capture et ouvre la galerie) ; repli sur le sélecteur du système si la caméra est refusée.
    if (capture) {
      const shot = await this._cameraShot();
      if (shot !== "fallback") return shot;
    }
    return this._filePick(capture);
  }
  _filePick(capture) {
    return new Promise((resolve) => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      if (capture) inp.setAttribute("capture", "environment");
      inp.style.display = "none";
      inp.addEventListener("change", async () => {
        const f = inp.files && inp.files[0]; inp.remove();
        if (!f) return resolve(null);
        try { resolve(await this._shrink(f)); } catch (e) { this._toast(_("Photo illisible")); resolve(null); }
      });
      document.body.appendChild(inp); inp.click();
      setTimeout(() => inp.remove(), 120000);
    });
  }
  _cameraShot() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve("fallback");
    return new Promise((resolve) => {
      let stream = null, facing = "environment", done = false;
      const ov = document.createElement("div");
      ov.className = "camov";
      ov.innerHTML = `<div class="camwrap"><video playsinline muted autoplay></video><div class="cammsg">${_("Ouverture de l'appareil photo…")}</div>
        <div class="cambar"><button class="ib camx" title="${_("Annuler")}"><ha-icon icon="mdi:close"></ha-icon></button>
          <button class="shutter" title="${_("Prendre la photo")}" disabled></button>
          <button class="ib camflip" title="${_("Changer de caméra")}"><ha-icon icon="mdi:camera-flip-outline"></ha-icon></button></div></div>`;
      this.shadowRoot.appendChild(ov);
      const video = ov.querySelector("video"), msg = ov.querySelector(".cammsg"), shutter = ov.querySelector(".shutter");
      const stop = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; };
      const finish = (v) => { if (done) return; done = true; stop(); ov.remove(); resolve(v); };
      const start = async () => {
        stop(); shutter.disabled = true;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
          if (done) return stop();
          video.srcObject = stream; await video.play();
          msg.textContent = ""; shutter.disabled = false;
        } catch (e) { finish("fallback"); }
      };
      ov.querySelector(".camx").addEventListener("click", () => finish(null));
      ov.querySelector(".camflip").addEventListener("click", () => { facing = facing === "environment" ? "user" : "environment"; start(); });
      shutter.addEventListener("click", () => {
        const w = video.videoWidth, h = video.videoHeight; if (!w || !h) return;
        const k = Math.min(1, 1280 / Math.max(w, h));
        const c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
        finish(c.toDataURL("image/jpeg", 0.85));
      });
      start();
    });
  }
  async _shrink(file, max = 1280) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.85);
    } finally { URL.revokeObjectURL(url); }
  }
  _photoBox(current) {
    return `<div class="photobox"><div class="pv" ${current ? `style="background-image:url('${esc(current)}')"` : ""}>${current ? "" : `<ha-icon icon="mdi:image-outline"></ha-icon>`}</div>
      <div class="pb"><button class="pill" data-ph="pick"><ha-icon icon="mdi:image-plus"></ha-icon>${_("Choisir une photo")}</button>
        <button class="pill" data-ph="cam"><ha-icon icon="mdi:camera"></ha-icon>${_("Prendre une photo")}</button></div></div>`;
  }
  _bindPhoto(root, onImage) {
    root.querySelectorAll("[data-ph]").forEach((b) => b.addEventListener("click", async () => {
      const data = await this._pickImage(b.dataset.ph === "cam");
      if (!data) return;
      const pv = root.querySelector(".photobox .pv"); if (pv) { pv.style.backgroundImage = `url('${data}')`; pv.innerHTML = ""; }
      onImage(data);
    }));
  }
  _resRecipe(r) {
    return `<div class="ri2" data-rec="${r.id}"><div class="ei sm" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}>${r.image ? "" : `<ha-icon icon="mdi:chef-hat"></ha-icon>`}</div><b>${esc(r.name)}</b><small>${mins(r.total)}</small></div>`;
  }
  _webSrc(v) {
    if (v) { this._src = v; try { localStorage.setItem("holm_mymenu_src", v); } catch (e) { /* stockage indisponible */ } }
    if (!this._src) { try { this._src = localStorage.getItem("holm_mymenu_src"); } catch (e) { /* stockage indisponible */ } }
    return this._src === "jow" ? "jow" : "marmiton";
  }
  async _webResults(q, box, onDone, src) {
    src = this._webSrc(src);
    const NAME = { marmiton: "Marmiton", jow: "Jow" }[src];
    const head = (extra = "") => `<div class="rh webh"><span class="seg mini">${["marmiton", "jow"].map((k) => `<button class="${k === src ? "on" : ""}" data-src="${k}">${{ marmiton: "Marmiton", jow: "Jow" }[k]}</button>`).join("")}</span>${extra}</div>`;
    const bindSrc = () => box.querySelectorAll("[data-src]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); if (b.dataset.src !== src) this._webResults(q, box, onDone, b.dataset.src); }));
    box.innerHTML = `${head()}<div class="muted pad">${_("Recherche sur {s}…", { s: NAME })}</div>`; bindSrc();
    const seq = (this._webSeq = (this._webSeq || 0) + 1);
    let res;
    try { res = await this._ws("recipe/web_search", { query: q, source: src }); } catch (e) { if (seq !== this._webSeq) return; box.innerHTML = `${head()}<div class="muted pad">${esc(e.message || e)}</div>`; bindSrc(); return; }
    if (seq !== this._webSeq) return;
    if (!res.length) { box.innerHTML = `${head()}<div class="muted pad">${_("Aucune recette trouvée sur {s}.", { s: NAME })}</div>`; bindSrc(); return; }
    box.innerHTML = `${head(`<span>${_("{n} résultats", { n: res.length })}</span>`)}<div class="mgrid">${res.map((r, i) => `<div class="mc" data-i="${i}"><div class="ri" style="background-image:url('${esc(r.image)}')">${r.recipe_id ? `<i class="have">${_("déjà importée")}</i>` : ""}</div><div class="rn">${esc(r.name)}</div>${r.rating || r.total ? `<div class="rm">${r.rating ? `<span><ha-icon icon="mdi:star"></ha-icon>${fq(r.rating)}${r.reviews ? ` (${r.reviews})` : ""}</span>` : ""}${r.total ? `<span><ha-icon icon="mdi:clock-outline"></ha-icon>${mins(r.total)}</span>` : ""}</div>` : ""}</div>`).join("")}</div>`;
    bindSrc();
    box.querySelectorAll(".mc").forEach((el) => el.addEventListener("click", async () => {
      const r = res[+el.dataset.i];
      if (r.recipe_id) return onDone(r.recipe_id);
      el.classList.add("busy");
      try { const out = await this._ws("recipe/import", { url: r.url }); this._toast(_("« {n} » importée", { n: out.recipe.name })); onDone(out.recipe.id); }
      catch (e) { el.classList.remove("busy"); this._toast(`${_("Import impossible")} : ${e.message || e}`); }
    }));
  }
  async _duplicateRecipe(r) {
    const copy = await this._do(this._ws("recipe/duplicate", { recipe_id: r.id }), _("Copie créée : « {n} (revisitée) »", { n: r.name }));
    if (copy) this._editRecipe(copy);
  }

  // ----- recette -----
  async _recipeModal(id, back, opts = {}) {
    let r;
    try { r = await this._ws("recipe/get", { recipe_id: id }); } catch (e) { return this._toast(_("Recette introuvable")); }
    let sv = opts.servings || r.servings || 4;
    const ro = !!opts.readonly;
    const draw = () => {
      const f = sv / (r.servings || 1);
      const mb = this._modal(esc(r.name), `
        <div class="rhero" ${r.image ? `style="background-image:url('${esc(r.image)}')"` : ""}></div>
        <div class="rmeta">${r.prep ? `<span><ha-icon icon="mdi:knife"></ha-icon>${_("Prépa")} ${mins(r.prep)}</span>` : ""}${r.cook ? `<span><ha-icon icon="mdi:stove"></ha-icon>${_("Cuisson")} ${mins(r.cook)}</span>` : ""}${r.total ? `<span><ha-icon icon="mdi:clock-outline"></ha-icon>${mins(r.total)}</span>` : ""}${r.category ? `<span><ha-icon icon="mdi:tag-outline"></ha-icon>${esc(r.category)}</span>` : ""}${r.rating ? `<span><ha-icon icon="mdi:star"></ha-icon>${fq(r.rating)}</span>` : ""}${!ro && r.mealie_enabled ? `<button class="mealie-x${r.mealie_slug ? " on" : ""}" data-x="mealie" title="${r.mealie_slug ? _("Ouvrir dans Mealie") : _("Envoyer vers Mealie")}" aria-label="${r.mealie_slug ? _("Ouvrir dans Mealie") : _("Envoyer vers Mealie")}"><ha-icon icon="mdi:chef-hat"></ha-icon>${r.mealie_slug ? `<ha-icon class="ok" icon="mdi:check-circle"></ha-icon>` : ""}</button>` : ""}</div>
        ${ro ? (r.source_url ? `<div class="row act"><a class="pill" href="${esc(r.source_url)}" target="_blank" rel="noopener"><ha-icon icon="mdi:open-in-new"></ha-icon>${_("Voir la recette d'origine")}</a></div>` : "") : `<div class="row act"><button class="pill main" data-x="plan"><ha-icon icon="mdi:calendar-plus"></ha-icon>${_("Planifier")}</button>
          <button class="pill" data-x="fav"><ha-icon icon="mdi:heart${r.favorite ? "" : "-outline"}"></ha-icon>${r.favorite ? _("Favori") : _("Ajouter aux favoris")}</button>
          <button class="pill" data-x="edit"><ha-icon icon="mdi:pencil"></ha-icon>${_("Modifier")}</button>
          <button class="pill" data-x="dup" title="${_("Créer une copie à modifier, l'original reste intact")}"><ha-icon icon="mdi:content-copy"></ha-icon>${_("Dupliquer")}</button>
          ${r.source_url ? `<a class="pill" href="${esc(r.source_url)}" target="_blank" rel="noopener"><ha-icon icon="mdi:open-in-new"></ha-icon>${_("Source")}</a>` : ""}
          <button class="pill danger" data-x="del"><ha-icon icon="mdi:delete-outline"></ha-icon></button></div>`}
        ${r.copied_from && this._s.recipes[r.copied_from] ? `<div class="insp"><ha-icon icon="mdi:source-branch"></ha-icon>${_("Inspirée de")} <button class="lnk" data-x="orig">${esc(this._s.recipes[r.copied_from].name)}</button></div>` : ""}
        <div class="cols"><div><div class="sh">${_("Ingrédients")} <span class="stp"><button data-s="-1">−</button>${_("{n} pers.", { n: sv })}<button data-s="1">+</button></span></div>
            <ul class="ingl">${(r.ingredients || []).map((l) => `<li ${l.ingredient_id && this._s.ingredients[l.ingredient_id] ? `class="lk" data-ing="${l.ingredient_id}"` : ""}><b>${l.qty != null ? fq(l.qty * f) + (l.unit ? " " + esc(l.unit) : "") : esc(l.unit || "")}</b> ${esc(l.name)}${l.note ? ` <small>(${esc(l.note)})</small>` : ""}</li>`).join("")}</ul></div>
          <div><div class="sh">${_("Préparation")}</div><ol class="steps">${(r.steps || []).map((s) => `<li>${esc(s)}</li>`).join("") || `<li class="muted">${_("Aucune étape.")}</li>`}</ol></div></div>`,
        { wide: true, back });
      mb.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { sv = Math.max(1, sv + +b.dataset.s); draw(); }));
      mb.querySelectorAll("li[data-ing]").forEach((li) => li.addEventListener("click", () => this._ingModal(li.dataset.ing, ro, () => this._recipeModal(id, back, { ...opts, servings: sv }))));
      mb.querySelector('[data-x="orig"]')?.addEventListener("click", () => this._recipeModal(r.copied_from, () => this._recipeModal(id, back, opts), opts));
      if (ro) return;
      mb.querySelector('[data-x="dup"]').addEventListener("click", () => this._duplicateRecipe(r));
      mb.querySelector('[data-x="fav"]').addEventListener("click", async () => { r = await this._ws("recipe/save", { recipe_id: r.id, recipe: { favorite: !r.favorite } }); draw(); });
      mb.querySelector('[data-x="edit"]').addEventListener("click", () => this._editRecipe(r));
      mb.querySelector('[data-x="del"]').addEventListener("click", async () => { if (!confirm(_("Supprimer « {n} » ?", { n: r.name }))) return; await this._ws("recipe/delete", { recipe_id: r.id }); this._close(); });
      mb.querySelector('[data-x="plan"]').addEventListener("click", () => this._planRecipe(r, sv, () => draw()));
      mb.querySelector('[data-x="mealie"]')?.addEventListener("click", async (e) => {
        const b = e.currentTarget;
        if (r.mealie_link) return window.open(r.mealie_link, "_blank", "noopener");
        b.disabled = true; b.classList.add("busy");
        try {
          const out = await this._ws("mealie/export", { recipe_id: r.id });
          r = { ...r, mealie_slug: out.slug, mealie_link: out.link };
          this._toast(out.created ? _("« {n} » envoyée vers Mealie", { n: r.name }) : _("« {n} » est déjà dans Mealie", { n: r.name }));
          if (!out.created) window.open(out.link, "_blank", "noopener");
          draw();
        } catch (err) { this._toast(`Export Mealie : ${err.message || err}`); b.disabled = false; b.classList.remove("busy"); }
      });
    };
    draw();
  }
  _planRecipe(r, sv, back) {
    const w0 = monday(new Date()), today = iso(new Date());
    const days = [...Array(14)].map((_, i) => addDays(w0, i)).filter((d) => iso(d) >= today);
    const mb = this._modal(_("Planifier « {n} »", { n: esc(r.name) }), `<div class="muted">${_("{n} personnes · choisissez un repas", { n: sv })}</div>
      <div class="plgrid">${days.map((d) => { const k = iso(d); return `<div class="pld"><b>${fdate(d, { weekday: "short", day: "numeric", month: "short" })}</b>${this._s.slots.map((sl) => { const n = ((this._s.plan[k] || {})[sl] || []).length; return `<button class="pill ${n ? "busy" : ""}" data-k="${k}" data-sl="${sl}">${SLOT_LBL[sl]}${n ? " •" : ""}</button>`; }).join("")}</div>`; }).join("")}</div>`, { back });
    mb.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", async () => {
      await this._do(this._ws("plan/add", { day: b.dataset.k, slot: b.dataset.sl, entry: { type: "recipe", recipe_id: r.id, servings: sv } }), _("Ajoutée au {s} du {d}", { s: SLOT_LBL[b.dataset.sl].toLowerCase(), d: fdate(new Date(b.dataset.k + "T00:00"), { weekday: "long", day: "numeric" }) }));
      back();
    }));
  }
  _editRecipe(r) {
    const isNew = !r || !r.id;
    r = r || { name: "", servings: this._s.servings, ingredients: [], steps: [] };
    const lines = Array.isArray(r.lines) ? r.lines.join("\n") : (r.ingredients || []).map((l) => [l.qty != null ? fq(l.qty) : "", l.unit, l.name, l.note ? `(${l.note})` : ""].filter(Boolean).join(" ")).join("\n");
    const mb = this._modal(isNew ? _("Nouvelle recette") : _("Modifier « {n} »", { n: esc(r.name) }), `
      <label class="fl">${_("Nom")}<input class="f" data-f="name" value="${esc(r.name)}"></label>
      <div class="row"><label class="fl">${_("Personnes")}<input class="f" type="number" min="1" data-f="servings" value="${r.servings || 4}"></label>
        <label class="fl">${_("Préparation (min)")}<input class="f" type="number" min="0" data-f="prep" value="${r.prep || ""}"></label>
        <label class="fl">${_("Cuisson (min)")}<input class="f" type="number" min="0" data-f="cook" value="${r.cook || ""}"></label></div>
      <label class="fl">${_("Catégorie")}<input class="f" data-f="category" value="${esc(r.category || "")}" placeholder="${_("Plat principal, dessert…")}"></label>
      <div class="fl">${_("Photo")}${this._photoBox(r.image)}</div>
      <details class="adv"><summary>${_("Ou une adresse d'image sur Internet")}</summary><input class="f" data-f="image" value="${esc(r.image_remote || (String(r.image || "").startsWith("http") ? r.image : ""))}" placeholder="https://…"></details>
      <label class="fl">${_("Ingrédients — un par ligne (ex. « 200 g de farine »)")}<textarea class="f" rows="8" data-f="lines">${esc(lines)}</textarea></label>
      <label class="fl">${_("Étapes — une par ligne")}<textarea class="f" rows="8" data-f="steps">${esc((r.steps || []).join("\n"))}</textarea></label>
      <div class="row end"><button class="pill" data-x="cancel">${_("Annuler")}</button><button class="pill main" data-x="save"><ha-icon icon="mdi:content-save"></ha-icon>${_("Enregistrer")}</button></div>`,
      { wide: true, dismissOnBackdrop: false, back: isNew ? () => this._addRecipeModal() : () => this._recipeModal(r.id) });
    this._editingRecipe = true;
    // Isoler les gestes de sélection des raccourcis et clics du tableau de bord.
    const dialog = mb.closest(".mdl");
    ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "contextmenu"].forEach((eventName) => {
      dialog.addEventListener(eventName, (e) => e.stopPropagation());
    });
    const unclassified = Array.isArray(r.unclassified) ? r.unclassified : [];
    if (unclassified.length) {
      const area = document.createElement("details");
      area.className = "adv";
      const summary = document.createElement("summary");
      summary.textContent = _("Texte non classé ({n} lignes) — à vérifier", { n: unclassified.length });
      const raw = document.createElement("textarea");
      raw.className = "f";
      raw.rows = 5;
      raw.readOnly = true;
      raw.value = unclassified.join("\n");
      area.append(summary, raw);
      mb.querySelector('[data-x="cancel"]').parentNode.before(area);
    }
    let photo = r.import_image || null;
    if (photo) {
      const pv = mb.querySelector(".photobox .pv");
      if (pv) { pv.style.backgroundImage = `url('${photo}')`; pv.innerHTML = ""; }
    }
    this._bindPhoto(mb, (d) => { photo = d; });
    mb.querySelectorAll("input,textarea").forEach((x) => { x.addEventListener("keydown", (e) => e.stopPropagation()); x.addEventListener("keyup", (e) => e.stopPropagation()); });
    mb.querySelector('[data-x="cancel"]').addEventListener("click", () => (isNew ? this._close() : this._recipeModal(r.id)));
    mb.querySelector('[data-x="save"]').addEventListener("click", async () => {
      const v = (k) => mb.querySelector(`[data-f="${k}"]`).value.trim();
      if (!v("name")) return this._toast(_("Donnez un nom à la recette"));
      const rec = { name: v("name"), servings: +v("servings") || 4, prep: +v("prep") || null, cook: +v("cook") || null, category: v("category"),
        lines: v("lines").split("\n").map((x) => x.trim()).filter(Boolean), steps: v("steps").split("\n").map((x) => x.trim()).filter(Boolean) };
      rec.total = (rec.prep || 0) + (rec.cook || 0) || null;
      const img = v("image"); if (!photo && img && img !== (r.image_remote || r.image || "")) rec.image = img;
      if (isNew) { rec.source = r.source || "manual"; if (r.source_url) rec.source_url = r.source_url; }
      const out = await this._do(this._ws("recipe/save", { recipe_id: isNew ? null : r.id, recipe: rec }), photo ? null : _("Recette enregistrée"));
      if (photo) await this._do(this._ws("image/upload", { kind: "recipe", item_id: out.id, data: photo }), _("Recette et photo enregistrées"));
      this._recipeModal(out.id);
    });
  }
  _addRecipeModal(mode = "marmiton") {
    const mb = this._modal(_("Ajouter une recette"), `
      <div class="seg">${[["marmiton", "mdi:magnify", _("Recherche")], ["url", "mdi:link-variant", _("Lien")], ["document", "mdi:file-pdf-box", "PDF"], ["mealie", "mdi:chef-hat", "Mealie"], ["manual", "mdi:pencil", _("À la main")]].map(([k, i, l]) => `<button class="${mode === k ? "on" : ""}" data-m="${k}"><ha-icon icon="${i}"></ha-icon>${l}</button>`).join("")}</div>
      <div class="pane"></div>`, { wide: true });
    mb.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => this._addRecipeModal(b.dataset.m)));
    const pane = mb.querySelector(".pane");
    if (mode === "marmiton") {
      pane.innerHTML = `<div class="row"><span class="seg srcsel">${[["marmiton", "Marmiton"], ["jow", "Jow"]].map(([k, l]) => `<button class="${this._webSrc() === k ? "on" : ""}" data-src0="${k}">${l}</button>`).join("")}</span><input class="f grow" placeholder="${_("Ex. lasagnes, gratin dauphinois, tarte aux pommes…")}"><button class="pill main">${_("Chercher")}</button></div><div class="res"></div>`;
      const inp = pane.querySelector("input"), go = () => inp.value.trim() && this._webResults(inp.value.trim(), pane.querySelector(".res"), (rid) => this._recipeModal(rid));
      pane.querySelectorAll("[data-src0]").forEach((b) => b.addEventListener("click", () => { this._webSrc(b.dataset.src0); pane.querySelectorAll("[data-src0]").forEach((x) => x.classList.toggle("on", x === b)); go(); }));
      pane.querySelector(".pill.main").addEventListener("click", go); inp.addEventListener("keydown", (e) => e.key === "Enter" && go()); setTimeout(() => inp.focus(), 50);
    } else if (mode === "url") {
      pane.innerHTML = `<div class="muted">${_("Collez l'adresse d'une recette : Marmiton, 750g, CuisineAZ, Journal des Femmes… (tout site qui décrit ses recettes au format standard).")}</div>
        <div class="row"><input class="f grow" placeholder="https://www.marmiton.org/recettes/…"><button class="pill main">${_("Importer")}</button></div>`;
      const inp = pane.querySelector("input");
      const go = async () => { const u = inp.value.trim(); if (!/^https?:\/\//.test(u)) return this._toast(_("Adresse invalide"));
        const b = pane.querySelector("button"); b.disabled = true; b.textContent = _("Import…");
        try { const out = await this._ws("recipe/import", { url: u }); this._toast(out.existing ? _("Cette recette est déjà dans votre base") : _("« {n} » importée", { n: out.recipe.name })); this._recipeModal(out.recipe.id); }
        catch (e) { this._toast(`${_("Import impossible")} : ${e.message || e}`); b.disabled = false; b.textContent = _("Importer"); } };
      pane.querySelector("button").addEventListener("click", go); inp.addEventListener("keydown", (e) => e.key === "Enter" && go()); setTimeout(() => inp.focus(), 50);
    } else if (mode === "document") {
      pane.innerHTML = `<div class="muted">${_("Choisissez un fichier PDF (8 Mo maximum). L'extraction peut ne pas fonctionner avec les PDF scannés ou constitués uniquement d'images. Le fichier n'est pas conservé.")}</div>
        <label class="fl">${_("Fichier depuis cet appareil")}<input class="f" type="file" accept=".pdf,application/pdf"></label>
        <div class="row"><button class="pill main" data-kind="file">${_("Analyser le fichier")}</button></div>
        <div class="muted" data-status role="status"></div>`;
      const button = pane.querySelector('[data-kind="file"]');
      const status = pane.querySelector('[data-status]');
      const fileInput = pane.querySelector('input[type="file"]');
      fileInput.addEventListener("change", () => { status.textContent = ""; });
      button.addEventListener("click", async () => {
        const f = fileInput.files?.[0];
        if (!f) return this._toast(_("Sélectionnez un PDF"));
        if (!/\.pdf$/i.test(f.name) || (f.type && f.type !== "application/pdf")) return this._toast(_("Seuls les fichiers PDF sont acceptés"));
        if (f.size > 8 * 1024 * 1024) return this._toast(_("Fichier supérieur à 8 Mo"));
        if (!f.size) return this._toast(_("Le fichier est vide"));
        button.disabled = true;
        const original = button.innerHTML;
        let uploadId = null;
        try {
          // Les messages WebSocket HA sont limités en taille : transférer le
          // fichier en fragments plutôt que d'envoyer tout le PDF en base64.
          const begin = await this._ws("recipe/document_upload_start", { filename: f.name, size: f.size });
          uploadId = begin.upload_id;
          const chunkSize = 128 * 1024;
          const count = Math.ceil(f.size / chunkSize);
          for (let index = 0; index < count; index++) {
            const blob = f.slice(index * chunkSize, Math.min(f.size, (index + 1) * chunkSize));
            const data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result).split(",")[1]);
              reader.onerror = () => reject(new Error(_("Lecture du fichier impossible")));
              reader.readAsDataURL(blob);
            });
            await this._ws("recipe/document_upload_chunk", { upload_id: uploadId, index, data });
            status.textContent = `${_("Transfert")} : ${Math.round((index + 1) * 100 / count)} %`;
          }
          status.textContent = _("Analyse du document en cours…");
          const rec = await this._ws("recipe/document_upload_finish", { upload_id: uploadId });
          uploadId = null;
          if (rec.warnings?.length) this._toast(rec.warnings.join(" "));
          // Le parseur retourne des lignes brutes ; l'éditeur les affiche pour validation.
          this._editRecipe(rec);
        } catch (e) {
          const message = `${_("Analyse impossible")} : ${e.message || e}`;
          status.textContent = message;
          this._toast(message);
        } finally {
          if (uploadId) this._ws("recipe/document_upload_cancel", { upload_id: uploadId }).catch(() => {});
          button.disabled = false;
          button.innerHTML = original;
        }
      });
    } else if (mode === "mealie") {
      pane.innerHTML = `<div class="muted pad">${_("Lecture de vos recettes Mealie…")}</div>`;
      this._ws("mealie/list").then((list) => {
        const sel = new Set(list.filter((x) => !x.imported).map((x) => x.slug));
        const drawM = () => {
          pane.innerHTML = `<div class="row"><span class="muted">${_("{n} recettes · {i} déjà importées", { n: list.length, i: list.filter((x) => x.imported).length })}</span><span class="grow"></span>
              <button class="lnk" data-all="1">${_("Tout cocher")}</button><button class="lnk" data-all="0">${_("Tout décocher")}</button></div>
            <div class="mlist">${list.map((x) => `<label class="ml ${x.imported ? "done" : ""}"><input type="checkbox" data-slug="${esc(x.slug)}" ${x.imported ? "disabled checked" : sel.has(x.slug) ? "checked" : ""}><b>${esc(x.name)}</b>${x.imported ? `<small>${_("importée")}</small>` : ""}</label>`).join("")}</div>
            <div class="row end"><button class="pill main" data-go="1"><ha-icon icon="mdi:download"></ha-icon>${_(sel.size > 1 ? _("Importer {n} recettes") : _("Importer {n} recette"), { n: sel.size })}</button></div>`;
          pane.querySelectorAll("[data-slug]").forEach((c) => c.addEventListener("change", () => { c.checked ? sel.add(c.dataset.slug) : sel.delete(c.dataset.slug); pane.querySelector("[data-go]").innerHTML = `<ha-icon icon="mdi:download"></ha-icon>${_(sel.size > 1 ? _("Importer {n} recettes") : _("Importer {n} recette"), { n: sel.size })}`; }));
          pane.querySelectorAll("[data-all]").forEach((b) => b.addEventListener("click", () => { list.filter((x) => !x.imported).forEach((x) => (b.dataset.all === "1" ? sel.add(x.slug) : sel.delete(x.slug))); drawM(); }));
          pane.querySelector("[data-go]").addEventListener("click", async (e) => {
            if (!sel.size) return; const b = e.currentTarget; b.disabled = true; b.textContent = _("Import de {n} recettes…", { n: sel.size });
            try { const out = await this._ws("mealie/import", { slugs: [...sel] }); this._toast(_("{n} recette(s) importée(s) depuis Mealie", { n: out.imported }) + (out.errors.length ? " · " + _("{n} erreur(s)", { n: out.errors.length }) : "")); this._close(); this._tab = "recipes"; this._render(); }
            catch (err) { this._toast(`Import Mealie : ${err.message || err}`); b.disabled = false; }
          });
        };
        drawM();
      }).catch((e) => { pane.innerHTML = `<div class="muted pad">${esc(e.message || e)}</div>`; });
    } else {
      this._editRecipe(null);
    }
  }

  // ----- ingrédients -----
  _addIngModal(q = "") {
    const cap = (v) => v.charAt(0).toUpperCase() + v.slice(1);
    const mb = this._modal(_("Ajouter un ingrédient"), `<div class="row"><input class="f grow" placeholder="${_("Ex. purée, Nutella… ou un code-barre")}" value="${esc(q)}"><button class="pill main">${_("Chercher")}</button>
      <button class="pill" data-x="scan" title="${_("Scanner un code-barre")}"><ha-icon icon="mdi:barcode-scan"></ha-icon>${_("Scanner")}</button></div><div class="res"></div>`, { wide: true });
    const inp = mb.querySelector("input"), res = mb.querySelector(".res");
    inp.addEventListener("keyup", (e) => e.stopPropagation());
    mb.querySelector('[data-x="scan"]').addEventListener("click", async () => { const code = await this._scanBarcode(); if (code) this._barcodeResult(code); else if (code === "") this._addIngModal(inp.value.trim()); });
    const go = async () => {
      const v = inp.value.trim(); if (!v) return;
      if (/^\d{8,14}$/.test(v.replace(/\s/g, ""))) return this._barcodeResult(v.replace(/\s/g, ""));
      res.innerHTML = `<div class="muted pad">${_("Recherche dans votre base et sur Open Food Facts…")}</div>`;
      let out;
      try { out = await this._ws("ingredient/search", { query: v, off: true }); } catch (e) { res.innerHTML = `<div class="muted pad">${esc(e.message || e)}</div>`; return; }
      res.innerHTML = `${out.local.length ? `<div class="rh">${_("Déjà dans votre base")}</div>${out.local.map((i) => `<div class="ri2" data-open="${i.id}"><div class="ei sm" ${i.image ? `style="background-image:url('${esc(i.image)}')"` : ""}></div><b>${esc(i.name)}</b><small>${esc(i.brand || "")}</small></div>`).join("")}` : ""}
        <label class="fl">${_("Nom dans votre base")}<input class="f nm" value="${esc(cap(v))}"></label>
        <div class="ri2" data-plain="1"><div class="ei sm"><ha-icon icon="mdi:plus"></ha-icon></div><b>${_("Ajouter sans produit")}</b><small>${_("vous pourrez associer un produit plus tard")}</small></div>
        <div class="rh">${_("Ou choisir un produit Open Food Facts")}${out.off_error ? ` — ${esc(out.off_error)}` : " · " + _(out.off.length > 1 ? _("{n} résultats") : _("{n} résultat"), { n: out.off.length })}</div>
        <div class="offg">${out.off.map((p, i) => this._offTile(p, i)).join("")}</div>`;
      const nm = () => res.querySelector(".nm").value.trim() || cap(v);
      res.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => this._ingModal(b.dataset.open)));
      res.querySelector("[data-plain]").addEventListener("click", async () => { const ing = await this._do(this._ws("ingredient/add", { name: nm() }), _("« {n} » ajouté", { n: nm() })); this._ingModal(ing.id); });
      res.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", async () => {
        b.classList.add("busy");
        const ing = await this._do(this._ws("ingredient/add", { name: nm(), off: out.off[+b.dataset.off] }), _("« {n} » ajouté avec sa fiche produit", { n: nm() }));
        this._ingModal(ing.id);
      }));
    };
    mb.querySelector("button.main").addEventListener("click", go); inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") go(); });
    setTimeout(() => inp.focus(), 50);
    if (q) go();
  }
  // ----- code-barre -----
  async _barcodeResult(code) {
    const mb = this._modal(`${_("Code-barre")} ${esc(code)}`, `<div class="muted pad">${_("Recherche du produit sur Open Food Facts…")}</div>`, { wide: true, back: () => this._addIngModal() });
    let out;
    try { out = await this._ws("ingredient/barcode", { code }); } catch (e) {
      mb.innerHTML = `<div class="muted pad">${esc(e.message || e)}</div><div class="row end"><button class="pill" data-x="again"><ha-icon icon="mdi:barcode-scan"></ha-icon>${_("Scanner à nouveau")}</button></div>`;
      mb.querySelector('[data-x="again"]').addEventListener("click", async () => { const c = await this._scanBarcode(); if (c) this._barcodeResult(c); });
      return;
    }
    if (out.existing) { this._toast(_("« {n} » est déjà dans vos ingrédients", { n: out.existing.name })); return this._ingModal(out.existing.id); }
    const p = out.product;
    mb.innerHTML = `<div class="ihead"><div class="oi big" ${p.image ? `style="background-image:url('${esc(p.image_full || p.image)}')"` : ""}></div>
        <div class="ihd"><b style="font-size:16px">${esc(p.name)}</b><div class="ibr">${esc([p.brand, p.quantity].filter(Boolean).join(" · "))}</div>
        ${p.nutriscore ? `<span class="ns lg" style="background:${NUTRI[p.nutriscore]}">Nutri-Score ${p.nutriscore.toUpperCase()}</span>` : ""}</div></div>
      <label class="fl">${_("Nom dans votre base")}<input class="f nm" value="${esc(p.name)}"></label>
      <div class="row end"><button class="pill main" data-x="add"><ha-icon icon="mdi:plus"></ha-icon>${_("Ajouter à mes ingrédients")}</button></div>`;
    const nm = mb.querySelector(".nm"); nm.addEventListener("keydown", (e) => e.stopPropagation()); nm.addEventListener("keyup", (e) => e.stopPropagation());
    mb.querySelector('[data-x="add"]').addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      const name = nm.value.trim() || p.name;
      const ing = await this._do(this._ws("ingredient/add", { name, off: p }), _("« {n} » ajouté avec sa fiche produit", { n: name }));
      this._ingModal(ing.id);
    });
  }
  // lecture d'un code-barre : caméra (BarcodeDetector, sinon ZXing), photo du code, ou saisie
  _scanBarcode() {
    return new Promise((resolve) => {
      let done = false, stream = null, timer = null, zx = null;
      const stop = () => { clearInterval(timer); if (stream) stream.getTracks().forEach((t) => t.stop()); try { zx && zx.stop(); } catch (_) {} };
      const finish = (code) => { if (done) return; done = true; stop(); resolve(code === "" ? "" : code || null); };
      const mb = this._modal(_("Scanner un code-barre"), `
        <div class="scan"><video playsinline muted></video><div class="aim"></div><div class="scanmsg">${_("Ouverture de la caméra…")}</div></div>
        <div class="row"><input class="f grow code" inputmode="numeric" placeholder="${_("ou tapez le numéro sous le code-barre")}"><button class="pill main" data-x="ok">${_("Valider")}</button></div>
        <div class="row"><button class="pill" data-x="photo"><ha-icon icon="mdi:camera"></ha-icon>${_("Photographier le code")}</button></div>`, { back: () => { finish(""); } });
      const root = this.shadowRoot.querySelector(".modal-root");
      const obs = new MutationObserver(() => { if (!this.shadowRoot.contains(root) || !root.contains(mb)) { obs.disconnect(); finish(null); } });
      obs.observe(this.shadowRoot, { childList: true, subtree: true });
      const video = mb.querySelector("video"), msg = mb.querySelector(".scanmsg"), codeIn = mb.querySelector(".code");
      codeIn.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter" && codeIn.value.trim()) finish(codeIn.value.replace(/\D/g, "")); });
      codeIn.addEventListener("keyup", (e) => e.stopPropagation());
      mb.querySelector('[data-x="ok"]').addEventListener("click", () => codeIn.value.trim() && finish(codeIn.value.replace(/\D/g, "")));
      const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];
      const zxing = async () => (await import("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm"));
      mb.querySelector('[data-x="photo"]').addEventListener("click", async () => {
        const data = await this._pickImage(true); if (!data) return;
        msg.textContent = _("Lecture de la photo…");
        try {
          let code = null;
          if ("BarcodeDetector" in window) {
            const img = new Image(); img.src = data; await img.decode();
            const r = await new window.BarcodeDetector({ formats: FORMATS }).detect(img); code = r[0] && r[0].rawValue;
          } else {
            const Z = await zxing(); const r = await new Z.BrowserMultiFormatReader().decodeFromImageUrl(data); code = r && r.getText();
          }
          if (code) finish(code); else msg.textContent = _("Aucun code-barre lu sur la photo. Réessayez de plus près.");
        } catch (e) { msg.textContent = _("Aucun code-barre lu sur la photo. Réessayez de plus près."); }
      });
      (async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = _("Caméra indisponible ici : photographiez le code ou tapez son numéro."); return; }
        try {
          if ("BarcodeDetector" in window) {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
            if (done) return stop();
            video.srcObject = stream; await video.play(); msg.textContent = _("Visez le code-barre");
            const det = new window.BarcodeDetector({ formats: FORMATS });
            timer = setInterval(async () => { try { const r = await det.detect(video); if (r[0]) finish(r[0].rawValue); } catch (_) {} }, 250);
          } else {
            msg.textContent = _("Chargement du lecteur…");
            const Z = await zxing(); if (done) return;
            zx = await new Z.BrowserMultiFormatReader().decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, video, (r) => { if (r) finish(r.getText()); });
            msg.textContent = _("Visez le code-barre");
          }
        } catch (e) { msg.textContent = _("Caméra refusée ou indisponible : photographiez le code ou tapez son numéro."); }
      })();
    });
  }
  _ingModal(id, ro = false, back = null) {
    const s = this._s, i = s.ingredients[id];
    if (!i) return this._close();
    const recs = Object.values(s.recipes).filter((r) => (r.ingredients || []).some((l) => l.ingredient_id === id));
    const n = i.nutrition || {};
    const NL = [["energy_kcal", _("Énergie"), "kcal"], ["fat", _("Matières grasses"), "g"], ["saturated_fat", _("dont saturées"), "g"], ["carbohydrates", _("Glucides"), "g"], ["sugars", _("dont sucres"), "g"], ["fiber", _("Fibres"), "g"], ["proteins", _("Protéines"), "g"], ["salt", _("Sel"), "g"]];
    const rows = NL.filter(([k]) => n[k] != null).map(([k, l, u]) => `<tr class="${k === "saturated_fat" || k === "sugars" ? "sub" : ""}"><td>${l}</td><td>${fq(k === "energy_kcal" ? Math.round(n[k]) : n[k])} ${u}</td></tr>`).join("");
    const ECO = { a: "#1e8f4e", b: "#60ac0e", c: "#e3a21a", d: "#e7642b", e: "#c62828" };
    const badges = [i.nutriscore ? `<span class="ns lg" style="background:${NUTRI[i.nutriscore]}">Nutri-Score ${i.nutriscore.toUpperCase()}</span>` : "",
      i.ecoscore ? `<span class="ns lg" style="background:${ECO[i.ecoscore]}">Éco-Score ${i.ecoscore.toUpperCase()}</span>` : "",
      i.nova ? `<span class="ns lg" style="background:${["", "#00aa00", "#ffcc00", "#ff6600", "#ff0000"][i.nova] || "#888"}">NOVA ${i.nova}</span>` : ""].join("");
    const mb = this._modal(esc(i.name), `
      <div class="ihead"><div class="oi big" ${i.image ? `style="background-image:url('${esc(i.image)}')"` : ""}>${i.image ? "" : `<ha-icon icon="mdi:food-apple-outline"></ha-icon>`}</div>
        <div class="ihd"><div class="ibr">${i.brand ? esc(i.brand) : `<span class="muted">${_("Sans marque")}</span>`}${i.quantity ? ` · ${esc(i.quantity)}` : ""}</div>
          ${badges ? `<div class="badges">${badges}</div>` : ""}
          ${i.off_code ? `<a class="lnk" href="https://fr.openfoodfacts.org/produit/${esc(i.off_code)}" target="_blank" rel="noopener">${_("Fiche Open Food Facts")} · ${esc(i.off_code)}</a>` : ""}</div></div>
      ${rows || i.ingredients_text || (i.allergens || []).length ? `<div class="offinfo">
        ${rows ? `<div><div class="sh">${_("Pour 100 g")}</div><table class="nut">${rows}</table></div>` : ""}
        <div>${i.ingredients_text ? `<div class="sh">${_("Composition")}</div><div class="small">${esc(i.ingredients_text)}</div>` : ""}
          ${(i.allergens || []).length ? `<div class="sh">${_("Allergènes")}</div><div class="chips">${i.allergens.map((a) => `<span class="chip warn">${esc(a)}</span>`).join("")}</div>` : ""}
          ${(i.labels || []).length ? `<div class="sh">${_("Labels")}</div><div class="chips">${i.labels.map((a) => `<span class="chip">${esc(a)}</span>`).join("")}</div>` : ""}</div></div>` : ""}
      ${ro ? (i.notes ? `<div class="sh">${_("Notes")}</div><div class="small">${esc(i.notes)}</div>` : "") + (recs.length ? `<div class="sh">${_("Dans les recettes")}</div><div class="chips">${recs.map((r) => `<button class="chip" data-r="${r.id}">${esc(r.name)}</button>`).join("")}</div>` : "") : `
      <div class="sh">${_("Fiche")}</div>
      <div class="row"><label class="fl">${_("Nom")}<input class="f" data-f="name" value="${esc(i.name)}"></label>
        <label class="fl">${_("Rayon")}<select class="f" data-f="aisle">${s.aisles.map(([k, l]) => `<option value="${k}" ${k === (i.aisle || "autre") ? "selected" : ""}>${esc(_(l))}</option>`).join("")}</select></label></div>
      <div class="row"><button class="pill" data-x="newrayon"><ha-icon icon="mdi:shape-plus"></ha-icon>${_("Créer un rayon")}</button></div>
      <div class="row"><label class="fl">${_("Marque")}<input class="f" data-f="brand" value="${esc(i.brand || "")}"></label>
        <label class="fl">${_("Conditionnement")}<input class="f" data-f="quantity" value="${esc(i.quantity || "")}" placeholder="${_("500 g, 1 l…")}"></label>
        <label class="fl">${_("Magasins")}<input class="f" data-f="stores" value="${esc(i.stores || "")}"></label></div>
      <div class="fl">${_("Photo")}${this._photoBox(i.image)}</div>
      <label class="fl">${_("Notes")}<input class="f" data-f="notes" value="${esc(i.notes || "")}" placeholder="${_("Ex. prendre la version bio")}"></label>
      <div class="row end"><button class="pill" data-x="off"><ha-icon icon="mdi:barcode-scan"></ha-icon>${i.off_code ? _("Changer de produit") : _("Associer un produit Open Food Facts")}</button><button class="pill main" data-x="save">${_("Enregistrer")}</button></div>
      <div class="sh">${_(recs.length > 1 ? _("Utilisé dans {n} recettes") : _("Utilisé dans {n} recette"), { n: recs.length })}</div>
      <div class="chips">${recs.map((r) => `<button class="chip" data-r="${r.id}">${esc(r.name)}</button>`).join("") || `<span class="muted">${_("Aucune.")}</span>`}</div>
      <div class="row end"><button class="pill danger" data-x="del"><ha-icon icon="mdi:delete-outline"></ha-icon>${_("Supprimer l'ingrédient")}</button></div>`}`, { wide: true, back });
    mb.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => this._recipeModal(b.dataset.r, () => this._ingModal(id, ro, back), { readonly: ro })));
    if (ro) return;
    mb.querySelectorAll("input").forEach((x) => { x.addEventListener("keydown", (e) => e.stopPropagation()); x.addEventListener("keyup", (e) => e.stopPropagation()); });
    this._bindPhoto(mb, (d) => this._do(this._ws("image/upload", { kind: "ingredient", item_id: id, data: d }), _("Photo enregistrée")));
    mb.querySelector('[data-x="newrayon"]')?.addEventListener("click", () => this._categoryModal(() => this._ingModal(id, ro, back)));
    mb.querySelector('[data-x="save"]').addEventListener("click", async () => {
      const ch = {};
      mb.querySelectorAll("[data-f]").forEach((f) => { ch[f.dataset.f] = f.value.trim(); });
      ch.name = ch.name || i.name;
      if (ch.aisle === (i.aisle || "autre")) delete ch.aisle;
      await this._do(this._ws("ingredient/update", { ingredient_id: id, changes: ch }), _("Ingrédient enregistré"));
      back ? back() : this._close();
    });
    mb.querySelector('[data-x="del"]').addEventListener("click", async () => { if (!confirm(_("Supprimer « {n} » ? Les recettes garderont le texte de l'ingrédient.", { n: i.name }))) return; await this._ws("ingredient/delete", { ingredient_id: id }); this._close(); });
    mb.querySelector('[data-x="off"]').addEventListener("click", () => this._offLink(i));
  }
  _offLink(i) {
    const mb = this._modal(_("Produit pour « {n} »", { n: esc(i.name) }), `<div class="row"><input class="f grow" value="${esc(i.name)}"><button class="pill main">${_("Chercher")}</button></div><div class="res"></div>`, { wide: true, back: () => this._ingModal(i.id) });
    const inp = mb.querySelector("input"), res = mb.querySelector(".res");
    inp.addEventListener("keyup", (e) => e.stopPropagation());
    const go = async () => {
      const v = inp.value.trim(); if (!v) return;
      res.innerHTML = `<div class="muted pad">${_("Recherche sur Open Food Facts…")}</div>`;
      let out;
      try { out = await this._ws("ingredient/search", { query: v, off: true }); } catch (e) { res.innerHTML = `<div class="muted pad">${esc(e.message || e)}</div>`; return; }
      res.innerHTML = out.off.length ? `<div class="offg">${out.off.map((p, k) => this._offTile(p, k)).join("")}</div>` : `<div class="muted pad">${esc(out.off_error || _("Aucun produit trouvé."))}</div>`;
      res.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", async () => {
        b.classList.add("busy");
        await this._do(this._ws("ingredient/update", { ingredient_id: i.id, changes: {}, off: out.off[+b.dataset.off] }), _("Produit associé"));
        this._ingModal(i.id);
      }));
    };
    mb.querySelector("button.main").addEventListener("click", go); inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") go(); });
    go();
  }

  getCardSize() { return this._c && this._c.view === "today" ? 3 : this._c && this._c.view === "week" ? 8 : 10; }
  getGridOptions() { return this._c && this._c.view === "today" ? { columns: 6, rows: "auto", min_columns: 4 } : { columns: 12, rows: "auto", min_columns: 6 }; }
  static getStubConfig() { return { title: "Menus" }; }
  static getConfigElement() { return document.createElement("holm-mymenu-card-editor"); }
}

const CSS = `
:host { display:block; --ac:#0abfbf; --ac2:#e3a21a; --sf:color-mix(in srgb, var(--primary-text-color) 6%, transparent); --bd:color-mix(in srgb, var(--primary-text-color) 10%, transparent); }
ha-card { padding:14px; box-sizing:border-box; container-type:inline-size; overflow:hidden; }
ha-card.noframe { background:none !important; box-shadow:none !important; border:none !important; backdrop-filter:none !important; }
button { font:inherit; color:inherit; cursor:pointer; }
.hd { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
.tt { display:flex; align-items:center; gap:8px; font-size:17px; font-weight:700; margin-right:auto; color:var(--primary-text-color); }
.tt ha-icon { color:var(--ac); }
.tabs { display:flex; gap:3px; padding:3px; border-radius:14px; background:var(--sf); }
.tab { display:flex; align-items:center; gap:6px; border:0; background:none; padding:7px 12px; border-radius:11px; font-size:13px; font-weight:600; color:var(--secondary-text-color); position:relative; }
.tab ha-icon { --mdc-icon-size:18px; }
.tab.on { background:color-mix(in srgb, var(--ac) 22%, transparent); color:var(--primary-text-color); }
.tab em { font-style:normal; font-size:10.5px; min-width:16px; height:16px; line-height:16px; border-radius:8px; background:var(--ac2); color:#111; padding:0 4px; }
@container (max-width: 560px) { .tab span { display:none; } .tab { padding:8px 11px; } }
.bar { display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
.wk { font-weight:600; font-size:14px; flex:1; text-align:center; min-width:140px; }
.wk.dates { display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap; font-weight:500; }
.wk.dates label { display:inline-flex; align-items:center; gap:6px; } .wk.dates .f.dt { flex:0 0 auto; width:auto; padding:6px 8px; font-size:13px; color-scheme:light dark; }
.wk.dates small { color:var(--secondary-text-color); font-size:12px; } .wk.dates small.bad { color:var(--error-color, #e57373); }
.ib { width:34px; height:34px; border-radius:10px; border:0; background:var(--sf); display:grid; place-items:center; flex:none; }
.ib.on { color:#e05a8a; }
.ib.wm.act { color:var(--ac); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--ac) 55%, transparent); }
.rfbar { display:flex; flex-wrap:wrap; align-items:flex-end; gap:8px 10px; margin:-2px 0 10px; }
.rfbar label { display:flex; flex-direction:column; gap:3px; flex:1 1 130px; min-width:0; font-size:11.5px; color:var(--secondary-text-color); }
.rfbar .f { padding:7px 10px; font-size:13px; }
.rfbar.sg { margin:10px 0 0; }
.chip.on { border-color:var(--ac); background:color-mix(in srgb, var(--ac) 16%, transparent); }
.chip ha-icon { --mdc-icon-size:15px; vertical-align:-3px; margin-right:4px; }
button.chip { cursor:pointer; font:inherit; font-size:12.5px; color:var(--primary-text-color); }
.chip.av { display:inline-flex; align-items:center; gap:6px; } .avx { border:0; background:none; color:var(--secondary-text-color); cursor:pointer; padding:0; font-size:12px; }
.sglist { display:flex; flex-direction:column; gap:6px; max-height:46vh; overflow:auto; }
.sgl { display:flex; align-items:center; gap:10px; padding:6px; border-radius:12px; background:var(--sf); }
.sgl.off { opacity:.6; }
.sgd { display:flex; flex-direction:column; width:62px; flex:none; font-size:12.5px; text-transform:capitalize; } .sgd small { color:var(--secondary-text-color); }
.sgi { width:44px; height:44px; border-radius:10px; flex:none; background:var(--bd) center/cover; display:grid; place-items:center; color:var(--secondary-text-color); }
.sgn { flex:1; min-width:0; display:flex; flex-direction:column; } .sgn b { font-size:13.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .sgn small { font-size:11.5px; color:var(--secondary-text-color); }
.mf { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }
.ib ha-icon { --mdc-icon-size:20px; }
.pill { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--bd); background:var(--sf); padding:7px 12px; border-radius:11px; font-size:13px; font-weight:600; text-decoration:none; color:var(--primary-text-color); white-space:nowrap; }
.pill ha-icon { --mdc-icon-size:17px; }
.pill.main { background:var(--ac); border-color:var(--ac); color:#0b1416; }
.pill.danger { color:var(--error-color, #e05252); }
.pill.busy { opacity:.65; }
.pill:disabled { opacity:.5; cursor:default; }
.lnk { border:0; background:none; color:var(--ac); font-weight:600; font-size:12.5px; padding:2px 4px; text-decoration:none; }
input.search, .f { flex:1; min-width:0; box-sizing:border-box; padding:9px 12px; border-radius:11px; border:1px solid var(--bd); background:var(--card-background-color, transparent); color:var(--primary-text-color); font:inherit; font-size:14px; }
.shop-add { flex:1; padding:9px 12px; border-radius:11px; border:1px dashed var(--bd); background:none; color:var(--primary-text-color); font:inherit; }
.empty, .muted { color:var(--secondary-text-color); font-size:13px; }
.empty { padding:24px 8px; text-align:center; line-height:1.6; }
.pad { padding:14px 4px; }
.hint { margin-top:8px; font-size:11.5px; color:var(--secondary-text-color); text-align:center; opacity:.8; }
/* semaine */
.week { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:8px; }
@container (max-width: 860px) { .week { grid-template-columns:1fr; } .day { display:grid; grid-template-columns:52px 1fr 1fr; align-items:stretch; gap:6px; } }
.day { display:flex; flex-direction:column; gap:6px; padding:6px; border-radius:16px; background:var(--sf); }
.day.today { box-shadow:inset 0 0 0 1.5px var(--ac); }
.day.past { opacity:.6; }
.dn { display:flex; align-items:baseline; gap:6px; padding:2px 4px; text-transform:capitalize; }
@container (max-width: 860px) { .dn { flex-direction:column; align-items:center; justify-content:center; gap:0; } }
.dn b { font-size:13px; } .dn span { font-size:12px; color:var(--secondary-text-color); }
.day.today .dn span { color:var(--ac); font-weight:700; }
.slot { position:relative; min-height:78px; border-radius:12px; padding:6px 8px; cursor:pointer; display:flex; flex-direction:column; gap:3px; overflow:hidden;
  background:color-mix(in srgb, var(--primary-text-color) 4%, transparent); border:1px dashed var(--bd); transition:transform .15s, box-shadow .15s; }
.slot.full { border-style:solid; }
.slot { padding:0 !important; gap:0 !important; }
.shero { position:relative; flex:1; min-height:70px; padding:6px 8px; display:flex; flex-direction:column; gap:3px; }
.shero.img { background-image:linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.72)), var(--img); background-size:cover; background-position:center; color:#fff; }
.shero.mini { flex:none; min-height:0; } .shero.mini + .sxi { flex:1; border-top:none; background:none; } .thero.mini + .tings { flex:1; border-top:none; }
.slot .sxi { display:flex; flex-direction:column; gap:3px; padding:5px 6px 6px; margin:0; background:color-mix(in srgb, var(--primary-text-color) 5%, transparent); border-top:1px solid var(--bd); }
.slot .sxi span { display:flex; align-items:center; gap:5px; font-size:11px; font-weight:600; padding:0; background:none; border-radius:0; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.slot .sxi em { width:18px; height:18px; flex:none; border-radius:5px; background:#fff center/contain no-repeat; } .slot .sxi ha-icon { --mdc-icon-size:15px; flex:none; color:var(--ac); }
.slot:hover { transform:translateY(-1px); box-shadow:0 6px 16px rgba(0,0,0,.25); }
.slot.over { box-shadow:0 0 0 2px var(--ac2); }
.slot.dragging { opacity:.4; }
.sl { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; opacity:.75; }
.sx { display:flex; flex-direction:column; gap:2px; margin-top:auto; }
.sx b { font-size:12.5px; line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.sx i { font-size:11.5px; opacity:.85; } .sxi { display:flex; flex-wrap:wrap; gap:3px; margin-top:2px; } .sxi span { font-size:10.5px; font-weight:600; padding:1px 6px; border-radius:999px; background:color-mix(in srgb, var(--ac) 28%, rgba(0,0,0,.2)); }
.sx.add { align-items:center; justify-content:center; flex:1; color:var(--secondary-text-color); }
.todayv { display:grid; grid-template-columns:1fr 1fr; gap:10px; } .todayv.n1 { grid-template-columns:1fr; } @container (max-width:360px) { .todayv { grid-template-columns:1fr; } }
.tslot { position:relative; border-radius:16px; display:flex; flex-direction:column; overflow:hidden; background:var(--sf); }
.thero { position:relative; flex:1; min-height:130px; padding:10px 12px; display:flex; flex-direction:column; justify-content:flex-end; gap:6px; box-sizing:border-box; }
.thero.img { background-image:linear-gradient(180deg, rgba(0,0,0,.05) 20%, rgba(0,0,0,.78)), var(--img); background-size:cover; background-position:center; color:#fff; }
.thero.mini { flex:none; min-height:38px; }
.shero.multi, .thero.multi { background-image:none; overflow:hidden; isolation:isolate; }
.hims { position:absolute; inset:0; z-index:-1; display:flex; }
.hims span { flex:1; background-size:cover; background-position:center; }
.hims.n2 span { position:absolute; top:0; bottom:0; width:56%; }
.hims.n2 span:first-child { left:0; clip-path:polygon(0 0, 100% 0, 78.6% 100%, 0 100%); }
.hims.n2 span:last-child { left:44%; clip-path:polygon(21.4% 0, 100% 0, 100% 100%, 0 100%); }
.hims.n3 span + span { box-shadow:inset 2px 0 0 rgba(0,0,0,.35); }
.hims::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.74)); }
.thero .hims::after { background:linear-gradient(180deg, rgba(0,0,0,.05) 20%, rgba(0,0,0,.78)); }
.hmore { position:absolute; top:6px; right:8px; padding:1px 7px; border-radius:999px; background:rgba(0,0,0,.55); color:#fff; font-size:11px; font-weight:700; }
.tslot .sl { position:absolute; top:9px; left:10px; font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:3px 8px; border-radius:999px; background:color-mix(in srgb, var(--ac) 85%, transparent); color:#fff; }
.tents { display:flex; flex-direction:column; gap:4px; } .te { all:unset; cursor:pointer; display:flex; flex-direction:column; border-radius:10px; padding:4px 6px; margin:0 -6px; } .te.txt { cursor:default; }
.te:not(.txt):hover { background:rgba(255,255,255,.12); } .te b { font-size:15px; font-weight:700; line-height:1.25; } .te small { font-size:12px; opacity:.85; }
.tslot.sm { border-radius:13px; } .tslot.sm .thero { min-height:92px; padding:8px 10px; } .tslot.sm .thero.mini { min-height:32px; } .tslot.sm .sl { top:7px; left:8px; font-size:10px; padding:2px 7px; } .tslot.sm .te b { font-size:13.5px; }
.tings { display:flex; flex-wrap:wrap; gap:6px; padding:8px 10px; border-top:1px solid var(--bd); }
.tchip { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:7px; font-size:12.5px; font-weight:600; padding:3px 10px 3px 3px; border-radius:999px; background:color-mix(in srgb, var(--ac) 14%, transparent); color:var(--primary-text-color); max-width:100%; box-sizing:border-box; }
.tchip:hover { background:color-mix(in srgb, var(--ac) 32%, transparent); } .tn { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ti { width:26px; height:26px; border-radius:50%; background:#fff center/contain no-repeat; flex:none; box-shadow:0 0 0 1px var(--bd); } .ti.no { background:color-mix(in srgb, var(--ac) 20%, transparent); display:grid; place-items:center; color:var(--ac); } .ti ha-icon { --mdc-icon-size:15px; }
.tslot.sm .ti { width:22px; height:22px; } .tslot.sm .tings { padding:6px 8px; gap:5px; }
.te.txt i { font-size:13px; opacity:.9; }
.weekro { display:flex; flex-direction:column; gap:8px; }
.rday { display:grid; grid-template-columns:74px 1fr; gap:10px; align-items:stretch; } .rday.past { opacity:.55; }
.rdn { display:flex; flex-direction:column; justify-content:center; align-items:flex-start; padding:6px 8px; border-radius:12px; background:var(--sf); } .rdn b { font-size:12px; text-transform:capitalize; color:var(--secondary-text-color); } .rdn span { font-size:22px; font-weight:800; line-height:1.1; }
.rday.today .rdn { background:color-mix(in srgb, var(--ac) 22%, transparent); } .rday.today .rdn b { color:var(--ac); }
.rsl { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; }
@container (max-width:420px) { .rday { grid-template-columns:1fr; gap:4px; } .rdn { flex-direction:row; gap:8px; align-items:baseline; padding:2px 4px; background:none; } .rdn span { font-size:15px; } }
.tempty { font-size:13px; color:var(--secondary-text-color); padding-bottom:4px; }
.lst { overflow-y:auto; margin-right:-6px; padding-right:6px; scrollbar-width:thin; }
@media (pointer: coarse) { .lst { max-height:none !important; overflow:visible; margin-right:0; padding-right:0; } }
.more { display:block; width:100%; margin:10px 0 2px; padding:9px; border-radius:12px; border:1px dashed var(--bd); background:none; color:var(--secondary-text-color); font-size:13px; } .more:hover { color:var(--primary-text-color); border-color:var(--ac); }
.rem-row { display:flex; align-items:center; gap:8px; padding:12px 8px; border-bottom:1px solid var(--bd); }
.rem-text { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
.rem-text b { font-size:14px; } .rem-text small { font-size:11px; color:var(--secondary-text-color); }
.rem-actions { display:flex; flex:none; gap:1px; }
.rem-actions .ib { min-width:32px; }
.rem-form { display:flex; flex-direction:column; gap:12px; }
.rem-field { display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:600; }
.rem-days { display:flex; flex-wrap:wrap; gap:9px; }
.rem-days label { display:flex; align-items:center; gap:3px; }
@container (max-width:430px) { .rem-row { flex-wrap:wrap; } .rem-actions { margin-left:auto; } }
/* recettes */
.rgrid, .mgrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px; }
.rc, .mc { border-radius:14px; background:var(--sf); overflow:hidden; cursor:pointer; transition:transform .15s; display:flex; flex-direction:column; }
.rc:hover, .mc:hover { transform:translateY(-2px); }
.mc.busy { opacity:.5; pointer-events:none; }
.ri { aspect-ratio:4/3; background:color-mix(in srgb, var(--ac) 12%, transparent) center/cover; display:grid; place-items:center; color:var(--ac); position:relative; }
.ri ha-icon { --mdc-icon-size:34px; opacity:.6; }
.fav { position:absolute; top:6px; right:6px; color:#e05a8a; } .fav ha-icon { --mdc-icon-size:18px; opacity:1; }
.have { position:absolute; left:6px; top:6px; font-style:normal; font-size:10.5px; background:var(--ac); color:#0b1416; padding:2px 6px; border-radius:6px; font-weight:700; }
.rn { font-size:13px; font-weight:600; padding:7px 9px 2px; line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.rm { display:flex; gap:8px; padding:2px 9px 8px; font-size:11.5px; color:var(--secondary-text-color); flex-wrap:wrap; }
.rm span { display:flex; align-items:center; gap:3px; } .rm ha-icon { --mdc-icon-size:13px; }
/* ingrédients */
.grp { margin-bottom:12px; }
.gh { font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--secondary-text-color); margin:4px 2px 6px; display:flex; gap:6px; }
.gh em { font-style:normal; opacity:.7; }
.igrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:6px; }
.ic { display:flex; align-items:center; gap:9px; padding:6px 8px; border-radius:12px; background:var(--sf); cursor:pointer; }
.ii, .oi { width:36px; height:36px; border-radius:10px; flex:none; background:#fff center/contain no-repeat; display:grid; place-items:center; font-weight:700; color:#0b1416; }
.ii:not([style]) { background:color-mix(in srgb, var(--ac) 22%, transparent); color:var(--primary-text-color); }
.oi.big { width:110px; height:110px; border-radius:16px; } .oi:not([style]) { background:var(--sf); color:var(--secondary-text-color); }
.ihd { display:flex; flex-direction:column; gap:6px; align-items:flex-start; min-width:0; } .ibr { font-size:14px; font-weight:600; }
.badges { display:flex; gap:5px; flex-wrap:wrap; } .mdl { container-type:inline-size; } .ns.lg { font-size:11.5px; padding:3px 8px; }
.offinfo { display:grid; grid-template-columns:minmax(180px, 240px) 1fr; gap:14px; margin-top:10px; } @container (max-width:520px) { .offinfo { grid-template-columns:1fr; } }
table.nut { width:100%; border-collapse:collapse; font-size:12.5px; } table.nut td { padding:4px 6px; border-bottom:1px solid var(--bd); } table.nut td:last-child { text-align:right; font-weight:600; white-space:nowrap; } table.nut tr.sub td:first-child { padding-left:16px; color:var(--secondary-text-color); }
.small { font-size:12.5px; line-height:1.45; color:var(--secondary-text-color); max-height:110px; overflow:auto; }
.chip.warn { border-color:color-mix(in srgb, #e3a21a 55%, transparent); background:color-mix(in srgb, #e3a21a 14%, transparent); }
pre.prev { white-space:pre-wrap; font:12.5px/1.45 var(--code-font-family, monospace); background:var(--sf); border-radius:12px; padding:10px 12px; max-height:220px; overflow:auto; margin:0; }
a.pill { text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
.shopact { margin:-4px 0 12px; }
.camov { position:fixed; inset:0; z-index:10000; background:#000; display:flex; align-items:center; justify-content:center; }
.camwrap { position:relative; width:100%; height:100%; max-width:900px; display:flex; flex-direction:column; }
.camwrap video { flex:1; width:100%; min-height:0; object-fit:contain; background:#000; }
.cammsg { position:absolute; top:45%; left:0; right:0; text-align:center; color:#fff; font-size:14px; }
.cambar { display:flex; align-items:center; justify-content:space-around; padding:18px 12px calc(18px + env(safe-area-inset-bottom)); background:#000; }
.cambar .ib { color:#fff; background:rgba(255,255,255,.12); width:46px; height:46px; }
.shutter { width:72px; height:72px; border-radius:50%; border:4px solid #fff; background:rgba(255,255,255,.25); padding:0; } .shutter:active { background:#fff; } .shutter[disabled] { opacity:.4; }
.scan { position:relative; border-radius:16px; overflow:hidden; background:#000; aspect-ratio:4/3; margin-bottom:10px; }
.scan video { width:100%; height:100%; object-fit:cover; display:block; }
.scan .aim { position:absolute; left:12%; right:12%; top:35%; bottom:35%; border:2px solid rgba(255,255,255,.85); border-radius:12px; box-shadow:0 0 0 999px rgba(0,0,0,.35); }
.scanmsg { position:absolute; left:0; right:0; bottom:10px; text-align:center; color:#fff; font-size:13px; text-shadow:0 1px 3px #000; padding:0 12px; }
.photobox { display:flex; align-items:center; gap:12px; margin-top:4px; } .photobox .pv { width:86px; height:64px; border-radius:12px; flex:none; background:var(--sf) center/cover no-repeat; display:grid; place-items:center; color:var(--secondary-text-color); }
.photobox .pb { display:flex; flex-wrap:wrap; gap:6px; } details.adv summary { cursor:pointer; font-size:12px; color:var(--secondary-text-color); margin:4px 0; } details.adv .f { width:100%; }
.clist { display:flex; flex-direction:column; gap:5px; } .ct { display:flex; align-items:center; gap:10px; padding:6px 8px; border-radius:12px; background:var(--sf); cursor:pointer; }
.ct.on { box-shadow:inset 0 0 0 1.5px var(--ac); } .ct input, .dlist input { accent-color:var(--ac); width:17px; height:17px; margin:0; }
.av { width:30px; height:30px; border-radius:50%; display:grid; place-items:center; font-weight:800; background:color-mix(in srgb, var(--ac) 28%, transparent); flex:none; }
.cn { flex:1; min-width:0; display:flex; flex-direction:column; } .cn small { color:var(--secondary-text-color); font-size:12px; overflow:hidden; text-overflow:ellipsis; }
.addc { margin-top:8px; } .addc .cnm { flex:0 1 150px; } .dlist { display:flex; flex-wrap:wrap; gap:6px; } .dlist .chip { display:inline-flex; align-items:center; gap:6px; cursor:pointer; } .dlist .chip.on { border-color:var(--ac); }
.warn { margin-top:8px; padding:8px 10px; border-radius:10px; font-size:12.5px; background:color-mix(in srgb, #e3a21a 16%, transparent); } .sendrow { margin-top:14px; } .pill[disabled] { opacity:.5; pointer-events:none; }
.stiles { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-bottom:12px; }
.stile { display:flex; flex-direction:column; gap:2px; padding:12px; border-radius:14px; background:var(--sf); } .stile ha-icon { color:var(--ac); --mdc-icon-size:20px; margin-bottom:4px; }
.stile b { font-size:24px; font-weight:800; line-height:1.1; } .stile span { font-size:13px; color:var(--primary-text-color); } .stile small { font-size:11.5px; color:var(--secondary-text-color); }
.scols { display:grid; grid-template-columns:1fr 1fr; gap:12px; } @container (max-width:640px) { .scols { grid-template-columns:1fr; } }
.sbox { padding:4px 2px; min-width:0; } .toplist { display:flex; flex-direction:column; gap:4px; }
.tr { display:flex; align-items:center; gap:9px; padding:5px 6px; border-radius:10px; cursor:pointer; } .tr:hover { background:var(--sf); }
.tr .rk { width:18px; text-align:right; font-size:12px; font-weight:700; color:var(--secondary-text-color); flex:none; } .tr .ti { width:34px; height:34px; border-radius:9px; background-color:var(--sf); }
.toplist.sm .tr .ti { width:26px; height:26px; border-radius:50%; background-size:contain; background-color:#fff; } .toplist.sm .tr .ti.no { background-color:var(--sf); }
.tn2 { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; } .tn2 b { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tbar { height:6px; border-radius:3px; background:var(--sf); overflow:hidden; } .tbar i { display:block; height:100%; border-radius:3px; background:var(--ac); }
.tr em { font-style:normal; font-size:12.5px; font-weight:700; color:var(--primary-text-color); min-width:28px; text-align:right; }
.wbars { display:flex; align-items:stretch; gap:6px; height:130px; padding:4px 0 2px; } .wb { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; min-width:0; cursor:default; }
.wcol { flex:1; width:100%; max-width:30px; display:flex; align-items:flex-end; border-bottom:1px solid var(--bd); } .wcol i { display:block; width:100%; border-radius:4px 4px 0 0; background:color-mix(in srgb, var(--ac) 55%, transparent); min-height:0; }
.wb.now .wcol i { background:var(--ac); } .wb:hover .wcol i { background:var(--ac); } .wv { font-size:11px; font-weight:700; height:14px; } .wl { font-size:10.5px; color:var(--secondary-text-color); } .wb.now .wl { color:var(--ac); font-weight:700; }
.srcs { display:flex; flex-wrap:wrap; gap:6px; } .srcs b { margin-left:4px; }
.off.busy, .ri2.busy { opacity:.5; pointer-events:none; }
.in { min-width:0; flex:1; display:flex; flex-direction:column; } .in b { font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .in small { font-size:11.5px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ns { font-size:11px; font-weight:800; color:#fff; padding:2px 7px; border-radius:6px; display:inline-block; }
/* courses */
.shopmeta { font-size:12.5px; color:var(--secondary-text-color); margin:2px 2px 10px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.si { display:grid; grid-template-columns:24px minmax(0,1fr) 38px 38px; grid-template-rows:auto auto auto; column-gap:9px; align-items:center; padding:7px 6px; border-radius:10px; cursor:pointer; border-bottom:1px solid var(--bd); }
.si:hover { background:var(--sf); }
.si .cb { grid-row:1 / span 3; grid-column:1; width:22px; height:22px; border-radius:7px; border:2px solid var(--bd); display:grid; place-items:center; color:transparent; }
.si .cb ha-icon { --mdc-icon-size:16px; }
.si b { grid-column:2; grid-row:1; font-size:14px; font-weight:600; min-width:0; } .si .q { grid-column:2; grid-row:2; font-size:13px; font-weight:600; color:var(--ac); text-align:left; white-space:normal; }
.si small { grid-column:2; grid-row:3; font-size:11px; color:var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.si > .ib { grid-column:3; grid-row:1 / span 3; min-width:36px; min-height:40px; align-self:center; } .si .x { grid-row:1 / span 3; grid-column:4; min-width:36px; min-height:40px; align-self:center; border:0; background:none; opacity:.4; } .si .x ha-icon { --mdc-icon-size:16px; }
.si.ck .cb { background:var(--ac); border-color:var(--ac); color:#0b1416; } .si.ck b, .si.ck .q { text-decoration:line-through; opacity:.5; }
/* fenêtres */
.ov { position:fixed; inset:0; z-index:9999; background:rgba(4,8,12,.6); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; }
.mdl { width:100%; max-width:520px; max-height:100%; overflow:auto; border-radius:22px; background:var(--card-background-color, #1c1c1c); color:var(--primary-text-color); box-shadow:0 20px 60px rgba(0,0,0,.5); border:1px solid var(--bd); }
.mdl.wide { max-width:820px; }
.mh { display:flex; align-items:center; gap:8px; padding:12px 14px; position:sticky; top:0; background:inherit; z-index:2; border-bottom:1px solid var(--bd); }
.mt { flex:1; font-weight:700; font-size:16px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mb { padding:14px; display:flex; flex-direction:column; gap:10px; }
@media (max-width: 560px) { .ov { padding:0; align-items:flex-end; } .mdl { border-radius:22px 22px 0 0; max-height:92vh; } }
.row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; } .row.end { justify-content:flex-end; } .row.act { gap:6px; } .grow { flex:1; }
.fl { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--secondary-text-color); flex:1; min-width:120px; }
textarea.f { resize:vertical; font-family:inherit; }
.ents { display:flex; flex-direction:column; gap:6px; }
.egrp + .egrp { margin-top:12px; } .egrp .rh { display:flex; align-items:center; gap:6px; } .egrp .rh ha-icon { --mdc-icon-size:16px; color:var(--ac); } .egrp .rh em { font-style:normal; font-size:11px; padding:0 6px; border-radius:999px; background:var(--sf); }
.ei.op { cursor:pointer; } .ei.pic { background-color:#fff; background-size:contain; background-repeat:no-repeat; } .small2 { font-size:12px; margin-top:8px; }
.ent, .ri2 { display:flex; align-items:center; gap:10px; padding:6px; border-radius:12px; background:var(--sf); }
.ri2 { cursor:pointer; background:none; } .ri2:hover { background:var(--sf); }
.ri2 b { flex:1; font-size:13.5px; font-weight:600; } .ri2 small { font-size:11.5px; color:var(--secondary-text-color); }
.ei { width:52px; height:40px; border-radius:9px; flex:none; background:color-mix(in srgb, var(--ac) 15%, transparent) center/cover; display:grid; place-items:center; color:var(--ac); }
.ei.sm { width:34px; height:34px; } .ei.mm { background:color-mix(in srgb, #e3a21a 25%, transparent); color:#e3a21a; } .ei ha-icon { --mdc-icon-size:18px; }
.en { flex:1; min-width:0; display:flex; flex-direction:column; } .en b { font-size:14px; } .en small { font-size:12px; color:var(--secondary-text-color); }
.ingl li.lk { cursor:pointer; } .ingl li.lk:hover { box-shadow:inset 0 0 0 1.5px var(--ac); }
.lnk2 { cursor:pointer; } .lnk2:hover { color:var(--ac); }
.stp { display:inline-flex; align-items:center; gap:6px; } .stp button { width:22px; height:22px; border-radius:6px; border:1px solid var(--bd); background:var(--sf); padding:0; line-height:1; }
.addbox { display:flex; flex-direction:column; gap:6px; }
.pick { padding:10px 12px; border-radius:12px; border:1px solid var(--ac); background:none; color:var(--primary-text-color); font:inherit; }
.res { display:flex; flex-direction:column; gap:2px; }
.rh { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--secondary-text-color); margin:8px 4px 2px; }
.mealie-x { margin-left:auto; position:relative; display:inline-grid; place-items:center; width:28px; height:28px; padding:0; border:0; border-radius:50%; background:none; color:var(--secondary-text-color); opacity:.45; cursor:pointer; transition:opacity .2s, background .2s; }
.mealie-x:hover, .mealie-x:focus-visible { opacity:1; background:color-mix(in srgb, var(--ac) 12%, transparent); outline:none; }
.mealie-x ha-icon { --mdc-icon-size:17px; }
.mealie-x .ok { position:absolute; right:-1px; bottom:-1px; --mdc-icon-size:11px; color:var(--success-color, #3ecf8e); }
.mealie-x.on { opacity:.7; }
.mealie-x.busy { opacity:1; animation:mxp 1s ease-in-out infinite; }
@keyframes mxp { 50% { opacity:.35; } }
.rhero { aspect-ratio:16/7; border-radius:14px; background:color-mix(in srgb, var(--ac) 12%, transparent) center/cover; }
.rmeta { display:flex; gap:12px; flex-wrap:wrap; font-size:12.5px; color:var(--secondary-text-color); } .rmeta span { display:flex; align-items:center; gap:4px; } .rmeta ha-icon { --mdc-icon-size:16px; }
.cols { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.5fr); gap:18px; }
@media (max-width: 640px) { .cols { grid-template-columns:1fr; } }
.sh { font-weight:700; font-size:14px; margin:4px 0 6px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.ingl { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:5px; font-size:13.5px; }
.ingl li { padding:5px 8px; border-radius:8px; background:var(--sf); } .ingl b { color:var(--ac); }
.steps { margin:0; padding-left:20px; display:flex; flex-direction:column; gap:8px; font-size:13.5px; line-height:1.5; }
.seg { display:flex; gap:3px; padding:3px; border-radius:12px; background:var(--sf); }
.seg button { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; border:0; background:none; padding:8px; border-radius:9px; font-size:13px; font-weight:600; color:var(--secondary-text-color); }
.seg button.on { background:color-mix(in srgb, var(--ac) 22%, transparent); color:var(--primary-text-color); } .seg ha-icon { --mdc-icon-size:17px; }
.seg.mini { display:inline-flex; padding:2px; border-radius:9px; } .seg.mini button { flex:0 0 auto; padding:3px 10px; border-radius:7px; font-size:11px; text-transform:none; letter-spacing:0; }
.rh.webh { display:flex; align-items:center; gap:10px; } .rh.webh > span:last-child:not(.seg) { font-weight:600; }
.seg.srcsel { flex:0 0 auto; } .seg.srcsel button { padding:6px 12px; }
.pane .webh .seg.mini { display:none; }
.insp { display:flex; align-items:center; gap:6px; margin:2px 2px 10px; font-size:13px; color:var(--secondary-text-color); } .insp ha-icon { --mdc-icon-size:16px; color:var(--ac); }
.ei.jw { background:color-mix(in srgb, #ff5a4e 22%, transparent); }
.offg { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:6px; }
.off { display:flex; align-items:center; gap:9px; padding:7px; border-radius:12px; background:var(--sf); cursor:pointer; } .off:hover { box-shadow:inset 0 0 0 1.5px var(--ac); }
.otn { flex:1; min-width:0; display:flex; flex-direction:column; } .otn b { font-size:13px; } .otn small { font-size:11.5px; color:var(--secondary-text-color); }
.ihead { display:flex; gap:14px; align-items:center; font-size:13px; } .ihead > div:last-child { display:flex; flex-direction:column; gap:4px; align-items:flex-start; }
.chips { display:flex; flex-wrap:wrap; gap:6px; } .chip { border:1px solid var(--bd); background:var(--sf); border-radius:999px; padding:5px 11px; font-size:12.5px; }
.plgrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; }
.pld { display:flex; flex-direction:column; gap:5px; padding:8px; border-radius:12px; background:var(--sf); } .pld b { font-size:12.5px; text-transform:capitalize; }
.mlist { display:flex; flex-direction:column; gap:2px; max-height:50vh; overflow:auto; }
.ml { display:flex; align-items:center; gap:9px; padding:6px 8px; border-radius:9px; font-size:13.5px; } .ml:hover { background:var(--sf); } .ml b { flex:1; font-weight:500; } .ml.done { opacity:.55; } .ml small { font-size:11.5px; }
`;

class HolmMyMenuCardEditor extends HTMLElement {
  setConfig(c) { this._c = { ...c }; this._draw(); }
  set hass(h) { this._hass = h; if (this._f && langOf(h, this._c) !== this._lang) { this._f.remove(); this._f = null; } if (this._f) this._f.hass = h; else this._draw(); }
  _draw() {
    if (!this._hass || !this._c) return;
    this._lang = setLang(this._hass, this._c);
    if (!this._f) {
      this._f = document.createElement("ha-form");
      this._f.computeLabel = (s) => ({ language: _("Langue"), title: _("Titre"), view: _("Affichage"), tab: _("Onglet à l'ouverture"), week_start: _("Début du planning"), show_frame: _("Afficher le cadre"), today_slots: _("Repas affichés (toutes les vues)"), list_height: _("Hauteur des listes en px (0 = sans limite)") }[s.name] || s.name);
      this._f.schema = [langField(), { name: "title", selector: { text: {} } },
        { type: "grid", name: "", schema: [
          { name: "view", selector: { select: { mode: "dropdown", options: [{ value: "full", label: _("Complet (semaine, recettes, ingrédients, courses)") }, { value: "today", label: _("Menu du jour (compact, consultation)") }, { value: "week", label: _("Semaine (planning, consultation)") }, { value: "stats", label: _("Statistiques") }] } } },
          { name: "tab", selector: { select: { mode: "dropdown", options: [{ value: "week", label: _("Semaine") }, { value: "recipes", label: _("Recettes") }, { value: "ingredients", label: _("Ingrédients") }, { value: "shopping", label: _("Courses") }, { value: "reminders", label: _("Rappels") }, { value: "stats", label: _("Statistiques") }] } } }] },
        { name: "week_start", selector: { select: { mode: "dropdown", options: [{ value: "monday", label: _("Lundi (semaine en cours)") }, { value: "today", label: _("Aujourd'hui (7 prochains jours)") }] } } },
        { name: "today_slots", selector: { select: { multiple: true, mode: "list", options: [{ value: "midi", label: _("Midi") }, { value: "soir", label: _("Soir") }] } } },
        { name: "list_height", selector: { number: { min: 0, max: 2000, step: 20, mode: "box", unit_of_measurement: "px" } } },
        { name: "show_frame", selector: { boolean: {} } }];
      this._f.addEventListener("value-changed", (e) => {
        const v = { ...this._c, ...e.detail.value };
        ["view", "tab"].forEach((k) => { if (v[k] === { view: "full", tab: "week" }[k]) delete v[k]; });
        if (v.show_frame !== false) delete v.show_frame;
        if (v.week_start !== "today") delete v.week_start;
        if (Array.isArray(v.today_slots) && (!v.today_slots.length || v.today_slots.length === 2)) delete v.today_slots;
        if (v.list_height === 620 || v.list_height === undefined || v.list_height === null) delete v.list_height;
        this._c = v;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: v }, bubbles: true, composed: true }));
      });
      this.appendChild(this._f);
    }
    this._f.hass = this._hass;
    this._f.data = { view: "full", tab: "week", week_start: "monday", show_frame: true, today_slots: ["midi", "soir"], list_height: 620, ...this._c };
  }
}

if (!customElements.get("holm-mymenu-card")) customElements.define("holm-mymenu-card", HolmMyMenuCard);
if (!customElements.get("holm-mymenu-card-editor")) customElements.define("holm-mymenu-card-editor", HolmMyMenuCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "holm-mymenu-card")) {
  setLang(document.querySelector("home-assistant")?.hass);
  window.customCards.push({ type: "holm-mymenu-card", name: "HOLM – My Menu", description: _("Menus de la semaine, recettes (Marmiton, Jow, Mealie), ingrédients (Open Food Facts) et liste de courses"), preview: false });
}
console.info(`%c HOLM-MYMENU %c ${VERSION} `, "background:#0abfbf;color:#0b1416;border-radius:3px 0 0 3px", "background:#123;color:#fff;border-radius:0 3px 3px 0");
})();
