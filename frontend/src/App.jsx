import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AdminRoute, GuestRoute, ProtectedRoute } from './components/auth/RouteGuards';
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
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTrips from './pages/admin/AdminTrips';
import AdminRoutes from './pages/admin/AdminRoutes';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminBookings from './pages/admin/AdminBookings';
import AdminPromotions from './pages/admin/AdminPromotions';
import AdminNews from './pages/admin/AdminNews';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import './styles/global.css';
import './styles/admin.css';
import './styles/auth.css';

function MainLayout() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/trips/:tripId" element={<TripDetailPage />} />
          <Route path="/booking/seats" element={<SeatSelectionPage />} />
          <Route path="/booking/passenger" element={<PassengerInfoPage />} />
          <Route path="/booking/payment" element={<PaymentPage />} />
          <Route path="/booking/success" element={<BookingSuccessPage />} />
          <Route path="/lookup" element={<BookingLookupPage />} />
          <Route path="/my-bookings" element={<BookingLookupPage />} />
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
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <AdminRoute>
        <AdminLayout>
          <Routes>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/trips" element={<AdminTrips />} />
            <Route path="/admin/routes" element={<AdminRoutes />} />
            <Route path="/admin/companies" element={<AdminCompanies />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
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
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
