import React, { useEffect, useState, useMemo } from "react";
import {

  Shield,
  Key,
  X,
  Check,
  Search,
  User,
  Save,
  AlertCircle,
  Loader2,

  UserPlus,
  UserCheck,
 
  Users as UsersIcon,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
 
} from "lucide-react";

type ApiUser = {
  id: number;
  username?: string;
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  first_name?: string;
  last_name?: string;
  full_name?: string;
  is_active?: boolean;
  department?: string;
  avatar?: string;
};

type Role = {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  userCount?: number;
  color?: string;
};

type Permission = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  module?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  users: ApiUser[];
  roles: Role[];
  permissions?: Permission[];
  onSubmit: (payload: {
    userId: number;
    roleId: string;
    permissions: string[];
  }[]) => void;
};

const UpdateRoleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  users,
  roles,
  permissions = [],
  onSubmit,
}) => {
  // State management
  const [userRoles, setUserRoles] = useState<Record<number, string>>({});
  const [userPermissions, setUserPermissions] = useState<Record<number, string[]>>({});
  const [activeTab, setActiveTab] = useState<"roles" | "permissions" | "bulk">("roles");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null); // Single selected user
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkRole, setBulkRole] = useState<string>("");
  const [bulkSelectedUsers, setBulkSelectedUsers] = useState<Set<number>>(new Set()); // For bulk selection only
  const [step, setStep] = useState<"select" | "review">("select");

  // Get the currently selected user details
  const selectedUser = useMemo(() => {
    return users.find(user => user.id === selectedUserId);
  }, [users, selectedUserId]);

  // Filter users based on various criteria
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === "" ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = selectedDepartment === "all" ||
        user.department === selectedDepartment;

      const matchesRole = selectedRoleFilter === "all" ||
        user.role === selectedRoleFilter;

      return matchesSearch && matchesDepartment && matchesRole;
    });
  }, [users, searchTerm, selectedDepartment, selectedRoleFilter]);

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    
    permissions.forEach(permission => {
      const module = permission.module || "General";
      if (!groups[module]) {
        groups[module] = [];
      }
      groups[module].push(permission);
    });
    
    return groups;
  }, [permissions]);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(users.map(user => user.department).filter(Boolean));
    return Array.from(depts);
  }, [users]);

  // Initialize data
  useEffect(() => {
    if (isOpen && users.length) {
      const initialRoles: Record<number, string> = {};
      const initialPermissions: Record<number, string[]> = {};

      users.forEach((user) => {
        initialRoles[user.id] = user.role || "";
        initialPermissions[user.id] = user.permissions || [];
      });

      setUserRoles(initialRoles);
      setUserPermissions(initialPermissions);
      setBulkSelectedUsers(new Set());
      setSelectedUserId(null); // Reset selection when modal opens
      setStep("select");
      
      // Auto-select first user in roles tab for better UX
      if (users.length > 0 && activeTab === "roles") {
        setSelectedUserId(users[0].id);
      }
    }
  }, [isOpen, users, activeTab]);

  // Auto-select first user when tab changes
  useEffect(() => {
    if (activeTab === "roles" && filteredUsers.length > 0 && !selectedUserId) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [activeTab, filteredUsers, selectedUserId]);

  // Get role details
  const getRoleDetails = (roleId: string) => {
    return roles.find(r => r.id === roleId) || { id: "", name: "No Role", permissions: [] };
  };

  // Get role color
  const getRoleColor = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.color) return role.color;
    
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800",
      user: "bg-blue-100 text-blue-800",
      manager: "bg-green-100 text-green-800",
      editor: "bg-purple-100 text-purple-800",
      viewer: "bg-gray-100 text-gray-800",
    };
    return colors[roleId] || "bg-gray-100 text-gray-800";
  };

  // Get user initials
  const getUserInitials = (user: ApiUser) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Get user display name
  const getUserDisplayName = (user: ApiUser) => {
    return user.full_name || user.email || user.username || `User ${user.id}`;
  };

  // Handle user selection in left panel
  const handleUserSelect = (userId: number) => {
    if (activeTab === "bulk") {
      // Toggle selection for bulk mode
      setBulkSelectedUsers(prev => {
        const newSet = new Set(prev);
        if (newSet.has(userId)) {
          newSet.delete(userId);
        } else {
          newSet.add(userId);
        }
        return newSet;
      });
    } else {
      // Single selection for roles/permissions tabs
      setSelectedUserId(userId);
    }
  };

  // Check if user is selected (for bulk or single)
  const isUserSelected = (userId: number) => {
    if (activeTab === "bulk") {
      return bulkSelectedUsers.has(userId);
    }
    return selectedUserId === userId;
  };

  // Apply bulk role change
  const applyBulkRole = () => {
    if (!bulkRole || bulkSelectedUsers.size === 0) return;
    
    setUserRoles(prev => {
      const updated = { ...prev };
      bulkSelectedUsers.forEach(userId => {
        updated[userId] = bulkRole;
      });
      return updated;
    });
    
    setStep("review");
  };

  // Toggle permission for selected user
  const togglePermission = (permissionId: string) => {
    if (!selectedUserId) return;
    
    setUserPermissions(prev => {
      const current = prev[selectedUserId] || [];
      const updated = current.includes(permissionId)
        ? current.filter(id => id !== permissionId)
        : [...current, permissionId];
      
      return { ...prev, [selectedUserId]: updated };
    });
  };

  // Check if permission is from role
  const isPermissionFromRole = (permissionId: string) => {
    if (!selectedUserId) return false;
    const roleId = userRoles[selectedUserId];
    const role = roles.find(r => r.id === roleId);
    return role?.permissions.includes(permissionId) || false;
  };

  // Get available permissions (not from role)
  // const getAvailablePermissions = () => {
  //   if (!selectedUserId) return [];
  //   const rolePerms = getRoleDetails(userRoles[selectedUserId]).permissions || [];
  //   return permissions.filter(p => !rolePerms.includes(p.id));
  // };

  // Submit all changes
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const payload = users.map(user => ({
        userId: user.id,
        roleId: userRoles[user.id] || "",
        permissions: userPermissions[user.id] || []
      }));
      
      await onSubmit(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Shield size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Access Management
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage user roles and permissions
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            <button
              onClick={() => {
                setActiveTab("roles");
                // Auto-select first user when switching to roles tab
                if (filteredUsers.length > 0 && !selectedUserId) {
                  setSelectedUserId(filteredUsers[0].id);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === "roles"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <UsersIcon size={16} />
              <span>Assign Roles</span>
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === "permissions"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Key size={16} />
              <span>Custom Permissions</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("bulk");
                setBulkSelectedUsers(new Set()); // Clear bulk selection
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === "bulk"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <UserPlus size={16} />
              <span>Bulk Assign</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Users List */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Roles</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-3 text-sm text-gray-600 flex items-center justify-between">
                <span>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</span>
                {activeTab === "bulk" && (
                  <span className="font-medium text-blue-600">
                    {bulkSelectedUsers.size} selected
                  </span>
                )}
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-auto p-2">
              <div className="space-y-2">
                {filteredUsers.map(user => {
                  const userRole = userRoles[user.id];
                  const roleDetails = getRoleDetails(userRole);
                  const isSelected = isUserSelected(user.id);
                  
                  return (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleUserSelect(user.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {activeTab === "bulk" && (
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                          )}
                          
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-medium">
                            {getUserInitials(user)}
                          </div>
                          
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {getUserDisplayName(user)}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {user.department || "No department"}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(userRole)}`}>
                            {roleDetails.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8">
                    <User className="mx-auto text-gray-300" size={32} />
                    <h3 className="mt-3 text-sm font-medium text-gray-900">No users found</h3>
                    <p className="mt-1 text-xs text-gray-600">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Details */}
          <div className="w-2/3 flex flex-col">
            {activeTab === "roles" && (
              <div className="p-6 h-full flex flex-col">
                {selectedUser ? (
                  <>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Assign Role to {getUserDisplayName(selectedUser)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Select a role below. The user will inherit all permissions associated with the role.
                      </p>
                    </div>
                    
                    <div className="space-y-6 flex-1">
                      {/* Current Role */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">
                              Current Role
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1.5 text-sm rounded-lg ${getRoleColor(userRoles[selectedUser.id])}`}>
                                {getRoleDetails(userRoles[selectedUser.id]).name}
                              </span>
                              <span className="text-sm text-gray-600">
                                • {getRoleDetails(userRoles[selectedUser.id]).permissions.length} permissions included
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            User ID: {selectedUser.id}
                          </div>
                        </div>
                      </div>
                      
                      {/* Available Roles */}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Available Roles
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {roles.map(role => (
                            <button
                              key={role.id}
                              onClick={() => setUserRoles(prev => ({ ...prev, [selectedUser.id]: role.id }))}
                              className={`p-4 rounded-lg border text-left transition-all ${
                                userRoles[selectedUser.id] === role.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {role.name}
                                  </div>
                                  {role.description && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      {role.description}
                                    </div>
                                  )}
                                </div>
                                {userRoles[selectedUser.id] === role.id && (
                                  <Check size={18} className="text-blue-600" />
                                )}
                              </div>
                              <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                                <ShieldCheck size={12} />
                                <span>{role.permissions.length} permissions</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Role Summary */}
                      {userRoles[selectedUser.id] && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle size={18} className="text-blue-600" />
                            <div>
                              <span className="font-medium text-blue-800">
                                {getRoleDetails(userRoles[selectedUser.id]).name} selected
                              </span>
                              <p className="text-sm text-blue-700 mt-0.5">
                                This role includes {getRoleDetails(userRoles[selectedUser.id]).permissions.length} permissions
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <User size={48} className="mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Select a User
                      </h3>
                      <p className="text-sm text-gray-600 max-w-md">
                        Choose a user from the list to assign or change their role
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "permissions" && selectedUser && (
              <div className="p-6 overflow-auto">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Custom Permissions for {getUserDisplayName(selectedUser)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Add extra permissions beyond the role defaults. Role-based permissions cannot be modified here.
                  </p>
                </div>
                
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                    const availablePerms = modulePermissions.filter(p => 
                      !isPermissionFromRole(p.id)
                    );
                    
                    if (availablePerms.length === 0) return null;
                    
                    const selectedCount = availablePerms.filter(p => 
                      userPermissions[selectedUser.id]?.includes(p.id)
                    ).length;
                    
                    return (
                      <div key={module} className="border border-gray-200 rounded-lg">
                        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                          <div className="font-medium text-gray-900">{module}</div>
                          <div className="text-sm text-gray-600">
                            {selectedCount}/{availablePerms.length} selected
                          </div>
                        </div>
                        <div className="p-3 space-y-2">
                          {availablePerms.map(permission => {
                            const isSelected = userPermissions[selectedUser.id]?.includes(permission.id) || false;
                            
                            return (
                              <label
                                key={permission.id}
                                className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-200'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePermission(permission.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900">
                                    {permission.name}
                                  </div>
                                  {permission.description && (
                                    <div className="text-xs text-gray-600 mt-1">
                                      {permission.description}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check size={16} className="text-blue-600" />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "bulk" && (
              <div className="p-6">
                {step === "select" ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Bulk Role Assignment
                      </h3>
                      <p className="text-sm text-gray-600">
                        Select multiple users and assign them the same role
                      </p>
                    </div>
                    
                    {bulkSelectedUsers.size > 0 ? (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                          <UserCheck size={18} className="text-blue-600" />
                          <div className="text-sm text-blue-800">
                            <span className="font-medium">{bulkSelectedUsers.size} users selected</span>
                            <div className="text-blue-700 mt-0.5">
                              Choose a role below to assign to all selected users
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <AlertCircle size={18} className="text-gray-500" />
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">No users selected</span>
                            <div className="text-gray-600 mt-0.5">
                              Select users from the list to begin
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">
                        Select Role for Bulk Assignment
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {roles.map(role => (
                          <button
                            key={role.id}
                            onClick={() => setBulkRole(role.id)}
                            className={`p-4 rounded-lg border text-left transition-all ${
                              bulkRole === role.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {role.name}
                                </div>
                                {role.description && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    {role.description}
                                  </div>
                                )}
                              </div>
                              {bulkRole === role.id && (
                                <Check size={18} className="text-blue-600" />
                              )}
                            </div>
                            <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                              <ShieldCheck size={12} />
                              <span>{role.permissions.length} permissions included</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={applyBulkRole}
                      disabled={bulkSelectedUsers.size === 0 || !bulkRole}
                      className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowRight size={16} />
                      <span>
                        {bulkSelectedUsers.size === 0 
                          ? "Select Users First" 
                          : `Assign Role to ${bulkSelectedUsers.size} Users`
                        }
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Review Bulk Changes
                      </h3>
                      <p className="text-sm text-gray-600">
                        Confirm the role assignment for selected users
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <CheckCircle size={18} className="text-green-600" />
                          <div className="text-sm text-green-800">
                            <span className="font-medium">Ready to assign</span>
                            <div className="text-green-700 mt-0.5">
                              {bulkSelectedUsers.size} users will receive the {getRoleDetails(bulkRole).name} role
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-3 bg-gray-50 border-b border-gray-200">
                          <div className="font-medium text-gray-900">Affected Users</div>
                          <div className="text-sm text-gray-600 mt-0.5">
                            {bulkSelectedUsers.size} users selected
                          </div>
                        </div>
                        <div className="p-3 max-h-60 overflow-auto">
                          {Array.from(bulkSelectedUsers).map(userId => {
                            const user = users.find(u => u.id === userId);
                            if (!user) return null;
                            
                            return (
                              <div key={userId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                    {getUserInitials(user)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm text-gray-900">
                                      {getUserDisplayName(user)}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {user.department}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Current:</span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role || '')}`}>
                                    {getRoleDetails(user.role || '').name}
                                  </span>
                                  <ArrowRight size={12} className="text-gray-400" />
                                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(bulkRole)}`}>
                                    {getRoleDetails(bulkRole).name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep("select")}
                        className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Applying...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Confirm & Apply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty states */}
            {activeTab === "permissions" && !selectedUser && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <Key size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a User
                  </h3>
                  <p className="text-sm text-gray-600 max-w-md">
                    Choose a user from the list to manage their individual permissions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {activeTab === "roles" && selectedUser && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Editing:</span>
                  <span>{getUserDisplayName(selectedUser)}</span>
                  <span className="text-gray-400">•</span>
                  <span>Role: {getRoleDetails(userRoles[selectedUser.id]).name}</span>
                </div>
              )}
              {activeTab === "permissions" && selectedUser && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Editing:</span>
                  <span>{getUserDisplayName(selectedUser)}</span>
                  <span className="text-gray-400">•</span>
                  <span>Custom permissions: {userPermissions[selectedUser.id]?.length || 0}</span>
                </div>
              )}
              {activeTab === "bulk" && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{bulkSelectedUsers.size} users selected</span>
                  {bulkRole && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span>Role: {getRoleDetails(bulkRole).name}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateRoleModal;