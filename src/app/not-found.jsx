import NotFoundView from '../components/NotFoundView';

export const metadata = {
  title: '404 - Halaman Tidak Ditemukan | POS Shelby Rent',
  description: 'Halaman yang Anda tuju tidak ditemukan atau telah dipindahkan.',
};

export default function NotFound() {
  return <NotFoundView />;
}
