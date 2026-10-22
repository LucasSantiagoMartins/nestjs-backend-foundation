import { EmailTemplateType } from '@backend-foundation/common/enums/email-template-type.enum';
import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { QUEUES } from '../../queue/queue.constants';
import { MailTemplateService } from '../services/mail-template.service';

@Processor(QUEUES.MAIL)
export class MailProcessor extends WorkerHost {
  private readonly resendApiKey: string;
  private readonly mailFrom: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
    private readonly mailTemplateService: MailTemplateService,
  ) {
    super();
    this.resendApiKey = this.config.getOrThrow<string>('resend.apiKey');
    this.mailFrom = this.config.getOrThrow<string>('resend.fromEmail');
  }

  async process(job: Job<any>): Promise<any> {
    const { to, template, context, subject: customSubject } = job.data;

    try {
      this.logger.info({
        msg: `Starting email processing: ${job.id}`,
        action: 'MAIL_PROCESS_START',
        service: 'MailProcessor',
        data: {
          jobId: job.id,
          type: job.name,
          to,
          template,
        },
      });

      const rendered = await this.mailTemplateService.render(template, context);
      const subject = customSubject || rendered.subject;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.mailFrom,
          to,
          subject,
          html: rendered.html,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          `Resend API error (${response.status}): ${JSON.stringify(result)}`,
        );
      }

      this.logger.info({
        msg: 'Email sent successfully',
        action: 'MAIL_SENT_SUCCESS',
        service: 'MailProcessor',
        data: {
          messageId: result.id,
          to,
        },
      });

      return result;
    } catch (error: any) {
      const isPasswordRecoveryEmail =
        template === EmailTemplateType.PASSWORD_RESET_CODE ||
        template === EmailTemplateType.PASSWORD_RECOVERED;
      this.logger.error({
        msg: 'Error processing email job',
        action: 'MAIL_PROCESS_ERROR',
        service: 'MailProcessor',
        error: isPasswordRecoveryEmail
          ? 'Falha ao processar email de recuperação de senha'
          : error?.message || error,
        data: {
          jobId: job.id,
          to,
          template,
        },
      });

      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.info({
      msg: `Job ${job.id} completed`,
      action: 'MAIL_JOB_COMPLETED',
      service: 'MailProcessor',
      data: {
        jobId: job.id,
      },
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const isPasswordRecoveryEmail =
      job.data?.template === EmailTemplateType.PASSWORD_RESET_CODE ||
      job.data?.template === EmailTemplateType.PASSWORD_RECOVERED;
    this.logger.error({
      msg: `Job ${job.id} failed after all attempts`,
      action: 'MAIL_JOB_FAILED',
      service: 'MailProcessor',
      error: isPasswordRecoveryEmail
        ? 'Falha ao processar email de recuperação de senha'
        : error.message,
      data: {
        jobId: job.id,
      },
    });
  }
}
