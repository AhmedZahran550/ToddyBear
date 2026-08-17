export type AiProvider = 'gemini' | 'groq';

export interface AlarmAction {
  action: 'set' | 'disable';
  time: string;
  label?: string | null;
}

export interface AiResponse {
  reply: string;
  alarms: AlarmAction[];
  clearAllAlarms: boolean;
  sendMessage: boolean;
  messageTo: string | null;
  messageContent: string | null;
}

export interface ProviderInfo {
  activeProvider: AiProvider;
  activeModel: string;
  geminiModel: string;
  groqModel: string;
  availableProviders: AiProvider[];
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface UserProfile {
  id?: string;
  userId?: string;
  name?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  age?: number | string;
  gender?: string;
  deviceName?: string;
  type?: string;
}

export interface ProviderExecutionResult {
  rawContent: string;
  usage?: TokenUsage;
  usedProvider: AiProvider;
  usedModel: string;
}
