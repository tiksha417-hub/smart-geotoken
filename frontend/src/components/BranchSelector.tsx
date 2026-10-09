import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import {
  Clock,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Building2,
  Landmark,
  HeartPulse,
  Smartphone,
  GraduationCap,
  ShoppingBag,
  Plus,
  X,
} from 'lucide-react';
import { calculateHaversineDistance, formatDistance } from '../utils/geofence';
import type { FacilitySector } from '../types';

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  government: <Landmark className="w-4 h-4 text-blue-400" />,
  healthcare: <HeartPulse className="w-4 h-4 text-rose-400" />,
  telecom: <Smartphone className="w-4 h-4 text-amber-400" />,
  education: <GraduationCap className="w-4 h-4 text-purple-400" />,
  retail: <ShoppingBag className="w-4 h-4 text-emerald-400" />,
  general: <Building2 className="w-4 h-4 text-cyan-400" />,
};

const SECTORS: { key: FacilitySector; label: string; icon: string }[] = [
  { key: 'all', label: 'All Industries', icon: '🌟' },
  { key: 'government', label: 'Govt & Municipal', icon: '🏛️' },
  { key: 'healthcare', label: 'Healthcare & Clinics', icon: '🏥' },
  { key: 'telecom', label: 'Telecom & Tech', icon: '📱' },
  { key: 'education', label: 'Campus & Education', icon: '🎓' },
  { key: 'retail', label: 'Retail & Logistics', icon: '🛒' },
  { key: 'general', label: 'Public Pavilions', icon: '🏢' },
];

export const BranchSelector: React.FC = () => {
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    userLocation,
    selectedSectorFilter,
    setSelectedSectorFilter,
    addCustomBranch,
  } = useQueue();

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newFacilityName, setNewFacilityName] = useState<string>('');
  const [newFacilityCode, setNewFacilityCode] = useState<string>('');
  const [newFacilitySector, setNewFacilitySector] = useState<FacilitySector>('general');
  const [newFacilityTagline, setNewFacilityTagline] = useState<string>('');
  const [newFacilityAddress, setNewFacilityAddress] = useState<string>('');
  const [newFacilityRadius, setNewFacilityRadius] = useState<number>(500);

  const filteredBranches = branches.filter((b) => {
    if (selectedSectorFilter === 'all') return true;
    return b.sector === selectedSectorFilter;
  });

  const handleAddFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacilityName.trim()) return;

    addCustomBranch({
      name: newFacilityName.trim(),
      code: (newFacilityCode.trim() || newFacilityName.substring(0, 3)).toUpperCase(),
      sector: newFacilitySector,
      sectorLabel: newFacilitySector.charAt(0).toUpperCase() + newFacilitySector.slice(1),
      icon: 'Building2',
      tagline: newFacilityTagline.trim() || 'Custom service queue facility',
      address: newFacilityAddress.trim() || 'Custom Location Address',
      coordinates: { ...userLocation },
      geofenceRadiusMeters: newFacilityRadius,
      operatingHours: 'Mon - Fri: 08:30 AM - 05:30 PM',
      contactPhone: '+1 (800) 555-0100',
      isOpen: true,
    });

    setIsAddModalOpen(false);
    setNewFacilityName('');
    setNewFacilityTagline('');
    setNewFacilityAddress('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      
      {/* Header and Sector Pill Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              Universal Queue Pavilion Selector
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Choose Facility / Service Center
          </h2>
          <p className="text-xs text-slate-400">
            Works across Government Bureaus, Hospitals, Telecom Centers, Universities, Retail & Any Public Desk
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="self-start lg:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>Add Custom Facility</span>
        </button>
      </div>

      {/* Industry Sector Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {SECTORS.map((s) => {
          const isActive = selectedSectorFilter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSelectedSectorFilter(s.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/20'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredBranches.map((branch) => {
          const isSelected = branch.id === selectedBranchId;
          const distance = calculateHaversineDistance(userLocation, branch.coordinates);
          const isInside = distance <= branch.geofenceRadiusMeters;

          return (
            <button
              key={branch.id}
              onClick={() => setSelectedBranchId(branch.id)}
              className={`text-left p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div>
                {/* Sector & Distance Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    {SECTOR_ICONS[branch.sector] || <Building2 className="w-4 h-4 text-blue-400" />}
                    <span className="font-medium text-slate-300">{branch.sectorLabel}</span>
                  </div>

                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border shrink-0 ${
                      isInside
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isInside ? (
                      <>
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                        In Perimeter
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                        {formatDistance(distance)} away
                      </>
                    )}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white mb-1 line-clamp-1">
                  {branch.name}
                </h3>

                <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                  {branch.tagline}
                </p>
              </div>

              {/* Address & Hours footer */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">{branch.address}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{branch.operatingHours}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Phone className="w-2.5 h-2.5" />
                    <span>{branch.contactPhone}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Custom Facility Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span>Add Custom Service Facility</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFacility} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={newFacilityName}
                  onChange={(e) => setNewFacilityName(e.target.value)}
                  placeholder="e.g. Westside Animal Hospital & Clinic"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Sector Domain</label>
                  <select
                    value={newFacilitySector}
                    onChange={(e) => setNewFacilitySector(e.target.value as FacilitySector)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  >
                    <option value="healthcare">Healthcare & Clinic</option>
                    <option value="government">Govt & Municipal</option>
                    <option value="telecom">Telecom & Devices</option>
                    <option value="education">Education & Campus</option>
                    <option value="retail">Retail & Logistics</option>
                    <option value="general">General Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Code Prefix</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newFacilityCode}
                    onChange={(e) => setNewFacilityCode(e.target.value)}
                    placeholder="e.g. VET"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tagline / Services Description</label>
                <input
                  type="text"
                  value={newFacilityTagline}
                  onChange={(e) => setNewFacilityTagline(e.target.value)}
                  placeholder="e.g. Emergency pet triage, vaccinations & pharmacy desk"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Physical Address</label>
                <input
                  type="text"
                  value={newFacilityAddress}
                  onChange={(e) => setNewFacilityAddress(e.target.value)}
                  placeholder="e.g. 742 Evergreen Terrace, Springfield"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Geofence Perimeter Radius</span>
                  <span className="text-cyan-400 font-mono">{formatDistance(newFacilityRadius)}</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={newFacilityRadius}
                  onChange={(e) => setNewFacilityRadius(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Create Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
