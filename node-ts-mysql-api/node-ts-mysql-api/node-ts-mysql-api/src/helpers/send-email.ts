import nodemailer from 'nodemailer';
import config from '../config/config.json';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    auth: config.email.auth,
  });

  await transporter.sendMail({
    from: config.email.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
//send-email.ts