import './TopBar.css';
import { Star, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const TopBar = () => {
  return (
    <div className="topbar">
      <div className="topbar-content container">
        <div className="topbar-left">
          <Link to="/about">Về COOLMATE</Link>
          <Link to="/vendor/register">Trở thành người bán</Link>
          <a href="https://blog.coolmate.me" target="_blank" rel="noreferrer">Blog</a>
        </div>

        <div className="topbar-right">
          <a href="#" className="coolclub-link">
            <Star size={14} fill="currentColor" />
            <span>Coolclub</span>
          </a>
          <Link to="/size-guide">Size Guide</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">CSKH</Link>
          <button className="lang-btn">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg"
              alt="VN Flag"
              className="flag-icon"
            />
            <span>VN</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
