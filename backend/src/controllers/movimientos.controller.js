import * as MovimientosService from '../services/movimientos.service.js';

export const registrarEntrega = async (req, res) => {
  try {
    const { rol: userRole } = req.user || {};
    
    // Seguridad: Solo el personal administrativo (ADMIN) puede registrar nuevas entregas de fábrica
    if (userRole !== 'ADMIN') {
      throw new Error('No tiene permisos para registrar entregas iniciales.');
    }

    const data = req.body;
    
    // Solo permitir fecha_manual si es ADMIN
    if (userRole !== 'ADMIN') {
      delete data.fecha_manual;
      delete data.remision;
    }

    const result = await MovimientosService.registrarEntrega(data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const enviarTransporte = async (req, res) => {
  try {
    const { cliente_directo_id, tipo_polin_id, color_polin_id, cliente_final_id, cantidad_enviada } = req.body;
    const { rol: userRole, entityIds = [] } = req.user || {};

    // Seguridad: Si es cliente directo, solo puede enviar transporte de su propia fábrica
    if (userRole === 'CLIENTE_DIRECTO' && !entityIds.includes(cliente_directo_id)) {
      throw new Error('No tiene permisos para enviar inventario de otro cliente.');
    }

    const result = await MovimientosService.enviarTransporte({
      cliente_directo_id,
      tipo_polin_id,
      color_polin_id,
      cliente_final_id,
      cantidad_enviada: parseInt(cantidad_enviada, 10),
      fecha_manual: userRole === 'ADMIN' ? req.body.fecha_manual : null,
      orden_compra: req.body.orden_compra
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const liberarPolines = async (req, res) => {
  try {
    const { estado_uso, cliente_dueño_id, tipo_polin_id, color_polin_id, cantidad_liberar } = req.body;
    const { rol: userRole, entityIds = [] } = req.user || {};

    // Seguridad: Cliente directo solo puede liberar su almacenamiento o pull fijo. Cliente final solo su transporte.
    if (userRole === 'CLIENTE_DIRECTO') {
      if (!['ALMACENAMIENTO', 'PULL_FIJO'].includes(estado_uso) || !entityIds.includes(cliente_dueño_id)) {
         throw new Error('No tiene permisos para liberar este inventario.');
      }
    } else if (userRole === 'CLIENTE_FINAL') {
      if (estado_uso !== 'TRANSPORTE' || !entityIds.includes(cliente_dueño_id)) {
         throw new Error('No tiene permisos para liberar este inventario.');
      }
    }

    const result = await MovimientosService.liberarPolines({
      estado_uso,
      cliente_dueño_id,
      tipo_polin_id,
      color_polin_id,
      cantidad_liberar: cantidad_liberar ? parseInt(cantidad_liberar, 10) : null,
      fecha_manual: userRole === 'ADMIN' ? req.body.fecha_manual : null
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getRecepcionesPendientes = async (req, res) => {
  try {
    const { rol: userRole, entityIds = [] } = req.user || {};
    const result = await MovimientosService.getRecepcionesPendientes();
    
    // Filtrar: Si es cliente directo, solo ve lo que va destinado a él (o lo que él liberó, dependiendo de la lógica de negocio)
    // En este sistema, las recepciones pendientes usualmente son devoluciones al Cliente Directo.
    let listado = result;
    if (userRole === 'CLIENTE_DIRECTO') {
      listado = result.filter(mov => entityIds.includes(mov.cliente_directo_id));
    }

    res.status(200).json({ success: true, data: listado });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const procesarRecepcion = async (req, res) => {
  try {
    const { movementId } = req.body;
    const { rol: userRole, entityIds = [] } = req.user || {};

    // Validar propiedad del movimiento antes de procesar
    if (userRole === 'CLIENTE_DIRECTO') {
       const pendientes = await MovimientosService.getRecepcionesPendientes();
       const mov = pendientes.find(m => m.id === movementId);
       if (!mov || !entityIds.includes(mov.cliente_directo_id)) {
         throw new Error('No tiene permisos para recibir este lote o el lote no existe.');
       }
    }

    const data = req.body;
    
    // Solo permitir fecha_manual si es ADMIN
    if (userRole !== 'ADMIN') {
      delete data.fecha_manual;
      delete data.remision;
    }

    const result = await MovimientosService.procesarRecepcion(data);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getHistorial = async (req, res) => {
  try {
    const { rol, entityIds = [] } = req.user || {};
    const result = await MovimientosService.getHistorial({ rol, entityIds });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const transferenciaInterna = async (req, res) => {
  try {
    const { cliente_directo_id, tipo_polin_id, color_polin_id, cantidad, de_estado, a_estado, fecha_manual } = req.body;
    const { rol: userRole, entityIds = [] } = req.user || {};

    // Seguridad: Si es cliente directo, solo puede transferir de su propia fábrica
    if (userRole === 'CLIENTE_DIRECTO' && !entityIds.includes(cliente_directo_id)) {
      throw new Error('No tiene permisos para transferir inventario de otro cliente.');
    }

    const result = await MovimientosService.realizarTransferenciaInterna({
      cliente_directo_id,
      tipo_polin_id,
      color_polin_id,
      cantidad,
      de_estado,
      a_estado,
      fecha_manual: userRole === 'ADMIN' ? fecha_manual : null
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

