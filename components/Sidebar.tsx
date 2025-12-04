import React from 'react';
import { LayoutDashboard, Search, Layers, Heart, Settings, Zap, LogOut } from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen, setIsOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'research', label: 'Research', icon: Search },
    { id: 'batch', label: 'Batch Analysis', icon: Layers },
    { id: 'watchlist', label: 'Watchlist', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
        {/* Mobile Overlay */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsOpen(false)}
            />
        )}

        {/* Sidebar */}
        <div className={`fixed top-0 left-0 h-full bg-slate-900 border-r border-slate-800 w-64 transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className="p-6 border-b border-slate-800 flex items-center gap-2">
                <div className="bg-gradient-to-br from-amz-accent to-orange-600 p-2 rounded-lg">
                    <Zap className="text-white" size={20} fill="currentColor" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Amz<span className="text-amz-accent">Pulse</span></h1>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">v2.0</span>
                </div>
            </div>

            <nav className="p-4 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setView(item.id as ViewMode);
                                setIsOpen(false); // Close on mobile select
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-amz-accent/10 text-amz-accent border border-amz-accent/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <Icon size={18} className={isActive ? 'text-amz-accent' : 'text-slate-500'} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white text-sm font-medium">
                    <LogOut size={18} /> Sign Out
                </button>
            </div>
        </div>
    </>
  );
};

export default Sidebar;