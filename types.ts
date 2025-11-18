

export interface Lot {
  lotNumber: string;
  expiryDate: string;
  quantity: number;
}

export type SellingMethod = 'Each' | 'Weight' | 'Volume';
export type StorageUom = 'Each' | 'mg' | 'g' | 'kg' | 'ml' | 'l';

export interface Variant {
  id: number; // Unique ID for the variant
  productId: number;
  attributes: Record<string, string>; // e.g., { "Size": "Large", "Color": "Red" }
  sku: string;
  barcode: string;
  price: number;
  cost: number;
  taxRate: number; // e.g., 0.16 for 16%
  reorderPoint: number;
  lots: Lot[];
  sellingMethod: SellingMethod;
  storageUom: StorageUom;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  imageUrl: string;
  variants: Variant[];
}

// Helper to get variant stock
export const getVariantStock = (variant: Variant): number => {
    return variant.lots.reduce((total, lot) => total + lot.quantity, 0);
};

// Helper to get total product stock
export const getProductStock = (product: Product): number => {
  return product.variants.reduce((total, variant) => total + getVariantStock(variant), 0);
};

export interface CartItem {
    productId: number;
    variantId: number;
    name: string; // Product name
    variantAttributes: Record<string, string>;
    price: number;
    taxRate: number;
    cost: number;
    imageUrl: string;
    quantity: number;
    sellingMethod: SellingMethod;
    storageUom: StorageUom;
}

export type UserRole = 'Admin' | 'Manager' | 'Cashier';

export interface User {
  id: string; // Changed from number to string for Supabase UUID
  name: string;
  role: UserRole;
  email: string;
  // The password field is removed as it should never be handled on the client-side.
}


export interface Customer {
  id: number;
  name: string;
  phone: string;
  loyaltyPoints: number;
  storeCredit: number;
  lastSeen: Date;
}

export interface Transaction {
    id: string;
    date: Date;
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    amountPaid: number;
    customer?: { id: number; name: string; };
    paymentMethods: { method: string; amount: number }[];
    status: 'Completed' | 'Void';
    type: 'Sale' | 'Return';
    user: User;
}

export enum PaymentStatus {
  IDLE,
  PENDING,
  SUCCESS,
  FAILED,
  PARTIAL
}

export type AppView = 'pos' | 'inventory' | 'customers' | 'transactions' | 'reports' | 'purchasing' | 'settings' | 'admin' | 'users';

export interface PurchaseOrderItem {
    productId: number;
    variantId: number;
    name: string; // Combined name + variant attributes
    quantityOrdered: number;
    quantityReceived: number;
    cost: number;
    taxRate: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: Date;
  supplier: Supplier;
  expectedDeliveryDate: string;
  items: PurchaseOrderItem[];
  status: 'Ordered' | 'Partially Received' | 'Received';
  subtotal: number;
  tax: number;
  total: number;
}

export interface GoodsReceiptNote {
    id: string;
    date: Date;
    purchaseOrderId?: string;
    purchaseOrderNumber: string;
    supplier: Supplier;
    items: {
        variantId: number;
        name: string;
        quantityReceived: number;
    }[];
}

export interface PurchaseInvoiceItem {
    description: string;
    amount: number;
}

export interface PurchaseInvoice {
    id: string;
    invoiceNumber: string;
    date: Date;
    dueDate: string;
    goodsReceiptId?: string;
    supplier: Supplier;
    items: PurchaseInvoiceItem[];
    total: number;
    status: 'Unpaid' | 'Paid';
}


export interface Notification {
  id: number; // Can be variant ID for low stock
  message: string;
  type: 'warning' | 'info';
  read: boolean;
}

export type StockAdjustmentReason = 'Stocktake Correction' | 'Damaged Goods' | 'Expired Stock' | 'Other';

export interface StockAdjustmentLog {
    id: string;
    date: Date;
    user: User;
    productName: string;
    variantAttributes: Record<string, string>;
    previousStock: number;
    newStock: number;
    reason: StockAdjustmentReason;
}

export interface Supplier {
    id: number;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
}

export interface CompanySettings {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId: string; // KRA PIN
    logoUrl: string;
    mpesaTillNumber: string;
}

export enum PaymentStatus {
  IDLE = 'idle',
  PENDING_INPUT = 'pending_input',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface MpesaPaymentUpdate {
  status: 'success' | 'failed';
  message: string;
  transactionId?: string;
  amount?: number;
}
export interface MpesaPaymentRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface MpesaPaymentResponse {
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}