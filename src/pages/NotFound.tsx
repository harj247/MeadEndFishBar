import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Fish } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0f1f3d] flex items-center justify-center">
      <div className="text-center text-white">
        <Fish className="w-16 h-16 text-[#f5a623] mx-auto mb-4" />
        <h1 className="text-5xl font-black mb-2">404</h1>
        <p className="text-white/60 text-lg mb-6">Page not found</p>
        <Link to="/" className="bg-[#f5a623] text-[#0f1f3d] font-bold px-6 py-3 rounded-xl inline-block hover:bg-[#e09615] transition-colors">
          Back to Menu
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
