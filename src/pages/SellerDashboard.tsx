import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Calendar, Clock, MessageSquare, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSellerRentalRequests } from '../services/api';
import MachineryScheduleCard from '../components/dashboard/MachineryScheduleCard';
import RentalRequestCard from '../components/dashboard/RentalRequestCard';
import ChatInterface from '../components/dashboard/ChatInterface';
import './SellerDashboard.css';

const SellerDashboard = () => {
    const { user } = useUser();
    const [products, setProducts] = useState<any[]>([]);
    const [rentalRequests, setRentalRequests] = useState<any[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Fetch seller's products
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('*')
                .eq('owner_id', user.id);

            if (productsError) {
                console.error('Error fetching products:', productsError);
            } else {
                setProducts(productsData || []);
            }

            // Fetch rental requests
            const requests = await getSellerRentalRequests(user.id);
            setRentalRequests(requests);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestUpdate = () => {
        // Reload data after request update
        loadDashboardData();
    };

    const pendingRequests = rentalRequests.filter(r => r.status === 'pending');
    const recentRequests = rentalRequests.slice(0, 10);

    if (loading) {
        return (
            <div className="seller-dashboard-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="seller-dashboard-container">
                <div className="empty-state">
                    <Package size={64} />
                    <h2>No Products Listed</h2>
                    <p>You haven't listed any machinery for rent yet.</p>
                    <p>Add your first product to start receiving rental requests!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="seller-dashboard-container">
            <div className="dashboard-header">
                <h1>Seller Dashboard</h1>
                <div className="dashboard-stats">
                    <div className="stat-card">
                        <Package size={24} />
                        <div>
                            <span className="stat-value">{products.length}</span>
                            <span className="stat-label">Products Listed</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Clock size={24} />
                        <div>
                            <span className="stat-value">{pendingRequests.length}</span>
                            <span className="stat-label">Pending Requests</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* Machinery Schedule Section */}
                <div className="dashboard-section machinery-section">
                    <div className="section-header">
                        <Calendar size={20} />
                        <h2>My Machinery</h2>
                    </div>
                    <div className="machinery-grid">
                        {products.map(product => (
                            <MachineryScheduleCard
                                key={product.id}
                                product={product}
                                onUpdate={handleRequestUpdate}
                            />
                        ))}
                    </div>
                </div>

                {/* Rental Requests Section */}
                <div className="dashboard-section requests-section">
                    <div className="section-header">
                        <Clock size={20} />
                        <h2>Rental Requests</h2>
                        {pendingRequests.length > 0 && (
                            <span className="badge">{pendingRequests.length} pending</span>
                        )}
                    </div>
                    <div className="requests-list">
                        {recentRequests.length === 0 ? (
                            <div className="empty-requests">
                                <p>No rental requests yet</p>
                            </div>
                        ) : (
                            recentRequests.map(request => (
                                <RentalRequestCard
                                    key={request.id}
                                    request={request}
                                    onUpdate={handleRequestUpdate}
                                    onOpenChat={() => setSelectedChat(request.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Section */}
                <div className="dashboard-section chat-section">
                    <div className="section-header">
                        <MessageSquare size={20} />
                        <h2>Messages</h2>
                    </div>
                    {selectedChat ? (
                        <ChatInterface
                            rentalRequestId={selectedChat}
                            onClose={() => setSelectedChat(null)}
                        />
                    ) : (
                        <div className="empty-chat">
                            <MessageSquare size={48} />
                            <p>Select a rental request to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerDashboard;
