// Router RESTCONF Admin - JavaScript para HTML recuperado
console.log('Iniciando Router RESTCONF Admin...');

// Elementos del DOM
const connectionForm = document.getElementById('connection-form');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
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

// Elementos del modal de ping
const pingTestBtn = document.getElementById('ping-test-btn');
const pingModal = document.getElementById('ping-modal');
const pingModalClose = document.getElementById('ping-modal-close');
const pingIpInput = document.getElementById('ping-ip');
const pingCountSelect = document.getElementById('ping-count');
const executePingBtn = document.getElementById('execute-ping-btn');
const cancelPingBtn = document.getElementById('cancel-ping-btn');
const pingResult = document.getElementById('ping-result');
const pingOutput = document.getElementById('ping-output');

const dataField = document.getElementById('data-field');
const dataTextarea = document.getElementById('data');

// Variables de estado
let isConnected = false;

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

// Funciones para el modal de ping
function openPingModal() {
  console.log('Abriendo modal de ping...', pingModal);
  if (pingModal) {
    // Forzar que el modal sea visible
    pingModal.style.display = 'flex';
    pingModal.style.position = 'fixed';
    pingModal.style.top = '0';
    pingModal.style.left = '0';
    pingModal.style.width = '100vw';
    pingModal.style.height = '100vh';
    pingModal.style.zIndex = '99999';
    pingModal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    
    pingIpInput.value = ipInput.value || '192.168.77.4'; // Pre-llenar con la IP del router
    pingResult.style.display = 'none';
    pingOutput.innerHTML = '';
    console.log('Modal abierto correctamente con estilos forzados');
    
    // Agregar clase al body para prevenir scroll
    document.body.style.overflow = 'hidden';
  } else {
    console.error('Error: pingModal no encontrado');
  }
}

function closePingModal() {
  pingModal.style.display = 'none';
  pingResult.style.display = 'none';
  pingOutput.innerHTML = '';
  // Restaurar scroll del body
  document.body.style.overflow = 'auto';
}

// Función para ejecutar ping
async function executePing() {
  console.log('executePing llamada - ejecutando ping desde modal');
  const ip = pingIpInput.value.trim();
  const count = pingCountSelect.value;
  
  if (!ip) {
    pingOutput.innerHTML = '<span class="ping-error">❌ Por favor introduce una IP válida</span>';
    pingResult.style.display = 'block';
    return;
  }
  
  executePingBtn.disabled = true;
  executePingBtn.textContent = 'Ejecutando...';
  pingResult.style.display = 'block';
  pingOutput.innerHTML = '<span class="ping-info">🔄 Ejecutando ping a ' + ip + '...</span>';
  
  try {
    const response = await fetch('/api/network/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: ip, count: parseInt(count) })
    });
    
    const result = await response.json();
    
    if (result.success) {
      let output = '<span class="ping-success">✅ Ping exitoso a ' + ip + '</span>\n\n';
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
      pingOutput.innerHTML = '<span class="ping-error">❌ Error en ping: ' + result.error + '</span>';
    }
  } catch (error) {
    pingOutput.innerHTML = '<span class="ping-error">❌ Error de conectividad: ' + error.message + '</span>';
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
  resultArea.scrollTop = resultArea.scrollHeight;
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
    updateConnectionStatus('❌ Completa todos los campos', 'error');
    return;
  }
  
  connectBtn.disabled = true;
  connectBtn.textContent = 'Conectando...';
  updateConnectionStatus('🔄 Conectando al router...', 'info');
  
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
    updateConnectionStatus(`❌ Error: ${result.error}`, 'error');
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

// Event listeners para el modal de ping
if (pingTestBtn) {
  console.log('Agregando event listener al botón de ping');
  pingTestBtn.addEventListener('click', function(event) {
    console.log('Click detectado en botón de ping, ejecutando openPingModal');
    event.preventDefault();
    event.stopPropagation();
    openPingModal();
  });
} else {
  console.error('Error: pingTestBtn no encontrado');
}
pingModalClose.addEventListener('click', closePingModal);
cancelPingBtn.addEventListener('click', closePingModal);
executePingBtn.addEventListener('click', executePing);

// Cerrar modal al hacer click fuera de él
pingModal.addEventListener('click', (event) => {
  if (event.target === pingModal) {
    closePingModal();
  }
});

// Cerrar modal con la tecla Escape
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && pingModal.style.display === 'flex') {
    closePingModal();
  }
});

// Ejecutar operación
executeBtn.addEventListener('click', async () => {
  if (!isConnected) {
    addResult('❌ Debes conectarte primero', 'error');
    return;
  }
  
  const operation = operationSelect.value;
  if (!operation) {
    addResult('❌ Selecciona una operación', 'error');
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
      addResult('❌ Introduce un endpoint personalizado', 'error');
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
          addResult('❌ Introduce el nuevo hostname', 'error');
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
          addResult('❌ Introduce la descripción de la interface', 'error');
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
          addResult('❌ Introduce el número de loopback y la IP', 'error');
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
          addResult('❌ Introduce el número de loopback a eliminar', 'error');
          return;
        }
        // Para DELETE, no necesitamos payload, solo el endpoint correcto
        data = null;
        break;
        
      case 'deleteInterfaceDescription':
        const deleteInterfaceName = deleteInterfaceNameSelect.value;
        if (!deleteInterfaceName) {
          addResult('❌ Selecciona una interface', 'error');
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
            addResult('❌ Error en formato JSON', 'error');
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
            addResult('❌ Error en formato JSON', 'error');
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

// Inicialización
console.log('Router RESTCONF Admin cargado');
updateConnectionState(false);
