import './Vendor.css';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Eye, EyeOff, FolderTree, Link2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import VendorLayout from './VendorLayout';
import { formatCurrency } from '../../services/commissionService';
import { AdminStateBlock, AdminToast } from '../Admin/AdminStateBlocks';
import AdminConfirmDialog from '../Admin/AdminConfirmDialog';
import { PanelStatsGrid, PanelTabs, PanelViewSummary } from '../../components/Panel/PanelPrimitives';

type ProductStatus = 'active' | 'low' | 'out' | 'draft';

interface VendorProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sold: number;
  status: ProductStatus;
  image: string;
  description: string;
  visible: boolean;
}

interface DeleteConfirmState {
  ids: string[];
  selectedItems?: string[];
  title: string;
  description: string;
  confirmLabel: string;
  undoMessage: string;
}

type ProductFormErrors = {
  name?: string;
  sku?: string;
  category?: string;
  price?: string;
  stock?: string;
};

const INITIAL_PRODUCTS: VendorProduct[] = [
  {
    id: 'vp-001',
    sku: 'POLO-ESSENTIAL-01',
    name: 'Áo thun cotton Essential',
    category: 'Thời trang Nam > Áo > Áo thun',
    price: 299000,
    stock: 100,
    sold: 124,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=180&h=180&fit=crop',
    description: 'Mẫu áo cơ bản bán chạy, chất cotton dày vừa, phù hợp danh mục thời trang nam cốt lõi.',
    visible: true,
  },
  {
    id: 'vp-002',
    sku: 'JEAN-SLIM-01',
    name: 'Quần jean slim fit',
    category: 'Thời trang Nam > Quần > Quần jeans',
    price: 499000,
    stock: 50,
    sold: 98,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=180&h=180&fit=crop',
    description: 'Dòng slim fit chủ lực, được phân loại đúng taxonomy jeans của sàn.',
    visible: true,
  },
  {
    id: 'vp-003',
    sku: 'POLO-PREMIUM-01',
    name: 'Áo polo premium',
    category: 'Thời trang Nam > Áo > Áo polo',
    price: 399000,
    stock: 75,
    sold: 76,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=180&h=180&fit=crop',
    description: 'SKU premium dùng để kiểm thử luồng chỉnh sửa thông tin và hiển thị storefront.',
    visible: true,
  },
  {
    id: 'vp-004',
    sku: 'SHIRT-LINEN-01',
    name: 'Áo sơ mi linen',
    category: 'Thời trang Nam > Áo > Áo sơ mi',
    price: 459000,
    stock: 8,
    sold: 45,
    status: 'low',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=180&h=180&fit=crop',
    description: 'SKU sắp hết hàng để test cảnh báo tồn kho thấp theo chuẩn seller panel.',
    visible: true,
  },
  {
    id: 'vp-005',
    sku: 'KAKI-PREMIUM-01',
    name: 'Quần kaki cao cấp',
    category: 'Thời trang Nam > Quần > Quần kaki',
    price: 449000,
    stock: 0,
    sold: 32,
    status: 'out',
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=180&h=180&fit=crop',
    description: 'SKU đã hết hàng nhưng vẫn giữ lịch sử bán để vendor quyết định nhập lại hoặc ẩn.',
    visible: true,
  },
  {
    id: 'vp-006',
    sku: 'HOODIE-UNISEX-01',
    name: 'Áo hoodie unisex',
    category: 'Streetwear > Áo khoác > Hoodie',
    price: 550000,
    stock: 45,
    sold: 28,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=180&h=180&fit=crop',
    description: 'Dòng streetwear có hiệu suất tốt, dùng để test duplicate SKU và visibility toggle.',
    visible: true,
  },
  {
    id: 'vp-007',
    sku: 'DENIM-JACKET-01',
    name: 'Áo khoác denim',
    category: 'Streetwear > Áo khoác > Denim jacket',
    price: 650000,
    stock: 0,
    sold: 0,
    status: 'draft',
    image: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=180&h=180&fit=crop',
    description: 'Bản nháp chưa mở bán, phục vụ QA luồng ẩn/hiện sản phẩm trong seller panel.',
    visible: false,
  },
];

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang bán' },
  { key: 'outOfStock', label: 'Hết hàng' },
  { key: 'draft', label: 'Ẩn / nháp' },
] as const;

const emptyForm = (): VendorProduct => ({
  id: '',
  sku: '',
  name: '',
  category: '',
  price: 0,
  stock: 0,
  sold: 0,
  status: 'draft',
  image: '',
  description: '',
  visible: false,
});

const getStatusLabel = (status: ProductStatus) => {
  const map: Record<ProductStatus, string> = {
    active: 'Đang bán',
    low: 'Sắp hết hàng',
    out: 'Hết hàng',
    draft: 'Ẩn / nháp',
  };
  return map[status];
};

const getStatusTone = (status: ProductStatus) => {
  const map: Record<ProductStatus, string> = {
    active: 'success',
    low: 'pending',
    out: 'error',
    draft: 'neutral',
  };
  return map[status];
};

const getFilteredProducts = (items: VendorProduct[], status: string, search: string) => {
  let next = items;

  if (status === 'active') {
    next = next.filter((product) => product.status === 'active' || product.status === 'low');
  } else if (status === 'outOfStock') {
    next = next.filter((product) => product.status === 'out');
  } else if (status === 'draft') {
    next = next.filter((product) => product.status === 'draft');
  }

  if (search.trim()) {
    const query = search.trim().toLowerCase();
    next = next.filter((product) =>
      `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query),
    );
  }

  return next;
};

const VendorProducts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('status') || 'all';
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDrawer, setShowDrawer] = useState(false);
  const [productForm, setProductForm] = useState<VendorProduct>(emptyForm());
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [undoPayload, setUndoPayload] = useState<{ items: VendorProduct[]; message: string } | null>(null);
  const [toast, setToast] = useState('');
  const perPage = 8;

  const filteredProducts = useMemo(
    () => getFilteredProducts(products, activeTab, searchQuery),
    [activeTab, products, searchQuery],
  );

  const tabCounts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((product) => product.status === 'active' || product.status === 'low').length,
      outOfStock: products.filter((product) => product.status === 'out').length,
      draft: products.filter((product) => product.status === 'draft').length,
    }),
    [products],
  );

  const totalPages = Math.max(Math.ceil(filteredProducts.length / perPage), 1);
  const safePage = Math.min(page, totalPages);
  const startIndex = filteredProducts.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const endIndex = Math.min(safePage * perPage, filteredProducts.length);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filteredProducts.slice(start, start + perPage);
  }, [filteredProducts, safePage]);

  const hasViewContext = activeTab !== 'all' || Boolean(searchQuery.trim());

  const pushToast = (message: string) => {
    setToast(message);
    window.clearTimeout((pushToast as typeof pushToast & { timer?: number }).timer);
    (pushToast as typeof pushToast & { timer?: number }).timer = window.setTimeout(() => setToast(''), 2600);
  };

  const resetCurrentView = () => {
    setSearchQuery('');
    setSearchParams({ status: 'all' });
    setPage(1);
    setSelected(new Set());
  };

  const shareCurrentView = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('status', activeTab);
    if (searchQuery.trim()) {
      url.searchParams.set('q', searchQuery.trim());
    }
    await navigator.clipboard.writeText(url.toString());
    pushToast('Đã sao chép bộ lọc hiện tại của trang sản phẩm');
  };

  const handleTabChange = (key: string) => {
    setSearchParams({ status: key });
    setPage(1);
    setSelected(new Set());
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredProducts.map((product) => product.id)));
      return;
    }
    setSelected(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const openCreateDrawer = () => {
    setProductForm(emptyForm());
    setFormErrors({});
    setShowDrawer(true);
  };

  const openEditDrawer = (id: string) => {
    const current = products.find((product) => product.id === id);
    if (!current) return;
    setProductForm(current);
    setFormErrors({});
    setShowDrawer(true);
  };

  const validateForm = (form: VendorProduct) => {
    const errors: ProductFormErrors = {};
    if (!form.name.trim()) errors.name = 'Tên sản phẩm không được để trống.';
    if (!form.sku.trim()) errors.sku = 'SKU là bắt buộc để đối soát tồn kho.';
    if (!form.category.trim()) errors.category = 'Sản phẩm phải gắn vào danh mục của sàn.';
    if (form.price <= 0) errors.price = 'Giá bán phải lớn hơn 0.';
    if (form.stock < 0) errors.stock = 'Tồn kho không được âm.';
    const duplicatedSku = products.some(
      (product) => product.id !== form.id && product.sku.trim().toLowerCase() === form.sku.trim().toLowerCase(),
    );
    if (duplicatedSku) errors.sku = 'SKU đã tồn tại trong cửa hàng.';
    return errors;
  };

  const saveProduct = () => {
    const normalizedForm: VendorProduct = {
      ...productForm,
      name: productForm.name.trim(),
      sku: productForm.sku.trim().toUpperCase(),
      category: productForm.category.trim(),
      description: productForm.description.trim(),
      image: productForm.image.trim() || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=180&h=180&fit=crop',
      status: productForm.visible
        ? productForm.stock === 0
          ? 'out'
          : productForm.stock < 10
            ? 'low'
            : 'active'
        : 'draft',
    };

    const errors = validateForm(normalizedForm);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (normalizedForm.id) {
      setProducts((current) => current.map((item) => (item.id === normalizedForm.id ? normalizedForm : item)));
      pushToast('Đã cập nhật sản phẩm trong seller panel');
    } else {
      setProducts((current) => [{ ...normalizedForm, id: `vp-${Date.now()}` }, ...current]);
      pushToast('Đã tạo sản phẩm mới cho gian hàng');
    }

    setShowDrawer(false);
  };

  const handleDuplicate = (id: string) => {
    const current = products.find((product) => product.id === id);
    if (!current) return;
    const duplicated: VendorProduct = {
      ...current,
      id: `vp-${Date.now()}`,
      sku: `${current.sku}-COPY`,
      name: `${current.name} bản sao`,
      status: 'draft',
      visible: false,
      sold: 0,
    };
    setProducts((list) => [duplicated, ...list]);
    pushToast(`Đã nhân bản SKU ${current.sku}`);
  };

  const applyVisibility = (ids: string[], visible: boolean) => {
    setProducts((current) =>
      current.map((product) => {
        if (!ids.includes(product.id)) return product;
        return {
          ...product,
          visible,
          status: visible
            ? product.stock === 0
              ? 'out'
              : product.stock < 10
                ? 'low'
                : 'active'
            : 'draft',
        };
      }),
    );
    setSelected(new Set());
    pushToast(visible ? 'Đã mở hiển thị các sản phẩm đã chọn' : 'Đã ẩn các sản phẩm đã chọn');
  };

  const requestDelete = (ids: string[]) => {
    const items = products.filter((product) => ids.includes(product.id));
    if (items.length === 0) return;
    setDeleteConfirm({
      ids,
      selectedItems: items.map((item) => item.name),
      title: ids.length > 1 ? 'Xóa các sản phẩm đã chọn' : 'Xóa sản phẩm',
      description:
        ids.length > 1
          ? 'Bạn có chắc chắn muốn xóa các sản phẩm đã chọn? Hành động này sẽ gỡ chúng khỏi seller panel.'
          : 'Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này sẽ gỡ sản phẩm khỏi seller panel.',
      confirmLabel: ids.length > 1 ? 'Xóa sản phẩm' : 'Xóa ngay',
      undoMessage: ids.length > 1 ? `Đã xóa ${ids.length} sản phẩm` : `Đã xóa ${items[0]?.name}`,
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const ids = new Set(deleteConfirm.ids);
    const deletedItems = products.filter((product) => ids.has(product.id));
    setProducts((current) => current.filter((product) => !ids.has(product.id)));
    setSelected(new Set());
    setUndoPayload({ items: deletedItems, message: deleteConfirm.undoMessage });
    setDeleteConfirm(null);
  };

  const restoreDeleted = () => {
    if (!undoPayload) return;
    setProducts((current) => [...undoPayload.items, ...current]);
    setUndoPayload(null);
    pushToast('Đã hoàn tác thao tác xóa sản phẩm');
  };

  return (
    <VendorLayout
      title="Sản phẩm và tồn kho"
      breadcrumbs={[{ label: 'Sản phẩm và tồn kho' }, { label: 'Danh mục của shop' }]}
      actions={(
        <>
          <div className="admin-search">
            <Search size={16} />
            <input
              placeholder="Tìm theo tên, SKU hoặc danh mục"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ bộ lọc
          </button>
          <button className="admin-ghost-btn" onClick={resetCurrentView}>Đặt lại</button>
          <button className="admin-primary-btn vendor-admin-primary" onClick={openCreateDrawer}>
            <Plus size={14} />
            Thêm sản phẩm
          </button>
        </>
      )}
    >
      <PanelStatsGrid
        accentClassName="vendor-stat-button"
        items={[
          { key: 'all', label: 'Tổng SKU', value: tabCounts.all, sub: 'Toàn bộ danh mục cửa hàng', onClick: () => handleTabChange('all') },
          { key: 'active', label: 'Đang bán', value: tabCounts.active, sub: 'SKU đang hiển thị trên sàn', tone: 'success', onClick: () => handleTabChange('active') },
          { key: 'stock', label: 'Sắp hết / hết hàng', value: products.filter((product) => product.status === 'low' || product.status === 'out').length, sub: 'Cần bổ sung tồn kho hoặc ẩn bán', tone: 'warning', onClick: () => handleTabChange('outOfStock') },
          { key: 'draft', label: 'Ẩn / nháp', value: tabCounts.draft, sub: 'SKU chưa mở bán công khai', tone: 'info', onClick: () => handleTabChange('draft') },
        ]}
      />

      <PanelTabs
        items={TABS.map((tab) => ({ key: tab.key, label: tab.label, count: tabCounts[tab.key] }))}
        activeKey={activeTab}
        onChange={handleTabChange}
        accentClassName="vendor-active-tab"
      />

      <PanelViewSummary
        chips={[
          ...(hasViewContext ? [{ key: 'status', label: <>Trạng thái: {TABS.find((tab) => tab.key === activeTab)?.label || 'Tất cả'}</> }] : []),
          ...(searchQuery.trim() ? [{ key: 'query', label: <>Từ khóa: {searchQuery.trim()}</> }] : []),
        ]}
        clearLabel="Xóa bộ lọc"
        onClear={resetCurrentView}
      />
      <section className="admin-panels single">
        <div className="admin-panel">
          {filteredProducts.length === 0 ? (
            <AdminStateBlock
              type={searchQuery.trim() ? 'search-empty' : 'empty'}
              title={searchQuery.trim() ? 'Không tìm thấy SKU phù hợp' : 'Chưa có sản phẩm phù hợp'}
              description={
                searchQuery.trim()
                  ? 'Thử đổi từ khóa hoặc quay về toàn bộ danh mục để xem thêm sản phẩm của shop.'
                  : 'Khi shop tạo sản phẩm mới theo taxonomy của sàn, danh sách sẽ xuất hiện tại đây.'
              }
              actionLabel={searchQuery.trim() ? 'Đặt lại bộ lọc' : 'Thêm sản phẩm'}
              onAction={searchQuery.trim() ? resetCurrentView : openCreateDrawer}
            />
          ) : (
            <>
              <div className="admin-table" role="table" aria-label="Bảng sản phẩm của gian hàng">
                <div className="admin-table-row vendor-products admin-table-head" role="row">
                  <div role="columnheader">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả sản phẩm"
                      checked={selected.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                    />
                  </div>
                  <div role="columnheader">Sản phẩm</div>
                  <div role="columnheader">Danh mục</div>
                  <div role="columnheader">Giá bán</div>
                  <div role="columnheader">Tồn kho</div>
                  <div role="columnheader">Đã bán</div>
                  <div role="columnheader">Trạng thái</div>
                  <div role="columnheader">Hành động</div>
                </div>

                {paginatedProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    className={`admin-table-row vendor-products ${product.status === 'draft' ? 'row-muted' : ''}`}
                    role="row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.14) }}
                    whileHover={{ y: -1 }}
                    onClick={() => openEditDrawer(product.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div role="cell" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${product.name}`}
                        checked={selected.has(product.id)}
                        onChange={(event) => toggleOne(product.id, event.target.checked)}
                      />
                    </div>
                    <div role="cell" className="vendor-admin-product-cell">
                      <img src={product.image} alt={product.name} className="vendor-admin-thumb" />
                      <div className="vendor-admin-product-copy">
                        <div className="admin-bold">{product.name}</div>
                        <div className="admin-muted small">SKU: {product.sku}</div>
                      </div>
                    </div>
                    <div role="cell" className="vendor-admin-category">
                      <FolderTree size={14} />
                      <span>{product.category}</span>
                    </div>
                    <div role="cell" className="admin-bold">{formatCurrency(product.price)}</div>
                    <div role="cell">
                      <span className={`badge ${product.stock === 0 ? 'red' : product.stock < 10 ? 'amber' : 'blue'}`}>
                        {product.stock} sản phẩm
                      </span>
                    </div>
                    <div role="cell" className="admin-muted">{product.sold} đã bán</div>
                    <div role="cell">
                      <span className={`admin-pill ${getStatusTone(product.status)}`}>{getStatusLabel(product.status)}</span>
                    </div>
                    <div role="cell" className="admin-actions" onClick={(event) => event.stopPropagation()}>
                      <button className="admin-icon-btn subtle" title="Chỉnh sửa sản phẩm" onClick={() => openEditDrawer(product.id)}>
                        <Pencil size={16} />
                      </button>
                      <button className="admin-icon-btn subtle" title="Nhân bản SKU" onClick={() => handleDuplicate(product.id)}>
                        <Copy size={16} />
                      </button>
                      <button
                        className="admin-icon-btn subtle"
                        title={product.visible ? 'Ẩn sản phẩm' : 'Hiển thị sản phẩm'}
                        onClick={() => applyVisibility([product.id], !product.visible)}
                      >
                        {product.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        className="admin-icon-btn subtle danger-icon"
                        title="Xóa sản phẩm"
                        onClick={() => requestDelete([product.id])}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="table-footer">
                <span className="table-footer-meta">Hiển thị {startIndex}-{endIndex} trên {filteredProducts.length} sản phẩm</span>
                <div className="pagination">
                  <button className="page-btn" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
                    Trước
                  </button>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index + 1}
                      className={`page-btn ${safePage === index + 1 ? 'active vendor-active-page' : ''}`}
                      onClick={() => setPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    className="page-btn"
                    disabled={safePage === totalPages}
                    onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <AnimatePresence>
        {undoPayload && (
          <motion.div
            className="admin-undo-bar"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
          >
            <span>{undoPayload.message}</span>
            <div className="admin-actions">
              <button className="admin-ghost-btn" onClick={restoreDeleted}>Hoàn tác</button>
              <button className="admin-icon-btn subtle" onClick={() => setUndoPayload(null)} aria-label="Đóng thông báo hoàn tác">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            className="admin-floating-bar vendor-floating-bar"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="admin-floating-content">
              <span>Đã chọn {selected.size} sản phẩm</span>
              <div className="admin-actions">
                <button className="admin-ghost-btn" onClick={() => applyVisibility(Array.from(selected), false)}>Ẩn sản phẩm</button>
                <button className="admin-ghost-btn" onClick={() => applyVisibility(Array.from(selected), true)}>Mở hiển thị</button>
                <button className="admin-ghost-btn danger" onClick={() => requestDelete(Array.from(selected))}>Xóa đã chọn</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteConfirm?.title || 'Xác nhận xóa'}
        description={deleteConfirm?.description || ''}
        selectedItems={deleteConfirm?.selectedItems}
        selectedNoun="sản phẩm"
        confirmLabel={deleteConfirm?.confirmLabel || 'Xóa'}
        danger
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />

      {showDrawer && (
        <>
          <div className="drawer-overlay" onClick={() => setShowDrawer(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <p className="drawer-eyebrow">{productForm.id ? 'Chỉnh sửa SKU' : 'Tạo SKU mới'}</p>
                <h3>{productForm.name || 'Sản phẩm mới'}</h3>
              </div>
              <button className="admin-icon-btn" onClick={() => setShowDrawer(false)} aria-label="Đóng biểu mẫu sản phẩm">
                <X size={16} />
              </button>
            </div>

            <div className="drawer-body">
              <section className="drawer-section">
                <h4>Ảnh đại diện sản phẩm</h4>
                <div className="media-grid">
                  <div
                    className="media-cover vendor-media-cover"
                    style={{ backgroundImage: productForm.image ? `url(${productForm.image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  >
                    {!productForm.image && 'Tải ảnh sản phẩm'}
                  </div>
                  <button
                    className="media-add"
                    onClick={() =>
                      setProductForm((current) => ({
                        ...current,
                        image: current.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=180&h=180&fit=crop',
                      }))
                    }
                  >
                    + Chọn ảnh mẫu
                  </button>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Thông tin bán hàng</h4>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Tên sản phẩm</span>
                    <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
                    {formErrors.name && <small className="form-field-error">{formErrors.name}</small>}
                  </label>
                  <label className="form-field">
                    <span>SKU</span>
                    <input value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} />
                    {formErrors.sku && <small className="form-field-error">{formErrors.sku}</small>}
                  </label>
                  <label className="form-field full">
                    <span>Danh mục của sàn</span>
                    <input
                      value={productForm.category}
                      onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                      placeholder="Ví dụ: Thời trang Nam > Áo > Áo thun"
                    />
                    {formErrors.category && <small className="form-field-error">{formErrors.category}</small>}
                  </label>
                  <label className="form-field">
                    <span>Giá bán</span>
                    <input
                      type="number"
                      min={0}
                      value={productForm.price}
                      onChange={(event) => setProductForm((current) => ({ ...current, price: Number(event.target.value || 0) }))}
                    />
                    {formErrors.price && <small className="form-field-error">{formErrors.price}</small>}
                  </label>
                  <label className="form-field">
                    <span>Tồn kho</span>
                    <input
                      type="number"
                      min={0}
                      value={productForm.stock}
                      onChange={(event) => setProductForm((current) => ({ ...current, stock: Number(event.target.value || 0) }))}
                    />
                    {formErrors.stock && <small className="form-field-error">{formErrors.stock}</small>}
                  </label>
                  <label className="form-field full">
                    <span>Mô tả nhanh cho đội vận hành</span>
                    <textarea
                      rows={4}
                      value={productForm.description}
                      onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Điểm khác biệt, chất liệu, lưu ý fulfillment..."
                    />
                  </label>
                </div>
              </section>

              <section className="drawer-section">
                <h4>Trạng thái hiển thị</h4>
                <div className="switch-row">
                  <div>
                    <p className="admin-bold">Hiển thị trên storefront</p>
                    <p className="admin-muted small">Nếu tắt, SKU sẽ chuyển về trạng thái ẩn / nháp trong seller panel.</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={productForm.visible}
                      onChange={(event) => setProductForm((current) => ({ ...current, visible: event.target.checked }))}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </section>
            </div>

            <div className="drawer-footer">
              <button className="admin-ghost-btn" onClick={() => setShowDrawer(false)}>Hủy</button>
              <button className="admin-primary-btn vendor-admin-primary" onClick={saveProduct}>
                {productForm.id ? 'Lưu cập nhật' : 'Tạo sản phẩm'}
              </button>
            </div>
          </div>
        </>
      )}

      <AdminToast toast={toast} />
    </VendorLayout>
  );
};

export default VendorProducts;
