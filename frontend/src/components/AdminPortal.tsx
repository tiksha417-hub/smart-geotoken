import React, { useState, useMemo } from 'react';
import { useQueue } from '../context/QueueContext';
import type { FacilitySector, Branch } from '../types';
import { formatDistance, calculateHaversineDistance } from '../utils/geofence';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Sliders,
  Settings,
  Plus,
  Trash2,
  Edit,
  Lock,
  Unlock,
  Radio,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const {
    adminAuthenticated,
    adminLogin,
    adminLogout,
    adminSettings,
    updateAdminSettings,
    branches,
    selectedBranch,
    setSelectedBranchId,
    updateBranchRadius,
    updateBranchDetails,
    deleteBranch,
    addCustomBranch,
    services,
    branchServices,
    addCustomService,
    deleteService,
    tokens,
    callNextToken,
    markNoShowAndReallot,
    markCompleted,
    cancelToken,
    userLocation,
    resetAllTokens,
  } = useQueue();

  // Admin login credentials input
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Admin Tab: 'queue' | 'geofence' | 'services' | 'settings'
  const [adminTab, setAdminTab] = useState<'queue' | 'geofence' | 'services' | 'settings'>('queue');

  // Queue tab filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Edit branch state
  const [isEditingBranch, setIsEditingBranch] = useState<boolean>(false);
  const [editBranchName, setEditBranchName] = useState<string>('');
  const [editBranchAddress, setEditBranchAddress] = useState<string>('');
  const [editBranchLat, setEditBranchLat] = useState<number>(0);
  const [editBranchLng, setEditBranchLng] = useState<number>(0);
  const [editBranchRadius, setEditBranchRadius] = useState<number>(500);

  // New facility modal
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [newBranchSector, setNewBranchSector] = useState<FacilitySector>('government');
  const [newBranchAddress, setNewBranchAddress] = useState<string>('');
  const [newBranchLat, setNewBranchLat] = useState<number>(40.7500);
  const [newBranchLng, setNewBranchLng] = useState<number>(-73.9800);
  const [newBranchRadius, setNewBranchRadius] = useState<number>(450);

  // New service modal
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServiceCode, setNewServiceCode] = useState<string>('');
  const [newServiceDesc, setNewServiceDesc] = useState<string>('');
  const [newServiceTime, setNewServiceTime] = useState<number>(10);
  const [newServiceCounters, setNewServiceCounters] = useState<string>('Desk 1, Desk 2');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const success = adminLogin(passwordInput);
    if (!success) {
      setLoginError('Invalid Administrator credentials. Hint: use admin123 or geotoken2026');
    } else {
      setPasswordInput('');
    }
  };

  const handleQuickDemoLogin = () => {
    adminLogin('admin123');
  };

  const handleStartEditBranch = (b: Branch) => {
    setIsEditingBranch(true);
    setEditBranchName(b.name);
    setEditBranchAddress(b.address);
    setEditBranchLat(b.coordinates.lat);
    setEditBranchLng(b.coordinates.lng);
    setEditBranchRadius(b.geofenceRadiusMeters);
  };

  const handleSaveEditBranch = (branchId: string) => {
    updateBranchDetails(branchId, {
      name: editBranchName.trim(),
      address: editBranchAddress.trim(),
      coordinates: { lat: Number(editBranchLat), lng: Number(editBranchLng) },
      geofenceRadiusMeters: Number(editBranchRadius),
    });
    setIsEditingBranch(false);
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    addCustomBranch({
      name: newBranchName.trim(),
      sector: newBranchSector,
      sectorLabel: newBranchSector.toUpperCase(),
      icon: 'Building2',
      code: newBranchName.substring(0, 3).toUpperCase(),
      tagline: 'Multi-service verified public facility',
      address: newBranchAddress.trim() || 'Central Boulevard',
      coordinates: { lat: Number(newBranchLat), lng: Number(newBranchLng) },
      geofenceRadiusMeters: Number(newBranchRadius),
      operatingHours: 'Mon - Fri: 08:30 AM - 05:00 PM',
      contactPhone: '+1 (800) 555-0100',
      isOpen: true,
    });

    setIsAddBranchModalOpen(false);
    setNewBranchName('');
    setNewBranchAddress('');
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const counters = newServiceCounters
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    addCustomService({
      branchId: selectedBranch.id,
      name: newServiceName.trim(),
      code: (newServiceCode.trim() || newServiceName.charAt(0)).toUpperCase(),
      description: newServiceDesc.trim() || 'General public service desk',
      avgMinutesPerCustomer: newServiceTime || 8,
      iconName: 'FileText',
      colorScheme: 'blue',
      requiredDocuments: ['Valid Government Identification'],
      countersAssigned: counters.length > 0 ? counters : ['Desk 1'],
    });

    setIsAddServiceModalOpen(false);
    setNewServiceName('');
    setNewServiceCode('');
    setNewServiceDesc('');
  };

  // Branch tokens
  const branchTokens = useMemo(() => {
    return tokens.filter((t) => t.branchId === selectedBranch.id);
  }, [tokens, selectedBranch]);

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    return branchTokens.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNum = t.tokenNumber.toLowerCase().includes(query);
        const matchesName = t.customerName.toLowerCase().includes(query);
        const matchesPhone = t.customerPhone.toLowerCase().includes(query);
        return matchesNum || matchesName || matchesPhone;
      }
      return true;
    });
  }, [branchTokens, statusFilter, searchQuery]);

  // Statistics
  const pendingCount = branchTokens.filter((t) => t.status === 'pending').length;
  const waitingInsideCount = branchTokens.filter((t) => t.status === 'waiting').length;
  const calledCount = branchTokens.filter((t) => t.status === 'called' || t.status === 'in_service').length;
  const completedCount = branchTokens.filter((t) => t.status === 'completed').length;
  const cancelledCount = branchTokens.filter((t) => t.status === 'cancelled').length;

  // IF NOT AUTHENTICATED -> RENDER ADMIN SECURITY LOCK SCREEN
  if (!adminAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            Security Gate
          </span>
          <h2 className="text-2xl font-black text-white mt-2">Admin Portal Authentication</h2>
          <p className="text-xs text-slate-400 mt-1">
            Access to geofence management, queue override, and facility policies is restricted to verified administrators.
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Admin Master Password or PIN
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter admin password (e.g. admin123)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              autoFocus
            />
            {loginError && (
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{loginError}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all"
          >
            Unlock Admin Console
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={handleQuickDemoLogin}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>One-Click Demo Admin Sign-In (admin123)</span>
          </button>
        </div>
      </div>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  return (
    <div className="space-y-6">
      {/* Top Admin Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Console • Authenticated</span>
            </span>
            <span className="text-xs text-slate-400">• Facility: <b className="text-white">{selectedBranch.name}</b></span>
          </div>
          <h1 className="text-2xl font-black text-white">Central Operations & Geofencing Hub</h1>
          <p className="text-xs text-slate-400">
            Configure GPS perimeters, manage live customer arrivals, and enforce auto-cancellation & re-allotment rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Branch Switcher Dropdown */}
          <select
            value={selectedBranch.id}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                [{b.code}] {b.name}
              </option>
            ))}
          </select>

          <button
            onClick={adminLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 transition-colors"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">En Route (Pending GPS)</span>
          <div className="text-2xl font-black text-amber-400 flex items-center gap-1.5">
            <Radio className="w-5 h-5 animate-pulse" />
            <span>{pendingCount}</span>
          </div>
          <span className="text-[10px] text-slate-500">Outside perimeter</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Inside Geofence (Active)</span>
          <div className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-5 h-5" />
            <span>{waitingInsideCount}</span>
          </div>
          <span className="text-[10px] text-slate-500">Eligible to be called</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Currently at Counters</span>
          <div className="text-2xl font-black text-blue-400 flex items-center gap-1.5">
            <Clock className="w-5 h-5" />
            <span>{calledCount}</span>
          </div>
          <span className="text-[10px] text-slate-500">Called / In service</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Completed Services</span>
          <div className="text-2xl font-black text-cyan-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5" />
            <span>{completedCount}</span>
          </div>
          <span className="text-[10px] text-slate-500">Successful visits</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">No-Shows & Cancelled</span>
          <div className="text-2xl font-black text-rose-400 flex items-center gap-1.5">
            <XCircle className="w-5 h-5" />
            <span>{cancelledCount}</span>
          </div>
          <span className="text-[10px] text-slate-500">Auto re-allotted</span>
        </div>
      </div>

      {/* Admin Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setAdminTab('queue')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            adminTab === 'queue'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Live Master Queue ({filteredTokens.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('geofence')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            adminTab === 'geofence'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Facilities & Geofence Perimeters</span>
        </button>

        <button
          onClick={() => setAdminTab('services')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            adminTab === 'services'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Departments & Services ({branchServices.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            adminTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Queue Policies & Automation</span>
        </button>
      </div>

      {/* TAB 1: LIVE MASTER QUEUE */}
      {adminTab === 'queue' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Live Master Queue Roster</h2>
              <p className="text-xs text-slate-400">
                Monitor all registered tokens, evaluate GPS proximity proofs, and trigger instant turn reallocation.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search token, name, phone..."
                  className="bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 rounded-xl text-xs text-white focus:outline-none w-48"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs font-medium rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending (Outside Geofence)</option>
                <option value="waiting">Active / Waiting (Inside Geofence)</option>
                <option value="called">Called to Desk</option>
                <option value="in_service">In Service</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled / No-Show</option>
              </select>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Token #</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Service</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">GPS Geofence Proof</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No tokens found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map((t) => {
                    const isInside = t.geofenceVerification.isVerified;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-white">
                          <span className="px-2 py-1 bg-slate-950 rounded-lg border border-slate-800 text-blue-300">
                            {t.tokenNumber}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{t.customerName}</div>
                          <div className="text-[11px] text-slate-400">{t.customerPhone}</div>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {services.find((s) => s.id === t.serviceId)?.name || 'Service'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              t.priority === 'vip_priority'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : t.priority === 'senior_disabled'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : t.priority === 'appointment'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {t.priority.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              t.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                                : t.status === 'waiting'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : t.status === 'called'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-bounce'
                                : t.status === 'completed'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {t.status === 'pending' ? '⏳ En Route' : t.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            {isInside ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <ShieldAlert className="w-4 h-4 text-amber-400" />
                            )}
                            <span className="font-semibold text-xs">
                              {isInside ? 'Inside Perimeter' : `${t.geofenceVerification.distanceMeters}m away`}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {t.geofenceVerification.verificationHash}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {t.status === 'waiting' && (
                              <button
                                onClick={() => callNextToken('Desk 1', t.serviceId)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                              >
                                Call Now
                              </button>
                            )}

                            {t.status === 'called' && (
                              <>
                                <button
                                  onClick={() => markCompleted(t.id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => markNoShowAndReallot(t.id, t.assignedCounter || 'Desk 1')}
                                  title="Mark customer absent, cancel token and immediately call next person present"
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                                >
                                  Absent / Reallot
                                </button>
                              </>
                            )}

                            {(t.status === 'pending' || t.status === 'waiting') && (
                              <button
                                onClick={() => cancelToken(t.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                                title="Cancel Token"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FACILITIES & GEOFENCE PERIMETERS */}
      {adminTab === 'geofence' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Facility Coordinates & Geofence Perimeters</h2>
              <p className="text-xs text-slate-400">
                Define GPS coordinates (Latitude, Longitude) and perimeter activation radius in meters for each facility.
              </p>
            </div>

            <button
              onClick={() => setIsAddBranchModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Facility</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map((b) => {
              const isSelected = b.id === selectedBranch.id;
              const userDist = calculateHaversineDistance(userLocation, b.coordinates);

              return (
                <div
                  key={b.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-slate-950 border-blue-500/50 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {b.code}
                        </span>
                        <h3 className="text-base font-bold text-white">{b.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{b.address}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEditBranch(b)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Edit Facility"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {branches.length > 1 && (
                        <button
                          onClick={() => deleteBranch(b.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-rose-400 transition-colors"
                          title="Delete Facility"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800/80 mb-3">
                    <div>
                      <span className="text-slate-500 block">GPS Center</span>
                      <span className="font-mono text-slate-200">
                        {b.coordinates.lat.toFixed(4)}, {b.coordinates.lng.toFixed(4)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Geofence Radius</span>
                      <span className="font-bold text-emerald-400">
                        {formatDistance(b.geofenceRadiusMeters)}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Radius Adjuster */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                      <span>Perimeter Boundary Slider:</span>
                      <span className="text-white font-bold">{b.geofenceRadiusMeters} meters</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={1500}
                      step={25}
                      value={b.geofenceRadiusMeters}
                      onChange={(e) => updateBranchRadius(b.id, Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Your GPS Distance: <b className="text-cyan-300">{formatDistance(userDist)}</b></span>
                    <button
                      onClick={() => setSelectedBranchId(b.id)}
                      className={`font-semibold ${
                        isSelected ? 'text-emerald-400' : 'text-blue-400 hover:underline'
                      }`}
                    >
                      {isSelected ? '✓ Currently Active' : 'Switch to this facility'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS & SERVICES */}
      {adminTab === 'services' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Department Services & Desks</h2>
              <p className="text-xs text-slate-400">
                Configure services for {selectedBranch.name}. Manage average service durations and counter assignments.
              </p>
            </div>

            <button
              onClick={() => setIsAddServiceModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department Service</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branchServices.map((srv) => (
              <div
                key={srv.id}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-lg flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Code: {srv.code}
                    </span>
                    <button
                      onClick={() => deleteService(srv.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete Service"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white">{srv.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{srv.description}</p>
                </div>

                <div className="space-y-2 text-xs pt-3 border-t border-slate-800/80">
                  <div className="flex justify-between text-slate-400">
                    <span>Avg Duration:</span>
                    <span className="font-semibold text-white">{srv.avgMinutesPerCustomer} mins / client</span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Assigned Desks:</span>
                    <span className="font-semibold text-cyan-300">
                      {srv.countersAssigned.join(', ') || 'Counter 1'}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>Required Docs:</span>
                    <span className="font-semibold text-slate-300 truncate max-w-[150px]">
                      {srv.requiredDocuments.join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: QUEUE POLICIES & AUTOMATION */}
      {adminTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Queue Management Policies & Automation</h2>
            <p className="text-xs text-slate-400">
              Enforce business rules for token booking, presence verification, no-show cancellation, and turn re-allotment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Setting 1: Remote Token Booking */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Allow Remote Token Generation</span>
                <input
                  type="checkbox"
                  checked={adminSettings.allowRemoteBooking}
                  onChange={(e) => updateAdminSettings({ allowRemoteBooking: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When enabled, citizens can generate a token remotely while en route (marked PENDING). The token automatically activates once their GPS location enters the facility geofence perimeter.
              </p>
            </div>

            {/* Setting 2: Auto-Reallot on No-Show */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Auto-Reallot Turn on No-Show</span>
                <input
                  type="checkbox"
                  checked={adminSettings.autoReallotOnNoShow}
                  onChange={(e) => updateAdminSettings({ autoReallotOnNoShow: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When a summoned customer fails to present themselves at the counter, their token is immediately cancelled, and the turn is automatically allotted to the next customer physically present inside the geofence.
              </p>
            </div>

            {/* Setting 3: Arrival Grace Period */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">No-Show Arrival Grace Period</span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {adminSettings.gracePeriodSeconds} seconds
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={300}
                step={15}
                value={adminSettings.gracePeriodSeconds}
                onChange={(e) => updateAdminSettings({ gracePeriodSeconds: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <p className="text-xs text-slate-400">
                Arrival window allowed for a customer to reach the counter after their token number is announced.
              </p>
            </div>

            {/* Setting 4: Audio Vocal Announcements */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Synthesized Voice & Audio Chime</span>
                <input
                  type="checkbox"
                  checked={adminSettings.soundAlerts}
                  onChange={(e) => updateAdminSettings({ soundAlerts: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Plays an airport-style arrival chime and speaks aloud the token number and counter name on public screens.
              </p>
            </div>
          </div>

          {/* Danger Zone: Reset System Data */}
          <div className="p-5 bg-rose-950/30 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-bold text-sm text-rose-300 block">Reset System Demo State</span>
              <p className="text-xs text-rose-400/80 mt-0.5">
                Restores default mock branches, services, and clear today's queue tokens.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Reset all demo tokens and restore initial branches?')) {
                  resetAllTokens();
                  alert('System state has been reset to defaults.');
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors shrink-0"
            >
              Reset All Demo State
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD FACILITY */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Service Facility</h3>
            <form onSubmit={handleCreateBranch} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. City General Hospital / West Bank Branch"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Sector / Industry</label>
                <select
                  value={newBranchSector}
                  onChange={(e) => setNewBranchSector(e.target.value as FacilitySector)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="government">Government & Municipal</option>
                  <option value="healthcare">Healthcare & Hospitals</option>
                  <option value="banking">Banking & Financial Services</option>
                  <option value="telecom">Telecom & Tech Repairs</option>
                  <option value="retail">Retail & Customer Pickup</option>
                  <option value="education">Education & Universities</option>
                  <option value="general">General Public Services</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="e.g. 500 Fifth Ave, New York, NY"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">GPS Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newBranchLat}
                    onChange={(e) => setNewBranchLat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">GPS Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newBranchLng}
                    onChange={(e) => setNewBranchLng(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">
                  Geofence Radius: <b className="text-blue-400">{newBranchRadius} meters</b>
                </label>
                <input
                  type="range"
                  min={50}
                  max={1500}
                  step={25}
                  value={newBranchRadius}
                  onChange={(e) => setNewBranchRadius(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
                >
                  Create Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICE */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Add Department Service</h3>
            <form onSubmit={handleCreateService} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Loan Counseling / Vaccination"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Prefix Code</label>
                  <input
                    type="text"
                    maxLength={3}
                    required
                    value={newServiceCode}
                    onChange={(e) => setNewServiceCode(e.target.value.toUpperCase())}
                    placeholder="e.g. L, V, D"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Avg Mins / Client</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={newServiceTime}
                    onChange={(e) => setNewServiceTime(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Description</label>
                <textarea
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Brief description of requirements"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none h-16"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Assigned Counters (comma separated)</label>
                <input
                  type="text"
                  value={newServiceCounters}
                  onChange={(e) => setNewServiceCounters(e.target.value)}
                  placeholder="Desk 1, Desk 2, Window 3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddServiceModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT FACILITY */}
      {isEditingBranch && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Edit Facility Parameters</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Facility Name</label>
                <input
                  type="text"
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Address</label>
                <input
                  type="text"
                  value={editBranchAddress}
                  onChange={(e) => setEditBranchAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">GPS Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editBranchLat}
                    onChange={(e) => setEditBranchLat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">GPS Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editBranchLng}
                    onChange={(e) => setEditBranchLng(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">
                  Geofence Radius: <b className="text-blue-400">{editBranchRadius} meters</b>
                </label>
                <input
                  type="range"
                  min={50}
                  max={1500}
                  step={25}
                  value={editBranchRadius}
                  onChange={(e) => setEditBranchRadius(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingBranch(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEditBranch(selectedBranch.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
