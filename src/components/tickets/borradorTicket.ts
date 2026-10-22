import type { CategoriaTicket, PrioridadTicket } from '@/api/tickets'

// El borrador del ticket se guarda en el navegador: los textos en localStorage y las capturas (archivos pesados) en IndexedDB,
// así sobreviven a cerrar el modal, cambiar de pantalla, recargar o cerrar la pestaña hasta que el ticket se envíe o se descarte.
export interface TextosBorrador { categoria: CategoriaTicket; prioridad: PrioridadTicket; titulo: string; descripcion: string }
export interface BorradorTicket extends TextosBorrador { capturas: File[] }

const BD = 'sye-tickets'
const TIENDA = 'borradores'
const claveTextos = (usuario: string | number) => `ticket-borrador:${usuario}`

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(BD, 1)
    peticion.onupgradeneeded = () => { peticion.result.createObjectStore(TIENDA) }
    peticion.onsuccess = () => resolve(peticion.result)
    peticion.onerror = () => reject(peticion.error)
  })
}

async function conTienda<T>(modo: IDBTransactionMode, accion: (tienda: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir()
  try {
    return await new Promise<T>((resolve, reject) => {
      const peticion = accion(bd.transaction(TIENDA, modo).objectStore(TIENDA))
      peticion.onsuccess = () => resolve(peticion.result)
      peticion.onerror = () => reject(peticion.error)
    })
  } finally { bd.close() }
}

export async function guardarBorrador(usuario: string | number, borrador: BorradorTicket): Promise<void> {
  try {
    const { capturas, ...textos } = borrador
    if (!textos.titulo && !textos.descripcion && !capturas.length) { await borrarBorrador(usuario); return }
    localStorage.setItem(claveTextos(usuario), JSON.stringify(textos))
    await conTienda('readwrite', tienda => tienda.put(capturas.map(f => ({ nombre: f.name, tipo: f.type, blob: f })), String(usuario)))
  } catch { /* El navegador puede bloquear el almacenamiento (modo privado o sin espacio): el borrador queda solo en memoria. */ }
}

export async function leerBorrador(usuario: string | number): Promise<BorradorTicket | null> {
  try {
    const crudo = localStorage.getItem(claveTextos(usuario))
    const textos = crudo ? JSON.parse(crudo) as TextosBorrador : null
    const guardadas = await conTienda<{ nombre: string; tipo: string; blob: Blob }[] | undefined>('readonly', tienda => tienda.get(String(usuario)))
    const capturas = (guardadas ?? []).map(c => new File([c.blob], c.nombre, { type: c.tipo }))
    if (!textos && !capturas.length) return null
    return { categoria: textos?.categoria ?? 'soporte', prioridad: textos?.prioridad ?? 'media', titulo: textos?.titulo ?? '', descripcion: textos?.descripcion ?? '', capturas }
  } catch { return null }
}

export async function borrarBorrador(usuario: string | number): Promise<void> {
  try {
    localStorage.removeItem(claveTextos(usuario))
    await conTienda('readwrite', tienda => tienda.delete(String(usuario)))
  } catch { /* nada que limpiar */ }
}
