import './Home.css';
import HeroSlider from '../../components/HeroSlider/HeroSlider';
import Categories from '../../components/Categories/Categories';
import CollectionsBanner from '../../components/CollectionsBanner/CollectionsBanner';
import ProductSection from '../../components/ProductSection/ProductSection';
import Testimonials from '../../components/Testimonials/Testimonials';
import TrustBadges from '../../components/TrustBadges/TrustBadges';
import Newsletter from '../../components/Newsletter/Newsletter';

// Mock Data
export const mensFashion = [
  {
    id: 101,
    name: "Áo Polo Nam Cotton Khử Mùi",
    price: 359000,
    originalPrice: 450000,
    image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=672&auto=format&fit=crop",
    badge: "MỚI",
    colors: ["#000000", "#ffffff", "#1e3a8a"]
  },
  {
    id: 102,
    name: "Quần Jeans Nam Dáng Straight Tôn Dáng",
    price: 599000,
    image: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?q=80&w=672&auto=format&fit=crop",
    colors: ["#1e3a8a", "#6b7280"]
  },
  {
    id: 103,
    name: "Áo Sơ Mi Nam Vải Modal Thoáng Mát",
    price: 459000,
    originalPrice: 550000,
    image: "https://images.unsplash.com/photo-1596755094514-f87e32f85e23?q=80&w=672&auto=format&fit=crop",
    badge: "BEST SELLER"
  },
  {
    id: 104,
    name: "Quần Lót Nam Trunk Kháng Khuẩn",
    price: 129000,
    image: "https://images.unsplash.com/photo-1620794503789-9828d5d4d385?q=80&w=672&auto=format&fit=crop",
    colors: ["#000000", "#f3f4f6"]
  },
  {
    id: 105,
    name: "Quần Shorts Nam Thể Thao Co Giãn",
    price: 249000,
    originalPrice: 299000,
    image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=672&auto=format&fit=crop",
    colors: ["#000000", "#111827", "#4b5563"]
  },
  {
    id: 106,
    name: "Áo Khoác Gió Nam Chống Nước Nhẹ",
    price: 499000,
    originalPrice: 599000,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=672&auto=format&fit=crop",
    colors: ["#000000", "#1e3a8a"]
  },
  {
    id: 107,
    name: "Tất Cổ Thấp Khử Mùi Hôi (Pack 3)",
    price: 99000,
    originalPrice: 150000,
    image: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?q=80&w=672&auto=format&fit=crop",
    badge: "SALE"
  },
  {
    id: 108,
    name: "Bộ Đồ Mặc Nhà Nam Cotton Thoáng",
    price: 399000,
    image: "https://images.unsplash.com/photo-1618354691438-25af0475c28f?q=80&w=672&auto=format&fit=crop",
    colors: ["#000000", "#4b5563"]
  }
];

const womensFashion = [
  {
    id: 201,
    name: "Váy Liền Nữ Cổ Khuy Thanh Lịch",
    price: 499000,
    originalPrice: 650000,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=672&auto=format&fit=crop",
    badge: "HOT"
  },
  {
    id: 202,
    name: "Áo Kiểu Nữ Croptop Năng Động",
    price: 259000,
    image: "https://images.unsplash.com/photo-1551163943-3f6a855d1153?q=80&w=672&auto=format&fit=crop",
    colors: ["#ffffff", "#000000", "#fbcfe8"]
  },
  {
    id: 203,
    name: "Quần Ống Suông Nữ Hack Dáng",
    price: 389000,
    image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=672&auto=format&fit=crop",
    colors: ["#374151", "#f3f4f6"]
  },
  {
    id: 204,
    name: "Áo Nỉ Hoodie Nữ Form Rộng",
    price: 399000,
    originalPrice: 450000,
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=672&auto=format&fit=crop",
  },
  {
    id: 205,
    name: "Áo Khoác Blazer Nữ Tính",
    price: 699000,
    originalPrice: 899000,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=672&auto=format&fit=crop",
    colors: ["#000000", "#fcd34d"]
  },
  {
    id: 206,
    name: "Chân Váy Chữ A Tôn Dáng",
    price: 299000,
    image: "https://images.unsplash.com/photo-1583496920310-91890e2b96e5?q=80&w=672&auto=format&fit=crop",
    colors: ["#000000", "#ffffff"]
  },
  {
    id: 207,
    name: "Quần Shorts Nữ Đi Biển Xinh Xắn",
    price: 199000,
    originalPrice: 250000,
    image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=672&auto=format&fit=crop",
  },
  {
    id: 208,
    name: "Áo Dây Cami Lụa Mát Mẻ",
    price: 159000,
    image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=672&auto=format&fit=crop",
    badge: "MỚI",
    colors: ["#ffffff", "#fbcfe8"]
  }
];

const Home = () => {
  return (
    <div className="home-page">
      <main className="main-content">
        <HeroSlider />
        <Categories />
        
        <ProductSection 
          title="THỜI TRANG NAM NỔI BẬT" 
          products={mensFashion} 
          viewAllLink="/mens-fashion" 
        />
        
        <CollectionsBanner />
        
        <ProductSection 
          title="THỜI TRANG NỮ THỊNH HÀNH" 
          products={womensFashion} 
          viewAllLink="/womens-fashion" 
        />
        
        <Testimonials />
        
        <Newsletter />
        <TrustBadges />
      </main>
    </div>
  );
};

export default Home;
