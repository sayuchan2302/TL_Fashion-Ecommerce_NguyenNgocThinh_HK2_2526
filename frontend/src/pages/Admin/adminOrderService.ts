import {
  fulfillmentLabel,
  type FulfillmentStatus,
  type PaymentStatus,
  type TransitionReasonCode,
} from './orderWorkflow';
import { type AdminOrderData } from './adminOrdersData';

type TransitionSource = 'orders_list' | 'order_detail';

interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  source: TransitionSource;
  orderCode: string;
  fromFulfillment: FulfillmentStatus;
  toFulfillment: FulfillmentStatus;
  fromPayment: PaymentStatus;
  toPayment: PaymentStatus;
  reasonCode?: TransitionReasonCode;
  reasonNote?: string;
}

export interface AdminOrderRecord extends AdminOrderData {
  version: number;
  updatedAt: string;
  auditLog: AuditEntry[];
}

interface TransitionInput {
  code: string;
  nextFulfillment: FulfillmentStatus;
  actor: string;
  source: TransitionSource;
  reasonCode?: TransitionReasonCode;
  reasonNote?: string;
}

interface TransitionResult {
  ok: boolean;
  error?: string;
  message?: string;
  order?: AdminOrderRecord;
}

interface BulkTransitionResult {
  updatedCodes: string[];
  skippedCodes: string[];
}




import { apiRequest } from '../../services/apiClient';

// ── Real Backend API Calls ──────────────────

const mapBackendToAdmin = (order: any): AdminOrderRecord => {
  const fulfillmentMap: Record<string, FulfillmentStatus> = {
    PENDING: 'pending',
    CONFIRMED: 'packing',
    PROCESSING: 'packing',
    SHIPPED: 'shipping',
    DELIVERED: 'done',
    CANCELLED: 'canceled',
  };
  
  return {
    code: order.id,
    customer: order.shippingAddress?.fullName || 'Khách hàng ẩn danh',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(order.shippingAddress?.fullName || 'Anonymous')}&background=0EA5E9&color=fff`,
    total: order.total?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) || '0 đ',
    storeName: order.storeName,
    commissionRate: order.commissionRate,
    paymentStatus: order.paymentStatus === 'PAID' ? 'paid' : order.paymentMethod === 'COD' ? 'cod_uncollected' : 'unpaid',
    fulfillment: fulfillmentMap[order.status] || 'pending',
    shipMethod: order.carrier || 'Chưa rõ',
    tracking: order.trackingNumber || '',
    date: order.createdAt,
    customerInfo: {
      name: order.shippingAddress?.fullName || '',
      phone: order.shippingAddress?.phone || '',
      email: '',
    },
    address: [order.shippingAddress?.address, order.shippingAddress?.ward, order.shippingAddress?.district, order.shippingAddress?.city].filter(Boolean).join(', '),
    note: order.note || '',
    paymentMethod: order.paymentMethod || 'COD',
    items: ((order.items as any[]) || []).map((item: any) => ({
      id: item.id,
      name: item.name || item.productName || 'Sản phẩm',
      color: '',
      size: item.variant || '',
      qty: item.quantity || 1,
      price: item.price || 0,
      image: item.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=120&fit=crop',
    })),
    pricing: {
      subtotal: order.subtotal || 0,
      shipping: order.shippingFee || 0,
      discount: order.discount || 0,
      voucher: '',
    },
    timeline: [],
    version: 1,
    updatedAt: order.updatedAt || order.createdAt,
    auditLog: []
  };
};

export const listAdminOrders = async (): Promise<AdminOrderRecord[]> => {
  try {
    const data = await apiRequest<unknown[]>('/api/orders/admin/all', {}, { auth: true });
    return (data || []).map(mapBackendToAdmin);
  } catch (error) {
    console.error('Failed to fetch admin orders', error);
    return [];
  }
};

export const getAdminOrderByCode = async (code: string): Promise<AdminOrderRecord | null> => {
  try {
    const data = await apiRequest(`/api/orders/${code}`, {}, { auth: true });
    return mapBackendToAdmin(data);
  } catch (error) {
    console.error('Failed to fetch admin order detail', error);
    return null;
  }
};

// Polling placeholder if needed
export const subscribeAdminOrders = (listener: () => void) => {
  const interval = setInterval(listener, 15000); // Poll every 15s
  return () => clearInterval(interval);
};

export const transitionAdminOrder = async (input: TransitionInput): Promise<TransitionResult> => {
  try {
    const statusMap: Record<FulfillmentStatus, string> = {
      pending: 'PENDING',
      packing: 'PROCESSING',
      shipping: 'SHIPPED',
      done: 'DELIVERED',
      canceled: 'CANCELLED',
    };
    
    const requestPayload = {
      status: statusMap[input.nextFulfillment],
      reason: input.reasonNote || 'Admin cập nhật'
    };
    
    const data = await apiRequest(`/api/orders/admin/${input.code}/status`, {
      method: 'PATCH',
      body: JSON.stringify(requestPayload)
    }, { auth: true });
    
    return {
      ok: true,
      order: mapBackendToAdmin(data),
      message: `Đã chuyển sang ${fulfillmentLabel(input.nextFulfillment)}.`,
    };
  } catch (error: any) {
    console.error('Failed to transition order', error);
    return { ok: false, error: error.message || 'Không thể cập nhật trạng thái đơn hàng.' };
  }
};

export const bulkTransitionToPacking = async (codes: string[], actor: string): Promise<BulkTransitionResult> => {
  const updatedCodes: string[] = [];
  const skippedCodes: string[] = [];
  
  for (const code of codes) {
    const result = await transitionAdminOrder({
      code,
      nextFulfillment: 'packing',
      actor,
      source: 'orders_list'
    });
    if (result.ok) {
      updatedCodes.push(code);
    } else {
      skippedCodes.push(code);
    }
  }
  
  return { updatedCodes, skippedCodes };
};

