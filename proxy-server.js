const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();
const PORT = 8000;

console.log("Starting LockR Proxy Server...\n");

// Proxy /api/* to Node.js backend
app.use(
  "/api",
  createProxyMiddleware({
    target: "http://localhost:5000",
    changeOrigin: true,
    logLevel: "info",
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        `[Proxy] ${req.method} /api${req.url} -> http://localhost:5000/api${req.url}`,
      );
    },
  }),
);

// Proxy /backend/php/* to PHP backend
app.use(
  "/backend/php",
  createProxyMiddleware({
    target: "http://localhost:80",
    changeOrigin: true,
    logLevel: "info",
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        `[Proxy] ${req.method} ${req.url} -> http://localhost:80${req.url}`,
      );
    },
  }),
);

// Serve frontend build folder
const buildPath = path.join(__dirname, "frontend/build");
console.log("Frontend build path:", buildPath);
app.use(express.static(buildPath));

// Fallback to index.html for client-side routing
app.get("*", (req, res) => {
  console.log(`[Frontend] ${req.method} ${req.url} -> index.html`);
  res.sendFile(path.join(buildPath, "index.html"));
});

app.listen(PORT, () => {
  console.log("\n========================================");
  console.log("  LockR Proxy Server Running");
  console.log("========================================");
  console.log(`Local: http://localhost:${PORT}`);
  console.log("Public: https://lockr.fit (via Cloudflare Tunnel)\n");
  console.log("Routes:");
  console.log("  / → Frontend (build folder)");
  console.log("  /api/* → Node.js backend (localhost:5000)");
  console.log("  /backend/php/* → PHP backend (localhost:80)");
  console.log("========================================\n");
});
