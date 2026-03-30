import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Chat from "./pages/Chat";
import Tasks from "./pages/Tasks";
import Reminders from "./pages/Reminders";
import CalendarPage from "./pages/CalendarPage";
import WhatsApp from "./pages/WhatsApp";
import Profile from "./pages/Profile";
import Statistics from "./pages/Statistics";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";

// Components
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

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
        path="/dashboard/subscription/success"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SubscriptionSuccess />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
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
  );
}

export default App;
