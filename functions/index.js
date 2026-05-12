const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();

const app = express();

// Configurar CORS
app.use(cors({ origin: true }));
app.use(express.json());

// Manejar creación de preferencia
const createPreferenceHandler = async (req, res) => {
  console.log("Creating preference for user:", req.body.userId);
  const { userId, userEmail } = req.body;

  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error("Token no encontrado en process.env.MERCADOPAGO_ACCESS_TOKEN");
      return res.status(500).json({ error: "Token de Mercado Pago no configurado." });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: "sub-mensual-7",
            title: "Suscripción Mensual - La Mermelada",
            quantity: 1,
            unit_price: 7,
            currency_id: "PEN",
          }
        ],
        payer: { email: userEmail },
        back_urls: {
          success: `${req.headers.origin}/thanks?userId=${userId}`,
          failure: `${req.headers.origin}/subscription`,
          pending: `${req.headers.origin}/subscription`,
        },
        auto_return: "approved",
        notification_url: "https://us-central1-gen-lang-client-0484978887.cloudfunctions.net/api/webhook",
        metadata: { 
          userId: userId,
          user_id: userId // Algunos webhooks lo esperan así
        }
      },
    });

    res.json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error("MP Create Preference Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Manejar Webhook de Mercado Pago
app.post("/webhook", async (req, res) => {
  console.log("Webhook received. Query:", req.query, "Body:", req.body);
  
  // Mercado Pago envía el ID de diferentes formas según la versión
  const dataId = req.body?.data?.id || req.query?.["data.id"] || req.query?.id;
  const type = req.body?.type || req.query?.type || req.query?.topic;

  try {
    if ((type === "payment" || type === "payment.created") && dataId) {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      const client = new MercadoPagoConfig({ accessToken });
      const payment = new Payment(client);

      const paymentData = await payment.get({ id: dataId });
      console.log("Payment status:", paymentData.status);

      if (paymentData.status === "approved") {
        // Intentar obtener el userId de todas las formas posibles que usa MP en metadata
        const userId = paymentData.metadata?.user_id || 
                       paymentData.metadata?.userId || 
                       paymentData.metadata?.user_id_str;
        
        console.log("Updating subscription for user:", userId);

        if (userId) {
          const userRef = db.collection("users").doc(userId);
          await userRef.update({
            subscriptionActive: true,
            subscriptionStatus: "active",
            lastPaymentId: String(dataId),
            lastPaymentDate: admin.firestore.FieldValue.serverTimestamp()
          });

          // Registrar el pago para auditoría
          await db.collection("subscriptions").add({
            userId,
            paymentId: String(dataId),
            amount: paymentData.transaction_amount,
            status: "approved",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error details:", error);
    // Respondemos 200 de todos modos para que MP no reintente infinitamente si es un error de código
    res.status(200).send("Error processed");
  }
});

app.post("/api/create-preference", createPreferenceHandler);
app.post("/create-preference", createPreferenceHandler);

// Exportar la app con acceso al secreto
exports.api = functions.runWith({ secrets: ["MERCADOPAGO_ACCESS_TOKEN"] }).https.onRequest(app);
