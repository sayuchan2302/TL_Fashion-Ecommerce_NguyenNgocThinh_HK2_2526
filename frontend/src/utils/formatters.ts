export const formatPrice = (price: number, currency = 'VND'): string => {
  return price.toLocaleString('vi-VN') + (currency === 'VND' ? ' đ' : '');
};

export const formatPriceCompact = (price: number): string => {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M đ`;
  }
  if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}K đ`;
  }
  return `${price} đ`;
};
