import { useQuery } from '@tanstack/react-query';
import { FileText, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

interface ListReferenceCardProps {
  listId: number;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'text-yellow-500',
    downloading: 'text-blue-500',
    completed: 'text-terminal-green',
    partial: 'text-orange-500',
    failed: 'text-red-500',
  };
  return colors[status] || 'text-gray-500';
};

export function ListReferenceCard({ listId }: ListReferenceCardProps) {
  const navigate = useNavigate();

  const { data: list, isLoading, isError } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => api.getList(listId),
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 my-1 rounded bg-dark-600/50 border border-dark-500 text-[11px] font-mono text-gray-500">
        Loading list...
      </div>
    );
  }

  if (isError || !list) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 my-1 rounded bg-dark-600/50 border border-dark-500 text-[11px] font-mono text-gray-500">
        <AlertCircle className="w-3 h-3" />
        List unavailable
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 my-1 rounded bg-dark-600/80 border border-dark-500 hover:border-terminal-green/50 transition-colors cursor-pointer group"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/lists/${listId}`);
      }}
    >
      {/* List icon */}
      <div className="w-8 h-8 rounded bg-dark-500 flex items-center justify-center flex-shrink-0">
        <FileText className="w-3 h-3 text-gray-600" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs text-gray-200 truncate max-w-[180px]">
          {list.name}
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-gray-500">
          <span>{list.total_items} items</span>
          <span className={`font-bold ${getStatusColor(list.status)}`}>
            {list.status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
