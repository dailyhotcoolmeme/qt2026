const fs = require("fs/promises");
const path = require("path");

async function normalizeDistAssets() {
  const assetsDir = path.resolve(__dirname, "..", "dist", "assets");
  let entries = [];

  try {
    entries = await fs.readdir(assetsDir, { withFileTypes: true });
  } catch (error) {
    console.error("[normalize-dist-assets] dist/assets not found:", assetsDir);
    process.exit(1);
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const filePath = path.join(assetsDir, entry.name);
    const tempPath = `${filePath}.tmp-normalize`;
    const data = await fs.readFile(filePath);
    await fs.writeFile(tempPath, data);
    await fs.rename(tempPath, filePath);
  }

  console.log(`[normalize-dist-assets] normalized ${entries.length} asset files`);
}

normalizeDistAssets().catch((error) => {
  console.error("[normalize-dist-assets] failed:", error);
  process.exit(1);
});
