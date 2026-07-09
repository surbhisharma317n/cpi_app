import { type ColumnDef } from "@tanstack/react-table";

export const districtColumns: ColumnDef<any>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "District Name",
  },
  {
    accessorKey: "state",
    header: "State",
  },
];
