import React, { useEffect, useState, useMemo } from "react";
import { 
 
  Key, 
  Shield, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Check,
  Filter,
  Search,
  User,
  Save,
  X
} from "lucide-react";

// Define a compatible User type that matches your API User type
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
  avatar?: string;
};

type Role = {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  color?: string;
};

type Permission = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
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

// Predefined role colors for visual distinction
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  user: "bg-blue-100 text-blue-800 border-blue-200",
  compiler: "bg-green-100 text-green-800 border-green-200",
  approver: "bg-purple-100 text-purple-800 border-purple-200",
  default: "bg-gray-100 text-gray-800 border-gray-200"
};

const UpdateRoleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  users,
  roles,
  permissions = [],
  onSubmit,
}) => {
  const [userRoles, setUserRoles] = useState<Record<number, string>>({});
  const [userPermissions, setUserPermissions] = useState<Record<number, string[]>>({});
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  
  // Filter users based on search and role filter
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === "" || 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = selectedRoleFilter === "all" || 
        user.role === selectedRoleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRoleFilter]);
  
  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    if (!permissions || permissions.length === 0) {
      return {} as Record<string, Permission[]>;
    }
    
    return permissions.reduce((acc, permission) => {
      const category = permission.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);
  
  // Get unique categories for filter
  const permissionCategories = useMemo(() => {
    return Object.keys(groupedPermissions);
  }, [groupedPermissions]);
  
  // Filter permissions by category
  const filteredGroupedPermissions = useMemo(() => {
    if (selectedCategoryFilter === "all") {
      return groupedPermissions;
    }
    
    return {
      [selectedCategoryFilter]: groupedPermissions[selectedCategoryFilter] || []
    };
  }, [groupedPermissions, selectedCategoryFilter]);
  
  // Get unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const rolesSet = new Set(users.map(user => user.role).filter(Boolean));
    return Array.from(rolesSet);
  }, [users]);
  
  // Initialize user data
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
    }
  }, [isOpen, users]);
  
  // Role change handler with auto-permission application
  const handleRoleChange = (userId: number, roleId: string) => {
    setUserRoles(prev => ({ ...prev, [userId]: roleId }));
    
    // Apply role permissions automatically
    if (roleId) {
      const selectedRole = roles.find(r => r.id === roleId);
      if (selectedRole?.permissions) {
        setUserPermissions(prev => ({
          ...prev,
          [userId]: [...selectedRole.permissions]
        }));
      }
    }
  };
  
  // Bulk role assignment
  const handleBulkRoleChange = (roleId: string) => {
    if (selectedUsers.length === 0) return;
    
    const updates: Record<number, string> = {};
    selectedUsers.forEach(userId => {
      updates[userId] = roleId;
    });
    
    setUserRoles(prev => ({ ...prev, ...updates }));
    
    // Apply role permissions for selected users
    const selectedRole = roles.find(r => r.id === roleId);
    if (selectedRole?.permissions) {
      setUserPermissions(prev => {
        const newPermissions = { ...prev };
        selectedUsers.forEach(userId => {
          newPermissions[userId] = [...selectedRole.permissions];
        });
        return newPermissions;
      });
    }
  };
  
  // User selection handlers
  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  // const selectAllUsers = () => {
  //   setSelectedUsers(filteredUsers.map(user => user.id));
  // };
  
  const clearSelection = () => {
    setSelectedUsers([]);
  };
  
  // Permission handlers
  const handlePermissionToggle = (userId: number, permissionId: string) => {
    setUserPermissions(prev => {
      const current = prev[userId] || [];
      return {
        ...prev,
        [userId]: current.includes(permissionId)
          ? current.filter(id => id !== permissionId)
          : [...current, permissionId]
      };
    });
  };
  
  const handleSelectAllPermissions = (userId: number, selected: boolean) => {
    if (selected) {
      setUserPermissions(prev => ({
        ...prev,
        [userId]: permissions.map(p => p.id)
      }));
    } else {
      setUserPermissions(prev => ({
        ...prev,
        [userId]: []
      }));
    }
  };
  
  // Get role color class
  const getRoleColor = (roleId: string) => {
    return ROLE_COLORS[roleId] || ROLE_COLORS.default;
  };
  
  // Get user initials for avatar
  const getUserInitials = (user: ApiUser) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "U";
  };
  
  // Submit handler with loading state
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="fixed inset-0 flex items-center justify-center  z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
     <div className="sticky top-0 z-10 bg-white">
  {/* Minimal Header Bar */}
  <div className="px-4 py-3 border-b border-gray-200">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-1.5">
          <Users size={16} className="text-gray-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Manage Access
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-500">
              {users.length} users
            </span>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs text-gray-500">
              {permissions.length} permissions
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <X size={16} className="text-gray-500" />
      </button>
    </div>
  </div>

  {/* Compact Tabs */}
  <div className="flex px-4 border-b border-gray-200">
    <button
      onClick={() => setActiveTab("roles")}
      className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        activeTab === "roles"
          ? "border-blue-500 text-blue-600"
          : "border-transparent text-gray-600 hover:text-gray-900"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Shield size={14} />
        <span>Roles</span>
      </div>
    </button>

    {permissions.length > 0 && (
      <button
        onClick={() => setActiveTab("permissions")}
        className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          activeTab === "permissions"
            ? "border-blue-500 text-blue-600"
            : "border-transparent text-gray-600 hover:text-gray-900"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Key size={14} />
          <span>Permissions</span>
        </div>
      </button>
    )}
  </div>
</div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Filters and Search */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search users by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {activeTab === "roles" && (
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="all">All Roles</option>
                      {uniqueRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            {activeTab === "roles" ? (
              <div className="space-y-6">
                {/* Bulk Actions */}
                {selectedUsers.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Check className="text-blue-600" size={20} />
                        <span className="font-medium text-blue-700">
                          {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={clearSelection}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Clear
                        </button>
                        <div className="relative">
                          <select
                            onChange={(e) => handleBulkRoleChange(e.target.value)}
                            className="pl-4 pr-10 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                            defaultValue=""
                          >
                            <option value="" disabled>Assign Role</option>
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Users Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredUsers.map(user => {
                    const currentRole = userRoles[user.id];
                    const role = roles.find(r => r.id === currentRole);
                    const isSelected = selectedUsers.includes(user.id);
                    
                    return (
                      <div
                        key={user.id}
                        className={`border rounded-xl p-4 transition-all hover:shadow-lg ${
                          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:border-blue-300'
                        }`}
                        onClick={() => toggleUserSelection(user.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold">
                                {getUserInitials(user)}
                              </div>
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                  <Check size={14} className="text-white" />
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {user.full_name || user.email || `User ${user.id}`}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {user.email}
                                {user.username && ` • @${user.username}`}
                              </p>
                              
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-sm text-gray-500">Current:</span>
                                <span className={`px-2 py-1 text-xs rounded-full border ${getRoleColor(user.role || '')}`}>
                                  {user.role || 'No role'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="relative">
                              <select
                                value={currentRole || ""}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                className={`pl-3 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm font-medium ${
                                  currentRole ? getRoleColor(currentRole) : 'bg-white'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">Select Role</option>
                                {roles.map(r => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                            </div>
                            {role?.description && (
                              <p className="text-xs text-gray-500 mt-1 max-w-[150px]">
                                {role.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <User className="mx-auto text-gray-300" size={48} />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
                    <p className="mt-2 text-gray-600">
                      Try adjusting your search or filter to find what you're looking for.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Permission Category Filter */}
                <div className="flex items-center space-x-4 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedCategoryFilter("all")}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategoryFilter === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All Categories
                  </button>
                  {permissionCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategoryFilter(category)}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                        selectedCategoryFilter === category
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                
                {/* Users with Expandable Permissions */}
                <div className="space-y-4">
                  {users.map(user => {
                    const userPerms = userPermissions[user.id] || [];
                    const userRole = roles.find(r => r.id === userRoles[user.id]);
                    
                    return (
                      <div key={user.id} className="border rounded-xl overflow-hidden">
                        <div
                          className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold">
                                {getUserInitials(user)}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {user.full_name || user.email || `User ${user.id}`}
                                </h4>
                                <div className="flex items-center space-x-3 text-sm text-gray-600">
                                  <span>{user.email}</span>
                                  <span>•</span>
                                  <span className={`px-2 py-0.5 rounded-full border ${getRoleColor(user.role || '')}`}>
                                    {userRole?.name || 'No role'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-600">
                                {userPerms.length}/{permissions.length} permissions
                              </span>
                              <button className="text-blue-600 hover:text-blue-800">
                                {expandedUser === user.id ? (
                                  <ChevronUp size={20} />
                                ) : (
                                  <ChevronDown size={20} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {expandedUser === user.id && (
                          <div className="p-6 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.entries(filteredGroupedPermissions).map(([category, categoryPerms]) => (
                                <div key={category} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="font-medium text-gray-900">{category}</h5>
                                    <span className="text-xs text-gray-500">
                                      {categoryPerms.filter(p => userPerms.includes(p.id)).length}/{categoryPerms.length}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {categoryPerms.map(permission => {
                                      const isSelected = userPerms.includes(permission.id);
                                      const isInherited = userRole?.permissions?.includes(permission.id);
                                      
                                      return (
                                        <label
                                          key={permission.id}
                                          className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                            isSelected
                                              ? 'bg-blue-50 border-blue-300'
                                              : 'border-gray-200 hover:bg-gray-50'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handlePermissionToggle(user.id, permission.id)}
                                            className="mt-1 text-blue-600 rounded focus:ring-blue-500"
                                          />
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium text-sm text-gray-900">
                                                {permission.name}
                                              </span>
                                              {isInherited && (
                                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                                  From Role
                                                </span>
                                              )}
                                            </div>
                                            {permission.description && (
                                              <p className="text-xs text-gray-600 mt-1">
                                                {permission.description}
                                              </p>
                                            )}
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-6 pt-4 border-t">
                              <div className="flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllPermissions(user.id, true)}
                                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                                >
                                  Select All Permissions
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllPermissions(user.id, false)}
                                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                                >
                                  Clear All
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">
                {activeTab === "roles" 
                  ? `${filteredUsers.length} users` 
                  : `${permissions.length} permissions across ${permissionCategories.length} categories`
                }
              </span>
              {selectedUsers.length > 0 && activeTab === "roles" && (
                <span className="ml-4">
                  • <span className="text-blue-600">{selectedUsers.length} selected</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save All Changes</span>
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