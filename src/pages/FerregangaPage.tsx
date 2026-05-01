import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/api/client';
import {
  Bell, Ticket, Trophy, Home, User, Package,
  ChevronRight, Settings, BarChart3, PlusCircle,
  History, CheckCircle2, Users, DollarSign,
  TrendingUp, LayoutGrid, Phone, Mail, MapPin,
  ArrowLeft, Search, Megaphone, Zap, AlertTriangle,
  BrainCircuit, AlertCircle, HardHat, Star, Gift,
  Clock, ArrowRight, Wallet, ShoppingCart, X, Save,
  ScrollText, CalendarCheck, Medal, Trash2, Edit3,
  ExternalLink, PlayCircle, Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

// --- TIPOS API CAMPAÑAS ---
interface CampaniaDetalleAPI {
  id: number;
  producto_codigo: string;
  producto_nombre?: string;
  multiplicador: number;
  premio: string;
  posicion_premio: number;
}

interface CampaniaAPI {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
  creado_por: string;
  detalles: CampaniaDetalleAPI[];
}

// --- TIPOS DEL FORMULARIO (API) ---
interface CampaignDetalle {
  producto_codigo: string;
  producto_nombre: string;
  multiplicador: number;
  premio: string;
  posicion_premio: number;
}

interface CampaignFormData {
  codigo: string;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  detalles: CampaignDetalle[];
}

const emptyDetalle = (): CampaignDetalle => ({
  producto_codigo: '',
  producto_nombre: '',
  multiplicador: 1,
  premio: '',
  posicion_premio: 1,
});

const emptyForm = (): CampaignFormData => ({
  codigo: '',
  nombre: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
  detalles: [emptyDetalle()],
});

const FerregangaPage: React.FC = () => {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState<'general' | 'clientes' | 'campanas' | 'sorteo'>('general');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [raffleWinner, setRaffleWinner] = useState<{ name: string; ticket: string; prize: string; level?: string } | null>(null);
  const [podiumWinners, setPodiumWinners] = useState<{ Oro?: any, Plata?: any, Bronce?: any }>({});
  const [showConfetti, setShowConfetti] = useState(false);

  // Campañas desde API
  const [campanias, setCampanias] = useState<CampaniaAPI[]>([]);
  const [loadingCampanias, setLoadingCampanias] = useState(false);
  const [errorCampanias, setErrorCampanias] = useState<string | null>(null);

  const fetchCampanias = async () => {
    setLoadingCampanias(true);
    setErrorCampanias(null);
    try {
      const res = await apiClient.get<{ success: boolean; total: number; data: CampaniaAPI[] }>('/campanias');
      setCampanias(res.data.data ?? []);
    } catch {
      setErrorCampanias('No se pudieron cargar las campañas');
    } finally {
      setLoadingCampanias(false);
    }
  };

  useEffect(() => { fetchCampanias(); }, []);

  // Clientes activos desde API
  interface ClienteActivo {
    id: number;
    nit: string | null;
    razon_social: string;
    nombre: string;
    email: string | null;
    celular: string | null;
    total_facturas: number;
    total_comprado: number;
  }
  interface ClientesResumen {
    total_registrados: number;
    total_activos: number;
    participacion: number;
    data: ClienteActivo[];
  }

  const [clientesData, setClientesData] = useState<ClientesResumen | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const fetchClientes = async () => {
    setLoadingClientes(true);
    try {
      const now = new Date();
      const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
      const fin = fmt(now);
      const inicio = fmt(new Date(now.getFullYear() - 1, now.getMonth(), 1));
      const res = await apiClient.get<{ success: boolean; data: ClientesResumen }>(
        `/clients/activos-rango?fecha_inicio=${inicio}&fecha_fin=${fin}`
      );
      setClientesData(res.data.data);
    } catch {
      // silencioso — el dashboard muestra —
    } finally {
      setLoadingClientes(false);
    }
  };

  useEffect(() => { fetchClientes(); }, []);

  // Campaña hardcodeada solo para el módulo de sorteo
  const currentCampaign: Campaign = {
    id: 'CAMP-01',
    name: campanias.find(c => c.activa)?.nombre ?? "Sin campaña activa",
    startDate: '', endDate: '', multiplier: 1,
    productBase: '', productCombo: '', color: 'bg-blue-600',
    prizes: [
      { id: 'p1', level: 'Oro', description: 'Hidrolavadora Industrial' },
      { id: 'p2', level: 'Plata', description: 'Bono $500.000' },
      { id: 'p3', level: 'Bronce', description: 'Kit de Brochas Pro' },
    ],
    status: 'Activa',
  };

  // Eliminar campaña
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiClient.delete(`/campanias/${id}`);
      await fetchCampanias();
    } catch (err: any) {
      const data = err?.response?.data;
      alert(data?.message ?? data?.error ?? 'Error al eliminar la campaña');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // Filtro campañas
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const campaniasFiltradas = mostrarTodas ? campanias : campanias.filter(c => c.activa);

  // Form state
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>(emptyForm());

  const generateCampanaCodigo = () => {
    const year = new Date().getFullYear();
    return `CAMP-${year}-${String(campanias.length + 1).padStart(2, '0')}`;
  };
  const pendingPrizes = currentCampaign.prizes.filter(p => !podiumWinners[p.level]).sort((a, b) => {
    const order = { 'Bronce': 0, 'Plata': 1, 'Oro': 2 };
    return order[a.level] - order[b.level];
  });

  const nextPrize = pendingPrizes[0];
  const isRaffleCompleted = !nextPrize && !isSpinning;

  const handleStartRaffle = () => {
    if (!nextPrize) return;
    setIsSpinning(true);
    setRaffleWinner(null);
    setTimeout(() => {
      setIsSpinning(false);
      const newWinner = {
        name: ["Ferretería El Martillo", "Distribuidora Sika", "Construcciones Pro", "Mundo Ferretero"][Math.floor(Math.random() * 4)],
        ticket: `TKT-2023-${Math.floor(Math.random() * 9000) + 1000}`,
        prize: nextPrize.description,
        level: nextPrize.level
      };
      setRaffleWinner(newWinner);
      setPodiumWinners(prev => ({ ...prev, [nextPrize.level]: newWinner }));
      if (nextPrize.level === 'Oro') {
        setTimeout(() => {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 12000);
        }, 1000);
      }
    }, 3000);
  };

  // --- HANDLERS DEL FORMULARIO ---
  const openNewForm = () => {
    setEditingCampaignId(null);
    setFormData({ ...emptyForm(), codigo: generateCampanaCodigo() });
    setSubmitError(null);
    setShowCampaignForm(true);
  };

  const openEditForm = async (camp: CampaniaAPI) => {
    setEditingCampaignId(String(camp.id));
    setSubmitError(null);

    // Armar detalles con código como nombre provisional
    const detallesBase = camp.detalles.length > 0
      ? camp.detalles.map(d => ({
          producto_codigo: d.producto_codigo,
          producto_nombre: d.producto_nombre ?? d.producto_codigo,
          multiplicador: d.multiplicador,
          premio: d.premio,
          posicion_premio: d.posicion_premio,
        }))
      : [emptyDetalle()];

    setFormData({
      codigo: camp.codigo,
      nombre: camp.nombre,
      descripcion: camp.descripcion ?? '',
      fecha_inicio: camp.fecha_inicio.slice(0, 10),
      fecha_fin: camp.fecha_fin.slice(0, 10),
      detalles: detallesBase,
    });
    setShowCampaignForm(true);

    // Resolver nombres reales de productos en paralelo
    const detallesConNombre = await Promise.all(
      detallesBase.map(async (d) => {
        if (d.producto_nombre !== d.producto_codigo) return d;
        try {
          const res = await apiClient.get('/products/buscar', {
            params: { q: d.producto_codigo, limit: 5 },
          });
          const items: ProductSearchResult[] = res.data?.data ?? res.data ?? [];
          const match = items.find(p => p.codigo === d.producto_codigo);
          return { ...d, producto_nombre: match?.descripcion ?? d.producto_codigo };
        } catch {
          return d;
        }
      })
    );

    setFormData(prev => ({ ...prev, detalles: detallesConNombre }));
  };

  const closeForm = () => {
    setShowCampaignForm(false);
    setEditingCampaignId(null);
    setSubmitError(null);
  };

  const updateField = (field: keyof Omit<CampaignFormData, 'detalles'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateDetalle = (index: number, field: keyof CampaignDetalle, value: string | number) => {
    setFormData(prev => {
      const detalles = [...prev.detalles];
      detalles[index] = { ...detalles[index], [field]: value };
      return { ...prev, detalles };
    });
  };

  const addDetalle = () => {
    setFormData(prev => ({ ...prev, detalles: [...prev.detalles, emptyDetalle()] }));
  };

  const removeDetalle = (index: number) => {
    setFormData(prev => ({ ...prev, detalles: prev.detalles.filter((_, i) => i !== index) }));
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validación cliente
    for (let i = 0; i < formData.detalles.length; i++) {
      const d = formData.detalles[i];
      if (!d.producto_codigo) {
        setSubmitError(`Producto #${i + 1}: debes seleccionar un producto del buscador`);
        return;
      }
      if (!d.premio.trim()) {
        setSubmitError(`Producto #${i + 1}: el campo Premio es requerido`);
        return;
      }
    }

    setSubmitting(true);

    const body = {
      codigo: formData.codigo,
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin,
      detalles: formData.detalles.map(d => ({
        producto_codigo: d.producto_codigo,
        producto_nombre: d.producto_nombre,
        multiplicador: Number(d.multiplicador),
        premio: d.premio.trim(),
        posicion_premio: Number(d.posicion_premio),
      })),
    };

    console.log('📤 Campania body:', JSON.stringify(body, null, 2));

    try {
      if (editingCampaignId) {
        await apiClient.put(`/campanias/${editingCampaignId}`, body);
      } else {
        await apiClient.post('/campanias', body);
      }
      await fetchCampanias();
      closeForm();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.message ?? data?.error ?? data?.errors?.[0]?.msg
        ?? data?.errors?.[0] ?? err?.message ?? 'Error al guardar la campaña';
      setSubmitError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  // --- RENDERS ---
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
            <div className="text-2xl font-bold">
              {loadingClientes ? '...' : (clientesData?.total_activos.toLocaleString('es-CO') ?? '—')}
            </div>
            <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
              <CheckCircle2 size={12} />
              {loadingClientes ? '...' : `${clientesData?.participacion ?? '—'}% participación`}
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
          <CardHeader><CardTitle>Campaña{campanias.filter(c => c.activa).length !== 1 ? 's Activas' : ' Actual'}</CardTitle></CardHeader>
          <CardContent>
            {(() => {
              const activas = campanias.filter(c => c.activa).slice(0, 3);
              if (activas.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <Megaphone size={32} className="opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">Sin campañas activas</p>
                  </div>
                );
              }
              const compact = activas.length > 1;
              return (
                <div className={cn('gap-3', compact ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : '')}>
                  {activas.map(camp => {
                    const maxMult = Math.max(...camp.detalles.map(d => d.multiplicador), 0);
                    return (
                      <div key={camp.id} className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0 pr-2">
                            <h3 className={cn('font-bold text-primary leading-tight', compact ? 'text-sm' : 'text-lg')}
                              title={camp.nombre}>
                              {compact ? (
                                <span className="line-clamp-2">{camp.nombre}</span>
                              ) : camp.nombre}
                            </h3>
                            <p className={cn('text-muted-foreground mt-0.5', compact ? 'text-[10px]' : 'text-sm')}>
                              {camp.fecha_inicio.slice(0, 10)} — {camp.fecha_fin.slice(0, 10)}
                              {(() => {
                                const dias = Math.ceil((new Date(camp.fecha_fin).getTime() - Date.now()) / 86400000);
                                if (dias < 0) return <span className="ml-2 text-destructive font-black">Vencida</span>;
                                if (dias === 0) return <span className="ml-2 text-orange-500 font-black">Vence hoy</span>;
                                return <span className={cn('ml-2 font-black', dias <= 7 ? 'text-orange-500' : 'text-green-500')}>{dias}d restantes</span>;
                              })()}
                            </p>
                          </div>
                          {maxMult > 0 && (
                            <div className={cn('shrink-0 bg-primary text-primary-foreground font-black rounded-full whitespace-nowrap', compact ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-xs')}>
                              X{maxMult} TICKETS
                            </div>
                          )}
                        </div>
                        {!compact && camp.detalles.length > 0 && (
                          <div className="space-y-2 mt-3">
                            {camp.detalles.slice(0, 3).map(d => (
                              <div key={d.id} className="flex items-center gap-2 text-sm">
                                <Gift size={14} className="text-primary shrink-0" />
                                <span className="truncate">{d.premio}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {compact && camp.detalles.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {camp.detalles.slice(0, 2).map(d => (
                              <span key={d.id} className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded truncate max-w-full">
                                {d.premio}
                              </span>
                            ))}
                            {camp.detalles.length > 2 && (
                              <span className="text-[9px] text-muted-foreground font-bold">+{camp.detalles.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader><CardTitle>Últimos Ganadores</CardTitle></CardHeader>
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

  const renderClientes = () => {
    const formatCOP = (n: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

    const clientes = clientesData?.data ?? [];
    const filtrados = searchTerm.trim()
      ? clientes.filter(c =>
          (c.razon_social ?? c.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      : clientes;

    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Gestión de Clientes</CardTitle>
              {clientesData && (
                <p className="text-xs text-muted-foreground mt-1">
                  {clientesData.total_activos.toLocaleString('es-CO')} activos de {clientesData.total_registrados.toLocaleString('es-CO')} registrados · {clientesData.participacion}% participación
                </p>
              )}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingClientes ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold uppercase tracking-widest">Cargando clientes...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">NIT</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Razón Social</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Celular</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Facturas</th>
                    <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Comprado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                        {clientes.length === 0 ? 'Sin datos de clientes' : 'No se encontraron resultados'}
                      </td>
                    </tr>
                  ) : (
                    filtrados.map(c => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{c.nit ?? '—'}</td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <p className="font-medium text-xs truncate">{c.razon_social || c.nombre}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{c.email ?? '—'}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{c.celular ?? '—'}</td>
                        <td className="py-3 px-4 text-right font-bold text-xs text-primary">{c.total_facturas}</td>
                        <td className="py-3 px-4 text-right font-mono text-xs font-bold">{formatCOP(c.total_comprado)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCampanas = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Campañas de Fidelización</h2>
        <div className="flex items-center gap-4">
          {/* Switch mostrar todas */}
          <button
            type="button"
            onClick={() => setMostrarTodas(prev => !prev)}
            className="flex items-center gap-2.5 group"
          >
            <div className={cn(
              "relative w-10 h-5 rounded-full transition-colors duration-200",
              mostrarTodas ? "bg-primary" : "bg-muted-foreground/30"
            )}>
              <div className={cn(
                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                mostrarTodas ? "translate-x-5" : "translate-x-0.5"
              )} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              {mostrarTodas ? 'Todas' : 'Solo activas'}
            </span>
          </button>
          <Button className="gap-2" onClick={openNewForm}>
            <PlusCircle size={18} /> Nueva Campaña
          </Button>
        </div>
      </div>

      {loadingCampanias && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold uppercase tracking-widest">Cargando campañas...</span>
        </div>
      )}

      {errorCampanias && !loadingCampanias && (
        <div className="flex items-center justify-center py-16 gap-3 text-destructive">
          <AlertCircle size={18} />
          <span className="text-sm font-bold">{errorCampanias}</span>
          <Button variant="outline" size="sm" onClick={fetchCampanias} className="ml-2 text-xs">Reintentar</Button>
        </div>
      )}

      {!loadingCampanias && !errorCampanias && campaniasFiltradas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Megaphone size={40} className="opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest">No hay campañas registradas</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaniasFiltradas.map((camp) => {
          const maxMultiplicador = Math.max(...camp.detalles.map(d => d.multiplicador), 0);
          return (
            <Card key={camp.id} className={cn("overflow-hidden border-l-4", camp.activa ? "border-l-green-500" : "border-l-muted")}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge className={cn("mb-2 uppercase tracking-tighter text-[10px]", camp.activa ? 'bg-green-500' : 'bg-slate-400')}>
                    {camp.activa ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <div className="text-xs font-mono text-muted-foreground">{camp.codigo}</div>
                </div>
                <CardTitle className="text-xl">{camp.nombre}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {camp.fecha_inicio.slice(0, 10)} al {camp.fecha_fin.slice(0, 10)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-accent/50 border border-border">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Mult. máximo</p>
                      <p className="text-xl font-black text-primary">
                        {maxMultiplicador > 0 ? `X${maxMultiplicador}` : '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-accent/50 border border-border">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Productos</p>
                      <p className="text-xl font-black text-primary">{camp.detalles.length}</p>
                    </div>
                  </div>
                  {camp.detalles.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-2 uppercase tracking-widest text-muted-foreground">Premios</p>
                      <div className="space-y-1.5">
                        {camp.detalles.map((d) => (
                          <div key={d.id} className="flex items-center justify-between text-sm p-2 rounded bg-primary/5">
                            <div className="flex items-center gap-2">
                              <Gift size={13} className="text-primary shrink-0" />
                              <span className="font-medium truncate">{d.premio}</span>
                            </div>
                            <span className="text-[10px] font-black text-primary shrink-0 ml-2">X{d.multiplicador}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6 space-y-2">
                  {confirmDeleteId === camp.id ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                      <p className="text-xs font-bold text-destructive flex-1">¿Eliminar campaña?</p>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-[10px] font-black uppercase px-3"
                        disabled={deletingId === camp.id}
                        onClick={() => handleDelete(camp.id)}
                      >
                        {deletingId === camp.id ? 'Eliminando...' : 'Confirmar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] font-black uppercase px-3"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2" size="sm" onClick={() => openEditForm(camp)}>
                        <Edit3 size={14} /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                        onClick={() => setConfirmDeleteId(camp.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderSorteo = () => (
    <div className="flex flex-col items-start justify-center space-y-12 py-10 w-full relative overflow-hidden min-h-[850px]">
      <AnimatePresence>
        {showConfetti && <ConfettiCelebration />}
      </AnimatePresence>

      <div className="text-center space-y-2 w-full">
        <h2 className="text-4xl font-black uppercase tracking-tighter">Sorteo de Campaña</h2>
        <p className="text-muted-foreground uppercase font-bold tracking-widest text-xs">{currentCampaign.name}</p>
      </div>

      <motion.div layout className={cn("flex flex-col xl:flex-row items-center justify-start gap-12 w-full px-4 transition-all duration-1000", isRaffleCompleted && "justify-center")}>
        <AnimatePresence mode="wait">
          {!isRaffleCompleted && (
            <motion.div key="roulette-section" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.5 } }} className="flex flex-col items-center space-y-8 w-full xl:w-[35%] shrink-0">
              <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                <div className={cn("w-full h-full rounded-full border-8 border-primary/20 flex items-center justify-center relative overflow-hidden transition-all duration-500", isSpinning && "animate-spin")}>
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="absolute w-1 h-full bg-primary/10" style={{ transform: `rotate(${i * 30}deg)` }} />
                  ))}
                  <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-card border-4 border-primary flex flex-col items-center justify-center text-center p-6 shadow-2xl z-10">
                    {raffleWinner ? (
                      <div className="animate-in zoom-in duration-500">
                        <Trophy size={48} className={cn("mb-2 mx-auto", raffleWinner.level === 'Oro' ? "text-yellow-500" : raffleWinner.level === 'Plata' ? "text-slate-400" : "text-amber-700")} />
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">¡Ganador!</p>
                        <h3 className="text-base font-black leading-tight uppercase line-clamp-2">{raffleWinner.name}</h3>
                        <p className="text-[9px] font-mono mt-1 text-primary">{raffleWinner.ticket}</p>
                        <div className="mt-2 px-2 py-1 bg-primary/10 rounded text-[9px] font-bold text-primary uppercase">{raffleWinner.prize}</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center animate-pulse">
                        {nextPrize ? (
                          <>
                            <Gift size={48} className="text-primary/30 mb-2" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-[9px]">Siguiente Premio:</p>
                            <p className="text-sm font-black text-primary uppercase tracking-tighter">{nextPrize.level}</p>
                          </>
                        ) : (
                          <>
                            <Trophy size={48} className="text-yellow-500 mb-2" />
                            <p className="text-sm font-black uppercase">Sorteo Finalizado</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full border-4 border-background z-20" />
              </div>

              <div className="flex flex-col w-full max-w-[280px] gap-4">
                <Button size="lg" className="w-full py-8 text-lg font-black uppercase tracking-widest gap-3 shadow-xl" disabled={isSpinning || !nextPrize} onClick={handleStartRaffle}>
                  {isSpinning ? (<><RefreshCw className="animate-spin" size={20} /> Sorteando...</>) : (nextPrize ? `Sortear ${nextPrize.level}` : "Completado")}
                </Button>
                <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black text-muted-foreground" onClick={() => { setPodiumWinners({}); setRaffleWinner(null); }}>
                  Reiniciar Sorteo
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div layout className={cn("flex flex-col items-center justify-end h-full pt-10 transition-all duration-1000 ease-in-out", !isRaffleCompleted ? "w-full xl:w-[65%]" : "w-full max-w-6xl mx-auto")}>
          <div className={cn("flex items-end gap-3 md:gap-8 h-[550px] w-full px-4 transition-all duration-1000", isRaffleCompleted ? "scale-110 mt-10" : "scale-100")}>
            <div className="flex-1 flex flex-col items-center">
              <div className={cn("w-full h-[280px] rounded-t-3xl border-x-4 border-t-4 flex flex-col items-center justify-end p-6 transition-all duration-700 shadow-2xl relative", podiumWinners.Plata ? "bg-slate-100 border-slate-300 dark:bg-slate-900/50 dark:border-slate-700 shadow-xl" : "bg-accent/10 border-transparent opacity-10")}>
                {podiumWinners.Plata && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center w-full">
                    <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center mx-auto mb-8 -mt-28 border-4 border-slate-300">
                      <Medal size={32} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-black uppercase truncate w-full px-2">{podiumWinners.Plata.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black mt-2 tracking-widest">Segundo Puesto</p>
                  </motion.div>
                )}
                <div className="mt-auto font-black text-6xl text-slate-300 dark:text-slate-700">2</div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center">
              <div className={cn("w-full h-[450px] rounded-t-[2.5rem] border-x-4 border-t-4 flex flex-col items-center justify-end p-6 transition-all duration-1000 shadow-2xl relative", podiumWinners.Oro ? "bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-900/50 shadow-[0_-30px_60px_-15px_rgba(234,179,8,0.4)]" : "bg-accent/10 border-transparent opacity-10")}>
                {podiumWinners.Oro && (
                  <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center w-full">
                    <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 shadow-2xl flex items-center justify-center mx-auto mb-12 -mt-40 border-4 border-yellow-400 relative">
                      <motion.div animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
                        <Trophy size={56} className="text-yellow-500" />
                      </motion.div>
                      <div className="absolute inset-0 rounded-full animate-ping bg-yellow-400/30" />
                    </div>
                    <p className="text-2xl font-black uppercase truncate w-full px-2 leading-none">{podiumWinners.Oro.name}</p>
                    <p className="text-xs text-yellow-600 font-black mt-3 uppercase tracking-[0.3em]">Gran Ganador Oro</p>
                    <div className="mt-6 px-6 py-2.5 bg-yellow-400 text-yellow-950 rounded-full text-xs font-black uppercase tracking-tight shadow-lg inline-block">
                      {podiumWinners.Oro.prize}
                    </div>
                  </motion.div>
                )}
                <div className="mt-auto font-black text-[10rem] leading-none text-yellow-400/20 dark:text-yellow-900/30">1</div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center">
              <div className={cn("w-full h-[200px] rounded-t-3xl border-x-4 border-t-4 flex flex-col items-center justify-end p-6 transition-all duration-500 shadow-2xl relative", podiumWinners.Bronce ? "bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-900/50 shadow-lg" : "bg-accent/10 border-transparent opacity-10")}>
                {podiumWinners.Bronce && (
                  <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center w-full">
                    <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mx-auto mb-6 -mt-24 border-4 border-amber-700">
                      <Medal size={28} className="text-amber-700" />
                    </div>
                    <p className="text-sm font-black uppercase truncate w-full px-2">{podiumWinners.Bronce.name}</p>
                    <p className="text-[10px] text-amber-800/70 font-black mt-2 uppercase tracking-widest">Tercer Puesto</p>
                  </motion.div>
                )}
                <div className="mt-auto font-black text-5xl text-amber-700/20 dark:text-amber-900/30">3</div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isRaffleCompleted && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, duration: 0.5 }} className="mt-16">
                <Button size="lg" variant="outline" className="uppercase font-black tracking-[0.3em] px-10 py-8 border-2 hover:bg-primary hover:text-white transition-all text-xs" onClick={() => { setPodiumWinners({}); setRaffleWinner(null); }}>
                  Reiniciar Todo el Sorteo
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-background">
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
          {['general', 'clientes', 'campanas', 'sorteo'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-5 py-2 rounded-lg text-xs font-black uppercase transition-all duration-300",
                activeTab === tab ? "bg-primary text-primary-foreground shadow-lg scale-105" : "hover:bg-accent text-muted-foreground"
              )}
            >
              {tab === 'campanas' ? 'Campañas' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-8">
        {activeTab === 'general' && renderGeneral()}
        {activeTab === 'clientes' && renderClientes()}
        {activeTab === 'campanas' && renderCampanas()}
        {activeTab === 'sorteo' && renderSorteo()}
      </motion.div>

      <footer className="mt-20 pt-8 border-t border-border/50 text-center opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.5em]">
          Ferreganga v1.0 • Motor de Fidelidad y Datos
        </p>
      </footer>

      {/* Modal Formulario Campaña */}
      <AnimatePresence>
        {showCampaignForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter">
                    {editingCampaignId ? 'Editar Campaña' : 'Nueva Campaña'}
                  </h2>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-0.5">
                    {editingCampaignId ? `ID: ${editingCampaignId}` : 'Complete los campos requeridos'}
                  </p>
                </div>
                <button onClick={closeForm} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                <div className="px-6 py-6 space-y-6">

                  {/* Datos generales */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Datos Generales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Código</label>
                        <Input
                          value={formData.codigo}
                          readOnly
                          className="font-mono bg-accent/40 text-muted-foreground cursor-default select-none"
                          tabIndex={-1}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre *</label>
                        <Input
                          placeholder="Nombre de la campaña"
                          value={formData.nombre}
                          onChange={(e) => updateField('nombre', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción *</label>
                        <textarea
                          placeholder="Descripción de la campaña..."
                          value={formData.descripcion}
                          onChange={(e) => updateField('descripcion', e.target.value)}
                          rows={3}
                          required
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha Inicio *</label>
                        <Input
                          type="date"
                          value={formData.fecha_inicio}
                          onChange={(e) => updateField('fecha_inicio', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha Fin *</label>
                        <Input
                          type="date"
                          value={formData.fecha_fin}
                          onChange={(e) => updateField('fecha_fin', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        Detalles / Productos
                      </h3>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={addDetalle}>
                        <Plus size={13} /> Agregar Producto
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {formData.detalles.map((detalle, index) => (
                        <div key={index} className="p-4 rounded-xl border border-border bg-accent/20 relative">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                              Producto #{index + 1}
                            </span>
                            {formData.detalles.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDetalle(index)}
                                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Producto *</label>
                              <ProductSearchInput
                                value={detalle.producto_nombre}
                                onSelect={(codigo, nombre) => {
                                  updateDetalle(index, 'producto_codigo', codigo);
                                  updateDetalle(index, 'producto_nombre', nombre);
                                }}
                              />
                              {detalle.producto_codigo && (
                                <p className="text-[10px] font-mono text-muted-foreground mt-1 pl-1">
                                  Código: <span className="text-primary font-bold">{detalle.producto_codigo}</span>
                                </p>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Multiplicador *</label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                placeholder="Ej: 3.5"
                                value={detalle.multiplicador}
                                onChange={(e) => updateDetalle(index, 'multiplicador', e.target.value)}
                                required
                                className="text-sm h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Premio *</label>
                              <Input
                                placeholder="Ej: Tablet Samsung"
                                value={detalle.premio}
                                onChange={(e) => updateDetalle(index, 'premio', e.target.value)}
                                required
                                className="text-sm h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Posición Premio *</label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="1"
                                value={detalle.posicion_premio}
                                onChange={(e) => updateDetalle(index, 'posicion_premio', e.target.value)}
                                required
                                className="text-sm h-9"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-accent/20 rounded-b-2xl shrink-0">
                  <div className="flex-1">
                    {submitError && (
                      <p className="text-xs text-destructive font-bold flex items-center gap-1.5">
                        <AlertCircle size={13} /> {submitError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={closeForm} disabled={submitting} className="text-xs font-black uppercase tracking-wider">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting} className="gap-2 text-xs font-black uppercase tracking-wider min-w-[140px]">
                      {submitting ? (
                        <><div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Guardando...</>
                      ) : (
                        <><Save size={14} />{editingCampaignId ? 'Guardar Cambios' : 'Crear Campaña'}</>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const ConfettiCelebration = () => {
  const colors = ['#eab308', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {[...Array(150)].map((_, i) => (
        <motion.div
          key={`left-${i}`}
          initial={{ bottom: -50, left: -50, opacity: 1, scale: Math.random() * 0.5 + 0.5, rotate: 0 }}
          animate={{ bottom: ['0%', '100%', '80%'], left: ['0%', '100%', '120%'], rotate: Math.random() * 1000 + 500, opacity: [1, 1, 0] }}
          transition={{ duration: Math.random() * 3 + 4, ease: [0.22, 1, 0.36, 1], repeat: 0, delay: Math.random() * 0.5 }}
          style={{ position: 'absolute', width: Math.random() * 15 + 5, height: Math.random() * 8 + 4, backgroundColor: colors[Math.floor(Math.random() * colors.length)], borderRadius: '2px' }}
        />
      ))}
      {[...Array(150)].map((_, i) => (
        <motion.div
          key={`right-${i}`}
          initial={{ bottom: -50, right: -50, opacity: 1, scale: Math.random() * 0.5 + 0.5, rotate: 0 }}
          animate={{ bottom: ['0%', '100%', '80%'], right: ['0%', '100%', '120%'], rotate: Math.random() * -1000 - 500, opacity: [1, 1, 0] }}
          transition={{ duration: Math.random() * 3 + 4, ease: [0.22, 1, 0.36, 1], repeat: 0, delay: Math.random() * 0.5 }}
          style={{ position: 'absolute', width: Math.random() * 15 + 5, height: Math.random() * 8 + 4, backgroundColor: colors[Math.floor(Math.random() * colors.length)], borderRadius: '2px' }}
        />
      ))}
    </div>
  );
};

interface ProductSearchResult {
  rowid: number;
  codigo: string;
  descripcion: string;
  descripcion_corta: string;
}

const ProductSearchInput = ({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (codigo: string, nombre: string) => void;
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/products/buscar', { params: { q, limit: 20 } });
        const data: ProductSearchResult[] = res.data?.data ?? res.data ?? [];
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Escribe para buscar producto..."
          className="text-sm h-9 pr-8"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-[100] top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl overflow-y-auto max-h-52">
          {results.map((p) => (
            <button
              key={p.rowid}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(p.codigo, p.descripcion);
                setQuery(p.descripcion);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex flex-col border-b border-border/40 last:border-0"
            >
              <span className="font-medium leading-tight">{p.descripcion}</span>
              <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{p.codigo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const RefreshCw = ({ className, size }: { className?: string, size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <path d="M3 3v5h5"></path>
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
    <path d="M16 16h5v5"></path>
  </svg>
);

export default FerregangaPage;
