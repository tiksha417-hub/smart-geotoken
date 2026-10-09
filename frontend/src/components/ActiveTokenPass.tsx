import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useQueue } from '../context/QueueContext';
import { formatDistance, calculateHaversineDistance } from '../utils/geofence';
import {
  QrCode,
  Clock,
  MapPin,
  AlertTriangle,
  Printer,
  XCircle,
  PlusCircle,
  Volume2,
  Sparkles,
  Radio,
} from 'lucide-react';

export const ActiveTokenPass: React.FC = () => {
  const {
    activeCustomerToken,
    setActiveCustomerToken,
    branches,
    services,
    tokens,
    userLocation,
    cancelToken,
    delayToken,
    recallToken,
    activateTokenGeofence,
    simulateLocationPreset,
  } = useQueue();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!activeCustomerToken) return null;

  // Retrieve current fresh token state from context
  const currentToken = tokens.find((t) => t.id === activeCustomerToken.id) || activeCustomerToken;
  const branch = branches.find((b) => b.id === currentToken.branchId);
  const service = services.find((s) => s.id === currentToken.serviceId);

  // Real-time distance of user from branch right now
  const currentDistance = branch
    ? calculateHaversineDistance(userLocation, branch.coordinates)
    : 0;
  const isCurrentlyInside = branch ? currentDistance <= branch.geofenceRadiusMeters : true;

  // Calculate live position ahead
  const tokensAhead = tokens.filter(
    (t) =>
      t.branchId === currentToken.branchId &&
      t.serviceId === currentToken.serviceId &&
      t.status === 'waiting' &&
      new Date(t.createdAt).getTime() < new Date(currentToken.createdAt).getTime()
  ).length;

  // Generate QR code on canvas
  useEffect(() => {
    if (!canvasRef.current || !currentToken.qrPayload) return;

    QRCode.toCanvas(
      canvasRef.current,
      currentToken.qrPayload,
      {
        width: 150,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (error) => {
        if (error) console.error('Error generating QR code', error);
      }
    );
  }, [currentToken.qrPayload]);

  const handlePrint = () => {
    window.print();
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel your queue token?')) {
      cancelToken(currentToken.id);
    }
  };

  const handleDelay = () => {
    delayToken(currentToken.id, 5);
    alert('Your turn has been deferred by 5 minutes.');
  };

  return (
    <div className="space-y-4">
      {/* PENDING ARRIVAL BANNER (Remote Booked, Awaiting Geofence Entry) */}
      {currentToken.status === 'pending' && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 shadow-xl space-y-3">
          <div className="flex items-start gap-3">
            <Radio className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs space-y-1">
              <strong className="text-sm font-bold text-white block">
                Token Booked Remotely • Status: PENDING ARRIVAL
              </strong>
              <p>
                You are currently <span className="font-bold text-amber-300">{formatDistance(currentDistance)}</span> from {branch?.name}.
                To activate this token into the live waiting line, arrive within the <span className="font-bold text-emerald-400">{formatDistance(branch?.geofenceRadiusMeters || 500)}</span> perimeter.
              </p>
              <p className="text-slate-300">
                GPS is continuously tracking your distance. Once you arrive at the facility, your token will automatically activate!
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-amber-300 font-medium">
              {isCurrentlyInside ? '✓ GPS confirms you have arrived inside the perimeter!' : 'Testing demo? Simulate walking inside:'}
            </span>
            {isCurrentlyInside ? (
              <button
                onClick={() => activateTokenGeofence(currentToken.id)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 animate-bounce"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Activate Token Now</span>
              </button>
            ) : (
              <button
                onClick={() => simulateLocationPreset('inside')}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Simulate Arrival Inside (75m)
              </button>
            )}
          </div>
        </div>
      )}

      {/* CANCELLED BANNER */}
      {currentToken.status === 'cancelled' && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 shadow-xl flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="text-sm font-bold text-white block">
                Token Cancelled
              </strong>
              <p>
                {currentToken.cancelReason || 'This token has been cancelled.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveCustomerToken(null)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0"
          >
            Book New Token
          </button>
        </div>
      )}

      {/* Geofence Perimeter Warning Banner if customer drifted outside while waiting */}
      {!isCurrentlyInside && currentToken.status === 'waiting' && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 shadow-xl flex items-start gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="text-sm font-bold text-white block">
              Proximity Alert: Outside Branch Geofence
            </strong>
            <p>
              You are currently <span className="font-bold text-rose-300">{formatDistance(currentDistance)}</span> away
              (branch radius is {formatDistance(branch?.geofenceRadiusMeters || 500)}).
            </p>
            <p className="text-rose-300">
              Please stay within the branch perimeter. If you are not present when called, your token may be cancelled and re-allotted to the next customer present.
            </p>
          </div>
        </div>
      )}

      {/* Main Boarding Pass Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Pass Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
                Active Smart Pass
              </span>
              <span className="text-xs font-mono text-blue-200">
                {currentToken.geofenceVerification.verificationHash}
              </span>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                currentToken.status === 'called'
                  ? 'bg-emerald-400 text-slate-950 animate-bounce'
                  : currentToken.status === 'in_service'
                  ? 'bg-blue-300 text-slate-950'
                  : 'bg-white/10 text-white border border-white/20'
              }`}
            >
              {currentToken.status === 'called'
                ? '📢 YOUR TURN NOW'
                : currentToken.status.replace('_', ' ')}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold">{branch?.name}</h2>
          <p className="text-xs text-blue-200 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{branch?.address}</span>
          </p>
        </div>

        {/* Big Token Display Section */}
        <div className="p-6 text-center bg-slate-950/60 border-b border-slate-800/80">
          <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">
            Assigned Queue Token
          </span>
          <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 my-2 tracking-tight">
            {currentToken.tokenNumber}
          </div>

          {/* Status Instruction */}
          {currentToken.status === 'called' ? (
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-xl border border-emerald-500/40 text-sm font-bold animate-pulse">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>PLEASE PROCEED TO {currentToken.assignedCounter || 'COUNTER 1'}</span>
            </div>
          ) : currentToken.status === 'in_service' ? (
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-2 rounded-xl border border-blue-500/40 text-sm font-semibold">
              <span>Currently in service at {currentToken.assignedCounter}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Assigned to: <span className="font-semibold text-white">{currentToken.assignedCounter || 'Standard Counter'}</span>
            </div>
          )}
        </div>

        {/* Live Wait & Position Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-800 bg-slate-900 border-b border-slate-800 text-center">
          <div className="p-4">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Ahead in Line
            </span>
            <span className="text-lg font-bold text-white">
              {currentToken.status === 'waiting' ? `${tokensAhead} people` : '0'}
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Est. Call Time
            </span>
            <span className="text-lg font-bold text-amber-300 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {new Date(currentToken.estimatedCallTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Service
            </span>
            <span className="text-sm font-semibold text-slate-200 truncate block" title={service?.name}>
              {service?.name || 'Customer Service'}
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
              Perimeter Status
            </span>
            <span
              className={`text-xs font-bold ${
                isCurrentlyInside ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isCurrentlyInside ? '✓ Inside (Verified)' : '⚠️ Outside Boundary'}
            </span>
          </div>
        </div>

        {/* QR Code & Verification Certificate Details */}
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-950/40">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <QrCode className="w-4 h-4 text-blue-400" />
              <span>Kiosk & Counter Verification QR</span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs">
              Show this code to the counter staff or scan at the self-service desk when your token is called.
            </p>
            <div className="text-[11px] font-mono text-slate-500">
              Issued for: {currentToken.customerName} ({currentToken.customerPhone})
            </div>
            <div className="text-[10px] text-slate-500">
              Issued at: {new Date(currentToken.createdAt).toLocaleTimeString()} • GPS Dist at Issue: {currentToken.geofenceVerification.distanceMeters}m
            </div>
          </div>

          {/* QR Canvas */}
          <div className="p-2 bg-white rounded-2xl shadow-xl border-4 border-slate-700 shrink-0">
            <canvas ref={canvasRef} className="w-[120px] h-[120px]" />
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>

            {currentToken.status === 'waiting' && (
              <button
                onClick={handleDelay}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors border border-slate-700"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Need 5 Mins</span>
              </button>
            )}

            {currentToken.status === 'called' && (
              <button
                onClick={() => recallToken(currentToken.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Re-hear Chime</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Token</span>
            </button>

            <button
              onClick={() => setActiveCustomerToken(null)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Issue Another</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
