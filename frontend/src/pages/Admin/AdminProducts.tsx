import './Admin.css';
import { Link } from 'react-router-dom';
import { Filter, Search, Plus, Package, Tag, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';

const products = [
  { sku: 'POLO-001', name: 'Áo Polo Cotton Khử Mùi', price: '359.000 đ', stock: 42, status: 'Đang bán' },
  { sku: 'JEAN-023', name: 'Quần Jeans Slim', price: '699.000 đ', stock: 12, status: 'Sắp hết' },
  { sku: 'TEE-105', name: 'Áo Thun Basic', price: '199.000 đ', stock: 0, status: 'Hết hàng' },
  { sku: 'ACC-501', name: 'Thắt Lưng Da', price: '249.000 đ', stock: 88, status: 'Đang bán' },
];

const statusTone = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('hết')) return 'neutral';
  if (s.includes('sắp')) return 'pending';
  return 'success';
};

const AdminProducts = () => {
  return (
    <AdminLayout
      title="Sản phẩm"
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm tên, SKU..." />
          </div>
          <button className="admin-ghost-btn"><Filter size={16} /> Bộ lọc</button>
          <Link to="#" className="admin-primary-btn"><Plus size={16} /> Thêm sản phẩm</Link>
        </>
      )}
    >
      <section className="admin-panels">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Danh sách sản phẩm</h2>
            <Link to="#">Quản lý danh mục</Link>
          </div>
          <div className="admin-table" role="table" aria-label="Danh sách sản phẩm">
            <div className="admin-table-row admin-table-head wide" role="row">
              <div role="columnheader">SKU</div>
              <div role="columnheader">Tên</div>
              <div role="columnheader">Giá</div>
              <div role="columnheader">Tồn kho</div>
              <div role="columnheader">Trạng thái</div>
              <div role="columnheader">Hành động</div>
            </div>
            {products.map(p => (
              <div className="admin-table-row wide" role="row" key={p.sku}>
                <div role="cell" className="admin-bold">{p.sku}</div>
                <div role="cell">{p.name}</div>
                <div role="cell">{p.price}</div>
                <div role="cell">{p.stock}</div>
                <div role="cell"><span className={`admin-pill ${statusTone(p.status)}`}>{p.status}</span></div>
                <div role="cell" className="admin-actions">
                  <Link to="#" className="admin-link">Sửa</Link>
                  <Link to="#" className="admin-link">Biến thể</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-panel admin-panel-side">
          <div className="admin-panel-head">
            <h2>Tóm tắt tồn kho</h2>
          </div>
          <div className="admin-hint">
            <p><Package size={14} /> Tổng tồn: 142 SKU | 3 cảnh báo tồn thấp.</p>
            <p><AlertTriangle size={14} /> Ưu tiên nhập lại: TEE-105, JEAN-023.</p>
            <p><Tag size={14} /> Gợi ý: tạo combo/bundle cho sản phẩm bán chậm.</p>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminProducts;
