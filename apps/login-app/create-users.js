const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: 'admin',
  host: 'postgres-service',
  database: 'routerlab',
  password: 'RouterLabAdmin2025',
  port: 5432,
});

async function createUsers() {
  try {
    console.log('Conectando a PostgreSQL...');
    
    // Crear usuario admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      ['admin@routerlab.local', adminPassword, 'admin']
    );
    console.log('✓ Usuario admin creado');
    
    // Crear usuario normal
    const userPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      ['user@routerlab.local', userPassword, 'user']
    );
    console.log('✓ Usuario user creado');
    
    // Verificar usuarios creados
    const users = await pool.query('SELECT id, email, role FROM users');
    console.log('Usuarios creados:', users.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createUsers();