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
  const { userId, userEmail } = req.body;
  console.log("Creating preference for user:", userId);

  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN not found in env");
      return res.status(500).json({ error: "Token de Mercado Pago no configurado." });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: "mermelada-sub-7",
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
          firebase_uid: userId,
          user_id: userId,
          userId: userId
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
  console.log("WEBHOOK HIT! Query:", req.query, "Body:", req.body);
  
  // Extraer ID y Tipo
  const dataId = req.body?.data?.id || req.query?.["data.id"] || req.query?.id || req.body?.id;
  const type = req.body?.type || req.query?.type || req.query?.topic || req.body?.topic;

  if (!dataId) {
    console.log("No ID found in payload");
    return res.status(200).send("OK - No Data");
  }

  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    const paymentData = await payment.get({ id: dataId });
    console.log(`Payment Status for ${dataId}: ${paymentData.status}`);

    if (paymentData.status === "approved") {
      // Intentar obtener el userId de todas las formas
      const userId = paymentData.metadata?.firebase_uid || 
                     paymentData.metadata?.user_id || 
                     paymentData.metadata?.userId;
      
      console.log(`Webhook metadata userId found: ${userId}`);

      if (userId) {
        const userRef = db.collection("users").doc(userId);
        await userRef.set({
          subscriptionActive: true,
          subscriptionStatus: "active",
          lastPaymentId: String(dataId),
          lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`User ${userId} subscription activated successfully.`);

        // Registrar auditoría
        await db.collection("subscriptions").doc(String(dataId)).set({
          userId,
          paymentId: String(dataId),
          amount: paymentData.transaction_amount,
          status: "approved",
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        console.error("CRITICAL: payment found but no userId in metadata", paymentData.metadata);
      }
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Logic Error:", error);
    res.status(200).send("Error logged but responding 200 for MP");
  }
});

app.post("/api/create-preference", createPreferenceHandler);
app.post("/create-preference", createPreferenceHandler);

// Exportar la app con acceso al secreto
exports.api = functions.runWith({ secrets: ["MERCADOPAGO_ACCESS_TOKEN"] }).https.onRequest(app);
