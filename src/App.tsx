import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Home, User, Clock } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useStore } from './store';
import { getProfile, getNutritionTargets, markDisclaimerSeen } from './lib/api';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import HistoryPage from './pages/HistoryPage';
import ProfileSetup from './components/ProfileSetup';
import DisclaimerModal from './components/DisclaimerModal';
import UserGuideModal from './components/UserGuideModal';

function App() {
    const { user, loading: authLoading } = useAuth();
    const { profile, nutritionTargets, setProfile, setNutritionTargets } = useStore();
    const [initializing, setInitializing] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showUserGuide, setShowUserGuide] = useState(false);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (authLoading) return;

        if (user) {
            loadUserData();
        } else {
            setInitializing(false);
        }
    }, [user, authLoading]);

    const loadUserData = async () => {
        if (!user) return;

        const [profileData, targetsData] = await Promise.all([
            getProfile(user.id),
            getNutritionTargets(user.id),
        ]);

        setProfile(profileData);
        setNutritionTargets(targetsData);
        
        // Check if user needs to see the guide and disclaimer
        if (profileData && !profileData.has_seen_disclaimer) {
            setShowUserGuide(true);
        }
        
        setInitializing(false);
    };

    const handleGuideComplete = () => {
        setShowUserGuide(false);
        setShowDisclaimer(true);
    };

    const handleDisclaimerAccept = async () => {
        if (!user) return;
        
        const success = await markDisclaimerSeen(user.id);
        if (success) {
            setShowDisclaimer(false);
            // Update local profile state
            if (profile) {
                setProfile({ ...profile, has_seen_disclaimer: true });
            }
        }
    };

    if (authLoading || initializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="text-center">
                    <div className="spinner mx-auto mb-4" style={{ width: '40px', height: '40px' }} />
                    <p className="text-neutral-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return <AuthPage />;
    }

    // Need profile setup
    if (!profile || !nutritionTargets) {
        return (
            <ProfileSetup
                userId={user.id}
                onComplete={() => loadUserData()}
            />
        );
    }

    const isProfilePage = location.pathname === '/profile';
    const isHistoryPage = location.pathname === '/history';

    return (
        <div className="min-h-screen">
            {/* User Guide Modal for first-time users */}
            {showUserGuide && (
                <UserGuideModal onComplete={handleGuideComplete} />
            )}
            
            {/* Disclaimer Modal after user guide */}
            {showDisclaimer && (
                <DisclaimerModal onAccept={handleDisclaimerAccept} />
            )}
            
            <Routes>
                <Route path="/" element={<HomePage userId={user.id} onModalChange={setIsModalOpen} />} />
                <Route path="/history" element={<HistoryPage userId={user.id} />} />
                <Route path="/profile" element={<ProfilePage userId={user.id} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Bottom Navigation - Hidden when modal is open */}
            {!isModalOpen && (
                <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 safe-area-inset-bottom">
                    <div className="max-w-4xl mx-auto flex">
                        <button
                            onClick={() => navigate('/')}
                            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${!isProfilePage
                                ? 'text-primary-600'
                                : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                        >
                            <Home className="w-6 h-6" />
                            <span className="text-xs font-medium">Home</span>
                        </button>

                        <button
                            onClick={() => navigate('/history')}
                            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isHistoryPage
                                ? 'text-primary-600'
                                : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                        >
                            <Clock className="w-6 h-6" />
                            <span className="text-xs font-medium">History</span>
                        </button>

                        <button
                            onClick={() => navigate('/profile')}
                            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isProfilePage
                                ? 'text-primary-600'
                                : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                        >
                            <User className="w-6 h-6" />
                            <span className="text-xs font-medium">Profile</span>
                        </button>
                    </div>
                </nav>
            )}
        </div>
    );
}

export default App;
