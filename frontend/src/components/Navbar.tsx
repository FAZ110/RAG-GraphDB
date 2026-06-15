import { useLocation, Link } from "react-router-dom";
import { appRoutes } from "../routes";

export function Navbar(){
    const location = useLocation();


    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-8">
                        <span className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
                            <svg
                                aria-hidden="true"
                                width="26"
                                height="26"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="5" r="1.8" fill="currentColor" />
                                <circle cx="5" cy="18" r="1.8" fill="currentColor" />
                                <circle cx="19" cy="18" r="1.8" fill="currentColor" />
                                <path d="M11.3 6.4L5.7 16.6" />
                                <path d="M12.7 6.4L18.3 16.6" />
                                <path d="M6.6 18h10.8" />
                            </svg>
                            <span>Atlas</span>
                        </span>

                        <div className="flex gap-4">
                            {appRoutes
                                .filter(route => route.showInNavbar)
                                .map((route) => {
                                    const isActive = route.path === location.pathname;

                                    return (
                                        <Link
                                            key={route.path}
                                            to={route.path}
                                            className={`px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                                                        isActive
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-gray-600 hover:text-blue-600'
                                                    }`}>
                                                {route.label}
                                            </Link>
                                    )
                                })}
                        </div>

                    </div>
                </div>
            </div>

            

        </nav>
        
    )
} 