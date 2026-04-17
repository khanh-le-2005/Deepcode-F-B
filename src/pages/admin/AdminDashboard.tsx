import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { AdminOverview } from './tabs/AdminOverview';
import { AdminTableManagement } from './tabs/AdminTableManagement';
import { AdminCategoryManagement } from './tabs/AdminCategoryManagementApi';
import { AdminMenuManagement } from './tabs/AdminMenuManagement';
import { AdminMenuEditor } from './tabs/AdminMenuEditor';
import { AdminComboManagement } from './tabs/AdminComboManagement';
import { AdminWeeklyMenuManagement } from './tabs/AdminWeeklyMenuManagement';
import { AdminOrderHistory } from './tabs/AdminOrderHistory';
import { AdminOrderManagement } from './tabs/AdminOrderManagement';
import { AdminPayments } from './tabs/AdminPayments';
import { AdminReports } from './tabs/AdminReports';
import { AdminSettings } from './tabs/AdminSettings';
import { AdminUserManagement } from './tabs/AdminUserManagement';
import { AdminPaymentRequests } from './tabs/AdminPaymentRequests';
import { AdminNotifications } from './tabs/AdminNotifications';

export const AdminDashboard = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="tables" element={<AdminTableManagement />} />
        <Route path="categories" element={<AdminCategoryManagement />} />
        <Route path="menu" element={<AdminMenuManagement />} />
        <Route path="menu/create" element={<AdminMenuEditor />} />
        <Route path="menu/edit/:id" element={<AdminMenuEditor />} />
        <Route path="combo" element={<AdminComboManagement />} />
        <Route path="weekly-menu" element={<AdminWeeklyMenuManagement />} />
        <Route path="order-history" element={<AdminOrderHistory />} />
        <Route path="orders" element={<AdminOrderManagement />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="users" element={<AdminUserManagement />} />
        <Route path="payment-requests" element={<AdminPaymentRequests />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
};
