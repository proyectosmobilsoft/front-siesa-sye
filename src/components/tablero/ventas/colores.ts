export const tonoCumplimiento = (v: number | null) => v == null ? 'neutro' : v >= 1 ? 'ok' : v >= .8 ? 'aviso' : 'err'
export const colorCumplimiento = (v: number | null) => v == null ? 'bg-muted' : v >= 1 ? 'bg-emerald-500' : v >= .8 ? 'bg-amber-500' : 'bg-red-500'
