import { useState } from 'react';
import { Star } from 'lucide-react';
import './ProductInfo.css';

interface ProductInfoProps {
  product: {
    name: string;
    price: number;
    originalPrice?: number;
    rating: number;
    sold: number;
    colors: { name: string; hex: string }[];
    sizes: string[];
  };
  onVariantChange?: (color: string, size: string) => void;
}

const ProductInfo = ({ product, onVariantChange }: ProductInfoProps) => {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.name ?? '');
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? '');
  
  const discount = product.originalPrice 
    ? Math.round((1 - product.price / product.originalPrice) * 100) 
    : 0;

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
        <div className="pdp-rating">
          <span className="rating-score">{product.rating}</span>
          <Star size={14} fill="#FFD700" color="#FFD700" />
          <span className="rating-count">(120 đánh giá)</span>
        </div>
        <span className="separator">|</span>
        <div className="pdp-sold">
          Đã bán {product.sold > 1000 ? `${(product.sold/1000).toFixed(1)}k` : product.sold}
        </div>
      </div>

      {/* Price Block */}
      <div className="pdp-price-box">
        <span className="current-price">{product.price.toLocaleString('vi-VN')}đ</span>
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
          {product.colors.map((color) => (
            <button
              key={color.name}
              className={`color-btn ${selectedColor === color.name ? 'selected' : ''}`}
              onClick={() => handleColorChange(color.name)}
              title={color.name}
              aria-label={`Select color ${color.name}`}
            >
              <span className="color-swatch-inner" style={{ backgroundColor: color.hex }}></span>
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
          {product.sizes.map((size) => (
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
