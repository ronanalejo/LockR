#!/usr/bin/env node

console.log("\n===========================================");
console.log("  LockR Production Build Pre-Check");
console.log("===========================================\n");

const requiredApiUrl = "https://api.lockr.fit/api";
const apiUrl = process.env.REACT_APP_API_URL;

if (!apiUrl) {
  console.error("ERROR: REACT_APP_API_URL is not set!");
  console.error("This build will fail. Use the correct build command:\n");
  console.error("  npm run build:production\n");
  process.exit(1);
}

if (apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
  console.error("ERROR: REACT_APP_API_URL contains localhost!");
  console.error("Current value:", apiUrl);
  console.error("Expected value:", requiredApiUrl);
  console.error("\nUse the correct build command:\n");
  console.error("  npm run build:production\n");
  process.exit(1);
}

if (apiUrl !== requiredApiUrl) {
  console.warn(
    "WARNING: REACT_APP_API_URL does not match expected production URL",
  );
  console.warn("Current value:", apiUrl);
  console.warn("Expected value:", requiredApiUrl);
  console.warn("\nContinuing build, but verify this is correct...\n");
}

console.log("Pre-build checks passed");
console.log("API URL:", apiUrl);
console.log("Building for production...\n");
