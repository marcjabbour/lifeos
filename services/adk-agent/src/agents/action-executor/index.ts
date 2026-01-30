/**
 * Action Executor Agent
 *
 * Executes decided actions - creates items and generates embeddings.
 *
 * This is a placeholder module - the actual agent implementation
 * is integrated in the orchestrator using Google ADK's LlmAgent.
 */

export { createOrUpdateItem } from "../../tools/item-creator.js";
export { generateAndStoreEmbedding } from "../../tools/embedding.js";
