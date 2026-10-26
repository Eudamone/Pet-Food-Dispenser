// email.client.ts
// Puerto para el envío de correos transaccionales.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailClient {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_CLIENT = Symbol('EmailClient');
