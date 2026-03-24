import './AdminFinancials.css';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Eye, Link2, Search, WalletCards, X } from 'lucide-react';
import AdminLayout from './AdminLayout';
import AdminConfirmDialog from './AdminConfirmDialog';
import { AdminStateBlock } from './AdminStateBlocks';
import { PanelStatsGrid, PanelTabs, PanelViewSummary } from '../../components/Panel/PanelPrimitives';
import { useToast } from '../../contexts/ToastContext';
import { listAdminOrders, subscribeAdminOrders } from './adminOrderService';
import type { AdminOrderRecord } from './adminOrderService';

type FinancialStatus = 'PENDING_PAYOUT' | 'READY_TO_PAY' | 'PAID' | 'UNDER_REVIEW';
type FinancialFilter = 'all' | 'pending' | 'ready' | 'paid' | 'review';

interface FinancialRecord {
  id: string;
  period: string;
  scope: string;
  gmv: number;
  commission: number;
  payout: number;
  refundAdjustment: number;
  status: FinancialStatus;
  note: string;
  updatedAt: string;
  orderCodes: string[];
  orderCount: number;
}

type ConfirmState = {
  ids: string[];
  selectedItems: string[];
};

const FINANCIAL_TABS: Array<{ key: FinancialFilter; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ đối soát' },
  { key: 'ready', label: 'Sẵn sàng giải ngân' },
  { key: 'paid', label: 'Đã giải ngân' },
  { key: 'review', label: 'Cần rà soát' },
];

const DEFAULT_COMMISSION_RATE = 0.05;
const PAGE_SIZE = 8;

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

const formatStatusLabel = (status: FinancialStatus) => {
  if (status === 'PENDING_PAYOUT') return 'Chờ đối soát';
  if (status === 'READY_TO_PAY') return 'Sẵn sàng giải ngân';
  if (status === 'PAID') return 'Đã giải ngân';
  return 'Cần rà soát';
};

const formatStatusTone = (status: FinancialStatus) => {
  if (status === 'READY_TO_PAY') return 'success';
  if (status === 'PAID') return 'info';
  if (status === 'UNDER_REVIEW') return 'error';
  return 'pending';
};

const mapFilterToStatus = (filter: FinancialFilter) => {
  if (filter === 'pending') return 'PENDING_PAYOUT';
  if (filter === 'ready') return 'READY_TO_PAY';
  if (filter === 'paid') return 'PAID';
  if (filter === 'review') return 'UNDER_REVIEW';
  return null;
};

const getOrderTotal = (order: AdminOrderRecord) =>
  order.pricing.subtotal + order.pricing.shipping - order.pricing.discount;

const getOrderCommission = (order: AdminOrderRecord) =>
  Math.round(order.pricing.subtotal * (order.commissionRate ?? DEFAULT_COMMISSION_RATE) * 100) / 100;

const getFinancialStatus = (
  orders: AdminOrderRecord[],
  override?: FinancialStatus,
  refundAdjustment = 0,
): FinancialStatus => {
  if (override === 'PAID') return 'PAID';
  if (refundAdjustment > 0) return 'UNDER_REVIEW';
  if (orders.some((order) => order.fulfillment === 'done')) return 'READY_TO_PAY';
  return 'PENDING_PAYOUT';
};

const buildPeriodLabel = (orders: AdminOrderRecord[]) => {
  const timestamps = orders
    .map((order) => new Date(order.date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (timestamps.length === 0) {
    return 'Chưa xác định kỳ';
  }

  const start = timestamps[0];
  const end = timestamps[timestamps.length - 1];
  return `Kỳ ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}`;
};

const buildFinancialRecords = (
  orders: AdminOrderRecord[],
  payoutOverrides: Record<string, FinancialStatus>,
): FinancialRecord[] => {
  const grouped = new Map<string, AdminOrderRecord[]>();

  orders.forEach((order) => {
    const scope = order.storeName?.trim() || 'Marketplace direct';
    const current = grouped.get(scope) || [];
    current.push(order);
    grouped.set(scope, current);
  });

  return Array.from(grouped.entries())
    .map(([scope, scopedOrders]) => {
      const gmv = scopedOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
      const completedOrders = scopedOrders.filter((order) => order.fulfillment === 'done');
      const commission = completedOrders.reduce((sum, order) => sum + getOrderCommission(order), 0);
      const payout = completedOrders.reduce((sum, order) => sum + (getOrderTotal(order) - getOrderCommission(order)), 0);
      const refundAdjustment = scopedOrders
        .filter((order) => order.fulfillment === 'canceled')
        .reduce((sum, order) => sum + getOrderTotal(order), 0);
      const updatedAt = scopedOrders.reduce((latest, order) => latest > order.updatedAt ? latest : order.updatedAt, scopedOrders[0]?.updatedAt || new Date().toISOString());
      const recordId = `financial-${scope.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const status = getFinancialStatus(scopedOrders, payoutOverrides[recordId], refundAdjustment);

      return {
        id: recordId,
        period: buildPeriodLabel(scopedOrders),
        scope,
        gmv,
        commission,
        payout,
        refundAdjustment,
        status,
        updatedAt,
        orderCodes: scopedOrders.map((order) => order.code),
        orderCount: scopedOrders.length,
        note:
          status === 'UNDER_REVIEW'
            ? 'Có đơn hủy hoặc điều chỉnh cần rà soát trước khi chốt payout.'
            : status === 'PAID'
              ? 'Nhóm đơn hàng này đã được operator xác nhận giải ngân.'
              : status === 'READY_TO_PAY'
                ? 'Đã có đơn hoàn tất và đủ điều kiện chuyển sang payout.'
                : 'Đang chờ thêm đơn hoàn tất hoặc chờ operator đối soát.',
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

const AdminFinancials = () => {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FinancialFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailRecord, setDetailRecord] = useState<FinancialRecord | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [page, setPage] = useState(1);
  const [payoutOverrides, setPayoutOverrides] = useState<Record<string, FinancialStatus>>({});

  useEffect(() => {
    const syncOrders = () => setOrders(listAdminOrders());
    syncOrders();
    return subscribeAdminOrders(syncOrders);
  }, []);

  const records = useMemo(
    () => buildFinancialRecords(orders, payoutOverrides),
    [orders, payoutOverrides],
  );

  const filteredRecords = useMemo(() => {
    let next = records;
    const targetStatus = mapFilterToStatus(activeTab);
    if (targetStatus) {
      next = next.filter((record) => record.status === targetStatus);
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      next = next.filter((record) =>
        `${record.scope} ${record.period} ${record.note} ${record.orderCodes.join(' ')}`
          .toLowerCase()
          .includes(query),
      );
    }

    return next;
  }, [activeTab, records, search]);

  const counts = useMemo(() => ({
    all: records.length,
    pending: records.filter((record) => record.status === 'PENDING_PAYOUT').length,
    ready: records.filter((record) => record.status === 'READY_TO_PAY').length,
    paid: records.filter((record) => record.status === 'PAID').length,
    review: records.filter((record) => record.status === 'UNDER_REVIEW').length,
  }), [records]);

  const totals = useMemo(() => ({
    gmv: records.reduce((sum, record) => sum + record.gmv, 0),
    commission: records.reduce((sum, record) => sum + record.commission, 0),
    payout: records.reduce((sum, record) => sum + record.payout, 0),
    review: records.filter((record) => record.status === 'UNDER_REVIEW').length,
  }), [records]);

  const totalPages = Math.max(Math.ceil(filteredRecords.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);
  const pagedRecords = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, safePage]);

  const hasViewContext = activeTab !== 'all' || Boolean(search.trim());

  const resetCurrentView = () => {
    setSearch('');
    setActiveTab('all');
    setSelected(new Set());
    setPage(1);
  };

  const shareCurrentView = async () => {
    await navigator.clipboard.writeText(window.location.href);
    addToast('Đã sao chép bộ lọc hiện tại của tài chính sàn', 'success');
  };

  const openReleaseConfirm = (ids: string[]) => {
    const items = records.filter((record) => ids.includes(record.id) && record.status === 'READY_TO_PAY');
    if (items.length === 0) {
      addToast('Không có bản ghi nào sẵn sàng giải ngân trong lựa chọn hiện tại', 'info');
      return;
    }

    setConfirmState({
      ids: items.map((item) => item.id),
      selectedItems: items.map((item) => item.scope),
    });
  };

  const applyPayout = () => {
    if (!confirmState) return;

    setPayoutOverrides((prev) => ({
      ...prev,
      ...Object.fromEntries(confirmState.ids.map((id) => [id, 'PAID' as FinancialStatus])),
    }));

    setSelected(new Set());
    setConfirmState(null);
    addToast('Đã xác nhận giải ngân cho các bản ghi đã chọn', 'success');
  };

  return (
    <AdminLayout
      title="Tài chính sàn"
      breadcrumbs={['Tài chính sàn', 'Đối soát và giải ngân']}
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder="Tìm theo kỳ đối soát, phạm vi hoặc mã đơn"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ bộ lọc
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Đặt lại</button>
        </>
      )}
    >
      <PanelStatsGrid
        items={[
          { key: 'gmv', label: 'GMV toàn sàn', value: formatCurrency(totals.gmv), sub: 'Tổng giá trị đơn hàng từ bảng vận hành hiện tại' },
          { key: 'commission', label: 'Commission thực thu', value: formatCurrency(totals.commission), sub: 'Tổng phí sàn từ các đơn đã hoàn tất', tone: 'info' },
          { key: 'payout', label: 'Payout phải trả', value: formatCurrency(totals.payout), sub: 'Tổng số tiền đủ điều kiện giải ngân cho shop', tone: 'success' },
          { key: 'review', label: 'Cần rà soát', value: totals.review, sub: 'Nhóm đơn có hủy hoặc điều chỉnh cần kiểm tra', tone: totals.review > 0 ? 'danger' : '', onClick: () => setActiveTab('review') },
        ]}
      />

      <PanelTabs
        items={FINANCIAL_TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
          count: counts[tab.key],
        }))}
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as FinancialFilter);
          setSelected(new Set());
          setPage(1);
        }}
      />

      <PanelViewSummary
        chips={[
          ...(hasViewContext ? [{ key: 'scope', label: <>Nhóm: {FINANCIAL_TABS.find((tab) => tab.key === activeTab)?.label || 'Tất cả'}</> }] : []),
          ...(search.trim() ? [{ key: 'search', label: <>Từ khóa: {search.trim()}</> }] : []),
        ]}
        clearLabel="Xóa bộ lọc"
        onClear={resetCurrentView}
      />

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Sổ đối soát và commission</h2>
            <span className="admin-muted">Bảng này được tổng hợp từ nguồn đơn hàng admin hiện có để operator nhìn GMV, commission, payout và các nhóm cần rà soát trước khi giải ngân.</span>
          </div>
          <div className="admin-hint">
            <span className="admin-bold">Trạng thái module</span>
            <span className="admin-muted">Đây là bản backend-aware theo nguồn đơn hàng hiện tại, nhưng chưa phải ledger tài chính cuối cùng. Khi backend payout hoàn chỉnh, màn này sẽ trở thành source of truth đầy đủ hơn.</span>
          </div>

          {filteredRecords.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không tìm thấy bản ghi tài chính phù hợp' : 'Chưa có bản ghi tài chính'}
              description={
                search.trim()
                  ? 'Thử đổi từ khóa hoặc đặt lại bộ lọc để xem lại danh sách đối soát.'
                  : 'Bản ghi tài chính sẽ xuất hiện khi hệ thống có dữ liệu đơn hàng đủ để tổng hợp payout và commission.'
              }
              actionLabel="Đặt lại bộ lọc"
              onAction={resetCurrentView}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label="Bảng đối soát tài chính sàn">
                <div className="admin-table-row financials admin-table-head" role="row">
                  <div role="columnheader">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredRecords.length && filteredRecords.length > 0}
                      onChange={(event) => setSelected(event.target.checked ? new Set(filteredRecords.map((item) => item.id)) : new Set())}
                    />
                  </div>
                  <div role="columnheader">Kỳ đối soát</div>
                  <div role="columnheader">Phạm vi</div>
                  <div role="columnheader">GMV</div>
                  <div role="columnheader">Commission</div>
                  <div role="columnheader">Payout</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader">Hành động</div>
                </div>

                {pagedRecords.map((record) => (
                  <motion.div
                    key={record.id}
                    className="admin-table-row financials"
                    role="row"
                    whileHover={{ y: -1 }}
                    onClick={() => setDetailRecord(record)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div role="cell" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(record.id)}
                        onChange={(event) => {
                          const next = new Set(selected);
                          if (event.target.checked) next.add(record.id);
                          else next.delete(record.id);
                          setSelected(next);
                        }}
                      />
                    </div>
                    <div role="cell">
                      <div className="admin-bold">{record.period}</div>
                      <div className="admin-muted small">Cập nhật {new Date(record.updatedAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <div role="cell">
                      <div className="admin-bold">{record.scope}</div>
                      <div className="admin-muted small">
                        {record.orderCount} đơn • {record.refundAdjustment > 0 ? `Rà soát ${formatCurrency(record.refundAdjustment)}` : 'Không có điều chỉnh hoàn đơn'}
                      </div>
                    </div>
                    <div role="cell" className="admin-bold">{formatCurrency(record.gmv)}</div>
                    <div role="cell" className="admin-bold">{formatCurrency(record.commission)}</div>
                    <div role="cell">
                      <div className="admin-bold">{formatCurrency(record.payout)}</div>
                      <div className="admin-muted small">Sau khấu trừ commission</div>
                    </div>
                    <div role="cell">
                      <span className={`admin-pill ${formatStatusTone(record.status)}`}>{formatStatusLabel(record.status)}</span>
                    </div>
                    <div role="cell" className="admin-actions" onClick={(event) => event.stopPropagation()}>
                      <button className="admin-icon-btn subtle" title="Xem chi tiết" aria-label="Xem chi tiết" onClick={() => setDetailRecord(record)}>
                        <Eye size={16} />
                      </button>
                      {record.status === 'READY_TO_PAY' && (
                        <button className="admin-icon-btn subtle" title="Xác nhận giải ngân" aria-label="Xác nhận giải ngân" onClick={() => openReleaseConfirm([record.id])}>
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="table-footer">
                <span className="table-footer-meta">
                  Hiển thị {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filteredRecords.length)} trên {filteredRecords.length} bản ghi
                </span>
                <div className="pagination">
                  <button className="page-btn" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Trước</button>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button key={index + 1} className={`page-btn ${safePage === index + 1 ? 'active' : ''}`} onClick={() => setPage(index + 1)}>
                      {index + 1}
                    </button>
                  ))}
                  <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(current + 1, totalPages))}>Sau</button>
                </div>
              </div>
            </>
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
              <span>Đã chọn {selected.size} bản ghi tài chính</span>
              <div className="admin-actions">
                <button className="admin-ghost-btn" onClick={() => openReleaseConfirm(Array.from(selected))}>
                  Xác nhận giải ngân
                </button>
                <button className="admin-ghost-btn" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminConfirmDialog
        open={Boolean(confirmState)}
        title="Xác nhận giải ngân payout"
        description="Các bản ghi đã chọn sẽ được đánh dấu là đã giải ngân. Chỉ thực hiện khi operator đã đối soát xong commission và các điều chỉnh hoàn đơn."
        selectedItems={confirmState?.selectedItems}
        selectedNoun="bản ghi tài chính"
        confirmLabel="Xác nhận giải ngân"
        onCancel={() => setConfirmState(null)}
        onConfirm={applyPayout}
      />

      {detailRecord && (
        <>
          <div className="drawer-overlay" onClick={() => setDetailRecord(null)} />
          <div className="drawer financial-drawer">
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">Chi tiết tài chính</p>
                <h3>{detailRecord.scope}</h3>
              </div>
              <button className="admin-icon-btn" onClick={() => setDetailRecord(null)} aria-label="Đóng chi tiết tài chính">
                <X size={16} />
              </button>
            </div>

            <div className="drawer-body">
              <section className="drawer-section">
                <h4>Tổng quan kỳ đối soát</h4>
                <div className="financial-drawer-hero">
                  <div className="financial-avatar">
                    <WalletCards size={22} />
                  </div>
                  <div>
                    <div className="admin-bold">{detailRecord.period}</div>
                    <div className="admin-muted">{detailRecord.scope}</div>
                  </div>
                  <span className={`admin-pill ${formatStatusTone(detailRecord.status)}`}>{formatStatusLabel(detailRecord.status)}</span>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Bảng tóm tắt số liệu</h4>
                <div className="financial-signal-grid">
                  <div className="financial-signal-card">
                    <span className="admin-muted small">GMV</span>
                    <strong>{formatCurrency(detailRecord.gmv)}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Commission</span>
                    <strong>{formatCurrency(detailRecord.commission)}</strong>
                  </div>
                  <div className="financial-signal-card">
                    <span className="admin-muted small">Payout</span>
                    <strong>{formatCurrency(detailRecord.payout)}</strong>
                  </div>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Điều chỉnh và ghi chú</h4>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Hoàn đơn / điều chỉnh</span>
                    <span className="admin-muted">{formatCurrency(detailRecord.refundAdjustment)}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Mã đơn liên quan</span>
                    <span className="admin-muted">{detailRecord.orderCodes.join(', ')}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Cập nhật gần nhất</span>
                    <span className="admin-muted">{new Date(detailRecord.updatedAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
                <p className="admin-muted financial-note">{detailRecord.note}</p>
              </section>
            </div>

            <div className="drawer-footer">
              <button className="admin-ghost-btn" onClick={() => setDetailRecord(null)}>Đóng</button>
              {detailRecord.status === 'READY_TO_PAY' && (
                <button className="admin-primary-btn" onClick={() => openReleaseConfirm([detailRecord.id])}>
                  <ArrowUpRight size={14} />
                  Xác nhận giải ngân
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminFinancials;
