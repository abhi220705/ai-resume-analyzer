"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { Brand, Icon, type IconName } from "@/components/ui";

const workspaceRoutes = ["/dashboard", "/jobs", "/matches", "/applications", "/recruiter", "/admin"];

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!workspaceRoutes.some((path) => pathname === path || pathname.startsWith(`${path}/`)) || !user) return <>{children}</>;
  const candidate = user.role === "CANDIDATE";
  const recruiter = user.role === "RECRUITER";
  const role = candidate ? "Candidate" : recruiter ? "Recruiter" : "Administrator";
  const links: { href: string; label: string; icon: IconName }[] = [
    { href: "/dashboard", label: "Overview", icon: "overview" },
    { href: "/jobs", label: recruiter ? "Manage jobs" : "Browse jobs", icon: "jobs" },
    ...(candidate ? [{ href: "/matches", label: "Skill matching", icon: "match" as const }] : []),
    ...(candidate || recruiter ? [{ href: "/applications", label: candidate ? "My applications" : "Applications", icon: "applications" as const }] : []),
    ...(recruiter ? [{ href: "/recruiter", label: "Profile & company", icon: "company" as const }] : []),
    ...(user.role === "ADMIN" ? [{ href: "/admin", label: "Administration", icon: "admin" as const }] : []),
  ];
  async function handleLogout() {
    if (busy) return;
    setBusy(true); setError("");
    try { await logout(); router.replace("/login"); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not log out. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <div className="workspace">
      <a href="#workspace-content" className="skip-link">Skip to content</a>
      <aside className={`workspace-sidebar ${menuOpen ? "is-open" : ""}`}>
        <Link href="/dashboard" className="sidebar-brand" onClick={() => setMenuOpen(false)}><Brand /></Link>
        <p className="sidebar-label">Workspace</p>
        <nav id="workspace-navigation" aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setMenuOpen(false)} className="sidebar-link"><Icon name={link.icon} /><span>{link.label}</span>{pathname === link.href && <span className="nav-active-dot" />}</Link>)}
        </nav>
        {candidate && <div className="sidebar-note"><span className="ui-eyebrow">A little progress, daily</span><p>Know your strengths.<br />Find your next step.</p><Link href="/matches" onClick={() => setMenuOpen(false)}>Compare your skills <Icon name="arrow" /></Link></div>}
        <div className="sidebar-footer"><Link href="/">Back to website <Icon name="arrow" /></Link><p>AI Resume Analyzer & Job Match Platform</p></div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="topbar-location"><button type="button" className="ui-button ui-icon-button mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="workspace-navigation" aria-label={menuOpen ? "Close navigation" : "Open navigation"}><Icon name={menuOpen ? "close" : "menu"} /></button><span className="topbar-workspace">Workspace</span><span className="topbar-divider">/</span><span>{links.find((link) => link.href === pathname)?.label ?? "Workspace"}</span></div>
          <div className="topbar-account"><span className="account-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span><span className="account-description"><strong>{user.name}</strong><small>{role} account</small></span><button type="button" className="ui-button ui-button-quiet" disabled={busy} onClick={() => void handleLogout()}><Icon name="logout" /><span>{busy ? "Logging out..." : "Log out"}</span></button></div>
        </header>
        <div id="workspace-content" tabIndex={-1} className="workspace-content">{error && <p role="alert" className="ui-alert ui-alert-error">{error}</p>}{children}</div>
        <footer className="workspace-footer">Built for clearer resumes and more informed next steps.</footer>
      </div>
    </div>
  );
}
