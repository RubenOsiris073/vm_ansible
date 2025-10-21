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
const executeBtn = document.getElementById('execute-btn');
const clearBtn = document.getElementById('clear-btn');
const resultArea = document.getElementById('result-area');

// Radio buttons para método HTTP
const methodRadios = document.querySelectorAll('input[name="method"]');
const dataField = document.getElementById('data-field');
const dataTextarea = document.getElementById('data');

// Variables de estado
let isConnected = false;

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
async function executeOperation(operation, ip, port, username, password, method = 'GET', endpoint = null, data = null) {
  try {
    const body = {
      operation,
      router: { ip, port, username, password },
      httpMethod: method
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

// Mostrar/ocultar endpoint personalizado
operationSelect.addEventListener('change', () => {
  if (operationSelect.value === 'custom') {
    customEndpointDiv.style.display = 'block';
  } else {
    customEndpointDiv.style.display = 'none';
  }
});

// Mostrar/ocultar campo de datos para POST/PUT
methodRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    const method = document.querySelector('input[name="method"]:checked').value;
    if (method === 'POST' || method === 'PUT') {
      dataField.style.display = 'block';
    } else {
      dataField.style.display = 'none';
    }
  });
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
  const method = document.querySelector('input[name="method"]:checked').value;
  
  let endpoint = null;
  if (operation === 'custom') {
    endpoint = customEndpointInput.value.trim();
    if (!endpoint) {
      addResult('❌ Introduce un endpoint personalizado', 'error');
      return;
    }
  }
  
  let data = null;
  if ((method === 'POST' || method === 'PUT') && dataTextarea.value.trim()) {
    try {
      data = JSON.parse(dataTextarea.value.trim());
    } catch (e) {
      addResult('❌ Error en formato JSON', 'error');
      return;
    }
  }
  
  executeBtn.disabled = true;
  executeBtn.textContent = 'Ejecutando...';
  addResult(`�� Ejecutando ${method} ${operation}${endpoint ? ` (${endpoint})` : ''}`, 'info');
  
  const result = await executeOperation(operation, ip, port, username, password, method, endpoint, data);
  
  if (result.success) {
    addResult('✓ Operación completada', 'success');
    addResult(result.data, 'json');
  } else {
    addResult(`❌ Error: ${result.error}`, 'error');
  }
  
  executeBtn.disabled = false;
  executeBtn.textContent = 'Ejecutar Operación';
});

// Limpiar resultados
clearBtn.addEventListener('click', () => {
  resultArea.innerHTML = '<p class="placeholder">Conecta al router y ejecuta una operación para ver los resultados aquí.</p>';
});

// Inicialización
console.log('✓ Router RESTCONF Admin cargado');
updateConnectionState(false);
