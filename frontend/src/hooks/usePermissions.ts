import { useMemo } from "react";
import { useAppSelector } from "../app/hooks";
import { selectAuth } from "../features/auth/authSlice";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  permissions?: string[] | string;
}

export function usePermission(permission: string): boolean {
  const { token } = useAppSelector(selectAuth);

  console.log(token,"gjdkhghdgjhfd=")

  return useMemo(() => {
    if (!token || !permission) return false;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      console.log(decoded,"decoded=====")

      const rawPermissions = decoded.permissions ?? [];

      const permissionsArray = Array.isArray(rawPermissions)
        ? rawPermissions
        : [rawPermissions];

      const normalizedPermissions = permissionsArray.map(p =>
        p.toUpperCase().trim()
      );
      const per_status=normalizedPermissions.includes(permission.toUpperCase().trim());

      return per_status
    } catch (error) {
      console.error("JWT decode failed", error);
      return false;
    }
  }, [token, permission]);
}