import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AdminRoute, GuestRoute, ProtectedRoute } from './components/auth/RouteGuards';
import VnpayReturnPage from './pages/TicketPaymentPanel';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import TripDetailPage from './pages/TripDetailPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import PassengerInfoPage from './pages/PassengerInfoPage';
import PaymentPage from './pages/PaymentPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import BookingLookupPage from './pages/BookingLookupPage';
import MyBookingsPage from './pages/MyBookingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLayout from './components/admin/AdminLayout';
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminTrips = lazy(() => import('./pages/admin/AdminTrips'));
const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes'));
const AdminCompanies = lazy(() => import('./pages/admin/AdminCompanies'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminPromotions = lazy(() => import('./pages/admin/AdminPromotions'));
const AdminNews = lazy(() => import('./pages/admin/AdminNews'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminAnomalies = lazy(() => import('./pages/admin/AdminAnomalies'));
import './styles/global.css';
import './styles/admin.css';
import './styles/auth.css';

const OperatorPortal = lazy(() => import('./pages/operator/OperatorPortal'));
const CompanyAccessPage = lazy(() => import('./pages/operator/OperatorPortal').then(m => ({ default: m.CompanyAccessPage })));
const PaymentBookingsPage = lazy(() => import('./pages/operator/OperatorPortal').then(m => ({ default: m.BookingsPage })));

const PaymentIssuesPage = lazy(() => import('./pages/operator/CounterPages').then(m => ({default:m.PaymentIssuesPage})));
function MainLayout() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/trips/:tripId" element={<TripDetailPage />} />
          <Route path="/booking/seats" element={<ProtectedRoute><SeatSelectionPage /></ProtectedRoute>} />
          <Route path="/booking/passenger" element={<ProtectedRoute><PassengerInfoPage /></ProtectedRoute>} />
          <Route path="/booking/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/booking/success" element={<ProtectedRoute><BookingSuccessPage /></ProtectedRoute>} />
          <Route path="/payment/vnpay-return" element={<VnpayReturnPage />} />
          <Route path="/lookup" element={<BookingLookupPage />} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
          <Route
            path="/login"
            element={(
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            )}
          />
          <Route
            path="/register"
            element={(
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function AppContent() {
  const location = useLocation();
  if (location.pathname.startsWith('/company') || location.pathname.startsWith('/staff')) return <OperatorPortal />;
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <AdminRoute>
        <AdminLayout>
          <Routes>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/integrations" element={<IntegrationsPage admin />} />
            <Route path="/admin/payment-issues" element={<PaymentIssuesPage admin />} />
            <Route path="/admin/company-access" element={<CompanyAccessPage />} />
            <Route path="/admin/payments" element={<PaymentBookingsPage admin />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/trips" element={<AdminTrips />} />
            <Route path="/admin/routes" element={<AdminRoutes />} />
            <Route path="/admin/companies" element={<AdminCompanies />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/anomalies" element={<AdminAnomalies />} />
            <Route path="/admin/promotions" element={<AdminPromotions />} />
            <Route path="/admin/news" element={<AdminNews />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return <MainLayout />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Suspense fallback={<div className="auth-guard-loading">Đang tải trang…</div>}><AppContent /></Suspense>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
