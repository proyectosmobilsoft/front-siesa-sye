import type { Ayuda } from '../ayuda'

export const AYUDAS = {
  venta: {
    fuente:
      'SIESA: facturas + remisiones aún no facturadas − notas crédito y devoluciones de remisión (DMA); mercancía + descuento comercial; sin transporte, arrendamiento ni negocios especiales (vendedor DISTRIBUCIONES SYE); ambos C.O. Igual que el Excel "Ventas por ítem" de comercial.',
    formula: 'Σ (valor bruto − descuentos), sin IVA',
  },
  meta: {
    fuente: 'Excel PRESUPUESTO 2026: meta mensual por línea × vendedor.',
    formula: 'Σ meta mensual × (días del rango en el mes ÷ días del mes)',
  },
  cumplimiento: {
    fuente:
      'Venta SIESA de vendedores con presupuesto y meta del Excel PRESUPUESTO 2026.',
    formula: 'Venta de vendedores con presupuesto ÷ meta del periodo',
  },
  gerencia: {
    fuente: "Meta mensual por vendedor (bloque 'Meta para agosto' del Excel).",
    formula: 'Σ meta mensual × (días del rango en el mes ÷ días del mes)',
  },
  proyeccion: {
    fuente: 'Venta SIESA del mes en curso.',
    formula: 'Venta del mes ÷ días transcurridos × días del mes',
  },
  kilos: {
    fuente:
      'Eternit, Supermastick, Torofil y Matecsa tienen meta en kg (Knauf se mide en unidades, ver tabla de líneas).',
    formula: 'Σ cantidad × peso unitario ÷ meta kg',
  },
  valorKg: {
    fuente: 'Venta y carga de ítems de inventario SIESA.',
    formula: 'Venta ÷ kg',
  },
  proveedor: {
    fuente: "Venta a clientes agrupada por la marca del ítem: criterio 'PROVEEDOR' (plan 05) en SIESA. No son compras al proveedor.",
    formula: 'Venta proveedor ÷ venta total',
  },
  cobertura: {
    fuente:
      'Clientes con compra en Knauf, Eternit, Supermastick y Matecsa (hoja 2 del Excel de ventas).',
    formula: 'Por cliente: número de líneas foco con venta > 0',
  },
  descuento: {
    fuente: "Hoja '2026' del Excel de presupuesto.",
    formula: '% sobre la factura según días de pago y canal',
  },
} satisfies Record<string, Ayuda>
