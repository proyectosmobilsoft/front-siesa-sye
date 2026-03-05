import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface UserFormModalProps {
    isOpen: boolean
    onClose: () => void
    user?: any // If editing, pass the user object
}

export const UserFormModal = ({ isOpen, onClose, user }: UserFormModalProps) => {
    const isEditing = !!user

    // Form states
    const [name, setName] = useState(user?.name || '')
    const [email, setEmail] = useState(user?.email || '')
    const [phone, setPhone] = useState(user?.phone || '')
    const [role, setRole] = useState(user?.role || 'Conductor')

    // Modulos habilitados
    const [modules, setModules] = useState<Record<string, boolean>>({
        dashboard: true,
        pedidos: false,
        facturas: false,
        viajes: true,
        reportes: false,
        configuracion: false,
    })

    // Permisos
    const [permissions, setPermissions] = useState<Record<string, boolean>>({
        ver: true,
        crear: false,
        editar: false,
        eliminar: false,
    })

    const handleModuleToggle = (mod: string) => {
        setModules(prev => ({ ...prev, [mod]: !prev[mod] }))
    }

    const handlePermissionToggle = (perm: string) => {
        setPermissions(prev => ({ ...prev, [perm]: !prev[perm] }))
    }

    const handleSave = () => {
        // Enviar datos mockeados o reales aqui
        console.log('Guardando usuario:', { name, email, phone, role, modules, permissions })
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
            className="max-w-2xl"
        >
            <div className="mt-4">
                <Tabs defaultValue="datos" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="datos">Datos Básicos</TabsTrigger>
                        <TabsTrigger value="modulos">Módulos (Vistas)</TabsTrigger>
                        <TabsTrigger value="permisos">Permisos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="datos" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre Completo</label>
                                <Input
                                    placeholder="Ej. Juan Pérez"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Correo Electrónico</label>
                                <Input
                                    type="email"
                                    placeholder="juan@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Teléfono / Celular</label>
                                <Input
                                    placeholder="+57 300 000 0000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rol</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="Conductor">Conductor</option>
                                    <option value="Administrador">Administrador</option>
                                    <option value="Visualizador">Visualizador</option>
                                </select>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="modulos" className="space-y-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            Selecciona los módulos o vistas que este usuario podrá ver en la aplicación móvil o web.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(modules).map(([mod, isEnabled]) => (
                                <div key={mod} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        id={`mod-${mod}`}
                                        checked={isEnabled}
                                        onChange={() => handleModuleToggle(mod)}
                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor={`mod-${mod}`} className="text-sm font-medium capitalize cursor-pointer flex-1">
                                        {mod}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="permisos" className="space-y-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            Define las acciones que este usuario puede realizar dentro de los módulos habilitados.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(permissions).map(([perm, isEnabled]) => (
                                <div key={perm} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        id={`perm-${perm}`}
                                        checked={isEnabled}
                                        onChange={() => handlePermissionToggle(perm)}
                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor={`perm-${perm}`} className="text-sm font-medium capitalize cursor-pointer flex-1">
                                        {perm} Registros
                                    </label>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Guardar Usuario</Button>
                </div>
            </div>
        </Modal>
    )
}
