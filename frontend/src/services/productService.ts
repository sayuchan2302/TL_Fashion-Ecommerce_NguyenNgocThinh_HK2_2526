import { apiRequest } from './apiClient';
import type { Product, ProductVariant, ProductStatusType } from '../types';
import { listAdminProducts, type AdminProductRecord } from '../pages/Admin/adminProductService';

const colorHexMatch = (selected: string, productColor: string): boolean => {
  const normalize = (c: string) => c.toLowerCase().trim();
  return normalize(selected).includes(normalize(productColor)) ||
    normalize(productColor).includes(normalize(selected));
};

export interface ProductFilter {
  query?: string;
  priceRanges?: string[];
  sizes?: string[];
  colors?: string[];
  sortBy?: 'newest' | 'bestseller' | 'price-asc' | 'price-desc' | 'discount';
  categoryId?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

interface BackendProductImage {
  url?: string;
  isPrimary?: boolean;
}

interface BackendProductVariant {
  id?: string;
  sku?: string;
  color?: string;
  size?: string;
  stockQuantity?: number;
  priceAdjustment?: number;
}

interface BackendCategory {
  name?: string;
  slug?: string;
}

interface BackendProduct {
  id: string;
  slug?: string;
  name?: string;
  description?: string;
  category?: BackendCategory;
  basePrice?: number;
  salePrice?: number;
  status?: string;
  images?: BackendProductImage[];
  variants?: BackendProductVariant[];
  storeId?: string;
}

const STORE_ASSIGNMENTS = [
  {
    storeId: 'store-001',
    storeName: 'Fashion Hub',
    storeSlug: 'fashion-hub',
    storeLogo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
    isOfficialStore: true,
  },
  {
    storeId: 'store-002',
    storeName: 'Style Shop',
    storeSlug: 'style-shop',
    storeLogo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
    isOfficialStore: false,
  },
];

const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'men', name: 'Thoi Trang Nam', slug: 'men' },
  { id: 'women', name: 'Thoi Trang Nu', slug: 'women' },
  { id: 'sale', name: 'San Pham Khuyen Mai', slug: 'sale' },
  { id: 'new', name: 'San Pham Moi', slug: 'new' },
  { id: 'accessories', name: 'Phu Kien', slug: 'accessories' },
];

const mapStatusType = (statusType: string): ProductStatusType => {
  if (statusType === 'low') return 'low';
  if (statusType === 'out') return 'out';
  return 'active';
};

const mapAdminProductToClient = (record: AdminProductRecord, index: number): Product => {
  const variants: ProductVariant[] = record.variantMatrix.map((row) => ({
    id: row.id,
    size: row.size,
    color: row.color,
    sku: row.sku,
    price: Number(row.price) || record.price,
    stock: Number.parseInt((row.stock || '').replace(/\D/g, ''), 10) || 0,
  }));

  const storeInfo = STORE_ASSIGNMENTS[index % STORE_ASSIGNMENTS.length];

  return {
    id: record.sku,
    sku: record.sku,
    name: record.name,
    category: record.category,
    price: record.price,
    originalPrice: record.price,
    image: record.thumb,
    badge: record.statusType === 'low' ? 'LOW' : undefined,
    colors: Array.from(new Set(record.variantMatrix.map((v) => v.color))).map((color) => color),
    stock: record.stock,
    status: record.status,
    statusType: mapStatusType(record.statusType),
    variants,
    storeId: storeInfo.storeId,
    storeName: storeInfo.storeName,
    storeSlug: storeInfo.storeSlug,
    storeLogo: storeInfo.storeLogo,
    isOfficialStore: storeInfo.isOfficialStore,
  };
};

const listFromAdmin = (): Product[] => listAdminProducts().map(mapAdminProductToClient);

const sortImages = (images?: BackendProductImage[]) =>
  [...(images || [])].sort((left, right) =>
    Number(Boolean(right?.isPrimary)) - Number(Boolean(left?.isPrimary)));

const mapBackendProduct = (product: BackendProduct): Product => {
  const variants = (product.variants || []).map((variant): ProductVariant => ({
    id: variant.sku || variant.id || `${product.slug || product.id}-${variant.color || 'default'}-${variant.size || 'default'}`,
    backendId: variant.id,
    size: variant.size || '',
    color: variant.color || '',
    sku: variant.sku || '',
    price: (product.salePrice || product.basePrice || 0) + (variant.priceAdjustment || 0),
    stock: variant.stockQuantity || 0,
  }));

  const colors = Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean)));
  const sortedImages = sortImages(product.images);
  const storeInfo = product.storeId
    ? {
        storeId: product.storeId,
        storeName: 'Marketplace Store',
        storeSlug: product.storeId,
        storeLogo: sortedImages[0]?.url,
        isOfficialStore: false,
      }
    : undefined;

  return {
    id: product.slug || product.id,
    backendId: product.id,
    sku: product.slug || product.id,
    name: product.name || 'Unnamed product',
    category: product.category?.name || 'Fashion',
    price: product.salePrice || product.basePrice || 0,
    originalPrice: product.basePrice || undefined,
    image: sortedImages[0]?.url || '',
    colors,
    stock: variants.reduce((sum, variant) => sum + (variant.stock || 0), 0),
    status: product.status || 'ACTIVE',
    statusType: variants.some((variant) => (variant.stock || 0) <= 0)
      ? 'low'
      : 'active',
    variants,
    ...storeInfo,
  };
};

const productCache = new Map<string, Product>();

const cacheProducts = (products: Product[]) => {
  for (const product of products) {
    productCache.set(String(product.id), product);
    productCache.set(product.sku, product);
    if (product.backendId) {
      productCache.set(product.backendId, product);
    }
  }
};

const getCachedProducts = () => Array.from(new Set(productCache.values()));

const getCachedProduct = (identifier: number | string) => {
  const normalized = String(identifier);
  return productCache.get(normalized) || null;
};

const filterProductsLocally = (source: Product[], filter: ProductFilter): Product[] => {
  let results = [...source];

  if (filter.query?.trim()) {
    const normalizedQuery = filter.query.toLowerCase().normalize('NFC').trim();
    const words = normalizedQuery.split(/\s+/).filter((word) => word.length >= 2);
    if (words.length > 0) {
      results = results.filter((product) => {
        const searchableText = [product.name, product.badge || '', product.category || '']
          .join(' ')
          .toLowerCase()
          .normalize('NFC');
        return words.every((word) => searchableText.includes(word));
      });
    }
  }

  if (filter.categoryId !== undefined) {
    results = results.filter((product) =>
      (product.category || '').toLowerCase().includes(filter.categoryId!.toLowerCase()));
  }

  if (filter.priceRanges?.length) {
    results = results.filter((product) =>
      filter.priceRanges!.some((range) => {
        if (range === 'under-200k') return product.price < 200000;
        if (range === 'from-200k-500k') return product.price >= 200000 && product.price <= 500000;
        if (range === 'over-500k') return product.price > 500000;
        return false;
      }));
  }

  if (filter.colors?.length) {
    results = results.filter((product) =>
      product.colors && product.colors.length > 0 &&
      filter.colors!.some((selectedColor) =>
        product.colors!.some((productColor) => colorHexMatch(selectedColor, productColor))));
  }

  switch (filter.sortBy) {
    case 'price-asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'discount':
      results.sort((a, b) => {
        const discountA = a.originalPrice ? ((a.originalPrice - a.price) / a.originalPrice) * 100 : 0;
        const discountB = b.originalPrice ? ((b.originalPrice - b.price) / b.originalPrice) * 100 : 0;
        return discountB - discountA;
      });
      break;
    default:
      break;
  }

  return results;
};

const fetchProductByIdentifier = async (identifier: string): Promise<Product | null> => {
  try {
    const backendProduct = await apiRequest<BackendProduct>(`/api/products/slug/${identifier}`);
    const mapped = mapBackendProduct(backendProduct);
    cacheProducts([mapped]);
    return mapped;
  } catch {
    return null;
  }
};

const fetchPublicCatalog = async (): Promise<Product[]> => {
  try {
    const backendProducts = await apiRequest<BackendProduct[]>('/api/products');
    const mapped = backendProducts.map(mapBackendProduct);
    cacheProducts(mapped);
    return mapped;
  } catch {
    const fallback = listFromAdmin();
    cacheProducts(fallback);
    return fallback;
  }
};

export const productService = {
  PRODUCT_CATEGORIES,

  list(): Product[] {
    const cached = getCachedProducts();
    if (cached.length > 0) {
      return cached;
    }

    const fallback = listFromAdmin();
    cacheProducts(fallback);
    return fallback;
  },

  async listPublic(): Promise<Product[]> {
    return fetchPublicCatalog();
  },

  getById(id: number | string): Product | null {
    const cached = getCachedProduct(id);
    if (cached) {
      return cached;
    }

    const products = this.list();
    return products.find((product) => product.sku === String(id) || String(product.id) === String(id)) || null;
  },

  async getByIdentifier(identifier: string): Promise<Product | null> {
    const cached = getCachedProduct(identifier);
    if (cached) {
      return cached;
    }

    const backend = await fetchProductByIdentifier(identifier);
    if (backend) {
      return backend;
    }

    return this.getById(identifier);
  },

  async resolvePurchaseReference(identifier: string, color?: string, size?: string) {
    const product = await this.getByIdentifier(identifier);
    if (!product?.backendId) {
      return { backendProductId: undefined, backendVariantId: undefined };
    }

    const matchingVariant = product.variants?.find((variant) => {
      const sameColor = color ? variant.color.toLowerCase() === color.toLowerCase() : true;
      const sameSize = size ? variant.size.toLowerCase() === size.toLowerCase() : true;
      return sameColor && sameSize;
    });

    return {
      backendProductId: product.backendId,
      backendVariantId: matchingVariant?.backendId,
    };
  },

  filter(filter: ProductFilter): Product[] {
    return filterProductsLocally(this.list(), filter);
  },

  getRelated(productId: number | string, limit = 4): Product[] {
    const products = this.list();
    return products.filter((product) => String(product.id) !== String(productId)).slice(0, limit);
  },

  getByCategory(categoryId: string): Product[] {
    return this.filter({ categoryId });
  },

  getOnSale(): Product[] {
    return this.list().filter((product) => product.originalPrice !== undefined);
  },

  getNewArrivals(): Product[] {
    return this.list().filter((product) => product.badge === 'NEW');
  },

  getCategoryName(categoryId: string): string {
    const category = PRODUCT_CATEGORIES.find((entry) => entry.id === categoryId || entry.slug === categoryId);
    return category?.name || 'Tat Ca San Pham';
  },

  search(query: string, limit?: number): Product[] {
    if (!query.trim()) return [];
    let results = this.filter({ query });
    if (limit !== undefined && limit > 0) {
      results = results.slice(0, limit);
    }
    return results;
  },

  getTotalCount(filter?: ProductFilter): number {
    return this.filter(filter || {}).length;
  },
};
