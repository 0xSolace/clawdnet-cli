import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Config {
  agentId?: string;
  handle?: string;
  name?: string;
  type?: string;
  description?: string;
  endpoint?: string;
  capabilities?: string[];
  skills?: string[];
  apiKey?: string;
  apiBaseUrl?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.clawdnet');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function getConfig(): Promise<Config | null> {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }

    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function saveConfig(config: Config): Promise<void> {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(CONFIG_FILE, content, 'utf8');
  } catch (error) {
    throw new Error(`Failed to save config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function updateConfig(updates: Partial<Config>): Promise<void> {
  const currentConfig = await getConfig() || {};
  const newConfig = { ...currentConfig, ...updates };
  await saveConfig(newConfig);
}

export async function clearConfig(): Promise<void> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch (error) {
    throw new Error(`Failed to clear config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export async function validateConfig(): Promise<{ valid: boolean; issues: string[] }> {
  const config = await getConfig();
  const issues: string[] = [];

  if (!config) {
    issues.push('No configuration found. Run `clawdnet register` first.');
    return { valid: false, issues };
  }

  if (!config.agentId) {
    issues.push('Missing agent ID');
  }

  if (!config.apiKey) {
    issues.push('Missing API key');
  }

  if (!config.name) {
    issues.push('Missing agent name');
  }

  if (!config.type) {
    issues.push('Missing agent type');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export async function getApiBaseUrl(): Promise<string> {
  const config = await getConfig();
  return config?.apiBaseUrl || process.env.CLAWDNET_API_URL || 'https://api.clawdnet.xyz';
}

export async function setApiBaseUrl(url: string): Promise<void> {
  await updateConfig({ apiBaseUrl: url });
}