import { Link } from 'react-router-dom';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { CheckCircle2, Trophy, Star, Zap, Users, ShieldCheck } from 'lucide-react';

interface LandingProps {
  user: User | null;
}

export default function Landing({ user }: LandingProps) {
  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <section className="bg-yellow-400 min-h-[85vh] flex flex-col items-center justify-center relative px-6 py-20 border-b-8 border-purple-600">
        <div className="absolute top-10 left-10 opacity-20 rotate-12">
          <Star size={100} fill="currentColor" className="text-purple-600" />
        </div>
        <div className="absolute bottom-10 right-10 opacity-20 -rotate-12">
          <Zap size={100} fill="currentColor" className="text-purple-600" />
        </div>

        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 100 }}
          className="text-center max-w-4xl"
        >
          <div className="inline-block bg-purple-600 text-yellow-400 px-6 py-2 rounded-full font-black text-xl mb-6 shadow-xl transform skew-x-3">
            ¡SORTEO MENSUAL EN VIVO!
          </div>
          
          <h1 className="text-4xl md:text-8xl font-black text-purple-600 leading-none mb-8 drop-shadow-lg italic">
            ¿QUIERES TU <br />
            <span className="text-white drop-shadow-[0_5px_0_rgba(147,51,234,1)]">MERMELADA?</span>
          </h1>

          <p className="text-lg md:text-3xl font-bold text-purple-900 mb-10 max-w-2xl mx-auto leading-tight px-4">
            Únete a la comunidad más premiada y participa por <span className="bg-white px-2 py-1 rounded">S/ 1,000 SOLES</span> cada mes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to={user ? "/subscription" : "/register"}
              className="group relative bg-purple-600 text-white text-xl md:text-2xl font-black px-8 md:px-12 py-4 md:py-6 rounded-2xl shadow-[0_10px_0_rgb(88,28,135)] hover:shadow-[0_5px_0_rgb(88,28,135)] hover:translate-y-[5px] transition-all active:shadow-none active:translate-y-[10px]"
            >
              ¡QUIERO MI SUSCRIPCIÓN!
              <div className="absolute -top-3 -right-3 bg-white text-purple-600 p-2 rounded-full border-2 border-purple-600 animate-bounce">
                <Trophy size={24} />
              </div>
            </Link>
          </div>
          
          <p className="mt-8 font-bold text-purple-800 opacity-75 text-sm md:text-base max-w-[280px] md:max-w-none mx-auto">
            Solo S/ 7 al mes • Sorteos el último día de cada mes
          </p>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-purple-600 text-center mb-16 underline decoration-yellow-400 underline-offset-8">
            ¡PARTICIPAR ES MUY FÁCIL!
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { 
                step: "01", 
                title: "Regístrate", 
                desc: "Crea tu cuenta en segundos con Google o tu correo.",
                icon: <Users className="text-purple-600" size={40} />
              },
              { 
                step: "02", 
                title: "Suscríbete", 
                desc: "Activa tu participación con solo 7 soles mensuales vía Izipay.",
                icon: <Star className="text-purple-600" size={40} />
              },
              { 
                step: "03", 
                title: "¡Participa!", 
                desc: "Mientras tu cuenta esté activa, participas todos los meses en vivo.",
                icon: <Trophy className="text-purple-600" size={40} />
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-yellow-100 p-8 rounded-3xl border-4 border-purple-600 shadow-xl relative"
              >
                <div className="absolute -top-6 -left-6 bg-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center font-black text-xl border-4 border-white">
                  {item.step}
                </div>
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-2xl font-black text-purple-600 mb-2">{item.title}</h3>
                <p className="text-purple-900 font-bold opacity-80 leading-snug">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof / FOMO */}
      <section className="bg-purple-600 py-24 text-white px-6 border-y-8 border-yellow-400">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-7xl font-black mb-8 italic leading-tight">
            ¿POR QUÉ LA MERMELADA?
          </h2>
          <div className="space-y-6 text-xl md:text-2xl font-bold">
            <div className="flex items-center gap-4 bg-purple-700/50 p-4 rounded-xl border-2 border-purple-400">
              <CheckCircle2 size={32} className="text-yellow-400 shrink-0" />
              <p>Pago 100% seguro con Izipay</p>
            </div>
            <div className="flex items-center gap-4 bg-purple-700/50 p-4 rounded-xl border-2 border-purple-400">
              <CheckCircle2 size={32} className="text-yellow-400 shrink-0" />
              <p>Sorteos mensuales en vivo para máxima transparencia</p>
            </div>
            <div className="flex items-center gap-4 bg-purple-700/50 p-4 rounded-xl border-2 border-purple-400">
              <CheckCircle2 size={32} className="text-yellow-400 shrink-0" />
              <p>Solo 7 soles para ganar 1,000 soles cada mes</p>
            </div>
          </div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="mt-16"
          >
            <Link 
              to="/register"
              className="bg-yellow-400 text-purple-900 text-xl md:text-3xl font-black px-8 md:px-12 py-4 md:py-6 rounded-3xl md:rounded-full shadow-2xl hover:bg-white transition-colors inline-block max-w-[280px] md:max-w-none"
            >
              ¡REGÍSTRATE AHORA!
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="text-2xl font-black tracking-tighter mb-2">LA MERMELADA</h3>
            <p className="opacity-50 text-sm">© 2026 Todos los derechos reservados.</p>
            <p className="font-bold text-yellow-400 mt-2">En Proceso.</p>
          </div>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-yellow-400 transition font-bold">Iniciar sesión</Link>
            <Link to="/register" className="hover:text-yellow-400 transition font-bold">Suscripción</Link>
          </div>
          <div className="flex items-center gap-2 opacity-50">
            <ShieldCheck size={16} />
            <span className="text-xs">Pago Seguro con Izipay</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
