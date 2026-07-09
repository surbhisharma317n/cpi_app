import { fetchApi } from '../../http/axiosClient';
import type {
  User,
  AddUserPayload,
 
  UserProfile,
} from '../../types/user';

export const capiService = {
  /**
   * Fetch CAPI data by month_year, table name, and iterationation
   * @returns Promise<User[]> List of users
   */
  getCapiData: async (
    month_year: string,
    tab: string,
    iteration: number
  ): Promise<User[]> => {
    const query = new URLSearchParams({
      month_year,
      tab,
      iteration: iteration.toString(),
    }).toString();

    return fetchApi({
      url: `/api/get_capi?${query}`,
      method: 'GET',
    });
  },

  /**
   * Get user by ID
   * @param userId string User ID
   * @returns Promise<User> User details
   */
  getUserById: async (userId: string): Promise<User> => {
    return fetchApi({
      url: `/api/user/${userId}`,
      method: 'GET',
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
      method: 'POST',
      data: payload,
    });
  },

  /**
   * Batch fetch essential user data
   * @returns Promise<[User[], UserProfile]> Tuple with users list and current profile
   */
  getUserDashboardData: async (
    month_year: string,
    tab: string,
    iteration: number
  ): Promise<[User[], UserProfile]> => {
    return Promise.all([
      capiService.getCapiData(month_year, tab, iteration),
      capiService.getUserProfile(),
    ]);
  },

  /**
   * Get current user profile
   * @returns Promise<UserProfile>
   */
  getUserProfile: async (): Promise<UserProfile> => {
    return fetchApi({
      url: '/api/user/profile',
      method: 'GET',
    });
  },
};
