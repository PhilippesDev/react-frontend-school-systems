import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  School,
  Sliders,
  Calendar,
  CreditCard,
  ClipboardCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'eleves', label: 'Élèves', icon: GraduationCap, path: '/eleves' },
    { id: 'classes', label: 'Classes', icon: School, path: '/classes' },
    { id: 'options', label: 'Options', icon: Sliders, path: '/options' },
    { id: 'cours', label: 'Cours', icon: BookOpen, path: '/cours' },
    { id: 'presence', label: 'Présences', icon: Users, path: '/presence' },
    { id: 'annee', label: 'Année Scolaire', icon: Calendar, path: '/annees-scolaires' },
    { id: 'paiements', label: 'Paiements', icon: CreditCard, path: '/paiements' },
    { id: 'cotations', label: 'Cotations', icon: ClipboardCheck, path: '/cotations' },
  ];

  return (
    <div
      className={`relative h-screen flex-shrink-0 flex flex-col justify-between bg-[#0f0f16] text-[#a0a0b0] border-r border-[#1f1f2e] transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        <div className="flex items-center justify-between h-20 px-4 border-b border-[#1f1f2e]">
          {!isCollapsed && (
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">cl</div>
              <span className="text-white font-semibold text-lg tracking-wide whitespace-nowrap">Code legacy</span>
            </div>
          )}

          {isCollapsed && (
            <div className="mx-auto w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">cl</div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`absolute top-6 -right-3 bg-[#1f1f2e] text-white p-1 rounded-full border border-[#2f2f45] hover:bg-green-600 transition-colors duration-200`}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="mt-6 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-4 py-3 rounded-xl transition-all duration-200 relative group ${
                    isCollapsed ? 'justify-center px-0' : 'px-4'
                  } ${isActive ? 'bg-[#1e1e2f] text-white font-medium' : 'hover:bg-[#141420] hover:text-white'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-green-500 rounded-r" />}

                    <Icon size={20} className={isActive ? 'text-green-400' : 'text-[#787890] group-hover:text-white'} />

                    {!isCollapsed && <span className="text-sm tracking-wide whitespace-nowrap">{item.label}</span>}

                    {isCollapsed && (
                      <div className="absolute left-24 bg-[#1e1e2f] text-white text-xs px-3 py-2 rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap border border-[#2f2f45]">
                        {item.label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="px-3 mb-6 space-y-2">

        <div className="h-[1px] bg-[#1f1f2e] my-2" />

        <div className={`flex items-center gap-3 p-2 rounded-xl bg-[#141420] ${isCollapsed ? 'justify-center' : ''}`}>
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120"
            alt="User Avatar"
            className="w-9 h-9 rounded-full object-cover border border-[#2f2f45]"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 overflow-hidden">
              <span className="text-sm text-white font-medium truncate">M. Philippe</span>
              <span className="text-xs text-[#787890] truncate">Directeur</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;