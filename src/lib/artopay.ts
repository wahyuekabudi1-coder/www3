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
  onError?: (res: any) => void;
}

export interface PaymentIntentResponse {
  success?: boolean;
  id: string;
  paymentId?: string;
  secret?: string;
  clientSecret?: string;
  customerToken?: string;
  checkoutUrl?: string;
  publicKey?: string;
  orderId: string;
  error?: string;
  details?: string;
}

/**
 * Trigger official ArtoPay payment flow.
 * 1. Requests payment intent from backend endpoint `/api/artopay/payment-intent`.
 * 2. If backend returns hosted checkout URL, redirects immediately.
 * 3. Otherwise opens ArtoPay SDK modal using customerToken/clientSecret.
 * 4. Reports error on any failure without generating fake payments.
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
        metadata
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

    const dataAny = data as any;
    const checkoutUrl = data.checkoutUrl || dataAny.checkout_url || dataAny.paymentUrl || dataAny.payment_url || dataAny.redirectUrl || dataAny.redirect_url;

    // Step 2: If hosted checkout URL is returned by ArtoPay, redirect user directly
    if (checkoutUrl) {
      console.log('[ArtoPay] Redirecting to hosted gateway URL:', checkoutUrl);
      window.location.href = checkoutUrl;
      return data;
    }

    // Step 3: Use official JS SDK if customerToken or clientSecret/secret is present
    const customerToken = data.customerToken || dataAny.customer_token;
    const secret = data.secret || data.clientSecret || dataAny.secret || dataAny.client_secret;
    const paymentId = data.id || data.paymentId || dataAny.payment_id;
    const publicKey = data.publicKey || (import.meta as any).env?.VITE_ARTOPAY_PUBLIC_KEY || '';

    if (!customerToken && !secret && !paymentId) {
      const msg = 'Gateway did not return checkout token or checkout URL.';
      if (onError) onError({ message: msg });
      throw new Error(msg);
    }

    // Load JS SDK script if missing
    let scriptEl = document.getElementById('arto-pay-sdk-script') as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'arto-pay-sdk-script';
      scriptEl.src = 'https://unpkg.com/@arto-pay/js-sdk@1.0.3/dist/arto-pay-sdk.umd.js';
      document.head.appendChild(scriptEl);
    }
    if (publicKey) {
      scriptEl.setAttribute('data-client-key', publicKey);
    }

    let opened = false;

    try {
      if (ArtoPay && typeof ArtoPay.openPayment === 'function') {
        ArtoPay.openPayment({
          token: customerToken,
          secret: secret,
          clientSecret: secret,
          paymentId: paymentId,
          orderId: String(orderId),
          publicKey: publicKey,
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
        } as any);
        opened = true;
      }
    } catch (sdkError) {
      console.warn('[ArtoPay SDK openPayment Exception]:', sdkError);
    }

    if (!opened) {
      const globalArtoPay = (window as any).ArtoPay;
      if (globalArtoPay && typeof globalArtoPay.openPayment === 'function') {
        try {
          globalArtoPay.openPayment({
            token: customerToken,
            secret: secret,
            clientSecret: secret,
            paymentId: paymentId,
            orderId: String(orderId),
            publicKey: publicKey,
            onSuccess: (res: any) => { if (onSuccess) onSuccess(res); },
            onPending: (res: any) => { if (onPending) onPending(res); },
            onError: (res: any) => { if (onError) onError(res); }
          });
          opened = true;
        } catch (e) {
          console.error('[ArtoPay Global SDK Error]:', e);
        }
      }
    }

    if (!opened) {
      const err = new Error('Gagal membuka ArtoPay SDK. Silakan periksa koneksi internet Anda atau coba lagi.');
      if (onError) onError({ message: err.message });
      throw err;
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
