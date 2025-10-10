# Ubuntu cloud-init + Ansible workflow

 Esta guía muestra cómo preparar una VM Ubuntu con cloud-init y Ansible lista para operar de forma externa, manteniendo todo el software instalado (Docker, kubectl, k3s, utilerías) y habilitando tanto acceso SSH como consola sin contraseña. La VM puede enlazarse después a otras topologías —por ejemplo, a un router virtualizado en GNS3— mediante un puente de red en el host.

## 1. Requisitos e instalación de utilidades

```bash
sudo apt-get update
sudo apt-get install -y cloud-image-utils qemu-system-x86 qemu-utils
```

> `cloud-image-utils` instala `cloud-localds`, necesario para crear el ISO de cloud-init.

Confirma que tienes un par de llaves SSH (aquí se asume `~/.ssh/id_ed25519`).

## 2. Preparar cloud-init

1. Edita `cloud-init/ubuntu/user-data` y coloca tu llave pública en `ssh_authorized_keys`.
2. Ajusta hostname, paquetes u opciones según necesites.
3. Verifica en `inventory/ubuntu_cloud.ini` que la ruta a tu llave privada sea correcta (`/home/<usuario>/.ssh/id_ed25519`).

## 3. Descargar la imagen cloud de Ubuntu

```bash
curl -LO https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
```

## 4. Generar el seed ISO para cloud-init

```bash
cloud-localds cloud-init/ubuntu/seed.iso cloud-init/ubuntu/user-data cloud-init/ubuntu/meta-data
```

> **Importante:** si editas `cloud-init/ubuntu/user-data` más adelante (por ejemplo, para cambiar tu llave pública o instalar paquetes extra), vuelve a ejecutar `cloud-localds` antes del siguiente arranque. El archivo `seed.iso` no se actualiza por sí mismo.

## 5. (Opcional) Ampliar el disco antes del primer arranque

```bash
qemu-img resize noble-server-cloudimg-amd64.img 20G
```

## 6. Arrancar la VM con QEMU/KVM (modo demonio)

```bash
qemu-system-x86_64 \
  -enable-kvm \
  -daemonize \
  -name ubuntu-ansible \
  -m 4096 \
  -smp 2 \
  -drive file=/home/os/Documents/vm_ansible/noble-server-cloudimg-amd64.img,if=virtio,format=qcow2 \
  -drive file=/home/os/Documents/vm_ansible/cloud-init/ubuntu/seed.iso,if=virtio,format=raw \
  -netdev user,id=vmnic,hostfwd=tcp::2222-:22 \
  -device virtio-net-pci,netdev=vmnic \
  -display none
```

El parámetro `hostfwd=tcp::2222-:22` es clave: sin él no habrá puerto 2222 escuchando en tu host y, por ende, el SSH fallará.

Comprueba que el proceso quedó activo:

```bash
pgrep -af qemu-system
```

### Detener la VM

Cuando necesites finalizar la VM que quedó en segundo plano, envía una señal `SIGTERM` al proceso de QEMU identificado por el nombre `ubuntu-ansible`:

```bash
pkill -f "name ubuntu-ansible"
```

Después confirma que ya no hay procesos activos:

```bash
pgrep -af qemu-system
```

## 7. Probar acceso SSH

```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost uname -a
```

> Consolas VNC/telnet entran automáticamente como `ubuntu` (sin contraseña). Para SSH, usuario `ubuntu` y contraseña `ubuntu`; la clave pública sigue disponible.

## 8. Ejecutar Ansible

El archivo `ansible.cfg` ya apunta a `inventory/ubuntu_cloud.ini` y a `roles/`.

```bash
ansible-playbook --syntax-check playbooks/provision_ubuntu_cloud.yml
ansible-playbook playbooks/provision_ubuntu_cloud.yml
```

Si necesitas un dry-run previo:

```bash
ansible-playbook -C playbooks/provision_ubuntu_cloud.yml
```

Para aplicar únicamente un rol específico puedes usar tags:

```bash
ansible-playbook playbooks/provision_ubuntu_cloud.yml --tags networking
ansible-playbook playbooks/provision_ubuntu_cloud.yml --tags kubernetes_tools
ansible-playbook playbooks/provision_ubuntu_cloud.yml --tags router_admin_app
```

## 9. Verificar versiones dentro de la VM

```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost docker --version
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost kubectl version --client --output=yaml
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost k3s --version
```

## 10. Apagar y exportar la imagen

Apaga de forma limpia:

```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost sudo shutdown now
```

> Si modificas `cloud-init/ubuntu/user-data`, antes del apagado ejecuta `ssh -o ... ubuntu@localhost sudo cloud-init clean` y luego apaga. En el siguiente arranque, cloud-init aplicará la configuración nueva.

Convierte a RAW si necesitas compatibilidad con otra plataforma:

```bash
qemu-img convert -f qcow2 -O raw noble-server-cloudimg-amd64.img ubuntu-gns3.raw
```

Si prefieres mantener el formato QCOW2 pero más compacto (recomendado):

```bash
qemu-img convert -f qcow2 -O qcow2 -c noble-server-cloudimg-amd64.img ubuntu-gns3.qcow2
```
> Resultado típico: ~1 GB en disco por una VM lógica de 20 GB. Verifica con `qemu-img info ubuntu-gns3.qcow2`.

## 11. Conectar la VM externa a un router virtualizado

1. **Crea un puente/tap en el host** (ejemplo con `iproute2`):
   ```bash
   sudo ip link add br-ext type bridge
   sudo ip link set br-ext up
   sudo ip tuntap add dev tap-ubuntu mode tap user $USER
   sudo ip link set tap-ubuntu up
   sudo ip link set tap-ubuntu master br-ext
   ```
2. **Arranca la VM enlazada al tap** (manteniendo el puerto 2222 disponible vía NAT):
   ```bash
   qemu-system-x86_64 \
     -enable-kvm \
     -daemonize \
     -name ubuntu-ansible \
     -m 4096 \
     -smp 2 \
     -drive file=/home/os/Documents/vm_ansible/noble-server-cloudimg-amd64.img,if=virtio,format=qcow2 \
     -drive file=/home/os/Documents/vm_ansible/cloud-init/ubuntu/seed.iso,if=virtio,format=raw \
     -netdev tap,id=vmnic0,ifname=tap-ubuntu,script=no,downscript=no \
     -device virtio-net-pci,netdev=vmnic0,mac=52:54:00:aa:bb:01 \
     -netdev user,id=vmnic1,hostfwd=tcp::2222-:22 \
     -device virtio-net-pci,netdev=vmnic1,mac=52:54:00:aa:bb:02 \
     -display none
   ```
   Esto crea dos interfaces dentro de la VM: `ens3` (hacia el laboratorio mediante `tap-ubuntu`) y `ens4` (NAT para salida a Internet y SSH).
3. **Enlaza tu laboratorio externo**: añade el puente `br-ext` en la nube/bridge de tu plataforma de red (por ejemplo, en GNS3 usa un nodo *Cloud* conectado a `br-ext`) y vincúlalo al puerto del router virtualizado.
4. Desde la VM, podrás alcanzar servicios expuestos por el router (SSH, telnet, etc.) usando la IP asignada dentro de la red de laboratorio.
    5. La provisión de Ansible añade automáticamente la IP secundaria `192.168.77.10/24` (ajustable con `router_admin_secondary_ip`) sobre la interfaz principal. Asigna una IP a tu puente en el host, por ejemplo:
       ```bash
       sudo ip addr add 192.168.77.1/24 dev br-ext
       ```
       Luego agrega la resolución local con un dominio corto:
       ```bash
       printf "192.168.77.10 routerlab.local\n" | sudo tee -a /etc/hosts
       ```
       A partir de ese momento podrás abrir `http://routerlab.local` desde el host físico.

### Automatizar el puente del host

Los comandos anteriores añaden el puente y la IP en el host solo por la sesión actual. Para que el puente `br-ext`, el tap `tap-ubuntu` y la dirección `192.168.77.1/24` sobrevivan a reinicios del host (aunque la VM esté apagada), ejecuta el nuevo playbook local:

```bash
ansible-playbook playbooks/configure_host_network.yml -i inventory/host.ini --ask-become-pass
```

El playbook instala un servicio `routerlab-network.service` que, en cada arranque, asegura:

- La creación y activación del puente `br-ext`.
- La dirección estática `192.168.77.1/24` asociada al puente.
- El tap `tap-ubuntu` unido al puente (con el propietario del usuario que ejecuta el playbook).
- (Opcional) el reactivado de `net.ipv4.ip_forward` si lo habilitas con la variable `routerlab_enable_ip_forward`.

Puedes ajustar valores en `/etc/default/routerlab-network` (creado automáticamente) y volver a lanzar el playbook para aplicarlos.

Tras un reinicio del host, confirma que el servicio quedó activo:

```bash
sudo systemctl status routerlab-network
```

Si detectas que `br-ext` o `tap-ubuntu` no aparecen, reejecuta manualmente el script para obtener mensajes de log detallados:

```bash
sudo /usr/local/lib/routerlab-network/setup-routerlab-network.sh
```

### Poner todo en línea después de un reinicio del host

1. **Verifica el servicio del puente** (`routerlab-network.service`):
  ```bash
  sudo systemctl status routerlab-network
  ```
  Si no está activo, arráncalo y revisa que `br-ext` y `tap-ubuntu` queden en estado `UP`:
  ```bash
  sudo systemctl start routerlab-network
  ip addr show br-ext
  ip link show tap-ubuntu
  ```
2. **Arranca la VM con las dos interfaces** (tap hacia el laboratorio y NAT para acceso local por SSH):
  ```bash
  qemu-system-x86_64 \
    -enable-kvm \
    -daemonize \
    -name ubuntu-ansible \
    -m 4096 \
    -smp 2 \
    -drive file=/home/os/Documents/vm_ansible/noble-server-cloudimg-amd64.img,if=virtio,format=qcow2 \
    -drive file=/home/os/Documents/vm_ansible/cloud-init/ubuntu/seed.iso,if=virtio,format=raw \
    -netdev tap,id=vmnic0,ifname=tap-ubuntu,script=no,downscript=no \
    -device virtio-net-pci,netdev=vmnic0,mac=52:54:00:aa:bb:01 \
    -netdev user,id=vmnic1,hostfwd=tcp::2222-:22 \
    -device virtio-net-pci,netdev=vmnic1,mac=52:54:00:aa:bb:02 \
    -serial telnet:127.0.0.1:6000,server,nowait \
    -display none
  ```
  (La interfaz `ens3` dentro de la VM se une al laboratorio mediante `br-ext`, mientras que `ens4` conserva el acceso NAT para el puerto 2222.)
3. **Confirma el acceso SSH y la dirección secundaria**:
  ```bash
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost ip -4 addr
  ```
  Debes ver `192.168.77.10/24` sobre `ens3`. Si no aparece, reejecuta el playbook de provisión para aplicar la plantilla de Netplan:
  ```bash
  ansible-playbook playbooks/provision_ubuntu_cloud.yml
  ```
4. **Comprueba el despliegue de Router Admin** una vez que Kubernetes esté arriba:
  ```bash
  ssh -p 2222 ubuntu@localhost -- sudo kubectl get pods -n router-admin
  ```
  Con la VM en línea y `routerlab.local` resolviendo a `192.168.77.10`, la interfaz web quedará disponible.

Si necesitas limpiar un despliegue previo antes de reprovisionar:

```bash
ssh -p 2222 ubuntu@localhost -- kubectl delete namespace router-admin --ignore-not-found=true
```

## 12. Tip extra: revisar espacio en disco tras ampliar

```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost df -h /
```

## 13. Desplegar la Router Admin UI en el clúster

1. Instala dependencias y prueba en modo local (opcional):
  ```bash
  cd apps/router-admin
  npm install
  npm start
  ```
  La aplicación estará disponible en `http://localhost:3000`. Los campos permiten especificar IP, puerto, usuario, contraseña y un comando opcional; toda la lógica se ejecuta con Express y sockets Telnet nativos, sin dependencias externas.

2. Construye la imagen para el clúster (en la VM):
  ```bash
  cd apps/router-admin
  docker build -t router-admin:local .
  ```

3. Carga la imagen en k3s (usa containerd interno):
  ```bash
  docker save router-admin:local -o router-admin.tar
  sudo k3s ctr images import router-admin.tar
  ```

4. Exporta la configuración de kubectl para k3s (solo si aún no lo haces):
  ```bash
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  ```

5. Despliega los manifiestos (Ansible los deja renderizados en `/opt/router-admin/router-admin-deployment.yaml` dentro de la VM):
  ```bash
  kubectl apply -f /opt/router-admin/router-admin-deployment.yaml
  ```

6. Una vez aplicado el playbook, Traefik expone automáticamente la interfaz en `http://routerlab.local` (ajusta el dominio mediante `router_admin_hostname`). Verifica que tu host físico resuelva ese nombre contra la IP asignada y que la VM tenga alcance hacia el router objetivo.
7. La UI ahora incluye una shell Telnet interactiva: ingresa IP, usuario y contraseña, presiona **Conectar** y podrás enviar comandos en tiempo real. El puerto Telnet se asume en 23 y ya no es configurable desde la interfaz.

## Próximos pasos

- Añade roles adicionales (logging, monitoreo, etc.) en `roles/`.
- Completa las variables `kubectl_download_sha256` para validar integridad.
- Integra este proceso con Packer o tu pipeline CI para regenerar imágenes cuando cambien los roles.

## Solución de problemas rápida

### SSH no responde en `localhost:2222`
- Asegúrate de que QEMU se inició con `hostfwd=tcp::2222-:22` (ver sección 6 y 11).
- Comprueba que regeneraste `cloud-init/ubuntu/seed.iso` tras modificar `user-data`; de lo contrario, la clave pública anterior seguirá vigente.
- Ejecuta `ssh -vvv -p 2222 ubuntu@localhost` para ver el detalle del handshake. Si obtienes `Permission denied (publickey)`, verifica que `inventory/ubuntu_cloud.ini` apunte a la llave privada correcta.

### El puente o el tap desaparecen tras reiniciar el host
- Vuelve a aplicar `ansible-playbook playbooks/configure_host_network.yml -i inventory/host.ini --ask-become-pass`.
- Revisa el estado del servicio y sus logs:
  ```bash
  systemctl status routerlab-network
  journalctl -u routerlab-network -n 50
  ```
- Si el tap aparece con propietario `root`, edita `/etc/default/routerlab-network` y ajusta `TAP_OWNER`, luego reejecuta el playbook.

### Netplan falla con `Cannot find unique matching interface for ens3`
- Ejecuta `ansible-playbook playbooks/provision_ubuntu_cloud.yml` para que el rol `networking` elimine la plantilla de cloud-init antigua (`50-cloud-init.yaml`) y regenere `60-router-admin.yaml` con permisos 0600.
- Asegúrate de haber arrancado la VM con MACs estáticas (`52:54:00:aa:bb:01/02`) como se describe en la sección 11; si cambian, vuelve a crear la VM o ajusta las MAC en la línea de QEMU/virt-manager.
- Tras aplicar el playbook, confirma la configuración con `ssh -p 2222 ubuntu@localhost -- sudo netplan apply` y `ip -4 addr` (deberías ver `ens3` con `192.168.77.10/24` y `ens4` por DHCP).

### La web de Router Admin no carga
- Comprueba que los pods e ingress estén `Running`:
  ```bash
  ssh -p 2222 ubuntu@localhost -- kubectl get pods,svc,ingress -n router-admin
  ```
- Desde el host físico, valida la resolución de nombres: `getent hosts routerlab.local`.
- Si ves pods en estado `CrashLoopBackOff`, vuelve a importar la imagen Docker con `ansible-playbook playbooks/provision_ubuntu_cloud.yml --tags router_admin_app` o limpia el namespace (ver sección 11).
- Si reinstalas k3s (`k3s-uninstall.sh`), recuerda reejecutar `ansible-playbook playbooks/provision_ubuntu_cloud.yml --tags kubernetes_tools,router_admin_app` para reconstruir el clúster y desplegar la aplicación.
