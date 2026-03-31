export interface VendorProfile {
  id: number;
  store_name: string;
  phone: string;
  description: string;
  payment_qr: string | null;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface ProductImage {
  id: number;
  image: string;
  is_primary: boolean;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: number | null;
  category_name: string;
  is_active: boolean;
  images: ProductImage[];
}

export interface Inventory {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  reserved_quantity: number;
}

export interface LiveSession {
  id: number;
  title: string;
  description: string;
  platform: string;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'ended';
  slug: string;
  public_url: string;
}

export interface Reservation {
  id: number;
  session: number;
  session_title: string;
  product: number;
  product_name: string;
  customer_name: string;
  customer_phone: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'shipped' | 'delivered';
  notes: string;
  created_at: string;
}

export interface Payment {
  id: number;
  reservation: number;
  reservation_id: number;
  customer_name: string;
  product_name: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  receipt_image: string | null;
  status: 'submitted' | 'confirmed' | 'rejected';
  created_at: string;
}
