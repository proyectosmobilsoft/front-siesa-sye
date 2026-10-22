import { API_CONFIG } from '@/config/api'

export type EventoServidor = (evento: string, datos: unknown) => void

/** Mantiene un stream SSE autenticado hasta que se llame la función de limpieza. */
export function conectarEventos(onEvento: EventoServidor): () => void {
  let detenido = false
  let controller: AbortController | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let espera = 1_000
  let errores401 = 0

  const conectar = async () => {
    const token = localStorage.getItem('auth_token')
    if (detenido || !token) return

    controller = new AbortController()
    try {
      const respuesta = await fetch(`${API_CONFIG.BASE_URL.replace(/\/+$/, '')}/eventos/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
        cache: 'no-store',
      })

      if (respuesta.status === 401) {
        errores401++
        if (errores401 >= 3) return
        throw new Error('Stream no autorizado')
      }
      errores401 = 0
      if (!respuesta.ok || !respuesta.body) throw new Error(`Stream HTTP ${respuesta.status}`)
      espera = 1_000

      const lector = respuesta.body.getReader()
      const decoder = new TextDecoder()
      let pendiente = ''
      let evento = ''
      let datos: string[] = []

      const procesarLinea = (linea: string) => {
        if (linea === '') {
          if (datos.length) {
            try { onEvento(evento || 'message', JSON.parse(datos.join('\n')) as unknown) }
            catch { /* Un evento inválido no cierra el stream. */ }
          }
          evento = ''
          datos = []
        } else if (!linea.startsWith(':')) {
          const separador = linea.indexOf(':')
          const campo = separador < 0 ? linea : linea.slice(0, separador)
          let valor = separador < 0 ? '' : linea.slice(separador + 1)
          if (valor.startsWith(' ')) valor = valor.slice(1)
          if (campo === 'event') evento = valor
          if (campo === 'data') datos.push(valor)
        }
      }

      const procesarTexto = (texto: string) => {
        pendiente += texto
        let fin = pendiente.indexOf('\n')
        while (fin >= 0) {
          const linea = pendiente.slice(0, fin).replace(/\r$/, '')
          pendiente = pendiente.slice(fin + 1)
          procesarLinea(linea)
          fin = pendiente.indexOf('\n')
        }
      }

      while (!detenido) {
        const { done, value } = await lector.read()
        if (done) break
        procesarTexto(decoder.decode(value, { stream: true }))
      }
      procesarTexto(decoder.decode())
    } catch {
      // Los fallos de red y del stream se recuperan con reconexión; el polling sigue activo.
    } finally {
      controller = undefined
      if (!detenido && errores401 < 3) {
        const demora = Math.min(30_000, espera * (0.8 + Math.random() * 0.4))
        espera = Math.min(30_000, espera * 2)
        timer = setTimeout(() => { void conectar() }, demora)
      }
    }
  }

  void conectar()
  return () => {
    detenido = true
    if (timer) clearTimeout(timer)
    controller?.abort()
  }
}
