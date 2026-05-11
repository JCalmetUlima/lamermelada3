import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, PartyPopper, ArrowRight, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function Thanks() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const status = searchParams.get('status');
  const userId = searchParams.get('userId');

  useEffect(() => {
    const updateSubscription = async () => {
      if (status === 'success' && userId) {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            subscriptionActive: true,
            lastPaymentDate: serverTimestamp(),
          });
        } catch (error) {
          console.error('Error updating status:', error);
        }
      }
      setLoading(false);
    };
    updateSubscription();
  }, [status, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-400 flex items-center justify-center">
        <div className="animate-pulse text-purple-600 font-black text-3xl">VERIFICANDO PAGO...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-yellow-400 p-6 flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-2xl w-full bg-white rounded-[3rem] border-8 border-purple-600 shadow-[20px_20px_0_rgba(147,51,234,1)] p-12 text-center"
      >
        <div className="inline-block bg-purple-100 p-6 rounded-full mb-8 relative">
          <PartyPopper size={64} className="text-purple-600" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity }}
            className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-full border-4 border-purple-600"
          >
            <CheckCircle2 size={24} className="text-purple-600" />
          </motion.div>
        </div>

        <h2 className="text-5xl md:text-6xl font-black text-purple-600 mb-6 leading-none italic">
          ¡GRACIAS POR <br /> SUSCRIBIRTE!
        </h2>
        
        <p className="text-2xl font-bold text-purple-900 mb-12 max-w-md mx-auto">
          Ya eres parte de La Mermelada. Prepárate para el próximo sorteo en vivo.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/" 
            className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black text-xl hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            VOLVER AL INICIO
          </Link>
          <Link 
            to="/subscription" 
            className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-2xl font-black text-xl hover:bg-yellow-300 transition border-4 border-purple-600 flex items-center justify-center gap-2"
          >
            <User size={24} />
            MI PERFIL
          </Link>
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 text-purple-300 font-bold">
          <ArrowRight size={20} className="rotate-90" />
          Sorteo: Último día del mes
        </div>
      </motion.div>
    </div>
  );
}
