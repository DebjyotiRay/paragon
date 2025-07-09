const factory = require('../ai/factory');
const credentialManager = require('./credentialManager');

/**
 * Service for interacting with AWS Bedrock
 * Provides methods for configuring and using AWS Bedrock
 */
class BedrockService {
  constructor() {
    // Default config will be populated from credential manager when initialized
    this.config = {};
    
    this.llm = null;
    this.streamingLlm = null;
  }
  
  /**
   * Initialize Bedrock LLM with configuration
   * @param {object} options - Override default config options
   */
  async initialize(options = {}) {
    // Get credentials from credential manager (user-entered values prioritized)
    const managerConfig = await credentialManager.getProviderConfig('bedrock');
    
    // Use options as fallback, but manager config (user-entered keys) takes precedence
    this.config = { ...options, ...managerConfig };
    
    // If options contains knowledge base ID, update it in the manager
    if (options.kbId) {
      credentialManager.setKnowledgeBaseId(options.kbId);
    }
    
    // Initialize both standard and streaming LLM
    this.llm = factory.createLLM('bedrock', this.config);
    this.streamingLlm = factory.createStreamingLLM('bedrock', this.config);
    
    console.log(`✅ Initialized AWS Bedrock with model: ${this.config.model}`);
    console.log(`📚 Knowledge Base ID: ${this.config.kbId}`);
    
    return {
      llm: this.llm,
      streamingLlm: this.streamingLlm
    };
  }
  
  /**
   * Generate content using AWS Bedrock
   * @param {Array} parts - Content parts (text and images)
   * @returns {Promise<object>} - Response from AWS Bedrock
   */
  async generateContent(parts) {
    if (!this.llm) {
      await this.initialize();
    }
    
    return await this.llm.generateContent(parts);
  }
  
  /**
   * Stream chat response using AWS Bedrock
   * @param {Array} messages - Chat messages
   * @returns {Promise<Response>} - Streaming response
   */
  async streamChat(messages) {
    if (!this.streamingLlm) {
      await this.initialize();
    }
    
    return await this.streamingLlm.streamChat(messages);
  }
  
  /**
   * Process conversation with both text and image
   * @param {string} text - Text prompt
   * @param {string} imageBase64 - Base64 encoded image
   * @param {string} imageMimeType - Image MIME type
   * @returns {Promise<string>} - Text response
   */
  async processMultimodal(text, imageBase64, imageMimeType = 'image/jpeg') {
    if (!this.llm) {
      await this.initialize();
    }
    
    const parts = [
      "You are a helpful assistant that analyzes both text and images.",
      text,
      {
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64
        }
      }
    ];
    
    const result = await this.llm.generateContent(parts);
    return result.response.text();
  }
  
  /**
   * Set knowledge base ID
   * @param {string} kbId - Knowledge base ID
   */
  setKnowledgeBase(kbId) {
    // Update in both local config and centralized manager
    this.config.kbId = kbId;
    credentialManager.setKnowledgeBaseId(kbId);
    
    // Reinitialize if already initialized
    if (this.llm) {
      this.initialize();
    }
  }
}

module.exports = new BedrockService();
