const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  user: 'admin',
  host: 'postgres-service',
  database: 'routerlab',
  password: 'RouterLabAdmin2025',
  port: 5432,
});

// Probar conexión a la base de datos al iniciar
pool.connect()
  .then(client => {
    console.log('✓ Conectado a PostgreSQL exitosamente');
    client.release();
  })
  .catch(err => {
    console.error('✗ Error conectando a PostgreSQL:', err.message);
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal - servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para registro
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// API endpoints para autenticación
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password: '***' });
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email y contraseña son requeridos' 
    });
  }
  
  try {
    // Buscar usuario en la base de datos
    const userQuery = 'SELECT id, email, password, role FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
    
    // Verificar permisos según el rol
    const allowedRoles = ['admin', 'supervisor', 'tecnico', 'operador'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Solo usuarios con permisos pueden acceder al sistema de gestión.' 
      });
    }
    
    // Login exitoso
    res.json({ 
      success: true, 
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      redirect: `https://routerlab.local?user=${encodeURIComponent(JSON.stringify({id: user.id, email: user.email, role: user.role}))}`
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

app.post('/api/register', async (req, res) => {
  const { nombre, apellido_paterno, apellido_materno, email, password, captcha, role, superior_code } = req.body;
  
  // Validar captcha
  if (parseInt(captcha) !== 8) {
    return res.status(400).json({ 
      success: false, 
      message: 'Captcha incorrecto. La respuesta es 8.' 
    });
  }
  
  console.log('Register attempt:', { 
    nombre, 
    apellido_paterno, 
    apellido_materno, 
    email, 
    role, 
    superior_code,
    password: '***' 
  });
  
  if (!nombre || !apellido_paterno || !email || !password || !role) {
    return res.status(400).json({ 
      success: false, 
      message: 'Todos los campos requeridos deben ser completados' 
    });
  }
  
  try {
    // Verificar si el email ya existe
    const existingUserQuery = 'SELECT email FROM users WHERE email = $1';
    const existingUser = await pool.query(existingUserQuery, [email]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email ya está registrado' 
      });
    }
    
    // Hash de la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insertar nuevo usuario (solo se permiten roles 'user' por registro normal)
    const userRole = role === 'admin' ? 'user' : 'user'; // Por seguridad, forzar 'user'
    const insertUserQuery = 'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role';
    const newUser = await pool.query(insertUserQuery, [email, hashedPassword, userRole]);
    
    res.json({ 
      success: true, 
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        role: newUser.rows[0].role
      }
    });
    
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Ruta para registro de administradores
app.get('/admin-register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-register.html'));
});

// API para registro de usuarios por administradores
app.post('/api/admin/register', async (req, res) => {
  const { adminUser, newUser } = req.body;
  
  if (!adminUser || !newUser) {
    return res.status(400).json({ 
      success: false, 
      message: 'Información de administrador y nuevo usuario requerida' 
    });
  }
  
  // Verificar que quien registra sea admin
  if (adminUser.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Solo administradores pueden registrar usuarios' 
    });
  }
  
  const { email, password, role } = newUser;
  
  if (!email || !password || !role) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email, contraseña y rol son requeridos' 
    });
  }
  
  // Validar rol
  const validRoles = ['admin', 'supervisor', 'tecnico', 'operador', 'readonly'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Rol no válido' 
    });
  }
  
  try {
    // Verificar si el email ya existe
    const existingUserQuery = 'SELECT email FROM users WHERE email = $1';
    const existingUser = await pool.query(existingUserQuery, [email]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email ya está registrado' 
      });
    }
    
    // Hash de la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insertar nuevo usuario
    const insertUserQuery = 'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role';
    const newUserResult = await pool.query(insertUserQuery, [email, hashedPassword, role]);
    
    res.json({ 
      success: true, 
      message: `Usuario registrado exitosamente con rol ${role}`,
      user: newUserResult.rows[0]
    });
    
  } catch (error) {
    console.error('Error en registro por admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Ruta de salud para verificar que el servicio está funcionando
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Login App servidor ejecutándose en puerto ${PORT}`);
  console.log(`Acceso local: http://localhost:${PORT}`);
});

module.exports = app;