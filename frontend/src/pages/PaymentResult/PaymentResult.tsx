import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock3, ChevronRight, CreditCard } from 'lucide-react';
import './PaymentResult.css';

type Status = 'success' | 'failed' | 'pending';

const getStatusFromQuery = (search: string): Status => {
  const params = new URLSearchParams(search);
  const value = (params.get('status') || '').toLowerCase();
  if (value === 'success') return 'success';
  if (value === 'failed' || value === 'fail') return 'failed';
  return 'pending';
};

const PaymentResult = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const status = getStatusFromQuery(location.search);
  const orderCode = params.get('orderCode') || params.get('order_id') || '—';
  const amount = params.get('amount') || params.get('total') || '—';
  const method = params.get('method') || 'Cổng thanh toán';

  const statusMeta: Record<Status, { label: string; desc: string; icon: React.ReactNode; tone: string }> = {
    success: {
      label: 'Thanh toán thành công',
      desc: 'Chúng tôi đã nhận được thanh toán của bạn. Đơn hàng sẽ được xử lý và cập nhật trạng thái sớm nhất.',
      icon: <CheckCircle2 className="pr-icon success" size={46} />,
      tone: 'success'
    },
    failed: {
      label: 'Thanh toán thất bại',
      desc: 'Giao dịch chưa hoàn tất hoặc bị từ chối. Bạn có thể thử thanh toán lại hoặc chọn phương thức khác.',
      icon: <XCircle className="pr-icon error" size={46} />,
      tone: 'error'
    },
    pending: {
      label: 'Đang chờ xác nhận',
      desc: 'Thanh toán đang được xác minh. Vui lòng đợi vài phút hoặc kiểm tra lại sau.',
      icon: <Clock3 className="pr-icon pending" size={46} />,
      tone: 'pending'
    },
  };

  const meta = statusMeta[status];

  return (
    <div className="payment-result-page">
      <div className="container">
        <div className="pr-card">
          <div className="pr-header">
            {meta.icon}
            <div>
              <p className="pr-eyebrow">Kết quả thanh toán</p>
              <h1 className={`pr-title ${meta.tone}`}>{meta.label}</h1>
              <p className="pr-desc">{meta.desc}</p>
            </div>
          </div>

          <div className="pr-summary">
            <div className="pr-row">
              <span>Mã đơn / Order code</span>
              <strong>{orderCode}</strong>
            </div>
            <div className="pr-row">
              <span>Số tiền / Amount</span>
              <strong>{amount}</strong>
            </div>
            <div className="pr-row">
              <span>Phương thức / Method</span>
              <strong className="pr-method"><CreditCard size={16} /> {method}</strong>
            </div>
            <div className="pr-row">
              <span>Trạng thái</span>
              <span className={`pr-pill ${meta.tone}`}>{meta.label}</span>
            </div>
          </div>

          <div className="pr-actions">
            {status === 'success' ? (
              <>
                <Link to="/order-tracking" className="pr-btn primary">Theo dõi đơn</Link>
                <Link to="/" className="pr-btn ghost">Về trang chủ</Link>
              </>
            ) : status === 'failed' ? (
              <>
                <Link to="/checkout" className="pr-btn primary">Thử thanh toán lại</Link>
                <Link to="/contact" className="pr-btn ghost">Liên hệ hỗ trợ</Link>
              </>
            ) : (
              <>
                <Link to="/order-tracking" className="pr-btn primary">Kiểm tra trạng thái</Link>
                <Link to="/" className="pr-btn ghost">Trang chủ</Link>
              </>
            )}
          </div>
        </div>

        <div className="pr-help">
          <div>
            <h3>Cần hỗ trợ thêm?</h3>
            <p>Gửi yêu cầu tại trang Liên hệ hoặc gọi hotline CSKH. Đừng quên lưu mã đơn để tra cứu nhanh.</p>
          </div>
          <Link to="/faq" className="pr-link">Xem FAQ <ChevronRight size={16} /></Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
