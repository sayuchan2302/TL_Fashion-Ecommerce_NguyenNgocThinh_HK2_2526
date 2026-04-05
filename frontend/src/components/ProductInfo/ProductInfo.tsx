import { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import './ProductInfo.css';

interface ProductInfoProps {
  product: {
    name: string;
    price: number;
    originalPrice?: number;
    sold?: number;
    colors?: string[];
    variants?: { size: string; color: string; price: number; stock: number }[];
  };
  averageRating?: number | null;
  reviewCount?: number;
  onVariantChange?: (color: string, size: string) => void;
}

const ProductInfo = ({ product, averageRating = null, reviewCount = 0, onVariantChange }: ProductInfoProps) => {
  const colorOptions = useMemo(() => product.colors || Array.from(new Set(product.variants?.map((v) => v.color) || [])), [product.colors, product.variants]);
  const sizeOptions = useMemo(() => Array.from(new Set(product.variants?.map((v) => v.size) || [])), [product.variants]);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0] || '');
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0] || '');

  const activeVariant = useMemo(
    () => product.variants?.find((v) => v.color === selectedColor && v.size === selectedSize),
    [product.variants, selectedColor, selectedSize],
  );

  const price = activeVariant?.price ?? product.price;
  const discount = product.originalPrice ? Math.round((1 - price / product.originalPrice) * 100) : 0;

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onVariantChange?.(color, selectedSize);
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    onVariantChange?.(selectedColor, size);
  };

  return (
    <div className="product-info-container">
      {/* Title & Reviews */}
      <h1 className="pdp-title">{product.name}</h1>
      <div className="pdp-meta">
        {reviewCount > 0 ? (
          <div className="pdp-rating">
            <span className="rating-score">{averageRating?.toFixed(1) || '0.0'}</span>
            <Star size={14} fill="#FFD700" color="#FFD700" />
            <span className="rating-count">({reviewCount} đánh giá)</span>
          </div>
        ) : (
          <div className="pdp-rating">
            <span className="rating-count">Chưa có đánh giá</span>
          </div>
        )}
        {typeof product.sold === 'number' && (
          <>
            <span className="separator">|</span>
            <div className="pdp-sold">
              Đã bán {product.sold > 1000 ? `${(product.sold / 1000).toFixed(1)}k` : product.sold}
            </div>
          </>
        )}
      </div>

      {/* Price Block */}
      <div className="pdp-price-box">
        <span className="current-price">{price.toLocaleString('vi-VN')}đ</span>
        {product.originalPrice && (
          <>
            <span className="original-price">{product.originalPrice.toLocaleString('vi-VN')}đ</span>
            <span className="discount-badge">-{discount}%</span>
          </>
        )}
      </div>

      {/* Color Selection */}
      <div className="pdp-variant-group">
        <div className="variant-header">
          <span className="variant-label">Màu sắc: <strong>{selectedColor}</strong></span>
        </div>
        <div className="color-options">
          {colorOptions.map((color) => (
            <button
              key={color}
              className={`color-btn ${selectedColor === color ? 'selected' : ''}`}
              onClick={() => handleColorChange(color)}
              title={color}
              aria-label={`Select color ${color}`}
            >
              <span className="color-swatch-inner" style={{ backgroundColor: color }}></span>
            </button>
          ))}
        </div>
      </div>

      {/* Size Selection */}
      <div className="pdp-variant-group">
        <div className="variant-header">
          <span className="variant-label">Kích cỡ: <strong>{selectedSize}</strong></span>
          <button className="size-guide-link">Bảng kích cỡ</button>
        </div>
        <div className="size-options">
          {sizeOptions.map((size) => (
            <button
              key={size}
              className={`size-btn ${selectedSize === size ? 'selected' : ''}`}
              onClick={() => handleSizeChange(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default ProductInfo;
