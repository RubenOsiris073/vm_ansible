
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10
```

- **Ejecutar comandos remotos** (ejemplo con kubectl):



```bash

# Copiar código actualizado al contenedor en ejecución
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl cp /tmp/app.js \$(kubectl get pod -l app=devices-app -o jsonpath='{.items[0].metadata.name}'):/app/public/app.js"
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl cp /tmp/index.html \$(kubectl get pod -l app=devices-app -o jsonpath='{.items[0].metadata.name}'):/app/public/index.html"


# Reconstruir imagen Docker con código actualizado
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "cd /tmp && sudo docker build -t devices-app:updated ."
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "sudo docker save devices-app:updated | sudo k3s ctr images import -"


# Actualizar deployment con nueva imagen
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl set image deployment/devices-app devices-app=devices-app:updated"
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl rollout restart deployment/devices-app"

ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl get pods"
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl delete pod -l app=devices-app"

# Ver pods de Traefik
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl get pods -n kube-system | grep traefik"

# Ver pods de Grafana
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl get pods -n kube-system | grep grafana"

# Verificar stack de monitoreo completo
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl get pods -n kube-system | grep -E 'prometheus|grafana|node-exporter|kube-state'"

# Ver contenido de tablas de PostgreSQL
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl exec deployment/postgres -- psql -U admin -d routerlab -c '\dt'"
ssh -i ~/.ssh/id_ed25519 ubuntu@192.168.77.10 "kubectl exec deployment/postgres -- psql -U admin -d routerlab -c 'SELECT * FROM devices;'"
```

- **Usar k3s/kubectl** (si `kubectl` está disponible):

```bash
# Ver nodos
kubectl get nodes

# Ver todos los pods en todos los namespaces
kubectl get pods -A

# Ver pods en namespace default
kubectl get pods -n default

# Ver servicios (todas las namespaces)
kubectl get svc -A

# Describir un pod específico
kubectl describe pod <POD_NAME> -n <NAMESPACE>

# Ver logs de un pod
kubectl logs <POD_NAME> -n <NAMESPACE>

# Ejecutar un shell dentro de un pod
kubectl exec -it <POD_NAME> -n <NAMESPACE> -- /bin/sh
```

- **Comandos específicos para k3s (containerd)**:

```bash
# Listar imágenes que k3s tiene en containerd (útil para debugging de imagenes)
sudo k3s ctr images list

# Importar una imagen Docker local a k3s
sudo docker save my-image:tag | sudo k3s ctr images import -
```

