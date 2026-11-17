import { useState } from 'react';

export default function StockRow({ product, busy, onStockIn, onStockOut, onDelete, onHistory }) {
  const [qty, setQty] = useState('1');
  const quantity = Number(qty);
  const validQty = qty !== '' && Number.isInteger(quantity) && quantity > 0;

  async function move(handler) {
    if (await handler(product, quantity)) setQty('1');
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
            {product.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div className="font-semibold">{product.name}</div>
            <div className="text-xs text-slate-500">{product.sku}</div>
          </div>
        </div>
      </td>
      <td className="px-3 text-slate-600">{product.category || '—'}</td>
      <td className="px-3 text-right tabular-nums">
        ₹{Number(product.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className="px-3 text-right font-semibold tabular-nums">{product.current_stock}</td>
      <td className="px-3 text-right text-slate-500 tabular-nums">{product.minimum_stock}</td>
      <td className="px-3">
        {product.current_stock === 0 ? (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Out of stock</span>
        ) : product.low_stock ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Low stock</span>
        ) : (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">In stock</span>
        )}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <input
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-label={`Quantity for ${product.name}`}
            className={`w-16 rounded-lg border px-2 py-1 text-sm ${validQty ? 'border-slate-300' : 'border-red-400'}`}
          />
          <button
            onClick={() => move(onStockIn)}
            disabled={busy || !validQty}
            className="cursor-pointer rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            In
          </button>
          <button
            onClick={() => move(onStockOut)}
            disabled={busy || !validQty}
            className="cursor-pointer rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Out
          </button>
          <button
            onClick={() => onHistory(product)}
            disabled={busy}
            className="cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            History
          </button>
          <button
            onClick={() => onDelete(product)}
            disabled={busy}
            className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
