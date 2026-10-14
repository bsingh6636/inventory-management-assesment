import { Router } from 'express';
import { pool } from './db.js';

const router = Router();

function txnId(id) {
  return 'TR' + String(id).padStart(3, '0');
}

async function moveStock(type, req, res) {
  const { product_id, quantity, note } = req.body;

  if (!product_id || !(quantity > 0)) {
    return res.status(400).json({ error: 'product_id and a positive quantity are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[product]] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [product_id]);
    if (!product) {
      await conn.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const qty = Number(quantity);
    const previousStock = product.current_stock;

    if (type === 'STOCK_OUT' && qty > previousStock) {
      await conn.rollback();
      return res.status(400).json({
        error: `Insufficient stock. Available quantity: ${previousStock}. Requested quantity: ${qty}.`,
        available_quantity: previousStock,
        requested_quantity: qty,
      });
    }

    const newStock = type === 'STOCK_IN' ? previousStock + qty : previousStock - qty;

    const [result] = await conn.query(
      `INSERT INTO stock_transactions (product_id, type, quantity, previous_stock, new_stock, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, type, qty, previousStock, newStock, note || null],
    );
    await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, product_id]);

    await conn.commit();

    res.status(201).json({
      txn_id: txnId(result.insertId),
      product: product.name,
      type,
      quantity: qty,
      previous_stock: previousStock,
      new_stock: newStock,
      low_stock: newStock <= product.minimum_stock,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

router.post('/in', (req, res, next) => {
  moveStock('STOCK_IN', req, res).catch(next);
});

router.post('/out', (req, res, next) => {
  moveStock('STOCK_OUT', req, res).catch(next);
});

router.get('/:productId', async (req, res, next) => {
  try {
    const [[product]] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.productId]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      product_id: product.id,
      product: product.name,
      sku: product.sku,
      current_stock: product.current_stock,
      minimum_stock: product.minimum_stock,
      low_stock: product.current_stock <= product.minimum_stock,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:productId/transactions', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, p.name AS product, t.type, t.quantity,
              t.previous_stock, t.new_stock, t.note, t.created_at
         FROM stock_transactions t
         JOIN products p ON p.id = t.product_id
        WHERE t.product_id = ?
        ORDER BY t.id DESC`,
      [req.params.productId],
    );

    res.json(rows.map((row) => ({ ...row, txn_id: txnId(row.id) })));
  } catch (err) {
    next(err);
  }
});

export default router;
