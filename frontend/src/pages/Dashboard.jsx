import { useState, useEffect } from 'react';
import { getReferencias, getPolinesCliente } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [estadisticas, setEstadisticas] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        if (user?.role === 'CLIENTE_FINAL') {
          // Cliente final ve su historial (obtenido de las referencias que ya vienen filtradas por su entityId en el backend)
          const { data } = await getReferencias();
          if (data.success) {
            setMovimientos(data.data.movimientos_activos || []);
          }
        } else if (user?.role === 'CLIENTE_DIRECTO' || user?.role === 'ADMIN') {
          // Tanto Admin como Cliente Directo pueden usar las referencias (ya filtradas en el backend)
          // para calcular sus estadísticas globales/consolidadas.
          const { data } = await getReferencias();
          if (data.success) {
            const movs = data.data.movimientos_activos || [];
            let totalAlm = 0;
            let totalTransp = 0;
            let totalPull = 0;
            movs.forEach(m => {
              if (m.estado_uso === 'ALMACENAMIENTO') totalAlm += m.cantidad_restante;
              if (m.estado_uso === 'TRANSPORTE') totalTransp += m.cantidad_restante;
              if (m.estado_uso === 'PULL_FIJO') totalPull += m.cantidad_restante;
            });
            setEstadisticas({ almacenamiento: totalAlm, transporte: totalTransp, pull_fijo: totalPull });
            setMovimientos(movs);
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

  if (loading) return <div>Cargando dashboard...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-2">
        Bienvenido, <span className="text-indigo-600">{user?.nombre || user?.entityName}</span>
        <span className="text-sm font-normal text-gray-500 ml-2">
          ({user?.role === 'ADMIN' ? 'Administrador' :
            user?.role === 'CLIENTE_DIRECTO' ? 'Cliente Directo' : 'Cliente Final'})
        </span>
      </h1>

      {/* KPI Cards para Admin y Cliente Directo */}
      {(user?.role === 'ADMIN' || user?.role === 'CLIENTE_DIRECTO') && estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white border text-center rounded-lg shadow-  sm p-6 flex flex-col justify-center transform transition hover:scale-105">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">En Almacenamiento</h3>
            <p className="text-4xl font-extrabold text-blue-600 mt-2">{estadisticas.almacenamiento}</p>
            <div className="mt-4 text-xs text-center text-gray-400">Polines actualmente en plantas</div>
          </div>

          <div className="bg-white border text-center rounded-lg shadow-sm p-6 flex flex-col justify-center transform transition hover:scale-105">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">En Transporte</h3>
            <p className="text-4xl font-extrabold text-amber-600 mt-2">{estadisticas.transporte}</p>
            <div className="mt-4 text-xs text-center text-gray-400">Polines enviados a clientes finales</div>
          </div>

          <div className="bg-white border text-center rounded-lg shadow-sm p-6 flex flex-col justify-center transform transition hover:scale-105">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">En Pull Fijo</h3>
            <p className="text-4xl font-extrabold text-indigo-600 mt-2">{estadisticas.pull_fijo || 0}</p>
            <div className="mt-4 text-xs text-center text-gray-400">Polines en depósito fijo</div>
          </div>
        </div>
      )}

      {/* Tabla global para Admin y Cliente Directo con desglose */}
      {(user?.role === 'ADMIN' || user?.role === 'CLIENTE_DIRECTO') && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4">
            {user?.role === 'ADMIN' ? 'Inventario Global de Clientes' : 'Desglose de Inventario por Planta'}
          </h2>
          <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Origen / Destino</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Polín</th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Cantidad Restante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${m.estado_uso === 'ALMACENAMIENTO' ? 'bg-blue-100 text-blue-800' :
                        m.estado_uso === 'PULL_FIJO' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-amber-100 text-amber-800'}`}>
                        {m.estado_uso}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {m.cliente_directo?.nombre} {m.cliente_final ? ` → ${m.cliente_final.nombre}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{m.tipo_polin?.nombre} ({m.color_polin?.nombre})</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right text-gray-900 font-bold">{m.cantidad_restante}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historial para Cliente Final */}
      {user?.role === 'CLIENTE_FINAL' && (
        <div className="mt-4">
          {movimientos.length === 0 ? (
            <p className="text-gray-500 py-4">No hay lotes de polines registrados actualmente en su instalación.</p>
          ) : (
            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Fecha Envío</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Procedencia (Planta)</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tipo de Polín</th>
                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Pendientes a Devolver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {movimientos.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500">
                        {new Date(m.fecha_inicio).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">{m.cliente_directo?.nombre || 'Desconocida'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {m.tipo_polin?.nombre} <span className="text-xs ml-1 text-gray-400">({m.color_polin?.nombre})</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-bold text-amber-600">
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
