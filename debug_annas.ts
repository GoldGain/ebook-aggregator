import axios from "axios";
import * as cheerio from "cheerio";

async function debug() {
  const query = "Siku Njema";
  const url = `https://annas-archive.gd/search?q=${encodeURIComponent(query)}`;
  console.log(`Searching: ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      },
    });
    
    const $ = cheerio.load(response.data);
    console.log(`HTML Length: ${response.data.length}`);
    
    const links = $("a[href^='/md5/']");
    console.log(`Found ${links.length} links with /md5/`);
    
    links.each((i, el) => {
      const href = $(el).attr("href");
      console.log(`${i}: ${href}`);
      const container = $(el).closest("div, li, tr");
      console.log(`   Container found: ${container.length > 0}`);
      const title = container.find("h3, h4, .text-lg, .font-bold").first().text().trim();
      console.log(`   Title: ${title}`);
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data.substring(0, 500));
    }
  }
}

debug();
