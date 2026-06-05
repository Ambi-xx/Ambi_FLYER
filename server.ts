import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { analyzeFlyerImage, regenerateCopyFromSpecs } from "./src/services/geminiService";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Let's configure larger limit for flyer upload
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route - Analyze Property Flyer (Image/PDF base64)
  app.post("/api/analyze-flyer", async (req, res) => {
    try {
      const { flyerImg, customPrompt, userApiKey } = req.body;
      if (!flyerImg) {
        return res.status(400).json({ error: "元図面（マイソク）の画像データが必要です。" });
      }

      console.log("Analyzing flyer image with Gemini...");
      const result = await analyzeFlyerImage(flyerImg, customPrompt, userApiKey);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/analyze-flyer:", error);
      res.status(500).json({ error: error.message || "画像の解析、またはAI生成に失敗しました。" });
    }
  });

  // API Route - Regenerate copy from revised specs
  app.post("/api/regenerate-copy", async (req, res) => {
    try {
      const { specs, customPrompt, userApiKey } = req.body;
      if (!specs) {
        return res.status(400).json({ error: "物件スペックデータが不足しています。" });
      }

      console.log("Regenerating copy from updated specs with Gemini...");
      const result = await regenerateCopyFromSpecs(specs, customPrompt, userApiKey);
      res.json(result);
    } catch (error: any) {
      console.error("Error in /api/regenerate-copy:", error);
      res.status(500).json({ error: error.message || "募集文の再生成に失敗しました。" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode. Mounting Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode. Serving static assets from dist/...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
