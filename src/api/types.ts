export interface Client {
  id: number
  nombre: string
  apellido: string
  email: string
  telefono: string
  direccion: string
  fecha_registro: string
  ultima_compra: string
  total_compras: number
  estado: 'activo' | 'inactivo' | 'suspendido'
}

export interface Company {
  f010_id: number
  f010_razon_social: string
  f010_nit: string
  f010_ind_estado: number
  f010_ult_ano_cerrado: number
  f010_direccion?: string
  f010_telefono?: string
  f010_email?: string
  f010_fecha_creacion?: string
  f010_ultima_actualizacion?: string
}

export interface Product {
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

export interface ClientsResponse {
  success: boolean
  data: Client[]
}

export interface CompaniesResponse {
  success: boolean
  data: Company[]
}

export interface ProductsResponse {
  success: boolean
  data: Product[]
}

export interface DailyOrder {
  rowid: number
  'Fecha docto': string
  'Hora creacion': string
  'ID. CO': string
  Estado: string
  'Desc. CO': string
  'Hora creacion dt': string
}

export interface DailyOrdersResponse {
  success: boolean
  data: DailyOrder[]
}

export interface SalesSummary {
  'Fecha documento': string
  'Guid documento': string
  'Vendedor': string
  'Vlr. Neto documento': number
  'Numero de unidades docto': number
  'Item resumen': string
  'Desc. grupo clase docto.': string
  'Centro de OP': string
  'Compania': number
}

export interface SalesSummaryResponse {
  success: boolean
  data: SalesSummary[]
}

export interface Vendor {
  'Codigo vendedor': string
  'Nombre vendedor': string
  'Tipo de entrega': string
  'Valor subtotal': number
  'Valor neto': number
  'compania': number
  'centro de op': string
}

export interface VendorsResponse {
  success: boolean
  data: Vendor[]
}

export interface Factura {
  [key: string]: any // Estructura flexible para facturas
}

export interface FacturasResponse {
  success: boolean
  data: Factura[]
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
}

export interface FacturasParams {
  periodoInicial?: number // YYYYMM format
  periodoFinal?: number // YYYYMM format
  page?: number
  pageSize?: number
}

export interface EstadoFinanciero {
  [key: string]: any // Estructura flexible para estados financieros
}

export interface EstadosFinancierosResponse {
  success: boolean
  data: EstadoFinanciero[]
}

export interface EstadosFinancierosParams {
  periodoInicial?: number // YYYYMM format
  periodoFinal?: number // YYYYMM format
}

export interface PerdidasGanancias {
  TipoCuenta: string
  Cuenta: string
  Total: number
}

export interface PerdidasGananciasResponse {
  success: boolean
  data: PerdidasGanancias[]
}

export interface PerdidasGananciasParams {
  periodoInicial?: number // YYYYMM format
  periodoFinal?: number // YYYYMM format
}

export interface TendenciaMensual {
  Periodo: number // YYYYMM format
  Ingresos: number
  Costos: number
  Gastos: number
  Utilidad: number
}

export interface TendenciaMensualResponse {
  success: boolean
  data: TendenciaMensual[]
}

export interface TendenciaMensualParams {
  periodoInicial?: number // YYYYMM format
  periodoFinal?: number // YYYYMM format
}

export interface Pedido {
  [key: string]: any // Flexible structure for pedidos
}

export interface PedidosResponse {
  success: boolean
  data: Pedido[]
}

export interface PedidosParams {
  fechaInicial: string // ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  fechaFinal: string // ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
}

export interface AnticipoOperativo {
  id: number
  usuario_id: number
  usuario_nombre: string
  valor_distribuido: number
  numero_anticipo: string
  fecha_solicitud: string
  area_departamento: string
  motivo_general: string
  fecha_inicio_operacion: string
  fecha_fin_estimada: string
  prioridad: string
  forma_entrega: string
  fecha_requerida_dinero: string
  observaciones_financieras: string
  responsable_aprobacion: string
  valor_solicitado: number
  estado: string
  created_at: string
  updated_at: string
}

export interface AnticiposOperativosResponse {
  success: boolean
  data: AnticipoOperativo[]
}

export interface AnticipoOperativoUpdatePayload {
  estado?: string
  observaciones_financieras?: string
  responsable_aprobacion?: string
  valor_distribuido?: number
}

export interface DistribucionItem {
  id: number
  anticipo_id: number
  usuario_id?: number
  conductor_id?: number
  nombre?: string
  usuario_nombre?: string
  conductor_nombre?: string
  valor_asignado?: number
  valor?: number
  concepto?: string
  estado?: string
  fecha_asignacion?: string
  observaciones?: string
  [key: string]: unknown
}

export interface DistribucionResponse {
  success: boolean
  data: DistribucionItem[]
}

export interface Soporte {
  id: number
  anticipo_id: number
  usuario_id: number
  usuario_nombre: string
  valor: number
  concepto?: string
  ruta_foto: string
  created_at: string
  valor_distribuido: number
  total_justificado: number
  saldo_pendiente: number
}

export interface SoportesResponse {
  success: boolean
  data: Soporte[]
}