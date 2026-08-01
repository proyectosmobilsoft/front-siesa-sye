import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
    title?: string
    message?: string
    className?: string
    minHeight?: string
    onRetry?: () => void
}

/**
 * Tarjeta de error estándar para estados de carga fallidos (useQuery error,
 * etc). Antes cada página repetía el mismo bloque
 * `border-red-200 bg-red-50 / CardTitle text-red-800 / text-red-600` con
 * pequeñas variaciones — esto centraliza esos casos en variables semánticas
 * (`destructive`), correctas en claro y oscuro.
 */
export const ErrorState = ({
    title = 'Error al cargar los datos',
    message = 'No se pudieron obtener los datos. Intenta de nuevo.',
    className,
    minHeight = 'h-64',
    onRetry,
}: ErrorStateProps) => {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className={`flex flex-col items-center justify-center gap-3 ${minHeight}`}>
                <p className="text-center text-sm text-muted-foreground">{message}</p>
                {onRetry && (
                    <Button onClick={onRetry} variant="outline" size="sm">
                        Reintentar
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
