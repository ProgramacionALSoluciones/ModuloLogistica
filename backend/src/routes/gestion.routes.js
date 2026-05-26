import express from 'express';
import * as GestionController from '../controllers/gestion.controller.js';
import { verificarToken } from '../middleware/auth.middleware.js';
import { validarClienteDirecto, validarClienteFinal, validarUsuario } from '../middleware/validacion.middleware.js';

const router = express.Router();

// Middleware de protección global para estas rutas
router.use(verificarToken);

// Clientes Directos
router.get('/clientes-directos',       GestionController.getClientesDirectos);
router.post('/clientes-directos',      validarClienteDirecto, GestionController.postClienteDirecto);
router.put('/clientes-directos/:id',   validarClienteDirecto, GestionController.putClienteDirecto);

// Clientes Finales
router.get('/clientes-finales',        GestionController.getClientesFinales);
router.post('/clientes-finales',       validarClienteFinal, GestionController.postClienteFinal);
router.put('/clientes-finales/:id',    validarClienteFinal, GestionController.putClienteFinal);

// Usuarios
router.get('/usuarios',                GestionController.getUsuarios);
router.post('/usuarios',               validarUsuario, GestionController.postUsuario);
router.put('/usuarios/:id',            validarUsuario, GestionController.putUsuario);

// Inventario
router.get('/inventario', GestionController.getInventario);
router.put('/inventario/:id', GestionController.putInventario);

export default router;
