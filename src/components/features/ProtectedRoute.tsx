import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1f3d]">
        <Loader2 className="w-8 h-8 text-[#f5a623] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/kitchen-login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
