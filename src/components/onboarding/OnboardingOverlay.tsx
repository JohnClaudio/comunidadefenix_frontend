import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ONBOARDING_TRAILS } from '@/components/onboarding/onboardingTrails';
import {
    Crosshair, BarChart3, Layout, Activity, ChevronRight, ChevronLeft,
    X, Sparkles, Rocket, Check, ArrowRight, Code, Plus, Link2,
    TrendingUp, Download, FileText, Webhook, Workflow, Paintbrush,
    LayoutDashboard, PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Icon mapping ──
const ICON_MAP: Record<string, React.ElementType> = {
    Crosshair, BarChart3, Layout, Activity, Plus, Code, Link2,
    TrendingUp, Download, FileText, Webhook, Workflow, Paintbrush,
    LayoutDashboard, PieChart, Sparkles, Rocket, Check,
};

const getIcon = (name: string) => ICON_MAP[name] || Sparkles;

// ══════════════════════════════════════
// WELCOME PHASE
// ══════════════════════════════════════
const WelcomePhase: React.FC<{ onNext: () => void; onSkip: () => void }> = ({ onNext, onSkip }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
        <div className="max-w-lg w-full mx-4 text-center space-y-8">
            {/* Logo / sparkle */}
            <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center animate-in zoom-in duration-700">
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                </div>
            </div>

            <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-700 delay-200">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    Bem-vindo ao SF ADS! 🎯
                </h1>
                <p className="text-base text-white/70 leading-relaxed max-w-md mx-auto">
                    Vamos preparar tudo pra você em poucos minutos.
                    Escolha o que quer fazer e a gente te guia passo a passo.
                </p>
            </div>

            <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-4 duration-700 delay-500">
                <button
                    onClick={onNext}
                    className="w-full py-3.5 px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                    Começar Configuração
                    <ArrowRight className="w-4 h-4" />
                </button>
                <button
                    onClick={onSkip}
                    className="text-white/40 text-xs hover:text-white/60 transition-colors py-2"
                >
                    Pular tutorial — já sei usar o sistema
                </button>
            </div>
        </div>
    </div>
);

// ══════════════════════════════════════
// SELECT PHASE
// ══════════════════════════════════════
const SelectPhase: React.FC<{ onSelect: (ids: string[]) => void; onSkip: () => void }> = ({ onSelect, onSkip }) => {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const trailIcons: Record<string, React.ElementType> = {
        Crosshair, BarChart3, Layout, Activity
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="max-w-2xl w-full mx-4 space-y-6">
                <div className="text-center space-y-2 animate-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        O que você quer fazer primeiro?
                    </h2>
                    <p className="text-sm text-white/50">
                        Selecione uma ou mais funcionalidades. Vamos te guiar passo a passo.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                    {ONBOARDING_TRAILS.map((trail) => {
                        const Icon = trailIcons[trail.icon] || Sparkles;
                        const isSelected = selected.has(trail.id);

                        return (
                            <button
                                key={trail.id}
                                onClick={() => toggle(trail.id)}
                                className={cn(
                                    'relative p-5 rounded-xl border-2 text-left transition-all duration-300 group overflow-hidden',
                                    isSelected
                                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                                )}
                            >
                                {/* Gradient background on select */}
                                {isSelected && (
                                    <div className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', trail.color)} />
                                )}

                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={cn(
                                            'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                                            isSelected ? 'bg-primary/20' : 'bg-white/10'
                                        )}>
                                            <Icon className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-white/60')} />
                                        </div>
                                        <div className={cn(
                                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                                            isSelected ? 'border-primary bg-primary' : 'border-white/20'
                                        )}>
                                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                        </div>
                                    </div>
                                    <h3 className={cn('font-semibold text-sm mb-1', isSelected ? 'text-white' : 'text-white/80')}>
                                        {trail.name}
                                    </h3>
                                    <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
                                        {trail.description}
                                    </p>
                                    <div className="mt-2">
                                        <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
                                            {trail.steps.length} etapas
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col items-center gap-2 animate-in slide-in-from-bottom-4 duration-500 delay-400">
                    <button
                        onClick={() => onSelect(Array.from(selected))}
                        disabled={selected.size === 0}
                        className={cn(
                            'w-full max-w-sm py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2',
                            selected.size > 0
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
                                : 'bg-white/10 text-white/30 cursor-not-allowed'
                        )}
                    >
                        Começar minha jornada
                        <Rocket className="w-4 h-4" />
                    </button>
                    <button onClick={onSkip} className="text-white/30 text-xs hover:text-white/50 transition-colors py-2">
                        Pular tutorial
                    </button>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════
// TRAIL PHASE — Spotlight + Tooltip
// ══════════════════════════════════════
const TrailPhase: React.FC = () => {
    const { currentTrail, currentStep, currentStepIndex, totalStepsInTrail, currentTrailIndex, selectedTrails, overallProgress, nextStep, prevStep, skipOnboarding } = useOnboarding();
    const navigate = useNavigate();
    const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Navigate to the step's route
    useEffect(() => {
        if (currentStep?.navigateTo) {
            navigate(currentStep.navigateTo);
        }
    }, [currentStep?.navigateTo, navigate]);

    // Find & measure spotlight target
    useEffect(() => {
        if (!currentStep?.spotlightSelector) {
            setSpotlightRect(null);
            return;
        }

        const findElement = () => {
            const el = document.querySelector(currentStep.spotlightSelector!);
            if (el) {
                setSpotlightRect(el.getBoundingClientRect());
            } else {
                setSpotlightRect(null);
            }
        };

        // Delay to allow navigation to render
        const timer = setTimeout(findElement, 300);
        window.addEventListener('resize', findElement);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', findElement);
        };
    }, [currentStep?.spotlightSelector]);

    if (!currentTrail || !currentStep) return null;

    const Icon = getIcon(currentStep.icon);
    const isCentered = !currentStep.spotlightSelector || !spotlightRect;
    const trailProgress = ((currentStepIndex + 1) / totalStepsInTrail) * 100;

    // Build clip-path for spotlight hole
    const getClipPath = () => {
        if (!spotlightRect) return 'none';
        const pad = 8;
        const x = spotlightRect.left - pad;
        const y = spotlightRect.top - pad;
        const w = spotlightRect.width + pad * 2;
        const h = spotlightRect.height + pad * 2;
        const r = 12;

        return `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
            ${x}px ${y + r}px,
            ${x + r}px ${y}px,
            ${x + w - r}px ${y}px,
            ${x + w}px ${y + r}px,
            ${x + w}px ${y + h - r}px,
            ${x + w - r}px ${y + h}px,
            ${x + r}px ${y + h}px,
            ${x}px ${y + h - r}px,
            ${x}px ${y + r}px
        )`;
    };

    // Tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        if (isCentered) {
            return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }
        if (!spotlightRect) return {};

        const gap = 16;
        const pos = currentStep.tooltipPosition;

        if (pos === 'right') {
            return {
                position: 'fixed',
                top: spotlightRect.top,
                left: spotlightRect.right + gap,
                maxWidth: `calc(100vw - ${spotlightRect.right + gap + 24}px)`,
            };
        }
        if (pos === 'left') {
            return {
                position: 'fixed',
                top: spotlightRect.top,
                right: `calc(100vw - ${spotlightRect.left - gap}px)`,
                maxWidth: spotlightRect.left - gap - 24,
            };
        }
        if (pos === 'bottom') {
            return {
                position: 'fixed',
                top: spotlightRect.bottom + gap,
                left: spotlightRect.left,
                maxWidth: 400,
            };
        }
        // top
        return {
            position: 'fixed',
            bottom: `calc(100vh - ${spotlightRect.top - gap}px)`,
            left: spotlightRect.left,
            maxWidth: 400,
        };
    };

    // Trail names for breadcrumb
    const activeTrails = selectedTrails.map(id => ONBOARDING_TRAILS.find(t => t.id === id)!).filter(Boolean);

    return (
        <div className="fixed inset-0 z-[60] animate-in fade-in duration-300">
            {/* Dark overlay with spotlight hole */}
            <div
                className="absolute inset-0 bg-black/70 transition-all duration-500"
                style={spotlightRect ? { clipPath: getClipPath() } : {}}
                onClick={(e) => e.stopPropagation()}
            />

            {/* Tooltip card */}
            <div
                ref={tooltipRef}
                style={getTooltipStyle()}
                className={cn(
                    "z-[70] w-[380px] animate-in slide-in-from-bottom-4 duration-500",
                    isCentered ? '' : ''
                )}
            >
                <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                    {/* Trail breadcrumb */}
                    <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                        {activeTrails.map((t, i) => (
                            <React.Fragment key={t.id}>
                                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
                                <span className={cn(
                                    'text-[10px] font-semibold uppercase tracking-widest',
                                    i === currentTrailIndex ? 'text-primary' : 'text-muted-foreground/40'
                                )}>
                                    {t.name}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Progress bar */}
                    <div className="px-5 pb-3">
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${trailProgress}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] text-muted-foreground">
                                Etapa {currentStepIndex + 1} de {totalStepsInTrail}
                            </span>
                            {overallProgress.total > 0 && (
                                <span className="text-[10px] text-muted-foreground/50">
                                    {overallProgress.current + 1}/{overallProgress.total} total
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-5 pb-4 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Icon className="w-4.5 h-4.5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-sm leading-tight">{currentStep.title}</h3>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                            {currentStep.description}
                        </p>

                        {currentStep.benefits && currentStep.benefits.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                                {currentStep.benefits.map((b, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                        <span className="text-xs text-foreground/80">{b}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-5 py-3.5 border-t border-border/50 flex items-center justify-between bg-muted/20">
                        <button
                            onClick={prevStep}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-muted"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Voltar
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={skipOnboarding}
                                className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors py-1 px-2"
                            >
                                Pular
                            </button>
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-1.5 py-2 px-4 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                            >
                                Próximo
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════
// COMPLETE PHASE
// ══════════════════════════════════════
const CompletePhase: React.FC<{ onFinish: () => void }> = ({ onFinish }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
        <div className="max-w-md w-full mx-4 text-center space-y-8">
            <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-in zoom-in duration-700">
                    <Rocket className="w-10 h-10 text-emerald-400" />
                </div>
            </div>

            <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-700 delay-200">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    Tudo Pronto! 🚀
                </h1>
                <p className="text-base text-white/60 leading-relaxed">
                    Seu sistema está configurado. Agora explore o dashboard,
                    analise suas métricas e tome decisões com <span className="text-emerald-400 font-semibold">dados reais</span>.
                </p>
            </div>

            <div className="animate-in slide-in-from-bottom-4 duration-700 delay-500">
                <button
                    onClick={onFinish}
                    className="w-full py-3.5 px-6 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-400 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                    Explorar o Dashboard
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
);


// ══════════════════════════════════════
// MAIN OVERLAY
// ══════════════════════════════════════
const OnboardingOverlay: React.FC = () => {
    const { phase, selectTrails, skipOnboarding, restartOnboarding } = useOnboarding();
    const [localPhase, setLocalPhase] = useState(phase);

    // Sync with context phase
    useEffect(() => {
        setLocalPhase(phase);
    }, [phase]);

    return (
        <>
            {/* Hidden restart trigger for header button */}
            <button
                id="sf-restart-onboarding"
                onClick={restartOnboarding}
                className="hidden"
                aria-hidden="true"
            />

            {phase !== 'idle' && (
                <>
                    {localPhase === 'welcome' && (
                        <WelcomePhase
                            onNext={() => setLocalPhase('select')}
                            onSkip={skipOnboarding}
                        />
                    )}
                    {localPhase === 'select' && (
                        <SelectPhase
                            onSelect={selectTrails}
                            onSkip={skipOnboarding}
                        />
                    )}
                    {localPhase === 'trail' && <TrailPhase />}
                    {localPhase === 'complete' && (
                        <CompletePhase onFinish={skipOnboarding} />
                    )}
                </>
            )}
        </>
    );
};

export default OnboardingOverlay;
