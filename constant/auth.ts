// constants/auth.ts
export interface User {
  id: number;
  username: string;
  password: string;
  role: string;
}

export const DUMMY_USERS: User[] = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, username: 'user', password: 'user123', role: 'user' },
  { id: 3, username: 'editor', password: 'editor123', role: 'editor' },
];