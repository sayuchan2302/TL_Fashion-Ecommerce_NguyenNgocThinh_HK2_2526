import { apiRequest } from './apiClient';

export interface StoreProfile {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  description?: string;
  rating: number;
  totalOrders: number;
  totalSales: number;
  isOfficial: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  applicantName?: string;
  applicantEmail?: string;
  commissionRate?: number;
  phone?: string;
  contactEmail?: string;
  address?: string;
  rejectionReason?: string;
}

export interface StoreProduct {
  id: number;
  sku: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  colors?: string[];
  sizes?: string[];
  stock: number;
  status: string;
  statusType: 'active' | 'low' | 'out';
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  isOfficialStore?: boolean;
}

interface StoreProductsResponse {
  products: StoreProduct[];
  total: number;
  page: number;
  totalPages: number;
}

export interface StoreRegistrationRequest {
  shopName: string;
  brandName: string;
  slug: string;
  category: string;
  address: string;
  city?: string;
  district?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  shippingLeadTime?: string;
  returnPolicy?: string;
  taxCode?: string;
  businessType?: string;
}

interface StoreUpdateRequest {
  name?: string;
  slug?: string;
  description?: string;
  logo?: string;
  banner?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
}

export interface StoreRegistrationResponse {
  storeId: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ApproveStoreResponse {
  storeId: string;
  status: 'APPROVED';
}

export interface StoreLifecycleActionResponse {
  storeId: string;
  status: StoreProfile['status'];
}

interface BackendStoreResponse {
  id: string;
  ownerName?: string;
  ownerEmail?: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  commissionRate?: number;
  status: StoreProfile['status'];
  approvalStatus: StoreProfile['approvalStatus'];
  rejectionReason?: string;
  totalSales?: number;
  totalOrders?: number;
  rating?: number;
  createdAt?: string;
}

interface BackendProductPage<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
}

interface BackendProduct {
  id: string;
  slug?: string;
  name?: string;
  basePrice?: number;
  salePrice?: number;
  status?: string;
  images?: Array<{ url?: string }>;
  variants?: Array<{ sku?: string; color?: string; size?: string; stockQuantity?: number }>;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockStores: Record<string, StoreProfile> = {
  'store-001': {
    id: 'store-001',
    name: 'Fashion Hub',
    slug: 'fashion-hub',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop',
    description: 'Chuyen cung cap cac san pham thoi trang nam nu chat luong cao, gia ca hop ly.',
    rating: 4.8,
    totalOrders: 1250,
    totalSales: 500000000,
    isOfficial: true,
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    createdAt: '2024-01-15T00:00:00Z',
    applicantName: 'Fashion Hub Owner',
    applicantEmail: 'vendor@gmail.com',
    commissionRate: 2.5,
    phone: '0901234567',
    contactEmail: 'contact@fashionhub.vn',
    address: '123 Nguyen Hue, Quan 1, TP.HCM',
  },
  'store-002': {
    id: 'store-002',
    name: 'Style Shop',
    slug: 'style-shop',
    logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop',
    description: 'Shop thoi trang uy tin, chat luong dam bao.',
    rating: 4.5,
    totalOrders: 800,
    totalSales: 250000000,
    isOfficial: false,
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    createdAt: '2024-03-20T00:00:00Z',
    applicantName: 'Style Shop Owner',
    applicantEmail: 'style@email.com',
    commissionRate: 4,
    phone: '0907654321',
    contactEmail: 'hello@styleshop.vn',
    address: '89 Le Loi, Quan 3, TP.HCM',
  },
  'store-003': {
    id: 'store-003',
    name: 'New Style Lab',
    slug: 'new-style-lab',
    logo: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&h=400&fit=crop',
    description: 'Ung tuyen mo cua hang tren nen tang.',
    rating: 0,
    totalOrders: 0,
    totalSales: 0,
    isOfficial: false,
    status: 'INACTIVE',
    approvalStatus: 'PENDING',
    createdAt: '2024-05-05T00:00:00Z',
    applicantName: 'Shop Cho Duyet',
    applicantEmail: 'vendorpending@gmail.com',
    commissionRate: 5,
    phone: '0912345678',
    contactEmail: 'pending@shop.vn',
    address: '12 Pasteur, Quan 3, TP.HCM',
  },
};

const mockProducts: StoreProduct[] = [
  {
    id: 1,
    sku: 'AO001',
    name: 'Ao Thun Nam Cotton Classic',
    price: 299000,
    originalPrice: 399000,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=672&h=990&fit=crop',
    badge: 'BAN CHAY',
    colors: ['#FFFFFF', '#000000', '#1E3A8A'],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    stock: 100,
    status: 'active',
    statusType: 'active',
    storeId: 'store-001',
    storeName: 'Fashion Hub',
    storeSlug: 'fashion-hub',
    isOfficialStore: true,
  },
  {
    id: 2,
    sku: 'QUAN001',
    name: 'Quan Jean Nam Slim Fit',
    price: 499000,
    originalPrice: 599000,
    image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=672&h=990&fit=crop',
    colors: ['#1E3A8A', '#000000'],
    sizes: ['28', '30', '32', '34'],
    stock: 50,
    status: 'active',
    statusType: 'active',
    storeId: 'store-001',
    storeName: 'Fashion Hub',
    storeSlug: 'fashion-hub',
    isOfficialStore: true,
  },
  {
    id: 3,
    sku: 'AO003',
    name: 'Ao So Mi Nam Linen',
    price: 459000,
    originalPrice: 559000,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=672&h=990&fit=crop',
    badge: 'GIAM 20%',
    colors: ['#FFFFFF', '#F5F5DC'],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    stock: 30,
    status: 'active',
    statusType: 'low',
    storeId: 'store-002',
    storeName: 'Style Shop',
    storeSlug: 'style-shop',
    isOfficialStore: false,
  },
];

const buildRegistrationDescription = (payload: StoreRegistrationRequest) =>
  [
    payload.brandName ? `Brand: ${payload.brandName}` : null,
    payload.category ? `Category: ${payload.category}` : null,
    payload.shippingLeadTime ? `Lead time: ${payload.shippingLeadTime}` : null,
    payload.returnPolicy ? `Return policy: ${payload.returnPolicy}` : null,
    payload.businessType ? `Business type: ${payload.businessType}` : null,
    payload.taxCode ? `Tax code: ${payload.taxCode}` : null,
  ].filter(Boolean).join('\n');

const mapBackendStore = (store: BackendStoreResponse): StoreProfile => ({
  id: store.id,
  name: store.name,
  slug: store.slug,
  logo: store.logo,
  banner: store.banner,
  description: store.description,
  rating: Number(store.rating || 0),
  totalOrders: Number(store.totalOrders || 0),
  totalSales: Number(store.totalSales || 0),
  isOfficial: Number(store.commissionRate || 5) <= 3,
  status: store.status,
  approvalStatus: store.approvalStatus,
  createdAt: store.createdAt || new Date().toISOString(),
  applicantName: store.ownerName,
  applicantEmail: store.ownerEmail,
  commissionRate: Number(store.commissionRate || 5),
  phone: store.phone,
  contactEmail: store.contactEmail,
  address: store.address,
  rejectionReason: store.rejectionReason,
});

const mapBackendProduct = (product: BackendProduct, store?: StoreProfile): StoreProduct => {
  const variants = product.variants || [];
  const stock = variants.reduce((sum, variant) => sum + Number(variant.stockQuantity || 0), 0);
  const price = Number(product.salePrice || product.basePrice || 0);
  const originalPrice = product.salePrice ? Number(product.basePrice || product.salePrice) : undefined;

  return {
    id: Number(product.id.replace(/\D/g, '')) || Date.now(),
    sku: variants[0]?.sku || product.slug || product.id,
    name: product.name || 'San pham',
    price,
    originalPrice,
    image: product.images?.[0]?.url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=672&h=990&fit=crop',
    colors: variants.map((variant) => variant.color).filter(Boolean) as string[],
    sizes: variants.map((variant) => variant.size).filter(Boolean) as string[],
    stock,
    status: (product.status || 'ACTIVE').toLowerCase(),
    statusType: stock === 0 ? 'out' : stock < 10 ? 'low' : 'active',
    storeId: store?.id,
    storeName: store?.name,
    storeSlug: store?.slug,
    isOfficialStore: store?.isOfficial,
  };
};

export const storeService = {
  async getStoreBySlug(slug: string): Promise<StoreProfile | null> {
    try {
      const store = await apiRequest<BackendStoreResponse>(`/api/stores/slug/${encodeURIComponent(slug)}`);
      return mapBackendStore(store);
    } catch {
      await delay(250);
      return Object.values(mockStores).find((store) => store.slug === slug) || null;
    }
  },

  async getStoreProducts(storeId: string, page = 1, limit = 12): Promise<StoreProductsResponse> {
    try {
      const [store, productPage] = await Promise.all([
        this.getStoreById(storeId),
        apiRequest<BackendProductPage<BackendProduct>>(`/api/products/store/${storeId}?page=${Math.max(page - 1, 0)}&size=${limit}`),
      ]);

      const products = (productPage.content || []).map((product) => mapBackendProduct(product, store || undefined));
      return {
        products,
        total: Number(productPage.totalElements || products.length),
        page: Number(productPage.number || 0) + 1,
        totalPages: Number(productPage.totalPages || 1),
      };
    } catch {
      await delay(300);
      const products = mockProducts.filter((product) => product.storeId === storeId);
      const start = (page - 1) * limit;
      return {
        products: products.slice(start, start + limit),
        total: products.length,
        page,
        totalPages: Math.max(Math.ceil(products.length / limit), 1),
      };
    }
  },

  async getStoreById(id: string): Promise<StoreProfile | null> {
    try {
      const store = await apiRequest<BackendStoreResponse>(`/api/stores/${id}`);
      return mapBackendStore(store);
    } catch {
      await delay(150);
      return mockStores[id] || null;
    }
  },

  async getAllStores(): Promise<StoreProfile[]> {
    try {
      const stores = await apiRequest<BackendStoreResponse[]>('/api/stores');
      return stores.map(mapBackendStore);
    } catch {
      await delay(200);
      return Object.values(mockStores).filter((store) => store.status === 'ACTIVE');
    }
  },

  async getAdminStores(): Promise<StoreProfile[]> {
    try {
      const stores = await apiRequest<BackendStoreResponse[]>('/api/stores/admin', {}, { auth: true });
      return stores.map(mapBackendStore);
    } catch {
      await delay(200);
      return Object.values(mockStores);
    }
  },

  async getPendingStores(): Promise<StoreProfile[]> {
    try {
      const stores = await apiRequest<BackendStoreResponse[]>('/api/stores/pending', {}, { auth: true });
      return stores.map(mapBackendStore);
    } catch {
      await delay(200);
      return Object.values(mockStores).filter((store) => store.approvalStatus === 'PENDING');
    }
  },

  async getMyStore(): Promise<StoreProfile> {
    try {
      const store = await apiRequest<BackendStoreResponse>('/api/stores/my-store', {}, { auth: true });
      return mapBackendStore(store);
    } catch {
      await delay(200);
      return mockStores['store-001'];
    }
  },

  async registerStore(payload: StoreRegistrationRequest): Promise<StoreRegistrationResponse> {
    try {
      const store = await apiRequest<BackendStoreResponse>('/api/stores/register', {
        method: 'POST',
        body: JSON.stringify({
          name: payload.brandName || payload.shopName,
          slug: payload.slug,
          description: buildRegistrationDescription(payload),
          contactEmail: payload.contactEmail,
          phone: payload.contactPhone,
          address: [payload.address, payload.district, payload.city].filter(Boolean).join(', '),
        }),
      }, { auth: true });

      return {
        storeId: store.id,
        approvalStatus: store.approvalStatus,
      };
    } catch {
      await delay(500);
      return {
        storeId: `store-${Date.now()}`,
        approvalStatus: 'PENDING',
      };
    }
  },

  async approveStore(storeId: string): Promise<ApproveStoreResponse> {
    try {
      const store = await apiRequest<BackendStoreResponse>(`/api/stores/${storeId}/approve`, {
        method: 'POST',
      }, { auth: true });

      return {
        storeId: store.id,
        status: 'APPROVED',
      };
    } catch {
      await delay(300);
      return { storeId, status: 'APPROVED' };
    }
  },

  async rejectStore(storeId: string, reason: string): Promise<{ status: 'REJECTED' }> {
    try {
      await apiRequest<BackendStoreResponse>(`/api/stores/${storeId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }, { auth: true });
      return { status: 'REJECTED' };
    } catch {
      await delay(250);
      return { status: 'REJECTED' };
    }
  },

  async suspendStore(storeId: string): Promise<StoreLifecycleActionResponse> {
    try {
      const store = await apiRequest<BackendStoreResponse>(`/api/stores/${storeId}/suspend`, {
        method: 'POST',
      }, { auth: true });

      return {
        storeId: store.id,
        status: store.status,
      };
    } catch {
      await delay(250);
      return { storeId, status: 'SUSPENDED' };
    }
  },

  async reactivateStore(storeId: string): Promise<StoreLifecycleActionResponse> {
    try {
      const store = await apiRequest<BackendStoreResponse>(`/api/stores/${storeId}/reactivate`, {
        method: 'POST',
      }, { auth: true });

      return {
        storeId: store.id,
        status: store.status,
      };
    } catch {
      await delay(250);
      return { storeId, status: 'ACTIVE' };
    }
  },

  async updateMyStore(payload: StoreUpdateRequest): Promise<StoreProfile> {
    try {
      const store = await apiRequest<BackendStoreResponse>('/api/stores/my-store', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }, { auth: true });
      return mapBackendStore(store);
    } catch {
      await delay(250);
      return {
        ...mockStores['store-001'],
        ...payload,
      };
    }
  },
};
