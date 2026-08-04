import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Eye, EyeOff, AlertCircle, Loader2, Wrench, Hammer, Cog, Ruler, HardHat } from 'lucide-react'
import { apiClient } from '@/api/client'
import { seguridadApi } from '@/api/seguridad'
import { useAuthStore } from '@/store/authStore'

export const LoginPage = () => {
    const navigate = useNavigate()
    const [usuario, setUsuario] = useState('')
    const [contraseña, setContraseña] = useState('')
    const [showContraseña, setShowContraseña] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!usuario.trim() || !contraseña.trim()) {
            setError('Ingrese usuario y contraseña')
            return
        }

        try {
            setLoading(true)
            setError('')
            const usuarioNormalizado = usuario.trim().toLowerCase()
            const loginData = { usuario: usuarioNormalizado, credencial: contraseña }

            console.log('📤 Enviando datos de login:', loginData)
            const res = await apiClient.post('/auth/login', loginData)

            if (!res.data?.token) {
                console.warn('⚠️ El login fue exitoso pero no se recibió token')
                navigate('/')
                return
            }

            // Guardar token primero para que el interceptor lo use en las siguientes llamadas
            localStorage.setItem('auth_token', res.data.token)
            localStorage.setItem('last_activity', Date.now().toString())
            console.log('✅ Token guardado en localStorage')

            // Cargar datos del usuario y sus permisos usando seguridadApi (con normalización)
            try {
                const [userData, rolesRes] = await Promise.all([
                    seguridadApi.obtenerUsuario(usuarioNormalizado),
                    seguridadApi.listarRoles(),
                ])

                const rolId = userData.rol_id
                const roles = rolesRes.data || []
                const rolUsuario = roles.find((r) => r.id === rolId)
                const permisos: string[] = (rolUsuario?.permisos || [])
                    .map((p) => p.codigo || '')
                    .filter(Boolean)

                console.log('🔑 Datos de sesión:', {
                    usuario: userData.usuario,
                    rol_id: rolId,
                    rol_nombre: rolUsuario?.nombre,
                    permisos_count: permisos.length,
                    permisos,
                })

                useAuthStore.getState().setSession(
                    {
                        id: userData.id,
                        usuario: userData.usuario,
                        nombre_completo: userData.nombre_completo ?? null,
                        rol_id: rolId ?? null,
                        rol_nombre: rolUsuario?.nombre ?? '',
                    },
                    permisos
                )

                console.log(`✅ Sesión cargada — rol: ${rolUsuario?.nombre ?? 'desconocido'}, permisos: ${permisos.length}`)
            } catch (permError) {
                // Si falla la carga de permisos, guardar sesión mínima sin permisos
                // para evitar el bucle de re-login. El usuario verá solo el dashboard.
                console.warn('⚠️ No se pudieron cargar los permisos del usuario:', permError)
                useAuthStore.getState().setSession(
                    {
                        id: 0,
                        usuario: usuarioNormalizado,
                        nombre_completo: null,
                        rol_id: null,
                        rol_nombre: '',
                    },
                    []
                )
            }

            navigate('/')
        } catch (err: any) {
            // Manejar diferentes tipos de errores del backend
            const errorData = err.response?.data
            console.error('❌ Error completo del backend:', errorData)
            let errorMessage = 'Credenciales incorrectas'
            
            if (errorData) {
                // Priorizar el mensaje del endpoint
                if (errorData.message) {
                    errorMessage = errorData.message
                } else if (errorData.error) {
                    errorMessage = errorData.error
                } else if (typeof errorData === 'string') {
                    errorMessage = errorData
                }
            }
            
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
            {/* Panel decorativo — blueprint técnico */}
            <div className="relative hidden overflow-hidden bg-muted lg:block">
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }} />

                <div className="absolute -left-[10%] -top-[8%] h-[35%] w-[35%] rounded-full border border-dashed border-primary/10" />
                <div className="absolute -bottom-[12%] -right-[8%] h-[45%] w-[45%] rounded-full border border-primary/5" />

                <div className="absolute left-[10%] top-[14%] rotate-[15deg] opacity-[0.12]">
                    <Wrench size={170} strokeWidth={0.5} className="text-primary" />
                    <div className="absolute -bottom-4 left-0 h-px w-full bg-primary/20" />
                    <div className="absolute -bottom-6 left-0 flex w-full justify-between font-mono text-[10px] uppercase tracking-widest text-primary/40">
                        <span>0mm</span>
                        <span>250mm</span>
                    </div>
                </div>

                <div className="absolute bottom-[18%] left-[6%] -rotate-[20deg] opacity-[0.1]">
                    <Hammer size={200} strokeWidth={0.5} className="text-primary" />
                </div>

                <div className="absolute right-[10%] top-[22%] rotate-[-30deg] opacity-[0.12]">
                    <Cog size={150} strokeWidth={0.5} className="text-primary" />
                    <div className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dotted border-primary/10" />
                </div>

                <div className="absolute bottom-[12%] right-[16%] rotate-[10deg] opacity-[0.1]">
                    <Ruler size={170} strokeWidth={0.5} className="text-primary" />
                    <div className="absolute -top-4 right-0 font-mono text-[10px] text-primary/30">PRECISION: 0.01mm</div>
                </div>

                <div className="absolute right-[6%] top-[58%] rotate-[-15deg] opacity-[0.08]">
                    <HardHat size={130} strokeWidth={0.5} className="text-primary" />
                </div>

                <div className="absolute left-10 top-10 flex flex-col gap-1 opacity-30">
                    <div className="h-0.5 w-20 bg-primary" />
                    <div className="font-mono text-[10px] font-bold tracking-tighter text-primary">SPEC-SYE-2026</div>
                </div>

                <div className="relative flex h-full flex-col items-center justify-center gap-6 px-12 text-center">
                    <img src="/icon.png" alt="SYE Distribuciones" className="h-20 object-contain" />
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">Portal financiero</h2>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            Gestión centralizada de tesorería, facturación y reportes para SYE Distribuciones.
                        </p>
                    </div>
                </div>
            </div>

            {/* Formulario */}
            <div className="flex items-center justify-center bg-background px-6 py-12 sm:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-8 flex flex-col items-center gap-4 lg:hidden">
                        <img src="/icon.png" alt="SYE Distribuciones" className="h-14 object-contain" />
                    </div>

                    <div className="mb-8 space-y-1.5 text-center lg:text-left">
                        <h1 className="text-2xl font-bold text-foreground">Iniciar sesión</h1>
                        <p className="text-sm text-muted-foreground">Ingresa tus credenciales para continuar</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                        >
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Usuario */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Usuario
                            </label>
                            <div className="relative">
                                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={usuario}
                                    onChange={(e) => setUsuario(e.target.value)}
                                    placeholder="usuario"
                                    className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    autoFocus
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold tracking-tighter text-muted-foreground">***</div>
                                <input
                                    type={showContraseña ? 'text' : 'password'}
                                    value={contraseña}
                                    onChange={(e) => setContraseña(e.target.value)}
                                    placeholder="contraseña"
                                    className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-11 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowContraseña(!showContraseña)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {showContraseña ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Botón Entrar */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-muted-foreground">
                        © 2026 SYE Distribuciones S.A.S · Todos los derechos reservados
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
