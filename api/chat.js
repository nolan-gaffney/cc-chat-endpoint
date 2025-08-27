// api/chat.js — City Cleats donor assistant (Vercel Node serverless)
import OpenAI from "openai";

function cors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = process.env.ALLOWED_ORIGIN || "";
  if (origin && allowed && origin === allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readRawBody(req) {
  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  try {
    cors(req, res);
    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // Parse JSON body (covers cases where req.body is undefined)
    let body = req.body;
    if (!body || typeof body === "string") {
      const raw = typeof body === "string" ? body : await readRawBody(req);
      body = raw ? JSON.parse(raw) : {};
    }

    const { userMessage, history = [] } = body || {};
    if (!userMessage) return res.status(400).json({ error: "Missing userMessage" });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const system = `
You are City Cleats' donor assistant for a Buffalo, NY 501(c)(3). Be warm, brief, and action-oriented.
- ~$66 outfits one athlete with new cleats.
- Donation link: https://citycleats.com (use "Donate Now").
- Promote: Donate Now, Sponsor a Team, Corporate Match, In-Kind Cleat Donation, Press/Media.
- Collect details when relevant (name, email, phone, school/district, budget, sizes/qty, employer).
- Tax-deductible? Yes; a receipt is emailed.
Do not invent facts. Offer a human handoff at info@citycleats.com when needed.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...history,
        { role: "user", content: userMessage }
      ],
      temperature: 0.4
    });

    const text = completion.choices?.[0]?.message?.content || "Sorry, I couldn’t generate a reply.";
    return res.status(200).json({ reply: text });
  } catch (err) {
    // Log full error to Vercel and surface message to caller for easier debugging
    console.error("Chat error:", err?.response?.data || err);
    const msg =
      (err && (err.message || err.toString?.())) ||
      (err?.response && JSON.stringify(err.response.data)) ||
      "Chat error";
    return res.status(500).json({ error: msg });
  }
}
