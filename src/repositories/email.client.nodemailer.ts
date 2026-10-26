// email.client.nodemailer.ts
// Implementación de EmailClient con nodemailer + Gmail (host SMTP fijo).

import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { EmailClient, EmailMessage } from '@/repositories/email.client.js';

// Gmail como host SMTP. La autenticación usa una "contraseña de aplicación"
// de Google (MAIL_USER/MAIL_PASSWORD); la contraseña normal de la cuenta no
// funciona porque Google bloquea el acceso de aplicaciones menos seguras.
function createGmailTransporter() {
  const user = process.env.MAIL_USER;
  const password = process.env.MAIL_PASSWORD;
  if (!user || !password) {
    throw new Error('MAIL_USER and MAIL_PASSWORD are not configured.');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: password },
  });
}

type GmailTransporter = ReturnType<typeof createGmailTransporter>;

@Injectable()
export class NodemailerEmailClient implements EmailClient {
  private transporter: GmailTransporter | null = null;
  private readonly from: { address: string; name: string };

  constructor() {
    // Gmail solo admite como remitente la cuenta autenticada o un alias
    // verificado, por eso MAIL_FROM por defecto es la propia cuenta.
    this.from = {
      address: process.env.MAIL_USER ?? 'no-reply@petfoodiedispenser.local',
      name: 'Pet Foodie Dispenser',
    };
  }

  async send(message: EmailMessage): Promise<void> {
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  private getTransporter(): GmailTransporter {
    if (!this.transporter) {
      this.transporter = createGmailTransporter();
    }
    return this.transporter;
  }
}
