/** Condición de pago de la factura; la contraentrega se resalta porque es la que el conductor cobra al entregar. */
export function esContraentrega(id?: string | null, descripcion?: string | null): boolean {
    return /CONTRA\s?ENTREGA/i.test(descripcion ?? '') || id === 'CRC'
}

export function CondicionPagoChip({ id, descripcion }: { id?: string | null; descripcion?: string | null }) {
    if (!descripcion && !id) return null
    const contra = esContraentrega(id, descripcion)
    return (
        <span
            className={
                'inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
                (contra ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-muted text-muted-foreground')
            }
            title={`Condición de pago: ${descripcion ?? id}`}
        >
            {descripcion ?? id}
        </span>
    )
}
