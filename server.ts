import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse;

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.post('/api/parse-pdf', upload.single('resumePdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const pdf = new PDFParse(new Uint8Array(req.file.buffer));
      const data = await pdf.getText();
      
      res.json({ text: data.text });
    } catch (err: any) {

      console.error('Error parsing PDF:', err);
      res.status(500).json({ error: 'Failed to parse PDF file' });
    }
  });

  app.post('/api/rewrite-bullet', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const prompt = `Rewrite the following resume achievement bullet point to be more impactful, using strong action verbs and highlighting results or metrics if implied. Return ONLY the rewritten bullet point text (no quotes, no intro, no markdown):\n\n"${text}"`;
      
      let retries = 3;
      let newText = '';
      while (retries > 0) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
          });
          newText = response.text || text;
          break;
        } catch (err: any) {
          if ((err.status === 503 || err.message?.includes('503') || err.message?.includes('UNAVAILABLE')) && retries > 1) {
            retries--;
            await new Promise(res => setTimeout(res, 1000));
            continue;
          }
          throw err;
        }
      }

      res.json({ result: newText.replace(/^["']|["']$/g, '').trim() });
    } catch (err: any) {
      console.error('Error rewriting bullet:', err);
      res.status(500).json({ error: 'Failed to rewrite bullet point' });
    }
  });

  app.post('/api/optimize-cv', async (req, res) => {
    try {
      const { jobDescription, resume, style } = req.body;
      if (!jobDescription || !resume || !style) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API key is not configured' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an expert ATS (Applicant Tracking System) CV optimizer and resume writer.
I will provide you with a Job Description and my current Resume.
Your task is to rewrite and optimize my Resume to match the Job Description perfectly, ensuring ATS keywords are strategically placed without stuffing.
You must output the new resume tailored in the "${style}" style.

Job Description:
${jobDescription}

Current Resume:
${resume}

Requirements for the style "${style}":
- If "Minimalist": Keep it concise, to the point, minimal fluff. Focus purely on data and achievements.
- If "Modern": Use a clean, narrative-driven approach with a strong professional summary and impactful bullet points.
- If "Professional": Very formal tone, traditional structure, highlighting leadership and structured responsibilities.
- If "Tech/Developer": Emphasize tech stack, tools, architectural decisions, and technical impact. Highlight skills section prominently.

For skills, assign a proficiency level from the following list: Beginner, Intermediate, Advanced, Expert, Certified.

You MUST return ONLY a JSON object representing the CV data and ATS analysis, with no markdown formatting around it, satisfying this schema:

{
  "cv": {
    "personalInfo": {
      "name": "Full Name",
      "title": "Professional Title",
      "email": "email@example.com",
      "phone": "Phone Number",
      "location": "City, Country",
      "links": ["LinkedIn", "GitHub", "Portfolio"]
    },
    "summary": "Professional summary...",
    "experience": [
      {
        "role": "Job Title",
        "company": "Company Name",
        "dates": "Start - End",
        "location": "Location",
        "achievements": ["Bullet 1", "Bullet 2"]
      }
    ],
    "skills": [
      {
        "category": "e.g., Languages, Frameworks, Core Competencies",
        "items": [
          {
            "name": "Skill 1",
            "level": "Expert"
          },
          {
            "name": "Skill 2",
            "level": "Intermediate"
          }
        ]
      }
    ],
    "education": [
      {
        "degree": "Degree Name",
        "school": "University Name",
        "dates": "Start - End",
        "details": "Optional details"
      }
    ]
  },
  "atsScore": {
    "score": 85,
    "matchedKeywords": ["React", "TypeScript", "Node.js"],
    "missingKeywords": ["Docker", "Kubernetes", "GraphQL"],
    "feedback": "Concise feedback on the match.",
    "tips": ["Actionable tip 1", "Actionable tip 2"]
  }
}`;

      let cvData;
      let retries = 3;
      let text = '';
      while (retries > 0) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            }
          });
          text = response.text;
          break;
        } catch (err: any) {
          if ((err.status === 503 || err.message?.includes('503') || err.message?.includes('UNAVAILABLE')) && retries > 1) {
            retries--;
            await new Promise(res => setTimeout(res, 2000));
            continue;
          }
          throw err;
        }
      }

      try {
        cvData = JSON.parse(text || '{}');
      } catch (e) {
        throw new Error('Failed to parse AI output as JSON');
      }
      res.json({ result: cvData });
    } catch (err: any) {
      console.error('Error optimizing CV:', err);
      res.status(500).json({ error: err.message || 'Failed to optimize CV' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express global error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
