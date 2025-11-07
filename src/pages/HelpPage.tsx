import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpCircle, BookOpen, MessageCircle, FileText, Video } from 'lucide-react'

export const HelpPage = () => {
    const helpSections = [
        {
            title: 'Documentación',
            description: 'Guías y documentación completa',
            icon: BookOpen,
            items: ['Guía de usuario', 'API Documentation', 'Guías de integración']
        },
        {
            title: 'Soporte',
            description: 'Obtén ayuda cuando la necesites',
            icon: MessageCircle,
            items: ['Chat en vivo', 'Ticket de soporte', 'Comunidad']
        },
        {
            title: 'Recursos',
            description: 'Materiales de aprendizaje',
            icon: FileText,
            items: ['Tutoriales', 'Casos de uso', 'Mejores prácticas']
        },
        {
            title: 'Videos',
            description: 'Contenido multimedia',
            icon: Video,
            items: ['Videos tutoriales', 'Webinars', 'Demostraciones']
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
                <h1 className="text-3xl font-bold tracking-tight">Ayuda</h1>
                <p className="text-muted-foreground">
                    Centro de ayuda y soporte
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {helpSections.map((section, index) => (
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <HelpCircle className="h-5 w-5" />
                        <span>Preguntas Frecuentes</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium">¿Cómo puedo agregar nuevos clientes?</h4>
                            <p className="text-sm text-muted-foreground">Ve a la sección de Clientes y usa el botón "Agregar Cliente" para crear nuevos registros.</p>
                        </div>
                        <div>
                            <h4 className="font-medium">¿Cómo cambio el tema de la aplicación?</h4>
                            <p className="text-sm text-muted-foreground">Usa el botón de cambio de tema en la esquina superior derecha del header.</p>
                        </div>
                        <div>
                            <h4 className="font-medium">¿Cómo exporto datos?</h4>
                            <p className="text-sm text-muted-foreground">En cada tabla encontrarás opciones de exportación en la barra de herramientas.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
