import express from 'express';
import { generarFacturacion } from '../controllers/facturacion.controller.js';
import { verificarToken } from '../middleware/auth.middleware.js';
import { validarFacturacion } from '../middleware/validacion.middleware.js';

const router = express.Router();

router.post('/generar', verificarToken, validarFacturacion, generarFacturacion);

export default router;
