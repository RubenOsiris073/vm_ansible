# Router Lab - Sistema Completo con VM Ubuntu y Router Admin UI# Ubuntu cloud-init + Ansible workflow



Esta guía reproduce todo el flujo de trabajo desarrollado para crear un laboratorio de router completamente funcional con VM Ubuntu, Kubernetes (k3s), Router Admin UI con interfaz web HTTPS, y capacidad de operación offline para presentaciones. Esta guía muestra cómo preparar una VM Ubuntu con cloud-init y Ansible lista para operar de forma externa, manteniendo todo el software instalado (Docker, kubectl, k3s, utilerías) y habilitando tanto acceso SSH como consola sin contraseña. La VM puede enlazarse después a otras topologías —por ejemplo, a un router virtualizado en GNS3— mediante un puente de red en el host.



## 🎯 Resumen del Sistema## 1. Requisitos e instalación de utilidades



**Componentes principales:**```bash

- **VM Ubuntu** con cloud-init, Docker, k3s y herramientas de redsudo apt-get update

- **Router Admin UI** - Aplicación web Node.js con proxy Telnet para administración de routerssudo apt-get install -y cloud-image-utils qemu-system-x86 qemu-utils

- **Red interna persistente** (`192.168.77.0/24`) que funciona sin conectividad externa  ```

- **HTTPS con certificados TLS** autofirmados para `routerlab.local`

- **Integración GNS3** mediante puentes de red> `cloud-image-utils` instala `cloud-localds`, necesario para crear el ISO de cloud-init.



## 🚀 Inicio Rápido (Modo Offline)Confirma que tienes un par de llaves SSH (aquí se asume `~/.ssh/id_ed25519`).



Para presentaciones o demos sin conexión a internet:## 2. Preparar cloud-init



```bash1. Edita `cloud-init/ubuntu/user-data` y coloca tu llave pública en `ssh_authorized_keys`.

cd /home/os/Documents/vm_ansible2. Ajusta hostname, paquetes u opciones según necesites.

3. Verifica en `inventory/ubuntu_cloud.ini` que la ruta a tu llave privada sea correcta (`/home/<usuario>/.ssh/id_ed25519`).

# Configurar DNS local (una sola vez)

echo "192.168.77.10 routerlab.local" | sudo tee -a /etc/hosts## 3. Descargar la imagen cloud de Ubuntu



# Iniciar demo automáticamente```bash

./scripts/start-offline-demo.shcurl -LO https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img

``````



Una vez iniciado, accede a: **https://routerlab.local**## 4. Generar el seed ISO para cloud-init



> 📖 Ver `OFFLINE_DEMO.md` para documentación detallada del modo offline.```bash

cloud-localds cloud-init/ubuntu/seed.iso cloud-init/ubuntu/user-data cloud-init/ubuntu/meta-data

## 📋 Requisitos del Sistema```



```bash> **Importante:** si editas `cloud-init/ubuntu/user-data` más adelante (por ejemplo, para cambiar tu llave pública o instalar paquetes extra), vuelve a ejecutar `cloud-localds` antes del siguiente arranque. El archivo `seed.iso` no se actualiza por sí mismo.

sudo apt-get update

sudo apt-get install -y cloud-image-utils qemu-system-x86 qemu-utils ansible bridge-utils## 5. (Opcional) Ampliar el disco antes del primer arranque

```

```bash

**Archivos requeridos:**qemu-img resize noble-server-cloudimg-amd64.img 20G

- Llave SSH: `~/.ssh/id_ed25519` (o actualizar rutas en inventarios)```

- Imagen Ubuntu Cloud: Se descarga automáticamente

- GNS3 configurado (opcional, para router real)## 6. Arrancar la VM con QEMU/KVM (modo demonio)



## 🏗️ Instalación Completa Desde Cero```bash

qemu-system-x86_64 \

### 1. Preparación Inicial  -enable-kvm \

  -daemonize \

```bash  -name ubuntu-ansible \

# Clonar o ubicar el proyecto  -m 4096 \

cd /home/os/Documents/vm_ansible  -smp 2 \

  -drive file=/home/os/Documents/vm_ansible/noble-server-cloudimg-amd64.img,if=virtio,format=qcow2 \

# Generar llaves SSH si no existen  -drive file=/home/os/Documents/vm_ansible/cloud-init/ubuntu/seed.iso,if=virtio,format=raw \

ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""  -netdev user,id=vmnic,hostfwd=tcp::2222-:22 \

  -device virtio-net-pci,netdev=vmnic \

# Descargar imagen Ubuntu Noble  -display none

curl -LO https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img```



# Expandir disco a 20GBEl parámetro `hostfwd=tcp::2222-:22` es clave: sin él no habrá puerto 2222 escuchando en tu host y, por ende, el SSH fallará.

qemu-img resize noble-server-cloudimg-amd64.img 20G

```Comprueba que el proceso quedó activo:



### 2. Configurar Cloud-Init```bash

pgrep -af qemu-system

**Editar `cloud-init/ubuntu/user-data`:**```

- Agregar tu llave pública SSH

- Configurar usuario y hostname según necesites### Detener la VM



**Generar seed.iso:**Cuando necesites finalizar la VM que quedó en segundo plano, envía una señal `SIGTERM` al proceso de QEMU identificado por el nombre `ubuntu-ansible`:

```bash

cloud-localds cloud-init/ubuntu/seed.iso cloud-init/ubuntu/user-data cloud-init/ubuntu/meta-data```bash

```pkill -f "name ubuntu-ansible"

```

> ⚠️ **Importante:** Regenera `seed.iso` cada vez que modifiques `user-data`.

Después confirma que ya no hay procesos activos:

### 3. Configurar Red Persistente del Host

```bash

```bashpgrep -af qemu-system

# Instalar servicio de red automático```

ansible-playbook playbooks/configure_host_network.yml -i inventory/host.ini --ask-become-pass

```## 7. Probar acceso SSH



Esto crea:```bash

- Puente `br-ext` con IP `192.168.77.1/24`ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost uname -a

- TAP `tap-ubuntu` conectado al puente  ```

- Servicio systemd `routerlab-network.service` persistente

> Consolas VNC/telnet entran automáticamente como `ubuntu` (sin contraseña). Para SSH, usuario `ubuntu` y contraseña `ubuntu`; la clave pública sigue disponible.

### 4. Iniciar VM y Configurar con Ansible

## 8. Ejecutar Ansible

**Modo estándar (con conectividad externa):**

```bashEl archivo `ansible.cfg` ya apunta a `inventory/ubuntu_cloud.ini` y a `roles/`.

# Iniciar VM con dos interfaces (lab + NAT)

qemu-system-x86_64 \```bash

  -enable-kvm -daemonize -name ubuntu-ansible -m 4096 -smp 2 \ansible-playbook --syntax-check playbooks/provision_ubuntu_cloud.yml

  -drive file=noble-server-cloudimg-amd64.img,if=virtio,format=qcow2 \ansible-playbook playbooks/provision_ubuntu_cloud.yml

  -drive file=cloud-init/ubuntu/seed.iso,if=virtio,format=raw \```

  -netdev tap,id=vmnic0,ifname=tap-ubuntu,script=no,downscript=no \

  -device virtio-net-pci,netdev=vmnic0,mac=52:54:00:aa:bb:01 \Si necesitas un dry-run previo:

  -netdev user,id=vmnic1,hostfwd=tcp::2222-:22 \

  -device virtio-net-pci,netdev=vmnic1,mac=52:54:00:aa:bb:02 \```bash

  -display noneansible-playbook -C playbooks/provision_ubuntu_cloud.yml

```

# Esperar SSH disponible (30-60 segundos)

ssh -i ~/.ssh/id_ed25519 -p 2222 ubuntu@localhost echo "VM ready"Para aplicar únicamente un rol específico puedes usar tags:



# Configurar VM completamente con Ansible```bash

ansible-playbook -i inventory/ubuntu_cloud.ini playbooks/provision_ubuntu_cloud.ymlansible-playbook playbooks/provision_ubuntu_cloud.yml --tags networking

```ansible-playbook playbooks/provision_ubuntu_cloud.yml --tags kubernetes_tools

ansible-playbook playbooks/provision_ubuntu_cloud.yml --tags router_admin_app

**Modo offline (sin conectividad externa):**```

```bash

# Usar script automatizado## 9. Verificar versiones dentro de la VM

./scripts/start-offline-demo.sh

```bash

# O manual con configuración offlinessh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost docker --version

ansible-playbook -i inventory/offline_demo.ini playbooks/provision_offline_demo.ymlssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost kubectl version --client --output=yaml

```ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost k3s --version

```

### 5. Configurar HTTPS y Certificados

## 10. Apagar y exportar la imagen

Los certificados TLS se generan automáticamente durante el aprovisionamiento:

Apaga de forma limpia:

```bash

# Verificar certificados en la VM```bash

ssh -p 2222 ubuntu@localhost 'KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl get secret -n router-admin'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost sudo shutdown now

```

# Verificar ingress HTTPS

curl -k -I https://192.168.77.10 -H "Host: routerlab.local"> Si modificas `cloud-init/ubuntu/user-data`, antes del apagado ejecuta `ssh -o ... ubuntu@localhost sudo cloud-init clean` y luego apaga. En el siguiente arranque, cloud-init aplicará la configuración nueva.

```

Convierte a RAW si necesitas compatibilidad con otra plataforma:

## 🌐 Arquitectura de Red

```bash

```qemu-img convert -f qcow2 -O raw noble-server-cloudimg-amd64.img ubuntu-gns3.raw

┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────┐```

│    Host Physical    │    │      VM Ubuntu       │    │   Router GNS3   │

│                     │    │                      │    │                 │Si prefieres mantener el formato QCOW2 pero más compacto (recomendado):

│  br-ext             │◄──►│  ens3                │◄──►│  192.168.77.4   │

│  192.168.77.1/24    │    │  192.168.77.10/24    │    │  Telnet:23      │```bash

│                     │    │                      │    │                 │qemu-img convert -f qcow2 -O qcow2 -c noble-server-cloudimg-amd64.img ubuntu-gns3.qcow2

│  tap-ubuntu         │    │  ens4 (NAT)          │    │                 │```

│  gns3tap0-0         │    │  SSH: :2222→:22      │    │                 │> Resultado típico: ~1 GB en disco por una VM lógica de 20 GB. Verifica con `qemu-img info ubuntu-gns3.qcow2`.

└─────────────────────┘    └──────────────────────┘    └─────────────────┘

                                    │## 11. Conectar la VM externa a un router virtualizado

                            ┌──────────────────┐

                            │   Kubernetes     │1. **Crea un puente/tap en el host** (ejemplo con `iproute2`):

                            │   ├── Traefik    │   ```bash

                            │   ├── Router     │   sudo ip link add br-ext type bridge

                            │   │   Admin UI   │   sudo ip link set br-ext up

                            │   └── TLS Certs  │   sudo ip tuntap add dev tap-ubuntu mode tap user $USER

                            └──────────────────┘   sudo ip link set tap-ubuntu up

```   sudo ip link set tap-ubuntu master br-ext

   ```

### Flujo de Datos2. **Arranca la VM enlazada al tap** (manteniendo el puerto 2222 disponible vía NAT):

   ```bash

1. **Acceso Web**: `https://routerlab.local` → Traefik Ingress → Router Admin Pod   qemu-system-x86_64 \

2. **Telnet Proxy**: Router Admin UI → Router GNS3 (192.168.77.4:23)     -enable-kvm \

3. **Administración**: SSH al host → VM puerto 2222 → kubectl/docker     -daemonize \

     -name ubuntu-ansible \

## 🔧 Componentes del Sistema     -m 4096 \

     -smp 2 \

### Router Admin UI (Node.js + Express)     -drive file=/home/os/Documents/vm_ansible/noble-server-cloudimg-amd64.img,if=virtio,format=qcow2 \

     -drive file=/home/os/Documents/vm_ansible/cloud-init/ubuntu/seed.iso,if=virtio,format=raw \

**Características:**     -netdev tap,id=vmnic0,ifname=tap-ubuntu,script=no,downscript=no \

- ✅ Interfaz web HTML/CSS/JavaScript limpia     -device virtio-net-pci,netdev=vmnic0,mac=52:54:00:aa:bb:01 \

- ✅ WebSocket para terminal Telnet interactivo       -netdev user,id=vmnic1,hostfwd=tcp::2222-:22 \

- ✅ Proxy HTTP para pruebas de conectividad     -device virtio-net-pci,netdev=vmnic1,mac=52:54:00:aa:bb:02 \

- ✅ Manejo de secuencias ANSI y negociación Telnet     -display none

- ✅ Desplegado como pod Kubernetes   ```

   Esto crea dos interfaces dentro de la VM: `ens3` (hacia el laboratorio mediante `tap-ubuntu`) y `ens4` (NAT para salida a Internet y SSH).

**Ubicación:** `apps/router-admin/`3. **Enlaza tu laboratorio externo**: añade el puente `br-ext` en la nube/bridge de tu plataforma de red (por ejemplo, en GNS3 usa un nodo *Cloud* conectado a `br-ext`) y vincúlalo al puerto del router virtualizado.

**Acceso:** https://routerlab.local4. Desde la VM, podrás alcanzar servicios expuestos por el router (SSH, telnet, etc.) usando la IP asignada dentro de la red de laboratorio.

    5. La provisión de Ansible añade automáticamente la IP secundaria `192.168.77.10/24` (ajustable con `router_admin_secondary_ip`) sobre la interfaz principal. Asigna una IP a tu puente en el host, por ejemplo:

### Roles de Ansible       ```bash

       sudo ip addr add 192.168.77.1/24 dev br-ext

1. **`common`** - Paquetes base y configuración SSH       ```

2. **`docker`** - Instalación Docker CE y configuración usuarios       Luego agrega la resolución local con un dominio corto:

3. **`kubernetes_tools`** - k3s, kubectl y configuración cluster       ```bash

4. **`networking`** - Netplan, interfaces estáticas, rutas       printf "192.168.77.10 routerlab.local\n" | sudo tee -a /etc/hosts

5. **`router_admin_app`** - Build y deploy de Router Admin UI         ```

6. **`host_networking`** - Puentes y TAPs persistentes del host       A partir de ese momento podrás abrir `http://routerlab.local` desde el host físico.



### Configuraciones de Red### Automatizar el puente del host



**Modo online** (`inventory/ubuntu_cloud.ini`):Los comandos anteriores añaden el puente y la IP en el host solo por la sesión actual. Para que el puente `br-ext`, el tap `tap-ubuntu` y la dirección `192.168.77.1/24` sobrevivan a reinicios del host (aunque la VM esté apagada), ejecuta el nuevo playbook local:

- VM usa DHCP en ens4 como ruta por defecto

- Lab en ens3 con IP secundaria estática```bash

ansible-playbook playbooks/configure_host_network.yml -i inventory/host.ini --ask-become-pass

**Modo offline** (`inventory/offline_demo.ini`):```

- VM usa ens3 como ruta por defecto (métricas ajustadas)

- NAT solo para SSH, sin dependencias externasEl playbook instala un servicio `routerlab-network.service` que, en cada arranque, asegura:



## 📱 Uso de la Aplicación- La creación y activación del puente `br-ext`.

- La dirección estática `192.168.77.1/24` asociada al puente.

### Acceso Web- El tap `tap-ubuntu` unido al puente (con el propietario del usuario que ejecuta el playbook).

- (Opcional) el reactivado de `net.ipv4.ip_forward` si lo habilitas con la variable `routerlab_enable_ip_forward`.

1. **URL**: https://routerlab.local

2. **Certificado**: Acepta advertencia de seguridad (autofirmado)Puedes ajustar valores en `/etc/default/routerlab-network` (creado automáticamente) y volver a lanzar el playbook para aplicarlos.

3. **Conectar al router**:

   - IP: `192.168.77.4` (o IP de tu router GNS3)Tras un reinicio del host, confirma que el servicio quedó activo:

   - Puerto: 23 (Telnet)

   - Usuario/Password: Según configuración del router```bash

sudo systemctl status routerlab-network

### Terminal Telnet Interactivo```



La interfaz incluye terminal completo con:Si detectas que `br-ext` o `tap-ubuntu` no aparecen, reejecuta manualmente el script para obtener mensajes de log detallados:

- ✅ Envío de comandos en tiempo real

- ✅ Historial navegable con flechas```bash

- ✅ Soporte para Ctrl+C, Tab, Backspacesudo /usr/local/lib/routerlab-network/setup-routerlab-network.sh

- ✅ Manejo automático de paginación (`--More--`)```

- ✅ Limpieza de secuencias ANSI

### Poner todo en línea después de un reinicio del host

## 🛠️ Gestión del Sistema

1. **Verifica el servicio del puente** (`routerlab-network.service`):

### Comandos Útiles  ```bash

  sudo systemctl status routerlab-network

```bash  ```

# Verificar estado de servicios  Si no está activo, arráncalo y revisa que `br-ext` y `tap-ubuntu` queden en estado `UP`:

systemctl status routerlab-network.service  ```bash

ssh -p 2222 ubuntu@localhost 'systemctl status k3s'  sudo systemctl start routerlab-network

  ip addr show br-ext

# Ver pods y servicios  ip link show tap-ubuntu

ssh -p 2222 ubuntu@localhost 'kubectl get pods -A'  ```

ssh -p 2222 ubuntu@localhost 'kubectl get ingress -n router-admin'2. **Arranca la VM con las dos interfaces** (tap hacia el laboratorio y NAT para acceso local por SSH):

  ```bash

# Detener/reiniciar VM  qemu-system-x86_64 \

pkill -f ubuntu-ansible    -enable-kvm \

./scripts/start-offline-demo.sh    -daemonize \

    -name ubuntu-ansible \

# Limpiar y reconstruir    -m 4096 \

ssh -p 2222 ubuntu@localhost 'docker system prune -a -f'    -smp 2 \

ansible-playbook -i inventory/ubuntu_cloud.ini playbooks/provision_ubuntu_cloud.yml --tags router_admin_app    -drive file=/home/os/Documents/vm_ansible/noble-server-cloudimg-amd64.img,if=virtio,format=qcow2 \

```    -drive file=/home/os/Documents/vm_ansible/cloud-init/ubuntu/seed.iso,if=virtio,format=raw \

    -netdev tap,id=vmnic0,ifname=tap-ubuntu,script=no,downscript=no \

### Logs y Debugging    -device virtio-net-pci,netdev=vmnic0,mac=52:54:00:aa:bb:01 \

    -netdev user,id=vmnic1,hostfwd=tcp::2222-:22 \

```bash    -device virtio-net-pci,netdev=vmnic1,mac=52:54:00:aa:bb:02 \

# Logs de k3s    -serial telnet:127.0.0.1:6000,server,nowait \

ssh -p 2222 ubuntu@localhost 'journalctl -u k3s -f'    -display none

  ```

# Logs de Router Admin  (La interfaz `ens3` dentro de la VM se une al laboratorio mediante `br-ext`, mientras que `ens4` conserva el acceso NAT para el puerto 2222.)

ssh -p 2222 ubuntu@localhost 'kubectl logs -n router-admin deployment/router-admin -f'3. **Confirma el acceso SSH y la dirección secundaria**:

  ```bash

# Estado de red  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost ip -4 addr

ssh -p 2222 ubuntu@localhost 'ip route show'  ```

bridge link show | grep -E "(tap-ubuntu|gns3tap)"  Debes ver `192.168.77.10/24` sobre `ens3`. Si no aparece, reejecuta el playbook de provisión para aplicar la plantilla de Netplan:

```  ```bash

  ansible-playbook playbooks/provision_ubuntu_cloud.yml

## 🐛 Solución de Problemas  ```

4. **Comprueba el despliegue de Router Admin** una vez que Kubernetes esté arriba:

### VM no inicia o SSH no funciona  ```bash

```bash  ssh -p 2222 ubuntu@localhost -- sudo kubectl get pods -n router-admin

# Verificar puente existe  ```

ip addr show br-ext  Con la VM en línea y `routerlab.local` resolviendo a `192.168.77.10`, la interfaz web quedará disponible.



# Verificar proceso QEMUSi necesitas limpiar un despliegue previo antes de reprovisionar:

pgrep -af ubuntu-ansible

```bash

# Regenerar seed.iso si modificaste user-datassh -p 2222 ubuntu@localhost -- kubectl delete namespace router-admin --ignore-not-found=true

cloud-localds cloud-init/ubuntu/seed.iso cloud-init/ubuntu/user-data cloud-init/ubuntu/meta-data```

```

## 12. Tip extra: revisar espacio en disco tras ampliar

### Router Admin UI no carga

```bash```bash

# Verificar podsssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost df -h /

ssh -p 2222 ubuntu@localhost 'kubectl get pods -n router-admin'```



# Verificar certificados TLS## 13. Desplegar la Router Admin UI en el clúster

ssh -p 2222 ubuntu@localhost 'kubectl get secret -n router-admin'

1. Instala dependencias y prueba en modo local (opcional):

# Probar conectividad básica  ```bash

curl -k -I https://192.168.77.10 -H "Host: routerlab.local"  cd apps/router-admin

```  npm install

  npm start

### Sin conectividad al router  ```

```bash  La aplicación estará disponible en `http://localhost:3000`. Los campos permiten especificar IP, puerto, usuario, contraseña y un comando opcional; toda la lógica se ejecuta con Express y sockets Telnet nativos, sin dependencias externas.

# Verificar router GNS3 esté en red correcta

ping 192.168.77.42. Construye la imagen para el clúster (en la VM):

  ```bash

# Verificar puente GNS3 conectado  cd apps/router-admin

bridge link show | grep gns3tap  docker build -t router-admin:local .

  ```

# Verificar rutas en VM

ssh -p 2222 ubuntu@localhost 'ip route show'3. Carga la imagen en k3s (usa containerd interno):

```  ```bash

  docker save router-admin:local -o router-admin.tar

### Espacio en disco insuficiente  sudo k3s ctr images import router-admin.tar

```bash  ```

# Limpiar Docker

ssh -p 2222 ubuntu@localhost 'docker system prune -a -f'4. Exporta la configuración de kubectl para k3s (solo si aún no lo haces):

  ```bash

# Verificar espacio  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

ssh -p 2222 ubuntu@localhost 'df -h /'  ```



# Quitar taint si es necesario5. Despliega los manifiestos (Ansible los deja renderizados en `/opt/router-admin/router-admin-deployment.yaml` dentro de la VM):

ssh -p 2222 ubuntu@localhost 'kubectl taint nodes --all node.kubernetes.io/disk-pressure-'  ```bash

```  kubectl apply -f /opt/router-admin/router-admin-deployment.yaml

  ```

## 📚 Archivos de Configuración Clave

6. Una vez aplicado el playbook, Traefik expone automáticamente la interfaz en `http://routerlab.local` (ajusta el dominio mediante `router_admin_hostname`). Verifica que tu host físico resuelva ese nombre contra la IP asignada y que la VM tenga alcance hacia el router objetivo.

- `ansible.cfg` - Configuración base de Ansible7. La UI ahora incluye una shell Telnet interactiva: ingresa IP, usuario y contraseña, presiona **Conectar** y podrás enviar comandos en tiempo real. El puerto Telnet se asume en 23 y ya no es configurable desde la interfaz.

- `inventory/` - Inventarios para diferentes modos

- `group_vars/` - Variables de configuración por grupo## Próximos pasos

- `k8s/router-admin-deployment.yaml.j2` - Manifiestos Kubernetes

- `scripts/start-offline-demo.sh` - Script automatizado de demo- Añade roles adicionales (logging, monitoreo, etc.) en `roles/`.

- `OFFLINE_DEMO.md` - Documentación específica del modo offline- Completa las variables `kubectl_download_sha256` para validar integridad.

- Integra este proceso con Packer o tu pipeline CI para regenerar imágenes cuando cambien los roles.

## 🎉 Resultado Final

## Solución de problemas rápida

Un laboratorio completo y autónomo que incluye:

### SSH no responde en `localhost:2222`

✅ **VM Ubuntu** con stack completo (Docker + k3s)  - Asegúrate de que QEMU se inició con `hostfwd=tcp::2222-:22` (ver sección 6 y 11).

✅ **Router Admin UI** con HTTPS y terminal Telnet  - Comprueba que regeneraste `cloud-init/ubuntu/seed.iso` tras modificar `user-data`; de lo contrario, la clave pública anterior seguirá vigente.

✅ **Red interna persistente** que sobrevive reinicios  - Ejecuta `ssh -vvv -p 2222 ubuntu@localhost` para ver el detalle del handshake. Si obtienes `Permission denied (publickey)`, verifica que `inventory/ubuntu_cloud.ini` apunte a la llave privada correcta.

✅ **Modo offline** para presentaciones sin internet  

✅ **Integración GNS3** para routers reales  ### El puente o el tap desaparecen tras reiniciar el host

✅ **Automatización completa** con scripts y Ansible  - Vuelve a aplicar `ansible-playbook playbooks/configure_host_network.yml -i inventory/host.ini --ask-become-pass`.

- Revisa el estado del servicio y sus logs:

**¡Perfecto para demos, laboratorios y presentaciones técnicas!** 🚀  ```bash

  systemctl status routerlab-network

---  journalctl -u routerlab-network -n 50

  ```

## 📖 Contexto del Desarrollo- Si el tap aparece con propietario `root`, edita `/etc/default/routerlab-network` y ajusta `TAP_OWNER`, luego reejecuta el playbook.



Esta documentación reproduce el flujo completo desarrollado durante una sesión de trabajo donde se:### Netplan falla con `Cannot find unique matching interface for ens3`

- Ejecuta `ansible-playbook playbooks/provision_ubuntu_cloud.yml` para que el rol `networking` elimine la plantilla de cloud-init antigua (`50-cloud-init.yaml`) y regenere `60-router-admin.yaml` con permisos 0600.

1. **Solucionó conectividad SSH** y problemas de interfaces persistentes- Asegúrate de haber arrancado la VM con MACs estáticas (`52:54:00:aa:bb:01/02`) como se describe en la sección 11; si cambian, vuelve a crear la VM o ajusta las MAC en la línea de QEMU/virt-manager.

2. **Configuró k3s y Kubernetes** con roles automatizados de Ansible  - Tras aplicar el playbook, confirma la configuración con `ssh -p 2222 ubuntu@localhost -- sudo netplan apply` y `ip -4 addr` (deberías ver `ens3` con `192.168.77.10/24` y `ens4` por DHCP).

3. **Desarrolló Router Admin UI** completa con proxy Telnet y WebSockets

4. **Implementó HTTPS** con certificados TLS autofirmados y Traefik ingress### La web de Router Admin no carga

5. **Creó modo offline** para presentaciones sin dependencias de red externa- Comprueba que los pods e ingress estén `Running`:

6. **Automatizó todo** con scripts y playbooks para reproducibilidad total  ```bash

  ssh -p 2222 ubuntu@localhost -- kubectl get pods,svc,ingress -n router-admin

El sistema resultante es completamente funcional, robusto y listo para uso en producción o demos técnicas.  ```
- Desde el host físico, valida la resolución de nombres: `getent hosts routerlab.local`.
- Si ves pods en estado `CrashLoopBackOff`, vuelve a importar la imagen Docker con `ansible-playbook playbooks/provision_ubuntu_cloud.yml --tags router_admin_app` o limpia el namespace (ver sección 11).
- Si reinstalas k3s (`k3s-uninstall.sh`), recuerda reejecutar `ansible-playbook playbooks/provision_ubuntu_cloud.yml --tags kubernetes_tools,router_admin_app` para reconstruir el clúster y desplegar la aplicación.
