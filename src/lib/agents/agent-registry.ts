import { Agent, AgentId, AgentInput, AgentOutput } from './types';

// We will import the actual agents here
import { VisionAgent } from './agents/vision';
import { UIDesignerAgent } from './agents/ui-designer';
import { DBArchitectAgent } from './agents/db-architect';
import { SystemArchitectAgent } from './agents/system-architect';
import { LogicBuilderAgent } from './agents/logic-builder';
import { CodeGenerationAgent } from './agents/code-generation';
import { QAAgent } from './agents/qa-testing';
import { DebugOptimizeAgent } from './agents/debug-optimize';
import { SecurityAgent } from './agents/security';
import { DeploymentAgent } from './agents/deployment';
import { DocumentationAgent } from './agents/documentation';

/**
 * Agent Registry Factory
 * Central map for instantiating the correct agent by AgentId.
 */
export function getAgent(id: AgentId): Agent {
    switch (id) {
        case AgentId.VISION:
            return new VisionAgent();
        case AgentId.UI_DESIGNER:
            return new UIDesignerAgent();
        case AgentId.DB_ARCHITECT:
            return new DBArchitectAgent();
        case AgentId.SYSTEM_ARCHITECT:
            return new SystemArchitectAgent();
        case AgentId.LOGIC_BUILDER:
            return new LogicBuilderAgent();
        case AgentId.CODE_GENERATION:
            return new CodeGenerationAgent();
        case AgentId.QA_TESTING:
            return new QAAgent();
        case AgentId.DEBUG_OPTIMIZE:
            return new DebugOptimizeAgent();
        case AgentId.SECURITY:
            return new SecurityAgent();
        case AgentId.DEPLOYMENT:
            return new DeploymentAgent();
        case AgentId.DOCUMENTATION:
            return new DocumentationAgent();
        default:
            throw new Error(`Agent ID [${id}] is not registered in the system.`);
    }
}
