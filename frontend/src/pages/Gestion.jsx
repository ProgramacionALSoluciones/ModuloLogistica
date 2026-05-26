import { useState, useEffect } from 'react';
import * as api from '../services/api';

const Gestion = () => {
  const [activeTab, setActiveTab] = useState('directos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({ directos: [], finales: [], usuarios: [], inventario: [] });
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (activeTab === 'directos') res = await api.getGestionClientesDirectos();
      else if (activeTab === 'finales') {
        const [resFinales, resDirectos] = await Promise.all([
          api.getGestionClientesFinales(),
          api.getGestionClientesDirectos()
        ]);
        setData(prev => ({ 
          ...prev, 
          finales: resFinales.data.data,
          directos: resDirectos.data.data 
        }));
        setLoading(false);
        return;
      }
      else if (activeTab === 'usuarios') {
        const [resUsers, resCD, resCF] = await Promise.all([
          api.getGestionUsuarios(),
          api.getGestionClientesDirectos(),
          api.getGestionClientesFinales()
        ]);
        setData(prev => ({ 
          ...prev, 
          usuarios: resUsers.data.data,
          directos: resCD.data.data,
          finales: resCF.data.data
        }));
        setLoading(false);
        return;
      }
      else if (activeTab === 'inventario') res = await api.getGestionInventario();
      
      if (res && res.data.success) {
        setData(prev => ({ ...prev, [activeTab]: res.data.data }));
      }
    } catch (err) {
      setError('Error al cargar datos de gestión.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      // Para Clientes Finales, extraer IDs de la relación rel_cliente_directo_final
      if (activeTab === 'finales') {
        const directosIds = item.rel_cliente_directo_final?.map(r => r.cliente_directo_id) || [];
        setFormData({ ...item, directosIds });
      } else if (activeTab === 'usuarios') {
        const entityIds = item.rol === 'CLIENTE_DIRECTO'
          ? item.rel_usuario_cliente_directo?.map(r => r.cliente_directo_id) || []
          : item.rel_usuario_cliente_final?.map(r => r.cliente_final_id) || [];
        setFormData({ ...item, password: '', entityIds });
      } else {
        setFormData({ ...item });
      }
    } else {
      if (activeTab === 'finales') {
        setFormData({ directosIds: [] });
      } else if (activeTab === 'usuarios') {
        setFormData({ rol: '', activo: true, password: '', entityIds: [] });
      } else {
        setFormData({ activo: true });
      }
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      // LIMPIEZA DE DATOS SEGÚN TAB PARA EVITAR ERRORES DE SCHEMA CACHE
      let preparedData = { ...formData };
      
      // Eliminar objetos anidados comunes y campos que no existen en tablas base
      const fieldsToRemove = ['tipo_polin', 'color_polin', 'cliente_directo', 'cliente_final', 'rel_cliente_directo_final', 'rel_usuario_cliente_directo', 'rel_usuario_cliente_final'];
      fieldsToRemove.forEach(field => delete preparedData[field]);

      if (activeTab === 'usuarios') {
        // Los entityIds ya están en preparedData
        // Podemos eliminar los campos individuales viejos para evitar conflictos en el backend
        delete preparedData.cliente_directo_id;
        delete preparedData.cliente_final_id;
      } else {
        // Para otras pestañas, asegurar que no se envíen campos de usuario
        delete preparedData.rol;
        delete preparedData.password;
      }

      if (activeTab === 'directos') {
        res = editingItem 
          ? await api.updateClienteDirecto(editingItem.id, preparedData)
          : await api.createClienteDirecto(preparedData);
      } else if (activeTab === 'finales') {
        res = editingItem
          ? await api.updateClienteFinal(editingItem.id, preparedData)
          : await api.createClienteFinal(preparedData);
      } else if (activeTab === 'usuarios') {
        res = editingItem
          ? await api.updateUsuario(editingItem.id, preparedData)
          : await api.createUsuario(preparedData);
      } else if (activeTab === 'inventario') {
        res = await api.updateInventario(editingItem.id, preparedData);
      }

      if (res.data.success) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert('Error al guardar: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Gestión Administrativa</h1>
        {activeTab !== 'inventario' && (
          <button 
            onClick={() => openModal()}
            className="bg-primary-500 text-black font-bold px-4 py-2 rounded-lg hover:bg-primary-600 transition shadow-sm"
          >
            + Añadir Nuevo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-4">
        {[
          { id: 'directos', label: 'Clientes Directos' },
          { id: 'finales', label: 'Clientes Finales' },
          { id: 'usuarios', label: 'Usuarios' },
          { id: 'inventario', label: 'Inventario' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md font-bold transition ${activeTab === tab.id ? 'bg-primary-500 text-black' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="text-red-500 bg-red-50 p-3 rounded">{error}</div>}

      <div className="bg-white shadow rounded-lg overflow-x-auto border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {activeTab === 'directos' && (
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            )}
            {activeTab === 'finales' && (
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relaciones</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            )}
            {activeTab === 'usuarios' && (
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vínculo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            )}
            {activeTab === 'inventario' && (
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Polín</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Disponible</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ajustar</th>
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-400">Cargando...</td></tr>
            ) : data[activeTab].length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-400">No hay registros</td></tr>
            ) : data[activeTab].map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                {activeTab === 'directos' && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.contacto}<br/><span className="text-xs">{item.telefono}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </>
                )}
                {activeTab === 'finales' && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.ubicacion}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.rel_cliente_directo_final?.length || 0} cl. asociados
                    </td>
                  </>
                )}
                {activeTab === 'usuarios' && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.rol}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.rol === 'CLIENTE_DIRECTO' 
                        ? (item.rel_usuario_cliente_directo?.map(r => r.cliente_directo?.nombre).join(', ') || '-')
                        : (item.rel_usuario_cliente_final?.map(r => r.cliente_final?.nombre).join(', ') || '-')
                      }
                    </td>
                  </>
                )}
                {activeTab === 'inventario' && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.tipo_polin?.nombre} <span className="text-gray-400">({item.color_polin?.nombre})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">{item.cantidad_total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-primary-700 font-bold">{item.cantidad_disponible}</td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openModal(item)} className="text-primary-700 hover:text-primary-900 font-bold">
                    {activeTab === 'inventario' ? 'Ajustar' : 'Editar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Genérico */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {editingItem ? 'Editar' : 'Añadir'} {activeTab === 'directos' ? 'Cliente Directo' : activeTab === 'finales' ? 'Cliente Final' : activeTab === 'usuarios' ? 'Usuario' : 'Inventario'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {activeTab === 'directos' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre de Empresa</label>
                    <input required type="text" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} className="mt-1 block w-full border rounded-md p-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contacto</label>
                      <input type="text" value={formData.contacto || ''} onChange={e => setFormData({...formData, contacto: e.target.value})} className="mt-1 block w-full border rounded-md p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <input type="text" value={formData.telefono || ''} onChange={e => setFormData({...formData, telefono: e.target.value})} className="mt-1 block w-full border rounded-md p-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Facturación</label>
                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full border rounded-md p-2" />
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" checked={formData.activo ?? true} onChange={e => setFormData({...formData, activo: e.target.checked})} className="mr-2" />
                    <label className="text-sm font-medium text-gray-700">Activo / Visible</label>
                  </div>
                </>
              )}

              {activeTab === 'finales' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre de Ubicación / CEDIS</label>
                    <input required type="text" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} className="mt-1 block w-full border rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ubicación Geográfica</label>
                    <input type="text" value={formData.ubicacion || ''} onChange={e => setFormData({...formData, ubicacion: e.target.value})} className="mt-1 block w-full border rounded-md p-2" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asociar con Clientes Directos (Fábricas)</label>
                    <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2 bg-gray-50">
                      {data.directos.map(cd => (
                        <label key={cd.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-white p-1 rounded transition">
                          <input 
                            type="checkbox" 
                            checked={formData.directosIds?.includes(cd.id)} 
                            onChange={e => {
                              const ids = formData.directosIds || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, directosIds: [...ids, cd.id] });
                              } else {
                                setFormData({ ...formData, directosIds: ids.filter(id => id !== cd.id) });
                              }
                            }}
                             className="rounded text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-gray-700">{cd.nombre}</span>
                        </label>
                      ))}
                      {data.directos.length === 0 && <p className="text-xs text-gray-400 italic">No hay clientes directos disponibles.</p>}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'usuarios' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                      <input required type="text" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} className="mt-1 block w-full border rounded-md p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rol</label>
                      <select required value={formData.rol || ''} onChange={e => setFormData({...formData, rol: e.target.value})} className="mt-1 block w-full border rounded-md p-2">
                        <option value="">-- Seleccione Rol --</option>
                        <option value="PERSONAL">PERSONAL (Admin)</option>
                        <option value="CLIENTE_DIRECTO">CLIENTE DIRECTO</option>
                        <option value="CLIENTE_FINAL">CLIENTE FINAL</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email (Login)</label>
                    <input required type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full border rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contraseña {editingItem && '(Dejar vacío para mantener)'}</label>
                    <input type="password" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} className="mt-1 block w-full border rounded-md p-2" placeholder="********" />
                  </div>

                  {/* Asociación condicional (Múltiple) */}
                  {formData.rol === 'CLIENTE_DIRECTO' && (
                    <div className="bg-primary-50 p-3 rounded-md animate-slideDown border border-primary-100">
                      <label className="block text-sm font-bold text-primary-900 mb-2">Fábricas / Clientes Directos Asociados</label>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2 bg-white">
                        {data.directos.map(cd => (
                          <label key={cd.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded transition">
                            <input 
                              type="checkbox" 
                              checked={formData.entityIds?.includes(cd.id)} 
                              onChange={e => {
                                const ids = formData.entityIds || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, entityIds: [...ids, cd.id] });
                                } else {
                                  setFormData({ ...formData, entityIds: ids.filter(id => id !== cd.id) });
                                }
                              }}
                               className="rounded text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-gray-700">{cd.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.rol === 'CLIENTE_FINAL' && (
                    <div className="bg-amber-50 p-3 rounded-md animate-slideDown border border-amber-100">
                      <label className="block text-sm font-bold text-amber-700 mb-2">Ubicaciones / Clientes Finales Asociados</label>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2 bg-white">
                        {data.finales.map(cf => (
                          <label key={cf.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded transition">
                            <input 
                              type="checkbox" 
                              checked={formData.entityIds?.includes(cf.id)} 
                              onChange={e => {
                                const ids = formData.entityIds || [];
                                if (e.target.checked) {
                                  setFormData({ ...formData, entityIds: [...ids, cf.id] });
                                } else {
                                  setFormData({ ...formData, entityIds: ids.filter(id => id !== cf.id) });
                                }
                              }}
                               className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-gray-700">{cf.nombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'inventario' && (
                <>
                  <p className="text-sm font-bold">{editingItem?.tipo_polin?.nombre} ({editingItem?.color_polin?.nombre})</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stock Total (Físico)</label>
                      <input required type="number" value={formData.cantidad_total || 0} onChange={e => setFormData({...formData, cantidad_total: parseInt(e.target.value)})} className="mt-1 block w-full border rounded-md p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stock Disponible</label>
                      <input required type="number" value={formData.cantidad_disponible || 0} onChange={e => setFormData({...formData, cantidad_disponible: parseInt(e.target.value)})} className="mt-1 block w-full border rounded-md p-2" />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" disabled={loading} className="px-6 py-2 bg-primary-500 text-black font-bold rounded-md hover:bg-primary-600 disabled:bg-primary-200 shadow-sm">
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gestion;
