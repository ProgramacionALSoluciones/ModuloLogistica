import { useState, useEffect } from 'react';
import { liberarPolines, getReferencias } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const BADGE = {
  ALMACENAMIENTO: 'bg-blue-100 text-blue-800',
  TRANSPORTE:     'bg-amber-100 text-amber-800',
  PULL_FIJO:      'bg-indigo-100 text-indigo-800'
};

const Devoluciones = () => {
  const [formData, setFormData] = useState({ grupo_movimiento: '', cantidad_liberar: '', fecha_manual: '' });
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [movSeleccionado, setMovSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [referencias, setReferencias] = useState({ movimientos_activos: [] });

  const fetchReferencias = async () => {
    try {
      const { data } = await getReferencias();
      if (data.success) {
        let currentRole = '';
        try {
          const userStr = localStorage.getItem('polines_user');
          if (userStr) currentRole = JSON.parse(userStr).role;
        } catch (e) {}

        const agrupados = data.data.movimientos_activos.reduce((acc, mov) => {
          if (!mov.tipo_polin || !mov.color_polin) return acc;
          if (currentRole === 'CLIENTE_DIRECTO' && mov.estado_uso === 'TRANSPORTE') return acc; // NO permite liberar envíos a clientes finales
          
          const dueño_id = mov.estado_uso === 'TRANSPORTE' ? mov.cliente_final?.id : mov.cliente_directo?.id;
          const dueño_nombre = mov.estado_uso === 'TRANSPORTE' ? mov.cliente_final?.nombre : mov.cliente_directo?.nombre;
          if (!dueño_id) return acc; // Skip if no owner context

          const key = `${mov.estado_uso}|${dueño_id}|${mov.tipo_polin.id}|${mov.color_polin.id}`;
          if (!acc[key]) {
            acc[key] = {
              id: key,
              estado_uso: mov.estado_uso,
              cliente_dueño_id: dueño_id,
              tipo_polin_id: mov.tipo_polin.id,
              color_polin_id: mov.color_polin.id,
              dueño_nombre: dueño_nombre,
              tipo_nombre: mov.tipo_polin.nombre,
              color_nombre: mov.color_polin.nombre,
              cantidad_restante: 0
            };
          }
          acc[key].cantidad_restante += mov.cantidad_restante;
          return acc;
        }, {});

        const lotes_agrupados = Object.values(agrupados).map(g => ({
          ...g,
          label: `[${g.estado_uso}] Cliente: ${g.dueño_nombre} | Disponible: ${g.cantidad_restante} (${g.color_nombre})`
        }));

        setReferencias({ movimientos_activos: lotes_agrupados });
      }
    } catch (err) {
      console.error('Error cargando referencias:', err);
    }
  };

  useEffect(() => {
    fetchReferencias();
  }, []);

  const handleMovimientoChange = (e) => {
    const id = e.target.value;
    const mov = referencias.movimientos_activos.find(m => m.id === id);
    setMovSeleccionado(mov || null);
    setFormData({
      grupo_movimiento: id,
      cantidad_liberar: mov ? mov.cantidad_restante : ''
    });
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setMensaje({ tipo: '', texto: '' });
    try {
      const cantidadEnviada = parseInt(formData.cantidad_liberar, 10);
      const result = await liberarPolines({
        estado_uso: movSeleccionado.estado_uso,
        cliente_dueño_id: movSeleccionado.cliente_dueño_id,
        tipo_polin_id: movSeleccionado.tipo_polin_id,
        color_polin_id: movSeleccionado.color_polin_id,
        cantidad_liberar: cantidadEnviada
      });

      const { parcial, cantidad_liberada, cantidad_restante, estado_previo, message } = result.data.data;
      setMensaje({
        tipo: 'success',
        texto: message
      });

      setFormData({ grupo_movimiento: '', cantidad_liberar: '', fecha_manual: '' });
      setMovSeleccionado(null);
      
      // Update inventory directly by refetching due to complexities
      fetchReferencias();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al devolver polines. ' + (err.response?.data?.error || err.message) });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-2">Devolución de Polines</h1>
      <p className="text-gray-600 text-sm">
        Devuelve polines. Estos pasarán al estado "Pendiente de Recepción" hasta que el administrador consolide las cantidades reales retornadas y siniestradas.
      </p>

      {mensaje.texto && (
        <div className={`p-4 rounded-md ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-gray-50 p-6 rounded-lg border border-gray-100">
        {/* Selector de movimiento agrupado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Inventario a Devolver
          </label>
          <select
            name="grupo_movimiento"
            required
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border bg-white"
            value={formData.grupo_movimiento}
            onChange={handleMovimientoChange}
          >
            <option value="">-- Seleccione el Inventario --</option>
            {referencias.movimientos_activos.map(mov => (
              <option key={mov.id} value={mov.id}>{mov.label}</option>
            ))}
          </select>

          {movSeleccionado && (
            <div className="mt-2 flex items-center gap-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE[movSeleccionado.estado_uso] || 'bg-gray-100 text-gray-700'}`}>
                {movSeleccionado.estado_uso}
              </span>
              <span className="text-xs text-gray-500">
                Disponibles totales: <strong>{movSeleccionado.cantidad_restante}</strong> unidades
              </span>
            </div>
          )}
        </div>

        {/* Cantidad a liberar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad a Devolver
          </label>
          <input
            type="number"
            name="cantidad_liberar"
            required
            min="1"
            max={movSeleccionado?.cantidad_restante || undefined}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
            value={formData.cantidad_liberar}
            onChange={handleChange}
            placeholder={movSeleccionado ? `Máx. ${movSeleccionado.cantidad_restante}` : 'Seleccione inventario primero'}
          />
          {movSeleccionado && formData.cantidad_liberar !== '' && parseInt(formData.cantidad_liberar, 10) < movSeleccionado.cantidad_restante && (
            <p className="mt-1 text-xs text-amber-600">
              Devolución parcial — {movSeleccionado.cantidad_restante - parseInt(formData.cantidad_liberar, 10)} unidades permanecerán activas para este grupo.
            </p>
          )}
          {movSeleccionado && formData.cantidad_liberar !== '' && parseInt(formData.cantidad_liberar, 10) === movSeleccionado.cantidad_restante && (
            <p className="mt-1 text-xs text-emerald-600">
              Devolución total — todo el inventario de este grupo pasará a pendiente de recepción.
            </p>
          )}
        </div>

        {user?.role === 'ADMIN' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Manual (Opcional - Operación a destiempo)
            </label>
            <input
              type="datetime-local"
              name="fecha_manual"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
              value={formData.fecha_manual}
              onChange={handleChange}
            />
            <p className="mt-1 text-xs text-gray-500">Si se deja vacío, se usará la fecha y hora actual del servidor.</p>
          </div>
        )}

        <div className="pt-4 border-t">
          <button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600 text-black font-bold py-2.5 px-4 rounded-md transition duration-150 shadow-sm"
          >
            Confirmar Devolución
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmar Devolución"
      >
        <p><strong>Origen:</strong> {movSeleccionado?.dueño_nombre}</p>
        <p><strong>Polín:</strong> {movSeleccionado?.tipo_nombre} ({movSeleccionado?.color_nombre})</p>
        <p><strong>Cantidad a Devolver:</strong> {formData.cantidad_liberar}</p>
      </ConfirmModal>
    </div>
  );
};

export default Devoluciones;
