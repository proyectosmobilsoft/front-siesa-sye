/**
 * Códigos de permisos — coinciden exactamente con los del backend (/auth-secundario/permisos).
 *
 * Módulos del frontend que aún no tienen permiso en el backend son visibles
 * para todos los usuarios autenticados (sin restricción).
 */
export const PERMISOS = {
  // --- Vistas / acceso a páginas ---
  DASHBOARD:              'VER_DASHBOARD',
  EGRESO:                 'VER_ANTICIPO',                       // Página de anticipos / egresos
  GESTION_VENTAS:         'VER_RECIBO',                         // Recibos de cartera
  VIATICOS:               'VER_VIATICO',
  LEGALIZACION_ANTICIPO:  'VER_LEGALIZACION_ANTICIPO',
  CONDUCTOR:              'MODULO_CONDUCTOR',

  // --- Acciones sobre anticipos ---
  CREAR_ANTICIPO:         'CREAR_ANTICIPO',
  EDITAR_ANTICIPO:        'EDITAR_ANTICIPO',
  ELIMINAR_ANTICIPO:      'ELIMINAR_ANTICIPO',
  APROBAR_ANTICIPO:       'APROBAR_ANTICIPO',
  DISTRIBUIR_ANTICIPO:    'DISTRIBUIR_ANTICIPO',
  DESEMBOLSAR_ANTICIPO:   'DESEMBOLSAR_ANTICIPO',
  LEGALIZAR_ANTICIPO:     'LEGALIZAR_ANTICIPO',
  REVISAR_LEGALIZACION:   'REVISAR_LEGALIZACION',
  ENVIAR_CONTABILIDAD:    'ENVIAR_CONTABILIDAD',
  NOTIFICACIONES:         'VER_NOTIFICACIONES_ANTICIPO',

  // --- Tabs dentro de la página de anticipos ---
  TAB_PENDIENTE:          'VER_ANTICIPO_TAB_PENDIENTE',
  TAB_APROBADA:           'VER_ANTICIPO_TAB_APROBADA',
  TAB_EN_DISTRIBUCION:    'VER_ANTICIPO_TAB_EN_DISTRIBUCION',
  TAB_ENVIADO_CONTA:      'VER_ANTICIPO_TAB_ENVIADO_CONTABILIDAD',
  TAB_LEGALIZACION:       'VER_ANTICIPO_TAB_LEGALIZACION',
  TAB_RECHAZADA:          'VER_ANTICIPO_TAB_RECHAZADA',

  // --- Recibos ---
  CREAR_RECIBO:           'CREAR_RECIBO',
  CONDICION_PAGO_RECIBO:  'SELECCIONAR_CONDICION_PAGO_RECIBO',

  // --- Viáticos ---
  CREAR_VIATICO:          'CREAR_VIATICO',
} as const

export type PermisoCodigo = typeof PERMISOS[keyof typeof PERMISOS]
