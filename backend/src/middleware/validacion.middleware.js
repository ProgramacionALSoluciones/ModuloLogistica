/**
 * validacion.middleware.js
 * Middlewares de validación de inputs para las rutas principales del API.
 * Retornan 400 con mensaje descriptivo si falta algún campo requerido.
 */

// ── Helpers ───────────────────────────────────────────────────
const requeridos = (campos, body, res) => {
  const faltantes = campos.filter(c => body[c] === undefined || body[c] === null || body[c] === '');
  if (faltantes.length > 0) {
    res.status(400).json({
      success: false,
      message: `Campos obligatorios faltantes: ${faltantes.join(', ')}.`
    });
    return true; // hubo error
  }
  return false;
};

const cantidadPositiva = (campo, body, res) => {
  const val = Number(body[campo]);
  if (isNaN(val) || val <= 0) {
    res.status(400).json({
      success: false,
      message: `El campo '${campo}' debe ser un número mayor a 0.`
    });
    return true;
  }
  return false;
};

// ── Validadores de Movimientos ─────────────────────────────────

export const validarEntrega = (req, res, next) => {
  const { cliente_directo_id, tipo_polin_id, color_polin_id, cantidad } = req.body;
  if (requeridos(['cliente_directo_id', 'tipo_polin_id', 'color_polin_id', 'cantidad'], req.body, res)) return;
  if (cantidadPositiva('cantidad', req.body, res)) return;
  next();
};

export const validarTransporte = (req, res, next) => {
  if (requeridos(['cliente_directo_id', 'tipo_polin_id', 'color_polin_id', 'cliente_final_id', 'cantidad_enviada'], req.body, res)) return;
  if (cantidadPositiva('cantidad_enviada', req.body, res)) return;
  next();
};

export const validarLiberacion = (req, res, next) => {
  if (requeridos(['estado_uso', 'cliente_dueño_id', 'tipo_polin_id', 'color_polin_id', 'cantidad_liberar'], req.body, res)) return;
  if (cantidadPositiva('cantidad_liberar', req.body, res)) return;
  next();
};

export const validarRecepcion = (req, res, next) => {
  if (requeridos(['recepcion_id', 'cantidad_buenos', 'cantidad_siniestrados'], req.body, res)) return;
  next();
};

export const validarTransferencia = (req, res, next) => {
  if (requeridos(['cliente_directo_id', 'tipo_polin_id', 'color_polin_id', 'cantidad', 'de_estado', 'a_estado'], req.body, res)) return;
  if (cantidadPositiva('cantidad', req.body, res)) return;
  next();
};

export const validarTraslado = (req, res, next) => {
  if (requeridos(['cliente_origen_id', 'cliente_destino_id', 'tipo_polin_id', 'color_polin_id', 'cantidad', 'de_estado', 'a_estado'], req.body, res)) return;
  if (cantidadPositiva('cantidad', req.body, res)) return;
  next();
};

// ── Validadores de Facturación ─────────────────────────────────

export const validarFacturacion = (req, res, next) => {
  const { cliente_directo_id, mes, anio, fecha_desde, fecha_hasta } = req.body;
  if (requeridos(['cliente_directo_id'], req.body, res)) return;

  const tieneMesAnio = mes && anio;
  const tieneFechas = fecha_desde && fecha_hasta;

  if (!tieneMesAnio && !tieneFechas) {
    return res.status(400).json({
      success: false,
      message: "Debe especificar (mes + anio) o (fecha_desde + fecha_hasta)."
    });
  }
  next();
};

// ── Validadores de Gestión ─────────────────────────────────────

export const validarClienteDirecto = (req, res, next) => {
  if (requeridos(['nombre'], req.body, res)) return;
  next();
};

export const validarClienteFinal = (req, res, next) => {
  if (requeridos(['nombre'], req.body, res)) return;
  next();
};

export const validarUsuario = (req, res, next) => {
  // En PUT (actualización) la contraseña es opcional
  const esPUT = req.method === 'PUT';
  const camposBase = ['nombre', 'email', 'rol'];
  if (!esPUT) camposBase.push('password');
  if (requeridos(camposBase, req.body, res)) return;

  const rolesValidos = ['ADMIN', 'CLIENTE_DIRECTO', 'CLIENTE_FINAL'];
  if (!rolesValidos.includes(req.body.rol)) {
    return res.status(400).json({
      success: false,
      message: `El campo 'rol' debe ser uno de: ${rolesValidos.join(', ')}.`
    });
  }
  next();
};
