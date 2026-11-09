export function TarjetaBoton({ titulo, cantidad, monto, detalle, alAbrir, ayuda }: { titulo: string; cantidad: string; monto: string; detalle: string; alAbrir: () => void; ayuda: { fuente: string; formula: string; nota?: string } }) {
  return <div className="min-w-0 rounded-2xl bg-card shadow-sm">
    <button type="button" onClick={alAbrir} className="flex w-full cursor-pointer flex-col items-start gap-1 rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transform-none" aria-label={`${titulo}: ${cantidad}, ${monto}, ${detalle}. Ver detalle`}>
      <span className="text-[0.625rem] font-black uppercase tracking-widest text-muted-foreground">{titulo} <span aria-hidden>→</span></span>
      <span className="text-3xl font-black tracking-tight tabular-nums text-foreground">{cantidad}</span>
      <span className="text-base font-bold tabular-nums text-primary">{monto}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{detalle}</span>
    </button>
    <details className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Fuente y cálculo</summary><p className="mt-2"><strong>Fuente:</strong> {ayuda.fuente}</p><p><strong>Cálculo:</strong> {ayuda.formula}</p>{ayuda.nota && <p>{ayuda.nota}</p>}</details>
  </div>
}
