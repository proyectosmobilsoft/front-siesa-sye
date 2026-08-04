import { useCallback, useEffect, useState } from 'react'

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
 * cuelgan la pestaña. Medir con debounce y renderizar el chart en modo no
 * responsivo (width/height fijos) evita ese redibujado en cascada.
 *
 * Usa un callback ref (no useRef) a propósito: el <div> medido solo se
 * monta cuando termina el loading (antes hay un <Skeleton>), así que el
 * nodo pasa de null a un elemento real en un RE-render, no en el mount.
 * Con useRef ese cambio no dispara el efecto de nuevo y el ResizeObserver
 * nunca llega a crearse. El callback ref sí se re-ejecuta cuando cambia
 * el nodo DOM.
 */
export const useDebouncedElementSize = (delay = 150) => {
    const [element, setElement] = useState<HTMLDivElement | null>(null)
    const [size, setSize] = useState<Size>({ width: 0, height: 0 })

    const ref = useCallback((node: HTMLDivElement | null) => {
        setElement(node)
    }, [])

    useEffect(() => {
        if (!element) return

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

        observer.observe(element)
        const rect = element.getBoundingClientRect()
        setSize({ width: rect.width, height: rect.height })

        return () => {
            if (timeoutId) clearTimeout(timeoutId)
            observer.disconnect()
        }
    }, [element, delay])

    return { ref, width: size.width, height: size.height }
}
