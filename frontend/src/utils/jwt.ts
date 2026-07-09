// src/utils/jwt.ts

import { jwtDecode } from "jwt-decode";

// Define JwtClaims type
export interface JwtClaims {
  sub?: string;
  user: {
    id: number;
    email?: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: string;
    last_login: string;
  };
  exp?: number;
  iat?: number;
  [key: string]: any;
}

export function decodeToken(token: string | null): JwtClaims | null {
  if (!token) return null;
  try {
    const raw = jwtDecode<any>(token);
    console.log("raw", raw);
    const user = {
      id: raw.user_id,
      username: raw.email,
      first_name: raw.first_name,
      last_name: raw.last_name,
      role: raw.role,
      last_login: raw.last_login,
      full_name: `${raw.first_name} ${raw.last_name}`,
    };

    // ── normalise common variants ─────────────────────────────
    return {
      sub: raw.sub,
      user: user,
      exp: raw.exp,
      iat: raw.iat,
      ...raw, // keep everything else in case you need it later
    } as JwtClaims;
  } catch {
    return null; // malformed token
  }
}
