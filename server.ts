import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
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
      env: process.env.NODE_ENV,
      mp_configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN 
    });
  });

  // API Route: Webhook de Mercado Pago
  app.post("/api/webhook", async (req, res) => {
    console.log("WEBHOOK RECIBIDO:", JSON.stringify({ query: req.query, body: req.body }));
    
    const dataId = req.body?.data?.id || req.query?.["data.id"] || req.query?.id || req.body?.id;
    const type = req.body?.type || req.query?.type || req.query?.topic || req.body?.topic;

    if (!dataId) {
      console.log("No ID encontrado en el webhook");
      return res.status(200).send("OK - No Data");
    }

    try {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) throw new Error("Token de Mercado Pago no configurado");

      const client = new MercadoPagoConfig({ accessToken });
      const payment = new Payment(client);

      const paymentData = await payment.get({ id: dataId });
      console.log(`Estado del pago ${dataId}: ${paymentData.status}`);

      if (paymentData.status === "approved") {
        // Obtenemos el userId mandado en metadata
        const userId = paymentData.metadata?.firebase_uid || 
                       paymentData.metadata?.user_id || 
                       paymentData.metadata?.userId;
        
        console.log(`Webhook detectó userId: ${userId}`);

        if (userId) {
          const userRef = db.collection("users").doc(userId);
          await userRef.set({
            subscriptionActive: true,
            subscriptionStatus: "active",
            lastPaymentId: String(dataId),
            lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          console.log(`Usuario ${userId} activado con éxito.`);

          // Auditoría
          await db.collection("subscriptions").doc(String(dataId)).set({
            userId,
            paymentId: String(dataId),
            amount: paymentData.transaction_amount,
            status: "approved",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          console.error("CRÍTICO: Pago aprobado pero falta userId en metadata", paymentData.metadata);
        }
      }
      res.status(200).send("OK");
    } catch (error) {
      console.error("Error en Lógica de Webhook:", error);
      // Respondemos 200 siempre para que MP deje de reintentar
      res.status(200).send("Error procesado");
    }
  });

  // API Route: Verificar pago manualmente (Fallback por si falla el webhook)
  app.get("/api/verify-payment", async (req, res) => {
    const { paymentId, userId } = req.query;
    console.log(`Verificación manual solicitada para Pago: ${paymentId}, Usuario: ${userId}`);

    if (!paymentId || !userId) {
      return res.status(400).json({ error: "Faltan parámetros paymentId o userId" });
    }

    try {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      const client = new MercadoPagoConfig({ accessToken: accessToken! });
      const payment = new Payment(client);

      const paymentData = await payment.get({ id: String(paymentId) });
      
      if (paymentData.status === "approved") {
        const userRef = db.collection("users").doc(String(userId));
        await userRef.set({
          subscriptionActive: true,
          subscriptionStatus: "active",
          lastPaymentId: String(paymentId),
          lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return res.json({ success: true, status: "approved" });
      } else {
        return res.json({ success: false, status: paymentData.status });
      }
    } catch (error) {
      console.error("Error en verificación manual:", error);
      res.status(500).json({ error: "Error al verificar el pago" });
    }
  });

  // API Route: Create Preference
  app.post("/api/create-preference", async (req, res) => {
    console.log("Creating preference for user:", req.body.userId);
    try {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(500).json({ error: "Configuración incompleta: Token de Mercado Pago no encontrado." });
      }

      const client = new MercadoPagoConfig({ accessToken });
      const preference = new Preference(client);

      // Usar el origin dinámico para el webhook si es posible
      const notificationUrl = `${req.headers.origin}/api/webhook`;
      console.log("Notification URL para Mercado Pago:", notificationUrl);

      const result = await preference.create({
        body: {
          items: [
            {
              id: 'mermelada-sub-7',
              title: 'Suscripción Mensual - La Mermelada',
              quantity: 1,
              unit_price: 7.00,
              currency_id: 'PEN'
            }
          ],
          payer: {
            email: req.body.userEmail
          },
          back_urls: {
            success: `${req.headers.origin}/thanks?status=success&userId=${req.body.userId}`,
            failure: `${req.headers.origin}/subscription?status=failure`,
            pending: `${req.headers.origin}/subscription?status=pending`
          },
          auto_return: 'approved',
          binary_mode: true,
          notification_url: notificationUrl,
          metadata: { 
            firebase_uid: req.body.userId,
            user_id: req.body.userId,
            userId: req.body.userId
          }
        }
      });

      res.json({ 
        id: result.id,
        init_point: result.init_point
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
