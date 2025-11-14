// Router RESTCONF Admin - JavaScript para HTML recuperado
console.log('Iniciando Router RESTCONF Admin...');

// Elementos del DOM
const connectionForm = document.getElementById('connection-form');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const logoutBtn = document.getElementById('logout-btn');
const inventoryBtn = document.getElementById('inventory-btn');
const connectionStatus = document.getElementById('connection-status');

const ipInput = document.getElementById('ip');
const portInput = document.getElementById('port');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const operationSelect = document.getElementById('operation');
const customEndpointDiv = document.getElementById('custom-endpoint');
const customEndpointInput = document.getElementById('endpoint');
const customMethodSelect = document.getElementById('custom-method');
const executeBtn = document.getElementById('execute-btn');
const clearBtn = document.getElementById('clear-btn');
const resultArea = document.getElementById('result-area');

// Campos específicos para operaciones de modificación
const hostnameField = document.getElementById('hostname-field');
const newHostnameInput = document.getElementById('new-hostname');
const interfaceDescField = document.getElementById('interface-desc-field');
const interfaceNameSelect = document.getElementById('interface-name');
const interfaceDescInput = document.getElementById('interface-description');
const loopbackField = document.getElementById('loopback-field');
const loopbackNumberInput = document.getElementById('loopback-number');
const loopbackIpInput = document.getElementById('loopback-ip');
const loopbackMaskSelect = document.getElementById('loopback-mask');
const loopbackDescInput = document.getElementById('loopback-desc');
const deleteLoopbackField = document.getElementById('delete-loopback-field');
const deleteLoopbackNumberInput = document.getElementById('delete-loopback-number');
const deleteInterfaceDescField = document.getElementById('delete-interface-desc-field');
const deleteInterfaceNameSelect = document.getElementById('delete-interface-name');

// Elementos del ping integrado
const pingIpInput = document.getElementById('ping-ip');
const pingCountSelect = document.getElementById('ping-count');
const executePingBtn = document.getElementById('execute-ping-btn');
const pingResult = document.getElementById('ping-result');
const pingOutput = document.getElementById('ping-output');

const dataField = document.getElementById('data-field');
const dataTextarea = document.getElementById('data');

// Variables de estado
let isConnected = false;
let currentUser = null;
let userPermissions = null;

// Función para obtener información del usuario desde la URL
function getUserFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const userParam = urlParams.get('user');
  
  if (userParam) {
    try {
      const userData = JSON.parse(decodeURIComponent(userParam));
      console.log('Usuario logueado:', userData);
      return userData;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
  return null;
}

// Función para obtener permisos del usuario
async function loadUserPermissions() {
  if (!currentUser) return null;
  
  try {
    const response = await fetch(`/api/user/permissions?user=${encodeURIComponent(JSON.stringify(currentUser))}`);
    const result = await response.json();
    
    if (result.success) {
      userPermissions = result.permissions;
      updateUIForRole(currentUser.role);
      console.log('Permisos cargados:', userPermissions);
      return userPermissions;
    } else {
      console.error('Error obteniendo permisos:', result.message);
      return null;
    }
  } catch (error) {
    console.error('Error cargando permisos:', error);
    return null;
  }
}

// Función para actualizar la UI según el rol
function updateUIForRole(role) {
  // Mostrar información del usuario en el header
  const headerContent = document.querySelector('.header-content');
  if (headerContent && currentUser) {
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
      <span class="user-email">${currentUser.email}</span>
      <span class="user-role role-${role}">${role.toUpperCase()}</span>
    `;
    
    // Insertar antes del botón de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn && !headerContent.querySelector('.user-info')) {
      headerContent.insertBefore(userInfo, logoutBtn);
    }
  }
  
  // Filtrar opciones del dropdown según permisos
  filterOperationsByRole(role);
}

// Función para filtrar operaciones del dropdown
function filterOperationsByRole(role) {
  const operationSelect = document.getElementById('operation');
  if (!operationSelect) return;
  
  const allOptions = Array.from(operationSelect.querySelectorAll('option'));
  
  allOptions.forEach(option => {
    const value = option.value;
    let shouldShow = true;
    
    // Definir operaciones permitidas por rol
    const rolePermissions = {
      'admin': '*', // Todas las operaciones
      'supervisor': '*', // Todas las operaciones
      'tecnico': [
        '', 'getConfig', 'getSystemInfo', 'getInterfaces', 
        'getInterfacesState', 'getRoutingTable', 'getCdpNeighbors'
      ],
      'operador': [
        '', 'getConfig', 'getSystemInfo', 'getInterfaces', 
        'getInterfacesState', 'getRoutingTable', 'getCdpNeighbors', 'setInterfaceDescription'
      ],
      'readonly': [
        '', 'getSystemInfo', 'getInterfaces', 'getInterfacesState'
      ]
    };
    
    if (rolePermissions[role] !== '*') {
      shouldShow = rolePermissions[role].includes(value);
    }
    
    // Ocultar/mostrar opciones
    option.style.display = shouldShow ? '' : 'none';
    if (!shouldShow && option.selected) {
      operationSelect.selectedIndex = 0; // Reset to default
    }
  });
  
  // Agregar mensaje informativo según el rol
  const existingInfo = operationSelect.querySelector('.role-info');
  if (existingInfo) existingInfo.remove();
  
  const roleMessages = {
    'tecnico': '--- Solo operaciones de consulta (GET) ---',
    'operador': '--- Consultas + modificar descripciones ---', 
    'readonly': '--- Solo información básica ---'
  };
  
  if (roleMessages[role]) {
    const infoOption = document.createElement('option');
    infoOption.className = 'role-info';
    infoOption.disabled = true;
    infoOption.textContent = roleMessages[role];
    infoOption.style.color = '#888';
    operationSelect.appendChild(infoOption);
  }
}

// Función para obtener el método HTTP según la operación
function getHttpMethodForOperation(operation) {
  switch (operation) {
    case 'setHostname':
      return 'PUT';
    case 'setInterfaceDescription':
      return 'PATCH';
    case 'addLoopback':
      return 'POST';
    case 'deleteLoopback':
    case 'deleteInterfaceDescription':
      return 'DELETE';
    case 'custom':
      return customMethodSelect.value;
    default:
      return 'GET';
  }
}

// Función para mostrar/ocultar campo de datos para operaciones custom
function updateCustomDataField() {
  const method = customMethodSelect.value;
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    dataField.style.display = 'block';
  } else {
    dataField.style.display = 'none';
  }
}

// Función para inicializar el ping
function initializePing() {
  // Pre-llenar con la IP del router si está conectado
  if (ipInput.value) {
    pingIpInput.value = ipInput.value;
  } else {
    pingIpInput.value = '192.168.77.4';
  }
}

// Función para ejecutar ping
async function executePing() {
  console.log('executePing llamada - ejecutando ping desde modal');
  const ip = pingIpInput.value.trim();
  const count = pingCountSelect.value;
  
  if (!ip) {
    pingOutput.innerHTML = '<span class="ping-error">Por favor introduce una IP válida</span>';
    pingResult.style.display = 'block';
    return;
  }
  
  executePingBtn.disabled = true;
  executePingBtn.textContent = 'Ejecutando...';
  pingResult.style.display = 'block';
  pingOutput.innerHTML = '<span class="ping-info">Ejecutando ping a ' + ip + '...</span>';
  
  try {
    const response = await fetch('/api/network/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: ip, count: parseInt(count) })
    });
    
    const result = await response.json();
    
    if (result.success) {
      let output = '<span class="ping-success">Ping exitoso a ' + ip + '</span>\n\n';
      output += '<span class="ping-info">Estadísticas:</span>\n';
      output += '• Paquetes enviados: ' + result.stats.sent + '\n';
      output += '• Paquetes recibidos: ' + result.stats.received + '\n';
      output += '• Pérdida de paquetes: ' + result.stats.loss + '%\n';
      
      if (result.stats.avgTime) {
        output += '• Tiempo promedio: ' + result.stats.avgTime + 'ms\n';
      }
      
      output += '\n<span class="ping-info">Detalles:</span>\n';
      output += result.output;
      
      pingOutput.innerHTML = output;
    } else {
      pingOutput.innerHTML = '<span class="ping-error">Error en ping: ' + result.error + '</span>';
    }
  } catch (error) {
    pingOutput.innerHTML = '<span class="ping-error">Error de conectividad: ' + error.message + '</span>';
  }
  
  executePingBtn.disabled = false;
  executePingBtn.textContent = 'Ejecutar Ping';
}

// Valores por defecto
ipInput.value = '192.168.77.4';
portInput.value = '443';
usernameInput.value = 'admin';
passwordInput.value = 'admin';

// Funciones de utilidad
function updateConnectionStatus(message, type = 'info') {
  connectionStatus.innerHTML = `<div class="status-message ${type}">${message}</div>`;
}

function updateConnectionState(connected) {
  isConnected = connected;
  connectBtn.disabled = connected;
  disconnectBtn.disabled = !connected;
  executeBtn.disabled = !connected;
  
  if (connected) {
    connectBtn.textContent = 'Conectado';
    disconnectBtn.textContent = 'Desconectar';
    updateConnectionStatus('✓ Conectado al router via RESTCONF', 'success');
  } else {
    connectBtn.textContent = 'Conectar';
    disconnectBtn.textContent = 'Desconectar';
    updateConnectionStatus('Desconectado', 'info');
  }
}

function addResult(content, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const resultDiv = document.createElement('div');
  resultDiv.className = `result-item ${type}`;
  
  if (type === 'json') {
    resultDiv.innerHTML = `
      <div class="result-header">[${timestamp}] Respuesta:</div>
      <pre class="result-json">${JSON.stringify(content, null, 2)}</pre>
    `;
  } else {
    resultDiv.innerHTML = `<div class="result-text">[${timestamp}] ${content}</div>`;
  }
  
  // Remover placeholder si existe
  const placeholder = resultArea.querySelector('.placeholder');
  if (placeholder) {
    placeholder.remove();
  }
  
  resultArea.appendChild(resultDiv);
  
  // Hacer scroll interno del área de resultados al final
  setTimeout(() => {
    resultArea.scrollTop = resultArea.scrollHeight;
  }, 10);
}

// Función para probar conectividad RESTCONF
async function testConnection(ip, port, username, password) {
  try {
    const response = await fetch('/api/router/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, port, username, password })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para ejecutar operaciones RESTCONF
async function executeOperation(operation, ip, port, username, password, method = 'GET', endpoint = null, data = null, extraData = {}) {
  try {
    const body = {
      operation,
      router: { ip, port, username, password },
      httpMethod: method,
      userRole: currentUser ? currentUser.role : null,
      ...extraData
    };
    
    if (endpoint) body.endpoint = endpoint;
    if (data) body.payload = data;
    
    const response = await fetch('/api/router/restconf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Event Listeners

// Conectar al router
connectionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  if (isConnected) return;
  
  const ip = ipInput.value.trim();
  const port = portInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  if (!ip || !port || !username || !password) {
    updateConnectionStatus('Completa todos los campos', 'error');
    return;
  }
  
  connectBtn.disabled = true;
  connectBtn.textContent = 'Conectando...';
  updateConnectionStatus('Conectando al router...', 'info');
  
  const result = await testConnection(ip, port, username, password);
  
  if (result.success) {
    updateConnectionState(true);
    addResult(`Conectado exitosamente a ${ip}:${port}`, 'success');
    
    // Obtener hostname como prueba
    const hostnameResult = await executeOperation('get-hostname', ip, port, username, password);
    if (hostnameResult.success) {
      const hostname = hostnameResult.data['Cisco-IOS-XE-native:hostname'];
      addResult(`Router detectado: ${hostname}`, 'info');
    }
  } else {
    updateConnectionState(false);
    updateConnectionStatus(`Error: ${result.error}`, 'error');
    addResult(`Error de conexión: ${result.error}`, 'error');
  }
});

// Desconectar
disconnectBtn.addEventListener('click', () => {
  updateConnectionState(false);
  addResult('Desconectado del router', 'info');
});

// Mostrar/ocultar campos según la operación seleccionada
operationSelect.addEventListener('change', () => {
  // Ocultar todos los campos específicos
  customEndpointDiv.style.display = 'none';
  hostnameField.style.display = 'none';
  interfaceDescField.style.display = 'none';
  loopbackField.style.display = 'none';
  deleteLoopbackField.style.display = 'none';
  deleteInterfaceDescField.style.display = 'none';
  
  const operation = operationSelect.value;
  
  // Mostrar el campo apropiado según la operación
  switch (operation) {
    case 'custom':
      customEndpointDiv.style.display = 'block';
      // Mostrar campo de datos solo si el método lo requiere
      updateCustomDataField();
      break;
    case 'setHostname':
      hostnameField.style.display = 'block';
      break;
    case 'setInterfaceDescription':
      interfaceDescField.style.display = 'block';
      break;
    case 'addLoopback':
      loopbackField.style.display = 'block';
      break;
    case 'deleteLoopback':
      deleteLoopbackField.style.display = 'block';
      break;
    case 'deleteInterfaceDescription':
      deleteInterfaceDescField.style.display = 'block';
      break;
    default:
      // Para operaciones GET, no mostrar campos adicionales
      break;
  }
});

// Event listener para el método custom
customMethodSelect.addEventListener('change', updateCustomDataField);

// Event listeners para el ping integrado
if (executePingBtn) {
  executePingBtn.addEventListener('click', executePing);
}

// Inicializar el ping cuando se carga la página
document.addEventListener('DOMContentLoaded', initializePing);

// Ejecutar operación
executeBtn.addEventListener('click', async () => {
  if (!isConnected) {
    addResult('Debes conectarte primero', 'error');
    return;
  }
  
  const operation = operationSelect.value;
  if (!operation) {
    addResult('Selecciona una operación', 'error');
    return;
  }
  
  const ip = ipInput.value.trim();
  const port = portInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const method = getHttpMethodForOperation(operation);
  
  let endpoint = null;
  if (operation === 'custom') {
    endpoint = customEndpointInput.value.trim();
    if (!endpoint) {
      addResult('Introduce un endpoint personalizado', 'error');
      return;
    }
  }
  
  let data = null;
  
  // Construir payload según la operación específica
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    switch (operation) {
      case 'setHostname':
        const newHostname = newHostnameInput.value.trim();
        if (!newHostname) {
          addResult('Introduce el nuevo hostname', 'error');
          return;
        }
        data = {
          "Cisco-IOS-XE-native:hostname": newHostname
        };
        break;
        
      case 'setInterfaceDescription':
        const interfaceName = interfaceNameSelect.value;
        const interfaceDesc = interfaceDescInput.value.trim();
        if (!interfaceDesc) {
          addResult('Introduce la descripción de la interface', 'error');
          return;
        }
        
        // Con PATCH solo necesitamos enviar lo que queremos cambiar
        // Pero incluimos el name para que el backend pueda construir el endpoint
        const interfaceNumber = interfaceName.split('=')[1];
        data = {
          "Cisco-IOS-XE-native:GigabitEthernet": {
            "name": interfaceNumber,
            "description": interfaceDesc
          }
        };
        break;
        
      case 'addLoopback':
        const loopbackNumber = loopbackNumberInput.value.trim();
        const loopbackIp = loopbackIpInput.value.trim();
        const loopbackMask = loopbackMaskSelect.value;
        const loopbackDesc = loopbackDescInput.value.trim();
        
        if (!loopbackNumber || !loopbackIp) {
          addResult('Introduce el número de loopback y la IP', 'error');
          return;
        }
        
        const loopbackConfig = {
          "name": parseInt(loopbackNumber),
          "ip": {
            "address": {
              "primary": {
                "address": loopbackIp,
                "mask": loopbackMask
              }
            }
          }
        };
        
        if (loopbackDesc) {
          loopbackConfig.description = loopbackDesc;
        }
        
        data = {
          "Cisco-IOS-XE-native:Loopback": [loopbackConfig]
        };
        break;
        
      case 'deleteLoopback':
        const deleteLoopbackNumber = deleteLoopbackNumberInput.value.trim();
        if (!deleteLoopbackNumber) {
          addResult('Introduce el número de loopback a eliminar', 'error');
          return;
        }
        // Para DELETE, no necesitamos payload, solo el endpoint correcto
        data = null;
        break;
        
      case 'deleteInterfaceDescription':
        const deleteInterfaceName = deleteInterfaceNameSelect.value;
        if (!deleteInterfaceName) {
          addResult('Selecciona una interface', 'error');
          return;
        }
        // Para DELETE de descripción, no necesitamos payload
        data = null;
        break;
        
      case 'custom':
        // Para custom, usar el textarea JSON
        if (dataTextarea.value.trim()) {
          try {
            data = JSON.parse(dataTextarea.value.trim());
          } catch (e) {
            addResult('Error en formato JSON', 'error');
            return;
          }
        }
        break;
        
      default:
        // Para otras operaciones, usar el textarea JSON si está disponible
        if (dataTextarea.value.trim()) {
          try {
            data = JSON.parse(dataTextarea.value.trim());
          } catch (e) {
            addResult('Error en formato JSON', 'error');
            return;
          }
        }
        break;
    }
  }
  
  executeBtn.disabled = true;
  executeBtn.textContent = 'Ejecutando...';
  addResult(`Ejecutando ${method} ${operation}${endpoint ? ` (${endpoint})` : ''}`, 'info');
  
  let extraData = {};
  
  // Agregar información adicional para operaciones DELETE
  if (operation === 'deleteLoopback') {
    extraData.loopbackNumber = deleteLoopbackNumberInput.value.trim();
  }
  if (operation === 'deleteInterfaceDescription') {
    extraData.interfaceName = deleteInterfaceNameSelect.value;
  }
  
  const result = await executeOperation(operation, ip, port, username, password, method, endpoint, data, extraData);
  
  if (result.success) {
    addResult('✓ Operación completada', 'success');
    addResult(result.data, 'json');
  } else {
    addResult(`Error: ${result.error}`, 'error');
  }
  
  executeBtn.disabled = false;
  executeBtn.textContent = 'Ejecutar Operación';
});

// Limpiar resultados
clearBtn.addEventListener('click', () => {
  resultArea.innerHTML = '<p class="placeholder">Conecta al router y ejecuta una operación para ver los resultados aquí.</p>';
});

// Logout - redirigir al login
logoutBtn.addEventListener('click', () => {
  // Redirigir al login usando el ingress
  window.location.href = 'https://login.routerlab.local';
});

// Botón de inventario - redirigir a devices-app
inventoryBtn.addEventListener('click', () => {
  // Pasar información del usuario a devices-app
  const userParam = currentUser ? `?user=${encodeURIComponent(JSON.stringify(currentUser))}` : '';
  window.location.href = `https://devices.routerlab.local${userParam}`;
});

// Inicialización
console.log('Router RESTCONF Admin cargado');
updateConnectionState(false);

// Inicializar usuario y permisos
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = getUserFromURL();
  if (currentUser) {
    await loadUserPermissions();
  } else {
    // Si no hay usuario, redirigir al login
    console.log('No hay usuario logueado, redirigiendo al login...');
    window.location.href = 'https://login.routerlab.local';
  }
});
