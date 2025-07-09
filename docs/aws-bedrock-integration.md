# AWS Bedrock Integration for ParagonGlass

This document describes how to use the AWS Bedrock integration in ParagonGlass.

## Overview

The AWS Bedrock integration allows ParagonGlass to use AWS's foundation models (Claude, etc.) for conversation analysis, with support for:

- Multimodal inputs (text + images)
- Knowledge Base integration
- Enhanced memory management
- Streaming responses

## Setup

### 1. AWS Credentials

Set up your AWS credentials in your environment:

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1 # or your preferred region
```

### 2. Knowledge Base (Optional)

If you want to use a Knowledge Base, set:

```bash
export AWS_KNOWLEDGE_BASE_ID=your_kb_id # e.g. "TERHHPXSLM"
```

### 3. Model Configuration (Optional)

You can specify which AWS Bedrock model to use:

```bash
export AWS_BEDROCK_MODEL=anthropic.claude-3-sonnet-20240229-v1:0
```

Default is `anthropic.claude-3-haiku-20240307-v1:0` if not specified.

## Usage Examples

### Basic Usage with BedrockService

The easiest way to use Bedrock is through the `bedrockService`:

```javascript
const bedrockService = require('./src/common/services/bedrockService');

// Initialize with custom options (optional)
bedrockService.initialize({
  awsAccessKeyId: 'your_access_key',
  awsSecretAccessKey: 'your_secret_key',
  region: 'us-east-1',
  model: 'anthropic.claude-3-haiku-20240307-v1:0',
  kbId: 'your_knowledge_base_id'
});

// Generate content
const response = await bedrockService.generateContent([
  "You are a helpful assistant.",
  "What is the capital of France?"
]);

console.log(response.response.text());
```

### Processing Images

```javascript
// Get screenshot
const screenshot = await window.ParagonGlass.getCurrentScreenshot();

// Process with both text and image
const analysis = await bedrockService.processMultimodal(
  "What's happening in this image?", 
  screenshot,
  "image/jpeg"
);

console.log(analysis);
```

### Streaming Responses

```javascript
const messages = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "Tell me a story about space exploration." }
];

const streamResponse = await bedrockService.streamChat(messages);
const reader = streamResponse.body.getReader();

// Process the stream
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // Process each chunk
  const text = new TextDecoder().decode(value);
  // The text will be in the format: data: {"choices":[{"delta":{"content":"chunk text"}}]}\n\n
  
  const matches = text.match(/data: (.+)\n\n/);
  if (matches && matches[1]) {
    const data = JSON.parse(matches[1]);
    const chunk = data.choices[0].delta.content;
    console.log(chunk);
  }
}
```

### Using the Factory Directly

If you prefer more control, you can use the AI factory directly:

```javascript
const factory = require('./src/common/ai/factory');

const llm = factory.createLLM('bedrock', {
  apiKey: 'your_aws_access_key',
  awsSecretKey: 'your_aws_secret_key',
  region: 'us-east-1',
  model: 'anthropic.claude-3-haiku-20240307-v1:0',
  kbId: 'your_knowledge_base_id'
});

const result = await llm.generateContent([
  "You are a helpful assistant.",
  "What is the capital of France?"
]);

console.log(result.response.text());
```

## Features

### 1. Enhanced Memory Manager

The integration includes a memory manager that:

- Maintains a sliding window of recent conversation
- Cleans up old messages automatically
- Provides context for future responses
- Integrates with knowledge base queries

### 2. Knowledge Base Integration

When a knowledge base ID is provided, the system will:

- Query the knowledge base for relevant information based on user queries
- Include retrieved information in the prompt context
- Support citations from knowledge base sources

### 3. Multimodal Support

The implementation fully supports sending both text and images to Claude models in AWS Bedrock.

## Supported Models

Currently supports the following Anthropic Claude models available in AWS Bedrock:

- `anthropic.claude-3-haiku-20240307-v1:0` (default)
- `anthropic.claude-3-sonnet-20240229-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`

## Integration with ParagonGlass

The integration works seamlessly with ParagonGlass's existing features:

1. **Screenshot Capture**: Use `window.ParagonGlass.getCurrentScreenshot()` to get images to send to Bedrock
2. **Memory Management**: Conversations and contexts are maintained between interactions
3. **Streaming**: Responses can be streamed in real-time to the UI
