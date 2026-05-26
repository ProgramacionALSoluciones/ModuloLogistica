import express from 'express';
import { generarFacturacion } from '../controllers/facturacion.controller.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/facturacion/generar', verificarToken, generarFacturacion);

export default router;
