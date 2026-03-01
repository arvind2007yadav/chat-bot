const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_ATLAS_URI;
const client = new MongoClient(uri, { tlsInsecure: true });
client.connect().then(() => {
    console.log('Connected!');
    client.close();
}).catch(err => console.error(err));