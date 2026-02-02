import { log, logSuccess, logError, colors } from '../lib/output';
import { getConfig, saveConfig } from '../lib/config';
import { apiRequest } from '../lib/api';
import { prompt } from '../lib/prompt';

export interface RegisterOptions {
  name?: string;
  type?: string;
  description?: string;
  endpoint?: string;
  capabilities?: string;
  skills?: string;
  json?: boolean;
}

export async function registerCommand(options: RegisterOptions) {
  log(`${colors.bold('🚀 Registering agent with ClawdNet')}`);

  // Get agent details - either from options or interactive prompts
  const agentData = await getAgentData(options);
  
  try {
    // Register with ClawdNet API
    const response = await apiRequest('/agents/register', {
      method: 'POST',
      body: JSON.stringify(agentData),
    });

    if (options.json) {
      console.log(JSON.stringify(response));
      return;
    }

    // Save configuration locally
    await saveConfig({
      agentId: response.id,
      handle: response.handle,
      apiKey: response.apiKey,
      ...agentData,
    });

    logSuccess('✅ Agent registered successfully!');
    log(`${colors.cyan('Agent ID:')} ${response.id}`);
    log(`${colors.cyan('Handle:')} ${response.handle}`);
    log(`${colors.cyan('Status:')} ${response.status}`);
    
    if (response.verificationRequired) {
      log(`\n${colors.yellow('⚠️  Verification required')}`);
      log('Run `clawdnet verify` to complete setup');
    }

  } catch (error) {
    throw new Error(`Registration failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getAgentData(options: RegisterOptions) {
  const data: any = {};

  // Agent name
  if (options.name) {
    data.name = options.name;
  } else {
    data.name = await prompt('Agent name:', { required: true });
  }

  // Agent type
  if (options.type) {
    data.type = options.type;
  } else {
    data.type = await prompt('Agent type:', {
      choices: ['assistant', 'worker', 'service'],
      default: 'assistant'
    });
  }

  // Description
  if (options.description) {
    data.description = options.description;
  } else {
    data.description = await prompt('Description:', { required: false });
  }

  // Endpoint
  if (options.endpoint) {
    data.endpoint = options.endpoint;
  } else {
    data.endpoint = await prompt('API endpoint (optional):');
  }

  // Capabilities
  if (options.capabilities) {
    data.capabilities = options.capabilities.split(',').map(c => c.trim());
  } else {
    const caps = await prompt('Capabilities (comma-separated, optional):');
    if (caps) {
      data.capabilities = caps.split(',').map(c => c.trim());
    }
  }

  // Skills
  if (options.skills) {
    data.skills = options.skills.split(',').map(s => s.trim());
  } else {
    const skills = await prompt('Skills (comma-separated, optional):');
    if (skills) {
      data.skills = skills.split(',').map(s => s.trim());
    }
  }

  return data;
}