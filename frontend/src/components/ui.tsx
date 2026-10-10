import type { ReactNode } from "react";

export type IconName = "overview" | "jobs" | "match" | "applications" | "company" | "admin" | "document" | "scan" | "arrow" | "menu" | "logout" | "check" | "eye" | "close" | "sparkles" | "shield" | "chart" | "upload" | "star" | "zap" | "chevron";
const paths: Record<IconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  jobs: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a24 24 0 0 0 18 0M12 11v4" /></>,
  match: <><path d="M4 7h16M4 17h16M8 3v8M16 13v8" /><circle cx="8" cy="7" r="2" fill="currentColor" stroke="none" /><circle cx="16" cy="17" r="2" fill="currentColor" stroke="none" /></>,
  applications: <><rect x="5" y="4" width="14" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="M9 11h6M9 15h6" /></>,
  company: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h1m4 0h1m-6 4h1m4 0h1m-5 10v-5h4v5M3 21h18" /></>,
  admin: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  document: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  scan: <><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M2 12h20M8 7h8M8 17h8" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  logout: <><path d="M10 4H5v16h5M10 12h11m-4-4 4 4-4 4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  sparkles: <><path d="m12 3 1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" /><path d="M19 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  chart: <><path d="M18 20V10M12 20V4M6 20v-6" /><path d="M3 20h18" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" />,
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  chevron: <path d="m6 9 6 6 6-6" />,
};
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function Brand() {
  return <span className="brand"><span className="brand-mark"><Icon name="document" /></span><span><strong>AI Resume Analyzer</strong><small>RESUME & JOB PLATFORM</small></span></span>;
}
export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="ui-page-heading"><div><p className="ui-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="ui-description">{description}</p></div>{children && <div className="ui-heading-actions">{children}</div>}</header>;
}
export function StatusBadge({ value }: { value: string }) {
  const positive = ["COMPLETED", "PUBLISHED", "VERIFIED", "HIRED", "CONSISTENT"].includes(value);
  const negative = ["FAILED", "REJECTED", "CLOSED", "WITHDRAWN"].includes(value);
  return <span className={`ui-badge ${positive ? "ui-badge-success" : negative ? "ui-badge-muted" : "ui-badge-pending"}`}><span className="ui-status-dot" />{value.toLowerCase().replaceAll("_", " ")}</span>;
}
