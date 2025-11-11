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

// API para validar permisos del usuario
app.get('/api/user/permissions', (req, res) => {
  // En un caso real, esto vendría de un token JWT o sesión
  // Por ahora, extraer de query params
  const userDataParam = req.query.user;
  
  if (!userDataParam) {
    return res.status(400).json({
      success: false,
      message: 'Información de usuario requerida'
    });
  }
  
  try {
    const userData = JSON.parse(decodeURIComponent(userDataParam));
    
    // Definir permisos según rol
    let permissions = {
      canRead: false,
      canWrite: false,
      canDelete: false,
      allowedOperations: []
    };
    
    switch (userData.role) {
      case 'admin':
        permissions = {
          canRead: true,
          canWrite: true, 
          canDelete: true,
          allowedOperations: [
            'getConfig', 'getSystemInfo', 'getInterfaces', 'getInterfacesState',
            'getRoutingTable', 'getCdpNeighbors', 'setHostname', 'setInterfaceDescription',
            'addLoopback', 'deleteLoopback', 'deleteInterfaceDescription', 'custom'
          ]
        };
        break;
      case 'supervisor':
        permissions = {
          canRead: true,
          canWrite: true,
          canDelete: true,
          allowedOperations: [
            'getConfig', 'getSystemInfo', 'getInterfaces', 'getInterfacesState',
            'getRoutingTable', 'getCdpNeighbors', 'setHostname', 'setInterfaceDescription',
            'addLoopback', 'deleteLoopback', 'deleteInterfaceDescription', 'custom'
          ]
        };
        break;
      case 'tecnico':
        permissions = {
          canRead: true,
          canWrite: false,
          canDelete: false,
          allowedOperations: [
            'getConfig', 'getSystemInfo', 'getInterfaces', 'getInterfacesState',
            'getRoutingTable', 'getCdpNeighbors'
          ]
        };
        break;
      case 'operador':
        permissions = {
          canRead: true,
          canWrite: true,
          canDelete: false,
          allowedOperations: [
            'getConfig', 'getSystemInfo', 'getInterfaces', 'getInterfacesState',
            'getRoutingTable', 'getCdpNeighbors', 'setInterfaceDescription'
          ]
        };
        break;
      case 'readonly':
        permissions = {
          canRead: true,
          canWrite: false,
          canDelete: false,
          allowedOperations: [
            'getSystemInfo', 'getInterfaces', 'getInterfacesState'
          ]
        };
        break;
      default:
        // user role - sin acceso
        permissions = {
          canRead: false,
          canWrite: false,
          canDelete: false,
          allowedOperations: []
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
  const { operation, router, httpMethod, endpoint, payload, userRole } = req.body;
  
  // Validar permisos según el rol del usuario
  if (userRole) {
    const isWriteOperation = ['PUT', 'POST', 'PATCH', 'DELETE'].includes(httpMethod || 'GET');
    const isDeleteOperation = (httpMethod || 'GET') === 'DELETE';
    
    // Validaciones específicas por rol
    if (userRole === 'tecnico' || userRole === 'readonly') {
      if (isWriteOperation || isDeleteOperation) {
        return res.status(403).json({
          success: false,
          error: `Acceso denegado. Los ${userRole === 'tecnico' ? 'técnicos' : 'usuarios de solo lectura'} solo pueden realizar operaciones de consulta (GET).`
        });
      }
    }
    
    if (userRole === 'operador') {
      if (isDeleteOperation) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado. Los operadores no pueden realizar operaciones DELETE.'
        });
      }
    }
    
    // Validar operaciones específicas
    const roleOperations = {
      'tecnico': [
        'getConfig', 'getSystemInfo', 'getInterfaces', 'getInterfacesState',
        'getRoutingTable', 'getCdpNeighbors', 'get-hostname', 'get-interfaces'
      ],
      'operador': [
        'getConfig', 'getSystemInfo', 'getInterfaces', 'getInterfacesState',
        'getRoutingTable', 'getCdpNeighbors', 'setInterfaceDescription', 'get-hostname', 'get-interfaces'
      ],
      'readonly': [
        'getSystemInfo', 'getInterfaces', 'getInterfacesState', 'get-interfaces'
      ]
    };
    
    if (roleOperations[userRole] && !roleOperations[userRole].includes(operation)) {
      return res.status(403).json({
        success: false,
        error: `Operación no permitida para el rol ${userRole}.`
      });
    }
  }
  
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
        case 'delete-loopback':
        case 'deleteLoopback':
          // El endpoint específico se construirá más adelante usando el payload
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native/interface/Loopback';
          method = 'DELETE';
          break;
        case 'delete-interface-description':
        case 'deleteInterfaceDescription':
          // El endpoint específico se construirá más adelante
          targetEndpoint = '/restconf/data/Cisco-IOS-XE-native:native/interface/GigabitEthernet';
          method = 'DELETE';
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
    
    // Para operaciones DELETE, necesitamos información adicional del cuerpo de la petición
    if (operation === 'deleteLoopback') {
      // El número de loopback viene en el cuerpo de la petición
      const loopbackNumber = req.body.loopbackNumber;
      if (loopbackNumber) {
        targetEndpoint = `/restconf/data/Cisco-IOS-XE-native:native/interface/Loopback=${loopbackNumber}`;
      }
    }
    
    if (operation === 'deleteInterfaceDescription') {
      // El nombre de la interface viene en el cuerpo de la petición
      const interfaceName = req.body.interfaceName;
      if (interfaceName) {
        const interfaceNumber = interfaceName.split('=')[1];
        targetEndpoint = `/restconf/data/Cisco-IOS-XE-native:native/interface/GigabitEthernet=${interfaceNumber}/description`;
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

// API para ping de red
app.post('/api/network/ping', async (req, res) => {
  const { ip, count = 5 } = req.body;
  
  if (!ip) {
    return res.json({ success: false, error: 'IP address is required' });
  }
  
  try {
    const { spawn } = require('child_process');
    
    // Usar ping con parámetros seguros
    const pingArgs = ['-c', count.toString(), '-W', '3', ip];
    const pingProcess = spawn('ping', pingArgs);
    
    let output = '';
    let errorOutput = '';
    
    pingProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pingProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pingProcess.on('close', (code) => {
      if (code === 0) {
        // Parse ping output para estadísticas
        const lines = output.split('\n');
        const statsLine = lines.find(line => line.includes('packets transmitted'));
        const timeLine = lines.find(line => line.includes('min/avg/max'));
        
        let stats = {
          sent: count,
          received: 0,
          loss: 100
        };
        
        if (statsLine) {
          const match = statsLine.match(/(\d+) packets transmitted, (\d+) (?:packets )?received/);
          if (match) {
            stats.sent = parseInt(match[1]);
            stats.received = parseInt(match[2]);
            stats.loss = Math.round(((stats.sent - stats.received) / stats.sent) * 100);
          }
        }
        
        if (timeLine) {
          const timeMatch = timeLine.match(/min\/avg\/max.*?=.*?(\d+\.\d+)/);
          if (timeMatch) {
            stats.avgTime = parseFloat(timeMatch[1]);
          }
        }
        
        res.json({
          success: true,
          output: output,
          stats: stats
        });
      } else {
        res.json({
          success: false,
          error: `Ping failed with code ${code}`,
          output: errorOutput || output
        });
      }
    });
    
    // Timeout para evitar procesos colgados
    setTimeout(() => {
      pingProcess.kill('SIGTERM');
      res.json({
        success: false,
        error: 'Ping timeout after 30 seconds'
      });
    }, 30000);
    
  } catch (error) {
    console.error('Error ejecutando ping:', error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Router RESTCONF Admin' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Escuchando en http://0.0.0.0:${PORT}`);
});