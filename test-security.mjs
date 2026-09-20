// Script Pengujian Otomatis Perlindungan Website & Multi-Perangkat
const BASE_URL = 'http://localhost:3000';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('  UJI PERLINDUNGAN KEAMANAN & MULTI-DEVICE LOGIN   ');
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

  // ----------------------------------------------------
  // TEST 1: Security Headers Verification
  // ----------------------------------------------------
  console.log('--- 1. UJI SECURITY HEADERS ---');
  try {
    const headRes = await fetch(`${BASE_URL}/`, { method: 'HEAD' });
    const headers = headRes.headers;
    assert(headers.get('x-content-type-options') === 'nosniff', 'Header X-Content-Type-Options: nosniff terpasang');
    assert(headers.get('x-frame-options') === 'SAMEORIGIN', 'Header X-Frame-Options: SAMEORIGIN terpasang (Anti-Clickjacking)');
    assert(headers.get('x-xss-protection') === '1; mode=block', 'Header X-XSS-Protection: 1; mode=block terpasang');
    assert(headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Header Referrer-Policy terpasang');
  } catch (err) {
    assert(false, `Gagal memeriksa security headers: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 2: Multi-Device Concurrent Logins (1 Akun, Banyak Perangkat)
  // ----------------------------------------------------
  console.log('\n--- 2. UJI MULTI-DEVICE CONCURRENT SESSIONS ---');
  let tokenDevice1, tokenDevice2, tokenDevice3;

  try {
    // Device 1: Smartphone Android
    const res1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36' },
      body: JSON.stringify({ username: 'admin', password: 'shelby123' }),
    });
    const data1 = await res1.json();
    tokenDevice1 = data1.token;
    assert(res1.status === 200 && data1.success && tokenDevice1, 'Device 1 (Android) berhasil login');

    // Device 2: Laptop Windows
    const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0' },
      body: JSON.stringify({ username: 'admin', password: 'shelby123' }),
    });
    const data2 = await res2.json();
    tokenDevice2 = data2.token;
    assert(res2.status === 200 && data2.success && tokenDevice2, 'Device 2 (Windows PC) berhasil login bersamaan');

    // Device 3: Tablet iPad
    const res3 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/605.1' },
      body: JSON.stringify({ username: 'admin', password: 'shelby123' }),
    });
    const data3 = await res3.json();
    tokenDevice3 = data3.token;
    assert(res3.status === 200 && data3.success && tokenDevice3, 'Device 3 (iPad Tablet) berhasil login bersamaan');

    // Verifikasi Token Device 1, 2, 3 semuanya aktif bersamaan
    const meRes1 = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenDevice1}` },
    });
    const meData1 = await meRes1.json();
    assert(meData1.authenticated === true, 'Device 1 tetap terotentikasi saat Device 2 & 3 masuk');

    const meRes2 = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenDevice2}` },
    });
    const meData2 = await meRes2.json();
    assert(meData2.authenticated === true, 'Device 2 terotentikasi secara independen');

    const meRes3 = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenDevice3}` },
    });
    const meData3 = await meRes3.json();
    assert(meData3.authenticated === true, 'Device 3 terotentikasi secara independen');
    assert(meData3.activeDevicesCount >= 3, `Jumlah perangkat aktif tercatat akurat (${meData3.activeDevicesCount} perangkat)`);
  } catch (err) {
    assert(false, `Gagal dalam pengujian multi-device: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 3: Independent Device Logout
  // ----------------------------------------------------
  console.log('\n--- 3. UJI LOGOUT INDEPENDEN (HANYA MEMUTUS PERANGKAT SAAT INI) ---');
  try {
    // Logout Device 1
    const logoutRes1 = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenDevice1}` },
    });
    assert(logoutRes1.status === 200, 'Logout request pada Device 1 berhasil');

    // Cek Device 1: Harus sudah tidak authenticated
    const meRes1After = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenDevice1}` },
    });
    assert(meRes1After.status === 401, 'Device 1 berhasil logout dan token tidak berlaku');

    // Cek Device 2: Harus TETAP AKTIF dan tidak terputus
    const meRes2After = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenDevice2}` },
    });
    const meData2After = await meRes2After.json();
    assert(meData2After.authenticated === true, 'Device 2 TETAP AKTIF (tidak ter-kick out saat Device 1 logout)');

    // Cek Device 3: Harus TETAP AKTIF
    const meRes3After = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenDevice3}` },
    });
    const meData3After = await meRes3After.json();
    assert(meData3After.authenticated === true, 'Device 3 TETAP AKTIF');
  } catch (err) {
    assert(false, `Gagal dalam pengujian isolasi logout: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 4: Brute-Force Rate Limiting Protection
  // ----------------------------------------------------
  console.log('\n--- 4. UJI PROTEKSI BRUTE-FORCE (RATE LIMITING) ---');
  try {
    const testUsername = 'victim_test_user';
    let wasBlocked = false;

    for (let attempt = 1; attempt <= 6; attempt++) {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, password: 'wrong_password_xyz' }),
      });

      if (attempt <= 5) {
        assert(res.status === 401, `Percobaan salah #${attempt} ditolak dengan 401 Unauthorized`);
      } else {
        // Percobaan ke-6 harus memicu 429 Too Many Requests
        if (res.status === 429) {
          wasBlocked = true;
          const data = await res.json();
          assert(true, `Percobaan #${attempt} diblokir otomatis oleh Rate Limiter (HTTP 429: ${data.error})`);
        } else {
          assert(false, `Percobaan #${attempt} seharusnya diblokir 429, tetapi mendapat ${res.status}`);
        }
      }
    }
  } catch (err) {
    assert(false, `Gagal dalam pengujian brute-force: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 5: Fleet Export Verification
  // ----------------------------------------------------
  console.log('\n--- 5. UJI INTEGRITAS DATA EKSPOR ARMADA ---');
  try {
    const fleetRes = await fetch(`${BASE_URL}/api/armada`);
    const fleetData = await fleetRes.json();
    assert(fleetData.success && Array.isArray(fleetData.data), 'Endpoint Armada merespons daftar kendaraan');
    assert(fleetData.data.length > 0, `Data armada terdeteksi: ${fleetData.data.length} unit motor siap ekspor`);
    
    // Verifikasi kolom nopol dan dailyRate ada
    const sample = fleetData.data[0];
    assert(sample.nopol && sample.dailyRate && sample.brand, `Data sample armada valid: ${sample.nopol} - ${sample.brand} ${sample.model}`);
  } catch (err) {
    assert(false, `Gagal dalam pengujian ekspor armada: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`  HASIL PENGUJIAN: ${passedTests} DARI ${totalTests} TEST BERHASIL`);
  console.log('====================================================');
}

runSecurityTests();
