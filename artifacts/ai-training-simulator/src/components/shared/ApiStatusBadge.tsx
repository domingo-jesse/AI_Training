import { Badge } from '@/components/ui/badge';
import { useGetHealth } from '@workspace/api-client-react';
import { Activity } from 'lucide-react';

export function ApiStatusBadge() {
  const { data: health, isError } = useGetHealth();

  if (isError || health?.status !== 'ok') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1.5 px-2 py-0.5 shadow-xs">
        <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
        Offline
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1.5 px-2 py-0.5 shadow-xs" variant="outline">
      <Activity className="w-3.5 h-3.5" />
      API Online
    </Badge>
  );
}
