import './Vendor.css';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link2, MessageSquare, Search, Star, X } from 'lucide-react';
import VendorLayout from './VendorLayout';
import { adminReviewService } from '../Admin/adminReviewService';
import { reviewService, type Review } from '../../services/reviewService';
import { useToast } from '../../contexts/ToastContext';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';
import AdminConfirmDialog from '../Admin/AdminConfirmDialog';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'need_reply', label: 'Cần phản hồi' },
  { key: 'negative', label: 'Đánh giá tiêu cực' },
] as const;

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="vendor-rating-stars">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star key={star} size={14} style={{ color: star <= rating ? '#facc15' : '#d1d5db', fill: star <= rating ? '#facc15' : 'none' }} />
    ))}
  </div>
);

const VendorReviews = () => {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'need_reply' | 'negative'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [confirmReplyIds, setConfirmReplyIds] = useState<string[] | null>(null);

  const reviews = useMemo(() => {
    const rows = reviewService.getReviews();
    return rows.filter((review) => {
      const keyword = query.trim().toLowerCase();
      const matchesSearch = !keyword || `${review.productName} ${review.content} ${review.orderId}`.toLowerCase().includes(keyword);
      const matchesTab =
        activeTab === 'all'
          ? true
          : activeTab === 'need_reply'
            ? !review.shopReply
            : review.rating <= 3;
      return matchesSearch && matchesTab;
    });
  }, [activeTab, query, version]);

  const stats = useMemo(() => {
    const rows = reviewService.getReviews();
    return {
      total: rows.length,
      needReply: rows.filter((review) => !review.shopReply).length,
      negative: rows.filter((review) => review.rating <= 3).length,
      average: rows.length ? (rows.reduce((sum, review) => sum + review.rating, 0) / rows.length).toFixed(1) : '0.0',
    };
  }, [version]);

  const resetCurrentView = () => {
    setQuery('');
    setActiveTab('all');
    setSelected(new Set());
  };

  const shareCurrentView = async () => {
    await navigator.clipboard.writeText(window.location.href);
    addToast('Đã sao chép bộ lọc hiện tại của đánh giá shop', 'success');
  };

  const submitReply = (id: string) => {
    const content = (replyDrafts[id] || '').trim();
    if (!content) {
      addToast('Hãy nhập nội dung phản hồi trước khi gửi', 'info');
      return;
    }
    const updated = adminReviewService.addReply(id, content);
    if (updated) {
      setReplyDrafts((current) => ({ ...current, [id]: '' }));
      setVersion((current) => current + 1);
      setConfirmReplyIds(null);
      setSelected(new Set());
      addToast('Đã lưu phản hồi cho đánh giá này', 'success');
    }
  };

  const selectedNeedReply = Array.from(selected).filter((id) => {
    const current = reviews.find((review) => review.id === id);
    return current && !current.shopReply && (replyDrafts[id] || '').trim();
  });

  return (
    <VendorLayout
      title="Đánh giá, phản hồi và uy tín shop"
      breadcrumbs={[{ label: 'Đánh giá và phản hồi' }, { label: 'Uy tín gian hàng' }]}
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm theo sản phẩm, nội dung hoặc mã đơn" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ bộ lọc
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Đặt lại</button>
        </>
      )}
    >
      <div className="admin-stats grid-4">
        <button type="button" className="admin-stat-card vendor-stat-button" onClick={() => setActiveTab('all')}>
          <div className="admin-stat-label">Tổng đánh giá</div>
          <div className="admin-stat-value">{stats.total}</div>
          <div className="admin-stat-sub">Điểm trung bình: {stats.average}</div>
        </button>
        <button type="button" className="admin-stat-card warning vendor-stat-button" onClick={() => setActiveTab('need_reply')}>
          <div className="admin-stat-label">Cần phản hồi</div>
          <div className="admin-stat-value">{stats.needReply}</div>
          <div className="admin-stat-sub">Đánh giá chưa có phản hồi từ shop</div>
        </button>
        <button type="button" className="admin-stat-card info vendor-stat-button" onClick={() => setActiveTab('negative')}>
          <div className="admin-stat-label">Đánh giá ≤ 3 sao</div>
          <div className="admin-stat-value">{stats.negative}</div>
          <div className="admin-stat-sub">Tín hiệu cần chăm sóc ưu tiên</div>
        </button>
        <button type="button" className="admin-stat-card success vendor-stat-button" onClick={() => setActiveTab('all')}>
          <div className="admin-stat-label">Tỷ lệ phản hồi</div>
          <div className="admin-stat-value">{stats.total ? `${Math.round(((stats.total - stats.needReply) / stats.total) * 100)}%` : '0%'}</div>
          <div className="admin-stat-sub">Tỷ lệ đánh giá đã được shop chăm sóc</div>
        </button>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button key={tab.key} className={`admin-tab ${activeTab === tab.key ? 'active vendor-active-tab' : ''}`} onClick={() => setActiveTab(tab.key as 'all' | 'need_reply' | 'negative')}>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {(activeTab !== 'all' || Boolean(query.trim())) && (
        <div className="admin-view-summary">
          <span className="summary-chip">Trạng thái: {TABS.find((tab) => tab.key === activeTab)?.label || 'Tất cả'}</span>
          {query.trim() && <span className="summary-chip">Từ khóa: {query.trim()}</span>}
          <button className="summary-clear" onClick={resetCurrentView}>Xóa bộ lọc</button>
        </div>
      )}

      <section className="admin-panels single">
        <div className="admin-panel">
          {reviews.length === 0 ? (
            <AdminStateBlock
              type={query.trim() ? 'search-empty' : 'empty'}
              title={query.trim() ? 'Không có đánh giá phù hợp' : 'Chưa có đánh giá cần xử lý'}
              description={query.trim() ? 'Thử đổi từ khóa hoặc tab để xem lại hàng đợi phản hồi của shop.' : 'Khi khách để lại đánh giá, seller panel sẽ hiển thị tại đây.'}
              actionLabel={query.trim() ? 'Đặt lại bộ lọc' : undefined}
              onAction={query.trim() ? resetCurrentView : undefined}
            />
          ) : (
            <div className="admin-table" role="table" aria-label="Bảng đánh giá của shop">
              <div className="admin-table-row vendor-reviews admin-table-head" role="row">
                <div role="columnheader">
                  <input
                    type="checkbox"
                    checked={selected.size === reviews.length && reviews.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(reviews.map((item) => item.id)) : new Set())}
                  />
                </div>
                <div role="columnheader">Sản phẩm</div>
                <div role="columnheader">Đánh giá</div>
                <div role="columnheader">Nội dung</div>
                <div role="columnheader">Trạng thái</div>
                <div role="columnheader">Phản hồi</div>
                <div role="columnheader">Hành động</div>
              </div>

              {reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  className="admin-table-row vendor-reviews"
                  role="row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.14) }}
                  whileHover={{ y: -1 }}
                  onClick={() => setActiveReview(review)}
                  style={{ cursor: 'pointer' }}
                >
                  <div role="cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(review.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(review.id);
                        else next.delete(review.id);
                        setSelected(next);
                      }}
                    />
                  </div>
                  <div role="cell" className="vendor-admin-product-cell">
                    <img src={review.productImage} alt={review.productName} className="vendor-admin-thumb" />
                    <div className="vendor-admin-product-copy">
                      <div className="admin-bold">{review.productName}</div>
                      <div className="admin-muted small">Đơn #{review.orderId}</div>
                    </div>
                  </div>
                  <div role="cell">
                    <RatingStars rating={review.rating} />
                    <div className="admin-muted small">{review.createdAt}</div>
                  </div>
                  <div role="cell" className="vendor-review-content">{review.content}</div>
                  <div role="cell">
                    <span className={`admin-pill ${review.rating <= 3 ? 'pending' : 'success'}`}>
                      {review.rating <= 3 ? 'Cần chăm sóc' : 'Ổn định'}
                    </span>
                  </div>
                  <div role="cell">
                    {review.shopReply ? (
                      <div className="vendor-reply-badge">
                        <span className="admin-bold">Đã phản hồi</span>
                        <span className="admin-muted small">{review.shopReply.createdAt}</span>
                      </div>
                    ) : (
                      <span className="badge amber">Chưa phản hồi</span>
                    )}
                  </div>
                  <div role="cell" className="admin-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="admin-ghost-btn vendor-inline-link" onClick={() => setActiveReview(review)}>
                      Xem chi tiết
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div className="admin-floating-bar vendor-floating-bar" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 22 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="admin-floating-content">
              <span>Đã chọn {selected.size} đánh giá</span>
              <div className="admin-actions">
                <button className="admin-ghost-btn" onClick={() => setSelected(new Set())}>Bỏ chọn</button>
                {selectedNeedReply.length > 0 && (
                  <button className="admin-ghost-btn" onClick={() => setConfirmReplyIds(selectedNeedReply)}>Gửi phản hồi đã chọn</button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminConfirmDialog
        open={Boolean(confirmReplyIds?.length)}
        title="Gửi phản hồi cho các đánh giá đã chọn"
        description="Các đánh giá này sẽ nhận phản hồi từ shop ngay sau khi xác nhận."
        selectedItems={confirmReplyIds || []}
        selectedNoun="đánh giá"
        confirmLabel="Gửi phản hồi"
        onCancel={() => setConfirmReplyIds(null)}
        onConfirm={() => confirmReplyIds?.forEach((id) => submitReply(id))}
      />

      {activeReview && (
        <>
          <div className="drawer-overlay" onClick={() => setActiveReview(null)} />
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">Chi tiết đánh giá</p>
                <h3>{activeReview.productName}</h3>
              </div>
              <button className="admin-icon-btn" onClick={() => setActiveReview(null)} aria-label="Đóng chi tiết đánh giá">
                <X size={16} />
              </button>
            </div>
            <div className="drawer-body">
              <section className="drawer-section">
                <h4>Thông tin đánh giá</h4>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Đơn hàng</span>
                    <span className="admin-muted">#{activeReview.orderId}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Số sao</span>
                    <span><RatingStars rating={activeReview.rating} /></span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Nội dung</span>
                    <span className="admin-muted">{activeReview.content}</span>
                  </div>
                </div>
              </section>
              <section className="drawer-section">
                <h4>Phản hồi của shop</h4>
                {activeReview.shopReply ? (
                  <div className="vendor-review-reply-box">
                    <strong>Đã phản hồi:</strong> {activeReview.shopReply.content}
                  </div>
                ) : (
                  <div className="form-grid">
                    <label className="form-field full">
                      <span>Nội dung phản hồi</span>
                      <textarea
                        rows={4}
                        value={replyDrafts[activeReview.id] || ''}
                        onChange={(e) => setReplyDrafts((current) => ({ ...current, [activeReview.id]: e.target.value }))}
                        placeholder="Giải thích, xin lỗi hoặc hướng dẫn khách hàng..."
                      />
                    </label>
                  </div>
                )}
              </section>
            </div>
            <div className="drawer-footer">
              <button className="admin-ghost-btn" onClick={() => setActiveReview(null)}>Đóng</button>
              {!activeReview.shopReply && (
                <button className="admin-primary-btn vendor-admin-primary" onClick={() => submitReply(activeReview.id)}>
                  <MessageSquare size={15} />
                  Gửi phản hồi
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </VendorLayout>
  );
};

export default VendorReviews;
