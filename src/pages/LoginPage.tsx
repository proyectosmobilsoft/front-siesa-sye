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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#F1F5F9]">
            {/* Background Decorative Elements - Technical Blueprint Theme (Light) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Architectural Grid */}
                <div className="absolute inset-0 opacity-[0.03]" 
                     style={{ 
                         backgroundImage: `linear-gradient(#B71C1C 1px, transparent 1px), linear-gradient(90deg, #B71C1C 1px, transparent 1px)`,
                         backgroundSize: '40px 40px' 
                     }} />
                
                {/* Thin technical circles */}
                <div className="absolute -top-[5%] -left-[5%] w-[30%] h-[30%] rounded-full border border-[#B71C1C]/10 border-dashed" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full border border-[#B71C1C]/5" />
                
                {/* High-Precision Tool Outlines - Detailed & Thin */}
                <div className="absolute top-[12%] left-[8%] rotate-[15deg] opacity-[0.08]">
                    <Wrench size={180} strokeWidth={0.5} className="text-[#B71C1C]" />
                    {/* Measurement lines */}
                    <div className="absolute -bottom-4 left-0 w-full h-[1px] bg-[#B71C1C]/20" />
                    <div className="absolute -bottom-6 left-0 w-full flex justify-between text-[10px] font-mono text-[#B71C1C]/40 uppercase tracking-widest">
                        <span>0mm</span>
                        <span>250mm</span>
                    </div>
                </div>

                <div className="absolute bottom-[15%] left-[4%] -rotate-[20deg] opacity-[0.06]">
                    <Hammer size={220} strokeWidth={0.5} className="text-[#B71C1C]" />
                    <div className="absolute top-1/2 -left-8 w-[120%] h-[1px] bg-[#B71C1C]/10 origin-left rotate-45" />
                </div>

                <div className="absolute top-[18%] right-[6%] rotate-[-30deg] opacity-[0.08]">
                    <Cog size={160} strokeWidth={0.5} className="text-[#B71C1C] animate-spin-[60s_linear_infinite]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] rounded-full border border-[#B71C1C]/10 border-dotted" />
                </div>

                <div className="absolute bottom-[8%] right-[12%] rotate-[10deg] opacity-[0.07]">
                    <Ruler size={190} strokeWidth={0.5} className="text-[#B71C1C]" />
                    <div className="absolute -top-4 right-0 text-[10px] font-mono text-[#B71C1C]/30">PRECISION: 0.01mm</div>
                </div>

                <div className="absolute top-[55%] right-[2%] rotate-[-15deg] opacity-[0.05]">
                    <HardHat size={140} strokeWidth={0.5} className="text-[#B71C1C]" />
                </div>

                {/* Subtle depth glows (light) */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/40 via-transparent to-[#B71C1C]/5" />
                
                {/* Technical "Blueprint" Annotations */}
                <div className="absolute top-10 left-10 flex flex-col gap-1 opacity-20">
                    <div className="h-[2px] w-20 bg-[#B71C1C]" />
                    <div className="text-[10px] font-mono text-[#B71C1C] font-bold tracking-tighter">SPEC-SYE-2026</div>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-md mx-4 z-10"
            >
                <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl shadow-slate-200 px-8 py-10 border border-white">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                        <img src="/icon.png" alt="SYE Distribuciones" className="h-16 object-contain" />
                    </div>

                    {/* Título */}
                    <h1 className="text-xl font-bold text-center text-gray-800 mb-6">Portal financiero</h1>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl"
                        >
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Usuario */}
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={usuario}
                                onChange={(e) => setUsuario(e.target.value)}
                                placeholder="Usuario"
                                className="w-full h-14 pl-12 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#B71C1C] focus:ring-1 focus:ring-[#B71C1C]/30 transition-all"
                                autoFocus
                                autoComplete="username"
                            />
                        </div>

                        {/* Contraseña */}
                        <div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B71C1C] font-bold text-sm tracking-tighter">***</div>
                                <input
                                    type={showContraseña ? 'text' : 'password'}
                                    value={contraseña}
                                    onChange={(e) => setContraseña(e.target.value)}
                                    placeholder="Contraseña"
                                    className="w-full h-14 pl-12 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#B71C1C] focus:ring-1 focus:ring-[#B71C1C]/30 transition-all"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowContraseña(!showContraseña)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showContraseña ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Botón Entrar */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-[#B71C1C] hover:bg-[#8B0000] text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400/80 text-xs mt-6">
                    © 2026 SYE Distribuciones S.A.S · Todos los derechos reservados
                </p>
            </motion.div>
        </div>
    )
}
