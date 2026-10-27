export type ListingStatus = "AVAILABLE" | "PENDING" | "SOLD";
export type RequirementStatus = "OPEN" | "FULFILLED" | "CLOSED";
export type InquiryStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  name: string | null;
  email: string;
  phoneNumber?: string | null;
  companyName?: string | null;
  role: Role;
  createdAt?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  itemType: string;
  partNumber?: string | null;
  compatibleWith?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  condition: string;
  location: string;
  photos: string[];
  quantity: number;
  status: ListingStatus;
  isApproved: boolean;
  sellerId?: string;
  seller?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    companyName?: string | null;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  category: string;
  itemType: string;
  partNumber?: string | null;
  compatibleWith?: string | null;
  status: RequirementStatus;
  isApproved: boolean;
  buyerId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Inquiry {
  id: string;
  listingId?: string | null;
  requirementId?: string | null;
  inquirerId: string;
  name: string;
  email: string;
  phone: string;
  company?: string | null;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  listing?: {
    id: string;
    title: string;
    itemType: string;
    minPrice?: number | null;
    maxPrice?: number | null;
  };
  requirement?: {
    id: string;
    title: string;
    itemType: string;
  };
}

export interface ListingsResponse {
  listings: Listing[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
