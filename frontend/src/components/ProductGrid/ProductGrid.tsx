import { useState, useEffect, useMemo } from 'react';
import './ProductGrid.css';
import ProductCard from '../ProductCard/ProductCard';
import ProductCardSkeleton from '../ProductCardSkeleton/ProductCardSkeleton';
import { useFilter } from '../../contexts/FilterContext';

// Temporary mock data mapping
const mockProducts = [
  {
    id: 101,
    name: "Áo Polo Nam Cotton Khử Mùi",
    price: 359000,
    originalPrice: 450000,
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=672&h=990&q=80",
    badge: "NEW",
    colors: ["#000000", "#ffffff", "#1e3a8a"]
  },
  {
    id: 102,
    name: "Quần Jeans Nam Dáng Straight Tôn Dáng",
    price: 599000,
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=672&h=990&q=80",
    colors: ["#1e3a8a", "#6b7280"]
  },
  {
    id: 103,
    name: "Áo Sơ Mi Nam Vải Modal Thoáng Mát",
    price: 459000,
    originalPrice: 550000,
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=672&h=990&q=80",
    badge: "BEST SELLER"
  },
  {
    id: 104,
    name: "Quần Lót Nam Trunk Kháng Khuẩn",
    price: 129000,
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=672&h=990&q=80",
    colors: ["#000000", "#f3f4f6"]
  },
  {
    id: 105,
    name: "Quần Shorts Nam Thể Thao Co Giãn",
    price: 249000,
    originalPrice: 299000,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=672&h=990&q=80",
    colors: ["#000000", "#111827", "#4b5563"]
  },
  {
    id: 106,
    name: "Áo Khoác Gió Nam Chống Nước Nhẹ",
    price: 499000,
    originalPrice: 599000,
    image: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=672&h=990&q=80",
    colors: ["#000000", "#1e3a8a"]
  },
  {
    id: 107,
    name: "Tất Cổ Thấp Khử Mùi Hôi (Pack 3)",
    price: 99000,
    originalPrice: 150000,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=672&h=990&q=80",
    badge: "SALE"
  },
  {
    id: 108,
    name: "Bộ Đồ Mặc Nhà Nam Cotton Thoáng",
    price: 399000,
    image: "https://images.unsplash.com/photo-1524503033411-c4c2b460ccb6?auto=format&fit=crop&w=672&h=990&q=80",
    colors: ["#000000", "#4b5563"]
  },
  {
    id: 201,
    name: "Váy Liền Nữ Cổ Khuy Thanh Lịch",
    price: 499000,
    originalPrice: 650000,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=672&h=990&q=80",
    badge: "HOT"
  },
  {
    id: 202,
    name: "Áo Kiểu Nữ Croptop Năng Động",
    price: 259000,
    image: "https://images.unsplash.com/photo-1524504543470-0f085452bb3f?auto=format&fit=crop&w=672&h=990&q=80",
    colors: ["#ffffff", "#000000", "#fbcfe8"]
  },
  {
    id: 204,
    name: "Áo Nỉ Hoodie Nữ Form Rộng",
    price: 399000,
    originalPrice: 450000,
    image: "https://media.coolmate.me/cdn-cgi/image/width=672,height=990,quality=85/uploads/November2024/24CMCW.AT005.1_30.jpg",
  },
  {
    id: 208,
    name: "Áo Dây Cami Lụa Mát Mẻ",
    price: 159000,
    image: "https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=672&h=990&q=80",
    badge: "NEW",
    colors: ["#ffffff", "#fbcfe8"]
  }
];

const ProductGrid = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { filters, updateSortBy } = useFilter();

  // Simulate network request
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Filter products based on selected filters
  const filteredProducts = useMemo(() => {
    let results = [...mockProducts];

    // Filter by price
    if (filters.priceRanges.length > 0) {
      results = results.filter(product => {
        return filters.priceRanges.some(range => {
          if (range === 'under-200k') return product.price < 200000;
          if (range === 'from-200k-500k') return product.price >= 200000 && product.price <= 500000;
          if (range === 'over-500k') return product.price > 500000;
          return false;
        });
      });
    }

    // Filter by size (check if product has this size - assuming all products support all sizes for now)
    if (filters.sizes.length > 0) {
      // In a real scenario, products would have their own size arrays
      // For now, we'll just return all products since size is not in the mock data
    }

    // Filter by color
    if (filters.colors.length > 0) {
      results = results.filter(product => {
        return product.colors && product.colors.length > 0 && 
          filters.colors.some(selectedColor => {
            // Check if any of the product's colors match selected colors
            return product.colors.some(productColor => 
              colorHexMatch(selectedColor, productColor)
            );
          });
      });
    }

    // Sort products
    switch (filters.sortBy) {
      case 'bestseller':
        // Sort by popularity (mock: keep original order)
        break;
      case 'price-asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'discount':
        results.sort((a, b) => {
          const discountA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
          const discountB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
          return discountB - discountA;
        });
        break;
      case 'newest':
      default:
        // Keep original order
        break;
    }

    return results;
  }, [filters]);

  // Helper to match color hex
  const colorHexMatch = (colorName: string, productColorHex: string): boolean => {
    const colorMap: Record<string, string> = {
      'Đen': '#000000',
      'Trắng': '#ffffff',
      'Xám': '#9ca3af',
      'Xanh Navy': '#1e3a8a',
      'Đỏ': '#ef4444',
      'Be': '#f5f5dc'
    };
    return (colorMap[colorName] || '').toLowerCase() === productColorHex.toLowerCase();
  };

  return (
    <div className="product-grid-container">
      {/* Toolbar: Sort & Views */}
      <div className="plp-toolbar">
        <div className="toolbar-left">
          <span className="results-count">Hiển thị 1 - {filteredProducts.length} của {mockProducts.length} sản phẩm</span>
        </div>
        <div className="toolbar-right">
          <label htmlFor="sort-select" className="sort-label">Sắp xếp theo:</label>
          <select 
            id="sort-select" 
            className="sort-select"
            value={filters.sortBy}
            onChange={(e) => updateSortBy(e.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="bestseller">Bán chạy nhất</option>
            <option value="price-asc">Giá: Thấp đến cao</option>
            <option value="price-desc">Giá: Cao đến thấp</option>
            <option value="discount">Giảm giá nhiều nhất</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="plp-grid">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))
          : filteredProducts.length > 0
          ? filteredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))
          : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#999' }}>
                <p style={{ fontSize: '16px' }}>Không tìm thấy sản phẩm nào</p>
              </div>
            )}
      </div>

      {/* Pagination */}
      <div className="plp-pagination">
        <button className="pagination-btn disabled">Trang trước</button>
        <div className="pagination-numbers">
          <button className="page-number active">1</button>
          <button className="page-number">2</button>
          <button className="page-number">3</button>
          <span className="page-dots">...</span>
          <button className="page-number">10</button>
        </div>
        <button className="pagination-btn">Trang sau</button>
      </div>
    </div>
  );
};

export default ProductGrid;
