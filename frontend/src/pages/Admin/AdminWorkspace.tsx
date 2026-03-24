import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import Admin from './Admin';
import AdminOrders from './AdminOrders';
import AdminOrderDetail from './AdminOrderDetail';
import AdminCategories from './AdminCategories';
import AdminUsers from './AdminUsers';
import AdminPromotions from './AdminPromotions';
import AdminReviews from './AdminReviews';
import StoreApprovals from './StoreApprovals';
import AdminFinancials from './AdminFinancials';
import AdminBotAI from './AdminBotAI';
import { AdminShellContext, type AdminShellState } from './AdminShellContext';
import { AdminMountedContext } from './useAdminPageAnimation';

const defaultShellState: AdminShellState = {
  title: 'Tổng quan',
};

const AdminWorkspace = () => {
  const [shellState, setShellState] = useState<AdminShellState>(defaultShellState);
  const location = useLocation();
  const routeKey = location.pathname.split('/')[2] || 'dashboard';

  // After the very first render cycle, mark the workspace as "mounted".
  // Once mounted, child pages will skip their entrance animations to prevent
  // the white-flash on tab switch.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // Small delay so the first page's entrance animation can still play
    const id = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <AdminLayout
      title={shellState.title}
      actions={shellState.actions}
      hideTopbarTitle={shellState.hideTopbarTitle}
      breadcrumbs={shellState.breadcrumbs}
    >
      <AdminMountedContext.Provider value={isMounted}>
        <AdminShellContext.Provider value={setShellState}>
          <div key={routeKey} className="admin-route-transition">
            <Routes>
              <Route index element={<Admin />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="promotions" element={<AdminPromotions />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="stores" element={<StoreApprovals />} />
              <Route path="financials" element={<AdminFinancials />} />
              <Route path="bot-ai" element={<AdminBotAI />} />

              <Route path="products" element={<Navigate to="/admin/categories" replace />} />
              <Route path="customers" element={<Navigate to="/admin/users" replace />} />
              <Route path="customer" element={<Navigate to="/admin/users" replace />} />
              <Route path="returns" element={<Navigate to="/admin/orders" replace />} />
              <Route path="content" element={<Navigate to="/admin/bot-ai" replace />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </AdminShellContext.Provider>
      </AdminMountedContext.Provider>
    </AdminLayout>
  );
};

export default AdminWorkspace;
