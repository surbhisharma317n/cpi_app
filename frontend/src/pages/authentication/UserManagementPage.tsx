import { useEffect, useState, useCallback, useMemo } from "react";
import {
  FaPlus,
  FaUserCheck,
  FaUserTimes,
  FaSearch,
  FaFilter,
  FaSync,
  FaEdit,
} from "react-icons/fa";
import {
  Users,
  Shield,
  KeyRound,
  Bell,
  Download,
  XCircle,
  UserPlus,
} from "lucide-react";

import type { Field } from "../../components/auth/ui/model_wrapper";
import UserTable from "../../components/auth/ui/user_table";
import ModalWrapper from "../../components/auth/ui/model_wrapper";

import UpdateRoleModal from "../../components/auth/ui/update_role_model";

import { useAppDispatch, useAppSelector } from "../../app/store";
import { fetchSidebar } from "../../features/base_item/sidebarSlice";

import { userService } from "../../api/endpoints/user";
import type { AddUserPayload, User as ApiUser } from "../../api/types/user";

// Define role-permission mapping
type RolePermissionMapping = {
  [roleId: string]: string[];
};

// Role-Permission Mapping Configuration
const rolePermissionMappings: RolePermissionMapping = {
  admin: [
    "read_users",
    "edit_users",
    "delete_users",
    "create_users",
    "manage_settings",
    "view_analytics",
    "manage_roles",
    "export_data",
  ],
  user: ["read_users", "view_dashboard"],
  compiler: ["read_posts", "create_posts", "edit_own_posts", "upload_files"],
  approver: [
    "read_posts",
    "edit_posts",
    "delete_posts",
    "read_users",
    "approve_content",
  ],
};

// Function to get permissions for a specific role
const getPermissionsForRole = (roleId: string): string[] => {
  const normalizedRoleId = roleId.toLowerCase();
  return rolePermissionMappings[normalizedRoleId] || [];
};

// Helper functions defined at module level (outside component)
const getRoleDescription = (roleId: string): string => {
  const descriptions: Record<string, string> = {
    admin: "Full system access and administrative privileges",
    user: "Basic access with limited permissions",
    compiler: "Can create and manage content",
    approver: "Can review and approve content submissions",
  };
  return descriptions[roleId] || "User role";
};

const getRoleColor = (roleId: string): string => {
  const colors: Record<string, string> = {
    admin: "bg-red-500",
    user: "bg-blue-500",
    compiler: "bg-green-500",
    approver: "bg-purple-500",
  };
  return colors[roleId] || "";
};

// Permission data structure
const permissions = [
  // User Management
  {
    id: "read_users",
    name: "View Users",
    category: "User Management",
    description: "Access to view all users",
  },
  {
    id: "edit_users",
    name: "Edit Users",
    category: "User Management",
    description: "Modify user information",
  },
  {
    id: "delete_users",
    name: "Delete Users",
    category: "User Management",
    description: "Remove users from system",
  },
  {
    id: "create_users",
    name: "Create Users",
    category: "User Management",
    description: "Add new users to system",
  },

  // Content Management
  {
    id: "read_posts",
    name: "View Content",
    category: "Content Management",
    description: "Access to view all content",
  },
  {
    id: "edit_posts",
    name: "Edit Content",
    category: "Content Management",
    description: "Modify existing content",
  },
  {
    id: "create_posts",
    name: "Create Content",
    category: "Content Management",
    description: "Create new content entries",
  },
  {
    id: "delete_posts",
    name: "Delete Content",
    category: "Content Management",
    description: "Remove content from system",
  },
  {
    id: "edit_own_posts",
    name: "Edit Own Content",
    category: "Content Management",
    description: "Edit only content created by user",
  },
  {
    id: "approve_content",
    name: "Approve Content",
    category: "Content Management",
    description: "Approve or reject content submissions",
  },

  // System Management
  {
    id: "manage_settings",
    name: "System Settings",
    category: "System Administration",
    description: "Configure system settings",
  },
  {
    id: "view_analytics",
    name: "View Analytics",
    category: "System Administration",
    description: "Access analytics dashboard",
  },
  {
    id: "manage_roles",
    name: "Manage Roles",
    category: "System Administration",
    description: "Configure user roles and permissions",
  },
  {
    id: "export_data",
    name: "Export Data",
    category: "System Administration",
    description: "Export system data",
  },
  {
    id: "view_dashboard",
    name: "View Dashboard",
    category: "System Administration",
    description: "Access main dashboard",
  },
  {
    id: "upload_files",
    name: "Upload Files",
    category: "System Administration",
    description: "Upload files to system",
  },
];

export default function UserManagementPage() {
  const dispatch = useAppDispatch();
  const { error: sidebarError } = useAppSelector((state) => state.sidebar);

  // States
  // ✅ add here (with other states)
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    recent: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddPermissionModalOpen, setIsAddPermissionModalOpen] =
    useState(false);
  const [editModalUserId, setEditModalUserId] = useState<number | null>(null);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();

      setUsers((data as any)?.data || []);
      calculateStats((data as any)?.data || []);
      setErrors(null);
    } catch (err) {
      setErrors(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = useCallback((userData: ApiUser[]) => {
    const total = userData.length;
    const active = userData.filter((u) => u.is_active).length;
    const inactive = total - active;
    const admins = userData.filter((u) => u.role === "admin").length;
    const recent = userData.filter((_) => {
      // Assuming user has a created_at field, adjust as needed

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      // return new Date(u.created_at) > weekAgo;
      return true; // Placeholder
    }).length;

    setStats({ total, active, inactive, admins, recent });
  }, []);

  // ✅ add handleRefresh here
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    fetchUsers();
    dispatch(fetchSidebar());
  }, [fetchUsers, dispatch]);

  // Fields for Add/Edit User
  const userFields: Field[] = [
    {
      name: "email",
      label: "Email Address",
      type: "email",
      required: true,
      placeholder: "user@example.com",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "••••••••",
    },
    {
      name: "first_name",
      label: "First Name",
      type: "text",
      required: true,
      placeholder: "John",
    },
    {
      name: "middle_name",
      label: "Middle Name",
      type: "text",
      placeholder: "Optional",
    },
    {
      name: "last_name",
      label: "Last Name",
      type: "text",
      required: true,
      placeholder: "Doe",
    },
    {
      name: "phone",
      label: "Mobile Number",
      type: "tel",
      required: true,
      placeholder: "+1234567890",
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { label: "PSD Administrator", value: "admin" },
        { label: "PSD User", value: "user" },
        { label: "Index Compiler", value: "compiler" },
        { label: "Index Approver", value: "approver" },
      ],
    },
    {
      name: "department",
      label: "Department",
      type: "select",
      options: [
        { label: "PSD", value: "admin" },
        // { label: "Content", value: "content" },
        // { label: "IT", value: "it" },
        // { label: "HR", value: "hr" },
        // { label: "Finance", value: "finance" },
      ],
    },
  ];

  // Prepare roles with their permissions - Moved below helper functions
  const roles = useMemo(() => {
    return (
      userFields
        .find((f) => f.name === "role")
        ?.options?.map((opt) => ({
          id: opt.value,
          name: opt.label,
          permissions: getPermissionsForRole(opt.value),
          description: getRoleDescription(opt.value), // Now this function is defined
          color: getRoleColor(opt.value), // Now this function is defined
        })) || []
    );
  }, [userFields]);

  // Filtered users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? user.is_active : !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  /** ===============================
   *  Handlers
   *  =============================== */
  const handleAddUser = useCallback(
    (data: any) => {
      const newUser: AddUserPayload = {
        username: data.email.split("@")[0],
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        phone: data.phone,
        role: data.role,
        full_name: `${data.first_name} ${data.middle_name || ""} ${data.last_name}`,
      };

      userService
        .addUser(newUser)
        .then((addedUser) => {
          setUsers((prev) => [...prev, addedUser]);
          calculateStats([...users, addedUser]);
          setIsAddUserModalOpen(false);
        })
        .catch((err) =>
          setErrors(err instanceof Error ? err.message : "Failed to add user")
        );
    },
    [users, calculateStats]
  );

  const handleEditUser = useCallback(
    async (formData: any) => {
      if (!editModalUserId) return;

      try {
        const existingUser = await userService.getUserById(
          editModalUserId.toString()
        );

        const payload: Partial<ApiUser> = {
          email: formData.email || existingUser.email,
          first_name: formData.first_name || existingUser.first_name,
          middle_name: formData.middle_name || existingUser.middle_name,
          last_name: formData.last_name || existingUser.last_name,
          phone: formData.phone || existingUser.phone,
          role: formData.role || existingUser.role,
        };

        const updatedUser = await userService.updateUser(
          editModalUserId.toString(),
          payload
        );

        const updatedUsers = users.map((u) =>
          u.id === editModalUserId ? updatedUser : u
        );
        setUsers(updatedUsers);
        calculateStats(updatedUsers);
        setEditModalUserId(null);
      } catch (err) {
        setErrors(err instanceof Error ? err.message : "Failed to update user");
      }
    },
    [editModalUserId, users, calculateStats]
  );

  const handleUpdateRolePermissions = useCallback(
    async (changes: any[]) => {
      try {
        setLoading(true);

        // Process each change
        for (const change of changes) {
          const { userId, roleId, permissions } = change;

          if (roleId) {
            await userService.updateUser(userId.toString(), { role: roleId });
          }

          if (permissions && permissions.length > 0) {
            console.log(
              `Updating permissions for user ${userId}:`,
              permissions
            );
          }
        }

        await fetchUsers();
      } catch (err) {
        setErrors(
          err instanceof Error
            ? err.message
            : "Failed to update roles/permissions"
        );
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers]
  );

  const handleBlockToggle = useCallback(
    async (id: number) => {
      try {
        const user = users.find((u) => u.id === id);
        if (!user) return;

        const updatedUser = await userService.updateUser(id.toString(), {
          is_active: !user.is_active,
        });

        const updatedUsers = users.map((u) => (u.id === id ? updatedUser : u));
        setUsers(updatedUsers);
        calculateStats(updatedUsers);
      } catch (err) {
        setErrors(
          err instanceof Error ? err.message : "Failed to update user status"
        );
      }
    },
    [users, calculateStats]
  );

  const handleExportUsers = useCallback(() => {
    // Implement export logic
    console.log("Exporting users...");
  }, []);

  // const handleBulkAction = useCallback((action: string) => {
  //   // Implement bulk actions
  //   console.log(`Bulk action: ${action}`);
  // }, []);

  /** ===============================
   *  UI
   *  =============================== */

  return (
    <div className="min-h-screen  p-2">
      {/* Header */}

      <div className="mb-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between  rounded-2xl border border-gray-200 px-6 py-4 shadow-sm">
          {/* Left */}
          <div>
            <h1 className="text-2xl font-semibold  tracking-tight">
              {" "}
              User Management
            </h1>
            <p className="text-sm text-gray-500">
              Manage user accounts, roles and permissions
            </p>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5  border border-gray-200 rounded-xl hover:bg-blue-50 transition shadow-sm"
            >
              <FaSync className={`${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {/* Export */}
            <button
              onClick={handleExportUsers}
              className="
                flex items-center gap-2 px-5 py-2.5
                bg-gradient-to-r from-indigo-600 to-blue-600
                 rounded-xl
                shadow-md hover:shadow-xl
                transition-all duration-300
                active:scale-95
              "
            >
              <Download size={18} />
              Export Data
            </button>
          </div>
        </div>

        {/*----------------------------------------------------------------------------------------------------------------------*/}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {/* Total Users */}

          <div
            className="group relative overflow-hidden
            backdrop-blur-lg bg-gradient-to-br from-blue-50 via-white to-blue-100
            border border-blue-200
            rounded-2xl p-5
            shadow-sm hover:shadow-xl
            transition-all duration-300
            hover:-translate-y-1 hover:border-blue-400"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl shadow-md">
                <Users size={15} />
              </div>
              {/* Text Section */}
              <div>
                {/* <p className="text-sm font-medium text-blue-500 tracking-wide uppercase">
        Total
      </p> */}
                <p
                  className="text-sm font-medium text-blue-500 
                              tracking-wide uppercase 
                              transition-all duration-200 
                              group-hover:text-blue-700"
                >
                  Total
                </p>
                <h3 className="text-3xl font-bold text-blue-700 group-hover:text-blue-800 transition-colors">
                  {stats.total}
                </h3>
              </div>
            </div>
            {/* Soft Glow Effect */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-200 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-all"></div>
          </div>

          {/* Active Users */}

          <div
            className="group relative overflow-hidden backdrop-blur-lg bg-gradient-to-br from-green-50
          via-white to-green-100 border border-green-200 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-green-400"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 bg-gradient-to-br from-green-600 to-green-800  rounded-xl shadow-md">
                <FaUserCheck size={15} />{" "}
              </div>
              {/* Text Section */}
              <div>
                <p
                  className="text-sm font-medium text-green-500 
                  tracking-wide uppercase 
                  transition-all duration-200 
                  group-hover:text-green-700"
                >
                  Active
                </p>
                <h3 className="text-3xl font-bold text-green-700 group-hover:text-green-800 transition-colors">
                  {" "}
                  {stats.active}{" "}
                </h3>
              </div>
            </div>
            {/* Soft Glow Effect */}
            <div
              className="absolute -top-10 -right-10 w-24 h-24
          bg-green-200 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-all"
            ></div>{" "}
          </div>

          {/* Administrators */}

          <div
            className="group relative overflow-hidden
              backdrop-blur-lg bg-gradient-to-br from-purple-50 via-white to-purple-100
              border border-purple-200
              rounded-2xl p-5
              shadow-sm hover:shadow-xl
              transition-all duration-200
              hover:-translate-y-1 hover:border-purple-400"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-800  rounded-xl shadow-md">
                <Shield size={15} />
              </div>
              {/* Text Section */}
              <div>
                {/* <p className="text-sm font-medium text-purple-500 tracking-wide uppercase">
        Admin
      </p> */}

                <p
                  className="text-sm font-medium text-purple-500 
                    tracking-wide uppercase 
                    transition-all duration-200 
                    group-hover:text-purple-700"
                >
                  Admin
                </p>

                <h3 className="text-3xl font-bold text-purple-700 group-hover:text-purple-800 transition-colors">
                  {stats.admins}
                </h3>
              </div>
            </div>
            {/* Soft Glow Effect */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-200 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-all"></div>
          </div>

          {/* Recent Users */}

          <div
            className="group relative overflow-hidden
              backdrop-blur-lg bg-gradient-to-br from-orange-50 via-white to-orange-100
              border border-orange-200
              rounded-2xl p-5
              shadow-sm hover:shadow-xl
              transition-all duration-200
              hover:-translate-y-1 hover:border-orange-400"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 bg-gradient-to-br from-orange-600 to-orange-800 text-white rounded-xl shadow-md">
                <UserPlus size={15} />
              </div>
              {/* Text Section */}
              <div>
                <p
                  className="text-sm font-medium text-orange-500 
                            tracking-wide uppercase 
                            transition-all duration-200 
                            group-hover:text-orange-700"
                >
                  Recent
                </p>
                <h3 className="text-3xl font-bold text-orange-700 group-hover:text-orange-800 transition-colors">
                  {stats.recent}
                </h3>
              </div>
            </div>
            {/* Soft Glow Effect */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-200 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-all"></div>
          </div>

          {/* Inactive Users */}

          <div
            className="group relative overflow-hidden
                    backdrop-blur-lg bg-gradient-to-br from-red-50 via-white to-red-100
                    border border-red-200
                    rounded-2xl p-5
                    shadow-sm hover:shadow-xl
                    transition-all duration-200
                    hover:-translate-y-1 hover:border-red-400"
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="p-3 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl shadow-md">
                <FaUserTimes size={15} />
              </div>

              {/* Text Section */}
              <div>
                {/* <p className="text-sm font-medium text-red-500 tracking-wide uppercase">
        Inactive Users
      </p> */}
                <p
                  className="text-sm font-medium text-red-500 
                              tracking-wide uppercase 
                              transition-all duration-200 
                              group-hover:text-red-700"
                >
                  Inactive
                </p>
                <h3 className="text-3xl font-bold text-red-700 group-hover:text-red-800 transition-colors">
                  {stats.inactive}
                </h3>
              </div>
            </div>

            {/* Soft Glow Effect */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-200 opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-all"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className=" rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 lg:flex-initial lg:w-80">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex items-center space-x-2">
                <FaFilter className="text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border text-gray-500 border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Administrator</option>
                  <option value="user">PSD User</option>
                  <option value="compiler">Compiler</option>
                  <option value="approver">Approver</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border text-gray-500 border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <p className="text-sm text-gray-600">
                {filteredUsers.length} users
                {filteredUsers.length !== users.length && (
                  <span className="text-gray-400 ml-1">
                    (filtered from {users.length})
                  </span>
                )}
                +
              </p>

              <button
                onClick={() => setIsAddPermissionModalOpen(true)}
                className="flex items-center px-4 py-2.5 bg-[#f79a1b] text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
              >
                <KeyRound className="mr-2" size={18} />
                <span className="font-medium">Manage Access</span>
              </button>

              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="flex items-center px-4 py-2.5 bg-[#da6c78] text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
              >
                <FaPlus className="mr-2" />
                <span className="font-medium">Add User</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading & Errors */}
        {loading && (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        )}

        {errors && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <XCircle className="text-red-500 mr-3" />
              <span className="text-red-700">{errors}</span>
            </div>
          </div>
        )}

        {sidebarError && (
          <div className="m-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center">
              <Bell className="text-yellow-500 mr-3" />
              <span className="text-yellow-700">{sidebarError}</span>
            </div>
          </div>
        )}

        {/* Users Table */}
        {!loading && !errors && (
          <div className="overflow-hidden">
            <UserTable
              users={filteredUsers}
              totalUsers={filteredUsers.length}
              currentPage={currentPage}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearchSubmit={(e) => e.preventDefault()}
              onEdit={setEditModalUserId}
              onBlockToggle={handleBlockToggle}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <Users className="mx-auto text-gray-300" size={64} />
            <h3 className="mt-6 text-xl font-semibold text-gray-900">
              No users found
            </h3>
            <p className="mt-2 text-gray-600 max-w-md mx-auto">
              {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search or filters to find what you're looking for."
                : "No users have been added yet. Start by adding your first user."}
            </p>
            {!searchQuery && roleFilter === "all" && statusFilter === "all" && (
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="mt-6 inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
              >
                <FaPlus className="mr-2" />
                Add First User
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ModalWrapper
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add New User"
        subtitle="Fill in the user details below to add a new user to the system"
        fields={userFields}
        columns={2}
        submitLabel="Create User"
        cancelLabel="Cancel"
        onSubmit={handleAddUser}
        maxWidth="max-w-4xl"
        icon={<UserPlus className="text-blue-600" size={24} />}
      />

      {editModalUserId && (
        <ModalWrapper
          isOpen={!!editModalUserId}
          onClose={() => setEditModalUserId(null)}
          title="Edit User"
          subtitle="Update user information and permissions"
          fields={userFields.filter((f) => f.name !== "password")}
          columns={2}
          submitLabel="Update User"
          cancelLabel="Cancel"
          onSubmit={handleEditUser}
          defaultValues={users.find((u) => u.id === editModalUserId) || {}}
          maxWidth="max-w-4xl"
          icon={<FaEdit className="text-blue-600" size={24} />}
        />
      )}

      <UpdateRoleModal
        isOpen={isAddPermissionModalOpen}
        onClose={() => setIsAddPermissionModalOpen(false)}
        users={users}
        roles={roles}
        permissions={permissions}
        onSubmit={handleUpdateRolePermissions}
      />
    </div>
  );
}
