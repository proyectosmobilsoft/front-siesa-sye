import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { apiClient } from '@/api/client'

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
            const loginData = {
                usuario: usuario.trim().toLowerCase(),
                credencial: contraseña,
            }
            console.log('📤 Enviando datos de login:', loginData)
            const res = await apiClient.post('/auth/login', loginData)
            if (res.data?.token) {
                localStorage.setItem('auth_token', res.data.token)
                // Guardar la última actividad al hacer login
                localStorage.setItem('last_activity', Date.now().toString())
                console.log('✅ Token guardado correctamente en localStorage')
            } else {
                console.warn('⚠️ El login fue exitoso pero no se recibió token')
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
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-md mx-4"
            >
                <div className="bg-white rounded-3xl shadow-xl shadow-black/10 px-8 py-10">
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
                <p className="text-center text-gray-400 text-xs mt-6">
                    © 2026 SYE Distribuciones S.A.S · Todos los derechos reservados
                </p>
            </motion.div>
        </div>
    )
}
