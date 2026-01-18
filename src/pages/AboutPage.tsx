import { Target, Globe, Users, Leaf } from "lucide-react";
import './AboutPage.css';

// Static Asset Imports
import heroBg from '../assets/farmers_graffiti.png';
import visionImg from '../assets/farmer_hero.png';

const AboutPage = () => {
    return (
        <div className="about-container">
            {/* --- HERO SECTION --- */}
            {/* Kept existing hero CSS as it is nice and static-friendly */}
            <header className="about-hero">
                <div className="hero-bg-wrapper">
                    <img src={heroBg} alt="Farmers" className="hero-bg-img" />
                </div>

                <div className="hero-content">
                    <h1 className="hero-title">
                        Why We Exist.
                    </h1>
                    <p className="hero-subtitle">
                        To bridge the gap between machinery owners and farmers. We exist to ensure no field goes unploughed due to lack of resources.
                    </p>
                </div>
            </header>

            {/* --- VISION / AIMS SECTION --- */}
            <section className="vision-section">
                <div className="vision-text">
                    <div className="section-tag">OUR AIM</div>
                    <h2>Empowering Every Farmer</h2>
                    <p>
                        <strong>Why AgroShare?</strong> Agriculture is the backbone of our nation, yet many small-scale farmers struggle to access modern machinery due to high costs.
                    </p>
                    <p>
                        AgroShare aims to democratize access to technology. By connecting tractor and equipment owners directly with farmers who need them, we create a win-win ecosystem. Owners earn from idle assets, and farmers get affordable access to the best tools.
                    </p>
                    <div className="aim-points">
                        <div className="aim-item">✅ Reduce Operational Costs</div>
                        <div className="aim-item">✅ Increase Crop Yield</div>
                        <div className="aim-item">✅ Prevent Machinery Idleness</div>
                    </div>
                </div>

                <div className="vision-img-wrapper">
                    <img src={visionImg} alt="Farmer Vision" className="vision-img" />
                </div>
            </section>

            {/* --- GOALS GRID --- */}
            <section className="goals-section">
                <div className="section-header center">
                    <h2>Our Goals</h2>
                    <p>What we are striving to achieve for the agricultural community.</p>
                </div>
                <div className="goals-grid">
                    <GoalCard
                        icon={<Globe />}
                        title="Accessibility"
                        desc="Ensure every farmer within 50km has access to heavy machinery within 2 hours of booking."
                    />
                    <GoalCard
                        icon={<Users />}
                        title="Community"
                        desc="Build a network of 10,000+ trusted farmers and owners fostering mutual growth and support."
                    />
                    <GoalCard
                        icon={<Leaf />}
                        title="Sustainability"
                        desc="Promote efficient resource usage, reducing carbon footprint by maximizing machinery utilization."
                    />
                    <GoalCard
                        icon={<Target />}
                        title="Innovation"
                        desc="Continuously upgrade our platform with AI-driven insights for better crop planning and scheduling."
                    />
                </div>
            </section>
        </div>
    );
};

const GoalCard = ({ icon, title, desc }: any) => (
    <div className="goal-card">
        <div className="goal-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{desc}</p>
    </div>
);

export default AboutPage;
