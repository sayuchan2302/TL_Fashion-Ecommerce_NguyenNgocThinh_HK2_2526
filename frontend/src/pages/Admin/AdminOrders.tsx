import './Admin.css';
import { Link } from 'react-router-dom';
import { Filter, Search, Truck, Eye, Printer, Link2, CheckCircle2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  canTransitionFulfillment,
  shipLabel,
  paymentLabel,
  type FulfillmentStatus,
  type PaymentStatus,
} from './orderWorkflow';
import { AdminStateBlock, AdminTableSkeleton } from './AdminStateBlocks';
import { useAdminListState } from './useAdminListState';
import {
  bulkTransitionToPacking,
  listAdminOrders,
  subscribeAdminOrders,
  transitionAdminOrder,
  type AdminOrderRecord,
} from './adminOrderService';
import { ADMIN_VIEW_KEYS } from './adminListView';
import { useAdminViewState } from './useAdminViewState';
import { useAdminToast } from './useAdminToast';
import { ADMIN_DICTIONARY } from './adminDictionary';
import { PanelStatsGrid, PanelTabs, PanelViewSummary } from '../../components/Panel/PanelPrimitives';

interface AdminOrderRow {
  code: string;
  customer: string;
  email: string;
  phone: string;
  avatar: string;
  total: string;
  paymentStatus: PaymentStatus;
  shipMethod: string;
  fulfillment: FulfillmentStatus;
  date: string;
}

const mapOrderRecordToRow = (order: AdminOrderRecord): AdminOrderRow => ({
  code: order.code,
  customer: order.customer,
  email: order.customerInfo.email,
  phone: order.customerInfo.phone,
  avatar: order.avatar,
  total: order.total,
  paymentStatus: order.paymentStatus,
  shipMethod: order.shipMethod,
  fulfillment: order.fulfillment,
  date: order.date,
});

const initialOrders: AdminOrderRow[] = listAdminOrders().map(mapOrderRecordToRow);

const tone = (status: string) => {
  const lower = status.toLowerCase();
  if (lower.includes('thanh toan') || lower.includes('giao')) return 'success';
  if (lower.includes('dang') || lower.includes('cho')) return 'pending';
  if (lower.includes('that bai') || lower.includes('hoan tien') || lower.includes('huy')) return 'error';
  if (lower.includes('chua')) return 'neutral';
  return 'neutral';
};

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ tiếp nhận' },
  { key: 'packing', label: 'Đang đóng gói' },
  { key: 'shipping', label: 'Đang vận chuyển' },
  { key: 'done', label: 'Hoàn tất' },
  { key: 'canceled', label: 'Đã hủy' },
];

const validStatusKeys = new Set(tabs.map((tab) => tab.key));

const formatDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN', {
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const validStatusKeysArray = Array.from(validStatusKeys);

const AdminOrders = () => {
  const c = ADMIN_DICTIONARY.common;
  const actions = ADMIN_DICTIONARY.actions;
  const actionTitles = ADMIN_DICTIONARY.actionTitles;
  const aria = useMemo(() => c.aria, [c.aria]);
  const view = useAdminViewState({
    storageKey: ADMIN_VIEW_KEYS.orders,
    path: '/admin/orders',
    validStatusKeys: validStatusKeysArray,
    defaultStatus: 'all',
  });
  const activeTab = validStatusKeys.has(view.status) ? view.status : 'all';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<AdminOrderRow[]>(initialOrders);
  const { toast, pushToast } = useAdminToast();
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);

  const getSearchText = useCallback(
    (o: AdminOrderRow) => `${o.code} ${o.customer} ${paymentLabel(o.paymentStatus)} ${shipLabel(o.fulfillment)}`,
    [],
  );

  const filterPredicate = useCallback(
    (o: AdminOrderRow) => {
      if (activeTab === 'all') return true;
      return o.fulfillment === activeTab;
    },
    [activeTab],
  );

  const {
    search,
    isLoading,
    filteredItems: filteredOrders,
    pagedItems: pagedOrders,
    page,
    totalPages,
    startIndex,
    endIndex,
    next,
    prev,
    setPage,
  } = useAdminListState<AdminOrderRow>({
    items: rows,
    pageSize: 6,
    searchValue: view.search,
    onSearchChange: view.setSearch,
    pageValue: view.page,
    onPageChange: view.setPage,
    getSearchText,
    filterPredicate,
    loadingDeps: [activeTab],
  });

  const shareCurrentView = async () => {
    try {
      await view.shareCurrentView();
      pushToast(ADMIN_DICTIONARY.messages.viewCopied);
    } catch {
      pushToast(ADMIN_DICTIONARY.messages.copyFailed);
    }
  };

  const resetCurrentView = () => {
    setSelected(new Set());
    view.resetCurrentView();
    pushToast('Đã đặt lại hàng đợi đơn hàng cha.');
  };

  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label || 'Tất cả';
  const hasViewContext = activeTab !== 'all' || Boolean(search.trim()) || view.page > 1;

  const tabCounts = {
    all: rows.length,
    pending: rows.filter((o) => o.fulfillment === 'pending').length,
    packing: rows.filter((o) => o.fulfillment === 'packing').length,
    shipping: rows.filter((o) => o.fulfillment === 'shipping').length,
    done: rows.filter((o) => o.fulfillment === 'done').length,
    canceled: rows.filter((o) => o.fulfillment === 'canceled').length,
  } as const;

  const changeTab = (nextTab: string) => {
    setSelected(new Set());
    view.setStatus(nextTab);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredOrders.map((o) => o.code)));
      return;
    }
    setSelected(new Set());
  };

  const toggleOne = (code: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(code);
    else next.delete(code);
    setSelected(next);
  };

  const handleBulkConfirm = () => {
    const { updatedCodes, skippedCodes } = bulkTransitionToPacking(Array.from(selected), 'Admin');
    if (updatedCodes.length === 0) {
      pushToast('Không có đơn hàng cha hợp lệ để chuyển sang đóng gói.');
      return;
    }
    setSelected(new Set());
    if (skippedCodes.length > 0) {
      pushToast(`Đã can thiệp ${updatedCodes.length} đơn, bỏ qua ${skippedCodes.length} đơn.`);
    } else {
      pushToast(`Đã can thiệp ${updatedCodes.length} đơn trong hàng đợi.`);
    }
    setShowBulkConfirmModal(false);
  };

  const selectedCount = selected.size;
  const eligibleForConfirmCount = rows.filter(
    (o) => selected.has(o.code) && canTransitionFulfillment(o.fulfillment, 'packing', o.paymentStatus),
  ).length;
  const skippedCount = Math.max(0, selectedCount - eligibleForConfirmCount);

  const handleBulkPrint = () => {
    if (selected.size === 0) return;
    pushToast(`Đang chuẩn bị bộ audit / invoice cho ${selected.size} đơn hàng cha.`);
  };

  const handleApproveOrder = (code: string) => {
    const result = transitionAdminOrder({
      code,
      nextFulfillment: 'packing',
      actor: 'Admin',
      source: 'orders_list',
    });
    if (!result.ok) {
      pushToast(result.error || 'Không thể can thiệp đơn hàng này.');
      return;
    }
    pushToast(result.message || 'Đã đưa đơn hàng cha vào hàng đợi đóng gói.');
  };

  useEffect(() => {
    const syncOrders = () => {
      setRows(listAdminOrders().map(mapOrderRecordToRow));
    };
    const unsubscribe = subscribeAdminOrders(syncOrders);
    syncOrders();
    return unsubscribe;
  }, []);

  return (
    <AdminLayout
      title="Đơn hàng"
      breadcrumbs={['Đơn hàng cha', 'Toàn cảnh điều hành']}
      actions={
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder="Tìm đơn hàng cha, khách hàng hoặc dấu hiệu tranh chấp"
              aria-label="Tìm đơn hàng cha, khách hàng hoặc dấu hiệu tranh chấp"
              value={search}
              onChange={(e) => view.setSearch(e.target.value)}
            />
          </div>
          <button className="admin-ghost-btn" onClick={() => pushToast(ADMIN_DICTIONARY.messages.advancedFilterComingSoon)}>
            <Filter size={16} /> {c.filter}
          </button>
          <button className="admin-ghost-btn" onClick={shareCurrentView}>
            <Link2 size={16} /> {actions.shareView}
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>
            {actions.resetView}
          </button>
        </>
      }
    >
      <PanelStatsGrid
        items={[
          { key: 'all', label: 'Tổng đơn hàng cha', value: tabCounts.all, sub: 'Toàn bộ đơn hàng cha đang tồn tại trên sàn' },
          { key: 'pending', label: 'Chờ vendor tiếp nhận', value: tabCounts.pending, sub: 'Cần theo dõi SLA tiếp nhận ở các sub-order', tone: tabCounts.pending > 0 ? 'warning' : '', onClick: () => changeTab('pending') },
          { key: 'shipping', label: 'Đang vận chuyển', value: tabCounts.shipping, sub: 'Đơn đang được bàn giao vận chuyển hoặc giao đến khách', tone: 'info', onClick: () => changeTab('shipping') },
        ]}
      />

      <PanelTabs
        items={tabs.map((tab) => ({ key: tab.key, label: tab.label, count: tabCounts[tab.key as keyof typeof tabCounts] }))}
        activeKey={activeTab}
        onChange={changeTab}
      />

      <PanelViewSummary
        chips={[
          ...(hasViewContext ? [{ key: 'status', label: <>{c.statusLabel}: {activeTabLabel}</> }] : []),
          ...(search.trim() ? [{ key: 'search', label: <>{c.keyword}: {search.trim()}</> }] : []),
        ]}
        clearLabel={c.clearFilters}
        onClear={resetCurrentView}
      />

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Danh sách đơn hàng</h2>
            <Link to="/admin">Tổng quan marketplace</Link>
          </div>
          {isLoading ? (
            <AdminTableSkeleton columns={8} rows={6} />
          ) : filteredOrders.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không tìm thấy đơn hàng cha phù hợp' : 'Chưa có đơn hàng cha trong hàng đợi'}
              description={search.trim() ? 'Thử đổi từ khóa hoặc đặt lại bộ lọc để xem lại toàn cảnh đơn.' : 'Khi khách checkout marketplace, đơn hàng cha sẽ xuất hiện tại đây để admin giám sát.'}
              actionLabel={actions.resetFilters}
              onAction={resetCurrentView}
            />
          ) : (
            <div className="admin-table" role="table" aria-label="Bang parent order operator">
              <div className="admin-table-row admin-table-head orders" role="row">
                <div role="columnheader">
                  <input
                    type="checkbox"
                    aria-label={aria.selectAll}
                    checked={selected.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </div>
                <div role="columnheader">ORDER ID</div>
                <div role="columnheader">Khách hàng</div>
                <div role="columnheader" className="text-center">GMV</div>
                <div role="columnheader">Thanh toán</div>
                <div role="columnheader">Vận chuyển</div>
                <div role="columnheader">Ngày tạo</div>
                <div role="columnheader" className="text-right pr-12">Hành động</div>
              </div>
              {pagedOrders.map((order) => (
                <motion.div
                  className="admin-table-row orders"
                  role="row"
                  key={order.code}
                  whileHover={{ y: -1 }}
                  onClick={() => {
                    window.location.href = `/admin/orders/${order.code}`;
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div role="cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={aria.selectItem(order.code)}
                      checked={selected.has(order.code)}
                      onChange={(e) => toggleOne(order.code, e.target.checked)}
                    />
                  </div>
                  <div role="cell" className="admin-bold">#{order.code}</div>
                  <div role="cell" className="customer-info-cell">
                    <img src={order.avatar} alt={order.customer} className="customer-avatar" />
                    <div className="customer-text">
                      <p className="admin-bold customer-name">{order.customer}</p>
                      <p className="admin-muted customer-email">{order.email}</p>
                      <p className="customer-phone">{order.phone}</p>
                    </div>
                  </div>
                  <div role="cell" className="admin-bold order-total">{order.total}</div>
                  <div role="cell">
                    <span className={`admin-pill ${tone(paymentLabel(order.paymentStatus))}`}>{paymentLabel(order.paymentStatus)}</span>
                  </div>
                  <div role="cell">
                    <div className="admin-ship">
                      <span className={`admin-pill ${tone(shipLabel(order.fulfillment))}`}>
                        <Truck size={14} /> {shipLabel(order.fulfillment)}
                      </span>
                      <span className="admin-muted order-ship-method">{order.shipMethod}</span>
                    </div>
                  </div>
                  <div role="cell" className="admin-muted order-date">{formatDateTime(order.date)}</div>
                  <div role="cell" className="admin-actions" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/admin/orders/${order.code}`} className="admin-icon-btn subtle" aria-label={actionTitles.viewDetail}>
                      <Eye size={16} />
                    </Link>
                    {order.fulfillment === 'pending' ? (
                      <button
                        className="admin-icon-btn subtle"
                        type="button"
                        aria-label="Đẩy vào hàng đợi đóng gói"
                        title="Đẩy vào hàng đợi đóng gói"
                        onClick={() => handleApproveOrder(order.code)}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    ) : (
                      <button className="admin-icon-btn subtle" type="button" aria-label={actionTitles.printInvoice} title={actionTitles.printInvoice}>
                        <Printer size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!isLoading && filteredOrders.length > 0 && (
            <div className="table-footer">
              <span className="table-footer-meta">{c.showing(startIndex, endIndex, filteredOrders.length, 'đơn hàng cha')}</span>
              <div className="pagination">
                <button className="page-btn" onClick={prev} disabled={page === 1}>{c.previous}</button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button key={idx + 1} className={`page-btn ${page === idx + 1 ? 'active' : ''}`} onClick={() => setPage(idx + 1)}>
                    {idx + 1}
                  </button>
                ))}
                <button className="page-btn" onClick={next} disabled={page === totalPages}>{c.next}</button>
              </div>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            className="admin-floating-bar"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="admin-floating-content">
              <span>{c.selected(selected.size, 'đơn hàng cha')}</span>
              <div className="admin-actions">
                <button className="admin-ghost-btn" onClick={() => setShowBulkConfirmModal(true)}>Chuyển sang đóng gói</button>
                <button className="admin-ghost-btn" onClick={handleBulkPrint}>Xuất / In</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selected.size > 0 && showBulkConfirmModal && (
        <>
          <div className="drawer-overlay" onClick={() => setShowBulkConfirmModal(false)} />
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-label="Xác nhận can thiệp đơn hàng cha hàng loạt">
            <h3>Xác nhận can thiệp hàng đợi</h3>
            <p>Admin đang thao tác trên {selectedCount} đơn hàng cha đã chọn.</p>
            <div className="confirm-impact-grid">
              <div>
                <span className="admin-muted small">Đơn hợp lệ chuyển sang đóng gói</span>
                <p className="admin-bold">{eligibleForConfirmCount}</p>
              </div>
              <div>
                <span className="admin-muted small">Đơn bị bỏ qua</span>
                <p className="admin-bold">{skippedCount}</p>
              </div>
            </div>
            <div className="confirm-modal-actions">
              <button className="admin-ghost-btn" onClick={() => setShowBulkConfirmModal(false)}>Hủy</button>
              <button className="admin-primary-btn" onClick={handleBulkConfirm} disabled={eligibleForConfirmCount === 0}>
                Xác nhận can thiệp
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast success">{toast}</div>}
    </AdminLayout>
  );
};

export default AdminOrders;
