// import type { ColumnDef } from '@tanstack/react-table';

// type User = {
//   id: string;
//   name: string;
//   email: string;
//   status: 'active' | 'inactive';
// };

// export const userColumns: ColumnDef<User>[] = [
//   {
//     accessorKey: 'name',
//     header: 'Name',
//     cell: (info) => <span className="font-medium">{info.getValue<string>()}</span>,
//   },
//   {
//     accessorKey: 'email',
//     header: 'Email',
//     cell: (info) => info.getValue<string>(),
//   },
//   {
//     accessorKey: 'status',
//     header: 'Status',
//     cell: (info) => {
//       const status = info.getValue<'active' | 'inactive'>();
//       return (
//         <span
//           className={`px-2 py-1 rounded-full text-xs ${
//             status === 'active'
//               ? 'bg-green-100 text-green-800'
//               : 'bg-red-100 text-red-800'
//           }`}
//         >
//           {status.toUpperCase()}
//         </span>
//       );
//     },
//   },
// ];