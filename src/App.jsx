import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import DevicesPage from "./pages/devices/DevicesPage";
import TelemetryPage from "./pages/telemetry/TelemetryPage";
import AlertsPage from "./pages/alerts/AlertsPage";

import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <Routes>

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/devices"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <DevicesPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/telemetry"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TelemetryPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AlertsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />

    </Routes>
  );
}

export default App;
