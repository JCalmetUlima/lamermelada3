import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Subscription from './pages/Subscription';
import Thanks from './pages/Thanks';
import Admin from './pages/Admin';
import Account from './pages/Account';
import Navbar from './components/Navbar';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch User Profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setIsSubscribed(!!userData?.subscriptionActive);

        // Acceso por correo específico o por colección 'admins'
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        const isBootstrapAdmin = user.email === 'jorge.calmet92@gmail.com';
        setIsAdmin(adminDoc.exists() || isBootstrapAdmin);
      } else {
        setIsAdmin(false);
        setIsSubscribed(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-400 flex items-center justify-center">
        <div className="animate-bounce text-purple-600 font-bold text-2xl">Cargando la Mermelada...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar user={user} isAdmin={isAdmin} isSubscribed={isSubscribed} />
        <Routes>
          <Route path="/" element={<Landing user={user} />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/subscription" /> : <Register />} />
          <Route path="/subscription" element={user ? <Subscription user={user} /> : <Navigate to="/login" />} />
          <Route path="/account" element={user ? <Account user={user} /> : <Navigate to="/login" />} />
          <Route path="/thanks" element={<Thanks />} />
          <Route path="/admin" element={isAdmin ? <Admin /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}
