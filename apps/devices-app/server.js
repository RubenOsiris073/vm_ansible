const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const https = require('https');
const ping = require('ping');

const app = express();
const PORT = process.env.PORT || 3002;

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  user: 'admin',
  host: 'postgres-service',
  database: 'routerlab',
  password: 'RouterLabAdmin2025',
  port: 5432,
});

// Configurar cliente HTTPS que ignore certificados auto-firmados
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
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

// === API ENDPOINTS ANTES DE ARCHIVOS ESTÁTICOS ===
// Endpoints de autenticación
app.get('/auth/verify', async (req, res) => {
  const userDataParam = req.query.user;
  
  if (!userDataParam) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado'
    });
  }

  try {
    const userData = JSON.parse(decodeURIComponent(userDataParam));
    
    // Verificar que el usuario existe en la base de datos
    const result = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE email = $1',
      [userData.email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = result.rows[0];
    
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    });

  } catch (error) {
    console.error('Error verificando usuario:', error);
    res.status(401).json({
      success: false,
      message: 'Error de autenticación'
    });
  }
});

app.post('/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logout exitoso' });
});

// API para validar permisos del usuario
app.get('/api/user/permissions', (req, res) => {
  const userDataParam = req.query.user;
  
  if (!userDataParam) {
    return res.status(400).json({
      success: false,
      message: 'Información de usuario requerida'
    });
  }
  
  try {
    const userData = JSON.parse(decodeURIComponent(userDataParam));
    
    // Definir permisos para inventario según rol
    let permissions = {
      canRead: false,
      canWrite: false,
      canDelete: false,
      canAddDevices: false,
      canTestConnectivity: false
    };
    
    switch (userData.role) {
      case 'admin':
        permissions = {
          canRead: true,
          canWrite: true,
          canDelete: true,
          canAddDevices: true,
          canTestConnectivity: true
        };
        break;
      case 'supervisor':
        permissions = {
          canRead: true,
          canWrite: true,
          canDelete: true,
          canAddDevices: true,
          canTestConnectivity: true
        };
        break;
      case 'tecnico':
        permissions = {
          canRead: true,
          canWrite: false,
          canDelete: false,
          canAddDevices: false,
          canTestConnectivity: true
        };
        break;
      case 'operador':
        permissions = {
          canRead: true,
          canWrite: true,
          canDelete: false,
          canAddDevices: false,
          canTestConnectivity: true
        };
        break;
      default:
        permissions = {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canAddDevices: false,
          canTestConnectivity: false
        };
    }
    
    res.json({
      success: true,
      user: userData,
      permissions: permissions
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Datos de usuario inválidos'
    });
  }
});

// API para obtener todos los dispositivos
app.get('/api/devices', async (req, res) => {
  try {
    const devicesQuery = 'SELECT * FROM devices ORDER BY created_at DESC';
    const result = await pool.query(devicesQuery);
    
    res.json({
      success: true,
      devices: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo dispositivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// API para agregar nuevo dispositivo
app.post('/api/devices', async (req, res) => {
  const { name, ip, port, username, password, description, userRole } = req.body;
  
  // Validar permisos
  if (!userRole || (userRole !== 'admin' && userRole !== 'supervisor')) {
    return res.status(403).json({
      success: false,
      message: 'Solo administradores y supervisores pueden agregar dispositivos'
    });
  }
  
  if (!name || !ip || !port || !username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son requeridos'
    });
  }
  
  try {
    // Verificar si ya existe un dispositivo con la misma IP
    const existingDevice = await pool.query('SELECT id FROM devices WHERE ip = $1', [ip]);
    if (existingDevice.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un dispositivo con esta IP'
      });
    }
    
    const insertQuery = `
      INSERT INTO devices (name, ip, port, username, password, description, status) 
      VALUES ($1, $2, $3, $4, $5, $6, 'unknown') 
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [name, ip, port, username, password, description || '']);
    
    res.json({
      success: true,
      message: 'Dispositivo agregado exitosamente',
      device: result.rows[0]
    });
  } catch (error) {
    console.error('Error agregando dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// API para probar conectividad de un dispositivo
app.post('/api/devices/:id/test', async (req, res) => {
  const deviceId = req.params.id;
  const { userRole } = req.body;
  
  // Validar permisos
  if (!userRole) {
    return res.status(403).json({
      success: false,
      message: 'Rol de usuario requerido'
    });
  }
  
  try {
    // Obtener dispositivo
    const deviceQuery = 'SELECT * FROM devices WHERE id = $1';
    const deviceResult = await pool.query(deviceQuery, [deviceId]);
    
    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }
    
    const device = deviceResult.rows[0];
    
    // Probar conectividad RESTCONF
    try {
      const response = await axios.get(`https://${device.ip}:${device.port}/restconf/`, {
        auth: {
          username: device.username,
          password: device.password
        },
        httpsAgent: httpsAgent,
        timeout: 10000
      });
      
      // Actualizar estado en base de datos
      await pool.query('UPDATE devices SET status = $1, last_check = CURRENT_TIMESTAMP WHERE id = $2', 
        ['online', deviceId]);
      
      res.json({
        success: true,
        status: 'online',
        message: 'Dispositivo conectado correctamente',
        details: {
          statusCode: response.status,
          responseTime: new Date().toISOString()
        }
      });
      
    } catch (connectError) {
      // Actualizar estado como offline
      await pool.query('UPDATE devices SET status = $1, last_check = CURRENT_TIMESTAMP WHERE id = $2', 
        ['offline', deviceId]);
      
      res.json({
        success: false,
        status: 'offline',
        message: 'Error de conectividad',
        error: connectError.message
      });
    }
    
  } catch (error) {
    console.error('Error probando conectividad:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// API para eliminar dispositivo
app.delete('/api/devices/:id', async (req, res) => {
  const deviceId = req.params.id;
  const userRole = req.query.userRole;
  
  // Validar permisos
  if (!userRole || (userRole !== 'admin' && userRole !== 'supervisor')) {
    return res.status(403).json({
      success: false,
      message: 'Solo administradores y supervisores pueden eliminar dispositivos'
    });
  }
  
  try {
    const deleteQuery = 'DELETE FROM devices WHERE id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [deviceId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Dispositivo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// API endpoint para forzar actualización de estados
app.post('/api/devices/refresh-status', async (req, res) => {
  try {
    console.log('🔄 Ejecutando refresh manual de estados...');
    await monitorAllDevices();
    res.json({
      success: true,
      message: 'Estados de dispositivos actualizados'
    });
  } catch (error) {
    console.error('❌ Error en refresh manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando estados: ' + error.message
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

// === SISTEMA DE MONITOREO AUTOMÁTICO ===

// Función para hacer ping a un dispositivo
async function pingDevice(ip) {
  try {
    console.log(`🏓 Iniciando ping a ${ip}...`);
    
    // Usar ping del sistema de forma más robusta
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync(`ping -c 1 -W 5 ${ip}`, {
        timeout: 10000 // timeout de 10 segundos
      });
      
      // Verificar que ping fue exitoso
      const success = stdout && stdout.includes('1 packets received') && !stderr;
      console.log(`🏓 Ping a ${ip} - stdout: ${stdout.split('\n')[1] || 'no response'}`);
      console.log(`🏓 Ping a ${ip} resultado: ${success ? 'SUCCESS' : 'FAILED'}`);
      
      return success;
    } catch (pingError) {
      console.log(`🏓 Ping a ${ip} falló: ${pingError.message}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error general en ping a ${ip}:`, error.message);
    return false;
  }
}

// Función para probar conectividad RESTCONF
async function testRESTCONF(device) {
  try {
    console.log(`🔐 Probando RESTCONF para ${device.name} (${device.ip}:${device.port})...`);
    const response = await axios.get(`https://${device.ip}:${device.port}/restconf/data/ietf-system:system/hostname`, {
      auth: {
        username: device.username,
        password: device.password
      },
      httpsAgent: httpsAgent,
      timeout: 5000
    });
    console.log(`🔐 RESTCONF response para ${device.name}:`, response.status);
    return response.status === 200;
  } catch (error) {
    console.log(`🔐 Probando RESTCONF básico para ${device.name}...`);
    // Intentar el endpoint básico si el hostname no funciona
    try {
      const basicResponse = await axios.get(`https://${device.ip}:${device.port}/restconf/`, {
        auth: {
          username: device.username,
          password: device.password
        },
        httpsAgent: httpsAgent,
        timeout: 5000
      });
      console.log(`🔐 RESTCONF basic response para ${device.name}:`, basicResponse.status);
      return basicResponse.status === 200;
    } catch (basicError) {
      console.error(`❌ RESTCONF failed para ${device.name}:`, basicError.message);
      return false;
    }
  }
}

// Función para verificar estado de un dispositivo
async function checkDeviceStatus(device) {
  console.log(`Probando conectividad: ${device.name} (${device.ip})...`);
  
  try {
    // Primero hacer ping
    const pingResult = await pingDevice(device.ip);
    console.log(`${device.name} - Ping result:`, pingResult);
    
    if (!pingResult) {
      console.log(`${device.name}: offline (sin conectividad de red)`);
      return 'offline';
    }
    
    // Si ping es exitoso, probar RESTCONF
    const restconfResult = await testRESTCONF(device);
    console.log(`${device.name} - RESTCONF result:`, restconfResult);
    
    if (restconfResult) {
      console.log(`${device.name}: online (RESTCONF disponible)`);
      return 'online';
    } else {
      console.log(`${device.name}: offline (red disponible pero RESTCONF no responde)`);
      return 'offline';
    }
  } catch (error) {
    console.error(`Error verificando ${device.name}:`, error.message);
    console.log(`${device.name}: offline (error en verificación)`);
    return 'offline';
  }
}

// Función para actualizar estado de dispositivo en BD
async function updateDeviceStatus(deviceId, status) {
  try {
    await pool.query(
      'UPDATE devices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, deviceId]
    );
    console.log(`Estado actualizado para dispositivo ID ${deviceId}: ${status}`);
  } catch (error) {
    console.error(`Error actualizando estado del dispositivo ${deviceId}:`, error.message);
  }
}

// Función para monitorear todos los dispositivos
async function monitorAllDevices() {
  console.log('');
  console.log('='.repeat(50));
  console.log('🔄 INICIANDO MONITOREO DE DISPOSITIVOS...');
  console.log('='.repeat(50));
  
  try {
    // Obtener todos los dispositivos
    console.log('📊 Consultando dispositivos en base de datos...');
    const result = await pool.query('SELECT * FROM devices ORDER BY id');
    const devices = result.rows;
    
    if (devices.length === 0) {
      console.log('⚠️ No hay dispositivos para monitorear');
      return;
    }
    
    console.log(`📊 Monitoreando ${devices.length} dispositivo(s):`);
    devices.forEach(device => {
      console.log(`  - ${device.name} (${device.ip}:${device.port})`);
    });
    
    // Verificar cada dispositivo (en paralelo para ser más eficiente)
    const statusPromises = devices.map(async (device) => {
      try {
        console.log(`🔄 Iniciando verificación de ${device.name}...`);
        const status = await checkDeviceStatus(device);
        console.log(`🔄 Estado obtenido para ${device.name}: "${status}" (type: ${typeof status})`);
        
        if (status === undefined || status === null || typeof status !== 'string') {
          console.error(`⚠️ Status inválido para ${device.name}: ${status}, forzando 'offline'`);
          const finalStatus = 'offline';
          await updateDeviceStatus(device.id, finalStatus);
          console.log(`❌ ${device.name}: ${finalStatus} (forced)`);
          return { device: device.name, status: finalStatus };
        }
        
        await updateDeviceStatus(device.id, status);
        console.log(`✅ ${device.name}: ${status}`);
        return { device: device.name, status };
      } catch (error) {
        console.error(`❌ Error procesando ${device.name}:`, error.message);
        console.error(`❌ Stack trace:`, error.stack);
        const errorStatus = 'offline';
        await updateDeviceStatus(device.id, errorStatus);
        console.log(`❌ ${device.name}: ${errorStatus} (error)`);
        return { device: device.name, status: errorStatus };
      }
    });
    
    const results = await Promise.all(statusPromises);
    
    // Log resumen
    const onlineCount = results.filter(r => r.status === 'online').length;
    const offlineCount = results.filter(r => r.status === 'offline').length;
    
    console.log(`✅ Monitoreo completado: ${onlineCount} online, ${offlineCount} offline`);
    
  } catch (error) {
    console.error('Error en monitoreo de dispositivos:', error.message);
  }
}

// Iniciar monitoreo automático
let monitoringInterval;

function startDeviceMonitoring() {
  console.log('🚀 Iniciando sistema de monitoreo automático...');
  
  // Ejecutar monitoreo inicial después de 10 segundos
  console.log('⏱️ Programando monitoreo inicial en 10 segundos...');
  setTimeout(() => {
    console.log('⏰ Ejecutando monitoreo inicial programado...');
    monitorAllDevices();
  }, 10000);
  
  // Ejecutar monitoreo cada 2 minutos (120000 ms)
  console.log('⏱️ Programando monitoreo periódico cada 2 minutos...');
  monitoringInterval = setInterval(() => {
    console.log('⏰ Ejecutando monitoreo periódico programado...');
    monitorAllDevices();
  }, 120000);
  
  console.log('📊 Monitoreo configurado: verificación cada 2 minutos');
}

// === MIDDLEWARE DE ARCHIVOS ESTÁTICOS AL FINAL ===
// Servir archivos estáticos desde public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal - servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Devices App servidor ejecutándose en puerto ${PORT}`);
  console.log(`Acceso local: http://localhost:${PORT}`);
  
  // Iniciar sistema de monitoreo
  startDeviceMonitoring();
});

module.exports = app;