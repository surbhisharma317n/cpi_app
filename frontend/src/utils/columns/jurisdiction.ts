export type Country = {
  id: number;
  name: string;
  code: string;
};

export type State = {
  id: number;
  name: string;
  country: string;
  code: string;
};

export type District = {
  id: number;
  name: string;
  state: string;
  code: string;
};

export type Town = {
  id: number;
  name: string;
  district: string;
  code: string;
};

export type Village = {
  id: number;
  name: string;
  district: string;
  code: string;
};

export type jurisdictionData = {
  country: Country[];
  state: State[];
  district: District[];
  town: Town[];
  village: Village[];
};
export const jurisdictionColumns = {
  country: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "code", header: "Code" },
  ],
  state: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "country", header: "Country" },
    { accessorKey: "code", header: "Code" },
  ],
  district: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "state", header: "State" },
    { accessorKey: "code", header: "Code" },
  ],
  town: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "district", header: "District" },
    { accessorKey: "code", header: "Code" },
  ],
  village: [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "district", header: "District" },
    { accessorKey: "code", header: "Code" },
  ],
};