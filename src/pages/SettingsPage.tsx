import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Database, Palette, Bell } from 'lucide-react'

export const SettingsPage = () => {
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
                    >
                        <Card className="hover:shadow-lg transition-all duration-200 h-full">
                            <CardHeader>
                                <div className="flex items-center space-x-3">
                                    <section.icon className="h-6 w-6 text-muted-foreground" />
                                    <div>
                                        <CardTitle className="text-lg">{section.title}</CardTitle>
                                        <p className="text-sm text-muted-foreground">{section.description}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {section.items.map((item) => (
                                        <li key={item} className="text-sm flex items-center text-muted-foreground">
                                            <div className="w-1.5 h-1.5 rounded-full mr-2 bg-muted-foreground" />
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
