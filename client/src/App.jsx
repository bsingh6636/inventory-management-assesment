import { useEffect, useState } from 'react';
import {
  getProducts, createProduct, deleteProduct, stockIn, stockOut, getTransactions,
} from './api.js';
import StockRow from './StockRow.jsx';

const BLANK = { name: '', sku: '', category: '', unit_price: '', current_stock: '', minimum_stock: '' };
const inputClass = 'rounded border border-slate-300 px-3 py-2 text-sm';

export default function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  function loadProducts() {
    getProducts().then(setProducts).catch(showError);
  }

  function showError(err) {
    setError(err.response?.data?.error || err.message);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    setError(null);

    try {
      await createProduct({
        name: form.name,
        sku: form.sku,
        category: form.category,
        unit_price: Number(form.unit_price),
        current_stock: Number(form.current_stock || 0),
        minimum_stock: Number(form.minimum_stock || 0),
      });
      setForm(BLANK);
      loadProducts();
    } catch (err) {
      showError(err);
    }
  }

  async function handleStockIn(id, qty) {
    setError(null);
    try {
      await stockIn(id, qty);
      loadProducts();
      if (history?.product.id === id) showHistory(history.product);
    } catch (err) {
      showError(err);
    }
  }

  async function handleStockOut(id, qty) {
    setError(null);
    try {
      await stockOut(id, qty);
      loadProducts();
      if (history?.product.id === id) showHistory(history.product);
    } catch (err) {
      showError(err);
    }
  }

  async function handleDelete(id) {
    await deleteProduct(id);
    setHistory(null);
    loadProducts();
  }

  async function showHistory(product) {
    const transactions = await getTransactions(product.id);
    setHistory({ product, transactions });
  }

  return (
    <div className="mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold">Inventory Management</h1>

      <form onSubmit={handleAddProduct} className="mb-6 flex flex gap-2">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Product Name" required className={inputClass} />
        <input name="sku" value={form.sku} onChange={handleChange} placeholder="SKU" required className={inputClass} />
        <input name="category" value={form.category} onChange={handleChange} placeholder="Category" className={inputClass} />
        <input name="unit_price" value={form.unit_price} onChange={handleChange} type="number" min="0" step="0.01" placeholder="Unit Price" required className={inputClass} />
        <input name="current_stock" value={form.current_stock} onChange={handleChange} type="number" min="0" placeholder="Opening Stock" className={inputClass} />
        <input name="minimum_stock" value={form.minimum_stock} onChange={handleChange} type="number" min="0" placeholder="Min Stock" className={inputClass} />
        <button className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Add Product</button>
      </form>

      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2">SKU</th>
            <th>Product</th>
            <th>Category</th>
            <th className="text-right">Unit Price</th>
            <th className="text-right">Stock</th>
            <th className="text-right">Min</th>
            <th />
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <StockRow
              key={product.id}
              product={product}
              onStockIn={handleStockIn}
              onStockOut={handleStockOut}
              onDelete={handleDelete}
              onHistory={showHistory}
            />
          ))}
        </tbody>
      </table>

      {history && (
        <section className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-medium">Transactions - {history.product.name}</h2>
            <button onClick={() => setHistory(null)} className="text-sm text-slate-500">Close</button>
          </div>

          {history.transactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2">Txn ID</th>
                  <th>Type</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Previous Stock</th>
                  <th className="text-right">New Stock</th>
                  <th className="pl-4">Date/Time</th>
                </tr>
              </thead>
              <tbody>
                {history.transactions.map((t) => (
                  <tr key={t.txn_id} className="border-b">
                    <td className="py-2">{t.txn_id}</td>
                    <td className={t.type === 'STOCK_IN' ? 'text-green-700' : 'text-amber-700'}>{t.type}</td>
                    <td className="text-right">{t.quantity}</td>
                    <td className="text-right">{t.previous_stock}</td>
                    <td className="text-right">{t.new_stock}</td>
                    <td className="pl-4 text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
