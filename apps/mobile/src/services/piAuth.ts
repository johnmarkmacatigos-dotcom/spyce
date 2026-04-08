import * as SecureStore from 'expo-secure-store';
import { apiPost, setAuthToken } from './api';

// ⚠️  UPDATE: Set EXPO_PUBLIC_PI_API_KEY in your .env file
// Obtain from: https://develop.pi  → My Apps → Create App → API Key

let piSdkInitialized = false;

/**
 * Initialize Pi SDK — call once at app startup
 * The SDK must run inside Pi Browser or Pi WebView
 */
export async function initializePiSDK() {
  if (piSdkInitialized) return;
  try {
    // Dynamic import so the app can load on non-Pi browsers during dev
    const Pi = await import('@pinetwork-js/sdk').then((m) => m.default);
    await Pi.init({
      version: '2.0',
      sandbox: __DEV__, // Use Pi testnet in development
    });
    piSdkInitialized = true;
  } catch (err) {
    console.warn('Pi SDK init failed (may not be in Pi Browser):', err);
  }
}

/**
 * Authenticate with Pi Network and exchange for SPYCE JWT
 */
export async function authenticateWithPi(): Promise<{
  jwt: string;
  refreshToken: string;
  user: any;
}> {
  const Pi = await import('@pinetwork-js/sdk').then((m) => m.default);

  const scopes = ['username', 'payments', 'wallet_address'];
  const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);

  // Exchange Pi token for SPYCE JWT
  const { jwt, refreshToken, user } = await apiPost('/auth/pi', {
    pi_access_token: authResult.accessToken,
    pi_uid: authResult.user.uid,
  });

  await setAuthToken(jwt);
  await SecureStore.setItemAsync('spyce_refresh', refreshToken);

  return { jwt, refreshToken, user };
}

/**
 * Handle incomplete Pi payments found during auth
 * This is a Pi SDK requirement — must be handled
 */
async function onIncompletePaymentFound(payment: any) {
  console.log('Incomplete payment found:', payment.identifier);
  try {
    await apiPost('/webhooks/pi-incomplete', {
      paymentId: payment.identifier,
    });
  } catch (err) {
    console.error('Failed to handle incomplete payment:', err);
  }
}

/**
 * Open Pi payment modal and handle the full flow
 */
export async function payWithPi(intent: {
  amount: number; // In Pi (not micro-Pi)
  memo: string;
  metadata: Record<string, any>;
}): Promise<{ success: boolean; paymentId?: string; txid?: string }> {
  const Pi = await import('@pinetwork-js/sdk').then((m) => m.default);

  return new Promise((resolve, reject) => {
    Pi.createPayment(
      {
        amount: intent.amount,
        memo: intent.memo,
        metadata: intent.metadata,
      },
      {
        onReadyForServerApproval: async (paymentId: string) => {
          try {
            await apiPost('/payments/approve', { paymentId });
          } catch (err) {
            reject(err);
          }
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          try {
            await apiPost('/payments/complete', {
              paymentId,
              txid,
              metadata: intent.metadata,
            });
            resolve({ success: true, paymentId, txid });
          } catch (err) {
            reject(err);
          }
        },
        onCancel: (paymentId: string) => {
          resolve({ success: false, paymentId });
        },
        onError: (error: any, payment?: any) => {
          reject(error);
        },
      },
    );
  });
}
