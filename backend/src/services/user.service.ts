import { userRepository } from '../repositories/user.repository';
import { hashPassword, comparePassword, generateToken } from './auth.service';
import { testSmtpConnection, sendInviteEmail } from './email.service';

export class UserService {
  async login(loginInput: string, password: string) {
    // Aceita login por email ou username
    let user = await userRepository.findByEmail(loginInput);
    if (!user) {
      user = await userRepository.findByUsername(loginInput);
    }
    if (!user) {
      return null;
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return null;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getAll() {
    return userRepository.findAll();
  }

  async getById(id: string) {
    return userRepository.findById(id);
  }

  /** Gera uma senha aleatória legível de 8 caracteres */
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Cria um novo usuário via convite por e-mail.
   * 1. Verifica se o SMTP está funcionando.
   * 2. Gera uma senha aleatória.
   * 3. Salva no banco com hash.
   * 4. Envia e-mail com as credenciais.
   */
  async inviteUser(email: string, role: string = 'user') {
    // 1. Validar SMTP antes de tudo
    const smtpCheck = await testSmtpConnection();
    if (!smtpCheck.ok) {
      throw new Error(
        `Provedor de e-mail não configurado ou com falha: ${smtpCheck.error || 'Verifique as Configurações.'}`
      );
    }

    // 2. Gerar senha aleatória
    const plainPassword = this.generateRandomPassword();
    const hashedPwd = await hashPassword(plainPassword);

    // 3. Extrair username do e-mail (parte antes do @)
    const username = email.split('@')[0];

    // 4. Salvar no banco
    const user = await userRepository.create({
      username,
      email,
      password: hashedPwd,
      role: role || 'user',
    });

    // 5. Enviar convite por e-mail
    await sendInviteEmail(email, plainPassword);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  /** Método legado de criação (sem e-mail) — mantido para seed/scripts */
  async create(data: { username: string; password: string; role?: string }) {
    let email = data.username;
    if (!email.includes('@')) {
      email = `${data.username}@officecom.com`;
    }

    const hashedPwd = await hashPassword(data.password);

    const user = await userRepository.create({
      username: data.username,
      email,
      password: hashedPwd,
      role: data.role || 'user',
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  async delete(id: string) {
    return userRepository.delete(id);
  }
}

export const userService = new UserService();
