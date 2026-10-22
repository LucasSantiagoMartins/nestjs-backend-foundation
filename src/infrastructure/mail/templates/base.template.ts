export interface BaseEmailLayoutOptions {
  title?: string;
  content: string;
  actionUrl?: string;
  actionText?: string;
}

export abstract class BaseEmailTemplate {
  abstract subject: string;

  abstract render(data: Record<string, any>): string;

  protected primaryColor = '#6B9B73';
  protected logoUrl = `${(process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '')}/branding/logo.png`;

  protected renderLayout(options: BaseEmailLayoutOptions): string {
    const buttonHtml =
      options.actionUrl && options.actionText
        ? `
                <tr>
                    <td align="center" style="padding: 20px 0 10px 0;">
                        <a href="${options.actionUrl}" target="_blank" style="background-color: ${this.primaryColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 14px;">
                            ${options.actionText}
                        </a>
                    </td>
                </tr>
            `
        : '';

    return `
            <!DOCTYPE html>
            <html lang="pt">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                <meta name="x-apple-disable-message-reformatting" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background-color: #f3f6f3;
                        font-family: "Plus Jakarta Sans", Arial, sans-serif;
                        color: #18181b;
                        -webkit-font-smoothing: antialiased;
                    }
                    table {
                        border-spacing: 0;
                        width: 100%;
                    }
                    td {
                        padding: 0;
                    }
                    img {
                        border: 0;
                        display: block;
                    }
                    .wrapper {
                        width: 100%;
                        table-layout: fixed;
                        background-color: #f3f6f3;
                        padding: 20px 0;
                    }
                    .main {
                        width: 100%;
                        max-width: 600px;
                        background-color: #ffffff;
                        border: 1px solid #e4e4e7;
                        margin: 0 auto;
                        border-radius: 8px;
                        overflow: hidden;
                    }
                    .header {
                        padding: 24px 30px;
                        border-bottom: 1px solid #e5ece6;
                    }
                    .content {
                        padding: 40px 30px;
                    }
                    .footer {
                        padding: 30px;
                        text-align: center;
                        font-size: 12px;
                        color: #71717a;
                        background-color: #f7f9f7;
                        border-top: 1px solid #e5ece6;
                        line-height: 1.6;
                    }
                    @media only screen and (max-width: 480px) {
                        .content {
                            padding: 30px 20px !important;
                        }
                        .header {
                            padding: 20px !important;
                        }
                        .footer {
                            padding: 20px !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <table role="presentation">
                        <tr>
                            <td align="center">
                                <table role="presentation" class="main">
                                    <tr>
                                        <td class="header">
                                            <table role="presentation">
                                                <tr>
                                                    <td width="48" valign="middle">
                                                        <img src="${this.logoUrl}" alt="NestJS Backend Foundation" width="36" height="36" style="width: 36px; height: 36px; display: block;" />
                                                    </td>
                                                    <td valign="middle">
                                                        <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${this.primaryColor};">
                                                            NestJS Backend Foundation
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="content">
                                            ${options.content}
                                            ${buttonHtml}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="footer">
                                            Este é um e-mail automático do NestJS Backend Foundation.
                                            <br />
                                            Para qualquer questão, entre em contacto com a nossa equipa de suporte.
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </div>
            </body>
            </html>
        `;
  }
}
