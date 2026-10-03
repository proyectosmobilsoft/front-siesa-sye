/**
 * Propuesta comercial (Integración ERP Siesa Zero-Impact). El documento es un
 * HTML autocontenido (estilos y logo embebidos) servido desde /public; se
 * muestra en un iframe para que sus estilos no choquen con los de la app.
 */
export const PropuestaPage = () => (
    <iframe
        src="/propuesta.html"
        title="Propuesta Integración ERP Siesa Zero-Impact"
        className="block h-full w-full border-0"
    />
)
