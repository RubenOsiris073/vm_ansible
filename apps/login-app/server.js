const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

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
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Aquí implementarías la lógica de autenticación
  console.log('Login attempt:', { email, password: '***' });
  
  // Simulación de validación
  if (email && password) {
    if (email === 'admin@routerlab.local' && password === 'admin123') {
      res.json({ 
        success: true, 
        message: 'Login exitoso',
        user: {
          email: email,
          role: 'admin'
        },
        redirect: 'https://routerlab.local' // Redirigir al router-admin
      });
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }
  } else {
    res.status(400).json({ 
      success: false, 
      message: 'Email y contraseña son requeridos' 
    });
  }
});

app.post('/api/register', (req, res) => {
  const { nombre, apellido_paterno, apellido_materno, email, password, captcha, role, superior_code } = req.body;
  
  // Validar captcha
  if (parseInt(captcha) !== 8) {
    return res.status(400).json({ 
      success: false, 
      message: 'Captcha incorrecto. La respuesta es 8.' 
    });
  }
  
  // Aquí implementarías la lógica de registro
  console.log('Register attempt:', { 
    nombre, 
    apellido_paterno, 
    apellido_materno, 
    email, 
    role, 
    superior_code,
    password: '***' 
  });
  
  // Simulación de registro
  if (nombre && apellido_paterno && email && password && role) {
    res.json({ 
      success: true, 
      message: 'Usuario registrado exitosamente',
      user: {
        nombre: nombre,
        apellido_paterno: apellido_paterno,
        apellido_materno: apellido_materno,
        email: email,
        role: role
      }
    });
  } else {
    res.status(400).json({ 
      success: false, 
      message: 'Todos los campos requeridos deben ser completados' 
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