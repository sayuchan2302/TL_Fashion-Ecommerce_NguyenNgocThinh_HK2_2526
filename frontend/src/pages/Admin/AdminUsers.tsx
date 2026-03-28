import './AdminUsers.css';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, CheckCircle2, Eye, Link2, Search, Shield, ShieldCheck, UserRound, X } from 'lucide-react';
import AdminLayout from './AdminLayout';
import AdminConfirmDialog from './AdminConfirmDialog';
import { AdminStateBlock } from './AdminStateBlocks';
import { PanelStatsGrid, PanelTabs } from '../../components/Panel/PanelPrimitives';
import { useToast } from '../../contexts/ToastContext';
import Drawer from '../../components/Drawer/Drawer';

type UserRole = 'CUSTOMER' | 'VENDOR' | 'SUPER_ADMIN';
type UserStatus = 'ACTIVE' | 'LOCKED' | 'PENDING_VENDOR';
type UserFilter = 'all' | 'customer' | 'vendor' | 'admin' | 'locked';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  storeName?: string;
  totalOrders?: number;
  totalSpent?: number;
  note?: string;
}

const USER_TABS: Array<{ key: UserFilter; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'vendor', label: 'Người bán' },
  { key: 'admin', label: 'Quản trị viên' },
  { key: 'locked', label: 'Đã khóa' },
];

const INITIAL_USERS: UserRecord[] = [
  {
    id: 'user-001',
    name: 'Nguyễn Minh Anh',
    email: 'minhanh@test.local',
    phone: '0909 112 233',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    createdAt: '2026-03-02T09:10:00',
    totalOrders: 14,
    totalSpent: 12850000,
    note: 'Khách hàng thân thiết, không có tín hiệu rủi ro.',
  },
  {
    id: 'user-002',
    name: 'Fashion Hub Operator',
    email: 'vendor@test.local',
    phone: '0900 000 002',
    role: 'VENDOR',
    status: 'ACTIVE',
    createdAt: '2026-03-06T14:25:00',
    storeName: 'Fashion Hub',
    totalOrders: 86,
    totalSpent: 0,
    note: 'Gian hàng đã duyệt, đang bán ổn định trên sàn.',
  },
  {
    id: 'user-003',
    name: 'Marketplace Admin',
    email: 'admin@test.local',
    phone: '0900 000 003',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-02-15T08:00:00',
    note: 'Tài khoản điều hành hệ sinh thái.',
  },
  {
    id: 'user-004',
    name: 'Trần Bảo Ngọc',
    email: 'baongoc@test.local',
    phone: '0988 331 447',
    role: 'CUSTOMER',
    status: 'LOCKED',
    createdAt: '2026-03-12T11:40:00',
    totalOrders: 3,
    totalSpent: 1240000,
    note: 'Tài khoản bị khóa do phát hiện hành vi hoàn đơn bất thường.',
  },
  {
    id: 'user-005',
    name: 'Lê Hoàng Đức',
    email: 'hoangduc@seller.local',
    phone: '0933 881 776',
    role: 'CUSTOMER',
    status: 'PENDING_VENDOR',
    createdAt: '2026-03-18T16:12:00',
    storeName: 'Urban Layer',
    totalOrders: 9,
    totalSpent: 9340000,
    note: 'Đã gửi hồ sơ mở gian hàng, đang chờ duyệt onboarding.',
  },
  {
    id: 'user-006',
    name: 'Phạm Tuấn Kiệt',
    email: 'tuankiet@seller.local',
    phone: '0911 222 119',
    role: 'VENDOR',
    status: 'LOCKED',
    createdAt: '2026-01-19T10:22:00',
    storeName: 'Street Mode',
    totalOrders: 42,
    totalSpent: 0,
    note: 'Gian hàng tạm khóa do vi phạm chính sách vận hành.',
  },
];

type ConfirmState = {
  mode: 'lock' | 'unlock';
  ids: string[];
  selectedItems: string[];
};

const roleLabel = (role: UserRole) => {
  if (role === 'CUSTOMER') return 'Khách hàng';
  if (role === 'VENDOR') return 'Người bán';
  return 'Quản trị viên';
};

const statusLabel = (status: UserStatus) => {
  if (status === 'ACTIVE') return 'Đang hoạt động';
  if (status === 'LOCKED') return 'Đã khóa';
  return 'Chờ duyệt người bán';
};

const statusTone = (status: UserStatus) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'LOCKED') return 'error';
  return 'pending';
};

const roleTone = (role: UserRole) => {
  if (role === 'CUSTOMER') return 'neutral';
  if (role === 'VENDOR') return 'info';
  return 'warning';
};

const AdminUsers = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<UserFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailUser, setDetailUser] = useState<UserRecord | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredUsers = useMemo(() => {
    let next = users;

    if (activeTab !== 'all') {
      next = next.filter((user) => {
        if (activeTab === 'customer') return user.role === 'CUSTOMER';
        if (activeTab === 'vendor') return user.role === 'VENDOR' || user.status === 'PENDING_VENDOR';
        if (activeTab === 'admin') return user.role === 'SUPER_ADMIN';
        return user.status === 'LOCKED';
      });
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      next = next.filter((user) =>
        `${user.name} ${user.email} ${user.phone} ${user.storeName || ''}`.toLowerCase().includes(query),
      );
    }

    return next;
  }, [activeTab, search, users]);

  const counts = useMemo(() => ({
    all: users.length,
    customer: users.filter((user) => user.role === 'CUSTOMER').length,
    vendor: users.filter((user) => user.role === 'VENDOR' || user.status === 'PENDING_VENDOR').length,
    admin: users.filter((user) => user.role === 'SUPER_ADMIN').length,
    locked: users.filter((user) => user.status === 'LOCKED').length,
  }), [users]);

  const totalPages = Math.max(Math.ceil(filteredUsers.length / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const pagedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage]);



  const resetCurrentView = () => {
    setSearch('');
    setActiveTab('all');
    setSelected(new Set());
    setPage(1);
  };

  const shareCurrentView = async () => {
    await navigator.clipboard.writeText(window.location.href);
    addToast('Đã sao chép bộ lọc hiện tại của người dùng', 'success');
  };

  const openConfirm = (mode: 'lock' | 'unlock', ids: string[]) => {
    const items = users.filter((user) => ids.includes(user.id));
    if (items.length === 0) return;
    setConfirmState({
      mode,
      ids,
      selectedItems: items.map((item) => item.name),
    });
  };

  const applyStatusChange = () => {
    if (!confirmState) return;

    setUsers((prev) =>
      prev.map((user) =>
        confirmState.ids.includes(user.id)
          ? {
            ...user,
            status:
              confirmState.mode === 'lock'
                ? 'LOCKED'
                : user.role === 'CUSTOMER'
                  ? 'ACTIVE'
                  : user.status === 'PENDING_VENDOR'
                    ? 'PENDING_VENDOR'
                    : 'ACTIVE',
          }
          : user,
      ),
    );

    if (detailUser && confirmState.ids.includes(detailUser.id)) {
      setDetailUser((current) =>
        current
          ? {
            ...current,
            status:
              confirmState.mode === 'lock'
                ? 'LOCKED'
                : current.role === 'CUSTOMER'
                  ? 'ACTIVE'
                  : current.status === 'PENDING_VENDOR'
                    ? 'PENDING_VENDOR'
                    : 'ACTIVE',
          }
          : null,
      );
    }

    setSelected(new Set());
    addToast(confirmState.mode === 'lock' ? 'Đã khóa tài khoản đã chọn' : 'Đã mở khóa tài khoản đã chọn', confirmState.mode === 'lock' ? 'info' : 'success');
    setConfirmState(null);
  };

  return (
    <AdminLayout
      title="Người dùng"
      breadcrumbs={['Người dùng', 'Khách hàng và người bán']}
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder="Tìm theo tên, email, số điện thoại hoặc tên gian hàng"
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
          { key: 'all', label: 'Tổng tài khoản', value: counts.all, sub: 'Toàn bộ tài khoản đang theo dõi' },
          { key: 'customer', label: 'Khách hàng', value: counts.customer, sub: 'Tài khoản mua hàng trên sàn', tone: 'info', onClick: () => setActiveTab('customer') },
          { key: 'vendor', label: 'Người bán', value: counts.vendor, sub: 'Bao gồm vendor đang bán và đang chờ duyệt', tone: 'success', onClick: () => setActiveTab('vendor') },
          { key: 'locked', label: 'Đã khóa', value: counts.locked, sub: 'Tài khoản cần theo dõi rủi ro', tone: counts.locked > 0 ? 'danger' : '', onClick: () => setActiveTab('locked') },
        ]}
      />

      <PanelTabs
        items={USER_TABS.map((tab) => ({
          key: tab.key,
          label: tab.label,
          count: counts[tab.key],
        }))}
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as UserFilter);
          setSelected(new Set());
          setPage(1);
        }}
      />

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Danh sách khách hàng</h2>
            {selected.size > 0 && (() => {
              const selectedUsers = users.filter((user) => selected.has(user.id));
              const hasLocked = selectedUsers.some((user) => user.status === 'LOCKED');
              const hasActive = selectedUsers.some((user) => user.status !== 'LOCKED');
              return (
                <div className="admin-actions">
                  <span className="admin-muted">Đã chọn {selected.size} tài khoản</span>
                  {hasActive && (
                    <button
                      className="admin-ghost-btn danger"
                      onClick={() => openConfirm('lock', Array.from(selected).filter((id) => users.find((user) => user.id === id)?.status !== 'LOCKED'))}
                    >
                      Khóa đã chọn
                    </button>
                  )}
                  {hasLocked && (
                    <button
                      className="admin-ghost-btn"
                      onClick={() => openConfirm('unlock', Array.from(selected).filter((id) => users.find((user) => user.id === id)?.status === 'LOCKED'))}
                    >
                      Mở khóa đã chọn
                    </button>
                  )}
                  <button className="admin-ghost-btn" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
                </div>
              );
            })()}
          </div>

          {filteredUsers.length === 0 ? (
            <AdminStateBlock
              type={search.trim() ? 'search-empty' : 'empty'}
              title={search.trim() ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có dữ liệu người dùng'}
              description={
                search.trim()
                  ? 'Thử đổi từ khóa hoặc đặt lại bộ lọc để xem lại danh sách người dùng.'
                  : 'Danh sách tài khoản khách hàng, người bán và quản trị sẽ xuất hiện tại đây để operator theo dõi.'
              }
              actionLabel="Đặt lại bộ lọc"
              onAction={resetCurrentView}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label="Bảng người dùng hệ sinh thái">
                <div className="admin-table-row users admin-table-head" role="row">
                  <div role="columnheader">
                    <input
                      type="checkbox"
                      checked={selected.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(event) => setSelected(event.target.checked ? new Set(filteredUsers.map((item) => item.id)) : new Set())}
                    />
                  </div>
                  <div role="columnheader">Khách hàng</div>
                  <div role="columnheader">Vai trò</div>
                  <div role="columnheader">Gian hàng / hoạt động</div>
                  <div role="columnheader">Ngày tham gia</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader">Hành động</div>
                </div>

                {pagedUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    className="admin-table-row users"
                    role="row"
                    whileHover={{ y: -1 }}
                    onClick={() => setDetailUser(user)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div role="cell" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={(event) => {
                          const next = new Set(selected);
                          if (event.target.checked) next.add(user.id);
                          else next.delete(user.id);
                          setSelected(next);
                        }}
                      />
                    </div>
                    <div role="cell" className="user-cell">
                      <div className="user-avatar">
                        <span>{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="user-copy">
                        <div className="admin-bold">{user.name}</div>
                        <div className="admin-muted small">{user.email}</div>
                        <div className="admin-muted small">{user.phone}</div>
                      </div>
                    </div>
                    <div role="cell">
                      <span className={`admin-pill ${roleTone(user.role)}`}>{roleLabel(user.role)}</span>
                    </div>
                    <div role="cell">
                      <div className="admin-bold">
                        {user.storeName || (user.role === 'CUSTOMER' ? `${user.totalOrders || 0} đơn hàng` : 'Điều hành hệ thống')}
                      </div>
                      <div className="admin-muted small">
                        {user.role === 'CUSTOMER'
                          ? `${(user.totalSpent || 0).toLocaleString('vi-VN')} ₫ đã chi`
                          : user.status === 'PENDING_VENDOR'
                            ? 'Đang chờ duyệt onboarding'
                            : user.role === 'VENDOR'
                              ? 'Tài khoản vận hành gian hàng'
                              : 'Toàn quyền quản trị'}
                      </div>
                    </div>
                    <div role="cell">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</div>
                    <div role="cell">
                      <span className={`admin-pill ${statusTone(user.status)}`}>{statusLabel(user.status)}</span>
                    </div>
                    <div role="cell" className="admin-actions" onClick={(event) => event.stopPropagation()}>
                      <button
                        className="admin-icon-btn subtle"
                        title="Xem hồ sơ"
                        aria-label="Xem hồ sơ"
                        onClick={() => setDetailUser(user)}
                      >
                        <Eye size={16} />
                      </button>
                      {user.status === 'LOCKED' ? (
                        <button
                          className="admin-icon-btn subtle"
                          title="Mở khóa tài khoản"
                          aria-label="Mở khóa tài khoản"
                          onClick={() => openConfirm('unlock', [user.id])}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      ) : (
                        <button
                          className="admin-icon-btn subtle danger-icon"
                          title="Khóa tài khoản"
                          aria-label="Khóa tài khoản"
                          onClick={() => openConfirm('lock', [user.id])}
                        >
                          <Ban size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="table-footer">
                <span className="table-footer-meta">
                  Hiển thị {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, filteredUsers.length)} trên {filteredUsers.length} tài khoản
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

      <AdminConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.mode === 'lock' ? 'Khóa tài khoản người dùng' : 'Mở khóa tài khoản người dùng'}
        description={
          confirmState?.mode === 'lock'
            ? 'Tài khoản sẽ bị chặn khỏi các hành vi mua hàng, bán hàng hoặc đăng nhập quản trị cho đến khi operator mở khóa lại.'
            : 'Tài khoản sẽ được phục hồi quyền truy cập theo đúng vai trò hiện tại trên hệ thống.'
        }
        selectedItems={confirmState?.selectedItems}
        selectedNoun="tài khoản"
        confirmLabel={confirmState?.mode === 'lock' ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
        danger={confirmState?.mode === 'lock'}
        onCancel={() => setConfirmState(null)}
        onConfirm={applyStatusChange}
      />

      <Drawer open={Boolean(detailUser)} onClose={() => setDetailUser(null)} className="user-drawer">
        {detailUser ? (
          <>
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">Hồ sơ người dùng</p>
                <h3>{detailUser.name}</h3>
              </div>
              <button className="admin-icon-btn" onClick={() => setDetailUser(null)} aria-label="Đóng hồ sơ người dùng">
                <X size={16} />
              </button>
            </div>

            <div className="drawer-body">
              <section className="drawer-section">
                <h4>Tổng quan tài khoản</h4>
                <div className="user-drawer-hero">
                  <div className="user-avatar large">
                    <span>{detailUser.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <div className="admin-bold">{detailUser.name}</div>
                    <div className="admin-muted">{detailUser.email}</div>
                  </div>
                  <span className={`admin-pill ${statusTone(detailUser.status)}`}>{statusLabel(detailUser.status)}</span>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Danh tính và quyền truy cập</h4>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold"><UserRound size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Vai trò</span>
                    <span className="admin-muted">{roleLabel(detailUser.role)}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Điện thoại</span>
                    <span className="admin-muted">{detailUser.phone}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Ngày tham gia</span>
                    <span className="admin-muted">{new Date(detailUser.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Phạm vi</span>
                    <span className="admin-muted">
                      {detailUser.role === 'VENDOR'
                        ? detailUser.storeName || 'Chưa gắn gian hàng'
                        : detailUser.role === 'SUPER_ADMIN'
                          ? 'Toàn bộ marketplace'
                          : `${detailUser.totalOrders || 0} đơn hàng`}
                    </span>
                  </div>
                  {detailUser.storeName && (
                    <div className="admin-card-row">
                      <span className="admin-bold">Gian hàng</span>
                      <span className="admin-muted">{detailUser.storeName}</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="drawer-section">
                <h4>Tín hiệu nghiệp vụ</h4>
                <div className="user-signal-grid user-signal-grid-compact">
                  <div className="user-signal-card">
                    <span className="admin-muted small">Khách hàng</span>
                    <strong>{detailUser.totalOrders || 0} đơn</strong>
                  </div>
                  <div className="user-signal-card">
                    <span className="admin-muted small">Chi tiêu</span>
                    <strong>{(detailUser.totalSpent || 0).toLocaleString('vi-VN')} ₫</strong>
                  </div>
                  <div className="user-signal-card">
                    <span className="admin-muted small">Trạng thái</span>
                    <strong>{statusLabel(detailUser.status)}</strong>
                  </div>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Ghi chú vận hành</h4>
                <p className="admin-muted user-note">
                  {detailUser.note || 'Chưa có ghi chú nội bộ cho tài khoản này.'}
                </p>
              </section>
            </div>

            <div className="drawer-footer">
              <button className="admin-ghost-btn" onClick={() => setDetailUser(null)}>Đóng</button>
              {detailUser.status === 'LOCKED' ? (
                <button className="admin-primary-btn" onClick={() => openConfirm('unlock', [detailUser.id])}>
                  <ShieldCheck size={14} />
                  Mở khóa tài khoản
                </button>
              ) : (
                <button className="admin-ghost-btn danger" onClick={() => openConfirm('lock', [detailUser.id])}>
                  <Shield size={14} />
                  Khóa tài khoản
                </button>
              )}
            </div>
          </>
        ) : null}
      </Drawer>
    </AdminLayout>
  );
};

export default AdminUsers;
