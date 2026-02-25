"use client";

import React, { useState } from 'react';
import { 
  Menu, X, Shield, Sword, Scroll, Settings, 
  LogOut, Wallet, ChevronRight, Plus, Camera 
} from 'lucide-react';

export default function Home() {
  const [isSideBarOpen, setIsSideBarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Status');

  // Dummy Data (Nanti kita hubungkan ke Supabase)
  const stats = {
    level: 1,
    exp: 200,
    maxExp: 1000,
    gold: "150,000",
    rank: "E",
    role: "Shadow Monarch",
    username: "jinwoo_monarch",
    displayName: "SUNG JIN-WOO"
  };

  const expPercentage = (stats.exp / stats.maxExp) * 100;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 flex flex-col md:flex-row font-sans">
      
      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden flex items-center justify-between p-4 bg-black border-b border-slate-900 sticky top-0 z-50">
        <span className="font-bold tracking-tighter text-cyan-500 uppercase">System Menu</span>
        <button onClick={() => setIsSideBarOpen(!isSideBarOpen)} className="p-2 text-white">
          {isSideBarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- SIDEBAR (IDENTITAS HUNTER) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-black border-r border-slate-900 transition-transform duration-300
        md:translate-x-0 md:static
        ${isSideBarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-full flex flex-col p-8">
          
          {/* Foto Profile Besar */}
          <div className="flex flex-col items-start mb-8">
            <div className="w-44 h-44 rounded-full border-4 border-slate-800 overflow-hidden mb-6 bg-slate-900">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jinwoo" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Nama & Username */}
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight italic leading-none">
                {stats.displayName}
              </h2>
              <p className="text-sm font-medium text-slate-500">@{stats.username}</p>
            </div>

            {/* Stats Dasar */}
            <div className="w-full space-y-3 text-[12px] font-black uppercase tracking-[0.1em]">
              <div className="flex justify-between items-center text-purple-400">
                <span>Role</span>
                <span className="italic">{stats.role}</span>
              </div>
              <div className="flex justify-between items-center text-slate-100">
                <span>Rank</span>
                <span>{stats.rank}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 text-sm">
                <span>Level</span>
                <span className="text-xl italic">{stats.level}</span>
              </div>
              
              {/* EXP BAR DENGAN TEXT */}
              <div className="pt-2">
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-cyan-500 italic uppercase">Experience</span>
                  <span className="text-slate-400 font-mono tracking-normal">
                    {stats.exp} / {stats.maxExp}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-800 p-[1px]">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-all duration-1000" 
                    style={{ width: `${expPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center text-amber-500 pt-2 border-t border-slate-900 mt-4">
                <span>Gold</span>
                <span className="text-lg italic font-black">{stats.gold} G</span>
              </div>
            </div>
          </div>

          {/* System Navigation (Bottom) */}
          <div className="mt-auto space-y-2 pt-6 border-t border-slate-900">
            <button 
              onClick={() => {setActiveTab('Settings'); setIsSideBarOpen(false);}}
              className="flex items-center gap-3 w-full px-2 py-2 text-slate-400 hover:text-white transition-colors group"
            >
              <Settings size={18} className="group-hover:rotate-90 transition-transform" /> 
              <span className="text-xs uppercase font-bold tracking-widest">Settings</span>
            </button>
            <button className="flex items-center gap-3 w-full px-2 py-2 text-slate-600 hover:text-red-500 transition-colors">
              <LogOut size={18} /> 
              <span className="text-xs uppercase font-bold tracking-widest">Disconnect</span>
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-6 md:p-14 overflow-y-auto bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
           
           {/* TAB NAVIGATION (Menu di Tengah) */}
           <div className="flex flex-wrap gap-6 md:gap-12 mb-12 border-b border-slate-900/50 pb-4 overflow-x-auto no-scrollbar">
              {['Status', 'Inventory', 'Quests', 'Finansial'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm md:text-lg font-black uppercase tracking-[0.2em] italic whitespace-nowrap transition-all
                    ${activeTab === tab ? 'text-cyan-500 border-b-2 border-cyan-500 pb-4 -mb-[18px]' : 'text-slate-600 hover:text-slate-400'}
                  `}
                >
                  {tab}
                </button>
              ))}
           </div>

           {/* CONTENT RENDERER */}
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* STATUS TAB */}
              {activeTab === 'Status' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-900/10 border border-slate-900 p-8 rounded-3xl">
                    <h3 className="text-cyan-500 font-bold uppercase text-xs mb-6 italic tracking-[0.3em]">Player Statistics</h3>
                    <div className="space-y-6">
                       <StatRow label="Strength (Kekuatan)" value="12" />
                       <StatRow label="Agility (Kecepatan)" value="15" />
                       <StatRow label="Intelligence (Pintar)" value="10" />
                       <StatRow label="Hobby" value="Coding & Gym" />
                    </div>
                  </div>
                </div>
              )}

              {/* INVENTORY TAB */}
              {activeTab === 'Inventory' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="aspect-square bg-slate-900/20 border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-4 hover:border-cyan-500/50 transition-all group">
                      <Camera className="text-slate-700 group-hover:text-cyan-500 mb-2" size={40} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Sony Alpha A7</span>
                      <span className="text-[10px] text-amber-500">Rp 25.000.000</span>
                   </div>
                   <button className="aspect-square border-2 border-dashed border-slate-900 rounded-2xl flex items-center justify-center text-slate-800 hover:text-cyan-500 hover:border-cyan-500/30 transition-all">
                      <Plus size={32} />
                   </button>
                </div>
              )}

              {/* QUESTS TAB */}
              {activeTab === 'Quests' && (
                <div className="space-y-4">
                   <button className="w-full p-4 border border-dashed border-slate-800 rounded-xl text-slate-600 hover:text-cyan-500 flex items-center justify-center gap-2 mb-4">
                      <Plus size={18} /> <span>Create New Quest</span>
                   </button>
                   <div className="p-6 bg-slate-900/20 border border-slate-800 rounded-2xl flex justify-between items-center group cursor-pointer hover:bg-slate-900/40 transition-all">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] bg-cyan-500 text-black px-2 py-0.5 font-black uppercase">Daily</span>
                          <h4 className="text-white font-bold uppercase italic tracking-wider">Morning Run</h4>
                        </div>
                        <p className="text-slate-500 text-xs">Complete 5km run to gain 50 EXP and 100 Gold</p>
                      </div>
                      <ChevronRight className="text-slate-700 group-hover:text-cyan-500" />
                   </div>
                </div>
              )}

              {/* FINANSIAL TAB */}
              {activeTab === 'Finansial' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl">
                      <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em] mb-2">Income</p>
                      <p className="text-2xl font-black text-white italic">Rp 5.000.000</p>
                   </div>
                   <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
                      <p className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] mb-2">Expense</p>
                      <p className="text-2xl font-black text-white italic text-red-200">Rp 1.250.000</p>
                   </div>
                   <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl">
                      <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mb-2">Balance</p>
                      <p className="text-2xl font-black text-white italic text-amber-200 text-yellow-500">Rp 3.750.000</p>
                   </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'Settings' && (
                <div className="max-w-md bg-slate-900/20 border border-slate-800 p-8 rounded-3xl">
                   <h3 className="text-white font-bold uppercase mb-8 italic text-lg flex items-center gap-3">
                      <div className="w-1 h-6 bg-cyan-500"></div> System Configuration
                   </h3>
                   <div className="space-y-6">
                      <div className="group">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-2 group-focus-within:text-cyan-500 transition-colors">Change Hunter Name</label>
                        <input type="text" placeholder="Sung Jin-Woo" className="w-full bg-black border border-slate-800 rounded-xl p-4 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                      </div>
                      <div className="group">
                        <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-2 group-focus-within:text-cyan-500 transition-colors">Change Username</label>
                        <input type="text" placeholder="jinwoo_monarch" className="w-full bg-black border border-slate-800 rounded-xl p-4 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all font-mono" />
                      </div>
                      <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-black py-4 rounded-xl text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)]">
                        Sync Changes to System
                      </button>
                   </div>
                </div>
              )}
           </div>
        </div>
      </main>

      {/* Overlay Mobile */}
      {isSideBarOpen && (
        <div className="fixed inset-0 bg-black/90 z-30 md:hidden" onClick={() => setIsSideBarOpen(false)} />
      )}
    </div>
  );
}

// Sub-component untuk baris statistik
function StatRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center group cursor-default">
      <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest group-hover:text-cyan-400 transition-colors">{label}</span>
      <span className="text-white font-black italic border-b border-slate-800 pb-1 min-w-[40px] text-right group-hover:border-cyan-500 transition-colors">{value}</span>
    </div>
  );
}