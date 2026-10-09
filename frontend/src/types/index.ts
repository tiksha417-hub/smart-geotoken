export interface Coordinates {
  lat: number;
  lng: number;
}

export type FacilitySector =
  | 'all'
  | 'healthcare'
  | 'government'
  | 'telecom'
  | 'education'
  | 'retail'
  | 'general'
  | 'banking';

export interface Branch {
  id: string;
  name: string;
  sector: FacilitySector;
  sectorLabel: string;
  icon: string;
  code: string;
  tagline: string;
  address: string;
  coordinates: Coordinates;
  geofenceRadiusMeters: number;
  operatingHours: string;
  contactPhone: string;
  isOpen: boolean;
}

export interface ServiceCategory {
  id: string;
  branchId: string;
  name: string;
  code: string; // e.g., 'C', 'R', 'P', 'T', 'D'
  description: string;
  avgMinutesPerCustomer: number;
  iconName: string;
  colorScheme: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose' | 'indigo' | 'cyan';
  requiredDocuments: string[];
  countersAssigned: string[];
}

export type PriorityLevel = 'standard' | 'senior_disabled' | 'vip_priority' | 'appointment';

export type TokenStatus = 'pending' | 'waiting' | 'called' | 'in_service' | 'completed' | 'cancelled' | 'delayed';

export interface GeofenceVerification {
  isVerified: boolean;
  userCoordinates: Coordinates;
  distanceMeters: number;
  radiusMeters: number;
  timestamp: string;
  verificationHash: string;
  accuracyMeters?: number;
}

export interface SmartToken {
  id: string;
  tokenNumber: string; // e.g., 'C-104', 'D-201'
  branchId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  purposeNotes?: string;
  priority: PriorityLevel;
  status: TokenStatus;
  createdAt: string;
  activatedAt?: string;
  estimatedCallTime: string;
  queuePosition: number;
  assignedCounter?: string;
  geofenceVerification: GeofenceVerification;
  calledAt?: string;
  servedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  qrPayload: string;
}

export interface QueueStats {
  waitingCount: number;
  servingCount: number;
  completedTodayCount: number;
  avgWaitTimeMinutes: number;
}

export type AppViewMode = 'customer' | 'staff' | 'display' | 'admin';

export interface AdminSettings {
  gracePeriodSeconds: number;
  autoReallotOnNoShow: boolean;
  allowRemoteBooking: boolean;
  soundAlerts: boolean;
}
