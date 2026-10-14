import { useLocation, Link } from "react-router-dom";
import type { ReactNode } from "react";
import { appRoutes } from "../routes";

const navIcons: Record<string, ReactNode> = {
    "/": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5L12 4l9 7.5" />
            <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        </svg>
    ),
    "/spaces": (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l9 5-9 5-9-5 9-5z" />
            <path d="M3 13l9 5 9-5" />
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

// Each page is a small map sheet in its own ink, from the same palette as the spaces.
// Each page's tab is a small map sheet in its own ink, from the same palette as the spaces.
const tabInk: Record<string, { color: string; field: string }> = {
    "/": { color: "#3F6E8C", field: "#EAF1F5" },
    "/spaces": { color: "#4F6B2E", field: "#EEF2E8" },
    "/extract": { color: "#9A6B1F", field: "#F6F0E6" },
    "/graph": { color: "#3A4A8C", field: "#ECEEF6" },
};
const PLAIN_INK = { color: "#64748b", field: "#f8fafc" };

// The dashed neatline printed just inside the edge of every sheet.
const neatline = (color: string) => ({
    outline: `1px dashed color-mix(in oklch, ${color} 50%, transparent)`,
    outlineOffset: -5,
});

export function Navbar() {
    const location = useLocation();
    const navRoutes = appRoutes.filter((route) => route.showInNavbar);

    return (
        // The mark sits on the left; the pages are map sheets hanging from the top edge of
        // the window like an atlas's index tabs. The open page's sheet hangs lowest.
        <header className="max-w-7xl mx-auto flex h-16 items-start justify-between gap-8 px-4 sm:px-6 lg:px-8">
            <Link
                to="/"
                className="group flex h-16 items-center gap-3 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-4"
            >
                {/* The mark is a sheet like the tabs, in pencil grey. */}
                <span
                    className="flex h-10 w-10 items-center justify-center bg-slate-50 text-slate-900 transition-transform duration-200 group-hover:-rotate-6 motion-reduce:group-hover:rotate-0"
                    style={{
                        ...neatline("#0f172a"),
                        boxShadow: "0 1px 2px rgb(15 23 42 / 0.15), 0 8px 14px -8px rgb(15 23 42 / 0.4)",
                    }}
                >
                        <svg
                            aria-hidden="true"
                            width="20"
                            height="20"
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
                </span>
                <span className="flex flex-col">
                    <span className="text-2xl leading-none font-extrabold tracking-[-0.025em]">Atlas</span>
                    <span className="mt-1 hidden text-xs leading-none text-slate-500 md:inline">
                        Inteligentna eksploracja dokumentów
                    </span>
                </span>
            </Link>

            <nav aria-label="Strony">
                <ul className="flex items-start gap-2">
                    {navRoutes.map((route) => {
                        const isActive = route.path === location.pathname;
                        const ink = tabInk[route.path] ?? PLAIN_INK;

                        return (
                            <li key={route.path}>
                                <Link
                                    to={route.path}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`relative flex items-end gap-2 px-3 pb-3 text-sm font-semibold transition-[height,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 motion-reduce:transition-none sm:px-4 ${
                                        isActive ? "h-16" : "h-12 hover:h-14"
                                    }`}
                                    style={{
                                        color: ink.color,
                                        // The open sheet is a stronger pastel of its ink and casts a soft shadow.
                                        backgroundColor: isActive
                                            ? `color-mix(in oklch, ${ink.color} 22%, white)`
                                            : ink.field,
                                        boxShadow: isActive
                                            ? `0 1px 2px rgb(15 23 42 / 0.12), 0 12px 18px -10px ${ink.color}`
                                            : "0 1px 1px rgb(15 23 42 / 0.1)",
                                    }}
                                >
                                    {/* The neatline is open at the top, so the sheet seems to run on
                                        past the window's edge. */}
                                    <span
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-x-[5px] top-0 bottom-[5px] border border-t-0 border-dashed"
                                        style={{ borderColor: `color-mix(in oklch, ${ink.color} 50%, transparent)` }}
                                    />
                                    {navIcons[route.path]}
                                    <span className="hidden sm:inline">{route.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </header>
    );
}
