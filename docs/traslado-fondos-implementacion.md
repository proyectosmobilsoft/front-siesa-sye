# Traslado de Fondos — detalle de implementación (front + backend)

Complementa a `docs/traslado-fondos.md` (ese es el contrato rápido de API).
Este documento explica **cómo quedó armado el front** y **qué debe construir
backend** para que encaje sin fricción.

## 1. Estado actual (importante)

La ruta **está visible sin restricción de permiso todavía**, a propósito:
el permiso `TRASLADO_FONDOS` no existe en backend, así que si la ruta
quedaba protegida con `<ProtectedRoute permiso={...}>` nadie —ni el
Administrador— podía entrar, ni siquiera pegando la URL directo. Mismo
criterio que ya usa el proyecto para módulos sin permiso todavía (Clientes,
Productos, Pedidos, etc. — ver comentario en `src/config/permisos.ts`).

Cuando backend cree el permiso y lo asigne solo al rol Administrador, hay
que restaurar la protección en dos lugares (están marcados con comentarios
`TODO`-style en el código):

- `src/App.tsx`: envolver `<Route path="/tesoreria/traslado-fondos" .../>`
  en `<ProtectedRoute permiso={PERMISOS.TRASLADO_FONDOS}>`.
- `src/components/layout/Sidebar.tsx`: agregar `permiso: PERMISOS.TRASLADO_FONDOS`
  al ítem del subItem "Traslado de Fondos" (el sidebar ya sabe ocultar
  ítems sin permiso, es una sola línea).

Hasta entonces, **cualquier usuario autenticado ve el módulo**, aunque el
plan final es que solo el Administrador pueda hacerlo.

## 2. Arquitectura en el front

```
src/api/types.ts              -> tipos TrasladoFondos, TrasladoFondosEstado
src/api/trasladoFondos.ts     -> cliente HTTP (listar / crear)
src/hooks/useTrasladoFondos.ts-> useTrasladosFondos() y useCrearTrasladoFondos()
src/pages/TrasladoFondosPage.tsx -> UI (formulario + historial)
src/config/permisos.ts        -> código de permiso TRASLADO_FONDOS
```

Sigue el mismo patrón que ya usa `conductorEfectivoApi` /
`useConductorEfectivo` (el módulo de Entrega de Recaudo): tipo con
`estado`, cliente API separado de hooks, `useMutation` con
`invalidateQueries` para refrescar el historial después de crear uno nuevo.
Si backend ya conoce ese módulo, este es literalmente el mismo esquema
aplicado a un caso más simple (dos cajas en vez de conductor->caja).

### Formulario (`TrasladoFondosPage.tsx`)

Campos: caja origen, caja destino, valor, referencia (opcional).

Validación en cliente antes de habilitar el botón "Realizar traslado":
- ambas cajas seleccionadas
- origen ≠ destino
- valor > 0

Esto es solo UX (evita clics inútiles) — **backend debe repetir estas
mismas validaciones**, el front nunca es la única barrera.

### Historial

Lista simple (no tabla densa) con: cajas origen→destino, fecha, usuario,
referencia, valor, badge de estado. Usa `useTrasladosFondos()` sin filtro
de fecha por ahora (trae todo). Si el volumen crece, se le puede agregar
el mismo selector de rango de fechas que ya tiene Entrega de Recaudo — no
está puesto todavía porque no hay datos reales con los que probarlo.

### Manejo de "no hay backend todavía"

A propósito **no se simulan datos**. Mientras el endpoint no exista, el
historial muestra un estado de error explícito ("No se pudo cargar el
historial... revisar docs/traslado-fondos.md"), no una lista vacía
disfrazada de "sin traslados" ni números inventados. Esto fue una lección
de una revisión anterior del proyecto: había una pantalla de tesorería
(`ReciboCajaPage`) con montos fijos hardcodeados que se veían como datos
reales sin serlo — se evitó repetir ese patrón acá.

## 3. Qué debe construir backend

### Tabla / entidad `traslados_fondos` (sugerido)

| Campo                     | Tipo      | Notas |
|---------------------------|-----------|-------|
| id                        | int PK    | autoincrement |
| caja_origen_id            | string    | FK a catálogo de cajas (ver sección 4) |
| caja_destino_id           | string    | FK a catálogo de cajas |
| valor                     | numeric   | > 0 |
| referencia                | string?   | opcional, texto libre |
| estado                    | enum      | `PENDIENTE` / `CONFIRMADO` / `RECHAZADO` — si no hay flujo de aprobación, usar siempre `CONFIRMADO` |
| usuario_registro          | int FK    | usuario autenticado que hizo el traslado |
| fecha                     | timestamp | fecha del movimiento |
| created_at                | timestamp | auditoría |

### Endpoints (contrato completo en `docs/traslado-fondos.md`)

- `POST /traslado-fondos` — crea el traslado. Debe validar:
  - usuario autenticado tiene permiso `TRASLADO_FONDOS`
  - `caja_origen_id !== caja_destino_id`
  - `valor > 0`
  - (a definir con negocio) si se exige saldo disponible en la caja origen
    antes de aceptar el traslado, o si es un registro contable libre
- `GET /traslado-fondos?fecha_inicial=&fecha_final=` — historial, params
  de fecha opcionales.

### Permiso

Crear el código `TRASLADO_FONDOS` en el catálogo de permisos y asignarlo
**únicamente** al rol Administrador. El front ya consume
`useAuthStore().hasPermiso('TRASLADO_FONDOS')` — apenas exista en la
respuesta de login/permisos, el front puede volver a activar el gate (ver
sección 1) sin tocar más código.

## 4. Pendiente que bloquea "terminar bien" el módulo

**Catálogo de cajas.** No existe un endpoint que liste las cajas reales.
El front tiene una lista fija de 2 cajas hardcodeada directamente en
`TrasladoFondosPage.tsx` (duplicando la misma lista que ya está
hardcodeada en `ReciboCajaPage.tsx`). Esto funciona para probar el flujo
pero no es aceptable a largo plazo: si se agrega una caja nueva, hay que
tocar código en dos archivos del front en vez de que aparezca sola.

Si backend expone `GET /cajas` (o ya existe y no lo conozco), avisar y el
front lo cambia a un `useQuery` real en un rato — es un cambio pequeño y
localizado.
