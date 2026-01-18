import { useState, useEffect } from 'react';
import { X, Upload, MapPin, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createProduct, uploadProductImage } from '../services/api';
import { supabase } from '../lib/supabase'; // Import supabase directly for user upsert
import { useUser } from '@clerk/clerk-react';

import './AddProductModal.css';

interface AddProductModalProps {
    onClose: () => void;
}

const AddProductModal = ({ onClose }: AddProductModalProps) => {
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // Wizard Step: 1 = Details, 2 = Availability

    // User Info Display
    const userImage = user?.imageUrl || "https://i.pravatar.cc/150?img=3";
    const userName = user?.fullName || "Verified User";

    const [formData, setFormData] = useState({
        name: '',
        category: 'Tractor',
        description: '',
        price_per_hour: '',
        lat: 0,
        lng: 0
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [addressText, setAddressText] = useState('');

    // Availability State
    const [availableDates, setAvailableDates] = useState<string[]>([]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const getLocation = () => {
        setLocationStatus('loading');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    setFormData(prev => ({
                        ...prev,
                        lat: latitude,
                        lng: longitude
                    }));

                    try {
                        // Reverse Geocoding
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await res.json();
                        if (data && data.display_name) {
                            setAddressText(data.display_name);
                        } else {
                            setAddressText(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
                        }
                        setLocationStatus('success');
                    } catch (e) {
                        console.error("Geocoding failed", e);
                        setAddressText(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
                        setLocationStatus('success');
                    }
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setLocationStatus('error');
                }
            );
        } else {
            setLocationStatus('error');
        }
    };

    useEffect(() => {
        getLocation();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !imageFile) {
            alert("Please sign in and select an image.");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Image
            const imageUrl = await uploadProductImage(imageFile);
            if (!imageUrl) throw new Error("Image upload failed");

            // 2. Upsert User Data (Ensure owner exists and has latest info)
            const { error: userError } = await supabase
                .from('users')
                .upsert({
                    clerk_id: user.id,
                    full_name: user.fullName || 'AgroShare User',
                    avatar_url: user.imageUrl,
                    // email: user.primaryEmailAddress?.emailAddress // Optional: Add if column exists
                }, { onConflict: 'clerk_id' });

            if (userError) {
                console.error("Error updating user profile:", userError);
                // Continue anyway, as product creation might still work if user exists
            }

            // 3. Create Product
            await createProduct({
                owner_id: user.id,
                name: formData.name,
                category: formData.category,
                description: formData.description,
                price_per_hour: parseFloat(formData.price_per_hour),
                image_url: imageUrl,
                lat: formData.lat,
                lng: formData.lng,
                available_dates: availableDates // Pass the dates
            });

            onClose();
            alert("Product added successfully!");
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Failed to add product.");
        } finally {
            setLoading(false);
        }
    };

    const handleNextStep = () => {
        // Validation for Step 1
        if (!formData.name || !formData.price_per_hour || !formData.description || !imageFile) {
            alert("Please fill in all required fields and upload an image.");
            return;
        }
        setStep(2);
    };

    const [currentViewDate, setCurrentViewDate] = useState(new Date());

    // Calendar Helpers
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const handlePrevMonth = () => setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1));
    const handleNextMonth = () => setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1));

    const handleToggleDate = (date: Date) => {
        // Create normalized date string YYYY-MM-DD (safe for timezone)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        if (availableDates.includes(dateStr)) {
            setAvailableDates(availableDates.filter(d => d !== dateStr));
        } else {
            setAvailableDates([...availableDates, dateStr]);
        }
    };

    const handleSelectWholeMonth = () => {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const daysInMonth = getDaysInMonth(currentViewDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newDates = [...availableDates];
        for (let d = 1; d <= daysInMonth; d++) {
            const dateToCheck = new Date(year, month, d);
            if (dateToCheck >= today) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (!newDates.includes(dateStr)) {
                    newDates.push(dateStr);
                }
            }
        }
        setAvailableDates(newDates);
    };

    const handleClearMonth = () => {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const daysInMonth = getDaysInMonth(currentViewDate);
        const datesToRemove: string[] = [];

        for (let d = 1; d <= daysInMonth; d++) {
            datesToRemove.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        }
        setAvailableDates(availableDates.filter(d => !datesToRemove.includes(d)));
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentViewDate);
        const firstDay = getFirstDayOfMonth(currentViewDate);
        const days = [];
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Empty slots for days before start of month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="apm-calendar-day empty"></div>);
        }

        // Actual Days
        for (let day = 1; day <= daysInMonth; day++) {
            const thisDate = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), day);
            const dateStr = `${thisDate.getFullYear()}-${String(thisDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = availableDates.includes(dateStr);
            const isToday = thisDate.toDateString() === new Date().toDateString();
            const isPast = thisDate < today;

            days.push(
                <button
                    key={day}
                    type="button"
                    className={`apm-calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isPast ? 'disabled' : ''}`}
                    onClick={() => !isPast && handleToggleDate(thisDate)}
                    disabled={isPast}
                    style={{ position: 'relative' }}
                >
                    {day}
                    {/* Optional: Add a checkmark or dot if selected for extra clarity, though 'selected' class handles BG */}
                </button>
            );
        }

        return (
            <div className="apm-calendar-section" style={{ border: 'none', boxShadow: 'none', padding: '0' }}>
                <div className="apm-calendar-header">
                    <button onClick={handlePrevMonth} type="button" className="apm-cal-nav-btn">
                        <ChevronLeft size={20} />
                    </button>
                    <span>{monthNames[currentViewDate.getMonth()]} {currentViewDate.getFullYear()}</span>
                    <button onClick={handleNextMonth} type="button" className="apm-cal-nav-btn">
                        <ChevronRight size={20} />
                    </button>
                </div>
                <div className="apm-weekdays">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                <div className="apm-days-grid">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="machinery-modal-overlay">
            <div className="apm-content" style={{ maxWidth: '800px' }}>
                <div className="apm-header">
                    <h2 className="apm-title">
                        {step === 1 ? "List Your Equipment" : "Set Availability"}
                    </h2>
                    <button className="apm-close-btn" onClick={onClose}>
                        <X size={20} color="#555" />
                    </button>
                </div>

                <div className="apm-body">
                    {/* User Info Section */}
                    {user && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '20px',
                            padding: '12px',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid var(--accent-color)'
                        }}>
                            <img
                                src={userImage}
                                alt="User"
                                style={{
                                    width: '45px',
                                    height: '45px',
                                    borderRadius: '50%',
                                    border: '2px solid white',
                                    objectFit: 'cover'
                                }}
                            />
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Posting as</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{userName}</div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="apm-grid">

                        {/* STEP 1: DETAILS & LOCATION */}
                        {step === 1 && (
                            <>
                                {/* Left Column: Details */}
                                <div className="apm-form-section">
                                    <div className="apm-section-title">Step 1: Equipment Details</div>

                                    <div className="apm-input-group">
                                        <label className="apm-label">Category</label>
                                        <select
                                            name="category"
                                            className="apm-select"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                        >
                                            <option value="Tractor">Tractor</option>
                                            <option value="Harvester">Harvester</option>
                                            <option value="Planter">Planter</option>
                                            <option value="Sprayer">Sprayer</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div className="apm-input-group">
                                        <label className="apm-label">Equipment Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            className="apm-input"
                                            placeholder="e.g. John Deere 5050D"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="apm-input-group">
                                        <label className="apm-label">Price per Hour (₹)</label>
                                        <input
                                            type="number"
                                            name="price_per_hour"
                                            className="apm-input"
                                            placeholder="0.00"
                                            value={formData.price_per_hour}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="apm-input-group">
                                        <label className="apm-label">Description</label>
                                        <textarea
                                            name="description"
                                            className="apm-textarea"
                                            placeholder="Describe features, condition, etc."
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            rows={4}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Media & Location */}
                                <div className="apm-form-section">
                                    <div className="apm-section-title">Media & Location</div>

                                    <div className="apm-input-group">
                                        <label className="apm-label">Equipment Photo</label>
                                        <div className="apm-upload-zone">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                style={{ display: 'none' }}
                                                id="product-image-upload"
                                            />
                                            {imageFile && (
                                                <img
                                                    src={URL.createObjectURL(imageFile)}
                                                    alt="Preview"
                                                    className="apm-upload-preview"
                                                />
                                            )}
                                            <label htmlFor="product-image-upload" style={{ cursor: 'pointer', zIndex: 2, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <div className="apm-upload-content">
                                                    <Upload size={32} color={imageFile ? "#fff" : "#4CAF50"} style={{ marginBottom: 8, filter: imageFile ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' : 'none' }} />
                                                    <span style={{ color: imageFile ? "#fff" : "#666", fontWeight: 500, textShadow: imageFile ? '0 1px 3px rgba(0,0,0,0.8)' : 'none' }}>
                                                        {imageFile ? "Click to Change" : "Upload Photo"}
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="apm-input-group">
                                        <label className="apm-label">Location</label>
                                        <button
                                            type="button"
                                            className={`apm-location-btn ${locationStatus === 'success' ? 'success' : ''}`}
                                            onClick={getLocation}
                                        >
                                            <MapPin size={20} />
                                            <span>
                                                {locationStatus === 'loading' ? 'Fetching Address...' :
                                                    locationStatus === 'success' ? (addressText || 'Location Set') :
                                                        'Use Current Location'}
                                            </span>
                                        </button>
                                        {locationStatus === 'error' && (
                                            <span style={{ fontSize: '0.8rem', color: '#ef5350', marginTop: 4 }}>
                                                Could not fetch location. Check permissions.
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        className="apm-submit-btn"
                                        onClick={handleNextStep}
                                        style={{ marginTop: '20px' }}
                                    >
                                        Next: Set Availability
                                    </button>
                                </div>
                            </>
                        )}

                        {/* STEP 2: AVAILABILITY (ENHANCED CALENDAR UI) */}
                        {step === 2 && (
                            <div className="apm-form-section" style={{ gridColumn: '1 / -1', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
                                <div className="apm-section-title" style={{ textAlign: 'center', fontSize: '1.1rem', color: 'var(--accent-color)' }}>
                                    Select Available Dates
                                </div>
                                <div style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '0.9rem' }}>
                                    Click dates to toggle availability. Use "Select All" to clear specific month.
                                </div>

                                <div className="split-view" style={{ height: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Calendar Container */}
                                    <div style={{
                                        background: 'white',
                                        borderRadius: '24px',
                                        padding: '20px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                        border: '1px solid #eee'
                                    }}>
                                        {renderCalendar()}

                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                            <button
                                                type="button"
                                                onClick={handleSelectWholeMonth}
                                                style={{
                                                    background: '#e8f5e9',
                                                    color: '#2e7d32',
                                                    border: 'none',
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Select Entire Month
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleClearMonth}
                                                style={{
                                                    background: '#ffebee',
                                                    color: '#c62828',
                                                    border: 'none',
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Clear Month
                                            </button>
                                        </div>
                                    </div>

                                    {/* Summary & Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9f9f9', padding: '15px 20px', borderRadius: '16px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', color: '#666' }}>Selected Days</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-color)' }}>
                                                {availableDates.length}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                style={{
                                                    padding: '12px 24px',
                                                    backgroundColor: 'white',
                                                    color: '#555',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '12px',
                                                    fontSize: '1rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                className="apm-submit-btn"
                                                disabled={loading}
                                                style={{ margin: 0, padding: '12px 32px', width: 'auto' }}
                                            >
                                                {loading ? <Loader2 className="animate-spin" /> : "List Equipment"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddProductModal;
