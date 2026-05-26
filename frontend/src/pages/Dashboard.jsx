import { useState, useEffect } from 'react';
import { getReferencias } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Helper de zona horaria para interpretar fechas sin sufijo de timezone en UTC
const parseUTCDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  if (!dateStr.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(dateStr)) {
    return new Date(dateStr + 'Z');
  }
  return new Date(dateStr);
};

const Dashboard = () => {
  const { user } = useAuth();
  const [movimientos, setMovimientos] = useState([]);
  const [clientesDirectos, setClientesDirectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtro de Cliente Directo para Admin
  const [filtroCliente, setFiltroCliente] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await getReferencias();
        if (data.success) {
          const movs = data.data.movimientos_activos || [];
          setMovimientos(movs);
          if (data.data.clientes_directos) {
            setClientesDirectos(data.data.clientes_directos);
          }
        }
      } catch (err) {
        setError('Error al obtener datos del dashboard.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  // Aplicar filtro de cliente directo en memoria para Admin
  const filteredMovimientos = movimientos.filter(m => {
    if (user?.role !== 'ADMIN') return true;

    if (filtroCliente && m.cliente_directo_id !== filtroCliente) {
      return false;
    }

    return true;
  });

  // Calcular estadísticas de forma dinámica e instantánea sobre la lista filtrada
  const getEstadisticasDinamicas = (movs) => {
    let totalAlm = 0;
    let totalTransp = 0;
    let totalPull = 0;
    
    const porCliente = {};
    
    // Inicializar con todos los clientes asociados para asegurar que se listen con 0
    clientesDirectos.forEach(c => {
      porCliente[c.id] = { nombre: c.nombre, almacenamiento: 0, transporte: 0, pull_fijo: 0 };
    });

    movs.forEach(m => {
      const cid = m.cliente_directo_id;
      if (!porCliente[cid]) {
        porCliente[cid] = { nombre: m.cliente_directo?.nombre || 'Desconocido', almacenamiento: 0, transporte: 0, pull_fijo: 0 };
      }
      if (m.estado_uso === 'ALMACENAMIENTO') {
        totalAlm += m.cantidad_restante;
        porCliente[cid].almacenamiento += m.cantidad_restante;
      }
      if (m.estado_uso === 'TRANSPORTE') {
        totalTransp += m.cantidad_restante;
        porCliente[cid].transporte += m.cantidad_restante;
      }
      if (m.estado_uso === 'PULL_FIJO') {
        totalPull += m.cantidad_restante;
        porCliente[cid].pull_fijo += m.cantidad_restante;
      }
    });

    return {
      global: { almacenamiento: totalAlm, transporte: totalTransp, pull_fijo: totalPull },
      porCliente: Object.values(porCliente)
    };
  };

  const stats = getEstadisticasDinamicas(filteredMovimientos);

  if (loading) return <div className="text-center py-10 text-gray-500 dark:text-slate-400">Cargando dashboard...</div>;
  if (error) return <div className="text-red-500 p-4 text-center">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 border-b dark:border-slate-800 pb-2">
        Bienvenido, <span className="text-indigo-600 dark:text-primary-400">{user?.nombre || user?.entityName}</span>
        <span className="text-sm font-normal text-gray-500 dark:text-slate-400 ml-2">
          ({user?.role === 'ADMIN' ? 'Administrador' :
            user?.role === 'CLIENTE_DIRECTO' ? 'Cliente Directo' : 'Cliente Final'})
        </span>
      </h1>

      {/* Filtro Simplificado de Cliente para Admin */}
      {user?.role === 'ADMIN' && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2 text-gray-700 dark:text-slate-300 font-bold">
            <svg className="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm">Filtrar Inventario por Cliente Directo:</span>
          </div>
          
          <div className="flex items-center space-x-3 flex-grow max-w-md w-full">
            <select
              value={filtroCliente}
              onChange={e => setFiltroCliente(e.target.value)}
              className="w-full text-sm bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            >
              <option value="">Todos los clientes directos</option>
              {clientesDirectos.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            {filtroCliente && (
              <button
                onClick={() => setFiltroCliente('')}
                className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition whitespace-nowrap"
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards para Admin (Global o por Cliente Seleccionado) */}
      {user?.role === 'ADMIN' && stats?.global && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-center rounded-lg shadow-sm p-6 flex flex-col justify-center">
            <h3 className="text-gray-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Almacenamiento</h3>
            <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">{stats.global.almacenamiento}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-center rounded-lg shadow-sm p-6 flex flex-col justify-center">
            <h3 className="text-gray-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Transporte</h3>
            <p className="text-4xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">{stats.global.transporte}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-center rounded-lg shadow-sm p-6 flex flex-col justify-center">
            <h3 className="text-gray-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Pull Fijo</h3>
            <p className="text-4xl font-extrabold text-indigo-600 dark:text-primary-400 mt-2">{stats.global.pull_fijo || 0}</p>
          </div>
        </div>
      )}

      {/* KPI por Cliente (Para CD) */}
      {user?.role === 'CLIENTE_DIRECTO' && stats?.porCliente && (
        <div className="space-y-10 mt-8">
          {stats.porCliente.map((cliente, idx) => (
            <div key={idx} className="space-y-4">
              <h2 className="text-xl font-bold text-indigo-700 dark:text-primary-400 flex items-center border-b dark:border-slate-800 pb-2">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                {cliente.nombre}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 border-l-4 border-l-blue-500 rounded-lg shadow-sm p-5 hover:shadow-md transition">
                  <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase">Almacenamiento</h3>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{cliente.almacenamiento}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border-l-4 border-l-amber-500 rounded-lg shadow-sm p-5 hover:shadow-md transition">
                  <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase">En Transporte</h3>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{cliente.transporte}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border-l-4 border-l-indigo-500 rounded-lg shadow-sm p-5 hover:shadow-md transition">
                  <h3 className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase">Pull Fijo</h3>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-primary-400">{cliente.pull_fijo}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historial para Cliente Final */}
      {user?.role === 'CLIENTE_FINAL' && (
        <div className="mt-4">
          {movimientos.length === 0 ? (
            <p className="text-gray-500 dark:text-slate-400 py-4">No hay lotes de polines registrados actualmente en su instalación.</p>
          ) : (
            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Fecha Envío</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Procedencia (Planta)</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">Tipo de Polín</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-slate-100">Pendientes a Devolver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {movimientos.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 dark:text-slate-400">
                        {parseUTCDate(m.fecha_inicio).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-slate-100 font-medium">{m.cliente_directo?.nombre || 'Desconocida'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                        {m.tipo_polin?.nombre} <span className="text-xs ml-1 text-gray-400">({m.color_polin?.nombre})</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-bold text-amber-600 dark:text-amber-400">
                        {m.cantidad_restante}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
