import { log, logSuccess, logError, colors } from '../lib/output';
import { getConfig } from '../lib/config';
import { apiRequest } from '../lib/api';

export interface StatusOptions {
  agent?: string;
  json?: boolean;
}

export async function statusCommand(options: StatusOptions) {
  const config = await getConfig();
  
  if (options.agent) {
    // Check specific agent status
    await checkAgentStatus(options.agent, options.json);
    return;
  }

  if (!config?.agentId) {
    if (options.json) {
      console.log(JSON.stringify({ status: 'not_registered' }));
      return;
    }
    
    logError('❌ Not registered with ClawdNet');
    log('Run `clawdnet register` to get started');
    return;
  }

  if (!options.json) {
    log(`${colors.bold('📊 Agent Status')}`);
  }

  try {
    const response = await apiRequest(`/agents/${config.agentId}`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    if (options.json) {
      console.log(JSON.stringify({
        ...response,
        config: {
          name: config.name,
          type: config.type,
          endpoint: config.endpoint,
        }
      }));
      return;
    }

    // Display status information
    logSuccess('✅ Connected to ClawdNet');
    log(`${colors.cyan('Agent ID:')} ${config.agentId}`);
    log(`${colors.cyan('Handle:')} ${response.handle}`);
    log(`${colors.cyan('Name:')} ${response.name}`);
    log(`${colors.cyan('Type:')} ${response.type}`);
    log(`${colors.cyan('Status:')} ${getStatusIcon(response.status)} ${response.status}`);
    
    if (response.verified) {
      log(`${colors.cyan('Verified:')} ✅ Yes`);
    } else {
      log(`${colors.cyan('Verified:')} ⚠️  No (run \`clawdnet verify\`)`);
    }

    if (response.endpoint) {
      log(`${colors.cyan('Endpoint:')} ${response.endpoint}`);
    }

    if (response.capabilities && response.capabilities.length > 0) {
      log(`${colors.cyan('Capabilities:')} ${response.capabilities.join(', ')}`);
    }

    if (response.skills && response.skills.length > 0) {
      log(`${colors.cyan('Skills:')} ${response.skills.join(', ')}`);
    }

    // Network stats
    if (response.stats) {
      log('\n📈 Network Stats:');
      log(`  Invocations received: ${response.stats.invocationsReceived || 0}`);
      log(`  Invocations sent: ${response.stats.invocationsSent || 0}`);
      log(`  Success rate: ${response.stats.successRate || 0}%`);
    }

  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      return;
    }
    throw new Error(`Status check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function checkAgentStatus(handle: string, isJson?: boolean) {
  try {
    const agentHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const response = await apiRequest(`/agents/lookup/${encodeURIComponent(agentHandle)}`);

    if (isJson) {
      console.log(JSON.stringify(response));
      return;
    }

    log(`${colors.bold('📊 Agent Status:')} ${colors.cyan(agentHandle)}`);
    log(`${colors.cyan('Name:')} ${response.name}`);
    log(`${colors.cyan('Type:')} ${response.type}`);
    log(`${colors.cyan('Status:')} ${getStatusIcon(response.status)} ${response.status}`);
    
    if (response.description) {
      log(`${colors.cyan('Description:')} ${response.description}`);
    }

    if (response.capabilities && response.capabilities.length > 0) {
      log(`${colors.cyan('Capabilities:')} ${response.capabilities.join(', ')}`);
    }

    if (response.skills && response.skills.length > 0) {
      log(`${colors.cyan('Skills:')} ${response.skills.join(', ')}`);
    }

    log(`${colors.cyan('Last seen:')} ${new Date(response.lastSeen).toLocaleString()}`);

  } catch (error) {
    if (isJson) {
      console.log(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      return;
    }
    throw new Error(`Failed to get agent status: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'online': return '🟢';
    case 'offline': return '🔴';
    case 'busy': return '🟡';
    case 'idle': return '🟠';
    default: return '⚪';
  }
}