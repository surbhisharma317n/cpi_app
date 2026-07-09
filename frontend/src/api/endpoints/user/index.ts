
import { fetchApi } from '../../http/axiosClient';
import type { User,AddUserPayload,AddPermissionPayload,PermissionResult,UserProfile } from '../../types/user';



export const userService = {
  /**
   * Get all users
   * @returns Promise<User[]> List of users
   */
  getUsers: async (): Promise<User[]> => {
    return fetchApi({ url: '/api/user', method: 'get' });
  },

  /**
   * Get user by ID
   * @param userId string User ID
   * @returns Promise<User> User details
   */
  getUserById: async (userId: string): Promise<User> => {
    return fetchApi({ 
      url: `/api/user/${userId}`, 
      method: 'get'
    });
  },

  /**
   * Add new user
   * @param payload AddUserPayload User details
   * @returns Promise<User> Created user
   */
  addUser: async (payload: AddUserPayload): Promise<User> => {
    return fetchApi({
      url: '/api/user/',
      method: 'post',
      data: payload
    });
  },

  updateUser: async (userId: string, payload: Partial<User>): Promise<User> => {
    return fetchApi({
      url: `/api/user/${userId}/`,
      method: 'patch',
      data: payload // Use Partial to allow partial updates
    });
  },

  /**
   * Add user permissions
   * @param payload AddPermissionPayload Permission details
   * @returns Promise<PermissionResult> Operation result
   */
  addUserPermissions: async (payload: AddPermissionPayload): Promise<PermissionResult> => {
    return fetchApi({
      url: `/api/user/${payload.userId}/permissions`,
      method: 'post',
      data: { permissions: payload.permissions }
    });
  },

  /**
   * Get current user profile
   * @returns Promise<UserProfile> User profile details
   */
  getUserProfile: async (): Promise<UserProfile> => {
    return fetchApi({
      url: '/api/user/me/profile',
      method: 'get'
    });
  },

  /**
   * Batch fetch essential user data
   * @returns Promise<[User[], UserProfile]> Tuple with users list and current profile
   */
  getUserDashboardData: async (): Promise<[User[], UserProfile]> => {
    return Promise.all([
      userService.getUsers(),
      userService.getUserProfile()
    ]);
  }
};