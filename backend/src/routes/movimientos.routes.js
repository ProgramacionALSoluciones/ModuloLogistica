import express from 'express';
import { registrarEntrega, enviarTransporte, liberarPolines, getRecepcionesPendientes, procesarRecepcion, getHistorial, transferenciaInterna, trasladarInventario } from '../controllers/movimientos.controller.js';
import { verificarToken } from '../middleware/auth.middleware.js';
import { validarEntrega, validarTransporte, validarLiberacion, validarRecepcion, validarTransferencia, validarTraslado } from '../middleware/validacion.middleware.js';

const router = express.Router();

router.post('/entregas',               verificarToken, validarEntrega,       registrarEntrega);
router.post('/movimientos/transporte', verificarToken, validarTransporte,    enviarTransporte);
router.post('/movimientos/liberacion', verificarToken, validarLiberacion,    liberarPolines);
router.get('/recepciones/pendientes',  verificarToken,                       getRecepcionesPendientes);
router.post('/recepcion',              verificarToken, validarRecepcion,     procesarRecepcion);
router.post('/movimientos/transferencia', verificarToken, validarTransferencia, transferenciaInterna);
router.post('/movimientos/traslado',   verificarToken, validarTraslado,      trasladarInventario);
router.get('/historial',               verificarToken,                       getHistorial);

export default router;

