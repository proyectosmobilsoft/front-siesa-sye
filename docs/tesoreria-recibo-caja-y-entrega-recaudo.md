# Tesorería: Recibo de Caja y Entrega de Recaudo

Esta guía explica el comportamiento actual de las pantallas web de **Recibo de Caja** y **Entrega de Recaudo**, sus fuentes de datos y las decisiones de interfaz relevantes para conciliación.

## Pantalla Recibo de Caja

**Ruta:** `/tesoreria/recibo-caja`  
**Código:** `src/pages/ReciboCajaPage.tsx`  
**API:** `src/api/reciboCaja.ts`

Tiene tres pestañas: **General**, **Conductores** y **Recibos**.

### Conductores: consulta por fecha

La pestaña **Conductores** muestra los RC creados por conductor para una fecha seleccionada.

- El selector inicia en el día actual y no permite fechas futuras.
- Al cambiar la fecha consulta `GET /recibo-caja/resumen-conductores` con `fecha_inicial` y `fecha_final` iguales.
- El tablero se refresca cada 30 segundos mientras la pestaña está abierta; el botón de recarga repite la consulta manualmente.
- Al cambiar de fecha se cierran los detalles abiertos y se descarta su caché para impedir que se mezclen RC de días diferentes.

El resumen por conductor muestra cantidad de RC, efectivo, transferencia y total. El total corresponde a todos los medios de pago informados por el backend.

### Detalle de un conductor

Al seleccionar una fila, el front consulta:

```text
GET /recibo-caja/por-usuario?usuario=<usuario-siesa>&fecha_inicial=<fecha>&fecha_final=<fecha>&tipo=RC
```

El detalle muestra documento, fecha, tercero, medios de pago, descuento y estado.

#### Total recaudado

El total de cada RC se calcula como:

```text
efectivo + transferencia + tarjeta de crédito + tarjeta de débito
```

No se usa `Creditos` como total recaudado. En SIESA, `Creditos` puede reflejar el valor completo aplicado a la factura, incluido un descuento financiero; por ello puede ser mayor que el dinero efectivamente recibido.

#### Descuento financiero

La columna **Desc. financiero** suma `Facturas[].Descuento_Pp` de cada RC.

- Se presenta en rojo porque representa una reducción del recaudo recibido.
- No se suma al total recaudado.
- Si no existe descuento, se muestra `—`.

#### Tarjetas

La API individual puede devolver estos campos:

- `tarjeta_credito`: medio de pago SIESA cuyo código empieza por `TC`.
- `tarjeta_debito`: medio de pago SIESA cuyo código empieza por `TD`.

Las columnas **T. crédito** y **T. débito** solo se renderizan si al menos un RC del conductor en el detalle contiene un valor positivo para el medio correspondiente. Esto evita columnas vacías y reduce el desplazamiento horizontal.

#### Varias facturas en un RC

Un RC con más de una factura no lista todos los consecutivos en la celda. En su lugar aparece el botón **Ver N facturas**.

El botón abre una ventana con:

- tipo y número de factura;
- valor aplicado;
- descuento financiero de esa factura.

Para una única factura se muestra la referencia directamente. Si no hay factura relacionada, se muestra `—`.

### Criterio visual de la tabla

La tabla usa la tipografía principal de la aplicación, no monoespaciada. Los valores conservan `tabular-nums` para que los dígitos mantengan una lectura estable, pero todas las columnas del resumen, detalle y ventana de facturas se alinean a la izquierda.

## Pantalla Entrega de Recaudo

**Ruta:** `/tesoreria/entrega-recaudo`  
**Código:** `src/pages/TesoreriaEntregaRecaudoPage.tsx`

Esta pantalla registra y revisa la entrega física del efectivo de los conductores.

### Entregas físicas y RC de SIESA

Una entrega física y un RC de SIESA son registros independientes: no existe una FK que permita asociar un RC puntual con una entrega concreta.

- Una entrega confirmada prueba que tesorería contó y recibió el valor indicado.
- Un RC prueba que el recaudo quedó registrado en SIESA con el usuario y la fecha consultados.
- Que una entrega esté validada físicamente no implica, por sí solo, que exista un RC del mismo conductor en ese día.

El modal **Ver recibos** consulta los RC del usuario SIESA vinculado y del período seleccionado. Si el resultado está vacío, informa explícitamente que la entrega está validada pero no tiene un RC de ese conductor dentro del rango. No debe interpretarse como un error provocado por consultar un día anterior.

### Estado de validación física

El bloque inferior se denomina **Validación física de entregas**.

- Compara el valor declarado por el conductor con el efectivo contado y confirmado por tesorería.
- El estado **Validado físicamente** solo indica que no existe una diferencia física pendiente.
- No certifica que el RC haya sido creado en SIESA; esa evidencia se consulta desde el botón **Ver recibos**.

### Diseño de paneles

Los paneles **Pendientes por validar** y **Ya validadas** se estiran a la misma altura.

Cuando no hay pendientes, el panel izquierdo muestra un estado vacío con el mensaje *Todo está al día* y remite a las entregas validadas del panel derecho. Esto evita un espacio visual vacío cuando el listado de confirmadas es más alto.

## Verificación

Después de cambios en estas pantallas, ejecutar:

```bash
pnpm run build
```

La compilación ejecuta TypeScript y la construcción de Vite.
