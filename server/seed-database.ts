/* GoogleGenerativeAIEmbeddings is used to generate embeddings (vector representations) using Google’s Gemini models via LangChain. */
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { MongoClient } from 'mongodb'
/* StructuredOutputParser is a utility from LangChain that forces the AI to return output in a strict structured format (like JSON). */
import {  StructuredOutputParser } from '@langchain/core/output_parsers'
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb'
import 'dotenv/config'

// Validate and warn about missing API key
if (!process.env.GOOGLE_API_KEY) {
    console.error('ERROR: GOOGLE_API_KEY is not set. Seeding will fail.');
    process.exit(1);
}
/* Zod is a TypeScript-first schema validation library.
Define the structure of data
Validate inputs
Ensure types are correct
Prevent runtime errors*/
import { z} from 'zod'


const mongoClient = new MongoClient(process.env.MONGODB_ATLAS_URI as string);

// Load model names from environment with sensible defaults
// Using models confirmed to be available in v1beta API
const chatModel = process.env.GOOGLE_CHAT_MODEL || 'gemini-2.5-flash';
const embeddingModel = process.env.GOOGLE_EMBEDDING_MODEL || 'gemini-embedding-001';
console.log('Seed script using chat model:', chatModel);
console.log('Seed script using embedding model:', embeddingModel);

const llm = new ChatGoogleGenerativeAI({
    temperature: 0.7,
    model: chatModel,
    apiKey: process.env.GOOGLE_API_KEY,
})

const itemSchema = z.object({
    item_id: z.string(),
    item_name: z.string(),
    item_description: z.string(),
    brand : z.string(),
    manufacturer_address: z.object({
        street: z.string(),
        city: z.string(),
        country: z.string(),
        postal_code: z.string(),
        state: z.string(),
    }),
    prices: z.object({
        full_price: z.number(),
        sale_price: z.number(),
    }),
    categories: z.array(z.string()),
    user_reviews: z.array(
        z.object({
        review_date: z.string(),  
        rating: z.number(),
        comment: z.string(),
        })
    ),     
    notes: z.string(),   
}) 

/* creates a TypeScript type from your Zod schema.*/
type Item = z.infer<typeof itemSchema>;

/* This tells LangChain: The model must return an array of items following this schema.*/
const parser = StructuredOutputParser.fromZodSchema(z.array(itemSchema));

async function setupDatabseAndCollection(): Promise<void> {
    try {
        console.log('Setting up database and collection');   
        /* Create databse with below name*/           
        const db = mongoClient.db('batiora');

        /*Check if Collection Exists*/
        const collections = await db.listCollections({'name': 'items'}).toArray();

        if (collections.length === 0) {
            await db.createCollection('items');
            console.log('Created "items" collection in "batiora" database');
        } 
        else {
            console.log('"items" collection already exists in "batiora" database');
        }        
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas while setting up database and collection:', error);
    }
}    

async function createVectorSearchIndex(): Promise<void> {
    try {
        console.log('Setting up vector search index');   
        const db = mongoClient.db('batiora');
        const collection = db.collection('items');
        
        /* Delete the old search index if it exists to ensure clean rebuild */
        try {
            // Atlas search indexes are removed via a database command. field should be `index` not `name`.
            await db.command({ dropSearchIndex: 'items', index: 'vector_index' });
            console.log('Dropped existing search index "vector_index"');
        } catch (e: any) {
            // error could be IndexNotFound or similar; ignore if not found
            if (e.codeName === 'IndexNotFound' || e.message?.includes('not found')) {
                console.log('No existing search index to drop');
            } else {
                console.warn('Failed to drop search index via command, trying regular index drop', e.message);
                // fallback: if driver older and doesn't support dropSearchIndex, try collection.dropIndex
                try {
                    await collection.dropIndex('vector_index');
                    console.log('Dropped existing regular index "vector_index"');
                } catch (innerErr: any) {
                    if (!innerErr.message.includes('index not found')) {
                        throw innerErr;
                    }
                    console.log('No existing regular index to drop');
                }
            }
        }
        
        // Wait a moment for index drop to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // determine current embedding dimension by generating a sample vector
        const emb = new GoogleGenerativeAIEmbeddings({
          apiKey: process.env.GOOGLE_API_KEY,
          model: embeddingModel,
        });
        const sampleVec = await emb.embedQuery("test");
        const numDimensions = sampleVec.length;
        console.log(`Detected embedding dimension: ${numDimensions}`);

        const vectorSearchIdx = {
            name: 'vector_index',
            type: "vectorSearch",
            definition: {
                "fields": [
                    {
                        "type": "vector", /* Tells MongoDB: This field contains vector (embedding) data */
                        "path": "embedding", /* The vector field name */                                            
                        "numDimensions": numDimensions, /* automatically sized from model output */
                        "similarity": "cosine" /* Cosine similarity for semantic search */
                    }
                ]
            }
        }

        console.log(`Creating vector search index on "items" collection with ${numDimensions} dimensions`);
        const result = await collection.createSearchIndex(vectorSearchIdx);
        console.log('Vector search index creation initiated:', result);
        
        // Wait for index to be ready
        console.log('Waiting for vector index to be ready...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Vector search index ready');
     } 
     
     catch (error) {
        console.error('Error creating vector search index:', error);
        throw error;
     }
}

async function generateSyntheticData(): Promise<Item[]> {
    const parser = StructuredOutputParser.fromZodSchema(z.array(itemSchema));
    const itemDescriptions = [
        "High-end leather living room sofa",
        "Solid oak dining table",
        "Bedroom dresser",
        "Ergonomic office chair",
        "Coffee table",
        "Storage bench",
        "Sectional sofa",
        "Floating shelves",
        "Bar stools",
        "Platform bed"
    ];

    const prompt = `Generate ${itemDescriptions.length} furniture items as JSON. For each item provide: item_id, item_name, item_description, brand, manufacturer_address (street, city, country, postal_code, state), prices (full_price, sale_price), categories (array), user_reviews (array with review_date, rating, comment), notes.

${parser.getFormatInstructions()}`;

    console.log('Generating synthetic data using LLM');
    const response = await llm.invoke(prompt);
    const parsedData = await parser.parse(response.content as string);
    console.log('Generated synthetic data successfully');
    return parsedData;
}

async function createItemSummary(item: Item): Promise<string> {
    const categories = item.categories.join(', ');
    return `${item.item_name} from ${item.brand}. ${item.item_description}. Categories: ${categories}. Price: $${item.prices.full_price} (sale: $${item.prices.sale_price}). Made in ${item.manufacturer_address.country}.`;
}

async function seedDatabase(): Promise<void> {
    try {
        await mongoClient.connect();
        await mongoClient.db("batiora").command({ ping: 1 });
        console.log('Connected to MongoDB Atlas successfully!');

        await setupDatabseAndCollection();
        await createVectorSearchIndex();

        const db = mongoClient.db('batiora');
        const collection = db.collection('items');

        await collection.deleteMany({});
        console.log('Cleared existing data from "items" collection');

        const syntheticData = await generateSyntheticData();
        const recordsWithSummaries = await Promise.all(
            syntheticData.map(async (record: Item) => ({
                pageContent: await createItemSummary(record),
                metadata: { ...record },
            }))
        );

        for (const record of recordsWithSummaries) {
            await MongoDBAtlasVectorSearch.fromDocuments(
                [record],
                new GoogleGenerativeAIEmbeddings({
                    apiKey: process.env.GOOGLE_API_KEY,
                    model: embeddingModel
                }),
                {
                    collection,
                    indexName: 'vector_index',
                    textKey: 'embedding_text',
                    embeddingKey: 'embedding'
                }
            );
            console.log("Successfully processed and inserted record:", record.metadata.item_id);
        }
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await mongoClient.close();
        console.log('Closed MongoDB connection');
    }
}

seedDatabase().catch(console.error);   