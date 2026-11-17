import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './initDb.js';
import { HttpError } from './validation.js';
import products from './products.routes.js';
import stock from './stock.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
// Express 5 leaves req.body undefined when the request has no JSON body.
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});

app.use('/api/products', products);
app.use('/api/stock', stock);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.details });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A product with that SKU already exists' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

try {
  await initDb();
} catch (err) {
  console.error('Database setup failed:', err.message);
  process.exit(1);
}

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
