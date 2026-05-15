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
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { onRequest } from "firebase-functions/v2/https";

// Izipay Credentials
const getIzipayCreds = () => ({
  shopId: process.env.IZIPAY_SHOP_ID,
  password: process.env.IZIPAY_TEST_PASSWORD,
  hmacKey: process.env.IZIPAY_HMAC_SHA256
});

const app = express();
const PORT = 3000;
const SERVER_VERSION = "2.0.0-cf-" + Date.now();

// Global request logger
app.use((req, res, next) => {
  console.log(`[V:${SERVER_VERSION}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS restringido
const allowedOrigins = [
  'https://lamermelada.pe',
  'https://www.lamermelada.pe',
  'https://lamermelada3.web.app',
  'https://lamermelada3.firebaseapp.com',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origen (como apps móviles, curl, o Izipay IPN) o que estén en la lista
    if (!origin || allowedOrigins.includes(origin) || origin.includes('run.app') || origin.includes('micuentaweb.pe')) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

const apiRouter = express.Router();

apiRouter.use((req, res, next) => {
  console.log(`[API CALL] ${req.method} ${req.path}`);
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
      return res.status(500).json({ error: "Configuración de izipay incompleta en el backend" });
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

// API Route: Verify Payment with HMAC
apiRouter.post("/validate-payment-hash", async (req, res) => {
  console.log(`[API] Validating payment hash...`);
  try {
    const { clientAnswer, hash, userId } = req.body;
    const { hmacKey } = getIzipayCreds();

    if (!hmacKey) {
      console.error("IZIPAY_HMAC_SHA256 no configurado");
      return res.status(500).json({ error: "Error de configuración del servidor" });
    }

    const answerStr = typeof clientAnswer === 'string' ? clientAnswer : JSON.stringify(clientAnswer);
    const expectedHash = crypto
      .createHmac("sha256", hmacKey)
      .update(answerStr)
      .digest("hex");

    if (hash !== expectedHash) {
      console.error("HMAC mismatch! Hash inválido");
      return res.status(401).json({ error: "Integridad de datos fallida" });
    }

    const answer = typeof clientAnswer === 'string' ? JSON.parse(clientAnswer) : clientAnswer;
    if (answer.orderStatus === "PAID" && userId) {
      await db.collection("users").doc(userId).set({
        isSubscribed: true,
        subscriptionActive: true,
        subscriptionDate: admin.firestore.FieldValue.serverTimestamp(),
        plan: "mensual"
      }, { merge: true });
      
      console.log(`[SECURE] Pago confirmado para usuario ${userId}`);
      return res.json({ success: true });
    }

    res.status(400).json({ error: "El pago no está completado satisfactoriamente" });
  } catch (error: any) {
    console.error("Error en validación:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// IPN Webhook para Izipay (Server-to-Server)
apiRouter.post("/ipn", async (req, res) => {
  console.log(`[API] Recibiendo IPN (Notificación Instantánea)...`);
  try {
    const clientAnswer = req.body['kr-answer'];
    const hash = req.body['kr-hash'];

    if (!clientAnswer || !hash) {
      return res.status(400).send("Bad request");
    }

    const { hmacKey } = getIzipayCreds();
    if (!hmacKey) {
      console.error("IZIPAY_HMAC_SHA256 no configurado");
      return res.status(500).send("Error interno");
    }

    const expectedHash = crypto
      .createHmac("sha256", hmacKey)
      .update(clientAnswer)
      .digest("hex");

    if (hash !== expectedHash) {
      console.error("IPN: HMAC mismatch! Posible intento de ataque o clave errónea.");
      return res.status(401).send("Unauthorized");
    }

    const answer = JSON.parse(clientAnswer);
    const status = answer.orderStatus; 
    const userId = answer.customer?.reference;

    if (status === "PAID" && userId && userId !== "anonymous") {
      await db.collection("users").doc(userId).set({
        isSubscribed: true,
        subscriptionActive: true,
        subscriptionDate: admin.firestore.FieldValue.serverTimestamp(),
        plan: "mensual"
      }, { merge: true });
      console.log(`[IPN] Pago validado y suscripción activada para usuario ${userId}`);
    } else {
      console.log(`[IPN] Pago ignorado o cancelado. Estado: ${status}, userId: ${userId}`);
    }

    return res.status(200).send("OK");
  } catch (error: any) {
    console.error("Error en IPN:", error.message);
    return res.status(500).send("Error");
  }
});

app.use("/api", apiRouter);

app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada", path: req.url });
});

// Local dev & vite middleware only runs if NOT deployed to Cloud Functions
async function startViteServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.FUNCTION_TARGET) {
    console.log(`Server v${SERVER_VERSION} starting local Vite server...`);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    // Modo producción local / o estático si no estamos en serverless
    if (!process.env.FUNCTION_TARGET) {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }
}

startViteServer();

// Cloud Function export
export const api = onRequest({ region: "us-central1" }, app);
