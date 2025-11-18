/**
 * Sidebar Navigation Component
 *
 * Provides main navigation for the dashboard with responsive mobile menu
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: '📊',
  },
  {
    label: 'Afiliados',
    href: '/afiliados',
    icon: '👥',
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: '📈',
  },
  {
    label: 'Ferramentas',
    href: '/ferramentas',
    icon: '🛠️',
  },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 glass glass-hover rounded-xl p-3 text-xl"
        aria-label="Toggle menu"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen z-40
          glass border-r border-gray-800/50
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-64 flex flex-col
        `}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-xl">
              📈
            </div>
            <div>
              <h2 className="font-bold text-lg gradient-text">Dashboard</h2>
              <p className="text-xs text-gray-500">Escala Independente</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600/20 to-purple-600/20 text-white border border-primary-500/30 shadow-lg shadow-primary-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }
                `}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-semibold">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800/50">
          <div className="text-xs text-gray-500 text-center">
            <p>CartPanda Analytics</p>
            <p className="mt-1">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
