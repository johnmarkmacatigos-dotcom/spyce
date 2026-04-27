// ============================================================
// SPYCE - Pi Network Service v2
// FIXED: verifyPioneer handles errors gracefully
// FIXED: Timeout on Pi API calls so backend never hangs
// FILE: backend/src/services/piNetwork.js
// ============================================================
const axios = require('axios');

const PI_API_BASE = 'https://api.minepi.com';
const TIMEOUT_MS = 10000; // 10 second timeout

/**
 * Verify a Pioneer (user) by their access token
 * Calls Pi Network /v2/me endpoint
 */
const verifyPioneer = async (accessToken) => {
  try {
    const response = await axios.get(`${PI_API_BASE}/v2/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUT_MS,
    });

    const data = response.data;

    if (!data || !data.uid) {
      throw new Error('Invalid response from Pi Network — missing uid');
    }

    return {
      uid: data.uid,
      username: data.username,
    };
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error('Invalid or expired Pi access token');
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('Pi Network API timeout — try again');
    }
    if (err.response?.status === 403) {
      throw new Error('Pi Network access forbidden — check your Pi API key');
    }
    console.error('verifyPioneer error:', err.message);
    throw new Error('Pi Network verification failed: ' + (err.message || 'Unknown error'));
  }
};

/**
 * Get a payment by ID
 * Used during approve flow
 */
const getPayment = async (paymentId) => {
  try {
    const response = await axios.get(
      `${PI_API_BASE}/v2/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Key ${process.env.PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT_MS,
      }
    );
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      console.warn(`Payment ${paymentId} not found on Pi Network`);
      return null;
    }
    console.error('getPayment error:', err.message);
    return null; // Don't throw — let payment flow continue
  }
};

/**
 * Approve a payment
 * Must be called before Pi SDK calls onReadyForServerCompletion
 */
const approvePayment = async (paymentId) => {
  try {
    const response = await axios.post(
      `${PI_API_BASE}/v2/payments/${paymentId}/approve`,
      {},
      {
        headers: {
          Authorization: `Key ${process.env.PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT_MS,
      }
    );
    return response.data;
  } catch (err) {
    // Log but don't crash — Pi SDK may still proceed
    console.error('approvePayment error:', err.response?.data || err.message);
    // If already approved, that's fine
    if (err.response?.data?.error === 'already_approved') {
      return { status: 'already_approved' };
    }
    throw err;
  }
};

/**
 * Complete a payment
 * Must be called after blockchain transaction confirmed
 */
const completePayment = async (paymentId, txid) => {
  try {
    const response = await axios.post(
      `${PI_API_BASE}/v2/payments/${paymentId}/complete`,
      { txid },
      {
        headers: {
          Authorization: `Key ${process.env.PI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT_MS,
      }
    );
    return response.data;
  } catch (err) {
    console.error('completePayment error:', err.response?.data || err.message);
    // If already completed, treat as success
    if (err.response?.data?.error === 'already_completed') {
      return { status: 'already_completed' };
    }
    throw err;
  }
};

module.exports = {
  verifyPioneer,
  getPayment,
  approvePayment,
  completePayment,
};
