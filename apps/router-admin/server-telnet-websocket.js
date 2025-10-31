const http = require('http');
const path = require('path');
const express = require('express');
const net = require('net');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const TELNET_DEFAULT_PORT = 23;
const CONNECTION_TIMEOUT_MS = 7000;

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function isValidIp(ip) {
  return /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}$/.test(ip);
}

function stripTelnetNegotiation(buffer) {
  const result = [];
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i];
    if (byte === 255) {
      const command = buffer[i + 1];
      if (command === undefined) {
        break;
      }

      if (command === 255) {
        result.push(255);
        i += 1;
        continue;
      }

      if (command === 250) {
        i += 2;
        while (i < buffer.length) {
          if (buffer[i] === 255 && buffer[i + 1] === 240) {
            i += 1;
            break;
          }
          i += 1;
        }
        continue;
      }

      if (command >= 251 && command <= 254) {
        i += 2;
        continue;
      }

      if (command === 240 || command === 241 || command === 242 || command === 243 || command === 244 || command === 245) {
        i += 1;
        continue;
      }

      continue;
    }

    result.push(byte);
  }

  return Buffer.from(result);
}

function stripAnsiSequences(text) {
  return text.replace(/\x1B[@-_][0-?]*[ -\/]*[@-~]/g, '');
}

function applyBackspaces(text) {
  const chars = [];
  for (const char of text) {
    if (char === '\b') {
      chars.pop();
    } else {
      chars.push(char);
    }
  }
  return chars.join('');
}

function normalizeTelnetText(rawText) {
  if (!rawText) {
    return '';
  }

  const withoutAnsi = stripAnsiSequences(rawText);
  const normalizedLineEndings = withoutAnsi.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const strippedControl = normalizedLineEndings.replace(/[\x00-\x07\x0B-\x0C\x0E-\x1A\x1C-\x1F]/g, '');
  return applyBackspaces(strippedControl);
}

function parseTelnetChunk(buffer) {
  const stripped = stripTelnetNegotiation(buffer);
  const rawText = stripped.toString('utf8');
  return {
    text: normalizeTelnetText(rawText),
    hasPagerPrompt: rawText.includes('--More--')
  };
}

app.post('/api/telnet/test', async (req, res) => {
  const { ip, port, username, password, probeCommand } = req.body || {};

  if (!ip || !isValidIp(ip)) {
    return res.status(400).json({ ok: false, message: 'IP inválida' });
  }

  const telnetPort = Number(port) || TELNET_DEFAULT_PORT;
  if (Number.isNaN(telnetPort) || telnetPort <= 0 || telnetPort > 65535) {
    return res.status(400).json({ ok: false, message: 'Puerto inválido' });
  }

  const safeUsername = String(username || '').trim();
  const safePassword = String(password || '').trim();
  const safeCommand = String(probeCommand || '').trim();

  const client = new net.Socket();
  let receivedData = '';
  let settled = false;

  const cleanup = (status, message) => {
    if (!settled) {
      settled = true;
      client.destroy();
      res.status(status).json(message);
    }
  };

  client.setTimeout(CONNECTION_TIMEOUT_MS, () => {
    cleanup(504, { ok: false, message: 'Timeout: sin respuesta del router' });
  });

  client.on('error', (err) => {
    cleanup(502, { ok: false, message: `Error de conexión: ${err.message}` });
  });

  client.on('data', (data) => {
    const { text: sanitizedChunk, hasPagerPrompt } = parseTelnetChunk(data);
    receivedData += sanitizedChunk;

    if (hasPagerPrompt) {
      client.write(' ');
    }

    const lower = receivedData.toLowerCase();

    if (lower.includes('login') || lower.includes('username')) {
      if (safeUsername) {
        client.write(`${safeUsername}\r\n`);
      }
    }

    if (lower.includes('password') && safePassword) {
      client.write(`${safePassword}\r\n`);
    }

    if (safeCommand && receivedData.includes('>')) {
      client.write(`${safeCommand}\r\n`);
    }
  });

  client.on('close', () => {
    if (!settled) {
      cleanup(200, {
        ok: true,
        message: 'Conexión cerrada por el host',
        output: receivedData.slice(-4000)
      });
    }
  });

  client.connect(telnetPort, ip, () => {
    setTimeout(() => {
      if (!settled) {
        cleanup(200, {
          ok: true,
          message: 'Conexión establecida',
          output: receivedData.slice(-4000)
        });
      }
    }, 1500);
  });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ ok: false, message: 'JSON inválido en la solicitud' });
  }
  return next(err);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/shell' });

wss.on('connection', (ws) => {
  let telnetClient = null;
  let connected = false;
  let credentials = { username: '', password: '' };
  let usernameSent = false;
  let passwordSent = false;

  const send = (type, payload = {}) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type, ...payload }));
    }
  };

  const closeTelnet = (reason, { emitClosed = true } = {}) => {
    if (telnetClient) {
      telnetClient.removeAllListeners();
      telnetClient.destroy();
      telnetClient = null;
    }
    connected = false;
    usernameSent = false;
    passwordSent = false;
    credentials = { username: '', password: '' };

    if (reason) {
      send('status', { message: reason });
    }
    if (emitClosed) {
      send('closed');
    }
  };

  ws.on('message', (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
    } catch (error) {
      send('error', { message: 'Mensaje WebSocket inválido' });
      return;
    }

    if (message.type === 'connect') {
      if (!message.ip || !isValidIp(message.ip)) {
        send('error', { message: 'IP inválida' });
        return;
      }

      if (telnetClient) {
        closeTelnet(undefined, { emitClosed: false });
      }

      credentials = {
        username: String(message.username || '').trim(),
        password: String(message.password || '').trim()
      };
      telnetClient = new net.Socket();
      telnetClient.setKeepAlive(true, 30000);
      telnetClient.setTimeout(0);

      telnetClient.on('data', (chunk) => {
        const { text: sanitized, hasPagerPrompt } = parseTelnetChunk(chunk);
        const normalized = sanitized.toLowerCase();

        if (sanitized) {
          send('output', { data: sanitized });
        }

        if (hasPagerPrompt && connected) {
          telnetClient.write(' ');
        }

        if (!usernameSent && credentials.username && (normalized.includes('login') || normalized.includes('username'))) {
          telnetClient.write(`${credentials.username}\r\n`);
          usernameSent = true;
          send('status', { message: 'Usuario enviado' });
        }

        if (!passwordSent && credentials.password && normalized.includes('password')) {
          telnetClient.write(`${credentials.password}\r\n`);
          passwordSent = true;
          send('status', { message: 'Contraseña enviada' });
        }
      });

      telnetClient.on('error', (err) => {
        send('error', { message: `Error de conexión: ${err.message}` });
        closeTelnet();
      });

      telnetClient.on('close', () => {
        closeTelnet('Sesión Telnet finalizada');
      });

      telnetClient.on('connect', () => {
        connected = true;
        send('status', { message: `Sesión abierta con ${message.ip}:23` });
        send('ready');
      });

      telnetClient.connect(TELNET_DEFAULT_PORT, message.ip);
      send('status', { message: `Conectando a ${message.ip}:23...` });
      return;
    }

    if (message.type === 'command') {
      if (!telnetClient || !connected) {
        send('error', { message: 'No hay una sesión activa' });
        return;
      }

      const command = String(message.command || '').trim();
      if (!command) {
        return;
      }

      telnetClient.write(`${command}\r\n`);
      return;
    }

    if (message.type === 'control') {
      if (!telnetClient || !connected) {
        return;
      }

      const payload = typeof message.data === 'string' ? message.data : '';
      if (!payload) {
        return;
      }

      telnetClient.write(payload);
      return;
    }

    if (message.type === 'disconnect') {
      closeTelnet('Sesión cerrada por el usuario');
      return;
    }
  });

  ws.on('close', () => {
    closeTelnet();
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Router admin UI escuchando en http://0.0.0.0:${PORT}`);
});
