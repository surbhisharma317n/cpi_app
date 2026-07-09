import { RouterProvider } from 'react-router-dom';
import router from './routes';
import ErrorBoundary from './components/ui/error/ErrorBoundary';
import { useEffect } from 'react';
import { initAuth } from './api/http/axiosClient';
import { useAppDispatch } from './app/hooks';
import { loadUserFromStorage } from './features/auth/authSlice';
function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadUserFromStorage()); // ✅ check token expiry, restore or clear session
    initAuth();                      // ✅ start auto refresh
  }, []);
  return <ErrorBoundary >
    <RouterProvider router={router} />
  </ErrorBoundary>;
}

export default App;