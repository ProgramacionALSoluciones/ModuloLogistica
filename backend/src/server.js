import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import movimientosRoutes from './routes/movimientos.routes.js';
import facturacionRoutes from './routes/facturacion.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import referenciasRoutes from './routes/referencias.routes.js';
import authRoutes from './routes/auth.routes.js';
import gestionRoutes from './routes/gestion.routes.js';

dotenv.config();

// ── Guardia de arranque: variables de entorno críticas ────────
if (!process.env.JWT_SECRET || !process.env.SUPABASE_KEY || !process.env.SUPABASE_URL) {
  console.error('FATAL: Variables de entorno críticas no definidas (JWT_SECRET, SUPABASE_KEY, SUPABASE_URL). El servidor no puede iniciar.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', movimientosRoutes);
app.use('/api/facturacion', facturacionRoutes);
app.use('/api/gestion', gestionRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/referencias', referenciasRoutes);

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
