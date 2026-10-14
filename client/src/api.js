import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getProducts = () => api.get('/products').then((r) => r.data);
export const createProduct = (data) => api.post('/products', data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const stockIn = (product_id, quantity) =>
  api.post('/stock/in', { product_id, quantity }).then((r) => r.data);
export const stockOut = (product_id, quantity) =>
  api.post('/stock/out', { product_id, quantity }).then((r) => r.data);
export const getTransactions = (id) => api.get(`/stock/${id}/transactions`).then((r) => r.data);
