// Local-only probe: replicates the new /api/download IA-resolution flow.
import("axios").then(async ({ default: axios }) => {
  const meta = await axios.get("https://archive.org/metadata/chozi-la-heri", { timeout: 20000 });
  const files = meta.data.files || [];
  const pdf = files.find((f) => /\.pdf$/i.test(f.name || "") && f.source !== "metadata");
  console.log("pdf name:", pdf ? pdf.name : "NONE");
  if (!pdf) process.exit(1);
  const r = await axios.get(
    "https://archive.org/download/chozi-la-heri/" + encodeURIComponent(pdf.name),
    { responseType: "arraybuffer", timeout: 60000 },
  );
  const buf = Buffer.from(r.data);
  console.log("bytes:", buf.length, "| magic:", buf.slice(0, 4).toString("hex"), "| ct:", r.headers["content-type"]);
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
