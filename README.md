# inventory-management-assesment

Products, stock in/out and a per-product transaction history. Express 5 + MySQL API (`server/`) and a React + Vite UI (`client/`).

## Setup

Requires Node 20.11+ and MySQL 8.

```bash
cp server/.env.example server/.env   # then set DB_* to your MySQL credentials
npm --prefix server install
npm --prefix client install
```

The server creates the database, tables and sample products on first start. `npm --prefix server run db:reset` drops and recreates it.

## Run

```bash
npm run server   # API on http://localhost:4000
npm run client   # UI on http://localhost:5173 (proxies /api to the server)
```

If MySQL runs on a remote VM bound to its localhost, `npm run tunnel` forwards local port 3306 to it over SSH (see `tunnel.sh`).

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/products?page=1&limit=20&q=` | Returns `{ items, total, page, limit }`. `q` searches name, SKU and category. `limit` ≤ 100. |
| POST | `/api/products` | `{ name, sku, unit_price, category?, current_stock?, minimum_stock? }`. Opening stock is recorded as a `STOCK_IN` transaction. |
| DELETE | `/api/products/:id` | Also deletes the product's transactions. |
| POST | `/api/stock/in`, `/api/stock/out` | `{ product_id, quantity, note? }`. `quantity` must be a positive whole number; stock-out fails with 400 if stock is insufficient. |
| GET | `/api/stock/:productId` | Current stock level and low-stock flag. |
| GET | `/api/stock/:productId/transactions?limit=20&before=` | Newest first. Returns `{ items, next_cursor }`; pass `before=<next_cursor>` for the next page. |

Errors are returned as `{ "error": "message" }` with a 4xx/5xx status.
