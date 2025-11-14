# Configuration ImgBB pour l'hébergement d'images

## Pourquoi ImgBB ?

ImgBB est un service d'hébergement d'images gratuit qui offre :
- ✅ **API gratuite** sans limite de requêtes
- ✅ **Hébergement permanent** des images
- ✅ **32 MB max** par image (on limite à 15 MB)
- ✅ **Pas de compte requis** pour les utilisateurs
- ✅ **CDN rapide** pour l'affichage
- ✅ **HTTPS** sécurisé

## Obtenir une clé API (1 minute)

1. **Aller sur** : https://api.imgbb.com/

2. **Créer un compte gratuit** (ou se connecter)
   - Email + mot de passe
   - Ou via Google/Facebook

3. **Obtenir la clé API**
   - Une fois connecté, ta clé API s'affiche immédiatement
   - Format : `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (32 caractères)

4. **Copier la clé** et l'ajouter au fichier `.env`

## Configuration

### 1. Ajouter la clé dans `.env`

Ouvrir le fichier `.env` à la racine du projet et ajouter :

```env
# ImgBB API Key (gratuite)
VITE_IMGBB_API_KEY=ta_cle_api_ici
```

### 2. Redémarrer le serveur

```bash
# Arrêter le serveur (Ctrl+C)
npm run dev
```

## Limites et Recommandations

### Limites ImgBB (gratuit)
- ✅ Pas de limite de requêtes
- ✅ Hébergement permanent
- ⚠️ 32 MB max par image

### Limites de l'application
- On limite volontairement à **15 MB** par image
- Compression automatique au-delà de **2 MB**
- Redimensionnement à **1920px** max

## Alternatives gratuites

Si ImgBB ne fonctionne pas, d'autres options gratuites :

### 1. Cloudinary (Recommandé #2)
- **Gratuit** : 25 GB stockage, 25 GB bande passante/mois
- **API** : Excellente, très complète
- **Configuration** : Plus complexe
- **URL** : https://cloudinary.com/

### 2. Imgur
- **Gratuit** : Illimité
- **API** : Simple mais limite de 50 requêtes/heure
- **Configuration** : Simple
- **URL** : https://api.imgur.com/

### 3. ImageKit
- **Gratuit** : 20 GB stockage, 20 GB bande passante/mois
- **API** : Très performante
- **Configuration** : Moyenne
- **URL** : https://imagekit.io/

## Sécurité

⚠️ **Important** :
- Ne jamais commit la clé API dans Git
- Le fichier `.env` est déjà dans `.gitignore`
- La clé est exposée côté client (normal pour une webapp)

Pour la production, considérer :
- Un proxy backend pour cacher la clé
- Rate limiting pour éviter les abus
- Watermarking des images si nécessaire

## Dépannage

### Erreur : "Upload failed: 400"
➜ Vérifier que la clé API est correcte dans `.env`
➜ Vérifier que le serveur a été redémarré

### Erreur : "Image trop volumineuse"
➜ L'image dépasse 15 MB
➜ Compresser l'image avant upload

### Erreur : "CORS policy"
➜ ImgBB autorise CORS par défaut
➜ Vérifier la connexion internet

### Images ne s'affichent pas
➜ Vérifier l'URL dans la console
➜ Tester l'URL dans le navigateur
➜ Vérifier que l'image a bien été uploadée

## Test

Pour tester l'upload :
1. Aller dans l'éditeur de procédure
2. Ajouter une image de couverture
3. Vérifier dans la console : "Uploading to ImgBB..."
4. L'URL doit commencer par `https://i.ibb.co/...`

## Support

En cas de problème avec ImgBB :
- Documentation : https://api.imgbb.com/
- Support : Via le site web
