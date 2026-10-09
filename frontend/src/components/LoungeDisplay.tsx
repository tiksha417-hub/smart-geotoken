import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useQueue } from '../context/QueueContext';
import {
  Clock,
  Volume2,
  Sparkles,
  Building,
} from 'lucide-react';
import { formatDistance } from '../utils/geofence';

export const LoungeDisplay: React.FC = () => {
  const { selectedBranch, tokens, recallToken } = useQueue();

  const [currentTime, setCurrentTime] = useState<string>('');
  const qrCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Update live clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate walk-in scan QR
  useEffect(() => {
    if (!qrCanvasRef.current) return;
    QRCode.toCanvas(
      qrCanvasRef.current,
      window.location.href,
      {
        width: 110,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      () => {}
    );
  }, []);

  // Filter tokens for this branch
  const branchTokens = tokens.filter((t) => t.branchId === selectedBranch.id);

  // Currently called or serving tokens (Active Counter board)
  const activeServingTokens = branchTokens
    .filter((t) => t.status === 'called' || t.status === 'in_service')
    .sort((a, b) => {
      const timeA = new Date(a.calledAt || a.createdAt).getTime();
      const timeB = new Date(b.calledAt || b.createdAt).getTime();
      return timeB - timeA;
    });

  // Upcoming waiting tokens
  const upcomingTokens = branchTokens
    .filter((t) => t.status === 'waiting')
    .slice(0, 6);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 flex flex-col justify-between min-h-[600px]">
      
      {/* Top Lounge TV Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {selectedBranch.name}
            </h1>
            <p className="text-xs text-blue-400 font-medium">
              Geofence Protected Smart Queue Display • Radius: {formatDistance(selectedBranch.geofenceRadiusMeters)}
            </p>
          </div>
        </div>

        {/* Live Digital Clock */}
        <div className="flex items-center gap-4 bg-slate-900 px-5 py-3 rounded-2xl border border-slate-800">
          <Clock className="w-5 h-5 text-cyan-400" />
          <span className="font-mono text-xl sm:text-2xl font-bold text-white tracking-widest">
            {currentTime || '12:00:00 PM'}
          </span>
        </div>
      </div>

      {/* Main Screen: Now Serving vs Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 flex-grow">
        
        {/* Left Column: Big "Now Serving" Board */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h2 className="text-lg font-black tracking-wider uppercase text-emerald-400">
                  Now Serving
                </h2>
              </div>
              <span className="text-xs text-slate-400">Proceed to Counter when announced</span>
            </div>

            {activeServingTokens.length === 0 ? (
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-12 text-center text-slate-500">
                <p className="text-xl font-bold text-slate-400">All Counters Ready</p>
                <p className="text-sm text-slate-500 mt-2">Next ticket will appear here when called</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeServingTokens.map((t, idx) => {
                  const isLatestCalled = idx === 0;
                  return (
                    <div
                      key={t.id}
                      className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                        isLatestCalled
                          ? 'bg-gradient-to-br from-blue-950/80 via-indigo-950/60 to-slate-900 border-blue-400/60 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/40'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                          Ticket Number
                        </span>
                        {isLatestCalled && (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            <span>JUST CALLED</span>
                          </span>
                        )}
                      </div>

                      <div className="my-4 text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-cyan-300 tracking-tight">
                        {t.tokenNumber}
                      </div>

                      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500 block uppercase font-medium">Destination</span>
                          <span className="text-lg font-bold text-amber-300">
                            {t.assignedCounter || 'Counter Desk'}
                          </span>
                        </div>

                        <button
                          onClick={() => recallToken(t.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Trigger chime announcement"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Queue List */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Next in Line
              </h3>
              <span className="text-xs text-blue-400 font-semibold">
                {upcomingTokens.length} Queued
              </span>
            </div>

            <div className="space-y-2.5">
              {upcomingTokens.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  No upcoming tickets waiting
                </div>
              ) : (
                upcomingTokens.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-bold text-slate-500">
                        #{idx + 1}
                      </span>
                      <span className="font-mono font-bold text-base text-white">
                        {t.tokenNumber}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-amber-300 font-medium block">
                        ~{(idx + 1) * 4}m wait
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize">
                        {t.priority.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Walk-In Scanner Promo */}
          <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="p-1 bg-white rounded-lg shrink-0">
              <canvas ref={qrCanvasRef} className="w-[60px] h-[60px]" />
            </div>
            <div className="text-xs text-slate-400">
              <strong className="text-white block font-semibold">Scan with Smartphone</strong>
              <span>Generate your pass instantly while in the lounge perimeter.</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div>
          <span>Audio Announcement System: </span>
          <span className="text-emerald-400 font-medium">Online & Armed</span>
        </div>
        <div className="text-slate-500">
          GeoToken™ Public Lounge Display • Auto-refreshes in real-time
        </div>
      </div>

    </div>
  );
};
