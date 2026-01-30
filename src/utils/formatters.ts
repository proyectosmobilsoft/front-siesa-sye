export const formatters = {
  currency: (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A'
    }
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  },

  number: (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A'
    }
    return new Intl.NumberFormat('es-CO').format(value)
  },

  date: (dateString: string | null | undefined): string => {
    if (!dateString || dateString === '') {
      return 'N/A'
    }
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  },

  dateOnly: (dateString: string | null | undefined): string => {
    if (!dateString || dateString === '') {
      return 'N/A'
    }
    // Extract just the date part (YYYY-MM-DD) to avoid timezone conversion issues
    // This is important for dates like "2026-01-29T00:00:00.000Z" which would
    // convert to the previous day in UTC-5 timezone
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!dateMatch) {
      return 'Fecha inválida'
    }
    const [, year, month, day] = dateMatch
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  },


  dateTime: (dateString: string | null | undefined): string => {
    if (!dateString || dateString === '') {
      return 'N/A'
    }
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Fecha inválida'
    }
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  },

  phone: (phone: string | null | undefined): string => {
    if (!phone || phone === '') {
      return 'N/A'
    }
    // Formatear número de teléfono colombiano
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
        6
      )}`
    }
    return phone
  },

  truncate: (text: string | null | undefined, length: number = 50): string => {
    if (!text || text === '') {
      return 'N/A'
    }
    if (text.length <= length) return text
    return text.slice(0, length) + '...'
  },

  capitalize: (text: string | null | undefined): string => {
    if (!text || text === '') {
      return 'N/A'
    }
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  },

  statusBadge: (
    status: string
  ): { text: string; variant: 'default' | 'secondary' | 'destructive' } => {
    const statusMap: Record<
      string,
      { text: string; variant: 'default' | 'secondary' | 'destructive' }
    > = {
      activo: { text: 'Activo', variant: 'default' },
      inactivo: { text: 'Inactivo', variant: 'secondary' },
      suspendido: { text: 'Suspendido', variant: 'destructive' },
      pendiente: { text: 'Pendiente', variant: 'secondary' },
    }
    return (
      statusMap[status.toLowerCase()] || { text: status, variant: 'default' }
    )
  },
}
