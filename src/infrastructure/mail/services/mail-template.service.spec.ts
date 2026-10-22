import { EmailTemplateType } from '@backend-foundation/common/enums/email-template-type.enum';
import { MailTemplateService } from './mail-template.service';

describe('MailTemplateService password recovery templates', () => {
  const service = new MailTemplateService();

  it('renders an escaped recovery code email with the configured validity', async () => {
    const rendered = await service.render(
      EmailTemplateType.PASSWORD_RESET_CODE,
      {
        userName: '<User>',
        code: '00123456',
        validityMinutes: 10,
      },
    );

    expect(rendered.subject).toBe(
      'Código de recuperação de senha — NestJS Backend Foundation',
    );
    expect(rendered.html).toContain('00123456');
    expect(rendered.html).toContain('10 minutos');
    expect(rendered.html).toContain('&lt;User&gt;');
    expect(rendered.html).not.toContain('<User>');
  });

  it('renders an escaped password recovered confirmation email', async () => {
    const rendered = await service.render(
      EmailTemplateType.PASSWORD_RECOVERED,
      {
        userName: 'Test Person',
        recoveredAt: '2026-10-20T10:00:00.000Z',
      },
    );

    expect(rendered.subject).toContain('senha');
    expect(rendered.html).toContain('foi redefinida com sucesso');
    expect(rendered.html).toContain('2026-10-20T10:00:00.000Z');
    expect(rendered.html).toContain('Nunca envies a tua senha por email');
  });
});
