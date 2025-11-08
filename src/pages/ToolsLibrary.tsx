import { Wrench } from 'lucide-react';

export default function ToolsLibrary() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bibliothèque d'outils
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gérez vos outils et équipements
        </p>
      </div>

      <div className="text-center py-12">
        <Wrench className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Fonctionnalité en cours de développement
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          La bibliothèque d'outils sera bientôt disponible
        </p>
      </div>
    </div>
  );
}
