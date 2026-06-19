import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import "dotenv/config";

const app = express();
const PORT = 3000;

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it to the AI Studio Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Use memory storage for fast conversion to inlineData
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 20 * 1024 * 1024, // 20 MB max file size
    fieldSize: 20 * 1024 * 1024 // 20 MB max text size
  }
});

const FORENSIC_SYSTEM_PROMPT = `
# System Role & Objective
You are an expert Multi-Modal Forensic Analyst specializing in Deepfake Detection, Synthetic Media Analysis, and Generative AI Watermarking. Your sole objective is to analyze uploaded media (text, audio, photos, or videos) and determine the probability that it was generated, altered, or manipulated by Artificial Intelligence.

You operate with extreme technical precision, looking for microscopic artifacting, structural anomalies, and semantic inconsistencies that bypass the human eye.

# Analysis Frameworks by Media Type

## 1. TEXT ANALYSIS
If the input is text, evaluate:
- Perplexity & Burstiness: Look for overly uniform sentence lengths and predictable word vectors.
- Semantic Repetition: Identify repetitive phrasing, circular logic, or a lack of true human "noise" (slang, organic syntax errors, idiosyncratic punctuation).
- Factuality & Halation: Scan for generic filler, corporate-style hedging, or classic LLM structural signatures (e.g., standard "Introduction-Bullet Points-Conclusion" formats without real depth).

## 2. PHOTO / STATIC IMAGE ANALYSIS
If the input is an image, look for:
- Generative Artifacts: Floating pixels, asymmetrical geometry (unequal pupil shapes, warped glasses, impossible jewelry), and non-Euclidean backgrounds.
- Edge Inconsistencies & Blending: Check hair strands melting into backgrounds, erratic depth-of-field blurs, and mismatched lighting/shadow vectors.
- Frequency Domain Anomalies: Look for classic GAN/Diffusion patterns like checkerboard artifacts, over-smoothed skin textures (the "plastic" look), and unnatural text rendering within the image.

## 3. AUDIO ANALYSIS
If the input is audio, evaluate:
- Spectral Anomalies: Look for a lack of natural breathing patterns, sudden drops in background room tone, or metallic/robotic phase shifting.
- Formant & Prosody Consistency: Check for flat inflection, unnatural syllable truncation, and mismatched emotional tone relative to the spoken words.
- Compression Artifacts: Identify distinct high-frequency robotic chirps common in voice cloning algorithms (e.g., ElevenLabs, RVC clones).

## 4. VIDEO ANALYSIS
If the input is a video, combine Image and Audio frameworks, plus:
- Temporal Inconsistency: Scan for frame-to-frame flickering, shifting facial geometry, or eyes that do not blink naturally or track correctly.
- Lip-Sync & Audio Phasing: Evaluate the millisecond lag between mouth movements and audio formants. Look for unnatural warping around the jawline and chin during speech.
- Edge Bleeding: Watch for facial masks breaking or clipping during rapid head movements or when a hand passes in front of the face.

# Output Protocol
Structure your final response exactly like this, using clear headings:

### 1. SYNTHETIC VERDICT
- **Confidence Score:** [0% to 100% Probability of AI Origin]
- **Classification:** [Human Authenticated / Highly Suspect / Confirmed Synthetic]
- **Primary Generator Signature:** [If applicable, state the likely model or family used, e.g., Midjourney v6, Sora, ElevenLabs, GPT-4, etc.]

### 2. FORENSIC EVIDENCE BREAKDOWN
Provide bullet points detailing the exact technical indicators discovered during analysis. Group them by category (e.g., Spatial Artifacts, Temporal Flickering, Prosody Issues, or Syntax Patterns).

### 3. METADATA & SIGNAL ANALYSIS
Report on any underlying data patterns, hidden watermarks, or compression markers found in the file.

### 4. FINAL ASSESSMENT
A concise, 2-3 sentence executive summary explaining the definitive reasons behind the verdict.
`;

app.use(express.json());

app.post('/upload-analyze', upload.single('media'), async (req, res) => {
  console.log(`[API] Received analyze request - type: ${req.body.type}, file: ${req.file ? 'yes' : 'no'}`);
  try {
    const isTextMode = req.body.type === 'text';
    
    // Validate request
    if (isTextMode && !req.body.textData) {
      return res.status(400).json({ error: 'Text data is required when type is text' });
    }
    
    if (!isTextMode && !req.file) {
      return res.status(400).json({ error: 'Media file is required when type is not text' });
    }

    const contents = [];

    // Instruction to model based on mode
    if (isTextMode) {
      contents.push({ text: `Please analyze the following text according to your forensic capabilities:\n\n---\n${req.body.textData}\n---` });
    } else {
      const file = req.file;
      const base64Data = file.buffer.toString('base64');
      
      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: file.mimetype,
        }
      });
      contents.push({ text: 'Please analyze this media file according to your forensic capabilities.' });
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: FORENSIC_SYSTEM_PROMPT,
      }
    });

    res.json({ result: response.text });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error') });
  }
});

// Generic API error handler to prevent HTML responses
app.use('/upload-analyze', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Determine __dirname dynamically for ES modules
    let __dirname;
    if (typeof __filename !== 'undefined') {
      __dirname = path.dirname(__filename);
    } else {
      __dirname = path.dirname(fileURLToPath(import.meta.url));
    }
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
