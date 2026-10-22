import { EmailTemplateType } from '@backend-foundation/common/enums/email-template-type.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseEmailTemplate } from '../templates/base.template';
import { HousingBookingRequestTemplate } from '../templates/housing-booking-request.template';
import { PasswordRecoveredTemplate } from '../templates/password-recovered.template';
import { PasswordResetTemplate } from '../templates/password-reset.template';
import { SubscriptionPaymentFailedTemplate } from '../templates/subscription-payment-failed.template';
import { SubscriptionPaymentSuccessTemplate } from '../templates/subscription-payment-success.template';
import { UserWelcomeTemplate } from '../templates/user-welcome.template';

@Injectable()
export class MailTemplateService {
  private readonly templates: Partial<
    Record<EmailTemplateType, new () => BaseEmailTemplate>
  > = {
    [EmailTemplateType.SUBSCRIPTION_PAYMENT_FAILED]:
      SubscriptionPaymentFailedTemplate,
    [EmailTemplateType.SUBSCRIPTION_PAYMENT_SUCCEEDED]:
      SubscriptionPaymentSuccessTemplate,
    [EmailTemplateType.USER_WELCOME]: UserWelcomeTemplate,
    [EmailTemplateType.HOUSING_BOOKING_REQUEST_UPDATE]:
      HousingBookingRequestTemplate,
    [EmailTemplateType.PASSWORD_RESET_CODE]: PasswordResetTemplate,
    [EmailTemplateType.PASSWORD_RECOVERED]: PasswordRecoveredTemplate,
  };

  async render(
    template: EmailTemplateType,
    context: Record<string, any>,
  ): Promise<{
    subject: string;
    html: string;
  }> {
    const TemplateClass = this.templates[template];

    if (!TemplateClass) {
      throw new NotFoundException(
        `Template de email não suportado ou ainda não implementado: ${template}`,
      );
    }

    const templateInstance = new TemplateClass();

    const html = templateInstance.render(context);
    const subject = templateInstance.subject;

    return {
      subject,
      html,
    };
  }
}
