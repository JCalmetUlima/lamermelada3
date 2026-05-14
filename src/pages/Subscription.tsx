import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { CreditCard, Star, ShieldCheck, Trophy, ArrowRight, AlertCircle, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';

declare global {
  interface Window {
    KR: any;
  }
}

interface SubscriptionProps {
  user: User;
}

export default function Subscription({ user }: SubscriptionProps) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Listen for real-time updates to the user profile
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      }
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/create-payment-token', {
        email: user.email,
        userId: user.uid
      });

      const { formToken } = response.data;

      if (!formToken) {
        throw new Error('No se pudo generar el token de pago');
      }

      // Wait for the modal background to be ready or just wait a tick
      setShowPaymentForm(true);

      let attempts = 0;
      const checkKR = setInterval(() => {
        attempts++;
        if (window.KR) {
          clearInterval(checkKR);
          window.KR.setFormToken(formToken);
          
          window.KR.onSubmit((paymentData: any) => {
            console.log('Payment data submitted:', paymentData);
          });
        }
        if (attempts > 20) {
          clearInterval(checkKR);
          setError('La pasarela de pagos no se cargó correctamente. Por favor recarga la página.');
        }
      }, 500);

    } catch (err: any) {
      console.error('Error starting payment:', err);
      setError('Hubo un error al conectar con la pasarela de pagos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-purple-50 p-6 flex items-center justify-center relative overflow-hidden">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-[2rem] border-4 border-purple-600 shadow-2xl overflow-hidden relative z-10">
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

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-100 border-2 border-red-500 p-4 rounded-xl mb-6 text-red-700 font-bold flex items-center gap-3"
            >
              <AlertCircle size={20} />
              <span>{error}</span>
            </motion.div>
          )}

          {userProfile?.isSubscribed ? (
            <div className="bg-green-100 border-4 border-green-600 p-6 rounded-3xl text-center">
              <ShieldCheck size={48} className="mx-auto text-green-600 mb-4" />
              <h4 className="text-2xl font-black text-green-700 mb-1">¡ESTÁS ACTIVO!</h4>
              <p className="font-bold text-green-600 opacity-80">Ya estás participando en el próximo sorteo de S/ 1,000.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-purple-100 p-4 rounded-xl border-2 border-purple-200">
                <div className="flex gap-4">
                  <CreditCard className="text-purple-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-purple-900">Pasarela Segura</h4>
                    <p className="text-sm text-purple-700">Paga con Tarjeta vía Izipay.</p>
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

      {/* Izipay Embedded Payment Form Modal */}
      <AnimatePresence>
        {showPaymentForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-purple-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] border-4 border-purple-600 p-8 w-full max-w-md relative"
            >
              <button 
                onClick={() => setShowPaymentForm(false)}
                className="absolute right-6 top-6 text-purple-400 hover:text-purple-600 transition-colors"
              >
                <X size={32} />
              </button>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-purple-600 mb-2 uppercase">Pago Seguro</h3>
                <p className="text-purple-400 font-bold">Completa tus datos de tarjeta para suscribirte.</p>
              </div>

              {/* Izipay Element */}
              <div className="flex justify-center min-h-[400px]">
                <div 
                  className="kr-embedded" 
                  kr-form-token=""
                >
                  {/* The form elements */}
                  <div className="kr-pan"></div>
                  <div className="kr-expiry"></div>
                  <div className="kr-security-code"></div>
                  <div className="kr-card-holder-name"></div>
                  <div className="kr-email"></div>
                  
                  <button className="kr-payment-button"></button>
                  <div className="kr-form-error"></div>
                </div>
              </div>

              <div className="mt-8 flex justify-center items-center gap-4 border-t-2 border-purple-50 pt-6">
                <img src="https://micuentaweb.pe/static/img/visa-mc-amex-diners.png" alt="Tarjetas" className="h-6 opacity-60 grayscale hover:grayscale-0 transition-all" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
