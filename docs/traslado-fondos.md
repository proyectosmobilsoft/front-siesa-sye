# Traslado de Fondos

Estado: **front construido, pendiente de conectar con backend**.

## Qué es

Movimiento manual de efectivo entre dos cajas: `caja_origen -> caja_destino`.
Es un traslado punto a punto — **siempre involucra exactamente dos cajas por
movimiento** (una origen, una destino), no una distribución a varias cajas a
la vez. Análogo a "llevar una entrega física de una caja a otra".

Ejemplo real: la caja A recibió efectivo del día, se necesita mover ese
dinero a la caja B (otra sucursal/punto).

## Quién puede usarlo

Por ahora **solo el rol Administrador**. No hay más roles con acceso todavía;
si eso cambia a futuro es una ampliación de permisos, no un rediseño.

## Dónde vive en el front

- Página: `src/pages/TrasladoFondosPage.tsx`
- Ruta: `/tesoreria/traslado-fondos` (dentro del menú Tesorería)
- Cliente API: `src/api/trasladoFondos.ts`
- Hooks: `src/hooks/useTrasladoFondos.ts`
- Tipos: `TrasladoFondos`, `TrasladoFondosEstado` en `src/api/types.ts`

La ruta está protegida con `ProtectedRoute permiso={PERMISOS.TRASLADO_FONDOS}`
(código de permiso: `TRASLADO_FONDOS`). El sidebar oculta el ítem del menú si
el usuario no tiene ese permiso — es el mismo mecanismo que ya usan Egreso y
Gestión de Ventas. **Backend solo necesita asignar el permiso `TRASLADO_FONDOS`
exclusivamente al rol Administrador** en la tabla de roles/permisos; el front
ya sabe ocultar/mostrar el menú y bloquear la ruta según eso.

## Qué falta en backend

No existe todavía ningún endpoint. El front ya está armado esperando este
contrato:

### 1. Crear traslado

```
POST /traslado-fondos
```

Body:
```json
{
  "caja_origen_id": "CAJA_SUCURSAL_PORTAL_SOLEDAD",
  "caja_destino_id": "CAJA_PRINCIPAL",
  "valor": 500000,
  "referencia": "texto opcional"
}
```

Respuesta esperada (`200`):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "caja_origen_id": "CAJA_SUCURSAL_PORTAL_SOLEDAD",
    "caja_origen_nombre": "CAJA SUCURSAL PORTAL DE SOLEDAD",
    "caja_destino_id": "CAJA_PRINCIPAL",
    "caja_destino_nombre": "CAJA PRINCIPAL",
    "valor": 500000,
    "referencia": "texto opcional",
    "estado": "CONFIRMADO",
    "usuario_registro": 12,
    "usuario_registro_nombre": "jpaternina",
    "fecha": "2026-08-01T14:30:00.000Z",
    "created_at": "2026-08-01T14:30:00.000Z"
  }
}
```

Validaciones que backend debe hacer (el front ya valida lo mismo en cliente,
pero backend es la fuente de verdad — no confiar solo en el front):
- `caja_origen_id !== caja_destino_id`
- `valor > 0`
- usuario autenticado tiene el permiso `TRASLADO_FONDOS`
- (a definir con negocio) si se valida que la caja origen tenga saldo
  suficiente antes de aceptar el traslado

### 2. Listar historial

```
GET /traslado-fondos?fecha_inicial=YYYY-MM-DD&fecha_final=YYYY-MM-DD
```

Ambos parámetros de fecha son opcionales. Respuesta esperada:
```json
{
  "success": true,
  "total": 1,
  "data": [ /* mismo shape que data de arriba, un array */ ]
}
```

### `estado` del traslado

El tipo `TrasladoFondosEstado` ya contempla `'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO'`
por si a futuro se agrega un flujo de aprobación (como el que ya existe en
Entrega de Recaudo, `conductor-efectivo`). Si por ahora el traslado se aplica
de inmediato sin flujo de aprobación, backend puede devolver siempre
`"CONFIRMADO"` — el front ya sabe pintar los tres estados si algún día se
necesitan.

## Catálogo de cajas — pendiente

El front no tiene de dónde traer la lista real de cajas. Está usando una
lista fija hardcodeada en `TrasladoFondosPage.tsx` (las mismas dos cajas que
ya aparecen hardcodeadas en `ReciboCajaPage.tsx`: "CAJA SUCURSAL PORTAL DE
SOLEDAD" y "CAJA PRINCIPAL"). Esto es un parche, no la solución final: si
backend expone un catálogo real de cajas (`GET /cajas` o similar), avisar
para reemplazar la lista fija por datos reales y no duplicar esa lista en
dos páginas distintas.

## Qué NO se tocó

Ningún endpoint ni comportamiento existente (Recibo de Caja, Entrega de
Recaudo, etc.) cambió. Este es un módulo nuevo, aislado, que no depende de
código de otras páginas.
