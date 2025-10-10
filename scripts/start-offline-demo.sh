#!/usr/bin/env bash
# Script para demostración offline - VM completamente autónoma
set -euo pipefail

echo "=== Iniciando demostración offline de Router Lab ==="

# Variables
VM_IMAGE="/home/os/Documents/vm_ansible/noble-server-cloudimg-amd64.img"
SEED_ISO="/home/os/Documents/vm_ansible/cloud-init/ubuntu/seed.iso"
BRIDGE_NAME="br-ext"
TAP_NAME="tap-ubuntu"

# Verificar que los archivos existen
if [[ ! -f "$VM_IMAGE" ]]; then
    echo "Error: No se encuentra la imagen de VM en $VM_IMAGE"
    exit 1
fi

if [[ ! -f "$SEED_ISO" ]]; then
    echo "Error: No se encuentra seed.iso en $SEED_ISO"
    exit 1
fi

# Verificar que el puente existe (debería estar creado por el servicio systemd)
if ! ip link show "$BRIDGE_NAME" >/dev/null 2>&1; then
    echo "Error: El puente $BRIDGE_NAME no existe. ¿Está ejecutándose routerlab-network.service?"
    exit 1
fi

echo "✓ Puente $BRIDGE_NAME está disponible"

# Matar cualquier VM existente con el mismo nombre
if pgrep -f "ubuntu-ansible" >/dev/null; then
    echo "Deteniendo VM existente..."
    pkill -f "ubuntu-ansible" || true
    sleep 2
fi

echo "✓ Limpieza completada"

# Iniciar VM con configuración offline (solo tap, sin NAT externo)
echo "Iniciando VM en modo offline..."

qemu-system-x86_64 \
  -enable-kvm \
  -daemonize \
  -name ubuntu-ansible \
  -m 4096 \
  -smp 2 \
  -drive file="$VM_IMAGE",if=virtio,format=qcow2 \
  -drive file="$SEED_ISO",if=virtio,format=raw \
  -netdev tap,id=vmnic0,ifname="$TAP_NAME",script=no,downscript=no \
  -device virtio-net-pci,netdev=vmnic0,mac=52:54:00:aa:bb:01 \
  -netdev user,id=vmnic1,hostfwd=tcp::2222-:22,restrict=y \
  -device virtio-net-pci,netdev=vmnic1,mac=52:54:00:aa:bb:02 \
  -display none

echo "✓ VM iniciada"

# Esperar a que la VM esté disponible
echo "Esperando conectividad SSH..."
for i in {1..30}; do
    if ssh -i /home/os/.ssh/id_ed25519 -o ConnectTimeout=2 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost 'echo "VM ready"' >/dev/null 2>&1; then
        echo "✓ SSH disponible"
        break
    fi
    echo "  Intento $i/30..."
    sleep 2
done

# Verificar conectividad interna
echo "Verificando red interna..."
if ssh -i /home/os/.ssh/id_ed25519 -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 ubuntu@localhost 'ping -c 1 192.168.77.1' >/dev/null 2>&1; then
    echo "✓ Conectividad interna funcionando"
else
    echo "⚠ Problema con conectividad interna"
fi

echo ""
echo "=== Estado del laboratorio ==="
echo "• VM Ubuntu: ejecutándose (SSH: puerto 2222)"
echo "• Red interna: 192.168.77.0/24"
echo "• Puente host: br-ext (192.168.77.1)"
echo "• VM IP: 192.168.77.10"
echo "• Router Admin UI: https://routerlab.local (requiere /etc/hosts)"
echo ""
echo "Comandos útiles:"
echo "• Conectar SSH: ssh -i ~/.ssh/id_ed25519 -p 2222 ubuntu@localhost"
echo "• Ver servicios VM: ssh -p 2222 ubuntu@localhost 'kubectl get pods -A'"
echo "• Detener VM: pkill -f ubuntu-ansible"
echo ""
echo "¡Demostración lista para presentar sin conectividad externa!"
echo ""
echo "Próximos pasos:"
echo "1. Abrir navegador en: https://routerlab.local"
echo "2. Configurar router GNS3 en IP: 192.168.77.4"
echo "3. Conectar desde Router Admin UI usando Telnet puerto 23"
echo ""
echo "📖 Consulta OFFLINE_DEMO.md para documentación completa"