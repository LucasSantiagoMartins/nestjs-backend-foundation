import { BaseEmailTemplate } from './base.template';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export class PasswordResetTemplate extends BaseEmailTemplate {
  subject = 'Código de recuperação de senha — NestJS Backend Foundation';

  render(data: {
    userName: string;
    code: string;
    validityMinutes: number;
  }): string {
    return this.renderLayout({
      content: `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #18181b;">Olá, ${escapeHtml(data.userName || 'Utilizador')}</p>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #52525b;">Foi solicitado um código para recuperar o acesso à tua conta. Introduz este código no formulário de recuperação:</p>
        <p aria-label="Código de recuperação" style="margin: 0 0 20px 0; padding: 16px; text-align: center; border: 1px solid #e4e4e7; border-radius: 8px; background: #fafafa; font-size: 28px; letter-spacing: 8px; font-weight: 700; color: #18181b;">${escapeHtml(data.code)}</p>
        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #52525b;">Este código expira em ${data.validityMinutes} minutos. Nunca partilhes este código com terceiros.</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #52525b;">Se não solicitaste a recuperação, ignora esta mensagem. A tua senha não será alterada.</p>
      `,
    });
  }
}
