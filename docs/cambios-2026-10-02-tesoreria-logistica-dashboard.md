# Cambios 2026-10-01/02 — Tesorería, Logística, dashboard de recaudo y UI general

Resumen de todo lo hecho en el front en esta tanda. La contraparte de backend
(endpoints, reglas de datos, tabla nueva) está en
`api-siesa-sye/docs/cambios-2026-10-02-tesoreria-logistica-dashboard.md`.

> Nada de esto está commiteado todavía. Requiere reiniciar el backend para que
> salgan los campos y endpoints nuevos.

---

## 1. Cambios transversales (toda la app)

### Fechas siempre en día/mes/año
- `src/components/ui/fecha-input.tsx` (**nuevo**): reemplaza a `<input type="date">`.
  El input nativo pinta la fecha según el idioma del navegador (mm/dd/aaaa en
  navegadores en inglés) y no se puede forzar.
  - Muestra y deja escribir `dd/mm/aaaa` (máscara automática).
  - Calendario propio en español (lunes primero), con vista de **días**, **meses** y **años**
    (clic en el mes o el año del encabezado).
  - Respeta `min`/`max`: días, meses y años fuera de rango salen atenuados y no se eligen;
    con `min` la vista de años solo lista los años con datos.
  - Botones **Hoy** y **Limpiar**; se cierra con clic afuera o Escape; va en portal
    (no lo recorta un `overflow:hidden`) y se abre hacia arriba si no cabe.
  - Valor de entrada/salida sigue siendo `YYYY-MM-DD`.
- `src/components/ui/date-picker.tsx` ahora es un envoltorio de `FechaInput`.
- Reemplazados todos los `type="date"`: Recibo de Caja, Traslado de fondos,
  Entrega de recaudo, Ferreganga, Pedidos.
- `src/utils/formatters.ts`: `date`, `dateOnly` y `dateTime` devuelven `dd/mm/aaaa`
  (y `HH:mm` 24 h) en vez de "1 oct 2026".
- Fechas crudas (`2026-10-01`, `…T00:00:00.000Z`) pasadas por `formatters.dateOnly`
  en Recibo de Caja, Entrega de recaudo, Ferreganga, Seguridad, CSV de recibos y
  "Pedidos recientes" del dashboard de inicio.

### Límite de fechas por módulo
- `src/hooks/useFechasLimite.ts` (**nuevo**): lee `GET /api/fechas-limite`
  (primer registro de cada módulo) y expone `hoyLocalIso()`.
- Los calendarios de Recibo de Caja, Entrega de recaudo y Traslado de fondos no
  dejan ir antes del primer registro ni después de hoy.

### Selector de C.O. con opción "Ambos"
- `src/store/authStore.ts`: `CO_AMBOS = 'AMBOS'` y `coPuntual(co)` (devuelve null en "Ambos").
- `src/components/layout/Header.tsx`: opción **Ambos** (solo usuarios con más de un C.O.).
- El header `X-Centro-Operacion: AMBOS` lo acepta el backend como "todos los C.O. del usuario".
- Con Ambos: Recibos/General muestran ambos C.O.; Asignar facturas guarda el C.O. de la factura.

### Tipografía y estilos
- Fuente **Ubuntu** / **Ubuntu Mono** en toda la app (`index.html`, `tailwind.config.js`);
  se quitaron Inter y Nunito.
- `.nu-th` (encabezados de tabla) más oscuro y grueso (`src/index.css`).
- `Modal` (`src/components/ui/modal.tsx`): `title` acepta `ReactNode` (títulos de dos líneas).

---

## 2. Recibo de Caja (`/tesoreria/recibo-caja`, `src/pages/ReciboCajaPage.tsx`)

Toda la página tiene zoom en pantallas anchas (`xl:[zoom:1.12]`, `2xl:[zoom:1.15]`).

### Pestaña Conductores
- Solo aparecen conductores **con RC** en la fecha (se quitó la columna "Asignado pendiente").
- Columnas: Conductor · C.O. · **Total a pagar** (valor de facturas antes de descuento) ·
  **Desc. financiero** · Efectivo · Transferencia · **T. Crédito / T. Débito** (solo si hay) ·
  **Total pagado**. Números a la derecha, `$ 0` en vez de `—`, fila de totales.
- Detalle de RC del conductor: mismas reglas de alineación; si el RC no tiene facturas
  (anulado), muestra las de la copia guardada o, en su defecto, las **notas** del RC.
- Modal "Ver N facturas": encabezado `Conductor: X` / `Recaudo RC#N · Fecha: dd/mm/aaaa hh:mm`,
  columnas Factura · Valor factura · Desc. financiero · Recaudado y fila Total.

### Pestaña Recibos
- Columnas: **Documento** (tipo + número) · Fecha · **Cliente** · **Creado por**
  (nombre + "Conductor · App" o "Usuario SIESA · login") · C.O. (con caja) ·
  Total a pagar · Desc. financiero.
- Encabezado de la tabla fijo al bajar (la tabla tiene scroll propio).
- **Panel derecho al pasar el mouse**: estado y medios de pago del recibo
  (efectivo, transferencia, tarjetas, barra proporcional y total pagado), con animación.
- **Clic en un recibo** → modal de detalle con cliente, creado por, caja, estado,
  total y tabla de facturas (incluye anulados vía copia guardada / notas).

### Pestaña General (arqueo)
Reemplaza los valores escritos a mano (Centro "002", cuenta "11050502", celdas editables)
por datos reales de `GET /api/recibo-caja/resumen-general`:
- Tarjetas: total recaudado, efectivo (debe estar en caja), descuentos financieros, anulados.
- Tabla por C.O.: fila **Conductores (app)** y fila **Caja SIESA**, total por C.O. y,
  con Ambos, total general.
- **Traslados de fondos del periodo**: total y por medio, neto por caja (entró/salió) y lista.
- **Facturas en ruta**: facturas asignadas a conductores sin cobrar
  (`GET /api/asignacion-cobro/pendientes-detalle`): resumen por conductor (pendientes,
  saldo, carga kg, vencidas, más antigua, cobradas en el periodo) y detalle por factura
  (cliente, conductor, asignada hace N días y por quién, vencimiento, peso, saldo real en SIESA).
  No muestra facturas anuladas o con saldo 0 en SIESA.

---

## 3. Dashboard de Recaudo (`/tesoreria/dashboard-recaudo`) — **nuevo**

Menú: Tesorería → Dashboard de Recaudo (permiso `VER_RECIBO_CAJA`).
Archivo: `src/pages/DashboardReciboCajaPage.tsx`. Datos: `GET /api/dashboard/recibo-caja`.

### Piezas reutilizables (`src/components/tablero/`) — mismo diseño que vehiman_react
- `comun.tsx`: `Encabezado`, `Bloque`, `Tarjeta` (KPI con tono, ícono y variación ±%),
  `Malla`, `CuerpoConsulta` (cargando/error/vacío), `SelectorRango` (30 días / Este mes /
  Este año / 12 meses + desde/hasta), `Tabla`.
- `graficas.tsx` (Recharts 2): `Barras`, `BarrasH`, `Dona`, `BarrasApiladas`, `Areas`.
  Ejes, rejilla y tooltip usan variables del tema (claro/oscuro).
- `formato.ts`: `dinero`, `entero`, `decimal`, `porcentaje`, `kilos`, `compacto`,
  `etiquetaMes`, `PALETA`, presets de rango.
- **Paleta** `#1a73d9 #15935b #c26a06 #7c5cd6 #0e9aa7 #d33a3a` (la de vehiman_react),
  validada con el validador de dataviz en claro (#fcfcfb) y oscuro (#1a1a1a). Se asigna
  en orden fijo; el par naranja/verde está en la franja CVD 6–8, por eso siempre va
  con leyenda o etiqueta.

Pensadas para los próximos dashboards por módulo.

### Contenido
- KPI: cobro de cartera (± vs periodo anterior), facturado, cobertura (cobro/facturado),
  días promedio de pago, descuento financiero, tasa de anulación (±), carga despachada, ticket promedio.
- **Lectura del analista**: conclusiones automáticas (variación del cobro, cobertura,
  costo de descuentos, causa principal de anulación, usuario con más anulados, otros
  ingresos sin factura, conductor con más carga).
- Gráficas: facturado vs cobrado por mes, recaudo por mes y origen, medios de pago,
  kilos por mes, causas de anulación, tiempo hasta anular, anulados por mes,
  quién genera / quién anula, conductores por recaudo y por kilos, detalle por conductor,
  top 10 clientes con días de pago, caja SIESA por usuario.

### Cómo leer los números
- **Cobro de cartera** = lo pagado en RC no anulados **que cruzan facturas**. Los RC sin
  factura (anticipos, otros ingresos) van aparte: en 2026 son ~31.000 M y mezclarlos
  inflaba el recaudo por encima de lo facturado.
- **Cobertura > 100 %** en rangos cortos es normal: se cobran facturas de periodos
  anteriores (la cartera baja). Leerla por mes o año.
- **Carga / peso**: solo ítems de inventario (ver regla de peso en el doc del backend).

---

## 4. Logística — Asignar facturas (`/logistica/asignar-facturas`)
- Peso por factura (kg) en "Por cliente" y "Facturas pendientes", total de peso de la
  selección, y fila **Peso** en el detalle de factura (`formatearPeso` en
  `src/components/asignacionCobro/facturaPendiente.ts`).
- Pestaña Facturas pendientes: encabezados de columna (Factura · C.O. · Emisión · Vence · Peso · Valor).
- Modal de facturas del conductor (`DetalleFacturasAsignadasModal.tsx`): **Carga total pendiente**,
  columnas Factura · Peso · Valor, total por cliente y **fecha/hora de asignación**.
- Tablero "Conductores programados": solo conductores con facturas pendientes.
- Con C.O. "Ambos", la asignación toma el C.O. de la factura.

---

## 5. Traslado de Fondos (`/tesoreria/traslado-fondos`, `src/pages/TrasladoFondosPage.tsx`)
- Saldos y **caja origen**: solo cajas del C.O. elegido. **Caja destino**: todas, agrupadas
  por C.O. (hay traslados legítimos entre centros, ej. Ferretería 80 (002) → General 001).
- **Confirmación** antes de crear el TC en SIESA: valor, medio, saldo antes → después de
  cada caja, aviso si es entre C.O. distintos.
- **Barrido sugerido**: botón con la ruta más usada (últimos 40 traslados del medio) y el
  saldo de la caja origen; botón **"Todo el saldo"** junto al valor.
- Historial: filtros por caja y medio, totales del rango (general y por medio),
  **exportar a Excel**, sin "C.O. Sin asignar" (solo muestra `C.O. 002 → 001` si cruza).
- Detalle del traslado: "Centro operativo 002" en vez de "CO 002" (alineado a la izquierda,
  mismo color que la caja), auxiliar como **código contable** (11050510) en vez del rowid,
  sin "Centro operativo del usuario · Sin asignar".

---

## 6. Pendientes / ideas acordadas para otra ronda
- Traslados: saldos de los tres medios en cada tarjeta, soporte (foto) para TC/TD,
  alerta de efectivo acumulado en cajas secundarias.
- Dashboard de inicio (`/`) aún con el diseño viejo: pasarlo a `src/components/tablero/`.
- Pestaña Conductores: el resumen de asignaciones no filtra por C.O. (un conductor del
  001 puede verse con "1 factura pendiente" estando en 002).
- Datos en SIESA a revisar con contabilidad: servicio "TRANSPORTE EXCLUIDO" con peso
  2.842 kg/unidad; RC sin factura por montos grandes (ej. ALEMAN RAMIREZ ~19.900 M);
  usuarios de prueba (wpatiño, lgarzon) generando RC anulados.
