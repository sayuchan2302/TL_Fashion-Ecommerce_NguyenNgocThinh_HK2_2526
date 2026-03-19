import './TopBar.css';
import { Star, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const TopBar = () => {
  return (
    <div className="topbar">
      <div className="topbar-content container">
        <div className="topbar-left">
          <Link to="/about">Về COOLMATE</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Liên hệ</Link>
        </div>
        
        <div className="topbar-right">
          <a href="#" className="coolclub-link">
            <Star size={14} fill="currentColor" />
            <span>Coolclub</span>
          </a>
          <a href="#">Cửa hàng</a>
          <a href="#">Blog</a>
          <a href="#">CSKH</a>
          <button className="lang-btn">
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg" alt="VN Flag" className="flag-icon" />
            <span>VN</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
