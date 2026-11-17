import { useEffect, useState } from 'react';
import {
  getProducts, createProduct, deleteProduct, stockIn, stockOut, getTransactions,
} from './api.js';
import StockRow from './StockRow.jsx';

const BLANK = { name: '', sku: '', category: '', unit_price: '', current_stock: '', minimum_stock: '' };
const PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 20;
const inputClass = 'rounded border border-slate-300 px-3 py-2 text-sm';
const pagerButton = 'cursor-pointer rounded border border-slate-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50';

function errorMessage(err) {
  return err.response?.data?.error || err.message;
}

export default function App() {
  const [products, setProducts] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);

  const totalPages = Math.max(1, Math.ceil(products.total / PAGE_SIZE));
  const refreshProducts = () => setReloadKey((k) => k + 1);

  // Debounce the search box, and go back to page 1 for a new search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let ignore = false; // drop responses that arrive after a newer request
    getProducts({ page, limit: PAGE_SIZE, q: search || undefined })
      .then((result) => {
        if (ignore) return;
        // e.g. the last product on the last page was deleted
        if (result.items.length === 0 && page > 1) {
          setPage(Math.max(1, Math.ceil(result.total / PAGE_SIZE)));
        } else {
          setProducts(result);
        }
      })
      .catch((err) => !ignore && setError(errorMessage(err)));
    return () => {
      ignore = true;
    };
  }, [page, search, reloadKey]);

  // Errors show as a toast so the table never shifts under the cursor; they clear themselves.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  // Close the history popup with Escape.
  useEffect(() => {
    if (!history) return;
    const onKey = (e) => e.key === 'Escape' && setHistory(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history]);

  // Runs one user action at a time: disables buttons and reports failures.
  // Resolves to true if the action succeeded.
  async function run(action) {
    setError(null);
    setBusy(true);
    try {
      await action();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  }

  function handleAddProduct(e) {
    e.preventDefault();
    run(async () => {
      await createProduct({
        name: form.name,
        sku: form.sku,
        category: form.category,
        unit_price: Number(form.unit_price),
        current_stock: Number(form.current_stock || 0),
        minimum_stock: Number(form.minimum_stock || 0),
      });
      setForm(BLANK);
      refreshProducts();
    });
  }

  function handleStockMove(move, product, qty) {
    return run(async () => {
      await move(product.id, qty);
      refreshProducts();
      if (history?.product.id === product.id) await loadHistory(product);
    });
  }

  function handleDelete(product) {
    const ok = window.confirm(
      `Delete ${product.name} (${product.sku})? Its transaction history will be deleted too.`,
    );
    if (!ok) return;

    run(async () => {
      await deleteProduct(product.id);
      if (history?.product.id === product.id) setHistory(null);
      refreshProducts();
    });
  }

  async function loadHistory(product) {
    const result = await getTransactions(product.id, { limit: HISTORY_PAGE_SIZE });
    setHistory({ product, items: result.items, nextCursor: result.next_cursor });
  }

  function loadMoreHistory() {
    const { product, nextCursor } = history;
    run(async () => {
      const result = await getTransactions(product.id, { limit: HISTORY_PAGE_SIZE, before: nextCursor });
      setHistory((h) => ({ ...h, items: [...h.items, ...result.items], nextCursor: result.next_cursor }));
    });
  }

  const firstShown = products.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, products.total);

  return (
    <div className="mx-auto p-4">
      <h1 className="mb-6 text-2xl font-semibold">Inventory Management</h1>

      <form onSubmit={handleAddProduct} className="mb-6 flex flex-wrap gap-2">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Product Name" required maxLength={255} className={inputClass} />
        <input name="sku" value={form.sku} onChange={handleChange} placeholder="SKU" required maxLength={64} className={inputClass} />
        <input name="category" value={form.category} onChange={handleChange} placeholder="Category" maxLength={100} className={inputClass} />
        <input name="unit_price" value={form.unit_price} onChange={handleChange} type="number" min="0" step="0.01" placeholder="Unit Price" required className={inputClass} />
        <input name="current_stock" value={form.current_stock} onChange={handleChange} type="number" min="0" step="1" placeholder="Opening Stock" className={inputClass} />
        <input name="minimum_stock" value={form.minimum_stock} onChange={handleChange} type="number" min="0" step="1" placeholder="Min Stock" className={inputClass} />
        <button disabled={busy} className="cursor-pointer rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          Add Product
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="fixed top-4 right-4 z-30 flex max-w-md items-start gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss" className="cursor-pointer leading-none text-red-500">
            ✕
          </button>
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, SKU or category"
        className={`${inputClass} mb-3 w-full max-w-sm`}
      />

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
          {products.items.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-6 text-center text-slate-500">
                {search ? 'No products match your search.' : 'No products yet.'}
              </td>
            </tr>
          ) : (
            products.items.map((product) => (
              <StockRow
                key={product.id}
                product={product}
                busy={busy}
                onStockIn={(p, qty) => handleStockMove(stockIn, p, qty)}
                onStockOut={(p, qty) => handleStockMove(stockOut, p, qty)}
                onDelete={handleDelete}
                onHistory={(p) => run(() => loadHistory(p))}
              />
            ))
          )}
        </tbody>
      </table>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <span>
          Showing {firstShown}–{lastShown} of {products.total}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page <= 1} className={pagerButton}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className={pagerButton}>
            Next
          </button>
        </div>
      </div>

      {history && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setHistory(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 id="history-title" className="font-medium">
                Transactions - {history.product.name}{' '}
                <span className="text-sm font-normal text-slate-500">({history.product.sku})</span>
              </h2>
              <button
                onClick={() => setHistory(null)}
                autoFocus
                aria-label="Close transaction history"
                className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
              >
                ✕ Close
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-3">
              {history.items.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">No transactions yet.</p>
              ) : (
                <>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="py-2">Txn ID</th>
                        <th>Type</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Previous Stock</th>
                        <th className="text-right">New Stock</th>
                        <th className="pl-4">Note</th>
                        <th className="pl-4">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.items.map((t) => (
                        <tr key={t.txn_id} className="border-b">
                          <td className="py-2">{t.txn_id}</td>
                          <td className={t.type === 'STOCK_IN' ? 'text-green-700' : 'text-amber-700'}>{t.type}</td>
                          <td className="text-right">{t.quantity}</td>
                          <td className="text-right">{t.previous_stock}</td>
                          <td className="text-right">{t.new_stock}</td>
                          <td className="pl-4 text-slate-500">{t.note}</td>
                          <td className="pl-4 text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {history.nextCursor && (
                    <button onClick={loadMoreHistory} disabled={busy} className={`${pagerButton} mt-3 text-sm`}>
                      Load more
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
