export interface Rango {
  desde: string
  hasta: string
}

export interface DashboardVentas {
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
