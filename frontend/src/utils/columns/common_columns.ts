import { type ColumnDef } from "@tanstack/react-table";

type Entity = {
  id: number;
  name: string;
  code: string;
};

type groupEntity = {
  group_id: number;
  group_code: string;
  group_desc: string;
  is_active: string;
};
type subgroupsEntity = {
  subgroup_id: number;
  subgroup_code: string;
  subgroup_desc: string;
  category_id: number;
  is_active: string;
};


type Items = {
  groups: groupEntity[];
  subgroups: subgroupsEntity[];
  category: Entity[];
  market: Entity[];
  section: Entity[];
  weighted_item: Entity[];
  gs: Entity[];
  price_item: Entity[];
};

const commonColumns: ColumnDef<Entity>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "code", header: "Code" },
];

const columns: { [K in keyof Items]: ColumnDef<Entity>[] } = {
  groups: commonColumns,
  subgroups: commonColumns,
  category: commonColumns,
  market: commonColumns,
  section: commonColumns,
  weighted_item: commonColumns,
  gs: commonColumns,
  price_item: commonColumns,
};

export const itemsColumns = columns;
