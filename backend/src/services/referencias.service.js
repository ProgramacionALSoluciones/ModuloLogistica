import { supabase } from '../config/supabase.js';

export const obtenerReferencias = async (userRole, entityIds) => {
  const ids = Array.isArray(entityIds) ? entityIds : (entityIds ? [entityIds] : []);
  // 1. Clientes Directos
  let qDirectos = supabase.from('cliente_directo').select('id, nombre, contacto, telefono, email').eq('activo', true);
  if (userRole === 'CLIENTE_DIRECTO' && ids.length > 0) qDirectos = qDirectos.in('id', ids);

  const { data: clientesDirectos, error: errCD } = await qDirectos;
  if (errCD) throw new Error(errCD.message);

  // 2. Clientes Finales
  let qFinales;
  if (userRole === 'CLIENTE_DIRECTO') {
    // Filtrar por tabla relacional many-to-many
    qFinales = supabase
      .from('cliente_final')
      .select('id, nombre, ubicacion, rel_cliente_directo_final!inner(cliente_directo_id)')
      .in('rel_cliente_directo_final.cliente_directo_id', ids);
  } else if (userRole === 'CLIENTE_FINAL' && ids.length > 0) {
    qFinales = supabase.from('cliente_final').select('id, nombre, ubicacion').in('id', ids);
  } else {
    // ADMIN o sin rol: todos
    qFinales = supabase.from('cliente_final').select('id, nombre, ubicacion');
  }

  const { data: clientesFinales, error: errCF } = await qFinales;
  if (errCF) throw new Error(errCF.message);

  // 3. Tipos de Polines
  const { data: tiposPolin, error: errTP } = await supabase
    .from('tipo_polin')
    .select('id, nombre, descripcion');
  if (errTP) throw new Error(errTP.message);

  // 4. Colores de Polines
  const { data: coloresPolin, error: errCP } = await supabase
    .from('color_polin')
    .select('id, nombre');
  if (errCP) throw new Error(errCP.message);

  // 5. Movimientos Activos
  let qMov = supabase
    .from('movimiento_polines')
    .select(`
      *,
      cliente_directo:cliente_directo_id ( id, nombre ),
      cliente_final:cliente_final_id ( id, nombre ),
      tipo_polin:tipo_polin_id ( id, nombre ),
      color_polin:color_polin_id ( id, nombre )
    `)
    .is('fecha_fin', null)
    .order('fecha_inicio', { ascending: false });

  if (userRole === 'CLIENTE_DIRECTO' && ids.length > 0) qMov = qMov.in('cliente_directo_id', ids);
  if (userRole === 'CLIENTE_FINAL' && ids.length > 0) {
    qMov = qMov.in('cliente_final_id', ids).eq('estado_uso', 'TRANSPORTE');
  }

  const { data: movimientosActivos, error: errMA } = await qMov;

  // Formatear con label legible e información de disponibilidad
  const movimientosFormateados = movimientosActivos.map(mov => {
    const clienteName = mov.cliente_directo?.nombre || 'Sin cliente';
    const tipoName = mov.tipo_polin?.nombre || 'Polín';
    const colorName = mov.color_polin?.nombre || '';
    const destinoName = mov.cliente_final ? ` → ${mov.cliente_final.nombre}` : '';
    const restante = mov.cantidad_restante ?? mov.cantidad;

    return {
      id: mov.id,
      estado_uso: mov.estado_uso,
      tipo_movimiento: mov.tipo_movimiento,
      cantidad: mov.cantidad,
      cantidad_restante: restante,
      es_hijo: !!mov.movimiento_origen_id,
      cliente_directo_id: mov.cliente_directo_id,
      tipo_polin_id: mov.tipo_polin_id,
      color_polin_id: mov.color_polin_id,
      cliente_directo: mov.cliente_directo,
      tipo_polin: mov.tipo_polin,
      color_polin: mov.color_polin,
      cliente_final: mov.cliente_final,
      cliente_final_id: mov.cliente_final_id,
      fecha_inicio: mov.fecha_inicio,
      label: `[${mov.estado_uso}] ${restante} ${colorName} | ${clienteName}${destinoName}`
    };
  });

  return {
    clientes_directos: clientesDirectos,
    clientes_finales: clientesFinales,
    tipos_polin: tiposPolin,
    colores_polin: coloresPolin,
    movimientos_activos: movimientosFormateados
  };
};
