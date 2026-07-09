import { 
  X, 
  Mail, 
  Phone, 
  User as UserIcon, 
  Shield, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Clock,
  Copy,
  Key,

  Building,

} from "lucide-react";
import type { User as UserType } from "../../../api/types/user";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

export default function ViewUserModal({ isOpen, onClose, user }: Props) {
  if (!isOpen || !user) return null;

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not available";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "Not available";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get role color
  const getRoleColor = (role: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      admin: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
      user: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      compiler: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
      approver: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    };
    return colors[role] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };
  };

  // Get user initials
  const getUserInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {getUserInitials()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role || 'user').bg} ${getRoleColor(user.role || 'user').text} ${getRoleColor(user.role || 'user').border}`}>
                    <Shield size={12} />
                    {user.role || 'user'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {user.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Information */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail size={14} />
                  <span>Email Address</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-900 font-medium text-sm">{user.email || 'Not provided'}</p>
                  {user.email && (
                    <button
                      onClick={() => copyToClipboard(user.email!)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Copy email"
                    >
                      <Copy size={14} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone size={14} />
                  <span>Phone Number</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-900 font-medium text-sm">{user.phone || 'Not provided'}</p>
                  {user.phone && (
                    <button
                      onClick={() => copyToClipboard(user.phone!)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Copy phone"
                    >
                      <Copy size={14} className="text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <UserIcon size={14} />
                  <span>Username</span>
                </div>
                <p className="text-gray-900 font-medium text-sm">{user.username || 'Not provided'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Key size={14} />
                  <span>User ID</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-900 font-medium text-sm font-mono">{user.id}</p>
                  <button
                    onClick={() => copyToClipboard(user.id.toString())}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Copy ID"
                  >
                    <Copy size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={14} />
                  <span>Account Created</span>
                </div>
                <p className="text-gray-900 font-medium text-sm">
                  {formatDate(user.created_at)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={14} />
                  <span>Last Updated</span>
                </div>
                <p className="text-gray-900 font-medium text-sm">
                  {formatDate(user.updated_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          {(user.middle_name || user.department) && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Additional Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.middle_name && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">Middle Name</div>
                    <p className="text-gray-900 font-medium text-sm">{user.middle_name}</p>
                  </div>
                )}
                {user.department && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Building size={14} />
                      <span>Department</span>
                    </div>
                    <p className="text-gray-900 font-medium text-sm">{user.department}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detailed Status */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Account Status
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${user.is_active ? 'bg-green-100' : 'bg-red-100'}`}>
                    {user.is_active ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : (
                      <XCircle size={20} className="text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">
                      {user.is_active ? 'Account is Active' : 'Account is Inactive'}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {user.is_active 
                        ? 'User has full access to the system'
                        : 'User access to the system is restricted'}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Last status update: {formatDateTime(user.updated_at || user.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Permissions (if available) */}
          {user.permissions && user.permissions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Permissions
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.permissions.map((permission:any, index:any) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100"
                  >
                    {permission.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                const userDetails = {
                  Name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                  Email: user.email,
                  Phone: user.phone,
                  Role: user.role,
                  Status: user.is_active ? 'Active' : 'Inactive',
                  'User ID': user.id,
                  'Account Created': formatDateTime(user.created_at)
                };
                copyToClipboard(JSON.stringify(userDetails, null, 2));
              }}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Copy Details
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}