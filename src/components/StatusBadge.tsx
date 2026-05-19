import React from 'react';
import { cn } from '@/src/lib/utils';

export type AssemblyStatus = 'agendada' | 'em andamento' | 'concluída' | 'pendência' | 'reagendada';

interface StatusBadgeProps {
  status: AssemblyStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const styles = {
    'agendada': 'bg-blue-50 text-blue-600 border-blue-100',
    'em andamento': 'bg-indigo-50 text-indigo-600 border-indigo-100',
    'concluída': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'pendência': 'bg-red-50 text-red-600 border-red-100',
    'reagendada': 'bg-amber-50 text-amber-600 border-amber-100',
  };

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={cn(
      "text-[7px] md:text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-[0.15em] border leading-none shrink-0",
      styles[status] || 'bg-slate-50 text-slate-600 border-slate-100',
      className
    )}>
      {label}
    </span>
  );
};
