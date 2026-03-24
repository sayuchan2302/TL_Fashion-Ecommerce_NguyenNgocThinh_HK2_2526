import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ProductSection.css';
import ProductCard from '../ProductCard/ProductCard';
import ProductCardSkeleton from '../ProductCardSkeleton/ProductCardSkeleton';

interface ProductSectionItem {
  id: number | string;
  sku?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  colors?: string[];
  sizes?: string[];
  backendId?: string;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  isOfficialStore?: boolean;
}

interface ProductSectionProps {
  title: string;
  products: ProductSectionItem[];
  viewAllLink?: string;
}

const ProductSection = ({ title, products, viewAllLink = "#" }: ProductSectionProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="product-section container">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        <a href={viewAllLink} className="view-all-link">Xem tất cả</a>
      </div>
      
      <div className="slider-container">
        <button className="slider-nav prev-btn" onClick={scrollLeft} aria-label="Previous">
          <ChevronLeft size={24} />
        </button>
        
        <div className="product-grid slider-view" ref={sliderRef}>
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="slider-item">
                  <ProductCardSkeleton />
                </div>
              ))
            : products.map((product) => (
                <div key={product.id} className="slider-item">
                  <ProductCard {...product} />
                </div>
              ))}
        </div>

        <button className="slider-nav next-btn" onClick={scrollRight} aria-label="Next">
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  );
};

export default ProductSection;
