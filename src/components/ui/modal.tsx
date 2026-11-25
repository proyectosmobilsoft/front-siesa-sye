import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: React.ReactNode
    subtitle?: React.ReactNode
    children: React.ReactNode
    className?: string
}

export const Modal = ({ isOpen, onClose, title, subtitle, children, className }: ModalProps) => {
    if (!isOpen) return null

    return createPortal(
        <div className="modal-overlay" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="modal-backdrop" onClick={onClose} />

            {/* Modal */}
            <div className={cn('modal-panel', className)}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title-group">
                        <h2 className="modal-title">{title}</h2>
                        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="modal-close"
                        aria-label="Cerrar"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="modal-body custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
