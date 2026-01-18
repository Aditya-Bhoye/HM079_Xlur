import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { getBookedDates, getRentalRequestsByProduct } from '../../services/api';
import './MachineryScheduleCard.css';

interface MachineryScheduleCardProps {
    product: any;
    onUpdate: () => void;
}

const MachineryScheduleCard = ({ product }: MachineryScheduleCardProps) => {
    const [bookedDates, setBookedDates] = useState<string[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const currentMonth = new Date(); // Static for now, can add navigation later

    useEffect(() => {
        loadSchedule();
    }, [product.id]);

    const loadSchedule = async () => {
        const booked = await getBookedDates(product.id);
        setBookedDates(booked);

        const requests = await getRentalRequestsByProduct(product.id);
        setPendingRequests(requests.filter(r => r.status === 'pending'));
    };

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const renderMiniCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="mini-cal-day empty"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const thisDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dateStr = thisDate.toDateString();
            const isBooked = bookedDates.some(d => new Date(d).toDateString() === dateStr);
            const isToday = thisDate.toDateString() === new Date().toDateString();

            days.push(
                <div
                    key={day}
                    className={`mini-cal-day ${isBooked ? 'booked' : ''} ${isToday ? 'today' : ''}`}
                    title={isBooked ? 'Booked' : 'Available'}
                >
                    {day}
                    {isBooked && <span className="booked-indicator"></span>}
                </div>
            );
        }

        return days;
    };

    return (
        <div className="machinery-schedule-card">
            <div className="card-image">
                <img src={product.image_url} alt={product.name} />
                <span className="category-badge">{product.category}</span>
            </div>

            <div className="card-content">
                <h3>{product.name}</h3>
                <p className="price">₹{product.price_per_hour}/hour</p>

                <div className="mini-calendar">
                    <div className="calendar-header">
                        <CalendarIcon size={16} />
                        <span>
                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="mini-cal-grid">
                        <div className="weekday">S</div>
                        <div className="weekday">M</div>
                        <div className="weekday">T</div>
                        <div className="weekday">W</div>
                        <div className="weekday">T</div>
                        <div className="weekday">F</div>
                        <div className="weekday">S</div>
                        {renderMiniCalendar()}
                    </div>
                </div>

                {pendingRequests.length > 0 && (
                    <div className="pending-badge">
                        {pendingRequests.length} pending request{pendingRequests.length > 1 ? 's' : ''}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MachineryScheduleCard;
