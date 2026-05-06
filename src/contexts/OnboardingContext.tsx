import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/services/api';
import { ONBOARDING_TRAILS, Trail, TrailStep } from '@/components/onboarding/onboardingTrails';

// ── Types ──
export type OnboardingPhase = 'welcome' | 'select' | 'trail' | 'complete' | 'idle';

interface OnboardingState {
    phase: OnboardingPhase;
    selectedTrails: string[];
    currentTrailIndex: number;
    currentStepIndex: number;
}

interface OnboardingContextType {
    // State
    phase: OnboardingPhase;
    isOnboarding: boolean;
    selectedTrails: string[];
    currentTrail: Trail | null;
    currentStep: TrailStep | null;
    currentTrailIndex: number;
    currentStepIndex: number;
    totalStepsInTrail: number;
    overallProgress: { current: number; total: number };

    // Actions
    startOnboarding: () => void;
    selectTrails: (trailIds: string[]) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipOnboarding: () => void;
    restartOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
    const ctx = useContext(OnboardingContext);
    if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
    return ctx;
};

// ── Provider ──
export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token, mutateUser } = useAuth();

    const [state, setState] = useState<OnboardingState>(() => {
        // Check if user has completed onboarding
        const prefs = user?.preferences;
        if (prefs?.onboarding_completed) {
            return { phase: 'idle' as OnboardingPhase, selectedTrails: [], currentTrailIndex: 0, currentStepIndex: 0 };
        }

        // Check if there's saved progress
        if (prefs?.onboarding_phase) {
            return {
                phase: prefs.onboarding_phase as OnboardingPhase,
                selectedTrails: prefs.onboarding_trails || [],
                currentTrailIndex: prefs.onboarding_trail_index || 0,
                currentStepIndex: prefs.onboarding_step_index || 0,
            };
        }

        // First time user — show onboarding (but only if logged in)
        if (user) {
            return { phase: 'welcome' as OnboardingPhase, selectedTrails: [], currentTrailIndex: 0, currentStepIndex: 0 };
        }

        return { phase: 'idle' as OnboardingPhase, selectedTrails: [], currentTrailIndex: 0, currentStepIndex: 0 };
    });

    // Re-detect on user change (e.g. login)
    useEffect(() => {
        if (!user) return;
        const prefs = user.preferences;
        if (prefs?.onboarding_completed) {
            setState(s => ({ ...s, phase: 'idle' }));
            return;
        }
        if (state.phase === 'idle' && !prefs?.onboarding_completed) {
            // New user logged in, start onboarding
            if (!prefs?.onboarding_phase) {
                setState({ phase: 'welcome', selectedTrails: [], currentTrailIndex: 0, currentStepIndex: 0 });
            }
        }
    }, [user?.id]);

    // ── Persist state changes ──
    const persistState = useCallback(async (newState: OnboardingState) => {
        if (!token) return;
        const payload: Record<string, any> = {
            onboarding_phase: newState.phase,
            onboarding_trails: newState.selectedTrails,
            onboarding_trail_index: newState.currentTrailIndex,
            onboarding_step_index: newState.currentStepIndex,
        };
        if (newState.phase === 'idle' || newState.phase === 'complete') {
            payload.onboarding_completed = true;
        }
        try {
            await api.updatePreferences(token, payload);
            // Update local user preferences
            if (user) {
                mutateUser({ ...user, preferences: { ...user.preferences, ...payload } });
            }
        } catch (e) {
            console.error('Failed to persist onboarding state', e);
        }
    }, [token, user, mutateUser]);

    // ── Derived values ──
    const activeTrails = state.selectedTrails
        .map(id => ONBOARDING_TRAILS.find(t => t.id === id))
        .filter(Boolean) as Trail[];

    const currentTrail = activeTrails[state.currentTrailIndex] || null;
    const currentStep = currentTrail?.steps[state.currentStepIndex] || null;
    const totalStepsInTrail = currentTrail?.steps.length || 0;

    // Overall progress across all selected trails
    const totalSteps = activeTrails.reduce((sum, t) => sum + t.steps.length, 0);
    const stepsCompleted = activeTrails.slice(0, state.currentTrailIndex).reduce((sum, t) => sum + t.steps.length, 0) + state.currentStepIndex;

    // ── Actions ──
    const startOnboarding = useCallback(() => {
        const newState = { ...state, phase: 'welcome' as OnboardingPhase };
        setState(newState);
    }, [state]);

    const selectTrails = useCallback((trailIds: string[]) => {
        const newState: OnboardingState = {
            phase: 'trail',
            selectedTrails: trailIds,
            currentTrailIndex: 0,
            currentStepIndex: 0,
        };
        setState(newState);
        persistState(newState);
    }, [persistState]);

    const nextStep = useCallback(() => {
        setState(prev => {
            const trails = prev.selectedTrails
                .map(id => ONBOARDING_TRAILS.find(t => t.id === id))
                .filter(Boolean) as Trail[];

            const trail = trails[prev.currentTrailIndex];
            if (!trail) {
                const done: OnboardingState = { ...prev, phase: 'complete' };
                persistState(done);
                return done;
            }

            // Move to next step in current trail
            if (prev.currentStepIndex < trail.steps.length - 1) {
                const ns: OnboardingState = { ...prev, currentStepIndex: prev.currentStepIndex + 1 };
                persistState(ns);
                return ns;
            }

            // Move to next trail
            if (prev.currentTrailIndex < trails.length - 1) {
                const ns: OnboardingState = { ...prev, currentTrailIndex: prev.currentTrailIndex + 1, currentStepIndex: 0 };
                persistState(ns);
                return ns;
            }

            // All done
            const done: OnboardingState = { ...prev, phase: 'complete' };
            persistState(done);
            return done;
        });
    }, [persistState]);

    const prevStep = useCallback(() => {
        setState(prev => {
            if (prev.currentStepIndex > 0) {
                const ns: OnboardingState = { ...prev, currentStepIndex: prev.currentStepIndex - 1 };
                persistState(ns);
                return ns;
            }

            if (prev.currentTrailIndex > 0) {
                const trails = prev.selectedTrails
                    .map(id => ONBOARDING_TRAILS.find(t => t.id === id))
                    .filter(Boolean) as Trail[];
                const prevTrail = trails[prev.currentTrailIndex - 1];
                const ns: OnboardingState = {
                    ...prev,
                    currentTrailIndex: prev.currentTrailIndex - 1,
                    currentStepIndex: prevTrail ? prevTrail.steps.length - 1 : 0,
                };
                persistState(ns);
                return ns;
            }

            // Go back to select
            const ns: OnboardingState = { ...prev, phase: 'select' };
            return ns;
        });
    }, [persistState]);

    const skipOnboarding = useCallback(() => {
        const done: OnboardingState = { phase: 'idle', selectedTrails: [], currentTrailIndex: 0, currentStepIndex: 0 };
        setState(done);
        persistState({ ...done, phase: 'complete' }); // mark as completed
    }, [persistState]);

    const restartOnboarding = useCallback(() => {
        const fresh: OnboardingState = { phase: 'welcome', selectedTrails: [], currentTrailIndex: 0, currentStepIndex: 0 };
        setState(fresh);
        // Clear completion flag
        if (token && user) {
            api.updatePreferences(token, {
                onboarding_completed: false,
                onboarding_phase: 'welcome',
                onboarding_trails: [],
                onboarding_trail_index: 0,
                onboarding_step_index: 0,
            }).catch(console.error);
        }
    }, [token, user]);

    const isOnboarding = state.phase !== 'idle';

    return (
        <OnboardingContext.Provider value={{
            phase: state.phase,
            isOnboarding,
            selectedTrails: state.selectedTrails,
            currentTrail,
            currentStep,
            currentTrailIndex: state.currentTrailIndex,
            currentStepIndex: state.currentStepIndex,
            totalStepsInTrail,
            overallProgress: { current: stepsCompleted, total: totalSteps },
            startOnboarding,
            selectTrails,
            nextStep,
            prevStep,
            skipOnboarding,
            restartOnboarding,
        }}>
            {children}
        </OnboardingContext.Provider>
    );
};
