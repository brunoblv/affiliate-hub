import nodemailer from "nodemailer";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** SMTP genérico: serve para Gmail (senha de app), Brevo, SES, Resend via SMTP etc. */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

export function getMailer(): Mailer | null {
  if (!isMailConfigured()) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
    connectionTimeout: 15_000,
    socketTimeout: 20_000,
  });

  return {
    async send(mail) {
      await transport.sendMail({ from: process.env.MAIL_FROM, ...mail });
    },
  };
}
