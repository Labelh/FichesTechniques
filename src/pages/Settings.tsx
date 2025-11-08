import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { exportDatabase, resetDatabase } from '@/db/database';
import { downloadFile } from '@/lib/utils';
import { toast } from 'sonner';

export default function Settings() {

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

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
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
