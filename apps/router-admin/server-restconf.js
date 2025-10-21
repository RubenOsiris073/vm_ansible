const express = require('express');
const axios = require('axios');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configurar cliente HTTPS que ignore certificados auto-firmados
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Ruta principal - servir la aplicación RESTCONF
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-restconf.html'));
});

// API para probar conectividad con el router
app.post('/api/router/test', async (req, res) => {
  const { ip, port, username, password } = req.body;
  
  try {
    console.log(`Probando conectividad a https://${ip}:${port}/restconf/`);
    
    const response = await axios.get(`https://${ip}:${port}/restconf/`, {
      auth: {
        username: username,
        password: password
      },
      httpsAgent: httpsAgent,
      timeout: 10000,
      headers: {
        'Accept': 'application/yang-data+json'
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Conectividad exitosa',
      status: response.status 
    });
    
  } catch (error) {
    console.error('Error de conectividad:', error.message);
    
    res.json({ 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

// API para operaciones RESTCONF
app.post('/api/router/restconf', async (req, res) => {
  const { operation, router } = req.body;
  
  try {
    let endpoint = '';
    let method = 'GET';
    
    // Definir endpoints según la operación
    switch (operation) {
      case 'get-hostname':
        endpoint = '/restconf/data/Cisco-IOS-XE-native:native/hostname';
        break;
      case 'get-interfaces':
        endpoint = '/restconf/data/Cisco-IOS-XE-native:native/interface';
        break;
      case 'get-version':
        endpoint = '/restconf/data/Cisco-IOS-XE-device-hardware-oper:device-hardware-oper-data';
        break;
      case 'get-routing-table':
        endpoint = '/restconf/data/Cisco-IOS-XE-routing-oper:routing-oper-data';
        break;
      case 'get-running-config':
        endpoint = '/restconf/data/Cisco-IOS-XE-native:native';
        break;
      default:
        throw new Error('Operación no soportada');
    }
    
    const url = `https://${router.ip}:${router.port}${endpoint}`;
    console.log(`Ejecutando ${operation}: ${method} ${url}`);
    
    const response = await axios({
      method: method,
      url: url,
      auth: {
        username: router.username,
        password: router.password
      },
      httpsAgent: httpsAgent,
      timeout: 15000,
      headers: {
        'Accept': 'application/yang-data+json',
        'Content-Type': 'application/yang-data+json'
      }
    });
    
    res.json({ 
      success: true, 
      data: response.data,
      operation: operation,
      endpoint: endpoint
    });
    
  } catch (error) {
    console.error(`Error en operación ${operation}:`, error.message);
    
    res.json({ 
      success: false, 
      error: error.message,
      operation: operation,
      details: error.response ? error.response.data : null
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Router RESTCONF Admin' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Router admin RESTCONF UI escuchando en http://0.0.0.0:${PORT}`);
  console.log(`Versión: RESTCONF-only (sin SSH/Telnet)`);
});