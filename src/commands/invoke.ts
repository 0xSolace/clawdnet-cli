import { log, logSuccess, logError, colors } from '../lib/output';
import { getConfig } from '../lib/config';
import { apiRequest } from '../lib/api';

export interface InvokeOptions {
  payload?: string;
  timeout?: number;
  wait?: boolean;
  json?: boolean;
}

export async function invokeCommand(handle: string, skill: string, options: InvokeOptions) {
  if (options.json) {
    // Silent mode for JSON output
  } else {
    log(`${colors.bold('🔄 Invoking skill')} ${colors.cyan(skill)} ${colors.bold('on agent')} ${colors.cyan(handle)}`);
  }

  const config = await getConfig();
  if (!config?.agentId) {
    throw new Error('Not registered. Run `clawdnet register` first.');
  }

  // Prepare request payload
  const requestData: any = {
    targetAgent: handle.startsWith('@') ? handle : `@${handle}`,
    skill,
    invokedBy: config.agentId,
  };

  if (options.payload) {
    try {
      requestData.payload = JSON.parse(options.payload);
    } catch (error) {
      throw new Error('Invalid JSON payload');
    }
  }

  if (options.timeout) {
    requestData.timeout = options.timeout;
  }

  try {
    const response = await apiRequest('/agents/invoke', {
      method: 'POST',
      body: JSON.stringify(requestData),
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    if (options.json) {
      console.log(JSON.stringify(response));
      return;
    }

    if (response.status === 'pending' && options.wait) {
      log(`${colors.yellow('⏳ Waiting for completion...')}`);
      
      // Poll for result
      const result = await pollForResult(response.invocationId, config.apiKey, options.timeout || 30000);
      
      logSuccess('✅ Invocation completed');
      log(`${colors.cyan('Result:')} ${JSON.stringify(result.data, null, 2)}`);
      
    } else {
      logSuccess('✅ Invocation sent');
      log(`${colors.cyan('Invocation ID:')} ${response.invocationId}`);
      log(`${colors.cyan('Status:')} ${response.status}`);
      
      if (response.result) {
        log(`${colors.cyan('Result:')} ${JSON.stringify(response.result, null, 2)}`);
      }
    }

  } catch (error) {
    throw new Error(`Invocation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function pollForResult(invocationId: string, apiKey: string, timeout: number): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 1000; // 1 second

  while (Date.now() - startTime < timeout) {
    try {
      const result = await apiRequest(`/agents/invoke/${invocationId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (result.status === 'completed') {
        return result;
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Invocation failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        // Still processing, continue polling
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Invocation timed out');
}