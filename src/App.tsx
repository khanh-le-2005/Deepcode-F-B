import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { CartProvider } from './contexts/CartContext';
import ProtectedRoute from './ProtectedRoute';

// Pages
import { WelcomePage } from './pages/customer/WelcomePage';
import { MenuPage } from './pages/customer/MenuPage';
import { MenuItemDetailPage } from './pages/customer/MenuItemDetailPage';
import { OrderTrackingPage } from './pages/customer/OrderTrackingPage';
import { SuccessPage } from './pages/customer/SuccessPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { KitchenDisplay } from './pages/kitchen/KitchenDisplay';
import { StaffPOSPage } from './pages/staff/StaffPOSPage';
import OrangeDrinkKiosk from './pages/customer/OrangeDrinkKiosk';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
        <BrowserRouter>
          <ToastContainer aria-label="Toast notifications" position="top-right" autoClose={3000} />
          <Routes>
            {/* Auth Routes */}
            <Route path="/auth/login" element={<LoginPage />} />

            {/* Customer Routes */}
            <Route path="/table/:tableId" element={<WelcomePage />} />
            <Route path="/table/:tableId/menu" element={<MenuPage />} />
            <Route path="/table/:tableId/menu/:itemId" element={<MenuItemDetailPage />} />
            <Route path="/table/:tableId/tracking" element={<OrderTrackingPage />} />
            <Route path="/table/:tableId/success" element={<SuccessPage />} />
            <Route path="/kiosk" element={<OrangeDrinkKiosk />} />

            {/* Admin Routes (Protected) */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Kitchen Routes (Protected) */}
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff', 'chef']}>
                  <KitchenDisplay />
                </ProtectedRoute>
              }
            />

            <Route
              path="/pos"
              element={
                <ProtectedRoute allowedRoles={['admin', 'staff']}>
                  <StaffPOSPage />
                </ProtectedRoute>
              }
            />

            {/* Customer Delivery Routes (Unified later) */}
            <Route path="/" element={<OrangeDrinkKiosk />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/menu/:itemId" element={<MenuItemDetailPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/tracking/:orderId" element={<OrderTrackingPage />} />
            <Route path="/success" element={<SuccessPage />} />


            {/* Default Route */}
            {/* <Route path="*" element={<Navigate to="/table/1" replace />} /> */}

          </Routes>
        </BrowserRouter>
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
