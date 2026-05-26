import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No se proveyó un token' });
  }

  const tokenTokenArr = authHeader.split(' ');
  const token = tokenTokenArr.length === 2 ? tokenTokenArr[1] : tokenTokenArr[0];

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};
