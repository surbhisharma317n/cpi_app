import { 
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable, 
  type TableOptions 
} from '@tanstack/react-table';

export function useDataTable<TData>(options: TableOptions<TData>) {
  return useReactTable({
    ...options,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
}