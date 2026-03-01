import express, {Express, Request, Response} from 'express';
import cors from 'cors';
import { MongoClient, TopologyType } from 'mongodb';
import { callAgent } from './agent'
import dns from "dns";

// Force IPv4 resolution
dns.setDefaultResultOrder("ipv4first");

// Force public DNS
dns.setServers(["8.8.8.8", "1.1.1.1"]);

/*Web app */
const app: Express = express();

/* This enables CORS (Cross-Origin Resource Sharing) using the cors package. */
app.use(cors());

//This tells Express to automatically read JSON data sent in requests.
app.use(express.json());

/****************** MONGODB CONNECTION ******************/
const MONGO_URI = process.env.MONGODB_ATLAS_URI;
if (!MONGO_URI) {
    console.error('MONGODB_ATLAS_URI environment variable is not set.');
    console.error('Set MONGODB_ATLAS_URI and restart the server.');
    process.exit(1);
}
const mongoClient = new MongoClient(MONGO_URI);

// Validate Google API key presence, since it's required for the agent to work.
if (!process.env.GOOGLE_API_KEY) {
    console.warn("WARNING: GOOGLE_API_KEY is not set. Chat agent calls will fail.");
}

async function startServer() 
{

    try {

        await mongoClient.connect();

        /* It sends a ping command to the MongoDB server to check:
           Hey database, are you alive and reachable?” */
        await mongoClient.db().command({ ping: 1 });
        console.log('Connected to MongoDB Atlas successfully!');

        /*It tells your server:
        When someone visits the homepage /, send back ‘Hello, World!’  */
        app.get('/', (req: Request, res: Response) => {
            res.send('Welcome to Batiora Chat Agent!');
        });

        
        /*  Frontend sends message
                    ↓
            Server reads req.body.message
                    ↓
            Creates threadId
                    ↓
            Calls AI agent
                    ↓
            Gets response
                    ↓
            Sends JSON reply*/
        app.post('/chat', async (req: Request, res: Response) => {
            /* Store message from front to variable */
            const initialMessage = req.body.message;
            console.log('Received message from client:', initialMessage);
            if (typeof initialMessage !== 'string' || !initialMessage.trim()) {
                res.status(400).json({ error: 'Missing or invalid `message` in request body.' });
                return;
            }
            const threadId = Date.now().toString(); // Unique thread ID based on timestamp

            try {
                /*Loads chat history for that thread --> Sends message to LangChain/LangGraph agent --> Gets AI reply --> 
                  Saves updated conversation*/
                const response = await callAgent(mongoClient, initialMessage, threadId)
                /*Sends a JSON reply back to the frontend: */
                res.json({threadId, response });
                
            } catch (error) {
                console.error('Error handling chat message:', error instanceof Error ? error.stack : error);
                const payload: any = { error: error instanceof Error ? error.message : String(error) };
                if (process.env.NODE_ENV !== 'production') payload.stack = error instanceof Error ? error.stack : undefined;
                res.status(500).json(payload);
            }
        })

           
        app.post('/chat/:threadId', async (req: Request, res: Response) => {
            // Express params can be string or string[]; make sure we have a string
            let threadId: string | undefined = req.params.threadId as unknown as string;
            if (Array.isArray(threadId)) {
                threadId = threadId[0];
            }
            if (!threadId) {
                res.status(400).json({ error: 'Thread ID is missing or invalid.' });
                return;
            }

            const userMessage = req.body.userMessage ?? req.body.message;
            console.log(`Received message for thread ${threadId}:`, userMessage);

            if (typeof userMessage !== 'string' || !userMessage.trim()) {
                res.status(400).json({ error: 'Missing or invalid `userMessage` in request body.' });
                return;
            }

            try {
                const response = await callAgent(mongoClient, userMessage, threadId);
                res.json({ response });
            } catch (error) {
                console.error(`Error handling chat message for thread ${threadId}:`, error instanceof Error ? error.stack : error);
                const payload: any = { error: error instanceof Error ? error.message : String(error) };
                if (process.env.NODE_ENV !== 'production') payload.stack = error instanceof Error ? error.stack : undefined;
                res.status(500).json(payload);
            }

        })

        /*This sets the port number.*/
        const PORT = process.env.PORT || 8000;

        /* This starts the server and tells it: --> “Wait for HTTP requests on this port.”*/
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });  
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error);        
    }
    
}

startServer();