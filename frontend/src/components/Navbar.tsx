import { useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { appRoutes } from "../routes";

const navIcons: Record<string, ReactNode> = {
    "/": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5L12 4l9 7.5" />
            <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        </svg>
    ),
    "/extract": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M5 21h14" />
        </svg>
    ),
    "/graph": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2.4" fill="currentColor" />
            <circle cx="4.5" cy="5" r="1.8" />
            <circle cx="19.5" cy="5" r="1.8" />
            <circle cx="4.5" cy="19" r="1.8" />
            <circle cx="19.5" cy="19" r="1.8" />
            <path d="M10.3 10.6L6 6.4" />
            <path d="M13.7 10.6L18 6.4" />
            <path d="M10.3 13.4L6 17.6" />
            <path d="M13.7 13.4L18 17.6" />
        </svg>
    ),
};

export function Navbar() {
    const location = useLocation();
    const navRoutes = appRoutes.filter((route) => route.showInNavbar);

    return (
        <nav className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-stretch h-16">
                    <div className="flex items-stretch gap-12 flex-1">
                        <Link
                            to="/"
                            className="group flex items-center gap-3 text-slate-900 transition-colors"
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
                                className="group-hover:text-blue-600 transition-colors"
                            >
                                <circle cx="12" cy="5" r="1.8" fill="currentColor" />
                                <circle cx="5" cy="18" r="1.8" fill="currentColor" />
                                <circle cx="19" cy="18" r="1.8" fill="currentColor" />
                                <path d="M11.3 6.4L5.7 16.6" />
                                <path d="M12.7 6.4L18.3 16.6" />
                                <path d="M6.6 18h10.8" />
                            </svg>
                            <span className="text-2xl font-bold tracking-tight group-hover:text-blue-600 transition-colors">
                                Atlas
                            </span>
                            <span className="h-6 w-px bg-slate-200" aria-hidden="true" />
                            <span className="flex flex-col leading-tight">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                                    Graf wiedzy
                                </span>
                                <span className="text-[11px] text-slate-500">
                                    Ekstrakcja i wizualizacja relacji
                                </span>
                            </span>
                        </Link>

                        <div className="flex items-stretch gap-2">
                            {navRoutes.map((route) => {
                                const isActive = route.path === location.pathname;

                                return (
                                    <Link
                                        key={route.path}
                                        to={route.path}
                                        className={`group relative flex items-center gap-2 px-5 text-sm font-semibold tracking-wide transition-colors duration-200 ${
                                            isActive
                                                ? "text-blue-600"
                                                : "text-slate-500 hover:text-slate-900"
                                        }`}
                                    >
                                        <span
                                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 ${
                                                isActive
                                                    ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                                                    : "text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700"
                                            }`}
                                        >
                                            {navIcons[route.path]}
                                        </span>
                                        <span>{route.label}</span>

                                        {isActive && (
                                            <motion.span
                                                layoutId="navbar-active-underline"
                                                className="absolute left-3 right-3 -bottom-px h-[3px] rounded-full bg-blue-600"
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 400,
                                                    damping: 32,
                                                }}
                                            />
                                        )}
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
