import { useState, useRef, useEffect } from 'react';
import { X, Camera, Keyboard, Loader2, Package, AlertCircle, Check } from 'lucide-react';
import { lookupFoodByBarcode, BarcodeProduct } from '../lib/api';
import { toast } from 'react-hot-toast';

interface BarcodeScannerModalProps {
    onClose: () => void;
    onProductFound: (product: BarcodeProduct) => void;
}

type InputMode = 'camera' | 'manual';

export default function BarcodeScannerModal({ onClose, onProductFound }: BarcodeScannerModalProps) {
    const [mode, setMode] = useState<InputMode>('manual'); // Default to manual since camera requires extra setup
    const [manualBarcode, setManualBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<BarcodeProduct | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Camera scanning state
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Start camera for scanning
    const startCamera = async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera on mobile
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (err) {
            console.error('Camera access error:', err);
            setCameraError('Could not access camera. Please use manual entry.');
            setMode('manual');
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    // Handle mode change
    useEffect(() => {
        if (mode === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
        
        return () => stopCamera();
    }, [mode]);

    // Lookup barcode
    const handleLookup = async (barcode: string) => {
        if (!barcode.trim()) {
            setError('Please enter a barcode');
            return;
        }

        setLoading(true);
        setError(null);
        setProduct(null);

        try {
            const result = await lookupFoodByBarcode(barcode.trim());
            
            if (result.found) {
                setProduct(result);
                toast.success('Product found!');
            } else {
                setError('Product not found in database. Try entering manually.');
            }
        } catch (err) {
            console.error('Barcode lookup error:', err);
            setError('Failed to lookup barcode. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle using the found product
    const handleUseProduct = () => {
        if (product) {
            onProductFound(product);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                    <h2 className="text-lg font-semibold text-neutral-900">Scan Barcode</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="flex border-b border-neutral-200">
                    <button
                        onClick={() => setMode('camera')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            mode === 'camera'
                                ? 'text-primary-600 border-b-2 border-primary-600'
                                : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                    >
                        <Camera className="w-4 h-4" />
                        Camera
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            mode === 'manual'
                                ? 'text-primary-600 border-b-2 border-primary-600'
                                : 'text-neutral-500 hover:text-neutral-700'
                        }`}
                    >
                        <Keyboard className="w-4 h-4" />
                        Manual Entry
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                    {/* Camera Mode */}
                    {mode === 'camera' && (
                        <div className="space-y-4">
                            {cameraError ? (
                                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {cameraError}
                                </div>
                            ) : (
                                <>
                                    <div className="relative aspect-video bg-neutral-900 rounded-lg overflow-hidden">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover"
                                        />
                                        {!cameraActive && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                                            </div>
                                        )}
                                        {/* Scan overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-64 h-24 border-2 border-white/50 rounded-lg" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-500 text-center">
                                        Position the barcode within the frame. 
                                        <br />
                                        <span className="text-yellow-600">Note: Auto-scan requires additional library setup. Use manual entry for now.</span>
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Manual Entry Mode */}
                    {mode === 'manual' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Enter Barcode Number
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={manualBarcode}
                                        onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="e.g., 5000112637922"
                                        className="flex-1 px-4 py-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg tracking-wider"
                                        maxLength={14}
                                    />
                                    <button
                                        onClick={() => handleLookup(manualBarcode)}
                                        disabled={loading || !manualBarcode.trim()}
                                        className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            'Lookup'
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                    Enter the barcode number from the product packaging
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Product Result */}
                    {product && (
                        <div className="border border-green-200 bg-green-50 rounded-xl p-4 space-y-3 animate-fade-in">
                            <div className="flex items-start gap-3">
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-16 h-16 object-contain rounded-lg bg-white"
                                    />
                                ) : (
                                    <div className="w-16 h-16 bg-neutral-100 rounded-lg flex items-center justify-center">
                                        <Package className="w-8 h-8 text-neutral-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-neutral-900 truncate">
                                        {product.name}
                                    </h3>
                                    {product.brand && (
                                        <p className="text-sm text-neutral-600">{product.brand}</p>
                                    )}
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Per {product.servingSize || '100g'}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
                                    <Check className="w-5 h-5 text-white" />
                                </div>
                            </div>

                            {/* Nutrition Info */}
                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-green-200">
                                <div className="text-center">
                                    <div className="text-lg font-bold text-neutral-900">{product.calories}</div>
                                    <div className="text-xs text-neutral-500">kcal</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-accent-600">{product.protein}g</div>
                                    <div className="text-xs text-neutral-500">protein</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-blue-600">{product.carbs}g</div>
                                    <div className="text-xs text-neutral-500">carbs</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-purple-600">{product.fat}g</div>
                                    <div className="text-xs text-neutral-500">fat</div>
                                </div>
                            </div>

                            {/* Use Product Button */}
                            <button
                                onClick={handleUseProduct}
                                className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Use This Product
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                    <p className="text-xs text-neutral-500 text-center">
                        Nutrition data from Open Food Facts database
                    </p>
                </div>
            </div>
        </div>
    );
}
