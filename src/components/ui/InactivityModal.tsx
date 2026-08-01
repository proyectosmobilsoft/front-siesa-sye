import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface InactivityModalProps {
    isOpen: boolean
    onClose: () => void
}

export const InactivityModal = ({ isOpen, onClose }: InactivityModalProps) => {
    useEffect(() => {
        if (isOpen) {
            // Prevenir que el usuario pueda cerrar el modal fácilmente
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }

        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl mx-4"
            >
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="flex-1">
                        <h3 className="mb-2 text-lg font-semibold text-foreground">
                            Sesión Expirada
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                            El tiempo de inactividad ha sido superado. Por favor, inicie sesión nuevamente.
                        </p>
                        <Button onClick={onClose} className="w-full">
                            Ir al Login
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
