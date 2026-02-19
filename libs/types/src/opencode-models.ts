/**
 * OpenCode Model IDs
 * Models available via OpenCode CLI (opencode models command)
 */
export type OpencodeModelId =
  // OpenCode Free Tier Models
  | 'opencode/big-pickle'
  | 'opencode/glm-5-free'
  | 'opencode/gpt-5-nano'
  | 'opencode/kimi-k2.5-free'
  | 'opencode/minimax-m2.5-free'
  | 'opencode/deepseek-r1'
  | 'opencode/qwen-2.5-coder';

/**
 * Provider type for OpenCode models
 */
export type OpencodeProvider = 'opencode';

/**
 * Friendly aliases mapped to full model IDs
 */
export const OPENCODE_MODEL_MAP: Record<string, OpencodeModelId> = {
  // OpenCode free tier aliases
  'big-pickle': 'opencode/big-pickle',
  pickle: 'opencode/big-pickle',
  'glm-free': 'opencode/glm-5-free',
  'gpt-nano': 'opencode/gpt-5-nano',
  nano: 'opencode/gpt-5-nano',
  'kimi-free': 'opencode/kimi-k2.5-free',
  kimi: 'opencode/kimi-k2.5-free',
  minimax: 'opencode/minimax-m2.5-free',
} as const;

/**
 * OpenCode model metadata
 */
export interface OpencodeModelConfig {
  id: OpencodeModelId;
  label: string;
  description: string;
  supportsVision: boolean;
  provider: OpencodeProvider;
  tier: 'free' | 'standard' | 'premium';
}

/**
 * Complete list of OpenCode model configurations
 */
export const OPENCODE_MODELS: OpencodeModelConfig[] = [
  // OpenCode Free Tier Models
  {
    id: 'opencode/big-pickle',
    label: 'Big Pickle',
    description: 'OpenCode free tier model - great for general coding',
    supportsVision: false,
    provider: 'opencode',
    tier: 'free',
  },
  {
    id: 'opencode/glm-5-free',
    label: 'GLM 5 Free',
    description: 'OpenCode free tier GLM model',
    supportsVision: false,
    provider: 'opencode',
    tier: 'free',
  },
  {
    id: 'opencode/gpt-5-nano',
    label: 'GPT-5 Nano',
    description: 'OpenCode free tier nano model - fast and lightweight',
    supportsVision: false,
    provider: 'opencode',
    tier: 'free',
  },

  {
    id: 'opencode/minimax-m2.5-free',
    label: 'MiniMax M2.5 Free',
    description: 'OpenCode free tier MiniMax model',
    supportsVision: false,
    provider: 'opencode',
    tier: 'free',
  },
  {
    id: 'opencode/kimi-k2.5-free',
    label: 'Kimi k2.5 Free',
    description: 'Moonshot AI Kimi k2.5 model',
    supportsVision: true,
    provider: 'opencode',
    tier: 'free',
  },
  {
    id: 'opencode/deepseek-r1',
    label: 'DeepSeek R1',
    description: 'DeepSeek R1 reasoning model',
    supportsVision: false,
    provider: 'opencode',
    tier: 'standard',
  },
  {
    id: 'opencode/qwen-2.5-coder',
    label: 'Qwen 2.5 Coder',
    description: 'Qwen 2.5 Coder model',
    supportsVision: true,
    provider: 'opencode',
    tier: 'standard',
  },
];

/**
 * Complete model configuration map indexed by model ID
 */
export const OPENCODE_MODEL_CONFIG_MAP: Record<OpencodeModelId, OpencodeModelConfig> =
  OPENCODE_MODELS.reduce(
    (acc, config) => {
      acc[config.id] = config;
      return acc;
    },
    {} as Record<OpencodeModelId, OpencodeModelConfig>
  );

/**
 * Default OpenCode model - OpenCode free tier
 */
export const DEFAULT_OPENCODE_MODEL: OpencodeModelId = 'opencode/big-pickle';

/**
 * Helper: Get display name for model
 */
export function getOpencodeModelLabel(modelId: OpencodeModelId): string {
  return OPENCODE_MODEL_CONFIG_MAP[modelId]?.label ?? modelId;
}

/**
 * Helper: Get all OpenCode model IDs
 */
export function getAllOpencodeModelIds(): OpencodeModelId[] {
  return OPENCODE_MODELS.map((config) => config.id);
}

/**
 * Helper: Check if OpenCode model supports vision
 */
export function opencodeModelSupportsVision(modelId: OpencodeModelId): boolean {
  return OPENCODE_MODEL_CONFIG_MAP[modelId]?.supportsVision ?? false;
}

/**
 * Helper: Get the provider for a model
 */
export function getOpencodeModelProvider(modelId: OpencodeModelId): OpencodeProvider {
  return OPENCODE_MODEL_CONFIG_MAP[modelId]?.provider ?? 'opencode';
}

/**
 * Helper: Resolve an alias or partial model ID to a full model ID
 */
export function resolveOpencodeModelId(input: string): OpencodeModelId | undefined {
  // Check if it's already a valid model ID
  if (OPENCODE_MODEL_CONFIG_MAP[input as OpencodeModelId]) {
    return input as OpencodeModelId;
  }

  // Check alias map
  const normalized = input.toLowerCase();
  return OPENCODE_MODEL_MAP[normalized];
}

/**
 * Helper: Check if a string is a valid OpenCode model ID
 */
export function isOpencodeModelId(value: string): value is OpencodeModelId {
  return value in OPENCODE_MODEL_CONFIG_MAP;
}

/**
 * Helper: Get models filtered by provider
 */
export function getOpencodeModelsByProvider(provider: OpencodeProvider): OpencodeModelConfig[] {
  return OPENCODE_MODELS.filter((config) => config.provider === provider);
}

/**
 * Helper: Get models filtered by tier
 */
export function getOpencodeModelsByTier(
  tier: 'free' | 'standard' | 'premium'
): OpencodeModelConfig[] {
  return OPENCODE_MODELS.filter((config) => config.tier === tier);
}

/**
 * Helper: Get free tier models
 */
export function getOpencodeFreeModels(): OpencodeModelConfig[] {
  return getOpencodeModelsByTier('free');
}
