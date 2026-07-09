// components/ui2/table/TableEmpty.tsx
import React from 'react';
import { cn } from './utils';
import { FiDatabase } from 'react-icons/fi';

interface TableEmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const TableEmpty: React.FC<TableEmptyProps> = ({
  title = 'No data found',
  description = 'There is no data to display at the moment.',
  icon = <FiDatabase className="h-12 w-12" />,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center',
        'border border-gray-200 rounded-lg bg-white',
        className
      )}
    >
      <div className="mb-4 text-gray-400">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};