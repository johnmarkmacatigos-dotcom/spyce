// ============================================================
// SPYCE - Pi Network Payment Service
// ============================================================
const axios = require('axios');

const PI_API_BASE = process.env.PI_NETWORK_URL || 'https://api.minepi.com';
const PI_API_KEY = process.env.PI_API_KEY;

const piHeaders = {
  Authorization: `Key ${PI_API_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Verify a Pioneer's access token against Pi Network /me endpoint
 * CRITICAL: Always verify server-side to prevent spoofing
 */
const verifyPioneer = async (accessToken) => {
  try {
    const response = await axios.get(`${PI_API_BASE}/v2/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data; // Returns UserDTO: { uid, username }
  } catch (err) {
    console.error('Pi /me verification failed:', err.response?.data || err.message);
    throw new Error('Pi Network authentication failed');
  }
};

/**
 * Get payment info from Pi Network
 */
const getPayment = async (paymentId) => {
  try {
    const response = await axios.get(
      `${PI_API_BASE}/v2/payments/${paymentId}`,
      { headers: piHeaders }
    );
    return response.data;
  } catch (err) {
    console.error('Get payment error:', err.response?.data || err.message);
    throw new Error('Failed to fetch payment from Pi Network');
  }
};

/**
 * Approve a payment (server-side approval enables blockchain submission)
 * Called after onReadyForServerApproval callback from SDK
 */
const approvePayment = async (paymentId) => {
  try {
    const response = await axios.post(
      `${PI_API_BASE}/v2/payments/${paymentId}/approve`,
      null,
      { headers: piHeaders }
    );
    return response.data; // Returns PaymentDTO
  } catch (err) {
    console.error('Approve payment error:', err.response?.data || err.message);
    throw new Error('Failed to approve payment on Pi Network');
  }
};

/**
 * Complete a payment (final step — confirms to Pi Network txID received)
 * Called after onReadyForServerCompletion callback from SDK
 */
const completePayment = async (paymentId, txid) => {
  try {
    const response = await axios.post(
      `${PI_API_BASE}/v2/payments/${paymentId}/complete`,
      { txid },
      { headers: piHeaders }
    );
    return response.data; // Returns PaymentDTO
  } catch (err) {
    console.error('Complete payment error:', err.response?.data || err.message);
    throw new Error('Failed to complete payment on Pi Network');
  }
};

module.exports = { verifyPioneer, getPayment, approvePayment, completePayment };
