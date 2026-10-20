export function duracion(segundos: number | null | undefined) {
  if (segundos == null || !Number.isFinite(Number(segundos))) return '—'
  const total = Math.max(0, Math.floor(Number(segundos)))
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const resto = total % 60
  return [horas && `${horas} h`, minutos && `${minutos} min`, `${resto} s`].filter(Boolean).join(' ')
}

export function esperaActual(fecha: string, ahora: number) {
  const enviado = new Date(fecha).getTime()
  return Number.isFinite(enviado) ? Math.max(0, Math.floor((ahora - enviado) / 60000)) : 0
}
