import { apiClient } from '@/api/client'

/**
 * Abre en una pestaña nueva el PDF del recibo de caja (formato RC0000 con la
 * descripción del auxiliar). `rowid` es el Rowid del documento, el mismo que
 * devuelve el listado de recibos. La pestaña se abre antes de pedir el PDF para
 * que el navegador no la bloquee como ventana emergente.
 */
export async function abrirPdfRC(rowid: number): Promise<void> {
  const ventana = window.open('', '_blank')
  try {
    const res = await apiClient.get<Blob>(`/recibo-caja/${rowid}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    if (ventana) ventana.location.href = url
    else window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000)
  } catch (err) {
    ventana?.close()
    throw err
  }
}

/**
 * Abre en una pestaña nueva un solo PDF con varios recibos de caja; cada uno va seguido de las
 * confirmaciones de transferencia amarradas a él. Con `soportes` el API agrega las fotos de las
 * transferencias (solo si el usuario puede verlas).
 */
export async function abrirPdfRCs(rowids: number[], opciones: { soportes?: boolean } = {}): Promise<void> {
  const ventana = window.open('', '_blank')
  try {
    const res = await apiClient.post<Blob>('/recibo-caja/pdf', { rowids, soportes: opciones.soportes === true }, { responseType: 'blob', timeout: 5 * 60 * 1000 })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    if (ventana) ventana.location.href = url
    else window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000)
  } catch (err) {
    ventana?.close()
    throw err
  }
}
