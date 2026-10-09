import React from 'react';
import { QueueProvider, useQueue } from './context/QueueContext';
import { Navbar } from './components/Navbar';
import { BranchSelector } from './components/BranchSelector';
import { GeofenceMap } from './components/GeofenceMap';
import { TokenGenerator } from './components/TokenGenerator';
import { ActiveTokenPass } from './components/ActiveTokenPass';
import { StaffConsole } from './components/StaffConsole';
import { LoungeDisplay } from './components/LoungeDisplay';
import { AdminPortal } from './components/AdminPortal';
import {
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeViewMode, activeCustomerToken, setActiveCustomerToken } = useQueue();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
          
          {/* VIEW MODE: CUSTOMER SELF-SERVICE PORTAL */}
          {activeViewMode === 'customer' && (
            <div className="space-y-8">
              
              {/* Customer Hero Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-slate-800 p-6 sm:p-8">
                <div className="relative z-10 max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Next-Gen Geofencing Queue Management</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                    Smart Token Generation & Digital Queue
                  </h1>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    Generate an instant service token right from your phone. Our smart geofencing
                    technology validates your physical presence in real-time, eliminating physical queues and phantom reservations.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span>1. GPS Perimeter Check</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                        <Ticket className="w-4 h-4" />
                      </div>
                      <span>2. Service & Priority Choice</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <span>3. Live Digital Pass & Audio Call</span>
                    </div>
                  </div>
                </div>

                {/* Decorative background glow */}
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
              </div>

              {/* Branch Selector */}
              <BranchSelector />

              {/* Active Token Switcher Bar (If customer already has an active token) */}
              {activeCustomerToken && (
                <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-600 text-white font-mono font-bold text-sm">
                      {activeCustomerToken.tokenNumber}
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-white block">
                        You have an active token in the queue!
                      </span>
                      <span className="text-xs text-blue-300">
                        Status: <b className="uppercase">{activeCustomerToken.status}</b> • Customer: {activeCustomerToken.customerName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveCustomerToken(null)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700"
                    >
                      Issue Another Token
                    </button>
                  </div>
                </div>
              )}

              {/* 2-Column Responsive Layout: Map & Radar on Left, Generator / Pass on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Geofence Interactive Map & Simulator */}
                <div className="lg:col-span-5 space-y-4">
                  <GeofenceMap />

                  {/* Anti-spoofing info card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-slate-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Geofencing Integrity Engine</span>
                    </div>
                    <p>
                      Each token is digitally stamped with high-accuracy GPS coordinates, distance proof, and an audit verification hash. If a customer leaves the geofence perimeter while waiting, the radar sends an audible proximity alert.
                    </p>
                  </div>
                </div>

                {/* Right Side: Token Generator Wizard or Active Token Pass */}
                <div className="lg:col-span-7">
                  {activeCustomerToken ? (
                    <ActiveTokenPass />
                  ) : (
                    <TokenGenerator />
                  )}
                </div>

              </div>

            </div>
          )}

          {/* VIEW MODE: STAFF DESK CONSOLE */}
          {activeViewMode === 'staff' && (
            <div className="space-y-6">
              <StaffConsole />
            </div>
          )}

          {/* VIEW MODE: PUBLIC LOUNGE DISPLAY BOARD */}
          {activeViewMode === 'display' && (
            <div className="space-y-6">
              <LoungeDisplay />
            </div>
          )}

          {/* VIEW MODE: SECURE ADMIN MASTER PORTAL */}
          {activeViewMode === 'admin' && (
            <div className="space-y-6">
              <AdminPortal />
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="mt-12 bg-slate-950 border-t border-slate-800/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">GeoToken™</span>
            <span>• Geofencing Smart Queue & Token Generation Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-Service Queue Engine</span>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Location-Verified Issuance</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <QueueProvider>
      <MainContent />
    </QueueProvider>
  );
}
