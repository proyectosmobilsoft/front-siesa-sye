import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DatePickerProps {
    value?: string // YYYY-MM-DD format
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    min?: string
    max?: string
}

export const DatePicker = ({
    value,
    onChange,
    placeholder = 'Seleccionar fecha',
    className,
    min,
    max
}: DatePickerProps) => {
    return (
        <div className={cn('relative', className)}>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    type="date"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    min={min}
                    max={max}
                    className="pl-10"
                />
            </div>
        </div>
    )
}
