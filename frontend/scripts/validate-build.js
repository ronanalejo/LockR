const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "../build");

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error("ERROR: Build directory not found at:", buildDir);
  console.error('Run "npm run build:production" first.\n');
  process.exit(1);
}

let localhostFound = false;
let productionApiFound = false;
let filesChecked = 0;

// Recursively search all JS and HTML files
function checkFiles(directory) {
  const items = fs.readdirSync(directory);

  items.forEach((item) => {
    const fullPath = path.join(directory, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      checkFiles(fullPath);
    } else if (item.endsWith(".js") || item.endsWith(".html")) {
      filesChecked++;
      const content = fs.readFileSync(fullPath, "utf8");

      // Check for localhost references
      if (
        content.includes("localhost:5000") ||
        content.includes("127.0.0.1:5000")
      ) {
        console.error("CRITICAL: Found localhost reference in:", fullPath);
        localhostFound = true;
      }

      // Check for production API
      if (content.includes("api.lockr.fit")) {
        productionApiFound = true;
      }
    }
  });
}

checkFiles(buildDir);

console.log(
  "Localhost references:",
  localhostFound ? "FOUND (CRITICAL ERROR)" : "None",
);

if (localhostFound) {
  console.error("VALIDATION FAILED");
  console.error("================");
  console.error("This build contains localhost references and will cause");
  console.error('"Local Network Access" permission prompts in browsers.\n');
  console.error("SOLUTION:");
  console.error("1. Delete the build folder: rm -rf build");
  console.error("2. Rebuild: npm run build:production\n");
  process.exit(1);
}

if (!productionApiFound) {
  console.warn("WARNING: No production API references found.");
  console.warn(
    "This may indicate the build was not created with the correct environment.\n",
  );
}
