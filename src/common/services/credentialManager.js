/**
 * Centralized credential manager for AWS Bedrock and other API services
 * Handles consistent credential priority and configuration across services
 */
const { getStoredApiKey, getStoredProvider } = require('../../electron/windowManager');

class CredentialManager {
  constructor() {
    this.cachedCredentials = {};
    this.cachedKnowledgeBaseId = null;
  }

  /**
   * Get API key with correct priority (user-entered over environment)
   * @param {string} provider - The provider name (bedrock, openai, gemini)
   * @returns {Promise<string>} - The API key with proper priority
   */
  async getApiKey(provider) {
    const storedKey = await getStoredApiKey();
    const envKey = process.env.OPENAI_API_KEY;
    
    // User-entered keys take precedence over environment variables
    return storedKey || envKey || null;
  }

  /**
   * Get AWS credentials with correct priority (user-entered over environment)
   * @returns {Promise<object>} - AWS credentials object
   */
  async getAwsCredentials() {
    const storedKey = await getStoredApiKey();
    
    // If we have a session token in environment, we need to use all environment credentials
    // because the session token must match the access key and secret key
    if (process.env.AWS_SESSION_TOKEN) {
      return {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || null,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || null,
        sessionToken: process.env.AWS_SESSION_TOKEN
      };
    }
    
    // Otherwise, user-entered credentials take precedence (without session token)
    const credentials = {
      accessKeyId: storedKey || null,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || null,
    };
    
    // Only fall back to environment variables if no user-entered keys available
    if (!credentials.accessKeyId) {
      credentials.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    }
    
    return credentials;
  }

  /**
   * Get AWS region with correct priority
   * @returns {string} - AWS region
   */
  getAwsRegion() {
    // User preference can be added later
    return process.env.AWS_REGION || 'us-east-1';
  }

  /**
   * Get knowledge base ID with correct priority (user-entered over environment)
   * @returns {string} - Knowledge base ID
   */
  getKnowledgeBaseId() {
    if (this.cachedKnowledgeBaseId) {
      return this.cachedKnowledgeBaseId;
    }
    
    // User-entered KB ID (if implemented later) would take precedence here
    return process.env.AWS_KNOWLEDGE_BASE_ID || 'TERHHPXSLM';
  }

  /**
   * Set knowledge base ID (user preference)
   * @param {string} kbId - Knowledge base ID
   */
  setKnowledgeBaseId(kbId) {
    if (kbId && kbId.trim()) {
      this.cachedKnowledgeBaseId = kbId.trim();
    }
  }

  /**
   * Get model ID with correct priority
   * @param {string} provider - The provider name
   * @returns {string} - Model ID
   */
  getModelId(provider) {
    if (provider === 'bedrock') {
      return process.env.AWS_BEDROCK_MODEL || 'anthropic.claude-3-haiku-20240307-v1:0';
    } else if (provider === 'openai') {
      return 'gpt-4.1';
    } else if (provider === 'gemini') {
      return 'gemini-2.5-flash';
    }
    
    return null;
  }

  /**
   * Get complete provider configuration
   * @param {string} provider - The provider name (bedrock, openai, gemini)
   * @returns {Promise<object>} - Complete provider configuration
   */
  async getProviderConfig(provider) {
    if (provider === 'bedrock') {
      const credentials = await this.getAwsCredentials();
      return {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
        region: this.getAwsRegion(),
        model: this.getModelId('bedrock'),
        kbId: this.getKnowledgeBaseId(),
      };
    } else {
      const apiKey = await this.getApiKey(provider);
      return {
        apiKey,
        model: this.getModelId(provider),
        temperature: 0.7,
        maxTokens: 2048,
      };
    }
  }
}

// Export as singleton
module.exports = new CredentialManager();
