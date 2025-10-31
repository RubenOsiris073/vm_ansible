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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
  const { operation, router, httpMethod, endpoint, payload } = req.body;
  
  try {
    let targetEndpoint = '';
    let method = httpMethod || 'GET';
    
    // Definir endpoints según la operación
    if (operation === 'custom') {
      targetEndpoint = endpoint;
    } else {
      switch (operation) {
        case 'get-hostname':
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native/hostname';
          break;
        case 'get-interfaces':
        case 'getInterfaces':
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native/interface';
          break;
        case 'get-version':
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-device-hardware-oper:device-hardware-oper-data';
          break;
        case 'get-routing-table':
        case 'getRoutingTable':
          // Usar tabla de ruteo más básica disponible
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native/ip/route';
          break;
        case 'get-running-config':
        case 'getConfig':
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native';
          break;
        case 'get-system-info':
        case 'getSystemInfo':
          // Usar información básica del sistema que siempre está disponible
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native/version';
          break;
        case 'getInterfacesState':
          targetEndpoint = '/restconf/data/ietf-interfaces:interfaces-state';
          break;
        case 'getCdpNeighbors':
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-cdp-oper:cdp-neighbor-details';
          break;
        case 'getConfig':
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native';
          break;
        // Operaciones de modificación (PUT/POST)
        case 'set-hostname':
        case 'setHostname':
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native/hostname';
          method = 'PUT';
          break;
        case 'set-interface-description':
        case 'setInterfaceDescription':
          // El endpoint específico se construirá más adelante usando el payload
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native/interface/GigabitEthernet';
          method = 'PATCH';  // Usar PATCH para modificaciones parciales
          break;
        case 'add-loopback':
        case 'addLoopback':
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native/interface';
          method = 'POST';
          break;
        default:
          throw new Error(`Operación '${operation}' no soportada`);
      }
    }
    
    // Ajustar endpoint para operaciones específicas
    if (operation === 'setInterfaceDescription' && payload) {
      const interfaceName = payload['Cisco-IOS-XE-native:GigabitEthernet']?.name;
      if (interfaceName) {
        targetEndpoint = `/restconf/data/Cisco-IOS-XE-native:native/interface/GigabitEthernet=${interfaceName}`;
      }
    }
    
    const url = `https://${router.ip}:${router.port}${targetEndpoint}`;
    console.log(`Ejecutando ${operation}: ${method} ${url}`);
    
    const requestConfig = {
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
    };
    
    // Agregar payload si es POST, PUT o PATCH
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && payload) {
      requestConfig.data = payload;
    }
    
    const response = await axios(requestConfig);
    
    res.json({ 
      success: true, 
      data: response.data,
      operation: operation,
      endpoint: targetEndpoint,
      method: method
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