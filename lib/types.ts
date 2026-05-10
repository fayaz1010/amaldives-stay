
import { User, Tenant, Property, Room, Booking, GuestProfile, StaffProfile, Service, HousekeepingTask, MaintenanceRequest, InventoryItem, Payment, Report } from '@prisma/client';

// Extended types with relations
export type UserWithProfile = User & {
  guestProfile?: GuestProfile | null;
  staffProfile?: StaffProfile | null;
  tenant?: Tenant | null;
};

export type TenantWithProperties = Tenant & {
  properties: Property[];
  users: User[];
  _count: {
    users: number;
    properties: number;
    bookings: number;
  };
};

export type PropertyWithRooms = Property & {
  rooms: Room[];
  tenant: Tenant;
};

export type RoomWithBookings = Room & {
  bookings: Booking[];
  property: Property;
};

export type BookingWithDetails = Booking & {
  guest: User & { guestProfile?: GuestProfile };
  room: Room & { property: Property };
  payments: Payment[];
  serviceOrders: ServiceOrder[];
};

export type ServiceOrder = {
  id: string;
  tenantId: string;
  bookingId?: string;
  serviceId: string;
  guestId: string;
  quantity: number;
  totalAmount: number;
  status: string;
  scheduledDate?: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  service: Service;
  guest: User;
};

export type HousekeepingTaskWithDetails = HousekeepingTask & {
  room: Room & { property: Property };
  assignedUser?: User;
};

export type MaintenanceRequestWithDetails = MaintenanceRequest & {
  room?: Room;
  reporter: User;
  assignedUser?: User;
};

// Dashboard types
export type DashboardStats = {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  totalRevenue: number;
  monthlyRevenue: number;
  occupancyRate: number;
  averageDailyRate: number;
  revPAR: number;
};

export type RevenueData = {
  date: string;
  revenue: number;
  bookings: number;
  occupancy: number;
};

export type OccupancyData = {
  date: string;
  occupancy: number;
  available: number;
  occupied: number;
};

// Booking types
export type BookingFormData = {
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  roomId: string;
  guestDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  services: string[];
  specialRequests?: string;
};

export type AvailabilityCheck = {
  available: boolean;
  price: number;
  currency: string;
  restrictions?: string[];
};

// Filter types
export type BookingFilters = {
  status?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  guest?: string;
  room?: string;
};

export type RoomFilters = {
  type?: string;
  status?: string;
  capacity?: number;
  priceRange?: {
    min: number;
    max: number;
  };
};

// API response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>;

// Settings types
export type TenantSettings = {
  general: {
    currency: string;
    timezone: string;
    language: string;
    dateFormat: string;
    timeFormat: string;
  };
  booking: {
    maxAdvanceBookingDays: number;
    minAdvanceBookingHours: number;
    allowSameDayBooking: boolean;
    requireDepositPercentage: number;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    bookingConfirmations: boolean;
    checkInReminders: boolean;
    maintenanceAlerts: boolean;
  };
  integrations: {
    paymentGateway: string;
    channelManager: string;
    pms: string;
  };
};

export type PropertySettings = {
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  timezone: string;
  taxes: {
    rate: number;
    included: boolean;
  };
  policies: {
    cancellationPolicy: string;
    childPolicy: string;
    petPolicy: string;
    smokingPolicy: string;
  };
};

// Theme types
export type TenantTheme = {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily: string;
  borderRadius: string;
  customCSS?: string;
};

// Housekeeping types
export type CleaningChecklist = {
  id: string;
  category: string;
  items: {
    id: string;
    description: string;
    completed: boolean;
    notes?: string;
  }[];
};

export type TaskSchedule = {
  roomId: string;
  roomNumber: string;
  taskType: string;
  priority: string;
  estimatedDuration: number;
  assignedTo?: string;
  scheduledDate: Date;
  status: string;
};

// Maintenance types
export type MaintenanceCategory = {
  id: string;
  name: string;
  description: string;
  defaultPriority: string;
};

// Inventory types
export type InventoryAlert = {
  id: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  category: string;
  urgency: 'low' | 'medium' | 'high';
};

// Staff types
export type StaffRole = {
  id: string;
  name: string;
  permissions: string[];
  description: string;
};

export type StaffSchedule = {
  userId: string;
  name: string;
  role: string;
  shifts: {
    date: Date;
    startTime: string;
    endTime: string;
    status: 'scheduled' | 'completed' | 'absent';
  }[];
};

// Payment types
export type PaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
  paymentMethod?: string;
};

// Super admin types
export type SystemStats = {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
};

export type TenantMetrics = {
  id: string;
  name: string;
  plan: string;
  status: string;
  users: number;
  bookings: number;
  revenue: number;
  lastActive: Date;
  health: 'good' | 'warning' | 'critical';
};

// Utility types
export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type TableColumn<T> = {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
};

export type FormFieldConfig = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
  options?: SelectOption[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
};
