# Documentación de Infraestructura — sye.mobilsoft.co
> Documento generado el 01/04/2026. Confidencial — no compartir.

---

## 1. Datos del Servidor VPS

| Campo | Valor |
|---|---|
| Sistema Operativo | Ubuntu 24.04.4 LTS |
| IP Pública | `179.33.214.86` |
| IP Interna (LAN) | `192.168.1.10` |
| Usuario SSH | `administrator` |
| Contraseña SSH | `[AGREGAR AQUÍ]` |
| Hostname | `serverdell` |
| Acceso | `ssh administrator@179.33.214.86` |

> ⚠️ El servidor está detrás de un router/NAT. La IP pública `179.33.214.86` pertenece al router, no al servidor directamente. Por eso se usa Cloudflare Tunnel para exponer los servicios.

---

## 2. Dominio y DNS

| Campo | Valor |
|---|---|
| Dominio principal | `mobilsoft.co` |
| Subdominio del front | `sye.mobilsoft.co` |
| Registrador | Hostinger |
| Gestión DNS | Cloudflare (Free) |
| Nameservers activos | `eric.ns.cloudflare.com` / `iris.ns.cloudflare.com` |
| Cuenta Cloudflare | `Proyectosmobilsoft@g...` |
| Contraseña Cloudflare | `[AGREGAR AQUÍ]` |

### Registros DNS en Cloudflare
| Tipo | Nombre | Contenido |
|---|---|---|
| A | mobilsoft.co | 88.223.87.42 (Hostinger) |
| A | demo | 45.13.134.25 |
| A | ftp | 76.13.75.72 |
| CNAME | www | www.mobilsoft.co |
| CNAME | sye | Apunta al Cloudflare Tunnel (automático) |
| MX | mobilsoft.co | mx1.titan.email / mx2.titan.email |

---

## 3. Cloudflare Tunnel

El túnel permite exponer el frontend al público sin necesidad de abrir puertos en el router.

| Campo | Valor |
|---|---|
| Nombre del túnel | `sye` |
| Tunnel ID | `3bc9e3e2-19d6-4366-8fa1-92420a9812b1` |
| Archivo de credenciales | `/etc/cloudflared/3bc9e3e2-19d6-4366-8fa1-92420a9812b1.json` |
| Archivo de configuración | `/etc/cloudflared/config.yml` |
| Servicio systemd | `cloudflared` |

### Contenido de /etc/cloudflared/config.yml
```yaml
tunnel: 3bc9e3e2-19d6-4366-8fa1-92420a9812b1
credentials-file: /etc/cloudflared/3bc9e3e2-19d6-4366-8fa1-92420a9812b1.json

ingress:
  - hostname: sye.mobilsoft.co
    service: http://localhost:3000
  - service: http_status:404
```

### Comandos útiles del túnel
```bash
# Ver estado del túnel
sudo systemctl status cloudflared

# Reiniciar el túnel
sudo systemctl restart cloudflared

# Ver logs del túnel
sudo journalctl -u cloudflared -f
```

---

## 4. Frontend — SYE Distribuciones

| Campo | Valor |
|---|---|
| Nombre del proyecto | `front-siesa-sye` |
| Ruta en el servidor | `/opt/services/pages-front/front-siesa-sye` |
| Framework | React + Vite + TypeScript |
| Puerto expuesto | `3000` (host) → `80` (contenedor) |
| URL pública | `https://sye.mobilsoft.co` |
| Contenedor Docker | `front-siesa-sye-frontend-1` |

### Archivos clave del proyecto
| Archivo | Descripción |
|---|---|
| `Dockerfile` | Build multistage: node:20-alpine → nginx:alpine |
| `nginx.conf` | Configuración Nginx del contenedor (SPA con try_files) |
| `docker-compose.yml` | Define el servicio frontend en puerto 3000 |
| `src/config/api.ts` | URL base del backend |

### Configuración del Backend en el Frontend
```
# Archivo: src/config/api.ts
URL de producción: https://softwareqa.dev/api
```

### Comandos útiles del frontend
```bash
# Ir a la carpeta del proyecto
cd /opt/services/pages-front/front-siesa-sye

# Reconstruir y levantar el contenedor (tras cambios en el código)
docker compose up -d --build

# Ver logs del contenedor
docker logs front-siesa-sye-frontend-1 -f

# Ver estado del contenedor
docker ps

# Detener el contenedor
docker compose down

# Reiniciar el contenedor
docker compose restart
```

---

## 5. Backend

| Campo | Valor |
|---|---|
| URL base | `https://softwareqa.dev/api` |
| Documentación API | `https://softwareqa.dev/api/docs` |
| Endpoint de login | `POST https://softwareqa.dev/api/auth/login` |
| Ubicación | Servidor separado con VPN |

---

## 6. Nginx del VPS

Nginx actúa como reverse proxy redirigiendo el tráfico del dominio al contenedor Docker.

| Campo | Valor |
|---|---|
| Versión | nginx/1.24.0 (Ubuntu) |
| Config del subdominio | `/etc/nginx/sites-available/sye.mobilsoft.co` |
| Enlace activo | `/etc/nginx/sites-enabled/sye.mobilsoft.co` |

### Contenido del Virtual Host
```nginx
server {
    listen 80;
    server_name sye.mobilsoft.co;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Comandos útiles de Nginx
```bash
# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx

# Ver estado de Nginx
sudo systemctl status nginx

# Ver logs de errores
sudo tail -f /var/log/nginx/error.log
```

---

## 7. Otros servicios corriendo en el servidor

El servidor también corre una instancia completa de **Supabase** y otros servicios:

| Servicio | Puerto | Contenedor |
|---|---|---|
| Supabase Studio | 54323 | supabase_studio |
| Supabase DB (Postgres) | 54322 | supabase_db |
| Supabase API (Kong) | 54321 | supabase_kong |
| Supabase Auth | — | supabase_auth |
| Portainer | 9443 / 9100 | portainer |
| MongoDB | 27017 | mongodb-server |
| PostgreSQL | 5433 | postgres-server |

---

## 8. Flujo completo del sistema

```
Usuario
  ↓
https://sye.mobilsoft.co
  ↓
Cloudflare (DNS + Tunnel)
  ↓
Servidor VPS 179.33.214.86 (interno: 192.168.1.10)
  ↓
Nginx (puerto 80) → proxy_pass
  ↓
Docker contenedor front-siesa-sye-frontend-1 (puerto 3000)
  ↓
React App (Vite build servido por Nginx interno)
  ↓
Llamadas al backend → https://softwareqa.dev/api
```

---

## 9. Pasos para actualizar el frontend

Cuando haya cambios en el código:

```bash
# 1. Conectarse al servidor
ssh administrator@179.33.214.86

# 2. Ir a la carpeta del proyecto
cd /opt/services/pages-front/front-siesa-sye

# 3. Bajar los últimos cambios del repositorio
git pull

# 4. Reconstruir y desplegar
docker compose up -d --build
```

---

## 10. Solución de problemas comunes

### El sitio no carga
```bash
# Verificar que el túnel esté activo
sudo systemctl status cloudflared

# Verificar que el contenedor esté corriendo
docker ps

# Verificar que Nginx esté corriendo
sudo systemctl status nginx

# Probar que el contenedor responde localmente
curl http://localhost:3000
```

### Error de terminal "unknown terminal type"
```bash
export TERM=xterm-256color
```

### Reconstruir el frontend saltando errores de TypeScript
```bash
# El Dockerfile usa npx vite build en vez de npm run build
# para evitar que los errores de tipos bloqueen el build
docker compose up -d --build
```

---

*Documento generado el 01/04/2026. Actualizar contraseñas y datos sensibles antes de archivar.*
