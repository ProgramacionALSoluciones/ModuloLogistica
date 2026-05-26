import { supabase } from '../config/supabase.js';

// ─────────────────────────────────────────────────────────────
// GENERAR FACTURACIÓN POR TRAMOS CON SUB-PERÍODOS
//
// Corrección del doble conteo en envíos parciales:
//
// Cuando un hijo (TRANSPORTE) nace dentro del mes, el tramo
// ALMACENAMIENTO del raíz se divide en sub-períodos:
//
//   [inicio raíz → salida hijo 1]  cantidad = original
//   [salida hijo 1 → salida hijo 2] cantidad = original - hijo1.cantidad
//   [salida hijo 2 → fin de mes]   cantidad = original - hijo1 - hijo2
//
// Los hijos que nacieron ANTES del mes solo reducen la cantidad
// inicial del raíz (sin generar segmento nuevo).
// ─────────────────────────────────────────────────────────────
export const generarFacturacion = async ({ cliente_directo_id, mes, anio, fecha_desde, fecha_hasta }) => {
  // Si se proporcionan fechas manuales, se usan. De lo contrario, se usa el mes completo.
  const fechaInicioMes = fecha_desde ? new Date(fecha_desde + 'T00:00:00') : new Date(anio, mes - 1, 1);
  const fechaFinMes    = fecha_hasta ? new Date(fecha_hasta + 'T23:59:59') : new Date(anio, mes, 0, 23, 59, 59);

  // 1. Todos los movimientos del cliente con actividad en el período
  const { data: todosMovimientos, error: movsErr } = await supabase
    .from('movimiento_polines')
    .select('*')
    .eq('cliente_directo_id', cliente_directo_id)
    .lte('fecha_inicio', fechaFinMes.toISOString());

  if (movsErr) throw new Error(movsErr.message);

  const movsMes = todosMovimientos.filter(m =>
    !m.fecha_fin || new Date(m.fecha_fin) >= fechaInicioMes
  );

  // 2. Tarifas activas
  const { data: tarifas, error: tarifasErr } = await supabase
    .from('tarifa')
    .select('*')
    .eq('activo', true);
  if (tarifasErr) throw new Error(tarifasErr.message);

  const getTarifa = (tipo) => {
    const t = tarifas.find(t => t.tipo === tipo);
    return t ? parseFloat(t.precio_por_dia) : 0;
  };

  // 3. Separar raíces e hijos
  const movimientosRaiz = todosMovimientos.filter(m => !m.movimiento_origen_id);
  const movimientosHijo = todosMovimientos.filter(m => !!m.movimiento_origen_id);

  let total_almacenamiento = 0;
  let total_transporte     = 0;
  let total_pull_fijo      = 0;
  let total_costo_entrega  = 0;
  let total_siniestros     = 0;
  const detalles = [];

  for (const raiz of movimientosRaiz) {
    // Límites del raíz dentro del mes a facturar
    const raizInicioMes = new Date(
      Math.max(new Date(raiz.fecha_inicio).getTime(), fechaInicioMes.getTime())
    );
    const raizFinMes = raiz.fecha_fin
      ? new Date(Math.min(new Date(raiz.fecha_fin).getTime(), fechaFinMes.getTime()))
      : new Date(fechaFinMes);

    // Saltear raíces sin actividad en el mes
    if (raizFinMes < raizInicioMes) continue;

    // Sumar costo de entrega si inició este mes
    if (new Date(raiz.fecha_inicio) >= fechaInicioMes && new Date(raiz.fecha_inicio) <= fechaFinMes) {
      if (raiz.costo_entrega && parseFloat(raiz.costo_entrega) > 0) {
        const costo = parseFloat(raiz.costo_entrega);
        total_costo_entrega += costo;
        detalles.push({
          movimiento_id: raiz.id,
          estado_tramo:  'COSTO_ENTREGA',
          periodo:       fmt(new Date(raiz.fecha_inicio)),
          dias:          1,
          cantidad:      raiz.cantidad,
          tarifa:        costo,
          subtotal:      costo
        });
      }
    }

    // Hijos de este lote ordenados cronológicamente
    const hijos = movimientosHijo
      .filter(h => h.movimiento_origen_id === raiz.id)
      .sort((a, b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));

    // ── TRAMO ALMACENAMIENTO con sub-períodos ────────────────
    //
    // Partimos del total original del lote raíz.
    // Los hijos que nacieron ANTES del mes ya habían reducido
    // la cantidad almacenada → los descontamos de entrada.
    // Los hijos que nacen DENTRO del mes parten el tramo.
    // ─────────────────────────────────────────────────────────
    let cantidadEnAlm = raiz.cantidad;

    // Descontar hijos anteriores al mes
    for (const hijo of hijos) {
      if (new Date(hijo.fecha_inicio) < fechaInicioMes) {
        cantidadEnAlm -= hijo.cantidad;
      }
    }

    // Hijos que nacen durante el mes (generan corte de período)
    const hijosEnMes = hijos.filter(h => {
      const hi = new Date(h.fecha_inicio);
      return hi >= fechaInicioMes && hi <= raizFinMes;
    });

    let segmentoInicio = raizInicioMes;

    for (const hijo of hijosEnMes) {
      const hijoInicio  = new Date(hijo.fecha_inicio);
      const segmentoFin = hijoInicio; // corte cuando sale el hijo

      if (segmentoFin > segmentoInicio && cantidadEnAlm > 0) {
        const diasAlm    = calcularDias(segmentoInicio, segmentoFin);
        const tipoEstado = raiz.estado_uso === 'PULL_FIJO' ? 'PULL_FIJO' : 'ALMACENAMIENTO';
        const tarifaAlm  = getTarifa(tipoEstado);
        const subtotalAlm = diasAlm * tarifaAlm * cantidadEnAlm;
        
        if (tipoEstado === 'PULL_FIJO') total_pull_fijo += subtotalAlm;
        else total_almacenamiento += subtotalAlm;
        
        detalles.push({
          movimiento_id: raiz.id,
          estado_tramo:  tipoEstado,
          periodo:       `${fmt(segmentoInicio)} → ${fmt(segmentoFin)}`,
          dias:          diasAlm,
          cantidad:      cantidadEnAlm,
          tarifa:        tarifaAlm,
          subtotal:      subtotalAlm
        });
      }

      // El hijo se va: reducir cantidad en almacenamiento
      cantidadEnAlm -= hijo.cantidad;
      segmentoInicio = hijoInicio;
    }

    // Último sub-período ALMACENAMIENTO/PULL_FIJO (desde el último corte hasta fin de mes)
    if (raizFinMes > segmentoInicio && cantidadEnAlm > 0) {
      const diasAlm    = calcularDias(segmentoInicio, raizFinMes);
      const tipoEstado = raiz.estado_uso === 'PULL_FIJO' ? 'PULL_FIJO' : 'ALMACENAMIENTO';
      const tarifaAlm  = getTarifa(tipoEstado);
      const subtotalAlm = diasAlm * tarifaAlm * cantidadEnAlm;
      
      if (tipoEstado === 'PULL_FIJO') total_pull_fijo += subtotalAlm;
      else total_almacenamiento += subtotalAlm;
      
      detalles.push({
        movimiento_id: raiz.id,
        estado_tramo:  tipoEstado,
        periodo:       `${fmt(segmentoInicio)} → ${fmt(raizFinMes)}`,
        dias:          diasAlm,
        cantidad:      cantidadEnAlm,
        tarifa:        tarifaAlm,
        subtotal:      subtotalAlm
      });
    }

    // ── TRAMO TRANSPORTE por cada hijo ───────────────────────
    for (const hijo of hijos) {
      const inicioTrans = new Date(
        Math.max(new Date(hijo.fecha_inicio).getTime(), fechaInicioMes.getTime())
      );
      const finTrans = hijo.fecha_fin
        ? new Date(Math.min(new Date(hijo.fecha_fin).getTime(), fechaFinMes.getTime()))
        : new Date(fechaFinMes);

      if (finTrans >= inicioTrans) {
        const diasTrans    = calcularDias(inicioTrans, finTrans);
        const tarifaTrans  = getTarifa('TRANSPORTE');
        const subtotalTrans = diasTrans * tarifaTrans * hijo.cantidad;
        total_transporte   += subtotalTrans;
        detalles.push({
          movimiento_id: hijo.id,
          estado_tramo:  'TRANSPORTE',
          periodo:       `${fmt(inicioTrans)} → ${fmt(finTrans)}`,
          dias:          diasTrans,
          cantidad:      hijo.cantidad,
          tarifa:        tarifaTrans,
          subtotal:      subtotalTrans
        });
      }
    }
  }

  // 3.5. Calcular siniestros del mes
  // REGLA: No se cobra siniestro al cliente directo si la recepción viene de un cliente final (TRANSPORTE)
  const { data: siniestrosData, error: sErr } = await supabase
    .from('recepcion_polines')
    .select('*, movimiento_polines!inner(cliente_directo_id, estado_uso)')
    .eq('estado_recepcion', 'RECIBIDO')
    .eq('movimiento_polines.cliente_directo_id', cliente_directo_id)
    .gte('fecha_recepcion', fechaInicioMes.toISOString())
    .lte('fecha_recepcion', fechaFinMes.toISOString());

  if (!sErr && siniestrosData) {
    const tarifaSiniestro = getTarifa('SINIESTRO');
    for (const rec of siniestrosData) {
      if (rec.cantidad_siniestrados > 0 && rec.movimiento_polines.estado_uso !== 'TRANSPORTE') {
        const subtotalSin = rec.cantidad_siniestrados * tarifaSiniestro;
        total_siniestros += subtotalSin;
        detalles.push({
          movimiento_id: rec.movimiento_origen_id,
          estado_tramo:  'SINIESTRO',
          periodo:       fmt(new Date(rec.fecha_recepcion)),
          dias:          1,
          cantidad:      rec.cantidad_siniestrados,
          tarifa:        tarifaSiniestro,
          subtotal:      subtotalSin
        });
      }
    }
  }

  // 4. Limpieza de facturas previas para este período (Evitar duplicados)
  // Intentamos limpiar por fechas exactas si están disponibles, o por mes/año.
  let queryDelete = supabase.from('facturacion').delete().eq('cliente_directo_id', cliente_directo_id);
  
  if (fecha_desde && fecha_hasta) {
    queryDelete = queryDelete.eq('fecha_desde', fecha_desde).eq('fecha_hasta', fecha_hasta);
  } else {
    queryDelete = queryDelete.eq('mes', mes).eq('anio', anio);
  }

  const { error: cleanupErr } = await queryDelete;
  if (cleanupErr) console.warn('Aviso: No se pudo limpiar factura previa (posible falta de columnas fecha_desde/hasta):', cleanupErr.message);

  // 5. Insertar cabecera de factura
  const totalFactura = total_almacenamiento + total_transporte + total_pull_fijo + total_costo_entrega + total_siniestros;
  
  const { data: factura, error: facErr } = await supabase
    .from('facturacion')
    .insert([{
      cliente_directo_id,
      mes: mes || (fecha_desde ? new Date(fecha_desde).getMonth() + 1 : null),
      anio: anio || (fecha_desde ? new Date(fecha_desde).getFullYear() : null),
      fecha_desde: fecha_desde || null,
      fecha_hasta: fecha_hasta || null,
      total_almacenamiento: total_almacenamiento + total_pull_fijo + total_costo_entrega,
      total_siniestros,
      total_transporte,
      total: totalFactura,
      fecha_generacion: new Date().toISOString()
    }])
    .select()
    .single();

  if (facErr) throw new Error(facErr.message);

  // 5. Insertar detalles — sin estado_tramo ni periodo (campos calculados)
  if (detalles.length > 0) {
    const detallesToInsert = detalles.map(({ estado_tramo, periodo, ...d }) => ({
      facturacion_id: factura.id,
      ...d
    }));
    const { error: detErr } = await supabase
      .from('detalle_facturacion')
      .insert(detallesToInsert);
    if (detErr) throw new Error(detErr.message);
  }

  return { ...factura, detalles };
};

// ── Utilidades ────────────────────────────────────────────────
const calcularDias = (inicio, fin) => {
  const diffMs = Math.abs(fin.getTime() - inicio.getTime());
  const dias   = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return dias === 0 ? 1 : dias;
};

const fmt = (d) => d.toISOString().slice(0, 10);
