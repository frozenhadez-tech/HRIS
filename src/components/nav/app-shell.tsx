"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Network,
  ShieldCheck,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarDays,
  CheckSquare,
  Clock,
  CalendarRange,
  Wallet,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { roleAtLeast, ROLE_LABELS } from "@/lib/auth/rbac";
import { logoutAction } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { cn, initials } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; min: UserRole };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, min: "EMPLOYEE" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/employees", label: "Employees", icon: Users, min: "MANAGER" },
      { href: "/departments", label: "Departments", icon: Building2, min: "MANAGER" },
      { href: "/org-chart", label: "Org chart", icon: Network, min: "MANAGER" },
    ],
  },
  {
    label: "Time & Attendance",
    items: [
      { href: "/leave", label: "Leave", icon: CalendarDays, min: "EMPLOYEE" },
      { href: "/approvals", label: "Approvals", icon: CheckSquare, min: "MANAGER" },
      { href: "/attendance", label: "Attendance", icon: Clock, min: "EMPLOYEE" },
      { href: "/scheduling", label: "Scheduling", icon: CalendarRange, min: "EMPLOYEE" },
    ],
  },
  {
    label: "Payroll",
    items: [
      { href: "/payroll", label: "Payroll", icon: Wallet, min: "HR_MANAGER" },
      { href: "/payslips", label: "My payslips", icon: Receipt, min: "EMPLOYEE" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/users", label: "Users & roles", icon: ShieldCheck, min: "ORG_ADMIN" },
      { href: "/audit", label: "Audit log", icon: ScrollText, min: "ORG_ADMIN" },
      { href: "/settings", label: "Settings", icon: Settings, min: "ORG_ADMIN" },
    ],
  },
];

type ShellUser = { name: string; email: string; role: UserRole };

function NavLinks({
  role,
  pathname,
  onNavigate,
}: {
  role: UserRole;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group, gi) => {
        const items = group.items.filter((item) => roleAtLeast(role, item.min));
        if (items.length === 0) return null;
        return (
          <div key={group.label ?? gi} className="space-y-1">
            {group.label && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            )}
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  user,
  orgName,
  pathname,
  onNavigate,
}: {
  user: ShellUser;
  orgName: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
        <Logo />
      </div>
      <div className="border-b border-slate-200 px-5 py-3">
        <p className="truncate text-sm font-medium text-slate-900">{orgName}</p>
        <p className="text-xs text-slate-400">Organization</p>
      </div>
      <NavLinks role={user.role} pathname={pathname} onNavigate={onNavigate} />
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            {initials(user.name.split(" ")[0], user.name.split(" ")[1])}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-400">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4.5 w-4.5" strokeWidth={2} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  orgName,
  children,
}: {
  user: ShellUser;
  orgName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <SidebarBody user={user} orgName={orgName} pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <SidebarBody
              user={user}
              orgName={orgName}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Logo />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
