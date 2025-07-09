/**
 * Knowledge Base Query Optimization Utilities
 * 
 * These utilities help improve knowledge base query results by:
 * 1. Preprocessing queries to better match KB indexing
 * 2. Expanding queries when initial results are insufficient
 * 3. Providing detailed diagnostic information
 */

/**
 * Preprocess a query to improve knowledge base matching
 * Removes unnecessary words, formats questions properly, and focuses on key terms
 * 
 * @param {string} rawQuery - The original query text
 * @returns {string} - Optimized query for KB search
 */
function preprocessQueryForKB(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return '';
  }

  // Remove any leading/trailing whitespace
  let query = rawQuery.trim();
  
  // Normalize whitespace
  query = query.replace(/\s+/g, ' ');
  
  // Extract question format if present (often gives better results)
  const questionMatch = query.match(/(?:what|how|who|when|where|why|can|could|should|is|are|was|were|will|do|does)(?:\s+\w+){1,20}\?/i);
  if (questionMatch) {
    return questionMatch[0];
  }
  
  // If not a question, focus query by:
  // 1. Remove filler words
  query = query.replace(/\b(?:um|uh|like|you know|I mean|just|basically|actually|literally|so|very|really|quite|I think|I guess|maybe|perhaps|well|right)\b/gi, '');
  
  // 2. Keep to reasonable length (first 150 chars typically contain the core query)
  if (query.length > 150) {
    query = query.substring(0, 150);
  }
  
  // 3. Ensure query ends with appropriate punctuation
  if (!query.endsWith('?') && !query.endsWith('.')) {
    query += '?';
  }
  
  return query;
}

/**
 * Expand a query with synonyms and related terms when initial KB search fails
 * 
 * @param {string} originalQuery - The original or preprocessed query that failed
 * @returns {string} - Expanded query with additional search terms
 */
function expandQueryWithSynonyms(originalQuery) {
  if (!originalQuery || typeof originalQuery !== 'string') {
    return '';
  }

  // Extract key noun phrases and verbs - these would be the main concepts
  const keyTerms = extractKeyTerms(originalQuery);
  
  // Add common synonyms and related terms to enhance search
  let expandedQuery = originalQuery;
  
  // If we have key terms, add them with alternatives
  if (keyTerms.length > 0) {
    const expansions = keyTerms.map(term => {
      const synonyms = findSynonyms(term);
      return synonyms.length > 0 ? `${term} (${synonyms.join(' ')})` : term;
    });
    
    expandedQuery = `${originalQuery} | Additional context: ${expansions.join(', ')}`;
  }
  
  // Format as a broader search request
  return `Find information related to: ${expandedQuery}`;
}

/**
 * Extract key terms from a query for expansion
 * 
 * @param {string} query - The query to extract terms from
 * @returns {string[]} - Array of key terms
 */
function extractKeyTerms(query) {
  // Split on spaces and punctuation
  const words = query.toLowerCase().split(/[\s.,;:!?()'"–—]+/);
  
  // Filter out common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can',
    'could', 'to', 'for', 'of', 'about', 'with', 'by', 'at', 'from',
    'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 's', 't', 'can', 'just', 'don', "don't",
    'now', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
    'you', "you're", "you've", "you'll", "you'd", 'your', 'yours', 
    'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 
    "she's", 'her', 'hers', 'herself', 'it', "it's", 'its', 'itself', 
    'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
    'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am',
    'because', 'until', 'while', 'if', 'else', 'as', 'until', 'while'
  ]);
  
  // Keep only meaningful words of sufficient length
  const keyWords = words.filter(word => 
    !stopWords.has(word) && 
    word.length > 3 && 
    !/^\d+$/.test(word) // Exclude numbers
  );
  
  // Deduplicate and return up to 5 most significant terms
  return [...new Set(keyWords)].slice(0, 5);
}

/**
 * Find common synonyms for a term to expand search
 * 
 * @param {string} term - The term to find synonyms for
 * @returns {string[]} - Array of synonyms
 */
function findSynonyms(term) {
  // This is a simple implementation with common synonyms
  // In a production system, you might use a thesaurus API or database
  const synonymMap = {
    'information': ['data', 'details', 'facts', 'knowledge'],
    'important': ['significant', 'crucial', 'essential', 'key'],
    'issue': ['problem', 'concern', 'matter', 'trouble'],
    'create': ['build', 'develop', 'make', 'produce'],
    'change': ['modify', 'alter', 'adjust', 'transform'],
    'report': ['document', 'record', 'account', 'analysis'],
    'result': ['outcome', 'effect', 'consequence', 'output'],
    'process': ['procedure', 'method', 'system', 'approach'],
    'increase': ['grow', 'rise', 'expand', 'improve'],
    'decrease': ['reduce', 'decline', 'drop', 'lower'],
    'feature': ['function', 'capability', 'characteristic', 'aspect'],
    'error': ['mistake', 'bug', 'fault', 'defect'],
    'user': ['customer', 'client', 'person', 'individual'],
    'data': ['information', 'statistics', 'facts', 'figures'],
    'interface': ['ui', 'display', 'screen', 'layout'],
    'question': ['query', 'inquiry', 'request', 'prompt'],
    'example': ['instance', 'case', 'sample', 'illustration'],
    'explain': ['describe', 'clarify', 'elaborate', 'detail'],
    'help': ['assist', 'support', 'aid', 'guidance'],
    'project': ['task', 'assignment', 'undertaking', 'venture']
  };
  
  // Try to find exact match first
  if (synonymMap[term]) {
    return synonymMap[term];
  }
  
  // Check for partial matches (for compound terms)
  const results = [];
  for (const [key, synonyms] of Object.entries(synonymMap)) {
    if (term.includes(key) || key.includes(term)) {
      results.push(...synonyms);
    }
  }
  
  return results.slice(0, 3); // Limit to 3 synonyms max
}

/**
 * Generate diagnostic information about a KB query
 * 
 * @param {string} originalQuery - Original query text
 * @param {string} processedQuery - Query after preprocessing
 * @param {string} kbContext - Response from KB
 * @param {Array} citations - Citations returned from KB
 * @returns {object} - Diagnostic information
 */
function generateKBQueryDiagnostics(originalQuery, processedQuery, kbContext, citations) {
  return {
    originalQueryLength: originalQuery.length,
    processedQueryLength: processedQuery.length,
    queryDiff: originalQuery !== processedQuery,
    responseLength: kbContext?.length || 0,
    citationCount: citations?.length || 0,
    successfulRetrieval: !!(kbContext && kbContext.length > 100),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  preprocessQueryForKB,
  expandQueryWithSynonyms,
  generateKBQueryDiagnostics
};
