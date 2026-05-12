import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, PartyPopper } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Thanks() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Escuchamos en tiempo real hasta que el webhook actualice al usuario
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists() && doc.data().subscriptionActive) {
        setIsReady(true);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <div className="min-h-screen bg-yellow-400 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border-8 border-purple-600 p-8 rounded-[40px] max-w-md w-full text-center shadow-[12px_12px_0_0_#581c87]"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            {isReady ? (
              <PartyPopper size={64} className="text-green-600 animate-bounce" />
            ) : (
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent"></div>
            )}
          </div>
        </div>

        <h1 className="text-4xl font-black text-purple-600 mb-4 italic">
          {isReady ? '¡BIENVENIDO AL CLUB!' : 'PROCESANDO PAGO...'}
        </h1>
        
        <p className="text-gray-600 font-bold mb-8">
          {isReady 
            ? 'Tu suscripción ya está activa. ¡Prepárate para ganar!' 
            : 'Estamos confirmando tu suscripción con Mercado Pago. No cierres esta ventana.'}
        </p>

        {isReady && (
          <Link 
            to="/"
            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-purple-700 transition flex items-center justify-center gap-3"
          >
            IR AL INICIO
            <ArrowRight />
          </Link>
        )}
      </motion.div>
    </div>
  );
}
