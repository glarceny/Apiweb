import React, { useState, useEffect, useRef } from 'react';
import { AppState, User, Product, Transaction, ApiResponse, ProductCatalog } from './types';
import { SIMULATION_MODE } from './constants'; 

// --- API UTILITY ---
// Logic: Gunakan deteksi hostname agar bekerja baik di Vercel maupun Localhost
const getApiUrl = () => {
  // Cek apakah kode berjalan di browser
  if (typeof window === 'undefined') return '/api';
  
  const hostname = window.location.hostname;
  
  // Jika berjalan di localhost atau 127.0.0.1, gunakan URL backend local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
     return 'http://localhost:3000/api';
  }
  
  // Untuk Vercel (production) atau akses via IP Network (misal tes di HP via WiFi 192.168.x.x), 
  // gunakan relative path '/api'. Ini akan otomatis mengikuti domain/IP dan protokol (HTTPS/HTTP).
  return '/api';
};

const API_URL = getApiUrl();

async function apiCall<T>(endpoint: string, method: string = 'GET', body?: any): Promise<ApiResponse<T>> {
    try {
        const headers: any = { 'Content-Type': 'application/json' };
        const userStr = sessionStorage.getItem('orbit_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.token) headers['Authorization'] = user.token;
        }

        const res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        
        if (!res.ok) {
            // Handle HTTP errors (404, 500, etc)
            const errorData = await res.json().catch(() => ({}));
            return { success: false, message: errorData.message || `Server Error: ${res.status}` };
        }

        const data = await res.json();
        return data; 
    } catch (e) {
        console.error("API Call Error:", e);
        return { success: false, message: "Gagal terhubung ke server. Pastikan backend berjalan." };
    }
}

// --- Helper Functions ---
const formatRes = (val: number) => (val >= 1024 ? `${val / 1024} GB` : `${val} MB`);
const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

// --- Component: Login/Register Page ---
const AuthPage: React.FC<{ onLogin: (u: User) => void }> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await apiCall<User>(endpoint, 'POST', formData);

      if (res.success && res.data) {
          if (isRegister) {
             const loginRes = await apiCall<User>('/auth/login', 'POST', { email: formData.email, password: formData.password });
             if (loginRes.success && loginRes.data) {
                 onLogin(loginRes.data);
             }
          } else {
             onLogin(res.data);
          }
      } else {
          setError(res.message || 'Authentication failed');
      }
      setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[50px] opacity-20 -mr-10 -mt-10"></div>
        <div className="text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg mx-auto mb-4">
            <i className="fas fa-bolt"></i>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Orbit<span className="text-blue-600">Cloud</span></h1>
          <p className="text-slate-500 text-sm mt-2">{isRegister ? 'Buat akun baru' : 'Masuk ke akun Anda'}</p>
        </div>
        {error && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl mb-4 font-bold text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {isRegister && (
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Nama Lengkap</label>
                <input required type="text" onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition outline-none font-bold text-slate-700" placeholder="Nama Anda" />
             </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Email Address</label>
            <input required type="email" onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition outline-none font-bold text-slate-700" placeholder="nama@email.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Password</label>
            <input required type="password" onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition outline-none font-bold text-slate-700" placeholder="••••••••" />
          </div>
          <button disabled={loading} type="submit" className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 transition active:scale-95 flex items-center justify-center gap-2 mt-4">
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <span>{isRegister ? 'Daftar' : 'Masuk'}</span>}
          </button>
        </form>
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => setIsRegister(!isRegister)} className="text-xs text-slate-400 hover:text-blue-600 transition">
             {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar disini'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Component: Sidebar ---
const Sidebar: React.FC<{ 
  user: User; 
  activeTab: AppState; 
  onNavigate: (page: AppState) => void; 
  isOpen: boolean;
  onToggle: () => void;
  setCategory?: (cat: 'linux' | 'windows' | 'nodejs') => void;
  currentCategory?: string;
  onLogout: () => void;
}> = ({ user, activeTab, onNavigate, isOpen, onToggle, setCategory, currentCategory, onLogout }) => {
  const navClass = (isActive: boolean) => 
    `nav-item w-full cursor-pointer flex items-center gap-3 px-4 py-3 mb-1 rounded-xl font-bold text-sm transition-all duration-200 border ${
      isActive 
        ? 'bg-white text-slate-900 shadow-sm border-slate-200' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent'
    }`;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={onToggle}
      />
      <aside className={`fixed top-0 left-0 h-full w-[280px] bg-[#fcfcfc] border-r border-slate-200 flex flex-col justify-between shadow-2xl shadow-slate-200/50 z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
              <i className="fas fa-bolt"></i>
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">Orbit<span className="text-blue-600">Cloud</span></h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Panel Store</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm mb-6 flex items-center gap-3">
            <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} alt="Profile" className="w-10 h-10 rounded-full border border-slate-100 shadow-sm object-cover" />
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-slate-800 truncate">{user.name}</h4>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Menu Utama</p>
            <button onClick={() => { onNavigate(AppState.DASHBOARD); if(window.innerWidth < 1024) onToggle(); }} className={navClass(activeTab === AppState.DASHBOARD)}>
              <i className="fas fa-th-large text-slate-400"></i>
              <span>Dashboard</span>
            </button>
            <button onClick={() => { onNavigate(AppState.HISTORY); if(window.innerWidth < 1024) onToggle(); }} className={navClass(activeTab === AppState.HISTORY)}>
              <i className="fas fa-receipt text-slate-400"></i>
              <span>Riwayat Transaksi</span>
            </button>
            <div className="my-4 border-t border-slate-100"></div>
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Produk</p>
            <button onClick={() => { onNavigate(AppState.STORE); setCategory?.('linux'); if(window.innerWidth < 1024) onToggle(); }} className={navClass(activeTab === AppState.STORE && currentCategory === 'linux')}>
              <i className="fab fa-linux text-orange-500"></i>
              <span>SA-MP Linux</span>
            </button>
            <button onClick={() => { onNavigate(AppState.STORE); setCategory?.('windows'); if(window.innerWidth < 1024) onToggle(); }} className={navClass(activeTab === AppState.STORE && currentCategory === 'windows')}>
              <i className="fab fa-windows text-blue-500"></i>
              <span>SA-MP Windows</span>
            </button>
            <button onClick={() => { onNavigate(AppState.STORE); setCategory?.('nodejs'); if(window.innerWidth < 1024) onToggle(); }} className={navClass(activeTab === AppState.STORE && currentCategory === 'nodejs')}>
              <i className="fab fa-node-js text-green-500"></i>
              <span>Node.js Bot</span>
            </button>
          </div>
        </div>
        <div className="p-5 bg-slate-50 border-t border-slate-200">
           <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-white hover:text-red-600 hover:border hover:border-red-100 hover:shadow-sm transition-all">
            <i className="fas fa-sign-out-alt"></i> Keluar Akun
          </button>
        </div>
      </aside>
    </>
  );
};

// --- Component: Product Card ---
const ProductCard: React.FC<{ product: Product; onOrder: (p: Product) => void }> = ({ product, onOrder }) => {
  const themes = {
    linux: { accent: 'border-t-orange-500', text: 'text-orange-600', bg: 'bg-orange-50', btn: 'hover:bg-orange-600' },
    windows: { accent: 'border-t-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', btn: 'hover:bg-blue-600' },
    nodejs: { accent: 'border-t-green-500', text: 'text-green-600', bg: 'bg-green-50', btn: 'hover:bg-green-600' },
  };
  const t = themes[product.category];
  const isPopular = ['linux_2', 'win_2', 'node_3'].includes(product.id);

  return (
    <div className={`plan-card bg-white rounded-[20px] p-5 flex flex-col border border-slate-200 relative ${t.accent} border-t-[5px]`}>
      {isPopular && (
        <div className='absolute top-4 right-4 bg-red-500 text-white text-[9px] font-extrabold px-2 py-1 rounded shadow-md z-20 tracking-wider'>HOT</div>
      )}
      <div className='flex items-start gap-4 mb-4'>
        <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center text-lg ${t.text} shadow-inner`}>
          <i className={`fab ${product.category === 'linux' ? 'fa-linux' : product.category === 'windows' ? 'fa-windows' : 'fa-node-js'}`}></i>
        </div>
        <div>
          <h3 className='font-bold text-slate-800 text-base leading-none mb-1'>{product.name}</h3>
          <div className='text-[10px] font-bold text-slate-400 uppercase'>Instant Activation</div>
        </div>
      </div>
      <div className='mb-5'>
        <div className='flex items-baseline gap-1'>
          <span className='text-xs font-semibold text-slate-400'>Rp</span>
          <span className='text-2xl font-black text-slate-900 tracking-tight'>{new Intl.NumberFormat('id-ID').format(product.price)}</span>
          <span className='text-xs font-medium text-slate-400'>/bln</span>
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2 mb-5 text-center'>
        <div className='bg-slate-50 border border-slate-100 p-1.5 rounded-lg'>
          <div className='text-[9px] text-slate-400 font-bold uppercase'>RAM</div>
          <div className='text-xs font-bold text-slate-700'>{formatRes(product.ram)}</div>
        </div>
        <div className='bg-slate-50 border border-slate-100 p-1.5 rounded-lg'>
          <div className='text-[9px] text-slate-400 font-bold uppercase'>SSD</div>
          <div className='text-xs font-bold text-slate-700'>{formatRes(product.disk)}</div>
        </div>
        <div className='bg-slate-50 border border-slate-100 p-1.5 rounded-lg'>
          <div className='text-[9px] text-slate-400 font-bold uppercase'>CPU</div>
          <div className='text-xs font-bold text-slate-700'>{product.cpu}%</div>
        </div>
        <div className='bg-slate-50 border border-slate-100 p-1.5 rounded-lg'>
          <div className='text-[9px] text-slate-400 font-bold uppercase'>INFO</div>
          <div className='text-xs font-bold text-slate-700 truncate px-1'>{product.extra}</div>
        </div>
      </div>
      <div className='mt-auto'>
        <button onClick={() => onOrder(product)} className={`w-full py-2.5 rounded-xl font-bold text-xs text-white bg-slate-900 transition-all shadow-md active:scale-95 ${t.btn}`}>
          Order Now
        </button>
      </div>
    </div>
  );
};

// --- Component: Checkout Modal ---
const CheckoutModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  product: Product | null;
  onConfirm: (username: string) => void;
  user: User;
}> = ({ isOpen, onClose, product, onConfirm, user }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative animate-[fadeInfo_0.3s_ease-out]">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-800">Checkout</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-700 shadow-sm border border-slate-100 text-xl">
              <i className="fas fa-box"></i>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Item Dipilih</div>
              <h4 className="font-bold text-slate-900 leading-tight">{product.name}</h4>
              <div className="text-sm font-bold text-blue-600">{formatRupiah(product.price)}</div>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Username Panel Server</label>
            <div className="relative">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={`user_${user.name.split(' ')[0].toLowerCase()}`} className="w-full pl-4 pr-10 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-800 font-bold focus:border-blue-500 outline-none transition placeholder:font-normal shadow-sm" />
              <i className="fas fa-server absolute right-4 top-3.5 text-slate-400"></i>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 ml-1">Password panel akan dikirim ke email: <span className="text-slate-600 font-bold">{user.email}</span></p>
          </div>
          <button onClick={() => { if(username.length >= 3) { setLoading(true); onConfirm(username); } }} disabled={username.length < 3 || loading} className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 transition active:scale-95 flex items-center justify-center gap-2">
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <><span>Bayar QRIS</span><i className="fas fa-arrow-right"></i></>}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Component: Payment Page ---
const PaymentPage: React.FC<{ 
  transaction: Transaction; 
  onSuccess: (updatedTx: Transaction) => void;
  onCancel: () => void;
  user: User;
}> = ({ transaction, onSuccess, onCancel, user }) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [checking, setChecking] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (qrRef.current) {
        qrRef.current.innerHTML = "";
        // @ts-ignore
        new QRCode(qrRef.current, { text: transaction.qr_string, width: 180, height: 180, colorDark: "#0f172a", colorLight: "#ffffff", correctLevel: 2 });
    }
    const timer = setInterval(() => setTimeLeft(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    
    // Auto Poll
    const poller = setInterval(() => checkStatus(true), 4000);

    return () => { clearInterval(timer); clearInterval(poller); };
  }, [transaction]);

  const checkStatus = async (silent = false) => {
      if (!silent) setChecking(true);
      const res = await apiCall<Transaction>(`/order/${transaction.order_id}/status`);
      if (!silent) setChecking(false);

      if (res.success && res.data) {
          if (res.data.status === 'paid') onSuccess(res.data);
          else if (res.data.status === 'cancelled') onCancel();
      }
  };

  const handleCancel = async () => {
      const confirm = window.confirm("Apakah Anda yakin ingin membatalkan transaksi ini?");
      if(confirm) {
        const res = await apiCall<{message: string}>(`/order/${transaction.order_id}/cancel`, 'POST');
        if (res.success) {
            onCancel();
        } else {
            alert(res.message); // Show anti-spam message
        }
      }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    const res = await apiCall<{message: string}>(`/order/${transaction.order_id}/simulate`, 'POST');
    if (res.success) {
        alert(res.message);
    } else {
        alert(res.message);
    }
    setSimulating(false);
  }

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white relative">
        <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600 rounded-full blur-[60px] opacity-30 pointer-events-none"></div>
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Sisa Waktu</div>
                <div className="font-mono font-bold text-2xl text-yellow-400 tracking-wider tabular-nums">{minutes}:{seconds}</div>
            </div>
            <div className="text-right z-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Bayar</div>
                <div className="font-black text-xl tracking-tight">{formatRupiah(transaction.amount)}</div>
            </div>
        </div>
        <div className="p-6">
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-5">
                <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                <div className="overflow-hidden">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Ditagihkan Kepada</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                </div>
            </div>
            <div className="relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-[length:20px_20px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-6 mb-6 flex flex-col items-center justify-center min-h-[280px]">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 relative">
                    <div ref={qrRef} id="qrcode"></div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10"><i className="fas fa-camera text-4xl text-slate-900"></i></div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                    <i className="fas fa-qrcode text-blue-500"></i><span>Scan QRIS untuk Bayar</span>
                </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-50">
                    <span className="text-xs text-slate-400 font-bold uppercase">Order ID</span>
                    <span className="text-xs font-bold text-slate-700 font-mono">{transaction.order_id}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold uppercase">Paket</span>
                    <span className="text-xs font-bold text-white bg-blue-600 px-3 py-1 rounded-lg shadow-blue-500/30 shadow-md">{transaction.paket_name}</span>
                </div>
            </div>
            
            <button onClick={() => checkStatus()} disabled={checking} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-200 transition-all transform active:scale-[0.98] mb-3 flex items-center justify-center gap-2 group">
                {checking ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt group-hover:rotate-180 transition-transform duration-500"></i>}
                <span>{checking ? 'Memeriksa...' : 'Cek Status Pembayaran'}</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
                 {SIMULATION_MODE && (
                     <button onClick={handleSimulate} disabled={simulating} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 font-bold py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-1">
                        {simulating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-flask"></i>} Test Pay
                     </button>
                 )}
                 <button onClick={handleCancel} className={`bg-white text-red-500 hover:bg-red-50 border border-red-100 font-bold py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-1 ${!SIMULATION_MODE ? 'col-span-2' : ''}`}>
                    <i className="fas fa-times"></i> Batalkan
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Component: Success Page ---
const SuccessPage: React.FC<{ transaction: Transaction; onBack: () => void; user: User }> = ({ transaction, onBack, user }) => {
  const [isReady, setIsReady] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [passVisible, setPassVisible] = useState(false);
  
  const server = transaction.server_detail;

  useEffect(() => {
    // Check if server details are available
    if (server) {
        setIsReady(true);
        // Trigger Confetti
        const end = Date.now() + 1000;
        const frame = () => {
            // @ts-ignore
            if (window.confetti) {
                // @ts-ignore
                window.confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10b981', '#3b82f6', '#f59e0b'] });
                // @ts-ignore
                window.confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10b981', '#3b82f6', '#f59e0b'] });
            }
            if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
    }
  }, [server]);

  const handleCopy = (txt: string) => {
      navigator.clipboard.writeText(txt);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
  };

  const handleDownload = () => {
      setDownloading(true);
      const element = document.getElementById('receipt-card');
      if (element && (window as any).html2canvas) {
          (window as any).html2canvas(element, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff'
          }).then((canvas: HTMLCanvasElement) => {
              const link = document.createElement('a');
              link.download = `BUKTI-SERVER-${transaction.order_id}.jpg`;
              link.href = canvas.toDataURL("image/jpeg", 0.95);
              link.click();
              setDownloading(false);
          });
      } else {
          setDownloading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
        {/* Toast */}
        <div className={`fixed top-6 left-1/2 z-[100] bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 pointer-events-none border border-slate-700 transition-all duration-300 transform -translate-x-1/2 ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}>
            <i className="fas fa-check-circle text-emerald-400"></i>
            <span className="text-sm font-bold">Berhasil disalin!</span>
        </div>

        <div className="max-w-md w-full relative">
            {isReady && server ? (
                <>
                <div id="receipt-card" className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white relative fade-up">
                    <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500"></div>
                    
                    {/* Header */}
                    <div className="bg-emerald-50/50 p-6 text-center border-b border-emerald-100/50">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-100 text-3xl text-emerald-500 border border-emerald-50">
                            <i className="fas fa-check"></i>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Server Aktif!</h1>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-100 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Order #{transaction.order_id}</span>
                        </div>
                    </div>

                    <div className="p-6 pt-4">
                        {/* Owner Info */}
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-6">
                            <img src={user.picture || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-full border border-white shadow-sm object-cover" />
                            <div className="overflow-hidden">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Pemilik Server</p>
                                <h4 className="text-xs font-bold text-slate-800 truncate">{user.name}</h4>
                                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                            </div>
                        </div>

                        {/* IP Box */}
                        <div className="text-center mb-6">
                            <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 mx-2 relative group cursor-pointer" onClick={() => handleCopy(`${server.ip}:${server.port}`)}>
                                <div className="absolute top-2 right-2 text-slate-300 group-hover:text-emerald-500 transition"><i className="far fa-copy"></i></div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">IP Address Server</div>
                                <div className="text-xl font-black text-slate-800 font-mono break-all leading-tight">
                                    {server.ip || '127.0.0.1'}:<span className="text-emerald-600">{server.port || '0000'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Panel Info */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1">
                                <div className="flex justify-between items-center pb-1 border-b border-slate-200 mb-1">
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-server text-blue-500 text-xs"></i>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Panel Control</span>
                                    </div>
                                    <a href={server.panel_url} target="_blank" className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg transition flex items-center gap-1 shadow-sm">
                                        Buka Panel <i class="fas fa-external-link-alt"></i>
                                    </a>
                                </div>
                                <div className="text-xs font-bold text-slate-600 truncate font-mono select-all pt-1">
                                    {server.panel_url}
                                </div>
                            </div>

                             {/* User & Pass */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Panel User</span>
                                        <button onClick={() => handleCopy(server.username)} className="text-slate-400 hover:text-emerald-500 transition">
                                            <i className="far fa-copy"></i>
                                        </button>
                                    </div>
                                    <div className="text-sm font-bold text-slate-800 break-all pr-2 font-mono">
                                        {server.username}
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Password</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPassVisible(!passVisible)} className="text-slate-400 hover:text-blue-500 transition"><i className={`far ${passVisible ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                                            <button onClick={() => handleCopy(server.password)} className="text-slate-400 hover:text-emerald-500 transition"><i className="far fa-copy"></i></button>
                                        </div>
                                    </div>
                                    <input type={passVisible ? "text" : "password"} value={server.password} readOnly className="bg-transparent text-sm font-bold text-slate-800 w-full outline-none font-mono" />
                                </div>
                             </div>
                        </div>
                        
                        <div className="mt-4 text-center">
                            <p className="text-[10px] text-slate-400 bg-yellow-50 text-yellow-700 px-2 py-1 rounded inline-block">
                                <i className="fas fa-lock mr-1"></i> Simpan bukti ini. Jangan berikan password ke siapapun.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 fade-up delay-100">
                    <button onClick={handleDownload} disabled={downloading} className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-3.5 rounded-xl shadow-sm hover:shadow-md transition flex items-center justify-center gap-2 active:scale-95">
                        <i className={`fas ${downloading ? 'fa-circle-notch fa-spin' : 'fa-download'} text-emerald-500`}></i> 
                        <span className="text-xs sm:text-sm">Simpan Bukti</span>
                    </button>
                    <button onClick={onBack} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-900/20 transition flex items-center justify-center gap-2 active:scale-95">
                        <i className="fas fa-home"></i> 
                        <span className="text-xs sm:text-sm">Selesai</span>
                    </button>
                </div>
                </>
            ) : (
                <div className="bg-white rounded-[2rem] shadow-xl p-10 text-center fade-up max-w-sm mx-auto">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Menyiapkan Server...</h2>
                    <p className="text-xs text-slate-500 mt-2 mb-6">Sedang menginstalasi sistem untuk akun <b>{user.name}</b>.</p>
                    <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition">
                        Refresh Halaman
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

// --- Component: History Page ---
const HistoryPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      // apiCall is async
      apiCall<Transaction[]>(`/history/${userId}`).then(res => {
          if (res.success && res.data) {
              setTransactions(res.data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          }
          setLoading(false);
      });
  }, [userId]);

  if (loading) {
      return (
          <div className="flex justify-center items-center py-20">
              <i className="fas fa-spinner fa-spin text-4xl text-slate-200"></i>
          </div>
      );
  }

  return (
      <div className="space-y-6 animate-[fadeInfo_0.4s_ease-out]">
          <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Riwayat Transaksi</h2>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{transactions.length} Total</span>
          </div>
          
          {transactions.length === 0 ? (
              <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 text-2xl shadow-sm"><i className="fas fa-receipt"></i></div>
                  <p className="text-slate-500 font-bold">Belum ada transaksi</p>
                  <p className="text-xs text-slate-400 mt-1">Pesanan Anda akan muncul disini.</p>
              </div>
          ) : (
              <div className="grid gap-4">
                  {transactions.map(tx => (
                      <div key={tx.order_id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                          <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
                                  tx.status === 'paid' ? 'bg-emerald-500 shadow-emerald-200' : 
                                  tx.status === 'pending' ? 'bg-orange-500 shadow-orange-200' : 'bg-red-500 shadow-red-200'
                              }`}>
                                  <i className={`fas ${tx.status === 'paid' ? 'fa-check' : tx.status === 'pending' ? 'fa-clock' : 'fa-times'}`}></i>
                              </div>
                              <div>
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-wide">{tx.paket_type}</span>
                                      <span className="text-[10px] text-slate-300 font-mono">{tx.order_id}</span>
                                  </div>
                                  <h4 className="font-bold text-slate-800">{tx.paket_name}</h4>
                                  <div className="text-xs text-slate-500 mt-0.5">Username: <span className="font-bold">{tx.username_req}</span></div>
                              </div>
                          </div>
                          
                          <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-50 pt-3 md:pt-0">
                              <div className="text-right">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
                                  <div className="font-black text-slate-900">{formatRupiah(tx.amount)}</div>
                              </div>
                              <div className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${
                                  tx.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
                                  tx.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                              }`}>
                                  {tx.status}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.LOGIN);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [category, setCategory] = useState<'linux' | 'windows' | 'nodejs'>('linux');
  
  const [catalog, setCatalog] = useState<ProductCatalog>({ linux: [], windows: [], nodejs: [] });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

  // Check Session
  useEffect(() => {
      const stored = sessionStorage.getItem('orbit_user');
      if (stored) {
          setUser(JSON.parse(stored));
          setAppState(AppState.STORE);
      }
      
      // Load Catalog
      apiCall<ProductCatalog>('/products').then(res => {
          if (res.success && res.data) setCatalog(res.data);
      });
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    sessionStorage.setItem('orbit_user', JSON.stringify(u));
    setAppState(AppState.STORE);
  };
  
  const handleLogout = () => {
      sessionStorage.removeItem('orbit_user');
      setUser(null);
      setAppState(AppState.LOGIN);
  }

  const handleOrder = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleCheckout = async (username: string) => {
    if (!selectedProduct || !user) return;
    
    // Call API to create order
    const res = await apiCall<Transaction>('/order', 'POST', {
        userId: user.id,
        productId: selectedProduct.id,
        usernameReq: username
    });

    if (res.success && res.data) {
        setCurrentTransaction(res.data);
        setModalOpen(false);
        setAppState(AppState.PAYMENT);
    } else {
        // If pending exists, data contains the previous transaction
        if(res.data) {
            alert(res.message); // "Selesaikan tagihan sebelumnya..."
            setCurrentTransaction(res.data);
            setModalOpen(false);
            setAppState(AppState.PAYMENT);
        } else {
            alert("Gagal membuat pesanan: " + res.message);
        }
    }
  };

  if (!user || appState === AppState.LOGIN) {
    return <AuthPage onLogin={handleLogin} />;
  }

  if (appState === AppState.PAYMENT && currentTransaction) {
    return <PaymentPage transaction={currentTransaction} user={user} onSuccess={(tx) => { setCurrentTransaction(tx); setAppState(AppState.SUCCESS); }} onCancel={() => setAppState(AppState.STORE)} />;
  }

  if (appState === AppState.SUCCESS && currentTransaction) {
    return <SuccessPage transaction={currentTransaction} onBack={() => setAppState(AppState.DASHBOARD)} user={user} />;
  }

  return (
    <div className="min-h-screen">
        <Sidebar 
            user={user} 
            activeTab={appState} 
            onNavigate={setAppState} 
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            setCategory={setCategory}
            currentCategory={category}
            onLogout={handleLogout}
        />

        <main className="lg:ml-[280px] p-6 lg:p-10 transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-95 transition"><i className="fas fa-bars"></i></button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Halo, {user.name.split(' ')[0]}! 👋</h2>
                        <p className="text-sm text-slate-500">{appState === AppState.STORE ? "Mau deploy server apa hari ini?" : "Selamat datang kembali di panel."}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-600">Akun Terverifikasi</span>
                    </div>
                </div>
            </div>

            {appState === AppState.STORE && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 animate-[fadeInfo_0.4s_ease-out]">
                    {catalog[category]?.map(item => (
                        <ProductCard key={item.id} product={item} onOrder={handleOrder} />
                    ))}
                </div>
            )}

            {appState === AppState.DASHBOARD && (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-3xl"><i className="fas fa-server"></i></div>
                    <h3 className="font-bold text-slate-800">Mulai Kelola Server</h3>
                    <p className="text-sm text-slate-500 mb-6">Pilih paket hosting terbaik untuk komunitas Anda.</p>
                    <button onClick={() => setAppState(AppState.STORE)} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition">Beli Layanan</button>
                </div>
            )}

            {appState === AppState.HISTORY && <HistoryPage userId={user.id} />}

            <footer className="mt-20 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">&copy; {new Date().getFullYear()} OrbitCloud. Logged in as {user.email}</footer>
        </main>

        <CheckoutModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} product={selectedProduct} onConfirm={handleCheckout} user={user} />
    </div>
  );
}