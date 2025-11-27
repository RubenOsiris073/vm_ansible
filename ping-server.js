const express = require('express');
const app = express();
const PORT = 3003;

app.use(express.json());

// Endpoint simple de ping
app.get('/ping/:ip', (req, res) => {
  const ip = req.params.ip;
  const { exec } = require('child_process');
  
  console.log('🏓 Ping request for IP:', ip);
  
  exec(`ping -c 1 -W 3 ${ip}`, (error) => {
    if (error) {
      console.log('❌ Ping FAILED for', ip);
      res.json({ status: 'offline', ip: ip });
    } else {
      console.log('✅ Ping SUCCESS for', ip);
      res.json({ status: 'online', ip: ip });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Ping server running on port ${PORT}`);
});