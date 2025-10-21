// Router Admin UI - RESTCONF Version (mantiene interfaz original)
const form = document.getElementById('telnet-form');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const terminal = document.getElementById('terminal');

const ipInput = document.getElementById('ip');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

let isConnected = false;
let terminalBuffer = 'Pulsa "Conectar" para iniciar la sesión.\n';

// Valores por defecto
ipInput.value = '192.168.77.4';
usernameInput.value = 'admin';
passwordInput.value = 'admin';

function renderTerminal() {
  terminal.textContent = terminalBuffer;
  terminal.scrollTop = terminal.scrollHeight;
}

function appendToTerminal(text, type = 'output') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'info' ? '[INFO] ' : type === 'error' ? '[ERROR] ' : '';
  terminalBuffer += `[${timestamp}] ${prefix}${text}\n`;
  renderTerminal();
}

function setConnectionState(connected) {
  isConnected = connected;
  connectBtn.disabled = connected;
  disconnectBtn.disabled = !connected;
  
  if (connected) {
    connectBtn.textContent = 'Conectado';
    disconnectBtn.textContent = 'Desconectar';
  } else {
    connectBtn.textContent = 'Conectar';
    disconnectBtn.textContent = 'Desconectar';
  }
}

// Función para probar conectividad RESTCONF
async function testRESTCONFConnection(ip, username, password) {
  try {
    const response = await fetch('/api/router/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ip: ip,
        port: '443',
        username: username,
        password: password
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Función para ejecutar operaciones RESTCONF
async function executeRESTCONFOperation(operation, ip, username, password, httpMethod = 'GET', endpoint = null, payload = null) {
  try {
    const body = {
      operation: operation,
      router: {
        ip: ip,
        port: '443',
        username: username,
        password: password
      },
      httpMethod: httpMethod
    };
    if (endpoint) body.endpoint = endpoint;
    if (payload) body.payload = payload;

    const response = await fetch('/api/router/restconf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Event listener para el formulario de conexión
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  if (isConnected) {
    return;
  }

  const ip = ipInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!ip || !username || !password) {
    appendToTerminal('Error: Completa todos los campos (IP, Usuario, Contraseña)', 'error');
    return;
  }

  appendToTerminal(`Conectando a ${ip} con usuario ${username}...`, 'info');
  setConnectionState(false);
  connectBtn.disabled = true;
  connectBtn.textContent = 'Conectando...';

  // Probar conectividad RESTCONF
  const testResult = await testRESTCONFConnection(ip, username, password);
  
  if (testResult.success) {
    appendToTerminal('✓ Conexión RESTCONF exitosa', 'info');
    setConnectionState(true);
    
    // Ejecutar algunas operaciones básicas para mostrar información
    appendToTerminal('Obteniendo información del router...', 'info');
    
    // Obtener hostname
    const hostnameResult = await executeRESTCONFOperation('get-hostname', ip, username, password);
    if (hostnameResult.success) {
      const hostname = hostnameResult.data['Cisco-IOS-XE-native:hostname'];
      appendToTerminal(`Router: ${hostname}`);
    }
    
    appendToTerminal('--- Router conectado via RESTCONF ---');
    appendToTerminal('Comandos disponibles:');
    appendToTerminal('  info       - Información del sistema');
    appendToTerminal('  interfaces - Mostrar interfaces');
    appendToTerminal('  hostname   - Mostrar hostname');
    appendToTerminal('  help       - Mostrar ayuda');
    appendToTerminal('');
    appendToTerminal('Router# ', 'prompt');
    
  } else {
    appendToTerminal(`✗ Error de conexión: ${testResult.error}`, 'error');
    setConnectionState(false);
  }
});

// Event listener para desconectar
disconnectBtn.addEventListener('click', () => {
  if (isConnected) {
    appendToTerminal('Desconectando...', 'info');
    setConnectionState(false);
    appendToTerminal('Desconectado del router.');
    appendToTerminal('Pulsa "Conectar" para iniciar una nueva sesión.');
  }
});

// Simulación de comandos en el terminal
terminal.addEventListener('keydown', async (event) => {
  if (!isConnected) return;
  
  if (event.key === 'Enter') {
    const lines = terminalBuffer.split('\n');
    const lastLine = lines[lines.length - 2] || '';
    const command = lastLine.replace(/.*Router# /, '').trim();
    
    if (command) {
      appendToTerminal(''); // Nueva línea
      
      const ip = ipInput.value.trim();
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      
      switch (command.toLowerCase()) {
        case 'help':
          appendToTerminal('Comandos disponibles:');
          appendToTerminal('  info       - Información del sistema');
          appendToTerminal('  interfaces - Mostrar interfaces');
          appendToTerminal('  hostname   - Mostrar hostname'); 
          appendToTerminal('  help       - Mostrar ayuda');
          break;
          
        case 'hostname':
          const hostnameResult = await executeRESTCONFOperation('get-hostname', ip, username, password);
          if (hostnameResult.success) {
            const hostname = hostnameResult.data['Cisco-IOS-XE-native:hostname'];
            appendToTerminal(`Hostname: ${hostname}`);
          } else {
            appendToTerminal(`Error: ${hostnameResult.error}`, 'error');
          }
          break;
          
        case 'interfaces':
          appendToTerminal('Obteniendo información de interfaces...');
          const interfacesResult = await executeRESTCONFOperation('get-interfaces', ip, username, password);
          if (interfacesResult.success) {
            appendToTerminal('Interfaces configuradas:');
            appendToTerminal(JSON.stringify(interfacesResult.data, null, 2));
          } else {
            appendToTerminal(`Error: ${interfacesResult.error}`, 'error');
          }
          break;
          
        case 'info':
          appendToTerminal('Obteniendo información del sistema...');
          const infoResult = await executeRESTCONFOperation('get-version', ip, username, password);
          if (infoResult.success) {
            appendToTerminal('Información del sistema:');
            appendToTerminal(JSON.stringify(infoResult.data, null, 2));
          } else {
            appendToTerminal(`Error: ${infoResult.error}`, 'error');
          }
          break;
          
        default:
          if (command.trim() !== '') {
            appendToTerminal(`Comando no reconocido: ${command}`);
            appendToTerminal('Escribe "help" para ver comandos disponibles.');
          }
      }
      
      appendToTerminal('Router# ', 'prompt');
    }
  }
});

// Hacer que el terminal sea clickeable para focus
terminal.addEventListener('click', () => {
  terminal.focus();
});

// Inicializar
renderTerminal();
setConnectionState(false);

// New UI wiring: method select, operation select, payload, execute, results
const httpMethodSelect = document.getElementById('http-method');
const operationSelect = document.getElementById('operation');
const customEndpointField = document.getElementById('custom-endpoint-field');
const customEndpointInput = document.getElementById('custom-endpoint');
const payloadField = document.getElementById('payload-field');
const payloadInput = document.getElementById('payload');
const executeBtn = document.getElementById('execute-btn');
const resultPanel = document.getElementById('result-panel');
const clearResultsBtn = document.getElementById('clear-results');

function appendResult(text, kind = 'info') {
  const pre = document.createElement('pre');
  pre.style.whiteSpace = 'pre-wrap';
  pre.textContent = text;
  if (kind === 'error') pre.style.color = '#ff6b6b';
  resultPanel.appendChild(pre);
  resultPanel.scrollTop = resultPanel.scrollHeight;
}

operationSelect.addEventListener('change', () => {
  if (operationSelect.value === 'custom') {
    customEndpointField.style.display = 'block';
  } else {
    customEndpointField.style.display = 'none';
  }
});

httpMethodSelect.addEventListener('change', () => {
  const v = httpMethodSelect.value;
  if (v === 'POST' || v === 'PUT') {
    payloadField.style.display = 'block';
  } else {
    payloadField.style.display = 'none';
  }
});

// enable execute when connected
function updateExecuteState() {
  executeBtn.disabled = !isConnected;
}

// Connect/disconnect update
const connectionForm = document.getElementById('connection-form');
connectionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  // reuse existing connect flow
  form.dispatchEvent(new Event('submit'));
  setTimeout(updateExecuteState, 500);
});

disconnectBtn.addEventListener('click', () => {
  setTimeout(updateExecuteState, 200);
});

executeBtn.addEventListener('click', async () => {
  if (!isConnected) {
    appendResult('No estás conectado al router', 'error');
    return;
  }
  const ip = ipInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const method = httpMethodSelect.value;
  let operation = operationSelect.value;
  let endpoint = null;
  if (operation === 'custom') endpoint = customEndpointInput.value.trim();
  const payload = payloadInput.value ? JSON.parse(payloadInput.value) : null;

  appendResult(`Ejecutando ${method} ${operation}${endpoint ? ` -> ${endpoint}` : ''}`);
  const res = await executeRESTCONFOperation(operation, ip, username, password, method, endpoint, payload);
  if (res.success) {
    appendResult(JSON.stringify(res.data, null, 2));
  } else {
    appendResult(`Error: ${res.error}`, 'error');
  }
});

clearResultsBtn.addEventListener('click', () => {
  resultPanel.innerHTML = '';
});

// initial UI state
payloadField.style.display = 'none';
customEndpointField.style.display = 'none';
updateExecuteState();