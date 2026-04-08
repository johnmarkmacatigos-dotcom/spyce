// ============================================================
// SPYCE - Pi Network Hook
// Wraps all Pi SDK calls in a clean React hook
// ============================================================
import { useCallback } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../utils/store';
import toast from 'react-hot-toast';

export const usePi = () => {
  const { setAuth, logout } = useAuthStore();

  /**
   * Authenticate with Pi Network
   * Call this when user taps "Sign in with Pi"
   */
  const authenticateWithPi = useCallback(async (referralCode = null) => {
    const Pi = window.Pi;

    if (!Pi) {
      toast.error('Please open SPYCE in the Pi Browser');
      return null;
    }

    try {
      // Request username + payments scopes
      const scopes = ['username', 'payments'];

      // Handle incomplete payments found during auth
      const onIncompletePaymentFound = async (payment) => {
        try {
          await api.post('/payments/incomplete', { payment });
        } catch (err) {
          console.error('Incomplete payment handling error:', err);
        }
      };

      const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);

      // CRITICAL: Verify with our backend (prevents spoofing)
      const { data } = await api.post('/auth/pi', {
        accessToken: auth.accessToken,
        username: auth.user.username,
        referralCode,
      });

      setAuth(data.user, data.token);

      if (data.isNewUser) {
        toast.success(`Welcome to SPYCE, @${data.user.piUsername}! 🌶️`);
      } else {
        toast.success(`Welcome back, @${data.user.piUsername}!`);
      }

      return data.user;
    } catch (err) {
      console.error('Pi auth error:', err);
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      toast.error(msg);
      return null;
    }
  }, [setAuth]);

  /**
   * Create a Pi Payment
   * type: 'tip' | 'marketplace' | 'challenge_reward'
   */
  const createPiPayment = useCallback(async ({
    amount,
    memo,
    type,
    toUserId,
    referenceId,
    referenceType,
    metadata = {},
  }) => {
    const Pi = window.Pi;

    if (!Pi) {
      toast.error('Please open SPYCE in the Pi Browser');
      return null;
    }

    return new Promise((resolve, reject) => {
      const paymentData = {
        amount,
        memo,
        metadata: { type, referenceId, ...metadata },
      };

      const paymentCallbacks = {
        // Step 1: SDK ready, approve on our server
        onReadyForServerApproval: async (paymentId) => {
          try {
            await api.post('/payments/approve', {
              paymentId,
              type,
              referenceId,
              referenceType,
              amount,
              toUserId,
              memo,
            });
          } catch (err) {
            console.error('Approval failed:', err);
            toast.error('Payment approval failed');
            reject(err);
          }
        },

        // Step 2: Blockchain confirmed, complete on our server
        onReadyForServerCompletion: async (paymentId, txid) => {
          try {
            const { data } = await api.post('/payments/complete', { paymentId, txid });
            toast.success('Payment completed! 🎉');
            resolve({ paymentId, txid, ...data });
          } catch (err) {
            console.error('Completion failed:', err);
            toast.error('Payment completion failed');
            reject(err);
          }
        },

        // Cancelled by user
        onCancel: (paymentId) => {
          toast('Payment cancelled', { icon: '↩️' });
          resolve(null);
        },

        // Error
        onError: (error, payment) => {
          console.error('Pi payment error:', error, payment);
          toast.error('Payment error. Please try again.');
          reject(error);
        },
      };

      Pi.createPayment(paymentData, paymentCallbacks)
        .catch(reject);
    });
  }, []);

  /**
   * Tip a creator
   */
  const tipCreator = useCallback(async (amount, creatorId, videoId) => {
    return createPiPayment({
      amount,
      memo: `Tip on SPYCE 🌶️`,
      type: 'tip',
      toUserId: creatorId,
      referenceId: videoId,
      referenceType: 'Video',
    });
  }, [createPiPayment]);

  /**
   * Purchase marketplace item
   */
  const purchaseItem = useCallback(async (listing) => {
    return createPiPayment({
      amount: listing.price,
      memo: `Purchase: ${listing.title}`,
      type: 'marketplace',
      toUserId: listing.seller._id,
      referenceId: listing._id,
      referenceType: 'Listing',
      metadata: { listingTitle: listing.title },
    });
  }, [createPiPayment]);

  return {
    authenticateWithPi,
    createPiPayment,
    tipCreator,
    purchaseItem,
  };
};
