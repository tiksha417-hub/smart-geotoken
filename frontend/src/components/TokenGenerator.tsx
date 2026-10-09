import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useQueue } from '../context/QueueContext';
import type { PriorityLevel } from '../types';
import { formatDistance } from '../utils/geofence';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Users,
  CheckCircle2,
  FileCheck,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileText,
  CreditCard,
  PlaneTakeoff,
  Pill,
  ScanLine,
  Wrench,
  Smartphone,
  BookOpen,
  GraduationCap,
  PackageCheck,
  RotateCcw,
  Zap,
  HeartPulse,
  Activity,
  ArrowLeft,
  Plus,
  X,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  CreditCard: <CreditCard className="w-5 h-5" />,
  PlaneTakeoff: <PlaneTakeoff className="w-5 h-5" />,
  Pill: <Pill className="w-5 h-5" />,
  ScanLine: <ScanLine className="w-5 h-5" />,
  Wrench: <Wrench className="w-5 h-5" />,
  Smartphone: <Smartphone className="w-5 h-5" />,
  BookOpen: <BookOpen className="w-5 h-5" />,
  GraduationCap: <GraduationCap className="w-5 h-5" />,
  PackageCheck: <PackageCheck className="w-5 h-5" />,
  RotateCcw: <RotateCcw className="w-5 h-5" />,
  HeartPulse: <HeartPulse className="w-5 h-5" />,
  Activity: <Activity className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5" />,
  FileCheck: <FileCheck className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  HelpCircle: <HelpCircle className="w-5 h-5" />,
};

export const TokenGenerator: React.FC = () => {
  const {
    selectedBranch,
    branchServices,
    tokens,
    geofenceEval,
    generateToken,
    simulateLocationPreset,
    setActiveCustomerToken,
    addCustomService,
    adminSettings,
  } = useQueue();

  // Wizard Step: 1 (Location Check) -> 2 (Service) -> 3 (Customer Details & Priority) -> 4 (Review)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    branchServices[0]?.id || ''
  );
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [purposeNotes, setPurposeNotes] = useState<string>('');
  const [priority, setPriority] = useState<PriorityLevel>('standard');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Custom Service modal
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState<boolean>(false);
  const [customServiceName, setCustomServiceName] = useState<string>('');
  const [customServiceCode, setCustomServiceCode] = useState<string>('');
  const [customServiceDesc, setCustomServiceDesc] = useState<string>('');
  const [customServiceTime, setCustomServiceTime] = useState<number>(10);
  const [customServiceDocs, setCustomServiceDocs] = useState<string>('');

  // Keep selected service synced if branch changes
  React.useEffect(() => {
    if (branchServices.length > 0 && !branchServices.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(branchServices[0].id);
    }
  }, [branchServices, selectedServiceId]);

  const activeService = branchServices.find((s) => s.id === selectedServiceId) || branchServices[0];

  // Calculate live waiting count for active service
  const waitingCountForService = (serviceId: string) => {
    return tokens.filter(
      (t) =>
        t.branchId === selectedBranch.id &&
        t.serviceId === serviceId &&
        (t.status === 'waiting' || t.status === 'called')
    ).length;
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
  };

  const handleCreateCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customServiceName.trim()) return;

    const docs = customServiceDocs
      .split(',')
      .map((d) => d.trim())
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
      countersAssigned: ['Service Desk 1', 'Service Desk 2'],
    });

    setIsAddServiceModalOpen(false);
    setCustomServiceName('');
    setCustomServiceCode('');
    setCustomServiceDesc('');
    setCustomServiceDocs('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!geofenceEval.isWithin && !adminSettings.allowRemoteBooking) {
      setErrorMessage(
        `Cannot issue token: You are ${formatDistance(geofenceEval.distanceMeters)} away. You must be inside the ${formatDistance(selectedBranch.geofenceRadiusMeters)} perimeter.`
      );
      setCurrentStep(1);
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage('Please provide a mobile phone number for ticket notifications.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await generateToken({
        branchId: selectedBranch.id,
        serviceId: activeService.id,
        customerName,
        customerPhone,
        customerEmail,
        purposeNotes,
        priority,
      });

      // Confetti burst
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore if canvas not supported
      }

      setActiveCustomerToken(token);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to generate token. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Wizard Header / Progress Bar */}
      <div className="p-5 bg-slate-950/70 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Universal Smart Queue Kiosk
            </span>
            <h2 className="text-lg font-bold text-white">
              Generate Service Queue Token
            </h2>
          </div>
          <div className="text-xs text-slate-400">
            Selected Facility: <span className="font-semibold text-slate-200">{selectedBranch.name}</span>
          </div>
        </div>

        {/* 4-Step Progress Dots */}
        <nav aria-label="Token generation progress" className="grid grid-cols-4 gap-2">
          {[
            { step: 1, label: '1. Geofence' },
            { step: 2, label: '2. Select Service' },
            { step: 3, label: '3. Details' },
            { step: 4, label: '4. Issue Token' },
          ].map((item) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  if (item.step < currentStep || (item.step === 2 && geofenceEval.isWithin)) {
                    setCurrentStep(item.step);
                  }
                }}
                className={`py-2 px-2 rounded-lg text-xs font-medium text-center transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800/40 text-slate-500'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {errorMessage && (
        <div className="m-5 mb-0 p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-sm flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Verification Notice</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Step Contents */}
      <div className="p-5 sm:p-6">
        
        {/* STEP 1: Geofence Verification */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center max-w-lg mx-auto py-2">
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border-2 transition-all ${
                  geofenceEval.isWithin
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                }`}
              >
                {geofenceEval.isWithin ? (
                  <ShieldCheck className="w-8 h-8 animate-bounce" />
                ) : (
                  <ShieldAlert className="w-8 h-8" />
                )}
              </div>

              <h3 className="text-xl font-bold text-white mb-2">
                {geofenceEval.isWithin
                  ? 'Physical Presence Verified'
                  : 'Facility Perimeter Lock Active'}
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {geofenceEval.message}
              </p>

              <div className="inline-flex items-center gap-3 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Current Distance: </span>
                  <span className="font-bold text-white">
                    {formatDistance(geofenceEval.distanceMeters)}
                  </span>
                </div>
                <div className="w-px h-4 bg-slate-700" />
                <div>
                  <span className="text-slate-400">Permitted Perimeter: </span>
                  <span className="font-bold text-emerald-400">
                    Within {formatDistance(selectedBranch.geofenceRadiusMeters)}
                  </span>
                </div>
              </div>
            </div>

            {/* If outside: help customer simulate or guide them */}
            {!geofenceEval.isWithin && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 space-y-2 max-w-lg mx-auto">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <HelpCircle className="w-4 h-4" />
                  <span>Why is this required?</span>
                </div>
                <p>
                  To keep lines moving efficiently and prevent phantom remote bookings,
                  GeoToken issues live queue numbers strictly to customers present on-site.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/20">
                  <span>Testing this demo? Click to teleport into the facility:</span>
                  <button
                    onClick={() => simulateLocationPreset('inside')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                  >
                    Simulate Inside Facility (75m)
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-98"
              >
                <span>
                  {geofenceEval.isWithin
                    ? 'Continue to Service Selection'
                    : 'Proceed with Remote Token Booking (Auto-Activates on Arrival)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Service Selection */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Select Required Service Department
                </h3>
                <p className="text-xs text-slate-400">
                  Select your required desk to inspect queue times and checklist requirements.
                </p>
              </div>

              <button
                onClick={() => setIsAddServiceModalOpen(true)}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span>Add Custom Service</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branchServices.map((service) => {
                const isSelected = service.id === selectedServiceId;
                const waiting = waitingCountForService(service.id);
                const estWait = waiting * service.avgMinutesPerCustomer;

                return (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {ICON_MAP[service.iconName] || <FileText className="w-5 h-5" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-blue-400">[{service.code}]</span>{' '}
                            <span className="font-semibold text-sm text-white">
                              {service.name}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      {/* Queue Stats Row */}
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span>{waiting} waiting in line</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          <span>~{estWait === 0 ? 3 : estWait} min wait</span>
                        </div>
                      </div>

                      {/* Required Documents / Items Checklist */}
                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 text-slate-300 font-medium mb-1">
                          <FileCheck className="w-3 h-3 text-emerald-400" />
                          <span>Checklist / Items to Bring:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                          {service.requiredDocuments.slice(0, 2).map((doc, idx) => (
                            <li key={idx} className="truncate">{doc}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all"
              >
                <span>Continue to Customer Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Customer Details & Priority */}
        {currentStep === 3 && (
          <form onSubmit={(e) => { e.preventDefault(); setCurrentStep(4); }} className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Customer Information & Service Priority
              </h3>
              <p className="text-xs text-slate-400">
                Provide your contact details so the desk operator can summon your ticket via display and SMS.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="customer-phone" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mobile Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="customer-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address (Optional)
              </label>
              <input
                id="customer-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="jordan@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="purpose-notes" className="block text-xs font-medium text-slate-300 mb-1.5">
                Service Notes / Case Reference / File # (Optional)
              </label>
              <textarea
                id="purpose-notes"
                rows={2}
                value={purposeNotes}
                onChange={(e) => setPurposeNotes(e.target.value)}
                placeholder="e.g. Application #78902 or specific inquiry description"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Priority Category Radio Buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Queue Priority Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    value: 'standard' as PriorityLevel,
                    label: 'Standard Walk-In',
                    desc: 'Sequential ticket assignment based on arrival',
                  },
                  {
                    value: 'senior_disabled' as PriorityLevel,
                    label: 'Priority / Accessible Service',
                    desc: 'Senior citizens, differently-abled & accessible desk',
                  },
                  {
                    value: 'appointment' as PriorityLevel,
                    label: 'Confirmed Appointment',
                    desc: 'Prior online reservation or scheduled interview',
                  },
                  {
                    value: 'vip_priority' as PriorityLevel,
                    label: 'Express / Member Pass',
                    desc: 'Fast-track corporate or registered account tier',
                  },
                ].map((tier) => (
                  <label
                    key={tier.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      priority === tier.value
                        ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={tier.value}
                      checked={priority === tier.value}
                      onChange={() => setPriority(tier.value)}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">{tier.label}</div>
                      <div className="text-[11px] text-slate-400">{tier.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all"
              >
                <span>Proceed to Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Review & Generate Token */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">
                Confirm Token Issuance
              </h3>
              <p className="text-xs text-slate-400">
                Please verify your details. Your smart token will be stamped with anti-spoofing GPS proof.
              </p>
            </div>

            {/* Token Summary Card */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Department / Service
                  </span>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-blue-400">[{activeService.code}]</span>
                    <span>{activeService.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Service Center
                  </span>
                  <div className="text-sm font-semibold text-slate-200">
                    {selectedBranch.name}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Customer Name</span>
                  <span className="font-semibold text-white">{customerName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact Phone</span>
                  <span className="font-semibold text-white">{customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Queue Tier</span>
                  <span className="font-semibold text-emerald-400 capitalize">
                    {priority.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estimated Wait</span>
                  <span className="font-semibold text-amber-300">
                    ~{waitingCountForService(activeService.id) * activeService.avgMinutesPerCustomer || 3} mins
                  </span>
                </div>
              </div>

              {/* Geofence Verification Certificate Stamp */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300 block">
                      Geofence Verified & Stamped
                    </span>
                    <span className="text-emerald-400/80 text-[11px]">
                      Distance: {formatDistance(geofenceEval.distanceMeters)} (Within {formatDistance(selectedBranch.geofenceRadiusMeters)} boundary)
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-emerald-900/60 text-emerald-200 px-2 py-1 rounded border border-emerald-500/20">
                  SECURE PASS
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Modify Details</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-xl shadow-blue-500/25 transition-all transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Issuing Pass...' : 'Generate Smart Token Now'}</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Add Custom Service Modal */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>Add Custom Service Category</span>
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
                <label className="block text-slate-300 font-medium mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  placeholder="e.g. Express Consultation / Special Inquiry"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ticket Letter Code</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={customServiceCode}
                    onChange={(e) => setCustomServiceCode(e.target.value)}
                    placeholder="e.g. S"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Avg Min / Person</label>
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
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={customServiceDesc}
                  onChange={(e) => setCustomServiceDesc(e.target.value)}
                  placeholder="Brief summary of what this counter handles"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Required Documents (Comma separated)</label>
                <input
                  type="text"
                  value={customServiceDocs}
                  onChange={(e) => setCustomServiceDocs(e.target.value)}
                  placeholder="Photo ID, Proof of Address, Order #"
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
                  Add Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
