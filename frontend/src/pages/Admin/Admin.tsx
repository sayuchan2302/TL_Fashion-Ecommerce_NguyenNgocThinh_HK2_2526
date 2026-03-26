import './Admin.css';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  FolderTree,
  Package,
  ShieldAlert,
  Sparkles,
  Store,
  TicketPercent,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import AdminLayout from './AdminLayout';

const marketTrend = [1.9, 2.1, 2.4, 2.3, 2.8, 3.1, 3.4];
const trendLabels = ['13/03', '14/03', '15/03', '16/03', '17/03', '18/03', '19/03'];

const parentOrders = [
  { code: 'PARENT-10234', customer: 'Nguyễn Văn A', total: '3.250.000 ₫', issue: 'Xem xét tranh chấp', priority: 'high', waitTime: '58 phút', thumb: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=120&h=140&q=80' },
  { code: 'PARENT-10233', customer: 'Trần Thị B', total: '1.780.000 ₫', issue: 'Chờ xác nhận vendor', priority: 'medium', waitTime: '24 phút', thumb: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=120&h=140&q=80' },
  { code: 'PARENT-10232', customer: 'Lê Hữu C', total: '5.150.000 ₫', issue: 'Chờ giải ngân', priority: 'high', waitTime: '1 giờ 12 phút', thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&h=140&q=80' },
  { code: 'PARENT-10231', customer: 'Phạm Minh D', total: '950.000 ₫', issue: 'Chờ xác minh thanh toán', priority: 'low', waitTime: '12 phút', thumb: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=120&h=140&q=80' },
];

const governanceFeed = [
  { id: 'gov-1', tone: 'danger', text: '4 đơn hàng cha cần xử lý tranh chấp', cta: 'Mở đơn hàng cha', to: '/admin/orders', icon: <ShieldAlert size={16} /> },
  { id: 'gov-2', tone: 'warning', text: '7 gian hàng mới đang chờ duyệt onboarding', cta: 'Duyệt gian hàng', to: '/admin/stores', icon: <Store size={16} /> },
  { id: 'gov-3', tone: 'info', text: 'Commission nhóm áo thun tăng mạnh từ chiến dịch Mega Sale', cta: 'Xem tài chính', to: '/admin/financials', icon: <WalletCards size={16} /> },
];

const taxonomyHighlights = [
  { name: 'Thời trang Nam > Áo > Áo thun', sales: 1640, signal: 'Top GMV' },
  { name: 'Thời trang Nữ > Váy > Váy liền', sales: 1280, signal: 'Top conversion' },
  { name: 'Phụ kiện > Túi xách', sales: 940, signal: 'Top margin' },
];

const priorityTone = (priority: string) => {
  if (priority === 'high') return 'error';
  if (priority === 'medium') return 'warning';
  return 'neutral';
};

const priorityLabel = (priority: string) => {
  if (priority === 'high') return 'Quan trọng';
  if (priority === 'medium') return 'Chú ý';
  return 'Theo dõi';
};

const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

const Admin = () => {
  const stats = useMemo(() => [
    { label: 'GMV toàn hệ thống', value: formatCurrency(3_400_000_000), change: '+12%', icon: <DollarSign size={18} />, to: '/admin/financials', spark: [80, 82, 84, 88, 91, 95, 100] },
    { label: 'Commission thu được', value: formatCurrency(168_000_000), change: '+9%', icon: <WalletCards size={18} />, to: '/admin/financials', spark: [52, 55, 58, 57, 60, 63, 67] },
    { label: 'Đơn hàng', value: '124', change: '+18', icon: <Package size={18} />, to: '/admin/orders', spark: [20, 21, 22, 24, 26, 28, 31] },
    { label: 'Chờ duyệt vendor', value: '7', change: '+2', icon: <Store size={18} />, to: '/admin/stores', spark: [2, 3, 4, 4, 5, 6, 7] },
    { label: 'Tài khoản bị khóa', value: '3', change: '-1', icon: <Users size={18} />, to: '/admin/users', spark: [7, 6, 6, 5, 4, 4, 3] },
    { label: 'Chiến dịch đang chạy', value: '2', change: '+1', icon: <TicketPercent size={18} />, to: '/admin/promotions', spark: [0, 1, 1, 1, 2, 2, 2] },
  ], []);

  const quickViews = useMemo(() => [
    { label: 'Vendor onboarding chờ duyệt', count: 7, to: '/admin/stores' },
    { label: 'Danh mục cần kiểm tra', count: 3, to: '/admin/categories' },
    { label: 'Đơn tranh chấp cần xử lý', count: 4, to: '/admin/orders' },
    { label: 'FAQ và bot script cần cập nhật', count: 5, to: '/admin/bot-ai' },
  ], []);

  const topSignalBase = Math.max(...taxonomyHighlights.map((item) => item.sales), 1);

  return (
    <AdminLayout
      title="Tổng quan"
      actions={(
        <>
          <Link to="/admin/stores" className="admin-ghost-btn">Duyệt gian hàng</Link>
          <Link to="/admin/categories" className="admin-primary-btn">Quản lý danh mục</Link>
        </>
      )}
    >
      <section className="admin-stats grid-6">
        {stats.map((item) => (
          <motion.div
            className="admin-stat-card compact"
            key={item.label}
            whileHover={{ y: -2 }}
          >
            <div className="admin-stat-header">
              <div className="admin-stat-icon">{item.icon}</div>
              <div className="admin-stat-change up">
                <ArrowUpRight size={14} />
                <span>{item.change}</span>
              </div>
            </div>
            <p className="admin-stat-label">{item.label}</p>
            <Link to={item.to} className="admin-stat-link" title={`Xem ${item.label}`}>
              <span className="admin-stat-value">{item.value}</span>
              <ChevronRight size={14} />
            </Link>
            <svg className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path
                d={`M ${item.spark.map((v, i) => `${(i / (item.spark.length - 1)) * 100} ${30 - (v / Math.max(...item.spark)) * 26}`).join(' L ')}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
        ))}
      </section>

      <section className="dashboard-view-strip">
        {quickViews.map((view) => (
          <Link key={view.label} to={view.to} className="dashboard-view-chip">
            <span>{view.label}</span>
            <strong>{view.count}</strong>
            <ChevronRight size={14} />
          </Link>
        ))}
      </section>

      <motion.section className="admin-panel">
        <div className="admin-panel-head">
          <h2>GMV và commission 7 ngày</h2>
          <span className="admin-muted">Tổng quan marketplace</span>
        </div>
        <div className="area-chart-wrap">
          <svg className="area-chart" viewBox="0 0 100 50" preserveAspectRatio="none">
            <defs>
              <linearGradient id="marketGmvGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(15,23,42,0.30)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0.00)" />
              </linearGradient>
            </defs>
            <path
              d={`M 0 50 L ${marketTrend.map((v, i) => `${(i / (marketTrend.length - 1)) * 100} ${50 - (v / Math.max(...marketTrend)) * 44}`).join(' L ')} L 100 50 Z`}
              fill="url(#marketGmvGradient)"
            />
            <path
              d={`M ${marketTrend.map((v, i) => `${(i / (marketTrend.length - 1)) * 100} ${50 - (v / Math.max(...marketTrend)) * 44}`).join(' L ')}`}
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2="50" stroke="#e5e7eb" strokeWidth="1" />
          </svg>
          <div className="chart-axes">
            <span>Ngày</span>
            <span>GMV / Commission</span>
          </div>
          <div className="chart-x-labels">
            {trendLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="admin-action-bar">
        <motion.section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Hành động của quản trị viên</h2>
          </div>
          <div className="action-bar-tiles">
            <Link to="/admin/stores" className="action-bar-tile"><Zap size={20} /> Duyệt vendor</Link>
            <Link to="/admin/promotions" className="action-bar-tile"><TicketPercent size={20} /> Tạo mega sale</Link>
            <Link to="/admin/categories" className="action-bar-tile"><FolderTree size={20} /> Quản lý danh mục</Link>
            <Link to="/admin/bot-ai" className="action-bar-tile"><Sparkles size={20} /> Bot, FAQ và AI</Link>
          </div>
        </motion.section>

        <motion.section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Nguồn cấp dữ liệu quản trị</h2>
          </div>
          <div className="action-bar-feed">
            {governanceFeed.map((item) => (
              <Link key={item.id} to={item.to} className={`action-bar-feed-item ${item.tone}`}>
                <span className="feed-icon">{item.icon}</span>
                <div className="feed-content">
                  <p>{item.text}</p>
                  <span>{item.cta}</span>
                </div>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        </motion.section>
      </div>

      <motion.section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Đơn hàng cha cần xử lý</h2>
          <Link to="/admin/orders">Mở tất cả</Link>
        </div>
        <div className="admin-table" role="table" aria-label="Đơn hàng cha cần xử lý">
          <div className="admin-table-row admin-table-head recent-v2" role="row">
            <div role="columnheader">Đơn hàng cha</div>
            <div role="columnheader">Mức độ</div>
            <div role="columnheader">Chờ xử lý</div>
            <div role="columnheader">Tổng giá trị</div>
            <div role="columnheader">Hành động</div>
          </div>
          {parentOrders.map((order) => (
            <motion.div
              className="admin-table-row recent-v2 recent-order-row"
              role="row"
              key={order.code}
              whileHover={{ y: -1 }}
            >
              <div role="cell" className="admin-customer">
                <img src={order.thumb} alt={order.customer} />
                <div>
                  <p className="admin-bold">{order.code}</p>
                  <span>{order.customer}</span>
                </div>
              </div>
              <div role="cell"><span className={`admin-pill ${priorityTone(order.priority)}`}>{priorityLabel(order.priority)}</span></div>
              <div role="cell" className="wait-time-cell">{order.waitTime}</div>
              <div role="cell">{order.total}</div>
              <div role="cell" className="admin-actions compact">
                <button className={`admin-ghost-btn small ${order.priority === 'high' ? 'primary-cta' : ''}`}>{order.issue}</button>
                <Link to={`/admin/orders/${order.code}`} className="admin-icon-btn" aria-label="Xem chi tiet">
                  <ChevronRight size={15} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section className="admin-panel">
        <div className="admin-panel-head">
          <h2>Danh mục dẫn đầu hệ thống</h2>
          <Link to="/admin/categories">Mở danh mục</Link>
        </div>
        <div className="top-products">
          {taxonomyHighlights.map((item, idx) => (
            <motion.div key={item.name} className="top-product" whileHover={{ y: -2 }}>
              <div className="top-rank">Top {idx + 1}</div>
              <div className="top-product-meta">
                <p className="admin-bold">{item.name}</p>
                <p className="admin-muted">{item.signal}</p>
                <div className="top-product-bar">
                  <span style={{ width: `${Math.round((item.sales / topSignalBase) * 100)}%` }} />
                </div>
                <p className="admin-muted stock-note">{item.sales} tín hiệu</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </AdminLayout>
  );
};

export default Admin;
