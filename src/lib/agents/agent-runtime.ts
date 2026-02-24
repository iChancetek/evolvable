import { callLLM } from './llm-adapter';
import { LLMProvider, AgentWorkloadType, AgentId } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface SystemTool {
    name: string;
    description: string;
    parameters: any;
    execute(args: any): Promise<string>;
}

export interface AgentContext {
    projectId: string;
    projectDir: string;
    provider: LLMProvider;
    workloadType: AgentWorkloadType;
    onEvent?: (status: 'running' | 'completed' | 'failed', message: string, payload?: any) => void;
}

/**
 * Replit-style Autonomous Agent Runtime.
 * Gives agents access to the filesystem and terminal, allowing them to iterate.
 */
export class AgentRuntime {
    private tools: Record<string, SystemTool> = {};
    private context: AgentContext;

    constructor(context: AgentContext) {
        this.context = context;
        this.registerDefaultTools();
    }

    private registerDefaultTools() {
        // --- 1. FileSystem Tools ---
        this.tools['readFile'] = {
            name: 'readFile',
            description: 'Reads the contents of a file in the project workspace.',
            parameters: {
                type: 'object',
                properties: { filePath: { type: 'string', description: 'Relative path to file' } },
                required: ['filePath']
            },
            execute: async ({ filePath }) => {
                try {
                    const fullPath = path.join(this.context.projectDir, filePath);
                    return await fs.readFile(fullPath, 'utf-8');
                } catch (e: any) {
                    return `Error reading file: ${e.message}`;
                }
            }
        };

        this.tools['writeFile'] = {
            name: 'writeFile',
            description: 'Writes content to a file, creating directories if needed.',
            parameters: {
                type: 'object',
                properties: {
                    filePath: { type: 'string', description: 'Relative path to file' },
                    content: { type: 'string', description: 'File contents' }
                },
                required: ['filePath', 'content']
            },
            execute: async ({ filePath, content }) => {
                try {
                    const fullPath = path.join(this.context.projectDir, filePath);
                    await fs.mkdir(path.dirname(fullPath), { recursive: true });
                    await fs.writeFile(fullPath, content, 'utf-8');
                    return `Successfully wrote to ${filePath}`;
                } catch (e: any) {
                    return `Error writing file: ${e.message}`;
                }
            }
        };

        // --- 2. Terminal Tools ---
        this.tools['runTerminalCommand'] = {
            name: 'runTerminalCommand',
            description: 'Executes a safe terminal command (npm install, npm run build, lint). Do not run interactive commands.',
            parameters: {
                type: 'object',
                properties: { command: { type: 'string', description: 'Bash command' } },
                required: ['command']
            },
            execute: async ({ command }) => {
                try {
                    // Security guard: Reject rm -rf, etc.
                    if (command.includes('rm -rf') || command.includes('rmdir')) {
                        return 'Error: Destructive commands are blocked.';
                    }

                    const { stdout, stderr } = await execAsync(command, { cwd: this.context.projectDir });
                    return `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
                } catch (e: any) {
                    return `Command Failed:\n${e.message}\nSTDOUT:\n${e.stdout}\nSTDERR:\n${e.stderr}`;
                }
            }
        };
    }

    /**
     * Executes the agent loop: Prompt -> LLM -> Tool Calls -> Execute Tools -> LLM -> Output
     */
    public async run(systemPrompt: string, userObjective: string, maxIterations = 5): Promise<string> {
        let iterations = 0;
        let conversationHistory = `User Objective:\n${userObjective}\n\n`;

        // Format tools for OpenAI/Anthropic spec (simplified for JSON mode compatibility)
        const toolDescriptions = Object.values(this.tools).map(t =>
            `- ${t.name}: ${t.description}. Args: ${JSON.stringify(t.parameters)}`
        ).join('\n');

        const runtimeSystemPrompt = `${systemPrompt}

You are running inside an autonomous AgentRuntime with access to system tools.
You MUST accomplish the user's objective iteratively.

AVAILABLE TOOLS:
${toolDescriptions}

If you need to use a tool, return a JSON object EXACTLY like this:
{
    "tool_call": {
        "name": "writeFile",
        "arguments": { "filePath": "src/app/page.tsx", "content": "..." }
    },
    "thought": "I need to construct the landing page."
}

If you have finished the objective, return a JSON object EXACTLY like this:
{
    "status": "complete",
    "final_response": "I have successfully built the application.",
    "thought": "All tasks are done."
}

DO NOT output anything other than the raw JSON object. Use the 'thought' property to explain your reasoning.`;

        while (iterations < maxIterations) {
            iterations++;
            console.log(`[AgentRuntime] Iteration ${iterations}/${maxIterations}`);

            type LLMResponse = {
                tool_call?: { name: string, arguments: Record<string, any> },
                thought: string,
                status?: 'complete',
                final_response?: string
            }

            const response = await callLLM<LLMResponse>(runtimeSystemPrompt, conversationHistory, {
                workloadType: this.context.workloadType || 'standard',
                provider: this.context.provider,
                jsonSchema: true,
                maxTokens: 8000
            });

            console.log(`[AgentRuntime] Thought: ${response.thought}`);
            if (this.context.onEvent && response.thought) {
                this.context.onEvent('running', `🤔 ${response.thought}`);
            }

            if (response.status === 'complete' && response.final_response) {
                return response.final_response;
            }

            if (response.tool_call) {
                const tool = this.tools[response.tool_call.name];
                if (!tool) {
                    conversationHistory += `\nSystem: Tool '${response.tool_call.name}' does not exist.\n`;
                    continue;
                }

                console.log(`[AgentRuntime] Executing Tool: ${tool.name}`, response.tool_call.arguments);
                if (this.context.onEvent) {
                    this.context.onEvent('running', `🔧 Using tool ${tool.name}...`, { toolCall: response.tool_call });
                }

                const result = await tool.execute(response.tool_call.arguments);
                console.log(`[AgentRuntime] Tool Result (truncated): ${result.substring(0, 100)}...`);

                if (this.context.onEvent) {
                    this.context.onEvent('running', `✅ Tool ${tool.name} finished.`, { toolResult: result });
                }

                conversationHistory += `\nAgent used ${tool.name}.\nResult:\n${result}\n`;
            } else {
                // LLM format error guard
                conversationHistory += `\nSystem: You must either invoke a tool_call or return status: "complete".\n`;
            }
        }

        return `Agent reached maximum iterations(${maxIterations}) without completing the objective.`;
    }
}
