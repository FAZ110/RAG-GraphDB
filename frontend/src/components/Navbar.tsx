import { useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { appRoutes } from "../routes";

export function Navbar() {
    const location = useLocation();
    const navRoutes = appRoutes.filter((route) => route.showInNavbar);

    return (
        <nav className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_1px_0_0_rgba(15,23,42,0.04)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-12 flex-1">
                        <Link
                            to="/"
                            className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 hover:text-blue-600 transition-colors"
                        >
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
                        </Link>

                        <div className="relative flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/70 p-1">
                            {navRoutes.map((route) => {
                                const isActive = route.path === location.pathname;

                                return (
                                    <Link
                                        key={route.path}
                                        to={route.path}
                                        className={`relative px-10 py-1.5 rounded-full text-sm font-semibold tracking-wide transition-colors duration-200 ${
                                            isActive
                                                ? "text-white"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        {isActive && (
                                            <motion.span
                                                layoutId="navbar-active-pill"
                                                className="absolute inset-0 rounded-full bg-blue-600 shadow-sm shadow-blue-600/30"
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 380,
                                                    damping: 30,
                                                }}
                                            />
                                        )}
                                        <span className="relative z-10">{route.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
