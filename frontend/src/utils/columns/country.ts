import { type ColumnDef } from "@tanstack/react-table";

export const countryColumns: ColumnDef<any>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Country Name",
  },
  {
    accessorKey: "code",
    header: "Country Code",
  },
];
