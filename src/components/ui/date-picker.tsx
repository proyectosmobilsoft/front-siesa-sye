import { FechaInput } from '@/components/ui/fecha-input'

interface DatePickerProps {
    value?: string // YYYY-MM-DD format
    onChange: (value: string) => void
    placeholder?: string
    className?: string
    min?: string
    max?: string
}

export const DatePicker = ({ value, onChange, placeholder, className, min, max }: DatePickerProps) => (
    <FechaInput value={value} onChange={onChange} placeholder={placeholder} className={className} min={min} max={max} />
)
