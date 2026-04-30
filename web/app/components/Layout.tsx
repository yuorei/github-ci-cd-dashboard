import { Link, NavLink } from "react-router";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/settings/repositories", label: "Repositories" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">CI</span>
          <span>
            <strong>Actions Monitor</strong>
            <small>CI/CD Dashboard</small>
          </span>
        </Link>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-pane">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="page-actions">{action}</div> : null}
    </header>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return <div className="error-notice">{message}</div>;
}
