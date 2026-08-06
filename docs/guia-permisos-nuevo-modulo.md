# Guía: cómo agregar permisos a un módulo nuevo

Receta paso a paso para que un formulario o pantalla nueva quede correctamente
protegida. Sigue el mismo patrón que Conceptos, Cajas, Maquinaria e Interfaz
Contable Vehículos.

---

## 0. Las dos reglas que hay que tener claras antes de empezar

**Regla 1 — Lo único que protege de verdad es la API.**
Ocultar un botón en el front es comodidad visual, no seguridad: cualquiera puede
llamar al endpoint con `curl`. Si el módulo modifica datos, el permiso **tiene**
que estar en la ruta del backend.

**Regla 2 — Los permisos viajan dentro del JWT.**
Se firman en el login (`auth.service.js`). Por eso, después de crear un permiso
nuevo **hay que cerrar sesión y volver a entrar**; con el token viejo el usuario
recibe 403 aunque en la base de datos ya lo tenga.

---

## 1. Modelo de datos (BD2 `sye-siesa`)

```
auth_modulos       ← el módulo (una pantalla o maestro)
   └── auth_permisos    ← sus permisos, con ModuloId + Tipo
          └── auth_rol_permiso  ← qué rol tiene cada permiso
                 └── auth_roles      (RolId 1 = ADMINISTRADOR)
```

### `auth_modulos`

| Columna | Para qué |
|---|---|
| `Codigo` | Identificador en MAYÚSCULAS, ej. `INTERFAZ_CONTABLE_VEHICULOS` |
| `Nombre` | Cómo se ve en la pantalla de Módulos y Permisos |
| `Grupo` | Agrupa en esa pantalla. En uso: `General`, `Maestros`, `Comercial`, `Facturacion`, `Tesoreria`, `Reportes`, `Sistema` |
| `Icono` | Nombre del icono de lucide, ej. `Calculator` |
| `Orden` | Orden de despliegue |

### `auth_permisos`

| Columna | Para qué |
|---|---|
| `Codigo` | El que usa el código, ej. `CREAR_CONCEPTO` |
| `Descripcion` | Texto largo explicativo |
| `ModuloId` | FK al módulo. **Nunca lo dejes en NULL**: un permiso huérfano no aparece agrupado en la pantalla de Roles |
| `Tipo` | `VISTA` · `ACCION` · `TAB` · `ESPECIAL` (validado en `auth-secundario.service.js`) |
| `Etiqueta` | Texto corto del checkbox: "Crear", "Editar", "Ver modulo" |
| `Orden` | Convención: `1` para la vista, `10/20/30…` para acciones |

**Los cuatro tipos:**

- **`VISTA`** — dar acceso a la pantalla. Uno por módulo, `VER_<MODULO>`.
- **`ACCION`** — una operación que modifica datos o produce una salida
  (crear, editar, eliminar, aprobar, exportar…).
- **`TAB`** — mostrar una pestaña dentro de una pantalla (solo lo usa Anticipos).
- **`ESPECIAL`** — no es una capacidad sino un marcador de tipo de usuario.
  Hoy solo `MODULO_CONDUCTOR`, que activa campos de conductor en la UI.
  **Estos no se asignan al administrador**, porque cambiarían su comportamiento
  sin darle ninguna facultad.

### Convención de nombres

```
VER_<MODULO>        VER_CONCEPTOS, VER_CAJAS, VER_INTERFAZ_CONTABLE
CREAR_<ENTIDAD>     CREAR_CONCEPTO, CREAR_CAJA
EDITAR_<ENTIDAD>    EDITAR_CONCEPTO
ELIMINAR_<ENTIDAD>  ELIMINAR_CONCEPTO
```

El módulo va en plural y la entidad en singular (`VER_CONCEPTOS` /
`CREAR_CONCEPTO`). Para acciones que no son CRUD, usa el verbo:
`EXPORTAR_ANALISIS_FINANCIERO`, `CONFIRMAR_ENTREGA_RECAUDO`.

---

## 2. Paso a paso

### Paso 1 — Crear módulo y permisos en BD2

Crea `API/scripts/<tu_modulo>_bd2.sql` con este molde (idempotente, para poder
ejecutarlo en varios ambientes sin duplicar):

```sql
-- 1. Módulo
INSERT INTO dbo.auth_modulos (Codigo, Nombre, Grupo, Icono, Orden, Estado, CreatedAt)
SELECT 'MI_MODULO', 'Mi Modulo', 'Maestros', 'FileText', 150, 1, GETDATE()
WHERE NOT EXISTS (SELECT 1 FROM dbo.auth_modulos WHERE Codigo = 'MI_MODULO');
GO

-- 2. Permisos, ligados al módulo
INSERT INTO dbo.auth_permisos (Codigo, Descripcion, Estado, CreatedAt, ModuloId, Tipo, Etiqueta, Orden)
SELECT v.Codigo, v.Descripcion, 1, GETDATE(), m.Id, v.Tipo, v.Etiqueta, v.Orden
FROM (VALUES
  ('VER_MI_MODULO',      'Permite ver Mi Modulo',    'VISTA',  'Ver modulo', 1),
  ('CREAR_MI_ENTIDAD',   'Permite crear registros',  'ACCION', 'Crear',     10),
  ('EDITAR_MI_ENTIDAD',  'Permite editar registros', 'ACCION', 'Editar',    20),
  ('ELIMINAR_MI_ENTIDAD','Permite eliminar',         'ACCION', 'Eliminar',  30)
) AS v(Codigo, Descripcion, Tipo, Etiqueta, Orden)
CROSS JOIN (SELECT Id FROM dbo.auth_modulos WHERE Codigo = 'MI_MODULO') m
WHERE NOT EXISTS (SELECT 1 FROM dbo.auth_permisos p WHERE p.Codigo = v.Codigo);
GO

-- 3. Asignar al rol ADMINISTRADOR (RolId = 1)
INSERT INTO dbo.auth_rol_permiso (RolId, PermisoId, CreatedAt)
SELECT 1, p.Id, GETDATE()
FROM dbo.auth_permisos p
WHERE p.Codigo IN ('VER_MI_MODULO','CREAR_MI_ENTIDAD','EDITAR_MI_ENTIDAD','ELIMINAR_MI_ENTIDAD')
  AND NOT EXISTS (
    SELECT 1 FROM dbo.auth_rol_permiso rp WHERE rp.RolId = 1 AND rp.PermisoId = p.Id
  );
GO
```

Verificación:

```sql
SELECT p.Codigo, p.Tipo, p.Etiqueta, r.Nombre AS Rol
FROM dbo.auth_permisos p
LEFT JOIN dbo.auth_rol_permiso rp ON rp.PermisoId = p.Id AND rp.RolId = 1
LEFT JOIN dbo.auth_roles r ON r.Id = rp.RolId
WHERE p.Codigo LIKE '%MI_MODULO%' OR p.Codigo LIKE '%MI_ENTIDAD%';
```

### Paso 2 — Proteger las rutas de la API

En `API/src/routes/<tu-modulo>.routes.js`:

```js
const { requirePermiso } = require('../middlewares/auth');

router.get('/',       requirePermiso('VER_MI_MODULO'),       controller.listar);
router.get('/:id',    requirePermiso('VER_MI_MODULO'),       controller.obtener);
router.post('/',      requirePermiso('CREAR_MI_ENTIDAD'),    controller.insertar);
router.put('/:id',    requirePermiso('EDITAR_MI_ENTIDAD'),   controller.modificar);
router.delete('/:id', requirePermiso('ELIMINAR_MI_ENTIDAD'), controller.eliminar);
```

Y en `API/src/app.js`, montar **detrás de `validateBearerJWT`**:

```js
app.use('/api/maestros/mi-modulo', validateBearerJWT, miModuloRoutes);
```

> ⚠️ `requirePermiso` lee `req.user.permisos`, que lo pone `validateBearerJWT`.
> Sin el JWT delante, **todas las peticiones devolverán 403**.

### Paso 3 — Declarar los códigos en el front

En `FRONT/src/config/permisos.ts`:

```ts
export const PERMISOS = {
  // ...
  MI_MODULO:          'VER_MI_MODULO',

  // ─── Acciones de Mi Módulo ───
  CREAR_MI_ENTIDAD:   'CREAR_MI_ENTIDAD',
  EDITAR_MI_ENTIDAD:  'EDITAR_MI_ENTIDAD',
  ELIMINAR_MI_ENTIDAD:'ELIMINAR_MI_ENTIDAD',
} as const
```

> Este archivo debe estar **sincronizado 1:1 con `auth_permisos`**. Un código que
> exista aquí pero no en BD nunca lo tendrá nadie: la ruta quedaría bloqueada
> incluso para el administrador (le pasó a `TRASLADO_FONDOS`).

### Paso 4 — Proteger la ruta del front

En `FRONT/src/App.tsx`:

```tsx
<Route path="/maestro/mi-modulo" element={
    <ProtectedRoute permiso={PERMISOS.MI_MODULO}><MiModuloPage /></ProtectedRoute>
} />
```

### Paso 5 — Agregar el ítem al menú

En `FRONT/src/config/navigation.ts`, dentro del grupo que corresponda:

```ts
{
  name: 'Mi Módulo',
  href: '/maestro/mi-modulo',
  icon: FileText,
  subtitle: 'Descripción corta que sale en el header',
  permiso: PERMISOS.MI_MODULO,   // sin esto, el ítem lo ve todo el mundo
},
```

Antes de usar un icono, **comprueba que existe en la versión instalada**:

```bash
ls node_modules/lucide-react/dist/esm/icons/file-text.mjs
```

### Paso 6 — Condicionar los botones de la página

```tsx
import { usePermiso } from '@/hooks/usePermiso'

export const MiModuloPage = () => {
    const { puede, P } = usePermiso()
    const puedeCrear    = puede(P.CREAR_MI_ENTIDAD)
    const puedeEditar   = puede(P.EDITAR_MI_ENTIDAD)
    const puedeEliminar = puede(P.ELIMINAR_MI_ENTIDAD)

    return (
        <>
            {puedeCrear && <Button onClick={handleNuevo}>Nuevo</Button>}

            {/* En la columna de acciones */}
            {puedeEditar && <Button onClick={() => handleEditar(r)}><Edit /></Button>}
            {puedeEliminar && <Button onClick={() => handleEliminar(r)}><Trash2 /></Button>}
            {!puedeEditar && !puedeEliminar && (
                <span className="text-xs text-muted-foreground">—</span>
            )}
        </>
    )
}
```

El `—` final evita que la columna Acciones quede vacía y descuadrada cuando el
usuario no puede hacer nada.

Para botones que no conviene ocultar (por ejemplo un `submit` de formulario),
deshabilítalos explicando por qué:

```tsx
<Button type="submit" disabled={!puedeGuardar}
        title={!puedeGuardar ? 'Requiere el permiso Guardar' : undefined}>
```

---

## 3. Checklist

- [ ] Módulo en `auth_modulos` con `Grupo` e `Icono`
- [ ] Permisos en `auth_permisos` **con `ModuloId` y `Tipo`**
- [ ] Asignados al rol ADMINISTRADOR (`RolId = 1`)
- [ ] Script SQL idempotente en `API/scripts/`
- [ ] `requirePermiso` en **todas** las rutas de la API
- [ ] Router montado detrás de `validateBearerJWT` en `app.js`
- [ ] Códigos en `FRONT/src/config/permisos.ts`
- [ ] `<ProtectedRoute>` en `App.tsx`
- [ ] `permiso` en el ítem de `navigation.ts`
- [ ] Botones envueltos con `usePermiso()`
- [ ] `npx tsc --noEmit` y `npx vite build` limpios
- [ ] **Cerrar sesión y volver a entrar** para probar

---

## 4. Cómo probar sin cerrar sesión

Para verificar la API directamente, genera un JWT con los permisos que quieras:

```js
// desde C:\developments\mobilsoft\sye\API
require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: '1', usuario: 'test', roles: ['ADMINISTRADOR'], permisos: ['VER_MI_MODULO'] },
  process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '10m' }
);
```

```bash
# Con permiso → 200 ; sin permiso → 403
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" http://localhost:3010/api/maestros/mi-modulo
```

Prueba siempre **los dos casos**: con permiso y sin él. Un endpoint que responde
200 en ambos es un endpoint sin proteger.

---

## 5. Errores que ya nos han pasado

| Síntoma | Causa | Solución |
|---|---|---|
| 403 aunque el permiso está en BD | El JWT es anterior al permiso | Cerrar sesión y volver a entrar |
| 403 para todos, admin incluido | `requirePermiso` sin `validateBearerJWT` delante | Montar el router con JWT en `app.js` |
| La ruta bloquea a todo el mundo | El código está en `permisos.ts` pero no existe en `auth_permisos` | Crear el permiso en BD |
| El permiso no sale agrupado en la pantalla de Roles | `ModuloId` en NULL | Asignarle su módulo |
| Bucle infinito de redirección | Se protegió `/` (Dashboard) | No protejas `/`: es el destino al que `ProtectedRoute` redirige |
| El menú muestra el ítem a cualquiera | Falta `permiso` en `navigation.ts` | Agregarlo |
| El build falla por un icono | El nombre no existe en lucide 1.28 | Verificar en `node_modules/lucide-react/dist/esm/icons/` |

---

## 6. Casos especiales

**Un GET que consumen varias pantallas.** No le pongas el permiso de su propio
módulo sin pensarlo. Ejemplo real: `GET /auth-secundario/roles` lo usa el
maestro de Roles **y** el formulario de Usuarios; exigirle `VER_ROLES` dejaría
sin poder crear usuarios a quien no administre roles. Quedó sin permiso y
documentado en el propio archivo. La alternativa limpia es un endpoint
específico para el selector con el permiso del módulo que lo consume.

**Endpoints que usa la app Flutter.** Antes de proteger uno, verifica si lo llama
la app móvil. `POST /conductor-efectivo/entrega` (el conductor registra su
entrega) se dejó **sin** permiso justamente por eso; solo se protegieron las
acciones del web (`confirmar` y `resolver-diferencia`).

**Módulos de solo lectura.** Si la pantalla no modifica nada (ej. Maquinaria),
basta con el permiso `VISTA`. No inventes acciones que no existen.

**Permisos de tipo `ESPECIAL`.** No los asignes al administrador: no otorgan
capacidades, cambian el comportamiento de la UI.
