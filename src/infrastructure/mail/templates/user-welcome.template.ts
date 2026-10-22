import { BaseEmailTemplate } from './base.template';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export class UserWelcomeTemplate extends BaseEmailTemplate {
  subject = 'Bem-vindo ao NestJS Backend Foundation';

  render(data: { userName: string }): string {
    const name = escapeHtml(data.userName || 'Utilizador');
    return this.renderLayout({
      content: `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #18181b;">Olá, ${name}</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #52525b;">A tua conta foi criada com sucesso. Estamos aqui para ajudar sempre que precisares.</p>
      `,
    });
  }
}
