import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <FileQuestion className="h-24 w-24 text-gray-400 mb-6" />
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
        404
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
        Page introuvable
      </p>
      <Link to="/">
        <Button size="lg">Retour à l'accueil</Button>
      </Link>
    </div>
  );
}
