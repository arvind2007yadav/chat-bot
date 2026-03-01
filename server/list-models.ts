// Quick script to list available Google Generative AI models
import 'dotenv/config';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error('ERROR: GOOGLE_API_KEY not set');
    process.exit(1);
}

async function listModels() {
    try {
        console.log('Querying available models from Google Generative AI API...\n');
        
        // Using native fetch to query the API
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data: any = await response.json();
        
        if (!response.ok) {
            console.error('API Error:', data);
            process.exit(1);
        }
        
        console.log('=== Available Models ===\n');
        if (data.models && data.models.length > 0) {
            const chatModels: string[] = [];
            const embedModels: string[] = [];
            
            data.models.forEach((model: any) => {
                const name = model.name.replace('models/', '');
                const methods = model.supportedGenerationMethods || [];
                
                if (methods.includes('generateContent')) {
                    chatModels.push(name);
                }
                if (methods.includes('embedContent')) {
                    embedModels.push(name);
                }
            });
            
            console.log('Chat/Content Generation Models:');
            if (chatModels.length > 0) {
                chatModels.forEach(m => console.log(`  ✓ ${m}`));
            } else {
                console.log('  (none found)');
            }
            
            console.log('\nEmbedding Models:');
            if (embedModels.length > 0) {
                embedModels.forEach(m => console.log(`  ✓ ${m}`));
            } else {
                console.log('  (none found)');
            }
            
            console.log('\n=== How to Use ===');
            console.log('Set environment variables before running seed or dev:');
            if (chatModels.length > 0) {
                console.log(`  GOOGLE_CHAT_MODEL=${chatModels[0]}`);
            }
            if (embedModels.length > 0) {
                console.log(`  GOOGLE_EMBEDDING_MODEL=${embedModels[0]}`);
            }
        } else {
            console.log('No models returned from API');
        }
    } catch (error: any) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

listModels();
