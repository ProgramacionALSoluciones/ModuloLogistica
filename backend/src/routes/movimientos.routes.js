import express from 'express';
import { registrarEntrega, enviarTransporte, liberarPolines, getRecepcionesPendientes, procesarRecepcion, getHistorial, transferenciaInterna } from '../controllers/movimientos.controller.js';
import { verificarToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/entregas', verificarToken, registrarEntrega);
router.post('/movimientos/transporte', verificarToken, enviarTransporte);
router.post('/movimientos/liberacion', verificarToken, liberarPolines);
router.get('/recepciones/pendientes', verificarToken, getRecepcionesPendientes);
router.post('/recepcion', verificarToken, procesarRecepcion);
router.post('/movimientos/transferencia', verificarToken, transferenciaInterna);
router.get('/historial', verificarToken, getHistorial);

export default router;
