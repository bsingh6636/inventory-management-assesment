import { useState } from 'react';

export default function StockRow({ product, onStockIn, onStockOut, onDelete, onHistory }) {
  const [qty, setQty] = useState(1);

  return (
    <tr className="border-b">
      <td className="py-2">{product.sku}</td>
      <td>{product.name}</td>
      <td>{product.category}</td>
      <td className="text-right">{Number(product.unit_price).toLocaleString()}</td>
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
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-14 rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <button onClick={() => onStockIn(product.id, qty)} className="cursor-pointer rounded bg-green-700 px-2 py-1 text-xs text-white">
            In
          </button>
          <button onClick={() => onStockOut(product.id, qty)} className="cursor-pointer rounded bg-amber-700 px-2 py-1 text-xs text-white">
            Out
          </button>
          <button onClick={() => onHistory(product)} className="cursor-pointer px-2 py-1 text-xs text-slate-600">
            History
          </button>
          <button onClick={() => onDelete(product.id)} className="cursor-pointer px-2 py-1 text-xs text-red-600">
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
