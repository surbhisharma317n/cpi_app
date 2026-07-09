export const ROLES = {
  ADMIN: "admin",
  COMPILER: "compiler",
  APPROVER: "approver",
  REVIEWER: "reviewer",
  USER: "user",
};

export type Role = typeof ROLES[keyof typeof ROLES];