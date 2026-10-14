import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './initDb.js';
import products from './products.routes.js';
import stock from './stock.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/products', products);
app.use('/api/stock', stock);

app.use((err, req, res, _next) => {
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A product with that SKU already exists' });
  }
  console.error(err);
  res.status(500).json({ error: err.message });
});

try {
  await initDb();
} catch (err) {
  console.error('Database setup failed:', err.message);
  process.exit(1);
}

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
