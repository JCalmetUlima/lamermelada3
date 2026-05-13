import { useState, FormEvent } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Chrome, Mail, Lock, ArrowRight, Info, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ViewState = 'login' | 'forgot';

export default function Login() {
  const [view, setView] = useState<ViewState>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err) {
      setError('Error al iniciar sesión con Google.');
    }
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Credenciales incorrectas. Si te registraste con Google, intenta entrar con ese botón.');
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico para enviarte el enlace de recuperación.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      auth.languageCode = 'es'; // Forzar idioma español
      await sendPasswordResetEmail(auth, email);
      setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No existe una cuenta con este correo.');
      } else {
        setError('Error al enviar el enlace. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-yellow-50 overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'login' ? (
          <motion.div 
            key="login-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md bg-white rounded-3xl border-4 border-purple-600 shadow-2xl p-8"
          >
            <h2 className="text-4xl font-black text-purple-600 mb-2 text-center">BIENVENIDO</h2>
            <p className="text-purple-800 font-bold opacity-60 text-center mb-8">Ingresa para participar</p>

            {error && (
              <div className="bg-red-100 border-2 border-red-500 text-red-600 p-3 rounded-xl mb-6 font-bold text-sm flex items-start gap-2">
                <Info className="shrink-0 mt-0.5" size={16} />
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-100 border-2 border-green-500 text-green-600 p-3 rounded-xl mb-6 font-bold text-sm flex items-start gap-2">
                <Info className="shrink-0 mt-0.5" size={16} />
                {message}
              </div>
            )}

            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border-4 border-purple-600 py-3 rounded-2xl font-black text-purple-600 hover:bg-purple-50 transition-colors mb-6 shadow-[0_5px_0_rgb(147,51,234)] active:shadow-none active:translate-y-[5px]"
            >
              <Chrome size={20} />
              ENTRAR CON GOOGLE
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-purple-200"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-purple-400 font-bold">O con tu correo</span></div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-purple-700 mb-1">CORREO ELECTRÓNICO</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 focus:ring-0 outline-none transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-black text-purple-700">CONTRASEÑA</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setError('');
                      setMessage('');
                    }}
                    className="text-xs text-purple-600 hover:underline font-bold"
                  >
                    ¿OLVIDASTE TU CONTRASEÑA?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 focus:ring-0 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 group shadow-[0_5px_0_rgb(107,33,168)] active:shadow-none active:translate-y-[5px]"
              >
                INICIAR SESIÓN
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <p className="mt-8 text-center font-bold text-purple-400">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-purple-600 hover:underline">¡Regístrate aquí!</Link>
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="forgot-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md bg-white rounded-3xl border-4 border-purple-600 shadow-2xl p-8"
          >
            <button 
              onClick={() => {
                setView('login');
                setError('');
                setMessage('');
              }}
              className="flex items-center gap-2 text-purple-600 font-black mb-6 hover:translate-x-[-4px] transition-transform"
            >
              <ArrowLeft size={20} />
              VOLVER
            </button>

            <h2 className="text-3xl font-black text-purple-600 mb-2">¿Olvidaste tu contraseña?</h2>
            <p className="text-purple-800 font-bold opacity-60 mb-8">Ingresa tu correo y te enviaremos un enlace para recuperarla.</p>

            {error && (
              <div className="bg-red-100 border-2 border-red-500 text-red-600 p-3 rounded-xl mb-6 font-bold text-sm flex items-start gap-2">
                <Info className="shrink-0 mt-0.5" size={16} />
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-100 border-2 border-green-500 text-green-600 p-3 rounded-xl mb-6 font-bold text-sm flex items-start gap-2">
                <Info className="shrink-0 mt-0.5" size={16} />
                {message}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-black text-purple-700 mb-1">CORREO ELECTRÓNICO</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 focus:ring-0 outline-none transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 group shadow-[0_5px_0_rgb(107,33,168)] active:shadow-none active:translate-y-[5px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
