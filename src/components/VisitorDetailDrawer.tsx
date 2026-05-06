import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchVisitorDetail } from '@/services/api';
import {
    X,
    Globe,
    Clock,
    MapPin,
    Monitor,
    Smartphone,
    ShoppingCart,
    DollarSign,
    User,
    Megaphone,
    AlertTriangle,
    ArrowRight,
    ExternalLink,
    MousePointer,
    Eye,
    ScrollText,
    Loader2,
    Crosshair,
    Repeat,
    Fingerprint,
    Shield,
    FileText,
    BarChart3,
    Timer,
    Calendar,
    Zap,
    Activity,
    ChevronDown,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
interface VisitorDetailDrawerProps {
    visitorId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

interface SessionEvent {
    type: string;
    target: string | null;
    label: string | null;
    value: string | null;
    duration: number | null;
    time: string;
}

interface PastSession {
    id: number;
    date: string;
    time_ago: string;
    created_at: string;
    status: string;
    tracker_name: string;
    url: string | null;
    referer: string | null;
    device_type: string | null;
    browser: string | null;
    system: string | null;
    session_duration: string | null;
    escape: boolean;
    campaign: string | null;
    keyword: string | null;
    gclid: string | null;
    events: SessionEvent[];
    events_count: number;
}

// --- Status/Event Configuration ---
const statusStyles: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    sale: { label: 'Venda Realizada', color: 'text-green-500', bg: 'bg-green-500/10', icon: DollarSign },
    checkout: { label: 'Iniciou Checkout', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: ShoppingCart },
    proxy: { label: 'Suspeito (VPN/Proxy)', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
    visitor: { label: 'Apenas Visitou', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: User },
};

const getEventDisplay = (event: SessionEvent) => {
    const lower = event.type?.toLowerCase() || '';
    if (lower.includes('scroll')) {
        const pct = event.value ? parseInt(event.value, 10) : 0;
        return {
            icon: BarChart3,
            color: 'text-cyan-500',
            bg: 'bg-cyan-500/15',
            title: pct > 0 ? `Visualizou ${pct}% da página` : 'Rolou a página',
            progress: pct,
        };
    }
    if (lower.includes('pageview')) {
        return { icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/15', title: 'Acessou a Página' };
    }
    if (lower.includes('click_link')) {
        return { icon: MousePointer, color: 'text-violet-500', bg: 'bg-violet-500/15', title: event.label ? `Clicou no link "${event.label}"` : 'Clicou em um link' };
    }
    if (lower.includes('click')) {
        return { icon: MousePointer, color: 'text-amber-500', bg: 'bg-amber-500/15', title: event.label ? `Clicou em "${event.label}"` : 'Clicou na tela' };
    }
    if (lower.includes('form') || lower.includes('submit')) {
        return { icon: FileText, color: 'text-green-500', bg: 'bg-green-500/15', title: 'Enviou Formulário' };
    }
    if (lower.includes('checkout')) {
        return { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-600/15', title: 'Iniciou Checkout' };
    }
    if (lower.includes('purchase') || lower.includes('sale')) {
        return { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-600/15', title: 'Realizou Compra' };
    }
    return { icon: Activity, color: 'text-muted-foreground', bg: 'bg-secondary', title: event.label || event.type };
};

// --- Components ---
const StatBox: React.FC<{ label: string; value: string | number; icon: React.ElementType; color?: string; subtitle?: string }> = ({ label, value, icon: Ic, color, subtitle }) => (
    <div className="flex flex-col p-4 rounded-xl bg-card border border-border/50 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between mb-2 z-10">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <Ic className={cn("w-4 h-4", color || "text-muted-foreground")} />
        </div>
        <div className="z-10">
            <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
            {subtitle && <span className="text-[10px] ml-1 text-muted-foreground">{subtitle}</span>}
        </div>
        {/* Background Hint */}
        <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
            <Ic className="w-24 h-24" />
        </div>
    </div>
);

const SessionTimeline: React.FC<{ session: PastSession; isExpandedDefault: boolean }> = ({ session, isExpandedDefault }) => {
    const [open, setOpen] = useState(isExpandedDefault);
    const sc = statusStyles[session.status] || statusStyles.visitor;
    const StatusIc = sc.icon;

    const maxScroll = session.events.reduce((max, e) => {
        if ((e.type || '').toLowerCase().includes('scroll') && e.value) {
            const v = parseInt(e.value, 10);
            return isNaN(v) ? max : Math.max(max, v);
        }
        return max;
    }, 0);
    const pageviews = session.events.filter(e => (e.type || '').toLowerCase().includes('pageview')).length;

    return (
        <div className="relative">
            {/* Timeline connector */}
            <div className="absolute left-[24px] top-12 bottom-0 w-px bg-border/50" />

            {/* Session Node */}
            <div className="relative z-10 flex gap-4">
                {/* Date / Status Node */}
                <button
                    onClick={() => setOpen(!open)}
                    className="flex-shrink-0 w-12 h-12 mt-1 rounded-2xl flex flex-col items-center justify-center bg-card border border-border/50 hover:bg-secondary transition-colors cursor-pointer group shadow-sm"
                >
                    <StatusIc className={cn("w-5 h-5 mb-0.5 group-hover:scale-110 transition-transform", sc.color)} />
                </button>

                {/* Session Card */}
                <div className={cn(
                    "flex-1 bg-card border shadow-sm rounded-xl overflow-hidden transition-all duration-300",
                    open ? "border-primary/30 ring-1 ring-primary/10 mb-6" : "border-border/50 hover:border-border/80 mb-4"
                )}>
                    {/* Header */}
                    <div
                        className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        onClick={() => setOpen(!open)}
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-foreground">{session.date}</span>
                                {session.time_ago.includes('agora') || session.time_ago.includes('minuto') ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                        Sessão Atual
                                    </span>
                                ) : null}
                                <span className="text-xs text-muted-foreground">({session.time_ago})</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs divide-x divide-border">
                                <span className={cn("font-medium pr-2", sc.color)}>{sc.label}</span>
                                <span className="px-2 text-muted-foreground flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" />{session.session_duration || '0s'}</span>
                                {pageviews > 0 && <span className="px-2 text-muted-foreground flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />{pageviews} pág.</span>}
                                {maxScroll > 0 && <span className="px-2 text-muted-foreground flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Viu {maxScroll}%</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end text-xs">
                                {session.tracker_name && <span className="font-semibold text-foreground flex items-center gap-1.5"><Crosshair className="w-3.5 h-3.5 text-muted-foreground" />{session.tracker_name}</span>}
                                {session.campaign && <span className="text-amber-500 truncate max-w-[120px]">{session.campaign}</span>}
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                        </div>
                    </div>

                    {/* Body (Events) */}
                    <div className={cn(
                        "grid transition-all duration-300 ease-in-out",
                        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}>
                        <div className="overflow-hidden">
                            <div className="px-5 py-4 border-t border-border/50 bg-secondary/20">

                                {/* Technical Meta info */}
                                <div className="flex flex-wrap items-center gap-3 mb-5 text-[11px] text-muted-foreground">
                                    {session.browser && <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-foreground/50" />{session.browser}</span>}
                                    {session.system && <span className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5 text-foreground/50" />{session.system}</span>}
                                    {session.device_type && <span className="flex items-center gap-1.5">{session.device_type === 'mobile' ? <Smartphone className="w-3.5 h-3.5 text-foreground/50" /> : <Monitor className="w-3.5 h-3.5 text-foreground/50" />}{session.device_type}</span>}
                                    {session.gclid && <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">Tráfego Pago</span>}
                                    {session.escape && <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-600 font-medium">Fuga Detectada</span>}
                                    {session.referer && (
                                        <span className="flex items-center gap-1.5 max-w-[200px] truncate" title={`Origem: ${session.referer}`}>
                                            <ArrowRight className="w-3 h-3 text-foreground/50" /> Origem: {session.referer}
                                        </span>
                                    )}
                                </div>

                                {/* Events list */}
                                {session.events.length > 0 ? (
                                    <div className="relative pl-3 space-y-4 before:absolute before:inset-y-2 before:left-[15px] before:w-[2px] before:bg-border/50">
                                        {session.events.map((event, i) => {
                                            const display = getEventDisplay(event);
                                            const EventIc = display.icon;

                                            return (
                                                <div key={i} className="relative flex gap-4 pr-2 group">
                                                    {/* Dot */}
                                                    <div className={cn(
                                                        "relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-card shrink-0 transition-transform group-hover:scale-110",
                                                        display.bg
                                                    )}>
                                                        <EventIc className={cn("w-3.5 h-3.5", display.color)} />
                                                    </div>

                                                    {/* Event info */}
                                                    <div className="flex-1 min-w-0 pt-1.5">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                                            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                                {display.title}
                                                                {display.progress !== undefined && display.progress > 0 && (
                                                                    <span className="text-xs font-medium text-cyan-600 px-1.5 py-0.5 rounded bg-cyan-500/10">{display.progress}%</span>
                                                                )}
                                                            </span>
                                                            <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">{event.time.split(' ')[1]}</span>
                                                        </div>

                                                        {/* Optional Progress Bar for scroll */}
                                                        {display.progress !== undefined && display.progress > 0 && (
                                                            <div className="w-full max-w-[200px] h-1.5 rounded-full bg-secondary overflow-hidden mt-1.5 mb-2">
                                                                <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${display.progress}%` }} />
                                                            </div>
                                                        )}

                                                        {/* Target link/URL */}
                                                        {event.target && (
                                                            <a
                                                                href={event.target.startsWith('http') ? event.target : undefined}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={cn(
                                                                    "text-[11px] truncate max-w-full inline-block mt-0.5",
                                                                    event.target.startsWith('http') ? "text-primary hover:underline" : "text-muted-foreground"
                                                                )}
                                                            >
                                                                {event.target}
                                                            </a>
                                                        )}

                                                        {/* Duration on action */}
                                                        {event.duration != null && event.duration > 0 && (
                                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                                                <Timer className="w-3 h-3" /> Ficou {event.duration}s nesta etapa
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-6 text-center text-muted-foreground/50 border border-dashed border-border/50 rounded-lg">
                                        <Activity className="w-6 h-6 mx-auto mb-2 opacity-30" />
                                        <span className="text-xs">Nenhum evento registrado nesta sessão.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Modal Root ---
const VisitorDetailDrawer: React.FC<VisitorDetailDrawerProps> = ({ visitorId, isOpen, onClose }) => {
    const { token } = useAuth();
    const [visitor, setVisitor] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !visitorId || !token) {
            setVisitor(null);
            return;
        }
        setLoading(true);
        setError(null);
        fetchVisitorDetail(token, visitorId)
            .then(setVisitor)
            .catch(() => setError('Erro ao carregar detalhes do visitante.'))
            .finally(() => setLoading(false));
    }, [visitorId, isOpen, token]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handler);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handler);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sessions: PastSession[] = visitor?.past_sessions || [];
    const totalVisits = visitor?.total_visits || 0;
    const isReturning = totalVisits > 1;

    // Global KPIs
    const totalEvents = sessions.reduce((s, sess) => s + sess.events_count, 0);
    const totalPageviews = sessions.reduce((s, sess) => s + sess.events.filter(e => (e.type || '').toLowerCase().includes('pageview')).length, 0);
    const maxScrollEver = sessions.reduce((max, sess) => {
        const sessMax = sess.events.reduce((m, e) => {
            if ((e.type || '').toLowerCase().includes('scroll') && e.value) {
                const v = parseInt(String(e.value), 10);
                return isNaN(v) ? m : Math.max(m, v);
            }
            return m;
        }, 0);
        return Math.max(max, sessMax);
    }, 0);

    // Calculate average session duration based on sessions that have session_duration
    const durationsInSeconds = sessions.map(sess => {
        if (!sess.session_duration) return 0;
        // Handle formats like "10 minutos e 26 segundos" or "5s"
        let totalSeconds = 0;
        const durStr = sess.session_duration.toLowerCase();

        // Simple parsing for "X horas e Y minutos e Z segundos"
        const hoursMatch = durStr.match(/(\d+)\s*hora/);
        const minsMatch = durStr.match(/(\d+)\s*minuto/);
        const secsMatch = durStr.match(/(\d+)\s*segundo/);

        if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
        if (minsMatch) totalSeconds += parseInt(minsMatch[1]) * 60;
        if (secsMatch) totalSeconds += parseInt(secsMatch[1]);

        // Support for fallback "5s" or "10m" format if it exists
        if (!hoursMatch && !minsMatch && !secsMatch) {
            const sMatch = durStr.match(/(\d+)s/);
            const mMatch = durStr.match(/(\d+)m/);
            if (mMatch) totalSeconds += parseInt(mMatch[1]) * 60;
            if (sMatch) totalSeconds += parseInt(sMatch[1]);
        }

        return totalSeconds;
    }).filter(s => s > 0);

    const avgDurationSeconds = durationsInSeconds.length > 0
        ? Math.round(durationsInSeconds.reduce((a, b) => a + b, 0) / durationsInSeconds.length)
        : 0;

    let avgDurationFmt = '--';
    if (avgDurationSeconds > 0) {
        if (avgDurationSeconds < 60) {
            avgDurationFmt = `${avgDurationSeconds}s`;
        } else if (avgDurationSeconds < 3600) {
            const m = Math.floor(avgDurationSeconds / 60);
            const s = avgDurationSeconds % 60;
            avgDurationFmt = s > 0 ? `${m}m ${s}s` : `${m}m`;
        } else {
            const h = Math.floor(avgDurationSeconds / 3600);
            const m = Math.floor((avgDurationSeconds % 3600) / 60);
            avgDurationFmt = m > 0 ? `${h}h ${m}m` : `${h}h`;
        }
    }

    const ipHash = visitor?.network?.ip?.split('.')[3] || visitor?.network?.ip?.split(':')[visitor?.network?.ip?.split(':').length - 1] || 'V';
    // Use first 2 chars of the last segment of the IP for avatar
    const avatarText = ipHash.substring(0, 2).toUpperCase();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-md" onClick={onClose} />

            {/* Container */}
            <div className="relative w-full max-w-6xl h-full max-h-[90vh] flex flex-col bg-background rounded-2xl border border-border/50 shadow-2xl overflow-hidden ring-1 ring-border shadow-black/20 dark:shadow-black/60">

                {/* Header Ribbon */}
                <div className="h-16 shrink-0 bg-card border-b border-border px-6 flex items-center justify-between shadow-sm z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Globe className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground leading-tight">Análise do Visitante</h2>
                            <p className="text-xs text-muted-foreground font-medium">Histórico e Comportamento</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">

                    {loading && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-sm font-semibold text-muted-foreground">Processando dados do visitante...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-8 text-center text-destructive">{error}</div>
                    )}

                    {visitor && !loading && (
                        <>
                            {/* Left Column: Fixed Identity Panel */}
                            <div className="w-full lg:w-[380px] shrink-0 border-r border-border bg-muted/20 flex flex-col h-auto lg:h-full overflow-y-auto hidden-scrollbar z-10">
                                <div className="p-6 space-y-6">

                                    {/* Identity Block */}
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center ring-4 ring-background shadow-xl mb-4 relative">
                                            <User className="w-10 h-10 text-primary opacity-80" strokeWidth={2.5} />
                                            {isReturning && (
                                                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-500 text-amber-50 flex items-center justify-center ring-4 ring-background shadow-md group" title="Visitante Recorrente">
                                                    <Repeat className="w-4 h-4 group-hover:-rotate-90 transition-transform duration-500" />
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-2xl font-black text-foreground tracking-tight break-all mb-1">
                                            {visitor.network?.ip || 'IP Desconhecido'}
                                        </h3>

                                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                                            {visitor.network?.is_proxy && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20">
                                                    <Shield className="w-3.5 h-3.5" /> Proxy
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary border border-border text-foreground">
                                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                                {visitor.location?.city || visitor.location?.country || 'Local Desconhecido'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick KPIs Grid */}
                                    <div className="grid grid-cols-2 gap-3 pb-6 border-b border-border/50">
                                        <StatBox label="Total Visitas" value={totalVisits} icon={Calendar} color="text-primary" />
                                        <StatBox label="Tempo Médio" value={avgDurationFmt} icon={Timer} color="text-emerald-500" subtitle="por sessão" />
                                        <StatBox label="Max. Scroll" value={maxScrollEver > 0 ? `${maxScrollEver}%` : '--'} icon={BarChart3} color="text-cyan-500" />
                                        <StatBox label="Ações Totais" value={totalEvents} icon={Zap} color="text-violet-500" />
                                    </div>


                                    {/* System & Tracking Info */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Monitor className="w-3.5 h-3.5" /> Dispositivo & Referência
                                        </h4>

                                        <div className="space-y-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Sistema:</span>
                                                <span className="font-semibold">{visitor.device?.system || '--'} • {visitor.device_type === 'mobile' ? 'Mobile' : 'Desktop'}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Browser:</span>
                                                <span className="font-semibold">{visitor.device?.browser || '--'}</span>
                                            </div>
                                            {visitor.tracker_name && (
                                                <div className="flex justify-between items-center pt-2 border-t border-border">
                                                    <span className="text-muted-foreground">Tracker alvo:</span>
                                                    <span className="font-bold text-primary">{visitor.tracker_name}</span>
                                                </div>
                                            )}
                                            {visitor.source?.campaign && (
                                                <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                                                    <span className="text-muted-foreground">Campanha:</span>
                                                    <span className="font-bold text-amber-600 truncate max-w-[150px]">{visitor.source.campaign}</span>
                                                </div>
                                            )}
                                            {visitor.source?.gclid && (
                                                <div className="pt-2 mt-2 border-t border-border">
                                                    <div className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 font-bold flex items-center justify-center gap-2 outline-dashed outline-1 outline-green-500/30">
                                                        <DollarSign className="w-4 h-4" /> Tráfego Pago Detectado
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Right Column: Sessions Timeline */}
                            <div className="flex-1 bg-background/50 h-full overflow-y-auto scroll-smooth">
                                <div className="p-6 md:p-8 max-w-3xl mx-auto">

                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-xl font-bold text-foreground">Linha do Tempo</h3>
                                            <p className="text-sm text-muted-foreground">Todo o histórico ordenado da visita mais recente para a mais antiga</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                    </div>

                                    {sessions.length > 0 ? (
                                        <div className="space-y-2 pb-12">
                                            {sessions.map((session, idx) => (
                                                <SessionTimeline key={session.id} session={session} isExpandedDefault={idx === 0} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="w-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl">
                                            <ScrollText className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                            <p className="text-muted-foreground font-medium">Nenhum histórico de sessões.</p>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default VisitorDetailDrawer;
