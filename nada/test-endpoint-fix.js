// API para probar conectividad de un dispositivo
app.post('/api/devices/:id/test', async (req, res) => {
  console.log('[TEST] Endpoint called for device:', req.params.id);
  console.log('[TEST] Query params:', req.query);
  
  const deviceId = req.params.id;
  const userDataParam = req.query.user;
  
  if (!userDataParam) {
    console.log('[TEST] No user parameter');
    return res.status(401).json({
      success: false,
      message: 'Usuario no autenticado'
    });
  }

  let userData;
  try {
    userData = JSON.parse(decodeURIComponent(userDataParam));
    console.log('[TEST] Parsed user:', userData);
  } catch (error) {
    console.log('[TEST] Parse error:', error);
    return res.status(400).json({
      success: false,
      message: 'Datos de usuario inválidos'
    });
  }

  if (!userData.role) {
    console.log('[TEST] No role found');
    return res.status(403).json({
      success: false,
      message: 'Rol de usuario requerido'
    });
  }

  console.log('[TEST] User role OK:', userData.role);

  try {
    // Obtener dispositivo
    const deviceQuery = 'SELECT * FROM devices WHERE id = $1';
    const deviceResult = await pool.query(deviceQuery, [deviceId]);
    
    if (deviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo no encontrado'
      });
    }

    const device = deviceResult.rows[0];
    console.log('[TEST] Testing device:', device.name);

    // Realizar test de conectividad
    const status = await checkDeviceStatus(device);
    console.log('[TEST] Device status:', status);

    res.json({
      success: true,
      status: status,
      message: `Estado de ${device.name}: ${status}`
    });

  } catch (error) {
    console.error('[TEST] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});