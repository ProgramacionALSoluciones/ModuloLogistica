import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  const username = process.env.SEED_ADMIN_EMAIL || 'admin@polines.com';
  const plainPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!plainPassword) {
    console.error('ERROR: Define SEED_ADMIN_PASSWORD en tu .env antes de ejecutar este script.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  const { data, error } = await supabase
    .from('usuario')
    .insert([
      {
        nombre: 'Administrador Sistema',
        email: username,
        password: hashedPassword,
        rol: 'ADMIN',
        activo: true
      }
    ])
    .select();

  if (error) {
    console.error('Error seeding admin:', error);
  } else {
    console.log('Admin seeded successfully:', data);
  }
}

seedAdmin();
