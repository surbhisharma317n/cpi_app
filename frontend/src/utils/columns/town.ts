import { type ColumnDef } from "@tanstack/react-table";

export const townColumns: ColumnDef<any>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Town Name",
  },
  {
    accessorKey: "district",
    header: "District",
  },
];
