#!/usr/bin/env node

/**
 * Knowledge Base Query Testing Utility
 * 
 * This script tests queries against your AWS Bedrock knowledge base
 * to help diagnose and troubleshoot retrieval issues.
 * 
 * Usage:
 *   node scripts/test-kb-query.js "your query here"
 * 
 * Features:
 * - Tests both raw and optimized versions of your query
 * - Shows detailed diagnostic information about the results
 * - Compares response quality between different query strategies
 */

const { BedrockAgentRuntimeClient, RetrieveAndGenerateCommand } = require("@aws-sdk/client-bedrock-agent-runtime");
const dotenv = require('dotenv');
const { preprocessQueryForKB, expandQueryWithSynonyms } = require("../src/common/utils/kbQueryOptimizer");

// Load environment variables from .env file
dotenv.config();

// Constants and configuration
const KB_ID = process.env.AWS_KNOWLEDGE_BASE_ID || 'TERHHPXSLM';
const REGION = process.env.AWS_REGION || 'us-east-1';
const MODEL_ID = process.env.AWS_BEDROCK_MODEL || 'anthropic.claude-3-haiku-20240307-v1:0';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Main function to test a knowledge base query
 * @param {string} query - The query to test
 */
async function testKBQuery(query) {
  // Initialize AWS client
  const credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  };

  if (process.env.AWS_SESSION_TOKEN) {
    credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
    console.log(`${colors.dim}[INFO] Using AWS session token${colors.reset}`);
  }

  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    console.error(`${colors.red}${colors.bright}ERROR: AWS credentials not found in environment variables.${colors.reset}`);
    console.log(`Make sure you have AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY set in your .env file.`);
    process.exit(1);
  }

  if (!KB_ID) {
    console.error(`${colors.red}${colors.bright}ERROR: Knowledge Base ID not found.${colors.reset}`);
    console.log(`Make sure AWS_KNOWLEDGE_BASE_ID is set in your .env file.`);
    process.exit(1);
  }

  console.log(`\n${colors.bright}===== KNOWLEDGE BASE QUERY TEST =====\n${colors.reset}`);
  console.log(`${colors.bright}📚 Knowledge Base ID:${colors.reset} ${KB_ID}`);
  console.log(`${colors.bright}🌐 AWS Region:${colors.reset} ${REGION}`);
  console.log(`${colors.bright}🤖 Model ID:${colors.reset} ${MODEL_ID}`);
  console.log(`${colors.bright}📝 Original Query:${colors.reset} "${query}"\n`);

  try {
    const client = new BedrockAgentRuntimeClient({
      region: REGION,
      credentials
    });

    // TEST 1: Raw query
    console.log(`${colors.cyan}${colors.bright}TEST #1: RAW QUERY${colors.reset}`);
    const rawResults = await queryKB(client, query);
    displayResults("Raw Query", query, rawResults);

    // TEST 2: Preprocessed query
    const processedQuery = preprocessQueryForKB(query);
    console.log(`\n${colors.cyan}${colors.bright}TEST #2: PREPROCESSED QUERY${colors.reset}`);
    const processedResults = await queryKB(client, processedQuery);
    displayResults("Preprocessed Query", processedQuery, processedResults);

    // TEST 3: Expanded query
    const expandedQuery = expandQueryWithSynonyms(query);
    console.log(`\n${colors.cyan}${colors.bright}TEST #3: EXPANDED QUERY${colors.reset}`);
    const expandedResults = await queryKB(client, expandedQuery);
    displayResults("Expanded Query", expandedQuery, expandedResults);

    // Compare results
    console.log(`\n${colors.bright}===== COMPARISON =====\n${colors.reset}`);
    compareResults([
      { name: "Raw Query", results: rawResults },
      { name: "Preprocessed Query", results: processedResults },
      { name: "Expanded Query", results: expandedResults }
    ]);

  } catch (error) {
    console.error(`${colors.red}${colors.bright}ERROR:${colors.reset} ${error.message}`);
    if (error.Code === 'ExpiredTokenException') {
      console.log(`${colors.yellow}Your AWS session token has expired. Please refresh your credentials.${colors.reset}`);
    } else if (error.Code === 'AccessDeniedException') {
      console.log(`${colors.yellow}Access denied. Make sure your credentials have permission to access the Knowledge Base.${colors.reset}`);
    }
  }
}

/**
 * Query the knowledge base with a given query
 * @param {BedrockAgentRuntimeClient} client - AWS Bedrock client
 * @param {string} query - The query to send
 * @returns {object} - The response and timing information
 */
async function queryKB(client, query) {
  console.log(`Query: "${query}"`);

  const startTime = Date.now();
  
  const input = {
    input: { text: query },
    retrieveAndGenerateConfiguration: {
      type: 'KNOWLEDGE_BASE',
      knowledgeBaseConfiguration: {
        knowledgeBaseId: KB_ID,
        modelArn: `arn:aws:bedrock:${REGION}::foundation-model/${MODEL_ID.replace("us.", "")}`
      }
    }
  };

  const command = new RetrieveAndGenerateCommand(input);

  try {
    const response = await client.send(command);
    const endTime = Date.now();
    
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

    return {
      text: response.output?.text || '',
      citations: citations,
      latency: endTime - startTime,
      raw: response
    };
  } catch (error) {
    console.error(`${colors.red}Error querying KB:${colors.reset} ${error.message}`);
    return {
      text: '',
      citations: [],
      latency: 0,
      error: error.message
    };
  }
}

/**
 * Display results from a KB query
 * @param {string} name - Name of the test
 * @param {string} query - The query used
 * @param {object} results - Results from the query
 */
function displayResults(name, query, results) {
  const contentLength = results.text?.length || 0;

  console.log(`${colors.dim}Query: "${query}"${colors.reset}`);
  console.log(`${colors.bright}Response Time:${colors.reset} ${results.latency}ms`);
  console.log(`${colors.bright}Content Length:${colors.reset} ${contentLength} characters`);
  console.log(`${colors.bright}Citations:${colors.reset} ${results.citations.length}`);

  if (contentLength > 0) {
    console.log(`\n${colors.bright}Response Preview:${colors.reset}`);
    console.log(`${colors.dim}${results.text.substring(0, 300)}${contentLength > 300 ? '...' : ''}${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}No content returned${colors.reset}`);
  }

  if (results.citations.length > 0) {
    console.log(`\n${colors.bright}Citation Sources:${colors.reset}`);
    results.citations.forEach((citation, index) => {
      console.log(`${colors.dim}[${index + 1}] ${citation.source} (Score: ${citation.score})${colors.reset}`);
    });
  }
}

/**
 * Compare results from different query strategies
 * @param {Array} testResults - Array of test results to compare
 */
function compareResults(testResults) {
  // Find the test with the most content
  const bestTest = testResults.reduce((best, current) => {
    const currentLength = current.results.text?.length || 0;
    const bestLength = best.results.text?.length || 0;
    return currentLength > bestLength ? current : best;
  }, testResults[0]);

  // Find the test with the most citations
  const mostCitations = testResults.reduce((best, current) => {
    return (current.results.citations?.length || 0) > (best.results.citations?.length || 0) ? current : best;
  }, testResults[0]);

  // Find the fastest test
  const fastest = testResults.reduce((best, current) => {
    return (current.results.latency || Infinity) < (best.results.latency || Infinity) ? current : best;
  }, testResults[0]);

  console.log(`${colors.bright}Most Content:${colors.reset} ${bestTest.name} (${bestTest.results.text?.length || 0} characters)`);
  console.log(`${colors.bright}Most Citations:${colors.reset} ${mostCitations.name} (${mostCitations.results.citations?.length || 0} citations)`);
  console.log(`${colors.bright}Fastest Response:${colors.reset} ${fastest.name} (${fastest.results.latency}ms)`);

  // Recommendation
  console.log(`\n${colors.green}${colors.bright}RECOMMENDATION:${colors.reset}`);
  
  if (bestTest.results.text?.length > 100) {
    console.log(`${colors.green}✓ Use "${bestTest.name}" for best results with this type of query.${colors.reset}`);
  } else if (testResults.every(t => !t.results.text || t.results.text.length < 100)) {
    console.log(`${colors.yellow}⚠ None of the query strategies returned substantial content.${colors.reset}`);
    console.log(`${colors.yellow}  Possible issues:${colors.reset}`);
    console.log(`${colors.yellow}  1. Your knowledge base may not contain information related to this query${colors.reset}`);
    console.log(`${colors.yellow}  2. The query might need to be reformulated to better match your KB content${colors.reset}`);
    console.log(`${colors.yellow}  3. There might be an issue with your KB configuration or permissions${colors.reset}`);
  }
}

// Get the query from command line arguments
const query = process.argv.slice(2).join(' ');

if (!query) {
  console.log(`
${colors.bright}Knowledge Base Query Testing Utility${colors.reset}

This utility helps you test queries against your AWS Bedrock knowledge base
to diagnose retrieval issues and optimize query performance.

${colors.bright}Usage:${colors.reset}
  node scripts/test-kb-query.js "your query here"

${colors.bright}Examples:${colors.reset}
  node scripts/test-kb-query.js "What are Nike's Q4 results?"
  node scripts/test-kb-query.js "Explain the new features in the latest product update"
  `);
  process.exit(0);
}

// Run the test
testKBQuery(query);
