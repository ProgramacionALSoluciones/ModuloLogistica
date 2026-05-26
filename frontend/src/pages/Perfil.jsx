import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHistorial } from '../services/api';

const Perfil = () => {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      <section>
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4 border-b dark:border-slate-700 pb-2">Historial de Pedidos / Movimientos</h2>
        
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-4 border border-red-200 dark:border-red-800">{error}</div>}

        {historial.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-10 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500">
            No se han registrado movimientos aún.
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
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                {historial.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      {new Date(mov.fecha_inicio).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100">
                      <div className="font-medium">{mov.tipo_polin?.nombre}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500">{mov.color_polin?.nombre}</div>
                      {user?.role !== 'CLIENTE_FINAL' && mov.cliente_final && (
                        <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">Destino: {mov.cliente_final.nombre}</div>
                      )}
                      {user?.role !== 'CLIENTE_DIRECTO' && mov.cliente_directo && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">Origen: {mov.cliente_directo.nombre}</div>
                      )}
                      {mov.remision && (
                        <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">Remisión: {mov.remision}</div>
                      )}
                      {mov.orden_compra && (
                        <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">OC: {mov.orden_compra}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        (mov.tipo_movimiento === 'ENTREGA' && mov.estado_uso !== 'TRANSPORTE') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        (mov.tipo_movimiento === 'ENVIO' || (mov.tipo_movimiento === 'ENTREGA' && mov.estado_uso === 'TRANSPORTE')) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        mov.tipo_movimiento === 'TRANSFERENCIA' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                        mov.tipo_movimiento === 'DEVOLUCION' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                        'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                      }`}>
                        {(mov.tipo_movimiento === 'ENTREGA' && mov.estado_uso === 'TRANSPORTE') ? 'ENVIO' : mov.tipo_movimiento}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-slate-100">
                      {mov.cantidad}
                      {mov.cantidad_restante !== mov.cantidad && !mov.fecha_fin && (
                        <span className="block text-[10px] text-amber-500 dark:text-amber-400 font-normal">Restante: {mov.cantidad_restante}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Perfil;

