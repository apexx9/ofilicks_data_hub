import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export function NotFound() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleReturn = () => {
        if (user) {
            // If the user's current URL is within the authenticated app logic, 
            // they might have just typed a bad URL while logged in.
            // But App.tsx handles routing, so let's just go to root or dashboard path
            // based on the router context.
            navigate('/');
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 overflow-hidden relative">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-700"></div>

            <div className="max-w-md w-full text-center relative z-10">
                {/* Animated Icon Container */}
                <div className="relative mb-8 flex justify-center">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
                        <Compass className="w-20 h-20 text-blue-400 animate-[spin_10s_linear_infinite]" />
                    </div>
                </div>

                {/* Text Content */}
                <h1 className="text-8xl font-black text-white mb-2 tracking-tighter">404</h1>
                <h2 className="text-2xl font-bold text-gray-200 mb-4">Lost in the Data Hub?</h2>
                <p className="text-gray-400 mb-10 leading-relaxed">
                    The page you're looking for has vanished into the digital void. Don't worry, we'll help you find your way back.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl border border-white/10 transition-all duration-300 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Go Back
                    </button>

                    <button
                        onClick={handleReturn}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group"
                    >
                        <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        {user ? 'Back to Dashboard' : 'Back to Home'}
                    </button>
                </div>

                {/* System Status Indicator */}
                <div className="mt-16 flex items-center justify-center gap-2 text-gray-500 text-xs uppercase tracking-[0.2em]">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                    System Online
                </div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:40px_40px]"></div>
        </div>
    );
}
