import * as FacturacionService from '../services/facturacion.service.js';

export const generarFacturacion = async (req, res) => {
  try {
    const { rol: userRole } = req.user || {};

    // Seguridad: Solo el personal administrativo (ADMIN) puede generar facturación
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'No tiene permisos para generar facturación.' });
    }

    const data = req.body;
    const result = await FacturacionService.generarFacturacion(data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error Generacion Facturacion:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};
