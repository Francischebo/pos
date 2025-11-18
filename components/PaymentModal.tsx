import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PaymentStatus, CompanySettings, Customer } from '../types';
import { MpesaIcon } from './icons/MpesaIcon';
import { CashIcon } from './icons/CashIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { LoadingSpinnerIcon } from './icons/LoadingSpinnerIcon';
import MpesaModal from './MpesaModal';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onSaleComplete: (paymentMethods: {method: string, amount: number}[], customerDetails: { id?: number; name: string; phone?: string }) => void;
  companySettings: CompanySettings;
  assignedCustomer?: Customer;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ total, onClose, onSaleComplete, companySettings, assignedCustomer }) => {
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<{method: string, amount: number}[]>([]);
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.IDLE);
  const [message, setMessage] = useState('');
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [cashInputValue, setCashInputValue] = useState('');
  const [mpesaCustomer, setMpesaCustomer] = useState<{name: string, phone: string} | null>(null);

  const remaining = total - paidAmount;
  const isProcessing = status === PaymentStatus.PENDING;

  // Use functional updates to remove the dependency on `paidAmount` from the callback.
  // This makes the callback stable and prevents re-connections.
	const handleMpesaSuccess = useCallback((payload: { amount: number }) => {
			const paid = payload.amount;
			// Update payment methods and paid amount; if this completes the sale, finalize immediately
			setPaymentMethods(prevPM => {
				const updatedPM = [...prevPM, { method: 'M-Pesa', amount: paid }];

				setPaidAmount(prevPaidAmount => {
					const newPaidAmount = prevPaidAmount + paid;
					if (newPaidAmount >= total) {
						setStatus(PaymentStatus.SUCCESS);
						setMessage('Payment complete!');
						// Build customer details now and complete the sale
						let customerDetails: { id?: number; name: string; phone?: string };
						if (assignedCustomer) {
							customerDetails = { id: assignedCustomer.id, name: assignedCustomer.name, phone: assignedCustomer.phone };
						} else if (mpesaCustomer) {
							customerDetails = { name: mpesaCustomer.name, phone: mpesaCustomer.phone };
						} else {
							customerDetails = { name: 'Walk-in Customer' };
						}
						// Call the sale completion callback to persist and print receipt
						onSaleComplete(updatedPM, customerDetails);
					} else {
						setStatus(PaymentStatus.PARTIAL);
						setMessage(`M-Pesa payment of KES ${paid.toLocaleString()} received.`);
					}
					return newPaidAmount;
				});

				return updatedPM;
			});

			setShowMpesaModal(false);
	}, [total, assignedCustomer, mpesaCustomer, onSaleComplete]);

  const handlePaymentFailure = useCallback((msg: string) => {
    setStatus(PaymentStatus.FAILED);
    setMessage(msg);
    // Keep mpesa modal open to show error, it will be reset from there
  }, []);
  
  const handleFinishSale = () => {
    let customerDetails: { id?: number; name: string; phone?: string };

    if (assignedCustomer) {
        customerDetails = { id: assignedCustomer.id, name: assignedCustomer.name, phone: assignedCustomer.phone };
    } else if (mpesaCustomer) {
        customerDetails = { name: mpesaCustomer.name, phone: mpesaCustomer.phone };
    } else {
        customerDetails = { name: 'Walk-in Customer' };
    }
    
    onSaleComplete(paymentMethods, customerDetails);
  };

	// The M-Pesa modal handles initiating payment and WebSocket updates itself,
	// so we don't create a separate connection here.

// ... (code below line 83)

  const handleMpesaClick = () => {
    if (remaining > 0) {
      setStatus(PaymentStatus.IDLE);
      setMessage('');
      setShowMpesaModal(true);
    }
  };

	// Payment initiation is handled inside the MpesaModal (it calls the backend and listens
	// for updates via WebSocket). We keep `mpesaCustomer` state here to track customer info
	// if the PaymentModal needs it for the final sale.
  
  const handleCashPay = () => {
    const cashAmount = parseFloat(cashInputValue);
    if (!isNaN(cashAmount) && cashAmount > 0) {
        const amountToPay = Math.min(cashAmount, remaining);
        const newPaidAmount = paidAmount + amountToPay;
        setPaidAmount(newPaidAmount);
        setPaymentMethods(prev => [...prev, { method: 'Cash', amount: amountToPay }]);
        setCashInputValue('');

        if(newPaidAmount >= total) {
            setStatus(PaymentStatus.SUCCESS);
            setMessage('Payment complete!');
             // Auto-complete sale for cash payments
             let customerDetails: { id?: number; name: string; phone?: string };
             if (assignedCustomer) {
               customerDetails = { id: assignedCustomer.id, name: assignedCustomer.name, phone: assignedCustomer.phone };
             } else if (mpesaCustomer) {
               customerDetails = { name: mpesaCustomer.name, phone: mpesaCustomer.phone };
             } else {
               customerDetails = { name: 'Walk-in Customer' };
             }
             onSaleComplete([...paymentMethods, { method: 'Cash', amount: amountToPay }], customerDetails);
        }
    }
  };
  
  const renderContent = () => {
    if (status === PaymentStatus.SUCCESS) {
      return (
        <div className="p-4">
            <div className="text-center">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-2xl font-bold mt-4 text-green-400">Payment Complete!</h3>
            </div>
            
            <div className="text-left bg-gray-900/50 p-4 rounded-lg my-6 space-y-2">
                <h4 className="font-semibold text-gray-300 mb-2 border-b border-gray-600 pb-2">Payment Summary</h4>
                {paymentMethods.map((pm, index) => (
                    <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-400">Paid via {pm.method}:</span>
                        <span className="font-semibold text-white">KES {pm.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                ))}
                <div className="flex justify-between text-base font-bold border-t border-gray-600 pt-2 mt-2">
                    <span className="text-gray-200">Total Paid:</span>
                    <span className="text-green-400">KES {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            <button
              onClick={handleFinishSale}
              className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Finish Sale
            </button>
        </div>
      );
    }

    return (
        <>
            <h2 className="text-2xl font-bold text-center text-white mb-2">Payment</h2>
            <div className="text-center mb-6 bg-gray-900/50 p-4 rounded-lg">
                <div className="flex justify-between items-baseline">
                    <p className="text-gray-400">Total Due</p>
                    <p className="text-2xl font-bold text-white">KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                    <p className="text-gray-400">Amount Paid</p>
                    <p className="text-lg font-semibold text-gray-300">- KES {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <hr className="border-gray-600 my-2"/>
                <div className="flex justify-between items-baseline mt-1">
                    <p className="text-lg font-bold text-emerald-400">Remaining</p>
                    <p className="text-3xl font-bold text-emerald-400">KES {remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
            </div>
            
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 text-center">Select Payment Method</h3>
                 <div className="flex gap-2">
                    <input 
                        type="number"
                        value={cashInputValue}
                        onChange={(e) => setCashInputValue(e.target.value)}
                        placeholder={`Enter cash amount`}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        disabled={remaining <= 0}
                    />
                    <button onClick={handleCashPay} disabled={remaining <= 0} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors whitespace-nowrap disabled:bg-gray-600">
                        <CashIcon className="w-6 h-6" /> Pay Cash
                    </button>
                </div>
                 <button onClick={handleMpesaClick} disabled={remaining <= 0} className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-600">
				 <MpesaIcon className="w-12 h-6" />
				 Pay with Mpesa
                 </button>
            </div>
            {/* FIX: Removed redundant `status !== PaymentStatus.SUCCESS` check. TypeScript's control flow analysis ensures this part of the code is only reached if status is not SUCCESS. */}
            {message && (
                <p className={`text-center mt-4 text-sm ${status === PaymentStatus.FAILED ? 'text-red-400' : 'text-yellow-400'}`}>{message}</p>
            )}
        </>
    );
  }

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md relative">
        {/* FIX: Rewrote the check to use a standard logical OR to avoid a TypeScript type narrowing issue. */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white" disabled={status === PaymentStatus.PENDING || status === PaymentStatus.SUCCESS}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        {renderContent()}
      </div>
    </div>
	{showMpesaModal && (
		<MpesaModal
			isOpen={showMpesaModal}
			onClose={() => setShowMpesaModal(false)}
			onInitiate={(name: string, phone: string) => setMpesaCustomer({ name, phone })}
			onPaymentSuccess={(amt: number) => handleMpesaSuccess({ amount: amt })}
			amount={remaining}
		/>
	)}
    </>
  );
};

export default PaymentModal;