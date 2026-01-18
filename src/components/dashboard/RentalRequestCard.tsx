import { useState } from 'react';
import { Check, X, MessageSquare, Clock, Calendar } from 'lucide-react';
import { convertRequestToBooking, updateRentalRequestStatus } from '../../services/api';
import './RentalRequestCard.css';

interface RentalRequestCardProps {
    request: any;
    onUpdate: () => void;
    onOpenChat: () => void;
}

const RentalRequestCard = ({ request, onUpdate, onOpenChat }: RentalRequestCardProps) => {
    const [processing, setProcessing] = useState(false);

    const handleAccept = async () => {
        setProcessing(true);
        try {
            const success = await convertRequestToBooking(request.id);
            if (success) {
                onUpdate();
            } else {
                alert('Failed to accept request. Please try again.');
            }
        } catch (error) {
            console.error('Error accepting request:', error);
            alert('An error occurred while accepting the request.');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!confirm('Are you sure you want to reject this request?')) {
            return;
        }

        setProcessing(true);
        try {
            const success = await updateRentalRequestStatus(request.id, 'rejected');
            if (success) {
                onUpdate();
            } else {
                alert('Failed to reject request. Please try again.');
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('An error occurred while rejecting the request.');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = () => {
        const statusConfig = {
            pending: { label: 'Pending', className: 'status-pending' },
            accepted: { label: 'Accepted', className: 'status-accepted' },
            rejected: { label: 'Rejected', className: 'status-rejected' }
        };

        const config = statusConfig[request.status as keyof typeof statusConfig];
        return <span className={`status-badge ${config.className}`}>{config.label}</span>;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className={`rental-request-card ${request.status}`}>
            <div className="request-header">
                <div className="product-info">
                    {request.products?.image_url && (
                        <img src={request.products.image_url} alt={request.products.name} />
                    )}
                    <div>
                        <h4>{request.products?.name || 'Unknown Product'}</h4>
                        <p className="category">{request.products?.category}</p>
                    </div>
                </div>
                {getStatusBadge()}
            </div>

            {/* Requester Information */}
            <div className="requester-info">
                <div className="requester-avatar">
                    {(request.requester?.full_name || 'U')[0].toUpperCase()}
                </div>
                <div className="requester-details">
                    <span className="requester-name">{request.requester?.full_name || 'Unknown User'}</span>
                    {request.requester?.phone && (
                        <span className="requester-phone">{request.requester.phone}</span>
                    )}
                </div>
            </div>

            <div className="request-details">
                <div className="detail-item">
                    <Calendar size={16} />
                    <span>{formatDate(request.requested_date)}</span>
                </div>
                <div className="detail-item">
                    <Clock size={16} />
                    <span>{request.start_time} - {request.end_time}</span>
                </div>
                <div className="detail-item duration">
                    <span>{request.duration} hours</span>
                </div>
            </div>

            {request.message && (
                <div className="request-message">
                    <p>"{request.message}"</p>
                </div>
            )}

            <div className="request-footer">
                <div className="cost">
                    <span className="label">Total:</span>
                    <span className="amount">₹{request.estimated_cost.toLocaleString()}</span>
                </div>

                <div className="request-actions">
                    <button
                        className="chat-btn"
                        onClick={onOpenChat}
                        title="Open chat"
                    >
                        <MessageSquare size={18} />
                    </button>

                    {request.status === 'pending' && (
                        <>
                            <button
                                className="reject-btn"
                                onClick={handleReject}
                                disabled={processing}
                                title="Reject request"
                            >
                                <X size={18} />
                            </button>
                            <button
                                className="accept-btn"
                                onClick={handleAccept}
                                disabled={processing}
                                title="Accept request"
                            >
                                <Check size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RentalRequestCard;
