export interface Client {
  f9740_id: number
  f9740_nit: string
  f9740_razon_social: string
  f9740_nombre: string
  f9740_email: string | null
  f9740_telefono: string | null
  f9740_celular: string | null
  f9740_direccion1: string | null
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
  f120_id: number
  f120_referencia: string
  f120_descripcion: string
  f120_ind_compra: number
  f120_ind_venta: number
  f120_ind_manufactura: number
  f120_ind_lote: number
  f120_ind_serial: number
  f120_ind_controlado: number
  f120_fecha_creacion: string
  f120_fecha_actualizacion: string
}

export interface ClientsResponse {
  success: boolean
  data: Client[]
}

export interface ClientsActivosResponse {
  success: boolean
  data: {
    activos_anio: number
    clientes?: Client[]
  }
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

export type MovimientoEfectivoEstado = 'PENDIENTE' | 'CONFIRMADO'
export type MovimientoEfectivoTipo = 'CREDITO' | 'DEBITO'

export interface MovimientoEfectivo {
  id: number
  conductor_id: number
  conductor_nombre?: string
  conductor_siesa_nombre?: string
  tipo: MovimientoEfectivoTipo
  valor: number
  valor_confirmado: number | null
  diferencia: number | null
  diferencia_resuelta: boolean
  usuario_resuelve: number | null
  usuario_resuelve_nombre?: string
  fecha_resolucion: string | null
  fecha: string
  estado: MovimientoEfectivoEstado
  referencia: string | null
  usuario_registro: number | null
  usuario_confirma: number | null
  usuario_confirma_nombre?: string
  fecha_confirma: string | null
  created_at: string
}

export interface MovimientosEfectivoResponse {
  success: boolean
  total: number
  data: MovimientoEfectivo[]
}

/**
 * Traslado de Fondos: mueve efectivo entre 2 cajas físicas de SIESA. Crea un
 * documento contable TC real, ya aprobado, y actualiza el saldo operativo de
 * ambas cajas en el mismo paso. Ver POST /api/caja-traspaso en el backend
 * (endpoint único: GET con ?vista=historial|cajas, POST con solo
 * id_caja_origen/destino/valor obligatorios).
 */
export interface CajaTraspaso {
  id_caja: string
  id_co: string
  rowid_auxiliar: number
  auxiliar: string | null
  nombre: string | null
}

export interface CajasTraspasoResponse {
  success: boolean
  total: number
  data: CajaTraspaso[]
}

export interface TrasladoFondosCreado {
  rowid_docto: number
  consec_docto: number
  periodo: number
}

export interface TrasladoFondosCreadoResponse {
  success: boolean
  data: TrasladoFondosCreado
  message: string
}

export interface TrasladoFondosMov {
  id: number
  id_cia: number
  id_co_origen: string
  id_co_destino: string
  id_un: string
  id_moneda: string
  id_caja_origen: string
  id_caja_destino: string
  valor: number
  motivo: string | null
  usuario_id: number
  usuario_nombre?: string
  fecha: string
  created_at: string
  rowid_auxiliar_origen: number | null
  rowid_auxiliar_destino: number | null
  rowid_docto_siesa: number | null
  numero_tc: number | null
  periodo_tc: number | null
  tipo?: string | null
}

export interface TrasladosFondosMovResponse {
  success: boolean
  total: number
  data: TrasladoFondosMov[]
}

export interface FacturaAfectadaRC {
  Rowid: number
  Tipo: string
  Numero: number
  Valor_Aplicado: number
}

export interface ReciboCajaUsuario {
  Rowid: number
  Fecha: string
  'C.O.': string
  Tipo_Docto: string
  Numero: number
  Debitos: number
  Creditos: number
  Estado: number
  Id_tercero: number
  Tercero_Nit?: string
  Tercero_Nombre?: string
  Usuario_Creacion: string
  Usuario_Anulacion?: string | null
  Caja_Id?: string
  Caja_Nombre?: string
  Facturas: FacturaAfectadaRC[]
  efectivo?: number
  consignacion?: number
  consignacion_cuenta?: string
  consignacion_cuenta_nombre?: string
  consignacion_cuenta_numero?: string
  [key: string]: unknown
}

export interface RecibosCajaUsuarioResponse {
  success: boolean
  total: number
  data: ReciboCajaUsuario[]
}

/** Evidencia en BD2 del RC de reemplazo de un recibo anulado en SIESA. */
export interface DocumentacionRCAnulado {
  id: number
  rc_rowid_siesa: number
  rc_numero_anulado: number
  usuario_conductor_siesa: string | null
  usuario_anulacion_siesa: string | null
  valor_efectivo_anulado: number
  numero_rc_reemplazo: number
  observacion: string | null
  version: number
  usuario_registro: number
  usuario_registro_nombre?: string
  fecha_registro: string
}

export interface DocumentacionRCAnuladoResponse {
  success: boolean
  total: number
  data: DocumentacionRCAnulado[]
}

export interface ResumenConductoresDiaItem {
  usuario_creacion: string
  conductor_nombre: string
  total_efectivo: number
  total_consignacion: number
  total: number
  recibos_count: number
}

export interface ResumenConductoresDia {
  fecha_inicial: string
  fecha_final: string
  conductores: ResumenConductoresDiaItem[]
}

export interface ResumenConductoresDiaResponse {
  success: boolean
  data: ResumenConductoresDia
}
