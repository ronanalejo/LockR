const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();
const PORT = 8000;

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

app.use(express.static(buildPath));

// Fallback to index.html for client-side routing
app.use((req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

app.listen(PORT, () => {});
