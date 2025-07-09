const { ipcMain, BrowserWindow } = require('electron');
const { createStreamingLLM } = require('../../common/ai/factory');
const { getStoredApiKey, getStoredProvider, windowPool, captureScreenshot } = require('../../electron/windowManager');
const authService = require('../../common/services/authService');
const sessionRepository = require('../../common/repositories/session');
const askRepository = require('./repositories');
const { getSystemPrompt } = require('../../common/prompts/promptBuilder');

function formatConversationForPrompt(conversationTexts) {
    if (!conversationTexts || conversationTexts.length === 0) return 'No conversation history available.';
    return conversationTexts.slice(-30).join('\n');
}

// Access conversation history via the global listenService instance created in index.js
function getConversationHistory() {
    const listenService = global.listenService;
    return listenService ? listenService.getConversationHistory() : [];
}

async function sendMessage(userPrompt) {
    if (!userPrompt || userPrompt.trim().length === 0) {
        console.warn('[AskService] Cannot process empty message');
        return { success: false, error: 'Empty message' };
    }
    
    const askWindow = windowPool.get('ask');
    if (askWindow && !askWindow.isDestroyed()) {
        askWindow.webContents.send('hide-text-input');
    }

    try {
        console.log(`[AskService] 🤖 Processing message: ${userPrompt.substring(0, 50)}...`);

        const screenshotResult = await captureScreenshot({ quality: 'medium' });
        const screenshotBase64 = screenshotResult.success ? screenshotResult.base64 : null;

        const conversationHistoryRaw = getConversationHistory();
        const conversationHistory = formatConversationForPrompt(conversationHistoryRaw);

        const systemPrompt = getSystemPrompt('pickle_glass_analysis', conversationHistory, false);

        const API_KEY = await getStoredApiKey();
        if (!API_KEY) {
            throw new Error('No API key found');
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: [
                    { type: 'text', text: `User Request: ${userPrompt.trim()}` },
                ],
            },
        ];

        if (screenshotBase64) {
            messages[1].content.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` },
            });
        }
        
        const provider = await getStoredProvider();
        const { isLoggedIn } = authService.getCurrentUser();
        
        console.log(`[AskService] 🚀 Sending request to ${provider} AI...`);
        
        // Detailed configuration logging
        let modelOptions = {};
        if (provider === 'bedrock') {
            console.log(`[AskService] 🌟 USING AWS BEDROCK as provider`);
            
            // AWS Bedrock configuration - user key takes priority
            modelOptions = {
                apiKey: API_KEY,  // User-entered key (takes precedence)
                awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,   // AWS secret access key
                region: process.env.AWS_REGION || 'us-east-1',     // AWS region
                model: process.env.AWS_BEDROCK_MODEL || 'anthropic.claude-3-haiku-20240307-v1:0',
                kbId: process.env.AWS_KNOWLEDGE_BASE_ID || 'TERHHPXSLM',  // Knowledge base ID
                temperature: 0.7,
                maxTokens: 2048
            };
            
            console.log(`[AskService] 🔧 AWS Bedrock config: model=${modelOptions.model}, region=${modelOptions.region}`);
            if (modelOptions.kbId) {
                console.log(`[AskService] 📚 Using Knowledge Base: ${modelOptions.kbId}`);
            }
        } else {
            // OpenAI/Gemini configuration
            modelOptions = {
                apiKey: API_KEY,
                model: provider === 'openai' ? 'gpt-4.1' : 'gemini-2.5-flash',
                temperature: 0.7,
                maxTokens: 2048,
                usePortkey: provider === 'openai' && isLoggedIn,
                portkeyVirtualKey: isLoggedIn ? API_KEY : undefined
            };
        }

        const streamingLLM = await createStreamingLLM(provider, modelOptions);

        const response = await streamingLLM.streamChat(messages);

        // --- Stream Processing ---
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        const askWin = windowPool.get('ask');
        if (!askWin || askWin.isDestroyed()) {
            console.error("[AskService] Ask window is not available to send stream to.");
            reader.cancel();
            return;
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            askWin.webContents.send('ask-response-stream-end');
                            
                            // Save to DB
                            try {
                                const uid = authService.getCurrentUserId();
                                if (!uid) throw new Error("User not logged in, cannot save message.");
                                const sessionId = await sessionRepository.getOrCreateActive(uid, 'ask');
                                await askRepository.addAiMessage({ sessionId, role: 'user', content: userPrompt.trim() });
                                await askRepository.addAiMessage({ sessionId, role: 'assistant', content: fullResponse });
                                console.log(`[AskService] DB: Saved ask/answer pair to session ${sessionId}`);
                            } catch(dbError) {
                                console.error("[AskService] DB: Failed to save ask/answer pair:", dbError);
                            }
                            
                            return { success: true, response: fullResponse };
                        }
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                fullResponse += token;
                                askWin.webContents.send('ask-response-chunk', { token });
                            }
                        } catch (error) {
                            console.warn("[AskService] Stream parse error:", error.message);
                            // For malformed JSON, try to extract any usable content
                            if (data && typeof data === 'string' && data !== '[DONE]') {
                                try {
                                    // Try to salvage any text content that might be valid
                                    const safeToken = data.replace(/[^\w\s.,?!;:'"()[\]{}-]/g, '');
                                    if (safeToken.trim().length > 0) {
                                        console.log("[AskService] Salvaged content from malformed stream chunk");
                                        fullResponse += ' ';
                                        askWin.webContents.send('ask-response-chunk', { token: ' ' });
                                    }
                                } catch (e) {
                                    // If even this fails, just ignore the chunk
                                }
                            }
                        }
                    }
                }
        }
    } catch (error) {
        console.error('[AskService] Error processing message:', error);
        return { success: false, error: error.message };
    }
}

function initialize() {
    ipcMain.handle('ask:sendMessage', async (event, userPrompt) => {
        return sendMessage(userPrompt);
    });
    console.log('[AskService] Initialized and ready.');
}

module.exports = {
    initialize,
};
