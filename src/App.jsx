import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ServicesPage from "./pages/services/ServicesPage";
import DevicesPage from "./pages/devices/DevicesPage";
import ProjectWorkspacePage from "./pages/projects/ProjectWorkspacePage";
import ProjectServiceHealthPage from "./pages/projects/ProjectServiceHealthPage";
import ProjectDeviceHealthPage from "./pages/projects/ProjectDeviceHealthPage";
import ProjectHistoricalMetricsPage from "./pages/projects/ProjectHistoricalMetricsPage";
import ProjectAlertRulesPage from "./pages/projects/ProjectAlertRulesPage";
import ProjectAlertsPage from "./pages/projects/ProjectAlertsPage";
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
        path="/services"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ServicesPage />
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
        path="/projects/:projectId/workspace"
        element={
          <ProtectedRoute>
            <ProjectWorkspacePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:projectId/services"
        element={
          <ProtectedRoute>
            <ProjectServiceHealthPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:projectId/devices"
        element={
          <ProtectedRoute>
            <ProjectDeviceHealthPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:projectId/metrics"
        element={
          <ProtectedRoute>
            <ProjectHistoricalMetricsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:projectId/alert-rules"
        element={
          <ProtectedRoute>
            <ProjectAlertRulesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:projectId/alerts"
        element={
          <ProtectedRoute>
            <ProjectAlertsPage />
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
