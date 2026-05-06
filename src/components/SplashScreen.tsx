import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';
import phoenixIcon from '@/assets/phoenix-icon.png';

export const SplashScreen: React.FC = () => {
    const [stage, setStage] = useState<'showing-logo' | 'opening-doors' | 'done'>('showing-logo');

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        const timer1 = setTimeout(() => {
            setStage('opening-doors');
        }, 1500);

        const timer2 = setTimeout(() => {
            setStage('done');
            document.body.style.overflow = 'unset';
        }, 2700);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (stage === 'done') return null;

    const backgroundVisuals = (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #141010 0%, #0d0a07 100%)' }} />
    );

    return (
        <div className={`fixed inset-0 z-[999999] flex ${stage === 'opening-doors' ? 'pointer-events-none' : ''}`}>

            {/* Porta Esquerda — Medieval */}
            <motion.div
                className="relative w-1/2 h-full overflow-hidden"
                initial={{ x: 0 }}
                animate={{ x: stage === 'opening-doors' ? '-100%' : 0 }}
                transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
                style={{ zIndex: 10 }}
            >
                <div className="absolute top-0 left-0 w-[100vw] h-full pointer-events-none">
                    {backgroundVisuals}
                    {/* Stone texture lines */}
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,140,0,0.1) 40px, rgba(255,140,0,0.1) 41px)' }} />
                </div>
            </motion.div>

            {/* Porta Direita — Medieval */}
            <motion.div
                className="relative w-1/2 h-full overflow-hidden"
                initial={{ x: 0 }}
                animate={{ x: stage === 'opening-doors' ? '100%' : 0 }}
                transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
                style={{ zIndex: 10 }}
            >
                <div className="absolute top-0 right-0 w-[100vw] h-full pointer-events-none">
                    {backgroundVisuals}
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,140,0,0.1) 40px, rgba(255,140,0,0.1) 41px)' }} />
                </div>
            </motion.div>

            {/* Container Central para a Logo Fênix */}
            <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none" style={{ zIndex: 20 }}>
                <AnimatePresence>
                    {stage === 'showing-logo' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 1.05, filter: 'blur(5px)' }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            className="flex flex-col items-center justify-center p-8"
                        >
                            {/* Fire glow behind logo */}
                            <div className="absolute w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
                            <div className="w-40 relative">
                                <img
                                    src={phoenixIcon}
                                    alt="Fênix"
                                    className="w-full h-auto drop-shadow-[0_0_40px_rgba(255,140,0,0.4)]"
                                />
                            </div>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.6 }}
                                className="mt-6 text-amber-400/60 text-sm tracking-[0.3em] uppercase"
                                style={{ fontFamily: "'Cinzel', serif" }}
                            >
                                Comunidade Fênix
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
