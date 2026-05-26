import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const login = async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos' });
  }

  try {
    // 1. Buscar usuario por email
    const { data: usuario, error } = await supabase
      .from('usuario')
      .select(`
        *,
        rel_usuario_cliente_directo ( cliente_directo ( id, nombre ) ),
        rel_usuario_cliente_final ( cliente_final ( id, nombre ) )
      `)
      .eq('email', email)
      .eq('activo', true)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // 2. Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, usuario.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // 3. Determinar entityName y entityIds
    let entityName = usuario.nombre;
    let entityIds = [];

    if (usuario.rol === 'CLIENTE_DIRECTO' && usuario.rel_usuario_cliente_directo) {
      entityIds = usuario.rel_usuario_cliente_directo.map(r => r.cliente_directo.id);
      entityName = usuario.rel_usuario_cliente_directo.map(r => r.cliente_directo.nombre).join(', ') || usuario.nombre;
    } else if (usuario.rol === 'CLIENTE_FINAL' && usuario.rel_usuario_cliente_final) {
      entityIds = usuario.rel_usuario_cliente_final.map(r => r.cliente_final.id);
      entityName = usuario.rel_usuario_cliente_final.map(r => r.cliente_final.nombre).join(', ') || usuario.nombre;
    }

    // Por compatibilidad temporal (si solo hay 1)
    const primaryEntityId = entityIds.length > 0 ? entityIds[0] : null;

    // 4. Generar Token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        rol: usuario.rol,
        entityId: primaryEntityId,
        entityIds
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 5. Retornar datos (sin el password)
    const { password: _, ...userSession } = usuario;
    res.json({
      success: true,
      token,
      user: {
        ...userSession,
        role: usuario.rol,
        entityName,
        entityId: primaryEntityId,
        entityIds
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
