/**
 * Compatibility exports for the pre-Capricorn prompt module path.
 * New code should import from capricorn.ts or prompts/index.ts.
 */
export {
	buildCapricornPrompt,
	buildChildAgentDoctrine,
	buildRlmPrompt,
	buildSubagentGuidance,
	type CapricornPromptOptions,
	type ChildAgentDoctrineOptions,
	type RlmPromptOptions,
} from "./capricorn.js";
