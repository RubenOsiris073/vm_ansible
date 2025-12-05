// Configuración global
let currentUser = null;
let devices = [];
let deleteDeviceId = null;

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando Inventario de Equipos...');
  
  // Verificar autenticación
  checkAuthentication();
  
  // Event listeners
  setupEventListeners();
  
  // Cargar dispositivos
  loadDevices();
});

// Verificación de autenticación
async function checkAuthentication() {
  try {
    // Obtener información del usuario de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    
    if (!userParam) {
      console.log('Usuario no encontrado en URL, redirigiendo...');
      window.location.href = 'https://login.routerlab.local';
      return;
    }

    const response = await fetch(`/auth/verify?user=${encodeURIComponent(userParam)}`, {
      credentials: 'same-origin'
    });

    if (!response.ok) {
      console.log('Usuario no autenticado, redirigiendo...');
      window.location.href = 'https://login.routerlab.local';
      return;
    }

    currentUser = await response.json();
    console.log('Usuario autenticado:', currentUser);
    
    // Mostrar información del usuario
    updateUserInfo();
    
    // Verificar permisos para agregar dispositivos
    checkAddPermissions();
    
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    window.location.href = 'https://login.routerlab.local';
  }
}

// Actualizar información del usuario en el header
function updateUserInfo() {
  const userInfoElement = document.querySelector('.user-info');
  if (userInfoElement && currentUser) {
    const roleColors = {
      'admin': '#e74c3c',
      'supervisor': '#f39c12', 
      'tecnico': '#3498db',
      'operador': '#27ae60',
      'readonly': '#95a5a6'
    };
    
    userInfoElement.innerHTML = `
      <span style="color: ${roleColors[currentUser.role] || '#fff'};">
        ${currentUser.email} (${currentUser.role})
      </span>
    `;
  }
}

// Verificar permisos para agregar dispositivos
function checkAddPermissions() {
  const addForm = document.getElementById('add-device-form');
  const addButton = document.getElementById('add-device-btn');
  
  if (!currentUser) return;
  
  // Solo admin y supervisor pueden agregar dispositivos
  if (!['admin', 'supervisor'].includes(currentUser.role)) {
    if (addForm) {
      addForm.style.display = 'none';
    }
    
    // Mostrar mensaje informativo
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.innerHTML = `
        <section class="connection-card">
          <h2>Información</h2>
          <p>Su rol (${currentUser.role}) permite consultar y probar dispositivos.</p>
          <p>Para agregar o eliminar dispositivos, contacte a un administrador.</p>
        </section>
      `;
      
      // Re-setup del botón refresh

    }
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Botón de logout
  document.getElementById('logout-btn')?.addEventListener('click', logout);
  
  // Botón para ir a Router Admin
  document.getElementById('router-admin-btn')?.addEventListener('click', () => {
    const userParam = currentUser ? `?user=${encodeURIComponent(JSON.stringify(currentUser))}` : '';
    window.location.href = `https://routerlab.local${userParam}`;
  });
  
  // Formulario agregar dispositivo
  document.getElementById('add-device-form')?.addEventListener('submit', addDevice);
  

  

  
  // Botón actualizar estados
  document.getElementById('refresh-status-btn')?.addEventListener('click', refreshDeviceStatus);
  
  // Modal de confirmación
  setupModal();
}

// Configurar modal de confirmación
function setupModal() {
  const modal = document.getElementById('deleteModal');
  const closeBtn = document.querySelector('.close');
  const cancelBtn = document.getElementById('cancel-delete');
  const confirmBtn = document.getElementById('confirm-delete');
  
  closeBtn?.addEventListener('click', () => modal.style.display = 'none');
  cancelBtn?.addEventListener('click', () => modal.style.display = 'none');
  confirmBtn?.addEventListener('click', confirmDeleteDevice);
  
  // Cerrar modal al hacer click fuera
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

// Cargar lista de dispositivos
async function loadDevices() {
  try {
    addToLog('Cargando dispositivos...');
    
    const response = await fetch('/api/devices', {
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    devices = responseData.devices || [];
    console.log('Dispositivos cargados:', devices);
    
    renderDevicesTable();
    updateDeviceCount();
    addToLog(`Dispositivos cargados: ${devices.length} encontrados`);
    
  } catch (error) {
    console.error('Error cargando dispositivos:', error);
    addToLog(`Error cargando dispositivos: ${error.message}`);
    renderEmptyState('Error cargando dispositivos');
  }
}

// Renderizar tabla de dispositivos
function renderDevicesTable() {
  const container = document.getElementById('devices-container');
  
  if (!devices || devices.length === 0) {
    renderEmptyState('No hay dispositivos registrados');
    return;
  }
  
  const canDelete = ['admin', 'supervisor'].includes(currentUser?.role);
  
  let html = `
    <table class="devices-table">
      <thead>
        <tr>
          <th>Estado</th>
          <th>Nombre</th>
          <th>Dirección IP</th>
          <th>Puerto</th>
          <th>Usuario</th>
          <th>Descripción</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  devices.forEach(device => {
    html += `
      <tr data-device-id="${device.id}">
        <td>
          <span class="status-indicator status-${device.status || 'unknown'}" 
                title="${getStatusText(device.status)}"></span>
          ${getStatusText(device.status)}
        </td>
        <td><strong>${device.name}</strong></td>
        <td>${device.ip}</td>
        <td>${device.port}</td>
        <td>${device.username}</td>
        <td>${device.description || '-'}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

// Renderizar estado vacío
function renderEmptyState(message) {
  const container = document.getElementById('devices-container');
  container.innerHTML = `
    <div class="empty-state">
      <p>${message}</p>
      <button onclick="loadDevices()" class="btn btn-secondary">Intentar de nuevo</button>
    </div>
  `;
}

// Actualizar contador de dispositivos
function updateDeviceCount() {
  const countElement = document.getElementById('device-count');
  if (countElement) {
    countElement.textContent = `Total: ${devices.length} dispositivo(s) registrado(s)`;
  }
}

// Obtener texto de estado
function getStatusText(status) {
  const statusMap = {
    'online': 'Conectado',
    'offline': 'Sin conexión', 
    'unknown': 'Sin probar'
  };
  return statusMap[status] || 'Desconocido';
}

// Agregar nuevo dispositivo
async function addDevice(event) {
  event.preventDefault();
  
  try {
    // Verificar permisos
    if (!['admin', 'supervisor'].includes(currentUser?.role)) {
      addToLog('No tiene permisos para agregar dispositivos');
      return;
    }
    
    const formData = new FormData(event.target);
    const deviceData = {
      name: formData.get('name'),
      ip: formData.get('ip'),
      port: parseInt(formData.get('port')) || 443,
      username: formData.get('username'),
      password: formData.get('password'),
      description: formData.get('description') || '',
      userRole: currentUser?.role
    };
    
    addToLog(`Agregando dispositivo: ${deviceData.name}...`);
    
    const response = await fetch('/api/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(deviceData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error agregando dispositivo');
    }
    
    const result = await response.json();
    console.log('✅ Dispositivo agregado:', result);
    
    addToLog(`Dispositivo agregado exitosamente: ${deviceData.name}`);
    
    // Limpiar formulario
    event.target.reset();
    
    // Recargar lista
    loadDevices();
    
  } catch (error) {
    console.error('Error agregando dispositivo:', error);
    addToLog(`Error agregando dispositivo: ${error.message}`);
  }
}

// Probar conectividad de un dispositivo
async function testDevice(deviceId) {
  try {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;
    
    addToLog(`Probando conectividad: ${device.name} (${device.ip})...`);
    
    // Deshabilitar botón durante la prueba
    const testButton = document.querySelector(`tr[data-device-id="${deviceId}"] .btn-test`);
    if (testButton) {
      testButton.disabled = true;
      testButton.innerHTML = 'Probando...';
    }
    
    const response = await fetch(`/api/devices/${deviceId}/test?user=${encodeURIComponent(JSON.stringify(currentUser))}`, {
      method: 'POST',
      credentials: 'same-origin'
    });
    
    const result = await response.json();
    
    if (result.success) {
      addToLog(`${device.name}: Conectado exitosamente`);
    } else {
      addToLog(`${device.name}: ${result.error}`);
    }
    
    // Actualizar estado en la tabla
    updateDeviceStatus(deviceId, result.success ? 'online' : 'offline');
    
  } catch (error) {
    console.error('Error probando dispositivo:', error);
    addToLog(`Error probando dispositivo: ${error.message}`);
    updateDeviceStatus(deviceId, 'offline');
  } finally {
    // Rehabilitar botón
    const testButton = document.querySelector(`tr[data-device-id="${deviceId}"] .btn-test`);
    if (testButton) {
      testButton.disabled = false;
      testButton.innerHTML = 'Probar';
    }
  }
}

// Actualizar estado de dispositivo en la tabla
function updateDeviceStatus(deviceId, status) {
  const device = devices.find(d => d.id === deviceId);
  if (device) {
    device.status = status;
  }
  
  const row = document.querySelector(`tr[data-device-id="${deviceId}"]`);
  if (row) {
    const statusCell = row.querySelector('td:first-child');
    if (statusCell) {
      statusCell.innerHTML = `
        <span class="status-indicator status-${status}" 
              title="${getStatusText(status)}"></span>
        ${getStatusText(status)}
      `;
    }
  }
}

// Actualizar estados de todos los dispositivos
async function refreshDeviceStatus() {
  addToLog('Actualizando estados de dispositivos...');
  
  const refreshButton = document.getElementById('refresh-status-btn');
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.innerHTML = 'Actualizando...';
  }
  
  try {
    const response = await fetch('/api/devices/refresh-status', {
      method: 'POST'
    });
    const results = await response.json();
    
    if (response.ok) {
      addToLog('Estados actualizados correctamente');
      loadDevices(); // Recargar la lista para mostrar estados actualizados
    } else {
      addToLog('Error al actualizar estados: ' + results.error);
    }
  } catch (error) {
    console.error('Error:', error);
    addToLog('Error de conexión al actualizar estados');
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.innerHTML = 'Actualizar Estados';
    }
  }
}

// Mostrar modal de confirmación para eliminar
function showDeleteModal(deviceId) {
  const device = devices.find(d => d.id === deviceId);
  if (!device) return;
  
  deleteDeviceId = deviceId;
  const modal = document.getElementById('deleteModal');
  const deviceInfo = document.getElementById('device-to-delete');
  
  deviceInfo.innerHTML = `
    <p><strong>Dispositivo:</strong> ${device.name}</p>
    <p><strong>IP:</strong> ${device.ip}</p>
    <p><strong>Descripción:</strong> ${device.description || 'Sin descripción'}</p>
  `;
  
  modal.style.display = 'block';
}

// Confirmar eliminación de dispositivo
async function confirmDeleteDevice() {
  if (!deleteDeviceId) return;
  
  try {
    // Verificar permisos
    if (!['admin', 'supervisor'].includes(currentUser?.role)) {
      addToLog('No tiene permisos para eliminar dispositivos');
      return;
    }
    
    const device = devices.find(d => d.id === deleteDeviceId);
    addToLog(`Eliminando dispositivo: ${device?.name}...`);
    
    const response = await fetch(`/api/devices/${deleteDeviceId}?userRole=${encodeURIComponent(currentUser?.role)}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error eliminando dispositivo');
    }
    
    addToLog(`Dispositivo eliminado: ${device?.name}`);
    
    // Cerrar modal
    document.getElementById('deleteModal').style.display = 'none';
    deleteDeviceId = null;
    
    // Recargar lista
    loadDevices();
    
  } catch (error) {
    console.error('Error eliminando dispositivo:', error);
    addToLog(`Error eliminando dispositivo: ${error.message}`);
  }
}

// Función para logout
async function logout() {
  try {
    const response = await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    
    // Redirigir sin importar el resultado
    window.location.href = 'https://login.routerlab.local';
    
  } catch (error) {
    console.error('Error durante logout:', error);
    // Redirigir de todas formas
    window.location.href = 'https://login.routerlab.local';
  }
}

// Función para agregar mensajes al log
function addToLog(message) {
  const logElement = document.getElementById('activity-log');
  if (logElement) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.innerHTML = `<span style="color: #95a5a6;">[${timestamp}]</span> ${message}`;
    
    // Remover placeholder si existe
    const placeholder = logElement.querySelector('.placeholder');
    if (placeholder) {
      placeholder.remove();
    }
    
    logElement.appendChild(logEntry);
    
    // Scroll automático al último mensaje
    logElement.scrollTop = logElement.scrollHeight;
    
    // Mantener solo los últimos 50 mensajes
    const messages = logElement.children;
    if (messages.length > 50) {
      logElement.removeChild(messages[0]);
    }
  }
  
  console.log(message);
}