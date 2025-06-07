// testConnection.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGODB_URI);

async function test() {
  try {
    await client.connect();
    console.log("✅ Connection test passed!");
  } catch (e) {
    console.error("❌ Connection test failed:", e);
  } finally {
    await client.close();
  }
}

test();
