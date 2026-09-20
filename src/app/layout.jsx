import './globals.css';
import AppClientWrapper from '../components/AppClientWrapper';

export const metadata = {
  title: 'POS Rental Motor - Sistem Kasir & Pembukuan',
  description: 'Aplikasi POS Kasir Rental Motor Mobile-First siap konversi Android',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090e17'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AppClientWrapper>
          {children}
        </AppClientWrapper>
      </body>
    </html>
  );
}
