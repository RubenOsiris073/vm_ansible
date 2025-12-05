# Configuraciones de Grafana Extraídas de la VM

## Archivos Generados

### Configuraciones Limpias (Listas para usar)
- `grafana-deployment-clean.yaml` - Deployment principal de Grafana
- `grafana-service-clean.yaml` - Servicio NodePort en puerto 30093
- `grafana-ingress-clean.yaml` - Ingress HTTPS con Traefik

### Configuraciones Originales (Extraídas de VM)
- `grafana-deployment.yaml` - Con metadata completo de Kubernetes
- `grafana-service.yaml` - Servicio original
- `grafana-ingress.yaml` - Ingress original
- `grafana-dashboards.yaml` - ConfigMap con certificados TLS y dashboards (6843 líneas)

### Configuraciones Existentes en Proyecto
- `grafana-datasources.yaml` - Configuración de Prometheus como datasource
- `grafana-dashboard-providers.yaml` - Configuración de proveedores de dashboards

## Características Principales

### Autenticación
- Usuario: `admin`
- Contraseña: `admin`
- Sin registro de usuarios (`GF_USERS_ALLOW_SIGN_UP: false`)

### HTTPS
- URL: `https://grafana.routerlab.local`
- Puerto NodePort: 30093
- Certificados TLS autofirmados en secret `grafana-tls`

### Dashboards
- 18 dashboards personalizados incluidos
- Provisionados automáticamente via ConfigMap
- Incluye monitoreo de cluster, aplicaciones y hardware

### Datasources
- Prometheus configurado como fuente principal
- URL interna: `http://prometheus-service:9090`
- Acceso via proxy

## Para Aplicar Configuraciones

```bash
# Aplicar configuraciones limpias
kubectl apply -f k8s/grafana-deployment-clean.yaml
kubectl apply -f k8s/grafana-service-clean.yaml
kubectl apply -f k8s/grafana-ingress-clean.yaml

# Aplicar datasources y dashboards
kubectl apply -f k8s/grafana-datasources.yaml
kubectl apply -f k8s/grafana-dashboard-providers.yaml
```

## Notas Importantes

1. **Certificados TLS**: Están embebidos en `grafana-dashboards.yaml` (líneas enormes)
2. **Volúmenes**: Configurados para datasources, dashboards y certificados
3. **Política de Imagen**: Cambiada a `IfNotPresent` para evitar pull failures
4. **Namespace**: Todo en `kube-system`