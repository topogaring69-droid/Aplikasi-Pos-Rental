'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ReceiptText, 
  ClipboardList,
  Users, 
  ArrowDownCircle, 
  BarChart3, 
  Bike, 
  Settings 
} from 'lucide-react';
import { prefetchMenuData } from '../lib/storage';

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
      href: '/transaksi',
      label: 'Transaksi',
      icon: ClipboardList,
      active: pathname?.startsWith('/transaksi')
    },
    {
      href: '/pelanggan',
      label: 'Pelanggan',
      icon: Users,
      active: pathname?.startsWith('/pelanggan')
    },
    {
      href: '/armada',
      label: 'Armada',
      icon: Bike,
      active: pathname?.startsWith('/armada')
    },
    {
      href: '/pengeluaran',
      label: 'Pengeluaran',
      icon: ArrowDownCircle,
      active: pathname?.startsWith('/pengeluaran')
    },
    {
      href: '/laporan',
      label: 'Laporan',
      icon: BarChart3,
      active: pathname?.startsWith('/laporan')
    },
    {
      href: '/pengaturan',
      label: 'Pengaturan',
      icon: Settings,
      active: pathname?.startsWith('/pengaturan')
    }
  ];

  return (
    <nav className="bottom-nav no-print" aria-label="Navigasi Utama" style={{ padding: '4px 6px calc(6px + var(--safe-bottom)) 6px', gap: '2px' }}>
      {navs.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${item.active ? 'active' : ''}`}
            style={{ padding: '2px 2px', fontSize: '9.5px', flex: 1, minWidth: 0 }}
            onMouseEnter={() => prefetchMenuData(item.href)}
            onTouchStart={() => prefetchMenuData(item.href)}
          >
            <div className="nav-icon-wrap" style={{ width: '28px', height: '28px' }}>
              <Icon size={16} strokeWidth={item.active ? 2.5 : 2} />
            </div>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
