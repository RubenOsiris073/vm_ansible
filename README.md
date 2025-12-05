# RouterLab - Sistema de Gestión de Red

Sistema completo de gestión y monitoreo de dispositivos de red basado en Kubernetes con interfaz web moderna.

## Arquitectura del Sistema

### Aplicaciones Principales
- **Login App** - Sistema de autenticación con bcrypt
- **Router Admin** - Panel de administración principal  
- **Devices App** - Inventario y monitoreo de dispositivos
- **PostgreSQL** - Base de datos principal

### Stack de Monitoreo
- **Grafana** - Dashboards y visualización
- **Prometheus** - Recolección de métricas
- **Traefik** - Ingress controller y load balancer
- **Node Exporter** - Métricas de sistema

## Accesos del Sistema

### URLs Principales
- **Login**: https://login.routerlab.local
- **Router Admin**: https://routerlab.local  
- **Devices**: https://devices.routerlab.local
- **Grafana**: https://grafana.routerlab.local:30093
- **Traefik Dashboard**: https://traefik.routerlab.local

### Credenciales por Defecto
```
Usuario: admin@routerlab.local
Contraseña: admin123
```

## Inicio Rápido

### Modo Desarrollo (Con modificaciones)
```bash
# 1. Clonar y preparar
git clone <repo> && cd vm_ansible

# 2. Configurar cloud-init con tu SSH key
# Editar cloud-init/ubuntu/user-data y agregar tu llave pública

# 3. Generar seed.iso
cloud-localds cloud-init/ubuntu/seed.iso cloud-init/ubuntu/user-data cloud-init/ubuntu/meta-data

# 4. Descargar imagen Ubuntu (si no existe)
curl -LO https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
qemu-img resize noble-server-cloudimg-amd64.img 20G

# 5. Arrancar VM con cloud-init
./scripts/start-offline-demo.sh

# 6. Aplicar manifiestos K8s personalizados
kubectl apply -f k8s/
```

### Modo Demo (Sistema preconfigurado)
```bash
# Inicio automático para presentaciones
./scripts/start-offline-demo.sh

# Acceso directo: https://routerlab.local
```

### Conexión SSH a la VM
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10
```

### Aplicación de Manifiestos K8s
```bash
# Aplicar todos los manifiestos
kubectl apply -f k8s/

# Aplicar específicos
kubectl apply -f k8s/grafana-deployment-clean.yaml
kubectl apply -f k8s/devices-app-deployment.yaml

# Verificar estado
kubectl get all --all-namespaces
```

### Gestión de Kubernetes
```bash
# Ver todos los pods
kubectl get pods --all-namespaces

# Ver pods específicos de RouterLab
kubectl get pods -l app=devices-app
kubectl get pods -l app=login-app
kubectl get pods -l app=router-admin

# Ver pods de monitoreo
kubectl get pods -n kube-system -l app=grafana
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik

# Verificar servicios
kubectl get services --all-namespaces

# Ver logs de aplicaciones
kubectl logs -l app=devices-app --tail=50
kubectl logs -l app=login-app --tail=50
```

### Gestión de Imágenes Docker
```bash
# Ver imágenes en k3s
sudo k3s ctr images list

# Importar imagen local a k3s
sudo docker save devices-app:latest | sudo k3s ctr images import -

# Actualizar deployment
kubectl set image deployment/devices-app devices-app=devices-app:latest
kubectl rollout restart deployment/devices-app
```

### Base de Datos PostgreSQL
```bash
# Conectar a PostgreSQL
kubectl exec -it $(kubectl get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- psql -U admin -d routerlab

# Ver tablas
\dt

# Consultar dispositivos
SELECT * FROM devices;

# Consultar usuarios
SELECT id, email, role FROM users;
```

### Transferencia de Archivos
```bash
# Copiar archivos a la VM
scp -i ~/.ssh/id_ed25519 archivo.js ubuntu@192.168.77.10:/tmp/

# Copiar directorio completo
scp -i ~/.ssh/id_ed25519 -r directorio/ ubuntu@192.168.77.10:/tmp/

# Actualizar código en contenedor
kubectl cp /tmp/app.js $(kubectl get pod -l app=devices-app -o jsonpath='{.items[0].metadata.name}'):/app/public/
```

## Verificación del Sistema

### Comandos de Estado
```bash
# Verificar todos los componentes
kubectl get pods,services,ingress --all-namespaces

# Estado del stack de monitoreo
kubectl get pods -n kube-system | grep -E "(grafana|prometheus|node-exporter)"

# Verificar conectividad de red
kubectl get ingress --all-namespaces
```

### Troubleshooting Común
```bash
# Si un pod no inicia
kubectl describe pod nombre-del-pod

# Ver eventos del cluster
kubectl get events --sort-by=.metadata.creationTimestamp

# Verificar logs de Traefik
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik
```

## Desarrollo y Despliegue

### Estructura del Proyecto
```
apps/
├── devices-app/     # Aplicación de inventario
├── login-app/       # Sistema de autenticación  
├── router-admin/    # Panel de administración
└── postgres/        # Configuración de base de datos

k8s/                 # Manifiestos de Kubernetes
├── *-deployment.yaml    # Deployments de aplicaciones
├── *-service.yaml       # Servicios ClusterIP/NodePort
├── *-ingress.yaml       # Ingress HTTPS con Traefik
├── grafana-*           # Stack completo de Grafana
├── postgres-*          # Base de datos PostgreSQL
└── GRAFANA_CONFIG_README.md  # Documentación de monitoreo

cloud-init/          # Configuración de inicialización VM
├── ubuntu/
│   ├── user-data    # Configuración cloud-init (usuarios, SSH, paquetes)
│   ├── meta-data    # Metadata de instancia
│   └── seed.iso     # ISO generado para inicialización automática

playbooks/           # Playbooks de Ansible para automatización
├── provision_ubuntu_cloud.yml     # Configuración completa con internet
├── provision_offline_demo.yml     # Modo offline para demos
└── configure_host_network.yml     # Red persistente del host

inventory/           # Inventarios por ambiente
roles/              # Roles reutilizables de Ansible
scripts/            # Scripts de automatización
```

## Archivos Clave del Sistema

### Cloud-Init (Inicialización de VM)
- **`cloud-init/ubuntu/user-data`** - Configuración principal de la VM
  - Usuarios y llaves SSH autorizadas
  - Paquetes a instalar al primer boot
  - Comandos de configuración inicial
  - Timezone, hostname, locale

- **`cloud-init/ubuntu/meta-data`** - Metadata de la instancia
  - Instance ID y hostname
  - Configuración básica de red

- **`cloud-init/ubuntu/seed.iso`** - ISO de inicialización
  - Generado con: `cloud-localds seed.iso user-data meta-data`
  - Montado como CD-ROM virtual en QEMU
  - Permite configuración automática sin red

### Imagen de VM
- **`noble-server-cloudimg-amd64.img`** - Imagen base Ubuntu 24.04 LTS
  - Imagen cloud oficial optimizada para virtualización
  - Incluye cloud-init preinstalado
  - Formato QCOW2, expandible dinámicamente
  - Se descarga de: `https://cloud-images.ubuntu.com/noble/current/`

### Manifiestos Kubernetes (k8s/)
Todos los recursos de Kubernetes organizados por aplicación:

**Aplicaciones RouterLab:**
- `devices-app-deployment.yaml` - Inventario de dispositivos
- `login-app-deployment.yaml` - Sistema de autenticación
- `router-admin-deployment.yaml.j2` - Panel de administración (template Ansible)
- `postgres-deployment.yaml` - Base de datos PostgreSQL

**Monitoreo Completo:**
- `grafana-deployment-clean.yaml` - Grafana con 18 dashboards
- `grafana-service-clean.yaml` - NodePort en 30093 (HTTPS)
- `grafana-ingress-clean.yaml` - Ingress con certificados TLS
- `grafana-datasources.yaml` - Configuración Prometheus
- `grafana-dashboards.yaml` - ConfigMap con dashboards y certificados

**Ingress y Networking:**
- `*-https-ingress.yaml` - Accesos HTTPS via Traefik
- Dominios: `*.routerlab.local` con certificados autofirmados

### Automatización Ansible
Los playbooks están organizados por propósito:

**Playbooks Principales:**
- `provision_ubuntu_cloud.yml` - Instalación completa con conectividad
  - Instala Docker, k3s, kubectl
  - Configura red estática dual (lab + NAT)
  - Despliega aplicaciones RouterLab
  - Configura stack de monitoreo

- `provision_offline_demo.yml` - Modo offline para presentaciones
  - Red solo laboratorio (sin internet)
  - Usa imágenes locales únicamente
  - Optimizado para demos sin conectividad

- `configure_host_network.yml` - Red persistente del host físico
  - Crea puente `br-ext` persistente
  - Configura TAP para GNS3/laboratorio
  - Servicio systemd `routerlab-network`

**Roles Reutilizables:**
- `roles/common/` - Paquetes base y configuración SSH
- `roles/docker/` - Docker CE y configuración de usuarios
- `roles/kubernetes_tools/` - k3s, kubectl, configuración cluster
- `roles/networking/` - Netplan, interfaces, rutas estáticas
- `roles/router_admin_app/` - Build y deploy de Router Admin UI

### Flujo de Desarrollo
1. **Modificar código** en `apps/` (HTML, JS, configuraciones)
2. **Transferir con SCP** a la VM: `scp -i ~/.ssh/id_ed25519 archivo.js ubuntu@192.168.77.10:/tmp/`
3. **Reconstruir imagen Docker** en la VM: `docker build -t app:nueva-version .`
4. **Importar a k3s**: `docker save app:nueva-version | sudo k3s ctr images import -`
5. **Actualizar deployment**: `kubectl set image deployment/app app=app:nueva-version`

### Flujo de Infraestructura
1. **Modificar manifiestos** en `k8s/` (deployments, services, ingress)
2. **Aplicar cambios**: `kubectl apply -f k8s/archivo-modificado.yaml`
3. **Verificar estado**: `kubectl get pods,svc,ingress --all-namespaces`
4. **Para cambios de Ansible**: Ejecutar playbook específico con tags

### Inicialización de VM desde Cero
1. **Preparar cloud-init**: Editar `cloud-init/ubuntu/user-data` con tu SSH key
2. **Generar seed.iso**: `cloud-localds cloud-init/ubuntu/seed.iso cloud-init/ubuntu/user-data cloud-init/ubuntu/meta-data`
3. **Descargar imagen base**: `curl -LO https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img`
4. **Expandir disco**: `qemu-img resize noble-server-cloudimg-amd64.img 20G`
5. **Arrancar VM**: Usar comando QEMU con seed.iso montado
6. **Provisionar con Ansible**: `ansible-playbook playbooks/provision_ubuntu_cloud.yml`

### Backup y Restauración
```bash
# Crear backup completo
/home/ubuntu/k8s-backup/create-backup.sh

# Restaurar desde backup
cd /home/ubuntu/k8s-backup/YYYYMMDD_HHMMSS/
./restore.sh
```

## Configuración de Red

### Hosts Locales
Agregar al archivo `/etc/hosts`:
```
192.168.77.10 routerlab.local
192.168.77.10 login.routerlab.local  
192.168.77.10 devices.routerlab.local
192.168.77.10 grafana.routerlab.local
192.168.77.10 traefik.routerlab.local
```

### Puertos de Servicios
- **HTTP/HTTPS**: 80, 443 (Traefik)
- **Grafana**: 30093 (HTTPS)
- **Traefik Dashboard**: 30090 (HTTP)
- **Prometheus**: 30091 (HTTP)
- **SSH**: 2222

## Notas Técnicas

### Autenticación
Las contraseñas se almacenan hasheadas con bcrypt (salt rounds: 10). La comparación segura se realiza en `login-app/server.js` línea 73 usando `bcrypt.compare()`.

### Monitoreo
Grafana incluye 18 dashboards personalizados para monitoreo completo del cluster, aplicaciones RouterLab y métricas de sistema.

### Almacenamiento
Todos los datos persistentes se almacenan en PostgreSQL. Los ConfigMaps mantienen configuraciones de Grafana y Prometheus.

## APIs del Sistema

### Login App (Puerto 3001)
**Autenticación y gestión de usuarios**

```bash
POST /api/login              # Autenticación con email/password
POST /api/register           # Registro de nuevos usuarios  
POST /api/admin/register     # Registro por administradores
GET  /health                 # Estado del servicio
```

**Payload ejemplos:**
```json
// Login
{"email": "admin@routerlab.local", "password": "admin123"}

// Register  
{"email": "user@domain.com", "password": "pass123", "role": "tecnico"}
```

### Router Admin (Puerto 3000) 
**Gestión y configuración de routers via RESTCONF**

```bash
GET  /api/user/permissions   # Permisos según rol de usuario
POST /api/router/test        # Probar conectividad RESTCONF
POST /api/router/restconf    # Ejecutar operaciones RESTCONF
POST /api/network/ping       # Ping de red a dispositivos
GET  /health                 # Estado del servicio
```

**Operaciones RESTCONF soportadas:**
- `GET` - Consultas (config, interfaces, routing, CDP)
- `PUT` - Modificar hostname  
- `PATCH` - Cambiar descripciones de interfaces
- `POST` - Agregar interfaces loopback
- `DELETE` - Eliminar interfaces/configuraciones

**Payload RESTCONF:**
```json
{
  "operation": "setHostname",
  "router": {"ip": "192.168.77.4", "port": "443", "username": "admin", "password": "admin"},
  "httpMethod": "PUT", 
  "userRole": "admin",
  "payload": {"Cisco-IOS-XE-native:hostname": "ROUTER-NUEVO"}
}
```

### Devices App (Puerto 3002)
**Inventario y monitoreo de dispositivos**

```bash
GET  /auth/verify            # Verificar autenticación de usuario
POST /auth/logout            # Cerrar sesión
GET  /api/user/permissions   # Permisos según rol
GET  /api/devices            # Listar todos los dispositivos
POST /api/devices            # Agregar nuevo dispositivo
POST /api/devices/:id/test   # Probar conectividad de dispositivo
DELETE /api/devices/:id      # Eliminar dispositivo
POST /api/devices/refresh-status # Actualizar estados de todos
GET  /health                 # Estado del servicio
```

**Payload dispositivo:**
```json
{
  "name": "Router-Core-01",
  "ip": "192.168.77.4", 
  "port": "443",
  "username": "admin",
  "password": "admin",
  "description": "Router principal del laboratorio",
  "userRole": "admin"
}
```

### Control de Acceso por Roles

**Admin:** Acceso completo a todas las operaciones
- Login App: Crear usuarios, gestionar roles  
- Router Admin: Todas las operaciones RESTCONF
- Devices App: CRUD completo de dispositivos

**Técnico:** Solo lectura y consultas
- Login App: Solo login/logout
- Router Admin: Solo operaciones GET (consultas)
- Devices App: Ver dispositivos, sin agregar/eliminar

**Operador:** Lectura y modificaciones (sin eliminaciones)  
- Login App: Solo login/logout
- Router Admin: GET, PUT, PATCH, POST (sin DELETE)
- Devices App: Ver y agregar dispositivos (sin eliminar)

**ReadOnly:** Solo visualización
- Login App: Solo login/logout  
- Router Admin: Solo operaciones GET
- Devices App: Solo ver dispositivos
