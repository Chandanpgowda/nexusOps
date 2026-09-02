import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Incidents } from './pages/Incidents';
import { Assets } from './pages/Assets';
import { Knowledge } from './pages/Knowledge';
import { Problems } from './pages/Problems';
import { Changes } from './pages/Changes';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="assets" element={<Assets />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="problems" element={<Problems />} />
        <Route path="changes" element={<Changes />} />
        <Route path="assets" element={<Assets />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="problems" element={<Problems />} />
        <Route path="changes" element={<Changes />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}