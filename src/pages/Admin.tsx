import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Users, CreditCard, Mail, Map, Calendar, Shield, Search, Phone, Download, Star } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const exportToExcel = () => {
    const dataToExport = users.map(user => ({
      ID: user.id,
      Nombre: user.firstName,
      Apellido: user.lastName,
      Email: user.email,
      Celular: user.phone || 'N/A',
      Edad: user.age || 'N/A',
      Sexo: user.gender || 'N/A',
      Pais: user.country || 'N/A',
      Ciudad: user.city || 'N/A',
      SuscripcionActiva: user.subscriptionActive ? 'SÍ' : 'NO',
      FechaRegistro: user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleString() : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    XLSX.writeFile(workbook, "LaMermelada_Usuarios.xlsx");
  };

  const filteredUsers = users.filter(user => 
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSubs = users.filter(u => u.subscriptionActive).length;

  if (loading) {
    return <div className="p-20 text-center font-black text-purple-600 animate-pulse text-4xl">CARGANDO DATOS...</div>;
  }

  return (
    <div className="p-6 md:p-12 bg-slate-50 min-h-[calc(100vh-80px)]">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-purple-600 mb-2 flex items-center gap-4">
              <Shield size={48} />
              PANEL ADMIN
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-purple-400 font-bold">Gestión de usuarios y suscripciones</p>
              <button 
                onClick={exportToExcel}
                className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-md active:translate-y-1 active:shadow-none"
              >
                <Download size={18} />
                Exportar Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-white border-4 border-purple-600 p-4 rounded-2xl shadow-lg">
              <div className="text-purple-400 font-black text-xs uppercase mb-1">Total Usuarios</div>
              <div className="text-3xl font-black text-purple-600 flex items-center gap-2">
                <Users size={24} /> {users.length}
              </div>
            </div>
            <div className="bg-purple-600 border-4 border-white p-4 rounded-2xl shadow-lg">
              <div className="text-purple-200 font-black text-xs uppercase mb-1">Suscripciones</div>
              <div className="text-3xl font-black text-white flex items-center gap-2">
                <CreditCard size={24} /> {activeSubs}
              </div>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-4 border-purple-100 focus:border-purple-600 outline-none font-bold placeholder:text-purple-200 transition-all shadow-md"
          />
        </div>

        {/* Users List */}
        <div className="grid gap-4">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center bg-white border-4 border-dashed border-purple-200 rounded-3xl">
              <p className="text-purple-300 font-bold text-xl italic">No se encontraron usuarios.</p>
            </div>
          ) : (
            filteredUsers.map((user, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={user.id}
                className={`bg-white rounded-2xl border-4 ${user.subscriptionActive ? 'border-green-400' : 'border-purple-100'} p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm hover:shadow-md transition`}
              >
                <div className="flex gap-4 items-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl text-white ${user.subscriptionActive ? 'bg-green-500' : 'bg-purple-400'}`}>
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-purple-900 leading-none">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-purple-400 font-bold flex items-center gap-1 mt-1 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                      <Mail size={14} /> {user.email}
                    </p>
                    <p className="text-purple-700 font-bold flex items-center gap-1 text-sm">
                      <Phone size={14} /> {user.phone || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-purple-300 uppercase">Edad/Sexo</span>
                    <span className="font-bold text-purple-700">{user.age || '--'} / {user.gender || '--'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-purple-300 uppercase">Ubicación</span>
                    <span className="font-bold text-purple-700 flex items-center gap-1">
                      <Map size={14} /> {user.city}, {user.country}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-purple-300 uppercase">Registro</span>
                    <span className="font-bold text-purple-700 flex items-center gap-1">
                      <Calendar size={14} /> {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Desconocido'}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center">
                    {user.subscriptionActive ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black border border-green-300 inline-flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> ACTIVO
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-xs font-black border border-slate-200 inline-flex items-center gap-1">
                        INACTIVO
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
