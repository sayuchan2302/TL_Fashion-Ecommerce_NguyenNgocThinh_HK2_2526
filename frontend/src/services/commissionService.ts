/**
 * commissionService.ts — Commission calculation for multi-vendor marketplace
 * 
 * Handles platform fee calculations, vendor payouts, and commission tiers.
 * Now uses backend API instead of localStorage.
 */

import { apiRequest } from './apiClient';

// ─── Helper Functions (Simple API) ─────────────────────────────────────────────

/**
 * Simple commission calculation helper
 */
export const calculateCommission = (amount: number, rate: number = 5): { commission: number; payout: number } => {
  const commission = Math.round(amount * (rate / 100));
  const payout = amount - commission;
  return { commission, payout };
};

/**
 * Format currency for display (VND)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// ─── Commission Configuration ──────────────────────────────────────────────────

export interface CommissionTier {
  id: string;
  name: string;
  slug: string;
  description: string;
  rate: number;
  minMonthlyRevenue?: number;
  minOrderCount?: number;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CommissionCalculation {
  subtotal: number;
  commissionRate: number;
  commissionFee: number;
  vendorPayout: number;
  platformFee: number;
  shippingFee: number;
  total: number;
}

export interface VendorCommissionSummary {
  storeId: string;
  storeName: string;
  totalRevenue: number;
  totalCommission: number;
  totalPayout: number;
  orderCount: number;
  tier: CommissionTier;
}

// ─── Commission Service ────────────────────────────────────────────────────────

export const commissionService = {
  /**
   * Get all commission tiers from backend
   */
  async getTiers(): Promise<CommissionTier[]> {
    return apiRequest<CommissionTier[]>('/api/commission-tiers', {}, { auth: false });
  },

  /**
   * Get the default tier for new vendors
   */
  async getDefaultTier(): Promise<CommissionTier> {
    return apiRequest<CommissionTier>('/api/commission-tiers/default', {}, { auth: false });
  },

  /**
   * Determine appropriate tier based on vendor performance
   */
  async determineTier(monthlyRevenue: number, orderCount: number): Promise<CommissionTier> {
    const tiers = await this.getTiers();
    const eligible = tiers
      .filter(tier => {
        const meetsRevenue = !tier.minMonthlyRevenue || monthlyRevenue >= tier.minMonthlyRevenue;
        const meetsOrders = !tier.minOrderCount || orderCount >= tier.minOrderCount;
        return meetsRevenue && meetsOrders && tier.isActive;
      })
      .sort((a, b) => a.rate - b.rate);

    return eligible[0] || await this.getDefaultTier();
  },

  /**
   * Calculate commission for an order/sub-order
   */
  calculate(
    subtotal: number,
    options: {
      tierId?: string;
      customRate?: number;
      shippingFee?: number;
    } = {}
  ): CommissionCalculation {
    const { customRate, shippingFee = 0 } = options;
    const commissionRate = customRate ?? 5;
    const commissionFee = Math.round(subtotal * (commissionRate / 100));
    const vendorPayout = subtotal - commissionFee;
    const total = subtotal + shippingFee;

    return {
      subtotal,
      commissionRate,
      commissionFee,
      vendorPayout,
      platformFee: commissionFee,
      shippingFee,
      total,
    };
  },

  /**
   * Format commission rate for display
   */
  formatRate(rate: number): string {
    return `${rate}%`;
  },

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  },

  // ─── Admin Functions (require auth) ─────────────────────────────────────────

  /**
   * Create a new commission tier (admin only)
   */
  async createTier(tier: Omit<CommissionTier, 'id' | 'slug'>): Promise<CommissionTier> {
    return apiRequest<CommissionTier>('/api/commission-tiers', {
      method: 'POST',
      body: JSON.stringify(tier),
    }, { auth: true });
  },

  /**
   * Update a commission tier (admin only)
   */
  async updateTier(tierId: string, updates: Partial<CommissionTier>): Promise<CommissionTier> {
    return apiRequest<CommissionTier>(`/api/commission-tiers/${tierId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, { auth: true });
  },

  /**
   * Set default tier (admin only)
   */
  async setDefaultTier(tierId: string): Promise<void> {
    await apiRequest(`/api/commission-tiers/${tierId}/default`, {
      method: 'PATCH',
    }, { auth: true });
  },

  /**
   * Toggle tier active status (admin only)
   */
  async toggleTierActive(tierId: string): Promise<void> {
    await apiRequest(`/api/commission-tiers/${tierId}/toggle-active`, {
      method: 'PATCH',
    }, { auth: true });
  },

  /**
   * Delete a tier (admin only)
   */
  async deleteTier(tierId: string): Promise<void> {
    await apiRequest(`/api/commission-tiers/${tierId}`, {
      method: 'DELETE',
    }, { auth: true });
  },
};
