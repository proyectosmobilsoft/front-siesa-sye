import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Database, Palette, Bell, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const SettingsPage = () => {
    const navigate = useNavigate()

    const settingsSections = [
        {
            title: 'Configuración General',
            description: 'Configuración básica del sistema',
            icon: Settings,
            items: ['Información de la empresa', 'Configuración regional', 'Idioma y zona horaria'],
            path: null
        },
        {
            title: 'Base de Datos',
            description: 'Configuración de conexión y datos',
            icon: Database,
            items: ['Conexión a base de datos', 'Respaldo automático', 'Sincronización'],
            path: null
        },
        {
            title: 'Apariencia',
            description: 'Personalización de la interfaz',
            icon: Palette,
            items: ['Tema de colores', 'Fuentes', 'Diseño de componentes'],
            path: null
        },
        {
            title: 'Notificaciones',
            description: 'Configuración de alertas y notificaciones',
            icon: Bell,
            items: ['Email notifications', 'Push notifications', 'Alertas del sistema'],
            path: null
        },
        {
            title: 'Seguridad',
            description: 'Configuración de seguridad, roles, y usuarios',
            icon: Shield,
            items: ['Usuarios (Conductores)', 'Autenticación', 'Permisos y Módulos', 'Auditoría'],
            path: '/configuracion/seguridad'
        }
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-6 p-6"
        >

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {settingsSections.map((section, index) => (
                    <motion.div
                        key={section.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        onClick={() => section.path && navigate(section.path)}
                        className={section.path ? "cursor-pointer" : ""}
                    >
                        <Card className={`hover:shadow-lg transition-all duration-200 h-full ${section.path ? 'hover:border-primary/50 ring-1 ring-transparent hover:ring-primary/20' : ''}`}>
                            <CardHeader>
                                <div className="flex items-center space-x-3">
                                    <section.icon className={`h-6 w-6 ${section.path ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <div>
                                        <CardTitle className="text-lg">{section.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground">{section.description}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {section.items.map((item) => (
                                        <li key={item} className={`text-sm flex items-center ${section.title === 'Seguridad' && item.includes('Usuarios') ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${section.title === 'Seguridad' && item.includes('Usuarios') ? 'bg-primary' : 'bg-muted-foreground'}`} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    )
}
