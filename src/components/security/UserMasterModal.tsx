import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { seguridadApi, AuthRole } from '@/api/seguridad'
import { Select } from '@/components/ui/select'

interface UserMasterModalProps {
    isOpen: boolean
    onClose: () => void
    user?: any
}

export const UserMasterModal = ({ isOpen, onClose, user }: UserMasterModalProps) => {
    const isEditing = !!user

    const [usuario, setUsuario] = useState('')
    const [nombreCompleto, setNombreCompleto] = useState('')
    const [email, setEmail] = useState('')
    const [codigoPais, setCodigoPais] = useState('+57')
    const [telefono, setTelefono] = useState('')
    const [rolId, setRolId] = useState<number | null>(null)
    const [pin, setPin] = useState('')
    const [contraseña, setContraseña] = useState('')
    const [observaciones, setObservaciones] = useState('')
    const [activo, setActivo] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [pinCopied, setPinCopied] = useState(false)
    const [roles, setRoles] = useState<AuthRole[]>([])
    const [loadingRoles, setLoadingRoles] = useState(false)
    const [rolSeleccionado, setRolSeleccionado] = useState<AuthRole | null>(null)

    // Cargar roles y datos del usuario al abrir el modal
    useEffect(() => {
        if (isOpen) {
            // Resetear estados
            setUsuario(user?.usuario || '')
            setNombreCompleto(user?.nombre_completo || '')
            setEmail(user?.email || '')
            
            // Separar código de país y teléfono
            const telefonoCompleto = user?.telefono || ''
            const matchCodigo = telefonoCompleto.match(/^(\+\d{1,3})/)
            if (matchCodigo) {
                setCodigoPais(matchCodigo[1])
                setTelefono(telefonoCompleto.replace(matchCodigo[1], '').trim())
            } else {
                setCodigoPais('+57')
                setTelefono(telefonoCompleto)
            }
            
            // rol_id desde roles[0] (API devuelve roles del usuario) o rol_id directo
            const userRolId = user?.roles?.[0]?.id ?? user?.rol_id ?? null
            setRolId(userRolId)
            setPin(user?.pin || '')
            setContraseña('') // No mostrar contraseña existente por seguridad
            setObservaciones(user?.observaciones || '')
            setActivo(user?.activo !== false)
            setError(null)
            setIsSubmitting(false)
            setPinCopied(false)
            setRolSeleccionado(null)
            
            // Cargar roles y luego establecer el rol seleccionado si existe
            loadRoles(userRolId)
        }
    }, [isOpen, user?.id])

    const loadRoles = async (rolIdToSet?: number | null) => {
        try {
            setLoadingRoles(true)
            const res = await seguridadApi.listarRoles()
            // Filtrar solo roles activos (API usa /auth-secundario/roles)
            const rolesActivos = (res.data || []).filter(rol => !!rol.estado)
            setRoles(rolesActivos)
            
            // Si hay un rol_id para establecer, buscarlo en los roles cargados
            if (rolIdToSet && res.data) {
                const rol = res.data.find(r => r.id === rolIdToSet && !!r.estado)
                if (rol) {
                    setRolSeleccionado(rol)
                }
            }
        } catch (err) {
            console.error('Error cargando roles:', err)
            setError('Error al cargar los roles disponibles')
        } finally {
            setLoadingRoles(false)
        }
    }

    const handleRolChange = (rolIdStr: string) => {
        const rolIdNum = parseInt(rolIdStr, 10)
        setRolId(rolIdNum)
        const rol = roles.find(r => r.id === rolIdNum)
        setRolSeleccionado(rol || null)
        // Limpiar campos de autenticación al cambiar de rol
        setPin('')
        setContraseña('')
    }

    const generateRandomPin = () => {
        const newPin = Math.floor(1000 + Math.random() * 9000).toString()
        setPin(newPin)
        setPinCopied(false)
    }

    const copyPin = () => {
        const textoACopiar = rolSeleccionado?.pin ? pin : contraseña
        if (textoACopiar) {
            navigator.clipboard.writeText(textoACopiar)
            setPinCopied(true)
            setTimeout(() => setPinCopied(false), 2000)
        }
    }

    const handleSave = async () => {
        if (!usuario.trim()) {
            setError('El nombre de usuario es obligatorio')
            return
        }
        if (!rolId) {
            setError('Debe seleccionar un rol')
            return
        }
        
        // Validar credencial solo al crear (al editar es opcional - si no se ingresa no se actualiza)
        if (!isEditing) {
            if (rolSeleccionado?.pin) {
                if (!pin.trim()) {
                    setError('El PIN de acceso es obligatorio')
                    return
                }
            } else {
                if (!contraseña.trim()) {
                    setError('La contraseña es obligatoria')
                    return
                }
            }
        }

        try {
            setIsSubmitting(true)
            setError(null)

            // Verificar que hay token antes de crear usuario
            const token = localStorage.getItem('auth_token')
            if (!token) {
                setError('No hay sesión activa. Por favor, inicie sesión nuevamente.')
                return
            }

            // Construir teléfono completo con código de país
            const telefonoCompleto = telefono.trim() 
                ? `${codigoPais}${telefono.trim()}` 
                : null

            const credencial = rolSeleccionado?.pin ? pin : contraseña
            const userData = {
                usuario: usuario.trim(),
                nombre_completo: nombreCompleto.trim() || null,
                email: email.trim() || null,
                telefono: telefonoCompleto,
                rol_id: rolId,
                credencial: credencial.trim() ? credencial : undefined,
                observaciones: observaciones.trim() || null,
                activo,
            }

            if (isEditing && user?.id) {
                console.log('📤 PUT /auth-secundario/usuarios/' + user.id + ':', JSON.stringify(userData, null, 2))
                await seguridadApi.actualizarUsuario(user.id, userData)
                console.log('✅ Usuario actualizado')
            } else {
                console.log('📤 POST /auth-secundario/usuarios:', JSON.stringify(userData, null, 2))
                await seguridadApi.crearUsuario(userData)
                console.log('✅ Usuario creado')
            }
            onClose()
        } catch (err: any) {
            console.error('Error al crear usuario maestro:', err)
            setError(err.response?.data?.message || err.message || 'Error desconocido al crear el usuario')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
            className="max-w-2xl"
        >
            <div className="mt-3 space-y-4">
                {error && (
                    <div className="p-2.5 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Nombre Completo - campo más grande */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Nombre Completo</label>
                    <Input placeholder="Ej. Juan Pérez García" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} className="h-10 text-base" autoComplete="off" />
                </div>

                {/* Fila: Rol | Email | Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Rol <span className="text-red-500">*</span></label>
                        <Select
                            value={rolId?.toString() || ''}
                            onChange={(e) => handleRolChange(e.target.value)}
                            disabled={loadingRoles}
                            className="h-9"
                            autoComplete="off"
                        >
                            <option value="">{loadingRoles ? "Cargando..." : "Seleccione un rol"}</option>
                            {roles.map((rol) => (
                                <option key={rol.id} value={rol.id.toString()}>
                                    {rol.nombre} {rol.pin ? '(PIN)' : '(Contraseña)'}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Correo Electrónico</label>
                        <Input type="email" placeholder="usuario@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" autoComplete="off" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
                        <div className="flex gap-1.5">
                            <Input placeholder="+57" value={codigoPais} onChange={(e) => setCodigoPais(e.target.value)} className="h-9 w-16 text-center shrink-0" autoComplete="off" />
                            <Input placeholder="300 000 0000" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="h-9 flex-1" type="tel" autoComplete="off" />
                        </div>
                    </div>
                </div>

                {/* Usuario + PIN/Contraseña en la misma fila */}
                {rolSeleccionado ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Usuario <span className="text-red-500">*</span></label>
                            <Input placeholder="Ej. conductor1" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-9" autoComplete="off" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">
                                {rolSeleccionado.pin ? 'PIN de Acceso' : 'Contraseña'} <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                {rolSeleccionado.pin ? (
                                    <>
                                        <Input type="text" placeholder="1234" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} className="h-9 w-24 font-mono tracking-widest text-center" autoComplete="off" />
                                        <Button type="button" variant="outline" size="sm" onClick={generateRandomPin} className="h-9">Generar</Button>
                                        <Button type="button" variant="outline" size="sm" onClick={copyPin} className="h-9 px-2">{pinCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
                                    </>
                                ) : (
                                    <Input type="password" placeholder="Contraseña" value={contraseña} onChange={(e) => setContraseña(e.target.value)} className="h-9 flex-1" autoComplete="off" />
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Usuario <span className="text-red-500">*</span></label>
                            <Input placeholder="Ej. conductor1" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-9" autoComplete="off" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">PIN / Contraseña</label>
                            <Input placeholder="Seleccione un rol primero" className="h-9" disabled autoComplete="off" />
                        </div>
                    </div>
                )}

                {/* Observaciones */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Observaciones</label>
                    <Input placeholder="Notas opcionales..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="h-9" autoComplete="off" />
                </div>

                {/* Estado + Botones */}
                <div className="flex items-center justify-between pt-3 border-t gap-3">
                    <div
                        onClick={() => setActivo(!activo)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all select-none shrink-0 ${activo ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400' : 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400'}`}
                    >
                        <div className={`w-2.5 h-2.5 rounded-full ${activo ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-semibold">{activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting} size="sm" className="px-4">Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSubmitting} size="sm" className="px-4 gap-2">
                            {isSubmitting ? <><RefreshCw className="h-4 w-4 animate-spin" /> {isEditing ? 'Actualizando...' : 'Guardando...'}</> : isEditing ? 'Actualizar' : 'Guardar Usuario'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
