import { useState, useEffect, type ChangeEvent } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";

import { userService } from "../api/endpoints/user";
import type { AddUserPayload, User } from "../api/types/user";
import PermissionsComponents from "../components/auth/ui/permission";

const UserManagement = () => {
  // const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [viewModalUserId, setViewModalUserId] = useState<number | null>(null);
  const [editModalUserId, setEditModalUserId] = useState<number | null>(null);
  const [blockModalUserId, setBlockModalUserId] = useState<number | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Partial<User>>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    middle_name: "",
    role: "",
  });
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      console.log("Fetched users:", data);
      setTotalUsers(data.length);
      setUsers(data);
      // setEditUser({ first_name: data., last_name: '', email: '', phone: '', middle_name: '', role: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);



  if (loading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }



  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Implement pagination
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement add user functionality
    const formData = new FormData(e.target as HTMLFormElement);
    const newUser: AddUserPayload = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      first_name: formData.get("first_name") as string,
      middle_name: formData.get("middle_name") as string,

      last_name: formData.get("last_name") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as string,
      full_name: `${formData.get("first_name")} ${formData.get("middle_name") || ""} ${formData.get("last_name")}`,
    };
    console.log("Adding new user:", newUser);
    userService
      .addUser(newUser)
      .then((addedUser) => {
        console.log("User added successfully:", addedUser);
        setUsers((prevUsers) => [...prevUsers, addedUser]);
        setTotalUsers((prevCount) => prevCount + 1);
        setIsAddUserModalOpen(false);
      })
      .catch((err) => {
        console.error("Error adding user:", err);
        setError(err instanceof Error ? err.message : "Failed to add user");
      });
  };

  // const handleAddTask = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   // Implement add task functionality
  //   setIsAddTaskModalOpen(false);
  // };

  const handleEditUser = (e: React.FormEvent, userId: number) => {
    e.preventDefault();
    alert(`Edit user with ID: ${userId}`);
    // Implement edit user functionality
    // if (!editUser.first_name || !editUser.last_name || !editUser.email || !editUser.phone || !editUser.middle_name || !editUser.role) {
    //   setError('Please fill in all fields before updating.');
    //   return;
    // }
    userService
      .getUserById(userId.toString())
      .then((user) => {
        const payload: Partial<User> = {
          email: editUser.email || user.email,
          first_name: editUser.first_name || user.first_name,
          last_name: editUser.last_name || user.last_name,
          phone: editUser.phone || user.phone,
          middle_name: editUser.middle_name || user.middle_name,
          role: editUser.role || user.role,
        };

        userService
          .updateUser(userId.toString(), payload)
          .then((updatedUser) => {
            console.log("User updated resulthjfdsgf:", updatedUser);
            // Update the users state with the updated user
            // setUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u));
            setEditModalUserId(userId);

            setUsers((prevUsers) =>
              prevUsers.map((u) => (u.id === userId ? { ...u, ...payload } : u))
            );
          })
          .then(() => {
            setIsAddUserModalOpen(false);
            setEditModalUserId(null);
            setError(null); // Clear any previous errors
          })
          .catch((err) => {
            console.error("Error updating user:", err);
            setError(
              err instanceof Error ? err.message : "Failed to update user"
            );
          });
      })
      .catch((err) => {
        console.error("Error fetching user:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch user");
      });

    // setIsAddUserModalOpen(false);
    // setViewModalUserId(null);
    // setEditModalUserId(userId);
  };

  const handleBlockUser = (e: React.FormEvent, userId: number) => {
    // Implement block/unblock functionality
    e.preventDefault();
    // setBlockModalUserId(userId);
    const payload: Partial<User> = {
      is_active: !users.find((user) => user.id === userId)?.is_active,
    };
    console.log("Blocking user with ID:", userId, "Payload:", payload);
    // Call the userService to update the user's active status
    userService
      .updateUser(userId.toString(), payload)
      .then((updatedUser) => {
        console.log("User block/unblock result:", updatedUser);
        // Update the users state with the updated user
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === userId ? { ...u, is_active: updatedUser.is_active } : u
          )
        );
        setBlockModalUserId(null); // Close the modal after blocking/unblocking
      })
      .catch((err) => {
        console.error("Error blocking/unblocking user:", err);
        setError(
          err instanceof Error ? err.message : "Failed to block/unblock user"
        );
      });
  };

  return (
    <div className="mx-auto ">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">User Management</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setIsAddTaskModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <FaPlus className="mr-2" /> Add Task
          </button>
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <FaPlus className="mr-2" /> Add User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg font-semibold text-gray-700">
              Total Users: {totalUsers}
            </h2>
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                placeholder="Search Here..."
                className="border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md flex items-center"
              >
                <FaSearch className="mr-2" /> Search
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    View
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user, index) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.first_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === "admin" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {user.is_active ? "Active" : "inActive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setViewModalUserId(user.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex space-x-2">
                      <button
                        onClick={() => setEditModalUserId(user.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setBlockModalUserId(user.id)}
                        className={`${user.is_active ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"}`}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-md ${currentPage === 1 ? "bg-gray-200 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">Page {currentPage}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={users.length < 10} // Assuming 10 items per page
              className={`px-4 py-2 rounded-md ${users.length < 10 ? "bg-gray-200 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <form onSubmit={handleAddUser}>
              <div className="p-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Add New User
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Username"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Password"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="first_name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      First Name
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="middle_name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      User middle_name
                    </label>
                    <input
                      type="text"
                      id="middle_name"
                      name="middle_name"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="middle_name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="last_name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Last Name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+91 1234567890"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="role"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Role</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="compiler">Compiler</option>
                      <option value="approver">Approver</option>
                      <option value="reviewer">Reviewer</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Save User
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddTaskModalOpen && <PermissionsComponents />}

      {/* View User Modal */}
      {viewModalUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  User Details
                </h3>
                <button
                  type="button"
                  onClick={() => setViewModalUserId(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Username:</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {users.find((u) => u.id === viewModalUserId)?.username}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email:</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {users.find((u) => u.id === viewModalUserId)?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    First Name:
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {users.find((u) => u.id === viewModalUserId)?.first_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Last Name:
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {users.find((u) => u.id === viewModalUserId)?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status:</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {users.find((u) => u.id === viewModalUserId)?.is_active
                      ? "Active"
                      : "inActive"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Role:</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {users.find((u) => u.id === viewModalUserId)?.role ===
                    "admin"
                      ? "Admin"
                      : "User"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewModalUserId(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModalUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
            <form onSubmit={(e) => handleEditUser(e, editModalUserId)}>
              <div className="p-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Edit User
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditModalUserId(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="hidden">
                    <label
                      htmlFor={`user_id_${editModalUserId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      User ID
                    </label>
                    <input
                      type="hidden"
                      id={`user_id_${editModalUserId}`}
                      name="user_id"
                      defaultValue={editModalUserId}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`username_${editModalUserId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      id={`username_${editModalUserId}`}
                      name="username"
                      required
                      defaultValue={
                        users.find((u) => u.id === editModalUserId)?.username
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`email_${editModalUserId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id={`email_${editModalUserId}`}
                      name="email"
                      required
                      defaultValue={
                        users.find((u) => u.id === editModalUserId)?.email
                      }
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`first_name_${editModalUserId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      First Name
                    </label>
                    <input
                      type="text"
                      id={`first_name_${editModalUserId}`}
                      name="first_name"
                      required
                      onChange={handleChange}
                      defaultValue={
                        users.find((u) => u.id === editModalUserId)?.first_name
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`last_name_${editModalUserId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Last Name
                    </label>
                    <input
                      type="text"
                      id={`last_name_${editModalUserId}`}
                      name="last_name"
                      required
                      onChange={handleChange}
                      defaultValue={
                        users.find((u) => u.id === editModalUserId)?.last_name
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`middle_name_${editModalUserId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      middle_name
                    </label>
                    <input
                      type="text"
                      id={`middle_name_${editModalUserId}`}
                      name="middle_name"
                      required
                      onChange={handleChange}
                      defaultValue={
                        users.find((u) => u.id === editModalUserId)?.middle_name
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`phone_${editModalUserId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      id={`phone_${editModalUserId}`}
                      name="phone"
                      required
                      onChange={handleChange}
                      defaultValue={
                        users.find((u) => u.id === editModalUserId)?.phone
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`role_${editModalUserId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Role
                    </label>
                    <select
                      id={`role_${editModalUserId}`}
                      name="role"
                      required
                      onChange={handleChange}
                      defaultValue={
                        users.find((u) => u.id === editModalUserId)?.role
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="" disabled>
                        Select Role
                      </option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {/* <div>
                    <label htmlFor={`access_${editModalUserId}`} className="block text-sm font-medium text-gray-700">Access</label>
                    <select
                      id={`access_${editModalUserId}`}
                      name="access"
                      required
                      defaultValue={users.find(u => u.id === editModalUserId)?.access || 1}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="1">Level 1</option>
                      <option value="2">Level 2</option>
                      <option value="3">Level 3</option>
                    </select>
                  </div> */}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditModalUserId(null)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block User Modal */}
      {blockModalUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <form onSubmit={(e) => handleBlockUser(e, blockModalUserId)}>
              <div className="p-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {users.find((u) => u.id === blockModalUserId)?.is_active
                      ? "Block"
                      : "Unblock"}{" "}
                    User
                  </h3>
                  <button
                    type="button"
                    onClick={() => setBlockModalUserId(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-gray-700">
                    Are you sure you want to{" "}
                    {users.find((u) => u.id === blockModalUserId)?.is_active
                      ? "Deactivate"
                      : "Activate"}{" "}
                    {users.find((u) => u.id === blockModalUserId)?.username}?
                  </p>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setBlockModalUserId(null)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md"
                  >
                    {users.find((u) => u.id === blockModalUserId)?.is_active
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
    </div>
  );
};

export default UserManagement;
