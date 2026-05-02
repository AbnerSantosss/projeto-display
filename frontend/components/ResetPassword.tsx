
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, KeyRound, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../services/storage';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
    } else {
      setError('Link de redefinição inválido. Solicite um novo link.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
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
            Redefinição de Senha
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/50 rounded-3xl shadow-2xl p-8 transition-all duration-500">
          
          {success ? (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-emerald-400">Senha Redefinida!</h2>
              <p className="text-slate-400 text-sm text-center">
                Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Lock size={18} /> Ir para Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                  <KeyRound size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-200">Nova Senha</h2>
                  <p className="text-slate-500 text-xs">Crie uma nova senha para sua conta</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Nova Senha</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3.5 pl-12 pr-10 text-slate-200 outline-none focus:border-cyan-500 focus:bg-slate-950 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all placeholder:text-slate-600"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    minLength={6}
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

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Confirmar Nova Senha</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3.5 pl-12 text-slate-200 outline-none focus:border-cyan-500 focus:bg-slate-950 focus:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all placeholder:text-slate-600"
                    placeholder="Repita a nova senha"
                    autoComplete="new-password"
                  />
                  <Lock size={18} className="absolute left-4 top-3.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                </div>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                      password.length >= i * 3 
                        ? password.length >= 10 ? 'bg-emerald-500' : password.length >= 7 ? 'bg-amber-500' : 'bg-rose-500'
                        : 'bg-slate-800'
                    }`} />
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-bold text-center flex items-center justify-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading || !token || !password || !confirmPassword}
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <KeyRound size={20} />} 
                {loading ? 'PROCESSANDO...' : 'REDEFINIR SENHA'}
              </button>

              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="w-full text-slate-500 hover:text-cyan-400 text-xs font-medium py-2 flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft size={14} /> Voltar para o Login
              </button>
            </form>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-slate-600 text-[10px] font-mono uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Officecom Display System v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
