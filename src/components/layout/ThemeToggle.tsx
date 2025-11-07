import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/uiStore'

export const ThemeToggle = () => {
    const { isDarkMode, toggleDarkMode } = useUIStore()

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="h-9 w-9"
        >
            {isDarkMode ? (
                <Sun className="h-4 w-4" />
            ) : (
                <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Cambiar tema</span>
        </Button>
    )
}
