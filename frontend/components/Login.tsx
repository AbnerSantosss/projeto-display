
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, Monitor, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { login } from '../services/storage';


const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isConfigured = true; // Backend sempre disponível
  
  const navigate = useNavigate();

  useEffect(() => {
    // Carrega credenciais salvas se existirem
    const savedUser = localStorage.getItem('officecom_saved_user');
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return;

    setLoading(true);
    setError('');
    
    try {
      const user = await login(username, password);
      if (user) {
        if (rememberMe) {
          localStorage.setItem('officecom_saved_user', username);
        } else {
          localStorage.removeItem('officecom_saved_user');
        }
        navigate('/');
      } else {
        // Isso só acontece se getCurrentUser retornar null mesmo após login bem sucedido
        setError('Login realizado, mas perfil de usuário não encontrado. Contate o suporte.');
      }
    } catch (e: any) {
      console.error(e);
      // Traduz erros comuns do Supabase para PT-BR
      let msg = e.message || 'Erro de conexão ou credenciais.';
      if (msg.includes('Invalid login credentials')) msg = 'Email ou senha incorretos.';
      if (msg.includes('Email not confirmed')) msg = 'Email não confirmado. Verifique sua caixa de entrada.';
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/50"></div>
      
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md p-8 relative z-10 flex flex-col gap-8">
        
        {/* Logo e Branding */}
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 mb-6 shadow-[0_0_40px_rgba(34,211,238,0.15)] relative group p-4">
             <div className="absolute inset-0 bg-cyan-500/10 rounded-2xl blur-xl group-hover:bg-cyan-500/20 transition-all duration-500"></div>
             <img 
               src="https://certeirofc.com.br/wp-content/uploads/2026/02/Gemini_Generated_Image_opexl8opexl8opex_upscayl_10x_upscayl-lite-4x_1-removebg-preview.png" 
               alt="Logo" 
               className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
             />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight mb-2 text-center">
            Officecom<span className="text-cyan-400">Display</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide text-center max-w-[280px]">
            Gerenciamento inteligente de mídia digital corporativa
          </p>
        </div>



        <div className={`bg-slate-900/60 backdrop-blur-2xl border border-slate-800/50 rounded-3xl shadow-2xl p-8 transition-all duration-500 hover:border-slate-700/50 hover:shadow-[0_0_60px_rgba(99,102,241,0.1)] ${!isConfigured ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">E-mail de Acesso</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3.5 pl-12 text-slate-200 outline-none focus:border-cyan-500 focus:bg-slate-950 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all placeholder:text-slate-600"
                  placeholder="Ex: seu.email@exemplo.com"
                  autoComplete="username"
                />
                <User size={18} className="absolute left-4 top-3.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Senha</label>
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3.5 pl-12 pr-10 text-slate-200 outline-none focus:border-cyan-500 focus:bg-slate-950 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all placeholder:text-slate-600"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
                <Lock size={18} className="absolute left-4 top-3.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-600 hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 bg-slate-950 group-hover:border-slate-500'}`}>
                  {rememberMe && <CheckCircle2 size={10} className="text-black stroke-[4]" />}
                </div>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="hidden"
                />
                <span className={`text-xs font-medium transition-colors ${rememberMe ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'}`}>Lembrar meu usuário</span>
              </label>
              
              <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-medium text-slate-500 hover:text-cyan-400 transition-colors">Esqueceu a senha?</button>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-bold text-center animate-in fade-in slide-in-from-top-2 flex flex-col gap-1">
                <span>{error}</span>
                {error.includes('incorretos') && (
                  <span className="text-[10px] font-normal opacity-80 block mt-1">
                    Dica: Use o <strong>E-mail</strong> completo (ex: abner@hotmail.com)
                  </span>
                )}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />} 
              {loading ? 'ENTRANDO...' : 'ACESSAR SISTEMA'}
            </button>
          </form>
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-slate-600 text-[10px] font-mono uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Officecom Display System v2.0
          </p>
          <div className="flex justify-center gap-4">
             <div className="h-1 w-1 bg-slate-800 rounded-full"></div>
             <div className="h-1 w-1 bg-slate-800 rounded-full"></div>
             <div className="h-1 w-1 bg-slate-800 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
