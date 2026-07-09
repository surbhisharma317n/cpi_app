// import { useEffect, useState, useCallback } from "react";
// import { FaPlus } from "react-icons/fa";

// import type { Field } from "../../components/auth/ui/model_wrapper";
// import UserTable from "../../components/auth/ui/user_table";
// import ModalWrapper from "../../components/auth/ui/model_wrapper";
// import RoleManagementForm from "../../components/auth/ui/manage_access";
// import UpdateRoleModal from "../../components/auth/ui/update_role_model";

// import { useAppDispatch, useAppSelector } from "../../app/store";
// import { fetchSidebar } from "../../features/base_item/sidebarSlice";

// import { userService } from "../../api/endpoints/user";
// import type { AddUserPayload, User } from "../../api/types/user";

// export default function UserManagementPage() {
//   const dispatch = useAppDispatch();

//   // Store
//   const { baseData, error: sidebarError } =
//     useAppSelector((state) => state.sidebar);

//   // States
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [errors, setErrors] = useState<string | null>(null);

//   const [currentPage, setCurrentPage] = useState(1);
//   const [searchQuery, setSearchQuery] = useState("");

//   // Modals
//   const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
//   const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
//   const [isAddPermissionModalOpen, setIsAddPermissionModalOpen] =
//     useState(false);
//   const [editModalUserId, setEditModalUserId] = useState<number | null>(null);

//   const totalUsers = users.length;

//   // Fetch Users
//   const fetchUsers = useCallback(async () => {
//     try {
//       setLoading(true);
//       const data = await userService.getUsers();
//       setUsers(data);
//       setErrors(null);
//     } catch (err) {
//       setErrors(err instanceof Error ? err.message : "Failed to fetch users");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchUsers();
//     dispatch(fetchSidebar());
//   }, [fetchUsers, dispatch]);

//   // Fields for Add/Edit User
//   const userFields: Field[] = [
//     { name: "email", label: "Email", type: "email", required: true },
//     { name: "password", label: "Password", type: "password", required: true },
//     { name: "first_name", label: "First Name", type: "text", required: true },
//     { name: "middle_name", label: "Middle Name", type: "text" },
//     { name: "last_name", label: "Last Name", type: "text", required: true },
//     { name: "phone", label: "Mobile Number", type: "tel", required: true },
//     {
//       name: "role",
//       label: "Role",
//       type: "select",
//       required: true,
//       options: [
//         { label: "PSD Admin", value: "admin" },
//         { label: "PSD User", value: "user" },
//         { label: "Compiler", value: "compiler" },
//         { label: "Approver", value: "approver" },
        
//       ],
//     },
//   ];

//   /** ===============================
//    *  Handlers
//    *  =============================== */
//   const handleAddUser = useCallback((data: any) => {
//     const newUser: AddUserPayload = {
//       username: data.email.split("@")[0],
//       email: data.email,
//       password: data.password,
//       first_name: data.first_name,
//       middle_name: data.middle_name,
//       last_name: data.last_name,
//       phone: data.phone,
//       role: data.role,
//       full_name: `${data.first_name} ${data.middle_name || ""} ${
//         data.last_name
//       }`,
//     };

//     userService
//       .addUser(newUser)
//       .then((addedUser) => {
//         setUsers((prev) => [...prev, addedUser]);
//         setIsAddUserModalOpen(false);
//       })
//       .catch((err) =>
//         setErrors(err instanceof Error ? err.message : "Failed to add user")
//       );
//   }, []);

//   const handleEditUser = useCallback(
//     async (formData: any) => {
//       if (!editModalUserId) return;

//       try {
//         const existingUser = await userService.getUserById(
//           editModalUserId.toString()
//         );

//         const payload: Partial<User> = {
//           email: formData.email || existingUser.email,
//           first_name: formData.first_name || existingUser.first_name,
//           middle_name: formData.middle_name || existingUser.middle_name,
//           last_name: formData.last_name || existingUser.last_name,
//           phone: formData.phone || existingUser.phone,
//           role: formData.role || existingUser.role,
//         };

//         const updatedUser = await userService.updateUser(
//           editModalUserId.toString(),
//           payload
//         );

//         setUsers((prev) =>
//           prev.map((u) => (u.id === editModalUserId ? updatedUser : u))
//         );
//         setEditModalUserId(null);
//       } catch (err) {
//         setErrors(
//           err instanceof Error ? err.message : "Failed to update user"
//         );
//       }
//     },
//     [editModalUserId]
//   );

//   // Example permission structure
// const permissions = [
//   { id: "read_users", name: "Read Users", category: "Users", description: "Can view user list" },
//   { id: "edit_users", name: "Edit Users", category: "Users", description: "Can modify user data" },
//   { id: "read_posts", name: "Read Posts", category: "Content", description: "Can view blog posts" },
//   { id: "create_posts", name: "Create Posts", category: "Content", description: "Can create new posts" },
//   { id: "delete_posts", name: "Delete Posts", category: "Content", description: "Can remove posts" },
//   { id: "manage_settings", name: "Manage Settings", category: "System", description: "Can change system settings" },
// ];

// // Example with roles having permissions
// const roles = userFields
//   .find((f) => f.name === "role")
//   ?.options?.map((opt) => ({ 
//     id: opt.value, 
//     name: opt.label,
//     permissions: getPermissionsForRole(opt.value) // Function to get role permissions
//   })) || [];

//   const handleBlockToggle = useCallback((id: number) => {
//     setUsers((prev) =>
//       prev.map((u) => (u.id === id ? { ...u, is_active: !u.is_active } : u))
//     );
//   }, []);

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault();
//     console.log("Searching:", searchQuery);
//   };

//   /** ===============================
//    *  UI
//    *  =============================== */

//   return (
//     <div className="p-3 rounded-xl shadow-lg">
//       <div className="flex justify-between items-center mb-4">
//         <h1 className="text-2xl font-semibold">User Management</h1>

//         <div className="flex space-x-4">
//           {/* <button
//             onClick={() => setIsAccessModalOpen(true)}
//             className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center"
//           >
//             <FaPlus className="mr-2" /> Manage Access
//           </button> */}

//           <button
//             onClick={() => setIsAddPermissionModalOpen(true)}
//             className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center"
//           >
//             <FaPlus className="mr-2" /> Add Permission
//           </button>

//           <button
//             onClick={() => setIsAddUserModalOpen(true)}
//             className="bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 rounded-md flex items-center"
//           >
//             <FaPlus className="mr-2" /> Add User
//           </button>
//         </div>
//       </div>

//       {/* Loading & Errors */}
//       {loading && <p className="text-blue-600">Loading users...</p>}
//       {errors && <p className="text-red-600">{errors}</p>}
//       {sidebarError && <p className="text-red-600">{sidebarError}</p>}

//       {/* Table */}
//       <UserTable
//         users={users}
//         totalUsers={totalUsers}
//         currentPage={currentPage}
//         searchQuery={searchQuery}
//         onSearchChange={setSearchQuery}
//         onSearchSubmit={handleSearch}
//         onEdit={setEditModalUserId}
//         onBlockToggle={handleBlockToggle}
//         onPageChange={setCurrentPage}
//       />

//       {/* Add User Modal */}
//       <ModalWrapper
//         isOpen={isAddUserModalOpen}
//         onClose={() => setIsAddUserModalOpen(false)}
//         title="Add New User"
//         fields={userFields}
//         columns={3}
//         submitLabel="Save User"
//         onSubmit={handleAddUser}
//       />

//       {/* Edit User Modal */}
//       {editModalUserId && (
//         <ModalWrapper
//           isOpen={!!editModalUserId}
//           onClose={() => setEditModalUserId(null)}
//           title="Edit User"
//           fields={userFields.filter((f) => f.name !== "password")}
//           columns={3}
//           submitLabel="Update User"
//           onSubmit={handleEditUser}
//           defaultValues={users.find((u) => u.id === editModalUserId) || {}}
//         />
//       )}

//       {/* Access Management */}
//       {isAccessModalOpen && (
//         <RoleManagementForm
//           onClose={() => setIsAccessModalOpen(false)}
//           onReset={() => console.log("Reset clicked")}
//           onSubmit={(data) => console.log("Form submit:", data)}
//           data={baseData}
//           submitLabel="Save Changes"
//         />
//       )}

//       {/* Add Permission Modal */}
//       <UpdateRoleModal
//   isOpen={isAddPermissionModalOpen}
//   onClose={() => setIsAddPermissionModalOpen(false)}
//   users={users}
//   roles={roles}
//   permissions={permissions}
//   onSubmit={(changes) => {
//     console.log("Complete access changes:", changes);
//     // Save both roles and permissions to your backend
//   }}
// />
//     </div>
//   );
// }
