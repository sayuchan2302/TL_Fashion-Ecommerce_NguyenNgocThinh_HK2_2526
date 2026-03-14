import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import './ProductActions.css';

interface ProductActionsProps {
  product: {
    id: number | string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
  };
  selectedColor: string;
  selectedSize: string;
}

const ProductActions = ({ product, selectedColor, selectedSize }: ProductActionsProps) => {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      color: selectedColor,
      size: selectedSize,
      quantity,
    });
    // Show success feedback
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      color: selectedColor,
      size: selectedSize,
      quantity,
    });
    navigate('/cart');
  };

  return (
    <div className="product-actions-container">
      {/* Quantity Selector */}
      <div className="quantity-wrapper">
        <button 
          className="qty-btn" 
          onClick={() => setQuantity(q => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
          disabled={quantity <= 1}
        >
          <Minus size={16} />
        </button>
        <input 
          type="number" 
          className="qty-input" 
          value={quantity} 
          readOnly 
        />
        <button 
          className="qty-btn" 
          onClick={() => setQuantity(q => Math.min(10, q + 1))}
          aria-label="Increase quantity"
          disabled={quantity >= 10}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className={`btn-add-to-cart ${added ? 'added' : ''}`}
          onClick={handleAddToCart}
        >
          {added ? (
            <><Check size={20} /> ĐÃ THÊM VÀO GIỎ</>
          ) : (
            <><ShoppingCart size={20} /> THÊM VÀO GIỎ</>
          )}
        </button>
        <button className="btn-buy-now" onClick={handleBuyNow}>
          MUA NGAY
        </button>
      </div>

      {/* Trust Badges Minimal */}
      <ul className="action-trust-list">
        <li>Đổi trả cực dễ chỉ cần số điện thoại</li>
        <li>60 ngày đổi trả vì bất kỳ lý do gì</li>
        <li>Hotline 1900.27.27.37 hỗ trợ từ 8h30 - 22h mỗi ngày</li>
      </ul>
    </div>
  );
};

export default ProductActions;
