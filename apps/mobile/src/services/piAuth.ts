/**
 * Pi Network Authentication & Payment Service
 *
 * This follows the OFFICIAL Pi Network quickstart guide exactly:
 * https://develop.pinet.com (accessed via Pi Browser)
 *
 * KEY FACTS from official Pi docs:
 * - Pi SDK is loaded via <script src="https://sdk.minepi.com/pi-sdk.js">
 * - In React Native / Expo, we import @pinetwork-js/sdk instead
 * - Pi.init({ version: "2.0", sandbox: true/false })
 * - Scopes: ['payments', 'username'] — these are the two you need
 * - The API Key from the portal is used server-side in Authorization: Key {key}
 * - sandbox: true  → Pi Testnet (for development, no real Pi spent)
 * - sandbox: false → Pi Mainnet (for production, real Pi)
 *
 * ⚠️  UPDATE: Set EXPO_PUBLIC_PI_API_KEY in apps/mobile/.env
 *             Copy your API Key from Pi Developer Portal dashboard
 */

import * as SecureStore from 'expo-secure-store';
import { apiPost, API_BASE } from './api';

let piSdkInitialized = false;

/**
 * Initialize Pi SDK — call once at app startup (in app/_layout.tsx)
 *
 * sandbox: __DEV__ means:
 *   - During development (npm start): sandbox=true → Pi Testnet
 *   - In production build (eas build): sandbox=false → Pi Mainnet
 */
export async function initializePiSDK() {
  if (piSdkInitialized) return;
  try {
    const Pi = await import('@pinetwork-js/minesdk').then((m) => m.default);
    await Pi.init({
      version: '2.0',
      sandbox: __DEV__, // true in dev (testnet), false in production (mainnet)
    });
    piSdkInitialized = true;
    console.log('Pi SDK initialized, sandbox:', __DEV__);
  } catch (err) {
    // This is expected when running outside Pi Browser
    console.warn('Pi SDK init failed — run inside Pi Browser for full functionality:', err);
  }
}

/**
 * Authenticate with Pi Network
 *
 * From official Pi docs:
 *   const scopes = ['payments', 'username'];
 *   Pi.authenticate(scopes, onIncompletePaymentFound)
 *     .then(auth => { const accessToken = auth.accessToken; })
 *
 * After getting the accessToken, we send it to our backend which verifies
 * it with Pi's API (GET https://api.minepi.com/v2/me) and issues a SPYCE JWT.
 */
export async function authenticateWithPi(): Promise<{
  jwt: string;
  refreshToken: string;
  user: any;
}> {
  const Pi = await import('@pinetwork-js/minesdk').then((m) => m.default);

  // Official Pi scopes — 'payments' allows payment requests, 'username' gets Pi username
  const scopes = ['payments', 'username'];

  const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);

  // Exchange Pi access token for our SPYCE JWT
  const result = await apiPost('/auth/pi', {
    pi_access_token: auth.accessToken,
    pi_uid: auth.user.uid,
  });

  // Store JWT for subsequent API calls
  await SecureStore.setItemAsync('spyce_jwt', result.jwt);
  if (result.refreshToken) {
    await SecureStore.setItemAsync('spyce_refresh', result.refreshToken);
  }

  return result;
}

/**
 * Handle incomplete/pending payments found during auth
 *
 * From official Pi docs:
 *   function onIncompletePaymentFound(payment) {
 *     paymentId = payment.identifier
 *     txid = payment.transaction.txid
 *     // post to your server to complete or cancel
 *   }
 *
 * This is REQUIRED by Pi SDK — you must handle it.
 */
async function onIncompletePaymentFound(payment: any) {
  console.log('Incomplete payment found:', payment.identifier);
  try {
    // Try to complete any payment that was approved but not completed
    if (payment.transaction?.txid) {
      await apiPost('/payments/complete', {
        paymentId: payment.identifier,
        txid: payment.transaction.txid,
        metadata: payment.metadata || {},
      });
    }
  } catch (err) {
    console.error('Could not resolve incomplete payment:', err);
  }
}

/**
 * Create a Pi payment — follows the 4-step official flow:
 *
 * Step 8a (official docs): Pi.createPayment(paymentData, callbacks)
 * Step 8b: onReadyForServerApproval → POST /payments/approve to your server
 * Step 8c: Pi Browser shows payment to user, user signs
 * Step 8d: onReadyForServerCompletion → POST /payments/complete to your server
 *
 * @param amount  Amount in Pi (NOT micro-Pi). E.g. 0.01 for 0.01 Pi
 * @param memo    Short description shown to user in Pi payment dialog
 * @param metadata  Any extra data you want attached (for your server)
 */
export async function payWithPi(intent: {
  amount: number;
  memo: string;
  metadata: Record<string, any>;
}): Promise<{ success: boolean; paymentId?: string; txid?: string }> {
  const Pi = await import('@pinetwork-js/minesdk').then((m) => m.default);

  return new Promise((resolve, reject) => {
    // From official docs: paymentData and paymentCallbacks
    const paymentData = {
      amount: intent.amount,     // Pi amount (number)
      memo: intent.memo,         // shown to user
      metadata: intent.metadata, // your custom data
    };

    const paymentCallbacks = {
      // Step 8b: payment ID is ready — tell your server to approve
      onReadyForServerApproval: async (paymentId: string) => {
        console.log('onReadyForServerApproval', paymentId);
        try {
          await apiPost('/payments/approve', { paymentId });
        } catch (err) {
          reject(err);
        }
      },

      // Step 8d: blockchain tx submitted — tell your server to complete
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        console.log('onReadyForServerCompletion', paymentId, txid);
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

      // User cancelled the payment in Pi Browser
      onCancel: (paymentId: string) => {
        console.log('Payment cancelled by user:', paymentId);
        resolve({ success: false, paymentId });
      },

      // Something went wrong
      onError: (error: any, payment?: any) => {
        console.error('Pi payment error:', error);
        reject(error);
      },
    };

    Pi.createPayment(paymentData, paymentCallbacks).catch(reject);
  });
}
