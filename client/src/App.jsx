import { useEffect, useState } from 'react';
import {
  getProducts, createProduct, deleteProduct, stockIn, stockOut, getTransactions,
} from './api.js';
import StockRow from './StockRow.jsx';

const BLANK = { name: '', sku: '', category: '', unit_price: '', current_stock: '', minimum_stock: '' };
const PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 20;
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const pagerButton = 'cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

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

  const field = (name, label, props = {}) => (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input name={name} value={form[name]} onChange={handleChange} className={inputClass} {...props} />
    </label>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs text-white">IM</span>
            Inventory Assessment
          </div>
          <a
            href="https://github.com/bsingh6636/inventory-management-assesment"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
          >
            GitHub
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
        <p className="mt-1 mb-6 text-slate-600">Track products, stock movements and low-stock alerts.</p>

        <details className="group mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-lg font-semibold">
            + Add a product
            <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
          </summary>
          <form onSubmit={handleAddProduct} className="grid gap-4 border-t border-slate-100 px-5 py-4 sm:grid-cols-3">
            {field('name', 'Product name', { required: true, maxLength: 255, placeholder: 'e.g. Laptop' })}
            {field('sku', 'SKU', { required: true, maxLength: 64, placeholder: 'e.g. LAP-001' })}
            {field('category', 'Category', { maxLength: 100, placeholder: 'e.g. Electronics' })}
            {field('unit_price', 'Unit price', { type: 'number', min: 0, step: '0.01', required: true, placeholder: '0.00' })}
            {field('current_stock', 'Opening stock', { type: 'number', min: 0, step: 1, placeholder: '0' })}
            {field('minimum_stock', 'Minimum stock', { type: 'number', min: 0, step: 1, placeholder: '0' })}
            <div className="sm:col-span-3">
              <button disabled={busy} className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                Add product
              </button>
            </div>
          </form>
        </details>

        {error && (
          <div
            role="alert"
            className="fixed top-4 right-4 z-30 flex max-w-md items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss" className="cursor-pointer leading-none text-red-500">
              ✕
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Products</h2>
              <p className="text-sm text-slate-500">{products.total} products</p>
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, SKU or category"
              className={`${inputClass} max-w-sm`}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr className="border-y border-slate-200">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3 text-right">Unit price</th>
                  <th className="px-3 py-3 text-right">Stock</th>
                  <th className="px-3 py-3 text-right">Min</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
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
        </section>
      </main>

      {history && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setHistory(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <h2 id="history-title" className="text-lg font-semibold">Transaction history</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {history.product.name} · {history.product.sku}
                </p>
              </div>
              <button
                onClick={() => setHistory(null)}
                autoFocus
                aria-label="Close transaction history"
                className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                ✕ Close
              </button>
            </div>

            <div className="overflow-y-auto">
              {history.items.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">No transactions yet.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-3">Txn ID</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3 text-right">Qty</th>
                      <th className="px-3 py-3 text-right">Stock change</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.items.map((t) => {
                      const isIn = t.type === 'STOCK_IN';
                      const date = new Date(t.created_at);
                      return (
                        <tr key={t.txn_id} className="border-b border-slate-100 hover:bg-slate-50/60">
                          <td className="px-6 py-3 font-medium text-slate-700">{t.txn_id}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                isIn ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isIn ? 'Stock in' : 'Stock out'}
                            </span>
                            {t.note && <div className="mt-1 text-xs text-slate-500">{t.note}</div>}
                          </td>
                          <td className={`px-3 text-right font-semibold tabular-nums ${isIn ? 'text-green-700' : 'text-amber-700'}`}>
                            {isIn ? '+' : '−'}{t.quantity}
                          </td>
                          <td className="px-3 text-right text-slate-600 tabular-nums">
                            {t.previous_stock} → <span className="font-semibold text-slate-900">{t.new_stock}</span>
                          </td>
                          <td className="px-6 py-3">
                            <div>{date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div className="text-xs text-slate-500">{date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {history.items.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm text-slate-600">
                <span>
                  Showing {history.items.length} transaction{history.items.length === 1 ? '' : 's'}
                  {history.nextCursor ? '' : ' (all)'}
                </span>
                {history.nextCursor && (
                  <button onClick={loadMoreHistory} disabled={busy} className={pagerButton}>
                    Load more
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
