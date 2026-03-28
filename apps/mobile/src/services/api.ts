import { GraphQLClient } from 'graphql-request';
import * as SecureStore from 'expo-secure-store';

// ⚠️  UPDATE: Set your API base URL here (and in .env for Expo)
// Development: http://localhost:4000
// Production:  https://api.spyce.app
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
export const GRAPHQL_URL = `${API_BASE}/graphql`;

let authToken: string | null = null;

export const getAuthToken = async (): Promise<string | null> => {
  if (authToken) return authToken;
  authToken = await SecureStore.getItemAsync('spyce_jwt');
  return authToken;
};

export const setAuthToken = async (token: string) => {
  authToken = token;
  await SecureStore.setItemAsync('spyce_jwt', token);
};

export const clearAuthToken = async () => {
  authToken = null;
  await SecureStore.deleteItemAsync('spyce_jwt');
  await SecureStore.deleteItemAsync('spyce_refresh');
};

export const getClient = async (): Promise<GraphQLClient> => {
  const token = await getAuthToken();
  return new GraphQLClient(GRAPHQL_URL, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

// REST helpers
export const apiGet = async (path: string) => {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
};

export const apiPost = async (path: string, body?: any) => {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
};

export const apiDelete = async (path: string) => {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'DELETE',
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
};
