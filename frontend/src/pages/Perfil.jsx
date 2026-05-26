import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHistorial } from '../services/api';
import { jsPDF } from 'jspdf';

// Helper de zona horaria para interpretar fechas sin sufijo de timezone en UTC
const parseUTCDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (!dateStr.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(dateStr)) {
    return new Date(dateStr + 'Z');
  }
  return new Date(dateStr);
};

const Perfil = () => {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados de filtros
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [listaClientesDirectos, setListaClientesDirectos] = useState([]);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const { data } = await getHistorial();
        if (data.success) {
          setHistorial(data.data);
        }
      } catch (err) {
        setError('Error al cargar el historial de pedidos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, []);

  // Determinar si se muestra el filtro de Cliente Directo
  const showClienteDirectoFilter = 
    user?.role === 'ADMIN' || 
    (user?.role === 'CLIENTE_DIRECTO' && user?.rel_usuario_cliente_directo?.length >= 2);

  // Poblar la lista de clientes directos para el filtro
  useEffect(() => {
    if (historial.length > 0) {
      if (user?.role === 'CLIENTE_DIRECTO' && user?.rel_usuario_cliente_directo?.length >= 2) {
        const clients = user.rel_usuario_cliente_directo.map(r => r.cliente_directo).filter(Boolean);
        const uniqueClients = Array.from(new Map(clients.map(c => [c.id, c])).values());
        setListaClientesDirectos(uniqueClients);
      } else if (user?.role === 'ADMIN') {
        const clientsFromHistorial = historial.map(m => m.cliente_directo).filter(Boolean);
        const uniqueClients = Array.from(new Map(clientsFromHistorial.map(c => [c.id, c])).values());
        setListaClientesDirectos(uniqueClients);
      }
    }
  }, [historial, user]);

  // Aplicar filtros en memoria
  const filteredHistorial = historial.filter(mov => {
    // 1. Filtro por Fecha Inicio (Desde)
    if (filtroFechaInicio) {
      const movDate = parseUTCDate(mov.fecha_inicio);
      const startDate = new Date(filtroFechaInicio + 'T00:00:00');
      if (movDate < startDate) return false;
    }

    // 2. Filtro por Fecha Fin (Hasta)
    if (filtroFechaFin) {
      const movDate = parseUTCDate(mov.fecha_inicio);
      const endDate = new Date(filtroFechaFin + 'T23:59:59');
      if (movDate > endDate) return false;
    }

    // 3. Filtro por Cliente Directo
    if (filtroCliente) {
      const isOrigen = mov.cliente_origen?.id === filtroCliente;
      const isDestino = mov.cliente_directo?.id === filtroCliente;
      if (!isOrigen && !isDestino) return false;
    }

    // 4. Filtro por Tipo de Movimiento
    if (filtroTipo) {
      const displayType = (mov.tipo_movimiento === 'ENTREGA' && mov.estado_uso === 'TRANSPORTE') 
        ? 'ENVIO' 
        : mov.tipo_movimiento;

      if (displayType !== filtroTipo) return false;
    }

    return true;
  });

  // Función para descargar PDF elegante (formato recibo A5)
  const downloadPDF = (mov) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    // Banner Superior Elegante
    doc.setFillColor(31, 41, 55); // Gris oscuro premium
    doc.rect(0, 0, 148, 18, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SISTEMA DE POLINES', 10, 11);
    
    // Insignia de Comprobante
    doc.setFillColor(34, 197, 94); // Verde primary
    doc.rect(98, 5, 40, 8, 'F');
    doc.setFontSize(8);
    doc.text('COMPROBANTE', 104, 10.5); // Ajuste fino vertical
    
    // Título Principal
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Detalles del Movimiento', 10, 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const parsedDate = parseUTCDate(mov.fecha_inicio);
    const dateStr = parsedDate.toLocaleDateString();
    const timeStr = parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    doc.text(`ID Movimiento: ${mov.id.toString().substring(0, 8).toUpperCase()}`, 10, 36);
    doc.text(`Fecha y Hora: ${dateStr} - ${timeStr}`, 10, 41);
    
    // Línea divisoria
    doc.setDrawColor(220, 220, 220);
    doc.line(10, 45, 138, 45);
    
    let y = 54;
    const addRow = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(label, 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(value), 52, y);
      y += 8;
    };
    
    const displayType = (mov.tipo_movimiento === 'ENTREGA' && mov.estado_uso === 'TRANSPORTE') 
      ? 'ENVIO' 
      : mov.tipo_movimiento;

    addRow('Tipo Movimiento:', displayType);
    addRow('Tipo de Polín:', mov.tipo_polin?.nombre || '-');
    addRow('Color de Polín:', mov.color_polin?.nombre || '-');
    
    // Cantidad destacada en verde
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Cantidad:', 10, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(11);
    doc.text(String(mov.cantidad), 52, y);
    doc.setFontSize(9);
    y += 8;

    doc.setTextColor(30, 30, 30);

    if (displayType === 'TRASLADO') {
      addRow('Planta Origen:', mov.cliente_origen?.nombre || 'Almacén Central');
      addRow('Planta Destino:', mov.cliente_destino?.nombre || '-');
    } else {
      if (mov.cliente_directo) {
        addRow('Cliente Directo:', mov.cliente_directo.nombre);
      }
      if (mov.cliente_final) {
        addRow('Cliente Final:', mov.cliente_final.nombre);
      }
    }
    
    if (mov.remision) {
      addRow('N° Remisión:', mov.remision);
    }
    if (mov.orden_compra) {
      addRow('Orden de Compra:', mov.orden_compra);
    }
    
    // Firmas al pie de página
    doc.setDrawColor(220, 220, 220);
    doc.line(10, 160, 138, 160);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    
    doc.line(15, 185, 65, 185);
    doc.text('Firma Autorizada', 28, 190);
    
    doc.line(83, 185, 133, 185);
    doc.text('Recibido Conforme', 95, 190);
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Este documento es un comprobante digital emitido por el Sistema de Polines.', 23, 202);
    
    doc.save(`comprobante-${displayType.toLowerCase()}-${mov.id.toString().substring(0, 8)}.pdf`);
  };

  if (loading) return <div className="text-center py-10 text-gray-500 dark:text-slate-400">Cargando perfil...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center space-x-6">
        <div className="h-20 w-20 bg-primary-500 rounded-full flex items-center justify-center text-black text-3xl font-bold shadow-inner flex-shrink-0">
          {user?.nombre?.charAt(0) || user?.entityName?.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{user?.entityName}</h1>
          <p className="text-gray-500 dark:text-slate-400">{user?.nombre || 'Representante'}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 mt-1">
            {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'CLIENTE_DIRECTO' ? 'Cliente Directo' : 'Cliente Final'}
          </span>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2 border-b dark:border-slate-700 pb-2">Historial de Pedidos / Movimientos</h2>
        
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">{error}</div>}

        {/* Panel de Filtros */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 font-bold border-b dark:border-slate-700 pb-2">
            <svg className="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm">Filtros de Búsqueda</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1">Fecha Desde</label>
              <input
                type="date"
                value={filtroFechaInicio}
                onChange={e => setFiltroFechaInicio(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={filtroFechaFin}
                onChange={e => setFiltroFechaFin(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>
            {showClienteDirectoFilter && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1">Cliente Directo</label>
                <select
                  value={filtroCliente}
                  onChange={e => setFiltroCliente(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                >
                  <option value="">Todos los clientes</option>
                  {listaClientesDirectos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={showClienteDirectoFilter ? "col-span-1" : "col-span-1 md:col-span-2"}>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1">Tipo de Movimiento</label>
              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              >
                <option value="">Todos los tipos</option>
                <option value="ENTREGA">ENTREGA</option>
                <option value="ENVIO">ENVIO</option>
                <option value="TRASLADO">TRASLADO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA (Interna)</option>
                <option value="DEVOLUCION">DEVOLUCION</option>
                <option value="SINIESTRO">SINIESTRO</option>
              </select>
            </div>
          </div>

          {(filtroFechaInicio || filtroFechaFin || filtroCliente || filtroTipo) && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setFiltroFechaInicio('');
                  setFiltroFechaFin('');
                  setFiltroCliente('');
                  setFiltroTipo('');
                }}
                className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center space-x-1 transition"
              >
                <span>✕ Limpiar todos los filtros</span>
              </button>
            </div>
          )}
        </div>

        {filteredHistorial.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-10 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500">
            No se encontraron movimientos registrados con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-hidden bg-white dark:bg-slate-900 shadow sm:rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Detalle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Cantidad</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredHistorial.map((mov) => {
                  const dateObj = parseUTCDate(mov.fecha_inicio);
                  const displayType = (mov.tipo_movimiento === 'ENTREGA' && mov.estado_uso === 'TRANSPORTE') ? 'ENVIO' : mov.tipo_movimiento;
                  
                  return (
                    <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        <div className="font-semibold text-gray-800 dark:text-slate-200">{dateObj.toLocaleDateString()}</div>
                        <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 font-medium">
                          {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100">
                        <div className="font-medium">{mov.tipo_polin?.nombre}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500">{mov.color_polin?.nombre}</div>
                        
                        {displayType === 'TRASLADO' ? (
                          <>
                            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">Origen: {mov.cliente_origen?.nombre || 'Almacén Central'}</div>
                            <div className="text-xs text-blue-500 dark:text-blue-400 mt-1 font-semibold">Destino: {mov.cliente_destino?.nombre}</div>
                          </>
                        ) : (
                          <>
                            {user?.role !== 'CLIENTE_FINAL' && mov.cliente_final && (
                              <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">Destino: {mov.cliente_final.nombre}</div>
                            )}
                            {user?.role !== 'CLIENTE_DIRECTO' && mov.cliente_directo && (
                              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Origen: {mov.cliente_directo.nombre}</div>
                            )}
                          </>
                        )}
                        
                        {mov.remision && (
                          <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">Remisión: {mov.remision}</div>
                        )}
                        {mov.orden_compra && (
                          <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">OC: {mov.orden_compra}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          displayType === 'ENTREGA' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          displayType === 'ENVIO' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          displayType === 'TRANSFERENCIA' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                          displayType === 'TRASLADO' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                          displayType === 'DEVOLUCION' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                        }`}>
                          {displayType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-slate-100">
                        {mov.cantidad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => downloadPDF(mov)}
                          className="inline-flex items-center space-x-1 text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 font-bold bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20 px-2.5 py-1.5 rounded-lg transition-colors border border-primary-100 dark:border-primary-900/25"
                          title="Descargar Comprobante PDF"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Perfil;
