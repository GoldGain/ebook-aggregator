
import axios from "axios";

async function testPopular() {
  const books = ["Atomic Habits", "48 Laws of Power"];
  for (const q of books) {
    console.log(`\n--- Testing: ${q} ---`);
    try {
      const resp = await axios.get(`http://localhost:3000/api/search?q=${encodeURIComponent(q)}&limit=5`);
      const results = resp.data.books || [];
      console.log(`Found ${results.length} results.`);
      for (const b of results) {
        console.log(`Title: ${b.title}`);
        console.log(`Author: ${b.author}`);
        console.log(`MD5: ${b.md5}`);
        console.log(`Download URL: ${b.downloadUrl}`);
        console.log(`Description: ${b.description}`);
        console.log('---');
      }
    } catch (err: any) {
      console.error(`Search failed for ${q}:`, err.message);
    }
  }
}

// Start a local server to test the API
import { createServer } from "http";
import app from "./api/server";

const server = createServer(app);
server.listen(3000, async () => {
  console.log("Server running on port 3000");
  await testPopular();
  server.close();
  process.exit(0);
});
