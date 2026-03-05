# Dashboard SaaS - Analytics

Un dashboard moderno y profesional construido con React + Vite + TypeScript que consume datos de APIs para mostrar estadísticas y tablas interactivas sobre clientes, compañías y productos.

## 🚀 Características

- **Dashboard Moderno**: Interfaz limpia y profesional tipo SaaS/Admin Pro
- **Modo Claro/Oscuro**: Toggle automático con persistencia en localStorage
- **Tablas Interactivas**: Búsqueda, ordenamiento y paginación
- **Gráficos Dinámicos**: Visualizaciones con Nivo Charts
- **Animaciones Suaves**: Transiciones con Framer Motion
- **Responsive Design**: Adaptable a móviles y tablets
- **Estados de Carga**: Skeletons y manejo de errores
- **TypeScript**: Tipado completo para mejor desarrollo

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + Vite + TypeScript
- **Estilos**: TailwindCSS + shadcn/ui
- **Estado**: Zustand + React Query (TanStack Query)
- **HTTP**: Axios
- **Gráficos**: Nivo Charts
- **Animaciones**: Framer Motion
- **Iconos**: Lucide React
- **Tablas**: TanStack Table
- **Formularios**: React Hook Form + Zod

## 📦 Instalación

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd dashboard-saas
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Copia el archivo `.env.example` a `.env` y ajusta las variables según tu entorno:

```bash
# El archivo .env ya está creado con valores por defecto
# Puedes modificarlo según tus necesidades
```

**Variables disponibles:**

- `VITE_API_BASE_URL_DEV`: URL del backend en desarrollo (por defecto: `http://localhost:3000`)
- `VITE_API_BASE_URL_PROD`: URL del backend en producción (por defecto: `https://softwareqa.dev`)
- `VITE_PORT`: Puerto del servidor de desarrollo de Vite (por defecto: `5173`)
- `VITE_BACKEND_PORT`: Puerto del backend local (por defecto: `3000`)

**Nota importante:**
- En desarrollo (`npm run dev`): Las peticiones van a `/api` y Vite las redirige a `localhost` usando el proxy
- En producción (`npm run build`): Las peticiones van directamente a `https://softwareqa.dev`

4. **Ejecutar en modo desarrollo**

```bash
npm run dev
```

5. **Construir para producción**

```bash
npm run build
```

## 🌐 Endpoints Requeridos

El dashboard consume los siguientes endpoints:

- `GET http://localhost:3000/api/clients` - Lista de clientes
- `GET http://localhost:3000/api/companies` - Lista de compañías
- `GET http://localhost:3000/api/products` - Lista de productos

### Estructura de Datos Esperada

#### Cliente

```typescript
interface Client {
  id: number
  nombre: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  estado: string
  fecha_creacion: string
  ultima_actualizacion: string
}
```

#### Compañía

```typescript
interface Company {
  id: number
  razon_social: string
  nit: string
  estado: string
  f010_ult_ano_cerrado: number
  direccion: string
  telefono: string
  email: string
  fecha_creacion: string
  ultima_actualizacion: string
}
```

#### Producto

```typescript
interface Product {
  id: number
  referencia: string
  descripcion: string
  precio: number
  stock: number
  categoria: string
  ind_compra: boolean
  ind_venta: boolean
  ind_manufactura: boolean
  maneja_lotes: boolean
  maneja_serial: boolean
  controlado: boolean
  fecha_creacion: string
  ultima_actualizacion: string
}
```

## 🎨 Funcionalidades

### Dashboard Principal

- **Tarjetas de Estadísticas**: Total de clientes, compañías activas y productos
- **Gráficos Interactivos**:
  - Gráfico de pastel: Productos por indicadores (compra, venta, manufactura)
  - Gráfico de líneas: Compañías por año cerrado
- **Tablas Dinámicas**: Con búsqueda, ordenamiento y paginación

### Características de UX

- **Estados de Carga**: Skeletons mientras cargan los datos
- **Manejo de Errores**: Mensajes informativos y reintentos
- **Animaciones**: Transiciones suaves al cargar componentes
- **Filtros Globales**: Búsqueda general y filtro por compañía
- **Modo Oscuro**: Toggle con persistencia automática

### Diseño Responsivo

- **Sidebar Colapsable**: En móviles se oculta automáticamente
- **Tablas Adaptables**: Scroll horizontal en pantallas pequeñas
- **Gráficos Responsivos**: Se ajustan al contenedor

## 📁 Estructura del Proyecto

```
src/
├── api/                    # Servicios API
│   ├── client.ts          # Configuración Axios
│   ├── types.ts           # Tipos compartidos
│   ├── clients.ts         # API de clientes
│   ├── companies.ts       # API de compañías
│   └── products.ts        # API de productos
├── components/
│   ├── ui/                # Componentes base (shadcn/ui)
│   ├── layout/            # Componentes de layout
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ThemeToggle.tsx
│   └── dashboard/         # Componentes del dashboard
│       ├── StatsCards.tsx
│       ├── ChartsSection.tsx
│       ├── ClientsTable.tsx
│       ├── CompaniesTable.tsx
│       └── ProductsTable.tsx
├── hooks/                 # Custom hooks
│   ├── useClients.ts
│   ├── useCompanies.ts
│   └── useProducts.ts
├── pages/                 # Páginas
│   └── DashboardPage.tsx
├── store/                 # Estado global
│   └── uiStore.ts
├── utils/                 # Utilidades
│   └── formatters.ts
├── lib/                   # Librerías
│   ├── utils.ts
│   └── skeleton.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## 🎯 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Construcción para producción
- `npm run preview` - Vista previa de la construcción
- `npm run lint` - Linter de código

## 🔧 Configuración

### TailwindCSS

El proyecto usa TailwindCSS con configuración personalizada para:

- Modo oscuro automático
- Variables CSS personalizadas
- Animaciones personalizadas
- Colores del sistema de diseño

### React Query

Configurado con:

- Cache de 5 minutos por defecto
- 3 reintentos automáticos
- Sin refetch en focus de ventana

### Zustand

Store global para:

- Estado del tema (claro/oscuro)
- Estado del sidebar
- Filtros globales
- Persistencia en localStorage

## 🚀 Despliegue

### Vercel (Recomendado)

```bash
npm run build
# Subir carpeta dist/ a Vercel
```

### Netlify

```bash
npm run build
# Subir carpeta dist/ a Netlify
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

---

**Desarrollado con ❤️ usando React + Vite + TypeScript**
