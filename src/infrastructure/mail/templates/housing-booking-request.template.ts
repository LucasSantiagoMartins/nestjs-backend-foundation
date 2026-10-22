import { BaseEmailTemplate } from './base.template';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export class HousingBookingRequestTemplate extends BaseEmailTemplate {
  subject = 'Atualização do pedido de alojamento';

  render(data: {
    userName: string;
    message: string;
    housingTitle: string;
    bookingId: number;
  }): string {
    const userName = escapeHtml(data.userName || 'Utilizador');
    const message = escapeHtml(data.message);
    const housingTitle = escapeHtml(data.housingTitle);
    return this.renderLayout({
      content: `
        <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #18181b;">Olá, ${userName}</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">${message}</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #52525b;"><strong>Alojamento:</strong> ${housingTitle}<br /><strong>Pedido:</strong> #${data.bookingId}</p>
      `,
    });
  }
}
