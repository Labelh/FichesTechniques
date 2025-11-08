@echo off
REM Fiches Techniques - Script d'installation rapide pour Windows
REM Ce script installe et configure automatiquement l'application

echo =================================
echo Installation de Fiches Techniques
echo =================================
echo.

REM Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Node.js n'est pas installe
    echo          Telechargez-le sur https://nodejs.org/
    pause
    exit /b 1
)

node -v
echo [OK] Node.js detecte
echo.

REM Installer les dépendances
echo Installation des dependances...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Erreur lors de l'installation des dependances
    pause
    exit /b 1
)

echo [OK] Dependances installees
echo.

REM Vérifier si .env existe
if not exist .env (
    echo [ATTENTION] Fichier .env non trouve
    echo.
    echo Configuration Firebase requise:
    echo   1. Creez un projet sur https://console.firebase.google.com/
    echo   2. Activez Firestore et Storage
    echo   3. Recuperez vos credentials
    echo   4. Copiez .env.example vers .env
    echo   5. Remplissez les valeurs dans .env
    echo.
    echo Consultez FIREBASE_SETUP.md pour le guide detaille
    echo.

    set /p create_env="Voulez-vous creer le fichier .env maintenant ? (o/n): "

    if /i "%create_env%"=="o" (
        copy .env.example .env
        echo [OK] Fichier .env cree
        echo [ATTENTION] N'oubliez pas de le remplir avec vos credentials Firebase
        echo.

        set /p edit_env="Voulez-vous ouvrir .env dans le bloc-notes ? (o/n): "

        if /i "%edit_env%"=="o" (
            notepad .env
        )
    )
)

echo.
echo ================================
echo Installation terminee !
echo ================================
echo.
echo Prochaines etapes:
echo   1. Configurez Firebase dans le fichier .env
echo   2. Lancez l'application avec: npm run dev
echo   3. Ouvrez http://localhost:5173 dans votre navigateur
echo.
echo Documentation:
echo   - INSTALL.md - Guide d'installation pas a pas
echo   - FIREBASE_SETUP.md - Configuration Firebase detaillee
echo   - README.md - Documentation complete
echo.
echo Bon developpement !
echo.
pause
