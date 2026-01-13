/**
 * Inngest Functions for LifeOS
 *
 * Durable background job functions with step-level persistence
 */

import { inngest, type JobCreatedEvent } from './inngest'
import { getServiceClient } from '@/lib/db/supabase'

/**
 * Process content job
 *
 * This function handles the async processing of shared content:
 * 1. Fetch/process content
 * 2. Generate embeddings
 * 3. Enrich with Nova perception
 * 4. Update item and send notifications
 */
export const processContentJob = inngest.createFunction(
  {
    id: 'process-content-job',
    retries: 3,
  },
  { event: 'lifeos/job.created' },
  async ({ event, step }) => {
    const { job_id, user_id, item_id, content_type } = event.data as JobCreatedEvent['data']
    const supabase = getServiceClient()

    // Step 1: Update job status to running
    await step.run('update-job-running', async () => {
      await supabase
        .from('jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          current_step: 1,
        })
        .eq('id', job_id)

      return { status: 'running' }
    })

    // Step 2: Fetch item data
    const item = await step.run('fetch-item', async () => {
      const { data, error } = await supabase.from('items').select('*').eq('id', item_id).single()

      if (error) throw new Error(`Failed to fetch item: ${error.message}`)
      return data
    })

    // Step 3: Process content based on type
    const perception = await step.run('perceive-content', async () => {
      // TODO: Call Nova perception engine
      // For now, return placeholder perception
      const result = {
        summary: `Placeholder summary for ${content_type} content`,
        content_type_detected: content_type,
        confidence: 0.8,
        suggested_actions: ['save', 'summarize'],
      }

      // Record step result
      await supabase
        .from('jobs')
        .update({
          current_step: 2,
          step_results: [
            {
              step: 1,
              action: 'perceive',
              status: 'completed',
              result,
              duration_ms: 100,
            },
          ],
        })
        .eq('id', job_id)

      return result
    })

    // Step 4: Generate enrichment
    const enrichment = await step.run('generate-enrichment', async () => {
      // TODO: Call Nova reasoning/enrichment
      // For now, return placeholder enrichment
      const result = {
        summary: perception.summary,
        key_insights: ['Insight 1', 'Insight 2'],
        topics: ['topic1', 'topic2'],
        processed_at: new Date().toISOString(),
      }

      return result
    })

    // Step 5: Update item with enrichment
    await step.run('update-item-enrichment', async () => {
      await supabase
        .from('items')
        .update({
          enrichment,
          has_enrichment: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item_id)

      return { updated: true }
    })

    // Step 6: Generate and store embedding
    await step.run('generate-embedding', async () => {
      // TODO: Generate actual embedding with OpenAI
      // For now, skip embedding generation
      return { embedding_generated: false, reason: 'Not implemented yet' }
    })

    // Step 7: Complete job
    const finalResult = await step.run('complete-job', async () => {
      const result = {
        perception,
        enrichment,
        completed_at: new Date().toISOString(),
      }

      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          result,
          completed_at: new Date().toISOString(),
          current_step: 6,
          step_results: [
            { step: 1, action: 'perceive', status: 'completed' },
            { step: 2, action: 'enrich', status: 'completed' },
            { step: 3, action: 'update_item', status: 'completed' },
            { step: 4, action: 'generate_embedding', status: 'skipped' },
            { step: 5, action: 'complete', status: 'completed' },
          ],
        })
        .eq('id', job_id)

      return result
    })

    // Step 8: Send push notification (if subscriptions exist)
    await step.run('send-notification', async () => {
      // TODO: Implement push notification sending
      // For now, just log
      console.log(`Job ${job_id} completed for user ${user_id}`)
      return { notification_sent: false, reason: 'Not implemented yet' }
    })

    return {
      job_id,
      item_id,
      status: 'completed',
      result: finalResult,
    }
  }
)

/**
 * Handle job failure
 *
 * Updates job status and optionally notifies user
 */
export const handleJobFailure = inngest.createFunction(
  {
    id: 'handle-job-failure',
  },
  { event: 'lifeos/job.failed' },
  async ({ event, step }) => {
    const { job_id, user_id, error } = event.data
    const supabase = getServiceClient()

    await step.run('update-job-failed', async () => {
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: error,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job_id)

      return { updated: true }
    })

    // TODO: Send failure notification to user
    console.error(`Job ${job_id} failed for user ${user_id}: ${error}`)

    return { job_id, status: 'failed', error }
  }
)

// Export all functions for registration
export const functions = [processContentJob, handleJobFailure]
