import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { AdminOverview } from './tabs/AdminOverview';
import { AdminTableManagement } from './tabs/AdminTableManagement';
import { AdminCategoryManagement } from './tabs/AdminCategoryManagementApi';
import { AdminMenuManagement } from './tabs/AdminMenuManagement';
import { AdminComboManagement } from './tabs/AdminComboManagement';
import { AdminWeeklyMenuManagement } from './tabs/AdminWeeklyMenuManagement';
import { AdminOrderHistory } from './tabs/AdminOrderHistory';
import { AdminOrderManagement } from './tabs/AdminOrderManagement';
import { AdminPayments } from './tabs/AdminPayments';
import { AdminReports } from './tabs/AdminReports';
import { AdminSettings } from './tabs/AdminSettings';
import { AdminBankAccounts } from './tabs/AdminBankAccounts';

export const AdminDashboard = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="tables" element={<AdminTableManagement />} />
        <Route path="categories" element={<AdminCategoryManagement />} />
        <Route path="weekly-menu" element={<AdminWeeklyMenuManagement />} />
        <Route path="menu" element={<AdminMenuManagement />} />
        <Route path="combo" element={<AdminComboManagement />} />
        <Route path="order-history" element={<AdminOrderHistory />} />
        <Route path="orders" element={<AdminOrderManagement />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="bank-accounts" element={<AdminBankAccounts />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
};
