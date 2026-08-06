# Estado del desarrollo — Permisos, Maquinaria e Interfaz Contable

Documento de traspaso para continuar el trabajo en otra sesión/herramienta.
Refleja el estado **al 6 de agosto de 2026**.

---

## 1. Mapa del proyecto

| Ruta | Qué es |
|---|---|
| `C:\developments\mobilsoft\sye\FRONT` | React 18 + Vite + TypeScript + Tailwind. Rama `develop`. |
| `C:\developments\mobilsoft\sye\API` | Node + Express v5. Sin tests. `npm run dev` (nodemon, puerto 3010). |
| `C:\developments\mobilsoft\sye\FLUTTER` | App móvil del conductor. **No se tocó**, pero condiciona decisiones (ver §6). |

### Bases de datos (`API/src/db/db.js`)

| Pool | Env | Contenido |
|---|---|---|
| `getPool()` | `DB_*` | SIESA (`SUnoEE_DistriSYE_Real`). Requiere VPN. |
| `getPool2()` | `DB2_*` | **`sye-siesa`** — auth, permisos, maestros propios. Es la que se usa aquí. |
| `getPool3()` | `DB3_*` | `vehiman_sye` — inventario de maquinaria. Solo lectura. |

> Hay un MCP `sye-siesa` conectado a **BD2** para consultas directas.

### Entorno del front (`.env`)

```
ENV=local        # local → http://localhost:3010 | prod → https://apisye.mobilsoft.co
```
`vite.config.ts` resuelve `ENV` y lo inyecta como `VITE_APP_ENV` / `VITE_API_ORIGIN`.
**El `.env` debe guardarse en UTF-8**; en UTF-16 Vite no lo parsea y las variables
quedan sin cargar en silencio. Cambiar `ENV` exige reiniciar `npm run dev`.

---

## 2. Modelo de permisos

### Tablas (BD2)

- `auth_modulos` — `Codigo`, `Nombre`, `Grupo`, `Icono`, `Orden`, `Estado`.
- `auth_permisos` — `Codigo`, `Descripcion`, `ModuloId`, **`Tipo`** (`VISTA` / `ACCION` / `TAB` / `ESPECIAL`), `Etiqueta`, `Orden`.
- `auth_rol_permiso` — `RolId` + `PermisoId`.
- `auth_roles` — rol `1 = ADMINISTRADOR`.

### Cómo viajan los permisos

Los códigos se firman **dentro del JWT** en el login (`auth.service.js`).
Consecuencia crítica:

> **Todo permiso nuevo exige cerrar sesión y volver a entrar.** Con el token
> viejo el usuario recibe 403 aunque en BD ya tenga el permiso.

### Los tres puntos de cableado

1. **API** — `requirePermiso('CODIGO')` de `API/src/middlewares/auth.js`, siempre
   después de `validateBearerJWT`. **Es lo único que protege de verdad.**
2. **Ruta del front** — `<ProtectedRoute permiso={PERMISOS.X}>` en `App.tsx`.
3. **Menú y botones** — `permiso` en `config/navigation.ts` y
   `usePermiso().puede(...)` alrededor de cada botón.

`src/config/permisos.ts` es el espejo del catálogo: **71+4 códigos, sincronizado
1:1 con `auth_permisos`**. Si agregas un permiso en BD, agrégalo también ahí.

### Estado actual

- **75 permisos**, todos asignados a ADMINISTRADOR **salvo uno**.
- **`MODULO_CONDUCTOR` NO se asigna al admin, a propósito.** No es una capacidad
  sino un marcador de tipo de usuario: `rolTieneModuloConductor()` lo usa para
  mostrar Forma de pago y Maquinaria en el formulario. Dárselo al admin
  cambiaría el comportamiento de la UI sin darle ninguna facultad.
- **`/` (Dashboard) queda sin `ProtectedRoute`, a propósito.** `ProtectedRoute`
  redirige a `/` cuando falta un permiso; protegerlo con `VER_DASHBOARD` haría
  un **bucle infinito de redirección**. Para poder protegerlo hace falta antes
  una pantalla "sin acceso" que sirva de destino alternativo.

---

## 3. Módulos entregados en esta tanda

### 3.1 Relación de Conceptos
- Tabla `conceptos` (BD2), 17 registros precargados.
- API: `/api/maestros/conceptos` (CRUD). Front: `/maestro/relacion-conceptos`.
- Permisos: `VER_CONCEPTOS`, `CREAR/EDITAR/ELIMINAR_CONCEPTO`.

### 3.2 Maestro de Maquinaria (solo lectura)
- Datos en **BD3** (`vehiman_sye`), tablas `Maq_Equipos`, `Maq_Equipos_Categorias`,
  `Maq_Equipos_Estados`, `Maq_Marcas`.
- API: `GET /api/maestros/maquinaria` con búsqueda y paginación en servidor.
- **La consulta original de Vehiman se reescribió**: se eliminaron 4 JOIN que no
  aportaban columnas (dos de ellos 1:N, que inflaban 31 filas a 989 y obligaban a
  un `DISTINCT`), se quitó ese `DISTINCT` y se reemplazó la UDF escalar
  `dbo.TRIM()` por `LTRIM(RTRIM())` nativo. Equivalencia verificada con `EXCEPT`
  en ambos sentidos: **0 diferencias**.
- Aviso de datos: **`Maq_Equipos_Estados` tiene 0 filas**, por eso la columna
  Estado sale vacía. No es un bug del código.
- El `INNER JOIN` con categorías se conservó tal cual: **los equipos sin
  categoría no aparecen en el listado**.

### 3.3 Maquinaria múltiple por usuario
- Tabla **`auth_usuario_maquinaria`** (1:N con `auth_usuario`).
- `UNIQUE (usuario_id, maquinaria_cod)` y, sobre todo,
  **`CREATE UNIQUE INDEX ... ON (usuario_id) WHERE en_uso = 1`**: la BD garantiza
  como máximo una placa "En uso" por usuario.
- `ON DELETE CASCADE` desde `auth_usuario`.
- Las columnas planas `auth_usuario.maquinaria_cod/_placa/_categoria`
  **se conservan y el servicio las mantiene como espejo de la fila "en uso"**,
  para no romper a un consumidor que aún las lea (p. ej. Flutter).
- Reglas en `auth-secundario.service.js` (`normalizarMaquinarias`):
  deduplica por código, deja como mucho una `en_uso`, y si no se marcó ninguna
  promueve la primera.
- Contrato del `PUT`: **omitir `maquinarias` no toca nada; enviar `[]` borra todo.**

### 3.4 Interfaz Contable Vehículos (lo último entregado)
- Tabla **`interfaz_contable_vehiculos`** (BD2).
- Relaciona **cuenta contable ↔ placa de un usuario conductor**.
- `UNIQUE (usuario_id, maquinaria_cod)`: una sola cuenta por placa de cada usuario.
- El servicio **valida que la placa pertenezca al usuario** consultando
  `auth_usuario_maquinaria` antes de insertar (400 si no).
- **Decisión sobre el tipo de `cuenta_contable`:** el usuario pidió "campo
  numérico". Se almacena como `VARCHAR(20)` con
  `CHECK (cuenta_contable NOT LIKE '%[^0-9]%')` **para no perder los ceros a la
  izquierda** (`'00105050'` seguiría siendo válido). El input del formulario solo
  acepta dígitos. Si se prefiere un `BIGINT` real, hay que asumir la pérdida de
  ceros a la izquierda — **está pendiente de confirmación del usuario**.
- Permisos: `VER_/CREAR_/EDITAR_/ELIMINAR_INTERFAZ_CONTABLE`, todos en ADMINISTRADOR.

**Archivos del módulo:**

```
API/src/services/interfaz-contable.service.js
API/src/controllers/interfaz-contable.controller.js
API/src/routes/interfaz-contable.routes.js          → /api/maestros/interfaz-contable-vehiculos
API/scripts/interfaz_contable_vehiculos_bd2.sql
FRONT/src/api/interfazContable.ts
FRONT/src/components/maestros/InterfazContableModal.tsx
FRONT/src/pages/InterfazContableVehiculosPage.tsx   → /maestro/interfaz-contable-vehiculos
```

El formulario se alimenta de `GET /auth-secundario/conductores`, al que se le
añadió el array `maquinarias` para ofrecer solo las placas que el conductor
tiene realmente asignadas.

**Pruebas ejecutadas contra la API real (11/11 OK):** crear, duplicado→409,
placa ajena→400, cuenta no numérica→400, segunda placa del mismo usuario→201,
ceros a la izquierda preservados, búsqueda, 403 sin permiso (GET y DELETE),
eliminar, y borrado en cascada al eliminar el usuario (0 huérfanas).

---

## 4. Scripts SQL (todos idempotentes, `API/scripts/`)

| Archivo | Contenido |
|---|---|
| `conceptos_bd2.sql` | Tabla + 17 registros + permisos |
| `maquinaria_permisos_bd2.sql` | Permiso `VER_MAQUINARIA` |
| `auditoria_permisos_bd2.sql` | 12 módulos + 32 permisos + asignación masiva a admin |
| `usuario_maquinaria_bd2.sql` | `auth_usuario_maquinaria` + índice filtrado + migración |
| `interfaz_contable_vehiculos_bd2.sql` | Tabla + módulo + 4 permisos |

---

## 5. Verificación

```bash
# FRONT
cd C:\developments\mobilsoft\sye\FRONT
npx tsc --noEmit          # debe salir limpio
npx vite build            # verifica que los iconos de lucide resuelvan

# API (no hay tests; validar sintaxis y probar en vivo)
cd C:\developments\mobilsoft\sye\API
node --check src/app.js
```

**Antes de usar un icono de `lucide-react`**, comprobar que existe:
`ls node_modules/lucide-react/dist/esm/icons/<kebab-case>.mjs`.
La versión instalada es la 1.28 y no todos los nombres clásicos están.

**Para probar endpoints protegidos**, generar un JWT con los permisos deseados:

```js
require('dotenv').config();
const jwt = require('jsonwebtoken');
jwt.sign({ sub:'1', usuario:'test', roles:['ADMINISTRADOR'], permisos:['VER_X'] },
         process.env.JWT_SECRET, { algorithm:'HS256', expiresIn:'10m' });
```

---

## 6. Pendientes y riesgos

### 6.1 La mayor parte de la API sigue sin autenticación — **prioridad alta**

Solo estos routers pasan por `validateBearerJWT` (ver `app.js`):
`anticipos-operativos`, `conductor-efectivo`, `caja-traspaso`, `auth-secundario`,
`paises`, `siesa-usuarios`, `maestros/cajas`, `maestros/conceptos`,
`maestros/maquinaria`, `maestros/interfaz-contable-vehiculos`.

**Están abiertos sin token:** `clients`, `products`, `reports`, `pedidos`,
`campanias`, `financiero`, `maestros/condiciones-pago`, `recibo-caja`, `factura`,
`egreso-gastos`, `warehouses`, `local`, `ggo`.

En esos módulos el cableado del front es **solo cosmético**: oculta botones, pero
cualquiera puede llamar al endpoint con `curl`. Afecta a Clientes, Productos,
Pedidos, Ferreganga, Reportes, Recibo de Caja, Análisis Financiero y
**Descuentos Financieros** (este último con borrado abierto).

**Riesgo al cerrarlos:** varios los consume la app Flutter. Si no envía token, se
rompe. Hay que revisar módulo por módulo qué usa Flutter **antes** de añadir JWT.

### 6.2 Decisiones tomadas que conviene revisar con el usuario

- `GET /auth-secundario/roles` quedó **sin** `requirePermiso` a propósito: lo usa
  el formulario de usuarios para llenar el selector de rol. Exigir `VER_ROLES`
  dejaría fuera a quien pueda crear usuarios pero no administrar roles.
  Alternativa limpia: endpoint `/roles/selector` con permiso `VER_USUARIOS`.
- `POST /conductor-efectivo/entrega` **no** se protegió: lo llama el conductor
  desde Flutter. Solo se cerraron `confirmar` y `resolver-diferencia` (web).
- `cuenta_contable` como VARCHAR en vez de numérico (ver §3.4).

### 6.3 Deuda menor

- `FRONT/src/pages/MaestroUsuariosPage.tsx` quedó **sin uso**: `/maestro/usuarios`
  ahora renderiza `SecuritySettingsPage`. Su modal `UserMasterModal.tsx` también.
  Borrar si nadie los reclama.
- Merges previos dejaron grupos y rutas duplicados (Maestros/Reportes en el menú,
  `/egreso` y `/maestro/relacion-conceptos` en `App.tsx`). Ya se limpiaron, pero
  **conviene revisar duplicados tras cada merge**.
- El chunk de `AnalisisFinancieroPage` supera 500 kB en el build.

---

## 7. Convenciones del código

- **API:** capas `routes → controllers → services`. Todas las queries
  parametrizadas (`request.input(...)`, nunca interpolación). `WITH (NOLOCK)` en
  lecturas. Respuesta estándar `{ success, data }` / `{ success, message }`.
  Errores de negocio con `Object.assign(new Error(msg), { statusCode: 400 })`.
- **Front:** páginas en `src/pages`, modales en `src/components/<dominio>`,
  clientes HTTP en `src/api`. Listados con búsqueda en servidor y debounce de
  400 ms. Estados con `badgeClass()` de `utils/badges`.
- **Idioma:** todo el código, comentarios y UI en español.
- **Los comentarios explican el porqué**, no el qué (sobre todo las decisiones
  no obvias: índices filtrados, endpoints sin permiso, columnas espejo).
