import { adminDb, FieldValue } from '../firebase/admin';
import { ADREntry, AgentId } from './types';

/**
 * Architectural Decision Record (ADR) Logger
 * 
 * As per master prompt Section 4.2 & 16.2:
 * "All agent actions are logged immutably to the Architectural Decision Log."
 * "Every agent action, decision, input, and output is logged to the ADR with timestamp and agent ID."
 */

const COLLECTION_NAME = 'adrs';

export class ADRLogger {
    private projectId: string;

    constructor(projectId: string) {
        this.projectId = projectId;
    }

    /**
     * Logs a new immutable architectural decision.
     */
    async logDecision(
        agentId: AgentId,
        decision: string,
        rationale: string,
        alternativesConsidered: string[] = [],
        tradeOffs: string = ''
    ): Promise<string> {
        try {
            const docRef = await adminDb.collection(COLLECTION_NAME).add({
                projectId: this.projectId,
                agentId,
                decision,
                rationale,
                alternativesConsidered,
                tradeOffs,
                status: 'accepted',
                timestamp: FieldValue.serverTimestamp(),
            });

            console.log(`[ADR] Recorded decision by ${agentId}: ${decision.substring(0, 50)}...`);
            return docRef.id;
        } catch (error) {
            console.error('[ADR] Failed to log decision:', error);
            // We usually don't want a logging failure to crash the pipeline
            return 'failed_to_log';
        }
    }

    /**
     * Supersedes an old decision (e.g., if Debug Agent changes the DB Architect's decision).
     * Since ADRs are immutable, we logically mark it superseded rather than deleting.
     */
    // async supersedeDecision(adrId: string, supersededById: string) { ... }

    /**
     * Fetches the complete ADR log for a project. Used to compile the final Documentation bundle.
     */
    async getProjectADRs(): Promise<ADREntry[]> {
        try {
            const querySnapshot = await adminDb.collection(COLLECTION_NAME)
                .where("projectId", "==", this.projectId)
                .orderBy("timestamp", "asc")
                .get();

            const adrs: ADREntry[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                adrs.push({
                    id: doc.id,
                    timestamp: data.timestamp?.toMillis() || Date.now(),
                    agentId: data.agentId,
                    decision: data.decision,
                    rationale: data.rationale,
                    alternativesConsidered: data.alternativesConsidered,
                    tradeOffs: data.tradeOffs,
                    status: data.status
                });
            });

            return adrs;
        } catch (error) {
            console.error('[ADR] Failed to fetch project ADRs:', error);
            return [];
        }
    }
}
