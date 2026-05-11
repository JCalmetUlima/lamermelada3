import { useState, FormEvent } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Chrome, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Credenciales incorrectas. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-yellow-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl border-4 border-purple-600 shadow-2xl p-8"
      >
        <h2 className="text-4xl font-black text-purple-600 mb-2 text-center">BIENVENIDO</h2>
        <p className="text-purple-800 font-bold opacity-60 text-center mb-8">Ingresa para participar</p>

        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-600 p-3 rounded-xl mb-6 font-bold text-sm">
            {error}
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
            <label className="block text-sm font-black text-purple-700 mb-1">CONTRASEÑA</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 focus:ring-0 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 group"
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
    </div>
  );
}
