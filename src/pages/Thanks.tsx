import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, PartyPopper } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Thanks() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
  const [isReady, setIsReady] = useState(false);
  const [checking, setChecking] = useState(false);

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

  const handleManualCheck = async () => {
    if (!paymentId || !userId || checking || isReady) return;
    
    setChecking(true);
    try {
      const resp = await fetch(`/api/verify-payment?paymentId=${paymentId}&userId=${userId}`);
      const data = await resp.json();
      if (data.success) {
        setIsReady(true);
      }
    } catch (err) {
      console.error("Error checking payment:", err);
    } finally {
      setChecking(false);
    }
  };

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

        <h1 className="text-4xl font-black text-purple-600 mb-4 italic leading-tight">
          {isReady ? '¡BIENVENIDO AL CLUB!' : 'ESTAMOS CONFIRMANDO TU PAGO'}
        </h1>
        
        <p className="text-gray-600 font-bold mb-8">
          {isReady 
            ? 'Tu suscripción ya está activa. ¡Prepárate para participar en el sorteo!' 
            : 'Esto puede tardar unos segundos. Mercado Pago nos está enviando la confirmación.'}
        </p>

        {isReady ? (
          <Link 
            to="/"
            className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-purple-700 transition flex items-center justify-center gap-3 shadow-[0_6px_0_rgb(88,28,135)] active:shadow-none active:translate-y-[6px]"
          >
            IR AL INICIO
            <ArrowRight />
          </Link>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={handleManualCheck}
              disabled={checking}
              className="w-full bg-white border-4 border-purple-600 text-purple-600 py-3 rounded-xl font-black hover:bg-purple-50 transition disabled:opacity-50"
            >
              {checking ? 'VERIFICANDO...' : 'YA PAGUÉ, ACTUALIZAR ESTADO'}
            </button>
            <p className="text-xs text-purple-400 font-bold">
              Si ya realizaste el pago y no se actualiza automáticamente, haz clic en el botón de arriba.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
