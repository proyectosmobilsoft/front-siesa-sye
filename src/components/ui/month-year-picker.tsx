import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MonthYearPickerProps {
    value?: number // YYYYMM format
    onChange: (value: number) => void
    placeholder?: string
    className?: string
}

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export const MonthYearPicker = ({ value, onChange, placeholder = 'Seleccionar periodo', className }: MonthYearPickerProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [currentYear, setCurrentYear] = useState(() => {
        if (value) {
            return Math.floor(value / 100)
        }
        return new Date().getFullYear()
    })
    const containerRef = useRef<HTMLDivElement>(null)

    // Actualizar año cuando cambia el value
    useEffect(() => {
        if (value) {
            setCurrentYear(Math.floor(value / 100))
        }
    }, [value])

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleMonthClick = (month: number) => {
        const newValue = currentYear * 100 + (month + 1)
        onChange(newValue)
        setIsOpen(false)
    }

    const handleYearChange = (delta: number) => {
        setCurrentYear(prev => Math.max(2000, Math.min(2100, prev + delta)))
    }

    const displayValue = value && value > 0 
        ? `${monthNames[(value % 100) - 1] || 'Mes'} ${Math.floor(value / 100)}` 
        : placeholder

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full justify-start text-left font-normal',
                    !value && 'text-muted-foreground'
                )}
            >
                <Calendar className="mr-2 h-4 w-4" />
                {displayValue}
            </Button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-64 rounded-md border bg-card p-3 shadow-lg">
                    {/* Controles de año */}
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleYearChange(-1)}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-semibold">{currentYear}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleYearChange(1)}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Grid de meses */}
                    <div className="grid grid-cols-3 gap-2">
                        {monthNames.map((month, index) => {
                            const monthValue = value ? (value % 100) : 0
                            const yearValue = value ? Math.floor(value / 100) : 0
                            const isSelected = value && monthValue - 1 === index && yearValue === currentYear
                            return (
                                <Button
                                    key={index}
                                    type="button"
                                    variant={isSelected ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleMonthClick(index)}
                                    className={cn(
                                        'text-xs',
                                        isSelected && 'bg-primary text-primary-foreground'
                                    )}
                                >
                                    {month.substring(0, 3)}
                                </Button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

