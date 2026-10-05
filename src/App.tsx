import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ComingSoon from "./pages/ComingSoon";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Kitchen from "./pages/Kitchen";
import MenuAdmin from "./pages/MenuAdmin";
import OrderHistory from "./pages/OrderHistory";
import KitchenLogin from "./pages/KitchenLogin";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/features/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<ComingSoon />} />
            <Route path="/menu" element={<Index />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
            <Route path="/kitchen-login" element={<KitchenLogin />} />
            <Route path="/kitchen" element={<ProtectedRoute><Kitchen /></ProtectedRoute>} />
            <Route path="/menu-admin" element={<ProtectedRoute><MenuAdmin /></ProtectedRoute>} />
            <Route path="/orders" element={<OrderHistory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
