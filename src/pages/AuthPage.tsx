import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogIn, UserPlus, Loader2, KeyRound } from 'lucide-react';
import { verifyAccessCode } from '../lib/api';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
    const { signIn, signUp } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                if (password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setLoading(false);
                    return;
                }

                // Verify access code
                const isCodeValid = await verifyAccessCode(accessCode);
                if (!isCodeValid) {
                    setError('Invalid registration code');
                    setLoading(false);
                    return;
                }

                await signUp(email, password);
                alert('Account created! Please check your email to verify your account.');
            } else {
                await signIn(email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-block p-4 bg-primary-600 rounded-2xl mb-4">
                        <svg
                            className="w-12 h-12 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-neutral-900 mb-2">Meal Tracker</h1>
                    <p className="text-neutral-600 text-lg">
                        Smart nutrition tracking with AI-powered meal analysis
                    </p>
                </div>

                <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    {/* Tab Switcher */}
                    <div className="flex gap-2 mb-6 p-1 bg-neutral-100 rounded-lg">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 py-2 rounded-md font-medium transition-all duration-200 ${mode === 'login'
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={`flex-1 py-2 rounded-md font-medium transition-all duration-200 ${mode === 'register'
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="label">Email</label>
                            <input
                                type="email"
                                className="input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="label">Password</label>
                            <input
                                type="password"
                                className="input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                minLength={6}
                                disabled={loading}
                            />
                        </div>

                        {mode === 'register' && (
                            <div>
                                <label className="label">Confirm Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    minLength={6}
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {mode === 'register' && (
                            <div>
                                <label className="label">Registration Code</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <KeyRound className="h-5 w-5 text-neutral-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="input pl-10"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value)}
                                        required
                                        placeholder="Enter access code"
                                        disabled={loading}
                                    />
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                    This app is invite-only. Please enter your registration code.
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary flex items-center justify-center gap-2 py-3"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                                </>
                            ) : (
                                <>
                                    {mode === 'login' ? (
                                        <>
                                            <LogIn className="w-5 h-5" />
                                            <span>Login</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" />
                                            <span>Create Account</span>
                                        </>
                                    )}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-neutral-500">
                        <p>
                            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                                {mode === 'login' ? 'Register' : 'Login'}
                            </button>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-neutral-400">
                    <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
                </div>
            </div >
        </div >
    );
}
