import './Footer.css';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <h2>AgroShare</h2>
                    <p>
                        Empowering farmers by connecting them with the best equipment.
                        Rent machinery easily and efficiently.
                    </p>
                </div>

                <div className="footer-section">
                    <h3>Quick Links</h3>
                    <ul className="footer-links">
                        <li><a href="/">Home</a></li>
                        <li><a href="/equipment">Equipment</a></li>
                        <li><a href="/about">About Us</a></li>
                        <li><a href="/contact">Contact</a></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>Legal</h3>
                    <ul className="footer-links">
                        <li><a href="/terms">Terms of Service</a></li>
                        <li><a href="/privacy">Privacy Policy</a></li>
                        <li><a href="/security">Security</a></li>
                    </ul>
                </div>

                <div className="footer-section footer-newsletter">
                    <h3>Stay Updated</h3>
                    <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Subscribe to our newsletter for the latest updates.
                    </p>
                    <div style={{ position: 'relative' }}>
                        <input type="email" placeholder="Enter your email" />
                        <button>
                            Subscribe
                        </button>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} AgroShare. All rights reserved.</p>
                <div className="social-links">
                    <div className="social-icon"><Facebook size={18} /></div>
                    <div className="social-icon"><Twitter size={18} /></div>
                    <div className="social-icon"><Instagram size={18} /></div>
                    <div className="social-icon"><Linkedin size={18} /></div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
