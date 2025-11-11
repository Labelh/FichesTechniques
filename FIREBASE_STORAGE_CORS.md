# Configuration CORS pour Firebase Storage

## Problème
L'erreur CORS se produit lorsque votre application hébergée sur GitHub Pages (`https://labelh.github.io`) tente d'uploader des images vers Firebase Storage.

```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' from origin 'https://labelh.github.io' has been blocked by CORS policy
```

## Solution

### Méthode 1 : Configuration CORS via Google Cloud Console (Recommandée)

1. **Installer Google Cloud SDK** (si pas déjà fait)
   - Téléchargez depuis : https://cloud.google.com/sdk/docs/install
   - Installez et initialisez : `gcloud init`

2. **Créer un fichier cors.json**
   Créez un fichier `cors.json` avec ce contenu :
   ```json
   [
     {
       "origin": ["https://labelh.github.io", "http://localhost:5173", "http://localhost:4173"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

3. **Appliquer la configuration CORS**
   ```bash
   gsutil cors set cors.json gs://fichestechniques-cd97c.firebasestorage.app
   ```

4. **Vérifier la configuration**
   ```bash
   gsutil cors get gs://fichestechniques-cd97c.firebasestorage.app
   ```

### Méthode 2 : Via Firebase Console (Plus simple mais moins flexible)

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet : **fichestechniques-cd97c**
3. Allez dans **Storage** → **Rules**
4. Vérifiez que les règles autorisent l'upload :
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   ⚠️ **Note** : Ces règles sont permissives pour le développement. En production, ajoutez une authentification.

5. Pour CORS, vous devrez quand même utiliser la **Méthode 1** avec `gsutil`

### Méthode 3 : Alternative sans CORS (Temporaire)

Si vous ne pouvez pas configurer CORS immédiatement, vous pouvez stocker les images en base64 dans Firestore temporairement (NON recommandé pour la production) :

Dans `src/services/storageService.ts`, commentez l'upload Firebase et retournez la base64 directement.

## Vérification

Après avoir appliqué la configuration CORS :
1. Attendez 5-10 minutes pour la propagation
2. Videz le cache du navigateur (Ctrl+Shift+R)
3. Essayez à nouveau d'uploader une image

## Origines autorisées actuellement

Le fichier `cors.json` autorise :
- ✅ `https://labelh.github.io` (Production GitHub Pages)
- ✅ `http://localhost:5173` (Développement Vite)
- ✅ `http://localhost:4173` (Preview Vite)

## Commandes utiles

### Voir la configuration CORS actuelle
```bash
gsutil cors get gs://fichestechniques-cd97c.firebasestorage.app
```

### Supprimer la configuration CORS
```bash
gsutil cors set cors.json gs://fichestechniques-cd97c.firebasestorage.app
# Avec un fichier vide : []
```

### Lister les buckets
```bash
gsutil ls
```

## Troubleshooting

### Erreur : gsutil command not found
➜ Installez Google Cloud SDK : https://cloud.google.com/sdk/docs/install

### Erreur : AccessDeniedException
➜ Authentifiez-vous : `gcloud auth login`

### CORS toujours bloqué après configuration
➜ Vérifiez que vous avez bien utilisé le bon bucket name
➜ Attendez 10 minutes et videz le cache

## Sécurité en Production

⚠️ **IMPORTANT** : Les règles actuelles permettent à n'importe qui de lire/écrire.

Pour la production, modifiez les règles Storage :
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /procedures/{procedureId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;  // Authentification requise
    }
  }
}
```

## Support

Si vous continuez à avoir des problèmes :
1. Vérifiez les logs Firebase Console
2. Testez d'abord en local (localhost devrait fonctionner)
3. Vérifiez que votre API Key est correcte dans `.env`
