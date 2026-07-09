// import { useDispatch } from 'react-redux';
// import { logout } from '../../features/auth/authSlice';

// export const LogoutButton = () => {
//   const dispatch = useDispatch();

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     dispatch(logout()); // This is a plain action, not a Promise
//   };

//   return (
//     <button
//       onClick={handleLogout}
//       className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700"
//     >
//       Logout
//     </button>
//   );
// };

// import { useAppDispatch } from '@/app/hooks';
// import { logout } from '@/features/auth/authSlice';
import { useState } from "react";

import { AiOutlineLogout } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";

export const LogoutButton = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Add slight delay for better UX (optional)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Clear auth-related data from storage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("sessionData"); // If using sessionStorage

      // Dispatch logout action
      dispatch(logout());

      // Redirect to login page
      navigate("/login", { replace: true });

      // Optional: Show success message
      // toast.success('Logged out successfully');
    } catch (error) {
      console.error("Logout error:", error);
      // toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Logout"
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors
        text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none
        focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        ${isLoggingOut ? "opacity-75 cursor-not-allowed" : ""}
      `}
    >
      {isLoggingOut ? (
        <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <AiOutlineLogout className="w-4 h-4" />
      )}
      <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
    </button>
  );
};
