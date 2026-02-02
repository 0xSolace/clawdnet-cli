import fetch from 'node-fetch';
import { getApiBaseUrl } from './config';

export interface ApiRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export async function apiRequest(endpoint: string, options: ApiRequestOptions = {}): Promise<any> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
  } = options;

  const requestOptions: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'clawdnet-cli/1.0.0',
      ...headers,
    },
  };

  if (body) {
    requestOptions.body = body;
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const error = responseData?.error || responseData?.message || 'API request failed';
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return responseData;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Cannot connect to ClawdNet API. Check your internet connection.');
      }
      
      if (error.message.includes('ENOTFOUND')) {
        throw new Error('ClawdNet API server not found. Check the API URL.');
      }
    }

    throw error;
  }
}

export async function healthCheck(): Promise<{ healthy: boolean; version?: string; message?: string }> {
  try {
    const response = await apiRequest('/health', { timeout: 5000 });
    return {
      healthy: true,
      version: response.version,
      message: response.message,
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function testApiConnection(): Promise<boolean> {
  try {
    const health = await healthCheck();
    return health.healthy;
  } catch (error) {
    return false;
  }
}