import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CreditCard, Star, ShieldCheck, Trophy, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface SubscriptionProps {
  user: User;
}

export default function Subscription({ user }: SubscriptionProps) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    };
    fetchProfile();
  }, [user.uid]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid,
          userEmail: user.email 
        }),
      });
      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (error) {
      console.error('Error creating preference:', error);
      alert('Error al conectar con la pasarela de pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-purple-50 p-6 flex items-center justify-center">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-[2rem] border-4 border-purple-600 shadow-2xl overflow-hidden">
        {/* Info Column */}
        <div className="bg-yellow-400 p-12 border-b-4 md:border-b-0 md:border-r-4 border-purple-600">
          <div className="mb-8">
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-16 h-16 bg-white rounded-2xl border-4 border-purple-600 flex items-center justify-center mb-6"
            >
              <Trophy className="text-purple-600" size={32} />
            </motion.div>
            <h2 className="text-4xl font-black text-purple-900 leading-tight mb-4">
              TU OPORTUNIDAD <br /> ESTÁ AQUÍ
            </h2>
            <p className="text-purple-800 font-bold opacity-80 decoration-white underline-offset-4 underline">
              Por solo S/ 7 mensuales participas en el sorteo de S/ 1,000 soles.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              'Sorteos en vivo mensuales',
              'Participación inmediata',
              'Cancela cuando quieras',
              'Comunidad exclusiva'
            ].map((text, i) => (
              <li key={i} className="flex items-center gap-3 font-black text-purple-700">
                <Star size={20} fill="currentColor" className="text-purple-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Checkout Column */}
        <div className="p-12 flex flex-col justify-center">
          <div className="mb-10">
            <h3 className="text-sm font-black text-purple-400 uppercase mb-2 tracking-widest">Plan Activo</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-purple-600">S/ 7</span>
              <span className="text-purple-400 font-bold font-mono">/MES</span>
            </div>
          </div>

          {userProfile?.subscriptionActive ? (
            <div className="bg-green-100 border-4 border-green-600 p-6 rounded-3xl text-center">
              <ShieldCheck size={48} className="mx-auto text-green-600 mb-4" />
              <h4 className="text-2xl font-black text-green-700 mb-1">¡ESTÁS ACTIVO!</h4>
              <p className="font-bold text-green-600 opacity-80">Ya estás participando en el próximo sorteo.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-purple-100 p-4 rounded-xl border-2 border-purple-200">
                <div className="flex gap-4">
                  <CreditCard className="text-purple-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-purple-900">Pasarela Segura</h4>
                    <p className="text-sm text-purple-700">Paga con Tarjeta o Efectivo vía Mercado Pago.</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-6 rounded-2xl font-black text-2xl hover:bg-purple-700 transition shadow-[0_10px_0_rgb(88,28,135)] active:shadow-none active:translate-y-[10px] flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                ) : (
                  <>
                    SUSCRIBIRME
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-purple-400 font-bold text-sm">
                <ShieldCheck size={16} />
                Transacción Encriptada
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
