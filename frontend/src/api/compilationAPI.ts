// import axios from 'axios';

// const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// export const compilationAPI = {
//   compile: async (params: { month: string; year: string }) => {
//     const response = await axios.post(`${API_BASE_URL}/compile`, params);
//     return response;
//   }
// };


// src/api/compilationAPI.ts
import axios from 'axios';

// Dummy data generator
const generateDummyCompilationData = (params: { month: string; year: string }) => {
  const programs = [
    { id: 1, name: 'Rural Price Index', status: 'completed', items: 245 },
    { id: 2, name: 'Urban Price Index', status: 'pending', items: 180 },
    { id: 3, name: 'Weighted PDS Index', status: 'failed', items: 95 },
  ];

  const details = {
    month: params.month,
    year: params.year,
    lastCompiled: `${params.month} 15, ${params.year}`,
    compilationTime: '2 hours 15 minutes',
    dataPoints: 1250,
    successRate: 82.5,
    programs,
  };

  return {
    data: details,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  };
};

// Mock function to simulate network delay
const simulateNetworkDelay = () => new Promise(resolve => setTimeout(resolve, 800));

// Configuration for axios mock adapter
// const isMockEnabled = process.env.REACT_APP_MOCK_API === 'true';

// const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
// const isMockEnabled = process.env.REACT_APP_MOCK_API === 'true';
const isMockEnabled = true;

// const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const API_BASE_URL =  '/api';


export const compilationAPI = {
  compile: async (params: { month: string; year: string }) => {
    if (isMockEnabled) {
      await simulateNetworkDelay();
      
      // Simulate validation
      if (!params.month || !params.year) {
        throw new Error('Month and Year are required');
      }

      // Simulate occasional server error
      if (Math.random() > 0.9) { // 10% chance of error
        throw new Error('Server error: Unable to process request');
      }

      return generateDummyCompilationData(params);
    }

    // Real API call when mock is disabled
    try {
      const response = await axios.post(`${API_BASE_URL}/compile`, params);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Compilation failed');
      }
      throw error;
    }
  },
  
  // Additional dummy API methods
  getPreviousCompilations: async () => {
    if (isMockEnabled) {
      await simulateNetworkDelay();
      return {
        data: [
          { id: 1, month: 'Jan', year: '2024', status: 'completed' },
          { id: 2, month: 'Dec', year: '2023', status: 'completed' },
          { id: 3, month: 'Nov', year: '2023', status: 'partial' },
        ],
      };
    }
    return axios.get(`${API_BASE_URL}/compilations`);
  }
};