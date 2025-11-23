import { useState } from 'react';
import { Download, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { exportDatabase, resetDatabase } from '@/db/database';
import { downloadFile } from '@/lib/utils';
import { toast } from 'sonner';
import { migrateAllImagesToImgBB, countFirebaseImages } from '@/utils/imageMigration';

export default function Settings() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [firebaseImageCount, setFirebaseImageCount] = useState<number | null>(null);

  const handleExport = async () => {
    try {
      const data = await exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      downloadFile(blob, `fiches-techniques-backup-${Date.now()}.json`);
      toast.success('Données exportées avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.'
      )
    ) {
      return;
    }

    try {
      await resetDatabase();
      toast.success('Base de données réinitialisée');
      window.location.reload();
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  const handleCheckFirebaseImages = async () => {
    try {
      toast.info('Vérification en cours...');
      const count = await countFirebaseImages();
      setFirebaseImageCount(count.total);

      if (count.total === 0) {
        toast.success('Aucune image Firebase trouvée. Toutes les images utilisent ImgBB!');
      } else {
        toast.warning(`${count.total} images Firebase trouvées à migrer`);
      }
    } catch (error) {
      console.error('Error counting Firebase images:', error);
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleMigrateImages = async () => {
    if (
      !confirm(
        'Cette opération va télécharger toutes les images Firebase et les ré-uploader vers ImgBB. Cela peut prendre du temps. Continuer ?'
      )
    ) {
      return;
    }

    setIsMigrating(true);
    try {
      toast.info('Migration en cours... Veuillez patienter');

      const stats = await migrateAllImagesToImgBB((progress) => {
        setMigrationStats(progress);
      });

      setMigrationStats(stats);

      if (stats.errors.length > 0) {
        toast.warning(`Migration terminée avec ${stats.errors.length} erreurs`);
      } else {
        toast.success(`Migration réussie! ${stats.migratedImages} images migrées`);
      }

      // Recompter après migration
      await handleCheckFirebaseImages();
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Erreur lors de la migration');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Paramètres
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configurez votre application
        </p>
      </div>

      {/* Migration des images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Migration des images
          </CardTitle>
          <CardDescription>
            Migrer les anciennes images Firebase vers ImgBB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Vérifier les images Firebase</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Vérifiez combien d'images utilisent encore Firebase Storage
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={handleCheckFirebaseImages} variant="secondary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Vérifier
              </Button>
              {firebaseImageCount !== null && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {firebaseImageCount === 0 ? (
                    <span className="text-green-600 dark:text-green-400">✅ Aucune image Firebase</span>
                  ) : (
                    <span className="text-orange-600 dark:text-orange-400">
                      ⚠️ {firebaseImageCount} images à migrer
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {firebaseImageCount !== null && firebaseImageCount > 0 && (
            <div className="pt-4 border-t border-[#323232]">
              <h4 className="font-medium mb-2">Lancer la migration</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Télécharger et ré-uploader toutes les images vers ImgBB
              </p>
              <Button
                onClick={handleMigrateImages}
                disabled={isMigrating}
                className="relative"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isMigrating ? 'animate-spin' : ''}`} />
                {isMigrating ? 'Migration en cours...' : 'Migrer vers ImgBB'}
              </Button>

              {migrationStats && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
                  <div className="font-medium mb-2">Statistiques de migration:</div>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li>• Procédures: {migrationStats.migratedProcedures}/{migrationStats.totalProcedures}</li>
                    <li>• Phases: {migrationStats.migratedPhases}/{migrationStats.totalPhases}</li>
                    <li>• Images: {migrationStats.migratedImages}/{migrationStats.totalImages}</li>
                    {migrationStats.errors.length > 0 && (
                      <li className="text-red-600 dark:text-red-400">
                        • Erreurs: {migrationStats.errors.length}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Données */}
      <Card>
        <CardHeader>
          <CardTitle>Données</CardTitle>
          <CardDescription>
            Gérez vos données et sauvegardes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Exporter les données</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Exportez toutes vos procédures et données en JSON
            </p>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>

          <div className="pt-4 border-t border-[#323232]">
            <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">
              Zone de danger
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Réinitialisez toutes les données de l'application
            </p>
            <Button variant="destructive" onClick={handleReset}>
              <Trash2 className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>À propos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Fiches Techniques v1.0.0
            <br />
            Application de génération de procédures techniques
            <br />
            Développée avec React, TypeScript et Dexie.js
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
