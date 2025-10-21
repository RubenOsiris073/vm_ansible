#!/bin/bash

# Script para habilitar RESTCONF en Cisco IOS-XE
# Configuración básica para router en GNS3

echo "Configurando RESTCONF en el router Cisco..."

# Intentar conexión vía Telnet (puerto 23)
expect << 'EOF'
set timeout 10

# Conectar por telnet
spawn telnet 192.168.77.4

expect {
    "Username:" {
        send "admin\r"
        exp_continue
    }
    "Password:" {
        send "cisco\r"
        exp_continue
    }
    ">" {
        send "enable\r"
        expect "Password:"
        send "cisco\r"
        expect "#"
    }
    "#" {
        # Ya estamos en modo privilegiado
    }
    timeout {
        puts "Timeout - no se pudo conectar"
        exit 1
    }
}

# Configurar RESTCONF
send "configure terminal\r"
expect "(config)#"

send "restconf\r"
expect "(config)#"

send "ip http server\r"
expect "(config)#"

send "ip http secure-server\r"
expect "(config)#"

send "ip http authentication local\r"
expect "(config)#"

send "username admin privilege 15 secret cisco\r"
expect "(config)#"

send "end\r"
expect "#"

send "write memory\r"
expect "#"

send "exit\r"
expect eof

puts "Configuración RESTCONF completada"
EOF