import { useState } from 'react';
import { AlertTriangle, Shield, Eye, Zap, CheckCircle } from 'lucide-react';

interface DisclaimerModalProps {
    onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
    const [hasRead, setHasRead] = useState(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Welcome to Meal Tracker!</h2>
                            <p className="text-primary-100 text-sm">Please read before continuing</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                    {/* OpenAI Data Sharing */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-amber-800 text-sm">🤖 AI Data Sharing Notice</h4>
                                <p className="text-xs text-amber-700 mt-1">
                                    This app uses OpenAI for meal analysis. Your inputs and outputs are shared with OpenAI 
                                    to help develop and improve their services, including training AI models. 
                                    Only data sent after you start using the app will be shared. You can check OpenAI's 
                                    privacy policy for more details.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Usage Limits */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-blue-800 text-sm">⚡ Usage Limits</h4>
                                <p className="text-xs text-blue-700 mt-1">
                                    Please use the AI features responsibly! The API has costs, so there's a soft limit 
                                    of around <strong>~10 AI requests per day</strong> per user. This is for testing purposes - 
                                    please don't abuse it 🙏 The API key costs money!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Data Visibility */}
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Eye className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-purple-800 text-sm">👀 Data Visibility</h4>
                                <p className="text-xs text-purple-700 mt-1">
                                    Just a heads up - the admin can see data stored in the database (meal logs, nutrition info, etc.). 
                                    Nothing too personal is stored, but be aware! If you don't mind, it's all good 😅
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Password Security */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-green-800 text-sm">🔒 Password Security</h4>
                                <p className="text-xs text-green-700 mt-1">
                                    Good news! Your password is handled by OAuth/Supabase authentication - 
                                    the admin <strong>cannot</strong> see your password. It's securely hashed! 
                                    So don't worry about that part 😊
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Acknowledgment checkbox */}
                    <label className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
                        <input
                            type="checkbox"
                            checked={hasRead}
                            onChange={(e) => setHasRead(e.target.checked)}
                            className="mt-0.5 w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-neutral-700">
                            I have read and understood the above information
                        </span>
                    </label>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200">
                    <button
                        onClick={onAccept}
                        disabled={!hasRead}
                        className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                            hasRead
                                ? 'bg-primary-600 text-white hover:bg-primary-700'
                                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        }`}
                    >
                        <CheckCircle className="w-5 h-5" />
                        <span>Got it, let's go!</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
