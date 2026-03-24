/**
 * commissionService.ts — Commission calculation for multi-vendor marketplace
 * 
 * Handles platform fee calculations, vendor payouts, and commission tiers.
 */

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
  description: string;
  rate: number; // Percentage (0-100)
  minMonthlyRevenue?: number;
  minOrderCount?: number;
  isDefault?: boolean;
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

// ─── Default Commission Tiers ──────────────────────────────────────────────────

const DEFAULT_COMMISSION_TIERS: CommissionTier[] = [
  {
    id: 'tier-new',
    name: 'Mới bắt đầu',
    description: 'Dành cho nhà bán mới, áp dụng trong 3 tháng đầu',
    rate: 3, // 3%
    isDefault: true,
  },
  {
    id: 'tier-standard',
    name: 'Tiêu chuẩn',
    description: 'Dành cho nhà bán phổ thông',
    rate: 5, // 5%
    minMonthlyRevenue: 10000000, // 10M VND
    minOrderCount: 10,
  },
  {
    id: 'tier-premium',
    name: 'Premium',
    description: 'Dành cho nhà bán có doanh thu cao',
    rate: 4, // 4%
    minMonthlyRevenue: 50000000, // 50M VND
    minOrderCount: 50,
  },
  {
    id: 'tier-official',
    name: 'Official Store',
    description: 'Dành cho cửa hàng chính hãng đối tác',
    rate: 2.5, // 2.5%
    minMonthlyRevenue: 200000000, // 200M VND
    minOrderCount: 200,
  },
];

// Category-specific commission rates (override default tier)
const CATEGORY_COMMISSION_RATES: Record<string, number> = {
  'electronics': 2, // Lower margin category
  'fashion': 5,
  'beauty': 8,
  'food': 10,
  'accessories': 6,
};

// ─── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'marketplace_commission_config_v1';

const loadConfig = (): { tiers: CommissionTier[]; categoryRates: Record<string, number> } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return { tiers: DEFAULT_COMMISSION_TIERS, categoryRates: CATEGORY_COMMISSION_RATES };
};

const saveConfig = (config: { tiers: CommissionTier[]; categoryRates: Record<string, number> }) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
};

let _config = loadConfig();

// ─── Commission Service ────────────────────────────────────────────────────────

export const commissionService = {
  /**
   * Get all commission tiers
   */
  getTiers(): CommissionTier[] {
    return [..._config.tiers];
  },

  /**
   * Get the default tier for new vendors
   */
  getDefaultTier(): CommissionTier {
    return _config.tiers.find(t => t.isDefault) || _config.tiers[0];
  },

  /**
   * Get tier by ID
   */
  getTierById(tierId: string): CommissionTier | undefined {
    return _config.tiers.find(t => t.id === tierId);
  },

  /**
   * Determine appropriate tier based on vendor performance
   */
  determineTier(monthlyRevenue: number, orderCount: number): CommissionTier {
    // Sort tiers by rate ascending (best deal first) and filter by eligibility
    const eligible = _config.tiers
      .filter(tier => {
        const meetsRevenue = !tier.minMonthlyRevenue || monthlyRevenue >= tier.minMonthlyRevenue;
        const meetsOrders = !tier.minOrderCount || orderCount >= tier.minOrderCount;
        return meetsRevenue && meetsOrders;
      })
      .sort((a, b) => a.rate - b.rate);

    return eligible[0] || this.getDefaultTier();
  },

  /**
   * Get category-specific commission rate (if any)
   */
  getCategoryRate(categorySlug: string): number | undefined {
    return _config.categoryRates[categorySlug.toLowerCase()];
  },

  /**
   * Calculate commission for an order/sub-order
   */
  calculate(
    subtotal: number,
    options: {
      tierId?: string;
      categorySlug?: string;
      shippingFee?: number;
      customRate?: number;
    } = {}
  ): CommissionCalculation {
    const { tierId, categorySlug, shippingFee = 0, customRate } = options;

    // Determine commission rate
    let commissionRate: number;
    
    if (customRate !== undefined) {
      commissionRate = customRate;
    } else if (categorySlug && _config.categoryRates[categorySlug.toLowerCase()]) {
      commissionRate = _config.categoryRates[categorySlug.toLowerCase()];
    } else if (tierId) {
      const tier = this.getTierById(tierId);
      commissionRate = tier?.rate ?? this.getDefaultTier().rate;
    } else {
      commissionRate = this.getDefaultTier().rate;
    }

    // Calculate fees
    const commissionFee = Math.round(subtotal * (commissionRate / 100));
    const vendorPayout = subtotal - commissionFee;
    const platformFee = commissionFee; // For now, platform fee = commission
    const total = subtotal + shippingFee;

    return {
      subtotal,
      commissionRate,
      commissionFee,
      vendorPayout,
      platformFee,
      shippingFee,
      total,
    };
  },

  /**
   * Calculate commission for multiple items (grouped by store)
   */
  calculateForItems(
    items: Array<{
      price: number;
      quantity: number;
      storeId?: string;
      categorySlug?: string;
    }>,
    storeCommissionRates: Record<string, number> = {}
  ): CommissionCalculation {
    let totalSubtotal = 0;
    let totalCommission = 0;

    items.forEach(item => {
      const itemSubtotal = item.price * item.quantity;
      totalSubtotal += itemSubtotal;

      // Use store-specific rate if provided, otherwise category or default
      const rate = item.storeId && storeCommissionRates[item.storeId]
        ? storeCommissionRates[item.storeId]
        : item.categorySlug
          ? (this.getCategoryRate(item.categorySlug) ?? this.getDefaultTier().rate)
          : this.getDefaultTier().rate;

      totalCommission += Math.round(itemSubtotal * (rate / 100));
    });

    const vendorPayout = totalSubtotal - totalCommission;

    return {
      subtotal: totalSubtotal,
      commissionRate: totalSubtotal > 0 ? (totalCommission / totalSubtotal) * 100 : 0,
      commissionFee: totalCommission,
      vendorPayout,
      platformFee: totalCommission,
      shippingFee: 0,
      total: totalSubtotal,
    };
  },

  /**
   * Get vendor commission summary (mock for demo)
   */
  async getVendorSummary(storeId: string): Promise<VendorCommissionSummary> {
    // In production, this would call an API
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock data
    const mockData: Record<string, VendorCommissionSummary> = {
      'store-001': {
        storeId: 'store-001',
        storeName: 'Fashion Hub',
        totalRevenue: 500000000,
        totalCommission: 12500000, // 2.5% (Official tier)
        totalPayout: 487500000,
        orderCount: 1250,
        tier: _config.tiers.find(t => t.id === 'tier-official') || this.getDefaultTier(),
      },
      'store-002': {
        storeId: 'store-002',
        storeName: 'Style Shop',
        totalRevenue: 250000000,
        totalCommission: 10000000, // 4% (Premium tier)
        totalPayout: 240000000,
        orderCount: 800,
        tier: _config.tiers.find(t => t.id === 'tier-premium') || this.getDefaultTier(),
      },
    };

    return mockData[storeId] || {
      storeId,
      storeName: 'Cửa hàng',
      totalRevenue: 0,
      totalCommission: 0,
      totalPayout: 0,
      orderCount: 0,
      tier: this.getDefaultTier(),
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

  // ─── Admin Functions ─────────────────────────────────────────────────────────

  /**
   * Update a commission tier (admin only)
   */
  updateTier(tierId: string, updates: Partial<CommissionTier>): boolean {
    const index = _config.tiers.findIndex(t => t.id === tierId);
    if (index === -1) return false;

    _config.tiers[index] = { ..._config.tiers[index], ...updates };
    saveConfig(_config);
    return true;
  },

  /**
   * Add a new commission tier (admin only)
   */
  addTier(tier: CommissionTier): void {
    _config.tiers.push(tier);
    saveConfig(_config);
  },

  /**
   * Update category commission rate (admin only)
   */
  setCategoryRate(categorySlug: string, rate: number): void {
    _config.categoryRates[categorySlug.toLowerCase()] = rate;
    saveConfig(_config);
  },

  /**
   * Remove category commission rate (admin only)
   */
  removeCategoryRate(categorySlug: string): void {
    delete _config.categoryRates[categorySlug.toLowerCase()];
    saveConfig(_config);
  },

  /**
   * Get all category rates
   */
  getCategoryRates(): Record<string, number> {
    return { ..._config.categoryRates };
  },

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    _config = { tiers: DEFAULT_COMMISSION_TIERS, categoryRates: CATEGORY_COMMISSION_RATES };
    saveConfig(_config);
  },
};
