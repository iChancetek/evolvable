import { useState, useEffect, useCallback } from 'react';
import { ProjectBlueprint } from '../agents/types';

interface UseOrchestrationReturn {
    blueprint: ProjectBlueprint | null;
    isLoading: boolean;
    error: string | null;
    startPipeline: (idea: string, userId?: string, llmProvider?: string) => Promise<string | null>;
    abortPipeline: () => Promise<void>;
    projectId: string | null;
}

/**
 * React Hook for managing the AI Orchestration Pipeline state.
 */
export function useOrchestration(): UseOrchestrationReturn {
    const [projectId, setProjectId] = useState<string | null>(null);
    const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Polling effect
    useEffect(() => {
        let pollInterval: NodeJS.Timeout;

        const checkStatus = async () => {
            if (!projectId) return;

            try {
                const res = await fetch(`/api/orchestrate/status?projectId=${projectId}`);
                if (!res.ok) throw new Error('Failed to fetch status');

                const data = await res.json();
                if (data.success && data.blueprint) {
                    setBlueprint(data.blueprint);

                    // Stop polling if done or error
                    if (data.blueprint.status === 'deployed' || data.blueprint.status === 'error') {
                        clearInterval(pollInterval);
                    }
                }
            } catch (err: any) {
                console.error('Polling error:', err);
                // We do not set error state here to prevent UI flashes on intermittent network issues
            }
        };

        if (projectId && (!blueprint || blueprint.status === 'building')) {
            // Initial check
            checkStatus();
            // Poll every 3 seconds
            pollInterval = setInterval(checkStatus, 3000);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [projectId, blueprint?.status]);

    const startPipeline = useCallback(async (idea: string, userId?: string, llmProvider: string = 'openai') => {
        setIsLoading(true);
        setError(null);
        setBlueprint(null);

        try {
            const res = await fetch('/api/orchestrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea, userId, llmProvider })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to start pipeline');
            }

            const data = await res.json();
            if (data.success && data.projectId) {
                setProjectId(data.projectId);
                return data.projectId as string;
            } else {
                throw new Error('Invalid response from orchestrator');
            }
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const abortPipeline = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            await fetch('/api/orchestrate/abort', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId })
            });
        } catch (err: any) {
            console.error('Failed to abort:', err);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    return {
        blueprint,
        isLoading,
        error,
        startPipeline,
        abortPipeline,
        projectId
    };
}
