// Router RESTCONF Admin - Versión RESTCONF Pura
class RouterAdmin {
  constructor() {
    this.router = {
      ip: '192.168.77.4',
      port: '443',
      username: 'admin',
      password: 'admin'
    };
    this.initUI();
  }

  initUI() {
    // Elementos del DOM
    this.connectionForm = document.getElementById('connection-form');
    this.operationForm = document.getElementById('operation-form');
    this.results = document.getElementById('results');
    this.connectBtn = document.getElementById('connect-btn');
    this.operationSelect = document.getElementById('operation-select');
    this.executeBtn = document.getElementById('execute-btn');
    
    // Event listeners
    this.connectionForm.addEventListener('submit', (e) => this.handleConnect(e));
    this.operationForm.addEventListener('submit', (e) => this.handleOperation(e));
    
    this.updateUI();
  }

  updateUI() {
    // Mostrar información de conexión
    document.getElementById('router-ip').textContent = this.router.ip;
    document.getElementById('router-port').textContent = this.router.port;
  }

  async handleConnect(event) {
    event.preventDefault();
    
    this.addResult('info', 'Verificando conectividad con el router...');
    
    try {
      // Probar conectividad básica
      const response = await fetch('/api/router/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ip: this.router.ip,
          port: this.router.port,
          username: this.router.username,
          password: this.router.password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.addResult('success', 'Conectado al router exitosamente');
        this.operationForm.style.display = 'block';
      } else {
        this.addResult('error', `Error de conexión: ${result.error}`);
      }
    } catch (error) {
      this.addResult('error', `Error de red: ${error.message}`);
    }
  }

  async handleOperation(event) {
    event.preventDefault();
    
    const operation = this.operationSelect.value;
    
    if (!operation) {
      this.addResult('error', 'Selecciona una operación');
      return;
    }

    this.addResult('info', `Ejecutando: ${operation}...`);
    this.executeBtn.disabled = true;

    try {
      const response = await fetch('/api/router/restconf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: operation,
          router: this.router
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.addResult('success', 'Operación completada');
        this.addResult('data', JSON.stringify(result.data, null, 2));
      } else {
        this.addResult('error', `Error en operación: ${result.error}`);
      }
    } catch (error) {
      this.addResult('error', `Error de red: ${error.message}`);
    } finally {
      this.executeBtn.disabled = false;
    }
  }

  addResult(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const resultDiv = document.createElement('div');
    resultDiv.className = `result result-${type}`;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'timestamp';
    timeSpan.textContent = `[${timestamp}] `;
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    if (type === 'data') {
      messageSpan.innerHTML = `<pre>${message}</pre>`;
    }
    
    resultDiv.appendChild(timeSpan);
    resultDiv.appendChild(messageSpan);
    
    this.results.appendChild(resultDiv);
    this.results.scrollTop = this.results.scrollHeight;
  }

  clearResults() {
    this.results.innerHTML = '';
  }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  window.routerAdmin = new RouterAdmin();
});