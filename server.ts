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

// Izipay Credentials
const getIzipayCreds = () => ({
  shopId: process.env.IZIPAY_SHOP_ID,
  password: process.env.IZIPAY_TEST_PASSWORD
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("Starting server with Shop ID:", process.env.IZIPAY_SHOP_ID ? "PRESENT" : "MISSING");
  console.log("Izipay Password:", process.env.IZIPAY_TEST_PASSWORD ? "PRESENT" : "MISSING");

  app.use(express.json());

  // Log middleware for all API requests
  app.use("/api/*", (req, res, next) => {
    console.log(`[API REQUEST] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Create Izipay Form Token (Adapted for iframe manual)
  app.post("/api/create-payment-token", async (req, res) => {
    try {
      const { amount, currency, orderId, customer, userId } = req.body;
      const email = customer?.email || req.body.email;

      if (!email) {
        return res.status(400).json({ error: "Email es requerido" });
      }

      const { shopId, password } = getIzipayCreds();
      const publicKey = process.env.VITE_IZIPAY_PUBLIC_KEY;

      if (!shopId || !password || !publicKey) {
        console.error("Missing Izipay credentials in environment variables");
        return res.status(500).json({ error: "Configuración de pasarela incompleta (shopId, password o publicKey)" });
      }

      // Create a Subscription/Payment Token
      const auth = Buffer.from(`${shopId}:${password}`).toString('base64');
      
      const payload = {
        amount: amount || 700, 
        currency: currency || "PEN",
        orderId: orderId || `SUB-${Date.now()}`,
        subscription: {
          subscriptionId: `REF-${userId || Date.now()}-${Date.now()}`,
          amount: amount || 700,
          currency: currency || "PEN",
          effectDate: new Date().toISOString(),
          recurrenceRule: "RRULE:FREQ=MONTHLY;INTERVAL=1"
        },
        customer: {
          email: email,
          reference: userId || "anonymous",
          billingDetails: customer?.billingDetails || {}
        }
      };

      console.log("Creating Izipay payment with payload:", JSON.stringify(payload, null, 2));

      const response = await axios.post(
        "https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment",
        payload,
        {
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.status === "SUCCESS") {
        res.json({ 
          formToken: response.data.answer.formToken,
          publicKey: publicKey
        });
      } else {
        console.error("Izipay Error:", response.data);
        res.status(502).json({ error: "Error de Izipay", detail: response.data });
      }
    } catch (error: any) {
      console.error("Server Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Error al crear token de pago", detail: error.response?.data });
    }
  });

  // API Route: Verify Payment
  app.post("/api/validate-payment", async (req, res) => {
    try {
      // In a real app, verify the HMAC signature here
      // For now, we'll assume success if the client says so (not secure for prod!)
      const { hash, answer, userId } = req.body;
      
      console.log("Payment received for user:", userId);
      
      // Update user subscription status in Firebase
      if (userId) {
        await db.collection("users").doc(userId).set({
          isSubscribed: true,
          subscriptionDate: admin.firestore.FieldValue.serverTimestamp(),
          plan: "mensual"
        }, { merge: true });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error validando pago:", error);
      res.status(500).json({ error: "Error interno" });
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
