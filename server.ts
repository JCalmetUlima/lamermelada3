import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { MercadoPagoConfig, Preference } from 'mercadopago';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mercado Pago Configuration
  const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-YOUR-TOKEN-HERE' 
  });

  // API routes
  app.post("/api/create-preference", async (req, res) => {
    try {
      const { userId, userEmail } = req.body;
      
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [
            {
              id: 'mermelada-sub',
              title: 'Suscripción Mensual - La Mermelada',
              quantity: 1,
              unit_price: 7,
              currency_id: 'PEN'
            }
          ],
          payer: {
            email: userEmail
          },
          back_urls: {
            success: `${process.env.APP_URL}/thanks?status=success&userId=${userId}`,
            failure: `${process.env.APP_URL}/subscription?status=failure`,
            pending: `${process.env.APP_URL}/subscription?status=pending`
          },
          auto_return: 'approved',
          external_reference: userId,
          // Subscription logic (monthly)
          // For simplicity in this demo, it's a one-time 7 PEN payment that grants 30 days
          // Real subscriptions would use MP Plan/Subscription APIs
        }
      });

      res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create preference" });
    }
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
