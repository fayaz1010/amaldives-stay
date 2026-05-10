
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date utilities
export function formatDate(date: Date | string, formatStr: string = 'PPP'): string {
  if (!date) return '';
  
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(parsedDate)) return '';
  
  return format(parsedDate, formatStr);
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

// String utilities
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function generateId(prefix: string = ''): string {
  return `${prefix}${Math.random().toString(36).substr(2, 9)}`;
}

export function generateConfirmationNumber(): string {
  return Math.random().toString(36).toUpperCase().substr(2, 8);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Number utilities
export function calculateOccupancyRate(occupied: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((occupied / total) * 100);
}

export function calculateRevPAR(revenue: number, totalRooms: number): number {
  if (totalRooms === 0) return 0;
  return revenue / totalRooms;
}

export function calculateADR(revenue: number, occupiedRooms: number): number {
  if (occupiedRooms === 0) return 0;
  return revenue / occupiedRooms;
}

// Array utilities
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

export function filterBy<T>(array: T[], filters: Partial<T>): T[] {
  return array.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true;
      return item[key as keyof T] === value;
    });
  });
}

// Object utilities
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

// Tenant utilities
export function extractTenantFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if it's a subdomain
    const parts = hostname.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
    
    return null;
  } catch {
    return null;
  }
}

export function getTenantUrl(subdomain: string, path: string = ''): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const url = new URL(baseUrl);
  
  if (subdomain) {
    url.hostname = `${subdomain}.${url.hostname}`;
  }
  
  url.pathname = path;
  return url.toString();
}

// Status utilities
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Booking statuses
    pending: 'text-yellow-600 bg-yellow-50',
    confirmed: 'text-green-600 bg-green-50',
    'checked-in': 'text-blue-600 bg-blue-50',
    'checked-out': 'text-gray-600 bg-gray-50',
    cancelled: 'text-red-600 bg-red-50',
    'no-show': 'text-red-600 bg-red-50',
    
    // Room statuses
    available: 'text-green-600 bg-green-50',
    occupied: 'text-blue-600 bg-blue-50',
    cleaning: 'text-yellow-600 bg-yellow-50',
    maintenance: 'text-red-600 bg-red-50',
    'out-of-order': 'text-red-600 bg-red-50',
    
    // Task statuses
    'in-progress': 'text-blue-600 bg-blue-50',
    completed: 'text-green-600 bg-green-50',
    
    // Priority levels
    low: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    high: 'text-orange-600 bg-orange-50',
    urgent: 'text-red-600 bg-red-50',
    
    // Tenant statuses
    active: 'text-green-600 bg-green-50',
    suspended: 'text-red-600 bg-red-50',
    trial: 'text-blue-600 bg-blue-50',
  };
  
  return statusColors[status.toLowerCase()] || 'text-gray-600 bg-gray-50';
}

// Permission utilities
export function hasPermission(userRole: string, requiredPermission: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    TENANT_ADMIN: ['read', 'write', 'delete', 'manage_staff', 'manage_settings'],
    MANAGER: ['read', 'write', 'manage_bookings', 'manage_rooms', 'view_reports'],
    FRONT_DESK: ['read', 'write', 'manage_bookings', 'manage_guests'],
    HOUSEKEEPING: ['read', 'write', 'manage_housekeeping'],
    MAINTENANCE: ['read', 'write', 'manage_maintenance'],
    GUEST: ['read'],
  };
  
  const permissions = rolePermissions[userRole] || [];
  return permissions.includes('*') || permissions.includes(requiredPermission);
}

// Data transformation utilities
export function transformBookingData(booking: any) {
  return {
    ...booking,
    checkInDate: new Date(booking.checkInDate),
    checkOutDate: new Date(booking.checkOutDate),
    nights: Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24)),
    totalGuests: booking.adults + booking.children,
  };
}

export function transformRevenueData(data: any[]): any[] {
  return data.map(item => ({
    ...item,
    date: formatDate(item.date, 'MMM dd'),
    revenue: parseFloat(item.revenue?.toString() || '0'),
    occupancy: Math.round(item.occupancy || 0),
  }));
}

// Error handling utilities
export function handleApiError(error: any): { message: string; code?: string } {
  if (error?.response?.data?.message) {
    return {
      message: error.response.data.message,
      code: error.response.data.code,
    };
  }
  
  if (error?.message) {
    return { message: error.message };
  }
  
  return { message: 'An unexpected error occurred' };
}

// Cache utilities
export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);
  
  return `${prefix}:${JSON.stringify(sortedParams)}`;
}

// Loading state utilities
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// File utilities
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// URL utilities
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
}

export function parseQueryString(query: string): Record<string, string> {
  const params = new URLSearchParams(query);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}
