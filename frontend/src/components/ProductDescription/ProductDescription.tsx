import { useMemo, useState } from 'react';
import type { Product } from '../../types';
import './ProductDescription.css';

interface ProductDescriptionProps {
  product: Product;
}

const DEFAULT_FEATURES = [
  'Thiết kế tối giản, dễ phối cho nhiều hoàn cảnh sử dụng.',
  'Gia công chắc chắn, giữ form tốt sau nhiều lần mặc.',
  'Phù hợp đi làm, đi chơi và sinh hoạt hằng ngày.',
];

const DEFAULT_MATERIAL = 'Nhà bán chưa cập nhật thông tin chất liệu cho sản phẩm này.';

const DEFAULT_CARE = [
  'Giặt ở nhiệt độ thường, lộn trái sản phẩm trước khi giặt.',
  'Không dùng chất tẩy mạnh để giữ màu và độ bền vải.',
  'Phơi ở nơi thoáng mát, tránh ánh nắng gắt trực tiếp.',
];

const splitBulletLines = (value?: string) =>
  (value || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const parseHighlightsFromDescription = (description?: string) => {
  const source = (description || '').trim();
  if (!source) {
    return [] as string[];
  }

  const paragraphLines = splitBulletLines(source);
  if (paragraphLines.length > 1) {
    return paragraphLines.slice(0, 6);
  }

  return source
    .split(/[.;•-]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 8)
    .slice(0, 6);
};

const ProductDescription = ({ product }: ProductDescriptionProps) => {
  const [activeTab, setActiveTab] = useState<'details' | 'features' | 'material' | 'care'>('details');

  const featureItems = useMemo(() => {
    const list: string[] = [];
    
    if (product.fit) list.push(`Kiểu dáng: ${product.fit}`);
    if (product.gender) {
      const genderMap: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', UNISEX: 'Unisex' };
      list.push(`Phù hợp cho: ${genderMap[product.gender.toUpperCase()] || product.gender}`);
    }

    const fromHighlights = splitBulletLines(product.highlights);
    if (fromHighlights.length > 0) {
      return [...list, ...fromHighlights];
    }

    const fromDescription = parseHighlightsFromDescription(product.description);
    if (fromDescription.length > 0) {
      return [...list, ...fromDescription];
    }

    return [...list, ...DEFAULT_FEATURES];
  }, [product.description, product.highlights, product.fit, product.gender]);

  const careItems = useMemo(() => {
    const fromCare = splitBulletLines(product.careInstructions);
    if (fromCare.length > 0) {
      return fromCare;
    }
    return DEFAULT_CARE;
  }, [product.careInstructions]);

  const materialText = (product.material || '').trim() || DEFAULT_MATERIAL;

  return (
    <div className="product-description-container">
      <div className="desc-tabs-header">
        <button
          className={`desc-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Thông tin chi tiết
        </button>
        <button
          className={`desc-tab-btn ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          Đặc điểm nổi bật
        </button>
        <button
          className={`desc-tab-btn ${activeTab === 'material' ? 'active' : ''}`}
          onClick={() => setActiveTab('material')}
        >
          Chất liệu
        </button>
        <button
          className={`desc-tab-btn ${activeTab === 'care' ? 'active' : ''}`}
          onClick={() => setActiveTab('care')}
        >
          Hướng dẫn bảo quản
        </button>
      </div>

      <div className="desc-tabs-content">
        {activeTab === 'details' && (
          <div className="tab-pane active">
            <h3>Thông tin chi tiết</h3>
            {product.description ? (
              <div className="tab-text" style={{ whiteSpace: 'pre-line' }}>
                {product.description}
              </div>
            ) : (
              <p className="tab-text admin-muted">Nhà bán chưa cập nhật thông tin chi tiết cho sản phẩm này.</p>
            )}
          </div>
        )}

        {activeTab === 'features' && (
          <div className="tab-pane active">
            <h3>Đặc điểm nổi bật</h3>
            <ul className="feature-list">
              {featureItems.map((item, index) => (
                <li key={`feature-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'material' && (
          <div className="tab-pane active">
            <h3>Chất liệu</h3>
            <p className="tab-text">{materialText}</p>
          </div>
        )}

        {activeTab === 'care' && (
          <div className="tab-pane active">
            <h3>Hướng dẫn bảo quản</h3>
            <ul className="feature-list">
              {careItems.map((item, index) => (
                <li key={`care-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDescription;
