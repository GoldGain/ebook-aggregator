import { runExternalSearch } from "./server/sources/external-search";

async function test() {
  console.log("Searching for Kichwamaji...");
  const results = await runExternalSearch("Kichwamaji");
  console.log("Swahili Special Results:", JSON.stringify(results.swahili_special, null, 2));
  
  if (results.swahili_special.length > 0) {
    console.log("SUCCESS: Found special sources for Kichwamaji.");
  } else {
    console.log("FAILURE: No special sources found for Kichwamaji.");
  }
}

test().catch(console.error);
