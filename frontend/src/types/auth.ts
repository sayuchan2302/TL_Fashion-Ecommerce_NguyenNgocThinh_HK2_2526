export type UserRole = 'CUSTOMER' | 'VENDOR' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  role?: UserRole;
  storeId?: string;
  isApprovedVendor?: boolean;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}
