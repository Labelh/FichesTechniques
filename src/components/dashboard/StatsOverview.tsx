import { Card, CardContent } from '@/components/ui/Card';

interface StatsOverviewProps {
  stats: any;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  if (!stats) return null;

  const statItems = [
    {
      label: 'Total Procédures',
      value: stats.total,
    },
    {
      label: 'En cours',
      value: stats.byStatus?.in_progress || 0,
    },
    {
      label: 'Terminées',
      value: stats.byStatus?.completed || 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-6">
            <div>
              <p className="text-sm font-medium text-gray-400">
                {item.label}
              </p>
              <p className="text-3xl font-bold text-white mt-2">
                {item.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
