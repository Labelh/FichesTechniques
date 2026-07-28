# Journal des modifications — Fiches Techniques

Ce document liste, en langage simple, les évolutions apportées à votre application de Fiches Techniques. La modification la plus récente est en haut.

## 28 juillet 2026

- **Correction du compteur « Fiches faites ».** Le nombre affiché dans la carte « Fiches faites » du tableau de bord correspond désormais au nombre réel de fiches créées (le même que le badge orange à côté de « Tableau de bord » dans le menu).

## 27 juillet 2026

- **Correction du bouton « Déplacer vers une autre sous-étape ».** Le menu qui apparaît au clic sur le bouton de déplacement d'image (icône bleue) était masqué depuis l'ajout de la frise d'images scrollable. Il s'affiche désormais correctement au-dessus du bouton, même quand la frise contient beaucoup d'images.

## 24 juillet 2026

- **Mise à jour de templates de sous-étapes.** Lorsque vous sauvegardez une sous-étape comme template, un dialogue vous propose désormais deux options : créer un nouveau template, ou mettre à jour un template existant en le remplaçant par le contenu actuel de la sous-étape.
- **Sélection multiple dans l'annotation d'images.** En mode déplacement, vous pouvez désormais cliquer-glisser sur le fond de l'image pour tracer un rectangle de sélection : toutes les formes à l'intérieur sont sélectionnées (surbrillance verte). Vous pouvez aussi maintenir la touche Maj ou Ctrl enfoncée pour ajouter ou retirer des formes de la sélection une par une. Une fois plusieurs formes sélectionnées, vous pouvez changer leur couleur en une seule fois via la palette, les supprimer ensemble, ou les déplacer en groupe.

## 17 juillet 2026

- **Changement de couleur d'une forme dans l'annotation.** Lorsque vous sélectionnez une forme existante (avec l'outil de déplacement), vous pouvez désormais changer sa couleur via la palette de couleurs.
- **Choix du nom par liste déroulante.** Dans la section « Rédaction & Validation » d'une fiche technique, les champs « Rédigé par », « Vérifié par » et « Approuvé par » proposent désormais une liste déroulante avec les noms de l'équipe, au lieu d'un champ libre.

## 15 juillet 2026

- **Recherche de référence dans l'onglet Prévisionnelles.** Le champ « Référence » propose désormais des suggestions parmi vos fiches techniques existantes lorsque vous tapez. Vous pouvez cliquer sur une suggestion pour pré-remplir le champ.
- **Indicateurs en haut de l'onglet Prévisionnelles.** Trois cadres récapitulatifs (nombre de références, taux de complétion avec barre de progression, charge totale) s'affichent au-dessus du tableau pour une vue d'ensemble rapide.
- **Tableau des références amélioré.** Le tableau est plus aéré, avec des couleurs alternées, des en-têtes plus lisibles, et le statut « Faite / À faire » est affiché sous forme de pastille colorée. Le bouton de suppression n'apparaît qu'au survol de la ligne.

## 10 juillet 2026

- **Tableau de bord simplifié.** Les colonnes « Temps par pièce » et « Difficulté » ont été retirées du tableau de bord pour un affichage plus épuré.

## 28 juin 2026

- **Sommaire latéral des phases.** Un panneau flottant apparaît à droite lors de la rédaction d'une fiche. Il liste toutes les phases et met en évidence celle que vous êtes en train de consulter. Cliquez sur un nom pour y accéder directement.
- **Historique des modifications.** Une nouvelle section "Historique des modifications" est disponible dans l'éditeur de fiche, entre la Défauthèque et le Versioning. En cliquant dessus, vous pouvez voir la liste des dernières actions effectuées (déplacements de sous-étapes, etc.) avec leur date et heure.
- **Réorganisation par glisser-déposer.** Dans chaque phase, vous pouvez maintenant réordonner les sous-étapes en les faisant glisser (via la poignée à gauche). Vous pouvez aussi déplacer une sous-étape vers une autre phase grâce au bouton fléché, qui affiche la liste des phases disponibles.

- **Catégories pour les phrases type.** Lors de l'enregistrement d'une phrase, vous pouvez choisir une catégorie (Ébavurage, Consigne, Astuce, Contrôle) pour la retrouver plus facilement. Dans la bibliothèque de phrases et dans la page Templates, des boutons de filtre par catégorie sont disponibles.
- **Modification complète des phrases type depuis la page Templates.** Le bouton "Modifier" sur chaque phrase ouvre une fenêtre permettant de changer le libellé, la catégorie et le contenu de la phrase.

- **Phrases type dans les descriptions.** Dans la barre d'outils de rédaction, deux nouveaux boutons sont disponibles : l'un pour enregistrer un extrait de texte sélectionné comme phrase réutilisable (avec un libellé pour la retrouver facilement), l'autre pour ouvrir votre bibliothèque de phrases type et l'insérer en un clic à l'endroit voulu dans la description.

- **Ajout de documents et vidéos par glisser-déposer.** Lors de la rédaction d'une fiche, vous pouvez maintenant glisser un fichier depuis l'explorateur Windows directement sur la zone prévue pour l'ajouter — pour les vidéos, les documents et les images.
- **Plus de fenêtre intrusive lors de la sélection de fichiers.** La fenêtre qui s'ouvrait pour demander un chemin d'accès ne s'affiche plus. Si un dossier a déjà été utilisé, il est mémorisé et proposé automatiquement. Sinon, le champ reste modifiable directement.
- **Correction du mauvais chemin inséré.** Le chemin d'accès d'un fichier sélectionné correspond maintenant toujours au fichier en cours, et non au fichier précédemment ajouté.
- **Modification du chemin directement en ligne.** Pour corriger le chemin d'un document ou d'une vidéo déjà ajouté, cliquez dessus pour le modifier sur place — sans fenêtre popup.
- **Design amélioré pour les images, vidéos et documents.** Les zones d'ajout ont été repensées avec des couleurs distinctes (bleu pour les vidéos, rouge pour les documents), des animations au survol, et un affichage en grille plus compact pour les images.

## 24 juin 2026

- **Indicateurs déplacés sur le tableau de bord.** Les quatre cadres (fiches totales, faites, restantes, couverture charge) sont désormais visibles directement sur le tableau de bord, au-dessus de la liste de vos procédures.
- **Filtres et tri dans l'onglet Prévisionnelles.** Vous pouvez maintenant filtrer la liste par statut (Toutes, Faites, À faire) et trier chaque colonne (référence, quantité, temps, charge, statut) en cliquant sur l'en-tête.
- **Nouvel onglet « Prévisionnelles ».** Un nouvel onglet est disponible dans le menu à gauche. Il permet de suivre l'avancement de la rédaction de vos fiches techniques. Vous pouvez ajouter manuellement les références d'articles (avec quantité et temps), et l'application détecte automatiquement si une fiche existe déjà pour chaque référence. Vous pouvez aussi forcer le statut à la main.

## 23 juin 2026

- **Nom obligatoire dans les demandes de modification.** Lorsque vous envoyez une demande de modification depuis une fiche, le champ « Votre nom » est désormais obligatoire. Un message vous le rappelle si vous oubliez de le remplir.

## 16 juin 2026

- **Images hébergées chez vous.** Les images de vos fiches (couvertures, défauts, photos d'étapes) sont désormais stockées sur votre propre serveur, et non plus chez un service d'images externe. Les images existantes comme les nouvelles y sont. Rien ne change pour vous à l'usage : vous ajoutez vos images comme avant.
- **Liste des consommables toujours à jour.** Dans la section « Outils requis » d'une fiche, les consommables proposés proviennent maintenant directement de votre application de gestion des stocks (gStock). Ils restent ainsi cohérents et à jour automatiquement.
- **Chargement plus fluide.** L'application chargeait les fiches d'une façon qui sollicitait beaucoup la base de données. C'est corrigé : l'affichage est plus léger et plus rapide.

## 15 juin 2026

- **Couleur de l'application.** L'orange de l'interface a été ajusté à la bonne teinte.
- **Affichage des liens vers les documents.** Les chemins d'accès aux documents et vidéos (sur le serveur) ne débordent plus de leur cadre : ils sont proprement raccourcis, et le chemin complet s'affiche au survol.
