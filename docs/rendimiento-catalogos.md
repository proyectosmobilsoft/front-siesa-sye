# Rendimiento: catálogos sin paginar (/clients, /products)

## Problema medido

- `GET /products`: ~20.6 MB, ~6s de respuesta (medido con curl contra
  `apisye.mobilsoft.co`). Devuelve el catálogo completo sin paginar.
- `GET /clients`: ~10.8k registros, también sin paginar.

Ambos endpoints se usan tanto para las páginas de listado (Clientes,
Productos) como para los KPIs del Dashboard, que solo necesitan un
**conteo**, no el catálogo completo.

## Qué se hizo en el front (mitigación, no solución)

- `staleTime`/`gcTime` de estas queries se subieron de 5 min a 30 min /
  1 hora (`src/hooks/useProducts.ts`, `src/hooks/useClients.ts`), para
  que la descarga pesada ocurra una sola vez por sesión en vez de
  repetirse cada vez que el usuario navega entre páginas o pasan 5 min.
- Se agregaron `useProductsCount()` / `useClientsCount()` (mismo query,
  con `select: (data) => data.length`) para que el Dashboard no vuelva a
  renderizar cuando cambian productos/clientes individuales — pero esto
  **no reduce la descarga de red**, React Query igual trae el array
  completo una vez.

Con client-side pagination ya en las tablas (TanStack Table pagina de a
~10 filas), el render en pantalla no es el problema — el problema es que
para pintar "10 clientes" o para un conteo en el Dashboard, el navegador
igual tiene que descargar y parsear los ~20 MB / 10.8k registros
completos primero.

## Qué se necesita en backend para una solución real

1. **Paginación real** en `/clients` y `/products`: parámetros
   `page`/`limit` (o `offset`/`limit`), devolviendo solo la página
   pedida + un `total` en la respuesta. Así la tabla puede pedir de a
   50-100 registros por vez en vez de todo el catálogo.
2. **Endpoint de conteo liviano** (`GET /products/count`,
   `GET /clients/count`, o que el `total` venga en la respuesta paginada
   del punto 1) para que el Dashboard no tenga que traer el catálogo
   completo solo para mostrar un número.
3. Si `/products` no puede paginarse pronto, al menos revisar que la
   respuesta esté comprimida (gzip/brotli) — 20 MB sin comprimir es
   mucho para un catálogo de productos, probablemente comprime muy bien.

Hasta que exista paginación real, el front solo puede minimizar cuántas
veces se paga ese costo (cache), no eliminarlo.
