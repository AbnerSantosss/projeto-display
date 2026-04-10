import nodemailer from 'nodemailer';
import { settingsService } from './settings.service';

/**
 * Cria um transporter do nodemailer usando credenciais do banco de dados.
 * Retorna null se as credenciais não estiverem configuradas.
 */
async function createTransporter(): Promise<nodemailer.Transporter | null> {
  const smtp = await settingsService.getSmtpConfig();
  if (!smtp) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });
}

/**
 * Testa a conexão SMTP.
 * Retorna { ok: true } se a verificação passar, ou { ok: false, error: string } caso contrário.
 */
export async function testSmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return { ok: false, error: 'Credenciais SMTP não configuradas.' };
    }
    await transporter.verify();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha na verificação SMTP.' };
  }
}

/**
 * Envia o e-mail de convite com as credenciais de acesso.
 */
export async function sendInviteEmail(to: string, password: string): Promise<void> {
  const transporter = await createTransporter();
  if (!transporter) {
    throw new Error('Provedor de e-mail não configurado. Configure nas Configurações do sistema.');
  }

  const smtp = await settingsService.getSmtpConfig();

  const html = getInviteTemplate(to, password);

  await transporter.sendMail({
    from: `"OfficeCom Display" <${smtp!.user}>`,
    to,
    subject: '🎉 Você foi convidado para o OfficeCom Display!',
    html,
  });
}

/**
 * Template HTML premium do e-mail de convite.
 */
function getInviteTemplate(email: string, password: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite OfficeCom Display</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:16px;border:1px solid #334155;overflow:hidden;box-shadow:0 0 60px rgba(34,211,238,0.15);">
          
          <!-- Header com gradiente -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
                Officecom<span style="color:#a5f3fc;">Display</span>
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:500;">
                Plataforma de Gestão de Displays Digitais
              </p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#e2e8f0;font-size:22px;font-weight:700;">
                🎉 Você foi convidado!
              </h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
                Um administrador do OfficeCom Display criou uma conta para você. 
                Use as credenciais abaixo para acessar o painel:
              </p>

              <!-- Card de Credenciais -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#020617;border-radius:12px;border:1px solid #1e293b;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #1e293b;">
                    <p style="margin:0 0 4px;color:#64748b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
                      Login (E-mail)
                    </p>
                    <p style="margin:0;color:#22d3ee;font-size:18px;font-weight:700;font-family:'Courier New',monospace;">
                      ${email}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#64748b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
                      Senha Inicial
                    </p>
                    <p style="margin:0;color:#a78bfa;font-size:18px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:2px;">
                      ${password}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Aviso de segurança -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#fbbf24;font-size:12px;font-weight:600;line-height:1.5;">
                      ⚠️ Recomendamos que você altere sua senha após o primeiro acesso.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Botão Acessar -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="#" style="display:inline-block;background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 0 20px rgba(34,211,238,0.3);">
                      Acessar Painel →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0;color:#475569;font-size:11px;line-height:1.5;">
                Este é um e-mail automático do OfficeCom Display.<br>
                Se você não reconhece este convite, ignore este e-mail.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
