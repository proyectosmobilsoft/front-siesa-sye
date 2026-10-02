// Campos confirmados contra el SP real (sp_cons_est_cta_saldo_doct), viendo el
// mapeo que ya hace flutter-siesa (FacturaModel.fromJson): rowidsa, saldo
// (a veces string con coma decimal), doccruce ("BQE-00026024-000" → número
// de factura en la parte del medio).
export interface FacturaPendiente {
    rowid_sa: number
    numero: string | null
    prefijo: string | null
    valor: number
    peso_kg: number
    fecha: string | null
    vence: string | null
    idco: string | null
    idtercero: number | null
    nit: string | null
    razon: string | null
    raw: Record<string, unknown>
}

/** 1234.5 → "1.234,5 kg". */
export function formatearPeso(kg: number): string {
    return `${kg.toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg`
}

/** "2025-06-30 00:00:00.000" → "30/06/2025". */
export function formatearFecha(valor: string | null): string {
    if (!valor) return '—'
    const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(valor)
}

/** "BQE-00026024", o solo el número si no hay prefijo, o SA-<rowid> si no hay nada. */
export function formatearFacturaPendiente(f: FacturaPendiente): string {
    if (f.prefijo && f.numero) return `${f.prefijo}-${f.numero}`
    if (f.numero) return f.numero
    return `SA-${f.rowid_sa}`
}

export function primerValor<T = unknown>(row: Record<string, unknown>, claves: string[]): T | undefined {
    for (const k of claves) {
        if (row[k] !== undefined && row[k] !== null) return row[k] as T
    }
    return undefined
}

/** Soporta tanto número plano como string con coma decimal ("10000,00"). */
export function parseValor(valor: unknown): number {
    if (valor == null) return 0
    if (typeof valor === 'number') return valor
    const limpio = String(valor).trim().replace(',', '.')
    const n = Number(limpio)
    return Number.isFinite(n) ? n : 0
}

export function normalizarFactura(row: Record<string, unknown>): FacturaPendiente | null {
    const rowidSa = primerValor<number>(row, ['rowidsa', 'rowid_sa', 'RowIdSa', 'RowidSA'])
    if (rowidSa == null) return null

    const doccruce = primerValor<string>(row, ['doccruce'])
    let numero: string | null = null
    let prefijo: string | null = null
    if (doccruce) {
        const partes = doccruce.split('-')
        if (partes.length >= 2) {
            prefijo = partes[0]
            numero = partes[1]
        } else {
            numero = doccruce
        }
    }
    if (!numero) {
        const fallback = primerValor<number | string>(row, ['numero', 'consecutivo', 'nro_docto', 'numero_docto', 'Numero'])
        numero = fallback != null ? String(fallback) : null
    }
    if (!prefijo) {
        const fallbackPrefijo = primerValor<string>(row, ['tipo', 'idTipoDocto', 'prefijo', 'Tipo'])
        prefijo = fallbackPrefijo ?? null
    }

    const valorRaw = primerValor(row, ['saldo', 'valor', 'vlr_saldo', 'valor_saldo', 'Valor', 'Saldo'])
    const fecha = primerValor<string>(row, ['fecha', 'Fecha'])
    const vence = primerValor<string>(row, ['fecha_vcto_docto', 'vencimiento', 'fecha_vcto'])
    const idco = primerValor<string>(row, ['idco', 'IdCo', 'id_co'])
    const idTercero = primerValor<number>(row, ['idtercero', 'rowidTercero', 'rowid_tercero'])
    const nit = primerValor<string>(row, ['nittercero'])
    const razon = primerValor<string>(row, ['razontercero'])
    return {
        rowid_sa: Number(rowidSa),
        numero,
        prefijo,
        valor: parseValor(valorRaw),
        peso_kg: parseValor(primerValor(row, ['peso_kg'])),
        fecha: fecha != null ? String(fecha) : null,
        vence: vence != null ? String(vence) : null,
        idco: idco != null ? String(idco) : null,
        idtercero: idTercero != null ? Number(idTercero) : null,
        nit: nit != null ? String(nit) : null,
        razon: razon != null ? String(razon) : null,
        raw: row,
    }
}

/** Texto de factura para búsqueda: prefijo+número sin ceros a la izquierda, ej. "BQE31742". */
export function coincideBusquedaFactura(f: FacturaPendiente, consulta: string): boolean {
    const q = consulta.trim().toUpperCase()
    if (!q) return true
    const numero = (f.numero ?? '').replace(/^0+/, '')
    const prefijo = (f.prefijo ?? '').toUpperCase()

    // "BQE-31742", "BQE 31742", "BQE31742"
    const conPrefijo = q.match(/^([A-Z]+)[\s-]*0*(\d+)$/)
    if (conPrefijo) return prefijo.startsWith(conPrefijo[1]) && numero.includes(conPrefijo[2])

    // Solo dígitos: número de factura, con o sin ceros
    const soloNumero = q.match(/^0*(\d+)$/)
    if (soloNumero) return numero.includes(soloNumero[1])

    // "BQE-": solo prefijo
    const soloPrefijo = q.match(/^([A-Z]+)[\s-]*$/)
    if (soloPrefijo && prefijo.startsWith(soloPrefijo[1])) return true

    // Texto libre: cliente o NIT
    return (f.razon ?? '').toUpperCase().includes(q) || (f.nit ?? '').includes(q)
}
