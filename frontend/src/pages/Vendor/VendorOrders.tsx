import './Vendor.css';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Filter, Link2, Search, ShieldCheck, Truck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import VendorLayout from './VendorLayout';
import { formatCurrency } from '../../services/commissionService';
import { vendorPortalService, type VendorOrderSummary } from '../../services/vendorPortalService';
import { useToast } from '../../contexts/ToastContext';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';
import AdminConfirmDialog from '../Admin/AdminConfirmDialog';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
] as const;

type PendingAction = {
  ids: string[];
  nextStatus: 'CONFIRMED' | 'SHIPPED';
  title: string;
  description: string;
  confirmLabel: string;
  selectedItems: string[];
};

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };
  return statusMap[status] || status;
};

const getStatusTone = (status: string) => {
  const toneMap: Record<string, string> = {
    pending: 'pending',
    confirmed: 'teal',
    processing: 'teal',
    shipping: 'teal',
    delivered: 'success',
    completed: 'success',
    cancelled: 'error',
  };
  return toneMap[status] || 'neutral';
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const VendorOrders = () => {
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('status') || 'all';
  const [orders, setOrders] = useState<VendorOrderSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const perPage = 8;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const next = await vendorPortalService.getOrders();
        if (!active) return;
        startTransition(() => setOrders(next));
      } catch (err: any) {
        if (!active) return;
        addToast(err?.message || 'Không tải được danh sách đơn hàng con', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [addToast]);

  const filteredOrders = useMemo(() => {
    let next = orders;

    if (activeTab !== 'all') {
      if (activeTab === 'processing') {
        next = next.filter((order) => order.status === 'confirmed' || order.status === 'processing');
      } else if (activeTab === 'completed') {
        next = next.filter((order) => order.status === 'completed' || order.status === 'delivered');
      } else {
        next = next.filter((order) => order.status === activeTab);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      next = next.filter((order) =>
        order.id.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.email.toLowerCase().includes(query),
      );
    }

    return next;
  }, [activeTab, orders, searchQuery]);

  const tabCounts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((order) => order.status === 'pending').length,
    processing: orders.filter((order) => order.status === 'confirmed' || order.status === 'processing').length,
    shipping: orders.filter((order) => order.status === 'shipping').length,
    completed: orders.filter((order) => order.status === 'completed' || order.status === 'delivered').length,
    cancelled: orders.filter((order) => order.status === 'cancelled').length,
  }), [orders]);

  const totalPages = Math.max(Math.ceil(filteredOrders.length / perPage), 1);
  const safePage = Math.min(page, totalPages);
  const startIndex = filteredOrders.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const endIndex = Math.min(safePage * perPage, filteredOrders.length);

  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredOrders.slice(start, start + perPage);
  }, [filteredOrders, safePage]);

  const hasViewContext = activeTab !== 'all' || Boolean(searchQuery.trim());

  const handleTabChange = (key: string) => {
    setSearchParams({ status: key });
    setPage(1);
    setSelected(new Set());
  };

  const resetCurrentView = () => {
    setSearchQuery('');
    setSearchParams({ status: 'all' });
    setPage(1);
    setSelected(new Set());
  };

  const shareCurrentView = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('status', activeTab);
    if (searchQuery.trim()) url.searchParams.set('q', searchQuery.trim());
    await navigator.clipboard.writeText(url.toString());
    addToast('Đã sao chép bộ lọc hiện tại của đơn hàng shop', 'success');
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredOrders.map((order) => order.id)));
      return;
    }
    setSelected(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const askStatusUpdate = (ids: string[], nextStatus: 'CONFIRMED' | 'SHIPPED') => {
    const selectedOrders = orders.filter((order) => ids.includes(order.id));
    if (selectedOrders.length === 0) return;

    setPendingAction({
      ids,
      nextStatus,
      title: nextStatus === 'CONFIRMED' ? 'Xác nhận đơn hàng con' : 'Bàn giao đơn cho vận chuyển',
      description:
        nextStatus === 'CONFIRMED'
          ? 'Các đơn hàng con đã chọn sẽ chuyển sang trạng thái đã xác nhận để đội shop bắt đầu xử lý.'
          : 'Các đơn hàng con đã chọn sẽ chuyển sang trạng thái đang giao để đồng bộ fulfillment.',
      confirmLabel: nextStatus === 'CONFIRMED' ? 'Xác nhận đơn' : 'Bàn giao vận chuyển',
      selectedItems: selectedOrders.map((order) => order.id),
    });
  };

  const performStatusUpdate = async (orderId: string, status: 'CONFIRMED' | 'SHIPPED') => {
    setUpdatingId(orderId);
    await vendorPortalService.updateOrderStatus(orderId, status);
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== orderId) return order;
        if (status === 'CONFIRMED') return { ...order, status: 'confirmed' };
        return { ...order, status: 'shipping' };
      }),
    );
    setUpdatingId(null);
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    const ids = pendingAction.ids;
    try {
      setUpdatingId(ids[0] ?? 'bulk');
      await Promise.all(ids.map((id) => performStatusUpdate(id, pendingAction.nextStatus)));
      setSelected(new Set());
      addToast('Đã cập nhật trạng thái đơn hàng con', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Không thể cập nhật trạng thái đơn hàng con', 'error');
    } finally {
      setUpdatingId(null);
      setPendingAction(null);
    }
  };

  const actionablePendingIds = Array.from(selected).filter((id) => orders.find((order) => order.id === id)?.status === 'pending');
  const actionableConfirmedIds = Array.from(selected).filter((id) => orders.find((order) => order.id === id)?.status === 'confirmed');

  return (
    <VendorLayout
      title="Đơn hàng shop"
      breadcrumbs={[{ label: 'Đơn hàng shop' }, { label: 'Xử lý đơn hàng con' }]}
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder="Tìm theo mã đơn, tên khách hoặc email"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ bộ lọc
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>
            <Filter size={16} />
            Đặt lại
          </button>
        </>
      )}
    >
      <div className="admin-stats grid-4">
        <button type="button" className="admin-stat-card vendor-stat-button" onClick={() => handleTabChange('all')}>
          <div className="admin-stat-label">Tổng đơn hàng con</div>
          <div className="admin-stat-value">{tabCounts.all}</div>
          <div className="admin-stat-sub">Toàn bộ fulfillment của shop</div>
        </button>
        <button type="button" className="admin-stat-card warning vendor-stat-button" onClick={() => handleTabChange('pending')}>
          <div className="admin-stat-label">Chờ xác nhận</div>
          <div className="admin-stat-value">{tabCounts.pending}</div>
          <div className="admin-stat-sub">Cần shop kiểm tra ngay</div>
        </button>
        <button type="button" className="admin-stat-card info vendor-stat-button" onClick={() => handleTabChange('shipping')}>
          <div className="admin-stat-label">Đang giao</div>
          <div className="admin-stat-value">{tabCounts.shipping}</div>
          <div className="admin-stat-sub">Đang bàn giao cho đối tác vận chuyển</div>
        </button>
        <button type="button" className="admin-stat-card success vendor-stat-button" onClick={() => handleTabChange('completed')}>
          <div className="admin-stat-label">Hoàn thành</div>
          <div className="admin-stat-value">{tabCounts.completed}</div>
          <div className="admin-stat-sub">Đơn đã kết toán cho shop</div>
        </button>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active vendor-active-tab' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="admin-tab-count">{tabCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {hasViewContext && (
        <div className="admin-view-summary">
          <span className="summary-chip">Trạng thái: {TABS.find((tab) => tab.key === activeTab)?.label || 'Tất cả'}</span>
          {searchQuery.trim() && <span className="summary-chip">Từ khóa: {searchQuery.trim()}</span>}
          <button className="summary-clear" onClick={resetCurrentView}>Xóa bộ lọc</button>
        </div>
      )}

      <section className="admin-panels single">
        <div className="admin-panel">
          {loading ? (
            <AdminStateBlock
              type="empty"
              title="Đang tải đơn hàng con"
              description="Dữ liệu fulfillment của shop đang được đồng bộ từ marketplace."
            />
          ) : filteredOrders.length === 0 ? (
            <AdminStateBlock
              type={searchQuery.trim() ? 'search-empty' : 'empty'}
              title={searchQuery.trim() ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng con phù hợp'}
              description={
                searchQuery.trim()
                  ? 'Thử đổi từ khóa hoặc quay về toàn bộ đơn hàng để tiếp tục xử lý fulfillment.'
                  : 'Khi shop phát sinh sub-order mới, danh sách xử lý sẽ xuất hiện tại đây.'
              }
              actionLabel={searchQuery.trim() ? 'Đặt lại bộ lọc' : undefined}
              onAction={searchQuery.trim() ? resetCurrentView : undefined}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label="Bảng đơn hàng con của shop">
                <div className="admin-table-row vendor-orders admin-table-head" role="row">
                  <div role="columnheader">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả đơn hàng"
                      checked={selected.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                    />
                  </div>
                  <div role="columnheader">Đơn hàng</div>
                  <div role="columnheader">Khách hàng</div>
                  <div role="columnheader">Tổng tiền</div>
                  <div role="columnheader">Phí sàn</div>
                  <div role="columnheader">Thực nhận</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader">Vận hành</div>
                  <div role="columnheader">Hành động</div>
                </div>

                {paginatedOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    className="admin-table-row vendor-orders"
                    role="row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.14) }}
                    whileHover={{ y: -1 }}
                  >
                    <div role="cell">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${order.id}`}
                        checked={selected.has(order.id)}
                        onChange={(event) => toggleOne(order.id, event.target.checked)}
                      />
                    </div>
                    <div role="cell">
                      <div className="admin-bold">{order.id}</div>
                      <div className="admin-muted small">{formatDate(order.date)}</div>
                    </div>
                    <div role="cell">
                      <div className="admin-bold">{order.customer}</div>
                      <div className="admin-muted small">{order.items} sản phẩm • {order.email}</div>
                    </div>
                    <div role="cell" className="admin-bold">{formatCurrency(order.total)}</div>
                    <div role="cell"><span className="badge amber">-{formatCurrency(order.commissionFee)}</span></div>
                    <div role="cell"><span className="badge green">{formatCurrency(order.vendorPayout)}</span></div>
                    <div role="cell">
                      <span className={`admin-pill ${getStatusTone(order.status)}`}>{getStatusLabel(order.status)}</span>
                    </div>
                    <div role="cell" className="vendor-order-ops">
                      {order.status === 'shipping' ? <Truck size={14} /> : <ShieldCheck size={14} />}
                      <span>{order.status === 'shipping' ? 'Đang giao cho đối tác vận chuyển' : 'Chờ shop xử lý'}</span>
                    </div>
                    <div role="cell" className="admin-actions">
                      {order.status === 'pending' && (
                        <button
                          className="admin-primary-btn vendor-admin-primary vendor-inline-btn"
                          onClick={() => askStatusUpdate([order.id], 'CONFIRMED')}
                          disabled={updatingId === order.id || updatingId === 'bulk'}
                        >
                          Xác nhận
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          className="admin-primary-btn vendor-admin-primary vendor-inline-btn"
                          onClick={() => askStatusUpdate([order.id], 'SHIPPED')}
                          disabled={updatingId === order.id || updatingId === 'bulk'}
                        >
                          Bàn giao
                        </button>
                      )}
                      <Link to={`/vendor/orders/${order.id}`} className="admin-ghost-btn vendor-inline-link">
                        Chi tiết
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="table-footer">
                <span className="table-footer-meta">Hiển thị {startIndex}-{endIndex} trên {filteredOrders.length} đơn hàng con</span>
                <div className="pagination">
                  <button className="page-btn" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
                    Trước
                  </button>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index + 1}
                      className={`page-btn ${safePage === index + 1 ? 'active vendor-active-page' : ''}`}
                      onClick={() => setPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    className="page-btn"
                    disabled={safePage === totalPages}
                    onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            className="admin-floating-bar vendor-floating-bar"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="admin-floating-content">
              <span>Đã chọn {selected.size} đơn hàng con</span>
              <div className="admin-actions">
                {actionablePendingIds.length > 0 && (
                  <button className="admin-ghost-btn" onClick={() => askStatusUpdate(actionablePendingIds, 'CONFIRMED')}>
                    Xác nhận đã chọn
                  </button>
                )}
                {actionableConfirmedIds.length > 0 && (
                  <button className="admin-ghost-btn" onClick={() => askStatusUpdate(actionableConfirmedIds, 'SHIPPED')}>
                    Bàn giao đã chọn
                  </button>
                )}
                <button className="admin-ghost-btn" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title || 'Cập nhật trạng thái'}
        description={pendingAction?.description || ''}
        selectedItems={pendingAction?.selectedItems}
        selectedNoun="đơn hàng"
        confirmLabel={pendingAction?.confirmLabel || 'Xác nhận'}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirmPendingAction()}
      />
    </VendorLayout>
  );
};

export default VendorOrders;
