/**
 * AWS Bedrock Claude Integration using AWS SDK v3
 */

// Import AWS SDK v3 modules
const {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand
} = require("@aws-sdk/client-bedrock-runtime");

const {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand
} = require("@aws-sdk/client-bedrock-agent-runtime");

// Import credential manager
const credentialManager = require("../../services/credentialManager");

// Import KB query optimization utilities
const {
  preprocessQueryForKB,
  expandQueryWithSynonyms,
  generateKBQueryDiagnostics
} = require("../../utils/kbQueryOptimizer");

/**
 * Enhanced memory manager for AWS Bedrock integration
 * Provides short-term memory and knowledge base integration
 */
class EnhancedMemoryManager {
  constructor(options = {}) {
    this.shortTerm = [];
    this.maxSize = options.windowSize || 10;
    this.windowTimeMs = (options.windowTime || 300) * 1000; // 5 minutes in ms
    this.knowledgeBaseId = null;
    this.bedrockAgentRuntime = null;
  }
  
  async setupBedrockClient(config) {
    // Get AWS credentials from credential manager (user-entered over environment)
    const credentials = await credentialManager.getAwsCredentials();
    
    // Log if session token is being used
    if (credentials.sessionToken) {
      console.log('🔵 [AWS Bedrock] Using session token for Knowledge Base queries');
    }
    
    this.bedrockAgentRuntime = new BedrockAgentRuntimeClient({
      region: config.region || credentialManager.getAwsRegion(),
      credentials
    });
  }
  
  addToShortTerm(message, role = 'user') {
    // Add new message
    this.shortTerm.push({
      role,
      content: message,
      timestamp: Date.now()
    });
    
    // Clean expired messages
    this._cleanExpiredMessages();
    
    // Trim to max size if needed
    if (this.shortTerm.length > this.maxSize) {
      this.shortTerm = this.shortTerm.slice(-this.maxSize);
    }
  }
  
  getConversationContext() {
    // Clean expired messages first
    this._cleanExpiredMessages();
    
    // Get recent conversation
    if (this.shortTerm.length === 0) {
      return "No recent conversation context";
    }
    
    // Build conversation flow
    const contextParts = ["Recent conversation:"];
    for (const msg of this.shortTerm) {
      const roleLabel = msg.role === "client" ? "Manager" : 
                      msg.role === "assistant" ? "Assistant" : 
                      msg.role === "vision" ? "Visual" : "User";
      contextParts.push(`${roleLabel}: ${msg.content}`);
    }
    
    return contextParts.join("\n");
  }
  
  _cleanExpiredMessages() {
    const currentTime = Date.now();
    this.shortTerm = this.shortTerm.filter(
      msg => (currentTime - msg.timestamp) <= this.windowTimeMs
    );
  }
  
  setKnowledgeBase(kbId) {
    this.knowledgeBaseId = kbId;
    console.log(`Knowledge Base connected: ${kbId}`);
  }
  
  async queryKnowledgeBase(query, modelId, fallbackContext = "") {
    if (!this.knowledgeBaseId || !this.bedrockAgentRuntime) {
      return [fallbackContext, []];
    }
    
    // Extract core query - remove 'User Request:' prefix if present
    const cleanQuery = query.replace(/^User Request:\s*/i, '').trim();
    
    // First try with preprocessed query
    const processedQuery = preprocessQueryForKB(cleanQuery);
    console.log(`🔍 KB Query: Original=${cleanQuery.substring(0, 50)}..., Processed=${processedQuery.substring(0, 50)}...`);
    
    const startTime = Date.now();
    
    try {
      // First attempt with optimized query
      const input = {
        input: { text: processedQuery },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: this.knowledgeBaseId,
            modelArn: `arn:aws:bedrock:us-east-1::foundation-model/${modelId.replace("us.", "")}`
          }
        }
      };
      
      const command = new RetrieveAndGenerateCommand(input);
      const response = await this.bedrockAgentRuntime.send(command);
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Extract citations
      const citations = [];
      if (response.citations) {
        for (const citation of response.citations) {
          for (const ref of citation.retrievedReferences || []) {
            citations.push({
              content: ref.content?.text?.substring(0, 200) + '...' || '',
              source: ref.location?.s3Location?.uri || 'Unknown',
              score: ref.metadata?.score || 0
            });
          }
        }
      }
      
      const responseText = response.output?.text || '';
      
      // Generate diagnostics
      const queryDiagnostics = generateKBQueryDiagnostics(cleanQuery, processedQuery, responseText, citations);
      console.log(`📊 KB Query Diagnostics: ${JSON.stringify(queryDiagnostics)}`);
      
      // Log actual response content for debugging
      if (responseText) {
        console.log(`📄 KB Response Content (first 200 chars): "${responseText.substring(0, 200).replace(/\n/g, ' ')}..."`);
      }
      
      // If we got a good response, return it with citation information
      if (responseText && responseText.length > 50) {
        // Format response with citation info
        const citationInfo = citations.length > 0 ? 
          `\n\nCITATIONS:\n${citations.map((c, i) => `[${i+1}] ${c.source}`).join('\n')}` : '';
        
        return [responseText + citationInfo, citations];
      }
      
      // If the response is too short, try with expanded query
      console.log(`⚠️ KB returned insufficient context (${responseText.length} chars), trying expanded query`);
      
      // Second attempt with expanded query
      const expandedQuery = expandQueryWithSynonyms(query);
      console.log(`🔍 Expanded query: "${expandedQuery.substring(0, 100)}..."`);
      
      const expandedInput = {
        input: { text: expandedQuery },
        retrieveAndGenerateConfiguration: {
          type: 'KNOWLEDGE_BASE',
          knowledgeBaseConfiguration: {
            knowledgeBaseId: this.knowledgeBaseId,
            modelArn: `arn:aws:bedrock:us-east-1::foundation-model/${modelId.replace("us.", "")}`
          }
        }
      };
      
      const expandedCommand = new RetrieveAndGenerateCommand(expandedInput);
      const expandedResponse = await this.bedrockAgentRuntime.send(expandedCommand);
      
      // Extract citations from expanded response
      const expandedCitations = [];
      if (expandedResponse.citations) {
        for (const citation of expandedResponse.citations) {
          for (const ref of citation.retrievedReferences || []) {
            expandedCitations.push({
              content: ref.content?.text?.substring(0, 200) + '...' || '',
              source: ref.location?.s3Location?.uri || 'Unknown',
              score: ref.metadata?.score || 0
            });
          }
        }
      }
      
      const expandedResponseText = expandedResponse.output?.text || '';
      
      // Generate diagnostics for expanded query
      const expandedDiagnostics = generateKBQueryDiagnostics(
        query, expandedQuery, expandedResponseText, expandedCitations
      );
      console.log(`📊 Expanded KB Query Diagnostics: ${JSON.stringify(expandedDiagnostics)}`);
      
      // Use the better response between the two attempts
      if (expandedResponseText.length > responseText.length) {
        console.log(`✅ Expanded query yielded better results: ${expandedResponseText.length} chars vs ${responseText.length} chars`);
        return [expandedResponseText, expandedCitations];
      }
      
      // Return the original response as a fallback
      return [responseText || fallbackContext, citations];
    } catch (error) {
      console.error('KB query failed:', error);
      return [fallbackContext, []];
    }
  }
}

// Singleton memory manager for state persistence
let memoryManager = null;

/**
 * Creates an AWS Bedrock LLM instance
 * @param {object} opts - Configuration options
 * @param {string} opts.apiKey - AWS access key ID (for API compatibility)
 * @param {string} [opts.awsSecretKey] - AWS secret access key
 * @param {string} [opts.region='us-east-1'] - AWS region
 * @param {string} [opts.model='anthropic.claude-3-haiku-20240307-v1:0'] - Model ID
 * @param {string} [opts.kbId] - Knowledge base ID (optional)
 * @returns {object} LLM instance
 */
async function createLLM(opts) {
  // Get AWS credentials from credential manager (user-entered over environment)
  const credentials = await credentialManager.getAwsCredentials();
  
  // Merge with provided options (credential manager takes precedence over options)
  const config = {
    region: credentialManager.getAwsRegion() || opts.region,
    accessKeyId: credentials.accessKeyId || opts.apiKey || opts.awsAccessKeyId,
    secretAccessKey: credentials.secretAccessKey || opts.awsSecretKey || opts.awsSecretAccessKey
  };
  
  const model = opts.model || credentialManager.getModelId('bedrock');
  
  // Include session token if available from credentials
  if (credentials.sessionToken) {
    console.log('🔵 [AWS Bedrock] Using session token from environment variables');
  }
  
  console.log(`🔵 [AWS Bedrock] Using credentials: Access Key ID=${config.accessKeyId?.substring(0, 5)}..., Session Token=${credentials.sessionToken ? 'Present' : 'Not Present'}`);
  
  // Create SDK v3 client
  const bedrockRuntime = new BedrockRuntimeClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  });
  
  // Initialize memory manager if not already created
  if (!memoryManager) {
    memoryManager = new EnhancedMemoryManager();
    await memoryManager.setupBedrockClient(config);
    
    // Use kbId from options or credential manager
    const kbId = opts.kbId || credentialManager.getKnowledgeBaseId();
    if (kbId) {
      memoryManager.setKnowledgeBase(kbId);
      credentialManager.setKnowledgeBaseId(kbId);
    }
  }
  
  return {
    generateContent: async (parts) => {
      // Extract system message and user content
      let systemMessage = "You are a helpful assistant.";
      const userContent = [];
      
      for (const part of parts) {
        if (typeof part === 'string') {
          if (part.includes('You are')) {
            systemMessage = part;
          } else {
            userContent.push({ type: 'text', text: part });
            // Add text to memory
            memoryManager.addToShortTerm(part, 'user');
          }
        } else if (part.inlineData) {
          // Handle image data for multimodal models
          userContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: part.inlineData.mimeType,
              data: part.inlineData.data
            }
          });
          
          // Add image to memory manager for context
          memoryManager.addToShortTerm(`[Image captured at ${new Date().toISOString()}]`, 'vision');
        }
      }
      
      // Combine text content for knowledge base query
      const textContent = userContent
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join(' ');
      
      // Query knowledge base if we have text content
      let kbContext = "";
      let citations = [];
      
      if (textContent && memoryManager.knowledgeBaseId) {
        [kbContext, citations] = await memoryManager.queryKnowledgeBase(
          textContent, model, ""
        );
      }
      
      // Get conversation context
      const conversationContext = memoryManager.getConversationContext();
      
      // Build the complete prompt with all available context
      let enhancedSystemMessage = systemMessage;
      
      if (kbContext) {
        enhancedSystemMessage += `\n\nKnowledge base information: ${kbContext}`;
      }
      
      if (conversationContext) {
        enhancedSystemMessage += `\n\n${conversationContext}`;
      }
      
      // Prepare the request for Claude
      const input = {
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: opts.maxTokens || 2048,
          temperature: opts.temperature || 0.7,
          system: enhancedSystemMessage,
          messages: [{
            role: "user",
            content: userContent
          }]
        })
      };
      
      // Invoke the model using SDK v3
      try {
        const command = new InvokeModelCommand(input);
        const response = await bedrockRuntime.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Store response in memory
        if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
          memoryManager.addToShortTerm(responseBody.content[0].text, 'assistant');
        }
        
        return {
          response: {
            text: () => responseBody.content[0].text
          },
          raw: responseBody
        };
      } catch (error) {
        console.error('Error invoking Bedrock model:', error);
        throw error;
      }
    },
    
    // Standard chat interface for compatibility
    chat: async (messages) => {
      // Extract system message if present
      const systemMessage = messages.find(m => m.role === 'system')?.content || 
        "You are a helpful assistant.";
      
      // Convert to Claude's format
      const formattedMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => {
          // For user messages with multimodal content
          if (m.role === 'user' && Array.isArray(m.content)) {
            return {
              role: 'user',
              content: m.content.map(c => {
                if (c.type === 'text') {
                  memoryManager.addToShortTerm(c.text, 'user');
                  return { type: 'text', text: c.text };
                } else if (c.type === 'image_url') {
                  // Handle base64 images
                  const imgData = c.image_url.url.split(',')[1];
                  memoryManager.addToShortTerm('[Image data]', 'vision');
                  return {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: c.image_url.url.split(';')[0].split(':')[1],
                      data: imgData
                    }
                  };
                }
                return c;
              })
            };
          }
          
          // For text-only messages
          if (typeof m.content === 'string') {
            memoryManager.addToShortTerm(m.content, m.role);
          }
          
          return {
            role: m.role,
            content: Array.isArray(m.content) ? m.content : [{ type: 'text', text: m.content }]
          };
        });
      
      // Get text content for knowledge base query
      let textContent = '';
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      
      if (lastUserMsg) {
        if (typeof lastUserMsg.content === 'string') {
          textContent = lastUserMsg.content;
        } else if (Array.isArray(lastUserMsg.content)) {
          textContent = lastUserMsg.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join(' ');
        }
      }
      
      // Query knowledge base if needed
      let kbContext = "";
      let citations = [];
      
      if (textContent && memoryManager.knowledgeBaseId) {
        console.log(`🔵 [AWS Bedrock] Querying Knowledge Base ID: ${memoryManager.knowledgeBaseId}`);
        try {
          [kbContext, citations] = await memoryManager.queryKnowledgeBase(
            textContent, model, ""
          );
          if (kbContext) {
            console.log(`🔵 [AWS Bedrock] Knowledge Base returned ${kbContext.length} characters of context`);
            console.log(`🔵 [AWS Bedrock] Found ${citations.length} citations from knowledge base`);
          } else {
            console.log(`🔵 [AWS Bedrock] No context returned from knowledge base query`);
          }
        } catch (kbError) {
          console.error('🔴 [AWS Bedrock] Error querying knowledge base:', kbError);
          console.log('🔵 [AWS Bedrock] Continuing without knowledge base context');
        }
      }
      
      // Enhanced system message with KB data - Make KB information more prominent
      let enhancedSystemMessage = systemMessage;
      if (kbContext) {
        // Log the actual KB content to help with debugging
        console.log(`🔵 [AWS Bedrock] Streaming: KB content being added to prompt: "${kbContext.substring(0, 100)}..."`);
        
        // Format the KB information more prominently to ensure Claude uses it
        enhancedSystemMessage = `
${systemMessage}

##############################################################
## IMPORTANT - KNOWLEDGE BASE INFORMATION - USE THIS FIRST ##
##############################################################

${kbContext}

INSTRUCTIONS:
1. You MUST use the above knowledge base information as your PRIMARY source to answer the user's question.
2. If the knowledge base contains relevant information, incorporate it fully into your response.
3. Cite your sources by mentioning "According to the knowledge base" when using this information.
4. Do NOT claim ignorance about topics covered in the knowledge base information.
5. If the knowledge base information conflicts with your training data, prioritize the knowledge base.

##############################################################
`;
      }
      
      // Add conversation context
      const conversationContext = memoryManager.getConversationContext();
      if (conversationContext && conversationContext !== "No recent conversation context") {
        enhancedSystemMessage += `\n\n${conversationContext}`;
      }
      
      const input = {
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: opts.maxTokens || 2048,
          temperature: opts.temperature || 0.7,
          system: enhancedSystemMessage,
          messages: formattedMessages
        })
      };
      
      try {
        const command = new InvokeModelCommand(input);
        const response = await bedrockRuntime.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Store response in memory
        if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
          memoryManager.addToShortTerm(responseBody.content[0].text, 'assistant');
        }
        
        return {
          content: responseBody.content[0].text,
          raw: responseBody
        };
      } catch (error) {
        console.error('Error in Bedrock chat:', error);
        throw error;
      }
    }
  };
}

/**
 * Creates an AWS Bedrock streaming LLM instance
 * @param {object} opts - Configuration options
 * @returns {object} Streaming LLM instance with streamChat method
 */
async function createStreamingLLM(opts) {
  // Get AWS credentials from credential manager
  const credentials = await credentialManager.getAwsCredentials();
  
  // Merge with provided options (credential manager takes precedence over options)
  const config = {
    region: credentialManager.getAwsRegion() || opts.region,
    accessKeyId: credentials.accessKeyId || opts.apiKey || opts.awsAccessKeyId,
    secretAccessKey: credentials.secretAccessKey || opts.awsSecretKey || opts.awsSecretAccessKey
  };
  
  const model = opts.model || credentialManager.getModelId('bedrock');
  
  console.log(`🔵 [AWS Bedrock] Creating streaming LLM with model: ${model}`);
  console.log(`🔵 [AWS Bedrock] Using region: ${config.region}`);
  console.log(`🔵 [AWS Bedrock] Access Key ID: ${config.accessKeyId ? config.accessKeyId.substring(0, 5) + '...' : 'undefined'}`);
  
  // Include session token if available
  if (credentials.sessionToken) {
    console.log('🔵 [AWS Bedrock] Using session token from environment variables for streaming');
  }
  
  console.log(`🔵 [AWS Bedrock] Streaming with credentials: Access Key ID=${config.accessKeyId?.substring(0, 5)}..., Session Token=${credentials.sessionToken ? 'Present' : 'Not Present'}`);
  
  // Create SDK v3 client
  const bedrockRuntime = new BedrockRuntimeClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  });
  
  // Initialize memory manager if not already created
  if (!memoryManager) {
    memoryManager = new EnhancedMemoryManager();
    await memoryManager.setupBedrockClient(config);
    
    // Use kbId from options or credential manager
    const kbId = opts.kbId || credentialManager.getKnowledgeBaseId();
    if (kbId) {
      memoryManager.setKnowledgeBase(kbId);
      credentialManager.setKnowledgeBaseId(kbId);
    }
  }
  
  return {
    streamChat: async (messages) => {
      // Extract system message if present
      const systemMessage = messages.find(m => m.role === 'system')?.content || 
        "You are a helpful assistant.";
      
      // Convert to Claude's format
      const formattedMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => {
          // For user messages with multimodal content
          if (m.role === 'user' && Array.isArray(m.content)) {
            return {
              role: 'user',
              content: m.content.map(c => {
                if (c.type === 'text') {
                  memoryManager.addToShortTerm(c.text, 'user');
                  return { type: 'text', text: c.text };
                } else if (c.type === 'image_url') {
                  // Handle base64 images
                  const imgData = c.image_url.url.split(',')[1];
                  memoryManager.addToShortTerm('[Image data]', 'vision');
                  return {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: c.image_url.url.split(';')[0].split(':')[1],
                      data: imgData
                    }
                  };
                }
                return c;
              })
            };
          }
          
          // For text-only messages
          if (typeof m.content === 'string') {
            memoryManager.addToShortTerm(m.content, m.role);
          }
          
          return {
            role: m.role,
            content: Array.isArray(m.content) ? m.content : [{ type: 'text', text: m.content }]
          };
        });
      
      // Get text content for knowledge base query
      let textContent = '';
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      
      if (lastUserMsg) {
        if (typeof lastUserMsg.content === 'string') {
          textContent = lastUserMsg.content;
        } else if (Array.isArray(lastUserMsg.content)) {
          textContent = lastUserMsg.content
            .filter(c => c.type === 'text')
            .map(c => c.text)
            .join(' ');
        }
      }
      
      // Query knowledge base if needed
      let kbContext = "";
      let citations = [];
      
      if (textContent && memoryManager.knowledgeBaseId) {
        console.log(`🔵 [AWS Bedrock] Streaming: Querying Knowledge Base ID: ${memoryManager.knowledgeBaseId}`);
        try {
          [kbContext, citations] = await memoryManager.queryKnowledgeBase(
            textContent, model, ""
          );
          if (kbContext) {
            console.log(`🔵 [AWS Bedrock] Streaming: KB returned ${kbContext.length} characters of context`);
            console.log(`🔵 [AWS Bedrock] Streaming: Found ${citations.length} citations from knowledge base`);
          } else {
            console.log(`🔵 [AWS Bedrock] Streaming: No context returned from knowledge base query`);
          }
        } catch (kbError) {
          console.error('🔴 [AWS Bedrock] Streaming: Error querying knowledge base:', kbError);
          console.log('🔵 [AWS Bedrock] Streaming: Continuing without knowledge base context');
        }
      }
      
      // Enhanced system message with KB data - Make KB information more prominent
      let enhancedSystemMessage = systemMessage;
      if (kbContext) {
        // Log the actual KB content to help with debugging
        console.log(`🔵 [AWS Bedrock] Streaming: KB content being added to prompt: "${kbContext.substring(0, 100)}..."`);
        
        // Format the KB information more prominently to ensure Claude uses it
        enhancedSystemMessage = `
${systemMessage}

##############################################################
## IMPORTANT - KNOWLEDGE BASE INFORMATION - USE THIS FIRST ##
##############################################################

${kbContext}

INSTRUCTIONS:
1. You MUST use the above knowledge base information as your PRIMARY source to answer the user's question.
2. If the knowledge base contains relevant information, incorporate it fully into your response.
3. Cite your sources by mentioning "According to the knowledge base" when using this information.
4. Do NOT claim ignorance about topics covered in the knowledge base information.
5. If the knowledge base information conflicts with your training data, prioritize the knowledge base.

##############################################################
`;
      }
      
      // Add conversation context
      const conversationContext = memoryManager.getConversationContext();
      if (conversationContext && conversationContext !== "No recent conversation context") {
        enhancedSystemMessage += `\n\n${conversationContext}`;
      }
      
      // Prepare payload for streaming with SDK v3
      const input = {
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: opts.maxTokens || 2048,
          temperature: opts.temperature || 0.7,
          system: enhancedSystemMessage,
          messages: formattedMessages
        })
      };
      
      try {
        console.log(`🔵 [AWS Bedrock] Invoking model with streaming: ${model}`);
        
        // Use SDK v3 streaming command
        const command = new InvokeModelWithResponseStreamCommand(input);
        const apiResponse = await bedrockRuntime.send(command);
        
        // Create a readable stream from the Bedrock response stream
        const readableStream = new ReadableStream({
          start(controller) {
            (async () => {
              let fullResponse = '';
              
              try {
                console.log(`🔵 [AWS Bedrock] Stream started`);
                
                // Using direct for-await loop to process stream exactly as shown in example
                for await (const item of apiResponse.body) {
                  // Use the exact structure from the example code
                  if (item.chunk && item.chunk.bytes) {
                    try {
                      // Parse the chunk bytes as shown in example
                      const chunk = JSON.parse(new TextDecoder().decode(item.chunk.bytes));
                      const chunk_type = chunk.type;
                      
                      // Handle content block delta as per example
                      if (chunk_type === "content_block_delta" && chunk.delta && chunk.delta.text) {
                        const text = chunk.delta.text;
                        // Don't add raw text to fullResponse here, we'll add the cleaned version later
                        
                        // Clean up the text to remove any problematic characters/artifacts
                        const cleanText = text
                          // Remove control characters
                          .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
                          // Clean up common artifacts
                          .replace(/\/id\s*|sLo\s*|g\s*\(\s*|ed\s*|ith\s*/g, '')
                          // Remove any broken HTML-like fragments
                          .replace(/<[^>]*$/g, '');
                        
                        // Format as OpenAI-compatible SSE
                        // Wrap in try-catch to prevent malformed JSON from causing issues
                        try {
                          const ssePayload = JSON.stringify({
                            choices: [{
                              delta: { content: cleanText }
                            }]
                          });
                          controller.enqueue(new TextEncoder().encode(`data: ${ssePayload}\n\n`));
                          
                          // Add the cleaned text to the full response
                          fullResponse += cleanText;
                        } catch (sseError) {
                          console.error('Error formatting SSE payload:', sseError);
                        }
                      }
                    } catch (parseError) {
                      console.error('Error parsing chunk:', parseError);
                    }
                  }
                }
                
                console.log(`🔵 [AWS Bedrock] Stream complete, text length: ${fullResponse.length}`);
                
                // Store complete response in memory when done
                if (fullResponse) {
                  memoryManager.addToShortTerm(fullResponse, 'assistant');
                }
                
                // Close the controller when done
                controller.close();
              } catch (streamError) {
                console.error(`🔵 [AWS Bedrock] Stream error: ${streamError.message}`);
                controller.error(streamError);
              }
            })();
          },
          cancel() {
            console.log(`🔵 [AWS Bedrock] Stream cancelled`);
          }
        });
        
        // Return a Response object using the readable stream
        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/event-stream',
          }
        });
      } catch (error) {
        console.error('Error in Bedrock streaming chat:', error);
        throw error;
      }
    }
  };
}

/**
 * Creates an AWS Bedrock STT session
 * Not currently implemented - falls back to OpenAI STT
 */
function createSTT(opts) {
  throw new Error('AWS Bedrock STT not implemented. Please use OpenAI for STT functionality.');
}

module.exports = {
  createLLM,
  createStreamingLLM,
  createSTT
};
