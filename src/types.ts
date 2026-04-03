// ─────────────────────────────────────────────────
// Menu / Combo
// ─────────────────────────────────────────────────
export interface MenuOption {
  name: string;
  priceExtra: number;
}

export interface MenuAddon {
  name: string;
  priceExtra: number;
}

export type MenuItemOption = MenuOption;
export type MenuItemAddon = MenuAddon;

export type CategoryRef =
  | string
  | {
      id?: string;
      _id?: string;
      name?: string;
      slug?: string;
      image?: string;
      status?: 'available' | 'unavailable';
      displayOrder?: number;
    };

export interface Category {
  id: string;
  _id?: string;
  name: string;
  image?: string;
  displayOrder: number;
  status: 'available' | 'unavailable';
  description?: string;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  categoryId: CategoryRef;
  id: string;
  _id?: string;
  name: string;
  description?: string;
  price: number;
  category?: string; // legacy UI fallback
  images: string[];
  options: MenuOption[];
  addons: MenuAddon[];
  status: 'available' | 'unavailable';
}

export interface Combo {
  id: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  menuItemIds: string[];
  status?: 'available' | 'unavailable';
}

// ─────────────────────────────────────────────────
// Table / Layout
// ─────────────────────────────────────────────────
export interface Table {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  status: 'empty' | 'occupied';
  createdAt?: string;
}

// ─────────────────────────────────────────────────
// Order / Item / Session (API v2.0 Section 12)
// ─────────────────────────────────────────────────

/** Món trong phiên (OrderItem Object) */
export interface OrderItem {
  _id: string;
  menuItemId: string;
  isCombo?: boolean;
  name: string;
  basePrice: number;
  quantity: number;
  totalPrice: number;              // (basePrice + options + addons) * quantity
  selectedOption?: {
    name: string;
    priceExtra: number;
  };
  selectedAddons: {
    name: string;
    priceExtra: number;
  }[];
  /** Vòng đời: in_cart → pending_approval → cooking → served → cancelled */
  status: 'in_cart' | 'pending_approval' | 'cooking' | 'served' | 'cancelled';
  actionByName?: string;           // Nhân viên nào duyệt
  actionAt?: string;               // Lúc mấy giờ duyệt
  image?: string;                  // UI helper (not in core doc but useful)
  category?: string;               // UI helper
}

/** Phiên bàn (Order Object) */
export interface Order {
  _id: string;                     // Session ID
  id?: string;                     // Frontend compatibility
  tableId: string;                 // ObjectID của bàn hoặc slug
  tableName: string;               // Tên bàn (lưu cứng khi tạo phiên)
  sessionToken?: string;            // Token nhận dạng phiên
  total: number;                   // Tổng tiền (VNĐ)
  /** Trạng thái phục vụ (active | completed | cancelled) */
  status: 'active' | 'completed' | 'cancelled';
  /** Trạng thái tiền (unpaid | paid | refunded) */
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  completedAt?: string;
  completedByName?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────
// Payment / Billing (API v2.0 Section 12)
// ─────────────────────────────────────────────────
export interface Payment {
  _id: string;
  orderId: string | Order;         // Trọn bộ session nếu được populate
  amount: number;
  method: string;                  // "Tiền mặt", "Chuyển khoản..."
  bankAccountId?: string | BankAccount;
  tableName: string;               // Snapshot tên bàn lúc thu tiền
  bankNameSnapshot: string;        // Snapshot tên ngân hàng + STK lúc thu tiền
  cashierName: string;             // Snapshot tên thu ngân lúc thu tiền
  status: 'success' | 'failed' | 'processing';
  createdAt: string;
}

// ─────────────────────────────────────────────────
// Bank / MBBank
// ─────────────────────────────────────────────────
export interface BankAccount {
  id: string;
  _id?: string;
  bankName: string;
  bin: string;
  accountNo: string;
  accountName: string;
  phone?: string;
  password?: string;
  isDefault: boolean;
  isActive: boolean;
}

// ─────────────────────────────────────────────────
// User / Auth
// ─────────────────────────────────────────────────
export interface User {
  id: string;
  _id?: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
}

// ─────────────────────────────────────────────────
// Stats / Reports
// ─────────────────────────────────────────────────
export interface DailyRevenue {
  date?: string;
  name?: string;
  total: number;
}

export interface DashboardStats {
  revenue: number;
  orderCount: number;
  activeTables: number;
  pendingOrders: number;
  dailyRevenue: DailyRevenue[];
  topItems: { name: string; count: number; revenue: number }[];
  monthlyRevenue: { month: string; total: number }[];
  categoryData: { category: string; total: number }[];
  averageOrderValue: number;
  averageServiceTime: number;
  returnRate: number;
}
