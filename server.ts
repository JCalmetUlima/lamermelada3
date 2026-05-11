import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { MercadoPagoConfig, Preference } from 'mercadopago';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check for troubleshooting
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      mp_configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN 
    });
  });

  // API Route: Create Preference
  app.post("/api/create-preference", async (req, res) => {
    console.log("Creating preference for user:", req.body.userId);
    try {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        console.error("MERCADOPAGO_ACCESS_TOKEN is missing");
        return res.status(500).json({ error: "Configuración incompleta: Token de Mercado Pago no encontrado." });
      }

      const client = new MercadoPagoConfig({ accessToken });
      const preference = new Preference(client);

      const result = await preference.create({
        body: {
          items: [
            {
              id: 'mermelada-sub-monthly',
              title: 'Suscripción Mensual La Mermelada',
              quantity: 1,
              unit_price: 7.00,
              currency_id: 'PEN'
            }
          ],
          back_urls: {
            success: `${req.headers.origin}/thanks?status=success&userId=${req.body.userId}`,
            failure: `${req.headers.origin}/subscription?status=failure`,
            pending: `${req.headers.origin}/subscription?status=pending`
          },
          auto_return: 'approved',
          binary_mode: true, // No intermediate states (only approved or rejected)
          external_reference: req.body.userId,
        }
      });

      res.json({ 
        id: result.id,
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point
      });
    } catch (error) {
      console.error("Error creating preference:", error);
      res.status(500).json({ 
        error: "No se pudo crear la preferencia de pago",
        details: error instanceof Error ? error.message : String(error)
      });
    }
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
