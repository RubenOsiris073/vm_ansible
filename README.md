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

## Comandos de Administración

### Conexión SSH a la VM
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10
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

playbooks/           # Playbooks de Ansible
inventory/           # Inventarios por ambiente
scripts/             # Scripts de automatización
```

### Flujo de Desarrollo
1. Modificar código en `apps/`
2. Transferir con SCP a la VM
3. Reconstruir imagen Docker
4. Importar a k3s
5. Actualizar deployment

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
