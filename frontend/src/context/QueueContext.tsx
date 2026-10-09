import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  Branch,
  ServiceCategory,
  SmartToken,
  Coordinates,
  PriorityLevel,
  AppViewMode,
  FacilitySector,
  AdminSettings,
  TokenStatus,
} from '../types';
import {
  INITIAL_BRANCHES,
  INITIAL_SERVICES,
  INITIAL_TOKENS,
} from '../utils/mockData';
import {
  evaluateGeofence,
  getOffsetCoordinates,
  createGeofenceHash,
} from '../utils/geofence';
import type { GeofenceEvaluation } from '../utils/geofence';
import { soundManager } from '../utils/sound';

interface QueueContextType {
  branches: Branch[];
  selectedBranch: Branch;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  services: ServiceCategory[];
  branchServices: ServiceCategory[];
  tokens: SmartToken[];
  userLocation: Coordinates;
  setUserLocation: (coords: Coordinates) => void;
  isRealGpsActive: boolean;
  gpsError: string | null;
  requestRealGps: () => Promise<void>;
  stopRealGpsTracking: () => void;
  pinFacilityToUserLocation: () => void;
  simulateLocationPreset: (preset: 'inside' | 'grace' | 'outside') => void;
  geofenceEval: GeofenceEvaluation;
  activeCustomerToken: SmartToken | null;
  setActiveCustomerToken: (token: SmartToken | null) => void;
  generateToken: (params: {
    branchId: string;
    serviceId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    purposeNotes?: string;
    priority: PriorityLevel;
  }) => Promise<SmartToken>;
  activateTokenGeofence: (tokenId: string) => void;
  cancelToken: (tokenId: string) => void;
  delayToken: (tokenId: string, minutes: number) => void;
  callNextToken: (counterName: string, serviceId?: string) => SmartToken | null;
  markNoShowAndReallot: (tokenId: string, counterName: string) => { cancelledToken: SmartToken | null; reallotedToken: SmartToken | null };
  markServing: (tokenId: string) => void;
  markCompleted: (tokenId: string) => void;
  recallToken: (tokenId: string) => void;
  updateBranchRadius: (branchId: string, radiusMeters: number) => void;
  updateBranchDetails: (branchId: string, updates: Partial<Branch>) => void;
  deleteBranch: (branchId: string) => void;
  addCustomService: (newService: Omit<ServiceCategory, 'id'>) => void;
  updateServiceDetails: (serviceId: string, updates: Partial<ServiceCategory>) => void;
  deleteService: (serviceId: string) => void;
  addCustomBranch: (newBranch: Omit<Branch, 'id'>) => void;
  selectedSectorFilter: FacilitySector;
  setSelectedSectorFilter: (sector: FacilitySector) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  activeViewMode: AppViewMode;
  setActiveViewMode: (mode: AppViewMode) => void;
  resetAllTokens: () => void;
  adminAuthenticated: boolean;
  adminLogin: (pinOrPass: string) => boolean;
  adminLogout: () => void;
  adminSettings: AdminSettings;
  updateAdminSettings: (settings: Partial<AdminSettings>) => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const STORAGE_KEYS = {
  BRANCHES: 'geotoken_branches_v2',
  SERVICES: 'geotoken_services_v2',
  TOKENS: 'geotoken_tokens_v2',
  ACTIVE_TOKEN_ID: 'geotoken_active_token_id_v2',
  USER_LOCATION: 'geotoken_user_location_v2',
  SOUND_ENABLED: 'geotoken_sound_enabled_v2',
  ADMIN_AUTH: 'geotoken_admin_auth_v2',
  ADMIN_SETTINGS: 'geotoken_admin_settings_v2',
};

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  gracePeriodSeconds: 90,
  autoReallotOnNoShow: true,
  allowRemoteBooking: true,
  soundAlerts: true,
};

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Admin authentication state
  const [adminAuthenticated, setAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
  });

  const adminLogin = (pinOrPass: string): boolean => {
    if (pinOrPass.trim() === 'admin123' || pinOrPass.trim() === 'geotoken2026' || pinOrPass.trim() === 'admin') {
      setAdminAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setAdminAuthenticated(false);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
  };

  // Admin policy settings
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_ADMIN_SETTINGS;
  });

  const updateAdminSettings = (newSettings: Partial<AdminSettings>) => {
    setAdminSettings((prev: AdminSettings) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEYS.ADMIN_SETTINGS, JSON.stringify(updated));
      return updated;
    });
  };

  // Sector filter for multi-industry browsing
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<FacilitySector>('all');

  // Facilities / Branches
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0].id);

  // Services
  const [services, setServices] = useState<ServiceCategory[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SERVICES);
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  // Current selected branch object
  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) || branches[0],
    [branches, selectedBranchId]
  );

  // User location: Default to inside selected branch area (e.g. 45m away)
  const [userLocation, setUserLocation] = useState<Coordinates>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_LOCATION);
    if (saved) return JSON.parse(saved);
    return getOffsetCoordinates(INITIAL_BRANCHES[0].coordinates, 45, 60);
  });

  const [isRealGpsActive, setIsRealGpsActive] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Sound toggle
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    soundManager.setSoundEnabled(enabled);
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, JSON.stringify(enabled));
  };

  // View mode: 'customer' | 'staff' | 'display'
  const [activeViewMode, setActiveViewMode] = useState<AppViewMode>('customer');

  // Tokens
  const [tokens, setTokens] = useState<SmartToken[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TOKENS);
    return saved ? JSON.parse(saved) : INITIAL_TOKENS;
  });

  // Active customer token tracking
  const [activeCustomerTokenId, setActiveCustomerTokenId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_TOKEN_ID) || null;
  });

  const activeCustomerToken = useMemo(
    () => tokens.find((t) => t.id === activeCustomerTokenId) || null,
    [tokens, activeCustomerTokenId]
  );

  const setActiveCustomerToken = useCallback((token: SmartToken | null) => {
    if (token) {
      setActiveCustomerTokenId(token.id);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TOKEN_ID, token.id);
    } else {
      setActiveCustomerTokenId(null);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN_ID);
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
  }, [tokens]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_LOCATION, JSON.stringify(userLocation));
  }, [userLocation]);

  // Evaluate Geofence based on current user location & selected branch
  const geofenceEval = useMemo(() => {
    return evaluateGeofence(userLocation, selectedBranch.coordinates, selectedBranch.geofenceRadiusMeters);
  }, [userLocation, selectedBranch]);

  // Monitor Geofence for Active Customer Token
  useEffect(() => {
    if (!activeCustomerToken) return;
    if (activeCustomerToken.status !== 'waiting' && activeCustomerToken.status !== 'called') return;

    // Check if the user has drifted outside geofence while waiting
    const currentEval = evaluateGeofence(
      userLocation,
      selectedBranch.coordinates,
      selectedBranch.geofenceRadiusMeters
    );

    if (!currentEval.isWithin && currentEval.zone === 'OUTSIDE') {
      soundManager.playWarningAlert();
    }
  }, [userLocation, activeCustomerToken, selectedBranch]);

  // Filter services for current branch
  const branchServices = useMemo(() => {
    return services.filter((s) => s.branchId === selectedBranch.id);
  }, [services, selectedBranch]);

  // Real GPS live watch reference
  const watchIdRef = useRef<number | null>(null);

  const stopRealGpsTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsRealGpsActive(false);
  }, []);

  // Clean up GPS watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Request real device GPS with continuous live tracking
  const requestRealGps = async () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    if (isRealGpsActive) {
      stopRealGpsTracking();
      return;
    }

    try {
      // 1. Fetch immediate snapshot
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          };
          setUserLocation(coords);
          setIsRealGpsActive(true);
        },
        (err) => {
          setGpsError(`GPS Access: ${err.message}. Please allow location permissions in your browser.`);
          setIsRealGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );

      // 2. Continuous real-time position updates as user moves
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const coords: Coordinates = {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          };
          setUserLocation(coords);
          setIsRealGpsActive(true);
        },
        (err) => {
          console.warn('Real-time GPS tracker notice:', err.message);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
      );
      watchIdRef.current = id;
    } catch {
      setGpsError('Error requesting geolocation position.');
    }
  };

  // Move facility center to user's current GPS location (allows real-world testing anywhere)
  const pinFacilityToUserLocation = useCallback(() => {
    if (!selectedBranch) return;
    setBranches((prev) =>
      prev.map((b) =>
        b.id === selectedBranch.id
          ? {
              ...b,
              coordinates: { ...userLocation },
              address: `Live Location (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`,
            }
          : b
      )
    );
  }, [selectedBranch, userLocation]);

  // Location Simulation Presets
  const simulateLocationPreset = (preset: 'inside' | 'grace' | 'outside') => {
    stopRealGpsTracking();
    setGpsError(null);

    const radius = selectedBranch.geofenceRadiusMeters;
    let distance = 50;

    if (preset === 'inside') {
      distance = Math.round(radius * 0.15); // Well within center (e.g. 75m)
    } else if (preset === 'grace') {
      distance = Math.round(radius * 1.1); // Slightly outside boundary (e.g. 550m)
    } else {
      distance = Math.round(radius * 3.5); // Well outside (e.g. 1750m)
    }

    const newCoords = getOffsetCoordinates(selectedBranch.coordinates, distance, 55);
    setUserLocation(newCoords);
  };

  // Generate Smart Token with geofence stamp
  const generateToken = async (params: {
    branchId: string;
    serviceId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    purposeNotes?: string;
    priority: PriorityLevel;
  }): Promise<SmartToken> => {
    const branch = branches.find((b) => b.id === params.branchId) || selectedBranch;
    const service = services.find((s) => s.id === params.serviceId) || branchServices[0];

    // Current Geofence validation check
    const currentEval = evaluateGeofence(userLocation, branch.coordinates, branch.geofenceRadiusMeters);
    const isInside = currentEval.isWithin;

    if (!isInside && !adminSettings.allowRemoteBooking) {
      throw new Error(
        `Geofence lock active: You are ${Math.round(currentEval.distanceMeters)}m away. You must be within ${branch.geofenceRadiusMeters}m of ${branch.name} to generate a service token.`
      );
    }

    // Determine next sequential token number for this service code
    const existingForService = tokens.filter(
      (t) => t.branchId === branch.id && t.serviceId === service.id
    );
    const nextNumber = existingForService.length + 101;
    const tokenNumber = `${service.code}-${nextNumber}`;

    // Queue position and estimated wait time
    const waitingTokensInService = tokens.filter(
      (t) =>
        t.branchId === branch.id &&
        t.serviceId === service.id &&
        (t.status === 'waiting' || t.status === 'called')
    );
    const queuePosition = waitingTokensInService.length + 1;
    const estimatedMinutesWait = queuePosition * service.avgMinutesPerCustomer;
    const estimatedCallTime = new Date(Date.now() + estimatedMinutesWait * 60000).toISOString();
    const nowIso = new Date().toISOString();

    const verificationHash = isInside
      ? createGeofenceHash(userLocation, branch.id, nowIso)
      : 'PENDING-ARRIVAL';

    const initialStatus: TokenStatus = isInside ? 'waiting' : 'pending';

    const newToken: SmartToken = {
      id: `token-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tokenNumber,
      branchId: branch.id,
      serviceId: service.id,
      customerName: params.customerName.trim(),
      customerPhone: params.customerPhone.trim(),
      customerEmail: params.customerEmail.trim(),
      purposeNotes: params.purposeNotes?.trim(),
      priority: params.priority,
      status: initialStatus,
      createdAt: nowIso,
      activatedAt: isInside ? nowIso : undefined,
      estimatedCallTime,
      queuePosition,
      assignedCounter: service.countersAssigned[0] || 'Service Desk 1',
      qrPayload: `GEOTOKEN:${tokenNumber}:${branch.code}:${verificationHash}`,
      geofenceVerification: {
        isVerified: isInside,
        userCoordinates: { ...userLocation },
        distanceMeters: Math.round(currentEval.distanceMeters),
        radiusMeters: branch.geofenceRadiusMeters,
        timestamp: nowIso,
        verificationHash,
        accuracyMeters: isRealGpsActive ? 5 : 2,
      },
    };

    setTokens((prev) => [...prev, newToken]);
    setActiveCustomerToken(newToken);
    soundManager.playSuccessSound();

    return newToken;
  };

  // Activate token once customer enters geofence perimeter
  const activateTokenGeofence = useCallback((tokenId: string) => {
    const nowIso = new Date().toISOString();
    setTokens((prev) => {
      const target = prev.find((t) => t.id === tokenId);
      if (!target || target.status !== 'pending') return prev;
      const b = branches.find((item) => item.id === target.branchId) || selectedBranch;
      const curEval = evaluateGeofence(userLocation, b.coordinates, b.geofenceRadiusMeters);
      const hash = createGeofenceHash(userLocation, b.id, nowIso);

      return prev.map((t) => {
        if (t.id !== tokenId) return t;
        return {
          ...t,
          status: 'waiting',
          activatedAt: nowIso,
          geofenceVerification: {
            isVerified: true,
            userCoordinates: { ...userLocation },
            distanceMeters: Math.round(curEval.distanceMeters),
            radiusMeters: b.geofenceRadiusMeters,
            timestamp: nowIso,
            verificationHash: hash,
            accuracyMeters: isRealGpsActive ? 5 : 2,
          },
          qrPayload: `GEOTOKEN:${t.tokenNumber}:${b.code}:${hash}`,
        };
      });
    });

    soundManager.playSuccessSound();
  }, [branches, selectedBranch, userLocation, isRealGpsActive]);

  // Auto-activate pending token when user arrives within geofence perimeter
  useEffect(() => {
    if (!activeCustomerToken) return;
    if (activeCustomerToken.status !== 'pending') return;

    const b = branches.find((item) => item.id === activeCustomerToken.branchId) || selectedBranch;
    const curEval = evaluateGeofence(userLocation, b.coordinates, b.geofenceRadiusMeters);

    if (curEval.isWithin) {
      activateTokenGeofence(activeCustomerToken.id);
    }
  }, [userLocation, activeCustomerToken, branches, selectedBranch, activateTokenGeofence]);

  // Cancel a token
  const cancelToken = (tokenId: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, status: 'cancelled', cancelledAt: new Date().toISOString() } : t))
    );
    if (activeCustomerTokenId === tokenId) {
      setActiveCustomerToken(null);
    }
  };

  // Delay / Snooze token
  const delayToken = (tokenId: string, minutes: number) => {
    setTokens((prev) =>
      prev.map((t) => {
        if (t.id !== tokenId) return t;
        const currentEst = new Date(t.estimatedCallTime).getTime();
        return {
          ...t,
          estimatedCallTime: new Date(currentEst + minutes * 60000).toISOString(),
          status: 'waiting',
        };
      })
    );
  };

  // Call Next Token (by Counter Operator)
  const callNextToken = (counterName: string, serviceId?: string): SmartToken | null => {
    const eligibleTokens = tokens
      .filter((t) => {
        if (t.branchId !== selectedBranch.id) return false;
        if (t.status !== 'waiting') return false;
        if (serviceId && t.serviceId !== serviceId) return false;
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

    if (eligibleTokens.length === 0) return null;

    const nextToken = eligibleTokens[0];
    const nowIso = new Date().toISOString();

    setTokens((prev) =>
      prev.map((t) => {
        if (t.id === nextToken.id) {
          return {
            ...t,
            status: 'called',
            assignedCounter: counterName,
            calledAt: nowIso,
            queuePosition: 0,
          };
        }
        return t;
      })
    );

    // Announce audio chime & spoken instruction
    soundManager.announceTokenCall(nextToken.tokenNumber, counterName);

    return nextToken;
  };

  // Mark in service
  const markServing = (tokenId: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, status: 'in_service', servedAt: new Date().toISOString() } : t))
    );
  };

  // Mark completed
  const markCompleted = (tokenId: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, status: 'completed', completedAt: new Date().toISOString() } : t))
    );
  };

  // Re-call buzzer
  const recallToken = (tokenId: string) => {
    const token = tokens.find((t) => t.id === tokenId);
    if (token) {
      soundManager.announceTokenCall(token.tokenNumber, token.assignedCounter || 'the service counter');
    }
  };

  // Update Branch Geofence Radius
  const updateBranchRadius = (branchId: string, radiusMeters: number) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, geofenceRadiusMeters: radiusMeters } : b))
    );
  };

  // Add a brand new Custom Service Category on the fly
  const addCustomService = (newService: Omit<ServiceCategory, 'id'>) => {
    const id = `srv-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullService: ServiceCategory = {
      ...newService,
      id,
    };
    setServices((prev) => [...prev, fullService]);
  };

  // Add a brand new Custom Branch / Facility on the fly
  const addCustomBranch = (newBranch: Omit<Branch, 'id'>) => {
    const id = `facility-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullBranch: Branch = {
      ...newBranch,
      id,
    };
    setBranches((prev) => [...prev, fullBranch]);
    setSelectedBranchId(id);
  };

  // Mark No-Show: Cancels current token and automatically allots next person present at that time
  const markNoShowAndReallot = (tokenId: string, counterName: string) => {
    const nowIso = new Date().toISOString();
    let cancelled: SmartToken | null = null;
    let nextCalled: SmartToken | null = null;

    setTokens((prev) => {
      const updated = prev.map((t) => {
        if (t.id === tokenId) {
          cancelled = {
            ...t,
            status: 'cancelled',
            cancelledAt: nowIso,
            cancelReason: 'Customer absent at call time (No-Show). Turn reallocated to next person present.',
          };
          return cancelled;
        }
        return t;
      });

      // Find next eligible WAITING token (physically inside geofence)
      const eligible = updated
        .filter((t) => t.branchId === selectedBranch.id && t.status === 'waiting')
        .sort((a, b) => {
          const rank = (p: PriorityLevel) => {
            if (p === 'vip_priority') return 4;
            if (p === 'senior_disabled') return 3;
            if (p === 'appointment') return 2;
            return 1;
          };
          const diff = rank(b.priority) - rank(a.priority);
          if (diff !== 0) return diff;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      if (eligible.length > 0) {
        const nextOne = eligible[0];
        nextCalled = {
          ...nextOne,
          status: 'called',
          assignedCounter: counterName,
          calledAt: nowIso,
          queuePosition: 0,
        };
        soundManager.announceTokenCall(nextCalled.tokenNumber, counterName);
        return updated.map((t) => (t.id === nextCalled!.id ? nextCalled! : t));
      }

      return updated;
    });

    if (activeCustomerTokenId === tokenId) {
      setActiveCustomerToken(null);
    }

    return { cancelledToken: cancelled, reallotedToken: nextCalled };
  };

  // Update Branch Details
  const updateBranchDetails = (branchId: string, updates: Partial<Branch>) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, ...updates } : b))
    );
  };

  // Delete Branch
  const deleteBranch = (branchId: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    if (selectedBranchId === branchId) {
      const remaining = branches.filter((b) => b.id !== branchId);
      if (remaining.length > 0) {
        setSelectedBranchId(remaining[0].id);
      }
    }
  };

  // Update Service Details
  const updateServiceDetails = (serviceId: string, updates: Partial<ServiceCategory>) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, ...updates } : s))
    );
  };

  // Delete Service
  const deleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  // Reset demo
  const resetAllTokens = () => {
    setBranches(INITIAL_BRANCHES);
    setServices(INITIAL_SERVICES);
    setTokens(INITIAL_TOKENS);
    setSelectedBranchId(INITIAL_BRANCHES[0].id);
    setActiveCustomerToken(null);
    localStorage.removeItem(STORAGE_KEYS.BRANCHES);
    localStorage.removeItem(STORAGE_KEYS.SERVICES);
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TOKEN_ID);
  };

  return (
    <QueueContext.Provider
      value={{
        branches,
        selectedBranch,
        selectedBranchId,
        setSelectedBranchId,
        services,
        branchServices,
        tokens,
        userLocation,
        setUserLocation,
        isRealGpsActive,
        gpsError,
        requestRealGps,
        stopRealGpsTracking,
        pinFacilityToUserLocation,
        simulateLocationPreset,
        geofenceEval,
        activeCustomerToken,
        setActiveCustomerToken,
        generateToken,
        activateTokenGeofence,
        cancelToken,
        delayToken,
        callNextToken,
        markNoShowAndReallot,
        markServing,
        markCompleted,
        recallToken,
        updateBranchRadius,
        updateBranchDetails,
        deleteBranch,
        addCustomService,
        updateServiceDetails,
        deleteService,
        addCustomBranch,
        selectedSectorFilter,
        setSelectedSectorFilter,
        soundEnabled,
        setSoundEnabled,
        activeViewMode,
        setActiveViewMode,
        resetAllTokens,
        adminAuthenticated,
        adminLogin,
        adminLogout,
        adminSettings,
        updateAdminSettings,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};
