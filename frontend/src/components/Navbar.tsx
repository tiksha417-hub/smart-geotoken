import React from 'react';
import { useQueue } from '../context/QueueContext';
import type { AppViewMode } from '../types';
import {
  Navigation,
  Shield,
  Tv,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  LocateFixed,
  Lock,
} from 'lucide-react';
import { formatDistance } from '../utils/geofence';

export const Navbar: React.FC = () => {
  const {
    activeViewMode,
    setActiveViewMode,
    geofenceEval,
    selectedBranch,
    soundEnabled,
    setSoundEnabled,
    resetAllTokens,
    isRealGpsActive,
    adminAuthenticated,
  } = useQueue();

  const navItems: { mode: AppViewMode; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      mode: 'customer',
      label: 'Customer Self-Service',
      icon: <Navigation className="w-4 h-4" />,
      badge: 'Mobile App',
    },
    {
      mode: 'staff',
      label: 'Staff Desk Console',
      icon: <Shield className="w-4 h-4" />,
      badge: 'Operator',
    },
    {
      mode: 'display',
      label: 'Lounge Board TV',
      icon: <Tv className="w-4 h-4" />,
      badge: 'Live',
    },
    {
      mode: 'admin',
      label: 'Admin Portal',
      icon: <Lock className="w-4 h-4" />,
      badge: adminAuthenticated ? 'Unlocked' : 'Protected',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 shadow-lg shadow-blue-500/20">
              <LocateFixed className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">GeoToken</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                  Smart Perimeter
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Location-Verified Queue & Smart Token Management
              </p>
            </div>
          </div>

          {/* Persona Switcher Tabs */}
          <nav className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800" aria-label="Role Switcher">
            {navItems.map((item) => {
              const isActive = activeViewMode === item.mode;
              return (
                <button
                  key={item.mode}
                  onClick={() => setActiveViewMode(item.mode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  aria-pressed={isActive}
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">{item.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Geofence Status Pill */}
            <div
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                geofenceEval.isWithin
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
              }`}
              title={`${selectedBranch.name}: ${formatDistance(geofenceEval.distanceMeters)} away`}
            >
              {geofenceEval.isWithin ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>In Geofence ({formatDistance(geofenceEval.distanceMeters)})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Outside Perimeter ({formatDistance(geofenceEval.distanceMeters)})</span>
                </>
              )}
              {isRealGpsActive && (
                <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1 rounded uppercase">
                  Real GPS
                </span>
              )}
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute announcement chimes' : 'Enable announcement chimes'}
              aria-label={soundEnabled ? 'Mute chimes' : 'Enable chimes'}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Reset Demo State */}
            <button
              onClick={resetAllTokens}
              title="Reset sample queue to initial demo state"
              aria-label="Reset demo state"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-300 transition-colors border border-slate-700/60"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
