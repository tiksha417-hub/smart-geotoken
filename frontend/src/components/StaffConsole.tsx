import React, { useState, useMemo, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import type { PriorityLevel } from '../types';
import { formatDistance } from '../utils/geofence';
import {
  Bell,
  CheckCircle,
  Clock,
  Sliders,
  Sparkles,
  Users,
  XCircle,
  Volume2,
  ShieldCheck,
  CheckCheck,
  Plus,
  X,
  FileText,
} from 'lucide-react';

export const StaffConsole: React.FC = () => {
  const {
    selectedBranch,
    branchServices,
    tokens,
    callNextToken,
    markServing,
    markCompleted,
    markNoShowAndReallot,
    recallToken,
    updateBranchRadius,
    addCustomService,
  } = useQueue();

  // Dynamic available counters derived from the branch's services
  const availableCounters = useMemo(() => {
    const list = branchServices.flatMap((s) => s.countersAssigned);
    const fallbacks = ['Desk 1', 'Desk 2', 'Window 1', 'Window 2', 'Counter 1'];
    const set = Array.from(new Set([...list, ...fallbacks]));
    return set.length > 0 ? set : ['Desk 1'];
  }, [branchServices]);

  const [activeCounter, setActiveCounter] = useState<string>(availableCounters[0]);
  const [filterServiceId, setFilterServiceId] = useState<string>('all');
  const [radiusSlider, setRadiusSlider] = useState<number>(
    selectedBranch.geofenceRadiusMeters
  );

  // Modal for adding custom service
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState<boolean>(false);
  const [customServiceName, setCustomServiceName] = useState<string>('');
  const [customServiceCode, setCustomServiceCode] = useState<string>('');
  const [customServiceDesc, setCustomServiceDesc] = useState<string>('');
  const [customServiceTime, setCustomServiceTime] = useState<number>(10);
  const [customServiceDocs, setCustomServiceDocs] = useState<string>('');
  const [customServiceCounters, setCustomServiceCounters] = useState<string>('');

  // Keep counter synced when branch changes
  useEffect(() => {
    if (!availableCounters.includes(activeCounter)) {
      setActiveCounter(availableCounters[0]);
    }
  }, [availableCounters, activeCounter]);

  // Sync radius slider when branch changes
  useEffect(() => {
    setRadiusSlider(selectedBranch.geofenceRadiusMeters);
  }, [selectedBranch]);

  // Tokens for current branch
  const branchTokens = tokens.filter((t) => t.branchId === selectedBranch.id);

  // Currently serving or called at THIS active counter
  const currentCounterToken = branchTokens.find(
    (t) => (t.status === 'called' || t.status === 'in_service') && t.assignedCounter === activeCounter
  );

  // Waiting tokens in branch
  const waitingTokens = branchTokens
    .filter((t) => {
      if (t.status !== 'waiting') return false;
      if (filterServiceId !== 'all' && t.serviceId !== filterServiceId) return false;
      return true;
    })
    .sort((a, b) => {
      const rank = (p: PriorityLevel) => {
        if (p === 'vip_priority') return 4;
        if (p === 'senior_disabled') return 3;
        if (p === 'appointment') return 2;
        return 1;
      };
      const rankDiff = rank(b.priority) - rank(a.priority);
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  // Completed or in-service counts
  const completedToday = branchTokens.filter((t) => t.status === 'completed').length;
  const inServiceCount = branchTokens.filter((t) => t.status === 'in_service' || t.status === 'called').length;

  const handleCallNext = () => {
    const serviceFilter = filterServiceId === 'all' ? undefined : filterServiceId;
    callNextToken(activeCounter, serviceFilter);
  };

  const handleRadiusChange = (newVal: number) => {
    setRadiusSlider(newVal);
    updateBranchRadius(selectedBranch.id, newVal);
  };

  const handleCreateCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customServiceName.trim()) return;

    const docs = customServiceDocs
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const counters = customServiceCounters
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    addCustomService({
      branchId: selectedBranch.id,
      name: customServiceName.trim(),
      code: (customServiceCode.trim() || customServiceName.charAt(0)).toUpperCase(),
      description: customServiceDesc.trim() || 'General service counter',
      avgMinutesPerCustomer: customServiceTime || 8,
      iconName: 'FileText',
      colorScheme: 'cyan',
      requiredDocuments: docs.length > 0 ? docs : ['Government Photo ID or Booking Reference'],
      countersAssigned: counters.length > 0 ? counters : [`Desk ${branchServices.length + 1}`],
    });

    setIsAddServiceModalOpen(false);
    setCustomServiceName('');
    setCustomServiceCode('');
    setCustomServiceDesc('');
    setCustomServiceDocs('');
    setCustomServiceCounters('');
  };

  return (
    <div className="space-y-6">
      {/* Top Desk Header & Counter Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              Staff Desk Terminal
            </span>
            <span className="text-xs text-slate-400">• {selectedBranch.name}</span>
          </div>
          <h2 className="text-xl font-bold text-white">Queue Dispatcher & Operator Station</h2>
          <p className="text-xs text-slate-400">Manage queue tickets, summon next customers with voice chime, and configure service desks</p>
        </div>

        {/* Counter Selector Dropdown and Add Service Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <label htmlFor="staff-counter-select" className="text-xs text-slate-400 font-medium">My Desk:</label>
            <select
              id="staff-counter-select"
              value={activeCounter}
              onChange={(e) => setActiveCounter(e.target.value)}
              className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer"
            >
              {availableCounters.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAddServiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Add Service</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block mb-1">Waiting in Line</span>
          <div className="text-2xl font-bold text-blue-400 flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>{waitingTokens.length}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block mb-1">Currently at Desks</span>
          <div className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span>{inServiceCount}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block mb-1">Served Today</span>
          <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <CheckCheck className="w-5 h-5" />
            <span>{completedToday}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block mb-1">Geofence Radius</span>
          <div className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span>{formatDistance(selectedBranch.geofenceRadiusMeters)}</span>
          </div>
        </div>
      </div>

      {/* Active Serving Box vs Call Next Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Active Counter Card */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs uppercase font-bold text-slate-400">
                Current Ticket at {activeCounter}
              </span>
              <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                LIVE
              </span>
            </div>

            {currentCounterToken ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    {currentCounterToken.tokenNumber}
                  </div>
                  <span
                    className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      currentCounterToken.status === 'called'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {currentCounterToken.status === 'called' ? '📢 Called (Awaiting arrival)' : 'In Service'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Customer:</span>
                    <span className="font-semibold text-white">{currentCounterToken.customerName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Phone:</span>
                    <span className="font-semibold text-slate-200">{currentCounterToken.customerPhone}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Priority Tier:</span>
                    <span className="font-semibold text-emerald-400 uppercase">
                      {currentCounterToken.priority.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GPS Proof:</span>
                    <span className="font-semibold text-cyan-300">
                      {currentCounterToken.geofenceVerification.distanceMeters}m at issue
                    </span>
                  </div>
                  {currentCounterToken.purposeNotes && (
                    <div className="pt-2 text-slate-400">
                      <span className="block font-medium text-slate-300">Notes / Reference:</span>
                      <span className="italic">{currentCounterToken.purposeNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-slate-400">No active customer at this desk</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Call Next Customer" below to ring the next token in line.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons for Current Token */}
          <div className="pt-4 border-t border-slate-800 space-y-2 mt-4">
            {currentCounterToken ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => recallToken(currentCounterToken.id)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Recall Voice</span>
                </button>

                {currentCounterToken.status === 'called' ? (
                  <button
                    onClick={() => markServing(currentCounterToken.id)}
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start Service</span>
                  </button>
                ) : (
                  <button
                    onClick={() => markCompleted(currentCounterToken.id)}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const res = markNoShowAndReallot(currentCounterToken.id, activeCounter);
                    if (res.reallotedToken) {
                      alert(`Token ${currentCounterToken.tokenNumber} marked absent. Turn automatically allotted to ${res.reallotedToken.tokenNumber} (present inside geofence) at ${activeCounter}!`);
                    } else {
                      alert(`Token ${currentCounterToken.tokenNumber} marked absent. No other customers currently waiting in line.`);
                    }
                  }}
                  className="col-span-2 p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-rose-500/20"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Mark Absent & Auto-Allot Next Present</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleCallNext}
                disabled={waitingTokens.length === 0}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  waitingTokens.length > 0
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Bell className="w-4 h-4 animate-bounce" />
                <span>Call Next Customer ({waitingTokens.length} waiting)</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Columns: Live Queue Table & Filter */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Live Waiting Queue</h3>
                <p className="text-xs text-slate-400">Tokens sorted by priority status and arrival time</p>
              </div>

              {/* Service Category Filter */}
              <div className="flex items-center gap-2">
                <label htmlFor="staff-service-filter" className="text-xs text-slate-400">Filter Department:</label>
                <select
                  id="staff-service-filter"
                  value={filterServiceId}
                  onChange={(e) => setFilterServiceId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
                >
                  <option value="all">All Departments</option>
                  {branchServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Waiting Token List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {waitingTokens.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm">The queue is currently clear.</p>
                  <p className="text-xs text-slate-600 mt-1">No waiting customers for this filter.</p>
                </div>
              ) : (
                waitingTokens.map((t, idx) => {
                  const service = branchServices.find((s) => s.id === t.serviceId);
                  const isPriority = t.priority !== 'standard';

                  return (
                    <div
                      key={t.id}
                      className="p-3.5 bg-slate-950/60 hover:bg-slate-950 rounded-xl border border-slate-800/80 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs font-bold text-slate-500">
                          #{idx + 1}
                        </span>

                        <div className="w-12 h-10 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-mono font-bold text-sm">
                          {t.tokenNumber}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{t.customerName}</span>
                            {isPriority && (
                              <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                {t.priority.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>{service?.name || 'Service'}</span>
                            <span>•</span>
                            <span className="text-emerald-400">
                              GPS Proof: {t.geofenceVerification.distanceMeters}m
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 hidden sm:inline">
                          Wait: ~{idx * (service?.avgMinutesPerCustomer || 6) + 3}m
                        </span>

                        <button
                          onClick={() => {
                            callNextToken(activeCounter, t.serviceId);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        >
                          Call Now
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Dynamic Geofence Parameter Configuration */}
          <div className="pt-4 border-t border-slate-800 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Sliders className="w-4 h-4 text-blue-400" />
                <label htmlFor="staff-geofence-radius-slider">Facility Geofence Perimeter Radius</label>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {formatDistance(radiusSlider)}
              </span>
            </div>

            <input
              id="staff-geofence-radius-slider"
              type="range"
              min={100}
              max={2500}
              step={50}
              value={radiusSlider}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>100m (Strict Lobby)</span>
              <span>500m (Campus / Grounds)</span>
              <span>2.5km (Wide District)</span>
            </div>
          </div>

        </div>

      </div>

      {/* Add Custom Service Modal for Staff */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Add Department / Service to {selectedBranch.name}</span>
              </h3>
              <button
                onClick={() => setIsAddServiceModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomService} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Department / Service Name *</label>
                <input
                  type="text"
                  required
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  placeholder="e.g. Immunization & Vaccine Station"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Prefix Code</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={customServiceCode}
                    onChange={(e) => setCustomServiceCode(e.target.value)}
                    placeholder="e.g. V"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Avg Min / Visitor</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={customServiceTime}
                    onChange={(e) => setCustomServiceTime(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Desk / Window Names (Comma separated)</label>
                <input
                  type="text"
                  value={customServiceCounters}
                  onChange={(e) => setCustomServiceCounters(e.target.value)}
                  placeholder="e.g. Station 1, Station 2, Room 104"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={customServiceDesc}
                  onChange={(e) => setCustomServiceDesc(e.target.value)}
                  placeholder="Purpose of this service desk"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Checklist / Documents (Comma separated)</label>
                <input
                  type="text"
                  value={customServiceDocs}
                  onChange={(e) => setCustomServiceDocs(e.target.value)}
                  placeholder="Vaccination card, ID Proof, Booking SMS"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddServiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
