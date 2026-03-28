export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Review {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  productImage: string;
  customerName: string;
  customerEmail: string;
  rating: number; // 1-5
  content: string;
  date: string; // ISO string
  status: ReviewStatus;
  reply: string;
  orderId?: string;
  version: number;
}

import { apiRequest } from '../../services/apiClient';

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const adminReviewService = {
  getAll: async (params: { page?: number; size?: number; status?: string } = {}): Promise<PaginatedResponse<Review>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.size !== undefined) query.set('size', String(params.size));
    if (params.status && params.status !== 'all') query.set('status', params.status.toUpperCase());
    
    const qs = query.toString();
    return apiRequest<PaginatedResponse<Review>>(`/api/reviews/admin/all${qs ? `?${qs}` : ''}`, {}, { auth: true });
  },

  updateStatus: async (id: string, status: ReviewStatus): Promise<Review> => {
    return apiRequest<Review>(`/api/reviews/admin/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: status.toUpperCase() }),
    }, { auth: true });
  },

  addReply: async (id: string, reply: string): Promise<Review> => {
    return apiRequest<Review>(`/api/reviews/admin/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    }, { auth: true });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/api/reviews/admin/${id}`, {
      method: 'DELETE',
    }, { auth: true });
  },
};
