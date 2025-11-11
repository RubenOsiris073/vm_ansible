const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'admin',
  host: 'postgres-service',
  database: 'routerlab',
  password: 'RouterLabAdmin2025',
  port: 5432,
});

async function createTechUser() {
  try {
    console.log('Creando usuario técnico...');
    
    const techPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      ['tecnico@routerlab.local', techPassword, 'tecnico']
    );
    console.log('✓ Usuario tecnico creado');
    
    // Mostrar todos los usuarios
    const users = await pool.query('SELECT id, email, role FROM users ORDER BY id');
    console.log('Usuarios disponibles:');
    users.rows.forEach(user => {
      console.log(`  ${user.id}: ${user.email} (${user.role})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createTechUser();