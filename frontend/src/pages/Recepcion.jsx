import { useState, useEffect } from 'react';
import { getRecepcionesPendientes, procesarRecepcion } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const Recepcion = () => {
  const [recepciones, setRecepciones] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [formValues, setFormValues] = useState({});
  const { user } = useAuth();
  const [confirmId, setConfirmId] = useState(null);

  const fetchPendientes = async () => {
    try {
      const { data } = await getRecepcionesPendientes();
      if (data.success) {
        setRecepciones(data.data);
        
        // Inicializar formValues
        const initialForm = {};
        data.data.forEach(rec => {
          initialForm[rec.id] = {
            cantidad_buenos: rec.cantidad_liberada,
            cantidad_siniestrados: 0,
            fecha_manual: '',
            remision: ''
          };
        });
        setFormValues(initialForm);
      }
    } catch (err) {
      console.error('Error cargando recepciones pendientes', err);
    }
  };

  useEffect(() => {
    fetchPendientes();
  }, []);

  const handleChange = (id, field, value) => {
    const rec = recepciones.find(r => r.id === id);
    if (!rec) return;

    setFormValues(prev => {
      const current = { ...prev[id] };
      
      if (field === 'fecha_manual' || field === 'remision') {
        current[field] = value;
        return { ...prev, [id]: current };
      }

      const val = parseInt(value, 10) || 0;
      current[field] = val;
      
      // Auto-balancear si es posible
      if (field === 'cantidad_buenos') {
        current.cantidad_siniestrados = Math.max(0, rec.cantidad_liberada - val);
      } else if (field === 'cantidad_siniestrados') {
        current.cantidad_buenos = Math.max(0, rec.cantidad_liberada - val);
      }

      return { ...prev, [id]: current };
    });
  };

  const handleProcesar = (id) => {
    setMensaje({ tipo: '', texto: '' });
    const vals = formValues[id];
    const rec = recepciones.find(r => r.id === id);
    
    if (vals.cantidad_buenos + vals.cantidad_siniestrados !== rec.cantidad_liberada) {
      setMensaje({ tipo: 'error', texto: `La suma de buenos y siniestrados debe ser exactamente ${rec.cantidad_liberada}.` });
      return;
    }

    setConfirmId(id);
  };

  const handleConfirmProcesar = async () => {
    const id = confirmId;
    setConfirmId(null);
    const vals = formValues[id];

    try {
      const result = await procesarRecepcion({
        recepcion_id: id,
        cantidad_buenos: vals.cantidad_buenos,
        cantidad_siniestrados: vals.cantidad_siniestrados,
        fecha_manual: vals.fecha_manual,
        remision: vals.remision
      });

      if (result.data.success) {
        setMensaje({ tipo: 'success', texto: 'Recepción procesada exitosamente.' });
        fetchPendientes(); // Refresh
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + (err.response?.data?.error || err.message) });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-2">Recepción de Polines</h1>
      <p className="text-gray-600 text-sm">
        Procesa las solicitudes de liberación. Define cuántos polines retornaron en buen estado al inventario y cuántos se consideran siniestrados (dañados).
      </p>

      {mensaje.texto && (
        <div className={`p-4 rounded-md ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensaje.texto}
        </div>
      )}

      {recepciones.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center text-gray-500">
          No hay recepciones pendientes en este momento.
        </div>
      ) : (
        <div className="space-y-4">
          {recepciones.map((rec) => {
            const mov = rec.movimiento_polines;
            const origen = mov.estado_uso === 'TRANSPORTE' ? mov.cliente_final?.nombre : mov.cliente_directo?.nombre;
            return (
              <div key={rec.id} className="bg-white border rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Liberación desde: {origen}</h3>
                    <p className="text-sm text-gray-500">
                      Polín: <span className="font-medium text-gray-700">{mov.color_polin?.nombre}</span> | 
                      Modalidad Original: {mov.estado_uso}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Fecha Liberación: {new Date(rec.fecha_liberacion).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-primary-600">{rec.cantidad_liberada}</span>
                    <p className="text-xs font-medium uppercase text-gray-500">Total a Recibir</p>
                  </div>
                </div>

                <div className={`bg-gray-50 rounded p-4 grid grid-cols-1 ${user?.role === 'ADMIN' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 items-end`}>
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-1">
                      Buenos (Regresan a Inv.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={rec.cantidad_liberada}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border"
                      value={formValues[rec.id]?.cantidad_buenos ?? ''}
                      onChange={(e) => handleChange(rec.id, 'cantidad_buenos', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-1">
                      Siniestrados (Cobro extra)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={rec.cantidad_liberada}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border"
                      value={formValues[rec.id]?.cantidad_siniestrados ?? ''}
                      onChange={(e) => handleChange(rec.id, 'cantidad_siniestrados', e.target.value)}
                    />
                  </div>
                  
                  {user?.role === 'ADMIN' && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Remisión
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border text-xs"
                          value={formValues[rec.id]?.remision ?? ''}
                          onChange={(e) => handleChange(rec.id, 'remision', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha Manual
                        </label>
                        <input
                          type="datetime-local"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border text-xs"
                          value={formValues[rec.id]?.fecha_manual ?? ''}
                          onChange={(e) => handleChange(rec.id, 'fecha_manual', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <button
                      onClick={() => handleProcesar(rec.id)}
                      className="w-full bg-primary-500 hover:bg-primary-600 text-black font-bold py-2.5 px-4 rounded-md transition duration-150 shadow-sm"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirmProcesar}
        title="Confirmar Recepción"
      >
        {confirmId && recepciones.find(r => r.id === confirmId) && (
          <>
            <p><strong>Polín:</strong> {recepciones.find(r => r.id === confirmId).movimiento_polines?.tipo_polin?.nombre} ({recepciones.find(r => r.id === confirmId).movimiento_polines?.color_polin?.nombre})</p>
            <p><strong>Total a Recibir:</strong> {recepciones.find(r => r.id === confirmId).cantidad_liberada}</p>
            <p><strong>Buenos:</strong> {formValues[confirmId]?.cantidad_buenos}</p>
            <p><strong>Siniestrados:</strong> {formValues[confirmId]?.cantidad_siniestrados}</p>
            {formValues[confirmId]?.remision && <p><strong>Remisión:</strong> {formValues[confirmId]?.remision}</p>}
          </>
        )}
      </ConfirmModal>
    </div>
  );
};

export default Recepcion;
