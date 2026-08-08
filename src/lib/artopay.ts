import ArtoPay from '@arto-pay/js-sdk';

export interface ArtoPayPaymentParams {
  orderId: string;
  amount: number;
  currency?: string;
  description?: string;
  customerId?: string;
  metadata?: Record<string, any>;
  onSuccess?: (res: any) => void;
  onPending?: (res: any) => void;
  onError?: (res: any) => void;
}

export interface PaymentIntentResponse {
  id: string;
  clientSecret: string;
  customerToken: string;
  publicKey?: string;
  orderId: string;
  sandbox: boolean;
  isDemo?: boolean;
  message?: string;
}

/**
 * Trigger ArtoPay SDK modal checkout flow.
 * Step 1: Requests clientSecret & customerToken from backend `/api/artopay/payment-intent`
 * Step 2: Configures and opens ArtoPay payment modal on frontend
 */
export async function processArtoPayPayment({
  orderId,
  amount,
  currency = 'IDR',
  description,
  customerId,
  metadata,
  onSuccess,
  onPending,
  onError,
}: ArtoPayPaymentParams) {
  try {
    console.log(`[ArtoPay] Initializing payment intent for order: ${orderId}, amount: IDR ${amount}`);

    // 1. Fetch payment intent token from backend (protects Secret Key)
    const response = await fetch('/api/artopay/payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        amount: Math.round(amount),
        currency,
        description: description || `Payment for order ${orderId}`,
        customerId,
        metadata
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMessage = 'Failed to create ArtoPay payment intent';
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error) errMessage = parsed.error;
      } catch {
        // ignore parse error
      }
      throw new Error(errMessage);
    }

    const data: PaymentIntentResponse = await response.json();
    console.log('[ArtoPay] Payment Intent created successfully:', data);

    // 2. Global configuration & script element binding for ArtoPay SDK
    const isSandboxMode = data.sandbox !== false;
    const publicKey =
      data.publicKey ||
      (import.meta as any).env?.VITE_ARTOPAY_PUBLIC_KEY ||
      'pk_41cb9f2fd802ef417de4e82f8c32a80d356a02cdf32b52e68ad0';

    // Ensure SDK script tag exists and has data-client-key attribute
    let scriptEl = document.getElementById('arto-pay-sdk-script') as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'arto-pay-sdk-script';
      scriptEl.src = 'https://unpkg.com/@arto-pay/js-sdk@1.0.3/dist/arto-pay-sdk.umd.js';
      document.head.appendChild(scriptEl);
    }
    scriptEl.setAttribute('data-client-key', publicKey);
    scriptEl.setAttribute('data-sandbox', isSandboxMode ? 'true' : 'false');

    ArtoPay.configure({ sandbox: isSandboxMode });

    // 3. Launch ArtoPay modal
    try {
      ArtoPay.openPayment({
        token: data.customerToken,
        clientSecret: data.clientSecret,
        paymentId: data.id,
        orderId: data.orderId || orderId,
        publicKey: publicKey,
        sandbox: isSandboxMode,
        onSuccess: (res: any) => {
          console.log('[ArtoPay] Payment Success callback:', res);
          if (onSuccess) onSuccess(res);
        },
        onPending: (res: any) => {
          console.log('[ArtoPay] Payment Pending callback:', res);
          if (onPending) onPending(res);
        },
        onError: (res: any) => {
          console.error('[ArtoPay] Payment Error callback:', res);
          if (onError) onError(res);
        },
      } as any);
    } catch (sdkError: any) {
      if (sdkError.message && sdkError.message.includes('publicKey is required')) {
        console.warn('[ArtoPay] SDK evaluated document.currentScript before script load. Executing global ArtoPay or simulated modal flow.');
        const globalArtoPay = (window as any).ArtoPay;
        if (globalArtoPay && typeof globalArtoPay.openPayment === 'function') {
          globalArtoPay.openPayment({
            token: data.customerToken,
            clientSecret: data.clientSecret,
            paymentId: data.id,
            orderId: data.orderId || orderId,
            publicKey: publicKey,
            sandbox: isSandboxMode,
            onSuccess,
            onPending,
            onError
          });
          return data;
        }
      }
      throw sdkError;
    }

    return data;
  } catch (error: any) {
    console.error('[ArtoPay] Error in checkout initialization:', error);
    if (onError) {
      onError(error);
    } else {
      alert(`Payment Initialization Failed: ${error.message || 'Server connection error'}`);
    }
    throw error;
  }
}
