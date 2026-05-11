import { Link, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface NavbarProps {
  user: User | null;
  isAdmin: boolean;
  isSubscribed: boolean;
}

export default function Navbar({ user, isAdmin, isSubscribed }: NavbarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="bg-yellow-400 border-b-4 border-purple-600 px-6 py-4 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="text-purple-600 font-black text-2xl tracking-tighter"
          >
            LA MERMELADA
          </motion.div>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {!isSubscribed && (
                <Link 
                  to="/subscription"
                  className="bg-purple-600 text-white px-4 py-1.5 rounded-full font-black text-xs hover:bg-purple-700 transition animate-pulse border-2 border-white shadow-md hidden sm:block"
                >
                  SUSCRÍBETE AQUÍ
                </Link>
              )}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition"
                  title="Panel Admin"
                >
                  <Shield size={20} />
                </Link>
              )}
              <Link 
                to="/account" 
                className="flex items-center gap-2 bg-purple-100 px-3 py-1.5 rounded-full border-2 border-purple-600 hover:bg-purple-200 transition"
                title="Mi Cuenta"
              >
                <UserIcon size={18} className="text-purple-600" />
                <span className="text-sm font-bold text-purple-800 hidden sm:inline">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </Link>
              <button 
                onClick={handleLogout}
                className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 text-sm bg-white/50 px-3 py-1.5 rounded-full border-2 border-transparent hover:border-purple-600 transition"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="text-purple-700 font-bold hover:underline"
              >
                Iniciar sesión
              </Link>
              <Link 
                to="/register" 
                className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold hover:bg-purple-700 shadow-md hover:shadow-lg transform transition active:scale-95"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
