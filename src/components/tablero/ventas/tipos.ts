export interface Rango {
  desde: string
  hasta: string
}

export interface DashboardVentas {
  /** Venta del periodo por departamento del cliente (contacto principal en SIESA). Misma regla de venta, sin IVA. */
  por_departamento: {
    departamento: string
    venta: number
    kg: number
    participacion: number | null
    clientes: number
    ciudades: { nombre: string; venta: number }[]
    vendedores: { nombre: string; venta: number }[]
    lineas: { nombre: string; venta: number }[]
    top_clientes: { cliente: string; nit: string | null; ciudad: string | null; venta: number }[]
  }[]
  desde: string
  hasta: string
  periodo_anterior: Rango // mismo largo, inmediatamente antes
  anio_anterior: Rango // mismas fechas, un año antes
  fuente: {
    presupuesto: string // texto "fuente" del JSON
    anio_presupuesto: number // 2026
    clientes_excluidos: string[] // vacío desde 2026-10-17 (ALANG sí cuenta)
    meses_con_meta: number // fracción de meses del rango cubiertos por el presupuesto (ej. 9.5)
  }
  kpis: {
    venta: number
    venta_previa: number
    venta_anio_anterior: number
    meta: number | null // Σ meta mensual por línea×asesor prorrateada por días (null si el rango no toca 2026)
    cumplimiento: number | null // venta_asesores_con_meta / meta  (0.85 = 85 %)
    meta_gerencia: number | null // Σ meta mensual por asesor ("Meta para agosto") prorrateada
    cumplimiento_gerencia: number | null
    kg: number
    kg_lineas_kg: number // kg vendidos de las 5 líneas que se miden en kg
    meta_kg: number | null // Σ meta_kg prorrateada (Eternit, Supermastick, Torofil, Matecsa)
    cumplimiento_kg: number | null
    clientes: number // clientes distintos con venta > 0
    documentos: number // facturas + remisiones no facturadas distintas (sin notas)
    ticket_promedio: number // venta / documentos
    venta_sin_asesor_presupuesto: number // venta de vendedores sin meta (VENTAS CORPORATIVAS, SYE…)
    proyeccion_mes: null | {
      // solo si `hasta` cae en el mes en curso
      mes: string
      venta: number
      meta: number | null
      dias_transcurridos: number
      dias_mes: number
      proyeccion: number // venta / dias_transcurridos * dias_mes (días calendario)
    }
  }
  mensual: {
    mes: string
    venta: number
    meta: number | null
    kg: number
    venta_anio_anterior: number
  }[]
  grupos: {
    id: string
    nombre: string
    venta: number
    venta_previa: number
    meta: number | null
    cumplimiento: number | null
    meta_gerencia: number | null
  }[]
  asesores: {
    nombre: string
    grupo: string | null // null = sin grupo (no está en el presupuesto)
    venta: number
    venta_previa: number
    meta: number | null
    cumplimiento: number | null
    meta_gerencia: number | null
    cumplimiento_gerencia: number | null
    clientes: number
    kg: number
  }[] // ordenado por venta desc
  centros: {
    id: string
    nombre: string
    venta: number
    venta_previa: number
    participacion: number
    vendedores: {
      nombre: string
      grupo: string | null
      venta: number
      venta_previa: number
    }[]
  }[]
  lineas: {
    id: string
    nombre: string
    mide_kg: boolean
    venta: number
    venta_previa: number
    meta: number | null
    cumplimiento: number | null
    kg: number
    meta_kg: number | null
    cumplimiento_kg: number | null
    /** Knauf se presupuesta en unidades (CANTIDAD), no en kilos. */
    mide_unidades: boolean
    unidades: number
    meta_unidades: number | null
    cumplimiento_unidades: number | null
    valor_kg: number | null // venta / kg (precio promedio por kilo)
  }[] // orden del presupuesto (26 líneas)
  matriz: {
    asesor: string
    linea: string
    venta: number
    meta: number | null
    cumplimiento: number | null
  }[]
  proveedores: {
    proveedor: string
    venta: number
    kg: number
    participacion: number // venta / venta total
    venta_previa: number
    mensual: { mes: string; venta: number }[]
  }[] // top 30 por venta; el resto agregado en una fila "OTROS PROVEEDORES"
  cobertura: {
    lineas_foco: { id: string; nombre: string }[] // KNAUF, ETERNIT, SUPERMASTICK, MATECSA (como Hoja2 del Excel de ventas)
    asesores: {
      asesor: string
      grupo: string | null
      clientes: number
      con_1: number
      con_2: number
      con_3: number
      con_4: number
    }[]
    clientes: {
      cliente: string
      nit: string | null
      asesor: string
      grupo: string | null
      venta: number
      venta_foco: number
      lineas_foco: string[]
    }[] // top 20 por venta_foco
  }
  descuento_pp: {
    canal: string
    tramo: string
    dias_desde: number
    proveedor: string
    porcentaje: number
  }[] // tabla estática del JSON
}

export interface DashboardCompras {
  desde: string
  hasta: string
  periodo_anterior: Rango
  kpis: {
    compra: number
    devoluciones: number
    compra_neta: number
    compra_neta_previa: number
    kg: number
    proveedores: number
    documentos: number
    tasa_devolucion: number | null
  }
  mensual: { mes: string; compra: number; devoluciones: number; compra_neta: number; kg: number }[]
  proveedores: {
    proveedor: string
    nit: string | null
    compra: number
    devoluciones: number
    compra_neta: number
    participacion: number
    compra_neta_previa: number
    documentos: number
    kg: number
    mensual: { mes: string; compra_neta: number }[]
  }[]
  marcas: { marca: string; compra_neta: number }[]
}

export type LecturaInventario = 'consume' | 'acumula' | 'equilibrada' | 'sin_movimiento'

export interface DashboardInventario {
  desde: string
  hasta: string
  dias_lento: number
  kpis: {
    existencia: number
    items: number
    compra_neta: number
    costo_ventas: number
    variacion_inventario: number
    valor_lento: number
    participacion_lento: number | null
    valor_sin_venta: number
    meses_cobertura: number | null
    lineas_consumen: number
    lineas_acumulan: number
    lineas_equilibradas: number
    items_negativos: number
  }
  mensual: { mes: string; compra_neta: number; costo_ventas: number; variacion_inventario: number }[]
  lineas: {
    proveedor: string
    lectura: LecturaInventario
    compra_neta: number
    venta: number
    costo_ventas: number
    variacion_inventario: number
    existencia: number
    items: number
    cantidad: number
    inventario_inicial_estimado: number
    cobertura_acumulacion: number | null
    meses_cobertura: number | null
    valor_lento: number
    valor_sin_venta: number
    negativos: number
  }[]
  bodegas: { codigo: string; bodega: string; cantidad: number; valor: number; vendible: boolean }[]
}

export interface PuntoCurvaCartera { dias: number; acumulado: number; porcentaje: number }

export interface CumplimientoCartera {
  facturas: number
  valor: number
  a_tiempo: { facturas: number; valor: number }
  tarde: { facturas: number; valor: number }
  impaga_vencida: { facturas: number; valor: number }
  por_vencer: { facturas: number; valor: number }
  a_tiempo_pct: number | null
  a_tiempo_valor_pct: number | null
}

export interface ClienteCartera {
  tercero: number
  cliente: string | null
  nit: string | null
  facturas: number
  a_tiempo: number
  tarde: number
  impagas: number
  a_tiempo_pct: number | null
  valor: number
  vencido: number
  pagado_tarde: number
  dias_retraso_promedio: number | null
  dias_mora: number
}

export type EstadoFacturaCartera = 'a_tiempo' | 'tarde' | 'impaga_vencida' | 'por_vencer' | 'pagada'

export interface FacturaCartera {
  id: number
  factura: string
  tercero: number
  cliente: string | null
  nit: string | null
  emision: string | null
  vencimiento: string | null
  cancelacion: string | null
  condicion: string
  condicion_nombre: string
  dias: number
  valor: number
  saldo: number
  estado: EstadoFacturaCartera
  dias_pago: number | null
  dias_vs_vencimiento: number | null
}

export interface RespuestaFacturasCartera {
  pagina: number
  tamano: number
  total: number
  totales: { valor: number; saldo: number; clientes: number }
  /** Los 8 clientes con más valor dentro del filtro. */
  top_clientes?: { tercero: number; cliente: string | null; facturas: number; valor: number; saldo: number }[]
  /** Días de atraso frente al vencimiento (pagadas: hasta el pago; abiertas: hasta hoy). tramo 0 = a tiempo, 999 = más de 90. */
  atraso?: { tramo: number; nombre: string; facturas: number; valor: number }[]
  filas: FacturaCartera[]
}

export interface PlazoCartera {
  dias: number
  nombre: string
  condiciones?: string[]
  condicion?: string
  credito: boolean
  facturas: number
  facturado: number
  cobrado: number
  saldo: number
  vencido: number
  cobrado_pct: number | null
  dias_pago: number | null
  desviacion_dias: number | null
  pagado_a_tiempo_pct: number | null
  cumplimiento: CumplimientoCartera
  curva: PuntoCurvaCartera[]
}

export interface LoteCartera { id: string; nombre: string; desde: number; hasta: number | null; facturas: number; saldo: number }

/** Documento con una condición de pago que no corresponde a su tipo (ej. C01 de mostrador a crédito 30 días). */
export interface DocumentoErroneoCartera {
  co: string
  tipo: string
  consecutivo: number
  fecha: string
  cliente: string | null
  nit: string | null
  condicion: string
  condicion_nombre: string | null
  valor: number
}

/** Estados de una contraentrega frente a su pago (GET /dashboard/cartera/casos). */
export type EstadoContraentrega = 'a_tiempo' | 'tarde_30' | 'tarde_mas_30' | 'sin_pagar' | 'por_vencer' | 'pagada'

export interface TotalesContraentrega {
  documentos: number
  valor: number
  estados: Record<EstadoContraentrega, { documentos: number; valor: number }>
  /** Casos a seguir: pagadas después de `dias_tarde` días + vencidas sin pagar. */
  problema_documentos: number
  problema_pct: number | null
  problema_valor_pct: number | null
}

export interface CasoContraentrega {
  tercero: number
  cliente: string | null
  nit: string | null
  tipo: string
  consecutivo: number
  condicion: string
  condicion_nombre: string
  fecha: string
  vence: string
  pagada_el: string | null
  estado: 'tarde_mas_30' | 'sin_pagar'
  /** Días desde la emisión hasta el pago (o hasta hoy si no ha pagado). */
  dias: number
  valor: number
  saldo: number
}

export interface CasosCartera {
  desde: string
  hasta: string
  dias_tarde: number
  contraentrega: TotalesContraentrega & {
    por_condicion: (TotalesContraentrega & { condicion: string; nombre: string })[]
    mensual: (TotalesContraentrega & { mes: string })[]
    clientes: { tercero: number; cliente: string | null; nit: string | null; documentos: number; tarde_mas_30: number; sin_pagar: number; valor: number; saldo: number; dias_promedio: number | null }[]
    casos: CasoContraentrega[]
  }
  c01: {
    documentos: number
    valor: number
    por_condicion: { condicion: string; nombre: string | null; dias: number | null; documentos: number; valor: number; clase: 'contado' | 'contraentrega' | 'credito_valido' | 'credito_erroneo'; pct: number | null }[]
    erroneas_documentos: number
    erroneas_pct: number | null
    erroneas_valor: number
    credito_valido: string[]
    documentos_erroneos: DocumentoErroneoCartera[]
  }
}

export interface DashboardCartera {
  desde: string
  hasta: string
  umbral_credito_dias: number
  kpis: {
    facturado: number
    venta_credito: number
    venta_credito_bruto: number
    venta_credito_restas: number
    /** Vendido a crédito neto del vendedor DISTRIBUCIONES SYE (otra área): no está en venta_credito. */
    venta_credito_otra_area: number
    venta_neta: number
    credito_pct: number | null
    plazo_promedio: number | null
    dias_pago_promedio: number | null
    pagado_a_tiempo_pct: number | null
    cobrado_credito: number
    saldo_credito: number
    vencido_credito: number
    cartera_abierta: number
    vencida: number
    vencida_pct: number | null
    vence_30: number
    vence_60: number
  }
  venta_credito: {
    desglose: { tipo: string; resta: boolean; documentos: number; valor: number }[]
    errores: DocumentoErroneoCartera[]
    c01_credito_valido: string[]
    otra_area: { nit: string; venta_credito: number; desglose: { tipo: string; resta: boolean; documentos: number; valor: number }[] }
  }
  /** Línea de tiempo: 12 meses que terminan en el mes de `hasta` (no depende de `desde`). Sin DISTRIBUCIONES SYE. */
  historia: {
    mes: string
    /** Vendido a crédito neto (con IVA, menos notas y devoluciones), igual que kpis.venta_credito. */
    vendido_credito: number
    venta_neta: number
    credito_pct: number | null
    documentos_credito: number
    /** Abonos recibidos en el mes a facturas de crédito (de cualquier emisión; sin RMA). */
    recaudo_credito: number
    /** Lo vendido a crédito ese mes que hoy sigue vencido sin pagar. */
    vencido_hoy: number
    facturas_vencidas_hoy: number
  }[]
  /** Cartera vendida antes del corte (2023): fuera de todos los totales, para depurar. */
  cartera_antigua: { corte: string; saldo: number; facturas: number; clientes: { tercero: number; cliente: string | null; nit: string | null; facturas: number; saldo: number; desde: string; hasta: string }[] }
  /** Facturas a crédito vencidas hoy por mes de venta (año en curso) o año (anteriores). Saldo de hoy. */
  vencidas_por_venta: { periodo: string; facturas: number; clientes: number; saldo: number }[]
  plazos: PlazoCartera[]
  condiciones: PlazoCartera[]
  vencida: LoteCartera[]
  por_vencer: LoteCartera[]
  semanas: { semana: number; desde_dias: number; saldo: number }[]
  mensual: { mes: string; facturado_credito: number; recaudo_credito: number }[]
  deudores: { tercero: number; cliente: string | null; nit: string | null; facturas: number; vencido: number; dias_mora: number }[]
}

/** Plata en la calle y descuento financiero (GET /dashboard/cartera/descuentos). */
export type ClaseCondicion = 'credito' | 'contraentrega' | 'contado' | 'sin_condicion'
export interface DescuentosCartera {
  desde: string
  hasta: string
  calle: {
    saldo: number
    vencido: number
    documentos: number
    vencido_pct: number | null
    por_clase: { clase: ClaseCondicion; saldo: number; vencido: number; documentos: number; pct: number | null }[]
    por_condicion: { condicion: string; nombre: string; dias: number | null; clase: ClaseCondicion; documentos: number; clientes: number; saldo: number; vencido: number; pct: number | null }[]
    otra_area: { nit: string; saldo: number; vencido: number; documentos: number }
  }
  descuento: {
    total: number
    valor_con_descuento: number
    tasa_efectiva: number | null
    tomaron: number
    documentos: number
    tomaron_pct: number | null
    dias_con: number | null
    dias_sin: number | null
    mensual: { mes: string; descuento: number; recaudo: number; documentos: number; pct: number | null }[]
    por_condicion: {
      condicion: string; nombre: string; dias: number | null; clase: ClaseCondicion; documentos: number; valor: number; pagadas: number
      tomaron: number; tomaron_pct: number | null; descuento: number; tasa_efectiva: number | null
      dias_con: number | null; dias_sin: number | null; dias_ganados: number | null
    }[]
  }
}

/** Cuadre de cartera del periodo (GET /dashboard/cartera/saldos): saldo anterior + facturado − abonos = saldo final. */
export type GrupoAbono = 'recaudo' | 'cruces' | 'notas' | 'ajustes' | 'otros'
export interface CuadreCartera {
  saldo_anterior: number
  documentos_anterior: number
  vencido_anterior: number
  facturado: number
  facturado_periodo: number
  abonos_saldo_anterior: Record<GrupoAbono | 'total', number>
  abonos_periodo: Record<GrupoAbono | 'total', number>
  abonos_total: Record<GrupoAbono | 'total', number>
  /** Recibos de caja aplicados a deudas del saldo anterior ÷ saldo anterior. */
  cobrado_anterior_pct: number | null
  bajo_anterior_pct: number | null
  saldo_final: number
  documentos_final: number
  saldo_final_de_anterior: number
  saldo_final_del_periodo: number
  vencido_final: number
}
export interface SaldosCartera extends CuadreCartera {
  desde: string
  hasta: string
  grupos: GrupoAbono[]
  /** Ventas corporativas (vendedores 0001 y 9897), fuera de los totales. */
  otra_area: CuadreCartera & { nit: string }
}
