import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
}

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    resetError = () => {
        this.setState({ hasError: false, error: undefined })
    }

    render() {
        if (this.state.hasError) {
            const FallbackComponent = this.props.fallback || DefaultErrorFallback
            return <FallbackComponent error={this.state.error} resetError={this.resetError} />
        }

        return this.props.children
    }
}

const DefaultErrorFallback = ({ error, resetError }: { error?: Error; resetError: () => void }) => {
    return (
        <Card className="border-destructive/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Error en el Componente
                </CardTitle>
                <CardDescription>
                    Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {error && (
                        <div className="text-sm text-muted-foreground">
                            <strong>Detalles del error:</strong>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                                {error.message}
                            </pre>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button onClick={resetError} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reintentar
                        </Button>
                        <Button onClick={() => window.location.reload()} variant="default">
                            Recargar Página
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}