/**
 * orderService.ts — Client-facing order operations.
 * Now reads/writes through sharedOrderStore (unified with AdminOrders).
 * 
 * Multi-vendor: Supports sub-order splitting by store.
 */
import { sharedOrderStore, fulfillmentToClientStatus, clientStatusToFulfillment, type SharedOrder, type ClientOrderStatus } from './sharedOrderStore';
import { apiRequest } from './apiClient';
import type { Order, OrderStatus, OrderItem, OrderStatusStep } from '../types';



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


  cancel(id: string, reason: string): boolean {
    return sharedOrderStore.cancel(id, reason);
  },

  canCancel(order: Order): boolean {
    const shared = sharedOrderStore.getById(order.id);
    if (!shared) return false;
    return sharedOrderStore.canCancel(shared);
  },
};
