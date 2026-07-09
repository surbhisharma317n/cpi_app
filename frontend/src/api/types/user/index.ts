// Type definitions
export interface User {
  [x: string]: any;
  id: number;
  email?: string;
 first_name:string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  phone?: string;
  role: string;
  last_login: string;
  
  is_active?: boolean;
}
export interface UserType {
  [x: string]: any;
  id: number;
  email?: string;
 first_name:string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  phone?: string;
  role: string;
  last_login: string;
  
  is_active?: boolean;
}
//   last_name: string;
//   fullName: string;
//   role: string;
//   lastLogin: string;
//   email?: string;
//   isActive?: boolean;
// }

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export interface PermissionResult {
  success: boolean;
  grantedPermissions: string[];
  revokedPermissions: string[];
}

export interface AddUserPayload {
  username: string;
  email?: string;
  password: string;
  first_name:string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  phone?: string;
  role: string;

}

export interface AddPermissionPayload {
  userId: string;
  permissions: string[];
}