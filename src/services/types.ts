export interface Product {
    id?: string;
    owner_id: string;
    name: string;
    category: string;
    description: string;
    price_per_hour: number;
    image_url: string;
    gallery_urls?: string[];
    lat: number;
    lng: number;
    available_dates?: string[];
}

export interface UserData {
    clerk_id: string;
    role?: string;
    full_name?: string;
    address?: string;
    phone?: string;
    [key: string]: any;
}

export interface Booking {
    id?: string;
    machine_id: string;
    user_id: string;
    date: string;
    start_time: string;
    end_time: string;
    duration: number;
    total_cost: number;
    status: 'confirmed' | 'cancelled';
    created_at?: string;
}

export interface RentalRequest {
    id?: string;
    product_id: string;
    requester_id: string;
    requested_date: string;
    start_time: string;
    end_time: string;
    duration: number;
    estimated_cost: number;
    status: 'pending' | 'accepted' | 'rejected';
    message?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ChatMessage {
    id?: string;
    rental_request_id: string;
    sender_id: string;
    message: string;
    read: boolean;
    created_at?: string;
}
