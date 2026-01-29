import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store';
import { motion } from 'framer-motion';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-terminal-green font-mono"
        >
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-terminal-green border-t-transparent rounded-full animate-spin" />
            <span>AUTHENTICATING...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
