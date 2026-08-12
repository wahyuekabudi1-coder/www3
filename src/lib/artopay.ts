import ArtoPay from '@arto-pay/js-sdk';

export interface ArtoPayPaymentParams {
  orderId: string;
  amount: number;
  currency?: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
  onSuccess?: (res: any) => void;
  onPending?: (res: any) => void;
  onError?: (err: any) => void;
}

export interface PaymentIntentResponse {
  success?: boolean;
  id: string;
  paymentId?: string;
  secret?: string;
  clientSecret?: string;
  checkoutUrl?: string;
  publicKey?: string;
  orderId?: string;
  error?: string;
  details?: string;
}

/**
 * Trigger official ArtoPay payment flow.
 * 1. Requests payment intent from backend endpoint `/api/artopay/payment-intent`.
 * 2. If backend returns checkoutUrl, redirects user directly.
 * 3. Otherwise initializes ArtoPay SDK and calls ArtoPay.openPayment().
 */
export async function processArtoPayPayment({
  orderId,
  amount,
  currency = 'IDR',
  description,
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  metadata,
  onSuccess,
  onPending,
  onError,
}: ArtoPayPaymentParams) {
  try {
    if (!orderId) {
      throw new Error('Order ID is required for payment processing.');
    }

    const validAmount = Number(amount);
    if (!validAmount || isNaN(validAmount) || validAmount <= 0) {
      throw new Error('Amount must be a valid number greater than 0.');
    }

    console.log(`[ArtoPay] Requesting payment intent for order: ${orderId}, amount: IDR ${validAmount}`);

    // Step 1: Call backend API to create official ArtoPay Payment Intent
    const response = await fetch('/api/artopay/payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: String(orderId),
        amount: validAmount,
        currency,
        description: description || `Payment for order ${orderId}`,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        metadata,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errorMsg = errorJson.error || `Failed to create payment intent (${response.status})`;
      console.error('[ArtoPay Gateway Error]', errorMsg);
      if (onError) onError({ message: errorMsg, details: errorJson.details });
      throw new Error(errorMsg);
    }

    const data: PaymentIntentResponse = await response.json();
    console.log('[ArtoPay Gateway] Payment Intent created:', data);

    // Step 2: If hosted checkout URL is returned, redirect user directly
    if (data.checkoutUrl) {
      console.log('[ArtoPay] Redirecting to hosted gateway URL:', data.checkoutUrl);
      window.location.href = data.checkoutUrl;
      return data;
    }

    // Step 3: Extract paymentId, secret, and publicKey
    const paymentId = data.id || data.paymentId;
    const secret = data.secret || data.clientSecret;
    const publicKey = data.publicKey || (import.meta as any).env?.VITE_ARTOPAY_PUBLIC_KEY || '';

    if (!paymentId || !secret) {
      const msg = 'Gateway did not return paymentId or secret.';
      if (onError) onError({ message: msg });
      throw new Error(msg);
    }

    // Initialize ArtoPay SDK
    const artoPayInstance = (ArtoPay as any)?.default || ArtoPay;
    if (typeof artoPayInstance?.init === 'function') {
      artoPayInstance.init({ publicKey });
    }

    // Open Payment via Official SDK
    if (typeof artoPayInstance?.openPayment === 'function') {
      artoPayInstance.openPayment({
        paymentId,
        secret,
        publicKey,
        onSuccess: (res: any) => {
          console.log('[ArtoPay] Payment Success Event:', res);
          if (onSuccess) onSuccess(res);
        },
        onPending: (res: any) => {
          console.log('[ArtoPay] Payment Pending Event:', res);
          if (onPending) onPending(res);
        },
        onError: (res: any) => {
          console.error('[ArtoPay] Payment Error Event:', res);
          if (onError) onError(res);
        },
      });
    } else {
      const msg = 'ArtoPay SDK openPayment is not available.';
      if (onError) onError({ message: msg });
      throw new Error(msg);
    }

    return data;
  } catch (error: any) {
    console.error('[ArtoPay Process Exception]:', error);
    if (onError) {
      onError({ message: error.message || 'Gagal memproses pembayaran ArtoPay.' });
    }
    throw error;
  }
}
