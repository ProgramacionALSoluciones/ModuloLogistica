import { useState, useEffect } from 'react';
import { realizarTransferencia, getReferencias } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const Transferencias = () => {
  const [formData, setFormData] = useState({
    grupo_origen: '',
    cantidad: '',
    fecha_manual: ''
  });
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [movSeleccionado, setMovSeleccionado] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [referencias, setReferencias] = useState({
    movimientos_activos: []
  });

  const fetchReferencias = async () => {
    try {
      const { data } = await getReferencias();
      if (data.success) {
        // Solo movimientos en ALMACENAMIENTO o PULL_FIJO con cantidad_restante > 0
        const disponibles = data.data.movimientos_activos.filter(
          m => ['ALMACENAMIENTO', 'PULL_FIJO'].includes(m.estado_uso) && m.cantidad_restante > 0
        );

        // Agrupar inventario por estado_uso, cliente, tipo de polín y color
        const agrupados = disponibles.reduce((acc, mov) => {
          if (!mov.cliente_directo || !mov.tipo_polin || !mov.color_polin) return acc;
          const key = `${mov.estado_uso}|${mov.cliente_directo_id}|${mov.tipo_polin_id}|${mov.color_polin_id}`;
          if (!acc[key]) {
            acc[key] = {
              id: key,
              estado_uso: mov.estado_uso,
              cliente_directo_id: mov.cliente_directo_id,
              tipo_polin_id: mov.tipo_polin_id,
              color_polin_id: mov.color_polin_id,
              cliente_nombre: mov.cliente_directo?.nombre || 'Desconocido',
              tipo_nombre: mov.tipo_polin?.nombre || 'Polín',
              color_nombre: mov.color_polin?.nombre || '',
              cantidad_restante: 0
            };
          }
          acc[key].cantidad_restante += mov.cantidad_restante;
          return acc;
        }, {});

        const lotes_agrupados = Object.values(agrupados).map(g => ({
          ...g,
          label: `[${g.estado_uso}] Cliente: ${g.cliente_nombre} | Cantidad: ${g.cantidad_restante} (${g.color_nombre})`
        }));

        setReferencias({
          movimientos_activos: lotes_agrupados
        });
      }
    } catch (err) {
      console.error('Error cargando referencias', err);
    }
  };

  useEffect(() => {
    fetchReferencias();
  }, []);

  const handleMovimientoChange = (e) => {
    const id = e.target.value;
    const mov = referencias.movimientos_activos.find(m => m.id === id);
    setMovSeleccionado(mov || null);
    setFormData(prev => ({
      ...prev,
      grupo_origen: id,
      cantidad: mov ? mov.cantidad_restante : ''
    }));
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setMensaje({ tipo: '', texto: '' });
    try {
      const a_estado = movSeleccionado.estado_uso === 'ALMACENAMIENTO' ? 'PULL_FIJO' : 'ALMACENAMIENTO';
      
      await realizarTransferencia({
        cliente_directo_id: movSeleccionado.cliente_directo_id,
        tipo_polin_id: movSeleccionado.tipo_polin_id,
        color_polin_id: movSeleccionado.color_polin_id,
        de_estado: movSeleccionado.estado_uso,
        a_estado: a_estado,
        cantidad: parseInt(formData.cantidad, 10),
        fecha_manual: user?.role === 'ADMIN' ? formData.fecha_manual : null
      });

      setMensaje({ tipo: 'success', texto: `Transferencia realizada con éxito hacia ${a_estado}.` });
      setFormData({ grupo_origen: '', cantidad: '', fecha_manual: '' });
      setMovSeleccionado(null);
      fetchReferencias();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error al realizar transferencia: ' + (err.response?.data?.error || err.message) });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-2">Transferencia Interna</h1>
      <p className="text-gray-600 text-sm">
        Mueve polines entre Almacenamiento y Pull Fijo para un mismo cliente. Esta operación no afecta la ubicación física, solo la categoría de uso.
      </p>

      {mensaje.texto && (
        <div className={`p-4 rounded-md ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-gray-50 p-6 rounded-lg border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Origen de la Transferencia
          </label>
          <select
            name="grupo_origen"
            required
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white"
            value={formData.grupo_origen}
            onChange={handleMovimientoChange}
          >
            <option value="">-- Seleccione el Inventario --</option>
            {referencias.movimientos_activos.map(mov => (
              <option key={mov.id} value={mov.id}>{mov.label}</option>
            ))}
          </select>
        </div>

        {movSeleccionado && (
          <div className="bg-white p-4 rounded border border-primary-100 shadow-sm animate-fadeIn">
            <p className="text-sm">
              Se transferirá desde <strong>{movSeleccionado.estado_uso}</strong> hacia <strong>{movSeleccionado.estado_uso === 'ALMACENAMIENTO' ? 'PULL_FIJO' : 'ALMACENAMIENTO'}</strong>
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad a Transferir
          </label>
          <input
            type="number"
            name="cantidad"
            required
            min="1"
            max={movSeleccionado?.cantidad_restante || undefined}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
            value={formData.cantidad}
            onChange={handleChange}
            placeholder={movSeleccionado ? `Máx. ${movSeleccionado.cantidad_restante}` : 'Seleccione un origen primero'}
          />
        </div>

        {user?.role === 'ADMIN' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Manual (Opcional)
            </label>
            <input
              type="datetime-local"
              name="fecha_manual"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border"
              value={formData.fecha_manual}
              onChange={handleChange}
            />
          </div>
        )}

        <div className="pt-4 border-t">
          <button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600 text-black font-bold py-2.5 px-4 rounded-md transition duration-150 shadow-sm"
          >
            Realizar Transferencia
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmar Transferencia Interna"
      >
        <p><strong>Cliente:</strong> {movSeleccionado?.cliente_nombre}</p>
        <p><strong>De:</strong> {movSeleccionado?.estado_uso}</p>
        <p><strong>A:</strong> {movSeleccionado?.estado_uso === 'ALMACENAMIENTO' ? 'PULL_FIJO' : 'ALMACENAMIENTO'}</p>
        <p><strong>Polín:</strong> {movSeleccionado?.tipo_nombre} ({movSeleccionado?.color_nombre})</p>
        <p><strong>Cantidad:</strong> {formData.cantidad}</p>
      </ConfirmModal>
    </div>
  );
};

export default Transferencias;
