
import { useEffect, useRef, useCallback } from 'react';
import { WEBSOCKET_URL, PAYMENT_API_URL } from '../constants';
import type { MpesaPaymentUpdate } from '../types';

/**
 * Initiates an M-Pesa STK push request.
 * @param customerName - The name of the customer.
 * @param phoneNumber - The customer's phone number in any format.
 * @param amount - The total amount to be charged.
 * @returns A promise that resolves with the response from the payment processing backend.
 */
export const initiatePayment = async (
  customerName: string,
  phoneNumber: string,
  amount: number
) => {
  try {
    const response = await fetch(PAYMENT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerName, phoneNumber, amount }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Payment initiation failed.');
    }

    return await response.json();
  } catch (error) {
    console.error('Error initiating M-Pesa payment:', error);
    throw error;
  }
};

/**
 * Custom hook to manage a WebSocket connection for M-Pesa payment updates.
 * @param onPaymentUpdate - Callback function to be invoked when a payment update is received.
 */
export const useMpesaWebSocket = (
  onPaymentUpdate: (data: MpesaPaymentUpdate) => void
) => {
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected.');
      return;
    }

    // Ensure WEBSOCKET_URL has no trailing slash and log where we're connecting
    const wsUrl = (WEBSOCKET_URL || '').replace(/\/+$/,'');
    console.log('Connecting WebSocket to', wsUrl);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connection established for M-Pesa updates.');
    };

    socket.onmessage = (event) => {
      try {
        const data: MpesaPaymentUpdate = JSON.parse(event.data);
        console.log('Received payment update:', data);
        onPaymentUpdate(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error. This usually means the WebSocket server is not running or accessible. See the browser\'s network console for more details.', error);
    };

    socket.onclose = (event) => {
      console.log(`WebSocket connection closed: Code=${event.code}, Reason='${event.reason}', Clean=${event.wasClean}`);
      // Optional: implement reconnection logic here
    };
  }, [onPaymentUpdate]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    // This hook manages the connection lifecycle.
    // Call connect() when you want to start listening, e.g., when the payment modal opens.
    // Call disconnect() when you're done, e.g., when the modal closes.
    return () => {
      // Cleanup on unmount
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect };
};