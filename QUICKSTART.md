# 🚀 Guide de Démarrage Rapide

## Installation en 3 Étapes

### 1️⃣ Installer les dépendances

```bash
npm install
```

### 2️⃣ Lancer le serveur de développement

```bash
npm run dev
```

### 3️⃣ Ouvrir dans le navigateur

```
http://localhost:5173
```

C'est tout ! L'application est prête à l'emploi.

---

## 📝 Premiers Pas

### Créer votre première procédure

1. Cliquez sur **"Nouvelle Procédure"** (bouton bleu dans la sidebar)

2. Remplissez les champs :
   - **Titre** : "Installation d'une prise électrique" (exemple)
   - **Description** : Décrivez la procédure
   - **Catégorie** : Choisissez "Électricité"
   - **Difficulté** : Sélectionnez le niveau approprié

3. Cliquez sur **"Sauvegarder"**

4. Ajoutez des phases :
   - Cliquez sur **"Ajouter une phase"**
   - Donnez un titre : "Préparation des outils"
   - Ajoutez une description

5. Répétez pour toutes les phases nécessaires

---

## 💡 Astuces Rapides

### Raccourcis Utiles

- **Recherche rapide** : Utilisez la barre de recherche en haut du dashboard
- **Filtrer** : Cliquez sur "Filtres" pour filtrer par statut/difficulté
- **Changer de vue** : Grille 📊 / Liste 📋 / Kanban 📌
- **Mode sombre** : Cliquez sur l'icône soleil/lune en haut à droite

### Organisation

**Utilisez les statuts** :
- 📄 **Brouillon** : Procédure en cours de rédaction
- 🔄 **En cours** : Procédure en cours de validation
- ✅ **Terminée** : Procédure complète et validée

**Utilisez les tags** :
- Ajoutez des mots-clés pour retrouver facilement vos procédures
- Exemple : `urgent`, `extérieur`, `débutant`

---

## 🎯 Fonctionnalités Principales

### Dashboard
- Aperçu de toutes vos procédures
- Statistiques en temps réel
- Recherche et filtres avancés

### Éditeur
- Interface simple et intuitive
- Phases organisées
- Outils et matériaux par phase

### Paramètres
- Changement de thème (clair/sombre/auto)
- Export de toutes vos données en JSON
- Réinitialisation de la base de données

---

## ⚠️ Points Importants

### Sauvegarde
- ✅ Auto-sauvegarde dans le navigateur (IndexedDB)
- ⚠️ **Pensez à exporter régulièrement vos données !**
- 📥 Paramètres → "Exporter" pour créer un backup JSON

### Données Locales
- Toutes vos données restent sur votre ordinateur
- Pas de synchronisation cloud
- Pas besoin d'internet après le premier chargement

---

## 🐛 Problèmes Courants

### L'application ne démarre pas
```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules
npm install
npm run dev
```

### Mes données ont disparu
- Vérifiez que vous utilisez le même navigateur
- Les données sont stockées par navigateur
- Restaurez depuis votre export JSON si vous en avez un

### Erreur lors de la création d'une procédure
- Vérifiez que le titre n'est pas vide
- Actualisez la page et réessayez

---

## 📚 Documentation Complète

Pour plus de détails, consultez le [README.md](README.md)

---

## 🎉 Bon Démarrage !

Vous êtes maintenant prêt à créer vos premières procédures techniques !

**Questions ?** Consultez le README ou le code source pour plus d'informations.
