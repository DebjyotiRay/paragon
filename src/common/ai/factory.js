const providers = {
  openai: require('./providers/openai'),
  gemini: require('./providers/gemini'),
  bedrock: require('./providers/bedrock_claude'), // AWS Bedrock integration
};

// Import credential manager for centralized credential handling
const credentialManager = require('../services/credentialManager');

/**
 * Creates an STT session based on provider
 * @param {string} provider - Provider name ('openai', 'gemini', etc.)
 * @param {object} opts - Configuration options (apiKey, language, callbacks, etc.)
 * @returns {Promise<object>} STT session object with sendRealtimeInput and close methods
 */
function createSTT(provider, opts) {
  // For Bedrock, fallback to OpenAI STT since AWS Bedrock doesn't support STT yet
  if (provider === 'bedrock') {
    console.log('🔄 [AI Factory] Bedrock STT not available - falling back to OpenAI STT');
    provider = 'openai';
    
    // When falling back to OpenAI, use the OpenAI API key from environment variables
    if (process.env.OPENAI_API_KEY) {
      // Trim whitespace from the API key (important for .env files)
      const openAiKey = process.env.OPENAI_API_KEY.trim();
      console.log(`🔄 [AI Factory] Using OpenAI API key from environment variables for STT (${openAiKey.substring(0, 5)}...)`);
      
      opts = { 
        ...opts, 
        apiKey: openAiKey
      };
    } else {
      console.warn('⚠️ [AI Factory] No OPENAI_API_KEY found in environment variables');
    }
  }
  
  if (!providers[provider]?.createSTT) {
    throw new Error(`STT not supported for provider: ${provider}`);
  }
  return providers[provider].createSTT(opts);
}

/**
 * Creates an LLM instance based on provider
 * @param {string} provider - Provider name ('openai', 'gemini', etc.)
 * @param {object} opts - Configuration options (apiKey, model, temperature, etc.)
 * @returns {object} LLM instance with generateContent method
 */
async function createLLM(provider, opts) {
  if (!providers[provider]?.createLLM) {
    throw new Error(`LLM not supported for provider: ${provider}`);
  }
  
  // Get credentials from manager if using Bedrock
  if (provider === 'bedrock') {
    // Allow opts to override manager defaults if specified
    return await providers[provider].createLLM(opts);
  }
  
  // For other providers, just pass through
  return providers[provider].createLLM(opts);
}

/**
 * Creates a streaming LLM instance based on provider
 * @param {string} provider - Provider name ('openai', 'gemini', etc.)
 * @param {object} opts - Configuration options (apiKey, model, temperature, etc.)
 * @returns {object} Streaming LLM instance
 */
async function createStreamingLLM(provider, opts) {
  if (!providers[provider]?.createStreamingLLM) {
    throw new Error(`Streaming LLM not supported for provider: ${provider}`);
  }
  
  // Get credentials from manager if using Bedrock
  if (provider === 'bedrock') {
    // Allow opts to override manager defaults if specified
    return await providers[provider].createStreamingLLM(opts);
  }
  
  // For other providers, just pass through
  return providers[provider].createStreamingLLM(opts);
}

/**
 * Gets list of available providers
 * @returns {object} Object with stt and llm arrays
 */
function getAvailableProviders() {
  const sttProviders = [];
  const llmProviders = [];
  
  for (const [name, provider] of Object.entries(providers)) {
    if (provider.createSTT) sttProviders.push(name);
    if (provider.createLLM) llmProviders.push(name);
  }
  
  return { stt: sttProviders, llm: llmProviders };
}

module.exports = {
  createSTT,
  createLLM,
  createStreamingLLM,
  getAvailableProviders
};
