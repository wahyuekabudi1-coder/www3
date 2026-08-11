export interface TimeSchedule {
  time: string;
  activity: string;
}

export interface ItineraryItem {
  day: number;
  title: string;
  description: string;
  timeSchedules: TimeSchedule[];
  activity?: string; // backward compatibility
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Trip {
  id: string;
  title: string;
  slug: string;
  location: string;
  duration: string;
  description: string;
  coverImage: string;
  included: string[];
  excluded: string[];
  itinerary: ItineraryItem[];
  startingPrice: number;
  wnaStartingPrice?: number;
  highlight?: string;
  faq?: FAQItem[];
  gallery?: string[];
  whatsToBring?: string[];
  status?: "draft" | "published";
  price?: number;
  wnaPrice?: number;
}

export interface Batch {
  id: string;
  tripId: string;
  departureDate: string; // e.g., "2026-07-15"
  quota: number;
  availableSeats: number;
  price: number;
  wnaPrice?: number;
  status: 'Open' | 'Closed';
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'Rejected';
export type NationalityType = 'WNI' | 'WNA' | 'WNA_CHINA' | 'WNA_EUROPE';

export interface ParticipantData {
  name: string;
  englishName: string;
  weChatId: string;
  xiaoHongShuId: string;
  city: string;
  whatsapp?: string;
  email: string;
  flightNumber?: string;
  nationalityType?: NationalityType;
}

export interface Booking {
  id: string;
  bookingCode: string;
  tripId: string;
  tripTitle?: string;
  batchId: string;
  departureDate?: string;
  fullName: string;
  email: string;
  phone: string;
  participantsCount: number;
  participantsNames: string[];
  proofOfPayment: string; // base64 or file name / "NOT_APPLICABLE_PREVIEW"
  status: BookingStatus;
  paymentStatus?: string;
  paymentIntentId?: string;
  paymentId?: string;
  paidAt?: string;
  totalPriceIDR?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName?: string;
  type?: string;
  details?: any;
  rejectReason?: string;
  totalPrice: number;
  createdAt: string;
  participantData?: ParticipantData;
  adminNotes?: string;
  nationalityType?: NationalityType;
}

export interface DatabaseState {
  trips: Trip[];
  batches: Batch[];
  bookings: Booking[];
}

