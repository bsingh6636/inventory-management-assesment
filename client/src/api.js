import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Returns { items, total, page, limit }
export const getProducts = (params) => api.get('/products', { params }).then((r) => r.data);
export const createProduct = (data) => api.post('/products', data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const stockIn = (product_id, quantity) =>
  api.post('/stock/in', { product_id, quantity }).then((r) => r.data);
export const stockOut = (product_id, quantity) =>
  api.post('/stock/out', { product_id, quantity }).then((r) => r.data);

// Returns { items, next_cursor }; pass { before: next_cursor } for the next page.
export const getTransactions = (id, params) =>
  api.get(`/stock/${id}/transactions`, { params }).then((r) => r.data);
