import nodemailer, { type Transporter } from "nodemailer";
import type { Sender } from "../db/schema";

// One reusable SMTP connection pool per sender
const transporters = new Map<string, Transporter>();

function getTransporter(sender: Sender): Transporter {
  let transporter = transporters.get(sender.id);
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: { user: sender.smtpUser, pass: sender.smtpPass },
      pool: true,
      maxConnections: 2,
    });
    transporters.set(sender.id, transporter);
  }
  return transporter;
}

export interface SendMailInput {
  sender: Sender;
  to: string;
  subject: string;
  html: string;
  emailId: string;
}

export async function sendMail({ sender, to, subject, html, emailId }: SendMailInput) {
  const info = await getTransporter(sender).sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to,
    subject,
    html,
    headers: { "X-Email-Id": emailId }, // traceability
  });

  return {
    messageId: info.messageId as string,
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}