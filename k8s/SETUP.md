# Setup: 4all Backend en k3s

## Requisitos previos

- `kubectl` configurado apuntando al cluster k3s desde `panda@192.168.1.46`
- Acceso a `ghcr.io` (GitHub Container Registry)
- DNS `api.pandauniverse.es` accesible desde el cluster
- El secret TLS `pandauniverse-wildcard-tls` ya existe en namespace `default` ✅
- Traefik ya instalado en el cluster ✅

---

## Paso 1 — Aplicar el namespace

```bash
kubectl apply -f k8s/namespace.yml
# Verificar:
kubectl get namespace 4all
```

---

## Paso 2 — Crear el Secret con valores reales

**Nunca subas este fichero a Git.** Crea el secret directamente con kubectl:

```bash
kubectl create secret generic 4all-backend-secret \
  --namespace=4all \
  --from-literal=DATABASE_URL='postgresql://postgres:TU_PASSWORD@192.168.1.47:5432/postgres' \
  --from-literal=JWT_SECRET='tu_jwt_secret_muy_largo_y_aleatorio' \
  --from-literal=JWT_EXPIRES_IN='7d' \
  --from-literal=CORS_ORIGIN='*'
```

> Puedes obtener los valores reales del `.env` que hay en el servidor .47:
> ```bash
> ssh panda@192.168.1.47 cat /home/panda/4all/.env
> ```

Verifica que se creó:
```bash
kubectl get secret 4all-backend-secret -n 4all
```

El fichero `k8s/secret.yml` incluido en el repo es solo una **plantilla** con la estructura, sin valores reales.

---

## Paso 3 — (Solo si ghcr.io es privado) Configurar imagePullSecret

Si el paquete de GitHub Container Registry es **privado**, k3s necesita credenciales para bajar la imagen.

### 3a. Crear un Personal Access Token en GitHub

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Crea un token con permiso `read:packages`
3. Guárdalo en una variable: `export GHCR_PAT=ghp_xxxxxxxxxxxx`

### 3b. Crear el secret en Kubernetes

```bash
kubectl create secret docker-registry ghcr-secret \
  --namespace=4all \
  --docker-server=ghcr.io \
  --docker-username=josefornesjimenez \
  --docker-password=$GHCR_PAT
```

### 3c. Activarlo en el Deployment

Descomenta las líneas `imagePullSecrets` en `k8s/deployment.yml`:

```yaml
imagePullSecrets:
  - name: ghcr-secret
```

Y vuelve a aplicar el deployment:

```bash
kubectl apply -f k8s/deployment.yml
```

---

## Paso 4 — Aplicar Deployment y Service

```bash
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
```

Verificar que los pods arrancan:

```bash
# Estado de los pods (espera a que sea 'Running')
kubectl get pods -n 4all -w

# Logs del pod
kubectl logs -n 4all -l app=4all-backend --tail=50 -f

# Describir el pod si hay errores
kubectl describe pod -n 4all -l app=4all-backend
```

Verificar el health endpoint desde dentro del cluster:

```bash
# Obtener el nombre del pod
POD=$(kubectl get pod -n 4all -l app=4all-backend -o jsonpath='{.items[0].metadata.name}')

# Ejecutar curl dentro del pod
kubectl exec -n 4all $POD -- curl -s http://localhost:3008/health
# Respuesta esperada: {"status":"ok","timestamp":"..."}
```

---

## Paso 5 — Configurar los Secrets en GitHub Actions

Ve al repo en GitHub → Settings → Secrets and variables → Actions → New repository secret

| Secret            | Valor                                   |
|-------------------|-----------------------------------------|
| `SERVER_HOST`     | `192.168.1.46`                          |
| `SERVER_USER`     | `panda`                                 |
| `SERVER_SSH_KEY`  | Clave privada SSH (`~/.ssh/id_rsa` de tu máquina local o CI key) |

> `GITHUB_TOKEN` es **automático**, GitHub lo inyecta en cada workflow — no hace falta crearlo.

### Verificar que el usuario panda puede ejecutar kubectl en .46

```bash
ssh panda@192.168.1.46 kubectl get pods -n 4all
```

---

## Paso 6 — Aplicar el IngressRoute (cuando estés listo para el tráfico)

> ⚠️ Haz esto SOLO después de verificar que los pods están Running y de actualizar el DNS.

```bash
# Primero comprueba si ya existe el middleware redirect-to-https
kubectl get middleware -n default | grep redirect-to-https

# Si ya existe, comenta el bloque Middleware en k8s/ingress.yml antes de aplicar
kubectl apply -f k8s/ingress.yml
```

Verificar que la ruta aparece en Traefik:

```bash
kubectl get ingressroute -n default | grep fourall-api-k8s
```

---

## Paso 7 — Cambiar el DNS en Cloudflare

1. Entra en el panel de Cloudflare → `pandauniverse.es` → DNS
2. Busca el registro de `api` (tipo A o CNAME)
3. Cambia la IP/destino de `192.168.1.47` → `192.168.1.200` (IP de Traefik / MetalLB)
4. Asegúrate de que el proxy de Cloudflare (nube naranja) esté activado si quieres el WAF, o desactívalo si prefieres tráfico directo

Verificar que el cambio de DNS ha propagado:

```bash
# Desde fuera de la red local
curl -I https://api.pandauniverse.es/health
# Respuesta esperada: HTTP/2 200
```

---

## Comandos útiles de diagnóstico

```bash
# Estado general del namespace
kubectl get all -n 4all

# Ver eventos recientes (útil para errores de imagen pull, etc.)
kubectl get events -n 4all --sort-by='.lastTimestamp' | tail -20

# Reiniciar el deployment manualmente (lo que hace el CI/CD)
kubectl rollout restart deployment/4all-backend -n 4all
kubectl rollout status deployment/4all-backend -n 4all

# Ver el IngressRoute de Traefik
kubectl describe ingressroute fourall-api-k8s -n default

# Ver los logs de Traefik para debug de routing
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik --tail=50 | grep api.pandauniverse.es
```

---

## Flujo de CI/CD una vez configurado

```
Push a main (con cambios en backend/**)
    ↓
GitHub Actions — .github/workflows/deploy.yml
    ↓
Build Docker image desde ./backend/Dockerfile
    ↓
Push a ghcr.io/josefornesjimenez/4all-backend:latest
    ↓
SSH a panda@192.168.1.46
    ↓
kubectl rollout restart deployment/4all-backend -n 4all
    ↓
k3s baja la nueva imagen y reinicia el pod (zero-downtime rolling update)
```
