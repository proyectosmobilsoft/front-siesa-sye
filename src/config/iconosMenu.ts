import {
  AppWindow, BarChart3, Calculator, ClipboardList, FileText, FlaskConical, Folder, Globe, LayoutDashboard,
  Link2, Map, Package, Puzzle, Route, Settings, ShoppingCart, Star, Table, Truck, Users, Wallet,
  type LucideIcon,
} from 'lucide-react'

/**
 * Iconos que se pueden elegir para un módulo personalizado del sidebar.
 * El nombre es el que se guarda en auth_modulos.Icono.
 */
export const ICONOS_MENU: Record<string, LucideIcon> = {
  Puzzle, FlaskConical, BarChart3, LayoutDashboard, Table, FileText, ClipboardList, Folder, Globe, Link2,
  AppWindow, Map, Route, Truck, Package, ShoppingCart, Users, Wallet, Calculator, Settings, Star,
}

export const iconoMenu = (nombre?: string | null): LucideIcon => (nombre && ICONOS_MENU[nombre]) || Puzzle
