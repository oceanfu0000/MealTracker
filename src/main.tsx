import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter basename="/MealTracker" future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <App />
            <Toaster 
                position="bottom-center" 
                toastOptions={{
                    className: 'font-medium text-sm',
                    duration: 3000,
                    style: {
                        background: 'white',
                        color: '#1f2937',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                    },
                    success: {
                        iconTheme: {
                            primary: '#16a34a',
                            secondary: '#fff',
                        },
                        style: {
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#dc2626',
                            secondary: '#fff',
                        },
                        style: {
                            background: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                        },
                        duration: 4000,
                    },
                    loading: {
                        style: {
                            background: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                        },
                    },
                }} 
            />
        </BrowserRouter>
    </React.StrictMode>
);
