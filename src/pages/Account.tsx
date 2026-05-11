import { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { User, CreditCard, Calendar, CheckCircle2, XCircle, ArrowRight, Phone, Mail, MapPin, Smile } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface AccountProps {
  user: FirebaseUser;
}

export default function Account({ user }: AccountProps) {
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Profile
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        }

        // Fetch Payments
        const paymentsRef = collection(db, 'subscriptions');
        const q = query(
          paymentsRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const paymentsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPayments(paymentsList);
      } catch (err) {
        console.error('Error fetching account data:', err);
        handleFirestoreError(err, OperationType.LIST, 'subscriptions');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.uid]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-yellow-50 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-yellow-50 p-6 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-4 border-purple-600 p-8 shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-4">
            {profile?.subscriptionActive ? (
              <span className="bg-green-100 text-green-600 px-4 py-2 rounded-full font-black text-sm border-2 border-green-600 flex items-center gap-2">
                <CheckCircle2 size={16} /> ACTIVA
              </span>
            ) : (
              <span className="bg-red-100 text-red-600 px-4 py-2 rounded-full font-black text-sm border-2 border-red-600 flex items-center gap-2">
                <XCircle size={16} /> INACTIVA
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 bg-purple-100 rounded-full border-4 border-purple-600 flex items-center justify-center text-purple-600 overflow-hidden">
               {user.photoURL ? (
                 <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <User size={64} />
               )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-black text-purple-600 uppercase">
                {profile?.firstName} {profile?.lastName}
              </h1>
              <p className="text-purple-400 font-bold mb-4">{user.email}</p>
              
              {!profile?.subscriptionActive && (
                <Link 
                  to="/subscription"
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-xl font-black hover:bg-purple-700 transition shadow-[0_5px_0_rgb(88,28,135)] active:shadow-none active:translate-y-[5px]"
                >
                  ACTIVAR SUSCRIPCIÓN <ArrowRight size={20} />
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Details Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border-4 border-purple-600 p-8 shadow-xl"
          >
            <h3 className="text-2xl font-black text-purple-600 mb-6 flex items-center gap-2">
              <Smile className="text-yellow-400" fill="currentColor" /> DATOS PERSONALES
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="text-purple-300" size={20} />
                <div>
                  <p className="text-xs font-black text-purple-300 uppercase">Celular</p>
                  <p className="font-bold text-purple-700">{profile?.phone || 'No registrado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="text-purple-300" size={20} />
                <div>
                  <p className="text-xs font-black text-purple-300 uppercase">Ubicación</p>
                  <p className="font-bold text-purple-700">
                    {profile?.city ? `${profile.city}, ${profile.country}` : 'Desconocida'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="text-purple-300" size={20} />
                <div>
                  <p className="text-xs font-black text-purple-300 uppercase">Edad / Sexo</p>
                  <p className="font-bold text-purple-700">
                    {(profile?.age || profile?.gender) 
                      ? `${profile?.age || '?'} años / ${profile?.gender || '?'}`
                      : 'Información no disponible'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Payments History */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl border-4 border-purple-600 p-8 shadow-xl"
          >
            <h3 className="text-2xl font-black text-purple-600 mb-6 flex items-center gap-2">
              <CreditCard className="text-yellow-400" /> HISTORIAL DE PAGOS
            </h3>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <div key={payment.id} className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-100 flex justify-between items-center">
                    <div>
                      <p className="font-black text-purple-800">S/ {payment.amount?.toFixed(2) || '7.00'}</p>
                      <p className="text-xs font-bold text-purple-400">
                        {payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleDateString() : 'Fecha desconocida'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border-2 ${
                      payment.status === 'approved' 
                        ? 'bg-green-100 text-green-600 border-green-600' 
                        : 'bg-yellow-100 text-yellow-600 border-yellow-600'
                    }`}>
                      {payment.status === 'approved' ? 'EXITOSO' : payment.status?.toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-purple-300 font-bold italic">No hay pagos registrados aún.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
