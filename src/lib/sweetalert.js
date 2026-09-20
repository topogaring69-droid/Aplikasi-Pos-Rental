import Swal from 'sweetalert2';

/**
 * Utilitas SweetAlert2 Terstandarisasi untuk Seluruh Aplikasi POS
 * Menggantikan alert browser standar, konfirmasi confirm(), dan toast custom
 */

// 1. Toast Notification Mixin (Pojok Kanan Atas)
const ToastMixin = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#ffffff',
  color: '#0f172a',
  customClass: {
    popup: 'swal2-pos-toast',
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

/**
 * Menampilkan notifikasi toast ringkas yang elegan
 * @param {string} message - Pesan notifikasi
 * @param {'success'|'error'|'warning'|'info'} [type='success'] - Jenis ikon/warna
 */
export function showToast(message, type = 'success') {
  // Normalisasi ikon SweetAlert2 (info, success, error, warning)
  const icon = type === 'danger' ? 'error' : type;
  return ToastMixin.fire({
    icon,
    title: message,
  });
}

/**
 * Menampilkan dialog modal konfirmasi modern menggantikan window.confirm()
 * @param {Object} options
 * @param {string} options.title - Judul konfirmasi
 * @param {string} [options.text] - Penjelasan tindakan
 * @param {string} [options.confirmButtonText='Ya, Lanjutkan'] - Teks tombol konfirmasi
 * @param {string} [options.cancelButtonText='Batal'] - Teks tombol pembatalan
 * @param {'warning'|'question'|'info'} [options.icon='warning'] - Ikon dialog
 * @param {boolean} [options.isDanger=true] - Menentukan apakah tombol konfirmasi bernuansa bahaya (merah) atau aksi normal (hijau)
 * @returns {Promise<boolean>} true jika dikonfirmasi, false jika dibatalkan
 */
export async function showConfirm({
  title = 'Konfirmasi Tindakan',
  text = 'Apakah Anda yakin ingin melanjutkan?',
  confirmButtonText = 'Ya, Lanjutkan',
  cancelButtonText = 'Batal',
  icon = 'warning',
  isDanger = true,
}) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: isDanger ? '#e11d48' : '#059669',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: isDanger,
    background: '#ffffff',
    color: '#0f172a',
    customClass: {
      popup: 'swal2-pos-modal',
      confirmButton: 'swal2-pos-btn swal2-pos-confirm',
      cancelButton: 'swal2-pos-btn swal2-pos-cancel',
      title: 'swal2-pos-title',
      htmlContainer: 'swal2-pos-text',
    },
  });

  return Boolean(result.isConfirmed);
}

/**
 * Menampilkan dialog informasi modal menggantikan window.alert()
 * @param {Object} options
 * @param {string} options.title - Judul alert
 * @param {string} [options.text] - Pesan alert
 * @param {'info'|'success'|'error'|'warning'} [options.icon='info'] - Ikon
 * @param {string} [options.confirmButtonText='Tutup'] - Teks tombol
 */
export async function showAlert({
  title,
  text = '',
  icon = 'info',
  confirmButtonText = 'Tutup',
}) {
  return await Swal.fire({
    title,
    text,
    icon,
    confirmButtonText,
    confirmButtonColor: '#059669',
    background: '#ffffff',
    color: '#0f172a',
    customClass: {
      popup: 'swal2-pos-modal',
      confirmButton: 'swal2-pos-btn swal2-pos-confirm',
      title: 'swal2-pos-title',
      htmlContainer: 'swal2-pos-text',
    },
  });
}

/**
 * Menampilkan popup pesan sukses
 */
export function showSuccess(title, text = '') {
  return showAlert({ title, text, icon: 'success', confirmButtonText: 'Selesai' });
}

/**
 * Menampilkan popup pesan error
 */
export function showError(title, text = '') {
  return showAlert({ title, text, icon: 'error', confirmButtonText: 'Tutup' });
}

/**
 * Menampilkan popup pesan info
 */
export function showInfo(title, text = '') {
  return showAlert({ title, text, icon: 'info', confirmButtonText: 'Mengerti' });
}

export default Swal;
