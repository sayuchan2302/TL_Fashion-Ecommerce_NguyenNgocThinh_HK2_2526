import { Store } from 'lucide-react';
import type { ReactNode } from 'react';
import AdminLayout, { type PanelNavItem } from '../Admin/AdminLayout';
import { VENDOR_DICTIONARY } from './vendorDictionary';
import { vendorPanelNav } from '../../config/panelNavigation';

interface VendorLayoutProps {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  hideTopbarTitle?: boolean;
  breadcrumbs?: Array<{ label: string; to?: string }>;
}

const t = VENDOR_DICTIONARY.layout;

const vendorNavItems: PanelNavItem[] = vendorPanelNav;

const VendorLayout = ({ title, actions, children, hideTopbarTitle = false, breadcrumbs }: VendorLayoutProps) => {
  const crumbLabels = breadcrumbs?.length ? breadcrumbs.map((crumb) => crumb.label) : undefined;

  return (
    <AdminLayout
      title={title}
      actions={actions}
      hideTopbarTitle={hideTopbarTitle}
      breadcrumbs={crumbLabels}
      navItems={vendorNavItems}
      logoIcon={<Store size={22} />}
      logoText={t.logo}
      sidebarDescription={t.sidebar.description}
      sidebarCtaLabel={t.sidebar.cta}
      sidebarCtaTo="/vendor/settings"
      searchPlaceholder={t.searchPlaceholder}
      notificationsLabel={t.notifications}
      settingsLabel={t.settings}
      fallbackUserName="Người bán"
      fallbackUserEmail="seller@store.com"
    >
      {children}
    </AdminLayout>
  );
};

export default VendorLayout;
