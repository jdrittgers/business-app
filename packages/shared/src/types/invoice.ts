export enum InvoiceStatus {
  PENDING = 'PENDING',
  PARSED = 'PARSED',
  FAILED = 'FAILED',
  REVIEWED = 'REVIEWED'
}

export enum InvoiceProductType {
  FERTILIZER = 'FERTILIZER',
  CHEMICAL = 'CHEMICAL',
  SEED = 'SEED'
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  productType: InvoiceProductType;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  matchedProductId?: string;
  matchedProductType?: InvoiceProductType;
  isNewProduct: boolean;
  priceLockedAt?: Date;
  priceLockedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  businessId: string;
  uploadedBy: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: InvoiceStatus;
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  totalAmount?: number;
  parsedData?: any;
  parseError?: string;
  parsedAt?: Date;
  createdBidRequestId?: string;
  createdAt: Date;
  updatedAt: Date;
  lineItems?: InvoiceLineItem[];
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface UpdateInvoiceLineItemRequest {
  productName?: string;
  productType?: InvoiceProductType;
  quantity?: number;
  unit?: string;
  pricePerUnit?: number;
  totalPrice?: number;
}

export interface PurchaseHistory {
  id: string;
  businessId: string;
  invoiceLineItemId: string;
  productType: InvoiceProductType;
  productId?: string;
  productName: string;
  purchasedQuantity: number;
  purchasedUnit: string;
  purchasedPrice: number;
  totalCost: number;
  purchasedAt: Date;
  vendorName?: string;
  createdAt: Date;
}
