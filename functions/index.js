const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();

// Configurar CORS
app.use(cors({ origin: true }));
app.use(express.json());

// Manejar tanto /api/create-preference como /create-preference
const createPreferenceHandler = async (req, res) => {
  console.log("Creating preference for user:", req.body.userId);
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: "Token de Mercado Pago no configurado en las variables de entorno de Firebase." });
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
        payer: { email: req.body.userEmail },
        back_urls: {
          success: `${req.headers.origin}/success`,
          failure: `${req.headers.origin}/subscription`,
          pending: `${req.headers.origin}/subscription`,
        },
        auto_return: "approved",
        metadata: { userId: req.body.userId }
      },
    });

    res.json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error("MP Error:", error);
    res.status(500).json({ error: error.message });
  }
};

app.post("/api/create-preference", createPreferenceHandler);
app.post("/create-preference", createPreferenceHandler);

// Exportar la app
exports.api = functions.https.onRequest(app);
