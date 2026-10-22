import { BaseEmailTemplate } from './base.template';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export class PasswordRecoveredTemplate extends BaseEmailTemplate {
  subject = 'A senha da tua conta foi redefinida';

  render(data: { userName: string; recoveredAt: string }): string {
    return this.renderLayout({
      content: `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #18181b;">Olá, ${escapeHtml(data.userName || 'Utilizador')}</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">A senha da tua conta foi redefinida com sucesso. Já podes voltar a aceder à tua conta com a nova senha.</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">Operação realizada em ${escapeHtml(data.recoveredAt)}.</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #52525b;">Se não reconheces esta operação, contacta a equipa de suporte. Nunca envies a tua senha por email.</p>
      `,
    });
  }
}
