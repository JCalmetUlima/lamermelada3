import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

import axios from "axios";
import cors from "cors";

// Izipay Credentials
const getIzipayCreds = () => ({
  shopId: process.env.IZIPAY_SHOP_ID,
  password: process.env.IZIPAY_TEST_PASSWORD
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  const SERVER_VERSION = "1.0.1-" + Date.now();

  // Global request logger
  app.use((req, res, next) => {
    console.log(`[V:${SERVER_VERSION}] ${req.method} ${req.url}`);
    next();
  });

  console.log(`Server v${SERVER_VERSION} starting...`);
  console.log("Izipay Password:", process.env.IZIPAY_TEST_PASSWORD ? "PRESENT" : "MISSING");

  app.use(express.json());
  app.use(cors());

  // API router
  const apiRouter = express.Router();

  // Root API logger
  apiRouter.use((req, res, next) => {
    console.log(`[API CALL v2] ${req.method} ${req.path}`);
    next();
  });

  apiRouter.get("/ping", (req, res) => res.json({ status: "all good", time: Date.now() }));

  // API Route: Create Izipay Form Token
  apiRouter.post("/create-payment-token", async (req, res) => {
    console.log(`[API] Creating token...`);
    try {
      const { amount, currency, orderId, customer, userId } = req.body;
      const email = customer?.email || req.body.email;

      if (!email) {
        return res.status(400).json({ error: "Email es requerido" });
      }

      const { shopId, password } = getIzipayCreds();
      const publicKey = process.env.VITE_IZIPAY_PUBLIC_KEY;

      if (!shopId || !password || !publicKey) {
        return res.status(500).json({ error: "Configuración incompleta" });
      }

      const auth = Buffer.from(`${shopId}:${password}`).toString('base64');
      
      const payload = {
        amount: amount || 700, 
        currency: currency || "PEN",
        orderId: orderId || `SUB-${Date.now()}`,
        subscription: {
          subscriptionId: `REF-${userId || "id"}-${Date.now()}`,
          amount: amount || 700,
          currency: currency || "PEN",
          effectDate: new Date().toISOString(),
          recurrenceRule: "RRULE:FREQ=MONTHLY;INTERVAL=1"
        },
        customer: {
          email: email,
          reference: userId || "anonymous"
        }
      };

      const resp = await axios.post(
        "https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment",
        payload,
        {
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (resp.data.status === "SUCCESS") {
        res.json({ 
          formToken: resp.data.answer.formToken,
          publicKey: publicKey
        });
      } else {
        res.status(502).json({ error: "Izipay error", detail: resp.data });
      }
    } catch (error: any) {
      console.error("API Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Verify Payment
  apiRouter.post("/validate-payment", async (req, res) => {
    try {
      const { userId } = req.body;
      if (userId) {
        await db.collection("users").doc(userId).set({
          isSubscribed: true,
          subscriptionDate: admin.firestore.FieldValue.serverTimestamp(),
          plan: "mensual"
        }, { merge: true });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error interno" });
    }
  });

  // Mount API router
  app.use("/api", apiRouter);

  // Catch-all for undefined /api routes
  app.all("/api/*", (req, res) => {
    console.log(`[API 404] ${req.method} ${req.url}`);
    res.status(404).json({ error: "Ruta no encontrada", path: req.url });
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
