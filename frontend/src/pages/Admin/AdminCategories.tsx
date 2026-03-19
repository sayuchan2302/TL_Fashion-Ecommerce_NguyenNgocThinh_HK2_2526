import './Admin.css';
import { useMemo, useState } from 'react';
import { Plus, Pencil, Layers, GripVertical, Search, X, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent: string;
  count: number;
  status: 'visible' | 'hidden';
  order: number;
  showOnMenu: boolean;
  image: string;
  description?: string;
}

const initialCategories: Category[] = [
  { id: 'c1', name: 'Áo Polo', slug: 'ao-polo', parent: 'Nam', count: 32, status: 'visible', order: 1, showOnMenu: true, image: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=200&q=80' },
  { id: 'c2', name: 'Quần Jeans', slug: 'quan-jeans', parent: 'Nam', count: 24, status: 'visible', order: 2, showOnMenu: true, image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=200&q=80' },
  { id: 'c3', name: 'Áo Thun', slug: 'ao-thun', parent: 'Nữ', count: 18, status: 'hidden', order: 3, showOnMenu: false, image: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=200&q=80' },
];

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const emptyCategory: Category = { id: '', name: '', slug: '', parent: '', count: 0, status: 'visible', order: 0, showOnMenu: false, image: '' };
  const [categoryForm, setCategoryForm] = useState<Category>(emptyCategory);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()));
  }, [categories, search]);

  const handleCatSlugChange = (val: string) => {
    const clean = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setCategoryForm(prev => ({ ...prev, slug: clean }));
  };

  const openNewCategory = () => {
    setCategoryForm(emptyCategory);
    setShowCategoryDrawer(true);
  };

  const openEditCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    setCategoryForm(cat);
    setShowCategoryDrawer(true);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name) {
      setShowCategoryDrawer(false);
      return;
    }
    setCategories(prev => {
      if (categoryForm.id) {
        return prev.map(c => c.id === categoryForm.id ? { ...categoryForm } : c);
      }
      const newCat = { ...categoryForm, id: `c-${Date.now()}` };
      return [...prev, newCat];
    });
    setShowCategoryDrawer(false);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filtered.map(c => c.id)));
    else setSelected(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };

  const bulkDelete = () => {
    setCategories(prev => prev.filter(c => !selected.has(c.id)));
    setSelected(new Set());
  };

  const bulkToggleStatus = () => {
    setCategories(prev => prev.map(c => selected.has(c.id) ? { ...c, status: c.status === 'visible' ? 'hidden' : 'visible' } : c));
    setSelected(new Set());
  };

  return (
    <AdminLayout
      title="Danh mục"
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input placeholder="Tìm danh mục..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="admin-primary-btn" onClick={openNewCategory}><Plus size={14} /> Thêm danh mục</button>
        </>
      )}
    >
      {selected.size > 0 && (
        <div className="admin-bulk-bar">
          <span>{selected.size} danh mục được chọn</span>
          <div className="admin-actions">
            <button className="admin-ghost-btn danger" onClick={bulkDelete}>Xóa đã chọn</button>
            <button className="admin-ghost-btn" onClick={bulkToggleStatus}>Đổi trạng thái</button>
          </div>
        </div>
      )}

      <section className="admin-panels single">
        <div className="admin-panel">
          <div className="admin-table" role="table" aria-label="Danh sách danh mục">
            <div className="admin-table-row categories admin-table-head" role="row">
              <div role="columnheader"><input type="checkbox" aria-label="Chọn tất cả" checked={selected.size === filtered.length && filtered.length > 0} onChange={e => toggleSelectAll(e.target.checked)} /></div>
              <div role="columnheader">Hình ảnh</div>
              <div role="columnheader">Tên danh mục</div>
              <div role="columnheader">Danh mục cha</div>
              <div role="columnheader">Số lượng SP</div>
              <div role="columnheader">Thứ tự</div>
              <div role="columnheader">Trạng thái</div>
              <div role="columnheader">Hành động</div>
            </div>
            {filtered.map(cat => (
              <div key={cat.id} className={`admin-table-row categories category-row ${cat.status === 'hidden' ? 'row-muted' : ''}`} role="row">
                <div role="cell"><input type="checkbox" aria-label={`Chọn ${cat.name}`} checked={selected.has(cat.id)} onChange={e => toggleOne(cat.id, e.target.checked)} /></div>
                <div role="cell">
                  <div className="cat-thumb">
                    <img src={cat.image} alt={cat.name} />
                  </div>
                </div>
                <div role="cell" className="admin-bold">{cat.name}</div>
                <div role="cell"><span className="badge gray">{cat.parent || 'Không có'}</span></div>
                <div role="cell"><span className="badge blue">{cat.count} SP</span></div>
                <div role="cell" className="order-cell">
                  <GripVertical size={14} className="order-grip" />
                  <input
                    type="number"
                    value={cat.order}
                    onChange={e => setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, order: parseInt(e.target.value || '0', 10) } : c))}
                  />
                </div>
                <div role="cell"><span className={`admin-pill ${cat.status === 'visible' ? 'success' : 'neutral'}`}>{cat.status === 'visible' ? 'Đang hiện' : 'Ẩn'}</span></div>
                <div role="cell" className="admin-actions">
                  <button className="admin-icon-btn subtle" title="Sửa" onClick={() => openEditCategory(cat.id)}><Pencil size={16} /></button>
                  <button className="admin-icon-btn subtle" title="Xóa" onClick={() => setCategories(prev => prev.filter(c => c.id !== cat.id))} style={{ color: '#dc2626', borderColor: '#fecdd3' }}><Trash2 size={16} /></button>
                  <button className="admin-icon-btn subtle" title="Xem danh mục con" onClick={() => setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, status: c.status === 'visible' ? 'hidden' : 'visible' } : c))}><Layers size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showCategoryDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowCategoryDrawer(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">{categoryForm.id ? 'Chỉnh sửa' : 'Thêm'} danh mục</p>
                <h3>{categoryForm.name || 'Danh mục mới'}</h3>
              </div>
              <button className="admin-icon-btn" onClick={() => setShowCategoryDrawer(false)} aria-label="Đóng"><X size={16} /></button>
            </div>

            <div className="drawer-body">
              <section className="drawer-section">
                <h4>Banner danh mục</h4>
                <div className="media-grid">
                  <div className="media-cover" style={{ backgroundImage: categoryForm.image ? `url(${categoryForm.image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    {!categoryForm.image && 'Tải banner'}
                  </div>
                  <button className="media-add" onClick={() => setCategoryForm(prev => ({ ...prev, image: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=600&q=80' }))}>+ Chọn ảnh mẫu</button>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Thông tin danh mục</h4>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Tên danh mục</span>
                    <input
                      value={categoryForm.name}
                      onChange={e => {
                        const value = e.target.value;
                        setCategoryForm(prev => ({ ...prev, name: value, slug: prev.slug ? prev.slug : value ? value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-') : '' }));
                      }}
                    />
                  </label>
                  <label className="form-field">
                    <span>Slug</span>
                    <input value={categoryForm.slug} onChange={e => handleCatSlugChange(e.target.value)} />
                  </label>
                  <label className="form-field">
                    <span>Danh mục cha</span>
                    <select value={categoryForm.parent} onChange={e => setCategoryForm(prev => ({ ...prev, parent: e.target.value }))}>
                      <option value="">Không có</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Thứ tự hiển thị</span>
                    <input type="number" value={categoryForm.order} onChange={e => setCategoryForm(prev => ({ ...prev, order: parseInt(e.target.value || '0', 10) }))} />
                  </label>
                  <label className="form-field full">
                    <span>Mô tả ngắn</span>
                    <textarea rows={3} value={categoryForm.description || ''} onChange={e => setCategoryForm(prev => ({ ...prev, description: e.target.value }))} />
                  </label>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Hiển thị</h4>
                <div className="switch-row">
                  <div>
                    <p className="admin-bold">Hiển thị trên Menu chính</p>
                    <p className="admin-muted small">Bật để ghim danh mục vào menu</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={categoryForm.showOnMenu}
                      onChange={e => setCategoryForm(prev => ({ ...prev, showOnMenu: e.target.checked }))}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </section>
            </div>

            <div className="drawer-footer">
              <button className="admin-ghost-btn" onClick={() => setShowCategoryDrawer(false)}>Hủy</button>
              <button className="admin-primary-btn" onClick={handleSaveCategory}>Lưu danh mục</button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminCategories;
