import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Admin/vendor panels manage their own scroll containers
    if (pathname.startsWith('/admin') || pathname.startsWith('/vendor')) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
