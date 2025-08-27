// Minimal ChatGPT proxy for City Cleats (Node 18+ / Vercel)
import OpenAI from "openai";

export default async function handler(req, res) {
  // Simple CORS
  const origin = req.headers.origin || "";
  const allowed = process.env.ALLOWED_ORIGIN || "";
  if (origin === allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userMessage, history = [] } = req.body || {};
    if (!userMessage) return res.status(400).json({ error: "Missing userMessage" });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = `
You are City Cleats' donor assistant (Buffalo, NY 501(c)(3)). Be warm, brief, and action-oriented.
- ~$66 outfits one athlete with a new pair of cleats.
- Donation link: https://citycleats.com (use "Donate Now" CTA).
- Promote: Donate Now, Sponsor a Team, Corporate Match, In-Kind Cleat Donation, Press/Media.
- Collect details when relevant (name, email, phone, school/district, budget, sizes/qty, employer).
- Tax-deductible? Yes; we email a receipt.
If outside scope, offer a human handoff at info@citycleats.com. Do not invent facts.
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
    res.status(200).json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat error" });
  }
}
