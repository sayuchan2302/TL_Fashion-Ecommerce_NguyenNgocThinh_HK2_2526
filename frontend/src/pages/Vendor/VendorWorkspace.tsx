import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import VendorLayout from './VendorLayout';
import VendorDashboard from './VendorDashboard';
import VendorOrders from './VendorOrders';
import VendorOrderDetail from './VendorOrderDetail';
import VendorProducts from './VendorProducts';
import VendorAnalytics from './VendorAnalytics';
import VendorSettings from './VendorSettings';
import VendorStorefront from './VendorStorefront';
import VendorPromotions from './VendorPromotions';
import VendorReviews from './VendorReviews';
import { AdminShellContext, type AdminShellState } from '../Admin/AdminShellContext';

const defaultShellState: AdminShellState = {
  title: 'Tổng quan shop',
};

const VendorWorkspace = () => {
  const [shellState, setShellState] = useState<AdminShellState>(defaultShellState);
  const location = useLocation();
  const routeKey = location.pathname.split('/')[2] || 'dashboard';

  return (
    <VendorLayout
      title={shellState.title}
      actions={shellState.actions}
      hideTopbarTitle={shellState.hideTopbarTitle}
      breadcrumbs={
        shellState.breadcrumbs?.map((label) => ({ label }))
      }
    >
      <AdminShellContext.Provider value={setShellState}>
        <div key={routeKey} className="admin-route-transition">
          <Routes>
            <Route index element={<Navigate to="/vendor/dashboard" replace />} />
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="orders" element={<VendorOrders />} />
            <Route path="orders/:id" element={<VendorOrderDetail />} />
            <Route path="products" element={<VendorProducts />} />
            <Route path="storefront" element={<VendorStorefront />} />
            <Route path="promotions" element={<VendorPromotions />} />
            <Route path="reviews" element={<VendorReviews />} />
            <Route path="analytics" element={<VendorAnalytics />} />
            <Route path="settings" element={<VendorSettings />} />
            <Route path="*" element={<Navigate to="/vendor/dashboard" replace />} />
          </Routes>
        </div>
      </AdminShellContext.Provider>
    </VendorLayout>
  );
};

export default VendorWorkspace;
