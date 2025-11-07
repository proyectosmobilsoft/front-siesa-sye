import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface CountUpProps {
    end: number
    duration?: number
    start?: number
    className?: string
}

export const CountUp = ({ end, duration = 2, start = 0, className }: CountUpProps) => {
    const [count, setCount] = useState(start)

    useEffect(() => {
        let startTime: number
        let animationFrame: number

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime
            const progress = Math.min((currentTime - startTime) / (duration * 1000), 1)

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            const currentCount = start + (end - start) * easeOutQuart

            setCount(Math.floor(currentCount))

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate)
            } else {
                setCount(end) // Asegurar que termine en el valor exacto
            }
        }

        animationFrame = requestAnimationFrame(animate)

        return () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame)
            }
        }
    }, [end, duration, start])

    return (
        <motion.span
            className={className}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {count.toLocaleString('es-CO')}
        </motion.span>
    )
}
