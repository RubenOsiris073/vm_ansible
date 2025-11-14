-- Crear tabla de dispositivos para el inventario RESTCONF
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    ip INET NOT NULL,
    port INTEGER DEFAULT 443,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'unknown',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
CREATE INDEX IF NOT EXISTS idx_devices_name ON devices(name);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- Insertar algunos dispositivos de ejemplo (opcional)
INSERT INTO devices (name, ip, port, username, password, description) VALUES 
('Router-Core-01', '192.168.77.4', 443, 'admin', 'admin', 'Router principal del laboratorio'),
('Router-Edge-01', '192.168.77.5', 443, 'admin', 'admin', 'Router de borde para internet')
ON CONFLICT (name) DO NOTHING;

-- Actualizar timestamp en modificaciones
CREATE OR REPLACE FUNCTION update_devices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualización automática del timestamp
DROP TRIGGER IF EXISTS trigger_update_devices_timestamp ON devices;
CREATE TRIGGER trigger_update_devices_timestamp
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_devices_timestamp();