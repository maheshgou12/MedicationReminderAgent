/* global process */
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const body = req.body || {};
  const { to, subject, html, text, secret } = body;

  const expectedSecret =
    process.env.SECRET_KEY || "medremind3r_s3cr3t_k3y_2026_change_me";
  const authHeader = req.headers.authorization || "";

  // Require matching secret
  if (
    secret !== expectedSecret &&
    authHeader !== `Bearer ${expectedSecret}`
  ) {
    return res.status(401).json({ error: "Unauthorized mail relay request." });
  }

  if (!to || !subject || (!html && !text)) {
    return res
      .status(400)
      .json({ error: "Missing required fields: to, subject, html/text" });
  }

  const user =
    process.env.SMTP_USERNAME || "maheshburra2712@gmail.com";
  const pass = (
    process.env.SMTP_PASSWORD || "kgsh sfcb irwd mxna"
  ).trim();

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 12000,
      greetingTimeout: 10000,
    });

    const info = await transporter.sendMail({
      from: `"MedAssist" <${user}>`,
      to,
      subject,
      text: text || "",
      html: html || undefined,
    });

    return res.status(200).json({
      success: true,
      delivered_to: to,
      messageId: info.messageId,
    });
  } catch (err) {
    console.error("Vercel mail relay error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
