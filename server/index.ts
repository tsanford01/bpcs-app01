import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const requestId = Math.random().toString(36).substring(7);

  // Log request start
  console.log(`[HTTP][${requestId}] Started ${req.method} ${path}`);

  // Capture response body for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log memory usage at request start
  const startMemory = process.memoryUsage();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const endMemory = process.memoryUsage();
    const memoryDiff = {
      heapUsed: Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024),
      external: Math.round((endMemory.external - startMemory.external) / 1024),
    };

    if (path.startsWith("/api")) {
      let logLine = `[HTTP][${requestId}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // Add memory usage diff if significant
      if (Math.abs(memoryDiff.heapUsed) > 100) { // Only log if diff > 100KB
        logLine += ` (Memory Δ: ${memoryDiff.heapUsed}KB heap)`;
      }

      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = registerRoutes(app);

  // Enhanced error handling middleware with detailed logging
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const errorId = Math.random().toString(36).substring(7);
    console.error(`[Error][${errorId}] Path: ${req.path}`, {
      error: err,
      stack: err.stack,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message, errorId });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
  });
})().catch(err => {
  console.error('Server startup error:', err);
  process.exit(1);
});

// Monitor overall process health
setInterval(() => {
  const memory = process.memoryUsage();
  console.log('[Process] Health check:', {
    uptime: process.uptime(),
    memory: {
      heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memory.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
    }
  });
}, 30000);