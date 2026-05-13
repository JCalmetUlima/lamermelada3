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

  // API Route: Request Password Reset (Custom Flow via Brevo)
  app.post("/api/brevo/request-reset", async (req: express.Request, res: express.Response) => {
    const { email } = req.body;
    console.log(`[BREVO] Reset request for: ${email}`);
    
    if (!email) {
      return res.status(400).json({ error: "El correo electrónico es requerido." });
    }

    try {
      // 1. Verificar si el usuario existe en Firebase Auth
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          // Por seguridad, devolvemos éxito incluso si no existe, 
          // pero en este caso el usuario quiere saber si funciona.
          return res.status(404).json({ error: "No encontramos ninguna cuenta con ese correo." });
        }
        throw authError;
      }

      // 2. Generar un token único
      const resetToken = Array.from({length: 32}, () => Math.random().toString(36)[2]).join('');
      const expiresAt = Date.now() + 3600000; // 1 hora

      // 3. Guardar el token en Firestore
      await db.collection("password_resets").doc(resetToken).set({
        email: email,
        uid: userRecord.uid,
        expiresAt: expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Enviar el correo usando la API de Brevo
      const customResetLink = `https://lamermelada.pe/reset-password?customToken=${resetToken}`;
      const BREVO_API_KEY = process.env.BREVO_API_KEY;
      
      if (!BREVO_API_KEY) {
        throw new Error("Configuración de Brevo (API Key) faltante en el servidor.");
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
                
                <p style="font-size: 14px; opacity: 0.8; margin-bottom: 0;">Si tú no pediste esto, puedes borrar este correo con tranquilidad. Tu enlace expira en 1 hora.</p>
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
        throw new Error("Error de comunicación con Brevo API.");
      }

      res.json({ success: true, message: "Correo enviado correctamente." });

    } catch (error: any) {
      console.error("Error en request-reset:", error);
      res.status(500).json({ error: error.message || "Error al procesar la solicitud." });
    }
  });

  // API Route: Verify Custom Token
  app.post("/api/brevo/verify-token", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token requerido" });

    try {
      const doc = await db.collection("password_resets").doc(token).get();
      if (!doc.exists) return res.status(404).json({ error: "Token inválido" });
      
      const data = doc.data();
      if (data && data.expiresAt < Date.now()) {
        return res.status(400).json({ error: "Token expirado" });
      }

      res.json({ valid: true, email: data?.email });
    } catch (error) {
      res.status(500).json({ error: "Error verificando token" });
    }
  });

  // API Route: Confirm Password Reset
  app.post("/api/brevo/confirm-reset", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Faltan datos" });

    try {
      const docRef = db.collection("password_resets").doc(token);
      const doc = await docRef.get();
      
      if (!doc.exists) return res.status(404).json({ error: "Token inválido o expirado" });
      
      const data = doc.data();
      if (data && data.expiresAt < Date.now()) {
        await docRef.delete();
        return res.status(400).json({ error: "Token expirado" });
      }

      // 1. Cambiar la contraseña en Firebase Auth
      await admin.auth().updateUser(data!.uid, {
        password: password
      });

      // 2. Eliminar el token usado
      await docRef.delete();

      res.json({ success: true, message: "Contraseña actualizada." });
    } catch (error: any) {
      console.error("Error confirmando reset:", error);
      res.status(500).json({ error: error.message || "Error al actualizar contraseña" });
    }
  });

  // Backward compatibility alias for the old route
  app.post("/api/brevo/reset-password", (req, res) => {
    // Redirigir a la nueva lógica
    req.url = "/api/brevo/request-reset";
    app._router.handle(req, res, () => {});
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
