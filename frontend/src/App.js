import React from "react";
import * as Sentry from "@sentry/react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import Chat from "./pages/Chat";
import Tasks from "./pages/Tasks";
import Reminders from "./pages/Reminders";
import CalendarPage from "./pages/CalendarPage";
import WhatsApp from "./pages/WhatsApp";
import Profile from "./pages/Profile";
import Statistics from "./pages/Statistics";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import Team from "./pages/Team";
import ImageAnalysis from "./pages/ImageAnalysis";

// Components
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

// Admin Pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminSystem from "./pages/admin/AdminSystem";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminUsage from "./pages/admin/AdminUsage";
import AdminWhatsApp from "./pages/admin/AdminWhatsApp";

// Router component to handle session_id detection
const AppRouter = () => {
  const location = useLocation();

  // Check URL fragment for session_id BEFORE rendering routes
  // This prevents race conditions with ProtectedRoute
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Chat />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/tasks"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Tasks />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/reminders"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Reminders />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/calendar"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CalendarPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/whatsapp"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <WhatsApp />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/profile"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/team"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Team />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/statistics"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Statistics />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/image-analysis"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ImageAnalysis />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/subscription/success"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SubscriptionSuccess />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="system" element={<AdminSystem />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="usage" element={<AdminUsage />} />
        <Route path="whatsapp" element={<AdminWhatsApp />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function GlobalErrorFallback({ error, resetError }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" data-testid="global-error-fallback">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-500 mb-1">حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.</p>
        <p className="text-xs text-slate-400 mb-6 font-mono break-all">{error?.message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetError}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
          >
            Try again · حاول مجدداً
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            Go home · الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => <GlobalErrorFallback error={error} resetError={resetError} />}
      beforeCapture={(scope) => scope.setTag("boundary", "app-root")}
    >
      <div className="App">
        <BrowserRouter>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <AppRouter />
                <Toaster position="top-right" />
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </BrowserRouter>
      </div>
    </Sentry.ErrorBoundary>
  );
}

export default App;
