import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import LoginPage from "./pages/auth/login";
import SignupPage from "./pages/auth/signup";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Docs from "./pages/Docs";
import Changelog from "./pages/Changelog";
import Success from "./pages/billing/Success";
import Cancel from "./pages/billing/Cancel";
import PricingPage from "./pages/pricing";
import AppErrorBoundary from "@/components/AppErrorBoundary";

const queryClient = new QueryClient();
const Dashboard = lazy(() => import("./pages/Dashboard"));

const RouteLoader = () => (
  <div className="min-h-screen bg-[#0B0F1A] text-white/70 grid place-items-center text-sm">
    Loading...
  </div>
);

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="quantum-ops-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<SignupPage />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/billing/success" element={<Success />} />
              <Route path="/billing/cancel" element={<Cancel />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <Dashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/integrations"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <Dashboard initialTab="integrations" />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
