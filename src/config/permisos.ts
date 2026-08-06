/**
 * Códigos de permisos — coinciden exactamente con los del backend
 * (tablas auth_modulos / auth_permisos, expuestas en /auth-secundario/permisos).
 *
 * Cada módulo tiene un permiso de VISTA (VER_*) y, si el módulo permite
 * modificar datos, un permiso de ACCION por operación. Todo el catálogo está
 * asignado al rol ADMINISTRADOR salvo MODULO_CONDUCTOR, que es un marcador de
 * tipo de usuario y no una capacidad.
 *
 * Ojo: tener el código aquí NO restringe nada por sí solo. Restringe cuando se
 * usa en <ProtectedRoute permiso={...}>, en `permiso` del menú (navigation.ts)
 * o con usePermiso().puede(...) alrededor de un botón.
 */
export const PERMISOS = {
  // ─── Vistas / acceso a páginas ───
  DASHBOARD:              'VER_DASHBOARD',
  EGRESO:                 'VER_ANTICIPO',                       // Página de anticipos / egresos
  GESTION_VENTAS:         'VER_RECIBO',                         // Recibos de cartera
  VIATICOS:               'VER_VIATICO',
  LEGALIZACION_ANTICIPO:  'VER_LEGALIZACION_ANTICIPO',
  CONDUCTOR:              'MODULO_CONDUCTOR',
  TRASLADO_FONDOS:        'TRASLADO_FONDOS',
  CONCEPTOS:              'VER_CONCEPTOS',
  MAQUINARIA:             'VER_MAQUINARIA',
  CAJAS:                  'VER_CAJAS',
  MODULOS:                'VER_MODULOS',
  USUARIOS:               'VER_USUARIOS',
  ROLES:                  'VER_ROLES',
  DESCUENTOS:             'VER_DESCUENTOS',
  CLIENTES:               'VER_CLIENTES',
  PRODUCTOS:              'VER_PRODUCTOS',
  PEDIDOS:                'VER_PEDIDOS',
  FERREGANGA:             'VER_FERREGANGA',
  ANALISIS_FINANCIERO:    'VER_ANALISIS_FINANCIERO',
  REPORTE_PEDIDOS:        'VER_REPORTE_PEDIDOS',
  REPORTE_VENTAS:         'VER_REPORTE_VENTAS',
  REPORTE_VENDEDORES:     'VER_REPORTE_VENDEDORES',
  RECIBO_CAJA:            'VER_RECIBO_CAJA',
  ENTREGA_RECAUDO:        'VER_ENTREGA_RECAUDO',
  CONFIGURACION:          'VER_CONFIGURACION',
  INTERFAZ_CONTABLE:      'VER_INTERFAZ_CONTABLE',

  // ─── Acciones sobre anticipos ───
  CREAR_ANTICIPO:         'CREAR_ANTICIPO',
  EDITAR_ANTICIPO:        'EDITAR_ANTICIPO',
  ELIMINAR_ANTICIPO:      'ELIMINAR_ANTICIPO',
  APROBAR_ANTICIPO:       'APROBAR_ANTICIPO',
  DISTRIBUIR_ANTICIPO:    'DISTRIBUIR_ANTICIPO',
  DESEMBOLSAR_ANTICIPO:   'DESEMBOLSAR_ANTICIPO',
  LEGALIZAR_ANTICIPO:     'LEGALIZAR_ANTICIPO',
  REVISAR_LEGALIZACION:   'REVISAR_LEGALIZACION',
  APROBAR_LEGALIZACION:   'APROBAR_LEGALIZACION',
  ENVIAR_CONTABILIDAD:    'ENVIAR_CONTABILIDAD',
  NOTIFICACIONES:         'VER_NOTIFICACIONES_ANTICIPO',

  // ─── Tabs dentro de la página de anticipos ───
  TAB_PENDIENTE:          'VER_ANTICIPO_TAB_PENDIENTE',
  TAB_APROBADA:           'VER_ANTICIPO_TAB_APROBADA',
  TAB_EN_DISTRIBUCION:    'VER_ANTICIPO_TAB_EN_DISTRIBUCION',
  TAB_ENVIADO_CONTA:      'VER_ANTICIPO_TAB_ENVIADO_CONTABILIDAD',
  TAB_LEGALIZACION:       'VER_ANTICIPO_TAB_LEGALIZACION',
  TAB_RECHAZADA:          'VER_ANTICIPO_TAB_RECHAZADA',

  // ─── Recibos de cartera ───
  CREAR_RECIBO:           'CREAR_RECIBO',
  CONDICION_PAGO_RECIBO:  'SELECCIONAR_CONDICION_PAGO_RECIBO',

  // ─── Viáticos ───
  CREAR_VIATICO:          'CREAR_VIATICO',

  // ─── Relación de Conceptos ───
  CREAR_CONCEPTO:         'CREAR_CONCEPTO',
  EDITAR_CONCEPTO:        'EDITAR_CONCEPTO',
  ELIMINAR_CONCEPTO:      'ELIMINAR_CONCEPTO',

  // ─── Maestro de Cajas ───
  CREAR_CAJA:             'CREAR_CAJA',
  EDITAR_CAJA:            'EDITAR_CAJA',                        // Cubre editar y reactivar
  ELIMINAR_CAJA:          'ELIMINAR_CAJA',

  // ─── Módulos y Permisos ───
  // Un solo juego cubre módulos y permisos: crear un permiso dentro de un
  // módulo es "crear" en ese maestro.
  CREAR_MODULO:           'CREAR_MODULO',
  EDITAR_MODULO:          'EDITAR_MODULO',
  ELIMINAR_MODULO:        'ELIMINAR_MODULO',

  // ─── Maestro de Usuarios ───
  CREAR_USUARIO:          'CREAR_USUARIO',
  EDITAR_USUARIO:         'EDITAR_USUARIO',
  ELIMINAR_USUARIO:       'ELIMINAR_USUARIO',

  // ─── Maestro de Roles ───
  CREAR_ROL:              'CREAR_ROL',
  EDITAR_ROL:             'EDITAR_ROL',
  ELIMINAR_ROL:           'ELIMINAR_ROL',

  // ─── Descuentos Financieros ───
  CREAR_DESCUENTO:        'CREAR_DESCUENTO',
  EDITAR_DESCUENTO:       'EDITAR_DESCUENTO',
  ELIMINAR_DESCUENTO:     'ELIMINAR_DESCUENTO',

  // ─── Ferreganga (campañas) ───
  CREAR_CAMPANIA:         'CREAR_CAMPANIA',
  EDITAR_CAMPANIA:        'EDITAR_CAMPANIA',
  ELIMINAR_CAMPANIA:      'ELIMINAR_CAMPANIA',

  // ─── Análisis Financiero ───
  EXPORTAR_ANALISIS:      'EXPORTAR_ANALISIS_FINANCIERO',

  // ─── Entrega de Recaudo ───
  CONFIRMAR_ENTREGA:      'CONFIRMAR_ENTREGA_RECAUDO',
  RESOLVER_DIFERENCIA:    'RESOLVER_DIFERENCIA_RECAUDO',
  EXPORTAR_ENTREGA:       'EXPORTAR_ENTREGA_RECAUDO',

  // ─── Traslado de Fondos ───
  CREAR_TRASLADO_FONDOS:  'CREAR_TRASLADO_FONDOS',

  // ─── Interfaz Contable Vehículos ───
  CREAR_INTERFAZ_CONTABLE:    'CREAR_INTERFAZ_CONTABLE',
  EDITAR_INTERFAZ_CONTABLE:   'EDITAR_INTERFAZ_CONTABLE',
  ELIMINAR_INTERFAZ_CONTABLE: 'ELIMINAR_INTERFAZ_CONTABLE',
} as const

export type PermisoCodigo = typeof PERMISOS[keyof typeof PERMISOS]
