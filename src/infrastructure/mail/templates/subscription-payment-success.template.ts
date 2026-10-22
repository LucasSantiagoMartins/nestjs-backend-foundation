import { BaseEmailTemplate } from './base.template';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export class SubscriptionPaymentSuccessTemplate extends BaseEmailTemplate {
  subject = 'A tua subscrição está ativa';

  render(data: {
    userName: string;
    planName: string;
    amount: string;
    currency: string;
    paymentReference: string;
  }): string {
    const content = `
            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #18181b;">
                Olá, ${escapeHtml(data.userName || 'Utilizador')}
            </p>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
                O pagamento do plano <strong>${escapeHtml(data.planName)}</strong> foi confirmado e a tua subscrição está ativa.
            </p>

            <table role="presentation" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 16px; margin-bottom: 20px; width: 100%;">
                <tr>
                    <td>
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #3f3f46;">
                            <strong>Montante:</strong> ${escapeHtml(data.amount)} ${escapeHtml(data.currency)}
                        </p>
                        <p style="margin: 0; font-size: 14px; color: #3f3f46;">
                            <strong>Referência do pagamento:</strong> ${escapeHtml(data.paymentReference)}
                        </p>
                    </td>
                </tr>
            </table>

            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #52525b;">
                Obrigado por subscrever. Já podes usufruir dos benefícios do teu plano.
            </p>
        `;

    return this.renderLayout({ content });
  }
}
