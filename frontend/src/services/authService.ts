// services/authService.ts
// import axios from 'axios';

// const API_BASE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000/api';

// export const getCaptcha = async (): Promise<string> => {
//   const response = await axios.get(`${API_BASE_URL}/captcha`);
//   return response.data.captcha;
// };

// export const submitLogin = async (credentials: {
//   username: string;
//   password: string;
//   captchaCode: string;
// }): Promise<void> => {
//   await axios.post(`${API_BASE_URL}/login`, credentials);
// };

// src/services/authService.ts

// Dummy database
const dummyUsers = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123', // In real app, store hashed passwords only
    name: 'Admin User',
    token: 'dummy-admin-token-123',
    refreshToken: 'dummy-admin-refresh-123'
  },
  {
    id: 2,
    username: 'user',
    password: 'user123',
    name: 'Regular User',
    token: 'dummy-user-token-456',
    refreshToken: 'dummy-user-refresh-456'
  }
];

// Dummy captcha codes
const dummyCaptchas = ['A7B9C2', 'X3Y5Z8', 'M4N6P9', 'Q1W2E3'];

// Simulate network delay
const simulateNetworkDelay = () => new Promise(resolve => setTimeout(resolve, 500));

export const getCaptcha = async (): Promise<string> => {
  await simulateNetworkDelay();

  // Return random captcha from dummy array
  return dummyCaptchas[Math.floor(Math.random() * dummyCaptchas.length)];
};

export const submitLogin = async (credentials: {
  username: string;
  password: string;
  captcha: string;
}): Promise<{
  token: string;
  refreshToken: string;
  user: Omit<typeof dummyUsers[0], 'password' | 'token' | 'refreshToken'>;
}> => {
  await simulateNetworkDelay();

  // Simulate captcha validation (always passes in dummy version)
  if (!credentials.captcha || credentials.captcha.length !== 6) {
    throw new Error('Invalid captcha code');
  }

  // Find user
  const user = dummyUsers.find(
    u => u.username === credentials.username && u.password === credentials.password
  );

  if (!user) {
    throw new Error('Invalid username or password');
  }

  // Return user data without password, token, refreshToken
  const { password, token, refreshToken, ...userData } = user;

  return {
    token,
    refreshToken,
    user: userData
  };
};

// Add other auth-related dummy functions as needed
export const validateToken = async (token: string): Promise<boolean> => {
  await simulateNetworkDelay();
  return dummyUsers.some(user => user.token === token);
};

export const logout = async (): Promise<void> => {
  await simulateNetworkDelay();
  // In a real app, this would invalidate the token on the server
  return Promise.resolve();
};