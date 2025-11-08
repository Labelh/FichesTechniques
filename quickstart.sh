#!/bin/bash

# Fiches Techniques - Script d'installation rapide
# Ce script installe et configure automatiquement l'application

echo "🚀 Installation de Fiches Techniques..."
echo ""

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "   Téléchargez-le sur https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) détecté"
echo ""

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo "✅ Dépendances installées"
echo ""

# Vérifier si .env existe
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env non trouvé"
    echo ""
    echo "📋 Configuration Firebase requise:"
    echo "   1. Créez un projet sur https://console.firebase.google.com/"
    echo "   2. Activez Firestore et Storage"
    echo "   3. Récupérez vos credentials"
    echo "   4. Copiez .env.example vers .env"
    echo "   5. Remplissez les valeurs dans .env"
    echo ""
    echo "📚 Consultez FIREBASE_SETUP.md pour le guide détaillé"
    echo ""

    read -p "Voulez-vous créer le fichier .env maintenant ? (o/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Oo]$ ]]; then
        cp .env.example .env
        echo "✅ Fichier .env créé"
        echo "⚠️  N'oubliez pas de le remplir avec vos credentials Firebase"
        echo ""

        read -p "Voulez-vous ouvrir .env dans l'éditeur ? (o/n) " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Oo]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    fi
fi

echo ""
echo "✅ Installation terminée !"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Configurez Firebase dans le fichier .env"
echo "   2. Lancez l'application avec: npm run dev"
echo "   3. Ouvrez http://localhost:5173 dans votre navigateur"
echo ""
echo "📚 Documentation:"
echo "   - INSTALL.md - Guide d'installation pas à pas"
echo "   - FIREBASE_SETUP.md - Configuration Firebase détaillée"
echo "   - README.md - Documentation complète"
echo ""
echo "🎉 Bon développement !"
