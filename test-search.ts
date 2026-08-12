
import { runExternalSearch } from "./server/sources/external-search";
import { searchAnnasArchive } from "./api/annas-archive";

async function test() {
  const query = "Kichwamaji Kezilahabi";
  console.log(`Searching for: ${query}`);
  
  try {
    const external = await runExternalSearch(query, 10);
    console.log("External Results:", JSON.stringify(external, null, 2));
    
    const annas = await searchAnnasArchive(query, 10);
    console.log("Anna's Archive Results:", JSON.stringify(annas, null, 2));
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
