import { Badge } from '@/components/ui/badge';

export function RoleBadge({ role }: { role: string }) {
  const isDeveloper = role === 'developer';
  const isAdmin = role === 'admin';
  const isLearner = role === 'learner';

  const classes = isDeveloper
    ? 'bg-purple-500 hover:bg-purple-600 text-white'
    : isAdmin
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : isLearner
    ? 'bg-slate-700 hover:bg-slate-800 text-white'
    : 'bg-gray-500 hover:bg-gray-600 text-white';

  return (
    <Badge className={classes} variant="default">
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
