import { supabase } from '../config/supabase.js';

// ─────────────────────────────────────────────────────────────
// REGISTRAR ENTREGA
// ─────────────────────────────────────────────────────────────
export const registrarEntrega = async ({ cliente_directo_id, tipo_polin_id, color_polin_id, cantidad, estado_uso = 'ALMACENAMIENTO', costo_entrega = 0, fecha_manual }) => {
  const { data: inv, error: invGetError } = await supabase
    .from('inventario')
    .select('*')
    .eq('tipo_polin_id', tipo_polin_id)
    .eq('color_polin_id', color_polin_id)
    .single();

  if (invGetError) throw new Error('No se encontró inventario para el tipo/color indicado.');
  if (inv.cantidad_disponible < cantidad) throw new Error('Inventario insuficiente.');

  const { data: movimiento, error: movError } = await supabase
    .from('movimiento_polines')
    .insert([{
      cliente_directo_id,
      tipo_polin_id,
      color_polin_id,
      cantidad,
      cantidad_restante: cantidad,
      tipo_movimiento: 'ENTREGA',
      estado_uso: estado_uso,
      costo_entrega: costo_entrega,
      fecha_inicio: fecha_manual ? new Date(fecha_manual).toISOString() : new Date().toISOString()
    }])
    .select()
    .single();

  if (movError) throw new Error(movError.message);

  const { error: invUpdError } = await supabase
    .from('inventario')
    .update({ cantidad_disponible: inv.cantidad_disponible - cantidad })
    .eq('id', inv.id);

  if (invUpdError) throw new Error(invUpdError.message);

  return movimiento;
};

// ─────────────────────────────────────────────────────────────
// ENVIAR A TRANSPORTE (Modelo Híbrido + Trazabilidad)
//
// FIX: El constraint chk_padre_envio prohíbe tipo_movimiento='ENVIO'
// con movimiento_origen_id. Usamos tipo_movimiento='ENTREGA' en el
// movimiento hijo, diferenciado por estado_uso='TRANSPORTE' y
// movimiento_origen_id seteado.
// ─────────────────────────────────────────────────────────────
export const enviarTransporte = async ({ cliente_directo_id, tipo_polin_id, color_polin_id, cliente_final_id, cantidad_enviada, fecha_manual }) => {
  if (!cliente_final_id) throw new Error('cliente_final_id es obligatorio.');
  if (!cliente_directo_id || !tipo_polin_id || !color_polin_id) throw new Error('Debe especificar el origen completo.');
  if (!cantidad_enviada || cantidad_enviada <= 0) throw new Error('cantidad_enviada debe ser mayor a 0.');

  // Obtener todos los lotes activos de ALMACENAMIENTO para este subgrupo, orden LIFO (fecha descendente)
  const { data: lotes, error: errGet } = await supabase
    .from('movimiento_polines')
    .select('*')
    .eq('cliente_directo_id', cliente_directo_id)
    .eq('tipo_polin_id', tipo_polin_id)
    .eq('color_polin_id', color_polin_id)
    .in('estado_uso', ['ALMACENAMIENTO', 'PULL_FIJO'])
    .is('fecha_fin', null)
    .order('fecha_inicio', { ascending: false });

  if (errGet) throw new Error(errGet.message);

  let cantidad_restante_por_enviar = parseInt(cantidad_enviada, 10);
  const lotes_disponibles = lotes || [];

  const totalDisponible = lotes_disponibles.reduce((sum, lote) => sum + (lote.cantidad_restante ?? lote.cantidad), 0);
  if (cantidad_restante_por_enviar > totalDisponible) {
    throw new Error(`Cantidad a enviar (${cantidad_restante_por_enviar}) supera la disponible en almacén (${totalDisponible}).`);
  }

  const ahora = fecha_manual ? new Date(fecha_manual).toISOString() : new Date().toISOString();
  const movimientos_hijos = [];

  for (const lote of lotes_disponibles) {
    if (cantidad_restante_por_enviar <= 0) break;

    const disponible = lote.cantidad_restante ?? lote.cantidad;
    const aDescontar = Math.min(disponible, cantidad_restante_por_enviar);
    const nuevaRestante = disponible - aDescontar;

    // Actualizar lote origen
    const updatePayload = { cantidad_restante: nuevaRestante };
    if (nuevaRestante === 0) updatePayload.fecha_fin = ahora;

    const { error: errUpd } = await supabase
      .from('movimiento_polines')
      .update(updatePayload)
      .eq('id', lote.id);

    if (errUpd) throw new Error(errUpd.message);

    // Crear movimiento hijo
    const { data: movHijo, error: errIns } = await supabase
      .from('movimiento_polines')
      .insert([{
        cliente_directo_id,
        cliente_final_id,
        tipo_polin_id,
        color_polin_id,
        cantidad: aDescontar,
        cantidad_restante: aDescontar,
        tipo_movimiento: 'ENTREGA',      // <-- FIX: evita chk_padre_envio
        estado_uso: 'TRANSPORTE',
        movimiento_origen_id: lote.id,
        fecha_inicio: ahora
      }])
      .select()
      .single();

    if (errIns) throw new Error(errIns.message);

    movimientos_hijos.push(movHijo);
    cantidad_restante_por_enviar -= aDescontar;
  }

  return {
    movimientos_hijos,
    trazabilidad: `Distribuidos en ${movimientos_hijos.length} lotes de origen.`,
    restante_en_origen: totalDisponible - cantidad_enviada
  };
};

// ─────────────────────────────────────────────────────────────
// LIBERAR POLINES (Liberación Libre + Parcial)
//
// - Funciona en cualquier estado activo (ALMACENAMIENTO o TRANSPORTE).
// - Si cantidad_liberar < cantidad_restante: liberación parcial.
//   Se reduce cantidad_restante pero el movimiento permanece abierto.
// - Si cantidad_liberar >= cantidad_restante (o no se especifica):
//   liberación total, se cierra el movimiento con fecha_fin.
// ─────────────────────────────────────────────────────────────
export const liberarPolines = async ({ estado_uso, cliente_dueño_id, tipo_polin_id, color_polin_id, cantidad_liberar, fecha_manual }) => {
  if (!estado_uso || !cliente_dueño_id || !tipo_polin_id || !color_polin_id) throw new Error('Debe especificar el grupo completo para liberar.');
  if (!cantidad_liberar || cantidad_liberar <= 0) throw new Error('La cantidad a liberar debe ser mayor a 0.');

  let query = supabase
    .from('movimiento_polines')
    .select('*')
    .eq('estado_uso', estado_uso)
    .eq('tipo_polin_id', tipo_polin_id)
    .eq('color_polin_id', color_polin_id)
    .is('fecha_fin', null)
    .order('fecha_inicio', { ascending: true }); // FIFO: los más viejos primero

  if (estado_uso === 'TRANSPORTE') {
    query = query.eq('cliente_final_id', cliente_dueño_id);
  } else if (estado_uso === 'ALMACENAMIENTO' || estado_uso === 'PULL_FIJO') {
    query = query.eq('cliente_directo_id', cliente_dueño_id);
  } else {
    throw new Error('Estado de uso no soportado para liberación agrupada.');
  }

  const { data: lotes, error: errGet } = await query;
  if (errGet) throw new Error(errGet.message);

  const lotes_disponibles = lotes || [];
  const totalDisponible = lotes_disponibles.reduce((sum, lote) => sum + (lote.cantidad_restante ?? lote.cantidad), 0);

  let aLiberarTotal = parseInt(cantidad_liberar, 10);
  if (aLiberarTotal > totalDisponible) {
    throw new Error(`Cantidad a liberar (${aLiberarTotal}) supera la disponible (${totalDisponible}).`);
  }

  const ahora = fecha_manual ? new Date(fecha_manual).toISOString() : new Date().toISOString();
  let cantidad_liberada_real = 0;
  let lotes_afectados = 0;

  for (const lote of lotes_disponibles) {
    if (aLiberarTotal <= 0) break;

    const disponible = lote.cantidad_restante ?? lote.cantidad;
    const aDescontar = Math.min(disponible, aLiberarTotal);
    const nuevaRestante = disponible - aDescontar;
    const esTotal = nuevaRestante === 0;

    // 1. Actualizar movimiento
    const updatePayload = { cantidad_restante: nuevaRestante };
    if (esTotal) updatePayload.fecha_fin = ahora;

    const { error: errUpd } = await supabase
      .from('movimiento_polines')
      .update(updatePayload)
      .eq('id', lote.id);

    if (errUpd) throw new Error(errUpd.message);

    // 2. Crear registro de recepción pendiente
    const { error: errRec } = await supabase
      .from('recepcion_polines')
      .insert([{
        movimiento_origen_id: lote.id,
        cantidad_liberada: aDescontar,
        estado_recepcion: 'PENDIENTE',
        fecha_liberacion: ahora
      }]);

    if (errRec) throw new Error(errRec.message);

    cantidad_liberada_real += aDescontar;
    aLiberarTotal -= aDescontar;
    lotes_afectados++;
  }

  return {
    success: true,
    parcial: totalDisponible > cantidad_liberada_real,
    cantidad_liberada: cantidad_liberada_real,
    cantidad_restante: totalDisponible - cantidad_liberada_real,
    estado_previo: estado_uso,
    message: `Liberación FIFO completada: ${cantidad_liberada_real} polines pasan a PENDIENTES de recepción procesando ${lotes_afectados} lotes.`
  };
};

// ─────────────────────────────────────────────────────────────
// RECEPCIONES - GET Y PROCESAR
// ─────────────────────────────────────────────────────────────

export const getRecepcionesPendientes = async () => {
  const { data, error } = await supabase
    .from('recepcion_polines')
    .select(`
      *,
      movimiento_polines (*, 
        cliente_directo (id, nombre), 
        cliente_final (id, nombre),
        tipo_polin (id, nombre),
        color_polin (id, nombre)
      )
    `)
    .eq('estado_recepcion', 'PENDIENTE')
    .order('fecha_liberacion', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const procesarRecepcion = async ({ recepcion_id, cantidad_buenos, cantidad_siniestrados, fecha_manual }) => {
  if (!recepcion_id) throw new Error('Debe especificar IDs de recepcion.');

  const { data: rec, error: getErr } = await supabase
    .from('recepcion_polines')
    .select(`*, movimiento_polines(tipo_polin_id, color_polin_id)`)
    .eq('id', recepcion_id)
    .single();

  if (getErr) throw new Error(getErr.message);
  if (rec.estado_recepcion !== 'PENDIENTE') throw new Error('Esta recepción ya fue procesada.');

  const totalProcesado = parseInt(cantidad_buenos, 10) + parseInt(cantidad_siniestrados, 10);
  if (totalProcesado !== rec.cantidad_liberada) {
    throw new Error(`La suma de buenos (${cantidad_buenos}) y siniestrados (${cantidad_siniestrados}) debe ser exactamente ${rec.cantidad_liberada}.`);
  }

  const { error: updErr } = await supabase
    .from('recepcion_polines')
    .update({
      cantidad_buenos,
      cantidad_siniestrados,
      estado_recepcion: 'RECIBIDO',
      fecha_recepcion: fecha_manual ? new Date(fecha_manual).toISOString() : new Date().toISOString()
    })
    .eq('id', recepcion_id);

  if (updErr) throw new Error(updErr.message);

  if (cantidad_buenos > 0) {
    const { tipo_polin_id, color_polin_id } = rec.movimiento_polines;
    
    const { data: inv } = await supabase
      .from('inventario')
      .select('*')
      .eq('tipo_polin_id', tipo_polin_id)
      .eq('color_polin_id', color_polin_id)
      .single();

    if (inv) {
      await supabase
        .from('inventario')
        .update({ cantidad_disponible: inv.cantidad_disponible + parseInt(cantidad_buenos, 10) })
        .eq('id', inv.id);
    }
  }

  return { success: true, message: 'Recepción procesada.' };
};

// ─────────────────────────────────────────────────────────────
// HISTORIAL DE MOVIMIENTOS
// ─────────────────────────────────────────────────────────────
export const getHistorial = async ({ rol, entityId }) => {
  let query = supabase
    .from('movimiento_polines')
    .select(`
      *,
      cliente_directo (id, nombre),
      cliente_final (id, nombre),
      tipo_polin (id, nombre),
      color_polin (id, nombre)
    `)
    .order('fecha_inicio', { ascending: false });

  if (rol === 'CLIENTE_DIRECTO') {
    query = query.eq('cliente_directo_id', entityId);
  } else if (rol === 'CLIENTE_FINAL') {
    query = query.eq('cliente_final_id', entityId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

