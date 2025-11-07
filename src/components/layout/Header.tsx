import { motion } from 'framer-motion'
import { Menu, Search, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ThemeToggle } from './ThemeToggle'
import { useUIStore } from '@/store/uiStore'
import { useCompanies } from '@/hooks/useCompanies'

export const Header = () => {
    const { sidebarOpen, setSidebarOpen, searchQuery, setSearchQuery, selectedCompany, setSelectedCompany } = useUIStore()
    const { data: companies, isLoading: companiesLoading } = useCompanies()

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-4 lg:px-6">
                {/* Left side */}
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <Menu className="h-4 w-4" />
                    </Button>

                    <div className="hidden md:flex items-center space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 w-64"
                            />
                        </div>

                        <Select
                            value={selectedCompany || ''}
                            onChange={(e) => setSelectedCompany(e.target.value || null)}
                            className="w-48"
                        >
                            <option value="">Todas las compañías</option>
                            {companiesLoading ? (
                                <option disabled>Cargando...</option>
                            ) : (
                                companies && Array.isArray(companies) ? companies.map((company) => (
                                    <option key={company.f010_id} value={company.f010_id.toString()}>
                                        {company.f010_razon_social}
                                    </option>
                                )) : null
                            )}
                        </Select>
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-4 w-4" />
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
                            3
                        </span>
                    </Button>

                    <ThemeToggle />

                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-foreground">A</span>
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium">Admin User</p>
                            <p className="text-xs text-muted-foreground">admin@company.com</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
