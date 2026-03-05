import { motion } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { useEffect } from 'react'

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
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 relative"
            >
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Sesión Expirada
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            El tiempo de inactividad ha sido superado. Por favor, inicie sesión nuevamente.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-[#B71C1C] hover:bg-[#8B0000] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                        >
                            Ir al Login
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
