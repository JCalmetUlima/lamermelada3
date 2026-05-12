import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log middleware for all API requests
  app.use("/api/*", (req, res, next) => {
    console.log(`[API REQUEST] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Health check for troubleshooting
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV
    });
  });

  // API Route: Webhook (DESACTIVADO)
  app.post("/api/webhook", async (req, res) => {
    console.log("Webhook desactivado.");
    res.status(200).send("OK");
  });

  // API Route: Verify Payment (DESACTIVADO)
  app.get("/api/verify-payment", async (req, res) => {
    res.json({ success: false, message: "Funcionalidad deshabilitada" });
  });

  // API Route: Create Preference (DESACTIVADO)
  app.post("/api/create-preference", async (req, res) => {
    res.status(503).json({ error: "Suscripciones temporalmente inhabilitadas." });
  });

  // Catch-all for undefined /api routes BEFORE static middleware
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `La ruta de API ${req.method} ${req.url} no existe.` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
