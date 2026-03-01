// Quick debug script to list available Google Generative AI models
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error('ERROR: GOOGLE_API_KEY not set');
    process.exit(1);
}

async function listModels() {
    try {
        console.log('Querying available models from Google Generative AI API...\n');
        
        // Using fetch directly to the API endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            console.error('API Error:', data);
            process.exit(1);
        }
        
        console.log('=== Available Models ===\n');
        if (data.models && data.models.length > 0) {
            const chatModels = [];
            const embedModels = [];
            
            data.models.forEach(model => {
                const name = model.name.replace('models/', '');
                const methods = model.supportedGenerationMethods || [];
                
                if (methods.includes('generateContent')) {
                    chatModels.push(name);
                }
                if (methods.includes('embedContent')) {
                    embedModels.push(name);
                }
            });
            
            console.log('Chat Models (generateContent):');
            chatModels.forEach(m => console.log(`  - ${m}`));
            
            console.log('\nEmbedding Models (embedContent):');
            embedModels.forEach(m => console.log(`  - ${m}`));
            
            console.log('\nUsage:');
            console.log('  For chat: GOOGLE_CHAT_MODEL=<model_name>');
            console.log('  For embeddings: GOOGLE_EMBEDDING_MODEL=<model_name>');
        } else {
            console.log('No models returned from API');
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

listModels();
