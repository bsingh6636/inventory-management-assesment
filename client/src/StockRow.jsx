import { useState } from 'react';

export default function StockRow({ product, busy, onStockIn, onStockOut, onDelete, onHistory }) {
  const [qty, setQty] = useState('1');
  const quantity = Number(qty);
  const validQty = qty !== '' && Number.isInteger(quantity) && quantity > 0;

  async function move(handler) {
    if (await handler(product, quantity)) setQty('1');
  }

  return (
    <tr className="border-b">
      <td className="py-2">{product.sku}</td>
      <td>{product.name}</td>
      <td>{product.category}</td>
      <td className="text-right">
        {Number(product.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </td>
      <td className="text-right">{product.current_stock}</td>
      <td className="text-right">{product.minimum_stock}</td>
      <td className="pl-3">
        {product.low_stock && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            LOW STOCK
          </span>
        )}
      </td>
      <td className="py-2">
        <div className="flex items-center justify-end gap-1">
          <input
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-label={`Quantity for ${product.name}`}
            className={`w-16 rounded border px-2 py-1 text-sm ${validQty ? 'border-slate-300' : 'border-red-400'}`}
          />
          <button
            onClick={() => move(onStockIn)}
            disabled={busy || !validQty}
            className="cursor-pointer rounded bg-green-700 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            In
          </button>
          <button
            onClick={() => move(onStockOut)}
            disabled={busy || !validQty}
            className="cursor-pointer rounded bg-amber-700 px-2 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Out
          </button>
          <button
            onClick={() => onHistory(product)}
            disabled={busy}
            className="cursor-pointer px-2 py-1 text-xs text-slate-600 disabled:opacity-50"
          >
            History
          </button>
          <button
            onClick={() => onDelete(product)}
            disabled={busy}
            className="cursor-pointer px-2 py-1 text-xs text-red-600 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
