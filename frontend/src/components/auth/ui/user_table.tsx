import React, { useEffect, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { 
 
  Edit, 
  Eye, 
  Lock, 
  Unlock, 
 
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,

  User,
  Shield,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,

} from "lucide-react";
import ViewUserModal from "./view_user_model";
import type { UserType } from "../../../api/types/user";

/* -------------------- Props -------------------- */
interface UserTableProps {
  users: UserType[];
  totalUsers: number;
  currentPage: number;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onEdit: (id: number) => void;
  onBlockToggle: (id: number) => void;
  onPageChange: (page: number) => void;
}

/* -------------------- Reusable Components -------------------- */
const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
    {active ? (
      <>
        <CheckCircle size={12} />
        <span>Active</span>
      </>
    ) : (
      <>
        <XCircle size={12} />
        <span>Inactive</span>
      </>
    )}
  </div>
);

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const roleColors: Record<string, string> = {
    admin: "bg-red-50 text-red-700 border-red-200",
    user: "bg-blue-50 text-blue-700 border-blue-200",
    compiler: "bg-green-50 text-green-700 border-green-200",
    approver: "bg-purple-50 text-purple-700 border-purple-200",
  };

  const roleIcons: Record<string, React.ReactNode> = {
    admin: <Shield size={12} />,
    user: <User size={12} />,
    compiler: <Edit size={12} />,
    approver: <CheckCircle size={12} />,
  };

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleColors[role] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {roleIcons[role]}
      <span className="capitalize">{role}</span>
    </div>
  );
};

const ActionButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
}> = ({ onClick, icon, label, variant = 'secondary', disabled = false }) => {
  const variantClasses = {
    primary: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
    secondary: 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200',
    success: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative group p-2 rounded-lg border transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
      title={label}
    >
      {icon}
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:flex">
        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {label}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      </div>
    </button>
  );
};

/* -------------------- Component -------------------- */
export default function UserTable({
  users,
  totalUsers,
  currentPage,
  searchQuery,
  onSearchChange,
  
  onEdit,
  onBlockToggle,
  onPageChange,
}: UserTableProps) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewUser, setViewUser] = useState<UserType | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  // const [showFilters, setShowFilters] = useState(false);

  /* Check table overflow for sticky headers */
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current)
        setIsOverflowing(
          containerRef.current.scrollWidth > containerRef.current.clientWidth
        );
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  /* Row selection */
  const toggleRowSelection = (userId: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedRows(newSelected);
  };

  const selectAllRows = () => {
    if (selectedRows.size === users.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(users.map(u => u.id)));
    }
  };

  /* Column definitions */
  const columns: ColumnDef<UserType>[] = [
    {
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={selectedRows.size === users.length && users.length > 0}
          onChange={selectAllRows}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedRows.has(row.original.id)}
          onChange={() => toggleRowSelection(row.original.id)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      size: 50,
    },
    {
      accessorKey: "full_name",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {row.original.first_name?.[0] || row.original.email?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {row.original.full_name || 'No name'}
            </div>
            <div className="text-xs text-gray-500 truncate">
              ID: {row.original.id}
            </div>
          </div>
        </div>
      ),
      size: 250,
    },
    {
      accessorKey: "email",
      header: "Contact",
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-900 truncate">
            <Mail size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{row.original.email}</span>
          </div>
          {row.original.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 truncate">
              <Phone size={12} className="text-gray-400 flex-shrink-0" />
              <span className="truncate">{row.original.phone}</span>
            </div>
          )}
        </div>
      ),
      size: 280,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <RoleBadge role={row.original.role || 'user'} />,
      size: 140,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <StatusBadge active={!!row.original.is_active} />,
      size: 120,
    },
    {
      accessorKey: "created_at",
      header: "Joined",
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          {row.original.created_at 
            ? new Date(row.original.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            : 'N/A'}
        </div>
      ),
      size: 140,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <ActionButton
            onClick={() => {
              setViewUser(row.original);
              setIsViewOpen(true);
            }}
            icon={<Eye size={18} />}
            label="View Details"
            variant="primary"
          />
          <ActionButton
            onClick={() => onEdit(row.original.id)}
            icon={<Edit size={18} />}
            label="Edit User"
            variant="secondary"
          />
          <ActionButton
            onClick={() => onBlockToggle(row.original.id)}
            icon={row.original.is_active ? <Lock size={18} /> : <Unlock size={18} />}
            label={row.original.is_active ? "Deactivate User" : "Activate User"}
            variant={row.original.is_active ? "danger" : "success"}
          />
        </div>
      ),
      size: 180,
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    state: { globalFilter: searchQuery },
    onGlobalFilterChange: onSearchChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  /* -------------------- UI -------------------- */
  return (
    <div className="rounded-xl border border-gray-200 shadow-sm w-full">
      

      {/* Table - Full Width */}
      <div ref={containerRef} className="w-full overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className=" border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  const stickyClass =
                    isOverflowing && (index === 0 || index === 1)
                      ? `sticky left-[${index * 200}px] z-20 bg-gray-50`
                      : "";
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: `${header.getSize()}px` }}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${stickyClass}`}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <div className="flex flex-col">
                            <ChevronUp 
                              size={12} 
                              className={`-mb-1 ${header.column.getIsSorted() === 'asc' ? 'text-blue-600' : 'text-gray-300'}`}
                            />
                            <ChevronDown 
                              size={12} 
                              className={`${header.column.getIsSorted() === 'desc' ? 'text-blue-600' : 'text-gray-300'}`}
                            />
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-gray-200">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedRows.has(row.original.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell, index) => {
                    const stickyClass =
                      isOverflowing && (index === 0 || index === 1)
                        ? `sticky left-[${index * 200}px] bg-white ${selectedRows.has(row.original.id) ? 'bg-blue-50' : ''}`
                        : "";
                    return (
                      <td
                        key={cell.id}
                        style={{ width: `${cell.column.getSize()}px` }}
                        className={`px-6 py-4 text-sm ${stickyClass}`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <User className=" mb-3" size={48} />
                    <h3 className="text-lg font-medium ">No users found</h3>
                    <p className="text-gray-600 mt-1">
                      {searchQuery 
                        ? "Try adjusting your search to find what you're looking for."
                        : "No users have been added yet."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm ">
            Showing <span className="font-medium">1-{users.length}</span> of{' '}
            <span className="font-medium">{totalUsers}</span> users
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, Math.ceil(totalUsers / 10)))].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              {Math.ceil(totalUsers / 10) > 5 && (
                <span className="px-2 text-gray-500">...</span>
              )}
            </div>
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={users.length < 10}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* View Modal */}
      <ViewUserModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        user={viewUser}
      />
    </div>
  );
}