import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Database, Palette, Bell, Shield } from 'lucide-react'

export const SettingsPage = () => {
    const settingsSections = [
        {
            title: 'Configuración General',
            description: 'Configuración básica del sistema',
            icon: Settings,
            items: ['Información de la empresa', 'Configuración regional', 'Idioma y zona horaria']
        },
        {
            title: 'Base de Datos',
            description: 'Configuración de conexión y datos',
            icon: Database,
            items: ['Conexión a base de datos', 'Respaldo automático', 'Sincronización']
        },
        {
            title: 'Apariencia',
            description: 'Personalización de la interfaz',
            icon: Palette,
            items: ['Tema de colores', 'Fuentes', 'Diseño de componentes']
        },
        {
            title: 'Notificaciones',
            description: 'Configuración de alertas y notificaciones',
            icon: Bell,
            items: ['Email notifications', 'Push notifications', 'Alertas del sistema']
        },
        {
            title: 'Seguridad',
            description: 'Configuración de seguridad y permisos',
            icon: Shield,
            items: ['Autenticación', 'Permisos de usuario', 'Auditoría']
        }
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-6 p-6"
        >
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground">
                    Configuración del sistema y preferencias
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {settingsSections.map((section, index) => (
                    <motion.div
                        key={section.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <Card className="hover:shadow-lg transition-shadow duration-200">
                            <CardHeader>
                                <div className="flex items-center space-x-3">
                                    <section.icon className="h-6 w-6 text-primary" />
                                    <div>
                                        <CardTitle className="text-lg">{section.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground">{section.description}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {section.items.map((item) => (
                                        <li key={item} className="text-sm text-muted-foreground flex items-center">
                                            <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
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
