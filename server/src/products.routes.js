import { Router } from 'express';
import { pool, withTransaction } from './db.js';
import { HttpError, toInt, queryInt, requiredString, optionalString } from './validation.js';

const router = Router();

const MAX_PAGE_SIZE = 100;
const MAX_PRICE = 9999999999.99; // DECIMAL(12,2)

const withLowStock = (p) => ({ ...p, low_stock: p.current_stock <= p.minimum_stock });

// GET /api/products?page=1&limit=20&q=lap
router.get('/', async (req, res) => {
  const page = queryInt(req.query.page, 'page', 1);
  const limit = queryInt(req.query.limit, 'limit', 20, MAX_PAGE_SIZE);
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  let where = '';
  const params = [];
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    where = 'WHERE name LIKE ? OR sku LIKE ? OR category LIKE ?';
    params.push(like, like, like);
  }

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products ${where}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM products ${where} ORDER BY id LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );

  res.json({ items: rows.map(withLowStock), total, page, limit });
});

router.post('/', async (req, res) => {
  const body = req.body;
  const name = requiredString(body.name, 'name', 255);
  const sku = requiredString(body.sku, 'sku', 64);
  const category = optionalString(body.category, 'category', 100);

  const unitPrice = body.unit_price === '' || body.unit_price == null ? NaN : Number(body.unit_price);
  if (!(unitPrice >= 0 && unitPrice <= MAX_PRICE)) {
    throw new HttpError(400, 'unit_price is required and must be a non-negative number');
  }

  const openingStock = body.current_stock == null || body.current_stock === '' ? 0 : toInt(body.current_stock);
  const minimumStock = body.minimum_stock == null || body.minimum_stock === '' ? 0 : toInt(body.minimum_stock);
  if (openingStock === null || minimumStock === null) {
    throw new HttpError(400, 'current_stock and minimum_stock must be non-negative whole numbers');
  }

  const id = await withTransaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO products (name, sku, category, unit_price, current_stock, minimum_stock)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, sku, category, unitPrice, openingStock, minimumStock],
    );

    // Record opening stock so the transaction history accounts for every unit.
    if (openingStock > 0) {
      await conn.query(
        `INSERT INTO stock_transactions (product_id, type, quantity, previous_stock, new_stock, note)
         VALUES (?, 'STOCK_IN', ?, 0, ?, 'Opening stock')`,
        [result.insertId, openingStock, openingStock],
      );
    }
    return result.insertId;
  });

  const [[product]] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  res.status(201).json(withLowStock(product));
});

router.delete('/:id', async (req, res) => {
  const id = toInt(req.params.id, 1);
  const [result] = id ? await pool.query('DELETE FROM products WHERE id = ?', [id]) : [{}];

  if (!result.affectedRows) throw new HttpError(404, 'Product not found');
  res.status(204).end();
});

export default router;
