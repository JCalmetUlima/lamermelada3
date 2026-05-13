import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";

// Inicializar Firebase Admin de forma segura
try {
  if (!admin.apps.length) {
    admin.initializeApp();
    console.log("[SERVER] Firebase Admin inicializado.");
  }
} catch (error) {
  console.error("[SERVER] Error inicializando Firebase Admin:", error);
}
const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log middleware for ALL requests to debug routing
  app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    next();
  });

  // Health check for troubleshooting
  app.get("/api/health", (req, res) => {
    console.log("[API] Health check hit");
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      brevoKeySet: !!process.env.BREVO_API_KEY,
      firebaseAdminInitialized: admin.apps.length > 0
    });
  });

  // API Route: Send Password Reset Email via Brevo
  app.post("/api/brevo/reset-password", async (req: express.Request, res: express.Response) => {
    console.log("[API] Attempting to send reset email via Brevo for:", req.body?.email);
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "El correo electrónico es requerido." });
    }

    try {
      // 1. Generar el enlace oficial de Firebase
      // Esto verifica si el usuario existe y genera un oobCode válido
      const actionCodeSettings = {
        url: 'https://lamermelada.pe/login',
        handleCodeInApp: true,
      };
      
      const firebaseLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
      
      // 2. Extraer el oobCode para construir nuestro propio enlace limpio
      const urlObj = new URL(firebaseLink);
      const oobCode = urlObj.searchParams.get('oobCode');
      
      if (!oobCode) {
        throw new Error("No se pudo generar el código de recuperación.");
      }

      const customResetLink = `https://lamermelada.pe/reset-password?oobCode=${oobCode}`;

      // 3. Enviar el correo usando la API de Brevo
      const BREVO_API_KEY = process.env.BREVO_API_KEY;
      if (!BREVO_API_KEY) {
        throw new Error("La configuración de correo (Brevo) no está completa.");
      }

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "La Mermelada", email: "noreply@lamermelada.pe" },
          to: [{ email }],
          subject: "Restablece tu contraseña de La Mermelada",
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 4px solid #9333ea; border-radius: 24px; padding: 32px; background-color: #faf5ff;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #9333ea; font-size: 32px; font-weight: 900; margin: 0; letter-spacing: -1px;">LA MERMELADA</h1>
                <p style="color: #6b21a8; font-weight: 700; opacity: 0.6; margin: 4px 0 0 0; text-transform: uppercase; font-size: 14px;">Recuperación de Cuenta</p>
              </div>
              
              <div style="background-color: white; border: 2px solid #e9d5ff; border-radius: 16px; padding: 24px; color: #581c87;">
                <p style="margin-top: 0; font-size: 16px;">Hola,</p>
                <p style="font-size: 16px; line-height: 1.6;">Hemos recibido una solicitud para cambiar tu contraseña. ¡No te preocupes! Haz clic en el botón de abajo para crear una nueva:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${customResetLink}" style="background-color: #9333ea; color: white; padding: 18px 36px; border-radius: 16px; text-decoration: none; font-weight: 900; font-size: 18px; display: inline-block; box-shadow: 0 6px 0 #581c87;">
                    CAMBIAR CONTRASEÑA
                  </a>
                </div>
                
                <p style="font-size: 14px; opacity: 0.8; margin-bottom: 0;">Si tú no pediste esto, puedes borrar este correo con tranquilidad. Tu cuenta sigue segura.</p>
              </div>

              <div style="margin-top: 32px; text-align: center; border-top: 2px solid #e9d5ff; padding-top: 24px;">
                <p style="color: #9333ea; font-size: 12px; font-weight: 700; margin: 0;">© 2026 La Mermelada. Dulce pero con fuerza.</p>
              </div>
            </div>
          `
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Brevo API error:", errText);
        throw new Error("Error al enviar el correo a través de Brevo.");
      }

      console.log(`[API] Email de recuperación enviado a ${email}`);
      res.json({ success: true });

    } catch (error: any) {
      console.error("Error enviando reset link:", error);
      
      // Manejar errores específicos de Firebase
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ error: "No encontramos ninguna cuenta con ese correo." });
      }
      
      res.status(500).json({ error: error.message || "Error al procesar la solicitud." });
    }
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
    console.log("[SERVER] Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          usePolling: true,
          interval: 100
        }
      },
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
