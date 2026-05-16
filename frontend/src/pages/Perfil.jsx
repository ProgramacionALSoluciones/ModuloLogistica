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

  if (loading) return <div className="text-center py-10">Cargando perfil...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-6">
        <div className="h-20 w-20 bg-primary-500 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-inner">
          {user?.nombre?.charAt(0) || user?.entityName?.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{user?.entityName}</h1>
          <p className="text-gray-500">{user?.nombre || 'Representante'}</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-1">
            {user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'CLIENTE_DIRECTO' ? 'Cliente Directo' : 'Cliente Final'}
          </span>
        </div>
      </header>

      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Historial de Pedidos / Movimientos</h2>
        
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>}

        {historial.length === 0 ? (
          <div className="bg-white p-10 text-center rounded-xl border border-dashed border-gray-300 text-gray-400">
            No se han registrado movimientos aún.
          </div>
        ) : (
          <div className="overflow-hidden bg-white shadow sm:rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historial.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(mov.fecha_inicio).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{mov.tipo_polin?.nombre}</div>
                      <div className="text-xs text-gray-400">{mov.color_polin?.nombre}</div>
                      {user?.role !== 'CLIENTE_FINAL' && mov.cliente_final && (
                        <div className="text-xs text-blue-500 mt-1">Destino: {mov.cliente_final.nombre}</div>
                      )}
                      {user?.role !== 'CLIENTE_DIRECTO' && mov.cliente_directo && (
                        <div className="text-xs text-amber-600 mt-1">Origen: {mov.cliente_directo.nombre}</div>
                      )}
                      {mov.remision && (
                        <div className="text-xs text-gray-500 mt-1">Remisión: {mov.remision}</div>
                      )}
                      {mov.orden_compra && (
                        <div className="text-xs text-gray-500 mt-1">OC: {mov.orden_compra}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        mov.tipo_movimiento === 'ENTREGA' ? 'bg-green-100 text-green-700' :
                        mov.tipo_movimiento === 'ENVIO' ? 'bg-blue-100 text-blue-700' :
                        mov.tipo_movimiento === 'TRANSFERENCIA' ? 'bg-purple-100 text-purple-700' :
                        mov.tipo_movimiento === 'DEVOLUCION' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {mov.tipo_movimiento}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      {mov.cantidad}
                      {mov.cantidad_restante !== mov.cantidad && !mov.fecha_fin && (
                        <span className="block text-[10px] text-amber-500 font-normal">Restante: {mov.cantidad_restante}</span>
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
