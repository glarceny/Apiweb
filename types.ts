export enum AppState {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  DASHBOARD = 'DASHBOARD',
  STORE = 'STORE',
  PAYMENT = 'PAYMENT',
  SUCCESS = 'SUCCESS',
  HISTORY = 'HISTORY'
}

export interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
  picture?: string;
  token?: string; // Session token
}

export interface Product {
  id: string;
  name: string;
  price: number;
  ram: number;
  disk: number;
  cpu: number;
  extra: string;
  category: 'linux' | 'windows' | 'nodejs';
}

export interface ProductCatalog {
  linux: Product[];
  windows: Product[];
  nodejs: Product[];
}

export interface Transaction {
  order_id: string;
  amount: number;
  qr_string: string;
  paket_type: string;
  paket_name: string;
  username_req: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  created_at: string;
  server_detail?: any; // Server info from Pterodactyl
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}