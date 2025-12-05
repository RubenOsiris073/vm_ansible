# Router Lab - Demostración Offline

Este proyecto está configurado para funcionar completamente sin conectividad externa, ideal para presentaciones y demostraciones sin acceso a internet.

## Configuración Offline

### Componentes Independientes

1. **Puente de Host Persistente** (`br-ext`)
   - Red interna: `192.168.77.0/24`
   - Gateway host: `192.168.77.1`
   - Configurado como servicio systemd persistent

2. **VM Ubuntu Autónoma**
   - IP estática: `192.168.77.10/24`
   - Gateway: `192.168.77.1` (el host)
   - SSH: puerto 2222 (via NAT local)
   - Kubernetes cluster (k3s) integrado

3. **Router Admin UI**
   - Acceso HTTPS: `https://routerlab.local`
   - Certificado TLS autofirmado incluido
   - Proxy Telnet para administración de router

4. **Router GNS3** (simulado)
   - IP en red interna: `192.168.77.4`
   - Accesible via Telnet puerto 23

## Inicio Rápido para Demostración

### Preparación (una sola vez)

1. **Configurar resolución DNS local**:
   ```bash
   echo "192.168.77.10 routerlab.local" | sudo tee -a /etc/hosts
   ```

2. **Verificar servicios del host**:
   ```bash
   sudo systemctl status routerlab-network.service
   ```

### Iniciar Demostración

Usa el script automatizado:

```bash
cd /home/os/Documents/vm_ansible
./scripts/start-offline-demo.sh
```

Este script:
- ✅ Verifica que los puentes estén configurados
- ✅ Detiene VMs anteriores si existen  
- ✅ Inicia VM en modo offline
- ✅ Verifica conectividad SSH y red interna
- ✅ Muestra el estado del laboratorio

### Verificación de Estado

```bash
# Conectar a la VM
ssh -i ~/.ssh/id_ed25519 -p 2222 ubuntu@localhost

# Ver servicios Kubernetes
ssh -p 2222 ubuntu@localhost 'kubectl get pods -A'

# Verificar conectividad al router
ssh -p 2222 ubuntu@localhost 'ping -c 3 192.168.77.4'
```

### Acceso a la Interfaz Web

- **URL**: https://routerlab.local
- **Certificado**: Autofirmado (acepta advertencia de seguridad)
- **Datos de conexión**:
  - IP del router: `192.168.77.4`
  - Puerto: `23` (Telnet)
  - Usuario/Password: según configuración del router GNS3

## Arquitectura de Red Offline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Host Physical │     │    VM Ubuntu     │     │  Router GNS3    │
│                 │     │                  │     │                 │
│ br-ext          │────▶│ ens3             │────▶│ 192.168.77.4    │
│ 192.168.77.1    │     │ 192.168.77.10    │     │ (Telnet:23)     │
│                 │     │                  │     │                 │
│ tap-ubuntu      │     │ ens4 (NAT SSH)   │     │                 │
│ gns3tap0-0      │     │ :2222 → :22      │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Características de Independencia

### Sin Dependencias Externas

- ❌ **Sin Internet**: No requiere conectividad WAN
- ❌ **Sin DHCP externo**: IPs estáticas configuradas  
- ❌ **Sin DNS externo**: Resolución local via `/etc/hosts`
- ❌ **Sin repositorios**: Software preinstalado en la VM

### Persistencia Garantizada

- ✅ **Puentes automáticos**: Servicio systemd configura red al boot
- ✅ **IPs estáticas**: Configuración netplan persistente
- ✅ **Certificados incluidos**: TLS autofirmado preconfigurado
- ✅ **Imágenes locales**: Docker images cached localmente

## Solución de Problemas

### VM no inicia
```bash
# Verificar que el puente existe
ip addr show br-ext

# Reiniciar servicio de red si es necesario
sudo systemctl restart routerlab-network.service
```

### Router Admin no accesible
```bash
# Verificar pods de Kubernetes
ssh -p 2222 ubuntu@localhost 'kubectl get pods -n router-admin'

# Verificar ingress
ssh -p 2222 ubuntu@localhost 'kubectl get ingress -n router-admin'
```

### Sin conectividad al router
```bash
# Verificar que GNS3 router esté en 192.168.77.4
ping 192.168.77.4

# Verificar puente de GNS3
bridge link show | grep gns3tap
```

## Comandos Útiles

```bash
# Detener demostración
pkill -f ubuntu-ansible

# Ver logs de VM
ssh -p 2222 ubuntu@localhost 'sudo journalctl -u k3s -n 20'

# Status completo del sistema
curl -k -I https://routerlab.local
ssh -p 2222 ubuntu@localhost 'kubectl cluster-info'
```

---

## Ventajas para Presentaciones

1. **Confiabilidad**: No depende de WiFi o conectividad externa
2. **Velocidad**: Red interna de alta velocidad
3. **Seguridad**: Ambiente completamente aislado
4. **Reproducibilidad**: Mismo comportamiento siempre
5. **Portabilidad**: Funciona en cualquier laptop con KVM
