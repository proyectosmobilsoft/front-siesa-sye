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
  // Traslado de Fondos (caja -> caja): por ahora solo el rol Administrador
  // debe tener este permiso asignado en backend. Ver docs/traslado-fondos.md
  TRASLADO_FONDOS:        'TRASLADO_FONDOS',
  // Maestro Relación de Conceptos: asignado solo al rol Administrador
  CONCEPTOS:              'VER_CONCEPTOS',
  // Maestro de Maquinaria (BD Vehiman, solo lectura): solo rol Administrador
  MAQUINARIA:             'VER_MAQUINARIA',
  // Maestro de Cajas: asignado solo al rol Administrador
  CAJAS:                  'VER_CAJAS',
  // Maestro de Módulos y Permisos (catálogo de seguridad): solo Administrador
  MODULOS:                'VER_MODULOS',

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

  // --- Acciones sobre la Relación de Conceptos ---
  CREAR_CONCEPTO:         'CREAR_CONCEPTO',
  EDITAR_CONCEPTO:        'EDITAR_CONCEPTO',
  ELIMINAR_CONCEPTO:      'ELIMINAR_CONCEPTO',

  // --- Acciones sobre el Maestro de Cajas ---
  CREAR_CAJA:             'CREAR_CAJA',
  EDITAR_CAJA:            'EDITAR_CAJA',                        // Cubre editar y reactivar
  ELIMINAR_CAJA:          'ELIMINAR_CAJA',

  // --- Acciones sobre el maestro de Módulos y Permisos ---
  // Un solo juego cubre módulos y permisos: crear un permiso dentro de un
  // módulo es "crear" en ese maestro.
  CREAR_MODULO:           'CREAR_MODULO',
  EDITAR_MODULO:          'EDITAR_MODULO',
  ELIMINAR_MODULO:        'ELIMINAR_MODULO',
} as const

export type PermisoCodigo = typeof PERMISOS[keyof typeof PERMISOS]
