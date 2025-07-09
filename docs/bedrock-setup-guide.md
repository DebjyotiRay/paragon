# AWS Bedrock Setup Guide for ParagonGlass

This guide explains how to set up AWS Bedrock integration for ParagonGlass.

## Prerequisites

1. An AWS account with access to Bedrock
2. AWS credentials (Access Key ID and Secret Access Key)
3. Optional: AWS Knowledge Base ID if you want to use RAG capabilities

## Setup Instructions

### Automatic Setup

We've provided a setup script that installs the AWS SDK and configures your environment:

```bash
node scripts/setup-bedrock.js
```

This script will:
1. Install the AWS SDK as a dependency
2. Prompt for your AWS credentials
3. Save the credentials to your `.env` file
4. Configure the necessary environment variables

### Manual Setup

If you prefer to set up manually:

1. Install the AWS SDK:

```bash
npm install aws-sdk --save
```

2. Create or update your `.env` file with the following variables:

```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_KNOWLEDGE_BASE_ID=your_kb_id (optional)
AWS_BEDROCK_MODEL=anthropic.claude-3-haiku-20240307-v1:0 (optional)
```

## Using AWS Bedrock in ParagonGlass

After setting up:

1. Open the ParagonGlass app
2. Click on Settings
3. Select "AWS Bedrock" from the provider dropdown
4. Enter your AWS Access Key ID in the key field
5. Click "Save Key"

ParagonGlass will now use AWS Bedrock for all AI operations.

## AWS Bedrock Models

By default, ParagonGlass uses `anthropic.claude-3-haiku-20240307-v1:0`. You can change this by setting the `AWS_BEDROCK_MODEL` environment variable.

Supported models:
- `anthropic.claude-3-haiku-20240307-v1:0` (default)
- `anthropic.claude-3-sonnet-20240229-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`

## AWS Knowledge Base Integration

If you've provided a Knowledge Base ID, ParagonGlass will use it to retrieve relevant information when processing conversations.

To set up a Knowledge Base:
1. Go to the AWS Console
2. Navigate to Bedrock > Knowledge bases
3. Create a new Knowledge Base or use an existing one
4. Copy the Knowledge Base ID
5. Add it to your environment variables or during the setup script

## Troubleshooting

- **Authentication Errors**: Make sure your AWS credentials have the correct permissions for Bedrock
- **Region Errors**: Verify that Bedrock is available in your selected AWS region
- **Model Errors**: Check that the model you're trying to use is enabled in your AWS Bedrock account
