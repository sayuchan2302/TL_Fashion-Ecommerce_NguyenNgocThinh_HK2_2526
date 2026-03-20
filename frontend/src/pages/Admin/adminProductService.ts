import type { VariantRow } from './AdminVariantModal';

type ProductStatusType = 'active' | 'low' | 'out';

type InventorySource = 'manual_adjustment' | 'variant_sync' | 'bulk_action';

export interface InventoryMovement {
  id: string;
  at: string;
  actor: string;
  source: InventorySource;
  reason: string;
  delta: number;
  beforeStock: number;
  afterStock: number;
}

export interface AdminProductRecord {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  variants: string;
  thumb: string;
  statusType: ProductStatusType;
  variantMatrix: VariantRow[];
  inventoryLedger: InventoryMovement[];
  version: number;
  updatedAt: string;
}

const getStatusFromStock = (stock: number) => {
  if (stock <= 0) return { status: 'Hết hàng', statusType: 'out' as const };
  if (stock < 10) return { status: 'Sắp hết', statusType: 'low' as const };
  return { status: 'Đang bán', statusType: 'active' as const };
};

const initialVariantRows: VariantRow[] = [
  { id: 'S-Đen', size: 'S', color: 'Đen', sku: 'POLO-001-DEN-S', price: '350000', stock: '12' },
  { id: 'M-Đen', size: 'M', color: 'Đen', sku: 'POLO-001-DEN-M', price: '350000', stock: '10' },
  { id: 'L-Đen', size: 'L', color: 'Đen', sku: 'POLO-001-DEN-L', price: '350000', stock: '8' },
  { id: 'S-Trắng', size: 'S', color: 'Trắng', sku: 'POLO-001-TRANG-S', price: '350000', stock: '6' },
  { id: 'M-Trắng', size: 'M', color: 'Trắng', sku: 'POLO-001-TRANG-M', price: '350000', stock: '4' },
  { id: 'L-Trắng', size: 'L', color: 'Trắng', sku: 'POLO-001-TRANG-L', price: '350000', stock: '2' },
];

const nowIso = () => new Date().toISOString();

let productRecords: AdminProductRecord[] = [
  {
    sku: 'POLO-001',
    name: 'Áo Polo Cotton Khử Mùi',
    category: 'Áo Polo',
    price: 359000,
    stock: 42,
    status: 'Đang bán',
    variants: '3 sizes · 4 colors',
    thumb: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=140&h=170&q=80',
    statusType: 'active',
    variantMatrix: initialVariantRows,
    inventoryLedger: [
      {
        id: 'seed-polo-1',
        at: nowIso(),
        actor: 'system',
        source: 'variant_sync',
        reason: 'Khởi tạo tồn kho từ ma trận biến thể',
        delta: 42,
        beforeStock: 0,
        afterStock: 42,
      },
    ],
    version: 1,
    updatedAt: nowIso(),
  },
  {
    sku: 'JEAN-023',
    name: 'Quần Jeans Slim',
    category: 'Quần Jeans',
    price: 699000,
    stock: 8,
    status: 'Sắp hết',
    variants: '5 sizes · 2 colors',
    thumb: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=140&h=170&q=80',
    statusType: 'low',
    variantMatrix: [],
    inventoryLedger: [
      {
        id: 'seed-jean-1',
        at: nowIso(),
        actor: 'system',
        source: 'manual_adjustment',
        reason: 'Khởi tạo tồn kho ban đầu',
        delta: 8,
        beforeStock: 0,
        afterStock: 8,
      },
    ],
    version: 1,
    updatedAt: nowIso(),
  },
  {
    sku: 'TEE-105',
    name: 'Áo Thun Basic',
    category: 'Áo Thun',
    price: 199000,
    stock: 0,
    status: 'Hết hàng',
    variants: '4 sizes · 6 colors',
    thumb: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=140&h=170&q=80',
    statusType: 'out',
    variantMatrix: [],
    inventoryLedger: [
      {
        id: 'seed-tee-1',
        at: nowIso(),
        actor: 'system',
        source: 'manual_adjustment',
        reason: 'Khởi tạo tồn kho ban đầu',
        delta: 0,
        beforeStock: 0,
        afterStock: 0,
      },
    ],
    version: 1,
    updatedAt: nowIso(),
  },
  {
    sku: 'ACC-501',
    name: 'Thắt Lưng Da',
    category: 'Phụ kiện',
    price: 249000,
    stock: 88,
    status: 'Đang bán',
    variants: '1 size · 3 colors',
    thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=140&h=170&q=80',
    statusType: 'active',
    variantMatrix: [],
    inventoryLedger: [
      {
        id: 'seed-acc-1',
        at: nowIso(),
        actor: 'system',
        source: 'manual_adjustment',
        reason: 'Khởi tạo tồn kho ban đầu',
        delta: 88,
        beforeStock: 0,
        afterStock: 88,
      },
    ],
    version: 1,
    updatedAt: nowIso(),
  },
];

const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const cloneVariantMatrix = (rows: VariantRow[]) => rows.map((row) => ({ ...row }));

const cloneRecord = (record: AdminProductRecord): AdminProductRecord => ({
  ...record,
  variantMatrix: cloneVariantMatrix(record.variantMatrix),
  inventoryLedger: record.inventoryLedger.map((entry) => ({ ...entry })),
});

const applyRecordAtIndex = (index: number, updater: (current: AdminProductRecord) => AdminProductRecord) => {
  const current = productRecords[index];
  const next = updater(current);
  productRecords = [
    ...productRecords.slice(0, index),
    next,
    ...productRecords.slice(index + 1),
  ];
  emitChange();
  return cloneRecord(next);
};

const appendLedger = (
  current: AdminProductRecord,
  payload: {
    actor: string;
    source: InventorySource;
    reason: string;
    delta: number;
    beforeStock: number;
    afterStock: number;
  },
) => {
  const entry: InventoryMovement = {
    id: `${current.sku}-${Date.now()}`,
    at: nowIso(),
    actor: payload.actor,
    source: payload.source,
    reason: payload.reason,
    delta: payload.delta,
    beforeStock: payload.beforeStock,
    afterStock: payload.afterStock,
  };

  return {
    ...current,
    ...getStatusFromStock(payload.afterStock),
    stock: payload.afterStock,
    updatedAt: nowIso(),
    version: current.version + 1,
    inventoryLedger: [entry, ...current.inventoryLedger],
  };
};

export const listAdminProducts = () => productRecords.map(cloneRecord);

export const subscribeAdminProducts = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getProductBySku = (sku: string) => {
  const found = productRecords.find((item) => item.sku === sku);
  return found ? cloneRecord(found) : null;
};

export const updateProductPrice = (sku: string, price: number) => {
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false as const, error: 'Giá bán phải lớn hơn 0.' };
  }
  const index = productRecords.findIndex((item) => item.sku === sku);
  if (index < 0) return { ok: false as const, error: 'Không tìm thấy sản phẩm.' };

  const updated = applyRecordAtIndex(index, (current) => ({
    ...current,
    price,
    updatedAt: nowIso(),
    version: current.version + 1,
  }));
  return { ok: true as const, product: updated };
};

export const adjustProductStock = (payload: {
  sku: string;
  nextStock: number;
  actor: string;
  reason: string;
  source?: InventorySource;
}) => {
  if (!Number.isFinite(payload.nextStock) || payload.nextStock < 0) {
    return { ok: false as const, error: 'Tồn kho phải là số >= 0.' };
  }
  if (!payload.reason.trim()) {
    return { ok: false as const, error: 'Vui lòng nhập lý do điều chỉnh tồn kho.' };
  }
  const index = productRecords.findIndex((item) => item.sku === payload.sku);
  if (index < 0) return { ok: false as const, error: 'Không tìm thấy sản phẩm.' };

  const updated = applyRecordAtIndex(index, (current) => {
    const beforeStock = current.stock;
    const afterStock = Math.floor(payload.nextStock);
    const delta = afterStock - beforeStock;
    return appendLedger(current, {
      actor: payload.actor,
      source: payload.source || 'manual_adjustment',
      reason: payload.reason.trim(),
      delta,
      beforeStock,
      afterStock,
    });
  });

  return { ok: true as const, product: updated };
};

export const applyVariantMatrix = (payload: {
  sku: string;
  matrix: VariantRow[];
  actor: string;
}) => {
  const index = productRecords.findIndex((item) => item.sku === payload.sku);
  if (index < 0) return { ok: false as const, error: 'Không tìm thấy sản phẩm.' };

  const matrix = cloneVariantMatrix(payload.matrix);
  const totalStock = matrix.reduce((sum, item) => sum + (Number.parseInt((item.stock || '').replace(/\D/g, ''), 10) || 0), 0);
  const sizeCount = new Set(matrix.map((item) => item.size)).size;
  const colorCount = new Set(matrix.map((item) => item.color)).size;

  const updated = applyRecordAtIndex(index, (current) => {
    const nextWithLedger = appendLedger(current, {
      actor: payload.actor,
      source: 'variant_sync',
      reason: 'Đồng bộ tồn kho từ ma trận biến thể',
      delta: totalStock - current.stock,
      beforeStock: current.stock,
      afterStock: totalStock,
    });

    return {
      ...nextWithLedger,
      variants: `${sizeCount} sizes · ${colorCount} colors`,
      variantMatrix: matrix,
    };
  });

  return { ok: true as const, product: updated };
};

export const getProductVariantMatrix = (sku: string) => {
  const found = productRecords.find((item) => item.sku === sku);
  return found ? cloneVariantMatrix(found.variantMatrix) : [];
};

export const getProductInventoryLedger = (sku: string, limit = 8) => {
  const found = productRecords.find((item) => item.sku === sku);
  if (!found) return [];
  return found.inventoryLedger.slice(0, limit).map((entry) => ({ ...entry }));
};
