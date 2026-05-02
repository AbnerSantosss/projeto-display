import nodemailer from 'nodemailer';
import { settingsService } from './settings.service';

// URL base do aplicativo — configurável via variável de ambiente
const APP_URL = process.env.APP_URL || 'https://display.proxserverabner.site';
const LOGIN_URL = `${APP_URL}/#/login`;

/**
 * Cria um transporter do nodemailer usando credenciais do banco de dados.
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

// ==============================================================================
// BASE LAYOUT — Wrapper compartilhado para todos os templates
// ==============================================================================
function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OfficeCom Display</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0e1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:20px;border:1px solid #1e293b;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
          
          <!-- Header com Logo -->
          <tr>
            <td style="padding:40px 40px 24px;text-align:center;background:linear-gradient(180deg,#111827 0%,#0f172a 100%);">
              <!-- Logo Icon -->
              <div style="width:72px;height:72px;margin:0 auto 20px;background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:16px;border:1px solid #334155;display:inline-block;line-height:72px;box-shadow:0 0 30px rgba(34,211,238,0.2);">
                <img src="https://certeirofc.com.br/wp-content/uploads/2026/02/Gemini_Generated_Image_opexl8opexl8opex_upscayl_10x_upscayl-lite-4x_1-removebg-preview.png" alt="Logo" width="48" height="48" style="vertical-align:middle;" />
              </div>
              <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
                <span style="color:#e2e8f0;">Officecom</span><span style="color:#22d3ee;">Display</span>
              </h1>
              <p style="margin:8px 0 0;color:#64748b;font-size:13px;font-weight:500;">
                Gerenciamento inteligente de mídia digital corporativa
              </p>
            </td>
          </tr>

          <!-- Divider gradient -->
          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,#22d3ee,#6366f1,transparent);"></td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0;color:#334155;font-size:11px;line-height:1.6;">
                Este é um e-mail automático do <strong>OfficeCom Display</strong>.<br>
                Se você não reconhece esta ação, ignore este e-mail com segurança.
              </p>
            </td>
          </tr>

        </table>

        <!-- Sub-footer -->
        <p style="margin:20px 0 0;color:#1e293b;font-size:10px;text-align:center;font-family:monospace;">
          &copy; ${new Date().getFullYear()} OfficeCom Display System
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ==============================================================================
// BOTÃO COMPARTILHADO
// ==============================================================================
function emailButton(label: string, url: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr>
        <td align="center">
          <a href="${url}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 4px 20px rgba(34,211,238,0.3);">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// ==============================================================================
// TEMPLATE: CONVITE DE NOVO USUÁRIO
// ==============================================================================
function getInviteTemplate(email: string, password: string): string {
  const content = `
    <h2 style="margin:0 0 8px;color:#e2e8f0;font-size:20px;font-weight:700;">
      🎉 Bem-vindo ao OfficeCom Display!
    </h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.7;">
      Um administrador criou uma conta para você. Use as credenciais abaixo para fazer seu primeiro acesso:
    </p>

    <!-- Credentials Card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#020617;border-radius:12px;border:1px solid #1e293b;overflow:hidden;margin-bottom:20px;">
      <tr>
        <td style="padding:18px 24px;border-bottom:1px solid #1e293b;">
          <p style="margin:0 0 4px;color:#64748b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            E-mail de Acesso
          </p>
          <p style="margin:0;color:#22d3ee;font-size:16px;font-weight:700;font-family:'Courier New',monospace;">
            ${email}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px 24px;">
          <p style="margin:0 0 4px;color:#64748b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">
            Senha Inicial
          </p>
          <p style="margin:0;color:#a78bfa;font-size:16px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:2px;">
            ${password}
          </p>
        </td>
      </tr>
    </table>

    <!-- Security Warning -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.15);border-radius:10px;margin-bottom:4px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:#fbbf24;font-size:12px;font-weight:600;line-height:1.5;">
            ⚠️ Recomendamos que você altere sua senha após o primeiro acesso.
          </p>
        </td>
      </tr>
    </table>

    ${emailButton('Acessar Painel →', LOGIN_URL)}
  `;
  return emailLayout(content);
}

// ==============================================================================
// TEMPLATE: REDEFINIÇÃO DE SENHA
// ==============================================================================
function getResetPasswordTemplate(resetUrl: string): string {
  const content = `
    <h2 style="margin:0 0 8px;color:#e2e8f0;font-size:20px;font-weight:700;">
      🔐 Redefinição de Senha
    </h2>
    <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.7;">
      Recebemos uma solicitação para redefinir sua senha no OfficeCom Display. 
      Clique no botão abaixo para criar uma nova senha:
    </p>

    <!-- Info Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:10px;margin-bottom:4px;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:#818cf8;font-size:12px;font-weight:600;line-height:1.5;">
            ⏰ Este link expira em <strong>1 hora</strong>. Se você não solicitou essa redefinição, ignore este e-mail.
          </p>
        </td>
      </tr>
    </table>

    ${emailButton('Redefinir Minha Senha', resetUrl)}

    <p style="margin:24px 0 0;color:#475569;font-size:11px;line-height:1.6;text-align:center;">
      Se o botão não funcionar, copie e cole este link no navegador:<br>
      <a href="${resetUrl}" style="color:#22d3ee;word-break:break-all;font-size:10px;">${resetUrl}</a>
    </p>
  `;
  return emailLayout(content);
}

// ==============================================================================
// ENVIO DE E-MAILS
// ==============================================================================

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
 * Envia o e-mail de redefinição de senha.
 */
export async function sendResetPasswordEmail(to: string, token: string): Promise<void> {
  const transporter = await createTransporter();
  if (!transporter) {
    throw new Error('Provedor de e-mail não configurado. Configure nas Configurações do sistema.');
  }

  const smtp = await settingsService.getSmtpConfig();
  const resetUrl = `${APP_URL}/#/reset-password?token=${token}`;
  const html = getResetPasswordTemplate(resetUrl);

  await transporter.sendMail({
    from: `"OfficeCom Display" <${smtp!.user}>`,
    to,
    subject: '🔐 Redefinição de Senha — OfficeCom Display',
    html,
  });
}
