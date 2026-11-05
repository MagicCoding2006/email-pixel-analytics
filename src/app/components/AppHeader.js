"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const pathname = usePathname();
  return <header className="app-header">
    <Link className="brand" href="/" aria-label="Mail signal home"><span className="brand-mark"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></svg></span>mail<span className="brand-light">signal</span><span className="brand-dot">.</span></Link>
    <nav className="app-nav" aria-label="Main navigation"><Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Overview</Link><Link href="/create-pixel" aria-current={pathname === "/create-pixel" ? "page" : undefined}>Create pixel</Link></nav>
    <span className="workspace-label"><span className="workspace-avatar">A</span> Your workspace</span>
  </header>;
}
