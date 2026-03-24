/**
 * orderService.ts — Client-facing order operations.
 * Now reads/writes through sharedOrderStore (unified with AdminOrders).
 * 
 * Multi-vendor: Supports sub-order splitting by store.
 */
import { sharedOrderStore, fulfillmentToClientStatus, clientStatusToFulfillment, type SharedOrder, type ClientOrderStatus } from './sharedOrderStore';
import { apiRequest } from './apiClient';
import type { Order, OrderStatus, OrderItem, OrderStatusStep } from '../types';

interface OrderItemInput {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
  // Multi-vendor fields
  storeId?: string;
  storeName?: string;
}

interface OrderInput {
  id: string;
  createdAt?: string;
  status: OrderStatus;
  total: number;
  items: OrderItemInput[];
  addressSummary: string;
  paymentMethod: string;
}

interface BackendOrderRequestItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice?: number;
}

interface BackendAddressSummary {
  fullName?: string;
  phone?: string;
  detail?: string;
  ward?: string;
  district?: string;
  province?: string;
}

interface BackendOrderItemResponse {
  id?: string;
  productName?: string;
  variantName?: string;
  productImage?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

interface BackendOrderResponse {
  id: string;
  createdAt?: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  total?: number;
  note?: string;
  trackingNumber?: string;
  couponCode?: string;
  subOrderId?: string | null;
  storeId?: string | null;
  items?: BackendOrderItemResponse[];
  shippingAddress?: BackendAddressSummary;
}

// Multi-vendor: Store group for sub-order splitting
interface StoreOrderGroup {
  storeId: string;
  storeName: string;
  items: OrderItemInput[];
  subtotal: number;
  shippingFee: number;
}

const DEFAULT_SHIPPING_FEE = 30000;
const FREE_SHIPPING_THRESHOLD = 500000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const backendStatusToClientStatus = (status?: string): ClientOrderStatus => {
  switch ((status || '').toUpperCase()) {
    case 'CONFIRMED':
    case 'PROCESSING':
      return 'processing';
    case 'SHIPPED':
      return 'shipping';
    case 'DELIVERED':
      return 'delivered';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
};

const backendPaymentStatusToClient = (status?: string, paymentMethod?: string) => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'PAID') return 'paid' as const;
  if (normalized === 'REFUND_PENDING') return 'refund_pending' as const;
  if (normalized === 'REFUNDED') return 'refunded' as const;
  if (paymentMethod?.toUpperCase() === 'COD') return 'cod_uncollected' as const;
  return 'unpaid' as const;
};

const formatBackendAddress = (address?: BackendAddressSummary) =>
  [address?.detail, address?.ward, address?.district, address?.province]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(', ');

const syncBackendOrderToSharedStore = (order: BackendOrderResponse) => {
  const clientStatus = backendStatusToClientStatus(order.status);
  const shared: SharedOrder = {
    id: order.id,
    createdAt: order.createdAt || new Date().toISOString(),
    parentOrderId: order.subOrderId || undefined,
    storeId: order.storeId || undefined,
    customerName: order.shippingAddress?.fullName || 'Khach hang',
    customerEmail: '',
    customerPhone: order.shippingAddress?.phone || '',
    customerAvatar: 'KH',
    address: formatBackendAddress(order.shippingAddress),
    shipMethod: 'Marketplace delivery',
    tracking: order.trackingNumber || '',
    note: order.note || '',
    paymentMethod: order.paymentMethod || 'COD',
    paymentStatus: backendPaymentStatusToClient(order.paymentStatus, order.paymentMethod),
    couponCode: order.couponCode,
    fulfillment: clientStatusToFulfillment(clientStatus),
    items: (order.items || []).map((item, index) => ({
      id: item.id || `${order.id}-${index + 1}`,
      name: item.productName || `Item ${index + 1}`,
      price: item.unitPrice || 0,
      image: item.productImage || '',
      quantity: item.quantity || 0,
      size: item.variantName,
    })),
    subtotal: order.subtotal || 0,
    shippingFee: order.shippingFee || 0,
    discount: order.discount || 0,
    total: order.total || 0,
    timeline: [
      {
        time: new Date(order.createdAt || Date.now()).toLocaleString('vi-VN'),
        text: 'Don hang da duoc tao tren backend marketplace.',
        tone: 'success',
      },
    ],
  };

  if (sharedOrderStore.getById(shared.id)) {
    sharedOrderStore.update(shared);
  } else {
    sharedOrderStore.add(shared);
  }
};

const toClientOrder = (o: SharedOrder): Order => ({
  id: o.id,
  createdAt: o.createdAt,
  status: fulfillmentToClientStatus(o.fulfillment, o.paymentStatus) as OrderStatus,
  total: o.total,
  items: o.items.map((item): OrderItem => ({
    id: item.id,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice,
    image: item.image,
    quantity: item.quantity,
    color: item.color,
    size: item.size,
  })),
  addressSummary: `${o.customerName}, ${o.customerPhone}, ${o.address}`,
  paymentMethod: o.paymentMethod,
  statusSteps: o.timeline.map((t): OrderStatusStep => ({
    label: t.text,
    timestamp: t.time,
  })),
  cancelReason: o.cancelReason,
  cancelledAt: o.cancelledAt,
  tracking: o.tracking,
  // Multi-vendor fields
  parentOrderId: o.parentOrderId,
  storeId: o.storeId,
  storeName: o.storeName,
});

/**
 * Group items by store for sub-order creation
 */
const groupItemsByStore = (items: OrderItemInput[]): StoreOrderGroup[] => {
  const groups = items.reduce((acc, item) => {
    const storeId = item.storeId || 'platform';
    const storeName = item.storeName || 'Nền tảng';
    
    if (!acc[storeId]) {
      acc[storeId] = {
        storeId,
        storeName,
        items: [],
        subtotal: 0,
        shippingFee: DEFAULT_SHIPPING_FEE,
      };
    }
    acc[storeId].items.push(item);
    acc[storeId].subtotal += item.price * item.quantity;
    return acc;
  }, {} as Record<string, StoreOrderGroup>);

  // Calculate shipping fee per store
  Object.values(groups).forEach(group => {
    group.shippingFee = group.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
  });

  return Object.values(groups);
};

export const orderService = {
  isBackendReadyItemId(id: string): boolean {
    return UUID_PATTERN.test(id);
  },

  async createBackendOrder(input: {
    addressId: string;
    paymentMethod: string;
    couponCode?: string;
    note?: string;
    items: BackendOrderRequestItem[];
  }) {
    const order = await apiRequest<BackendOrderResponse>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }, { auth: true });
    syncBackendOrderToSharedStore(order);
    return order;
  },

  list(): Order[] {
    return sharedOrderStore.getAll().map(toClientOrder);
  },

  /**
   * List only parent orders (excludes sub-orders)
   */
  listParentOrders(): Order[] {
    return sharedOrderStore.getAll()
      .filter(o => !o.parentOrderId)
      .map(toClientOrder);
  },

  /**
   * Get sub-orders for a parent order
   */
  getSubOrders(parentOrderId: string): Order[] {
    return sharedOrderStore.getAll()
      .filter(o => o.parentOrderId === parentOrderId)
      .map(toClientOrder);
  },

  getById(id: string): Order | null {
    const order = sharedOrderStore.getById(id);
    return order ? toClientOrder(order) : null;
  },

  /**
   * Add a single order (legacy behavior for single-vendor)
   */
  add(order: OrderInput) {
    const now = new Date().toISOString();
    const shared: SharedOrder = {
      id: order.id,
      createdAt: order.createdAt || now,
      customerName: order.addressSummary.split(',')[0]?.trim() || 'Khách hàng',
      customerEmail: '',
      customerPhone: order.addressSummary.split(',')[1]?.trim() || '',
      customerAvatar: `https://ui-avatars.com/api/?name=KH&background=3B82F6&color=fff`,
      address: order.addressSummary.split(',').slice(2).join(',').trim() || order.addressSummary,
      shipMethod: 'GHN - Giao tiêu chuẩn',
      tracking: '',
      note: '',
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentMethod === 'COD' ? 'cod_uncollected' : 'paid',
      fulfillment: clientStatusToFulfillment(order.status as ClientOrderStatus),
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.image,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        storeId: item.storeId,
        storeName: item.storeName,
      })),
      subtotal: order.items.reduce((s, i) => s + i.price * i.quantity, 0),
      shippingFee: 0,
      discount: 0,
      total: order.total,
      timeline: [
        { time: new Date().toLocaleString('vi-VN'), text: 'Đặt hàng thành công.', tone: 'success' },
      ],
    };
    sharedOrderStore.add(shared);
  },

  /**
   * Multi-vendor: Create parent order + sub-orders split by store
   * Returns the parent order ID and array of sub-order IDs
   */
  addWithSubOrders(order: OrderInput): { parentId: string; subOrderIds: string[] } {
    const now = new Date().toISOString();
    const storeGroups = groupItemsByStore(order.items);
    
    // If only one store, just create a single order (no sub-orders needed)
    if (storeGroups.length === 1) {
      this.add(order);
      return { parentId: order.id, subOrderIds: [] };
    }

    // Create parent order (aggregated)
    const parentShared: SharedOrder = {
      id: order.id,
      createdAt: order.createdAt || now,
      customerName: order.addressSummary.split(',')[0]?.trim() || 'Khách hàng',
      customerEmail: '',
      customerPhone: order.addressSummary.split(',')[1]?.trim() || '',
      customerAvatar: `https://ui-avatars.com/api/?name=KH&background=3B82F6&color=fff`,
      address: order.addressSummary.split(',').slice(2).join(',').trim() || order.addressSummary,
      shipMethod: 'GHN - Giao tiêu chuẩn',
      tracking: '',
      note: `Đơn hàng gồm ${storeGroups.length} đơn con từ các cửa hàng khác nhau.`,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentMethod === 'COD' ? 'cod_uncollected' : 'paid',
      fulfillment: clientStatusToFulfillment(order.status as ClientOrderStatus),
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.image,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        storeId: item.storeId,
        storeName: item.storeName,
      })),
      subtotal: order.items.reduce((s, i) => s + i.price * i.quantity, 0),
      shippingFee: storeGroups.reduce((sum, g) => sum + g.shippingFee, 0),
      discount: 0,
      total: order.total,
      timeline: [
        { time: new Date().toLocaleString('vi-VN'), text: `Đặt hàng thành công. Đơn được chia thành ${storeGroups.length} đơn con.`, tone: 'success' },
      ],
    };
    sharedOrderStore.add(parentShared);

    // Create sub-orders for each store
    const subOrderIds: string[] = [];
    storeGroups.forEach((group, index) => {
      const subOrderId = `${order.id}-S${index + 1}`;
      subOrderIds.push(subOrderId);

      const subShared: SharedOrder = {
        id: subOrderId,
        parentOrderId: order.id,
        storeId: group.storeId,
        storeName: group.storeName,
        createdAt: order.createdAt || now,
        customerName: order.addressSummary.split(',')[0]?.trim() || 'Khách hàng',
        customerEmail: '',
        customerPhone: order.addressSummary.split(',')[1]?.trim() || '',
        customerAvatar: `https://ui-avatars.com/api/?name=KH&background=3B82F6&color=fff`,
        address: order.addressSummary.split(',').slice(2).join(',').trim() || order.addressSummary,
        shipMethod: 'GHN - Giao tiêu chuẩn',
        tracking: '',
        note: '',
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentMethod === 'COD' ? 'cod_uncollected' : 'paid',
        fulfillment: clientStatusToFulfillment(order.status as ClientOrderStatus),
        items: group.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          originalPrice: item.originalPrice,
          image: item.image,
          quantity: item.quantity,
          color: item.color,
          size: item.size,
          storeId: item.storeId,
          storeName: item.storeName,
        })),
        subtotal: group.subtotal,
        shippingFee: group.shippingFee,
        discount: 0,
        total: group.subtotal + group.shippingFee,
        timeline: [
          { time: new Date().toLocaleString('vi-VN'), text: `Đơn hàng con từ ${group.storeName} đã được tạo.`, tone: 'success' },
        ],
      };
      sharedOrderStore.add(subShared);
    });

    return { parentId: order.id, subOrderIds };
  },

  cancel(id: string, reason: string): boolean {
    return sharedOrderStore.cancel(id, reason);
  },

  canCancel(order: Order): boolean {
    const shared = sharedOrderStore.getById(order.id);
    if (!shared) return false;
    return sharedOrderStore.canCancel(shared);
  },
};
