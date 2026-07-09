import axiosClient from './http/axiosClient';

const API_BASE_URL = '/api';

export const dashboardAPI = {
  getLatestIndexValues: async () => {
    try {
      const response = await axiosClient.get(
        `${API_BASE_URL}/all_india_level_index_item/`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch latest index values:', error);
      throw error;
    }
  },

  getIndexTrend: async () => {
    try {
      const response = await axiosClient.get(
        `${API_BASE_URL}/all_india_index_item/`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch index trend:', error);
      throw error;
    }
  },

  getApprovalRequests: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
  }) => {
    try {
      const response = await axiosClient.get(
        `${API_BASE_URL}/approval-requests/`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch approval requests:', error);
      throw error;
    }
  },

  getCompilationFilter: async () => {
    try {
      const response = await axiosClient.get(
        `${API_BASE_URL}/compilation_filter/`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch compilation filter:', error);
      throw error;
    }
  }
};
