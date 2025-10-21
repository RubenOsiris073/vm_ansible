const form = document.getElementById('telnet-form');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const terminal = document.getElementById('terminal');

const ipInput = document.getElementById('ip');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const websocketUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/shell`;

let socket = null;
let sessionState = 'idle'; // idle | connecting | connected
let terminalBuffer = 'Pulsa “Conectar” para iniciar la sesión.\n';
let currentLine = '';
let history = [];
let historyIndex = 0;

function renderTerminal() {
  terminal.textContent = terminalBuffer + (sessionState === 'connected' ? currentLine : '');
  terminal.scrollTop = terminal.scrollHeight;
}

function appendLine(text, variant = 'output') {
  if (!text) {
    return;
  }
  const prefix = variant === 'status' ? '[info] ' : variant === 'error' ? '[error] ' : '';
  terminalBuffer += `${prefix}${text}\n`;
  renderTerminal();
}

function appendOutput(text) {
  if (!text) {
    return;
  }
  const normalized = text.replace(/\r/g, '');
  terminalBuffer += normalized;
  renderTerminal();
}

function resetTerminal() {
  terminalBuffer = 'Pulsa “Conectar” para iniciar la sesión.\n';
  currentLine = '';
  history = [];
  historyIndex = 0;
  renderTerminal();
}

function setSessionState(state) {
  sessionState = state;

  const isIdle = state === 'idle';
  const isConnecting = state === 'connecting';
  const isConnected = state === 'connected';

  connectBtn.disabled = !isIdle;
  disconnectBtn.disabled = isIdle;

  [ipInput, usernameInput, passwordInput].forEach((input) => {
    input.disabled = !isIdle;
  });

  terminal.classList.toggle('disabled', !isConnected);

  if (isConnected) {
    terminal.focus();
  } else if (isConnecting) {
    terminal.focus();
  }

  renderTerminal();
}

function ensureSocketClosed() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

function sendCommand(command) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  const rawCommand = typeof command === 'string' ? command : '';
  const trimmed = rawCommand.trim();

  if (!trimmed) {
    sendControl('\r');
    terminalBuffer += '\n';
    currentLine = '';
    renderTerminal();
    return;
  }

  socket.send(JSON.stringify({ type: 'command', command: trimmed }));
  history.push(trimmed);
  historyIndex = history.length;
  terminalBuffer += `${trimmed}\n`;
  currentLine = '';
  renderTerminal();
}

function sendControl(sequence) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !sequence) {
    return;
  }
  socket.send(JSON.stringify({ type: 'control', data: sequence }));
}

function startSession(credentials) {
  ensureSocketClosed();
  resetTerminal();
  appendLine(`Conectando a ${credentials.ip}:23...`, 'status');
  setSessionState('connecting');

  socket = new WebSocket(websocketUrl);

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({
      type: 'connect',
      ip: credentials.ip,
      username: credentials.username,
      password: credentials.password
    }));
  });

  socket.addEventListener('message', (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      appendLine('Respuesta inválida del servidor.', 'error');
      return;
    }

    if (data.type === 'status') {
      appendLine(data.message, 'status');
      return;
    }

    if (data.type === 'output') {
      appendOutput(data.data);
      return;
    }

    if (data.type === 'error') {
      appendLine(data.message || 'Error en la sesión', 'error');
      return;
    }

    if (data.type === 'ready') {
      setSessionState('connected');
      appendLine('Sesión lista. Escribe tus comandos.', 'status');
      return;
    }

    if (data.type === 'closed') {
      setSessionState('idle');
      appendLine('Sesión cerrada.', 'status');
      return;
    }
  });

  socket.addEventListener('close', () => {
    setSessionState('idle');
    socket = null;
  });

  socket.addEventListener('error', () => {
    appendLine('Error en la conexión WebSocket.', 'error');
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    ip: (formData.get('ip') || '').trim(),
    username: (formData.get('username') || '').trim(),
    password: formData.get('password') || ''
  };

  if (!payload.ip) {
    appendLine('Debes indicar la IP del router.', 'error');
    return;
  }

  startSession(payload);
});

disconnectBtn.addEventListener('click', () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'disconnect' }));
  }
  ensureSocketClosed();
  setSessionState('idle');
  resetTerminal();
});

terminal.addEventListener('keydown', (event) => {
  if (sessionState !== 'connected') {
    return;
  }

  if (event.key === 'Backspace') {
    if (currentLine.length > 0) {
      currentLine = currentLine.slice(0, -1);
      renderTerminal();
    }
    event.preventDefault();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const command = currentLine;
    sendCommand(command);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (historyIndex > 0) {
      historyIndex -= 1;
      currentLine = history[historyIndex] || '';
      renderTerminal();
    }
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (historyIndex < history.length - 1) {
      historyIndex += 1;
      currentLine = history[historyIndex] || '';
    } else {
      historyIndex = history.length;
      currentLine = '';
    }
    renderTerminal();
    return;
  }

  if (event.key === 'Tab') {
    event.preventDefault();
    sendControl('\t');
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    sendControl('\u0003');
    appendLine('^C', 'status');
    currentLine = '';
    renderTerminal();
    return;
  }

  if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
    currentLine += event.key;
    renderTerminal();
    event.preventDefault();
  }
});

terminal.addEventListener('click', () => {
  terminal.focus();
});

window.addEventListener('beforeunload', () => {
  ensureSocketClosed();
});

setSessionState('idle');
resetTerminal();
