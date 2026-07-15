# Journal des modifications — Fiches Techniques

Ce document liste, en langage simple, les évolutions apportées à votre application de Fiches Techniques. La modification la plus récente est en haut.

## 10 juillet 2026

- **Tableau de bord simplifié.** Les colonnes « Temps par pièce » et « Difficulté » ont été retirées du tableau de bord pour un affichage plus épuré.

## 28 juin 2026

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
