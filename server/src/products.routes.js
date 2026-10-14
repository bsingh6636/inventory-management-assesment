import { Router } from 'express';
import { pool } from './db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [products] = await pool.query('SELECT * FROM products ORDER BY id');

    res.json(products.map((p) => ({ ...p, low_stock: p.current_stock <= p.minimum_stock })));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { name, sku, unit_price } = req.body;
  const category = req.body.category || null;
  const openingStock = Number(req.body.current_stock) || 0;
  const minimumStock = Number(req.body.minimum_stock) || 0;

  if (!name || !sku || unit_price == null) {
    return res.status(400).json({ error: 'name, sku and unit_price are required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO products (name, sku, category, unit_price, current_stock, minimum_stock)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, sku, category, unit_price, openingStock, minimumStock],
    );

    res.status(201).json({
      id: result.insertId,
      name,
      sku,
      category,
      unit_price,
      current_stock: openingStock,
      minimum_stock: minimumStock,
      low_stock: openingStock <= minimumStock,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
