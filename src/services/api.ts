import { supabase } from '../lib/supabase';
import type { UserData, Product, RentalRequest, ChatMessage } from './types';

// Re-export UserData for backward compatibility if needed, or update imports elsewhere
export type { UserData };

export const uploadProductImage = async (file: File): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error } = await supabase.storage
            .from('product-images')
            .upload(filePath, file);

        if (error) {
            console.error('Error uploading image:', error);
            return null;
        }

        const { data } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (err) {
        console.error('Unexpected error uploading image:', err);
        return null;
    }
};

export const createProduct = async (product: Product): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('products')
            .insert([{ ...product, available_dates: product.available_dates }])
            .select()
            .single();

        if (error) {
            console.error('Error creating product:', error);
            return null;
        }
        return data.id;
    } catch (err) {
        console.error('Unexpected error creating product:', err);
        return null;
    }
};

export const fetchUser = async (clerkId: string): Promise<UserData | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('clerk_id', clerkId)
            .single();

        if (error) {
            console.error('Error fetching user:', error.message);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Unexpected error fetching user:', err);
        return null;
    }
};

export const updateUser = async (data: UserData): Promise<void> => {
    try {
        const { error } = await supabase
            .from('users')
            .upsert({
                clerk_id: data.clerk_id,
                role: data.role,
                full_name: data.full_name,
                address: data.address,
                phone: data.phone
            }, { onConflict: 'clerk_id' });

        if (error) {
            throw new Error(error.message);
        }
        console.log("User updated in Supabase:", data);
    } catch (err) {
        console.error('Error updating profile:', err);
        throw err;
    }
};

export const createBooking = async (booking: any): Promise<any | null> => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .insert([booking])
            .select()
            .single();

        if (error) {
            console.error('Error creating booking:', error);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Unexpected error creating booking:', err);
        return null;
    }
};

export const getBookedDates = async (machineId: string): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('date')
            .eq('machine_id', machineId)
            .eq('status', 'confirmed');

        if (error) {
            console.error('Error fetching booked dates:', error);
            return [];
        }
        return data.map((b: any) => b.date);
    } catch (err) {
        console.error('Unexpected error fetching booked dates:', err);
        return [];
    }
};

export const getUserBookings = async (userId: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user bookings:', error);
            return [];
        }
        return data;
    } catch (err) {
        console.error('Unexpected error fetching user bookings:', err);
        return [];
    }
};

// ============= RENTAL REQUEST FUNCTIONS =============

export const createRentalRequest = async (request: RentalRequest): Promise<RentalRequest | null> => {
    try {
        const { data, error } = await supabase
            .from('rental_requests')
            .insert([request])
            .select()
            .single();

        if (error) {
            console.error('Error creating rental request:', error);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Unexpected error creating rental request:', err);
        return null;
    }
};

export const getRentalRequestsByProduct = async (productId: string): Promise<RentalRequest[]> => {
    try {
        const { data, error } = await supabase
            .from('rental_requests')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching rental requests:', error);
            return [];
        }
        return data;
    } catch (err) {
        console.error('Unexpected error fetching rental requests:', err);
        return [];
    }
};

export const getSellerRentalRequests = async (ownerId: string): Promise<any[]> => {
    try {
        // First get all products owned by this seller
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id')
            .eq('owner_id', ownerId);

        if (productsError) {
            console.error('Error fetching seller products:', productsError);
            return [];
        }

        const productIds = products.map(p => p.id);

        if (productIds.length === 0) {
            return [];
        }

        // Get all rental requests for these products with product and user details
        const { data: requests, error } = await supabase
            .from('rental_requests')
            .select(`
                *,
                products:product_id (
                    id,
                    name,
                    category,
                    image_url,
                    price_per_hour
                )
            `)
            .in('product_id', productIds)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching seller rental requests:', error);
            return [];
        }

        // Fetch user details for each unique requester
        const requesterIds = [...new Set(requests.map((r: any) => r.requester_id))];
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('clerk_id, full_name, phone')
            .in('clerk_id', requesterIds);

        if (usersError) {
            console.error('Error fetching user details:', usersError);
            return requests; // Return requests without user data if fetch fails
        }

        // Create a map for quick lookup
        const userMap = new Map(users.map((u: any) => [u.clerk_id, u]));

        // Attach user data to each request
        const enrichedRequests = requests.map((request: any) => ({
            ...request,
            requester: userMap.get(request.requester_id) || { full_name: 'Unknown User' }
        }));

        return enrichedRequests;
    } catch (err) {
        console.error('Unexpected error fetching seller rental requests:', err);
        return [];
    }
};

export const updateRentalRequestStatus = async (
    requestId: string,
    status: 'pending' | 'accepted' | 'rejected'
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('rental_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', requestId);

        if (error) {
            console.error('Error updating rental request status:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Unexpected error updating rental request status:', err);
        return false;
    }
};

export const convertRequestToBooking = async (requestId: string): Promise<boolean> => {
    try {
        // Get the rental request details
        const { data: request, error: fetchError } = await supabase
            .from('rental_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError || !request) {
            console.error('Error fetching rental request:', fetchError);
            return false;
        }

        // Create a booking from the request
        const booking = {
            machine_id: request.product_id,
            user_id: request.requester_id,
            date: request.requested_date,
            start_time: request.start_time,
            end_time: request.end_time,
            duration: request.duration,
            total_cost: request.estimated_cost,
            status: 'confirmed'
        };

        const result = await createBooking(booking);

        if (!result) {
            console.error('Error creating booking from request');
            return false;
        }

        // Update request status to accepted
        await updateRentalRequestStatus(requestId, 'accepted');

        return true;
    } catch (err) {
        console.error('Unexpected error converting request to booking:', err);
        return false;
    }
};

export const getUserRentalRequests = async (userId: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('rental_requests')
            .select(`
                *,
                products:product_id (
                    id,
                    name,
                    category,
                    image_url,
                    price_per_hour
                )
            `)
            .eq('requester_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user rental requests:', error);
            return [];
        }
        return data;
    } catch (err) {
        console.error('Unexpected error fetching user rental requests:', err);
        return [];
    }
};

// ============= CHAT FUNCTIONS =============

export const sendChatMessage = async (message: ChatMessage): Promise<ChatMessage | null> => {
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .insert([message])
            .select()
            .single();

        if (error) {
            console.error('Error sending chat message:', error);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Unexpected error sending chat message:', err);
        return null;
    }
};

export const getChatMessages = async (rentalRequestId: string): Promise<ChatMessage[]> => {
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('rental_request_id', rentalRequestId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching chat messages:', error);
            return [];
        }
        return data;
    } catch (err) {
        console.error('Unexpected error fetching chat messages:', err);
        return [];
    }
};

export const subscribeToChat = (
    rentalRequestId: string,
    callback: (message: ChatMessage) => void
) => {
    const channel = supabase
        .channel(`chat:${rentalRequestId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `rental_request_id=eq.${rentalRequestId}`
            },
            (payload) => {
                callback(payload.new as ChatMessage);
            }
        )
        .subscribe();

    return channel;
};

export const markMessagesAsRead = async (rentalRequestId: string, userId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('chat_messages')
            .update({ read: true })
            .eq('rental_request_id', rentalRequestId)
            .neq('sender_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error marking messages as read:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Unexpected error marking messages as read:', err);
        return false;
    }
};

export const getUnreadMessageCount = async (rentalRequestId: string, userId: string): Promise<number> => {
    try {
        const { error, count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('rental_request_id', rentalRequestId)
            .neq('sender_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }
        return count || 0;
    } catch (err) {
        console.error('Unexpected error fetching unread count:', err);
        return 0;
    }
};

