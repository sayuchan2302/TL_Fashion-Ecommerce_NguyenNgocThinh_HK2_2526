export type ProductStatusType = 'active' | 'low' | 'out';

export const productStatusTone = (type: ProductStatusType | string) => {
  if (type === 'low') return 'warning';
  if (type === 'out') return 'neutral';
  return 'success';
};

export type PromotionStatus = 'running' | 'expired' | 'paused';

export const promotionStatusLabel = (status: PromotionStatus) => {
  if (status === 'running') return 'Đang chạy';
  if (status === 'paused') return 'Tạm dừng';
  return 'Hết hạn';
};

export const promotionStatusClass = (status: PromotionStatus) => {
  if (status === 'running') return 'promo-status-running';
  if (status === 'paused') return 'promo-status-paused';
  return 'promo-status-expired';
};

export type CustomerOrderStatus = 'pending' | 'shipping' | 'done' | 'canceled';

export const customerOrderStatusTone = (status: CustomerOrderStatus) => {
  if (status === 'done') return 'success';
  if (status === 'shipping' || status === 'pending') return 'pending';
  return 'error';
};

export const customerOrderStatusLabel = (status: CustomerOrderStatus) => {
  if (status === 'done') return 'Hoàn tất';
  if (status === 'shipping') return 'Đang giao';
  if (status === 'pending') return 'Chờ xác nhận';
  return 'Đã hủy';
};
