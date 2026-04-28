// ============================================================
// SPYCE - usePi Hook v3
// FIXED: onReadyForServerApproval fires and returns fast
// FIXED: No await chains that delay Pi SDK callbacks
// FILE: frontend/src/hooks/usePi.js
// ============================================================
import { useCallback } from 'react';
import { useAuthStore } from '../utils/store';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function usePi() {
  const { user } = useAuthStore();

  const authenticateWithPi = useCallback(async () => {
    if (!window.Pi) throw new Error('Pi Browser required');
    return window.Pi.authenticate(
      ['username', 'payments'],
      async (payment) => {
        try {
          await api.post('/payments/approve', { paymentId: payment.identifier });
          await api.post('/payments/complete', {
            paymentId: payment.identifier,
            txid: payment.transaction?.txid,
          });
        } catch (e) { console.warn('Incomplete payment:', e.message); }
      }
    );
  }, []);

  // ── Tip a creator ─────────────────────────────────────────
  const tipCreator = useCallback(async (amount, creatorId, videoId) => {
    if (!window.Pi) { toast.error('Open in Pi Browser to tip'); return null; }
    if (!amount || amount <= 0) { toast.error('Invalid tip amount'); return null; }

    return new Promise((resolve, reject) => {
      const paymentData = {
        amount: parseFloat(amount),
        memo: `SPYCE tip ${amount}π`,
        metadata: { type: 'tip', creatorId, videoId, tipperId: user?._id },
      };

      const callbacks = {
        // ── MUST be fast — Pi expires if this takes > ~10s ──
        onReadyForServerApproval: (paymentId) => {
          // Fire and forget — don't await, just send
          api.post('/payments/approve', {
            paymentId, type: 'tip', creatorId, videoId, amount,
          }).catch(e => console.error('Approve error:', e.message));
          // Return immediately — Pi SDK continues
        },

        onReadyForServerCompletion: (paymentId, txid) => {
          // Fire and forget — don't await
          api.post('/payments/complete', {
            paymentId, txid, type: 'tip', creatorId, videoId, amount,
          })
            .then(({ data }) => resolve(data))
            .catch(e => {
              console.error('Complete error:', e.message);
              resolve({ success: true, txid }); // resolve anyway — tx is on blockchain
            });
        },

        onCancel: () => {
          toast('Tip cancelled', { icon: '↩️' });
          resolve(null);
        },

        onError: (error) => {
          const msg = error?.message || 'Payment error';
          toast.error(msg);
          reject(new Error(msg));
        },
      };

      window.Pi.createPayment(paymentData, callbacks);
    });
  }, [user]);

  // ── Purchase marketplace item ─────────────────────────────
  const purchaseItem = useCallback(async (listing) => {
    if (!window.Pi) { toast.error('Open in Pi Browser to purchase'); return null; }
    if (!listing?.price) { toast.error('Invalid listing'); return null; }
    if (listing.stock === 0) { toast.error('Out of stock'); return null; }

    return new Promise((resolve, reject) => {
      const paymentData = {
        amount: parseFloat(listing.price),
        memo: `SPYCE buy: ${listing.title}`,
        metadata: {
          type: 'marketplace',
          listingId: listing._id,
          sellerId: listing.seller?._id || listing.seller,
          buyerId: user?._id,
          price: listing.price,
        },
      };

      const callbacks = {
        onReadyForServerApproval: (paymentId) => {
          // Fire and forget — respond instantly to Pi
          api.post('/payments/approve', {
            paymentId, type: 'marketplace',
            listingId: listing._id, amount: listing.price,
          }).catch(e => console.error('Approve error:', e.message));
        },

        onReadyForServerCompletion: (paymentId, txid) => {
          api.post('/payments/complete', {
            paymentId, txid, type: 'marketplace',
            listingId: listing._id, amount: listing.price,
          })
            .then(({ data }) => resolve(data))
            .catch(e => {
              console.error('Complete error:', e.message);
              resolve({ success: true, txid });
            });
        },

        onCancel: () => {
          toast('Purchase cancelled', { icon: '↩️' });
          resolve(null);
        },

        onError: (error) => {
          const msg = error?.message || 'Payment failed';
          toast.error(msg);
          reject(new Error(msg));
        },
      };

      window.Pi.createPayment(paymentData, callbacks);
    });
  }, [user]);

  return { authenticateWithPi, tipCreator, purchaseItem };
}
