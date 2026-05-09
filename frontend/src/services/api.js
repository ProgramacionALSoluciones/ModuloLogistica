import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('polines_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = (credentials) => api.post('/login', credentials);

export const getReferencias = () => api.get('/referencias');
export const getPolinesCliente = (clienteId) => api.get(`/clientes/${clienteId}/polines`);
export const registrarEntrega = (data) => api.post('/entregas', data);
export const enviarTransporte = (data) => api.post('/movimientos/transporte', data);
export const liberarPolines = (data) => api.post('/movimientos/liberacion', data);
export const generarFacturacion = (data) => api.post('/facturacion/generar', data);
export const getRecepcionesPendientes = () => api.get('/recepciones/pendientes');
export const procesarRecepcion = (data) => api.post('/recepcion', data);
export const getHistorial = () => api.get('/historial');

// GESTION
export const getGestionClientesDirectos = () => api.get('/gestion/clientes-directos');
export const createClienteDirecto = (data) => api.post('/gestion/clientes-directos', data);
export const updateClienteDirecto = (id, data) => api.put(`/gestion/clientes-directos/${id}`, data);

export const getGestionClientesFinales = () => api.get('/gestion/clientes-finales');
export const createClienteFinal = (data) => api.post('/gestion/clientes-finales', data);
export const updateClienteFinal = (id, data) => api.put(`/gestion/clientes-finales/${id}`, data);

export const getGestionUsuarios = () => api.get('/gestion/usuarios');
export const createUsuario = (data) => api.post('/gestion/usuarios', data);
export const updateUsuario = (id, data) => api.put(`/gestion/usuarios/${id}`, data);

export const getGestionInventario = () => api.get('/gestion/inventario');
export const updateInventario = (id, data) => api.put(`/gestion/inventario/${id}`, data);

export default api;
