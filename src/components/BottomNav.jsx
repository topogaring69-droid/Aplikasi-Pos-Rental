'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ReceiptText, 
  Users, 
  ArrowDownCircle, 
  BarChart3, 
  Bike, 
  Settings 
} from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navs = [
    {
      href: '/',
      label: 'Kasir',
      icon: ReceiptText,
      active: pathname === '/'
    },
    {
      href: '/pelanggan/',
      label: 'Pelanggan',
      icon: Users,
      active: pathname?.startsWith('/pelanggan')
    },
    {
      href: '/pengeluaran/',
      label: 'Pengeluaran',
      icon: ArrowDownCircle,
      active: pathname?.startsWith('/pengeluaran')
    },
    {
      href: '/laporan/',
      label: 'Laporan',
      icon: BarChart3,
      active: pathname?.startsWith('/laporan')
    },
    {
      href: '/armada/',
      label: 'Armada',
      icon: Bike,
      active: pathname?.startsWith('/armada')
    },
    {
      href: '/pengaturan/',
      label: 'Struk',
      icon: Settings,
      active: pathname?.startsWith('/pengaturan')
    }
  ];

  return (
    <nav className="bottom-nav no-print" aria-label="Navigasi Utama">
      {navs.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${item.active ? 'active' : ''}`}
            style={{ padding: '4px 6px', fontSize: '10px' }}
          >
            <div className="nav-icon-wrap" style={{ width: '32px', height: '32px' }}>
              <Icon size={18} strokeWidth={item.active ? 2.5 : 2} />
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
