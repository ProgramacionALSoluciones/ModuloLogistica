import express from 'express';
import { obtenerPolinesCliente } from '../controllers/clientes.controller.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/:id/polines', verificarToken, obtenerPolinesCliente);

export default router;
