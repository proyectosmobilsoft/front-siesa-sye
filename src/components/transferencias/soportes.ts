export function validarSoportes(nuevos: File[], actuales: number) {
  if (actuales + nuevos.length > 10) return 'Máximo 10 soportes.'
  if (nuevos.some(file => !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type))) return 'Solo se admiten JPG, PNG, WEBP o PDF.'
  if (nuevos.some(file => file.size > 10 * 1024 * 1024)) return 'Cada soporte debe pesar máximo 10 MB.'
  return ''
}
