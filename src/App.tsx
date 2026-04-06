import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthMfaSetup from "./pages/AuthMfaSetup";
import AuthMfaVerify from "./pages/AuthMfaVerify";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Docs from "./pages/Docs";
import Changelog from "./pages/Changelog";
import Success from "./pages/billing/Success";
import Cancel from "./pages/billing/Cancel";
import PricingPage from "./pages/pricing";
import LaunchSetup from "./pages/LaunchSetup";
import LiveDemoPage from "./pages/LiveDemoPage";
import MailtoRedirect from "./pages/MailtoRedirect";
import FeaturesPage from "./pages/FeaturesPage";
import { BillingDashboard } from "./pages/billing/BillingDashboard";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import ScrollToTop from "@/components/layout/ScrollToTop";

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
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <ScrollToTop />
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/mfa-setup" element={<AuthMfaSetup />} />
              <Route path="/auth/mfa-verify" element={<AuthMfaVerify />} />
              <Route path="/auth/login" element={<Navigate to="/auth" replace />} />
              <Route path="/auth/signup" element={<Navigate to="/auth?signup=1" replace />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/live-demo" element={<LiveDemoPage />} />
              <Route path="/docs/api" element={<Navigate to="/docs#api-sdk" replace />} />
              <Route path="/docs/sdk" element={<Navigate to="/docs#api-sdk-agent-api" replace />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route
                path="/careers"
                element={
                  <MailtoRedirect href="mailto:careers@zorvexa.com?subject=Careers%20%E2%80%94%20Zorvexa" />
                }
              />
              <Route path="/support" element={<Navigate to="/docs#help" replace />} />
              <Route
                path="/sales"
                element={<MailtoRedirect href="mailto:sales@zorvexa.com?subject=Sales%20%E2%80%94%20Zorvexa" />}
              />
              <Route path="/status" element={<Navigate to="/changelog" replace />} />
              <Route path="/billing/success" element={<Success />} />
              <Route path="/billing/cancel" element={<Cancel />} />
              <Route
                path="/billing"
                element={
                  <ProtectedRoute>
                    <BillingDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/launch-setup"
                element={
                  <ProtectedRoute>
                    <LaunchSetup />
                  </ProtectedRoute>
                }
              />
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
