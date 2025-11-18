

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Product, Customer, Transaction, AppView, CartItem, UserRole, PurchaseOrder, Notification, getProductStock, Lot, StockAdjustmentReason, Variant, getVariantStock, User, Supplier, GoodsReceiptNote, PurchaseInvoice, CompanySettings, PurchaseOrderItem, StockAdjustmentLog } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PosView from './views/PosView';
import InventoryView from './views/InventoryView';
import CustomersView from './views/CustomersView';
import TransactionsView from './views/TransactionsView';
import ReportsView from './views/ReportsView';
import PurchasingView from './views/PurchasingView';
import SettingsView from './views/SettingsView';
import AdminView from './views/AdminView';
import UsersView from './views/UsersView';
import CustomerHistoryModal from './components/CustomerHistoryModal';
import Receipt from './components/Receipt';
import PrintablePurchaseOrder from './components/PrintablePurchaseOrder';
import ProfileModal from './components/ProfileModal';
import { supabase } from './services/supabaseClient';
import { LoadingSpinnerIcon } from './components/icons/LoadingSpinnerIcon';

interface DashboardProps {
    loggedInUser: User;
    onLogout: () => void;
    onUpdateProfile: (userId: string, currentPasswordForVerification: string, data: { name: string; email: string; newPassword?: string }) => Promise<void>;
}

// Helper to convert snake_case keys from Supabase to camelCase for the frontend
export const toCamelCase = (str: string) => str.replace(/_([a-z])/g, g => g[1].toUpperCase());

export const convertKeysToCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeysToCamelCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            acc[toCamelCase(key)] = convertKeysToCamelCase(obj[key]);
            return acc;
        }, {} as {[key: string]: any});
    }
    return obj;
};

// Helper to convert camelCase keys from the frontend to snake_case for Supabase
export const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export const convertKeysToSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeysToSnakeCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            acc[toSnakeCase(key)] = convertKeysToSnakeCase(obj[key]);
            return acc;
        }, {} as {[key: string]: any});
    }
    return obj;
};


const Dashboard: React.FC<DashboardProps> = ({ loggedInUser, onLogout, onUpdateProfile }) => {
  const [activeView, setActiveView] = useState<AppView>('pos');
  const [currentUser, setCurrentUser] = useState<User>(loggedInUser);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceiptNotes, setGoodsReceiptNotes] = useState<GoodsReceiptNote[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewingCustomerHistory, setViewingCustomerHistory] = useState<{customer: Customer, transactions: Transaction[]} | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [transactionToPrint, setTransactionToPrint] = useState<Transaction | null>(null);
  const [poToPrint, setPOToPrint] = useState<PurchaseOrder | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchProducts = useCallback(async () => {
    setIsRefreshing(true);
    try {
        const { data, error } = await supabase!.from('products').select('*, variants(*, lots(*))');
        if (error) throw new Error(`Products: ${error.message}`);
        setProducts(convertKeysToCamelCase(data));
    } catch (err) {
        console.error("Product refetch error:", err);
    } finally {
        setIsRefreshing(false);
    }
  }, []);
  
  const refetchProductsAndCustomers = useCallback(async () => {
    setIsRefreshing(true);
    try {
        const [productsRes, customersRes] = await Promise.all([
            supabase!.from('products').select('*, variants(*, lots(*))'),
            supabase!.from('customers').select('*'),
        ]);

        if (productsRes.error) throw new Error(`Products: ${productsRes.error.message}`);
        if (customersRes.error) throw new Error(`Customers: ${customersRes.error.message}`);

        setProducts(convertKeysToCamelCase(productsRes.data));
        const customersData = convertKeysToCamelCase(customersRes.data);
        const formattedCustomers = customersData.map((c: any) => ({
            ...c,
            lastSeen: new Date(c.lastSeen),
        }));
        setCustomers(formattedCustomers);
    } catch (err) {
        console.error("Data refresh error:", err);
    } finally {
        setIsRefreshing(false);
    }
  }, []);

  const refetchAllUsers = useCallback(async () => {
      const { data, error } = await supabase!.from('profiles').select('*');
      if (error) {
          console.error("Failed to refetch users", error);
          return;
      }
      setAllUsers(convertKeysToCamelCase(data));
  }, []);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const [
            productsRes,
            customersRes,
            suppliersRes,
            settingsRes,
            usersRes,
            poRes,
            grnRes,
            invoiceRes
        ] = await Promise.all([
            supabase!.from('products').select('*, variants(*, lots(*))'),
            supabase!.from('customers').select('*'),
            supabase!.from('suppliers').select('*'),
            supabase!.from('company_settings').select('*').limit(1).single(),
            supabase!.from('profiles').select('*'),
            supabase!.from('purchase_orders').select('*, supplier:suppliers(*)'),
            supabase!.from('goods_receipt_notes').select('*, supplier:suppliers(*)'),
            supabase!.from('purchase_invoices').select('*, supplier:suppliers(*)')
        ]);

        if (productsRes.error) throw new Error(`Products: ${productsRes.error.message}`);
        if (customersRes.error) throw new Error(`Customers: ${customersRes.error.message}`);
        if (suppliersRes.error) throw new Error(`Suppliers: ${suppliersRes.error.message}`);
        if (settingsRes.error) throw new Error(`Settings: ${settingsRes.error.message}`);
        if (usersRes.error) throw new Error(`Users: ${usersRes.error.message}`);
        if (poRes.error) throw new Error(`Purchase Orders: ${poRes.error.message}`);
        if (grnRes.error) throw new Error(`Goods Receipts: ${grnRes.error.message}`);
        if (invoiceRes.error) throw new Error(`Invoices: ${invoiceRes.error.message}`);

        setProducts(convertKeysToCamelCase(productsRes.data));
        const customersData = convertKeysToCamelCase(customersRes.data);
        const formattedCustomers = customersData.map((c: any) => ({
            ...c,
            lastSeen: new Date(c.lastSeen),
        }));
        setCustomers(formattedCustomers);
        setSuppliers(convertKeysToCamelCase(suppliersRes.data));
        setCompanySettings(convertKeysToCamelCase(settingsRes.data));
        setAllUsers(convertKeysToCamelCase(usersRes.data));

        const poData = convertKeysToCamelCase(poRes.data);
        const formattedPOs = poData.map((p: any) => ({ ...p, date: new Date(p.date) }));
        setPurchaseOrders(formattedPOs);

        const grnData = convertKeysToCamelCase(grnRes.data);
        const formattedGRNs = grnData.map((g: any) => ({ ...g, date: new Date(g.date) }));
        setGoodsReceiptNotes(formattedGRNs);

        const invoiceData = convertKeysToCamelCase(invoiceRes.data);
        const formattedInvoices = invoiceData.map((i: any) => ({ ...i, date: new Date(i.date) }));
        setPurchaseInvoices(formattedInvoices);

    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred while fetching data.");
        console.error("Data fetching error:", err);
    } finally {
        setIsLoading(false);
        setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
      setCurrentUser(loggedInUser);
      const userInList = allUsers.find(u => u.id === loggedInUser.id);
      if (userInList && (userInList.name !== loggedInUser.name || userInList.email !== loggedInUser.email)) {
          refetchAllUsers();
      }
  }, [loggedInUser, allUsers, refetchAllUsers]);

  useEffect(() => {
    if (transactionToPrint) {
      const handleAfterPrint = () => {
        setTransactionToPrint(null);
        window.removeEventListener('afterprint', handleAfterPrint);
      };

      window.addEventListener('afterprint', handleAfterPrint);
      
      // FIX: Add a short delay to ensure the Receipt component renders before printing.
      const printTimer = setTimeout(() => {
          window.print();
      }, 100);
      
      return () => {
        clearTimeout(printTimer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [transactionToPrint]);
  
  useEffect(() => {
    if (poToPrint) {
      setTimeout(() => {
        const poElement = document.getElementById('printable-po');
        const html2canvas = (window as any).html2canvas;
        const jspdf = (window as any).jspdf;

        if (poElement && html2canvas && jspdf) {
          html2canvas(poElement, { scale: 2, useCORS: true, logging: false })
          .then((canvas: HTMLCanvasElement) => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const canvasAspectRatio = canvas.width / canvas.height;
            const pdfHeight = pdfWidth / canvasAspectRatio;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`PO-${poToPrint.poNumber}.pdf`);
          }).catch((err: any) => console.error("Failed to generate PDF", err))
          .finally(() => setPOToPrint(null));
        } else {
          console.error("PDF generation libraries or printable element not found.");
          setPOToPrint(null);
        }
      }, 100);
    }
  }, [poToPrint]);

  const productsWithStock = useMemo(() => {
    return products.map(p => ({ ...p, stock: getProductStock(p) }));
  }, [products]);

  const variantsWithStock = useMemo(() => {
    return products.flatMap(p => 
      p.variants.map(v => ({
        ...v,
        productName: p.name,
        category: p.category,
        brand: p.brand,
        imageUrl: p.imageUrl,
        stock: getVariantStock(v)
      }))
    );
  }, [products]);

  useEffect(() => {
    const lowStockVariants = variantsWithStock.filter(v => v.stock > 0 && v.stock <= v.reorderPoint);
    
    const newLowStockNotifications = lowStockVariants.map(v => {
        const stockDisplay = v.sellingMethod === 'Each' ? v.stock.toFixed(0) : v.stock.toFixed(3);
        const unit = v.storageUom !== 'Each' ? ` ${v.storageUom}` : '';
        return {
            id: v.id,
            message: `${v.productName} (${Object.values(v.attributes).join(', ')}) is low on stock (${stockDisplay}${unit} remaining).`,
            type: 'warning' as 'warning',
            read: false, // Default to unread
        };
    });

    setNotifications(prevNotifications => {
        // Keep any non-warning notifications (e.g., info messages if they are ever added)
        const otherNotifications = prevNotifications.filter(n => n.type !== 'warning');

        // For the new set of low stock items, check if a notification already existed to preserve its 'read' status
        const updatedLowStockNotifications = newLowStockNotifications.map(newNotif => {
            const existingNotif = prevNotifications.find(p => p.id === newNotif.id && p.type === 'warning');
            return existingNotif ? { ...newNotif, read: existingNotif.read } : newNotif;
        });

        // Combine the other notifications with the completely refreshed list of low-stock warnings
        return [...otherNotifications, ...updatedLowStockNotifications];
    });
  }, [variantsWithStock]);
  
  const handleSaleComplete = useCallback(async (
    cartItems: CartItem[], 
    subtotal: number, 
    tax: number, 
    total: number, 
    paymentMethods: {method: string, amount: number}[], 
    customerDetails: { id?: number; name: string; phone?: string }) => {
    
    if (!currentUser) {
        alert("Error: No user is currently logged in.");
        return;
    }

    setIsRefreshing(true);
    const txnId = `TXN-${Date.now()}`;
    
    try {
        let customerId: number | null = null;

        // Step 1: Find or create the customer
        if (customerDetails.id) {
            customerId = customerDetails.id;
        } else if (customerDetails.phone) {
            const { data: existingCustomer, error: findError } = await supabase!
                .from('customers')
                .select('id')
                .eq('phone', customerDetails.phone)
                .single();

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else if (findError && findError.code === 'PGRST116') {
                const { data: newCustomer, error: createError } = await supabase!
                    .from('customers')
                    .insert({ name: customerDetails.name, phone: customerDetails.phone, last_seen: new Date().toISOString() })
                    .select('id')
                    .single();
                if (createError) throw new Error(`Error creating new customer: ${createError.message}`);
                if (newCustomer) customerId = newCustomer.id;
            } else if (findError) {
                 throw new Error(`Error finding customer: ${findError.message}`);
            }
        }

        const amountPaid = paymentMethods.reduce((sum, p) => sum + p.amount, 0);

        // Step 2. Insert the master transaction record
        const { error: txnError } = await supabase!.from('transactions').insert({
            id: txnId,
            date: new Date().toISOString(),
            user_id: currentUser.id,
            customer_id: customerId,
            items: cartItems,
            subtotal,
            tax,
            total,
            amount_paid: amountPaid,
            payment_methods: paymentMethods,
            status: 'Completed',
            type: 'Sale',
        });

        if (txnError) throw new Error(`Failed to record transaction: ${txnError.message}`);

        // Step 3. Decrement stock by inserting negative lots
        const stockUpdates = cartItems.map(item => ({
            variant_id: item.variantId,
            quantity: -item.quantity,
            lot_number: `SALE-${txnId.slice(-6)}`,
        }));

        const { error: lotError } = await supabase!.from('lots').insert(stockUpdates);
        if (lotError) {
            // Attempt to roll back by voiding the transaction
            await supabase!.from('transactions').update({ status: 'Void' }).eq('id', txnId);
            throw new Error(`Transaction recorded, but failed to update stock: ${lotError.message}. The transaction has been voided. Please check stock levels manually.`);
        }
    } catch (error) {
        alert(`Failed to complete sale: ${error instanceof Error ? error.message : String(error)}`);
        console.error("Sale Error:", error);
    } finally {
        // 4. Refetch products and customers to update UI
        await refetchProductsAndCustomers();
    }
  }, [currentUser, refetchProductsAndCustomers]);


  const handleStockAdjustment = useCallback(async (productId: number, variantId: number, newStock: number, reason: StockAdjustmentReason) => {
    if (!currentUser) return;

    const variant = variantsWithStock.find(v => v.id === variantId);
    if (!variant) return;

    // 1. Log the adjustment
    const { error: logError } = await supabase!.from('stock_adjustment_logs').insert({
        id: `ADJ-${Date.now()}`,
        date: new Date().toISOString(),
        user_id: currentUser.id,
        variant_id: variantId,
        previous_stock: variant.stock,
        new_stock: newStock,
        reason: reason,
    });
    if (logError) {
        alert(`Failed to log adjustment: ${logError.message}`);
        return;
    }

    // 2. Clear existing lots and set the new quantity in a single lot
    // This is a destructive operation. A better approach would be to add/remove from lots.
    // For simplicity of this system, we overwrite.
    await supabase!.from('lots').delete().eq('variant_id', variantId);
    const { error: lotError } = await supabase!.from('lots').insert({
        variant_id: variantId,
        lot_number: `ADJ-${Date.now().toString().slice(-4)}`,
        quantity: newStock,
    });
    if (lotError) {
        alert(`Failed to update stock: ${lotError.message}`);
        return;
    }

    refetchProducts(); // Refetch for consistency
  }, [variantsWithStock, currentUser, refetchProducts]);

  
  const handleProcessReturn = useCallback(async (transaction: Transaction, itemsToReturn: CartItem[]) => {
      if (!currentUser) return;
      setIsRefreshing(true);
      try {
          const returnSubtotal = itemsToReturn.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const returnTax = itemsToReturn.reduce((sum, item) => sum + (item.price * item.quantity * item.taxRate), 0);
          const returnTotal = returnSubtotal + returnTax;
          const returnTxnId = `RTN-${transaction.id.slice(4)}-${Date.now().toString().slice(-4)}`;

          // 1. Create the 'Return' transaction record
          const { error: returnTxnError } = await supabase!.from('transactions').insert({
              id: returnTxnId,
              date: new Date().toISOString(),
              items: itemsToReturn,
              subtotal: -returnSubtotal,
              tax: -returnTax,
              total: -returnTotal,
              amount_paid: -returnTotal, // Assuming store credit or refund
              customer_id: transaction.customer?.id,
              payment_methods: [{ method: 'Return', amount: -returnTotal }],
              status: 'Completed',
              type: 'Return',
              user_id: currentUser.id,
          });

          if (returnTxnError) throw new Error(`Failed to create return transaction: ${returnTxnError.message}`);

          // 2. Add stock back by inserting positive lots
          const stockToAdd = itemsToReturn.map(item => ({
              variant_id: item.variantId,
              lot_number: `RTN-${returnTxnId.slice(-6)}`,
              quantity: item.quantity,
          }));

          const { error: lotError } = await supabase!.from('lots').insert(stockToAdd);
          if (lotError) {
              throw new Error(`Return transaction ${returnTxnId} was created, but failed to add stock back automatically. Please perform a manual stock adjustment. Error: ${lotError.message}`);
          }
          
          alert("Return processed successfully.");

      } catch (error) {
          alert(`Failed to process return: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
          await refetchProducts();
          setIsRefreshing(false);
      }
  }, [currentUser, refetchProducts]);

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to reset all transactional data? This action cannot be undone.")) {
        // This should call a secure database function (RPC) on Supabase
        alert("This feature should be a secure database function. For this demo, it is disabled.");
    }
  };
  
  const handleSettingsUpdate = useCallback(async (newSettings: CompanySettings) => {
      const snakeCaseSettings = convertKeysToSnakeCase(newSettings);
      
      const { error } = await supabase!.from('company_settings').update(snakeCaseSettings).eq('id', 1);
      if (error) {
          alert(`Failed to update settings: ${error.message}`);
      } else {
          setCompanySettings(newSettings);
      }
  }, []);

  const handleReceiveStock = useCallback(async (poId: string, receivedItems: { variantId: number, quantityReceived: number }[]) => {
      if (!currentUser) return;
      setIsRefreshing(true);
      const po = purchaseOrders.find(p => p.id === poId);
      if (!po) {
          alert("Error: Purchase order not found");
          setIsRefreshing(false);
          return;
      }

      let grnId: string | null = null;
      try {
          // Step 1: Create Goods Receipt Note
          const grnItems = receivedItems.map(recItem => {
              const poItem = po.items.find(p => p.variantId === recItem.variantId);
              return {
                  variantId: recItem.variantId,
                  name: poItem?.name || 'Unknown Item',
                  quantityReceived: recItem.quantityReceived
              };
          });

          const grnToInsert = {
              date: new Date().toISOString(),
              purchase_order_id: poId,
              purchase_order_number: po.poNumber,
              supplier_id: po.supplier.id,
              items: grnItems
          };
          const { data: grnData, error: grnError } = await supabase!
              .from('goods_receipt_notes')
              .insert(grnToInsert)
              .select('id')
              .single();

          if (grnError || !grnData) throw new Error(`Failed to create goods receipt: ${grnError?.message}`);
          grnId = grnData.id;

          // Step 2: Update stock levels by adding new lots
          const stockToAdd = receivedItems
              .filter(item => item.quantityReceived > 0)
              .map(item => ({
                  variant_id: item.variantId,
                  lot_number: `GRN-${grnId!.substring(0, 8)}-${item.variantId}`,
                  quantity: item.quantityReceived
              }));

          if (stockToAdd.length > 0) {
              const { error: lotError } = await supabase!.from('lots').insert(stockToAdd);
              if (lotError) throw new Error(`Goods receipt ${grnId} created, but failed to update stock. Please perform manual adjustment. Error: ${lotError.message}`);
          }
          
          // Step 3: Update PO items and status
          const updatedPoItems = po.items.map(poItem => {
              const received = receivedItems.find(r => r.variantId === poItem.variantId);
              return {
                  ...poItem,
                  quantityReceived: poItem.quantityReceived + (received?.quantityReceived || 0)
              };
          });
          
          const allReceived = updatedPoItems.every(item => item.quantityReceived >= item.quantityOrdered);
          const newStatus = allReceived ? 'Received' : 'Partially Received';

          const { error: poUpdateError } = await supabase!
              .from('purchase_orders')
              .update({
                  items: updatedPoItems,
                  status: newStatus
              })
              .eq('id', poId);
              
          if (poUpdateError) throw new Error(`Stock updated, but failed to update purchase order status. Please check PO manually. Error: ${poUpdateError.message}`);

          alert("Stock received successfully!");
      } catch (error) {
          alert(`Failed to receive stock: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
          await fetchInitialData();
      }
  }, [currentUser, purchaseOrders, fetchInitialData]);

  const handleCreatePO = useCallback(async (po: Omit<PurchaseOrder, 'id' | 'date' | 'status'>): Promise<void> => {
      const poToInsert = {
          id: `PO-${Date.now()}`,
          po_number: po.poNumber,
          date: new Date().toISOString(),
          supplier_id: po.supplier.id,
          expected_delivery_date: po.expectedDeliveryDate,
          items: convertKeysToSnakeCase(po.items),
          status: 'Ordered',
          subtotal: po.subtotal,
          tax: po.tax,
          total: po.total,
      };
      const { error } = await supabase!.from('purchase_orders').insert(poToInsert);
      if (error) {
          console.error("Failed to create PO:", error);
          throw error; // Let the modal handle UI state
      } else {
          await fetchInitialData();
      }
  }, [fetchInitialData]);

  const handleCreateInvoice = useCallback(async (invoice: Omit<PurchaseInvoice, 'id'>) => {
      const invoiceToInsert = {
          invoice_number: invoice.invoiceNumber,
          date: invoice.date.toISOString(),
          due_date: invoice.dueDate,
          goods_receipt_id: invoice.goodsReceiptId,
          supplier_id: invoice.supplier.id,
          items: invoice.items,
          total: invoice.total,
          status: invoice.status,
      };
      const { error } = await supabase!.from('purchase_invoices').insert(invoiceToInsert);
      if (error) {
          alert(`Failed to create invoice: ${error.message}`);
      } else {
          await fetchInitialData();
      }
  }, [fetchInitialData]);

  const handleCreateManualInvoice = useCallback(async (invoice: Omit<PurchaseInvoice, 'id' | 'status'>) => {
      const invoiceToInsert = {
          id: `INV-${Date.now()}`,
          invoice_number: invoice.invoiceNumber,
          date: invoice.date.toISOString(),
          due_date: invoice.dueDate,
          supplier_id: invoice.supplier.id,
          items: invoice.items,
          total: invoice.total,
          status: 'Unpaid',
      };
      const { error } = await supabase!.from('purchase_invoices').insert(invoiceToInsert);
      if (error) {
          console.error("Failed to create manual invoice:", error);
          throw new Error(`Failed to create manual invoice: ${error.message}`);
      } else {
          await fetchInitialData();
      }
  }, [fetchInitialData]);
  
  const handleCreateManualGRN = useCallback(async (grnData: { supplierId: number; referencePoNumber: string; items: { variantId: number; name: string; quantityReceived: number }[] }) => {
    setIsRefreshing(true);
    const grnId = `GRN-${Date.now()}`;
    const manualPoId = `PO-MANUAL-${Date.now()}`;
    const manualPoNumber = grnData.referencePoNumber || `MANUAL-${Date.now().toString().slice(-6)}`;
    
    try {
        // Step 1: Create a shell Purchase Order to satisfy the foreign key constraint.
        const { error: poError } = await supabase!
            .from('purchase_orders')
            .insert({
                id: manualPoId,
                po_number: manualPoNumber,
                date: new Date().toISOString(),
                supplier_id: grnData.supplierId,
                items: [],
                status: 'Received', // Mark as received since we're creating a GRN from it
                subtotal: 0,
                tax: 0,
                total: 0,
                expected_delivery_date: new Date().toISOString().split('T')[0],
            });

        if (poError) throw new Error(`Failed to create placeholder PO for manual GRN: ${poError.message}`);
        
        // Step 2: Create the Goods Receipt Note, linking it to the new shell PO.
        const grnToInsert = {
            id: grnId,
            date: new Date().toISOString(),
            purchase_order_id: manualPoId,
            purchase_order_number: manualPoNumber,
            supplier_id: grnData.supplierId,
            items: convertKeysToSnakeCase(grnData.items)
        };

        const { error: grnError } = await supabase!
            .from('goods_receipt_notes')
            .insert(grnToInsert);
        
        if (grnError) throw new Error(`Failed to create goods receipt: ${grnError.message}`);

        // Step 3: Update stock levels.
        const stockToAdd = grnData.items
            .filter(item => item.quantityReceived > 0)
            .map(item => ({
                variant_id: item.variantId,
                lot_number: `GRN-${grnId.substring(0, 8)}-${item.variantId}`,
                quantity: item.quantityReceived
            }));
        
        if (stockToAdd.length > 0) {
            const { error: lotError } = await supabase!.from('lots').insert(stockToAdd);
            if (lotError) throw new Error(`Goods receipt ${grnId} created, but failed to update stock. Please perform manual adjustment. Error: ${lotError.message}`);
        }
        alert("Manual goods receipt created and stock updated successfully!");

    } catch (error) {
        console.error("Manual GRN creation error:", error);
        throw error; // rethrow for modal
    } finally {
        await fetchInitialData();
    }
}, [fetchInitialData]);

  const handleMarkInvoiceAsPaid = useCallback(async (invoiceId: string) => {
      const { error } = await supabase!.from('purchase_invoices').update({ status: 'Paid' }).eq('id', invoiceId);
      if (error) {
          alert(`Failed to update invoice status: ${error.message}`);
      } else {
          await fetchInitialData();
      }
  }, [fetchInitialData]);

  const handleAddNewSupplier = useCallback(async (newSupplierData: Omit<Supplier, 'id'>) => {
      // The 'id' column in the 'suppliers' table is of type integer, but Date.now()
      // generates a number too large for this type, causing an "out of range" error.
      // This fix generates a unique ID that fits within the standard 32-bit integer range
      // by taking the last 9 digits of the timestamp.
      const dataWithId = {
          ...newSupplierData,
          id: parseInt(Date.now().toString().slice(-9)),
      };
      const snakeCaseData = convertKeysToSnakeCase(dataWithId);
      const { error } = await supabase!
          .from('suppliers')
          .insert(snakeCaseData);
      
      if (error) {
          console.error('Failed to add supplier:', error);
          throw error; // Let the modal handle displaying the error.
      }
      await fetchInitialData();
  }, [fetchInitialData]);

  const handleAddMultipleProducts = useCallback(async (newProductsData: (Omit<Product, 'id' | 'variants'> & { variants: Omit<Variant, 'id' | 'productId'>[] })[]) => {
    setIsRefreshing(true);
    try {
        for (const newProductData of newProductsData) {
            // Step 1: Manually check if product exists by name. Use limit(1) to be resilient to duplicates.
            const { data: productData, error: findProductError } = await supabase!
                .from('products')
                .select('id')
                .eq('name', newProductData.name)
                .limit(1);

            if (findProductError) throw findProductError;
            
            const existingProduct = productData && productData.length > 0 ? productData[0] : null;
            let productId: number;

            // If product doesn't exist, create it.
            if (!existingProduct) {
                const { data: newProduct, error: createProductError } = await supabase!
                    .from('products')
                    .insert({ 
                        name: newProductData.name, 
                        category: newProductData.category, 
                        brand: newProductData.brand, 
                        image_url: newProductData.imageUrl 
                    })
                    .select('id')
                    .single();
                
                if (createProductError) throw new Error(`Failed to create product "${newProductData.name}": ${createProductError.message}`);
                if (!newProduct) throw new Error(`Product creation did not return an ID for "${newProductData.name}".`);
                productId = newProduct.id;
            } else {
                productId = existingProduct.id;
            }

            // Step 2: Loop through variants and manually check/create them.
            for (const newVariantData of newProductData.variants) {
                // SKUs must be globally unique. Use limit(1) to be resilient to duplicates.
                 const { data: variantData, error: findVariantError } = await supabase!
                    .from('variants')
                    .select('id, product_id')
                    .eq('sku', newVariantData.sku)
                    .limit(1);

                if (findVariantError) throw findVariantError;
                
                const existingVariant = variantData && variantData.length > 0 ? variantData[0] : null;

                if (existingVariant && existingVariant.product_id !== productId) {
                    throw new Error(`SKU "${newVariantData.sku}" is already assigned to a different product. SKUs must be unique.`);
                }
                
                let variantId: number;

                if (!existingVariant) {
                    const { data: newVariant, error: createVariantError } = await supabase!
                        .from('variants')
                        .insert({
                            product_id: productId,
                            attributes: newVariantData.attributes,
                            sku: newVariantData.sku,
                            barcode: newVariantData.barcode,
                            price: newVariantData.price,
                            cost: newVariantData.cost,
                            tax_rate: newVariantData.taxRate,
                            reorder_point: newVariantData.reorderPoint,
                            selling_method: newVariantData.sellingMethod,
                            storage_uom: newVariantData.storageUom,
                        })
                        .select('id')
                        .single();

                    if (createVariantError) throw new Error(`Failed to create variant with SKU "${newVariantData.sku}": ${createVariantError.message}`);
                    if (!newVariant) throw new Error(`Variant creation did not return an ID for SKU "${newVariantData.sku}".`);
                    variantId = newVariant.id;
                } else {
                    variantId = existingVariant.id;
                }

                // Step 3: Add stock (lots). This is always an insert.
                const lotsToInsert = newVariantData.lots
                    .filter(lot => lot.quantity > 0)
                    .map(lot => ({
                        variant_id: variantId,
                        lot_number: lot.lotNumber || `IMPORT-${Date.now().toString().slice(-6)}`,
                        expiry_date: lot.expiryDate || null, // Ensure empty strings become null
                        quantity: lot.quantity,
                    }));

                if (lotsToInsert.length > 0) {
                    const { error: lotError } = await supabase!.from('lots').insert(lotsToInsert);
                    if (lotError) throw new Error(`Failed to add stock for SKU "${newVariantData.sku}": ${lotError.message}`);
                }
            }
        }
        alert(`${newProductsData.length} product(s) processed successfully!`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error in handleAddMultipleProducts:", error);
        alert(`Error processing products: ${errorMessage}`);
        throw new Error(errorMessage); // Re-throw so the modal can catch it
    } finally {
        await refetchProducts();
    }
}, [refetchProducts]);


  const handleAddNewProduct = useCallback(async (newProductData: Omit<Product, 'id' | 'variants'> & { variants: Omit<Variant, 'id' | 'productId'>[] }) => {
      // This function now throws on failure, so the caller should handle it.
      await handleAddMultipleProducts([newProductData]);
  }, [handleAddMultipleProducts]);
  
  const handleViewCustomerHistory = useCallback(async (customerId: number) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        setViewingCustomerHistory({ customer, transactions: [] }); // Show modal immediately with loading state
        const { data, error } = await supabase!
            .from('transactions')
            .select('*, user:profiles(*)')
            .eq('customer_id', customerId);

        if (error) {
            alert('Could not fetch customer history.');
            setViewingCustomerHistory(null); // Close modal on error
            return;
        }
        
        const formattedTransactions = data.map(t => ({
            ...convertKeysToCamelCase(t),
            date: new Date((t as any).date),
            user: convertKeysToCamelCase(t.user)
        }));
        setViewingCustomerHistory({ customer, transactions: formattedTransactions });
    }
  }, [customers]);

  const handlePrintReceipt = useCallback((transaction: Transaction) => setTransactionToPrint(transaction), []);
  const handlePrintPO = useCallback((po: PurchaseOrder) => setPOToPrint(po), []);

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
              <LoadingSpinnerIcon className="w-12 h-12 text-emerald-400" />
              <p className="mt-4 text-lg">Loading store data...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-4">
              <div className="w-full max-w-2xl p-8 bg-gray-800 rounded-lg shadow-2xl border border-red-500/50">
                  <h1 className="text-3xl font-bold text-red-400 mb-4">Data Loading Failed</h1>
                  <p className="text-gray-300 mb-6">The application could not fetch essential data from the database. This might be due to a network issue or incorrect Row Level Security policies.</p>
                  <div className="bg-gray-900/50 p-4 rounded-md text-sm font-mono text-red-300">
                      <p className="text-gray-500 mb-2">// Error Details</p>
                      <p>{error}</p>
                  </div>
                   <button onClick={fetchInitialData} className="mt-6 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700">
                        Retry
                    </button>
              </div>
          </div>
      );
  }

  if (!companySettings) {
      return (
           <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-4">
               <div className="text-center">
                    <h1 className="text-2xl font-bold text-yellow-400">Setup Required</h1>
                    <p className="mt-2 text-gray-400">Company settings are not configured in the database. Please run the setup SQL.</p>
               </div>
           </div>
      );
  }

  const renderView = () => {
    if (!currentUser) return null;

    const viewProps = {
      pos: { products: productsWithStock, customers: customers, onSaleComplete: handleSaleComplete, activeUser: currentUser, companySettings: companySettings, onPrintReceipt: handlePrintReceipt },
      inventory: { products: products, variants: variantsWithStock, onAdjustStock: handleStockAdjustment, userRole: currentUser.role, onAddNewProduct: handleAddNewProduct, onAddMultipleProducts: handleAddMultipleProducts },
      customers: { customers: customers, onViewHistory: handleViewCustomerHistory },
      transactions: { onProcessReturn: handleProcessReturn, onPrintReceipt: handlePrintReceipt },
      purchasing: { variants: variantsWithStock, products: products, suppliers: suppliers, purchaseOrders: purchaseOrders, goodsReceipts: goodsReceiptNotes, invoices: purchaseInvoices, onCreatePO: handleCreatePO, onReceiveStock: handleReceiveStock, onCreateInvoice: handleCreateInvoice, onCreateManualInvoice: handleCreateManualInvoice, onAddNewSupplier: handleAddNewSupplier, onMarkInvoiceAsPaid: handleMarkInvoiceAsPaid, onPrintPO: handlePrintPO, companySettings: companySettings, onCreateManualGRN: handleCreateManualGRN },
      reports: { products: products, users: allUsers, userRole: currentUser.role },
      settings: { settings: companySettings, onSave: handleSettingsUpdate },
      admin: { users: allUsers, products, onResetData: handleResetData },
      users: { currentUserRole: currentUser.role }
    };
    
    const restrictedViews: Partial<Record<AppView, UserRole[]>> = {
        purchasing: ['Admin', 'Manager'],
        reports: ['Admin', 'Manager'],
        users: ['Admin', 'Manager'],
        settings: ['Admin', 'Manager'],
        admin: ['Admin', 'Manager']
    };

    const requiredRoles = restrictedViews[activeView];
    if (requiredRoles && !requiredRoles.includes(currentUser.role)) {
        if (activeView !== 'pos') {
            setActiveView('pos');
        }
        return <PosView {...viewProps.pos} />;
    }
    
    switch (activeView) {
      case 'pos': return <PosView {...viewProps.pos} />;
      case 'inventory': return <InventoryView {...viewProps.inventory} />;
      case 'customers': return <CustomersView {...viewProps.customers} />;
      case 'transactions': return <TransactionsView {...viewProps.transactions} />;
      case 'purchasing': return <PurchasingView {...viewProps.purchasing} />;
      case 'reports': return <ReportsView {...viewProps.reports} />;
      case 'settings': return <SettingsView {...viewProps.settings} />;
      case 'admin': return <AdminView {...viewProps.admin} />;
      case 'users': return <UsersView {...viewProps.users} />;
      default: return <PosView {...viewProps.pos} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
      <Sidebar activeView={activeView} setActiveView={setActiveView} currentUser={currentUser} notifications={notifications.filter(n => !n.read)} onLogout={onLogout} onProfileClick={() => setIsProfileModalOpen(true)} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header currentUser={currentUser} allUsers={allUsers} onSwitchUser={setCurrentUser} notifications={notifications} setNotifications={setNotifications} isRefreshing={isRefreshing} companySettings={companySettings} />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {renderView()}
        </div>
      </main>
      {viewingCustomerHistory && <CustomerHistoryModal customer={viewingCustomerHistory.customer} transactions={viewingCustomerHistory.transactions} onClose={() => setViewingCustomerHistory(null)} />}
      {transactionToPrint && <Receipt transaction={transactionToPrint} settings={companySettings} />}
      {poToPrint && <PrintablePurchaseOrder purchaseOrder={poToPrint} settings={companySettings} />}
      {isProfileModalOpen && <ProfileModal user={currentUser} onClose={() => setIsProfileModalOpen(false)} onUpdateProfile={onUpdateProfile} />}
    </div>
  );
};

export default Dashboard;