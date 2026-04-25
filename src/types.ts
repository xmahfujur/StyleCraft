export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  bannerImage: string;
  description: string;
  isFeatured: boolean;
  priority: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentCategoryId?: string;
  icon?: string;
  priority: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountedPrice?: number;
  images: string[];
  collectionId: string;
  categoryId: string;
  tags: string[];
  stock: number;
  salesCount: number;
  rating: number;
  reviewsCount: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'Placed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
}
