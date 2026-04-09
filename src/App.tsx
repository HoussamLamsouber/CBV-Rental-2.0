import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Offres from "./pages/Offres";
import MaReservation from "./pages/MaReservation";
import MonCompte from "./pages/MonCompte";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import About from "./pages/About";

import AdminDashboard from "./pages/AdminDashboard";
import AdminVehicles from "./pages/AdminVehicles";
import AdminCarDetails from "./pages/AdminCarsDetails";
import AdminAuth from './pages/AdminAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { AuthProvider } from './contexts/AuthContext';
import AdminUsers from "./pages/AdminUsers";
import AdminReservations from "./pages/AdminReservations";
import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import "@/i18n.ts";
import AdminLocalisations from "./pages/AdminLocalisations";
import AdminDepots from "./pages/AdminDepots";
import { AdminLayout } from './components/AdminLayout';
import Contact from "./pages/Contact";
import ScrollToTop from "./components/ScrollToTop";

import { Footer } from './components/Footer';

const queryClient = new QueryClient();

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// Layout pour les pages publiques avec Header
const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    <Header />
    <main className="flex-1 pt-24">
      {children}
    </main>
    <Footer />
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <AppProviders>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              {/* Site client - avec Header public */}
              <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
              <Route path="/offres" element={<PublicLayout><Offres /></PublicLayout>} />
              <Route path="/ma-reservation" element={<PublicLayout><MaReservation /></PublicLayout>} />
              <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
              <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <PublicLayout>
                      <MonCompte />
                    </PublicLayout>
                  </ProtectedRoute>
                } 
              />

              {/* Route spéciale pour Changer mot de passe - sans PublicLayout car géré dans le composant */}
              <Route 
                path="/changer-mot-de-passe" 
                element={
                  <ProtectedRoute>
                      <ChangePassword />
                  </ProtectedRoute>
                } 
              />

              {/* Admin - avec AdminLayout */}
              <Route path="/admin" element={<AdminAuth />} />
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/profile" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout>
                      <MonCompte />
                    </AdminLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/vehicles" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout>
                      <AdminVehicles />
                    </AdminLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/vehicle/:id" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout>
                      <AdminCarDetails />
                    </AdminLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/reservations" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout>
                      <AdminReservations />
                    </AdminLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout>
                      <AdminUsers />
                    </AdminLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/localisations" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout>
                      <AdminLocalisations />
                    </AdminLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/depots" 
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminLayout>
                      <AdminDepots />
                    </AdminLayout>
                  </ProtectedRoute>
                } 
              />

              <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
            </Routes>
          </TooltipProvider>
        </AppProviders>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;