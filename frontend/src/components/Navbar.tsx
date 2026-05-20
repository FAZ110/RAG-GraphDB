import { useLocation, Link } from "react-router-dom";
import { appRoutes } from "../routes";

export function Navbar(){
    const location = useLocation();


    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex gap-8">
                        <span className="text-xl font-bold">RAG-GraphDB</span>

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