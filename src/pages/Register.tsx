import { useState, FormEvent } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Chrome, Mail, Lock, User, Calendar, Globe, MapPin, Smile } from 'lucide-react';
import { motion } from 'motion/react';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    gender: 'Masculino',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleRegister = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Basic profile for Google users
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone: user.phoneNumber || '',
          subscriptionActive: false,
          role: 'viewer',
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      navigate('/subscription');
    } catch (err) {
      setError('Error al registrar con Google.');
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = result.user;

      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          age: parseInt(formData.age),
          email: formData.email,
          country: formData.country,
          city: formData.city,
          gender: formData.gender,
          subscriptionActive: false,
          role: 'viewer',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      navigate('/subscription');
    } catch (err: any) {
      console.error('Registration Error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('El correo ya está registrado.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('El registro con correo/contraseña está deshabilitado en Firebase. Habilítalo en la consola de Firebase (Authentication > Sign-in method).');
      } else if (err.code === 'permission-denied' || err.message?.includes('permission-denied')) {
        setError('Error de permisos en la base de datos. Verifica tu configuración de Firestore Rules.');
      } else {
        setError(`Error: ${err.message || 'Intenta de nuevo.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-yellow-50 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-3xl border-4 border-purple-600 shadow-2xl p-8"
      >
        <h2 className="text-4xl font-black text-purple-600 mb-2 text-center">CREAR CUENTA</h2>
        <p className="text-purple-800 font-bold opacity-60 text-center mb-8">Únete a la mermelada hoy mismo</p>

        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-600 p-3 rounded-xl mb-6 font-bold text-sm">
            {error}
          </div>
        )}

        <button 
          onClick={handleGoogleRegister}
          className="w-full flex items-center justify-center gap-3 bg-white border-4 border-purple-600 py-3 rounded-2xl font-black text-purple-600 hover:bg-purple-50 transition-colors mb-8 shadow-[0_5px_0_rgb(147,51,234)] active:shadow-none active:translate-y-[5px]"
        >
          <Chrome size={20} />
          REGISTRARSE CON GOOGLE
        </button>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-purple-700 mb-1">NOMBRES</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                <input 
                  type="text" required
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none"
                  placeholder="Juan"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-black text-purple-700 mb-1">APELLIDOS</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                <input 
                  type="text" required
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none"
                  placeholder="Pérez"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-black text-purple-700 mb-1">EDAD</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                <input 
                  type="number" required
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none"
                  placeholder="25"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-black text-purple-700 mb-1">SEXO</label>
              <div className="relative">
                <Smile className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                <select 
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none bg-white appearance-none"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-purple-700 mb-1">PAÍS</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                <input 
                  type="text" required
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none"
                  placeholder="Perú"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-black text-purple-700 mb-1">CIUDAD</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
                <input 
                  type="text" required
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none"
                  placeholder="Lima"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-purple-700 mb-1">CORREO ELECTRÓNICO</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
              <input 
                type="email" required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-purple-700 mb-1">CELULAR</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
              <input 
                type="tel" required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none"
                placeholder="987654321"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-purple-700 mb-1">CONTRASEÑA (MÍN. 8 CARACTERES)</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={18} />
              <input 
                type="password" required minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-purple-700 transition shadow-[0_8px_0_rgb(88,28,135)] active:shadow-none active:translate-y-[8px] disabled:opacity-50"
          >
            {loading ? 'CREANDO CUENTA...' : 'REGISTRARME Y CONTINUAR'}
          </button>
        </form>

        <p className="mt-8 text-center font-bold text-purple-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-purple-600 hover:underline">Inicia sesión</Link>
        </p>
      </motion.div>
    </div>
  );
}
