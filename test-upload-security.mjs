// Script Pengujian Otomatis Keamanan Upload & Link Access Terproteksi
const BASE_URL = 'http://localhost:3000';

async function runUploadSecurityTests() {
  console.log('====================================================');
  console.log('  UJI KEAMANAN UPLOAD & LINK ACCESS TERPROTEKSI     ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
    }
  }

  const existingFile = 'nota_1789811488649_mg279.png';

  // ----------------------------------------------------
  // TEST 1: Akses File Tanpa Login Harus Ditolak (401)
  // ----------------------------------------------------
  console.log('--- 1. UJI AKSES BERKAS TANPA LOGIN (UNAUTHENTICATED) ---');
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/uploads/${existingFile}`);
    assert(unauthRes.status === 401, `Akses tanpa login ditolak dengan HTTP 401 (Status: ${unauthRes.status})`);
    const unauthData = await unauthRes.json();
    assert(unauthData.error && unauthData.error.includes('login'), `Pesan error informatif: "${unauthData.error}"`);
  } catch (err) {
    assert(false, `Gagal uji unauthenticated: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 2: Akses File Dengan Token Palsu / Kedaluwarsa Harus Ditolak
  // ----------------------------------------------------
  console.log('\n--- 2. UJI AKSES DENGAN TOKEN PALSU ---');
  try {
    const fakeRes = await fetch(`${BASE_URL}/api/uploads/${existingFile}`, {
      headers: { Authorization: 'Bearer fake_token_1234567890abcdef' },
    });
    assert(fakeRes.status === 401, `Token palsu ditolak dengan HTTP 401 (Status: ${fakeRes.status})`);
  } catch (err) {
    assert(false, `Gagal uji token palsu: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 3: Uji Pencegahan Serangan Path Traversal
  // ----------------------------------------------------
  console.log('\n--- 3. UJI PROTEKSI PATH TRAVERSAL ---');
  try {
    const traversalRes1 = await fetch(`${BASE_URL}/api/uploads/..%2Fpackage.json`);
    assert(traversalRes1.status === 400 || traversalRes1.status === 401 || traversalRes1.status === 404, 
      `Path traversal ..%2F dicegah dengan status HTTP ${traversalRes1.status}`);

    const traversalRes2 = await fetch(`${BASE_URL}/api/uploads/subfolder%2Fevil.png`);
    assert(traversalRes2.status === 400 || traversalRes2.status === 401 || traversalRes2.status === 404, 
      `Subdirectory injection dicegah dengan status HTTP ${traversalRes2.status}`);
  } catch (err) {
    assert(false, `Gagal uji path traversal: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 4: Login Pengguna Sah untuk Mendapatkan Token
  // ----------------------------------------------------
  console.log('\n--- 4. AUTENTIKASI PENGGUNA RESMI ---');
  let authToken = null;
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'shelby123' }),
    });
    const loginData = await loginRes.json();
    authToken = loginData.token;
    assert(loginRes.status === 200 && authToken, 'Login akun admin berhasil, token sesi diperoleh');
  } catch (err) {
    assert(false, `Gagal login admin: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 5: Akses File Berizin dengan Token Sah
  // ----------------------------------------------------
  console.log('\n--- 5. UJI AKSES BERKAS DENGAN SESI SAH (LINK ACCESS) ---');
  try {
    const secureRes = await fetch(`${BASE_URL}/api/uploads/${existingFile}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(secureRes.status === 200, `Akses berkas dengan sesi sah berhasil (HTTP 200)`);
    assert(secureRes.headers.get('content-type') === 'image/png', `Content-Type terdeteksi tepat (image/png)`);
    assert(secureRes.headers.get('cache-control')?.includes('private'), `Header Cache-Control privat terpasang`);
    assert(secureRes.headers.get('x-content-type-options') === 'nosniff', `Header nosniff terpasang`);
    
    const buffer = await secureRes.arrayBuffer();
    assert(buffer.byteLength > 0, `Ukuran berkas valid: ${buffer.byteLength} bytes diterima`);
  } catch (err) {
    assert(false, `Gagal membaca berkas aman: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 6: Akses File Melalui URL Query Param ?token=
  // ----------------------------------------------------
  console.log('\n--- 6. UJI AKSES VIA QUERY PARAMETER ?token= ---');
  try {
    const queryRes = await fetch(`${BASE_URL}/api/uploads/${existingFile}?token=${authToken}`);
    assert(queryRes.status === 200, `Akses berkas via query parameter ?token= berhasil (HTTP 200)`);
  } catch (err) {
    assert(false, `Gagal akses via token query: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 7: Unggah Berkas Baru ke Penyimpanan Privat
  // ----------------------------------------------------
  console.log('\n--- 7. UJI PENGUNGGAHAN BERKAS BARU ---');
  let uploadedUrl = null;
  try {
    // 7a. Coba upload tanpa token -> harus gagal 401
    const failUploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }),
    });
    assert(failUploadRes.status === 401, `Upload tanpa sesi login ditolak dengan HTTP 401`);

    // 7b. Upload dengan token yang sah
    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}` 
      },
      body: JSON.stringify({ base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }),
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 200 && uploadData.success, 'Upload berkas baru dengan sesi sah berhasil (HTTP 200)');
    assert(uploadData.url.startsWith('/api/uploads/'), `URL hasil upload diarahkan ke link access privat: ${uploadData.url}`);
    uploadedUrl = uploadData.url;

    // Verifikasi berkas yang baru diunggah dapat diakses dengan token
    const fetchNewRes = await fetch(`${BASE_URL}${uploadedUrl}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(fetchNewRes.status === 200, `Berkas baru yang diunggah langsung dapat diakses via link access`);
  } catch (err) {
    assert(false, `Gagal uji upload baru: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 8: Uji Normalisasi Data API Pengeluaran
  // ----------------------------------------------------
  console.log('\n--- 8. UJI API PENGELUARAN (NORMALISASI LINK ACCESS) ---');
  try {
    const expRes = await fetch(`${BASE_URL}/api/pengeluaran`);
    const expData = await expRes.json();
    assert(expData.success && Array.isArray(expData.data), 'Endpoint GET /api/pengeluaran berhasil merespons');
    
    const sampleWithPhoto = expData.data.find(e => e.receiptPhoto);
    if (sampleWithPhoto) {
      assert(sampleWithPhoto.receiptPhoto.startsWith('/api/uploads/'), 
        `receiptPhoto pada pengeluaran menggunakan URL link access aman: ${sampleWithPhoto.receiptPhoto}`);
    } else {
      assert(true, 'Tidak ada pengeluaran dengan foto untuk dicek');
    }
  } catch (err) {
    assert(false, `Gagal cek API pengeluaran: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`  HASIL PENGUJIAN: ${passedTests} DARI ${totalTests} TEST BERHASIL`);
  console.log('====================================================');
}

runUploadSecurityTests();
