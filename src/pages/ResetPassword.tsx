import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Lock, ArrowRight, Info, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [validCode, setValidCode] = useState(false);

  const oobCode = searchParams.get('oobCode');
  const customToken = searchParams.get('customToken');

  useEffect(() => {
    if (!oobCode && !customToken) {
      setError('El enlace de restablecimiento no es válido o ha expirado.');
      setVerifying(false);
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        if (customToken) {
          // Verificar token personalizado en el servidor
          const response = await fetch('/api/brevo/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: customToken })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          setValidCode(true);
        } else {
          // Verificar oobCode estándar de Firebase (legacy)
          await verifyPasswordResetCode(auth, oobCode!);
          setValidCode(true);
        }
      } catch (err: any) {
        setError(err.message || 'El enlace de restablecimiento es inválido o ya ha sido utilizado.');
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    };

    verifyToken();
  }, [oobCode, customToken]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (customToken) {
        // Restablecimiento mediante el servidor (Brevo flow)
        const response = await fetch('/api/brevo/confirm-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: customToken, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
      } else {
        // Restablecimiento estándar de Firebase
        await confirmPasswordReset(auth, oobCode!, password);
      }
      
      setMessage('¡Contraseña actualizada con éxito! Ahora puedes iniciar sesión.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Hubo un problema al actualizar tu contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-yellow-50 flex items-center justify-center p-6">
        <div className="text-purple-600 font-black animate-pulse text-2xl tracking-tighter">
          VERIFICANDO CÓDIGO...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-yellow-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl border-4 border-purple-600 shadow-2xl p-8"
      >
        <h2 className="text-4xl font-black text-purple-600 mb-2 text-center uppercase tracking-tighter italic">RECUPERAR</h2>
        <p className="text-purple-800 font-bold opacity-60 text-center mb-8">Crea tu nueva contraseña</p>

        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-600 p-4 rounded-2xl mb-6 font-bold text-sm flex items-start gap-3">
            <XCircle className="shrink-0" size={20} />
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-100 border-2 border-green-500 text-green-600 p-4 rounded-2xl mb-6 font-bold text-sm flex items-start gap-3">
            <CheckCircle2 className="shrink-0" size={20} />
            {message}
          </div>
        )}

        {validCode ? (
          !message && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-black text-purple-700 mb-1 uppercase tracking-wider">NUEVA CONTRASEÑA</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 focus:ring-0 outline-none transition-all font-medium"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-purple-700 mb-1 uppercase tracking-wider">CONFIRMAR CONTRASEÑA</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 focus:ring-0 outline-none transition-all font-medium"
                    placeholder="Repite tu contraseña"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 group shadow-[0_6px_0_rgb(88,28,135)] active:shadow-none active:translate-y-[6px]"
              >
                {loading ? 'ACTUALIZANDO...' : 'GUARDAR CAMBIOS'}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )
        ) : (
          <div className="text-center py-4">
            <Link 
              to="/login"
              className="text-purple-600 font-black hover:underline flex items-center justify-center gap-2"
            >
              VOLVER AL INICIO
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
