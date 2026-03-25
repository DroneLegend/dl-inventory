'use client'

// -----------------------------------------------------------------------------
// Sidebar Navigation Component
// -----------------------------------------------------------------------------
// The left-side navigation bar shown on all protected pages.
// Shows different menu items depending on whether the user is admin or warehouse.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, // Dashboard icon
  Package,         // Inventory icon
  ArrowLeftRight,  // Transactions icon
  Boxes,           // Kit types icon
  Users,           // User management icon
  Bell,            // Alert settings icon
  Warehouse,       // Warehouse home icon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/lib/auth'

// Defines what a navigation item looks like
type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

// Navigation items shown to ADMIN users (full access)
const adminNav: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Warehouse',    href: '/warehouse',    icon: Warehouse },  // Admin shortcut to warehouse view
  { label: 'Inventory',    href: '/inventory',    icon: Package },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Kit Types',    href: '/kits',         icon: Boxes },
  { label: 'Users',        href: '/users',        icon: Users },
  { label: 'Alerts',       href: '/alerts',       icon: Bell },
]

// Navigation items shown to WAREHOUSE users (limited access)
const warehouseNav: NavItem[] = [
  { label: 'Inventory',    href: '/warehouse',    icon: Warehouse },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
]

type SidebarProps = {
  profile: UserProfile
}

export default function Sidebar({ profile }: SidebarProps) {
  // usePathname() tells us which page is currently active so we can highlight it
  const pathname = usePathname()

  // Pick the right nav items based on the user's role
  const navItems = profile.role === 'admin' ? adminNav : warehouseNav

  return (
    <aside className="w-60 min-h-screen bg-brand-navy flex flex-col border-r border-white/10 shrink-0">

      {/* Brand logo at the top of the sidebar */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex flex-col gap-1">
          {/* Decorative orange accent line */}
          <div className="w-8 h-1 rounded-full bg-brand-orange mb-1" />
          <span className="text-white font-bold text-lg leading-tight">
            Drone Legends
          </span>
          <span className="text-slate-400 text-xs tracking-widest uppercase">
            Inventory
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          // Check if this item's route matches the current page
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // Base styles for all nav items
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  // Active state: orange text + subtle orange background
                  ? 'bg-brand-orange/15 text-brand-orange'
                  // Inactive state: muted text, highlights on hover
                  : 'text-slate-400 hover:text-white hover:bg-white/8'
              )}
            >
              {/* Icon */}
              <item.icon className={cn(
                'h-4 w-4 shrink-0',
                isActive ? 'text-brand-orange' : 'text-slate-500'
              )} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info at the bottom of the sidebar */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          {/* User avatar — simple circle with first initial */}
          <div className="w-8 h-8 rounded-full bg-brand-orange/20 border border-brand-orange/30
                          flex items-center justify-center shrink-0">
            <span className="text-brand-orange text-xs font-bold uppercase">
              {profile.full_name?.[0] ?? profile.email[0]}
            </span>
          </div>
          {/* User details */}
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {profile.full_name ?? profile.email}
            </p>
            {/* Role badge */}
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded font-medium capitalize',
              profile.role === 'admin'
                ? 'bg-brand-orange/20 text-brand-orange'
                : 'bg-slate-700 text-slate-300'
            )}>
              {profile.role}
            </span>
          </div>
        </div>
      </div>

    </aside>
  )
}
