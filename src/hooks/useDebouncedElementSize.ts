import { useEffect, useRef, useState } from 'react'

interface Size {
    width: number
    height: number
}

/**
 * Mide un elemento con ResizeObserver pero solo confirma el nuevo tamaño
 * `delay` ms después de que el resize se detiene. Los componentes
 * ResponsiveLine/ResponsiveBar de Nivo redibujan el SVG completo en cada
 * notificación de su ResizeObserver interno sin debounce; si el contenedor
 * cambia de tamaño en varios ticks seguidos (ej. al contraer el sidebar),
 * eso dispara redibujados encadenados que saturan el hilo principal y
 * cuelgan la pestaña. Medir con debounce y renderizar Nivo en modo no
 * responsivo (width/height fijos) evita ese redibujado en cascada.
 */
export const useDebouncedElementSize = (delay = 150) => {
    const ref = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState<Size>({ width: 0, height: 0 })

    useEffect(() => {
        const el = ref.current
        if (!el) return

        let timeoutId: ReturnType<typeof setTimeout> | null = null

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (!entry) return
            const { width, height } = entry.contentRect

            if (timeoutId) clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
                setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }))
            }, delay)
        })

        observer.observe(el)
        const rect = el.getBoundingClientRect()
        setSize({ width: rect.width, height: rect.height })

        return () => {
            if (timeoutId) clearTimeout(timeoutId)
            observer.disconnect()
        }
    }, [delay])

    return { ref, width: size.width, height: size.height }
}
