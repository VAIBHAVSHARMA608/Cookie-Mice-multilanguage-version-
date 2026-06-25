// index.js — CookieMice Cooking Assistant API Server
// Express + MongoDB + Gemini AI + Google Cloud Speech/TTS
// Multilingual (English + major Indian languages) cooking assistant backend.

const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SpeechClient } = require("@google-cloud/speech");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
require("dotenv").config();

const Recipe = require("./models/Recipe");

const app = express();
const port = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Language configuration — maps a friendly language name to BCP-47 locale
// codes used by Google Cloud Speech-to-Text / Text-to-Speech, plus a default
// voice. Extend this list to add more languages.
// ---------------------------------------------------------------------------
const LANGUAGES = {
  English:   { code: "en-US", voice: "en-US-Standard-C",  flag: "🇺🇸" },
  Hindi:     { code: "hi-IN", voice: "hi-IN-Standard-A",   flag: "🇮🇳" },
  Haryanvi:  { code: "hi-IN", voice: "hi-IN-Standard-A",   flag: "🇮🇳" }, // no dedicated locale; falls back to Hindi
  Punjabi:   { code: "pa-IN", voice: "pa-IN-Standard-A",   flag: "🇮🇳" },
  Marathi:   { code: "mr-IN", voice: "mr-IN-Standard-A",   flag: "🇮🇳" },
  Gujarati:  { code: "gu-IN", voice: "gu-IN-Standard-A",   flag: "🇮🇳" },
  Bengali:   { code: "bn-IN", voice: "bn-IN-Standard-A",   flag: "🇮🇳" },
  Tamil:     { code: "ta-IN", voice: "ta-IN-Standard-A",   flag: "🇮🇳" },
  Telugu:    { code: "te-IN", voice: "te-IN-Standard-A",   flag: "🇮🇳" },
  Kannada:   { code: "kn-IN", voice: "kn-IN-Standard-A",   flag: "🇮🇳" },
  Malayalam: { code: "ml-IN", voice: "ml-IN-Standard-A",   flag: "🇮🇳" },
  Urdu:      { code: "ur-IN", voice: "ur-IN-Wavenet-A",    flag: "🇵🇰" },
};

// ---------------------------------------------------------------------------
// Google Generative AI setup
// ---------------------------------------------------------------------------
let genAI = null;
const geminiApiKey = process.env.GOOGLE_API_KEY;

if (geminiApiKey) {
  try {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    console.log("✅ Gemini AI client initialized successfully.");
  } catch (err) {
    console.error("❌ Google Generative AI initialization failed:", err.message);
  }
} else {
  console.warn("⚠️  GOOGLE_API_KEY is not set. AI chat will be disabled until it is configured.");
}

// Speech clients are optional — only initialize if credentials are present,
// so the rest of the app keeps working without them.
let speechClient = null;
let ttsClient = null;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    speechClient = new SpeechClient();
    ttsClient = new TextToSpeechClient();
    console.log("✅ Google Cloud Speech & Text-to-Speech clients initialized.");
  } else {
    console.warn("⚠️  GOOGLE_APPLICATION_CREDENTIALS not found. Server-side speech features disabled (browser Web Speech API still works).");
  }
} catch (err) {
  console.warn("⚠️  Speech client initialization skipped:", err.message);
}

// ---------------------------------------------------------------------------
// MongoDB connection
// ---------------------------------------------------------------------------
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/cookiemice")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "../Frontend")));
app.use("/assets", express.static(path.join(__dirname, "../ASSETS")));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    ai: !!genAI,
    speech: !!speechClient,
    db: mongoose.connection.readyState === 1,
  });
});

// ---------------------------------------------------------------------------
// Languages metadata — drives the language switcher in the UI
// ---------------------------------------------------------------------------
app.get("/api/languages", (req, res) => {
  const list = Object.entries(LANGUAGES).map(([name, meta]) => ({ name, ...meta }));
  res.json({ languages: list });
});

// ---------------------------------------------------------------------------
// AI Chat — /api/ask
// ---------------------------------------------------------------------------
app.post("/api/ask", async (req, res) => {
  try {
    const { question, language } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "No question provided" });
    }

    const lang = LANGUAGES[language] ? language : "English";

    if (!genAI) {
      return res.json({
        answer:
          "⚠️ AI service not configured. Please set a valid GOOGLE_API_KEY environment variable on the server.",
      });
    }

    let recipesContext = "";
    if (/recipe|recipes|khana|banaye|recipe ki/i.test(question)) {
      const recipes = await Recipe.find({ language: lang }).limit(5);
      if (recipes.length > 0) {
        recipesContext = "Available recipes in this language: " + recipes.map((r) => r.title).join(", ") + ". ";
      }
    }

    const systemPrompt = `You are "Cookie", a warm and knowledgeable multilingual cooking assistant for the CookieMice app.
Respond ONLY in ${lang}${lang === "Haryanvi" ? " (a rural Haryanvi dialect of Hindi, written in Devanagari, casual and friendly tone)" : ""}.
Format your answer using markdown:
1. A short **headline (##)** summarizing the answer.
2. A **sub-headline (###)** for the main steps, if relevant.
3. Use **bullet points (*)** and **bold** for key terms/ingredients/timings.
4. End with a "💡 Things to Remember" section as a blockquote (>).
Keep the tone friendly and encouraging. ${recipesContext}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt + "\n\nUser: " + question);
    const answer = result.response.text();

    res.json({ answer, language: lang });
  } catch (err) {
    console.error("Error in /api/ask:", err);
    if (err?.errorDetails?.some((d) => d.reason === "API_KEY_INVALID")) {
      return res.status(500).json({ error: "Gemini API key is invalid. Please provide a valid key." });
    }
    if (err?.status === 404) {
      return res.status(500).json({ error: "AI model not found or unsupported. Check the model name." });
    }
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
});

// ---------------------------------------------------------------------------
// 🎤 Speech-to-text — /api/speech-to-text
// ---------------------------------------------------------------------------
app.post("/api/speech-to-text", upload.single("audio"), async (req, res) => {
  if (!speechClient) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(503).json({ error: "Server-side speech-to-text is not configured. Use the in-browser microphone instead." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No audio file provided" });
  }

  const filePath = req.file.path;
  const language = req.body.language || "English";
  const langMeta = LANGUAGES[language] || LANGUAGES.English;

  try {
    const audioBytes = fs.readFileSync(filePath).toString("base64");
    const request = {
      audio: { content: audioBytes },
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: langMeta.code,
      },
    };

    const [response] = await speechClient.recognize(request);
    const transcript =
      response.results?.[0]?.alternatives?.[0]?.transcript || "Could not understand the audio.";

    res.json({ text: transcript });
  } catch (err) {
    console.error("Error in /api/speech-to-text:", err);
    if (err.details?.includes("authentication")) {
      return res.status(500).json({ error: "Speech-to-text authentication failed. Check GOOGLE_APPLICATION_CREDENTIALS." });
    }
    res.status(500).json({ error: "Speech-to-text processing failed: " + err.message });
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

// ---------------------------------------------------------------------------
// 🔊 Text-to-speech — /api/text-to-speech
// ---------------------------------------------------------------------------
app.post("/api/text-to-speech", async (req, res) => {
  const { text, language } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  if (!ttsClient) {
    return res.status(503).json({ error: "Server-side text-to-speech is not configured. Use the in-browser speech synthesis instead." });
  }

  const langMeta = LANGUAGES[language] || LANGUAGES.English;

  try {
    const request = {
      input: { text },
      voice: { languageCode: langMeta.code, name: langMeta.voice },
      audioConfig: { audioEncoding: "MP3" },
    };
    const [response] = await ttsClient.synthesizeSpeech(request);
    res.set("Content-Type", "audio/mp3");
    res.send(response.audioContent);
  } catch (err) {
    console.error("Error in /api/text-to-speech:", err);
    if (err.details?.includes("authentication")) {
      return res.status(500).json({ error: "Text-to-speech authentication failed. Check GOOGLE_APPLICATION_CREDENTIALS." });
    }
    res.status(500).json({ error: "Text-to-speech processing failed: " + err.message });
  }
});

// ---------------------------------------------------------------------------
// 🍲 Recipe CRUD API — /api/recipes
// ---------------------------------------------------------------------------

// List + filter + search
app.get("/api/recipes", async (req, res) => {
  try {
    const { language, tag, search, limit = 50 } = req.query;
    const query = {};
    if (language) query.language = language;
    if (tag) query.tags = tag;
    if (search) query.title = { $regex: search, $options: "i" };

    const recipes = await Recipe.find(query).sort({ createdAt: -1 }).limit(Number(limit));
    res.json({ count: recipes.length, recipes });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recipes: " + err.message });
  }
});

// Get one
app.get("/api/recipes/:id", async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    res.json({ recipe });
  } catch (err) {
    res.status(400).json({ error: "Invalid recipe id" });
  }
});

// Create
app.post("/api/recipes", async (req, res) => {
  try {
    const recipe = await Recipe.create(req.body);
    res.status(201).json({ recipe });
  } catch (err) {
    res.status(400).json({ error: "Failed to create recipe: " + err.message });
  }
});

// Update
app.put("/api/recipes/:id", async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    res.json({ recipe });
  } catch (err) {
    res.status(400).json({ error: "Failed to update recipe: " + err.message });
  }
});

// Delete
app.delete("/api/recipes/:id", async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    res.json({ message: "Recipe deleted", recipe });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete recipe: " + err.message });
  }
});

// ---------------------------------------------------------------------------
// Fallback: serve the SPA shell for any unmatched non-API GET route
// ---------------------------------------------------------------------------
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/index.html"));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`🍪 CookieMice Assistant server listening at http://localhost:${port}`);
});
