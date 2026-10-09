import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useQueue } from '../context/QueueContext';
import { formatDistance } from '../utils/geofence';
import {
  Compass,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Navigation,
  Crosshair,
  Building,
} from 'lucide-react';

export const GeofenceMap: React.FC = () => {
  const {
    selectedBranch,
    userLocation,
    setUserLocation,
    geofenceEval,
    requestRealGps,
    pinFacilityToUserLocation,
    simulateLocationPreset,
    isRealGpsActive,
    gpsError,
  } = useQueue();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const branchMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [selectedBranch.coordinates.lat, selectedBranch.coordinates.lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    // Official OpenStreetMap tiles (100% free, no API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Click on map to place user location
    map.on('click', (e: L.LeafletMouseEvent) => {
      setUserLocation({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Branch Marker and Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const branchCoords: [number, number] = [
      selectedBranch.coordinates.lat,
      selectedBranch.coordinates.lng,
    ];

    // Branch Icon
    const branchIcon = L.divIcon({
      className: 'custom-branch-marker',
      html: `
        <div style="
          background: #2563eb;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-size: 18px;
        ">
          🏛️
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!branchMarkerRef.current) {
      branchMarkerRef.current = L.marker(branchCoords, { icon: branchIcon }).addTo(map);
    } else {
      branchMarkerRef.current.setLatLng(branchCoords);
      branchMarkerRef.current.setIcon(branchIcon);
    }

    branchMarkerRef.current.bindPopup(`
      <div style="font-family: sans-serif; font-size: 13px; color: #1e293b;">
        <strong style="color: #2563eb;">${selectedBranch.name}</strong><br/>
        <span>Perimeter Radius: ${formatDistance(selectedBranch.geofenceRadiusMeters)}</span><br/>
        <small style="color: #64748b;">${selectedBranch.address}</small>
      </div>
    `);

    // Geofence Circle Boundary
    const isInside = geofenceEval.isWithin;
    const circleColor = isInside ? '#10b981' : '#f59e0b';
    const circleFill = isInside ? '#10b981' : '#f59e0b';

    if (!circleRef.current) {
      circleRef.current = L.circle(branchCoords, {
        radius: selectedBranch.geofenceRadiusMeters,
        color: circleColor,
        weight: 2,
        fillColor: circleFill,
        fillOpacity: 0.15,
        dashArray: isInside ? undefined : '6, 6',
      }).addTo(map);
    } else {
      circleRef.current.setLatLng(branchCoords);
      circleRef.current.setRadius(selectedBranch.geofenceRadiusMeters);
      circleRef.current.setStyle({
        color: circleColor,
        fillColor: circleFill,
        dashArray: isInside ? undefined : '6, 6',
      });
    }

    // Recenter if branch changed
    map.panTo(branchCoords);
  }, [selectedBranch, geofenceEval.isWithin]);

  // Update User Marker and Connecting Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const userCoords: [number, number] = [userLocation.lat, userLocation.lng];
    const branchCoords: [number, number] = [
      selectedBranch.coordinates.lat,
      selectedBranch.coordinates.lng,
    ];

    const isInside = geofenceEval.isWithin;

    // User Marker with pulse
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px;">
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: ${isInside ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            position: relative;
            background: ${isInside ? '#10b981' : '#ef4444'};
            color: white;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            font-size: 16px;
            cursor: grab;
          ">
            👤
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(userCoords, {
        icon: userIcon,
        draggable: true,
      }).addTo(map);

      userMarkerRef.current.on('dragend', (e: L.DragEndEvent) => {
        const marker = e.target;
        const position = marker.getLatLng();
        setUserLocation({
          lat: Number(position.lat.toFixed(6)),
          lng: Number(position.lng.toFixed(6)),
        });
      });
    } else {
      userMarkerRef.current.setLatLng(userCoords);
      userMarkerRef.current.setIcon(userIcon);
    }

    userMarkerRef.current.bindPopup(`
      <div style="font-family: sans-serif; font-size: 13px; color: #1e293b;">
        <strong>Your Current Location</strong><br/>
        Distance to Branch: <b>${formatDistance(geofenceEval.distanceMeters)}</b><br/>
        Status: <span style="color: ${isInside ? '#059669' : '#dc2626'}; font-weight: bold;">
          ${isInside ? '✓ Inside Geofence' : '✕ Outside Perimeter'}
        </span>
      </div>
    `);

    // Polyline connecting user to branch
    const linePoints: [number, number][] = [userCoords, branchCoords];
    if (!polylineRef.current) {
      polylineRef.current = L.polyline(linePoints, {
        color: isInside ? '#10b981' : '#f59e0b',
        weight: 2,
        dashArray: '5, 8',
      }).addTo(map);
    } else {
      polylineRef.current.setLatLngs(linePoints);
      polylineRef.current.setStyle({
        color: isInside ? '#10b981' : '#f59e0b',
      });
    }

    if (isRealGpsActive && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(userCoords);
    }
  }, [userLocation, selectedBranch, geofenceEval, isRealGpsActive]);

  const centerOnUser = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17);
    }
  };

  const centerOnFacility = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [selectedBranch.coordinates.lat, selectedBranch.coordinates.lng],
        16
      );
    }
  };

  const fitBothOnMap = () => {
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        [selectedBranch.coordinates.lat, selectedBranch.coordinates.lng],
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  };

  const handlePinFacilityHere = () => {
    pinFacilityToUserLocation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 17);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Map Header & Geofence Banner */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Smart Geofence Radar</span>
              <span className="text-[11px] font-normal text-slate-400">
                (Radius: {formatDistance(selectedBranch.geofenceRadiusMeters)})
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Drag the blue pin, click the map, or use real-time GPS tracking below
            </p>
          </div>
        </div>

        {/* Current Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            geofenceEval.isWithin
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}
        >
          {geofenceEval.isWithin ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>CLEAR TO ISSUE TOKEN ({formatDistance(geofenceEval.distanceMeters)})</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>GEOFENCE LOCKED ({formatDistance(geofenceEval.distanceMeters)})</span>
            </>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[280px] sm:h-[320px] bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Mini Overlay with Coordinates & Quick Tools */}
        <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-2.5 rounded-xl border border-slate-700/60 shadow-lg text-[11px] text-slate-300 space-y-1.5">
          <div className="flex items-center justify-between gap-3 font-medium text-slate-200">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>GPS: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}</span>
            </div>
            {isRealGpsActive && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE
              </span>
            )}
          </div>
          <div className="text-slate-400 flex items-center justify-between gap-4">
            <span>Distance to Desk:</span>
            <span className="font-semibold text-white">{formatDistance(geofenceEval.distanceMeters)}</span>
          </div>
          <div className="pt-1 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={centerOnUser}
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
              title="Center on your GPS marker"
            >
              <Crosshair className="w-3 h-3" /> Center Me
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={centerOnFacility}
              className="text-[10px] text-slate-400 hover:text-slate-300 hover:underline"
              title="Center on facility"
            >
              Facility
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={fitBothOnMap}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline"
              title="Fit both user and facility in view"
            >
              View Both
            </button>
          </div>
        </div>
      </div>

      {/* Simulation & Real GPS Action Bar */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 space-y-2.5">
        {/* Real-time GPS & Location Anchoring */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={requestRealGps}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border shadow-sm ${
                isRealGpsActive
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20 animate-pulse'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-cyan-500/20'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              {isRealGpsActive ? 'Live GPS Active (Click to Pause)' : 'Use My Real GPS Location'}
            </button>

            <button
              onClick={handlePinFacilityHere}
              title="Move this facility to your current GPS position so you can test entering/leaving the geofence around your actual location"
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-sm"
            >
              <Building className="w-3.5 h-3.5" />
              Set Facility Here
            </button>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            Tip: Drag the blue user pin or click anywhere on the map to test custom spots
          </div>
        </div>

        {/* Quick Simulation Presets */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium text-slate-300">Quick Simulators:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => simulateLocationPreset('inside')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                geofenceEval.isWithin && geofenceEval.distanceMeters < 150
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Inside Branch (~75m)
            </button>

            <button
              onClick={() => simulateLocationPreset('grace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                !geofenceEval.isWithin && geofenceEval.zone === 'GRACE_ZONE'
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Grace Perimeter (~550m)
            </button>

            <button
              onClick={() => simulateLocationPreset('outside')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                !geofenceEval.isWithin && geofenceEval.zone === 'OUTSIDE'
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Outside Area (~1.8km)
            </button>
          </div>
        </div>

        {gpsError && (
          <div className="mt-2 text-xs text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/20">
            {gpsError}
          </div>
        )}
      </div>
    </div>
  );
};
