
import { useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { selectAuth } from "../features/auth/authSlice";
import LoadingSpinner from "./Form/LoadingSpinner";
import { jwtDecode } from "jwt-decode";
import { ROLES } from "../constants/roles";

interface JwtPayload {
  role?: string;
  roles?: string[] | string;
  permissions?: string[];
  [key: string]: any;
}

interface ProtectedRouteProps {
  roles?: string[]; // roles allowed
  permissions?: string[];
  requireAuth?: boolean;
  redirectUnauthorized?: string;
}

export default function ProtectedRoute({
  roles = [],
  permissions = [],
  requireAuth = true,
  redirectUnauthorized = "/unauthorized",
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, token, status, user } = useAppSelector(selectAuth);

  if (status === "loading") return <LoadingSpinner fullScreen />;

  if (!requireAuth) return <Outlet />;

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const decoded = useMemo(() => {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }, [token]);

  if (!decoded) return <Navigate to="/login" replace />;

  const userRoles = useMemo<string[]>(() => {
    let tokenRoles: string[] = [];

    // Get roles from JWT token
    if (decoded) {
      const rawRoles = decoded.roles ?? decoded.role ?? [];
      const rolesArray = Array.isArray(rawRoles) ? rawRoles : String(rawRoles).split(/\s+/);
      tokenRoles = rolesArray.map((r) => r.toLowerCase());
    }

    // Also include the Redux user role (for demo role-switching)
    if (user?.role) {
      tokenRoles.push(user.role.toLowerCase());
    }

    return tokenRoles;
  }, [decoded, user?.role]);

  const userPermissions = useMemo<string[]>(() => {
    if (!decoded?.permissions) return [];
    return decoded.permissions.map((p) => p.toLowerCase());
  }, [decoded]);

  // Role check
  if (roles.length > 0 && !roles.some((r) => userRoles.includes(r.toLowerCase()))) {
    return <Navigate to={redirectUnauthorized} replace state={{ from: location }} />;
  }

  // Permission check
  if (permissions.length > 0 && !permissions.every((p) => userPermissions.includes(p.toLowerCase()))) {
    return <Navigate to={redirectUnauthorized} replace state={{ from: location }} />;
  }

  return <Outlet />;
}