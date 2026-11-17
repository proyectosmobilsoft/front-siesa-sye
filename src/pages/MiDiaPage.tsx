import { useQuery } from '@tanstack/react-query'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { apiClient } from '@/api/client'
import { Encabezado } from '@/components/tablero/comun'
import { Button } from '@/components/ui/button'
import { Cargando } from '@/components/ui/cargando'
import { CirculoAtajos } from '@/components/mi-dia/CirculoAtajos'
import { PendientesHoy } from '@/components/mi-dia/PendientesHoy'
import { ResumenHoy } from '@/components/mi-dia/ResumenHoy'
import type { MiDiaData } from '@/components/mi-dia/tipos'
import { useAuthStore } from '@/store/authStore'

function obtenerPrimerNombre(nombreCompleto?: string | null, usuario?: string | null): string {
  const fuente = (nombreCompleto || usuario || '').trim()
  if (!fuente) return 'equipo'
  const primera = fuente.split(/\s+/)[0]
  if (primera === primera.toUpperCase() || primera === primera.toLowerCase()) {
    return primera.charAt(0).toUpperCase() + primera.slice(1).toLowerCase()
  }
  return primera
}

function formatearFechaLarga(fechaIso?: string): string {
  const fecha = fechaIso && /^\d{4}-\d{2}-\d{2}$/.test(fechaIso)
    ? new Date(`${fechaIso}T12:00:00-05:00`)
    : new Date()
  const texto = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function MiDiaPage() {
  const sesion = useAuthStore((s) => s.sesion)
  const centro = useAuthStore((s) => s.centroOperacionActivo)

  const consulta = useQuery({
    queryKey: ['dashboard-mi-dia', sesion?.id, centro],
    queryFn: async () =>
      (await apiClient.get<{ success: boolean; data: MiDiaData }>('/dashboard/mi-dia')).data.data,
    enabled: !!sesion?.id,
    refetchInterval: 60_000,
    staleTime: 20_000,
  })

  const primerNombre = obtenerPrimerNombre(sesion?.nombre_completo, sesion?.usuario)
  const fechaLarga = formatearFechaLarga(consulta.data?.fecha)

  return (
    <section className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <Encabezado
        titulo={`Hola, ${primerNombre}`}
        descripcion={`${fechaLarga} · Resumen de tu jornada y accesos directos`}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CirculoAtajos />
        </div>

        <div className="space-y-6 lg:col-span-7">
          {consulta.isLoading ? (
            <div className="rounded-3xl bg-card p-6 ring-1 ring-border/80">
              <Cargando compacto texto="Cargando tu jornada…" />
            </div>
          ) : consulta.isError || !consulta.data ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-card p-8 text-center ring-1 ring-border/80">
              <TriangleAlert className="size-6 text-destructive" />
              <p className="text-sm font-medium text-foreground">
                No pudimos cargar el resumen de tu día en este momento.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={() => void consulta.refetch()}
              >
                <RefreshCw className="size-3.5" />
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <PendientesHoy data={consulta.data} />
              <ResumenHoy data={consulta.data} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
