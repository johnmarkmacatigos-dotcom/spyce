// ============================================================
// SPYCE - usePi Hook v2
// FIXED: purchaseItem properly handles marketplace Pi payment
// FIXED: tipCreator flow with correct memo
// FILE: frontend/src/hooks/usePi.js
// ============================================================
import { useCallback } from 'react';
import { useAuthStore } from '../utils/store';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function usePi() {
  const { user } = useAuthStore();

  // ── Authenticate with Pi ────────────────────────────────────
  const authenticateWithPi = useCallback(async () => {
    if (!window.Pi) throw new Error('Pi Browser required');

    return new Promise((resolve, reject) => {
      window.Pi.authenticate(
        ['username', 'payments'],
        async (payment) => {
          // Incomplete payment handler
          try {
            await api.post('/payments/approve', { paymentId: payment.identifier });
            await api.post('/payments/complete', { paymentId: payment.identifier, txid: payment.transaction?.txid });
          } catch (err) {
            console.error('Incomplete payment handling error:', err);
          }
        }
      ).then(authResult => {
        resolve(authResult);
      }).catch(reject);
    });
  }, []);

  // ── Tip a Creator ──────────────────────────────────────────
  const tipCreator = useCallback(async (amount, creatorId, videoId) => {
    if (!window.Pi) {
      toast.error('Open in Pi Browser to tip');
      return null;
    }
    if (!amount || amount <= 0) {
      toast.error('Invalid tip amount');
      return null;
    }

    return new Promise((resolve, reject) => {
      const paymentData = {
        amount: parseFloat(amount),
        memo: `SPYCE tip — ${amount}π to creator`,
        metadata: {
          type: 'tip',
          creatorId,
          videoId,
          tipperId: user?._id,
        },
      };

      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          try {
            await api.post('/payments/approve', {
              paymentId,
              type: 'tip',
              creatorId,
              videoId,
              amount,
            });
          } catch (err) {
            console.error('Approval error:', err);
            reject(err);
          }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          try {
            const { data } = await api.post('/payments/complete', {
              paymentId,
              txid,
              type: 'tip',
              creatorId,
              videoId,
              amount,
            });
            resolve(data);
          } catch (err) {
            console.error('Completion error:', err);
            reject(err);
          }
        },
        onCancel: (paymentId) => {
          toast('Tip cancelled', { icon: '↩️' });
          resolve(null);
        },
        onError: (error, payment) => {
          console.error('Pi payment error:', error, payment);
          toast.error('Payment failed: ' + (error?.message || 'Unknown error'));
          reject(error);
        },
      };

      window.Pi.createPayment(paymentData, callbacks);
    });
  }, [user]);

  // ── Purchase Marketplace Item ──────────────────────────────
  const purchaseItem = useCallback(async (listing) => {
    if (!window.Pi) {
      toast.error('Open in Pi Browser to purchase');
      return null;
    }
    if (!listing || !listing.price) {
      toast.error('Invalid listing');
      return null;
    }
    if (listing.stock === 0) {
      toast.error('This item is out of stock');
      return null;
    }

    return new Promise((resolve, reject) => {
      // Platform takes 5% fee
      const platformFee = Math.round(listing.price * 0.05 * 100) / 100;
      const sellerAmount = Math.round((listing.price - platformFee) * 100) / 100;

      const paymentData = {
        amount: parseFloat(listing.price),
        memo: `SPYCE purchase — ${listing.title}`,
        metadata: {
          type: 'marketplace',
          listingId: listing._id,
          sellerId: listing.seller?._id || listing.seller,
          buyerId: user?._id,
          price: listing.price,
          title: listing.title,
        },
      };

      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          try {
            await api.post('/payments/approve', {
              paymentId,
              type: 'marketplace',
              listingId: listing._id,
              amount: listing.price,
            });
          } catch (err) {
            console.error('Purchase approval error:', err);
            reject(new Error('Payment approval failed'));
          }
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          try {
            const { data } = await api.post('/payments/complete', {
              paymentId,
              txid,
              type: 'marketplace',
              listingId: listing._id,
              amount: listing.price,
            });
            resolve(data);
          } catch (err) {
            console.error('Purchase completion error:', err);
            reject(new Error('Payment completion failed'));
          }
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
