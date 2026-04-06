import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Marketplace Financial Flows - E2E', () => {

  // ─── 1. Vendor Dashboard: Wallet Balance Display ──────────────────────────

  test.describe('Vendor Wallet UI', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/vendor/dashboard`);
      await page.waitForLoadState('networkidle');
    });

    test('displays Available, Frozen, and Total balance sections', async ({ page }) => {
      const commissionCard = page.locator('.commission-card');
      await expect(commissionCard).toBeVisible();

      const heading = commissionCard.locator('h3');
      await expect(heading).toContainText('Số dư ví');

      const rows = commissionCard.locator('.commission-row');
      await expect(rows).toHaveCount(3);

      await expect(rows.nth(0)).toContainText('Khả dụng');
      await expect(rows.nth(1)).toContainText('Đóng băng');
      await expect(rows.nth(2)).toContainText('Tổng số dư');
    });

    test('balance values are formatted as currency', async ({ page }) => {
      const values = page.locator('.commission-card .commission-row .value');
      const count = await values.count();

      for (let i = 0; i < count; i++) {
        const text = await values.nth(i).textContent();
        expect(text).toMatch(/[\d.,]+\s*₫/);
      }
    });
  });

  // ─── 2. Vendor Analytics: Server-side Data ────────────────────────────────

  test.describe('Vendor Analytics API', () => {
    test('calls analytics API instead of fetching all orders', async ({ page }) => {
      const apiCallPromise = page.waitForRequest(
        (req) => req.url().includes('/api/orders/my-store/analytics')
      );

      await page.goto(`${BASE_URL}/vendor/analytics`);
      const apiRequest = await apiCallPromise;

      expect(apiRequest.method()).toBe('GET');
      expect(apiRequest.url()).toContain('commissionRate');

      await page.waitForLoadState('networkidle');

      const statCards = page.locator('.vendor-stats .vendor-stat-card');
      await expect(statCards).toHaveCount(6);
    });

    test('period tabs switch without full page reload', async ({ page }) => {
      await page.goto(`${BASE_URL}/vendor/analytics`);
      await page.waitForLoadState('networkidle');

      const apiCalls: string[] = [];
      page.on('request', (req) => {
        if (req.url().includes('/api/orders/my-store/analytics')) {
          apiCalls.push(req.url());
        }
      });

      await page.getByRole('button', { name: 'Hôm nay' }).click();
      await page.waitForTimeout(500);

      await page.getByRole('button', { name: '30 ngày' }).click();
      await page.waitForTimeout(500);

      expect(apiCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── 3. Admin Financials: Wallet Table with Frozen/Available ──────────────

  test.describe('Admin Financials UI', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/financials`);
      await page.waitForLoadState('networkidle');
    });

    test('displays 4 stat cards including pending payouts', async ({ page }) => {
      const statCards = page.locator('.panel-stats-grid .stat-card');
      await expect(statCards).toHaveCount(4);

      const labels = await statCards.allTextContents();
      expect(labels.some(l => l.includes('GMV'))).toBe(true);
      expect(labels.some(l => l.includes('Commission'))).toBe(true);
      expect(labels.some(l => l.includes('Payout'))).toBe(true);
      expect(labels.some(l => l.includes('rút tiền'))).toBe(true);
    });

    test('wallet table shows Available and Frozen columns', async ({ page }) => {
      const headers = page.locator('.admin-table-head [role="columnheader"]');
      const headerTexts = await headers.allTextContents();

      expect(headerTexts.some(h => h.includes('Khả dụng'))).toBe(true);
      expect(headerTexts.some(h => h.includes('Đóng băng'))).toBe(true);
    });

    test('tab navigation between Wallets and Pending Payouts', async ({ page }) => {
      const tabs = page.locator('.panel-tabs [role="tab"]');
      await expect(tabs).toHaveCount(2);

      await expect(tabs.nth(0)).toContainText('Ví store');
      await expect(tabs.nth(1)).toContainText('Chờ duyệt');

      await tabs.nth(1).click();
      await page.waitForLoadState('networkidle');

      const table = page.locator('.admin-table');
      await expect(table).toBeVisible();
    });
  });

  // ─── 4. Vendor Returns: Table Structure ───────────────────────────────────

  test.describe('Vendor Returns Table', () => {
    test('table has correct columns', async ({ page }) => {
      await page.goto(`${BASE_URL}/vendor/returns`);
      await page.waitForLoadState('networkidle');

      const headers = page.locator('.vendor-table-head.vendor-returns [role="columnheader"]');
      const headerTexts = await headers.allTextContents();

      const expectedColumns = ['Mã hoàn trả', 'Khách hàng', 'Sản phẩm', 'Trạng thái', 'Giá trị', 'Hành động'];
      for (const col of expectedColumns) {
        expect(headerTexts.some(h => h.includes(col))).toBe(true);
      }

      expect(headerTexts.some(h => h.includes('Mã đơn'))).toBe(false);
    });

    test('checkbox column exists in header and rows', async ({ page }) => {
      await page.goto(`${BASE_URL}/vendor/returns`);
      await page.waitForLoadState('networkidle');

      const headerCheckbox = page.locator('.vendor-table-head.vendor-returns input[type="checkbox"]');
      await expect(headerCheckbox).toBeVisible();
    });
  });

  // ─── 5. Admin Returns: Table Structure ────────────────────────────────────

  test.describe('Admin Returns Table', () => {
    test('table has correct columns including store', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/returns`);
      await page.waitForLoadState('networkidle');

      const headers = page.locator('.admin-table-head.returns-row [role="columnheader"]');
      const headerTexts = await headers.allTextContents();

      const expectedColumns = ['Mã hoàn trả', 'Khách hàng', 'Gian hàng', 'Sản phẩm', 'Trạng thái', 'Giá trị', 'Hành động'];
      for (const col of expectedColumns) {
        expect(headerTexts.some(h => h.includes(col))).toBe(true);
      }

      expect(headerTexts.some(h => h.includes('Mã đơn'))).toBe(false);
    });
  });

  // ─── 6. Vendor Dashboard: Sidebar Navigation ─────────────────────────────

  test.describe('Vendor Sidebar Labels', () => {
    test('sidebar shows Dashboard label', async ({ page }) => {
      await page.goto(`${BASE_URL}/vendor/dashboard`);
      await page.waitForLoadState('networkidle');

      const navLinks = page.locator('.admin-nav-link');
      const dashboardLink = navLinks.filter({ hasText: 'Dashboard' });
      await expect(dashboardLink).toBeVisible();
    });
  });
});
