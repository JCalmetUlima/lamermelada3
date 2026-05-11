import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { CheckCircle2, PartyPopper, ArrowRight, User, AlertCircle, Clock, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Thanks() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  
  // MP appends 'status' or 'collection_status'
  const status = searchParams.get('status') || searchParams.get('collection_status');
  const userId = searchParams.get('userId');
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');

  useEffect(() => {
    const updateSubscription = async () => {
      // 'approved' is the standard MP success status
      if ((status === 'success' || status === 'approved') && userId) {
        try {
          // Update User Profile
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            subscriptionActive: true,
            lastPaymentDate: serverTimestamp(),
          });

          // Create Subscription/Payment Record
          await addDoc(collection(db, 'subscriptions'), {
            userId,
            amount: 7.00,
            status: 'approved',
            paymentId: paymentId || 'manual',
            createdAt: serverTimestamp(),
            description: 'Suscripción Mensual La Mermelada'
          });

        } catch (error) {
          console.error('Error updating status:', error);
        }
      }
      setLoading(false);
    };
    updateSubscription();
  }, [status, userId, paymentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-400 flex items-center justify-center">
        <div className="animate-pulse text-purple-600 font-black text-3xl">VERIFICANDO PAGO...</div>
      </div>
    );
  }

  const isSuccess = status === 'success' || status === 'approved';
  const isPending = status === 'pending' || status === 'in_process';
  const isFailure = status === 'failure' || status === 'rejected';

  return (
    <div className="min-h-[calc(100vh-80px)] bg-yellow-400 p-6 flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-2xl w-full bg-white rounded-[3rem] border-8 border-purple-600 shadow-[20px_20px_0_rgba(147,51,234,1)] p-12 text-center"
      >
        {isSuccess ? (
          <>
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
          </>
        ) : isPending ? (
          <>
            <div className="inline-block bg-blue-100 p-6 rounded-full mb-8 relative">
              <Clock size={64} className="text-blue-600" />
            </div>

            <h2 className="text-5xl md:text-6xl font-black text-blue-600 mb-6 leading-none italic">
              PAGO EN <br /> PROCESO
            </h2>
            
            <p className="text-2xl font-bold text-purple-900 mb-12 max-w-md mx-auto">
              Tu pago está siendo procesado por Mercado Pago. Te avisaremos cuando se confirme.
            </p>
          </>
        ) : (
          <>
            <div className="inline-block bg-red-100 p-6 rounded-full mb-8 relative">
              <XCircle size={64} className="text-red-600" />
            </div>

            <h2 className="text-5xl md:text-6xl font-black text-red-600 mb-6 leading-none italic">
              ALGO SALIÓ <br /> MAL
            </h2>
            
            <p className="text-2xl font-bold text-purple-900 mb-12 max-w-md mx-auto">
              No pudimos procesar tu pago. Por favor intenta nuevamente desde tu perfil.
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/" 
            className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black text-xl hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            VOLVER AL INICIO
          </Link>
          <Link 
            to="/account" 
            className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-2xl font-black text-xl hover:bg-yellow-300 transition border-4 border-purple-600 flex items-center justify-center gap-2"
          >
            <User size={24} />
            MI CUENTA
          </Link>
        </div>

        {isSuccess && (
          <div className="mt-12 flex items-center justify-center gap-2 text-purple-300 font-bold">
            <ArrowRight size={20} className="rotate-90" />
            Sorteo: Último día del mes
          </div>
        )}
      </motion.div>
    </div>
  );
}
