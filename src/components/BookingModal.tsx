import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useUser } from '@clerk/clerk-react';
import { createBooking, getBookedDates } from '../services/api';
import './MachineryDetail.css';

interface BookingModalProps {
    machine: any;
    onClose: () => void;
}

interface TimeSlot {
    id: string;
    time: string;
    hour: number;
}

const BookingModal = ({ machine, onClose }: BookingModalProps) => {
    const { user } = useUser();
    // 1 = Selection, 2 = Confirmation
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1: Selection Data
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [duration, setDuration] = useState(4);
    const [slots, setSlots] = useState<TimeSlot[]>([]);

    // Availability State
    const [isDayBooked, setIsDayBooked] = useState(false);
    const [endTime, setEndTime] = useState<string>("");

    // Step 2: Cost Data
    const [totalCost, setTotalCost] = useState(0);

    // Invoice Data
    const [invoiceNumber] = useState(`INV-${Math.floor(Math.random() * 100000)}`);

    // Locked Dates State
    const [dbLockedDates, setDbLockedDates] = useState<string[]>([]);

    // Fetch All Locked Dates for Calendar Visuals
    useEffect(() => {
        if (machine?.id) {
            getBookedDates(machine.id).then(dates => {
                // Ensure dates are normalized for comparison (start of day or date string)
                // DB returns ISO strings, usually we just need the YYYY-MM-DD part or can map to DateString
                const dateStrings = dates.map(d => new Date(d).toDateString());
                setDbLockedDates(dateStrings);
            });
        }
    }, [machine]);

    // Initial Setup
    useEffect(() => {
        setStep(1);
        setSelectedSlot(null);
        // Randomly decide if day is booked (Daily Exclusivity)
        // Deterministic based on date string
        // const dateStr = selectedDate.toDateString(); // Removed unused var

        // Fetch Real DB Booked Dates
        const fetchDBBookings = async () => {
            if (machine?.id) {
                // Check against the dates we already fetched, or fetch fresh if needed
                // For simplicity, we can trust dbLockedDates or re-fetch.
                // Re-fetching is safer for real-time conflicts
                const dbDates = await getBookedDates(machine.id);
                // Convert DB dates (YYYY-MM-DD or standard ISO) to date strings for comparison
                const dateCheck = selectedDate.toDateString();

                // Use DB date comparison (need to parse db string)
                // Assuming db returns YYYY-MM-DD
                const isDbBusy = dbDates.some(d => new Date(d).toDateString() === dateCheck);

                setIsDayBooked(isDbBusy);
            }
        };
        fetchDBBookings();
    }, [selectedDate, machine]);

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

    // Generate Slots (Only if day is not booked)
    useEffect(() => {
        const generatedSlots: TimeSlot[] = [];
        const startHour = 8; // 8 AM
        const endHour = 20;  // 8 PM

        for (let i = startHour; i < endHour; i++) {
            const hour = i % 12 || 12;
            const ampm = i < 12 ? 'AM' : 'PM';
            generatedSlots.push({
                id: `${i}`,
                time: `${hour}:00 ${ampm}`,
                hour: i
            });
        }
        setSlots(generatedSlots);
    }, []);

    // Calculate End Time & Cost
    useEffect(() => {
        if (selectedSlot) {
            const startHour = parseInt(selectedSlot);
            let endH = startHour + duration;
            const ampm = endH < 12 || endH === 24 ? 'AM' : 'PM'; // Simple cycle for display
            // Normalize for 24h wrap if needed, but keeping simple for day-rentals
            if (endH >= 24) endH -= 24;
            const displayH = endH % 12 || 12;
            setEndTime(`${displayH}:00 ${ampm}`);
        } else {
            setEndTime("");
        }

        if (machine && machine.price) {
            const priceStr = machine.price.toString().replace(/[^0-9]/g, '');
            const hourlyRate = parseInt(priceStr) || 0;
            setTotalCost(hourlyRate * duration);
        }
    }, [duration, selectedSlot, machine]);


    const handleDownloadPDF = async () => {
        const element = document.getElementById('invoice-capture');
        if (!element) return;

        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`AgroShare-Invoice-${new Date().getTime()}.pdf`);
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="bm-calendar-day empty"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isSelected = thisDate.toDateString() === selectedDate.toDateString();
            const isToday = thisDate.toDateString() === new Date().toDateString();

            // Check booking status for calendar dots
            // Note: Efficiently checked in bulk in real app, here checking per cell for demo simplicity
            // We can't easily valid sync DB here without pre-fetching whole month.
            // Using dbLockedDates which are all booked dates for this machine
            const isDbLocked = dbLockedDates.includes(thisDate.toDateString());
            const isBk = isDbLocked;

            // Check if date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today
            const isPast = thisDate < today;

            days.push(
                <button
                    key={day}
                    className={`bm-calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isBk ? 'day-booked' : ''} ${isPast ? 'disabled' : ''}`}
                    onClick={() => !isPast && setSelectedDate(thisDate)}
                    disabled={isPast}
                >
                    {day}
                    {isBk && <span className="busy-dot"></span>}
                </button>
            );
        }

        return (
            <div className="bm-calendar-section">
                <div className="bm-calendar-header">
                    <button
                        onClick={handlePrevMonth}
                        type="button"
                        className="cal-nav-btn"
                        disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
                        style={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                    <button onClick={handleNextMonth} type="button" className="cal-nav-btn"><ChevronRight size={20} /></button>
                </div>
                <div className="bm-weekdays">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                <div className="bm-days-grid">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="booking-modal-overlay">
            <div className="booking-modal-container wizard-mode" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="bm-wizard-header">
                    {step === 2 && (
                        <button className="wizard-back-btn" onClick={() => setStep(1)}>
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="progress-steps">
                        <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
                        <div className="step-line"></div>
                        <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>3</div>
                    </div>
                    <button className="bm-close-btn relative" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="bm-header-text">
                    <h2>{step === 1 ? 'Schedule Your Rental' : 'Confirm Booking'}</h2>
                </div>

                <div className="bm-wizard-content">

                    {/* --- STEP 1: Selection --- */}
                    {step === 1 && (
                        <div className="wizard-page slide-in-left">
                            <div className="split-view">
                                <div className="bm-left-panel">
                                    {renderCalendar()}
                                    <div className="bm-legend">
                                        <div className="legend-item"><span className="dot free"></span> Available</div>
                                    </div>
                                </div>
                                <div className="bm-right-panel">
                                    <div className="bm-date-display">
                                        <CalendarIcon size={18} />
                                        <span>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                    </div>

                                    {isDayBooked ? (
                                        <div className="day-booked-state">
                                            <span className="booked-badge">Fully Booked</span>
                                            <p>This machine is unavailable for the entire day.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <label className="section-label">Start Time</label>
                                            <div className="bm-slots-grid compact">
                                                {slots.map(slot => (
                                                    <button
                                                        key={slot.id}
                                                        className={`time-slot-btn ${selectedSlot === slot.id ? 'selected' : ''}`}
                                                        onClick={() => setSelectedSlot(slot.id)}
                                                    >
                                                        {slot.time}
                                                    </button>
                                                ))}
                                            </div>

                                            <label className="section-label mt-4">Duration</label>
                                            <div className="duration-pills compact">
                                                {[4, 8, 12].map(hr => {
                                                    let isDisabled = false;
                                                    if (selectedSlot) {
                                                        const startH = parseInt(selectedSlot);
                                                        const endH = startH + hr;
                                                        // If booking crosses midnight (20 is 8PM, max start is 19 which is 7PM)
                                                        // Actually simply check if endH >= 24 (next day)
                                                        // AND if next day is booked
                                                        if (endH >= 24) {
                                                            const nextDay = new Date(selectedDate);
                                                            nextDay.setDate(nextDay.getDate() + 1);

                                                            const ndDateStr = nextDay.toDateString();
                                                            const ndSeed = ndDateStr.length + nextDay.getDate();
                                                            const ndIsWeekend = nextDay.getDay() === 0 || nextDay.getDay() === 6;
                                                            const isNextDayBooked = ndIsWeekend ? (ndSeed % 3 === 0) : (ndSeed % 7 === 0);

                                                            if (isNextDayBooked) isDisabled = true;
                                                        }
                                                    }

                                                    return (
                                                        <button
                                                            key={hr}
                                                            className={`dur-pill ${duration === hr ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                                                            onClick={() => !isDisabled && setDuration(hr)}
                                                            disabled={isDisabled}
                                                            title={isDisabled ? "Next day is fully booked" : ""}
                                                            style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed', textDecoration: 'line-through' } : {}}
                                                        >
                                                            {hr}h
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {selectedSlot && (
                                                <div className="time-range-preview">
                                                    <span>{slots.find(s => s.id === selectedSlot)?.time}</span>
                                                    <ArrowRight size={14} />
                                                    <span>{endTime}</span>
                                                </div>
                                            )}

                                            <button
                                                className="bm-continue-btn"
                                                disabled={!selectedSlot}
                                                onClick={() => setStep(2)}
                                            >
                                                Review & Pay <ChevronRight size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- STEP 2: Confirmation --- */}
                    {step === 2 && (
                        <div className="wizard-page slide-in-right">
                            <div className="billing-view-centered">
                                <div className="billing-summary-large full-width">
                                    <h3>Booking Confirmation</h3>

                                    <div className="confirm-grid">
                                        <div className="confirm-item">
                                            <label>Date</label>
                                            <strong>{selectedDate.toLocaleDateString()}</strong>
                                        </div>
                                        <div className="confirm-item">
                                            <label>Time</label>
                                            <strong>{slots.find(s => s.id === selectedSlot)?.time} - {endTime}</strong>
                                        </div>
                                        <div className="confirm-item">
                                            <label>Duration</label>
                                            <strong>{duration} Hours</strong>
                                        </div>
                                        <div className="confirm-item">
                                            <label>Rate</label>
                                            <strong>{machine.price}</strong>
                                        </div>
                                    </div>

                                    <div className="total-action-row">
                                        <div className="total-display-compact">
                                            <span>Total Amount</span>
                                            <span className="amount">₹{totalCost.toLocaleString()}</span>
                                        </div>

                                        <button
                                            className="bm-final-confirm-btn compact"
                                            disabled={isSubmitting}
                                            style={isSubmitting ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                                            onClick={async () => {
                                                if (isSubmitting) return;
                                                setIsSubmitting(true);
                                                try {
                                                    if (user && machine) {
                                                        const bookingData = {
                                                            machine_id: machine.id,
                                                            user_id: user.id,
                                                            date: selectedDate.toISOString(),
                                                            start_time: slots.find(s => s.id === selectedSlot)?.time,
                                                            end_time: endTime,
                                                            duration: duration,
                                                            total_cost: totalCost,
                                                            status: 'confirmed'
                                                        };
                                                        await createBooking(bookingData);
                                                    }
                                                    setStep(3);
                                                } catch (error) {
                                                    console.error("Booking failed", error);
                                                } finally {
                                                    setIsSubmitting(false);
                                                }
                                            }}
                                        >
                                            {isSubmitting ? 'Processing...' : 'Confirm & Generate Invoice'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- STEP 3: Invoice --- */}
                    {step === 3 && (
                        <div className="wizard-page slide-in-right">
                            <div className="invoice-view-centered">
                                <div id="invoice-capture" className="invoice-card">
                                    <div className="invoice-header">
                                        <div className="invoice-logo">AGROSHARE</div>
                                        <div className="invoice-title">INVOICE</div>
                                    </div>

                                    <div className="invoice-meta-row">
                                        <div className="meta-col">
                                            <label>Issued To (Lessee)</label>
                                            <p>{user?.fullName || "Guest User"}</p>
                                            <p>Nashik, MH, 422001</p>
                                        </div>
                                        <div className="meta-col right">
                                            <label>Issued By (Owner)</label>
                                            <p>{machine.ownerName || "John Farmer"}</p>
                                            <label>Invoice Date</label>
                                            <p>{new Date().toLocaleDateString()}</p>
                                            <label>Booking Date</label>
                                            <p>{selectedDate.toLocaleDateString()}</p>
                                            <label>Invoice #</label>
                                            <p>{invoiceNumber}</p>
                                        </div>
                                    </div>

                                    <div className="invoice-table">
                                        <div className="inv-row header">
                                            <span>Description</span>
                                            <span>Qty</span>
                                            <span>Rate</span>
                                            <span>Total</span>
                                        </div>
                                        <div className="inv-row">
                                            <span>{machine.title} Rental</span>
                                            <span>{duration} hrs</span>
                                            <span>{Math.round(totalCost / duration)}</span>
                                            <span>{totalCost}</span>
                                        </div>
                                        <div className="inv-row">
                                            <span>Service Fee (5%)</span>
                                            <span>1</span>
                                            <span>{Math.round(totalCost * 0.05)}</span>
                                            <span>{Math.round(totalCost * 0.05)}</span>
                                        </div>
                                    </div>

                                    <div className="invoice-total-section">
                                        <div className="inv-total-row">
                                            <span>Sub Total</span>
                                            <span>₹{totalCost + Math.round(totalCost * 0.05)}</span>
                                        </div>
                                        <div className="inv-total-row big">
                                            <span>Total</span>
                                            <span>₹{totalCost + Math.round(totalCost * 0.05)}</span>
                                        </div>
                                    </div>

                                    <div className="invoice-footer">
                                        <div className="qr-container">
                                            {/* Simple CSS QR Placeholder */}
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=AGROSHARE-INV-${totalCost}`} alt="QR" />
                                        </div>
                                        <div className="footer-info">
                                            <p><strong>Payment Info</strong></p>
                                            <p>AgroShare Tech Pvt Ltd</p>
                                            <p>UPI: agroshare@upi</p>
                                        </div>
                                    </div>
                                </div>

                                <button className="bm-download-btn" onClick={handleDownloadPDF}>
                                    Download Invoice
                                </button>
                                <button
                                    className="bm-download-btn done-btn"
                                    style={{ marginTop: '10px', backgroundColor: '#333' }}
                                    onClick={onClose}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default BookingModal;
