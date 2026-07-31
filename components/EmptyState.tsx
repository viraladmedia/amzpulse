import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tip?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, tip, action, className = '' }) => (
  <div className={`rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 px-6 py-14 text-center ${className}`}>
    <div className="mx-auto mb-4 inline-flex rounded-full bg-slate-800/80 p-3 text-amz-accent">
      <Icon size={22} />
    </div>
    <h3 className="text-lg font-bold text-white">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">{description}</p>
    {tip && (
      <p className="mx-auto mt-3 max-w-sm rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-500">
        Tip: {tip}
      </p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-amz-accent px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-orange-500"
      >
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
