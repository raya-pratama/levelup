"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Menu, X, Shield, Sword, Scroll, Settings as SettingsIcon, 
  LogOut, Wallet, ChevronRight, Plus, Camera, Loader2, Lock, CheckCircle2
} from 'lucide-react';
import { CheckCircle } from 'lucide-react';

export default function Home() {
  const [isSideBarOpen, setIsSideBarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Status');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [uploading, setUploading] = useState(false);
  const [systemMsg, setSystemMsg] = useState<{title: string, desc: string} | null>(null);
  // Auth & Identity States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [quests, setQuests] = useState<any[]>([]);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestDifficulty, setNewQuestDifficulty] = useState('normal');
  const [isAddingQuest, setIsAddingQuest] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<any | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newRole, setNewRole] = useState('');
  const questsPerPage = 8; // Batasan 8 card per halaman
  // State untuk menyimpan daftar barang dari database
const [inventory, setInventory] = useState<any[]>([]);
const itemsPerPage = 6; //inventory pagination
const inventoryPerPage = 8; // pagination limit for inventory display
  // Menentukan item mana saja yang muncul di halaman saat ini
const indexOfLastItem = currentPage * inventoryPerPage;
const indexOfFirstItem = indexOfLastItem - inventoryPerPage;
const currentItems = inventory.slice(indexOfFirstItem, indexOfLastItem); 
// ^ Ini akan memperbaiki error "Cannot find name 'currentItems'"
// State untuk membuka/tutup modal tambah barang
const [isAddingItem, setIsAddingItem] = useState(false);

const [itemFile, setItemFile] = useState<File | null>(null);
const [newItem, setNewItem] = useState({ name: '', brand: '', price: ''});
const [itemToDelete, setItemToDelete] = useState<any | null>(null);
const deleteInventoryItem = async (item: any) => {
  //if (`Dismantle ${item.name}? This action cannot be undone.`) return;

  try {
    setLoading(true);

    // 1. Hapus Gambar dari Storage
    const filePath = item.image_url.split('/items/')[1];
    if (filePath) {
      await supabase.storage.from('items').remove([filePath]);
    }

    // 2. Hapus Data dari Database (Ganti bagian ini)
    const { error } = await supabase
      .from('inventory')
      .delete() // Gunakan .delete() bukan .update()
      .eq('id', item.id);

    if (error) throw error;

    showSystemMessage("ITEM DISMANTLED", `${item.name} has been erased.`);
    setSelectedItem(null); 
    fetchInventory(); 
  } catch (error: any) {
    showSystemMessage("Error", "Error: " + error.message);
  } finally {
    setLoading(false);
  }
};
const saveInventoryItem = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Validasi: Pastikan user login dan file gambar sudah dipilih
    if (!user) return showSystemMessage("Error", "Session expired. Please login again.");
    if (!itemFile) return alert("System requires an item image scan!");

    setUploading(true);

    // 1. Upload ke Storage Bucket 'items'
    const fileExt = itemFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('items')
      .upload(filePath, itemFile);

    if (uploadError) throw uploadError;

    // 2. Ambil URL Public
    const { data: { publicUrl } } = supabase.storage.from('items').getPublicUrl(filePath);

    // 3. Simpan ke Database (Pastikan user_id disertakan agar lolos RLS)
    const { error: insertError } = await supabase
      .from('inventory')
      .insert([{ 
        user_id: user.id, // KUNCI LOLOS RLS
        name: newItem.name,
        brand: newItem.brand,
        price: (newItem.price) || 0, 
        image_url: publicUrl 
      }]);

    if (insertError) throw insertError;

    showSystemMessage("ITEM REGISTERED", `${newItem.name} added to vault.`);
    setIsAddingItem(false);
    fetchInventory(); 
    setItemFile(null);
    setNewItem({ name: '', brand: '', price: ''});
  } catch (error: any) {
    // Jika masih error RLS, pesannya akan muncul di sini
    alert("Database Error: " + error.message);
  } finally {
    setUploading(false);
  }
};

  // useEffect(() => {
  //   fetchProfile();
  //   if (profile) {
  //   fetchQuests();
  // }
  // }, [profile]);
  useEffect(() => {
  const initializeSystem = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetchProfile();
      await fetchQuests();
      await fetchInventory();
    } else {
      setLoading(false);
    }
  };
  initializeSystem();
}, []); // Kosongkan agar hanya jalan 1x saat load
  const getTotalAccumulatedExp = () => {
  let total = 0;
  let currentLevelRequirement = 1000; // Mulai Level 1
  const growthRate = 1.66; // Kenaikan 66% berdasarkan datamu

  // Hitung total dari level sebelumnya
  for (let i = 1; i < profile?.level; i++) {
    total += Math.floor(currentLevelRequirement);
    currentLevelRequirement *= growthRate;
  }

  // Tambahkan dengan EXP saat ini (sisa progres di level 3)
  return total + profile?.exp;
};
const fetchInventory = async () => {
  // Cek apakah profile sudah ada, jika ada pakai ID-nya langsung
  const userId = profile?.id;
  
  let currentUserId: string | undefined;
  if (!userId) {
    // Jika belum ada profile, baru ambil dari auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    currentUserId = user.id;
  } else {
    currentUserId = userId;
  }

  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false });

  if (!error && data) {
    setInventory(data);
  }
};

// Panggil di useEffect agar data terisi otomatis
useEffect(() => {
  if (profile) {
    fetchInventory();
  }
}, [profile]);
const saveInventorysItem = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (!newItem.name || !newItem.brand || !newItem.price) {
    return alert("Mohon lengkapi data item!");
  }

  const { error } = await supabase
    .from('inventory')
    .insert([
      { 
        user_id: user.id,
        name: newItem.name,
        brand: newItem.brand,
        price: Number(newItem.price),
      }
    ]);

  if (error) {
    showSystemMessage("System Error", error.message);
  } else {
    showSystemMessage("ITEM REGISTERED", `${newItem.name} has been added to inventory.`);
    setIsAddingItem(false); // Tutup modal
    fetchInventory(); // Ambil data terbaru
    setNewItem({ name: '', brand: '', price: ''}); // Reset form
  }
};
  const DIFFICULTY_REWARDS = {
    easy: { exp: 50, gold: 20 },
    normal: { exp: 150, gold: 50 },
    hard: { exp: 400, gold: 150 },
    'very hard': { exp: 1000, gold: 400 },
    special: { exp: 2500, gold: 1000 }
  };
  const fetchQuests = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1. Ambil quest dari database
  let { data: userQuests, error } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // 2. Logika Quest Default (Olahraga/Meditasi)
  // Jika belum ada quest harian untuk hari ini, kita bisa menambahkannya secara otomatis
  // Tambahkan baris ini di dalam fungsi fetchQuests
  // const today = new Date().toISOString().split('T')[0];
  // const dailyTodayExists = userQuests?.some(q => 
  //   q.is_daily === true && 
  //   new Date(q.created_at).toISOString().split('T')[0] === today
  // );
  
  // if (!dailyTodayExists) {
  //   const { data: newDaily } = await supabase.from('quests').insert([
  //     { 
  //       user_id: user.id, 
  //       title: "Olahraga/Meditasi - 5M", 
  //       description: "Olahraga atau Meditasi minimal 5 menit.", 
  //       difficulty: "normal", 
  //       is_daily: true 
  //     }
  //   ]).select();
  //   if (newDaily) userQuests = [newDaily[0], ...(userQuests || [])];
  // }

  setQuests(userQuests || []);
  };
  const addCustomQuest = async (title: string, difficulty: string) => {
  if (!title) return;
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data } = await supabase
    .from('quests')
    .insert([{ 
      user_id: user?.id, 
      title, 
      difficulty, 
      is_daily: false 
    }])
    .select();

  if (data) {
    setQuests([data[0], ...quests]);
    // TUTUP FORM OTOMATIS
    setIsAddingQuest(false); 
    setNewQuestTitle('');
    setCurrentPage(1);
    showSystemMessage("QUEST RECEIVED", "A new objective has been added to your log.");
  }
};
 const completeQuest = async (quest: any) => {
  if (quest.is_completed) return;

  setLoading(true);
  // Ambil reward berdasarkan difficulty dari mapping yang kita buat tadi
  const rewards = DIFFICULTY_REWARDS[quest.difficulty as keyof typeof DIFFICULTY_REWARDS];

  const { error: qError } = await supabase
    .from('quests')
    .update({ is_completed: true, completed_at: new Date() })
    .eq('id', quest.id);

  if (!qError) {
    const { data: newProfile } = await supabase
      .from('profiles')
      .update({ 
        exp: profile.exp + rewards.exp, 
        gold: Number(profile.gold) + rewards.gold 
      })
      .eq('id', profile.id)
      .select().single();

    if (newProfile) {
      setProfile(newProfile);
      showSystemMessage("QUEST COMPLETED", `You gained ${rewards.exp} EXP and ${rewards.gold} Gold!`);
      fetchQuests(); // Panggil fungsi ini untuk refresh daftar quest
    }
  } else {
    showSystemMessage("SYSTEM ERROR", "Failed to update quest status.");
  }
  setLoading(false);
};
  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile(data);
        // Jika username diawali 'pending_', paksa pilih username
        if (data.username && data.username.startsWith('pending_')) {
          setIsSettingUsername(true);
        } else {
          setIsSettingUsername(false);
        }
      }
    } else {
      setProfile(null);
    }
    setLoading(false);
  };
  const showSystemMessage = (title: string, desc: string) => {
  setSystemMsg({ title, desc });
  // Otomatis hilang setelah 3 detik
  setTimeout(() => setSystemMsg(null), 3000);
};
  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
  try {
    setUploading(true);
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    // Path file: id_user/avatar.png (supaya rapi)
    const filePath = `${profile.id}/avatar.${fileExt}`;

    // 1. Upload ke Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // 2. Ambil Public URL-nya
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // 3. Simpan URL tersebut ke tabel profiles kolom avatar_url
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    showSystemMessage("Avatar updated!", "Avatar has been successfully synchronized.");
    fetchProfile(); // Refresh tampilan
  } catch (error: any) {
    showSystemMessage("System Error",error.message);
  } finally {
    setUploading(false);
  }
};
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isRegister 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      fetchProfile();
    }
  };

  const handleSaveUsername = async () => {
    if (newUsername.length < 3) return alert("Codename minimal 3 karakter!");
    
    setLoading(true);
    const formatted = newUsername.toLowerCase().trim().replace(/\s/g, '');

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        username: formatted,
        display_name: formatted 
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') alert("Codename sudah digunakan Hunter lain!");
      else alert(error.message);
      setLoading(false);
    } else {
      setProfile(data);
      setIsSettingUsername(false);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    window.location.reload();
  };
  const handleUpdateRole = async () => {
  //if (newRole.length < 1) return alert("Nama minimal 3 karakter!");
  
  setLoading(true);
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      role: newRole
    })
    .eq('id', profile.id)
    .select()
    .single();

  if (error) {
    showSystemMessage("System Error", error.message);
  } else {
    setProfile(data);
    showSystemMessage("Identity Updated!", "Role is Succesfully Changed");
  }
  setLoading(false);
};
const handleUpdateProfile = async () => {
  if (editName.length < 3) return alert("Nama minimal 3 karakter!");
  
  setLoading(true);
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      display_name: editName.toLowerCase().trim(), // Tetap lowercase sesuai keinginanmu
      //username: editName.toLowerCase().trim() // Mengupdate username juga agar sinkron
    })
    .eq('id', profile.id)
    .select()
    .single();

  if (error) {
    showSystemMessage("System Error", error.message);
  } else {
    setProfile(data);
    showSystemMessage("Identity Updated!", "Username is Succesfully Changed");
  }
  setLoading(false);
};  
const handleCompleteQuest = async (expGain: number, goldGain: number) => {
    if (!profile) return;
    const { data } = await supabase
      .from('profiles')
      .update({ 
        exp: profile.exp + expGain,
        gold: Number(profile.gold) + goldGain 
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (data) setProfile(data);
  };

  if (loading && !isSettingUsername) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-cyan-500 mb-4" size={40} />
      <p className="text-cyan-500 font-mono tracking-[0.3em] animate-pulse uppercase text-[10px]">Synchronizing System...</p>
    </div>
  );

  const expPercentage = profile ? (profile.exp / profile.max_exp) * 100 : 0;

  return (
    <div className="relative min-h-screen bg-[#050505] text-slate-200 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* 1. LOGIN OVERLAY */}
      {!profile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-slate-900 p-8 rounded-3xl shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <Lock className="text-cyan-500 mb-4" size={32} />
              <h2 className="text-xl font-black text-white italic tracking-widest uppercase">System Access</h2>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <input 
                type="email" placeholder="EMAIL ADDRESS" 
                className="w-full bg-black border border-slate-800 rounded-xl p-4 text-xs font-bold tracking-widest focus:border-cyan-500 outline-none"
                onChange={(e) => setEmail(e.target.value)} required 
              />
              <input 
                type="password" placeholder="ACCESS KEY" 
                className="w-full bg-black border border-slate-800 rounded-xl p-4 text-xs font-bold tracking-widest focus:border-cyan-500 outline-none"
                onChange={(e) => setPassword(e.target.value)} required 
              />
              <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-black py-4 rounded-xl text-xs uppercase tracking-[0.3em] transition-all">
                {isRegister ? 'Register Hunter' : 'Awaken'}
              </button>
            </form>
            <button onClick={() => setIsRegister(!isRegister)} className="w-full mt-6 text-[10px] text-slate-600 hover:text-cyan-500 uppercase font-black tracking-[0.2em]">
              {isRegister ? 'Back to Login' : 'Create New Identity'}
            </button>
          </div>
        </div>
      )}

      {/* 2. IDENTITY SELECTION (LOWERCASE) */}
      {profile && isSettingUsername && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-cyan-500/30 p-8 rounded-3xl shadow-2xl text-center">
            <Shield className="text-cyan-500 mx-auto mb-4 animate-pulse" size={48} />
            <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-2">Create Username</h2>
            <p className="text-slate-500 text-[10px] uppercase mb-8">Choose your Username. Must be unique and lowercase.</p>
            <input 
              type="text" placeholder="codename..." 
              value={newUsername}
              className="w-full bg-black border border-slate-800 rounded-xl p-4 text-sm font-bold text-cyan-500 lowercase focus:border-cyan-500 outline-none mb-6 text-center tracking-[0.2em]"
              onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} 
            />
            <button onClick={handleSaveUsername} className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-black py-4 rounded-xl text-xs uppercase tracking-[0.3em] transition-all">
              Confirm Username
            </button>
          </div>
        </div>
      )}

      {/* 3. SIDEBAR */}
      {/* Tambahkan ini tepat di atas tag </aside> */}
{isSideBarOpen && (
  <div 
    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[35] md:hidden"
    onClick={() => setIsSideBarOpen(false)} 
  />
)}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-black border-slate-900 transition-transform duration-300 md:static md:translate-x-0 ${isSideBarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-full flex flex-col p-8 overflow-y-auto no-scrollbar">
          <div className="w-40 h-40 rounded-full border-4 border-slate-900 overflow-hidden mb-8 bg-slate-900 mx-auto shadow-2xl">
            <img 
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} 
            alt="Avatar" 
            className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center md:text-left mb-8 border-slate-900 pb-6">
            {/* Tampilan Lowercase sesuai permintaan */}
            <h2 className="text-xl font-black text-white italic tracking-tighter lowercase">{profile?.display_name || 'hunter'}</h2>
            <p className="text-[10px] font-bold text-slate-600 tracking-[0.2em] mt-1">@{profile?.username}</p>
          </div>
          <div className="space-y-5 text-[10px] font-black tracking-widest uppercase">
            <div className="flex justify-between items-center border-slate-900">
              <span className="text-slate-500 text-[11px]">Role</span>
              <span className="text-purple-400 text-[11px]">{profile?.role}</span>
            </div>
            <div className="flex justify-between items-end border-slate-900">
              <span className="text-slate-500 text-[11px]">Level</span>
              <span className="text-[11px] text-emerald-400 leading-none font-black">{profile?.level}</span>
            </div>
            <div className="flex justify-between items-center border-slate-900">
              <span className="text-slate-500 text-[11px]">Rank</span>
              <span className="text-yellow-400 text-[11px]">{profile?.rank}</span>
            </div>
            <div className="">
              <div className="flex justify-between text-[11px] mb-2 text-cyan-500 font-bold">
                <span>Experience</span>
                <span className="text-slate-500">{profile?.exp} / {profile?.max_exp}</span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-700" style={{ width: `${expPercentage}%` }}></div>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[11px]">Gold</span>
              <span className="text-amber-500 text-[11px]">{Number(profile?.gold || 0).toLocaleString()} G</span>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-auto mb-18 lg:mb-0 md:mb-0 flex items-center gap-2 text-slate-800 hover:text-red-500 text-[9px] font-black uppercase tracking-widest transition-colors">
            <LogOut size={14} /> Logout Account
          </button>
        </div>
      </aside>

      {/* 4. MAIN CONTENT */}
<main className="flex-1 p-6 md:p-16 overflow-y-auto bg-[#0a0a0a] no-scrollbar pb-32 md:pb-0">
  <div className="max-w-4xl mx-auto">

    {/* --- TAMPILAN DESKTOP (Gambar Pertama) --- */}
    <div className="hidden md:flex w-full mb-6 relative">
      {['Status', 'Quests', 'Inventory', 'Settings'].map((tab) => (
        <button
          key={tab} 
          onClick={() => setActiveTab(tab)}
          className={`flex-1 text-[10px] md:text-xs font-black uppercase tracking-[0.5em] border-r border-l border-slate-1000/50 transition-all py-4
          ${activeTab === tab 
            ? 'text-cyan-500 border-b-2 border-cyan-500 -mb-[2px] bg-gradient-to-t from-cyan-500/10 to-transparent' 
            : 'text-slate-700 hover:text-slate-300 hover:bg-white/5'}
          `}
        >
          {tab}
        </button>
      ))}
    </div>

    {/* --- TAMPILAN MOBILE BOTTOM BAR (Gambar Ketiga) --- */}
    {profile && (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[200] ${!profile ? 'hidden' : 'flex'} bg-slate-950/90 backdrop-blur-lg border-t border-cyan-500/20 px-4 py-3">
      <div className="flex justify-around items-center">
        {[
          { id: 'Status', icon: "📊" },
          { id: 'Quests', icon: "📋" },
          { id: 'Inventory', icon: "🎒" },
          { id: 'Settings', icon: "⚙️" }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === item.id ? 'text-cyan-400 scale-110' : 'text-slate-600'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.id}</span>
            
            {/* Indikator Aktif Mobile */}
            {activeTab === item.id && (
              <div className="absolute -bottom-3 w-8 h-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
            )}
          </button>
        ))}
      </div>
    </div>
    )}

    {/* Tombol Menu Bulat (Gambar Kedua) - Melayang di atas Bottom Bar */}
    {profile && (
    <button
      onClick={() => setIsSideBarOpen(!isSideBarOpen)}
      className="md:hidden fixed bottom-24 right-6 z-[210] w-14 h-14 bg-cyan-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(8,145,178,0.4)] border-2 border-cyan-400/50 active:scale-90 transition-all"
    >
      {/* <div className="flex flex-col gap-1">
        <div className="w-6 h-0.5 bg-black"></div>
        <div className="w-6 h-0.5 bg-black"></div>
        <div className="w-6 h-0.5 bg-black"></div>
      </div> */}
      {isSideBarOpen ? <X size={24} /> : <Menu size={24} />}
    </button>
    )}
    
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeTab === 'Status' && (
  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
    
    {/* --- KOLOM KIRI: ASSETS & IDENTITY --- */}
    <div className="space-y-6">
      {/* BOX 1: USER ROLE */}
      <div className="bg-slate-950/40 border-2 border-slate-800 p-1 shadow-[0_0_20px_rgba(0,0,0,0.5)] group hover:border-cyan-500/50 transition-all">
        <div className="border border-slate-800/50 p-6 relative overflow-hidden">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2">Current Class</p>
          <h2 className="text-3xl text-white font-black italic uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            {profile?.role || "Shadow Monarch"}
          </h2>
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <h1 className="text-6xl font-black italic">ROLE</h1>
          </div>
        </div>
      </div>

      {/* BOX 2: ECONOMY (EXP & GOLD) */}
      <div className="bg-slate-950/40 border-2 border-cyan-900/30 p-1 group hover:border-cyan-500/50 transition-all">
        <div className="border border-cyan-900/20 p-6 space-y-8 relative">
          <div className="flex justify-between items-end">
            <div className="text-left">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Experience</p>
              <p className="text-2xl text-cyan-400 font-black italic">
                {getTotalAccumulatedExp().toLocaleString()} <span className="text-xs font-normal not-italic text-slate-500 ml-1">EXP</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Gold</p>
              <p className="text-2xl text-amber-500 font-black italic">
                {Number(profile?.gold).toLocaleString()} <span className="text-xs font-normal not-italic text-slate-500 ml-1">G</span>
              </p>
            </div>
          </div>
          
          {/* Visual Divider */}
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
          
          <div className="flex justify-center gap-4 opacity-30 text-[8px] font-black tracking-[0.5em] text-cyan-500 uppercase">
            <span>Verified System Assets</span>
          </div>
        </div>
      </div>
    </div>

    {/* --- KOLOM KANAN: PROGRESS & RANK --- */}
    <div className="space-y-6">
      {/* BOX 3: LEVEL (Gaya Sidebar) */}
      <div className="bg-cyan-950/20 border-2 border-cyan-500 p-1 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative">
        <div className="border border-cyan-500/30 p-8 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.4em] mb-4">User Level</p>
          
          {/* Lingkaran Level seperti Sidebar */}
          <div className="relative flex items-center justify-center w-28 h-28 mb-4">
             <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
             <div className="absolute inset-0 border-t-4 border-cyan-400 rounded-full animate-spin duration-[3s]"></div>
             <span className="text-5xl font-black italic text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
                {profile?.level}
             </span>
          </div>
          
          <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-700" style={{ width: `${expPercentage}%` }}></div>
              </div>
        </div>
      </div>

      {/* BOX 4: RANK */}
      <div className="bg-slate-950/40 border-2 border-slate-800 p-1 group hover:border-amber-500/50 transition-all">
        <div className="border border-slate-800/50 p-6 relative overflow-hidden">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-2">User Rank</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black italic text-amber-500 uppercase">
              {profile?.rank || "E"}
            </span>
            <span className="text-xs text-slate-600 font-bold uppercase tracking-tighter">Rank</span>
          </div>
          
          {/* Dekorasi Rank Besar di Background */}
          <div className="absolute -bottom-4 -right-2 opacity-5">
            <h1 className="text-8xl font-black italic">{profile?.rank || "E"}</h1>
          </div>
        </div>
      </div>
    </div>

  </div>
)}

           {activeTab === 'Quests' && (
  <div className="w-full space-y-8 animate-in fade-in duration-700">
    
    {/* HEADER (Tetap sama seperti sebelumnya) */}
    <div className="flex justify-between items-center border-b border-cyan-500/20 pb-4">
    <div>
      <h3 className="text-white font-black uppercase tracking-[0.4em] text-lg">Quest Log</h3>
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
        Tambahkan Quest Baru Sendiri Sesuai yang Anda Mau
      </p>
    </div>
      <button onClick={() => setIsAddingQuest(true)} className="text-[10px] font-black text-cyan-400 border border-cyan-500/30 px-6 py-2 hover:bg-cyan-500/10 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]">
        NEW QUEST
      </button>
    </div>

    {/* GRID LIST (Dipotong berdasarkan halaman) */}
    <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[400px]">
      {quests
        .slice((currentPage - 1) * questsPerPage, currentPage * questsPerPage)
        .map((quest) => (
          <div 
            key={quest.id} 
            onClick={() => setSelectedQuest(quest)}
            className={`relative aspect-square cursor-pointer border-2 rounded-md transition-all flex flex-col p-4 grou
              ${quest.is_completed ? 'bg-slate-900/10 border-slate-900 opacity-40' : 'bg-black/40 border-cyan-900/40 hover:border-cyan-500 shadow-lg shadow-cyan-500/5'}
            `}
          >
            <div className='min-w-[50px] relative overflow-hidden'>

            <div className='border border-cyan-500/30 p-6 min-w-[150px] relative overflow-hidden'>
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
            <h4 className="text-white font-black uppercase mt-4 mb-2 mr-0 ml-0 tracking-tighter text-xs md:text-sm line-clamp-1 px-">{quest.title}</h4>
            <p className="text-[10px] font-black text-red-600 uppercase mb-2 mt-1 tracking-widest">Difficult : {quest.difficulty}</p>
            <p className="text-[10px] font-black text-cyan-600 uppercase mb-2 mt-1 tracking-widest">Exp : +{DIFFICULTY_REWARDS[quest.difficulty as keyof typeof DIFFICULTY_REWARDS].exp} XP</p>
            <p className="text-[10px] font-black text-yellow-600 uppercase mb-2 mt-1 tracking-widest">Gold : +{DIFFICULTY_REWARDS[quest.difficulty as keyof typeof DIFFICULTY_REWARDS].gold} G</p>
            <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[8px] text-cyan-500 font-bold uppercase tracking-widest">VIEW</p>
            </div>
            </div>
          </div>
          </div>
      ))}
    </div>

    {/* PAGINATION CONTROLS */}
    {quests.length > questsPerPage && (
      <div className="flex justify-center items-center gap-6 pt-8 border-t border-cyan-500/10">
        <button 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
          className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 border transition-all
            ${currentPage === 1 ? 'border-slate-900 text-slate-700 opacity-50' : 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'}
          `}
        >
          {"< Previous"}
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Page</span>
          <span className="text-cyan-400 font-black italic">{currentPage}</span>
          <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">of</span>
          <span className="text-white font-black italic">{Math.ceil(quests.length / questsPerPage)}</span>
        </div>

        <button 
          disabled={currentPage >= Math.ceil(quests.length / questsPerPage)}
          onClick={() => setCurrentPage(prev => prev + 1)}
          className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 border transition-all
            ${currentPage >= Math.ceil(quests.length / questsPerPage) ? 'border-slate-900 text-slate-700 opacity-50' : 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'}
          `}
        >
          {"Next >"}
        </button>
      </div>
    )}

    {/* MODAL 1: CREATE NEW QUEST (Pop-up Transparan Blur) */}
    {isAddingQuest && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4animate-in fade-in zoom-in duration-300">
        <div className="bg-cyan-950/20 border-2 border-cyan-500/50 backdrop-blur-md p-1 rounded-sm animate-in zoom-in duration-300 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          <div className="border border-cyan-500/30 p-6 min-w-[300px] relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
             <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
            <div className="flex justify-between items-center">
              <h2 className="text-cyan-400 font-black italic tracking-[0.4em] uppercase text-xl">[ NEW QUEST ]</h2>
              <button onClick={() => setIsAddingQuest(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Quest Name</label>
              <input 
                type="text" value={newQuestTitle} onChange={(e) => setNewQuestTitle(e.target.value)}
                placeholder="Enter quest name..."
                className="w-full bg-black/60 border border-slate-700 p-2 text-white font-bold outline-none focus:border-cyan-500 transition-all italic"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-1">Difficulty</label>
              {/* Flex Container untuk membagi dua sisi: Kiri (Tombol) & Kanan (Info Reward) */}
              <div className="flex gap-6 items-start">
              <div className="flex flex-col gap-2 w-1/3">
                {['easy', 'normal', 'hard', 'very hard', 'special'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setNewQuestDifficulty(level)}
                    className={`py-2 text-[11px] text-left font-black uppercase p-1 tracking-tighter transition-all
                      ${newQuestDifficulty === level ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_cyan]' : 'bg-transparent border-slate-800 text-slate-500'}
                    `}
                  >
                    {level}
                  </button>
                ))}
              </div>
              {/* SISI KANAN: Panel Info Reward Dinamis */}
    <div className="w-2/3 bg-cyan-950/20 border border-cyan-500/20 p-4 rounded-sm self-stretch flex flex-col justify-center relative overflow-hidden group">
      {/* Background Decor */}
      <div className="flex flex-col top-0 text-center p-1">
        <h1 className="text-4xl font-black text-slate-400 tracking-tighter">REWARD</h1>
      </div>

      <div className="flex flex-col z-10 space-y-4">
        <div>
          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Estimated EXP</p>
          <p className="text-xl text-cyan-400 font-black italic tracking-tighter">
            +{DIFFICULTY_REWARDS[newQuestDifficulty as keyof typeof DIFFICULTY_REWARDS].exp} XP
          </p>
        </div>
        
        <div className="h-[1px] w-full bg-gradient-to-r from-cyan-500/50 to-transparent"></div>

        <div>
          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Gold Reward</p>
          <p className="text-xl text-amber-500 font-black italic tracking-tighter">
            +{DIFFICULTY_REWARDS[newQuestDifficulty as keyof typeof DIFFICULTY_REWARDS].gold} G
          </p>
        </div>
      </div>
      
      {/* Dekorasi Pojok Bawah */}
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/40"></div>
    </div>
            </div>
            </div>
            <button 
              onClick={() => addCustomQuest(newQuestTitle, newQuestDifficulty)}
              className="text-[10px] font-black text-cyan-400 border border-cyan-500/30 px-6 py-2 hover:bg-cyan-500/10 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
            >
              Add Quest
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL 2: DETAIL QUEST VIEW */}
    {selectedQuest && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4animate-in fade-in duration-300">
        <div className="bg-cyan-950/20 border-2 border-cyan-500/50 backdrop-blur-md p-1 rounded-sm animate-in zoom-in duration-300 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          <div className='border border-cyan-500/30 p-6 min-w-[300px] relative overflow-hidden'>
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
          <div className="absolute top-0 right-0 p-4">
             <button onClick={() => setSelectedQuest(null)} className="text-slate-500 hover:text-white"><X size={24} /></button>
          </div>
          <div className="text-center space-y-6">
            <h4 className="text-cyan-400 font-black italic tracking-[0.3em] uppercase text-sm">[ QUEST INFO ]</h4>
            <h2 className="text-white text-2xl font-black italic uppercase tracking-widest">{selectedQuest.title}</h2>
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-cyan-500/10">
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Exp Rewards</p>
                <p className="text-cyan-400 font-black text-sm">+{DIFFICULTY_REWARDS[selectedQuest.difficulty as keyof typeof DIFFICULTY_REWARDS].exp} XP</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Gold Rewards</p>
                <p className="text-amber-500 font-black text-sm">+{DIFFICULTY_REWARDS[selectedQuest.difficulty as keyof typeof DIFFICULTY_REWARDS].gold} G</p>
              </div>
            </div>
            {!selectedQuest.is_completed && (
              <button 
                onClick={() => { completeQuest(selectedQuest); setSelectedQuest(null); }}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-black py-4 uppercase tracking-widest text-xs transition-all"
              >
                Complete Quest
              </button>
            )}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)}

            {activeTab === 'Inventory' && (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* HEADER & TOMBOL ADD */}
    <div className="flex justify-between items-center border-b border-cyan-500/20 pb-4">
    <div>
      <h2 className="text-xl font-black uppercase tracking-widest text-white">Inventory</h2>
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
        Tempat Dimana Anda Meletekkan Apa Yang Sudah Anda Beli/Dapat
      </p>
    </div>
      <button 
        onClick={() => setIsAddingItem(true)}
        className="text-[10px] font-black text-cyan-400 border border-cyan-500/30 px-6 py-2 hover:bg-cyan-500/10 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
      >
        New Item
      </button>
    </div>
    {/* Modal Add Item */}
{isAddingItem && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4animate-in fade-in zoom-in duration-300">
        <div className="bg-cyan-950/20 w-full max-w-md space-y-6 border-2 border-cyan-500/50 backdrop-blur-md p-1 rounded-sm animate-in zoom-in duration-300 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          <div className="border border-cyan-500/30 p-6 min-w-[300px] relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
             <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
      <h3 className="text-cyan-400 font-black italic uppercase tracking-[0.3em] space-y-4 text-sm">Add New Item</h3>
      
      <div className="space-y-4">
        <input 
          placeholder="Item Name" 
          className="w-full bg-black/60 border border-slate-800 p-3 text-xs text-white focus:border-cyan-500 outline-none"
          onChange={(e) => setNewItem({...newItem, name: e.target.value})}
        />
        <input 
          placeholder="Brand" 
          className="w-full bg-black/60 border border-slate-800 p-3 text-xs text-white focus:border-cyan-500 outline-none"
          onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
        />
        <input 
          //type="number" 
          placeholder="Price (Rupiah)" 
          className="w-full bg-black/60 border border-slate-800 p-3 text-xs text-green-500 font-bold focus:border-amber-500 outline-none"
          onChange={(e) => setNewItem({...newItem, price: e.target.value})}
        />
        
        {/* Bagian Input File */}
<input 
  type="file" 
  accept="image/*" 
  id="file-upload"
  className="hidden"
  onChange={(e) => {
    if (e.target.files && e.target.files[0]) {
      setItemFile(e.target.files[0]); // Ini yang mengisi state itemFile
    }
  }} 
/>
<label htmlFor="file-upload" className="cursor-pointer bg-slate-900 p-4 border-2 border-dashed border-slate-700 block text-center uppercase text-[10px] font-bold">
  {itemFile ? itemFile.name : "Click to Scan Item Image"}
</label>
      </div>
<div className='space-y-4'></div>
      <div className="flex gap-3">
        <button onClick={() => setIsAddingItem(false)} className="flex-1 border border-slate-800 py-3 text-[9px] text-slate-500 font-black uppercase">Cancel</button>
        <button onClick={saveInventoryItem} disabled={uploading} className="flex-1 bg-cyan-600 text-black py-3 text-[9px] font-black uppercase">
          {uploading ? "Analyzing..." : "Confirm"}
        </button>
      </div>
      </div>
    </div>
  </div>
)}
{selectedItem && (
   <div className="fixed inset-0 z-[200] flex items-center justify-center p-4animate-in fade-in zoom-in duration-300">
        <div className="bg-cyan-950/20 w-full max-w-md space-y-6 border-2 border-cyan-500/50 backdrop-blur-md p-1 rounded-sm animate-in zoom-in duration-300 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          <div className="border border-cyan-500/30 p-6 min-w-[300px] relative overflow-hidden">
             <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
             <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400 group-hover:border-cyan-400"></div>
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400 group-hover:border-cyan-400"></div>
      {/* Tombol Close */}
      {/* <button 
        onClick={() => setSelectedItem(null)}
        className="absolute top-4 right-4 text-slate-500 hover:text-cyan-500 font-black"
      >
        x
      </button> */}
      {/* <button type="button" className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
  <span className="sr-only">Close menu</span>
  
  <svg className="h-6 w-6" xmlns="http://www.w3.org" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button> */}

      {/* Gambar Item */}
      <div className="aspect-[4/3] size-sm bg-slate-900 border border-slate-800 overflow-hidden">
        <img 
          src={selectedItem.image_url} 
          alt={selectedItem.name} 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info Detail */}
      <div className="space-y-2">
        <h2 className="text-2xl text-cyan-300 font-black uppercase">{selectedItem.name}</h2>
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{selectedItem.brand}</p>
        <div className="flex justify-between items-center pt-4 border-t border-slate-800">
          <span className="text-[12px] text-yellow-500 font-bold uppercase">Price</span>
          <span className="text-green-500 font-black italic">Rp. {Number(selectedItem.price || 0).toLocaleString()}</span>
        </div>
        {/* Di dalam Modal selectedItem, di bawah bagian Price */}
<div className="flex flex-col gap-2 mt-6">
  {/* Tombol Delete (Dismantle) */}
  <button 
    onClick={() => setItemToDelete(selectedItem)}
    disabled={loading}
    className="w-full bg-rose-900/50 border border-rose-900/50 hover:bg-rose-950/30 text-rose-500 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
  >
    {loading ? "PROCESSING..." : "Delete Item"}
  </button>
  {/* Tombol Close */}
 <button 
    onClick={() => setSelectedItem(null)}
    className="w-full bg-white text-black py-3 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-cyan-500 transition-all"
  >
    Close Information
  </button>
</div>
      </div>
      </div>
    </div>
  </div>
)}
    {/* GRID INVENTORY */}
    <div className="grid grid-cols-2 rounded md:grid-cols-3 lg:grid-cols-4 gap-4">
      {currentItems.map((item) => (
        <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-slate-950/40 rounded border border-slate-800 p-1 group hover:border-cyan-500/50 transition-all relative overflow-hidden">
          {/* Gambar Produk */}
          <div className="aspect-[4/3] bg-black/40 overflow-hidden rounded relative">
            <img 
              src={item.image_url || 'https://via.placeholder.com/300'} 
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-duration-500"
            />
            {/* <div className="absolute top-0 right-0 p-2 bg-black/80 text-[8px] text-amber-500 font-bold">
              {(item.price).toLocaleString()} G
            </div> */}
          </div>

          {/* Info Produk */}
          <div className="p-3 space-y-1">
            <h4 className="text-white font-black uppercase text-[10px] truncate">{item.name}</h4>
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">{item.brand}</p>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Rp. {Number(item.price || 0).toLocaleString()}</p>
          </div>
          
          {/* Dekorasi Pojok */}
          <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-slate-700 group-hover:border-cyan-500"></div>
        </div>
      ))}
    </div>

    {/* PAGINATION (Setiap 8 Kartu) */}
     {inventory.length > inventoryPerPage && (
      <div className="flex justify-center items-center gap-6 pt-8 border-t border-cyan-500/10">
        <button 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
          className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 border transition-all
            ${currentPage === 1 ? 'border-slate-900 text-slate-700 opacity-50' : 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'}
          `}
        >
          {"< Previous"}
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Page</span>
          <span className="text-cyan-400 font-black italic">{currentPage}</span>
          <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">of</span>
          <span className="text-white font-black italic">{Math.ceil(inventory.length / inventoryPerPage)}</span>
        </div>

        <button 
          disabled={currentPage >= Math.ceil(inventory.length / inventoryPerPage)}
          onClick={() => setCurrentPage(prev => prev + 1)}
          className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 border transition-all
            ${currentPage >= Math.ceil(inventory.length / inventoryPerPage) ? 'border-slate-900 text-slate-700 opacity-50' : 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'}
          `}
        >
          {"Next >"}
        </button>
      </div>
    )}
  </div>
)}

            {activeTab === 'Settings' && (
  <div className="max-w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="p-8 bg-slate-900/10 border border-slate-900 rounded-3xl space-y-10">
      
      {/* HEADER SETTINGS */}
      <div className="border-l-2 border-cyan-500 pl-4">
        <h3 className="text-white font-black italic uppercase tracking-[0.3em] text-sm">System Settings</h3>
        <p className="text-[10px] text-slate-500 uppercase mt-1">Modify your identity and appearance</p>
      </div>

      {/* SECTION 1: PHOTO PROFILE */}
      <div className="space-y-6">
        <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] block">User Image</label>
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Avatar Preview */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl bg-black border-2 border-slate-800 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <img 
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
                  <Loader2 className="animate-spin text-cyan-500 mb-2" size={24} />
                  <span className="text-[8px] text-cyan-500 font-bold animate-pulse uppercase">Uploading</span>
                </div>
              )}
            </div>
            {/* Hover Overlay */}
            {!uploading && (
              <label className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-all cursor-pointer flex items-center justify-center rounded-3xl">
                <Camera className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={uploadAvatar} 
                  disabled={uploading} 
                />
              </label>
            )}
          </div>

          <div className="flex-1 space-y-2 text-center md:text-left">
            <p className="text-white font-bold text-xs uppercase tracking-widest">Upload Custom Photo</p>
            <p className="text-[10px] text-slate-500 italic leading-relaxed max-w-xs">
              Recommended: Square image (1:1), max 2MB. Your photo will be visible to other users in the network.
            </p>
            <label className="inline-block mt-4 cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-800 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all">
              {uploading ? 'Processing...' : 'Select File'}
              <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 2: IDENTITY INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-900/50">
        
        {/* EDIT DISPLAY NAME */}
        <div className="space-y-4">
          <label className="text-[9px] text-cyan-500 font-black uppercase tracking-[0.2em] block">Display Name</label>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Enter new nickname..."
              defaultValue={profile?.display_name}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-black border border-slate-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
            />
          </div>
        </div>
        {/* BARU: Input Role */}
      <div className="space-y-4">
        <label className="text-[9px] text-cyan-500 font-black uppercase tracking-[0.2em] block">Player Role / Class</label>
        <input 
          type="text"  
          placeholder="Masukkan Role/Pekerjaan..."
          defaultValue={profile?.role}
          onChange={(e) => setNewRole(e.target.value)}
          className="w-full bg-black border border-slate-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
        />
      </div>
            
      </div>

            {/* Tombol Simpan */}
            <div className='flex gap-4'>
            <button 
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-1/2 bg-cyan-600 hover:bg-cyan-500 text-black font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : 'Change Username'}
            </button>
            <button 
              onClick={handleUpdateRole}
              disabled={loading}
              className="w-1/2 bg-cyan-600 hover:bg-cyan-500 text-black font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : 'Update ROLE'}
            </button>
            </div>

      {/* DANGER ZONE */}
      <div className="pt-10 border-t border-slate-900/50 flex flex-col items-center">
        <p className="text-[9px] text-red-900/50 font-black uppercase tracking-[0.4em] mb-4">Danger Zone</p>
        <button 
          onClick={() => { if(confirm("Terminate hunter account permanently?")) handleLogout() }}
          className="text-[9px] text-slate-800 hover:text-red-600 font-black uppercase tracking-widest transition-all hover:tracking-[0.3em]"
        >
          Terminate Hunter Contract
        </button>
      </div>

    </div>
  </div>
)}
          </div>
        </div>
      </main>

      {/* MOBILE TRIGGER */}
      {/* <button 
        onClick={() => setIsSideBarOpen(!isSideBarOpen)} 
        className="md:hidden fixed bottom-8 right-8 z-50 p-5 bg-cyan-600 text-black rounded-full"
      >
        {isSideBarOpen ? <X size={24} /> : <Menu size={24} />}
      </button> */}
      {itemToDelete && (
  <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
    <div className="bg-slate-950 border-2 border-rose-500/50 p-8 w-full max-w-sm relative overflow-hidden">
      {/* Dekorasi Bahaya */}
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-rose-500/10 rotate-45 pointer-events-none"></div>
      
      <div className="space-y-6 relative">
        <div className="space-y-2">
          <h3 className="text-rose-500 font-black italic uppercase tracking-[0.3em] text-xs">Warning: Dismantle</h3>
          <p className="text-white text-sm font-bold uppercase tracking-widest">
            Dismantle {itemToDelete.name}?
          </p>
          <p className="text-[9px] text-slate-500 uppercase leading-relaxed">
            This action will permanently erase the item from the system storage.
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setItemToDelete(null)} 
            className="flex-1 border border-slate-800 py-3 text-[9px] text-slate-500 font-black uppercase hover:bg-white/5 transition-all"
          >
            Abort
          </button>
          <button 
            onClick={() => {
              deleteInventoryItem(itemToDelete);
              setItemToDelete(null);
            }} 
            className="flex-1 bg-rose-600 text-white py-3 text-[9px] font-black uppercase hover:bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all"
          >
            Confirm
          </button>
        </div>
      </div>
      
      {/* Corner Trim */}
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-rose-500/50"></div>
    </div>
  </div>
)}
      {/* SOLO LEVELING STYLE NOTIFICATION */}
{systemMsg && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none p-4">
    <div className="bg-cyan-950/20 border-2 border-cyan-500/50 backdrop-blur-md p-1 rounded-sm animate-in zoom-in duration-300 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
      <div className="border border-cyan-500/30 p-6 min-w-[300px] relative overflow-hidden">
        {/* Dekorasi Garis Khas System */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400"></div>

        <div className="text-center">
          <h4 className="text-cyan-400 font-black italic tracking-[0.3em] uppercase text-sm mb-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
            [ {systemMsg.title} ]
          </h4>
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-4"></div>
          <p className="text-white text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            {systemMsg.desc}
          </p>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

function StatRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-900/50 pb-3">
      <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{label}</span>
      <span className="text-white font-black italic">{value}</span>
    </div>
  );
}

function QuestCard({ title, desc, exp, gold, onComplete }: any) {
  const [done, setDone] = useState(false);
  const handleAction = () => {
    setDone(true);
    onComplete();
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <div className="p-6 bg-slate-900/10 border border-slate-900 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 group hover:border-cyan-500/20 transition-all">
      <div className="flex-1">
        <h4 className="text-white font-bold italic uppercase tracking-wider mb-1">{title}</h4>
        <p className="text-slate-500 text-[10px] italic">{desc}</p>
        <div className="flex gap-4 mt-4 font-black text-[8px]">
          <span className="text-emerald-500">+{exp} EXP</span>
          <span className="text-amber-500">+{gold} GOLD</span>
        </div>
      </div>
      <button 
        onClick={handleAction} disabled={done} 
        className={`w-full md:w-auto px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
          ${done ? 'bg-emerald-500/20 text-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500 text-black'}
        `}
      >
        {done ? <CheckCircle2 size={16} className="mx-auto" /> : 'Execute'}
      </button>
    </div>
  );
}