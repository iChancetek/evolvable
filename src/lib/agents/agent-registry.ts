import { Agent, AgentId } from './types';

import { VisionAgent } from './agents/vision';
import { NLIIAgent } from './agents/nlii-agent';
import { NLDIAgent } from './agents/nldi-agent';
import { InfraTerraformAgent } from './agents/infra-terraform';
import { InfraDockerAgent } from './agents/infra-docker';
import { InfraScriptAgent } from './agents/infra-script';
import { UIDesignerAgent } from './agents/ui-designer';
import { DBArchitectAgent } from './agents/db-architect';
import { SystemArchitectAgent } from './agents/system-architect';
import { PlanCoordinatorAgent } from './agents/plan-coordinator';
import { LogicBuilderAgent } from './agents/logic-builder';
import { BackendGenerationAgent } from './agents/backend-generation';
import { CodeGenerationAgent } from './agents/code-generation';
import { QATestingAgent } from './agents/qa-testing';
import { DebugOptimizeAgent } from './agents/debug-optimize';
import { SecurityAgent } from './agents/security';
import { DeploymentAgent } from './agents/deployment';
import { DocumentationAgent } from './agents/documentation';
import { PaymentIntegrationAgent } from './agents/payment-integration';
import { UXResearcherAgent } from './agents/ux-researcher';
import { PairProgrammerAgent } from './agents/pair-programmer';
import { DevOpsEngineerAgent } from './agents/devops-engineer';
import { DevSecOpsEngineerAgent } from './agents/devsecops-engineer';
import { FinOpsArchitectAgent } from './agents/finops-architect';
import { CodeReviewerAgent } from './agents/code-reviewer';
import { AutonomousDebuggerAgent } from './agents/autonomous-debugger';
import { CryptoExpertAgent } from './agents/crypto-expert';
import { StockMarketExpertAgent } from './agents/stock-market-expert';
import { CyberSecurityExpertAgent } from './agents/cyber-security-expert';
import { MachineLearningExpertAgent } from './agents/machine-learning-expert';
import { PythonExpertAgent } from './agents/python-expert';
import { GoExpertAgent } from './agents/go-expert';
import { RExpertAgent } from './agents/r-expert';
import { CExpertAgent } from './agents/c-expert';
import { CppExpertAgent } from './agents/cpp-expert';
import { CSharpExpertAgent } from './agents/csharp-expert';
import { CsExpertAgent } from './agents/cs-expert';
import { DataAnalystAgent } from './agents/data-analyst';
import { DatabricksExpertAgent } from './agents/databricks-expert';
import { SqlExpertAgent } from './agents/sql-expert';
import { PySparkExpertAgent } from './agents/pyspark-expert';
import { CloudArchitectAgent } from './agents/cloud-architect';
import { DataArchitectAgent } from './agents/data-architect';
import { EnterpriseArchitectAgent } from './agents/enterprise-architect';
import { DataEngineerAgent } from './agents/data-engineer';
import { HardwareEngineerAgent } from './agents/hardware-engineer';
import { NetworkEngineerAgent } from './agents/network-engineer';
import { PerformanceEngineerAgent } from './agents/performance-engineer';
import { PromptEngineerAgent } from './agents/prompt-engineer';
import { MathematicianAgent } from './agents/mathematician';
import { AcademicResearcherAgent } from './agents/academic-researcher';
import { SecurityReviewerAgent } from './agents/security-reviewer';
import { ExpertCodingAssistantAgent } from './agents/expert-coding-assistant';
/**
 * Agent Registry Factory
 * Central map for instantiating the correct agent by AgentId.
 * All 13 agents registered — including 2 new platform-generation agents.
 */
export function getAgent(id: AgentId): Agent {
    switch (id) {
        case AgentId.NLII: return new NLIIAgent();
        case AgentId.NLDI: return new NLDIAgent();
        case AgentId.INFRA_TERRAFORM: return new InfraTerraformAgent();
        case AgentId.INFRA_DOCKER: return new InfraDockerAgent();
        case AgentId.INFRA_SCRIPT: return new InfraScriptAgent();
        case AgentId.VISION: return new VisionAgent();
        case AgentId.UI_DESIGNER: return new UIDesignerAgent();
        case AgentId.DB_ARCHITECT: return new DBArchitectAgent();
        case AgentId.SYSTEM_ARCHITECT: return new SystemArchitectAgent();
        case AgentId.PLAN_COORDINATOR: return new PlanCoordinatorAgent();
        case AgentId.LOGIC_BUILDER: return new LogicBuilderAgent();
        case AgentId.BACKEND_GENERATION: return new BackendGenerationAgent();
        case AgentId.CODE_GENERATION: return new CodeGenerationAgent();
        case AgentId.QA_TESTING: return new QATestingAgent();
        case AgentId.DEBUG_OPTIMIZE: return new DebugOptimizeAgent();
        case AgentId.SECURITY: return new SecurityAgent();
        case AgentId.PAYMENT_INTEGRATION: return new PaymentIntegrationAgent();
        case AgentId.DEPLOYMENT: return new DeploymentAgent();
        case AgentId.DOCUMENTATION: return new DocumentationAgent();
        case AgentId.UX_RESEARCHER: return new UXResearcherAgent();
        case AgentId.PAIR_PROGRAMMER: return new PairProgrammerAgent();
        case AgentId.DEVOPS_ENGINEER: return new DevOpsEngineerAgent();
        case AgentId.DEVSECOPS_ENGINEER: return new DevSecOpsEngineerAgent();
        case AgentId.FINOPS_ARCHITECT: return new FinOpsArchitectAgent();
        case AgentId.CODE_REVIEWER: return new CodeReviewerAgent();
        case AgentId.AUTONOMOUS_DEBUGGER: return new AutonomousDebuggerAgent();
        case AgentId.CRYPTO_EXPERT: return new CryptoExpertAgent();
        case AgentId.STOCK_MARKET_EXPERT: return new StockMarketExpertAgent();
        case AgentId.CYBER_SECURITY_EXPERT: return new CyberSecurityExpertAgent();
        case AgentId.MACHINE_LEARNING_EXPERT: return new MachineLearningExpertAgent();
        case AgentId.PYTHON_EXPERT: return new PythonExpertAgent();
        case AgentId.GO_EXPERT: return new GoExpertAgent();
        case AgentId.R_EXPERT: return new RExpertAgent();
        case AgentId.C_EXPERT: return new CExpertAgent();
        case AgentId.CPP_EXPERT: return new CppExpertAgent();
        case AgentId.CSHARP_EXPERT: return new CSharpExpertAgent();
        case AgentId.CS_EXPERT: return new CsExpertAgent();
        case AgentId.DATA_ANALYST: return new DataAnalystAgent();
        case AgentId.DATABRICKS_EXPERT: return new DatabricksExpertAgent();
        case AgentId.SQL_EXPERT: return new SqlExpertAgent();
        case AgentId.PYSPARK_EXPERT: return new PySparkExpertAgent();
        case AgentId.CLOUD_ARCHITECT: return new CloudArchitectAgent();
        case AgentId.DATA_ARCHITECT: return new DataArchitectAgent();
        case AgentId.ENTERPRISE_ARCHITECT: return new EnterpriseArchitectAgent();
        case AgentId.DATA_ENGINEER: return new DataEngineerAgent();
        case AgentId.HARDWARE_ENGINEER: return new HardwareEngineerAgent();
        case AgentId.NETWORK_ENGINEER: return new NetworkEngineerAgent();
        case AgentId.PERFORMANCE_ENGINEER: return new PerformanceEngineerAgent();
        case AgentId.PROMPT_ENGINEER: return new PromptEngineerAgent();
        case AgentId.MATHEMATICIAN: return new MathematicianAgent();
        case AgentId.ACADEMIC_RESEARCHER: return new AcademicResearcherAgent();
        case AgentId.SECURITY_REVIEWER: return new SecurityReviewerAgent();
        case AgentId.EXPERT_CODING_ASSISTANT: return new ExpertCodingAssistantAgent();
        default:
            throw new Error(`Agent ID [${id}] is not registered in the system.`);
    }
}
