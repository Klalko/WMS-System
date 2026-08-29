export type UserRole = 'WORKER' | 'ADMIN'
export type TransactionType = 'inbound' | 'outbound'

export interface Profile {
  id: string
  fullName: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  currentStock: number
  unit: string
  lowStockThreshold: number
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  productId: string
  userId: string
  type: TransactionType
  quantity: number
  notes: string | null
  createdAt: string
  product?: Product
  user?: Profile
}

export interface ApiSuccess<T> {
  data: T
}

export interface ApiError {
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface DashboardStats {
  totalProducts: number
  totalInbound: number
  totalOutbound: number
  lowStockCount: number
  recentTransactions: Transaction[]
  stockByProduct: { name: string; stock: number }[]
  transactionsByDay: { date: string; inbound: number; outbound: number }[]
}
