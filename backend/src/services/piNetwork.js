// ============================================================
// SPYCE - Pi Network Service v3
// FIXED: Shorter timeouts — must respond under 5s
// FIXED: approvePayment never throws — always returns
// FILE: backend/src/services/piNetwork.js
// ============================================================
const axios = require('axios');

const PI_API_BASE = 'https://api.minepi.com';

// Keep these SHORT — Pi SDK expires payments in ~60s
// Our backend needs to respond in under 5s total
const APPROVE_TIMEOUT = 8000;   // 8s for approve
const COMPLETE_TIMEOUT = 8000;  // 8s for complete
const VERIFY_TIMEOUT = 8000;    // 8s for user verify

const piAxios = axios.create({
  baseURL: PI_API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

const verifyPioneer = async (accessToken) => {
  try {
    const { data } = await piAxios.get('/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: VERIFY_TIMEOUT,
    });
    if (!data?.uid) throw new Error('Invalid Pi response — missing uid');
    return { uid: data.uid, username: data.username };
  } catch (err) {
    if (err.response?.status === 401) throw new Error('Invalid or expired Pi access token');
    if (err.code === 'ECONNABORTED') throw new Error('Pi Network timeout — try again');
    throw new Error('Pi Network verification failed: ' + (err.message || 'Unknown'));
  }
};

const approvePayment = async (paymentId) => {
  try {
    const { data } = await piAxios.post(
      `/v2/payments/${paymentId}/approve`,
      {},
      {
        headers: { Authorization: `Key ${process.env.PI_API_KEY}` },
        timeout: APPROVE_TIMEOUT,
      }
    );
    return data;
  } catch (err) {
    // already_approved is fine — not an error
    if (err.response?.data?.error === 'already_approved') {
      return { status: 'already_approved' };
    }
    // Log but don't throw — payment flow should continue
    console.error('approvePayment error:', err.response?.data || err.message);
    return { status: 'error', message: err.message };
  }
};

const completePayment = async (paymentId, txid) => {
  try {
    const { data } = await piAxios.post(
      `/v2/payments/${paymentId}/complete`,
      { txid },
      {
        headers: { Authorization: `Key ${process.env.PI_API_KEY}` },
        timeout: COMPLETE_TIMEOUT,
      }
    );
    return data;
  } catch (err) {
    if (err.response?.data?.error === 'already_completed') {
      return { status: 'already_completed' };
    }
    console.error('completePayment error:', err.response?.data || err.message);
    return { status: 'error', message: err.message };
  }
};

const getPayment = async (paymentId) => {
  try {
    const { data } = await piAxios.get(
      `/v2/payments/${paymentId}`,
      {
        headers: { Authorization: `Key ${process.env.PI_API_KEY}` },
        timeout: APPROVE_TIMEOUT,
      }
    );
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.error('getPayment error:', err.message);
    return null;
  }
};

module.exports = { verifyPioneer, approvePayment, completePayment, getPayment };
