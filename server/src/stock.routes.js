import { Router } from 'express';
import { pool, withTransaction } from './db.js';
import { HttpError, MAX_INT, toInt, queryInt, optionalString } from './validation.js';

const router = Router();

const MAX_PAGE_SIZE = 100;

function txnId(id) {
  return 'TR' + String(id).padStart(3, '0');
}

async function findProduct(rawId) {
  const id = toInt(rawId, 1);
  const [[product]] = id ? await pool.query('SELECT * FROM products WHERE id = ?', [id]) : [[]];
  if (!product) throw new HttpError(404, 'Product not found');
  return product;
}

async function moveStock(type, req, res) {
  const productId = toInt(req.body.product_id, 1);
  const qty = toInt(req.body.quantity, 1);
  if (productId === null || qty === null) {
    throw new HttpError(400, 'product_id and quantity must be positive whole numbers');
  }
  const note = optionalString(req.body.note, 'note', 255);

  const txn = await withTransaction(async (conn) => {
    const [[product]] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [productId]);
    if (!product) throw new HttpError(404, 'Product not found');

    const previousStock = product.current_stock;

    if (type === 'STOCK_OUT' && qty > previousStock) {
      throw new HttpError(
        400,
        `Insufficient stock. Available quantity: ${previousStock}. Requested quantity: ${qty}.`,
        { available_quantity: previousStock, requested_quantity: qty },
      );
    }

    const newStock = type === 'STOCK_IN' ? previousStock + qty : previousStock - qty;
    if (newStock > MAX_INT) {
      throw new HttpError(400, `Stock cannot exceed ${MAX_INT}. Current stock: ${previousStock}.`);
    }

    const [result] = await conn.query(
      `INSERT INTO stock_transactions (product_id, type, quantity, previous_stock, new_stock, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [productId, type, qty, previousStock, newStock, note],
    );
    await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, productId]);

    return {
      txn_id: txnId(result.insertId),
      product: product.name,
      type,
      quantity: qty,
      previous_stock: previousStock,
      new_stock: newStock,
      low_stock: newStock <= product.minimum_stock,
    };
  });

  res.status(201).json(txn);
}

router.post('/in', (req, res) => moveStock('STOCK_IN', req, res));
router.post('/out', (req, res) => moveStock('STOCK_OUT', req, res));

router.get('/:productId', async (req, res) => {
  const product = await findProduct(req.params.productId);

  res.json({
    product_id: product.id,
    product: product.name,
    sku: product.sku,
    current_stock: product.current_stock,
    minimum_stock: product.minimum_stock,
    low_stock: product.current_stock <= product.minimum_stock,
  });
});

// Newest first, cursor-paginated: GET /api/stock/:productId/transactions?limit=20&before=<id>
router.get('/:productId/transactions', async (req, res) => {
  const product = await findProduct(req.params.productId);
  const limit = queryInt(req.query.limit, 'limit', 20, MAX_PAGE_SIZE);
  const before = queryInt(req.query.before, 'before', null);

  const [rows] = await pool.query(
    `SELECT id, type, quantity, previous_stock, new_stock, note, created_at
       FROM stock_transactions
      WHERE product_id = ? ${before ? 'AND id < ?' : ''}
      ORDER BY id DESC
      LIMIT ?`,
    before ? [product.id, before, limit + 1] : [product.id, limit + 1],
  );

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((row) => ({ ...row, product: product.name, txn_id: txnId(row.id) }));

  res.json({ items, next_cursor: hasMore ? items.at(-1).id : null });
});

export default router;
