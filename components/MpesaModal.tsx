
import React, { useState, useEffect } from 'react';
import { PAYMENT_API_URL } from '../constants';
import { PaymentStatus } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface MpesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onInitiate notifies parent of the customer details used to start the STK
  onInitiate?: (name: string, phone: string) => void;
  // onPaymentSuccess receives the confirmed amount and optional transaction id
  onPaymentSuccess: (payload: { amount: number; transaction_id?: string }) => void;
  amount: number;
}

export const MpesaModal = ({ isOpen, onClose, onPaymentSuccess, amount, onInitiate }: MpesaModalProps) => {
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.PENDING_INPUT);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedAmount, setConfirmedAmount] = useState<number>(amount);

  useEffect(() => {
    if (isOpen) {
      setStatus(PaymentStatus.PENDING_INPUT);
      setErrorMessage('');
      setConfirmedAmount(amount);
    }
  }, [isOpen, amount]);

  const handleFinish = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = Number(confirmedAmount) || 0;
    if (amt <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }
    // Record payment as M-Pesa by calling backend so it persists and returns transaction id
    setStatus(PaymentStatus.PENDING_INPUT);
    (async () => {
      try {
        const resp = await fetch(PAYMENT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '', amount: amt })
        });
        const data = await resp.json();
        // Backend returns transaction_id when saved locally
        const txId = data.transaction_id || data.checkout_request_id || null;
        setStatus(PaymentStatus.SUCCESS);
        onPaymentSuccess({ amount: amt, transaction_id: txId });
      } catch (err: any) {
        setStatus(PaymentStatus.FAILED);
        setErrorMessage(err?.message || 'Failed to record payment');
      } finally {
        onClose();
      }
    })();
  };

  const handleTryAgain = () => {
    setStatus(PaymentStatus.PENDING_INPUT);
    setErrorMessage('');
  };
  
  if (!isOpen) return null;

  const renderContent = () => {
    switch (status) {
      case PaymentStatus.PENDING_INPUT:
        return (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Record M-Pesa Payment</h3>
            <p className="text-gray-600 mb-6">Confirm amount received (default shown). No phone number required.</p>
            <form onSubmit={handleFinish}>
              <div className="relative mb-4">
                <input
                  type="number"
                  id="mpesaAmount"
                  value={confirmedAmount}
                  onChange={(e) => setConfirmedAmount(parseFloat(e.target.value || '0'))}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
                  placeholder={`Amount (KES)`}
                  autoFocus
                />
              </div>
              {errorMessage && <p className="text-sm text-red-500 mb-2">{errorMessage}</p>}
              <button
                type="submit"
                className="w-full text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
              >
                Record Mpesa Payment & Print Receipt (Ksh {Number(confirmedAmount).toLocaleString()})
              </button>
            </form>
          </>
        );
      case PaymentStatus.SUCCESS:
        return (
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">The payment has been confirmed.</p>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Confirm amount received (KES)</label>
              <input
                type="number"
                step="0.01"
                value={confirmedAmount}
                onChange={(e) => setConfirmedAmount(parseFloat(e.target.value || '0'))}
                className="w-full px-3 py-2 rounded-md border border-gray-300 text-gray-900"
              />
            </div>
            <button onClick={handleFinish} className="w-full text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-5 py-3">
              Record Mpesa Payment & Print Receipt
            </button>
          </div>
        );
      case PaymentStatus.FAILED:
        return (
          <div className="text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h3>
            <p className="text-gray-600 bg-red-50 p-3 rounded-md mb-6">{errorMessage}</p>
            <button onClick={handleTryAgain} className="w-full text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-sm px-5 py-3">
              Try Again
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        {renderContent()}
      </div>
    </div>
  );
};


export default MpesaModal;