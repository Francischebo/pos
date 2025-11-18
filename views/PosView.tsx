import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Product, CartItem, PaymentStatus, Customer, getVariantStock, Variant, User, CompanySettings, Transaction } from '../types';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import CustomerSelectModal from '../components/CustomerSelectModal';
import VariantSelectModal from '../components/VariantSelectModal';
import QuantityInputModal from '../components/QuantityInputModal';
import Toast from '../components/Toast';
import PaymentModal from '../components/PaymentModal';

interface PosViewProps {
    products: (Product & { stock: number })[];
    customers: Customer[];
    onSaleComplete: (cartItems: CartItem[], subtotal: number, tax: number, total: number, paymentMethods: {method: string, amount: number}[], customerDetails: { id?: number; name: string; phone?: string }) => void;
    activeUser: User;
    companySettings: CompanySettings;
    onPrintReceipt: (transaction: Transaction) => void;
}

const PosView: React.FC<PosViewProps> = ({ products, customers, onSaleComplete, activeUser, companySettings, onPrintReceipt }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeModal, setActiveModal] = useState<'none' | 'customerSelect' | 'variantSelect' | 'quantityInput' | 'payment'>('none');
  const [assignedCustomer, setAssignedCustomer] = useState<Customer | undefined>(undefined);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [selectingVariantFor, setSelectingVariantFor] = useState<Product | null>(null);
  const [quantityInputFor, setQuantityInputFor] = useState<{product: Product, variant: Variant} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaleComplete, setIsSaleComplete] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [paymentMessage, setPaymentMessage] = useState('');

  const filteredProducts = useMemo(() => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) {
        return products;
    }
    const lowercasedTerm = trimmedTerm.toLowerCase();
    return products.filter(p =>
        p.name.toLowerCase().includes(lowercasedTerm) ||
        p.variants.some(v => v.sku.toLowerCase().includes(lowercasedTerm) || v.barcode.toLowerCase().includes(lowercasedTerm))
    );
  }, [products, searchTerm]);

  const { subtotal, tax, total } = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = cartItems.reduce((sum, item) => sum + (item.price * item.quantity * item.taxRate), 0);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [cartItems]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  const clearCart = useCallback(() => {
    setCartItems([]);
    setAssignedCustomer(undefined);
  }, []);

  const handleSaleCompletionInView = useCallback((paymentMethods: {method: string, amount: number}[], customerDetails: { id?: number; name: string; phone?: string }) => {
      onSaleComplete(cartItems, subtotal, tax, total, paymentMethods, customerDetails);

      const amountPaid = paymentMethods.reduce((sum, p) => sum + p.amount, 0);
      // Prefer backend-provided transaction id if present in paymentMethods (e.g. M-Pesa cashier-record)
      const backendTx = paymentMethods.find(p => (p as any).transactionId) as any | undefined;
      const newTransactionForPrinting: Transaction = {
        id: backendTx && backendTx.transactionId ? backendTx.transactionId : `TXN-${Date.now()}`,
        date: new Date(),
        items: cartItems,
        subtotal,
        tax,
        total,
        amountPaid,
        customer: customerDetails.id ? { id: customerDetails.id, name: customerDetails.name } : undefined,
        paymentMethods,
        status: 'Completed',
        type: 'Sale',
        user: activeUser,
      };
      
      setLastTransaction(newTransactionForPrinting);
      setIsSaleComplete(true);
      setActiveModal('none');
      setPaymentMessage(`Payment successful via ${paymentMethods.map(p => p.method).join(' & ')}!`);
      showToast(`Sale Completed!`, 'success');
  }, [cartItems, subtotal, tax, total, activeUser, onSaleComplete, showToast]);


  const addToCart = useCallback((product: Product, variant: Variant, quantity: number = 1) => {
    const variantStock = getVariantStock(variant);
    if (variantStock <= 0) {
        showToast("Cannot add out of stock item", 'error');
        return;
    }
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === product.id && item.variantId === variant.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > variantStock) {
            showToast("Maximum stock reached for this item.", 'error');
            return prevItems;
        }
        return prevItems.map(item =>
          item.variantId === variant.id ? { ...item, quantity: newQuantity } : item
        );
      }
      const newItem: CartItem = {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantAttributes: variant.attributes,
        price: variant.price,
        taxRate: variant.taxRate,
        cost: variant.cost,
        imageUrl: product.imageUrl,
        quantity: quantity,
        sellingMethod: variant.sellingMethod,
        storageUom: variant.storageUom,
      };
      return [...prevItems, newItem];
    });
    showToast(`${product.name} added to cart`, 'success');
  }, [showToast]);

  const handleSelectProduct = useCallback((product: Product) => {
    if (isSaleComplete) return;
    if (product.variants.length === 1) {
        const variant = product.variants[0];
        if (variant.sellingMethod === 'Each') {
            addToCart(product, variant);
        } else {
            setQuantityInputFor({ product, variant });
            setActiveModal('quantityInput');
        }
    } else {
        setSelectingVariantFor(product);
        setActiveModal('variantSelect');
    }
  }, [addToCart, isSaleComplete]);

  const handleVariantSelected = (product: Product, variant: Variant) => {
      setActiveModal('none');
      setSelectingVariantFor(null);
      if (variant.sellingMethod === 'Each') {
          addToCart(product, variant);
      } else {
          setQuantityInputFor({ product, variant });
          setActiveModal('quantityInput');
      }
  };

  const handleBarcodeScan = useCallback((scannedCode: string) => {
    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.barcode === scannedCode || variant.sku === scannedCode) {
          handleSelectProduct(product); // Use the main selection logic
          return;
        }
      }
    }
    showToast(`Product with code "${scannedCode}" not found.`, 'error');
  }, [products, handleSelectProduct, showToast]);

  useEffect(() => {
    let barcode = '';
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleKeyDown = (e: KeyboardEvent) => {
        const targetEl = e.target as HTMLElement;
        if (activeModal !== 'none' || ['INPUT', 'SELECT', 'TEXTAREA'].includes(targetEl.tagName)) {
          barcode = '';
          return;
        }
        if (e.key === 'Enter') {
            if (barcode) handleBarcodeScan(barcode);
            barcode = '';
            return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
           barcode += e.key;
        }
        timeoutId = setTimeout(() => barcode = '', 50);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleBarcodeScan, activeModal]);

  const removeFromCart = (productId: number, variantId: number) => {
    if(isSaleComplete) return;
    setCartItems(prevItems => prevItems.filter(item => !(item.productId === productId && item.variantId === variantId)));
  };

  const updateQuantity = (productId: number, variantId: number, newQuantity: number) => {
    if(isSaleComplete) return;
    const product = products.find(p => p.id === productId);
    const variant = product?.variants.find(v => v.id === variantId);
    if (newQuantity <= 0) {
      removeFromCart(productId, variantId);
    } else if (variant && newQuantity > getVariantStock(variant)) {
        showToast("Maximum stock reached for this item.", 'error');
        return;
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          (item.productId === productId && item.variantId === variantId) ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setAssignedCustomer(customer);
    setActiveModal('none');
  }

  const handleStartNewSale = useCallback(() => {
      clearCart();
      setLastTransaction(null);
      setIsSaleComplete(false);
      setPaymentMessage('');
  }, [clearCart]);

  const handlePrintLastReceipt = useCallback(() => {
      if (lastTransaction) {
          onPrintReceipt(lastTransaction);
      }
  }, [lastTransaction, onPrintReceipt]);

  return (
      <div className="flex flex-col lg:flex-row gap-8">
        {toast && <Toast message={toast.message} type={toast.type} />}
        <div className="lg:w-2/3">
          <ProductGrid 
            products={filteredProducts} 
            onSelectProduct={handleSelectProduct} 
            onBarcodeSubmit={handleBarcodeScan}
            onSearch={setSearchTerm}
            searchTerm={searchTerm}
          />
        </div>
        <div className="lg:w-1/3">
          <Cart
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onEditQuantity={(productId, variantId) => {
                const item = cartItems.find(i => i.productId === productId && i.variantId === variantId);
                const product = products.find(p => p.id === productId);
                if (item && product) {
                    const variant = product.variants.find(v => v.id === variantId);
                    if(variant) {
                        setQuantityInputFor({ product, variant });
                        setActiveModal('quantityInput');
                    }
                }
            }}
            onRemove={removeFromCart}
            onCheckout={() => setActiveModal('payment')}
            subtotal={subtotal}
            tax={tax}
            total={total}
            isSaleComplete={isSaleComplete}
            paymentMessage={paymentMessage}
            onAssignCustomer={() => setActiveModal('customerSelect')}
            assignedCustomer={assignedCustomer}
            onStartNewSale={handleStartNewSale}
            onPrintReceipt={handlePrintLastReceipt}
          />
        </div>
      
      {activeModal === 'payment' && (
        <PaymentModal
            total={total}
            onClose={() => setActiveModal('none')}
            onSaleComplete={handleSaleCompletionInView}
            companySettings={companySettings}
            assignedCustomer={assignedCustomer}
        />
      )}
      
      {activeModal === 'variantSelect' && selectingVariantFor && (
          <VariantSelectModal
            product={selectingVariantFor}
            onClose={() => {
              setActiveModal('none');
              setSelectingVariantFor(null);
            }}
            onAddToCart={handleVariantSelected}
          />
      )}
      
      {activeModal === 'quantityInput' && quantityInputFor && (
        <QuantityInputModal
          product={quantityInputFor.product}
          variant={quantityInputFor.variant}
          onClose={() => {
              setActiveModal('none');
              setQuantityInputFor(null);
          }}
          onSubmit={(prod, variant, qty) => {
              const existingItem = cartItems.find(i => i.variantId === variant.id);
              if (existingItem) {
                  updateQuantity(prod.id, variant.id, qty);
              } else {
                  addToCart(prod, variant, qty);
              }
              setActiveModal('none');
              setQuantityInputFor(null);
          }}
        />
      )}

      {activeModal === 'customerSelect' && (
          <CustomerSelectModal
            customers={customers}
            onSelect={handleSelectCustomer}
            onClose={() => setActiveModal('none')}
          />
      )}
    </div>
  );
};

export default PosView;