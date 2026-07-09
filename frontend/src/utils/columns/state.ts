import { type ColumnDef } from "@tanstack/react-table";

export const stateColumns: ColumnDef<any>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "State Name",
  },
  {
    accessorKey: "country",
    header: "Country",
  },
];
