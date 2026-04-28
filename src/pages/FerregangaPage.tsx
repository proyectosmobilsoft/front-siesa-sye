import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell, Ticket, Trophy, Home, User, Package,
  ChevronRight, Settings, BarChart3, PlusCircle,
  History, CheckCircle2, Users, DollarSign,
  TrendingUp, LayoutGrid, Phone, Mail, MapPin,
  ArrowLeft, Search, Megaphone, Zap, AlertTriangle,
  BrainCircuit, AlertCircle, HardHat, Star, Gift,
  Clock, ArrowRight, Wallet, ShoppingCart, X, Save,
  ScrollText, CalendarCheck, Medal, Trash2, Edit3,
  ExternalLink, PlayCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge'; // I'll assume Badge might exist or I'll use div
import { cn } from '@/lib/utils';

// --- TIPOS ---
interface Prize {
  id: string;
  level: 'Oro' | 'Plata' | 'Bronce';
  description: string;
}

interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  productBase: string;
  productCombo: string;
  prizes: Prize[];
  status: 'Activa' | 'Programada' | 'Finalizada';
  color: string;
}

interface Transaction {
  id: string;
  date: string;
  details: string;
  amount: string;
  tickets: number;
}

interface Client {
  id: string;
  name: string;
  type: 'Instalador Pro' | 'Hogar';
  email: string;
  phone: string;
  location: string;
  totalTickets: number;
  totalPurchase: string;
  crossSellRate: number;
  history: Transaction[];
}

const FerregangaPage: React.FC = () => {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState<'general' | 'clientes' | 'campanas' | 'sorteo'>('general');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [raffleWinner, setRaffleWinner] = useState<{ name: string; ticket: string; prize: string } | null>(null);

  // Campañas
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: 'CAMP-01',
      name: "Mes de la Impermeabilización",
      startDate: "2023-11-01",
      endDate: "2023-11-30",
      multiplier: 5,
      productBase: "Impermeabilizante Sika",
      productCombo: "Malla Poliéster",
      status: 'Activa',
      color: 'bg-blue-600',
      prizes: [
        { id: 'p1', level: 'Oro', description: 'Hidrolavadora Industrial' },
        { id: 'p2', level: 'Plata', description: 'Bono $500.000' },
        { id: 'p3', level: 'Bronce', description: 'Kit de Brochas Pro' }
      ]
    }
  ]);

  const renderGeneral = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tickets Emitidos</CardTitle>
            <Ticket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> +15% vs mes anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">842</div>
            <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
              <CheckCircle2 size={12} /> 92% participación
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Premios Entregados</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground mt-1">En el último trimestre</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Campaña Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-primary">Mes de la Impermeabilización</h3>
                  <p className="text-sm text-muted-foreground">Finaliza en 12 días</p>
                </div>
                <div className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  X5 TICKETS
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Package size={16} className="text-primary" />
                  <span>Base: Impermeabilizante Sika</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <PlusCircle size={16} className="text-primary" />
                  <span>Combo: Malla Poliéster</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Últimos Ganadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Juan Pérez</p>
                      <p className="text-xs text-muted-foreground">Bono $500.000</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Hace 2 días</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderClientes = () => (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Gestión de Clientes</CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar cliente..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-semibold text-muted-foreground">CLIENTE</th>
                <th className="text-left py-4 px-4 font-semibold text-muted-foreground">TIPO</th>
                <th className="text-center py-4 px-4 font-semibold text-muted-foreground">TICKETS</th>
                <th className="text-right py-4 px-4 font-semibold text-muted-foreground">COMPRAS TOTALES</th>
                <th className="text-right py-4 px-4 font-semibold text-muted-foreground">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-4 px-4 font-medium">Ferretería El Martillo {i}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold uppercase">
                      Instalador Pro
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center font-bold text-primary">1,240</td>
                  <td className="py-4 px-4 text-right">$4.500.000</td>
                  <td className="py-4 px-4 text-right">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronRight size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const renderCampanas = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Campañas de Fidelización</h2>
        <Button className="gap-2">
          <PlusCircle size={18} /> Nueva Campaña
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((camp) => (
          <Card key={camp.id} className="overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge className={cn("mb-2 uppercase tracking-tighter text-[10px]", camp.status === 'Activa' ? 'bg-green-500' : 'bg-blue-500')}>
                  {camp.status}
                </Badge>
                <div className="text-xs font-mono text-muted-foreground">{camp.id}</div>
              </div>
              <CardTitle className="text-xl">{camp.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{camp.startDate} al {camp.endDate}</p>
            </CardHeader>
            <CardContent>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-accent/50 border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Multiplicador</p>
                    <p className="text-xl font-black text-primary">X{camp.multiplier}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/50 border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Premios</p>
                    <p className="text-xl font-black text-primary">{camp.prizes.length}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold mb-2 uppercase tracking-widest text-muted-foreground">Configuración de Combo</p>
                  <div className="flex items-center gap-2 text-sm p-2 rounded bg-primary/5">
                    <Package size={14} className="text-primary" />
                    <span className="font-medium">{camp.productBase}</span>
                    <span className="text-muted-foreground text-xs">+</span>
                    <PlusCircle size={14} className="text-primary" />
                    <span className="font-medium">{camp.productCombo}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" size="sm">
                  <Edit3 size={14} /> Editar
                </Button>
                <Button className="flex-1 gap-2" size="sm">
                   Ver Estadísticas
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSorteo = () => (
    <div className="flex flex-col items-center justify-center space-y-8 py-10">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black uppercase tracking-tighter">Sorteo de Campaña</h2>
        <p className="text-muted-foreground">Mes de la Impermeabilización</p>
      </div>

      <div className="relative w-80 h-80 flex items-center justify-center">
        {/* Simulación de ruleta visual */}
        <div className={cn(
          "w-full h-full rounded-full border-8 border-primary/20 flex items-center justify-center relative overflow-hidden",
          isSpinning && "animate-spin"
        )}>
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="absolute w-1 h-full bg-primary/10" 
              style={{ transform: `rotate(${i * 30}deg)` }}
            />
          ))}
          <div className="w-64 h-64 rounded-full bg-card border-4 border-primary flex flex-col items-center justify-center text-center p-6 shadow-2xl z-10">
             {raffleWinner ? (
               <div className="animate-in zoom-in duration-300">
                 <Trophy size={48} className="text-yellow-500 mb-2 mx-auto" />
                 <p className="text-xs font-bold uppercase text-muted-foreground">¡Ganador!</p>
                 <h3 className="text-lg font-black leading-tight uppercase">{raffleWinner.name}</h3>
                 <p className="text-[10px] font-mono mt-1 text-primary">{raffleWinner.ticket}</p>
                 <div className="mt-2 px-2 py-1 bg-primary/10 rounded text-[10px] font-bold text-primary uppercase">
                   {raffleWinner.prize}
                 </div>
               </div>
             ) : (
               <>
                 <Ticket size={48} className="text-primary/30 mb-2" />
                 <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Listo para sortear</p>
               </>
             )}
          </div>
        </div>
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-red-500 rounded-full border-4 border-background z-20" />
      </div>

      <Button 
        size="lg" 
        className="px-12 py-6 text-lg font-bold uppercase tracking-widest gap-3"
        disabled={isSpinning}
        onClick={() => {
          setIsSpinning(true);
          setRaffleWinner(null);
          setTimeout(() => {
            setIsSpinning(false);
            setRaffleWinner({
              name: "Ferretería El Martillo",
              ticket: "TKT-2023-8842",
              prize: "Hidrolavadora Industrial"
            });
          }, 3000);
        }}
      >
        {isSpinning ? "Sorteando..." : "Iniciar Sorteo"}
      </Button>

      {raffleWinner && (
        <Button variant="ghost" onClick={() => setRaffleWinner(null)}>
          Reiniciar
        </Button>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
            Ferreganga <Ticket className="text-primary" size={32} />
          </h1>
          <p className="text-muted-foreground text-sm uppercase font-black tracking-[0.2em] mt-1">
            Plataforma de Fidelización y Recompensas
          </p>
        </div>
        <div className="flex items-center gap-2 bg-accent/50 p-1 rounded-xl border border-border">
          <button 
            onClick={() => setActiveTab('general')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", activeTab === 'general' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-accent")}
          >
            General
          </button>
          <button 
            onClick={() => setActiveTab('clientes')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", activeTab === 'clientes' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-accent")}
          >
            Clientes
          </button>
          <button 
            onClick={() => setActiveTab('campanas')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", activeTab === 'campanas' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-accent")}
          >
            Campañas
          </button>
          <button 
            onClick={() => setActiveTab('sorteo')}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", activeTab === 'sorteo' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-accent")}
          >
            Sorteo
          </button>
        </div>
      </div>

      <div className="mt-8">
        {activeTab === 'general' && renderGeneral()}
        {activeTab === 'clientes' && renderClientes()}
        {activeTab === 'campanas' && renderCampanas()}
        {activeTab === 'sorteo' && renderSorteo()}
      </div>

      <footer className="mt-12 pt-8 border-t border-border/50 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">
          Ferreganga v1.0 • Motor de Fidelidad
        </p>
      </footer>
    </div>
  );
};

export default FerregangaPage;
