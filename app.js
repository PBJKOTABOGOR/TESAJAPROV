const SS_ID = "1bQ-hjRUnWhPjWsH8KH_Lh3Sq0k7pMzW1oLsw85xizNY";
const DRIVE_FOLDER_ID = '1KYkL4u2N2F5JN9hOpjluK9l0xzQB4gZ7';

const SH_USER = 'USER';
const SH_BIDANG = 'BIDANG';
const SH_RENCANA = 'PERENCANAAN';
const SH_PENCAIRAN = 'PENCAIRAN';
const SH_DOKUMEN = 'DOKUMEN';
const SH_LOG = 'LOG_AKSES';
const SH_CONFIG = 'KONFIGURASI';
const SH_REALISASI = 'REALISASI';
const SH_NON_PENGADAAN = 'NON_PENGADAAN';
const SH_HONOR_PENERIMA = 'HONOR_PENERIMA';
const SH_DOKUMEN_NON_PENGADAAN = 'DOKUMEN_NON_PENGADAAN';

const REQUIRED_HEADERS = {
  USER:['id_user','nama','username','password','id_bidang','status','role','bidang_akses'],
  BIDANG:['id_bidang','nama_bidang','pagu','status_akses','keterangan','pagu_pengadaan','pagu_non_pengadaan'],
  PERENCANAAN:['id_kegiatan','id_bidang','nama_kegiatan','rincian_kebutuhan','keterangan','volume','satuan','harga_satuan','jumlah','metode_pemilihan','waktu_pemilihan','status_perencanaan','tanggal_input','input_by','alasan_penolakan','alasan_perubahan','perubahan_ke','riwayat_perubahan','status_pencairan','kategori','jenis_non_pengadaan'],
  PENCAIRAN:['id_pencairan','id_kegiatan','id_bidang','status_pencairan','catatan_admin','tanggal_update'],
  DOKUMEN:['id_dokumen','id_kegiatan','id_bidang','jenis_dokumen','nama_file','url_file','tanggal_upload','upload_by','status_verifikasi','catatan_admin','tanggal_verifikasi','verifikasi_by','tanggal_revisi','revisi_by','riwayat_dokumen'],
  LOG_AKSES:['tanggal','admin','aksi','target','keterangan'],
  KONFIGURASI:['key','value','keterangan'],
  REALISASI:['id_realisasi','id_kegiatan','id_bidang','kategori','metode','nilai_perencanaan','nilai_realisasi','tanggal_realisasi','nomor_bukti','keterangan','input_by','tanggal_input','status','riwayat_perubahan'],
  NON_PENGADAAN:['id_non_pengadaan','id_kegiatan','id_bidang','jenis_non_pengadaan','total_bruto','total_pajak','total_netto','status','tanggal_input','input_by','versi_pdf','nama_file_pdf','url_pdf','tanggal_generate','generate_by'],
  HONOR_PENERIMA:['id_penerima','id_non_pengadaan','id_kegiatan','id_bidang','nama_penerima','nik_npwp','jabatan_peran','volume','satuan','tarif_honor','jenis_pajak','kategori_pajak','tarif_pajak','nilai_pajak','jumlah_bruto','jumlah_netto','versi_pdf','tanggal_input','input_by'],
  DOKUMEN_NON_PENGADAAN:['id_dokumen_non','id_non_pengadaan','id_kegiatan','id_bidang','jenis_dokumen','nama_file','url_file','tanggal_upload','upload_by','status_verifikasi','catatan_verifikator','tanggal_verifikasi','verifikasi_by','riwayat_dokumen','versi_dokumen']
};

function doGet(e){
  try{
    ensureAllHeadersFast();
    return out({
      success:true,
      message:'API SIMPROV aktif',
      spreadsheet_id: SS_ID,
      time: new Date()
    });
  }catch(err){
    return out({success:false,message:err.message, stack:err.stack});
  }
}
function doPost(e){
  try{
    ensureAllHeadersFast();
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const req = JSON.parse(raw || '{}');
    const a = req.action;

    const mutatingActions = [
      'updateBidang','saveBidang','savePerencanaan','updatePerencanaan','deletePerencanaan',
      'setujuiPerencanaan','tolakPerencanaan','uploadDokumen','revisiDokumen',
      'verifyDokumen','updateStatusPencairan','verifyDokumenNonPengadaan','revisiDokumenNonPengadaan','saveVerifierAccount','updateVerifierAccount','saveSystemIdentity'
    ];

    if(mutatingActions.indexOf(a) >= 0){
      return withWriteLock(function(){ return out(routeAction_(a, req)); });
    }
    return out(routeAction_(a, req));
  }catch(err){
    return out({
      success:false,
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : ''
    });
  }
}
function routeAction_(a, req){
  if(a === 'login') return login(req);
  if(a === 'getDashboard') return getDashboard(req);
  if(a === 'getPublicDashboard') return getPublicDashboard(req);
  if(a === 'updateBidang') return updateBidang(req);
  if(a === 'saveBidang') return saveBidang(req);
  if(a === 'savePerencanaan') return savePerencanaan(req);
  if(a === 'updatePerencanaan') return updatePerencanaan(req);
  if(a === 'deletePerencanaan') return deletePerencanaan(req);
  if(a === 'setujuiPerencanaan') return setStatusPerencanaan(req,'DISETUJUI');
  if(a === 'tolakPerencanaan') return setStatusPerencanaan(req,'DITOLAK');
  if(a === 'uploadDokumen') return uploadDokumen(req);
  if(a === 'revisiDokumen') return revisiDokumen(req);
  if(a === 'verifyDokumen') return verifyDokumen(req);
  if(a === 'updateStatusPencairan') return updateStatusPencairan(req);
  if(a === 'generateHonorPdf') return generateHonorPdf(req);
  if(a === 'uploadDokumenNonPengadaan') return uploadDokumenNonPengadaan(req);
  if(a === 'verifyDokumenNonPengadaan') return verifyDokumenNonPengadaan(req);
  if(a === 'revisiDokumenNonPengadaan') return revisiDokumenNonPengadaan(req);
  if(a === 'saveVerifierAccount') return saveVerifierAccount(req);
  if(a === 'updateVerifierAccount') return updateVerifierAccount(req);
  if(a === 'getVerifierAccounts') return getVerifierAccounts(req);
  if(a === 'saveSystemIdentity') return saveSystemIdentity(req);
  if(a === 'getSystemIdentity') return getSystemIdentity(req);
  if(a === 'forceDriveAuth') return forceDriveAuth();
  return {success:false,message:'Action tidak dikenal: ' + a};
}
function withWriteLock(fn){
  const lock = LockService.getScriptLock();
  try{
    lock.waitLock(28000);
    return fn();
  }catch(err){
    return out({
      success:false,
      message:'Server sedang memproses data dari user lain. Silakan ulangi beberapa detik lagi.',
      detail: err && err.message ? err.message : String(err)
    });
  }finally{
    try{ lock.releaseLock(); }catch(e){}
  }
}
function ensureAllHeadersFast(){
  const cache = CacheService.getScriptCache();
  const key = 'SIMPROV_HEADERS_OK_V65';
  if(cache.get(key) === '1') return;
  ensureAllHeaders();
  cache.put(key, '1', 300);
}
function out(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function ss(){ return SpreadsheetApp.openById(SS_ID); }
function sh(name){ const s = ss().getSheetByName(name); if(!s) throw new Error('Sheet tidak ditemukan: ' + name); return s; }
function norm(v){ return String(v == null ? '' : v).trim(); }
function upper(v){ return norm(v).toUpperCase(); }
function num(v){
  if(v === null || v === undefined || v === '') return 0;
  if(typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v).trim().replace(/[^0-9,.-]/g, '');
  if(!s) return 0;
  if((s.match(/\./g)||[]).length > 1 && s.indexOf(',') < 0) s = s.replace(/\./g, '');
  else if(s.indexOf('.') > -1 && s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
  else if(s.indexOf(',') > -1 && s.indexOf('.') < 0) s = s.replace(',', '.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return isFinite(n) ? n : 0;
}

function formatRp(n){
  return 'Rp ' + Number(num(n)).toLocaleString('id-ID');
}

function normalizeWaktuPemilihan(v){
  const s = norm(v);
  if(!s) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if(!isNaN(d.getTime())) return Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd');
  return s;
}
function metodePemilihanByNilai(jumlah){
  const nilai = num(jumlah);
  if(nilai <= 500000000) return 'Belanja Langsung';
  if(nilai <= 1000000000) return 'Pengadaan Langsung';
  return 'Tender Manual';
}
function waktuPemilihanByNilai(jumlah){
  const metode = metodePemilihanByNilai(jumlah);
  if(metode === 'Belanja Langsung') return '± 1 - 3 hari kerja';
  if(metode === 'Pengadaan Langsung') return '± 7 - 14 hari kerja';
  return 'menyesuaikan jadwal tender manual';
}
function dokumenKetentuanByNilai(jumlah){
  const metode = metodePemilihanByNilai(jumlah);
  if(metode === 'Belanja Langsung') return [
    'Hasil Survey Harga','Spesifikasi Teknis dan HPS','Kuitansi / Nota / Invoice',
    'Berita Acara Pemeriksaan Barang/Pekerjaan','Berita Acara Serah Terima',
    'Faktur Pembelian','SPTJM','Surat Permohonan Pembayaran',
    'Nota Dinas Pencairan','Surat Perintah Pembayaran'
  ];
  if(metode === 'Pengadaan Langsung') return [
    'Hasil Survey Harga','Spesifikasi Teknis dan HPS','Surat Undangan Pengadaan Langsung',
    'Surat Penawaran','Berita Acara Evaluasi dan Negosiasi','Berita Acara Hasil Pengadaan Langsung',
    'Surat Perintah Kerja','Berita Acara Pemeriksaan Barang/Pekerjaan','Berita Acara Serah Terima',
    'Kuitansi / Nota / Invoice','Bukti Pembelian / Kwitansi','Faktur Pembelian','SPTJM',
    'Surat Permohonan Pembayaran','Nota Dinas Pencairan','Surat Perintah Pembayaran'
  ];
  return [
    'Hasil Survey Harga','Spesifikasi Teknis dan HPS','Surat Undangan Pengadaan Langsung',
    'Surat Penawaran','Berita Acara Evaluasi dan Negosiasi','Berita Acara Hasil Pengadaan Langsung',
    'Surat Perjanjian / Kontrak','Berita Acara Pemeriksaan Barang/Pekerjaan','Berita Acara Serah Terima',
    'Kuitansi / Nota / Invoice','Bukti Pembelian / Kwitansi','Faktur Pembelian','SPTJM',
    'Surat Permohonan Pembayaran','Nota Dinas Pencairan','Surat Perintah Pembayaran'
  ];
}

function isStatusDihitungPagu(status){
  // DITOLAK tidak mengunci pagu karena harus direvisi dulu oleh bidang.
  // DIAJUKAN, DISETUJUI, dan PERUBAHAN_DIAJUKAN tetap dihitung sebagai pemakaian pagu.
  return upper(status) !== 'DITOLAK';
}
function getPaguBidang(idBidang){
  const bidang = findById(getRows(SH_BIDANG),'id_bidang',idBidang);
  if(!bidang) return null;
  return num(bidang.pagu);
}
function totalPerencanaanAktif(idBidang, excludeIdKegiatan){
  const ex = norm(excludeIdKegiatan);
  return getRows(SH_RENCANA)
    .filter(r => norm(r.id_kegiatan) && norm(r.id_bidang) === norm(idBidang))
    .filter(r => !ex || norm(r.id_kegiatan) !== ex)
    .filter(r => isStatusDihitungPagu(r.status_perencanaan))
    .reduce((s,r)=>s + (num(r.jumlah) || num(r.volume) * num(r.harga_satuan)), 0);
}
function validasiPaguBidang(idBidang, jumlahBaru, excludeIdKegiatan){
  const pagu = getPaguBidang(idBidang);
  if(pagu === null) return {ok:false,message:'Bidang tidak ditemukan'};
  const totalLain = totalPerencanaanAktif(idBidang, excludeIdKegiatan);
  const jumlah = num(jumlahBaru);
  const sisa = pagu - totalLain;
  if(jumlah > sisa){
    return {
      ok:false,
      pagu:pagu,
      total_aktif:totalLain,
      sisa:sisa,
      jumlah:jumlah,
      message:'Gagal menyimpan. Total perencanaan melebihi pagu bidang. Sisa pagu saat ini ' + formatRp(sisa) + ', sedangkan nilai yang diajukan ' + formatRp(jumlah) + '.'
    };
  }
  return {ok:true,pagu:pagu,total_aktif:totalLain,sisa:sisa,jumlah:jumlah};
}

function ensureAllHeaders(){
  Object.keys(REQUIRED_HEADERS).forEach(function(name){
    if(!ss().getSheetByName(name)) ss().insertSheet(name);
    ensureHeaders(name);
  });
  // Rapihkan sheet supaya data tidak nyangkut di baris 1001 kalau ada 1000 baris kosong bawaan Google Sheet.
  compactDataRows(SH_RENCANA, 'id_kegiatan');
  compactDataRows(SH_PENCAIRAN, 'id_pencairan');
  compactDataRows(SH_DOKUMEN, 'id_dokumen');
}
function compactDataRows(name, keyHeader){
  try{
    const sheet = sh(name);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if(lastRow <= 2 || lastCol < 1) return;
    const hs = sheet.getRange(1,1,1,lastCol).getValues()[0].map(h => norm(h));
    const keyIdx = hs.indexOf(keyHeader);
    if(keyIdx < 0) return;
    const dataRange = sheet.getRange(2,1,lastRow-1,lastCol);
    const vals = dataRange.getValues();
    const rows = vals.filter(row => norm(row[keyIdx]) !== '');
    if(rows.length === vals.length) return;
    dataRange.clearContent();
    if(rows.length) sheet.getRange(2,1,rows.length,lastCol).setValues(rows);
    SpreadsheetApp.flush();
  }catch(e){ Logger.log('compactDataRows gagal ' + name + ': ' + e.message); }
}
function ensureHeaders(name){
  const sheet = sh(name);
  const required = REQUIRED_HEADERS[name] || [];
  if(sheet.getLastRow() < 1) sheet.appendRow(required);
  let lastCol = Math.max(1, sheet.getLastColumn());
  let hs = sheet.getRange(1,1,1,lastCol).getValues()[0].map(h => norm(h));
  if(hs.every(h => !h) && required.length){ sheet.getRange(1,1,1,required.length).setValues([required]); return; }
  required.forEach(h => { if(hs.indexOf(h) < 0){ sheet.getRange(1, sheet.getLastColumn()+1).setValue(h); hs.push(h); } });
}
function headers(name){ ensureHeaders(name); return sh(name).getRange(1,1,1,Math.max(1, sh(name).getLastColumn())).getValues()[0].map(h => norm(h)); }
function colIndex(name, header){ const idx = headers(name).indexOf(header); return idx < 0 ? -1 : idx + 1; }
function setCell(name, row, header, value){ const c = colIndex(name, header); if(c > 0) sh(name).getRange(row,c).setValue(value); }
function appendByHeader(name, obj){
  ensureHeaders(name);
  const sheet = sh(name);
  const hs = headers(name);
  const row = hs.map(h => obj[h] !== undefined ? obj[h] : '');
  const keyHeader = (REQUIRED_HEADERS[name] || [])[0];
  const keyIdx = hs.indexOf(keyHeader);
  let targetRow = Math.max(2, sheet.getLastRow() + 1);

  // Jangan pakai appendRow, karena kalau sheet punya 1000 baris kosong, data bisa lompat ke baris 1001.
  // Cari baris kosong pertama berdasarkan kolom ID.
  if(keyIdx >= 0){
    const maxRows = Math.max(sheet.getLastRow(), 2);
    const keys = sheet.getRange(2, keyIdx + 1, Math.max(1, maxRows - 1), 1).getValues();
    for(let i=0;i<keys.length;i++){
      if(norm(keys[i][0]) === ''){ targetRow = i + 2; break; }
    }
  }
  sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  SpreadsheetApp.flush();
}
function appendLog(admin, aksi, target, ket){ try{ appendByHeader(SH_LOG,{tanggal:new Date(), admin:admin || '', aksi:aksi || '', target:target || '', keterangan:ket || ''}); }catch(e){} }
function getRows(name){
  ensureHeaders(name);
  const sheet = sh(name);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if(lastRow < 1 || lastCol < 1) return [];
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  if(values.length < 1) return [];
  const hs = values[0].map(h => norm(h));
  const rows = [];
  for(let idx=1; idx<values.length; idx++){
    const row = values[idx];
    let hasValue = false;
    const o = {_row:idx+1};
    for(let i=0; i<hs.length; i++){
      const h = hs[i];
      if(!h) continue;
      const v = row[i];
      o[h] = v;
      if(!hasValue && norm(v) !== '') hasValue = true;
    }
    if(hasValue) rows.push(o);
  }
  return rows;
}
function findById(rows, field, id){ if(!norm(id)) return null; return rows.find(r => norm(r[field]) === norm(id)); }
function userRole_(user){
  const explicit = upper(user && user.role).replace(/\s+/g,'_');
  if(['VERIFIKATOR','VERIFIKATOR_PBJ','PBJ','VERIFIKATOR_KEUANGAN','KEUANGAN','VERIF_KEUANGAN'].indexOf(explicit)>=0) return 'VERIFIKATOR';
  if(explicit) return explicit;
  const legacy = upper(user && user.id_bidang).replace(/\s+/g,'_');
  if(legacy === 'ADMIN') return 'ADMIN';
  if(['VERIFIKATOR','VERIFIKATOR_PBJ','PBJ','KEUANGAN','VERIF_KEUANGAN','VERIFIKATOR_KEUANGAN'].indexOf(legacy)>=0) return 'VERIFIKATOR';
  if(legacy === 'SEKDA' || legacy === 'AUDITOR') return legacy;
  return 'BIDANG';
}
function requireAdmin(user){ if(userRole_(user) !== 'ADMIN') throw new Error('Akses admin diperlukan'); }
function isAdminUser(user){ return userRole_(user) === 'ADMIN'; }
function isPBJUser_(user){ const r=userRole_(user); return r === 'ADMIN' || r === 'VERIFIKATOR'; }
function isReviewerUser(user){ const r=userRole_(user); return r === 'SEKDA' || r === 'AUDITOR' || r === 'VERIFIKATOR'; }
function isKeuanganUser(user){ return userRole_(user) === 'VERIFIKATOR'; }
function assignedBidangIds_(user){
  const raw = norm(user && (user.bidang_akses || user.akses_bidang || user.assigned_bidang));
  if(!raw) return [];
  return raw.split(/[,;|\n]+/).map(norm).filter(Boolean);
}
function canAccessBidang_(user,idBidang){
  if(isAdminUser(user) || userRole_(user)==='SEKDA' || userRole_(user)==='AUDITOR') return true;
  const target=norm(idBidang);
  const role=userRole_(user);
  // User Bidang selalu boleh mengakses bidangnya sendiri.
  if(role==='BIDANG' && norm(user && user.id_bidang)===target) return true;
  // Verifikator memakai daftar bidang penugasan. Tetap dukung id_bidang tunggal untuk data akun lama.
  const ids=assignedBidangIds_(user);
  if(ids.indexOf(target)>=0) return true;
  if(role==='VERIFIKATOR' && norm(user && user.id_bidang)===target) return true;
  return false;
}
function canSeeAllUser(user){ return isAdminUser(user) || userRole_(user)==='SEKDA' || userRole_(user)==='AUDITOR'; }
function roleNameUser(user){
  const r=userRole_(user);
  if(r==='ADMIN') return 'ADMIN';
  if(r==='VERIFIKATOR') return 'VERIFIKATOR';
  if(r==='SEKDA' || r==='AUDITOR') return r;
  return 'BIDANG';
}
function bidangIsOpen(idBidang){
  const b = findById(getRows(SH_BIDANG),'id_bidang',idBidang);
  return b && upper(b.status_akses) === 'BUKA';
}
function isKegiatanPencairanFinal(idKegiatan){
  const docs = getRows(SH_DOKUMEN).filter(d => norm(d.id_kegiatan) === norm(idKegiatan));
  const pr = findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan);
  const st = upper(pr && pr.status_pencairan);
  if(['SELESAI','SUDAH DICAIRKAN'].indexOf(st) >= 0) return true;
  return false;
}

function forceDriveAuth(){
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  return {success:true,message:'Akses Drive OK: ' + folder.getName()};
}
function login(req){
  const username = norm(req.username), password = norm(req.password);
  const users = getRows(SH_USER), bidangs = getRows(SH_BIDANG);
  const u = users.find(x => norm(x.username) === username && norm(x.password) === password);
  if(!u) return {success:false,message:'Username atau password salah'};
  if(upper(u.status) !== 'AKTIF') return {success:false,message:'Akun tidak aktif'};
  const ur = userRole_(u);
  if(ur === 'ADMIN'){ u.nama_bidang = 'ADMIN'; u.role = 'ADMIN'; return {success:true,message:'Login berhasil',user:u}; }
  if(ur === 'VERIFIKATOR'){ u.nama_bidang = 'VERIFIKATOR'; u.role = 'VERIFIKATOR'; return {success:true,message:'Login berhasil',user:u}; }
  if(ur === 'SEKDA' || ur === 'AUDITOR'){ u.nama_bidang = ur; u.role = ur; return {success:true,message:'Login berhasil',user:u}; }
  const b = findById(bidangs,'id_bidang',u.id_bidang);
  if(!b) return {success:false,message:'Bidang akun tidak ditemukan di sheet BIDANG'};
  // Tetap boleh login walaupun akses TUTUP. Yang ditutup hanya input/edit Perencanaan. Menu Pencairan tetap bisa dipakai.
  u.nama_bidang = b.nama_bidang; u.pagu = num(b.pagu); u.status_akses = b.status_akses; u.role = 'BIDANG';
  return {success:true,message:'Login berhasil',user:u};
}
function getRowsOptional_(sheetName){
  try{ const s=ss().getSheetByName(sheetName); return s ? getRows(sheetName) : []; }
  catch(e){ return []; }
}
function publicCategory_(r){
  const k=upper(r.kategori || r.jenis_anggaran || r.metode_pemilihan);
  return (k.indexOf('NON')>=0 || norm(r.jenis_non_pengadaan)) ? 'NON PENGADAAN' : 'PENGADAAN';
}
function getPublicDashboard(req){
  const bidangs=getRows(SH_BIDANG);
  const rencana=getRows(SH_RENCANA).filter(function(r){return norm(r.id_kegiatan)!=='' && upper(r.status_perencanaan)!=='DITOLAK';});
  const realisasi=getRowsOptional_(SH_REALISASI).filter(function(r){return norm(r.id_realisasi)!=='' && ['FINAL','DISETUJUI','SELESAI','SAH'].indexOf(upper(r.status))>=0;});
  const nonRows=getRowsOptional_(SH_NON_PENGADAAN).filter(function(r){return norm(r.id_non_pengadaan)!=='';});
  let totalPagu=0,paguPengadaan=0,paguNon=0;
  bidangs.forEach(function(b){
    const total=num(b.pagu), pp=num(b.pagu_pengadaan), pn=num(b.pagu_non_pengadaan);
    totalPagu+=total;
    if(pp||pn){paguPengadaan+=pp; paguNon+=pn;}
    else paguPengadaan+=total;
  });
  let perPeng=0,perNon=0,jPeng=0,jNon=0,jSelesai=0;
  const perByBidang={};
  rencana.forEach(function(r){
    const nilai=num(r.jumlah)||num(r.volume)*num(r.harga_satuan); const cat=publicCategory_(r); const id=norm(r.id_bidang);
    if(!perByBidang[id]) perByBidang[id]={pengadaan:0,non_pengadaan:0,kegiatan:0,selesai:0};
    perByBidang[id].kegiatan++;
    if(cat==='NON PENGADAAN'){perNon+=nilai;jNon++;perByBidang[id].non_pengadaan+=nilai;} else {perPeng+=nilai;jPeng++;perByBidang[id].pengadaan+=nilai;}
    if(upper(r.status_pencairan)==='SELESAI'){jSelesai++;perByBidang[id].selesai++;}
  });
  let realPeng=0,realNon=0;
  const realByBidang={};
  realisasi.forEach(function(r){
    const id=norm(r.id_bidang), nilai=num(r.nilai_realisasi);
    if(!realByBidang[id]) realByBidang[id]={pengadaan:0,non_pengadaan:0,total:0};
    if(publicCategory_(r)==='NON PENGADAAN') { realNon+=nilai; realByBidang[id].non_pengadaan+=nilai; }
    else { realPeng+=nilai; realByBidang[id].pengadaan+=nilai; }
    realByBidang[id].total += nilai;
  });
  // kompatibilitas: jika sheet REALISASI belum digunakan, kegiatan SELESAI dihitung sebagai realisasi nilai perencanaan
  if(realisasi.length===0){
    rencana.forEach(function(r){
      if(upper(r.status_pencairan)==='SELESAI'){
        const n=num(r.jumlah)||num(r.volume)*num(r.harga_satuan); const id=norm(r.id_bidang);
        if(!realByBidang[id]) realByBidang[id]={pengadaan:0,non_pengadaan:0,total:0};
        if(publicCategory_(r)==='NON PENGADAAN') { realNon+=n; realByBidang[id].non_pengadaan+=n; }
        else { realPeng+=n; realByBidang[id].pengadaan+=n; }
        realByBidang[id].total += n;
      }
    });
    nonRows.forEach(function(r){
      if(upper(r.status)==='SELESAI'){
        const n=num(r.total_netto||r.total_bruto), id=norm(r.id_bidang);
        if(!realByBidang[id]) realByBidang[id]={pengadaan:0,non_pengadaan:0,total:0};
        realNon+=n; realByBidang[id].non_pengadaan+=n; realByBidang[id].total += n;
      }
    });
  }
  const realTotal=realPeng+realNon, perTotal=perPeng+perNon;
  const ringkasan=bidangs.map(function(b){
    const id=norm(b.id_bidang), x=perByBidang[id]||{pengadaan:0,non_pengadaan:0,kegiatan:0,selesai:0}, y=realByBidang[id]||{pengadaan:0,non_pengadaan:0,total:0};
    return {id_bidang:id,nama_bidang:b.nama_bidang,pagu:num(b.pagu),perencanaan_pengadaan:x.pengadaan,perencanaan_non_pengadaan:x.non_pengadaan,total_perencanaan:x.pengadaan+x.non_pengadaan,realisasi_pengadaan:y.pengadaan,realisasi_non_pengadaan:y.non_pengadaan,realisasi_total:y.total,sisa_pagu:num(b.pagu)-y.total,jumlah_kegiatan:x.kegiatan,kegiatan_selesai:x.selesai};
  });
  return {success:true,identity:getSystemIdentityData_(),summary:{total_pagu:totalPagu,pagu_pengadaan:paguPengadaan,pagu_non_pengadaan:paguNon,perencanaan_pengadaan:perPeng,perencanaan_non_pengadaan:perNon,perencanaan_total:perTotal,realisasi_pengadaan:realPeng,realisasi_non_pengadaan:realNon,realisasi_total:realTotal,sisa_pagu:totalPagu-realTotal,jumlah_pengadaan:jPeng,jumlah_non_pengadaan:jNon,jumlah_kegiatan:jPeng+jNon,jumlah_selesai:jSelesai,persentase_realisasi:totalPagu?realTotal/totalPagu*100:0},ringkasan:ringkasan};
}

function getDashboard(req){
  const user = req.user || {};
  const admin = isAdminUser(user);
  const seeAll = canSeeAllUser(user);
  const verifier = isPBJUser_(user) || isKeuanganUser(user);
  const allowedIds = assignedBidangIds_(user);
  const userBidang = norm(user.id_bidang);

  const bidangs = getRows(SH_BIDANG);
  const allRencana = getRows(SH_RENCANA).filter(r => norm(r.id_kegiatan) !== '');
  const allPencairan = getRows(SH_PENCAIRAN).filter(r => norm(r.id_pencairan) !== '' || norm(r.id_kegiatan) !== '');
  const allDokumen = getRows(SH_DOKUMEN).filter(r => norm(r.id_dokumen) !== '' || norm(r.id_kegiatan) !== '');
  const allRealisasi = getRowsOptional_(SH_REALISASI).filter(r => norm(r.id_realisasi) !== '');

  const bidangMap = {};
  const rencanaByBidang = {};
  const dokumenByBidang = {};

  for(const b of bidangs){
    const id = norm(b.id_bidang);
    bidangMap[id] = b.nama_bidang;
    rencanaByBidang[id] = [];
    dokumenByBidang[id] = [];
  }
  for(const r of allRencana){
    const id = norm(r.id_bidang);
    if(!rencanaByBidang[id]) rencanaByBidang[id] = [];
    rencanaByBidang[id].push(r);
  }
  for(const d of allDokumen){
    const id = norm(d.id_bidang);
    if(!dokumenByBidang[id]) dokumenByBidang[id] = [];
    dokumenByBidang[id].push(d);
  }

  const perencanaan = seeAll ? allRencana : (verifier ? allRencana.filter(r => allowedIds.indexOf(norm(r.id_bidang)) >= 0) : (rencanaByBidang[userBidang] || []));
  const pencairanRaw = seeAll ? allPencairan : (verifier ? allPencairan.filter(r => allowedIds.indexOf(norm(r.id_bidang)) >= 0) : allPencairan.filter(r => norm(r.id_bidang) === userBidang));
  const dokumen = seeAll ? allDokumen : (verifier ? allDokumen.filter(r => allowedIds.indexOf(norm(r.id_bidang)) >= 0) : (dokumenByBidang[userBidang] || []));
  const realisasi = seeAll ? allRealisasi : (verifier ? allRealisasi.filter(r => allowedIds.indexOf(norm(r.id_bidang)) >= 0) : allRealisasi.filter(r => norm(r.id_bidang) === userBidang));
  // Status pencairan diturunkan ulang dari status dokumen agar UI tidak menampilkan status lama/stale.
  const pencairan = pencairanRaw.map(function(p){
    const copy = Object.assign({}, p);
    if(upper(copy.status_pencairan) !== 'SELESAI') copy.status_pencairan = computeStatusPencairanKeuangan_(copy.id_kegiatan);
    return copy;
  });
  const pencairanIdSet = {};
  pencairan.forEach(function(p){ pencairanIdSet[norm(p.id_kegiatan)] = true; });
  dokumen.forEach(function(d){
    const id = norm(d.id_kegiatan);
    if(!id || pencairanIdSet[id]) return;
    pencairan.push({
      id_pencairan:'', id_kegiatan:d.id_kegiatan, id_bidang:d.id_bidang,
      status_pencairan:computeStatusPencairanKeuangan_(d.id_kegiatan), catatan_admin:'', tanggal_update:''
    });
    pencairanIdSet[id] = true;
  });

  const visibleBidangs = seeAll ? bidangs : (verifier ? bidangs.filter(b => allowedIds.indexOf(norm(b.id_bidang)) >= 0) : bidangs.filter(b => norm(b.id_bidang) === userBidang));
  const realisasiByBidang = {};
  let totalRealisasiPengadaan = 0, totalRealisasiNon = 0;
  const finalRealisasiStatus = {'FINAL':1,'DISETUJUI':1,'SELESAI':1,'SAH':1};
  realisasi.forEach(function(r){
    const st = upper(r.status);
    if(!finalRealisasiStatus[st]) return;
    const idb = norm(r.id_bidang);
    if(!realisasiByBidang[idb]) realisasiByBidang[idb] = {pengadaan:0, non:0, total:0};
    const nilai = num(r.nilai_realisasi);
    if(publicCategory_(r)==='NON PENGADAAN'){
      realisasiByBidang[idb].non += nilai;
      totalRealisasiNon += nilai;
    }else{
      realisasiByBidang[idb].pengadaan += nilai;
      totalRealisasiPengadaan += nilai;
    }
    realisasiByBidang[idb].total += nilai;
  });
  if(realisasi.length===0){
    perencanaan.forEach(function(r){
      if(upper(r.status_pencairan)!=='SELESAI') return;
      const idb = norm(r.id_bidang);
      if(!realisasiByBidang[idb]) realisasiByBidang[idb] = {pengadaan:0, non:0, total:0};
      const nilai = num(r.jumlah) || num(r.volume) * num(r.harga_satuan);
      if(publicCategory_(r)==='NON PENGADAAN'){
        realisasiByBidang[idb].non += nilai;
        totalRealisasiNon += nilai;
      }else{
        realisasiByBidang[idb].pengadaan += nilai;
        totalRealisasiPengadaan += nilai;
      }
      realisasiByBidang[idb].total += nilai;
    });
  }
  const rekap = visibleBidangs.map(b => {
    const id = norm(b.id_bidang);
    const rs = rencanaByBidang[id] || [];
    const ds = dokumenByBidang[id] || [];
    let total = 0, kegiatanDisetujui = 0, valid = 0;
    for(const r of rs){
      total += (num(r.jumlah) || num(r.volume) * num(r.harga_satuan));
      if(upper(r.status_perencanaan) === 'DISETUJUI') kegiatanDisetujui++;
    }
    for(const d of ds){
      if(isDocValidKeuangan_(d)) valid++;
    }
    const pagu = num(b.pagu);
    const rel = realisasiByBidang[id] || {pengadaan:0, non:0, total:0};
    return {
      id_bidang:b.id_bidang,
      nama_bidang:b.nama_bidang,
      pagu,
      total_perencanaan:total,
      realisasi_pengadaan:rel.pengadaan,
      realisasi_non_pengadaan:rel.non,
      total_realisasi:rel.total,
      sisa_pagu:pagu-rel.total,
      jumlah_kegiatan:rs.length,
      kegiatan_disetujui:kegiatanDisetujui,
      dokumen_upload:ds.length,
      dokumen_valid:valid,
      status_akses:b.status_akses,
      status_progress:computeProgress(rs,ds)
    };
  });

  const totalPagu = rekap.reduce(function(s,r){ return s + num(r.pagu); }, 0);
  const totalPerencanaan = rekap.reduce(function(s,r){ return s + num(r.total_perencanaan); }, 0);
  const totalRealisasi = totalRealisasiPengadaan + totalRealisasiNon;

  return {
    success:true,
    isAdmin:admin,
    isReviewer:isReviewerUser(user),
    canSeeAll:seeAll,
    role:roleNameUser(user),
    spreadsheetId:SS_ID,
    serverTime:new Date(),
    counts:{perencanaan:allRencana.length,dokumen:allDokumen.length},
    bidangs:visibleBidangs,
    perencanaan,
    pencairan,
    dokumen,
    realisasi,
    rekap,
    summary:{
      total_pagu:totalPagu,
      total_perencanaan:totalPerencanaan,
      total_realisasi:totalRealisasi,
      realisasi_pengadaan:totalRealisasiPengadaan,
      realisasi_non_pengadaan:totalRealisasiNon,
      sisa_pagu:totalPagu-totalRealisasi,
      persentase_realisasi:totalPagu ? (totalRealisasi/totalPagu*100) : 0
    },
    bidangMap,
    verifierUsers: admin ? verifierAccounts_() : [],
    systemIdentity: getSystemIdentityData_(),
    nonPengadaan: filterNonPengadaanByUser_(user),
    honorPenerima: filterHonorByUser_(user),
    dokumenNonPengadaan: filterDokumenNonByUser_(user)
  };
}
function computeProgress(rs, ds){
  if(!rs.length) return 'BELUM INPUT';
  const statuses = rs.map(r => upper(r.status_perencanaan));
  if(statuses.some(s => s === 'DIAJUKAN' || s === 'PERUBAHAN_DIAJUKAN')) return 'MENUNGGU PERSETUJUAN';
  if(statuses.some(s => s === 'DITOLAK')) return 'ADA YANG DITOLAK';
  if(!ds.length) return 'BELUM UPLOAD DOKUMEN';
  if(ds.some(d => upper(d.status_verifikasi) === 'MENUNGGU' || !upper(d.status_verifikasi))) return 'MENUNGGU VERIFIKASI';
  if(ds.some(d => upper(d.status_verifikasi) === 'PERBAIKAN' || upper(d.status_verifikasi) === 'DITOLAK')) return 'PERBAIKAN DOKUMEN';
  return 'SIAP DICAIRKAN';
}

function saveBidang(req){
  requireAdmin(req.user);
  const id = upper(req.id_bidang);
  const nama = norm(req.nama_bidang);
  if(!id || !nama) return {success:false,message:'ID bidang dan nama bidang wajib diisi'};
  const exists = findById(getRows(SH_BIDANG),'id_bidang',id);
  if(exists) return {success:false,message:'ID bidang sudah ada'};
  appendByHeader(SH_BIDANG,{
    id_bidang:id,
    nama_bidang:nama,
    pagu:num(req.pagu),
    status_akses:upper(req.status_akses) || 'BUKA',
    keterangan:req.keterangan || ''
  });
  appendLog(req.user.nama,'TAMBAH_BIDANG',id,nama);
  return {success:true,message:'Bidang berhasil ditambahkan'};
}

function updateBidang(req){
  requireAdmin(req.user);
  const r = findById(getRows(SH_BIDANG),'id_bidang',req.id_bidang);
  if(!r) return {success:false,message:'Bidang tidak ditemukan'};
  setCell(SH_BIDANG,r._row,'pagu',num(req.pagu));
  setCell(SH_BIDANG,r._row,'status_akses',upper(req.status_akses) || 'BUKA');
  appendLog(req.user.nama,'UPDATE_BIDANG',req.id_bidang,'Pagu/status akses diubah');
  return {success:true,message:'Bidang berhasil diupdate'};
}
function savePerencanaan(req){
  const user = req.user || {}; if(isAdminUser(user)) return {success:false,message:'Admin tidak boleh input perencanaan. Admin hanya menyetujui/menolak.'};
  const data = req.data || {}; const idBidang = user.id_bidang;
  const volume = num(data.volume), harga = num(data.harga_satuan), jumlah = volume * harga;
  const kategori = upper(data.kategori) === 'NON PENGADAAN' ? 'NON PENGADAAN' : 'PENGADAAN';
  const jenis_non_pengadaan = kategori === 'NON PENGADAAN' ? (norm(data.jenis_non_pengadaan) || 'Honorarium') : '';
  const metode_pemilihan = kategori === 'NON PENGADAAN' ? '' : metodePemilihanByNilai(jumlah);
  const waktu_pemilihan = normalizeWaktuPemilihan(data.waktu_pemilihan);
  if(!norm(data.nama_kegiatan) || !volume || !harga) return {success:false,message:'Nama kegiatan, volume, dan harga wajib diisi'};
  if(!waktu_pemilihan) return {success:false,message:'Waktu pemilihan wajib diisi'};
  const bidang = findById(getRows(SH_BIDANG),'id_bidang',idBidang);
  if(!bidang) return {success:false,message:'Bidang tidak ditemukan'};
  if(upper(bidang.status_akses) !== 'BUKA') return {success:false,message:'Akses perencanaan bidang sedang ditutup admin. Menu pencairan tetap bisa digunakan.'};
  const cekPagu = validasiPaguBidang(idBidang, jumlah, '');
  if(!cekPagu.ok) return {success:false,message:cekPagu.message, detail:cekPagu};
  const id = 'KEG-' + new Date().getTime();
  appendByHeader(SH_RENCANA,{id_kegiatan:id,id_bidang:idBidang,nama_kegiatan:data.nama_kegiatan || '',rincian_kebutuhan:data.rincian_kebutuhan || '',keterangan:data.keterangan || '',volume,satuan:data.satuan || '',harga_satuan:harga,jumlah,metode_pemilihan,waktu_pemilihan,status_perencanaan:'DIAJUKAN',tanggal_input:new Date(),input_by:user.nama || '',alasan_penolakan:'',alasan_perubahan:'',perubahan_ke:0,riwayat_perubahan:'',status_pencairan:kategori === 'NON PENGADAAN' ? 'MENUNGGU PERSETUJUAN PBJ' : 'BELUM ADA DOKUMEN',kategori:kategori,jenis_non_pengadaan:jenis_non_pengadaan});
  appendLog(user.nama,'AJUKAN_PERENCANAAN',id,data.nama_kegiatan || '');
  return {success:true,message:'Perencanaan berhasil diajukan',id_kegiatan:id};
}
function updatePerencanaan(req){
  const user = req.user || {}; if(isAdminUser(user)) return {success:false,message:'Admin tidak boleh mengedit perencanaan bidang.'};
  const data = req.data || {}; const r = findById(getRows(SH_RENCANA),'id_kegiatan',data.id_kegiatan);
  if(!r) return {success:false,message:'Perencanaan tidak ditemukan'};
  if(norm(r.id_bidang) !== norm(user.id_bidang)) return {success:false,message:'Tidak boleh edit data bidang lain'};
  if(!bidangIsOpen(user.id_bidang)) return {success:false,message:'Akses perencanaan bidang sedang ditutup admin. Menu pencairan tetap bisa digunakan.'};
  if(isKegiatanPencairanFinal(data.id_kegiatan)) return {success:false,message:'Kegiatan sudah selesai sampai validasi pencairan, perencanaan terkunci.'};
  const st = upper(r.status_perencanaan); const mode = norm(data.mode) || 'normal';
  if(mode === 'change'){
    if(st !== 'DISETUJUI') return {success:false,message:'Ajukan perubahan hanya untuk data yang sudah DISETUJUI'};
    if(!norm(data.alasan_perubahan)) return {success:false,message:'Alasan perubahan wajib diisi'};
  } else {
    if(st !== 'DIAJUKAN' && st !== 'DITOLAK') return {success:false,message:'Data hanya bisa diedit saat status DIAJUKAN atau DITOLAK'};
  }
  const volume = num(data.volume), harga = num(data.harga_satuan), jumlah = volume * harga;
  const kategori = upper(data.kategori || r.kategori) === 'NON PENGADAAN' ? 'NON PENGADAAN' : 'PENGADAAN';
  const jenis_non_pengadaan = kategori === 'NON PENGADAAN' ? (norm(data.jenis_non_pengadaan || r.jenis_non_pengadaan) || 'Honorarium') : '';
  const metode_pemilihan = kategori === 'NON PENGADAAN' ? '' : metodePemilihanByNilai(jumlah);
  const waktu_pemilihan = normalizeWaktuPemilihan(data.waktu_pemilihan);
  if(!norm(data.nama_kegiatan) || !volume || !harga) return {success:false,message:'Nama kegiatan, volume, dan harga wajib diisi'};
  if(!waktu_pemilihan) return {success:false,message:'Waktu pemilihan wajib diisi'};
  if(norm(data.mode) === 'change' && hasDokumenPencairanForKegiatanV63(data.id_kegiatan)) return {success:false,message:'Perubahan perencanaan tidak dapat diajukan karena kegiatan sudah memiliki dokumen pencairan'};
  const cekPagu = validasiPaguBidang(user.id_bidang, jumlah, data.id_kegiatan);
  if(!cekPagu.ok) return {success:false,message:cekPagu.message, detail:cekPagu};
  // SIMPROV v73: simpan snapshot sebelum/sesudah agar Verifikator dapat melihat perubahan dengan jelas.
  const snapshotSebelumV73 = {
    nama_kegiatan: norm(r.nama_kegiatan),
    keterangan: norm(r.keterangan || r.rincian_kebutuhan),
    volume: num(r.volume),
    satuan: norm(r.satuan),
    harga_satuan: num(r.harga_satuan),
    jumlah: num(r.jumlah || (num(r.volume) * num(r.harga_satuan))),
    metode_pemilihan: norm(r.metode_pemilihan) || metodePemilihanByNilai(num(r.jumlah || (num(r.volume) * num(r.harga_satuan)))),
    waktu_pemilihan: norm(r.waktu_pemilihan)
  };
  const snapshotSesudahV73 = {
    nama_kegiatan: norm(data.nama_kegiatan),
    keterangan: norm(data.keterangan || data.rincian_kebutuhan),
    volume: volume,
    satuan: norm(data.satuan),
    harga_satuan: harga,
    jumlah: jumlah,
    metode_pemilihan: metode_pemilihan,
    waktu_pemilihan: waktu_pemilihan
  };
  const compareMarkerV73 = '__COMPARE_V73__' + Utilities.base64EncodeWebSafe(JSON.stringify({
    waktu: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    mode: mode,
    oleh: user.nama || '',
    sebelum: snapshotSebelumV73,
    sesudah: snapshotSesudahV73
  }));

  setCell(SH_RENCANA,r._row,'nama_kegiatan',data.nama_kegiatan || '');
  setCell(SH_RENCANA,r._row,'rincian_kebutuhan',data.rincian_kebutuhan || '');
  setCell(SH_RENCANA,r._row,'keterangan',data.keterangan || '');
  setCell(SH_RENCANA,r._row,'volume',volume);
  setCell(SH_RENCANA,r._row,'satuan',data.satuan || '');
  setCell(SH_RENCANA,r._row,'harga_satuan',harga);
  setCell(SH_RENCANA,r._row,'jumlah',jumlah);
  setCell(SH_RENCANA,r._row,'metode_pemilihan',metode_pemilihan);
  setCell(SH_RENCANA,r._row,'kategori',kategori);
  setCell(SH_RENCANA,r._row,'jenis_non_pengadaan',jenis_non_pengadaan);
  setCell(SH_RENCANA,r._row,'waktu_pemilihan',waktu_pemilihan);
  if(mode === 'change'){
    const ke = num(r.perubahan_ke) + 1;
    const label = 'Perubahan Ke-' + ke;
    const oldHist = norm(r.riwayat_perubahan);
    const entry = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') + ' - ' + label + ': ' + norm(data.alasan_perubahan);
    setCell(SH_RENCANA,r._row,'status_perencanaan','PERUBAHAN_DIAJUKAN');
    setCell(SH_RENCANA,r._row,'alasan_perubahan',data.alasan_perubahan || '');
    setCell(SH_RENCANA,r._row,'perubahan_ke',ke);
    const histChangeV73 = (oldHist ? oldHist + '\n' + entry : entry) + '\n' + compareMarkerV73;
    setCell(SH_RENCANA,r._row,'riwayat_perubahan',histChangeV73);
    appendLog(user.nama,'AJUKAN_PERUBAHAN',data.id_kegiatan,label + ' - ' + data.alasan_perubahan);
    return {success:true,message:label + ' berhasil diajukan ke admin'};
  }
  const oldHistNormal = norm(r.riwayat_perubahan);
  const wasDitolak = st === 'DITOLAK';
  const entryNormal = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') + ' - ' + (wasDitolak ? 'Perbaikan diajukan ulang' : 'Data diedit dan diajukan ulang') + ' oleh ' + (user.nama || '');
  setCell(SH_RENCANA,r._row,'status_perencanaan','DIAJUKAN');
  setCell(SH_RENCANA,r._row,'alasan_penolakan', wasDitolak ? norm(r.alasan_penolakan) : '');
  const histNormalV73 = (oldHistNormal ? oldHistNormal + '\n' + entryNormal : entryNormal) + '\n' + compareMarkerV73;
  setCell(SH_RENCANA,r._row,'riwayat_perubahan',histNormalV73);
  appendLog(user.nama,'EDIT_PERENCANAAN',data.id_kegiatan, wasDitolak ? 'Perbaikan diajukan ulang' : 'Diajukan ulang');
  return {success:true,message: wasDitolak ? 'Perbaikan perencanaan berhasil diajukan ulang ke Verifikator' : 'Perencanaan berhasil diajukan ulang'};
}
function deletePerencanaan(req){
  const user = req.user || {}; if(isAdminUser(user)) return {success:false,message:'Admin tidak boleh hapus perencanaan bidang'};
  const r = findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!r) return {success:false,message:'Perencanaan tidak ditemukan'};
  if(norm(r.id_bidang) !== norm(user.id_bidang)) return {success:false,message:'Tidak boleh hapus data bidang lain'};
  if(!bidangIsOpen(user.id_bidang)) return {success:false,message:'Akses perencanaan bidang sedang ditutup admin. Menu pencairan tetap bisa digunakan.'};
  if(isKegiatanPencairanFinal(req.id_kegiatan)) return {success:false,message:'Kegiatan sudah selesai sampai validasi pencairan, perencanaan terkunci.'};
  const st = upper(r.status_perencanaan);
  if(st !== 'DIAJUKAN' && st !== 'DITOLAK') return {success:false,message:'Hanya status DIAJUKAN atau DITOLAK yang bisa dihapus'};
  sh(SH_RENCANA).deleteRow(r._row);
  appendLog(user.nama,'HAPUS_PERENCANAAN',req.id_kegiatan,'');
  return {success:true,message:'Perencanaan berhasil dihapus'};
}
function setStatusPerencanaan(req, status){
  if(!isPBJUser_(req.user)) throw new Error('Akses Verifikator diperlukan');
  const r = findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!r) return {success:false,message:'Perencanaan tidak ditemukan'};
  if(!canAccessBidang_(req.user,r.id_bidang)) return {success:false,message:'Bidang ini tidak ditugaskan kepada akun Anda'};
  if(status === 'DITOLAK' && !norm(req.catatan)) return {success:false,message:'Catatan perbaikan wajib diisi'};

  const now = new Date();
  const petugas = req.user && req.user.nama ? req.user.nama : 'Verifikator';
  const oldHist = norm(r.riwayat_perubahan);
  const waktu = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  const entry = status === 'DISETUJUI'
    ? (waktu + ' - Verifikator: Perencanaan disetujui oleh ' + petugas)
    : (waktu + ' - Verifikator: Perlu perbaikan - ' + (req.catatan || ''));

  setCell(SH_RENCANA,r._row,'status_perencanaan',status);
  if(status === 'DITOLAK') setCell(SH_RENCANA,r._row,'alasan_penolakan',req.catatan || '');
  if(status === 'DISETUJUI') setCell(SH_RENCANA,r._row,'alasan_penolakan','');
  setCell(SH_RENCANA,r._row,'riwayat_perubahan',oldHist ? oldHist + '\n' + entry : entry);

  appendLog(req.user.nama,status === 'DISETUJUI' ? 'SETUJUI_PERENCANAAN' : 'TOLAK_PERENCANAAN',req.id_kegiatan,req.catatan || '');
  return {success:true,message: status === 'DISETUJUI' ? 'Perencanaan disetujui' : 'Perencanaan dikembalikan untuk perbaikan'};
}

function docTypeKeyServer(v){
  return String(v || '').toUpperCase().replace(/\s+/g,' ').trim();
}

function uploadDokumen(req){
  const user = req.user || {}; if(isAdminUser(user)) return {success:false,message:'Admin tidak boleh upload dokumen bidang'};
  const rencana = findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(norm(rencana.id_bidang) !== norm(user.id_bidang)) return {success:false,message:'Kegiatan bukan milik bidang ini'};
  if(upper(rencana.status_perencanaan) !== 'DISETUJUI') return {success:false,message:'Dokumen hanya bisa diupload untuk kegiatan yang sudah DISETUJUI'};
  const dokumenBoleh = dokumenKetentuanByNilai(rencana.jumlah || (num(rencana.volume) * num(rencana.harga_satuan)));
  if(dokumenBoleh.indexOf(norm(req.jenis_dokumen)) < 0) return {success:false,message:'Jenis dokumen tidak sesuai ketentuan metode pemilihan. Dokumen yang diperbolehkan: ' + dokumenBoleh.join(', ')};
  const existingSameType = getRows(SH_DOKUMEN).some(x => norm(x.id_kegiatan) === norm(req.id_kegiatan) && docTypeKeyServer(x.jenis_dokumen) === docTypeKeyServer(req.jenis_dokumen));
  if(existingSameType) return {success:false,message:'Jenis dokumen ini sudah pernah diupload untuk kegiatan tersebut. Jika statusnya PERBAIKAN, gunakan Upload Ulang pada file tersebut.'};
  if(!req.file_base64) return {success:false,message:'File kosong'};
  const root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bidangFolder = getOrCreateFolder(root, norm(user.id_bidang) + ' - ' + (user.nama_bidang || user.nama || 'Bidang'));
  const kegFolder = getOrCreateFolder(bidangFolder, norm(req.id_kegiatan) + ' - ' + safeName(rencana.nama_kegiatan));
  const blob = Utilities.newBlob(Utilities.base64Decode(req.file_base64), req.mime_type || 'application/octet-stream', req.file_name || 'dokumen');
  const file = kegFolder.createFile(blob);

  // Beberapa akun/Drive organisasi menolak perubahan sharing publik.
  // File tetap berhasil masuk Drive, jadi jangan bikin upload gagal hanya karena setSharing ditolak.
  let shareNote = '';
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {
    shareNote = ' Catatan: file berhasil diupload, tapi izin publik/link tidak bisa diubah otomatis oleh Drive.';
    appendLog(user.nama,'INFO_SHARING_DOKUMEN',req.id_kegiatan,shareErr.message || shareErr);
  }

  const idDok = 'DOK-' + new Date().getTime() + '-' + Math.floor(Math.random()*1000);
  appendByHeader(SH_DOKUMEN,{id_dokumen:idDok,id_kegiatan:req.id_kegiatan,id_bidang:user.id_bidang,jenis_dokumen:req.jenis_dokumen || 'Dokumen Lainnya',nama_file:req.file_name || '',url_file:file.getUrl(),tanggal_upload:new Date(),upload_by:user.nama || '',status_verifikasi:'MENUNGGU VERIFIKASI DOKUMEN',catatan_admin:'',tanggal_verifikasi:'',verifikasi_by:'',tanggal_revisi:'',revisi_by:'',riwayat_dokumen:'Upload awal: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMMM yyyy HH:mm') + ' oleh ' + (user.nama || '')});
  upsertPencairan(req.id_kegiatan,user.id_bidang,'MENUNGGU VERIFIKASI DOKUMEN','');
  const pr = findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(pr) setCell(SH_RENCANA, pr._row, 'status_pencairan', 'MENUNGGU VERIFIKASI DOKUMEN');
  appendLog(user.nama,'UPLOAD_DOKUMEN',req.id_kegiatan,req.jenis_dokumen || '');
  return {success:true,message:'Dokumen berhasil diupload.' + shareNote,url:file.getUrl(),dokumen:{id_dokumen:idDok,id_kegiatan:req.id_kegiatan,id_bidang:user.id_bidang,jenis_dokumen:req.jenis_dokumen||'Dokumen Lainnya',nama_file:req.file_name||'',url_file:file.getUrl(),tanggal_upload:new Date(),upload_by:user.nama||'',status_verifikasi:'MENUNGGU VERIFIKASI DOKUMEN',catatan_admin:'',tanggal_verifikasi:'',verifikasi_by:'',tanggal_revisi:'',revisi_by:'',riwayat_dokumen:'Upload awal'}};
}
function safeName(s){ return norm(s).replace(/[\\/:*?"<>|]/g,'-').slice(0,80) || 'Kegiatan'; }
function getOrCreateFolder(parent, name){ const it = parent.getFoldersByName(name); if(it.hasNext()) return it.next(); return parent.createFolder(name); }
function upsertPencairan(idKegiatan,idBidang,status,catatan){
  const r = findById(getRows(SH_PENCAIRAN),'id_kegiatan',idKegiatan);
  if(r){ setCell(SH_PENCAIRAN,r._row,'status_pencairan',status); setCell(SH_PENCAIRAN,r._row,'catatan_admin',catatan || ''); setCell(SH_PENCAIRAN,r._row,'tanggal_update',new Date()); }
  else appendByHeader(SH_PENCAIRAN,{id_pencairan:'CAIR-' + new Date().getTime(), id_kegiatan:idKegiatan, id_bidang:idBidang, status_pencairan:status, catatan_admin:catatan || '', tanggal_update:new Date()});
}
function verifyDokumen(req){
  requireAdmin(req.user);
  const d = findById(getRows(SH_DOKUMEN),'id_dokumen',req.id_dokumen);
  if(!d) return {success:false,message:'Dokumen tidak ditemukan'};
  const status = upper(req.status_verifikasi) || 'MENUNGGU';
  const catatan = norm(req.catatan_admin || req.catatan_Verifikator || req.catatan || '');
  if(status === 'PERBAIKAN' && !catatan) return {success:false,message:'Alasan perbaikan wajib diisi'};
  if(status !== 'VALID' && status !== 'PERBAIKAN') return {success:false,message:'Status dokumen hanya boleh VALID atau PERBAIKAN'};
  const now = new Date();
  const verifikatorName = req.user && req.user.nama ? req.user.nama : 'Verifikator';
  const oldRiwayat = norm(d.riwayat_dokumen);
  const verifyNote = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMMM yyyy HH:mm') + ' - ' + verifikatorName + ': ' + (status === 'VALID' ? 'Dokumen valid' : ('Perbaikan diminta' + (catatan ? ' - ' + catatan : '')));
  setCell(SH_DOKUMEN,d._row,'status_verifikasi',status);
  setCell(SH_DOKUMEN,d._row,'catatan_admin',catatan);
  setCell(SH_DOKUMEN,d._row,'tanggal_verifikasi',now);
  setCell(SH_DOKUMEN,d._row,'verifikasi_by',verifikatorName);
  setCell(SH_DOKUMEN,d._row,'riwayat_dokumen',oldRiwayat ? (oldRiwayat + '\n' + verifyNote) : verifyNote);

  const docs = getRows(SH_DOKUMEN).filter(x => norm(x.id_kegiatan) === norm(d.id_kegiatan));
  let statusCair = 'MENUNGGU VERIFIKASI';
  if(docs.length && docs.every(x => upper(x.status_verifikasi) === 'VALID')) statusCair = 'DOKUMEN LENGKAP';
  if(docs.some(x => upper(x.status_verifikasi) === 'PERBAIKAN')) statusCair = 'PERBAIKAN';
  upsertPencairan(d.id_kegiatan,d.id_bidang,statusCair,catatan);
  const pr = findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(pr) setCell(SH_RENCANA, pr._row, 'status_pencairan', statusCair);
  appendLog(req.user.nama,'VERIFIKASI_DOKUMEN',req.id_dokumen,status + (catatan ? ' - ' + catatan : ''));
  return {success:true,message: status === 'VALID' ? 'Dokumen dinyatakan valid' : 'Dokumen diminta perbaikan'};
}

function revisiDokumen(req){
  const user = req.user || {}; if(isAdminUser(user)) return {success:false,message:'Admin tidak boleh upload revisi dokumen bidang'};
  const d = findById(getRows(SH_DOKUMEN),'id_dokumen',req.id_dokumen);
  if(!d) return {success:false,message:'Dokumen tidak ditemukan'};
  if(norm(d.id_bidang) !== norm(user.id_bidang)) return {success:false,message:'Dokumen bukan milik bidang ini'};
  const st = upper(d.status_verifikasi);
  if(st !== 'PERBAIKAN' && st !== 'DITOLAK') return {success:false,message:'Upload ulang hanya untuk file dokumen yang berstatus PERBAIKAN'};
  const rencana = findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!req.file_base64) return {success:false,message:'File upload ulang kosong'};

  const root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bidangFolder = getOrCreateFolder(root, norm(user.id_bidang) + ' - ' + (user.nama_bidang || user.nama || 'Bidang'));
  const kegFolder = getOrCreateFolder(bidangFolder, norm(d.id_kegiatan) + ' - ' + safeName(rencana.nama_kegiatan));
  const blob = Utilities.newBlob(Utilities.base64Decode(req.file_base64), req.mime_type || 'application/octet-stream', req.file_name || 'dokumen');
  const file = kegFolder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) { appendLog(user.nama,'INFO_SHARING_REVISI',d.id_kegiatan,e.message || e); }

  // Usahakan file lama dibuang ke trash agar baris dokumen benar-benar menimpa file lama. Kalau gagal, abaikan.
  try { const oldId = extractDriveFileId(d.url_file); if(oldId) DriveApp.getFileById(oldId).setTrashed(true); } catch(e) { appendLog(user.nama,'INFO_TRASH_FILE_LAMA',d.id_kegiatan,e.message || e); }

  const now = new Date();
  const oldRiwayat = norm(d.riwayat_dokumen);
  const revisiNote = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMMM yyyy HH:mm') + ' - ' + (user.nama || 'User') + ': Upload ulang file ' + (req.file_name || '');
  setCell(SH_DOKUMEN,d._row,'nama_file',req.file_name || '');
  setCell(SH_DOKUMEN,d._row,'url_file',file.getUrl());
  setCell(SH_DOKUMEN,d._row,'tanggal_revisi',now);
  setCell(SH_DOKUMEN,d._row,'revisi_by',user.nama || '');
  setCell(SH_DOKUMEN,d._row,'status_verifikasi','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN');
  setCell(SH_DOKUMEN,d._row,'catatan_admin','');
  setCell(SH_DOKUMEN,d._row,'riwayat_dokumen',oldRiwayat ? (oldRiwayat + '\n' + revisiNote) : revisiNote);
  upsertPencairan(d.id_kegiatan,d.id_bidang,'MENUNGGU VERIFIKASI','');
  const pr = findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(pr) setCell(SH_RENCANA, pr._row, 'status_pencairan', 'MENUNGGU VERIFIKASI DOKUMEN');
  appendLog(user.nama,'REVISI_DOKUMEN',req.id_dokumen,req.file_name || '');
  return {success:true,message:'Upload ulang file berhasil dan menunggu verifikasi Verifikator',url:file.getUrl(),dokumen:{id_dokumen:d.id_dokumen,id_kegiatan:d.id_kegiatan,id_bidang:d.id_bidang,jenis_dokumen:d.jenis_dokumen,nama_file:req.file_name||'',url_file:file.getUrl(),tanggal_upload:d.tanggal_upload,upload_by:d.upload_by,status_verifikasi:'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN',catatan_admin:'',tanggal_verifikasi:d.tanggal_verifikasi,verifikasi_by:d.verifikasi_by,tanggal_revisi:now,revisi_by:user.nama||'',riwayat_dokumen:oldRiwayat?(oldRiwayat+'\n'+revisiNote):revisiNote}};
}
function extractDriveFileId(url){
  const s = norm(url); if(!s) return '';
  let m = s.match(/\/d\/([a-zA-Z0-9_-]+)/); if(m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/); if(m) return m[1];
  return '';
}
function updateStatusPencairan(req){
  requireAdmin(req.user);
  const rencana = findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  upsertPencairan(req.id_kegiatan,rencana.id_bidang,upper(req.status_pencairan),req.catatan_admin || '');
  setCell(SH_RENCANA, rencana._row, 'status_pencairan', upper(req.status_pencairan));
  appendLog(req.user.nama,'UPDATE_STATUS_PENCAIRAN',req.id_kegiatan,upper(req.status_pencairan));
  return {success:true,message:'Status pencairan berhasil diupdate'};
}


/* SIMPROV v63 backend guard */
function hasDokumenPencairanForKegiatanV63(idKegiatan){
  const rows = getRows(SH_DOKUMEN);
  return rows.some(r => norm(r.id_kegiatan) === norm(idKegiatan));
}

/* =========================
   SIMPROV v64 patch - Verifikator + Finalisasi PBJ
   Tambahan aman tanpa mengubah struktur sheet existing.
   ========================= */
function requireKeuangan(user){ if(!(userRole_(user)==='VERIFIKATOR' || isAdminUser(user))) throw new Error('Akses Verifikator atau Admin diperlukan'); }
function isDocValidKeuangan_(d){ const s = upper(d && d.status_verifikasi); return s === 'VALID' || s === 'VALID DOKUMEN' || s === 'VALID KEUANGAN'; }
function isDocPerbaikanKeuangan_(d){ const s = upper(d && d.status_verifikasi); return s === 'PERBAIKAN' || s === 'PERBAIKAN DOKUMEN' || s === 'PERBAIKAN KEUANGAN' || s === 'DITOLAK'; }
function isDocMenungguKeuangan_(d){
  const s = upper(d && d.status_verifikasi);
  return s === '' || s === 'MENUNGGU' || s === 'MENUNGGU VERIFIKASI' || s === 'MENUNGGU VERIFIKASI DOKUMEN' || s === 'MENUNGGU VERIFIKASI KEUANGAN' || s === 'MENUNGGU VERIFIKASI PERBAIKAN' || s === 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN' || s === 'MENUNGGU VERIFIKASI PERBAIKAN KEUANGAN';
}
function normalizeJenisDokumenKeyV71_(v){
  return upper(norm(v)).replace(/\s*\/\s*/g,' / ').replace(/\s+/g,' ');
}
function progressDokumenWajibV71_(idKegiatan){
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan);
  if(!rencana) return {required:[],requiredCount:0,uploaded:0,valid:0,missing:[],allUploaded:false,allValid:false};
  const nilai=rencana.jumlah || (num(rencana.volume)*num(rencana.harga_satuan));
  const required=dokumenKetentuanByNilai(nilai);
  const docs=getRows(SH_DOKUMEN).filter(x=>norm(x.id_kegiatan)===norm(idKegiatan));
  const map={}; docs.forEach(d=>map[normalizeJenisDokumenKeyV71_(d.jenis_dokumen)]=d);
  const matched=required.map(j=>({jenis:j,doc:map[normalizeJenisDokumenKeyV71_(j)]||null}));
  const uploaded=matched.filter(x=>x.doc).length;
  const valid=matched.filter(x=>x.doc && isDocValidKeuangan_(x.doc)).length;
  const missing=matched.filter(x=>!x.doc).map(x=>x.jenis);
  return {required:required,requiredCount:required.length,uploaded:uploaded,valid:valid,missing:missing,allUploaded:uploaded===required.length,allValid:required.length>0 && valid===required.length};
}
function computeStatusPencairanKeuangan_(idKegiatan){
  const docs = getRows(SH_DOKUMEN).filter(x => norm(x.id_kegiatan) === norm(idKegiatan));
  const prog = progressDokumenWajibV71_(idKegiatan);
  if(!docs.length) return 'MENUNGGU DOKUMEN PENCAIRAN';
  if(docs.some(isDocPerbaikanKeuangan_)) return 'PERBAIKAN DOKUMEN';
  if(!prog.allUploaded) return 'DOKUMEN BELUM LENGKAP';
  if(prog.allValid) return 'MENUNGGU FINALISASI';
  if(docs.some(d => upper(d.status_verifikasi) === 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN' || upper(d.status_verifikasi) === 'MENUNGGU VERIFIKASI PERBAIKAN')) return 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
  return 'MENUNGGU VERIFIKASI DOKUMEN';
}
function verifyDokumen(req){
  requireKeuangan(req.user);
  const d = findById(getRows(SH_DOKUMEN),'id_dokumen',req.id_dokumen);
  if(!d) return {success:false,message:'Dokumen tidak ditemukan'};
  if(!canAccessBidang_(req.user,d.id_bidang)) return {success:false,message:'Bidang ini tidak ditugaskan kepada akun Anda'};
  if(!isDocMenungguKeuangan_(d)) return {success:false,message:isDocValidKeuangan_(d) ? 'Dokumen sudah valid oleh Verifikator' : 'Dokumen masih menunggu upload perbaikan dari bidang'};
  const statusReq = upper(req.status_verifikasi) || 'MENUNGGU VERIFIKASI DOKUMEN';
  const catatan = norm(req.catatan_admin || req.catatan_keuangan || req.catatan_Verifikator || req.catatan || '');
  if(statusReq === 'PERBAIKAN' && !catatan) return {success:false,message:'Alasan perbaikan wajib diisi'};
  if(statusReq !== 'VALID' && statusReq !== 'PERBAIKAN') return {success:false,message:'Status dokumen hanya boleh VALID atau PERBAIKAN'};
  const status = statusReq === 'VALID' ? 'VALID DOKUMEN' : 'PERBAIKAN DOKUMEN';
  const now = new Date();
  const verifikatorName = req.user && req.user.nama ? req.user.nama : 'Verifikator';
  const verifikatorTahap = 'Verifikator';
  const oldRiwayat = norm(d.riwayat_dokumen);
  const verifyNote = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMMM yyyy HH:mm') + ' - ' + verifikatorName + ' (' + verifikatorTahap + '): ' + (statusReq === 'VALID' ? 'Dokumen valid' : ('Perbaikan diminta' + (catatan ? ' - ' + catatan : '')));
  setCell(SH_DOKUMEN,d._row,'status_verifikasi',status);
  setCell(SH_DOKUMEN,d._row,'catatan_admin',catatan);
  setCell(SH_DOKUMEN,d._row,'tanggal_verifikasi',now);
  setCell(SH_DOKUMEN,d._row,'verifikasi_by',verifikatorName);
  setCell(SH_DOKUMEN,d._row,'riwayat_dokumen',oldRiwayat ? (oldRiwayat + '\n' + verifyNote) : verifyNote);

  const statusCair = computeStatusPencairanKeuangan_(d.id_kegiatan);
  upsertPencairan(d.id_kegiatan,d.id_bidang,statusCair,catatan);
  const pr = findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(pr) setCell(SH_RENCANA, pr._row, 'status_pencairan', statusCair);
  appendLog(req.user.nama,'VERIFIKASI_DOKUMEN',req.id_dokumen,status + (catatan ? ' - ' + catatan : ''));
  return {success:true,message: statusReq === 'VALID' ? 'Dokumen dinyatakan valid oleh Verifikator' : 'Dokumen diminta perbaikan oleh Verifikator'};
}
function revisiDokumen(req){
  const user = req.user || {}; if(isAdminUser(user) || isKeuanganUser(user)) return {success:false,message:'Verifikator tidak boleh upload revisi dokumen bidang'};
  const d = findById(getRows(SH_DOKUMEN),'id_dokumen',req.id_dokumen);
  if(!d) return {success:false,message:'Dokumen tidak ditemukan'};
  if(norm(d.id_bidang) !== norm(user.id_bidang)) return {success:false,message:'Dokumen bukan milik bidang ini'};
  if(!isDocPerbaikanKeuangan_(d)) return {success:false,message:'Upload ulang hanya untuk file dokumen yang berstatus PERBAIKAN'};
  const rencana = findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!req.file_base64) return {success:false,message:'File upload ulang kosong'};
  const root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bidangFolder = getOrCreateFolder(root, norm(user.id_bidang) + ' - ' + (user.nama_bidang || user.nama || 'Bidang'));
  const kegFolder = getOrCreateFolder(bidangFolder, norm(d.id_kegiatan) + ' - ' + safeName(rencana.nama_kegiatan));
  const blob = Utilities.newBlob(Utilities.base64Decode(req.file_base64), req.mime_type || 'application/octet-stream', req.file_name || 'dokumen');
  const file = kegFolder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) { appendLog(user.nama,'INFO_SHARING_REVISI',d.id_kegiatan,e.message || e); }
  try { const oldId = extractDriveFileId(d.url_file); if(oldId) DriveApp.getFileById(oldId).setTrashed(true); } catch(e) { appendLog(user.nama,'INFO_TRASH_FILE_LAMA',d.id_kegiatan,e.message || e); }
  const now = new Date();
  const oldRiwayat = norm(d.riwayat_dokumen);
  const revisiNote = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMMM yyyy HH:mm') + ' - ' + (user.nama || 'User') + ': Upload ulang file ' + (req.file_name || '');
  setCell(SH_DOKUMEN,d._row,'nama_file',req.file_name || '');
  setCell(SH_DOKUMEN,d._row,'url_file',file.getUrl());
  setCell(SH_DOKUMEN,d._row,'tanggal_revisi',now);
  setCell(SH_DOKUMEN,d._row,'revisi_by',user.nama || '');
  setCell(SH_DOKUMEN,d._row,'status_verifikasi','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN');
  setCell(SH_DOKUMEN,d._row,'catatan_admin','');
  setCell(SH_DOKUMEN,d._row,'riwayat_dokumen',oldRiwayat ? (oldRiwayat + '\n' + revisiNote) : revisiNote);
  upsertPencairan(d.id_kegiatan,d.id_bidang,'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN','');
  const pr = findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(pr) setCell(SH_RENCANA, pr._row, 'status_pencairan', 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN');
  appendLog(user.nama,'REVISI_DOKUMEN',req.id_dokumen,req.file_name || '');
  return {success:true,message:'Upload ulang file berhasil dan menunggu verifikasi Verifikator',url:file.getUrl(),dokumen:{id_dokumen:d.id_dokumen,id_kegiatan:d.id_kegiatan,id_bidang:d.id_bidang,jenis_dokumen:d.jenis_dokumen,nama_file:req.file_name||'',url_file:file.getUrl(),tanggal_upload:d.tanggal_upload,upload_by:d.upload_by,status_verifikasi:'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN',catatan_admin:'',tanggal_verifikasi:d.tanggal_verifikasi,verifikasi_by:d.verifikasi_by,tanggal_revisi:now,revisi_by:user.nama||'',riwayat_dokumen:oldRiwayat?(oldRiwayat+'\n'+revisiNote):revisiNote}};
}
function updateStatusPencairan(req){
  if(!isPBJUser_(req.user)) throw new Error('Akses Verifikator diperlukan');
  const rencana = findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!canAccessBidang_(req.user,rencana.id_bidang)) return {success:false,message:'Bidang ini tidak ditugaskan kepada akun Anda'};
  const status = upper(req.status_pencairan);
  if(status !== 'SELESAI') return {success:false,message:'Admin PBJ hanya dapat melakukan finalisasi status menjadi SELESAI'};
  const prog = progressDokumenWajibV71_(req.id_kegiatan);
  if(!prog.uploaded) return {success:false,message:'Belum ada dokumen pencairan'};
  if(!prog.allUploaded) return {success:false,message:'Kegiatan belum bisa diselesaikan. Dokumen wajib baru '+prog.uploaded+'/'+prog.requiredCount+'. Belum diupload: '+prog.missing.join(', ')};
  if(!prog.allValid) return {success:false,message:'Kegiatan belum bisa diselesaikan. Baru '+prog.valid+'/'+prog.requiredCount+' dokumen yang VALID DOKUMEN.'};
  upsertPencairan(req.id_kegiatan,rencana.id_bidang,'SELESAI',req.catatan_admin || 'Diselesaikan oleh Verifikator');
  setCell(SH_RENCANA, rencana._row, 'status_pencairan', 'SELESAI');
  appendLog(req.user.nama,'SELESAIKAN_KEGIATAN_PBJ',req.id_kegiatan,'SELESAI');
  return {success:true,message:'Kegiatan berhasil diselesaikan oleh Verifikator'};
}
function isKegiatanPencairanFinal(idKegiatan){
  const pr = findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan);
  return upper(pr && pr.status_pencairan) === 'SELESAI';
}
function roleNameUser(user){
  const r=userRole_(user);
  if(r==='ADMIN') return 'ADMIN';
  if(['VERIFIKATOR','VERIFIKATOR_PBJ','PBJ','VERIFIKATOR_KEUANGAN','KEUANGAN'].indexOf(r)>=0) return 'VERIFIKATOR';
  if(r==='SEKDA' || r==='AUDITOR') return r;
  return 'BIDANG';
}


/* =========================
   SIMPROV v65 - Manajemen akun Verifikator per bidang
   ========================= */
function normalizeVerifierRole_(v){
  const r=upper(v).replace(/\s+/g,'_');
  if(['VERIFIKATOR','PBJ','VERIFIKATOR_PBJ','KEUANGAN','VERIFIKATOR_KEUANGAN'].indexOf(r)>=0) return 'VERIFIKATOR';
  return '';
}
function verifierAccounts_(){
  return getRows(SH_USER).filter(u => userRole_(u)==='VERIFIKATOR');
}
function getVerifierAccounts(req){
  requireAdmin(req.user);
  return {success:true,users:verifierAccounts_(),bidangs:getRows(SH_BIDANG)};
}
function saveVerifierAccount(req){
  requireAdmin(req.user);
  const d=req.data || req;
  const nama=norm(d.nama), username=norm(d.username), password=norm(d.password);
  const role=normalizeVerifierRole_(d.role);
  const ids=Array.isArray(d.bidang_akses) ? d.bidang_akses.map(norm).filter(Boolean) : norm(d.bidang_akses).split(/[,;|\n]+/).map(norm).filter(Boolean);
  if(!nama || !username || !password || !role) return {success:false,message:'Nama, username, password, dan role wajib diisi'};
  if(!ids.length) return {success:false,message:'Pilih minimal satu bidang penugasan'};
  const users=getRows(SH_USER);
  if(users.some(u => norm(u.username).toLowerCase()===username.toLowerCase())) return {success:false,message:'Username sudah digunakan'};
  const prefix='VER';
  const id='USR-'+prefix+'-'+Utilities.formatString('%03d', users.filter(u=>userRole_(u)==='VERIFIKATOR').length+1);
  appendByHeader(SH_USER,{id_user:id,nama,username,password,id_bidang:'',status:'AKTIF',role,bidang_akses:ids.join(',')});
  appendLog(req.user.nama,'TAMBAH_AKUN_VERIFIKATOR',id,role+' | '+ids.join(','));
  return {success:true,message:'Akun verifikator berhasil dibuat',id_user:id};
}
function updateVerifierAccount(req){
  requireAdmin(req.user);
  const d=req.data || req;
  const u=findById(getRows(SH_USER),'id_user',d.id_user);
  if(!u) return {success:false,message:'Akun tidak ditemukan'};
  if(userRole_(u)!=='VERIFIKATOR') return {success:false,message:'Akun ini bukan akun verifikator yang dapat dikelola dari menu ini'};
  const ids=Array.isArray(d.bidang_akses) ? d.bidang_akses.map(norm).filter(Boolean) : norm(d.bidang_akses).split(/[,;|\n]+/).map(norm).filter(Boolean);
  if(!ids.length) return {success:false,message:'Pilih minimal satu bidang penugasan'};
  const role=normalizeVerifierRole_(d.role || u.role);
  const username=norm(d.username || u.username);
  if(getRows(SH_USER).some(x => norm(x.id_user)!==norm(u.id_user) && norm(x.username).toLowerCase()===username.toLowerCase())) return {success:false,message:'Username sudah digunakan akun lain'};
  setCell(SH_USER,u._row,'nama',norm(d.nama || u.nama));
  setCell(SH_USER,u._row,'username',username);
  if(norm(d.password)) setCell(SH_USER,u._row,'password',norm(d.password));
  setCell(SH_USER,u._row,'status',upper(d.status || u.status || 'AKTIF'));
  setCell(SH_USER,u._row,'role',role);
  setCell(SH_USER,u._row,'bidang_akses',ids.join(','));
  appendLog(req.user.nama,'UPDATE_AKUN_VERIFIKATOR',u.id_user,role+' | '+ids.join(','));
  return {success:true,message:'Akun verifikator berhasil diperbarui'};
}


/* SIMPROV v77 - satu Verifikator internal + identitas pejabat */
function getSystemIdentityData_(){
  const rows=getRows(SH_CONFIG); const out={ketua_umum:'',sekretaris_umum:'',verifikator:''};
  rows.forEach(function(r){ const k=norm(r.key).toLowerCase(); if(k==='ketua_umum') out.ketua_umum=norm(r.value); if(k==='sekretaris_umum') out.sekretaris_umum=norm(r.value); if(k==='verifikator') out.verifikator=norm(r.value); });
  if(!out.verifikator){ const v=verifierAccounts_().find(function(x){return upper(x.status)==='AKTIF';}); if(v) out.verifikator=norm(v.nama); }
  return out;
}
function getSystemIdentity(req){ return {success:true,identity:getSystemIdentityData_()}; }
function saveConfigValue_(key,value,keterangan){
  const rows=getRows(SH_CONFIG); const r=rows.find(function(x){return norm(x.key).toLowerCase()===norm(key).toLowerCase();});
  if(r){ setCell(SH_CONFIG,r._row,'value',norm(value)); setCell(SH_CONFIG,r._row,'keterangan',norm(keterangan)); }
  else appendByHeader(SH_CONFIG,{key:key,value:norm(value),keterangan:norm(keterangan)});
}
function saveSystemIdentity(req){
  requireAdmin(req.user); const d=req.data||req;
  const ketua=norm(d.ketua_umum), sekum=norm(d.sekretaris_umum), ver=norm(d.verifikator);
  if(!ketua) return {success:false,message:'Nama Ketua Umum wajib diisi'};
  if(!sekum) return {success:false,message:'Nama Sekretaris Umum wajib diisi'};
  if(!ver) return {success:false,message:'Nama Verifikator wajib diisi'};
  saveConfigValue_('ketua_umum',ketua,'Nama Ketua Umum PB PORPROV');
  saveConfigValue_('sekretaris_umum',sekum,'Nama Sekretaris Umum PB PORPROV');
  saveConfigValue_('verifikator',ver,'Nama Verifikator SIMPROV');
  appendLog(req.user.nama,'UPDATE_IDENTITAS_SISTEM','KONFIGURASI','Ketua Umum: '+ketua+' | Sekretaris Umum: '+sekum+' | Verifikator: '+ver);
  return {success:true,message:'Identitas Ketua Umum, Sekretaris Umum, dan Verifikator berhasil disimpan',identity:getSystemIdentityData_()};
}


/* =========================================================
   SIMPROV v79 - MODUL NON PENGADAAN / HONORARIUM
   ========================================================= */
function filterRowsByUserBidang_(rows,user){
  if(isAdminUser(user) || userRole_(user)==='SEKDA' || userRole_(user)==='AUDITOR') return rows;
  if(userRole_(user)==='VERIFIKATOR'){
    const ids=assignedBidangIds_(user);
    return rows.filter(function(r){return ids.indexOf(norm(r.id_bidang))>=0;});
  }
  return rows.filter(function(r){return norm(r.id_bidang)===norm(user.id_bidang);});
}
function filterNonPengadaanByUser_(user){ return filterRowsByUserBidang_(getRowsOptional_(SH_NON_PENGADAAN),user); }
function filterHonorByUser_(user){ return filterRowsByUserBidang_(getRowsOptional_(SH_HONOR_PENERIMA),user); }
function filterDokumenNonByUser_(user){ return filterRowsByUserBidang_(getRowsOptional_(SH_DOKUMEN_NON_PENGADAAN),user); }

function requireNonProcAccess_(user,rencana){
  if(!rencana) throw new Error('Kegiatan tidak ditemukan');
  const role=userRole_(user);
  if(role==='ADMIN') return true;
  if(role==='VERIFIKATOR'){
    if(!canAccessBidang_(user,rencana.id_bidang)) throw new Error('Kegiatan di luar bidang penugasan');
    return true;
  }
  if(norm(user.id_bidang)!==norm(rencana.id_bidang)) throw new Error('Tidak boleh mengakses kegiatan bidang lain');
  return true;
}
function getLatestNonProc_(idKegiatan){
  const rows=getRowsOptional_(SH_NON_PENGADAAN).filter(function(r){return norm(r.id_kegiatan)===norm(idKegiatan);});
  rows.sort(function(a,b){return num(b.versi_pdf)-num(a.versi_pdf);});
  return rows[0]||null;
}
function isPlanningApproved_(status){
  const s=upper(status).replace(/_/g,' ');
  return s==='DISETUJUI' || s==='DISETUJUI PBJ' || s.indexOf('DISETUJUI')===0;
}
function pdfAscii_(value){
  return String(value==null?'':value)
    .replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"')
    .replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\x7E]/g,'?');
}
function pdfEscape_(value){ return pdfAscii_(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }
function code39Pattern_(ch){
  const map={
    '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
    'A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn','F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
    'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn','P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn','S':'nnwnnnwwn','T':'nnnnwnwwn',
    'U':'wwnnnnnnw','V':'nwwnnnnnw','W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn','Z':'nwwnwnnnn','-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','*':'nwnnwnwnn','$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn'
  };
  return map[ch]||map['-'];
}
function barcodeOpsCode39_(value,x,y,height,narrow){
  const raw='*'+String(value||'').toUpperCase().replace(/[^0-9A-Z. \-\/$+%]/g,'-')+'*';
  const n=narrow||1.05, w=n*2.5; let pos=x; const ops=['0 0 0 rg'];
  raw.split('').forEach(function(ch){
    const pattern=code39Pattern_(ch);
    for(let i=0;i<pattern.length;i++){
      const width=pattern[i]==='w'?w:n;
      if(i%2===0) ops.push(pos+' '+y+' '+width+' '+height+' re f');
      pos+=width;
    }
    pos+=n;
  });
  return {ops:ops,width:pos-x};
}
function resolveHonorVerifierPencairanV131_(rencana,bidang,identity){
  const group=ppkGroupByBidangNameV102_((bidang&&bidang.nama_bidang)||rencana.id_bidang||'');
  if(group==='KETUA HARIAN') return identity.wakil_ketua_harian||identity.verifikator||'';
  if(group==='KETUA I') return identity.wakil_ketua_i||identity.verifikator||'';
  if(group==='KETUA II') return identity.wakil_ketua_ii||identity.verifikator||'';
  if(group==='KETUA III') return identity.wakil_ketua_iii||identity.verifikator||'';
  if(group==='SEKRETARIS UMUM') return identity.wakil_sekretaris||identity.verifikator||'';
  return identity.verifikator||'';
}
function createHonorPdfBlob_(rencana, clean, totalBruto, totalPajak, totalNetto, versi, fileName, verificationCode, generatedAt){
  const pageWidth=842, pageHeight=595;
  const rowsPerPage=15;
  const chunks=[];
  for(let i=0;i<clean.length;i+=rowsPerPage) chunks.push(clean.slice(i,i+rowsPerPage));
  if(!chunks.length) chunks.push([]);
  const identity=getSystemIdentityData_();
  const generatedText=Utilities.formatDate(generatedAt||new Date(),'Asia/Jakarta','dd MMMM yyyy HH:mm:ss')+' WIB';
  const streams=chunks.map(function(rows,pageIndex){
    const ops=[];
    function txt(x,y,size,value,bold,color){
      if(color) ops.push(color+' rg'); else ops.push('0 0 0 rg');
      ops.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x+' '+y+' Td ('+pdfEscape_(value)+') Tj ET');
    }
    function line(x1,y1,x2,y2){ ops.push('0.55 0.65 0.75 RG '+x1+' '+y1+' m '+x2+' '+y2+' l S'); }
    ops.push('0.04 0.29 0.49 rg 0 545 842 50 re f');
    txt(34,566,22,'SIMPROV',true,'1 1 1');
    txt(155,568,12,'SISTEM INFORMASI MONITORING PERSIAPAN PORPROV KOTA BOGOR',true,'1 1 1');
    txt(155,553,8,'Dokumen dibuat dan tercatat melalui SIMPROV',false,'0.86 0.94 1');
    txt(260,523,15,'DAFTAR PEMBAYARAN HONORARIUM',true,'0.04 0.29 0.49');
    txt(35,501,8,'ID Kegiatan : '+norm(rencana.id_kegiatan),true);
    txt(35,487,8,'Nama Kegiatan: '+norm(rencana.nama_kegiatan),false);
    txt(35,473,8,'Bidang       : '+norm(rencana.id_bidang),false);
    txt(450,501,8,'Jenis: '+(norm(rencana.jenis_non_pengadaan)||'Honorarium'),false);
    txt(450,487,8,'Tanggal Generate: '+generatedText,false);
    txt(450,473,8,'Versi: V'+versi+' | Halaman '+(pageIndex+1)+'/'+chunks.length,false);
    const cols=[35,58,218,332,370,490,570,650,730,807];
    const headers=['No','Nama Penerima','Jabatan/Peran','Vol','Satuan','Tarif','Bruto','PPh 21','Netto'];
    const top=451,rowH=22;
    line(cols[0],top,cols[9],top); line(cols[0],top-rowH,cols[9],top-rowH);
    cols.forEach(function(x){line(x,top,x,top-rowH*(rows.length+2));});
    headers.forEach(function(h,i){txt(cols[i]+3,top-15,7,h,true);});
    rows.forEach(function(r,ri){
      const yy=top-rowH*(ri+1);
      line(cols[0],yy-rowH,cols[9],yy-rowH);
      const vals=[String(pageIndex*rowsPerPage+ri+1),r.nama_penerima,r.jabatan_peran,String(r.volume),r.satuan,formatRp(r.tarif_honor),formatRp(r.jumlah_bruto),formatRp(r.nilai_pajak),formatRp(r.jumlah_netto)];
      vals.forEach(function(v,i){
        let vv=pdfAscii_(v), size=7;
        const max=[3,27,19,5,24,14,14,14,14][i];
        if(i===4){ if(vv.length>16) size=5.5; else if(vv.length>12) size=6; }
        else if(vv.length>max) vv=vv.slice(0,max-1)+'~';
        txt(cols[i]+3,yy-15,size,vv,false);
      });
    });
    const bottom=top-rowH*(rows.length+1);
    line(cols[0],bottom-rowH,cols[9],bottom-rowH);
    if(pageIndex===chunks.length-1){
      txt(505,bottom-15,8,'TOTAL',true);
      txt(574,bottom-15,8,formatRp(totalBruto),true);
      txt(654,bottom-15,8,formatRp(totalPajak),true);
      txt(734,bottom-15,8,formatRp(totalNetto),true);
      const signY=Math.max(92,bottom-86);
      const bidangHonor=findById(getRowsOptional_(SH_BIDANG),'id_bidang',rencana.id_bidang)||{};
      const penerimaNama=rows.length===1?rows[0].nama_penerima:'Para Penerima Honor';
      txt(48,signY,8,'Pelaksana Kegiatan Pengadaan',true); txt(330,signY,8,'Verifikator',true); txt(610,signY,8,'Penerima Honor',true);
      txt(48,signY-50,7,pdfAscii_(resolveHonorPelaksanaAdminV113_(rencana,bidangHonor,identity)||'Belum ditetapkan'),false);
      txt(330,signY-50,7,pdfAscii_(resolveHonorVerifierPencairanV131_(rencana,bidangHonor,identity)||'Belum ditetapkan'),false);
      txt(610,signY-50,7,pdfAscii_(penerimaNama||'Penerima Honor'),false);
      txt(48,signY-64,6,'Pengesahan digital SIMPROV',false,'0.15 0.35 0.55');
      txt(330,signY-64,6,'Pengesahan digital SIMPROV',false,'0.15 0.35 0.55');
      txt(610,signY-64,6,'Pengesahan/penerimaan honor',false,'0.15 0.35 0.55');
      const bc=barcodeOpsCode39_(verificationCode,500,18,27,0.8); ops.push.apply(ops,bc.ops);
      txt(500,8,6,'Kode Verifikasi: '+verificationCode,false);
      txt(35,24,6,'Dokumen elektronik SIMPROV | Dibuat: '+generatedText,false,'0.25 0.35 0.45');
    }
    return ops.join('\n');
  });
  const objects=[]; objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  const pageObjNums=[], contentObjNums=[]; let next=5;
  streams.forEach(function(){pageObjNums.push(next++);contentObjNums.push(next++);});
  objects[2]='<< /Type /Pages /Kids ['+pageObjNums.map(n=>n+' 0 R').join(' ')+'] /Count '+pageObjNums.length+' >>';
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  streams.forEach(function(stream,i){
    objects[pageObjNums[i]]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageWidth+' '+pageHeight+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+contentObjNums[i]+' 0 R >>';
    objects[contentObjNums[i]]='<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream';
  });
  let pdf='%PDF-1.4\n%SIMPROV\n'; const offsets=[0];
  for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n';}
  const xref=pdf.length; pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
  for(let i=1;i<objects.length;i++) pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  return Utilities.newBlob(pdf,'application/pdf',fileName);
}
function ensureNonProcRecord_(rencana,user){
  let latest=getLatestNonProc_(rencana.id_kegiatan);
  if(latest) return latest;
  const id='NPG-'+new Date().getTime();
  appendByHeader(SH_NON_PENGADAAN,{id_non_pengadaan:id,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,jenis_non_pengadaan:rencana.jenis_non_pengadaan||'Non Pengadaan',total_bruto:0,total_pajak:0,total_netto:0,status:'MENUNGGU DOKUMEN',tanggal_input:new Date(),input_by:user.nama||'',versi_pdf:0,nama_file_pdf:'',url_pdf:'',tanggal_generate:'',generate_by:''});
  return getLatestNonProc_(rencana.id_kegiatan);
}
function generateHonorPdf(req){
  const user=req.user||{}, data=req.data||{};
  if(isAdminUser(user) || userRole_(user)==='VERIFIKATOR') return {success:false,message:'Pembuatan dokumen honorarium hanya dapat dilakukan oleh User Bidang'};
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',data.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(!isPlanningApproved_(rencana.status_perencanaan)) return {success:false,message:'Dokumen hanya dapat dibuat setelah perencanaan DISETUJUI PBJ'};
  if(publicCategory_(rencana)!=='NON PENGADAAN') return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  if(upper(rencana.jenis_non_pengadaan).indexOf('HONOR')<0) return {success:false,message:'Pembuatan dokumen otomatis hanya tersedia untuk Honorarium'};
  const penerima=Array.isArray(data.penerima)?data.penerima:[];
  if(!penerima.length) return {success:false,message:'Minimal satu penerima honor wajib diisi'};
  let totalBruto=0,totalPajak=0,totalNetto=0;
  const clean=penerima.map(function(p,i){
    const volume=num(p.volume), tarif=num(rencana.harga_satuan)||num(p.tarif_honor), bruto=volume*tarif;
    const nik=norm(p.nik_npwp).replace(/\D/g,'');
    const kategori=upper(p.kategori_pajak||'NON ASN');
    let tarifPajak=0;
    if(kategori==='INPUT MANUAL') tarifPajak=num(p.tarif_pajak);
    else if(kategori==='ASN I-II') tarifPajak=0;
    else if(kategori==='ASN III') tarifPajak=5;
    else if(kategori==='ASN IV/PEJABAT') tarifPajak=15;
    else tarifPajak=2.5;
    if(tarifPajak<0 || tarifPajak>100) throw new Error('Tarif pajak penerima ke-'+(i+1)+' harus antara 0 sampai 100 persen');
    const jenis=kategori==='INPUT MANUAL'?'PPh 21 MANUAL':'PPh 21 OTOMATIS';
    const pajak=Math.round(bruto*tarifPajak/100);
    if(!norm(p.nama_penerima)||!volume||!tarif) throw new Error('Nama dan volume penerima ke-'+(i+1)+' wajib diisi serta Nilai Honor harus tersedia dari Perencanaan');
    if(!/^\d{16}$/.test(nik)) throw new Error('NIK penerima ke-'+(i+1)+' wajib 16 digit angka');
    if(pajak<0||pajak>bruto) throw new Error('Nilai pajak penerima ke-'+(i+1)+' tidak valid');
    const netto=bruto-pajak; totalBruto+=bruto; totalPajak+=pajak; totalNetto+=netto;
    return {nama_penerima:norm(p.nama_penerima),nik_npwp:nik,kategori_pajak:kategori,jabatan_peran:norm(p.jabatan_peran),volume:volume,satuan:norm(p.satuan)||'Orang/Kegiatan',tarif_honor:tarif,jenis_pajak:jenis,tarif_pajak:tarifPajak,nilai_pajak:pajak,jumlah_bruto:bruto,jumlah_netto:netto};
  });
  // Volume digunakan sebagai pengali per penerima. Batas akhir dikendalikan oleh total bruto terhadap Nilai Perencanaan.
  if(totalBruto>num(rencana.jumlah)) return {success:false,message:'Total bruto honor tidak boleh melebihi Nilai Perencanaan'};
  const uploadedDocs=getRowsOptional_(SH_DOKUMEN_NON_PENGADAAN).filter(function(d){return norm(d.id_kegiatan)===norm(rencana.id_kegiatan) && norm(d.url_file);});
  const adaPerbaikan=uploadedDocs.some(function(d){
    const st=upper(d.status_verifikasi);
    return st==='PERBAIKAN DOKUMEN' || st==='PERBAIKAN' || st==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
  });
  if(uploadedDocs.length && !adaPerbaikan) return {success:false,message:'Dokumen honorarium tidak dapat dibuat ulang karena dokumen kegiatan sudah diupload dan sedang diperiksa.'};
  const latest=ensureNonProcRecord_(rencana,user); const hasPdf=latest&&norm(latest.url_pdf);
  const versi=(latest?num(latest.versi_pdf):0)+1;
  const idNon=hasPdf?('NPG-'+new Date().getTime()):latest.id_non_pengadaan;
  const root=DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bidangFolder=getOrCreateFolder(root,norm(rencana.id_bidang)+' - '+safeName(rencana.id_bidang));
  const npFolder=getOrCreateFolder(bidangFolder,'NON PENGADAAN');
  const kegFolder=getOrCreateFolder(npFolder,norm(rencana.id_kegiatan)+' - '+safeName(rencana.nama_kegiatan));
  const fileName='HONOR_'+safeName(rencana.nama_kegiatan)+'_'+safeName(rencana.id_bidang)+'_V'+versi+'.pdf';
  const generatedAt=new Date(); const verificationCode=('SIM-'+norm(rencana.id_kegiatan)+'-'+generatedAt.getTime()).replace(/[^0-9A-Z-]/gi,'').toUpperCase();
  const pdfFile=kegFolder.createFile(createHonorPdfBlob_(rencana,clean,totalBruto,totalPajak,totalNetto,versi,fileName,verificationCode,generatedAt));
  try{pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  if(latest&&!hasPdf){
    [['jenis_non_pengadaan',rencana.jenis_non_pengadaan||'Honorarium'],['total_bruto',totalBruto],['total_pajak',totalPajak],['total_netto',totalNetto],['status','DOKUMEN BERHASIL DIBUAT'],['versi_pdf',versi],['nama_file_pdf',fileName],['url_pdf',pdfFile.getUrl()],['tanggal_generate',generatedAt],['generate_by',user.nama||'']].forEach(function(x){setCell(SH_NON_PENGADAAN,latest._row,x[0],x[1]);});
  }else{
    appendByHeader(SH_NON_PENGADAAN,{id_non_pengadaan:idNon,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,jenis_non_pengadaan:rencana.jenis_non_pengadaan||'Honorarium',total_bruto:totalBruto,total_pajak:totalPajak,total_netto:totalNetto,status:'DOKUMEN BERHASIL DIBUAT',tanggal_input:new Date(),input_by:user.nama||'',versi_pdf:versi,nama_file_pdf:fileName,url_pdf:pdfFile.getUrl(),tanggal_generate:generatedAt,generate_by:user.nama||''});
  }
  clean.forEach(function(p,i){appendByHeader(SH_HONOR_PENERIMA,Object.assign({id_penerima:'HNR-'+new Date().getTime()+'-'+i,id_non_pengadaan:idNon,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,versi_pdf:versi,tanggal_input:new Date(),input_by:user.nama||''},p));});
  setCell(SH_RENCANA,rencana._row,'status_pencairan','DOKUMEN HONOR DIBUAT');
  appendLog(user.nama,'BUAT_DOKUMEN_HONOR',rencana.id_kegiatan,fileName);
  return {success:true,message:'Dokumen honorarium berhasil dibuat',url_pdf:pdfFile.getUrl(),versi_pdf:versi};
}

function uploadDokumenNonPengadaan(req){
  const user=req.user||{};
  const allowedJenis=['Tanda Terima','Bukti Potong Pajak'];
  const jenisDokumen=norm(req.jenis_dokumen);
  if(allowedJenis.indexOf(jenisDokumen)<0) return {success:false,message:'Dokumen Non Pengadaan hanya Tanda Terima dan Bukti Potong Pajak'};
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(!req.file_base64) return {success:false,message:'File kosong'};
  const latest=ensureNonProcRecord_(rencana,user);
  const root=DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bidangFolder=getOrCreateFolder(root,norm(rencana.id_bidang)+' - '+safeName(rencana.id_bidang));
  const npFolder=getOrCreateFolder(bidangFolder,'NON PENGADAAN');
  const kegFolder=getOrCreateFolder(npFolder,norm(rencana.id_kegiatan)+' - '+safeName(rencana.nama_kegiatan));
  const blob=Utilities.newBlob(Utilities.base64Decode(req.file_base64),req.mime_type||'application/octet-stream',req.file_name||'dokumen');
  const file=kegFolder.createFile(blob);
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  const nowUpload=new Date();
  const idDokNon='DNP-'+nowUpload.getTime()+'-'+Math.floor(Math.random()*1000);
  const docData={id_dokumen_non:idDokNon,id_non_pengadaan:latest.id_non_pengadaan,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,jenis_dokumen:jenisDokumen,nama_file:req.file_name||'',url_file:file.getUrl(),tanggal_upload:nowUpload,upload_by:user.nama||'',status_verifikasi:'MENUNGGU VERIFIKASI DOKUMEN',catatan_verifikator:'',tanggal_verifikasi:'',verifikasi_by:'',riwayat_dokumen:'Upload awal oleh '+(user.nama||'')};
  appendByHeader(SH_DOKUMEN_NON_PENGADAAN,docData);
  appendLog(user.nama,'UPLOAD_DOKUMEN_NON_PENGADAAN',rencana.id_kegiatan,jenisDokumen);
  return {success:true,message:'Dokumen Non Pengadaan berhasil diupload',url:file.getUrl(),dokumen:docData};
}
function verifyDokumenNonPengadaan(req){
  const user=req.user||{};
  if(!(isAdminUser(user)||userRole_(user)==='VERIFIKATOR')) return {success:false,message:'Hanya Admin/Verifikator yang dapat memeriksa dokumen'};
  const d=findById(getRows(SH_DOKUMEN_NON_PENGADAAN),'id_dokumen_non',req.id_dokumen_non);
  if(!d) return {success:false,message:'Dokumen tidak ditemukan'};
  if(!canAccessBidang_(user,d.id_bidang)) return {success:false,message:'Dokumen di luar bidang penugasan'};
  const st=upper(req.status_verifikasi);
  if(['VALID DOKUMEN','PERBAIKAN DOKUMEN'].indexOf(st)<0) return {success:false,message:'Status tidak valid'};
  const note=norm(req.catatan_verifikator);
  if(st==='PERBAIKAN DOKUMEN'&&!note) return {success:false,message:'Catatan perbaikan wajib diisi'};
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'status_verifikasi',st);
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'catatan_verifikator',note);
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'tanggal_verifikasi',new Date());
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'verifikasi_by',user.nama||'');
  appendLog(user.nama,'VERIFIKASI_DOKUMEN_NON_PENGADAAN',d.id_dokumen_non,st);
  return {success:true,message:'Status dokumen Non Pengadaan diperbarui'};
}


/* =========================================================
   SIMPROV v90 - Revisi dokumen Non Pengadaan
   ========================================================= */
function revisiDokumenNonPengadaan(req){
  const user=req.user||{};
  const d=findById(getRows(SH_DOKUMEN_NON_PENGADAAN),'id_dokumen_non',req.id_dokumen_non);
  if(!d) return {success:false,message:'Dokumen tidak ditemukan'};
  if(norm(d.id_bidang)!==norm(user.id_bidang)) return {success:false,message:'Dokumen bukan milik bidang ini'};
  if(upper(d.status_verifikasi)!=='PERBAIKAN DOKUMEN') return {success:false,message:'Upload ulang hanya untuk dokumen berstatus PERBAIKAN DOKUMEN'};
  if(!req.file_base64) return {success:false,message:'File perbaikan belum dipilih'};
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  const root=DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const bidangFolder=getOrCreateFolder(root,norm(d.id_bidang)+' - '+safeName(user.nama_bidang||user.nama||'Bidang'));
  const npFolder=getOrCreateFolder(bidangFolder,'NON PENGADAAN');
  const kegFolder=getOrCreateFolder(npFolder,norm(d.id_kegiatan)+' - '+safeName(rencana.nama_kegiatan));
  const blob=Utilities.newBlob(Utilities.base64Decode(req.file_base64),req.mime_type||'application/octet-stream',req.file_name||'dokumen-perbaikan');
  const file=kegFolder.createFile(blob);
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  const now=new Date();
  const oldHistory=norm(d.riwayat_dokumen);
  const line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Upload perbaikan oleh '+(user.nama||'User Bidang')+' ('+(req.file_name||'file')+')';
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'nama_file',req.file_name||'');
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'url_file',file.getUrl());
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'tanggal_upload',now);
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'upload_by',user.nama||'');
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'status_verifikasi','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN');
  setCell(SH_DOKUMEN_NON_PENGADAAN,d._row,'riwayat_dokumen',oldHistory?(oldHistory+'\n'+line):line);
  appendLog(user.nama,'REVISI_DOKUMEN_NON_PENGADAAN',d.id_dokumen_non,req.file_name||'');
  return {success:true,message:'Dokumen perbaikan berhasil diupload',url:file.getUrl(),dokumen:{id_dokumen_non:d.id_dokumen_non,id_non_pengadaan:d.id_non_pengadaan,id_kegiatan:d.id_kegiatan,id_bidang:d.id_bidang,jenis_dokumen:d.jenis_dokumen,nama_file:req.file_name||'',url_file:file.getUrl(),tanggal_upload:now,upload_by:user.nama||'',status_verifikasi:'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN',catatan_verifikator:d.catatan_verifikator||'',tanggal_verifikasi:d.tanggal_verifikasi||'',verifikasi_by:d.verifikasi_by||'',riwayat_dokumen:oldHistory?(oldHistory+'\n'+line):line}};
}

/* =========================================================
   SIMPROV v96 - Alur SK Pengadaan, Penyedia, Realisasi,
   Pelaksana per Bidang, dan Template Dokumen
   Baseline: v93
   ========================================================= */
const SH_PENYEDIA_V96 = 'PENYEDIA';
const SH_PROSES_V96 = 'PROSES_PENGADAAN';
const SH_DOK_GENERATE_V96 = 'DOKUMEN_GENERATE_PENGADAAN';
REQUIRED_HEADERS.PENYEDIA = ['id_penyedia','id_bidang','nama_penyedia','bentuk_usaha','nik_npwp','alamat','telepon','email','nama_pimpinan','jabatan_pimpinan','nomor_rekening','nama_bank','atas_nama_rekening','status','tanggal_input','input_by'];
REQUIRED_HEADERS.PROSES_PENGADAAN = ['id_proses','id_kegiatan','id_bidang','jalur_proses','id_penyedia','nama_penyedia_snapshot','survey_penyedia_1','harga_survey_1','survey_penyedia_2','harga_survey_2','spesifikasi_teknis','volume_proses','satuan_proses','nilai_hps','nilai_penawaran','nilai_negosiasi','nilai_kontrak','nilai_realisasi','nomor_penawaran','tanggal_penawaran','nomor_ba_penetapan','tanggal_ba_penetapan','nomor_spk_kontrak','tanggal_spk_kontrak','tanggal_mulai','tanggal_selesai','jenis_kontrak','nomor_invoice','tanggal_invoice','status_proses','catatan','tanggal_input','input_by','tanggal_update','update_by'];
REQUIRED_HEADERS.DOKUMEN_GENERATE_PENGADAAN = ['id_generate','id_kegiatan','id_bidang','jenis_template','versi','nama_file','url_file','tanggal_generate','generate_by'];
['pelaksana_pengadaan','jabatan_pelaksana','pejabat_komitmen','jabatan_pejabat_komitmen'].forEach(function(h){ if(REQUIRED_HEADERS.BIDANG.indexOf(h)<0) REQUIRED_HEADERS.BIDANG.push(h); });
['jalur_proses'].forEach(function(h){ if(REQUIRED_HEADERS.PERENCANAAN.indexOf(h)<0) REQUIRED_HEADERS.PERENCANAAN.push(h); });

function getProcessV96_(idKegiatan){
  return getRowsOptional_(SH_PROSES_V96).filter(function(r){return norm(r.id_kegiatan)===norm(idKegiatan);}).sort(function(a,b){return num(b._row)-num(a._row);})[0]||null;
}
function canEditProcessV96_(user,idBidang){
  if(isAdminUser(user)) return true;
  const role=userRole_(user);
  if(role==='VERIFIKATOR') return false;
  return norm(user.id_bidang)===norm(idBidang);
}
function defaultRouteV96_(r){
  if(publicCategory_(r)==='NON PENGADAAN') return 'NON PENGADAAN';
  const n=num(r.jumlah)||num(r.volume)*num(r.harga_satuan);
  if(n<=500000000) return 'BELANJA LANGSUNG';
  if(n<=1000000000) return 'PENGADAAN LANGSUNG';
  return 'TENDER';
}
function savePelaksanaBidangV96(req){
  const user=req.user||{}, d=req.data||{};
  if(!isAdminUser(user)) return {success:false,message:'Hanya Admin yang dapat mengatur Pelaksana Kegiatan dan Pejabat Penanda Tangan Komitmen'};
  const b=findById(getRows(SH_BIDANG),'id_bidang',d.id_bidang); if(!b) return {success:false,message:'Bidang tidak ditemukan'};
  setCell(SH_BIDANG,b._row,'pelaksana_pengadaan',norm(d.pelaksana_pengadaan));
  setCell(SH_BIDANG,b._row,'jabatan_pelaksana',norm(d.jabatan_pelaksana));
  setCell(SH_BIDANG,b._row,'pejabat_komitmen',norm(d.pejabat_komitmen));
  setCell(SH_BIDANG,b._row,'jabatan_pejabat_komitmen',norm(d.jabatan_pejabat_komitmen));
  appendLog(user.nama,'ATUR_PELAKSANA_BIDANG',b.id_bidang,(d.pelaksana_pengadaan||'')+' | '+(d.pejabat_komitmen||''));
  return {success:true,message:'Pelaksana Kegiatan dan Pejabat Penanda Tangan Komitmen berhasil disimpan'};
}
function savePenyediaV96(req){
  const user=req.user||{}, d=req.data||{};
  if(!canAccessBidang_(user,d.id_bidang)) return {success:false,message:'Bidang di luar hak akses'};
  if(!norm(d.nama_penyedia)) return {success:false,message:'Nama penyedia wajib diisi'};
  const id='PYD-'+Utilities.formatDate(new Date(),'Asia/Jakarta','yyyyMMddHHmmss')+'-'+Math.floor(Math.random()*900+100);
  appendByHeader(SH_PENYEDIA_V96,{id_penyedia:id,id_bidang:d.id_bidang,nama_penyedia:d.nama_penyedia,bentuk_usaha:d.bentuk_usaha||'Perorangan',nik_npwp:d.nik_npwp||'',alamat:d.alamat||'',telepon:d.telepon||'',email:d.email||'',nama_pimpinan:d.nama_pimpinan||'',jabatan_pimpinan:d.jabatan_pimpinan||'Direktur',nomor_rekening:d.nomor_rekening||'',nama_bank:d.nama_bank||'',atas_nama_rekening:d.atas_nama_rekening||'',status:'AKTIF',tanggal_input:new Date(),input_by:user.nama||''});
  appendLog(user.nama,'TAMBAH_PENYEDIA',id,d.nama_penyedia);
  return {success:true,message:'Penyedia berhasil ditambahkan',id_penyedia:id};
}
function saveProsesPengadaanV96(req){
  const user=req.user||{}, d=req.data||{};
  const r=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan); if(!r) return {success:false,message:'Perencanaan tidak ditemukan'};
  if(!canAccessBidang_(user,r.id_bidang)) return {success:false,message:'Kegiatan di luar hak akses'};
  if(!canEditProcessV96_(user,r.id_bidang)) return {success:false,message:'Verifikator hanya melakukan pemeriksaan dan tidak dapat mengubah proses pengadaan'};
  if(!isPlanningApproved_(r.status_perencanaan)) return {success:false,message:'Perencanaan belum disetujui'};
  if(publicCategory_(r)==='NON PENGADAAN') return {success:false,message:'Kegiatan Non Pengadaan diproses pada Pencatatan Non Pengadaan'};
  const jalur=upper(d.jalur_proses||defaultRouteV96_(r));
  if(['BELANJA LANGSUNG','PENGADAAN LANGSUNG','TENDER','SWAKELOLA'].indexOf(jalur)<0) return {success:false,message:'Jalur proses tidak valid'};
  const nRencana=num(r.jumlah)||num(r.volume)*num(r.harga_satuan);
  if(jalur==='BELANJA LANGSUNG' && nRencana>500000000) return {success:false,message:'Belanja Langsung hanya sampai dengan Rp500.000.000'};
  if(jalur==='PENGADAAN LANGSUNG' && nRencana<=500000000) return {success:false,message:'Pengadaan Langsung dimulai dari Rp500.000.001'};
  const p=d.id_penyedia?findById(getRowsOptional_(SH_PENYEDIA_V96),'id_penyedia',d.id_penyedia):null;
  const existing=getProcessV96_(r.id_kegiatan), now=new Date();
  const payload={id_kegiatan:r.id_kegiatan,id_bidang:r.id_bidang,jalur_proses:jalur,id_penyedia:p?p.id_penyedia:'',nama_penyedia_snapshot:p?p.nama_penyedia:(d.nama_penyedia_snapshot||''),survey_penyedia_1:d.survey_penyedia_1||'',harga_survey_1:num(d.harga_survey_1),survey_penyedia_2:d.survey_penyedia_2||'',harga_survey_2:num(d.harga_survey_2),spesifikasi_teknis:d.spesifikasi_teknis||'',volume_proses:num(d.volume_proses)||num(r.volume),satuan_proses:d.satuan_proses||r.satuan,nilai_hps:num(d.nilai_hps),nilai_penawaran:num(d.nilai_penawaran),nilai_negosiasi:num(d.nilai_negosiasi),nilai_kontrak:num(d.nilai_kontrak)||num(d.nilai_negosiasi)||num(d.nilai_penawaran),nilai_realisasi:num(d.nilai_realisasi),nomor_penawaran:d.nomor_penawaran||'',tanggal_penawaran:d.tanggal_penawaran||'',nomor_ba_penetapan:d.nomor_ba_penetapan||'',tanggal_ba_penetapan:d.tanggal_ba_penetapan||'',nomor_spk_kontrak:d.nomor_spk_kontrak||'',tanggal_spk_kontrak:d.tanggal_spk_kontrak||'',tanggal_mulai:d.tanggal_mulai||'',tanggal_selesai:d.tanggal_selesai||'',jenis_kontrak:d.jenis_kontrak||'Lump Sum',nomor_invoice:d.nomor_invoice||'',tanggal_invoice:d.tanggal_invoice||'',status_proses:d.status_proses||'DRAFT',catatan:d.catatan||'',tanggal_update:now,update_by:user.nama||''};
  if(payload.nilai_negosiasi && payload.nilai_penawaran && payload.nilai_negosiasi>payload.nilai_penawaran) return {success:false,message:'Nilai negosiasi tidak boleh melebihi nilai penawaran'};
  if(payload.nilai_kontrak && payload.nilai_hps && payload.nilai_kontrak>payload.nilai_hps) return {success:false,message:'Nilai kontrak tidak boleh melebihi HPS'};
  if(payload.nilai_realisasi && payload.nilai_kontrak && payload.nilai_realisasi>payload.nilai_kontrak) return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai kontrak'};
  if(existing){ Object.keys(payload).forEach(function(k){setCell(SH_PROSES_V96,existing._row,k,payload[k]);}); }
  else { payload.id_proses='PRC-'+new Date().getTime(); payload.tanggal_input=now; payload.input_by=user.nama||''; appendByHeader(SH_PROSES_V96,payload); }
  setCell(SH_RENCANA,r._row,'jalur_proses',jalur);
  if(payload.nilai_realisasi>0){
    const rr=getRowsOptional_(SH_REALISASI).filter(function(x){return norm(x.id_kegiatan)===norm(r.id_kegiatan);})[0];
    const realPayload={id_kegiatan:r.id_kegiatan,id_bidang:r.id_bidang,kategori:'PENGADAAN',metode:jalur,nilai_perencanaan:nRencana,nilai_realisasi:payload.nilai_realisasi,tanggal_realisasi:d.tanggal_realisasi||new Date(),nomor_bukti:d.nomor_invoice||d.nomor_spk_kontrak||'',keterangan:'Realisasi dari menu Penyedia & Realisasi',input_by:user.nama||'',tanggal_input:now,status:'FINAL',riwayat_perubahan:'Disimpan dari proses pengadaan'};
    if(rr){Object.keys(realPayload).forEach(function(k){setCell(SH_REALISASI,rr._row,k,realPayload[k]);});}
    else {realPayload.id_realisasi='RLS-'+new Date().getTime();appendByHeader(SH_REALISASI,realPayload);}
  }
  appendLog(user.nama,'SIMPAN_PROSES_PENGADAAN',r.id_kegiatan,jalur+' | Nego '+formatRp(payload.nilai_negosiasi));
  return {success:true,message:'Proses penyedia dan realisasi berhasil disimpan'};
}
function wrapPdfTextV96_(s,max){
  s=pdfAscii_(s); const out=[]; while(s.length>max){let i=s.lastIndexOf(' ',max); if(i<10)i=max; out.push(s.slice(0,i));s=s.slice(i).trim();} if(s)out.push(s); return out;
}
function createTemplatePdfV96_(title,meta,sections,fileName){
  const W=595,H=842,ops=[];
  function txt(x,y,size,v,bold,color){ops.push((color||'0 0 0')+' rg');ops.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x+' '+y+' Td ('+pdfEscape_(v)+') Tj ET');}
  function line(x1,y1,x2,y2){ops.push('0.55 0.65 0.75 RG '+x1+' '+y1+' m '+x2+' '+y2+' l S');}
  ops.push('0.04 0.29 0.49 rg 0 792 595 50 re f'); txt(28,815,20,'SIMPROV',true,'1 1 1'); txt(132,817,10,'SISTEM INFORMASI MONITORING PERSIAPAN PORPROV KOTA BOGOR',true,'1 1 1'); txt(132,802,7,'Dokumen dibuat dan tercatat melalui SIMPROV',false,'0.86 0.94 1');
  txt(50,768,14,title,true,'0.04 0.29 0.49'); let y=746;
  Object.keys(meta||{}).forEach(function(k){txt(35,y,8,k+' :',true);wrapPdfTextV96_(meta[k]||'-',75).forEach(function(t,i){txt(145,y-(i*11),8,t,false);});y-=Math.max(14,wrapPdfTextV96_(meta[k]||'-',75).length*11+3);});
  line(30,y,565,y);y-=18;
  (sections||[]).forEach(function(sec){txt(35,y,10,sec.heading||'',true,'0.04 0.29 0.49');y-=15;(sec.lines||[]).forEach(function(l){wrapPdfTextV96_(l,95).forEach(function(t){txt(45,y,8,t,false);y-=11;});y-=3;});if(sec.table){const cols=sec.table.cols||[], widths=sec.table.widths||cols.map(function(){return 500/cols.length;});let x=35;cols.forEach(function(c,i){txt(x+3,y-12,7,c,true);x+=widths[i];});line(35,y,535,y);line(35,y-18,535,y-18);y-=18;(sec.table.rows||[]).forEach(function(row){x=35;row.forEach(function(v,i){let vv=pdfAscii_(v);if(vv.length>Math.max(8,Math.floor(widths[i]/5.2)))vv=vv.slice(0,Math.max(7,Math.floor(widths[i]/5.2)-1))+'~';txt(x+3,y-12,7,vv,false);x+=widths[i];});line(35,y-18,535,y-18);y-=18;});y-=12;} y-=8;});
  txt(35,28,6,'Dibuat melalui SIMPROV pada '+Utilities.formatDate(new Date(),'Asia/Jakarta','dd MMMM yyyy HH:mm:ss')+' WIB',false,'0.25 0.35 0.45');
  const stream=ops.join('\n'),objs=[];objs[1]='<< /Type /Catalog /Pages 2 0 R >>';objs[2]='<< /Type /Pages /Kids [5 0 R] /Count 1 >>';objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';objs[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';objs[5]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>';objs[6]='<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream';let pdf='%PDF-1.4\n%SIMPROV\n',off=[0];for(let i=1;i<objs.length;i++){off[i]=pdf.length;pdf+=i+' 0 obj\n'+objs[i]+'\nendobj\n';}const xr=pdf.length;pdf+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';for(let i=1;i<objs.length;i++)pdf+=String(off[i]).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+objs.length+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF';return Utilities.newBlob(pdf,'application/pdf',fileName);
}
function generateProcurementTemplateV96(req){
  const user=req.user||{}, d=req.data||{}, type=upper(d.jenis_template);
  const r=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan); if(!r) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!canAccessBidang_(user,r.id_bidang)) return {success:false,message:'Kegiatan di luar hak akses'};
  const p=getProcessV96_(r.id_kegiatan)||{}, b=findById(getRows(SH_BIDANG),'id_bidang',r.id_bidang)||{};
  const provider=p.id_penyedia?findById(getRowsOptional_(SH_PENYEDIA_V96),'id_penyedia',p.id_penyedia):null;
  const allowed=['SURVEY HARGA','SPESIFIKASI DAN HPS','BA PEMERIKSAAN','BA SERAH TERIMA PENYEDIA','BA SERAH TERIMA KETUA UMUM','SPK']; if(allowed.indexOf(type)<0)return {success:false,message:'Jenis template tidak valid'};
  const meta={'ID Kegiatan':r.id_kegiatan,'Nama Kegiatan':r.nama_kegiatan,'Bidang':b.nama_bidang||r.id_bidang,'Pelaksana Kegiatan Pengadaan':b.pelaksana_pengadaan||'Belum diatur','Pejabat Penanda Tangan Komitmen':b.pejabat_komitmen||'Belum diatur','Penyedia':provider?provider.nama_penyedia:(p.nama_penyedia_snapshot||'Belum ditetapkan')};
  let title='',sections=[];
  if(type==='SURVEY HARGA'){title='PENYAMPAIAN HASIL SURVEY HARGA';sections=[{heading:'Dasar dan Penyampaian',lines:['Pelaksana Kegiatan Pengadaan menyampaikan hasil survey harga minimal kepada 2 (dua) penyedia/toko yang berbeda sebagai dasar penetapan Spesifikasi Teknis dan Harga Perkiraan Sendiri (HPS).']},{heading:'Tabel Hasil Survey Harga',table:{cols:['Uraian','Spesifikasi','Toko/Penyedia A','Harga A','Toko/Penyedia B','Harga B'],widths:[90,120,90,60,90,50],rows:[[r.nama_kegiatan,p.spesifikasi_teknis||r.keterangan||'-',p.survey_penyedia_1||'-',formatRp(p.harga_survey_1),p.survey_penyedia_2||'-',formatRp(p.harga_survey_2)]]}},{heading:'Pengesahan',lines:['Pelaksana Kegiatan Pengadaan: '+(b.pelaksana_pengadaan||'-')+' / '+(b.jabatan_pelaksana||'-')]}];}
  if(type==='SPESIFIKASI DAN HPS'){title='SPESIFIKASI TEKNIS DAN HARGA PERKIRAAN SENDIRI (HPS)';sections=[{heading:'Rincian',table:{cols:['Uraian','Spesifikasi Barang/Pekerjaan','Volume','Satuan','Harga Satuan','Jumlah'],widths:[80,170,45,65,70,70],rows:[[r.nama_kegiatan,p.spesifikasi_teknis||r.keterangan||'-',String(p.volume_proses||r.volume),p.satuan_proses||r.satuan,formatRp((p.nilai_hps||r.jumlah)/(p.volume_proses||r.volume||1)),formatRp(p.nilai_hps||r.jumlah)]]}},{heading:'Catatan',lines:['Harga sudah termasuk pajak.','Ditetapkan oleh Pejabat Penanda Tangan Komitmen: '+(b.pejabat_komitmen||'-')+' / '+(b.jabatan_pejabat_komitmen||'-'),'Penyedia: '+(provider?provider.nama_penyedia:'-')+', Alamat: '+(provider?provider.alamat:'-')+', Rekening: '+(provider?provider.nama_bank+' '+provider.nomor_rekening+' a.n. '+provider.atas_nama_rekening:'-')]}];}
  if(type==='BA PEMERIKSAAN'){title='BERITA ACARA HASIL PEMERIKSAAN BARANG/PEKERJAAN';sections=[{heading:'Para Pihak',lines:['PIHAK KESATU: '+(b.pejabat_komitmen||'-')+', '+(b.jabatan_pejabat_komitmen||'-')+'.','PIHAK KEDUA: '+(provider?provider.nama_pimpinan:'-')+', '+(provider?provider.jabatan_pimpinan||'Direktur':'Direktur')+' '+(provider?provider.nama_penyedia:'-')+'.']},{heading:'Pernyataan',lines:['PIHAK KESATU telah melakukan pemeriksaan hasil pekerjaan berdasarkan Nota/Invoice/Faktur Nomor '+(p.nomor_invoice||'-')+' tanggal '+(p.tanggal_invoice||'-')+'.','Hasil pekerjaan dinyatakan sesuai volume dan spesifikasi serta diterima.']},{heading:'Rincian Pemeriksaan',table:{cols:['Produk/Pekerjaan','Kuantitas','Satuan','Harga Satuan','Total Harga'],widths:[190,65,75,85,85],rows:[[r.nama_kegiatan,String(p.volume_proses||r.volume),p.satuan_proses||r.satuan,formatRp((p.nilai_realisasi||p.nilai_kontrak||r.jumlah)/(p.volume_proses||r.volume||1)),formatRp(p.nilai_realisasi||p.nilai_kontrak||r.jumlah)]]}}];}
  if(type==='BA SERAH TERIMA PENYEDIA'){title='BERITA ACARA SERAH TERIMA BARANG/PEKERJAAN';sections=[{heading:'Serah Terima Penyedia kepada Pejabat Komitmen',lines:['PIHAK KEDUA/Penyedia menyerahkan hasil pekerjaan '+r.nama_kegiatan+' kepada PIHAK KESATU/Pejabat Penanda Tangan Komitmen.','Dasar: Nota/Invoice/Faktur Nomor '+(p.nomor_invoice||'-')+' tanggal '+(p.tanggal_invoice||'-')+'.','Penyedia: '+(provider?provider.nama_penyedia:'-')+'.','Pejabat Penanda Tangan Komitmen: '+(b.pejabat_komitmen||'-')+'.']}];}
  if(type==='BA SERAH TERIMA KETUA UMUM'){title='BERITA ACARA SERAH TERIMA BARANG/PEKERJAAN';sections=[{heading:'Serah Terima kepada Ketua Umum KONI Kota Bogor',lines:['PIHAK KEDUA/Pejabat Penanda Tangan Komitmen menyerahkan hasil pekerjaan '+r.nama_kegiatan+' kepada PIHAK KESATU/Ketua Umum KONI Kota Bogor.','Ketua Umum: Dedy Sumarna.','Pejabat Penanda Tangan Komitmen: '+(b.pejabat_komitmen||'-')+'.']}];}
  if(type==='SPK'){title='SURAT PERINTAH KERJA (SPK)';sections=[{heading:'Data SPK',lines:['Satuan Kerja/Bidang: '+(b.nama_bidang||r.id_bidang),'Nomor dan Tanggal SPK: '+(p.nomor_spk_kontrak||'-')+' / '+(p.tanggal_spk_kontrak||'-'),'Nama PPK/Pejabat Komitmen: '+(b.pejabat_komitmen||'-'),'Nama Penyedia: '+(provider?provider.nama_penyedia:'-'),'Paket Pengadaan: '+r.nama_kegiatan,'Nilai Kontrak termasuk Pajak: '+formatRp(p.nilai_kontrak||p.nilai_negosiasi||0),'Jenis Kontrak: '+(p.jenis_kontrak||'Lump Sum'),'Waktu Pelaksanaan: '+(p.tanggal_mulai||'-')+' s.d. '+(p.tanggal_selesai||'-')]},{heading:'Lingkup dan Spesifikasi Pekerjaan',lines:[p.spesifikasi_teknis||r.keterangan||r.nama_kegiatan]},{heading:'Ketentuan Utama',lines:['Harga SPK telah memperhitungkan keuntungan, pajak, overhead, dan biaya lain yang sah.','Penyedia wajib menyelesaikan pekerjaan sesuai jadwal, volume, dan spesifikasi.','Denda keterlambatan sebesar 1/1000 per hari sesuai SK Pengadaan.','Serah terima dilakukan setelah pekerjaan selesai dan diperiksa oleh Pejabat Penanda Tangan Komitmen.']}];}
  const latest=getRowsOptional_(SH_DOK_GENERATE_V96).filter(function(x){return norm(x.id_kegiatan)===norm(r.id_kegiatan)&&upper(x.jenis_template)===type;}).sort(function(a,b){return num(b.versi)-num(a.versi);})[0]; const versi=num(latest?latest.versi:0)+1;
  const fileName=type.replace(/[^A-Z0-9]+/g,'_')+'_'+safeName(r.nama_kegiatan)+'_V'+versi+'.pdf'; const root=DriveApp.getFolderById(DRIVE_FOLDER_ID),bf=getOrCreateFolder(root,norm(r.id_bidang)+' - '+safeName(b.nama_bidang||r.id_bidang)),pf=getOrCreateFolder(bf,'PROSES PENGADAAN'),kf=getOrCreateFolder(pf,norm(r.id_kegiatan)+' - '+safeName(r.nama_kegiatan)),file=kf.createFile(createTemplatePdfV96_(title,meta,sections,fileName));try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  appendByHeader(SH_DOK_GENERATE_V96,{id_generate:'GEN-'+new Date().getTime(),id_kegiatan:r.id_kegiatan,id_bidang:r.id_bidang,jenis_template:type,versi:versi,nama_file:fileName,url_file:file.getUrl(),tanggal_generate:new Date(),generate_by:user.nama||''});
  appendLog(user.nama,'GENERATE_TEMPLATE_PENGADAAN',r.id_kegiatan,type+' V'+versi);
  return {success:true,message:'Template '+type+' berhasil dibuat',url_file:file.getUrl(),versi:versi};
}

const getDashboardBaseV96_=getDashboard;
getDashboard=function(req){
  const res=getDashboardBaseV96_(req); if(!res||!res.success)return res;
  const user=req.user||{};
  res.penyedia=getRowsOptional_(SH_PENYEDIA_V96).filter(function(x){return isAdminUser(user)||canAccessBidang_(user,x.id_bidang);});
  res.prosesPengadaan=getRowsOptional_(SH_PROSES_V96).filter(function(x){return isAdminUser(user)||canAccessBidang_(user,x.id_bidang);});
  res.dokumenGeneratePengadaan=getRowsOptional_(SH_DOK_GENERATE_V96).filter(function(x){return isAdminUser(user)||canAccessBidang_(user,x.id_bidang);});
  return res;
};
const routeActionBaseV96_=routeAction_;
routeAction_=function(a,req){
  if(a==='savePelaksanaBidangV96')return savePelaksanaBidangV96(req);
  if(a==='savePenyediaV96')return savePenyediaV96(req);
  if(a==='saveProsesPengadaanV96')return saveProsesPengadaanV96(req);
  if(a==='generateProcurementTemplateV96')return generateProcurementTemplateV96(req);
  return routeActionBaseV96_(a,req);
};
const doPostBaseV96_=doPost;
doPost=function(e){
  try{
    ensureAllHeadersFast(); const raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}'),a=req.action;
    if(['savePelaksanaBidangV96','savePenyediaV96','saveProsesPengadaanV96','generateProcurementTemplateV96'].indexOf(a)>=0)return withWriteLock(function(){return out(routeAction_(a,req));});
    return doPostBaseV96_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err),stack:err&&err.stack?err.stack:''});}
};


/* =========================================================
   SIMPROV v97 - Paket dan Pipeline Proses
   ========================================================= */
const SH_STANDAR_BIAYA_V97='STANDAR_BIAYA';
const SH_PAKET_PROSES_V97='PAKET_PROSES';
REQUIRED_HEADERS.STANDAR_BIAYA=['id_standar','tahun','kode_kelompok','kelompok','jenis_biaya','kategori_anggaran','jenis_pengadaan','satuan','besaran','sifat_standar','sumber_dasar','status'];
['jenis_pengadaan','cara_pelaksanaan','id_standar_biaya','nama_standar_biaya','sifat_standar','nilai_standar','sumber_standar'].forEach(function(h){if(REQUIRED_HEADERS.PERENCANAAN.indexOf(h)<0)REQUIRED_HEADERS.PERENCANAAN.push(h);});
REQUIRED_HEADERS.PAKET_PROSES=['id_paket','id_kegiatan','id_bidang','jenis_paket','nama_paket','tahap_aktif','status_paket','id_penyedia','nama_penyedia','nilai_penawaran','nilai_negosiasi','nilai_kontrak','nilai_realisasi','tanggal_realisasi','nomor_bukti','catatan','tanggal_buat','dibuat_oleh','tanggal_update','diupdate_oleh'];
const STANDAR_BIAYA_SEED_V94 = [{"id_standar":"SB-2026-0001","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Pelindung Kontingen","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":5000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0002","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Penanggung Jawab","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":5000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0003","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Ketua Kontingen","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":5000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0004","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Wakil Ketua","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":4500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0005","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Sekretaris","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":4500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0006","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Wakil Sekretaris","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":3500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0007","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Bendahara","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":4500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0008","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Wakil Bendahara","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":3500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0009","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Koordinator Wilayah","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0010","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Sub Koordinator Wilayah","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":2500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0011","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Ketua Bidang","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":2500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0012","tahun":2026,"kode_kelompok":"A","kelompok":"Insentif Khusus Pengurus Kontingen","jenis_biaya":"Anggota","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":2000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0013","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Andalan Olympiade","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":5000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0014","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Andalan Asian Games","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":4500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0015","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Andalan Sea Games","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":4000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0016","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Andalan Nasional","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":3500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0017","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Andalan PON","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0018","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Pasangan PON","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":2500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0019","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Beregu PON","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":2000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0020","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Prioritas Porprov","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":1500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0021","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Potensial Perorangan","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":1000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0022","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Atlet Potensial Beregu","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":800000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0023","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Pelatih Andalan Porprov","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0024","tahun":2026,"kode_kelompok":"B","kelompok":"Insentif Atlet dan Pelatih","jenis_biaya":"Pelatih Porprov","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Bulan","besaran":1500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0025","tahun":2026,"kode_kelompok":"C","kelompok":"Uang Saku","jenis_biaya":"Tenaga Perbantuan","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0026","tahun":2026,"kode_kelompok":"C","kelompok":"Uang Saku","jenis_biaya":"Pengurus Kontingen","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0027","tahun":2026,"kode_kelompok":"C","kelompok":"Uang Saku","jenis_biaya":"Atlet","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0028","tahun":2026,"kode_kelompok":"C","kelompok":"Uang Saku","jenis_biaya":"Pelatih","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0029","tahun":2026,"kode_kelompok":"C","kelompok":"Uang Saku","jenis_biaya":"Manajer Tim","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":5000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0030","tahun":2026,"kode_kelompok":"C","kelompok":"Uang Saku","jenis_biaya":"Official Tim","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0031","tahun":2026,"kode_kelompok":"C","kelompok":"Uang Saku","jenis_biaya":"Wasit","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0032","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Dewan Pembina","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":1250000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0033","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Ketua Umum","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":1250000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0034","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Ketua Harian","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":1150000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0035","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Wakil Ketua Harian","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":1000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0036","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Ketua I, II dan III","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":1000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0037","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Sekretaris Umum","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":1000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0038","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Bendahara Umum","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":1000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0039","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Wakil Ketua I, II dan III","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":900000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0040","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Wakil Sekretaris","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":900000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0041","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Wakil Bendahara","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":900000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0042","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Verifikator","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":900000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0043","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Kepala Bidang/Kepala Bagian","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":800000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0044","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Anggota","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":600000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0045","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Panitia Pembantu","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":300000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0046","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Tenaga IT Media Centre","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":300000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0047","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Liaison Officer","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":250000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0048","tahun":2026,"kode_kelompok":"D","kelompok":"Honorarium Game Week","jenis_biaya":"Petugas Lapangan","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0049","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Dewan Pembina","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":5000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0050","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Ketua Umum","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":5000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0051","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Ketua Harian","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":4500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0052","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Wakil Ketua Harian","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":4000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0053","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Ketua I, II dan III","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":4000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0054","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Sekretaris Umum","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":4000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0055","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Bendahara Umum","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":4000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0056","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Wakil Ketua I, II dan III","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":3500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0057","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Wakil Sekretaris","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":3500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0058","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Wakil Bendahara","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":3500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0059","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Verifikator","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":3500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0060","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Kepala Bidang/Kepala Badan","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":3000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0061","tahun":2026,"kode_kelompok":"E","kelompok":"Honorarium Masa Persiapan","jenis_biaya":"Anggota","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":2000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0062","tahun":2026,"kode_kelompok":"F","kelompok":"Honorarium Monitoring Venue","jenis_biaya":"Technical Delegate","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":900000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0063","tahun":2026,"kode_kelompok":"F","kelompok":"Honorarium Monitoring Venue","jenis_biaya":"Supervisi/Panpel Cabor","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":150000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0064","tahun":2026,"kode_kelompok":"G","kelompok":"Konsultan Hukum dan Advokasi","jenis_biaya":"Legal Opinion","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Konsultansi","satuan":"Paket","besaran":30000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0065","tahun":2026,"kode_kelompok":"G","kelompok":"Konsultan Hukum dan Advokasi","jenis_biaya":"Pendampingan Hukum","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Konsultansi","satuan":"Paket","besaran":"AT COST","sifat_standar":"AT COST","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0066","tahun":2026,"kode_kelompok":"G","kelompok":"Konsultan Hukum dan Advokasi","jenis_biaya":"Biaya Protes","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Konsultansi","satuan":"Kali","besaran":5000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0067","tahun":2026,"kode_kelompok":"H","kelompok":"Jasa Dokumentasi","jenis_biaya":"Editor","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":8000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0068","tahun":2026,"kode_kelompok":"H","kelompok":"Jasa Dokumentasi","jenis_biaya":"Photografer","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":7000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0069","tahun":2026,"kode_kelompok":"H","kelompok":"Jasa Dokumentasi","jenis_biaya":"Social Media Admin","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":7000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0070","tahun":2026,"kode_kelompok":"H","kelompok":"Jasa Dokumentasi","jenis_biaya":"Videografer","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":6500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0071","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Media Cetak Lokal Hitam/Putih","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi 1/4 Halaman","besaran":3167274,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0072","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Media Cetak Lokal Berwarna","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi 1/4 Halaman","besaran":7500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0073","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Media Cetak Regional Hitam/Putih","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi 1/4 Halaman","besaran":11517360,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0074","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Media Cetak Regional Berwarna","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi 1/4 Halaman","besaran":16354651,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0075","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Media Cetak Nasional Hitam/Putih","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi 1/4 Halaman","besaran":30521004,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0076","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Media Cetak Nasional Berwarna","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi 1/4 Halaman","besaran":57586800,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0077","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Media Online Lokal","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi/Tayang","besaran":1299900,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0078","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Media Online Regional","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi/Tayang","besaran":2961607,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0079","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Media Online Nasional","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi/Tayang","besaran":5758680,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0080","tahun":2026,"kode_kelompok":"I","kelompok":"Jasa Media dan Publikasi","jenis_biaya":"Radio Lokal","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Publikasi/Tayang","besaran":1029000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0081","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Snack","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":15000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0082","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Snack VIP","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":30000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0083","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Snack Hotel","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":49000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0084","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Nasi Box","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":30000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0085","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Nasi Box VIP","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":50000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0086","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Prasmanan","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":60000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0087","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Prasmanan VIP","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0088","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Makan Hotel","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0089","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Mini Bus Sedang","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Unit/Hari","besaran":500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0090","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Mini Bus Besar","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Unit/Hari","besaran":700000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0091","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Bus Medium","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Unit/Hari","besaran":2000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0092","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Bus Large","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Unit/Hari","besaran":3500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0093","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Transportasi Lokal","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Unit/Hari","besaran":250000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0094","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Fullboard","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":600000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0095","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Penginapan Kamar","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Kamar","besaran":600000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0096","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Pemondokan Non Hotel","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":200000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0097","tahun":2026,"kode_kelompok":"J","kelompok":"Akomodasi Transportasi dan Konsumsi","jenis_biaya":"Penginapan VIP","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Per Orang","besaran":"AT COST","sifat_standar":"AT COST","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0098","tahun":2026,"kode_kelompok":"K","kelompok":"Uang Pengganti Transport","jenis_biaya":"Technical Delegate","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0099","tahun":2026,"kode_kelompok":"K","kelompok":"Uang Pengganti Transport","jenis_biaya":"Supervisi/Panpel Cabor","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0100","tahun":2026,"kode_kelompok":"K","kelompok":"Uang Pengganti Transport","jenis_biaya":"Game Week Liaison Officer","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0101","tahun":2026,"kode_kelompok":"K","kelompok":"Uang Pengganti Transport","jenis_biaya":"Game Week Petugas Lapang","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0102","tahun":2026,"kode_kelompok":"K","kelompok":"Uang Pengganti Transport","jenis_biaya":"Game Week Panitia Pembantu","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0103","tahun":2026,"kode_kelompok":"L","kelompok":"Uang Pengganti Makan/Voucher","jenis_biaya":"Voucher VIP","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":110000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0104","tahun":2026,"kode_kelompok":"L","kelompok":"Uang Pengganti Makan/Voucher","jenis_biaya":"Voucher Reguler","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":60000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0105","tahun":2026,"kode_kelompok":"M","kelompok":"Uang Ekstra Fooding","jenis_biaya":"Ekstra Fooding Kontingen","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":80000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0106","tahun":2026,"kode_kelompok":"N","kelompok":"Dana Motivasi Medali Emas","jenis_biaya":"Perorangan","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Medali","besaran":5000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0107","tahun":2026,"kode_kelompok":"N","kelompok":"Dana Motivasi Medali Emas","jenis_biaya":"Berpasangan","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Medali","besaran":8000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0108","tahun":2026,"kode_kelompok":"N","kelompok":"Dana Motivasi Medali Emas","jenis_biaya":"Beregu 3 Orang","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Medali","besaran":12000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0109","tahun":2026,"kode_kelompok":"N","kelompok":"Dana Motivasi Medali Emas","jenis_biaya":"Beregu Lebih dari 3 Orang","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Medali","besaran":15000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0110","tahun":2026,"kode_kelompok":"O","kelompok":"Operasional Tenaga Medis","jenis_biaya":"Dokter","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":2000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0111","tahun":2026,"kode_kelompok":"O","kelompok":"Operasional Tenaga Medis","jenis_biaya":"Masseur","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":1500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0112","tahun":2026,"kode_kelompok":"P","kelompok":"Operasional CDM dan Penanggung Jawab","jenis_biaya":"Pelindung","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Paket","besaran":10000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0113","tahun":2026,"kode_kelompok":"P","kelompok":"Operasional CDM dan Penanggung Jawab","jenis_biaya":"Penanggung Jawab","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Paket","besaran":10000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0114","tahun":2026,"kode_kelompok":"P","kelompok":"Operasional CDM dan Penanggung Jawab","jenis_biaya":"Chief de Mission","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Paket","besaran":10000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0115","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Alat Tulis Kantor","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"-","besaran":"AT COST","sifat_standar":"AT COST","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0116","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Backdrop","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0117","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Baligo","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0118","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Spanduk","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0119","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Sticker","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":10000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0120","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Sticker Transportasi","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":20000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0121","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Umbul-Umbul","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0122","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"X Banner","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":150000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0123","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Buku I","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":75000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0124","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Buku II","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":50000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0125","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Buku III","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":30000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0126","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Dokumen Kesepakatan","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":20000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0127","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Boneka Maskot Rubo","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":60000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0128","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Plakat","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":250000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0129","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Fotocopy","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Lembar","besaran":200,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0130","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Lembar Monitoring","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Lembar","besaran":200,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0131","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Kontrak/Materi Meeting/Bagan Pertandingan","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":10000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0132","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Sertifikat/Piagam","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":10000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0133","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Technical Handbook Cabor","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":10000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0134","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"T-Shirt","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":125000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0135","tahun":2026,"kode_kelompok":"Q","kelompok":"ATK Barang Cetakan dan Penutup Badan","jenis_biaya":"Rompi","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Buah","besaran":175000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0136","tahun":2026,"kode_kelompok":"R","kelompok":"Pendidikan Pelatihan/Bimtek","jenis_biaya":"Honorarium Narasumber","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":1000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0137","tahun":2026,"kode_kelompok":"R","kelompok":"Pendidikan Pelatihan/Bimtek","jenis_biaya":"Pengganti Transport Narasumber","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0138","tahun":2026,"kode_kelompok":"R","kelompok":"Pendidikan Pelatihan/Bimtek","jenis_biaya":"Uang Saku Peserta","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":150000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0139","tahun":2026,"kode_kelompok":"R","kelompok":"Pendidikan Pelatihan/Bimtek","jenis_biaya":"Uang Saku Monitoring Evaluasi","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":150000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0140","tahun":2026,"kode_kelompok":"R","kelompok":"Pendidikan Pelatihan/Bimtek","jenis_biaya":"Uang Saku Pelaporan Admin","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":150000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0141","tahun":2026,"kode_kelompok":"R","kelompok":"Pendidikan Pelatihan/Bimtek","jenis_biaya":"Uang Saku Tenaga IT","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":150000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0142","tahun":2026,"kode_kelompok":"R","kelompok":"Pendidikan Pelatihan/Bimtek","jenis_biaya":"Pengganti Transport Peserta","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Kegiatan","besaran":100000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0143","tahun":2026,"kode_kelompok":"R","kelompok":"Pendidikan Pelatihan/Bimtek","jenis_biaya":"Seminar KIT","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Paket","besaran":50000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0144","tahun":2026,"kode_kelompok":"S","kelompok":"Perjalanan Dinas","jenis_biaya":"Uang Harian Jawa Barat","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":430000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0145","tahun":2026,"kode_kelompok":"S","kelompok":"Perjalanan Dinas","jenis_biaya":"Uang Representasi Pimpinan Tinggi","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":250000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0146","tahun":2026,"kode_kelompok":"S","kelompok":"Perjalanan Dinas","jenis_biaya":"Uang Representasi Wakil/Ketua","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":200000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0147","tahun":2026,"kode_kelompok":"S","kelompok":"Perjalanan Dinas","jenis_biaya":"Uang Representasi Sekretaris/Bendahara/Verifikator","kategori_anggaran":"NON PENGADAAN","jenis_pengadaan":"","satuan":"Orang/Hari","besaran":150000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0148","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"FGD Porprov 2026","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":50000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0149","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"Pembuatan Aplikasi Porprov","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":20000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0150","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"Sewa Peralatan dan Perlengkapan Kantor","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":25000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0151","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"Penutupan Porprov dan Penyerahan Bendera","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":50000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0152","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"Dekorasi Ruang Media Center","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":25000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0153","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"Alat dan Kelengkapan UPP","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":67760000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0154","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"Perlengkapan Pos Pengamanan Terpadu","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":77985000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0155","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"Kesekretariatan PB Porprov","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":25000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0156","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"Kesekretariatan Pertandingan Cabor","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":6000000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0157","tahun":2026,"kode_kelompok":"T","kelompok":"Paket Pelaksanaan Kegiatan Porprov","jenis_biaya":"Pembuatan LPJ Cabang Olahraga","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":2500000,"sifat_standar":"BATAS TERTINGGI","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0158","tahun":2026,"kode_kelompok":"U","kelompok":"Sewa Venue dan Fasilitas Pendukung","jenis_biaya":"Sewa Venue dan Kelengkapan Fasilitas Pendukung","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Jasa Lainnya","satuan":"Paket","besaran":"AT COST","sifat_standar":"AT COST","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0159","tahun":2026,"kode_kelompok":"V","kelompok":"Apparel dan Peralatan Cabor","jenis_biaya":"Apparel","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Paket","besaran":"AT COST","sifat_standar":"AT COST","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"},{"id_standar":"SB-2026-0160","tahun":2026,"kode_kelompok":"V","kelompok":"Apparel dan Peralatan Cabor","jenis_biaya":"Peralatan dan Perlengkapan Latihan/Pertandingan","kategori_anggaran":"PENGADAAN","jenis_pengadaan":"Barang","satuan":"Paket","besaran":"AT COST","sifat_standar":"AT COST","sumber_dasar":"SK 040.2/KONI.Kt.Bgr/SK/II/2026","status":"AKTIF"}];

function filterRowsByUserV94_(rows,user,hasBidang){
  if(isAdminUser(user)||isReviewerUser(user)) return rows;
  const allowed=assignedBidangIds_(user);
  if(isPBJUser_(user)||isKeuanganUser(user)) return rows.filter(r=>!hasBidang || allowed.indexOf(norm(r.id_bidang))>=0);
  return rows.filter(r=>!hasBidang || norm(r.id_bidang)===norm(user.id_bidang));
}
function metodePemilihanV94_(jumlah,jenis,cara){
  const nilai=num(jumlah), j=upper(jenis), c=upper(cara);
  if(c==='SWAKELOLA') return 'Swakelola';
  if(j==='JASA KONSULTANSI') return nilai<=250000000 ? 'Seleksi Langsung' : 'Seleksi Langsung - Surat Perjanjian';
  if(nilai<=500000000) return 'Belanja Langsung';
  if(nilai<=1000000000) return 'Pengadaan Langsung';
  return 'Pengadaan Langsung - Surat Perjanjian';
}
function setupStandarBiayaV97(req){
  requireAdmin(req.user); ensureAllHeaders();
  const existing=getRowsOptional_(SH_STANDAR_BIAYA_V97).filter(r=>norm(r.id_standar));
  if(existing.length)return {success:true,message:'Master Standar Biaya sudah tersedia',jumlah:existing.length};
  STANDAR_BIAYA_SEED_V94.forEach(r=>appendByHeader(SH_STANDAR_BIAYA_V97,r));
  appendLog(req.user.nama,'SETUP_STANDAR_BIAYA',SH_STANDAR_BIAYA_V97,STANDAR_BIAYA_SEED_V94.length+' item');
  return {success:true,message:'Master Standar Biaya berhasil dibuat',jumlah:STANDAR_BIAYA_SEED_V94.length};
}
function jenisPaketV97_(r){
  if(upper(r.kategori)==='NON PENGADAAN')return 'NON PENGADAAN';
  const cara=upper(r.cara_pelaksanaan||''); if(cara==='SWAKELOLA')return 'SWAKELOLA';
  const m=upper(r.metode_pemilihan||'');
  if(m.indexOf('BELANJA LANGSUNG')>=0)return 'BELANJA LANGSUNG';
  if(m.indexOf('TENDER')>=0)return 'TENDER';
  if(m.indexOf('SWAKELOLA')>=0)return 'SWAKELOLA';
  return 'PENGADAAN LANGSUNG';
}
function buatPaketV97(req){
  const user=req.user||{},d=req.data||{};
  const r=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan); if(!r)return {success:false,message:'Perencanaan tidak ditemukan'};
  if(!canAccessBidang_(user,r.id_bidang))return {success:false,message:'Kegiatan di luar hak akses'};
  if(upper(r.status_perencanaan).indexOf('DISETUJUI')<0)return {success:false,message:'Perencanaan belum disetujui'};
  const ex=getRowsOptional_(SH_PAKET_PROSES_V97).find(x=>norm(x.id_kegiatan)===norm(r.id_kegiatan));
  if(ex)return {success:true,message:'Paket sudah tersedia',id_paket:ex.id_paket};
  const jenis=jenisPaketV97_(r),id='PKT-'+new Date().getTime();
  appendByHeader(SH_PAKET_PROSES_V97,{id_paket:id,id_kegiatan:r.id_kegiatan,id_bidang:r.id_bidang,jenis_paket:jenis,nama_paket:r.nama_kegiatan,tahap_aktif:1,status_paket:'DRAFT',tanggal_buat:new Date(),dibuat_oleh:user.nama||'',tanggal_update:new Date(),diupdate_oleh:user.nama||''});
  appendLog(user.nama,'BUAT_PAKET',id,r.nama_kegiatan+' | '+jenis);
  return {success:true,message:'Paket berhasil dibuat',id_paket:id};
}
function saveTahapPaketV97(req){
  const user=req.user||{},d=req.data||{}; const p=findById(getRowsOptional_(SH_PAKET_PROSES_V97),'id_paket',d.id_paket);
  if(!p)return {success:false,message:'Paket tidak ditemukan'}; if(!canAccessBidang_(user,p.id_bidang))return {success:false,message:'Paket di luar hak akses'};
  const map={tahap_aktif:Math.max(1,Math.min(6,num(d.tahap_aktif)||num(p.tahap_aktif)||1)),status_paket:d.status_paket||p.status_paket||'PROSES',id_penyedia:d.id_penyedia||p.id_penyedia||'',nama_penyedia:d.nama_penyedia||p.nama_penyedia||'',nilai_penawaran:num(d.nilai_penawaran||p.nilai_penawaran),nilai_negosiasi:num(d.nilai_negosiasi||p.nilai_negosiasi),nilai_kontrak:num(d.nilai_kontrak||p.nilai_kontrak),nilai_realisasi:num(d.nilai_realisasi||p.nilai_realisasi),tanggal_realisasi:d.tanggal_realisasi||p.tanggal_realisasi||'',nomor_bukti:d.nomor_bukti||p.nomor_bukti||'',catatan:d.catatan||p.catatan||'',tanggal_update:new Date(),diupdate_oleh:user.nama||''};
  if(map.nilai_negosiasi&&map.nilai_penawaran&&map.nilai_negosiasi>map.nilai_penawaran)return {success:false,message:'Nilai negosiasi tidak boleh melebihi nilai penawaran'};
  if(map.nilai_realisasi&&map.nilai_kontrak&&map.nilai_realisasi>map.nilai_kontrak)return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai kontrak'};
  Object.keys(map).forEach(k=>setCell(SH_PAKET_PROSES_V97,p._row,k,map[k]));
  appendLog(user.nama,'UPDATE_TAHAP_PAKET',p.id_paket,'Tahap '+map.tahap_aktif+' | '+map.status_paket);
  return {success:true,message:'Tahapan paket berhasil disimpan'};
}
function savePerencanaanV97(req){
  const user=req.user||{}; if(isAdminUser(user)||isPBJUser_(user)||isKeuanganUser(user)||isReviewerUser(user))return {success:false,message:'Hanya User Bidang yang dapat mengajukan perencanaan.'};
  const d=req.data||{},volume=num(d.volume),harga=num(d.harga_satuan),jumlah=volume*harga;if(!norm(d.nama_kegiatan)||!volume||!harga)return {success:false,message:'Nama kegiatan, volume, dan harga wajib diisi.'};
  const kategori=upper(d.kategori)==='NON PENGADAAN'?'NON PENGADAAN':'PENGADAAN',standar=norm(d.id_standar_biaya)?findById(getRowsOptional_(SH_STANDAR_BIAYA_V97),'id_standar',d.id_standar_biaya):null;
  if(standar&&upper(standar.sifat_standar)==='BATAS TERTINGGI'&&num(standar.besaran)>0&&harga>num(standar.besaran))return {success:false,message:'Harga satuan melebihi Standar Biaya.'};
  let metode=''; const cara=norm(d.cara_pelaksanaan||'Penyedia'),jenis=norm(d.jenis_pengadaan||'Barang');
  if(kategori==='PENGADAAN'){ if(upper(cara)==='SWAKELOLA')metode='Swakelola'; else if(jumlah<=500000000)metode='Belanja Langsung'; else if(jumlah>1000000000)metode='Tender'; else metode='Pengadaan Langsung'; }
  const waktu=normalizeWaktuPemilihan(d.waktu_pemilihan);if(!waktu)return {success:false,message:kategori==='PENGADAAN'?'Waktu pemilihan wajib diisi.':'Waktu pelaksanaan wajib diisi.'};
  const cek=validasiPaguBidang(user.id_bidang,jumlah,'');if(!cek.ok)return {success:false,message:cek.message};const id='KEG-'+Date.now();
  appendByHeader(SH_RENCANA,{id_kegiatan:id,id_bidang:user.id_bidang,nama_kegiatan:d.nama_kegiatan,keterangan:d.keterangan||'',volume:volume,satuan:d.satuan||'',harga_satuan:harga,jumlah:jumlah,metode_pemilihan:metode,waktu_pemilihan:waktu,status_perencanaan:'DIAJUKAN',tanggal_input:new Date(),input_by:user.nama||'',status_pencairan:kategori==='NON PENGADAAN'?'MENUNGGU PERSETUJUAN PBJ':'BELUM ADA DOKUMEN',kategori:kategori,jenis_non_pengadaan:kategori==='NON PENGADAAN'?(d.jenis_non_pengadaan||standar?.kelompok||'Lainnya'):'',jenis_pengadaan:jenis,cara_pelaksanaan:cara,id_standar_biaya:standar?.id_standar||'',nama_standar_biaya:standar?.jenis_biaya||'',sifat_standar:standar?.sifat_standar||'',nilai_standar:standar?.besaran||'',sumber_standar:standar?.sumber_dasar||''});
  return {success:true,message:'Perencanaan berhasil diajukan',id_kegiatan:id,metode_pemilihan:metode};
}
const getDashboardBaseV97_=getDashboard;
getDashboard=function(req){const res=getDashboardBaseV97_(req);if(!res||!res.success)return res;const u=req.user||{};res.standarBiaya=getRowsOptional_(SH_STANDAR_BIAYA_V97).filter(x=>upper(x.status||'AKTIF')==='AKTIF');res.paketProses=getRowsOptional_(SH_PAKET_PROSES_V97).filter(x=>isAdminUser(u)||canAccessBidang_(u,x.id_bidang));return res;};
const routeActionBaseV97_=routeAction_;
routeAction_=function(a,req){if(a==='setupStandarBiayaV97')return setupStandarBiayaV97(req);if(a==='buatPaketV97')return buatPaketV97(req);if(a==='saveTahapPaketV97')return saveTahapPaketV97(req);if(a==='savePerencanaanV97')return savePerencanaanV97(req);return routeActionBaseV97_(a,req);};
const doPostBaseV97_=doPost;
doPost=function(e){try{ensureAllHeadersFast();const req=JSON.parse(e&&e.postData&&e.postData.contents?e.postData.contents:'{}'),a=req.action;if(['setupStandarBiayaV97','buatPaketV97','saveTahapPaketV97','savePerencanaanV97'].indexOf(a)>=0)return withWriteLock(()=>out(routeAction_(a,req)));return doPostBaseV97_(e);}catch(err){return out({success:false,message:err.message||String(err),stack:err.stack||''});}};

/* =========================================================
   SIMPROV v101 - Template SK dengan metadata wajib
   ========================================================= */
function generateProcurementTemplateV101(req){
  const user=req.user||{}, d=req.data||{};
  const r=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(!r) return {success:false,message:'Perencanaan tidak ditemukan'};
  if(!canAccessBidang_(user,r.id_bidang)) return {success:false,message:'Kegiatan di luar hak akses'};
  if(!norm(d.nomor_dokumen)) return {success:false,message:'Nomor dokumen wajib diisi'};
  if(!norm(d.pejabat_penandatangan)) return {success:false,message:'Pejabat yang menandatangani wajib diisi'};
  if(!norm(d.nama_penyedia)) return {success:false,message:'Nama penyedia wajib diisi'};
  let p=getProcessV96_(r.id_kegiatan);
  if(!p){
    appendByHeader(SH_PROSES_V96,{id_proses:'PRC-'+new Date().getTime(),id_kegiatan:r.id_kegiatan,id_bidang:r.id_bidang,jalur_proses:defaultRouteV96_(r),nama_penyedia_snapshot:d.nama_penyedia,nomor_spk_kontrak:d.nomor_dokumen,nilai_hps:num(d.nilai_hps)||num(r.jumlah),status_proses:'DRAFT',tanggal_input:new Date(),input_by:user.nama||'',tanggal_update:new Date(),update_by:user.nama||''});
    p=getProcessV96_(r.id_kegiatan);
  }else{
    setCell(SH_PROSES_V96,p._row,'nama_penyedia_snapshot',d.nama_penyedia);
    setCell(SH_PROSES_V96,p._row,'nomor_spk_kontrak',d.nomor_dokumen);
    if(num(d.nilai_hps)>0) setCell(SH_PROSES_V96,p._row,'nilai_hps',num(d.nilai_hps));
    setCell(SH_PROSES_V96,p._row,'catatan','Pejabat penandatangan: '+d.pejabat_penandatangan);
  }
  const b=findById(getRows(SH_BIDANG),'id_bidang',r.id_bidang);
  if(b && norm(d.pejabat_penandatangan)) setCell(SH_BIDANG,b._row,'pejabat_komitmen',d.pejabat_penandatangan);
  return generateProcurementTemplateV96({user:user,data:{id_kegiatan:r.id_kegiatan,jenis_template:d.jenis_template}});
}

const __routeActionV101=routeAction_;
routeAction_=function(a,req){
  if(a==='generateProcurementTemplateV101') return generateProcurementTemplateV101(req);
  return __routeActionV101(a,req);
};

/* =========================================================
   SIMPROV v102 - Struktur Pejabat Komitmen per Kelompok Bidang
   ========================================================= */
const getSystemIdentityDataV102Base_ = getSystemIdentityData_;
getSystemIdentityData_ = function(){
  const out = getSystemIdentityDataV102Base_();
  const rows = getRows(SH_CONFIG);
  const keys = ['ketua_harian','ketua_i','ketua_ii','ketua_iii','wakil_ketua_harian','wakil_ketua_i','wakil_ketua_ii','wakil_ketua_iii','wakil_sekretaris'];
  keys.forEach(function(key){
    const r = rows.find(function(x){ return norm(x.key).toLowerCase()===key; });
    out[key] = r ? norm(r.value) : '';
  });
  return out;
};

function ppkGroupByBidangNameV102_(nama){
  const n = norm(nama).toLowerCase();
  if(/kesekretariatan/.test(n)) return 'KETUA HARIAN';
  if(/penyiaran|pelayanan media|akomodasi|konsumsi|pengarahan massa|kesehatan/.test(n)) return 'KETUA I';
  if(/organisasi|hukum|keamanan|transportasi/.test(n)) return 'KETUA II';
  if(/pertandingan|perwasitan|sarana|prasarana pertandingan|teknologi informasi|komunikasi/.test(n)) return 'KETUA III';
  if(/kerjasama|usaha|pengadaan barang|pengadaan jasa/.test(n)) return 'SEKRETARIS UMUM';
  return '';
}
function ppkNameByGroupV102_(identity,group){
  if(group==='KETUA HARIAN') return identity.ketua_harian||'';
  if(group==='KETUA I') return identity.ketua_i||'';
  if(group==='KETUA II') return identity.ketua_ii||'';
  if(group==='KETUA III') return identity.ketua_iii||'';
  if(group==='SEKRETARIS UMUM') return identity.sekretaris_umum||'';
  return '';
}
function savePpkStructureV102(req){
  requireAdmin(req.user);
  const d=req.data||{};
  ['ketua_harian','ketua_i','ketua_ii','ketua_iii','sekretaris_umum','wakil_ketua_harian','wakil_ketua_i','wakil_ketua_ii','wakil_ketua_iii','wakil_sekretaris'].forEach(function(k){
    saveConfigValue_(k,norm(d[k]),'Nama '+k.replace(/_/g,' ').toUpperCase()+' PB PORPROV');
  });
  const identity=getSystemIdentityData_();
  getRows(SH_BIDANG).forEach(function(b){
    const group=ppkGroupByBidangNameV102_(b.nama_bidang);
    if(!group) return;
    const nama=ppkNameByGroupV102_(identity,group);
    setCell(SH_BIDANG,b._row,'pejabat_komitmen',nama);
    setCell(SH_BIDANG,b._row,'jabatan_pejabat_komitmen',group);
  });
  appendLog(req.user.nama,'UPDATE_STRUKTUR_PPK','KONFIGURASI','Ketua/Wakil Ketua dan Sekretaris/Wakil Sekretaris diperbarui');
  return {success:true,message:'Struktur Pejabat Penanda Tangan Komitmen berhasil disimpan dan diterapkan ke seluruh bidang',identity:identity};
}

const routeActionV102Base_ = routeAction_;
routeAction_ = function(a,req){
  if(a==='savePpkStructureV102') return savePpkStructureV102(req);
  return routeActionV102Base_(a,req);
};
const doPostV102Base_ = doPost;
doPost = function(e){
  try{
    const raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}';
    const req=JSON.parse(raw||'{}');
    if(req.action==='savePpkStructureV102') return withWriteLock(function(){ return out(routeAction_(req.action,req)); });
    return doPostV102Base_(e);
  }catch(err){ return out({success:false,message:err&&err.message?err.message:String(err)}); }
};

/* =========================================================
   SIMPROV v108 (backend) - Perbaikan template & tanda tangan
   1. Layout meta template: kolom nilai digeser (tidak lagi menabrak
      label panjang seperti "Pelaksana Kegiatan Pengadaan").
   2. Blok TANDA TANGAN di setiap template sesuai CONTOH_FORMAT_PBJ:
      Survey=Pelaksana; HPS=Pejabat Komitmen; BA Pemeriksaan & BAST
      Penyedia=Penyedia+Pejabat; BAST Ketua Umum=Dedy Sumarna (Ketua
      Umum KONI Kota Bogor)+Pejabat; SPK=Pejabat+Direktur Penyedia.
   3. Template HPS merinci semua baris HPS (bukan satu baris agregat)
      dan totalnya sudah dipotong pajak per baris.
   4. Jenis 'SURAT PERJANJIAN' (paket Tender) kini valid.
   5. Data pejabat/pelaksana/lingkup diambil dari input form template.
   ========================================================= */

function createTemplatePdfV108_(title,meta,sections,signers,fileName){
  const W=595,H=842,ops=[];
  function txt(x,y,size,v,bold,color){ops.push((color||'0 0 0')+' rg');ops.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+x+' '+y+' Td ('+pdfEscape_(v)+') Tj ET');}
  function line(x1,y1,x2,y2){ops.push('0.55 0.65 0.75 RG '+x1+' '+y1+' m '+x2+' '+y2+' l S');}
  ops.push('0.04 0.29 0.49 rg 0 792 595 50 re f');
  txt(28,815,20,'SIMPROV',true,'1 1 1');
  txt(132,817,10,'SISTEM INFORMASI MONITORING PERSIAPAN PORPROV KOTA BOGOR',true,'1 1 1');
  txt(132,802,7,'Dokumen dibuat dan tercatat melalui SIMPROV',false,'0.86 0.94 1');
  txt(50,768,13,pdfAscii_(title).slice(0,72),true,'0.04 0.29 0.49');
  let y=746;
  Object.keys(meta||{}).forEach(function(k){
    txt(35,y,8,k+' :',true);
    const wraps=wrapPdfTextV96_(meta[k]||'-',64);
    wraps.forEach(function(t,i){txt(200,y-(i*11),8,t,false);});
    y-=Math.max(14,wraps.length*11+3);
  });
  line(30,y,565,y);y-=18;
  (sections||[]).forEach(function(sec){
    if(y<170){y=170;} // jaga ruang tanda tangan
    txt(35,y,10,sec.heading||'',true,'0.04 0.29 0.49');y-=15;
    (sec.lines||[]).forEach(function(l){wrapPdfTextV96_(l,95).forEach(function(t){txt(45,y,8,t,false);y-=11;});y-=3;});
    if(sec.table){
      const cols=sec.table.cols||[], widths=sec.table.widths||cols.map(function(){return 500/cols.length;});
      let x=35;cols.forEach(function(c,i){txt(x+3,y-12,7,c,true);x+=widths[i];});
      line(35,y,535,y);line(35,y-18,535,y-18);y-=18;
      (sec.table.rows||[]).forEach(function(row){
        x=35;
        row.forEach(function(v,i){
          let vv=pdfAscii_(v);const maxc=Math.max(9,Math.floor(widths[i]/4.4));
          if(vv.length>maxc)vv=vv.slice(0,maxc-1)+'~';
          txt(x+3,y-12,6.6,vv,false);x+=widths[i];
        });
        line(35,y-18,535,y-18);y-=18;
      });
      y-=12;
    }
    y-=8;
  });
  if(signers&&signers.length){
    const tY=Math.min(y-6,150);
    const colW=signers.length===1?260:(signers.length===2?250:170);
    const startX=signers.length===1?300:35;
    txt(400,tY+16,8,'Bogor, '+Utilities.formatDate(new Date(),'Asia/Jakarta','dd MMMM yyyy'),false);
    signers.forEach(function(s,i){
      const x=startX+i*(signers.length===2?270:180);
      wrapPdfTextV96_(s.jabatan||'',Math.floor(colW/4.4)).forEach(function(t,li){txt(x,tY-(li*10),7.5,t,true);});
      txt(x,tY-58,8,'( '+pdfAscii_(s.nama||'.............................')+' )',true);
      line(x,tY-55,x+colW-30,tY-55);
    });
  }
  txt(35,28,6,'Dibuat melalui SIMPROV pada '+Utilities.formatDate(new Date(),'Asia/Jakarta','dd MMMM yyyy HH:mm:ss')+' WIB',false,'0.25 0.35 0.45');
  const stream=ops.join('\n'),objs=[];
  objs[1]='<< /Type /Catalog /Pages 2 0 R >>';objs[2]='<< /Type /Pages /Kids [5 0 R] /Count 1 >>';
  objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';objs[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  objs[5]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>';
  objs[6]='<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream';
  let pdf='%PDF-1.4\n%SIMPROV\n',off=[0];
  for(let i=1;i<objs.length;i++){off[i]=pdf.length;pdf+=i+' 0 obj\n'+objs[i]+'\nendobj\n';}
  const xr=pdf.length;pdf+='xref\n0 '+objs.length+'\n0000000000 65535 f \n';
  for(let i=1;i<objs.length;i++)pdf+=String(off[i]).padStart(10,'0')+' 00000 n \n';
  pdf+='trailer\n<< /Size '+objs.length+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF';
  return Utilities.newBlob(pdf,'application/pdf',fileName);
}

function hpsRowsFromProcV108_(p,r){
  const raw=String(p&&p.spesifikasi_teknis||'');
  let rows=[];
  if(raw.indexOf('[HPSJSON]')===0){try{rows=JSON.parse(raw.slice(9));}catch(e){rows=[];}}
  if(!rows||!rows.length){
    const vol=num(p&&p.volume_proses)||num(r.volume)||1;
    const tot=num(p&&p.nilai_hps)||num(r.jumlah);
    rows=[{uraian:r.nama_kegiatan,satuan:(p&&p.satuan_proses)||r.satuan||'Paket',vol:vol,harga:Math.round(tot/vol),pajak:0,keterangan:''}];
  }
  return rows;
}

function generateProcurementTemplateV96(req){
  const user=req.user||{}, d=req.data||{};
  let type=upper(d.jenis_template);
  if(type==='SURAT PERJANJIAN') type='SPK'; // format sama, judul beda
  const judulKontrak=upper(d.jenis_template)==='SURAT PERJANJIAN'?'SURAT PERJANJIAN':'SURAT PERINTAH KERJA (SPK)';
  const r=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan); if(!r) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!canAccessBidang_(user,r.id_bidang)) return {success:false,message:'Kegiatan di luar hak akses'};
  const p=getProcessV96_(r.id_kegiatan)||{}, b=findById(getRows(SH_BIDANG),'id_bidang',r.id_bidang)||{};
  const provider=p.id_penyedia?findById(getRowsOptional_(SH_PENYEDIA_V96),'id_penyedia',p.id_penyedia):null;
  const allowed=['SURVEY HARGA','SPESIFIKASI DAN HPS','BA PEMERIKSAAN','BA SERAH TERIMA PENYEDIA','BA SERAH TERIMA KETUA UMUM','SPK'];
  if(allowed.indexOf(type)<0)return {success:false,message:'Jenis template tidak valid'};

  const pejabat=norm(d.pejabat_penandatangan)||norm(b.pejabat_komitmen)||'';
  const pelaksana=norm(d.pelaksana_pengadaan)||norm(b.pelaksana_pengadaan)||'';
  const penyediaNama=norm(d.nama_penyedia)||(provider?norm(provider.nama_penyedia):norm(p.nama_penyedia_snapshot))||'';
  const pimpinan=provider?norm(provider.nama_pimpinan):'';
  const identity=(typeof getSystemIdentityData_==='function')?getSystemIdentityData_():{};
  const ketuaUmum=norm(identity.ketua_umum)||'Dedy Sumarna';
  const lingkup=norm(d.lingkup_pekerjaan)||'';
  const nomorDok=norm(d.nomor_dokumen)||norm(p.nomor_spk_kontrak)||'';
  const nilaiHps=num(d.nilai_hps)||num(p.nilai_hps)||num(r.jumlah);
  const nilaiKontrak=num(p.nilai_kontrak)||num(p.nilai_negosiasi)||nilaiHps;
  const JBT_PPK='Pejabat Penanda Tangan Komitmen, transaksi, kontrak/Surat Perintah Kerja';

  const meta={'Nomor Dokumen':nomorDok||'-','ID Kegiatan':r.id_kegiatan,'Nama Kegiatan':r.nama_kegiatan,'Bidang':b.nama_bidang||r.id_bidang,'Pelaksana Kegiatan Pengadaan':pelaksana||'-','Pejabat Penanda Tangan Komitmen':pejabat||'-','Penyedia':penyediaNama||'Belum ditetapkan'};
  const hpsRows=hpsRowsFromProcV108_(p,r);
  let bruto=0,pjk=0; hpsRows.forEach(function(x){const bb=(Number(x.vol)||0)*(Number(x.harga)||0);bruto+=bb;pjk+=Math.round(bb*(Number(x.pajak)||0)/100);});
  const totalHps=bruto-pjk||nilaiHps;

  let title='',sections=[],signers=[];
  if(type==='SURVEY HARGA'){
    title='PENYAMPAIAN HASIL SURVEY HARGA';
    sections=[
      {heading:'Dasar dan Penyampaian',lines:['Sehubungan dalam rangka pengadaan '+r.nama_kegiatan+' untuk kebutuhan Pekan Olahraga Provinsi Jawa Barat Ke-XV Tahun 2026, Pelaksana Kegiatan Pengadaan menyampaikan Hasil Survey Harga (minimal 2 penyedia/toko berbeda) sebagai dasar penetapan Spesifikasi Teknis dan Harga Perkiraan Sendiri (HPS).','Ditujukan kepada '+(pejabat||'.....')+' selaku '+JBT_PPK+'.']},
      {heading:'Tabel Hasil Survey Harga',table:{cols:['Uraian','Spesifikasi','Toko/Penyedia A','Harga A','Toko/Penyedia B','Harga B'],widths:[95,110,85,70,85,55],rows:[[r.nama_kegiatan,String(p.spesifikasi_teknis||'').indexOf('[HPSJSON]')===0?(hpsRows[0]&&hpsRows[0].uraian)||'-':(p.spesifikasi_teknis||r.keterangan||'-'),p.survey_penyedia_1||'-',formatRp(p.harga_survey_1),p.survey_penyedia_2||'-',formatRp(p.harga_survey_2)]]}},
      {heading:'Catatan',lines:['Spesifikasi Teknis tidak menyebutkan merk. Lampiran: foto toko/vendor, foto pelaksanaan survey, foto barang, dan surat penawaran harga (bila ada).','Tembusan: 1. Ketua Umum KONI Kota Bogor; 2. Ketua Kontingen Kota Bogor.']}];
    signers=[{jabatan:'Pelaksana Kegiatan Pengadaan,',nama:pelaksana||''}];
  }
  if(type==='SPESIFIKASI DAN HPS'){
    title='SPESIFIKASI TEKNIS DAN HARGA PERKIRAAN SENDIRI (HPS)';
    const tRows=hpsRows.map(function(x,i){const bb=(Number(x.vol)||0)*(Number(x.harga)||0);return [String(i+1),x.uraian||'-',x.spesifikasi||x.keterangan||'-',String(x.vol||0),x.satuan||'-',formatRp(x.harga),formatRp(bb)];});
    tRows.push(['','JUMLAH','','','','',formatRp(bruto||nilaiHps)]);
    sections=[
      {heading:'Rincian',table:{cols:['No','Uraian','Spesifikasi Barang','Volume','Satuan','Harga Satuan','Jumlah'],widths:[25,105,135,45,55,75,85],rows:tRows}},
      {heading:'Catatan',lines:['Total HPS: '+formatRp(totalHps)+' (Bruto '+formatRp(bruto)+' - Pajak '+formatRp(pjk)+').','Ditetapkan oleh '+JBT_PPK+': '+(pejabat||'-')+'.','Penyedia: '+(penyediaNama||'-')+(provider?', Alamat: '+(provider.alamat||'-')+', Rekening: '+(provider.nama_bank||'')+' '+(provider.nomor_rekening||'')+' a.n. '+(provider.atas_nama_rekening||'-'):'')]}];
    signers=[{jabatan:JBT_PPK+',',nama:pejabat||''}];
  }
  if(type==='BA PEMERIKSAAN'){
    title='BERITA ACARA HASIL PEMERIKSAAN BARANG/PEKERJAAN';
    sections=[
      {heading:'Para Pihak',lines:['PIHAK KESATU: '+(pejabat||'.....')+', selaku '+JBT_PPK+'.','PIHAK KEDUA: '+(pimpinan||'.....')+', Direktur Utama '+(penyediaNama||'PT/CV .....')+'.']},
      {heading:'Dasar',lines:['1. Surat Keputusan Ketua Umum KONI Kota Bogor tentang Penunjukkan '+JBT_PPK+' Pada Kontingen Kota Bogor Porprov Jawa Barat Ke-XV Tahun 2026.','2. Nota/Invoice/Faktur Nomor '+(p.nomor_invoice||'.....')+' Tanggal '+(p.tanggal_invoice||'.....')+'.']},
      {heading:'Rincian Pemeriksaan',table:{cols:['Produk/Pekerjaan','Kuantitas','Satuan','Harga Satuan','Total Harga'],widths:[185,60,70,90,95],rows:[[r.nama_kegiatan,String(p.volume_proses||r.volume),p.satuan_proses||r.satuan,formatRp((p.nilai_realisasi||nilaiKontrak)/(num(p.volume_proses)||num(r.volume)||1)),formatRp(p.nilai_realisasi||nilaiKontrak)]]}},
      {heading:'Pernyataan',lines:['PIHAK KESATU telah melakukan pemeriksaan hasil pekerjaan PIHAK KEDUA (cek volume dan spesifikasi) dan menerima seluruh hasil pekerjaan.','Berita Acara ini dibuat dalam rangkap 3 (tiga) untuk dipergunakan seperlunya.']}];
    signers=[{jabatan:'Penyedia Barang/Jasa '+(penyediaNama||'PT/CV .....')+', Direktur Utama,',nama:pimpinan||''},{jabatan:JBT_PPK+',',nama:pejabat||''}];
  }
  if(type==='BA SERAH TERIMA PENYEDIA'){
    title='BERITA ACARA SERAH TERIMA BARANG/PEKERJAAN';
    sections=[
      {heading:'Para Pihak',lines:['PIHAK KESATU: '+(pejabat||'.....')+', selaku '+JBT_PPK+'.','PIHAK KEDUA: '+(pimpinan||'.....')+', Direktur Utama '+(penyediaNama||'PT/CV .....')+'.']},
      {heading:'Pasal 1',lines:['1. PIHAK KEDUA telah menyerahkan kepada PIHAK KESATU produk pengadaan '+r.nama_kegiatan+' berdasarkan Nota/Invoice/Faktur Nomor '+(p.nomor_invoice||'.....')+' Tanggal '+(p.tanggal_invoice||'.....')+'.','2. PIHAK KESATU telah menerima produk pekerjaan yang telah diselesaikan dengan baik dan sesuai.']},
      {heading:'Pasal 2',lines:['Kekurangan-kekurangan dan cacat hasil pekerjaan menjadi tanggung jawab PIHAK KEDUA.','Berita Acara ini dibuat dalam rangkap 5 (lima) untuk dipergunakan sebagaimana mestinya.']}];
    signers=[{jabatan:'Penyedia Barang/Jasa '+(penyediaNama||'PT/CV .....')+', Direktur Utama,',nama:pimpinan||''},{jabatan:JBT_PPK+',',nama:pejabat||''}];
  }
  if(type==='BA SERAH TERIMA KETUA UMUM'){
    title='BERITA ACARA SERAH TERIMA BARANG/PEKERJAAN';
    sections=[
      {heading:'Para Pihak',lines:['PIHAK KESATU: '+ketuaUmum+', Ketua Umum KONI Kota Bogor.','PIHAK KEDUA: '+(pejabat||'.....')+', selaku '+JBT_PPK+'.']},
      {heading:'Pasal 1',lines:['1. PIHAK KEDUA telah menyerahkan kepada PIHAK KESATU produk pengadaan '+r.nama_kegiatan+' berdasarkan Nota/Invoice/Faktur Nomor '+(p.nomor_invoice||'.....')+' Tanggal '+(p.tanggal_invoice||'.....')+'.','2. PIHAK KESATU telah menerima produk pekerjaan yang telah diselesaikan dengan baik dan sesuai.']},
      {heading:'Pasal 2',lines:['Kekurangan-kekurangan dan cacat hasil pekerjaan yang telah selesai dikerjakan menjadi tanggung jawab PIHAK KEDUA.','Berita Acara ini dibuat dalam rangkap 5 (lima) untuk dipergunakan sebagaimana mestinya.']}];
    signers=[{jabatan:'Ketua Umum KONI Kota Bogor,',nama:ketuaUmum},{jabatan:JBT_PPK+',',nama:pejabat||''}];
  }
  if(type==='SPK'){
    title=judulKontrak;
    sections=[
      {heading:'Data '+(judulKontrak==='SURAT PERJANJIAN'?'Surat Perjanjian':'SPK'),lines:['Satuan Kerja/Bidang: '+(b.nama_bidang||r.id_bidang),'Nomor dan Tanggal: '+(nomorDok||'.....')+' / '+(p.tanggal_spk_kontrak||Utilities.formatDate(new Date(),'Asia/Jakarta','dd MMMM yyyy')),'Nama PPK: '+(pejabat||'.....'),'Nama Penyedia: '+(penyediaNama||'CV/PT .....'),'Paket Pengadaan: '+r.nama_kegiatan,'Surat Undangan Pengadaan Langsung: Nomor ..... Tanggal .....','Berita Acara Hasil Pengadaan Langsung: Nomor '+(p.nomor_ba_penetapan||'.....')+' Tanggal '+(p.tanggal_ba_penetapan||'.....'),'Nilai Kontrak termasuk Pajak: '+formatRp(nilaiKontrak),'Jenis Kontrak: '+(p.jenis_kontrak||'Lumpsum'),'Waktu Pelaksanaan: '+(p.tanggal_mulai||'.....')+' s.d. '+(p.tanggal_selesai||'.....')]},
      {heading:'Lingkup dan Spesifikasi Pekerjaan',lines:[lingkup||('a. Menyediakan Pengadaan '+r.nama_kegiatan+'. b. Spesifikasi barang/pekerjaan sesuai HPS terlampir.'),'Rincian: '+hpsRows.map(function(x){return x.uraian+' ('+x.vol+' '+(x.satuan||'')+')';}).join('; ')]},
      {heading:'Syarat Umum (Ringkasan sesuai Formulir SPK SK 040.3/2026)',lines:['Harga telah memperhitungkan keuntungan, beban pajak, overhead, dan asuransi (bila dipersyaratkan). Keabsahan dan pelaksanaan didasarkan hukum Republik Indonesia.','Penyedia dilarang mengalihkan/mensubkontrakkan pekerjaan; wajib menyelesaikan sesuai jadwal, volume, dan spesifikasi. Denda keterlambatan 1/1000 (satu perseribu) per hari dari nilai kontrak.','Serah terima dilakukan setelah pekerjaan selesai 100% dan diperiksa; pembayaran 100% setelah Berita Acara Serah Terima ditandatangani, dipotong denda (bila ada) dan pajak.','Perselisihan diselesaikan secara musyawarah, atau melalui Pengadilan Negeri setempat. Penyedia menjamin tidak ada pemberian komisi kepada personel satuan kerja.']}];
    signers=[{jabatan:'Untuk dan atas nama '+JBT_PPK+',',nama:pejabat||''},{jabatan:'Untuk dan atas nama Penyedia '+(penyediaNama||'CV/PT')+', Direktur,',nama:pimpinan||''}];
  }

  const latest=getRowsOptional_(SH_DOK_GENERATE_V96).filter(function(x){return norm(x.id_kegiatan)===norm(r.id_kegiatan)&&upper(x.jenis_template)===upper(d.jenis_template);}).sort(function(a,b2){return num(b2.versi)-num(a.versi);})[0];
  const versi=num(latest?latest.versi:0)+1;
  const fileName=upper(d.jenis_template).replace(/[^A-Z0-9]+/g,'_')+'_'+safeName(r.nama_kegiatan)+'_V'+versi+'.pdf';
  const root=DriveApp.getFolderById(DRIVE_FOLDER_ID),bf=getOrCreateFolder(root,norm(r.id_bidang)+' - '+safeName(b.nama_bidang||r.id_bidang)),pf=getOrCreateFolder(bf,'PROSES PENGADAAN'),kf=getOrCreateFolder(pf,norm(r.id_kegiatan)+' - '+safeName(r.nama_kegiatan));
  const file=kf.createFile(createTemplatePdfV108_(title,meta,sections,signers,fileName));
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  appendByHeader(SH_DOK_GENERATE_V96,{id_generate:'GEN-'+new Date().getTime(),id_kegiatan:r.id_kegiatan,id_bidang:r.id_bidang,jenis_template:upper(d.jenis_template),versi:versi,nama_file:fileName,url_file:file.getUrl(),tanggal_generate:new Date(),generate_by:user.nama||''});
  appendLog(user.nama,'GENERATE_TEMPLATE_PENGADAAN',r.id_kegiatan,upper(d.jenis_template)+' V'+versi);
  return {success:true,message:'Template '+upper(d.jenis_template)+' berhasil dibuat',url_file:file.getUrl(),versi:versi};
}

/* V101 dideklarasi ulang: meneruskan pelaksana & lingkup, menghemat penulisan sel
   yang tidak berubah agar pembuatan template lebih cepat. */
function generateProcurementTemplateV101(req){
  const user=req.user||{}, d=req.data||{};
  const r=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(!r) return {success:false,message:'Perencanaan tidak ditemukan'};
  if(!canAccessBidang_(user,r.id_bidang)) return {success:false,message:'Kegiatan di luar hak akses'};
  if(!norm(d.nomor_dokumen)) return {success:false,message:'Nomor dokumen wajib diisi'};
  if(!norm(d.pejabat_penandatangan)) return {success:false,message:'Pejabat yang menandatangani wajib diisi'};
  if(!norm(d.nama_penyedia)) return {success:false,message:'Nama penyedia wajib diisi'};
  let p=getProcessV96_(r.id_kegiatan);
  if(!p){
    appendByHeader(SH_PROSES_V96,{id_proses:'PRC-'+new Date().getTime(),id_kegiatan:r.id_kegiatan,id_bidang:r.id_bidang,jalur_proses:defaultRouteV96_(r),nama_penyedia_snapshot:d.nama_penyedia,nomor_spk_kontrak:d.nomor_dokumen,nilai_hps:num(d.nilai_hps)||num(r.jumlah),status_proses:'DRAFT',tanggal_input:new Date(),input_by:user.nama||'',tanggal_update:new Date(),update_by:user.nama||''});
  }else{
    if(norm(p.nama_penyedia_snapshot)!==norm(d.nama_penyedia)) setCell(SH_PROSES_V96,p._row,'nama_penyedia_snapshot',d.nama_penyedia);
    if(norm(p.nomor_spk_kontrak)!==norm(d.nomor_dokumen)) setCell(SH_PROSES_V96,p._row,'nomor_spk_kontrak',d.nomor_dokumen);
    if(num(d.nilai_hps)>0 && num(p.nilai_hps)!==num(d.nilai_hps)) setCell(SH_PROSES_V96,p._row,'nilai_hps',num(d.nilai_hps));
  }
  const b=findById(getRows(SH_BIDANG),'id_bidang',r.id_bidang);
  if(b){
    if(norm(d.pejabat_penandatangan)&&norm(b.pejabat_komitmen)!==norm(d.pejabat_penandatangan)) setCell(SH_BIDANG,b._row,'pejabat_komitmen',d.pejabat_penandatangan);
    if(norm(d.pelaksana_pengadaan)&&norm(b.pelaksana_pengadaan)!==norm(d.pelaksana_pengadaan)) setCell(SH_BIDANG,b._row,'pelaksana_pengadaan',d.pelaksana_pengadaan);
  }
  return generateProcurementTemplateV96({user:user,data:d});
}

/* =========================================================
   SIMPROV v109 - Fokus Pencatatan Non Pengadaan
   - Action pencatatan realisasi tersedia di backend
   - Verifikasi dokumen memakai satu kali tulis per baris
   - Status paket sinkron otomatis setelah verifikasi
   - Verifikasi massal Non Pengadaan melalui satu request
   ========================================================= */
function updateRowFieldsFastV109_(sheetName,row,fields){
  const sheet=sh(sheetName), headers=headerMap(sheetName);
  const last=sheet.getLastColumn();
  const range=sheet.getRange(row,1,1,last);
  const values=range.getValues()[0];
  Object.keys(fields||{}).forEach(function(key){
    const col=headers[key];
    if(col) values[col-1]=fields[key];
  });
  range.setValues([values]);
}
function latestRequiredNonDocsV109_(idKegiatan){
  const allowed=['TANDA TERIMA','BUKTI POTONG PAJAK'];
  const rows=getRowsOptional_(SH_DOKUMEN_NON_PENGADAAN)
    .filter(function(d){return norm(d.id_kegiatan)===norm(idKegiatan)&&allowed.indexOf(upper(d.jenis_dokumen))>=0;})
    .sort(function(a,b){return Number(a._row)-Number(b._row);});
  const map={}; rows.forEach(function(d){map[upper(d.jenis_dokumen)]=d;});
  return allowed.map(function(j){return map[j];}).filter(Boolean);
}
function syncNonProcStatusV109_(idKegiatan){
  const docs=latestRequiredNonDocsV109_(idKegiatan);
  const complete=docs.length===2 && docs.every(function(d){return !!norm(d.url_file);});
  const valid=complete && docs.every(function(d){return upper(d.status_verifikasi)==='VALID DOKUMEN';});
  const repair=docs.some(function(d){return ['PERBAIKAN DOKUMEN','PERBAIKAN'].indexOf(upper(d.status_verifikasi))>=0;});
  const waitingRepair=docs.some(function(d){return upper(d.status_verifikasi)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';});
  let status='MENUNGGU DOKUMEN';
  if(repair) status='PERBAIKAN DOKUMEN';
  else if(waitingRepair) status='MENUNGGU VERIFIKASI PERBAIKAN';
  else if(valid) status='MENUNGGU PENCATATAN REALISASI';
  else if(complete) status='MENUNGGU VERIFIKASI DOKUMEN';
  const latest=getLatestNonProc_(idKegiatan);
  if(latest) updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:status});
  const r=findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan);
  if(r && upper(r.status_pencairan)!=='SELESAI') updateRowFieldsFastV109_(SH_RENCANA,r._row,{status_pencairan:status});
  return {status:status,complete:complete,valid:valid,docs:docs};
}
function verifyDokumenNonPengadaanV109(req){
  const user=req.user||{};
  if(!(isAdminUser(user)||userRole_(user)==='VERIFIKATOR')) return {success:false,message:'Hanya Admin/Verifikator yang dapat memeriksa dokumen'};
  const d=findById(getRows(SH_DOKUMEN_NON_PENGADAAN),'id_dokumen_non',req.id_dokumen_non);
  if(!d) return {success:false,message:'Dokumen tidak ditemukan'};
  if(!canAccessBidang_(user,d.id_bidang)) return {success:false,message:'Dokumen di luar bidang penugasan'};
  const st=upper(req.status_verifikasi), note=norm(req.catatan_verifikator);
  if(['VALID DOKUMEN','PERBAIKAN DOKUMEN'].indexOf(st)<0) return {success:false,message:'Status tidak valid'};
  if(st==='PERBAIKAN DOKUMEN'&&!note) return {success:false,message:'Catatan perbaikan wajib diisi'};
  const now=new Date();
  const oldHistory=norm(d.riwayat_dokumen);
  const line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - '+st+' oleh '+(user.nama||'Verifikator')+(note?' | '+note:'');
  updateRowFieldsFastV109_(SH_DOKUMEN_NON_PENGADAAN,d._row,{
    status_verifikasi:st,catatan_verifikator:note,tanggal_verifikasi:now,
    verifikasi_by:user.nama||'',riwayat_dokumen:oldHistory?(oldHistory+'\n'+line):line
  });
  const sync=syncNonProcStatusV109_(d.id_kegiatan);
  return {success:true,message:'Status dokumen diperbarui',status_paket:sync.status,siap_realisasi:sync.valid};
}
function bulkVerifyDokumenNonV109(req){
  const user=req.user||{};
  if(!(isAdminUser(user)||userRole_(user)==='VERIFIKATOR')) return {success:false,message:'Hanya Admin/Verifikator yang dapat memeriksa dokumen'};
  const items=Array.isArray(req.items)?req.items:[];
  if(!items.length) return {success:false,message:'Tidak ada dokumen yang dipilih'};
  const rows=getRows(SH_DOKUMEN_NON_PENGADAAN), touched={};
  items.forEach(function(it){
    const d=findById(rows,'id_dokumen_non',it.id_dokumen_non);
    if(!d) throw new Error('Dokumen tidak ditemukan');
    if(!canAccessBidang_(user,d.id_bidang)) throw new Error('Ada dokumen di luar bidang penugasan');
    const st=upper(it.status_verifikasi), note=norm(it.catatan_verifikator);
    if(['VALID DOKUMEN','PERBAIKAN DOKUMEN'].indexOf(st)<0) throw new Error('Status dokumen tidak valid');
    if(st==='PERBAIKAN DOKUMEN'&&!note) throw new Error('Catatan perbaikan wajib diisi');
    const now=new Date(), oldHistory=norm(d.riwayat_dokumen);
    const line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - '+st+' oleh '+(user.nama||'Verifikator')+(note?' | '+note:'');
    updateRowFieldsFastV109_(SH_DOKUMEN_NON_PENGADAAN,d._row,{status_verifikasi:st,catatan_verifikator:note,tanggal_verifikasi:now,verifikasi_by:user.nama||'',riwayat_dokumen:oldHistory?(oldHistory+'\n'+line):line});
    touched[norm(d.id_kegiatan)]=true;
  });
  const states={}; Object.keys(touched).forEach(function(id){states[id]=syncNonProcStatusV109_(id);});
  return {success:true,message:items.length+' dokumen berhasil diproses',states:states};
}
function catatNonPengadaanV109(req){
  const user=req.user||{};
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(isAdminUser(user)||userRole_(user)==='VERIFIKATOR') return {success:false,message:'Pencatatan realisasi dilakukan oleh User Bidang'};
  if(publicCategory_(rencana)!=='NON PENGADAAN') return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  const state=syncNonProcStatusV109_(rencana.id_kegiatan);
  if(!state.valid) return {success:false,message:'Realisasi baru dapat dicatat setelah Tanda Terima dan Bukti Potong Pajak berstatus VALID DOKUMEN'};
  const latest=getLatestNonProc_(rencana.id_kegiatan)||{};
  const nilai=num(req.nilai_realisasi);
  if(!nilai) return {success:false,message:'Nilai realisasi wajib diisi'};
  if(nilai>num(rencana.jumlah)) return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan'};
  const existing=getRowsOptional_(SH_REALISASI).find(function(x){return norm(x.id_kegiatan)===norm(rencana.id_kegiatan)&&upper(x.status)!=='DIBATALKAN';});
  if(existing) return {success:false,message:'Realisasi kegiatan ini sudah pernah dicatat'};
  const now=new Date();
  appendByHeader(SH_REALISASI,{id_realisasi:'RLS-'+now.getTime(),id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,kategori:'NON PENGADAAN',metode:'NON PENGADAAN',nilai_perencanaan:num(rencana.jumlah),nilai_realisasi:nilai,tanggal_realisasi:now,nomor_bukti:'',keterangan:norm(req.keterangan),input_by:user.nama||'',tanggal_input:now,status:'FINAL',riwayat_perubahan:'Pencatatan awal oleh '+(user.nama||'User Bidang')});
  updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:'SELESAI'});
  const np=getLatestNonProc_(rencana.id_kegiatan); if(np) updateRowFieldsFastV109_(SH_NON_PENGADAAN,np._row,{status:'SELESAI'});
  return {success:true,message:'Realisasi Non Pengadaan berhasil dicatat',nilai_realisasi:nilai,status:'SELESAI'};
}

const routeActionV109Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='catatNonPengadaanV96'||a==='catatNonPengadaanV109') return catatNonPengadaanV109(req);
  if(a==='verifyDokumenNonPengadaan') return verifyDokumenNonPengadaanV109(req);
  if(a==='bulkVerifyDokumenNonV109') return bulkVerifyDokumenNonV109(req);
  return routeActionV109Base_(a,req);
};
const doPostV109Base_=doPost;
doPost=function(e){
  try{
    const raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}';
    const req=JSON.parse(raw||'{}');
    if(['catatNonPengadaanV96','catatNonPengadaanV109','verifyDokumenNonPengadaan','bulkVerifyDokumenNonV109'].indexOf(req.action)>=0){
      return withWriteLock(function(){return out(routeAction_(req.action,req));});
    }
    return doPostV109Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err)});}
};

/* =========================================================
   SIMPROV v110 - Realisasi Non Pengadaan sebelum verifikasi
   ========================================================= */
function existingNonRealV110_(idKegiatan){
  const rows=getRowsOptional_(SH_REALISASI).filter(function(x){
    return norm(x.id_kegiatan)===norm(idKegiatan) && upper(x.status)!=='DIBATALKAN';
  });
  if(!rows.length) return null;
  const finalRows=rows.filter(function(x){return ['FINAL','DISETUJUI','SELESAI','SAH'].indexOf(upper(x.status))>=0;});
  const source=finalRows.length?finalRows:rows;
  source.sort(function(a,b){
    const ar=num(a._row), br=num(b._row);
    if(ar||br) return br-ar;
    const ad=new Date(a.tanggal_input||a.tanggal_realisasi||0).getTime()||0;
    const bd=new Date(b.tanggal_input||b.tanggal_realisasi||0).getTime()||0;
    return bd-ad;
  });
  return source[0]||null;
}
function syncNonProcStatusV110_(idKegiatan){
  const docs=latestRequiredNonDocsV109_(idKegiatan);
  const complete=docs.length===2 && docs.every(function(d){return !!norm(d.url_file);});
  const valid=complete && docs.every(function(d){return upper(d.status_verifikasi)==='VALID DOKUMEN';});
  const repair=docs.some(function(d){return ['PERBAIKAN DOKUMEN','PERBAIKAN'].indexOf(upper(d.status_verifikasi))>=0;});
  const waitingRepair=docs.some(function(d){return upper(d.status_verifikasi)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';});
  const real=existingNonRealV110_(idKegiatan);
  let status='MENUNGGU DOKUMEN';
  if(repair) status='PERBAIKAN DOKUMEN';
  else if(waitingRepair) status='MENUNGGU VERIFIKASI PERBAIKAN';
  else if(valid && real) status='SELESAI';
  else if(valid) status='MENUNGGU PENCATATAN REALISASI';
  else if(complete) status='MENUNGGU VERIFIKASI DOKUMEN';
  const latest=getLatestNonProc_(idKegiatan);
  if(latest) updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:status});
  const r=findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan);
  if(r) updateRowFieldsFastV109_(SH_RENCANA,r._row,{status_pencairan:status});
  return {status:status,complete:complete,valid:valid,docs:docs,realisasi:real};
}
function catatNonPengadaanV110(req){
  const user=req.user||{};
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(isAdminUser(user)||userRole_(user)==='VERIFIKATOR') return {success:false,message:'Pencatatan realisasi dilakukan oleh User Bidang'};
  if(publicCategory_(rencana)!=='NON PENGADAAN') return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  const state=syncNonProcStatusV110_(rencana.id_kegiatan);
  if(!state.complete) return {success:false,message:'Realisasi dapat dicatat setelah Tanda Terima dan Bukti Potong Pajak selesai diunggah'};
  const nilai=num(req.nilai_realisasi);
  if(!nilai) return {success:false,message:'Nilai realisasi wajib diisi'};
  if(nilai>num(rencana.jumlah)) return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan'};
  if(existingNonRealV110_(rencana.id_kegiatan)) return {success:false,message:'Realisasi kegiatan ini sudah pernah dicatat'};
  const now=new Date();
  appendByHeader(SH_REALISASI,{id_realisasi:'RLS-'+now.getTime(),id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,kategori:'NON PENGADAAN',metode:'NON PENGADAAN',nilai_perencanaan:num(rencana.jumlah),nilai_realisasi:nilai,tanggal_realisasi:now,nomor_bukti:'',keterangan:norm(req.keterangan),input_by:user.nama||'',tanggal_input:now,status:'MENUNGGU VERIFIKASI',riwayat_perubahan:'Pencatatan awal oleh '+(user.nama||'User Bidang')});
  const synced=syncNonProcStatusV110_(rencana.id_kegiatan);
  return {success:true,message:'Nilai realisasi berhasil dicatat dan menunggu pemeriksaan Verifikator',nilai_realisasi:nilai,status:synced.status};
}
function koreksiRealisasiNonV110(req){
  const user=req.user||{};
  if(!(isAdminUser(user)||userRole_(user)==='VERIFIKATOR')) return {success:false,message:'Hanya Admin/Verifikator yang dapat memperbaiki nilai realisasi'};
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!canAccessBidang_(user,rencana.id_bidang)) return {success:false,message:'Kegiatan di luar bidang penugasan'};
  const real=existingNonRealV110_(req.id_kegiatan);
  if(!real) return {success:false,message:'Nilai realisasi belum dicatat oleh User Bidang'};
  const nilai=num(req.nilai_realisasi), catatan=norm(req.catatan);
  if(!nilai) return {success:false,message:'Nilai realisasi wajib diisi'};
  if(nilai>num(rencana.jumlah)) return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan'};
  if(nilai===num(real.nilai_realisasi)) return {success:false,message:'Nilai realisasi tidak berubah'};
  if(!catatan) return {success:false,message:'Catatan alasan koreksi wajib diisi'};
  const now=new Date();
  const line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Nilai realisasi diubah dari '+num(real.nilai_realisasi)+' menjadi '+nilai+' oleh '+(user.nama||'Verifikator')+' | '+catatan;
  updateRowFieldsFastV109_(SH_REALISASI,real._row,{nilai_realisasi:nilai,keterangan:catatan,status:'DIKOREKSI VERIFIKATOR',riwayat_perubahan:norm(real.riwayat_perubahan)?norm(real.riwayat_perubahan)+'\n'+line:line});
  syncNonProcStatusV110_(req.id_kegiatan);
  return {success:true,message:'Nilai realisasi berhasil diperbaiki. Catatan koreksi tersimpan dalam riwayat.',nilai_realisasi:nilai,catatan:catatan};
}

const routeActionV110Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='catatNonPengadaanV96'||a==='catatNonPengadaanV109'||a==='catatNonPengadaanV110') return catatNonPengadaanV110(req);
  if(a==='koreksiRealisasiNonV110') return koreksiRealisasiNonV110(req);
  if(a==='verifyDokumenNonPengadaan'){
    const outv=verifyDokumenNonPengadaanV109(req);
    if(outv&&outv.success){const d=findById(getRows(SH_DOKUMEN_NON_PENGADAAN),'id_dokumen_non',req.id_dokumen_non);if(d){const s=syncNonProcStatusV110_(d.id_kegiatan);outv.status_paket=s.status;outv.siap_realisasi=s.complete;}}
    return outv;
  }
  if(a==='bulkVerifyDokumenNonV109'){
    const outv=bulkVerifyDokumenNonV109(req);
    if(outv&&outv.success){const ids={};(req.items||[]).forEach(function(it){const d=findById(getRows(SH_DOKUMEN_NON_PENGADAAN),'id_dokumen_non',it.id_dokumen_non);if(d)ids[d.id_kegiatan]=true;});Object.keys(ids).forEach(function(id){syncNonProcStatusV110_(id);});}
    return outv;
  }
  return routeActionV110Base_(a,req);
};


/* =========================================================
   SIMPROV v111 - Stabilitas pencatatan realisasi & optimasi
   ========================================================= */

/* Cache objek Spreadsheet, Sheet, dan header selama satu eksekusi Apps Script.
   Ini memangkas openById/getRange header berulang pada hampir semua action. */
var __SIMPROV_SS_V111 = null;
var __SIMPROV_SHEET_V111 = {};
var __SIMPROV_HEADER_V111 = {};
var __SIMPROV_NEXT_ROW_V111 = {};

if(REQUIRED_HEADERS.REALISASI.indexOf('nama_pihak') < 0){
  REQUIRED_HEADERS.REALISASI.push('nama_pihak');
}

ss = function(){
  if(!__SIMPROV_SS_V111) __SIMPROV_SS_V111 = SpreadsheetApp.openById(SS_ID);
  return __SIMPROV_SS_V111;
};
sh = function(name){
  if(!__SIMPROV_SHEET_V111[name]){
    const sheet = ss().getSheetByName(name);
    if(!sheet) throw new Error('Sheet tidak ditemukan: ' + name);
    __SIMPROV_SHEET_V111[name] = sheet;
  }
  return __SIMPROV_SHEET_V111[name];
};
headers = function(name){
  if(__SIMPROV_HEADER_V111[name]) return __SIMPROV_HEADER_V111[name];
  ensureHeaders(name);
  const sheet = sh(name);
  const hs = sheet.getRange(1,1,1,Math.max(1,sheet.getLastColumn())).getValues()[0].map(function(h){return norm(h);});
  __SIMPROV_HEADER_V111[name] = hs;
  return hs;
};
function headerMap(name){
  const map = {};
  headers(name).forEach(function(h,i){ if(h) map[h] = i + 1; });
  return map;
}
colIndex = function(name,header){
  const idx = headers(name).indexOf(header);
  return idx < 0 ? -1 : idx + 1;
};
setCell = function(name,row,header,value){
  const c = colIndex(name,header);
  if(c > 0) sh(name).getRange(row,c).setValue(value);
};
appendByHeader = function(name,obj){
  ensureHeaders(name);
  const sheet = sh(name);
  const hs = headers(name);
  const row = hs.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; });
  const keyHeader = (REQUIRED_HEADERS[name] || [])[0];
  const keyIdx = hs.indexOf(keyHeader);
  let targetRow = __SIMPROV_NEXT_ROW_V111[name];
  if(!targetRow){
    const lastRow = Math.max(1,sheet.getLastRow());
    targetRow = Math.max(2,lastRow + 1);
    if(keyIdx >= 0 && lastRow >= 2){
      const keys = sheet.getRange(2,keyIdx+1,lastRow-1,1).getValues();
      for(let i=0;i<keys.length;i++){
        if(norm(keys[i][0]) === ''){ targetRow = i + 2; break; }
      }
    }
  }
  sheet.getRange(targetRow,1,1,row.length).setValues([row]);
  __SIMPROV_NEXT_ROW_V111[name] = targetRow + 1;
};
ensureAllHeadersFast = function(){
  const cache = CacheService.getScriptCache();
  const key = 'SIMPROV_HEADERS_OK_V111';
  if(cache.get(key) === '1') return;
  ensureAllHeaders();
  cache.put(key,'1',21600);
};

/* Folder Drive di-cache agar upload berikutnya tidak mengulang pencarian folder. */
getOrCreateFolder = function(parent,name){
  const cache = CacheService.getScriptCache();
  const raw = parent.getId() + '|' + name;
  const digest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,raw)).replace(/=+$/,'');
  const key = 'SIMPROV_FOLDER_V111_' + digest;
  const cachedId = cache.get(key);
  if(cachedId){
    try{ return DriveApp.getFolderById(cachedId); }catch(e){}
  }
  const it = parent.getFoldersByName(name);
  const folder = it.hasNext() ? it.next() : parent.createFolder(name);
  try{ cache.put(key,folder.getId(),21600); }catch(e){}
  return folder;
};

/* Satu kali baca + satu kali tulis baris untuk menghindari error headerMap
   sekaligus mempercepat verifikasi dan sinkronisasi status. */
updateRowFieldsFastV109_ = function(sheetName,row,fields){
  const sheet = sh(sheetName);
  const map = headerMap(sheetName);
  const last = sheet.getLastColumn();
  const range = sheet.getRange(row,1,1,last);
  const values = range.getValues()[0];
  Object.keys(fields||{}).forEach(function(key){
    const col = map[key];
    if(col) values[col-1] = fields[key];
  });
  range.setValues([values]);
};

syncNonProcStatusV110_ = function(idKegiatan){
  const docs = latestRequiredNonDocsV109_(idKegiatan);
  const complete = docs.length===2 && docs.every(function(d){return !!norm(d.url_file);});
  const valid = complete && docs.every(function(d){return upper(d.status_verifikasi)==='VALID DOKUMEN';});
  const repair = docs.some(function(d){return ['PERBAIKAN DOKUMEN','PERBAIKAN'].indexOf(upper(d.status_verifikasi))>=0;});
  const waitingRepair = docs.some(function(d){return upper(d.status_verifikasi)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';});
  const real = existingNonRealV110_(idKegiatan);
  const realFinal = !!real && ['FINAL','DISETUJUI','SELESAI','SAH'].indexOf(upper(real.status))>=0;
  const latest = getLatestNonProc_(idKegiatan);
  const r = findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan);
  const alreadyFinished = upper(r&&r.status_pencairan)==='SELESAI' || upper(latest&&latest.status)==='SELESAI';
  let status = 'MENUNGGU DOKUMEN';
  if(repair) status = 'PERBAIKAN DOKUMEN';
  else if(waitingRepair) status = 'MENUNGGU VERIFIKASI PERBAIKAN';
  else if(valid && realFinal) status = alreadyFinished ? 'SELESAI' : 'MENUNGGU FINALISASI';
  else if(valid && real) status = 'MENUNGGU VERIFIKASI REALISASI';
  else if(valid) status = 'MENUNGGU PENCATATAN REALISASI';
  else if(complete) status = 'MENUNGGU VERIFIKASI DOKUMEN';

  if(latest && upper(latest.status)!==upper(status)) updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:status});
  if(r && upper(r.status_pencairan)!==upper(status)) updateRowFieldsFastV109_(SH_RENCANA,r._row,{status_pencairan:status});
  return {status:status,complete:complete,valid:valid,docs:docs,realisasi:real,realFinal:realFinal};
};

function catatNonPengadaanV111(req){
  const user = req.user || {};
  const rencana = findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(isAdminUser(user)||userRole_(user)==='VERIFIKATOR') return {success:false,message:'Pencatatan realisasi dilakukan oleh User Bidang'};
  if(publicCategory_(rencana)!=='NON PENGADAAN') return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};

  const docs = latestRequiredNonDocsV109_(rencana.id_kegiatan);
  const complete = docs.length===2 && docs.every(function(d){return !!norm(d.url_file);});
  if(!complete) return {success:false,message:'Realisasi dapat dicatat setelah Tanda Terima dan Bukti Potong Pajak selesai diunggah'};

  const nilai = num(req.nilai_realisasi);
  const namaPihak = norm(req.nama_pihak);
  if(!namaPihak) return {success:false,message:'Pihak/Penerima wajib diisi'};
  if(!nilai) return {success:false,message:'Nilai realisasi wajib diisi'};
  if(nilai>num(rencana.jumlah)) return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan'};
  if(existingNonRealV110_(rencana.id_kegiatan)) return {success:false,message:'Realisasi kegiatan ini sudah pernah dicatat'};

  const now = new Date();
  const realisasi = {
    id_realisasi:'RLS-'+now.getTime(), id_kegiatan:rencana.id_kegiatan, id_bidang:rencana.id_bidang,
    kategori:'NON PENGADAAN', metode:'NON PENGADAAN', nilai_perencanaan:num(rencana.jumlah),
    nilai_realisasi:nilai, tanggal_realisasi:now, nomor_bukti:'', nama_pihak:namaPihak,
    keterangan:norm(req.keterangan), input_by:user.nama||'', tanggal_input:now,
    status:'MENUNGGU VERIFIKASI', riwayat_perubahan:'Pencatatan awal oleh '+(user.nama||'User Bidang')
  };
  appendByHeader(SH_REALISASI,realisasi);

  const valid = docs.every(function(d){return upper(d.status_verifikasi)==='VALID DOKUMEN';});
  const repair = docs.some(function(d){return ['PERBAIKAN DOKUMEN','PERBAIKAN'].indexOf(upper(d.status_verifikasi))>=0;});
  const waitingRepair = docs.some(function(d){return upper(d.status_verifikasi)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';});
  let status = valid ? 'MENUNGGU VERIFIKASI REALISASI' : (repair ? 'PERBAIKAN DOKUMEN' : (waitingRepair ? 'MENUNGGU VERIFIKASI PERBAIKAN' : 'MENUNGGU VERIFIKASI DOKUMEN'));

  updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:status});
  const latest = getLatestNonProc_(rencana.id_kegiatan);
  if(latest) updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:status});
  return {success:true,message:'Nilai realisasi berhasil dicatat dan menunggu pemeriksaan Verifikator',nilai_realisasi:nilai,nama_pihak:namaPihak,status:status,realisasi:realisasi};
}

const routeActionV111Base_ = routeAction_;
routeAction_ = function(a,req){
  if(a==='catatNonPengadaanV96'||a==='catatNonPengadaanV109'||a==='catatNonPengadaanV110'||a==='catatNonPengadaanV111') return catatNonPengadaanV111(req);
  return routeActionV111Base_(a,req);
};
const doPostV111Base_ = doPost;
doPost = function(e){
  try{
    const raw = e&&e.postData&&e.postData.contents ? e.postData.contents : '{}';
    const req = JSON.parse(raw||'{}');
    if(req.action==='catatNonPengadaanV111'||req.action==='catatNonPengadaanV110'){
      return withWriteLock(function(){ return out(routeAction_(req.action,req)); });
    }
    return doPostV111Base_(e);
  }catch(err){
    return out({success:false,message:err&&err.message?err.message:String(err)});
  }
};

/* =========================================================
   SIMPROV v112 - Persetujuan nilai realisasi Non Pengadaan
   ========================================================= */
function verifikasiRealisasiNonV112(req){
  const user=req.user||{};
  if(!(isAdminUser(user)||userRole_(user)==='VERIFIKATOR')) return {success:false,message:'Hanya Admin/Verifikator yang dapat memeriksa nilai realisasi'};
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!canAccessBidang_(user,rencana.id_bidang)) return {success:false,message:'Kegiatan di luar bidang penugasan'};
  const real=existingNonRealV110_(req.id_kegiatan);
  if(!real) return {success:false,message:'Nilai realisasi belum dicatat oleh User Bidang'};
  const keputusan=upper(req.keputusan);
  const now=new Date();
  if(keputusan==='SETUJUI'){
    const line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Nilai realisasi disetujui oleh '+(user.nama||'Verifikator');
    updateRowFieldsFastV109_(SH_REALISASI,real._row,{status:'FINAL',riwayat_perubahan:norm(real.riwayat_perubahan)?norm(real.riwayat_perubahan)+'\n'+line:line});
  }else if(keputusan==='PERBAIKI'){
    const nilai=num(req.nilai_realisasi),catatan=norm(req.catatan);
    if(!nilai) return {success:false,message:'Nilai hasil perbaikan wajib diisi'};
    if(nilai>num(rencana.jumlah)) return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan'};
    if(!catatan) return {success:false,message:'Catatan perbaikan wajib diisi'};
    const line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Nilai realisasi diperbaiki dari '+num(real.nilai_realisasi)+' menjadi '+nilai+' oleh '+(user.nama||'Verifikator')+' | '+catatan;
    updateRowFieldsFastV109_(SH_REALISASI,real._row,{nilai_realisasi:nilai,keterangan:catatan,status:'FINAL',riwayat_perubahan:norm(real.riwayat_perubahan)?norm(real.riwayat_perubahan)+'\n'+line:line});
  }else return {success:false,message:'Keputusan tidak valid'};
  const docs=latestRequiredNonDocsV109_(req.id_kegiatan);
  const allValid=docs.length===2&&docs.every(function(d){return upper(d.status_verifikasi)==='VALID DOKUMEN';});
  const status=allValid?'MENUNGGU FINALISASI':'MENUNGGU VERIFIKASI DOKUMEN';
  updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:status});
  const latest=getLatestNonProc_(req.id_kegiatan);if(latest)updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:status});
  return {success:true,message:keputusan==='SETUJUI'?'Nilai realisasi berhasil disetujui':'Nilai realisasi berhasil diperbaiki dan disetujui',status:status};
}
const routeActionV112Base_=routeAction_;
routeAction_=function(a,req){if(a==='verifikasiRealisasiNonV112')return verifikasiRealisasiNonV112(req);return routeActionV112Base_(a,req);};

/* =========================================================
   SIMPROV v113 - Sinkron finalisasi Non Pengadaan
   ========================================================= */
function syncFinalNonPengadaanV113_(idKegiatan){
  return syncNonProcStatusV110_(idKegiatan).status;
}
const verifikasiRealisasiNonV113Base=verifikasiRealisasiNonV112;
verifikasiRealisasiNonV112=function(req){
  const result=verifikasiRealisasiNonV113Base(req);
  if(result&&result.success){
    result.status=syncFinalNonPengadaanV113_(req.id_kegiatan);
    if(result.status==='MENUNGGU FINALISASI') result.message=(result.message||'Nilai realisasi berhasil diperiksa')+'. Paket siap diselesaikan oleh Verifikator.';
  }
  return result;
};


/* =========================================================
   PERBAIKAN v113 - Penandatangan Honor dan finalisasi pipeline
   ========================================================= */
function resolveHonorPelaksanaAdminV113_(rencana,bidang,identity){
  bidang=bidang||{}; identity=identity||getSystemIdentityData_();
  const namaBidang=norm(bidang.nama_bidang)||norm(rencana&&rencana.id_bidang);
  const group=typeof ppkGroupByBidangNameV102_==='function'?ppkGroupByBidangNameV102_(namaBidang):'';
  const mapped=typeof ppkNameByGroupV102_==='function'?ppkNameByGroupV102_(identity,group):'';
  // Prioritas utama adalah nama yang diinput Admin Porprov pada Struktur Pejabat.
  return norm(mapped)||norm(bidang.pejabat_komitmen)||'';
}

/* =========================================================
   SIMPROV v113 FIX 4 - Finalisasi manual Non Pengadaan
   ========================================================= */
function selesaikanPaketNonPengadaanV116(req){
  const user=req.user||{};
  if(userRole_(user)!=='VERIFIKATOR') return {success:false,message:'Hanya Verifikator yang dapat menyelesaikan paket Non Pengadaan'};
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(publicCategory_(rencana)!=='NON PENGADAAN') return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  if(!canAccessBidang_(user,rencana.id_bidang)) return {success:false,message:'Kegiatan di luar bidang penugasan'};
  const docs=latestRequiredNonDocsV109_(rencana.id_kegiatan);
  const allValid=docs.length===2&&docs.every(function(d){return !!norm(d.url_file)&&upper(d.status_verifikasi)==='VALID DOKUMEN';});
  if(!allValid) return {success:false,message:'Tanda Terima dan Bukti Potong Pajak harus valid terlebih dahulu'};
  const real=existingNonRealV110_(rencana.id_kegiatan);
  const realFinal=real&&['FINAL','DISETUJUI','SELESAI','SAH'].indexOf(upper(real.status))>=0;
  if(!realFinal) return {success:false,message:'Nilai realisasi harus disetujui terlebih dahulu'};
  updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:'SELESAI'});
  const latest=getLatestNonProc_(rencana.id_kegiatan);
  if(latest) updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:'SELESAI'});
  appendLog(user.nama||'Verifikator','SELESAIKAN_PAKET_NON_PENGADAAN',rencana.id_kegiatan,'Dokumen dan nilai realisasi telah valid');
  return {success:true,message:'Paket Non Pengadaan berhasil diselesaikan',status:'SELESAI'};
}

const routeActionV116Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='selesaikanPaketNonPengadaanV116') return selesaikanPaketNonPengadaanV116(req);
  return routeActionV116Base_(a,req);
};
const doPostV116Base_=doPost;
doPost=function(e){
  try{
    const raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}';
    const req=JSON.parse(raw||'{}');
    if(req.action==='selesaikanPaketNonPengadaanV116'){
      return withWriteLock(function(){return out(routeAction_(req.action,req));});
    }
    return doPostV116Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err)});}
};

/* =========================================================
   SIMPROV v118 - FIX pencatatan realisasi Belanja Langsung
   ========================================================= */
function catatBelanjaLangsungV118(req){
  const user=req.user||{};
  if(userRole_(user)!=='BIDANG') return {success:false,message:'Pencatatan realisasi dilakukan oleh User Bidang'};
  const rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana) return {success:false,message:'Kegiatan tidak ditemukan'};
  if(norm(rencana.id_bidang)!==norm(user.id_bidang)) return {success:false,message:'Kegiatan bukan milik bidang ini'};
  if(publicCategory_(rencana)==='NON PENGADAAN') return {success:false,message:'Gunakan menu Pencatatan Non Pengadaan untuk kegiatan ini'};
  if(upper(rencana.status_perencanaan)!=='DISETUJUI') return {success:false,message:'Perencanaan belum disetujui Verifikator'};
  if(upper(rencana.status_pencairan)==='SELESAI') return {success:false,message:'Paket sudah selesai dan tidak dapat diubah'};

  const nilaiRencana=num(rencana.jumlah)||num(rencana.volume)*num(rencana.harga_satuan);
  const nilai=num(req.nilai_realisasi);
  if(nilai<=0) return {success:false,message:'Nilai realisasi wajib diisi'};
  if(nilaiRencana>0&&nilai>nilaiRencana) return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan ('+formatRp(nilaiRencana)+')'};

  const existing=getRows(SH_REALISASI).find(function(x){
    return norm(x.id_kegiatan)===norm(rencana.id_kegiatan)&&['DIBATALKAN','BATAL'].indexOf(upper(x.status))<0;
  });
  if(existing) return {success:false,message:'Realisasi kegiatan ini sudah pernah dicatat'};

  const namaPenyedia=norm(req.nama_penyedia);
  const keterangan=norm(req.keterangan);
  appendByHeader(SH_REALISASI,{
    id_realisasi:'REAL-'+new Date().getTime(),
    id_kegiatan:rencana.id_kegiatan,
    id_bidang:rencana.id_bidang,
    kategori:'PENGADAAN',
    metode:norm(rencana.metode_pemilihan)||'Belanja Langsung',
    nilai_perencanaan:nilaiRencana,
    nilai_realisasi:nilai,
    tanggal_realisasi:new Date(),
    nomor_bukti:norm(req.nomor_bukti),
    keterangan:(namaPenyedia?'Penyedia: '+namaPenyedia+(keterangan?' - ':''):'')+keterangan,
    input_by:norm(user.nama)||norm(user.username),
    tanggal_input:new Date(),
    status:'MENUNGGU VERIFIKASI',
    riwayat_perubahan:''
  });

  upsertPencairan(rencana.id_kegiatan,rencana.id_bidang,'MENUNGGU VERIFIKASI','Realisasi dicatat oleh '+(norm(user.nama)||'User Bidang'));
  setCell(SH_RENCANA,rencana._row,'status_pencairan','MENUNGGU VERIFIKASI');
  appendLog(norm(user.nama)||norm(user.username),'CATAT_REALISASI_PENGADAAN',rencana.id_kegiatan,formatRp(nilai)+(namaPenyedia?' - '+namaPenyedia:''));
  return {success:true,message:'Nilai realisasi berhasil dicatat dan menunggu verifikasi'};
}

const routeActionV118Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='catatBelanjaLangsungV94'||a==='catatBelanjaLangsungV118') return catatBelanjaLangsungV118(req);
  return routeActionV118Base_(a,req);
};

const doPostV118Base_=doPost;
doPost=function(e){
  try{
    const raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}';
    const req=JSON.parse(raw||'{}');
    if(req.action==='catatBelanjaLangsungV94'||req.action==='catatBelanjaLangsungV118'){
      return withWriteLock(function(){return out(routeAction_(req.action,req));});
    }
    return doPostV118Base_(e);
  }catch(err){
    return out({success:false,message:err&&err.message?err.message:String(err)});
  }
};

/* =========================================================
   SIMPROV v119 - Pemeriksaan nilai realisasi Pencatatan Pengadaan
   ========================================================= */
function existingPengadaanRealV119_(idKegiatan){
  var rows=getRows(SH_REALISASI).filter(function(x){
    return norm(x.id_kegiatan)===norm(idKegiatan) && upper(x.kategori)!=='NON PENGADAAN' && ['DIBATALKAN','BATAL'].indexOf(upper(x.status))<0;
  });
  if(!rows.length)return null;
  rows.sort(function(a,b){return num(b._row)-num(a._row);});
  return rows[0];
}
function verifikasiRealisasiPengadaanV119(req){
  var user=req.user||{};
  if(!(isAdminUser(user)||userRole_(user)==='VERIFIKATOR')) return {success:false,message:'Hanya Admin/Verifikator yang dapat memeriksa nilai realisasi'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana)return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!canAccessBidang_(user,rencana.id_bidang))return {success:false,message:'Kegiatan di luar bidang penugasan'};
  var real=existingPengadaanRealV119_(req.id_kegiatan);
  if(!real)return {success:false,message:'Nilai realisasi belum dicatat oleh User Bidang'};
  var keputusan=upper(req.keputusan), now=new Date(), nama=norm(user.nama)||'Verifikator';
  var nilaiRencana=num(rencana.jumlah)||num(rencana.volume)*num(rencana.harga_satuan);
  var riwayat=norm(real.riwayat_perubahan);
  if(keputusan==='SETUJUI'){
    var line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Nilai realisasi disetujui oleh '+nama;
    updateRowFieldsFastV109_(SH_REALISASI,real._row,{status:'FINAL',riwayat_perubahan:riwayat?riwayat+'\n'+line:line});
  }else if(keputusan==='PERBAIKI'){
    var nilai=num(req.nilai_realisasi), catatan=norm(req.catatan);
    if(nilai<=0)return {success:false,message:'Nilai hasil perbaikan wajib diisi'};
    if(nilaiRencana>0&&nilai>nilaiRencana)return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan ('+formatRp(nilaiRencana)+')'};
    if(!catatan)return {success:false,message:'Catatan perbaikan wajib diisi'};
    var line2=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Nilai realisasi diperbaiki dari '+formatRp(num(real.nilai_realisasi))+' menjadi '+formatRp(nilai)+' oleh '+nama+' | '+catatan;
    updateRowFieldsFastV109_(SH_REALISASI,real._row,{nilai_realisasi:nilai,keterangan:catatan,status:'FINAL',riwayat_perubahan:riwayat?riwayat+'\n'+line2:line2});
  }else return {success:false,message:'Keputusan tidak valid'};
  setCell(SH_RENCANA,rencana._row,'status_pencairan','MENUNGGU FINALISASI');
  upsertPencairan(rencana.id_kegiatan,rencana.id_bidang,'MENUNGGU FINALISASI','Nilai realisasi telah diperiksa oleh '+nama);
  appendLog(nama,'VERIFIKASI_REALISASI_PENGADAAN',rencana.id_kegiatan,keputusan);
  return {success:true,message:keputusan==='SETUJUI'?'Nilai realisasi berhasil disetujui':'Nilai realisasi berhasil diperbaiki dan disetujui',status:'MENUNGGU FINALISASI'};
}
const routeActionV119Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='verifikasiRealisasiPengadaanV119')return verifikasiRealisasiPengadaanV119(req);
  return routeActionV119Base_(a,req);
};
const doPostV119Base_=doPost;
doPost=function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}';
    var req=JSON.parse(raw||'{}');
    if(req.action==='verifikasiRealisasiPengadaanV119')return withWriteLock(function(){return out(routeAction_(req.action,req));});
    return doPostV119Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err)});}
};

/* =========================================================
   SIMPROV v133 - Surat, role terpisah, batas upload 2 MB,
   dan alur verifikasi keuangan setelah Verifikator PBJ.
   Patch ini dibangun di atas baseline v131 tanpa mengubah
   struktur sheet dan action lama yang sudah berjalan.
   ========================================================= */
const SH_SURAT_V133 = 'SURAT';
const MAX_UPLOAD_BYTES_V133 = 2 * 1024 * 1024;
const SURAT_HEADERS_V133 = [
  'id_surat','jenis_surat','nomor_surat','tanggal_surat','asal_id_user','asal_nama','asal_role','asal_bidang',
  'tujuan_role','tujuan_id_user','tujuan_bidang','perihal','sifat','klasifikasi','isi_ringkas',
  'status_surat','tahap_surat','current_role','current_id_user','current_bidang','disposisi_catatan',
  'persetujuan_digital','disetujui_oleh','tanggal_persetujuan','nama_file','url_file',
  'created_at','updated_at','riwayat_surat'
];

function ensureSuratSheetV133_(){
  var book=ss(), sheet=book.getSheetByName(SH_SURAT_V133);
  if(!sheet) sheet=book.insertSheet(SH_SURAT_V133);
  if(sheet.getLastRow()<1){sheet.getRange(1,1,1,SURAT_HEADERS_V133.length).setValues([SURAT_HEADERS_V133]);return;}
  var lastCol=Math.max(1,sheet.getLastColumn());
  var hs=sheet.getRange(1,1,1,lastCol).getValues()[0].map(norm);
  if(hs.every(function(x){return !x;})){sheet.getRange(1,1,1,SURAT_HEADERS_V133.length).setValues([SURAT_HEADERS_V133]);return;}
  SURAT_HEADERS_V133.forEach(function(h){if(hs.indexOf(h)<0){sheet.getRange(1,sheet.getLastColumn()+1).setValue(h);hs.push(h);}});
}
function suratRowsV133_(){ensureSuratSheetV133_();return getRows(SH_SURAT_V133);}
function appendSuratV133_(obj){ensureSuratSheetV133_();appendByHeader(SH_SURAT_V133,obj);}
function updateSuratV133_(row,obj){ensureSuratSheetV133_();Object.keys(obj||{}).forEach(function(k){setCell(SH_SURAT_V133,row,k,obj[k]);});}
function roleRawV133_(v){return upper(v).replace(/[\s-]+/g,'_');}
function actualRoleV133_(user){
  var r=roleRawV133_(user&&user.role);
  if(!r) r=roleRawV133_(user&&user.id_bidang);
  if(r==='SUPERADMIN'||r==='SUPER_ADMIN') return 'ADMIN';
  if(r==='VERIFIKATOR'||r==='VERIFIKATOR_PBJ'||r==='VERIF_PBJ'||r==='PBJ') return 'VERIFIKATOR_PBJ';
  if(r==='VERIFIKATOR_KEUANGAN'||r==='VERIF_KEUANGAN'||r==='KEUANGAN') return 'VERIFIKATOR_KEUANGAN';
  if(r==='BENDAHARA') return 'BENDAHARA';
  if(r==='PIMPINAN'||r==='SEKDA'||r==='KETUA_UMUM'||r==='KETUA_HARIAN') return 'PIMPINAN';
  if(r==='AUDITOR') return 'AUDITOR';
  if(r==='ADMIN') return 'ADMIN';
  return 'BIDANG';
}
function userRole_(user){
  var r=actualRoleV133_(user);
  if(r==='VERIFIKATOR_PBJ') return 'VERIFIKATOR';
  return r;
}
function isAdminUser(user){return actualRoleV133_(user)==='ADMIN';}
function isPBJUser_(user){var r=actualRoleV133_(user);return r==='ADMIN'||r==='VERIFIKATOR_PBJ';}
function isKeuanganUser(user){var r=actualRoleV133_(user);return r==='ADMIN'||r==='VERIFIKATOR_KEUANGAN';}
function isReviewerUser(user){var r=actualRoleV133_(user);return r==='PIMPINAN'||r==='AUDITOR';}
function canSeeAllUser(user){var r=actualRoleV133_(user);return ['ADMIN','PIMPINAN','BENDAHARA','AUDITOR'].indexOf(r)>=0;}
function requireKeuangan(user){if(!isPBJUser_(user)) throw new Error('Akses Verifikator PBJ atau Admin diperlukan');}
function canAccessBidang_(user,idBidang){
  var r=actualRoleV133_(user),target=norm(idBidang);
  if(['ADMIN','PIMPINAN','BENDAHARA','AUDITOR'].indexOf(r)>=0) return true;
  if(r==='BIDANG') return norm(user&&user.id_bidang)===target;
  var ids=assignedBidangIds_(user);
  if(ids.indexOf(target)>=0) return true;
  return norm(user&&user.id_bidang)===target;
}
function roleNameUser(user){
  var r=actualRoleV133_(user);
  var labels={ADMIN:'ADMIN',VERIFIKATOR_PBJ:'VERIFIKATOR PBJ',VERIFIKATOR_KEUANGAN:'VERIFIKATOR KEUANGAN',BENDAHARA:'BENDAHARA',PIMPINAN:'PIMPINAN',AUDITOR:'AUDITOR',BIDANG:'BIDANG'};
  return labels[r]||r;
}
function login(req){
  var username=norm(req.username),password=norm(req.password);
  var users=getRows(SH_USER),bidangs=getRows(SH_BIDANG);
  var u=users.find(function(x){return norm(x.username)===username&&norm(x.password)===password;});
  if(!u) return {success:false,message:'Username atau password salah'};
  if(upper(u.status)!=='AKTIF') return {success:false,message:'Akun tidak aktif'};
  var r=actualRoleV133_(u);
  u.role=r;
  if(r!=='BIDANG'){
    var roleLabel=roleNameUser(u);
    u.nama_bidang=roleLabel;
    return {success:true,message:'Login berhasil',user:u,idle_timeout_minutes:30};
  }
  var b=findById(bidangs,'id_bidang',u.id_bidang);
  if(!b) return {success:false,message:'Bidang akun tidak ditemukan di sheet BIDANG'};
  u.nama_bidang=b.nama_bidang;u.pagu=num(b.pagu);u.status_akses=b.status_akses;u.role='BIDANG';
  return {success:true,message:'Login berhasil',user:u,idle_timeout_minutes:30};
}

function normalizeManagedRoleV133_(v){
  var r=roleRawV133_(v);
  if(r==='VERIFIKATOR'||r==='VERIFIKATOR_PBJ'||r==='PBJ') return 'VERIFIKATOR_PBJ';
  if(r==='VERIFIKATOR_KEUANGAN'||r==='VERIF_KEUANGAN'||r==='KEUANGAN') return 'VERIFIKATOR_KEUANGAN';
  if(r==='BENDAHARA') return 'BENDAHARA';
  if(r==='PIMPINAN') return 'PIMPINAN';
  return '';
}
function verifierAccounts_(){
  return getRows(SH_USER).filter(function(u){return ['VERIFIKATOR_PBJ','VERIFIKATOR_KEUANGAN','BENDAHARA','PIMPINAN'].indexOf(actualRoleV133_(u))>=0;});
}
function saveVerifierAccount(req){
  requireAdmin(req.user);
  var d=req.data||req,nama=norm(d.nama),username=norm(d.username),password=norm(d.password),role=normalizeManagedRoleV133_(d.role);
  var ids=Array.isArray(d.bidang_akses)?d.bidang_akses.map(norm).filter(Boolean):norm(d.bidang_akses).split(/[,;|\n]+/).map(norm).filter(Boolean);
  if(!nama||!username||!password||!role) return {success:false,message:'Nama, username, password, dan role wajib diisi'};
  if(['VERIFIKATOR_PBJ','VERIFIKATOR_KEUANGAN'].indexOf(role)>=0&&!ids.length) return {success:false,message:'Pilih minimal satu bidang penugasan untuk role ini'};
  var users=getRows(SH_USER);
  if(users.some(function(u){return norm(u.username).toLowerCase()===username.toLowerCase();})) return {success:false,message:'Username sudah digunakan'};
  var prefix={VERIFIKATOR_PBJ:'PBJ',VERIFIKATOR_KEUANGAN:'KEU',BENDAHARA:'BEN',PIMPINAN:'PIM'}[role]||'USR';
  var count=users.filter(function(u){return actualRoleV133_(u)===role;}).length+1;
  var id='USR-'+prefix+'-'+Utilities.formatString('%03d',count);
  appendByHeader(SH_USER,{id_user:id,nama:nama,username:username,password:password,id_bidang:'',status:'AKTIF',role:role,bidang_akses:ids.join(',')});
  appendLog(req.user.nama,'TAMBAH_AKUN_AKSES',id,role+' | '+ids.join(','));
  return {success:true,message:'Akun '+roleNameUser({role:role})+' berhasil dibuat',id_user:id};
}
function updateVerifierAccount(req){
  requireAdmin(req.user);
  var d=req.data||req,u=findById(getRows(SH_USER),'id_user',d.id_user);
  if(!u) return {success:false,message:'Akun tidak ditemukan'};
  if(['VERIFIKATOR_PBJ','VERIFIKATOR_KEUANGAN','BENDAHARA','PIMPINAN'].indexOf(actualRoleV133_(u))<0) return {success:false,message:'Akun ini tidak dikelola dari menu Manajemen Akses'};
  var role=normalizeManagedRoleV133_(d.role||u.role),ids=Array.isArray(d.bidang_akses)?d.bidang_akses.map(norm).filter(Boolean):norm(d.bidang_akses).split(/[,;|\n]+/).map(norm).filter(Boolean);
  if(!role) return {success:false,message:'Role tidak valid'};
  if(['VERIFIKATOR_PBJ','VERIFIKATOR_KEUANGAN'].indexOf(role)>=0&&!ids.length) return {success:false,message:'Pilih minimal satu bidang penugasan untuk role ini'};
  var username=norm(d.username||u.username),users=getRows(SH_USER);
  if(users.some(function(x){return norm(x.id_user)!==norm(u.id_user)&&norm(x.username).toLowerCase()===username.toLowerCase();})) return {success:false,message:'Username sudah digunakan akun lain'};
  updateRowFieldsFastV109_(SH_USER,u._row,{nama:norm(d.nama||u.nama),username:username,status:upper(d.status||u.status||'AKTIF'),role:role,bidang_akses:ids.join(',')});
  if(norm(d.password)) setCell(SH_USER,u._row,'password',norm(d.password));
  appendLog(req.user.nama,'UPDATE_AKUN_AKSES',u.id_user,role+' | '+ids.join(','));
  return {success:true,message:'Akun berhasil diperbarui'};
}

function estimateBase64BytesV133_(s){
  var str=String(s||'').replace(/^data:[^,]+,/,'').replace(/\s/g,'');
  if(!str) return 0;
  var pad=(str.match(/=*$/)||[''])[0].length;
  return Math.max(0,Math.floor(str.length*3/4)-pad);
}
function assertUploadLimitV133_(req){
  if(!req||!req.file_base64) return;
  var bytes=estimateBase64BytesV133_(req.file_base64);
  if(bytes>MAX_UPLOAD_BYTES_V133) throw new Error('Ukuran file maksimal 2 MB. Kompres atau perkecil file sebelum diunggah.');
}
function suratHistoryLineV133_(user,text){
  return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - '+(norm(user&&user.nama)||norm(user&&user.username)||'Sistem')+': '+text;
}
function suratStatusLabelV133_(s){return upper(s||'DRAFT');}
function canReadSuratV133_(user,s){
  var r=actualRoleV133_(user),uid=norm(user&&user.id_user),idb=norm(user&&user.id_bidang);
  if(r==='ADMIN'||r==='PIMPINAN'||r==='AUDITOR') return true;
  if(norm(s.asal_id_user)===uid) return true;
  if(norm(s.current_id_user)&&norm(s.current_id_user)===uid) return true;
  if(upper(s.current_role)===r) return true;
  if(r==='BIDANG'&&norm(s.current_bidang)===idb) return true;
  if(r==='BENDAHARA'&&upper(s.status_surat).indexOf('BENDAHARA')>=0) return true;
  if(r==='VERIFIKATOR_KEUANGAN'&&upper(s.status_surat).indexOf('KEUANGAN')>=0) return true;
  return false;
}
function getSuratWorkspaceV133(req){
  var user=req.user||{},rows=suratRowsV133_().filter(function(s){return canReadSuratV133_(user,s);});
  rows.sort(function(a,b){return num(new Date(b.updated_at).getTime())-num(new Date(a.updated_at).getTime())||num(b._row)-num(a._row);});
  return {success:true,surat:rows,bidangs:getRows(SH_BIDANG).map(function(b){return {id_bidang:b.id_bidang,nama_bidang:b.nama_bidang};}),server_time:new Date()};
}
function saveSuratV133(req){
  var user=req.user||{},d=req.data||req,submit=!!d.submit,id=norm(d.id_surat),existing=id?findById(suratRowsV133_(),'id_surat',id):null;
  var now=new Date(),role=actualRoleV133_(user),perihal=norm(d.perihal),isi=norm(d.isi_ringkas),nomor=norm(d.nomor_surat),tanggal=norm(d.tanggal_surat),klasifikasi=upper(d.klasifikasi||'UMUM'),sifat=upper(d.sifat||'BIASA');
  if(!perihal||!isi) return {success:false,message:'Perihal dan isi/ringkasan Nota Dinas wajib diisi'};
  if(submit&&!nomor) return {success:false,message:'Nomor Nota Dinas wajib diisi sebelum diajukan'};
  if(submit&&!tanggal) return {success:false,message:'Tanggal Nota Dinas wajib diisi sebelum diajukan'};
  assertUploadLimitV133_(d);
  var fileName='',fileUrl='';
  if(d.file_base64){
    var root=DriveApp.getFolderById(DRIVE_FOLDER_ID),folder=getOrCreateFolder(root,'SURAT SIMPROV');
    var blob=Utilities.newBlob(Utilities.base64Decode(String(d.file_base64).replace(/^data:[^,]+,/,'')),d.mime_type||'application/octet-stream',d.file_name||'lampiran');
    var file=folder.createFile(blob);try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
    fileName=d.file_name||file.getName();fileUrl=file.getUrl();
  }
  if(existing){
    if(norm(existing.asal_id_user)!==norm(user.id_user)&&role!=='ADMIN') return {success:false,message:'Surat ini tidak dapat diubah oleh akun Anda'};
    if(['DRAFT','PERLU PERBAIKAN'].indexOf(upper(existing.status_surat))<0) return {success:false,message:'Surat yang sudah diproses tidak dapat diedit'};
    var hist=norm(existing.riwayat_surat),line=suratHistoryLineV133_(user,submit?'Nota Dinas diajukan kembali kepada Pimpinan':'Draft Nota Dinas diperbarui');
    var upd={nomor_surat:nomor,tanggal_surat:tanggal,perihal:perihal,sifat:sifat,klasifikasi:klasifikasi,isi_ringkas:isi,status_surat:submit?'DIAJUKAN KE PIMPINAN':'DRAFT',tahap_surat:submit?'PENGAJUAN':'DRAFT',current_role:submit?'PIMPINAN':role,current_id_user:submit?'':norm(user.id_user),current_bidang:submit?'':norm(user.id_bidang),updated_at:now,riwayat_surat:hist?hist+'\n'+line:line};
    if(fileUrl){upd.nama_file=fileName;upd.url_file=fileUrl;}
    updateSuratV133_(existing._row,upd);
    return {success:true,message:submit?'Nota Dinas berhasil diajukan kepada Pimpinan':'Draft Nota Dinas berhasil disimpan',id_surat:existing.id_surat,status_surat:upd.status_surat};
  }
  id='SRT-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMddHHmmss')+'-'+Math.floor(Math.random()*900+100);
  var status=submit?'DIAJUKAN KE PIMPINAN':'DRAFT';
  appendSuratV133_({id_surat:id,jenis_surat:'NOTA DINAS',nomor_surat:nomor,tanggal_surat:tanggal,asal_id_user:norm(user.id_user),asal_nama:norm(user.nama)||norm(user.username),asal_role:role,asal_bidang:norm(user.id_bidang),tujuan_role:'PIMPINAN',tujuan_id_user:'',tujuan_bidang:'',perihal:perihal,sifat:sifat,klasifikasi:klasifikasi,isi_ringkas:isi,status_surat:status,tahap_surat:submit?'PENGAJUAN':'DRAFT',current_role:submit?'PIMPINAN':role,current_id_user:submit?'':norm(user.id_user),current_bidang:submit?'':norm(user.id_bidang),disposisi_catatan:'',persetujuan_digital:'',disetujui_oleh:'',tanggal_persetujuan:'',nama_file:fileName,url_file:fileUrl,created_at:now,updated_at:now,riwayat_surat:suratHistoryLineV133_(user,submit?'Nota Dinas dibuat dan diajukan kepada Pimpinan':'Draft Nota Dinas dibuat')});
  appendLog(norm(user.nama),'BUAT_NOTA_DINAS',id,status);
  return {success:true,message:submit?'Nota Dinas berhasil diajukan kepada Pimpinan':'Draft Nota Dinas berhasil disimpan',id_surat:id,status_surat:status};
}
function actionSuratV133(req){
  var user=req.user||{},r=actualRoleV133_(user),s=findById(suratRowsV133_(),'id_surat',req.id_surat);
  if(!s) return {success:false,message:'Surat tidak ditemukan'};
  if(!canReadSuratV133_(user,s)) return {success:false,message:'Anda tidak memiliki akses ke surat ini'};
  var action=upper(req.keputusan),catatan=norm(req.catatan),targetBidang=norm(req.tujuan_bidang),now=new Date(),hist=norm(s.riwayat_surat),upd={updated_at:now};
  function addHistory(text){var line=suratHistoryLineV133_(user,text);upd.riwayat_surat=hist?hist+'\n'+line:line;}
  if(action==='SETUJUI_DAN_DISPOSISI'){
    if(r!=='PIMPINAN'&&r!=='ADMIN') return {success:false,message:'Hanya Pimpinan yang dapat menyetujui Nota Dinas'};
    if(upper(s.status_surat)!=='DIAJUKAN KE PIMPINAN') return {success:false,message:'Surat tidak sedang menunggu persetujuan Pimpinan'};
    if(upper(s.klasifikasi)==='PENCAIRAN'){
      upd.status_surat='DIDISPOSISIKAN KE VERIFIKATOR KEUANGAN';upd.tahap_surat='DISPOSISI';upd.current_role='VERIFIKATOR_KEUANGAN';upd.current_id_user='';upd.current_bidang='';upd.tujuan_role='VERIFIKATOR_KEUANGAN';
    }else{
      if(!targetBidang) return {success:false,message:'Pilih bidang tujuan disposisi'};
      upd.status_surat='DIDISPOSISIKAN KE BIDANG';upd.tahap_surat='DISPOSISI';upd.current_role='BIDANG';upd.current_id_user='';upd.current_bidang=targetBidang;upd.tujuan_role='BIDANG';upd.tujuan_bidang=targetBidang;
    }
    upd.disposisi_catatan=catatan;upd.persetujuan_digital='DISETUJUI SECARA ELEKTRONIK DI SIMPROV';upd.disetujui_oleh=norm(user.nama)||'Pimpinan';upd.tanggal_persetujuan=now;addHistory('Nota Dinas disetujui secara elektronik dan didisposisikan'+(catatan?' | '+catatan:''));
  }else if(action==='KEMBALIKAN'){
    if(['PIMPINAN','VERIFIKATOR_KEUANGAN','BENDAHARA','ADMIN'].indexOf(r)<0) return {success:false,message:'Role Anda tidak dapat mengembalikan surat'};
    if(!catatan) return {success:false,message:'Catatan perbaikan wajib diisi'};
    upd.status_surat='PERLU PERBAIKAN';upd.tahap_surat='PERBAIKAN';upd.current_role=upper(s.asal_role)||'BIDANG';upd.current_id_user=norm(s.asal_id_user);upd.current_bidang=norm(s.asal_bidang);upd.disposisi_catatan=catatan;addHistory('Surat dikembalikan untuk perbaikan | '+catatan);
  }else if(action==='TERUSKAN_KE_BENDAHARA'){
    if(r!=='VERIFIKATOR_KEUANGAN'&&r!=='ADMIN') return {success:false,message:'Hanya Verifikator Keuangan yang dapat meneruskan ke Bendahara'};
    if(upper(s.status_surat)!=='DIDISPOSISIKAN KE VERIFIKATOR KEUANGAN') return {success:false,message:'Surat belum berada pada Verifikator Keuangan'};
    upd.status_surat='DITERUSKAN KE BENDAHARA';upd.tahap_surat='TINDAK LANJUT';upd.current_role='BENDAHARA';upd.current_id_user='';upd.current_bidang='';upd.tujuan_role='BENDAHARA';upd.disposisi_catatan=catatan;addHistory('Surat diverifikasi dan diteruskan kepada Bendahara'+(catatan?' | '+catatan:''));
  }else if(action==='SELESAIKAN'){
    var allowed=(r==='BENDAHARA'&&upper(s.current_role)==='BENDAHARA')||(r==='BIDANG'&&upper(s.current_role)==='BIDANG'&&norm(s.current_bidang)===norm(user.id_bidang))||r==='ADMIN';
    if(!allowed) return {success:false,message:'Surat belum menjadi tugas akun Anda'};
    upd.status_surat='SELESAI';upd.tahap_surat='SELESAI';upd.current_role='';upd.current_id_user='';upd.current_bidang='';upd.disposisi_catatan=catatan;addHistory('Tindak lanjut surat dinyatakan selesai'+(catatan?' | '+catatan:''));
  }else return {success:false,message:'Keputusan surat tidak dikenali'};
  updateSuratV133_(s._row,upd);appendLog(norm(user.nama),'PROSES_SURAT',s.id_surat,action);
  return {success:true,message:'Status surat berhasil diperbarui',status_surat:upd.status_surat};
}

function existingFinalRealV133_(id){
  return getRowsOptional_(SH_REALISASI).filter(function(x){return norm(x.id_kegiatan)===norm(id)&&['FINAL','DISETUJUI','SELESAI','SAH'].indexOf(upper(x.status))>=0;}).sort(function(a,b){return num(b._row)-num(a._row);})[0]||null;
}
function validatePaketFinanceV133_(rencana){
  var prog=progressDokumenWajibV71_(rencana.id_kegiatan);
  if(!prog.allUploaded) return 'Dokumen wajib belum lengkap ('+prog.uploaded+'/'+prog.requiredCount+')';
  if(!prog.allValid) return 'Seluruh dokumen wajib harus valid terlebih dahulu';
  if(!existingFinalRealV133_(rencana.id_kegiatan)) return 'Nilai realisasi belum disetujui Verifikator PBJ';
  return '';
}
var updateStatusPencairanV131BaseV133_=updateStatusPencairan;
updateStatusPencairan=function(req){
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan),role=actualRoleV133_(req.user),status=upper(req.status_pencairan);
  if(rencana&&status==='SELESAI'&&publicCategory_(rencana)!=='NON PENGADAAN'&&upper(rencana.metode_pemilihan).indexOf('PENGADAAN LANGSUNG')>=0){
    if(role!=='VERIFIKATOR_PBJ'&&role!=='ADMIN') return {success:false,message:'Finalisasi tahap PBJ hanya dapat dilakukan oleh Verifikator PBJ'};
    if(!canAccessBidang_(req.user,rencana.id_bidang)) return {success:false,message:'Kegiatan di luar bidang penugasan'};
    var err=validatePaketFinanceV133_(rencana);if(err)return {success:false,message:err};
    var next='MENUNGGU VERIFIKASI KEUANGAN';
    updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:next});
    upsertPencairan(rencana.id_kegiatan,rencana.id_bidang,next,norm(req.catatan_admin)||'Dokumen dan nilai realisasi telah diverifikasi PBJ');
    appendLog(norm(req.user.nama),'FINALISASI_PBJ_KE_KEUANGAN',rencana.id_kegiatan,next);
    return {success:true,message:'Verifikasi PBJ selesai. Paket diteruskan ke Verifikator Keuangan.',status:next};
  }
  return updateStatusPencairanV131BaseV133_(req);
};
function verifikasiKeuanganPaketV133(req){
  var role=actualRoleV133_(req.user),rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(role!=='VERIFIKATOR_KEUANGAN'&&role!=='ADMIN') return {success:false,message:'Akses Verifikator Keuangan diperlukan'};
  if(!rencana)return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!canAccessBidang_(req.user,rencana.id_bidang))return {success:false,message:'Kegiatan di luar bidang penugasan'};
  if(upper(rencana.status_pencairan)!=='MENUNGGU VERIFIKASI KEUANGAN')return {success:false,message:'Paket belum berada pada tahap Verifikator Keuangan'};
  var keputusan=upper(req.keputusan),catatan=norm(req.catatan);
  if(keputusan==='SETUJUI'){
    updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:'MENUNGGU BENDAHARA'});upsertPencairan(rencana.id_kegiatan,rencana.id_bidang,'MENUNGGU BENDAHARA',catatan||'Disetujui Verifikator Keuangan');appendLog(norm(req.user.nama),'VERIFIKASI_KEUANGAN',rencana.id_kegiatan,'SETUJUI');
    return {success:true,message:'Paket disetujui dan diteruskan ke Bendahara',status:'MENUNGGU BENDAHARA'};
  }
  if(keputusan==='KEMBALIKAN'){
    if(!catatan)return {success:false,message:'Catatan pengembalian wajib diisi'};
    updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:'MENUNGGU FINALISASI'});upsertPencairan(rencana.id_kegiatan,rencana.id_bidang,'MENUNGGU FINALISASI',catatan);appendLog(norm(req.user.nama),'VERIFIKASI_KEUANGAN',rencana.id_kegiatan,'KEMBALIKAN | '+catatan);
    return {success:true,message:'Paket dikembalikan kepada Verifikator PBJ',status:'MENUNGGU FINALISASI'};
  }
  return {success:false,message:'Keputusan tidak valid'};
}
function selesaikanPembayaranPaketV133(req){
  var role=actualRoleV133_(req.user),rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(role!=='BENDAHARA'&&role!=='ADMIN')return {success:false,message:'Akses Bendahara diperlukan'};
  if(!rencana)return {success:false,message:'Kegiatan tidak ditemukan'};
  if(upper(rencana.status_pencairan)!=='MENUNGGU BENDAHARA')return {success:false,message:'Paket belum diteruskan kepada Bendahara'};
  updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:'SELESAI'});upsertPencairan(rencana.id_kegiatan,rencana.id_bidang,'SELESAI',norm(req.catatan)||'Pembayaran diselesaikan Bendahara');appendLog(norm(req.user.nama),'SELESAI_BENDAHARA',rencana.id_kegiatan,norm(req.catatan));
  return {success:true,message:'Pembayaran paket telah diselesaikan',status:'SELESAI'};
}
var computeStatusPencairanKeuanganV131BaseV133_=computeStatusPencairanKeuangan_;
computeStatusPencairanKeuangan_=function(idKegiatan){
  var r=findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan),st=upper(r&&r.status_pencairan);
  if(['MENUNGGU VERIFIKASI KEUANGAN','MENUNGGU BENDAHARA','PERBAIKAN KEUANGAN','SELESAI'].indexOf(st)>=0)return st;
  return computeStatusPencairanKeuanganV131BaseV133_(idKegiatan);
};

var routeActionV133Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='getSuratWorkspaceV133')return getSuratWorkspaceV133(req);
  if(a==='saveSuratV133')return saveSuratV133(req);
  if(a==='actionSuratV133')return actionSuratV133(req);
  if(a==='verifikasiKeuanganPaketV133')return verifikasiKeuanganPaketV133(req);
  if(a==='selesaikanPembayaranPaketV133')return selesaikanPembayaranPaketV133(req);
  return routeActionV133Base_(a,req);
};
var doPostV133Base_=doPost;
doPost=function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}'),a=req.action||'';
    if(req.file_base64)assertUploadLimitV133_(req);
    var writeActions=['saveSuratV133','actionSuratV133','verifikasiKeuanganPaketV133','selesaikanPembayaranPaketV133'];
    if(writeActions.indexOf(a)>=0)return withWriteLock(function(){return out(routeAction_(a,req));});
    return doPostV133Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err),stack:err&&err.stack?err.stack:''});}
};

/* =========================================================
   SIMPROV v135 - Upload paralel aman + folder cache + dokumen duplikat
   ========================================================= */
var dokumenKetentuanByNilaiV135Base_ = dokumenKetentuanByNilai;
dokumenKetentuanByNilai = function(jumlah){
  var duplicate=docTypeKeyServer('Bukti Pembelian / Kwitansi');
  return dokumenKetentuanByNilaiV135Base_(jumlah).filter(function(x){return docTypeKeyServer(x)!==duplicate;});
};

function folderCacheKeyV135_(parentId,name){
  var raw='FOLDER_V135|'+norm(parentId)+'|'+norm(name);
  var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,raw,Utilities.Charset.UTF_8);
  return 'F135_'+digest.map(function(b){var v=(b+256)%256;return ('0'+v.toString(16)).slice(-2);}).join('');
}
var getOrCreateFolderV135Base_ = getOrCreateFolder;
getOrCreateFolder = function(parent,name){
  var cache=CacheService.getScriptCache(),key=folderCacheKeyV135_(parent.getId(),name),cached=cache.get(key);
  if(cached){try{return DriveApp.getFolderById(cached);}catch(e){cache.remove(key);}}
  var lock=LockService.getScriptLock();
  try{
    lock.waitLock(12000);
    cached=cache.get(key);
    if(cached){try{return DriveApp.getFolderById(cached);}catch(e2){cache.remove(key);}}
    var it=parent.getFoldersByName(name),folder=it.hasNext()?it.next():parent.createFolder(name);
    cache.put(key,folder.getId(),21600);
    return folder;
  }finally{try{lock.releaseLock();}catch(e3){}}
};
function withShortWriteLockV135_(fn){
  var lock=LockService.getScriptLock();
  try{lock.waitLock(20000);return fn();}
  finally{try{lock.releaseLock();}catch(e){}}
}
function uploadDokumenV135_(req){
  assertUploadLimitV133_(req);
  var user=req.user||{};
  if(isAdminUser(user))return {success:false,message:'Admin tidak boleh upload dokumen bidang'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana)return {success:false,message:'Kegiatan tidak ditemukan'};
  if(norm(rencana.id_bidang)!==norm(user.id_bidang))return {success:false,message:'Kegiatan bukan milik bidang ini'};
  if(upper(rencana.status_perencanaan)!=='DISETUJUI')return {success:false,message:'Dokumen hanya bisa diupload untuk kegiatan yang sudah DISETUJUI'};
  var allowed=dokumenKetentuanByNilai(rencana.jumlah||(num(rencana.volume)*num(rencana.harga_satuan))),jenis=norm(req.jenis_dokumen);
  if(allowed.indexOf(jenis)<0)return {success:false,message:'Jenis dokumen tidak sesuai ketentuan metode pemilihan. Dokumen yang diperbolehkan: '+allowed.join(', ')};
  if(!req.file_base64)return {success:false,message:'File kosong'};
  var root=DriveApp.getFolderById(DRIVE_FOLDER_ID),bidangFolder=getOrCreateFolder(root,norm(user.id_bidang)+' - '+(user.nama_bidang||user.nama||'Bidang'));
  var kegFolder=getOrCreateFolder(bidangFolder,norm(req.id_kegiatan)+' - '+safeName(rencana.nama_kegiatan));
  var blob=Utilities.newBlob(Utilities.base64Decode(String(req.file_base64).replace(/^data:[^,]+,/,'')),req.mime_type||'application/octet-stream',req.file_name||'dokumen');
  var file=kegFolder.createFile(blob),shareNote='';
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(shareErr){shareNote=' Catatan: file berhasil diupload, tetapi izin link mengikuti kebijakan Google Drive.';}
  try{
    return withShortWriteLockV135_(function(){
      var duplicate=getRows(SH_DOKUMEN).some(function(x){return norm(x.id_kegiatan)===norm(req.id_kegiatan)&&docTypeKeyServer(x.jenis_dokumen)===docTypeKeyServer(jenis);});
      if(duplicate){try{file.setTrashed(true);}catch(e){}return {success:false,message:'Jenis dokumen ini sudah pernah diupload. Gunakan Upload Ulang jika dokumen perlu diperbaiki.'};}
      var now=new Date(),idDok='DOK-'+now.getTime()+'-'+Math.floor(Math.random()*100000),history='Upload awal: '+Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' oleh '+(user.nama||'');
      var doc={id_dokumen:idDok,id_kegiatan:req.id_kegiatan,id_bidang:user.id_bidang,jenis_dokumen:jenis||'Dokumen Lainnya',nama_file:req.file_name||'',url_file:file.getUrl(),tanggal_upload:now,upload_by:user.nama||'',status_verifikasi:'MENUNGGU VERIFIKASI DOKUMEN',catatan_admin:'',tanggal_verifikasi:'',verifikasi_by:'',tanggal_revisi:'',revisi_by:'',riwayat_dokumen:history};
      appendByHeader(SH_DOKUMEN,doc);
      upsertPencairan(req.id_kegiatan,user.id_bidang,'MENUNGGU VERIFIKASI DOKUMEN','');
      var pr=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);if(pr)setCell(SH_RENCANA,pr._row,'status_pencairan','MENUNGGU VERIFIKASI DOKUMEN');
      appendLog(user.nama,'UPLOAD_DOKUMEN',req.id_kegiatan,jenis);
      return {success:true,message:'Dokumen berhasil diupload.'+shareNote,url:file.getUrl(),dokumen:doc};
    });
  }catch(err){try{file.setTrashed(true);}catch(e4){}throw err;}
}
function uploadDokumenNonPengadaanV135_(req){
  assertUploadLimitV133_(req);
  var user=req.user||{},allowed=['Tanda Terima','Bukti Potong Pajak'],jenis=norm(req.jenis_dokumen);
  if(allowed.indexOf(jenis)<0)return {success:false,message:'Dokumen Non Pengadaan hanya Tanda Terima dan Bukti Potong Pajak'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!req.file_base64)return {success:false,message:'File kosong'};
  var root=DriveApp.getFolderById(DRIVE_FOLDER_ID),bidangFolder=getOrCreateFolder(root,norm(rencana.id_bidang)+' - '+safeName(rencana.id_bidang));
  var npFolder=getOrCreateFolder(bidangFolder,'NON PENGADAAN'),kegFolder=getOrCreateFolder(npFolder,norm(rencana.id_kegiatan)+' - '+safeName(rencana.nama_kegiatan));
  var blob=Utilities.newBlob(Utilities.base64Decode(String(req.file_base64).replace(/^data:[^,]+,/,'')),req.mime_type||'application/octet-stream',req.file_name||'dokumen');
  var file=kegFolder.createFile(blob);try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  try{
    return withShortWriteLockV135_(function(){
      var latest=ensureNonProcRecord_(rencana,user),now=new Date(),id='DNP-'+now.getTime()+'-'+Math.floor(Math.random()*100000);
      var doc={id_dokumen_non:id,id_non_pengadaan:latest.id_non_pengadaan,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,jenis_dokumen:jenis,nama_file:req.file_name||'',url_file:file.getUrl(),tanggal_upload:now,upload_by:user.nama||'',status_verifikasi:'MENUNGGU VERIFIKASI DOKUMEN',catatan_verifikator:'',tanggal_verifikasi:'',verifikasi_by:'',riwayat_dokumen:'Upload awal oleh '+(user.nama||'')};
      appendByHeader(SH_DOKUMEN_NON_PENGADAAN,doc);appendLog(user.nama,'UPLOAD_DOKUMEN_NON_PENGADAAN',rencana.id_kegiatan,jenis);
      return {success:true,message:'Dokumen Non Pengadaan berhasil diupload',url:file.getUrl(),dokumen:doc};
    });
  }catch(err){try{file.setTrashed(true);}catch(e2){}throw err;}
}

var routeActionV135Base_ = routeAction_;
routeAction_ = function(a,req){
  if(a==='uploadDokumen')return uploadDokumenV135_(req);
  if(a==='uploadDokumenNonPengadaan')return uploadDokumenNonPengadaanV135_(req);
  return routeActionV135Base_(a,req);
};
var doPostV135Base_ = doPost;
doPost = function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}'),a=req.action||'';
    if(a==='uploadDokumen'||a==='uploadDokumenNonPengadaan'){
      assertUploadLimitV133_(req);
      return out(routeAction_(a,req));
    }
    return doPostV135Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err),stack:err&&err.stack?err.stack:''});}
};

/* =========================================================
   SIMPROV v136 - Penyempurnaan Surat, TTD pengirim,
   klasifikasi gabungan, dan nama pimpinan per bidang.
   ========================================================= */
const SURAT_HEADERS_V136 = [
  'pengirim_ttd_nama','pengirim_ttd_digital','tanggal_ttd_pengirim',
  'tindak_lanjut_bidang','tindak_lanjut_keuangan','catatan_bidang','catatan_keuangan'
];
const BIDANG_PIMPINAN_HEADER_V136 = 'nama_pimpinan_bidang';

function ensureExtraHeadersV136_(sheetName, headers){
  var sheet=sh(sheetName),lastCol=Math.max(1,sheet.getLastColumn());
  var existing=sheet.getRange(1,1,1,lastCol).getValues()[0].map(norm);
  headers.forEach(function(h){
    if(existing.indexOf(h)<0){sheet.getRange(1,sheet.getLastColumn()+1).setValue(h);existing.push(h);}
  });
}
function ensureSuratV136Headers_(){ensureSuratSheetV133_();ensureExtraHeadersV136_(SH_SURAT_V133,SURAT_HEADERS_V136);}
function ensureBidangPimpinanV136_(){ensureExtraHeadersV136_(SH_BIDANG,[BIDANG_PIMPINAN_HEADER_V136]);}
function klasifikasiGabunganV136_(v){var k=upper(v).replace(/[+&]/g,' DAN ').replace(/\s+/g,' ');return k==='UMUM DAN PENCAIRAN'||k==='UMUM_DAN_PENCAIRAN'||k==='GABUNGAN';}
function roleListV136_(v){return upper(v).split(/[,;+|]/).map(function(x){return norm(x);}).filter(Boolean);}
function addSuratHistoryV136_(existing,user,text){var hist=norm(existing&&existing.riwayat_surat),line=suratHistoryLineV133_(user,text);return hist?hist+'\n'+line:line;}
function pimpinanBidangNameV136_(idBidang,fallback){
  ensureBidangPimpinanV136_();
  var b=findById(getRows(SH_BIDANG),'id_bidang',idBidang);
  return norm(b&&b.nama_pimpinan_bidang)||norm(fallback)||'Belum diatur';
}

function savePimpinanBidangV136(req){
  requireAdmin(req.user);
  ensureBidangPimpinanV136_();
  var items=(req.data&&req.data.items)||req.items||[];
  if(!Array.isArray(items)||!items.length)return {success:false,message:'Data nama pimpinan bidang belum diisi'};
  var sheet=sh(SH_BIDANG),lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
  if(lastRow<2)return {success:false,message:'Data bidang belum tersedia'};
  var headers=sheet.getRange(1,1,1,lastCol).getValues()[0].map(norm),idCol=headers.indexOf('id_bidang'),nameCol=headers.indexOf(BIDANG_PIMPINAN_HEADER_V136);
  if(idCol<0||nameCol<0)return {success:false,message:'Kolom bidang tidak ditemukan'};
  var values=sheet.getRange(2,1,lastRow-1,lastCol).getValues(),map={};
  items.forEach(function(x){map[norm(x.id_bidang)]=norm(x.nama_pimpinan);});
  var changed=0;
  values.forEach(function(row){var id=norm(row[idCol]);if(Object.prototype.hasOwnProperty.call(map,id)){row[nameCol]=map[id];changed++;}});
  sheet.getRange(2,1,values.length,lastCol).setValues(values);
  appendLog(norm(req.user&&req.user.nama),'UPDATE_PIMPINAN_BIDANG','BIDANG',changed+' bidang diperbarui');
  return {success:true,message:'Nama pimpinan bidang berhasil disimpan',updated:changed};
}

var getSuratWorkspaceV133BaseV136_=getSuratWorkspaceV133;
getSuratWorkspaceV133=function(req){
  ensureSuratV136Headers_();ensureBidangPimpinanV136_();
  var result=getSuratWorkspaceV133BaseV136_(req);
  result.bidangs=getRows(SH_BIDANG).map(function(b){return {id_bidang:b.id_bidang,nama_bidang:b.nama_bidang,nama_pimpinan_bidang:norm(b.nama_pimpinan_bidang)};});
  return result;
};

var saveSuratV133BaseV136_=saveSuratV133;
saveSuratV133=function(req){
  ensureSuratV136Headers_();ensureBidangPimpinanV136_();
  var d=req.data||req,result=saveSuratV133BaseV136_(req);
  if(result&&result.success&&d.submit){
    var s=findById(suratRowsV133_(),'id_surat',result.id_surat);
    if(s){
      var nama=pimpinanBidangNameV136_(s.asal_bidang,req.user&&req.user.nama);
      updateSuratV133_(s._row,{pengirim_ttd_nama:nama,pengirim_ttd_digital:'DITANDATANGANI SECARA ELEKTRONIK MELALUI SIMPROV',tanggal_ttd_pengirim:new Date()});
    }
  }
  return result;
};

var canReadSuratV133BaseV136_=canReadSuratV133_;
canReadSuratV133_=function(user,s){
  if(canReadSuratV133BaseV136_(user,s))return true;
  var r=actualRoleV133_(user),roles=roleListV136_(s.current_role);
  if(roles.indexOf(r)>=0)return true;
  if(r==='BIDANG'&&roles.indexOf('BIDANG')>=0&&norm(s.current_bidang)===norm(user&&user.id_bidang))return true;
  return false;
};

var actionSuratV133BaseV136_=actionSuratV133;
actionSuratV133=function(req){
  ensureSuratV136Headers_();
  var s=findById(suratRowsV133_(),'id_surat',req.id_surat);
  if(!s||!klasifikasiGabunganV136_(s.klasifikasi))return actionSuratV133BaseV136_(req);
  var user=req.user||{},r=actualRoleV133_(user),action=upper(req.keputusan),catatan=norm(req.catatan),targetBidang=norm(req.tujuan_bidang),now=new Date(),upd={updated_at:now};
  if(!canReadSuratV133_(user,s))return {success:false,message:'Anda tidak memiliki akses ke surat ini'};
  if(action==='SETUJUI_DAN_DISPOSISI'){
    if(r!=='PIMPINAN'&&r!=='ADMIN')return {success:false,message:'Hanya Pimpinan yang dapat menyetujui Nota Dinas'};
    if(upper(s.status_surat)!=='DIAJUKAN KE PIMPINAN')return {success:false,message:'Surat tidak sedang menunggu persetujuan Pimpinan'};
    if(!targetBidang)return {success:false,message:'Pilih bidang tujuan disposisi umum'};
    upd.status_surat='DIDISPOSISIKAN KE BIDANG DAN VERIFIKATOR KEUANGAN';upd.tahap_surat='DISPOSISI';upd.current_role='BIDANG,VERIFIKATOR_KEUANGAN';upd.current_id_user='';upd.current_bidang=targetBidang;upd.tujuan_role='BIDANG + VERIFIKATOR_KEUANGAN';upd.tujuan_bidang=targetBidang;upd.tindak_lanjut_bidang='MENUNGGU TINDAK LANJUT';upd.tindak_lanjut_keuangan='MENUNGGU VERIFIKASI';upd.disposisi_catatan=catatan;upd.persetujuan_digital='DISETUJUI SECARA ELEKTRONIK DI SIMPROV';upd.disetujui_oleh=norm(user.nama)||'Pimpinan';upd.tanggal_persetujuan=now;upd.riwayat_surat=addSuratHistoryV136_(s,user,'Nota Dinas disetujui dan didisposisikan ke bidang serta Verifikator Keuangan'+(catatan?' | '+catatan:''));
  }else if(action==='TERUSKAN_KE_BENDAHARA'){
    if(r!=='VERIFIKATOR_KEUANGAN'&&r!=='ADMIN')return {success:false,message:'Hanya Verifikator Keuangan yang dapat meneruskan ke Bendahara'};
    if(upper(s.tindak_lanjut_keuangan)==='SELESAI')return {success:false,message:'Tindak lanjut keuangan sudah selesai'};
    upd.tindak_lanjut_keuangan='MENUNGGU BENDAHARA';upd.catatan_keuangan=catatan;upd.current_role=upper(s.tindak_lanjut_bidang)==='SELESAI'?'BENDAHARA':'BIDANG,BENDAHARA';upd.status_surat='DITINDAKLANJUTI BIDANG DAN DITERUSKAN KE BENDAHARA';upd.tahap_surat='TINDAK LANJUT';upd.riwayat_surat=addSuratHistoryV136_(s,user,'Jalur pencairan diverifikasi dan diteruskan kepada Bendahara'+(catatan?' | '+catatan:''));
  }else if(action==='SELESAIKAN_BIDANG'||(action==='SELESAIKAN'&&r==='BIDANG')){
    if(r!=='BIDANG'&&r!=='ADMIN')return {success:false,message:'Tindak lanjut bidang hanya dapat diselesaikan oleh bidang tujuan'};
    if(r==='BIDANG'&&norm(s.current_bidang)!==norm(user.id_bidang))return {success:false,message:'Surat bukan disposisi untuk bidang Anda'};
    upd.tindak_lanjut_bidang='SELESAI';upd.catatan_bidang=catatan;
    var keuDone=upper(s.tindak_lanjut_keuangan)==='SELESAI';
    upd.status_surat=keuDone?'SELESAI':'TINDAK LANJUT BIDANG SELESAI - MENUNGGU PENCAIRAN';upd.tahap_surat=keuDone?'SELESAI':'TINDAK LANJUT';upd.current_role=keuDone?'':(upper(s.tindak_lanjut_keuangan)==='MENUNGGU BENDAHARA'?'BENDAHARA':'VERIFIKATOR_KEUANGAN');upd.current_bidang=keuDone?'':s.current_bidang;upd.riwayat_surat=addSuratHistoryV136_(s,user,'Tindak lanjut bidang dinyatakan selesai'+(catatan?' | '+catatan:''));
  }else if(action==='SELESAIKAN_KEUANGAN'||(action==='SELESAIKAN'&&r==='BENDAHARA')){
    if(r!=='BENDAHARA'&&r!=='ADMIN')return {success:false,message:'Tindak lanjut pencairan hanya dapat diselesaikan oleh Bendahara'};
    upd.tindak_lanjut_keuangan='SELESAI';upd.catatan_keuangan=catatan;
    var bidangDone=upper(s.tindak_lanjut_bidang)==='SELESAI';
    upd.status_surat=bidangDone?'SELESAI':'PENCAIRAN SELESAI - MENUNGGU TINDAK LANJUT BIDANG';upd.tahap_surat=bidangDone?'SELESAI':'TINDAK LANJUT';upd.current_role=bidangDone?'':'BIDANG';upd.current_bidang=bidangDone?'':s.current_bidang;upd.riwayat_surat=addSuratHistoryV136_(s,user,'Tindak lanjut pencairan dinyatakan selesai'+(catatan?' | '+catatan:''));
  }else if(action==='KEMBALIKAN'){
    return actionSuratV133BaseV136_(req);
  }else return {success:false,message:'Keputusan surat tidak dikenali'};
  updateSuratV133_(s._row,upd);appendLog(norm(user.nama),'PROSES_SURAT_GABUNGAN',s.id_surat,action);
  return {success:true,message:upd.status_surat==='SELESAI'?'Seluruh tindak lanjut surat telah selesai':'Status surat berhasil diperbarui',status_surat:upd.status_surat};
};

var routeActionV136Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='savePimpinanBidangV136')return savePimpinanBidangV136(req);
  return routeActionV136Base_(a,req);
};
var doPostV136Base_=doPost;
doPost=function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}'),a=req.action||'';
    if(a==='savePimpinanBidangV136')return withWriteLock(function(){return out(routeAction_(a,req));});
    return doPostV136Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err),stack:err&&err.stack?err.stack:''});}
};


/* =========================================================
   SIMPROV v137 - Lampiran surat melalui backend dan hapus surat.
   ========================================================= */
function driveFileIdV137_(url){
  var s=String(url||''),m=s.match(/\/d\/([A-Za-z0-9_-]{20,})/)||s.match(/[?&]id=([A-Za-z0-9_-]{20,})/)||s.match(/([A-Za-z0-9_-]{25,})/);
  return m?m[1]:'';
}
function getSuratLampiranV137(req){
  var user=req.user||{},s=findById(suratRowsV133_(),'id_surat',req.id_surat);
  if(!s)return {success:false,message:'Surat tidak ditemukan'};
  if(!canReadSuratV133_(user,s))return {success:false,message:'Anda tidak memiliki akses ke surat ini'};
  if(!norm(s.url_file))return {success:false,message:'Surat tidak memiliki lampiran'};
  var id=driveFileIdV137_(s.url_file);if(!id)return {success:false,message:'ID lampiran tidak valid'};
  var file=DriveApp.getFileById(id),blob=file.getBlob(),bytes=blob.getBytes();
  if(bytes.length>MAX_UPLOAD_BYTES_V133)return {success:false,message:'Lampiran terlalu besar untuk ditampilkan langsung'};
  return {success:true,file_name:norm(s.nama_file)||file.getName(),mime_type:blob.getContentType()||file.getMimeType()||'application/octet-stream',base64:Utilities.base64Encode(bytes)};
}
function deleteSuratV137(req){
  var user=req.user||{},s=findById(suratRowsV133_(),'id_surat',req.id_surat);
  if(!s)return {success:false,message:'Surat tidak ditemukan atau sudah dihapus'};
  var role=actualRoleV133_(user),own=norm(s.asal_id_user)===norm(user.id_user);
  if(!own&&role!=='ADMIN')return {success:false,message:'Hanya pembuat surat yang dapat menghapus Nota Dinas ini'};
  if(upper(s.status_surat)==='SELESAI')return {success:false,message:'Surat yang sudah selesai tidak dapat dihapus'};
  if(norm(s.url_file)){
    try{var fileId=driveFileIdV137_(s.url_file);if(fileId)DriveApp.getFileById(fileId).setTrashed(true);}catch(e){}
  }
  sh(SH_SURAT_V133).deleteRow(s._row);
  appendLog(norm(user.nama)||norm(user.username),'HAPUS_NOTA_DINAS',norm(s.id_surat),norm(s.perihal));
  return {success:true,message:'Nota Dinas berhasil dihapus'};
}
var routeActionV137Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='getSuratLampiranV137')return getSuratLampiranV137(req);
  if(a==='deleteSuratV137')return deleteSuratV137(req);
  return routeActionV137Base_(a,req);
};
var doPostV137Base_=doPost;
doPost=function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}'),a=req.action||'';
    if(a==='getSuratLampiranV137')return out(routeAction_(a,req));
    if(a==='deleteSuratV137')return withWriteLock(function(){return out(routeAction_(a,req));});
    return doPostV137Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err),stack:err&&err.stack?err.stack:''});}
};


/* =========================================================
   SIMPROV v138 - Paket Pengajuan Pembayaran sesuai SOP PB PORPROV
   Sumber acuan:
   - SOP Permohonan Dana dan Pengeluaran Dana PB Porprov
   - Dokumen Pengajuan Pembayaran
   - Form Surat Perintah Pemindahbukuan PB Porprov
   Modul bersifat aditif agar alur v137 yang sudah berjalan tetap aman.
   ========================================================= */
var SH_PAYMENT_V138='PENGAJUAN_PEMBAYARAN';
var SH_PAYMENT_DOC_V138='DOKUMEN_PENGAJUAN';
var PAYMENT_HEADERS_V138=[
  'id_pengajuan','id_kegiatan','id_bidang','nama_kegiatan','jenis_pengajuan','reimbursement',
  'nomor_nd_bidang','tanggal_nd_bidang','sifat','hari_tanggal_kegiatan','tempat_kegiatan','jumlah_pengajuan','terbilang',
  'rincian_json','rekening_json','jabatan_pengaju','nama_pengaju','jabatan_tujuan','nama_tujuan','nomor_sptjm',
  'status_pengajuan','tahap_aktif','catatan_verifikasi','nomor_lembar_verifikasi','verifikator_nama','verifikator_jabatan','tanggal_verifikasi',
  'pimpinan_penyetuju','pimpinan_jabatan','tanggal_persetujuan','nomor_nd_pimpinan','tanggal_nd_pimpinan',
  'ketua_harian_nama','tanggal_perintah','nomor_sp2','nama_rekening_sumber','nomor_rekening_sumber',
  'bendahara_nama','tanggal_bayar','catatan_bayar','bukti_bayar_nama','bukti_bayar_url',
  'created_by','created_at','updated_at','riwayat'
];
var PAYMENT_DOC_HEADERS_V138=[
  'id_dok_pengajuan','id_pengajuan','id_kegiatan','id_bidang','jenis_dokumen','nama_file','url_file','mime_type',
  'status_dokumen','catatan','tanggal_upload','upload_by','tanggal_verifikasi','verifikasi_by','riwayat'
];
var PAYMENT_DOC_TYPES_V138=[
  'Invoice Tagihan',
  'Kuitansi/Tanda Terima Pembayaran',
  'Daftar Hadir/Absensi',
  'Fotokopi NPWP & KTP Penerima',
  'Rekening Bank Penerima',
  'LPJ Kegiatan/Foto Dokumentasi',
  'Dokumen Pendukung Lain'
];
var PAYMENT_MAX_FILE_V138=2*1024*1024;
var PAYMENT_MAX_BATCH_V138=12*1024*1024;

function ensureSheetHeadersV138_(name,headers){
  var book=ss(),sheet=book.getSheetByName(name);
  if(!sheet)sheet=book.insertSheet(name);
  if(sheet.getLastRow()<1){sheet.getRange(1,1,1,headers.length).setValues([headers]);return sheet;}
  var lc=Math.max(1,sheet.getLastColumn()),hs=sheet.getRange(1,1,1,lc).getValues()[0].map(norm);
  if(hs.every(function(x){return !x;})){sheet.getRange(1,1,1,headers.length).setValues([headers]);return sheet;}
  headers.forEach(function(h){if(hs.indexOf(h)<0){sheet.getRange(1,sheet.getLastColumn()+1).setValue(h);hs.push(h);}});
  return sheet;
}
function ensurePaymentSheetsV138_(){ensureSheetHeadersV138_(SH_PAYMENT_V138,PAYMENT_HEADERS_V138);ensureSheetHeadersV138_(SH_PAYMENT_DOC_V138,PAYMENT_DOC_HEADERS_V138);}
function paymentRowsV138_(){ensurePaymentSheetsV138_();return getRows(SH_PAYMENT_V138);}
function paymentDocRowsV138_(){ensurePaymentSheetsV138_();return getRows(SH_PAYMENT_DOC_V138);}
function appendObjectsV138_(sheetName,headers,objects){
  if(!objects||!objects.length)return;
  var sheet=ensureSheetHeadersV138_(sheetName,headers),lc=sheet.getLastColumn(),hs=sheet.getRange(1,1,1,lc).getValues()[0].map(norm);
  var rows=objects.map(function(o){return hs.map(function(h){return Object.prototype.hasOwnProperty.call(o,h)?o[h]:'';});});
  sheet.getRange(sheet.getLastRow()+1,1,rows.length,hs.length).setValues(rows);
}
function shortPaymentLockV138_(fn){
  var lock=LockService.getScriptLock();lock.waitLock(12000);try{return fn();}finally{try{lock.releaseLock();}catch(e){}}
}
function paymentHistoryV138_(p,user,text){
  var line=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - '+(norm(user&&user.nama)||norm(user&&user.username)||'Sistem')+': '+text;
  return norm(p&&p.riwayat)?norm(p.riwayat)+'\n'+line:line;
}
function paymentRoleV138_(user){return actualRoleV133_(user);}
function paymentCanReadV138_(user,p){
  var r=paymentRoleV138_(user);if(['ADMIN','PIMPINAN','BENDAHARA','AUDITOR'].indexOf(r)>=0)return true;
  if(r==='BIDANG')return norm(user&&user.id_bidang)===norm(p&&p.id_bidang);
  if(r==='VERIFIKATOR_PBJ'||r==='VERIFIKATOR_KEUANGAN')return canAccessBidang_(user,p&&p.id_bidang);
  return false;
}
function paymentCanEditDraftV138_(user,p){
  var r=paymentRoleV138_(user);if(r==='ADMIN')return true;
  return r==='BIDANG'&&norm(user&&user.id_bidang)===norm(p&&p.id_bidang)&&['DRAFT','PERBAIKAN BIDANG'].indexOf(upper(p&&p.status_pengajuan))>=0;
}
function paymentDocKeyV138_(v){return upper(v).replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function paymentRequiredDocsV138_(p){
  var out=['Invoice Tagihan','Daftar Hadir/Absensi','Fotokopi NPWP & KTP Penerima','Rekening Bank Penerima','LPJ Kegiatan/Foto Dokumentasi'];
  if(String(p&&p.reimbursement)==='1'||upper(p&&p.reimbursement)==='YA')out.splice(1,0,'Kuitansi/Tanda Terima Pembayaran');
  return out;
}
function paymentDocMapV138_(id){
  var out={};paymentDocRowsV138_().filter(function(d){return norm(d.id_pengajuan)===norm(id);}).forEach(function(d){
    var k=paymentDocKeyV138_(d.jenis_dokumen);if(k==='DOKUMEN PENDUKUNG LAIN'){if(!out[k])out[k]=[];out[k].push(d);}else out[k]=d;
  });return out;
}
function paymentPreProcessRequiredV138_(r){
  if(!r)return [];
  if(upper(r.kategori)==='NON PENGADAAN'||upper(r.metode_pemilihan)==='NON PENGADAAN')return [];
  var nilai=num(r.jumlah)||(num(r.volume)*num(r.harga_satuan)),all=dokumenKetentuanByNilai(nilai)||[];
  var payKeys={};['Kuitansi / Nota / Invoice','Bukti Pembelian / Kwitansi','Faktur Pembelian','SPTJM','Surat Permohonan Pembayaran','Nota Dinas Pencairan','Surat Perintah Pembayaran'].forEach(function(x){payKeys[paymentDocKeyV138_(x)]=1;});
  return all.filter(function(x){return !payKeys[paymentDocKeyV138_(x)];});
}
function paymentEligibilityV138_(r){
  if(!r)return {ready:false,reason:'Kegiatan tidak ditemukan',required:[],valid:0};
  if(upper(r.status_perencanaan)!=='DISETUJUI')return {ready:false,reason:'Perencanaan belum disetujui Verifikator PBJ',required:[],valid:0};
  var required=paymentPreProcessRequiredV138_(r);if(!required.length)return {ready:true,reason:'Siap diajukan',required:[],valid:0};
  var docs=getRows(SH_DOKUMEN).filter(function(d){return norm(d.id_kegiatan)===norm(r.id_kegiatan);}),map={};
  docs.forEach(function(d){map[paymentDocKeyV138_(d.jenis_dokumen)]=d;});
  var valid=required.filter(function(j){var d=map[paymentDocKeyV138_(j)];return d&&isDocValidKeuangan_(d);}).length;
  var missing=required.filter(function(j){var d=map[paymentDocKeyV138_(j)];return !d||!isDocValidKeuangan_(d);});
  return {ready:valid===required.length,reason:valid===required.length?'Tahap proses PBJ telah valid':'Selesaikan verifikasi dokumen proses PBJ terlebih dahulu ('+valid+'/'+required.length+' valid)',required:required,valid:valid,missing:missing};
}
function paymentGroupDataV138_(idBidang){
  var b=findById(getRows(SH_BIDANG),'id_bidang',idBidang)||{},identity=getSystemIdentityData_(),group=ppkGroupByBidangNameV102_(b.nama_bidang||'');
  var pimpinan=ppkNameByGroupV102_(identity,group)||norm(b.pejabat_komitmen)||'';
  var verifier='';
  if(group==='KETUA HARIAN')verifier=identity.wakil_ketua_harian||'';
  if(group==='KETUA I')verifier=identity.wakil_ketua_i||'';
  if(group==='KETUA II')verifier=identity.wakil_ketua_ii||'';
  if(group==='KETUA III')verifier=identity.wakil_ketua_iii||'';
  if(group==='SEKRETARIS UMUM')verifier=identity.wakil_sekretaris||'';
  return {bidang:b,group:group||'KETUA/SEKRETARIS UMUM',pimpinan:pimpinan,verifier:verifier,ketua_harian:identity.ketua_harian||'',identity:identity};
}
function paymentFolderV138_(p){
  var root=DriveApp.getFolderById(DRIVE_FOLDER_ID),b=findById(getRows(SH_BIDANG),'id_bidang',p.id_bidang)||{};
  var bf=getOrCreateFolder(root,norm(p.id_bidang)+' - '+safeName(b.nama_bidang||p.id_bidang));
  var pf=getOrCreateFolder(bf,'PENGAJUAN PEMBAYARAN');
  return getOrCreateFolder(pf,norm(p.id_pengajuan)+' - '+safeName(p.nama_kegiatan||p.id_kegiatan));
}
function getPaymentWorkspaceV138(req){
  ensurePaymentSheetsV138_();var user=req.user||{},role=paymentRoleV138_(user),plans=getRows(SH_RENCANA).filter(function(r){return canAccessBidang_(user,r.id_bidang)||['ADMIN','PIMPINAN','BENDAHARA','AUDITOR'].indexOf(role)>=0;});
  var rows=paymentRowsV138_().filter(function(p){return paymentCanReadV138_(user,p);}),ids={};rows.forEach(function(p){ids[norm(p.id_pengajuan)]=1;});
  var docs=paymentDocRowsV138_().filter(function(d){return ids[norm(d.id_pengajuan)];});
  var activities=plans.map(function(r){var e=paymentEligibilityV138_(r);return {id_kegiatan:r.id_kegiatan,id_bidang:r.id_bidang,nama_kegiatan:r.nama_kegiatan,kategori:r.kategori,metode_pemilihan:r.metode_pemilihan,jumlah:num(r.jumlah)||(num(r.volume)*num(r.harga_satuan)),status_perencanaan:r.status_perencanaan,payment_ready:e.ready,payment_reason:e.reason,payment_valid_process:e.valid,payment_required_process:e.required.length};});
  return {success:true,role:role,pengajuan:rows,dokumen:docs,kegiatan:activities,bidang:getRows(SH_BIDANG),identity:getSystemIdentityData_(),doc_types:PAYMENT_DOC_TYPES_V138};
}
function savePaymentDraftV138(req){
  ensurePaymentSheetsV138_();var user=req.user||{},d=req.data||{},r=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);if(!r)return {success:false,message:'Kegiatan tidak ditemukan'};
  if(paymentRoleV138_(user)!=='ADMIN'&&paymentRoleV138_(user)!=='BIDANG')return {success:false,message:'Hanya Bidang atau Admin yang dapat membuat pengajuan pembayaran'};
  if(paymentRoleV138_(user)==='BIDANG'&&norm(user.id_bidang)!==norm(r.id_bidang))return {success:false,message:'Kegiatan bukan milik bidang Anda'};
  var eligibility=paymentEligibilityV138_(r);if(!eligibility.ready)return {success:false,message:eligibility.reason};
  var existing=d.id_pengajuan?findById(paymentRowsV138_(),'id_pengajuan',d.id_pengajuan):null;
  if(existing&&!paymentCanEditDraftV138_(user,existing))return {success:false,message:'Pengajuan sudah diproses dan tidak dapat diedit'};
  if(!existing){var active=paymentRowsV138_().find(function(p){return norm(p.id_kegiatan)===norm(r.id_kegiatan)&&upper(p.status_pengajuan)!=='SELESAI';});if(active)return {success:false,message:'Kegiatan ini sudah memiliki pengajuan pembayaran aktif: '+active.id_pengajuan};}
  var now=new Date(),id=existing?existing.id_pengajuan:'PAY-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMddHHmmss')+'-'+Math.floor(Math.random()*900+100),group=paymentGroupDataV138_(r.id_bidang);
  var payload={id_pengajuan:id,id_kegiatan:r.id_kegiatan,id_bidang:r.id_bidang,nama_kegiatan:r.nama_kegiatan,jenis_pengajuan:upper(d.jenis_pengajuan||'PEMBAYARAN'),reimbursement:d.reimbursement?'1':'0',nomor_nd_bidang:norm(d.nomor_nd_bidang),tanggal_nd_bidang:norm(d.tanggal_nd_bidang),sifat:upper(d.sifat||'PENTING'),hari_tanggal_kegiatan:norm(d.hari_tanggal_kegiatan),tempat_kegiatan:norm(d.tempat_kegiatan),jumlah_pengajuan:num(d.jumlah_pengajuan),terbilang:norm(d.terbilang),rincian_json:JSON.stringify(Array.isArray(d.rincian)?d.rincian:[]),rekening_json:JSON.stringify(Array.isArray(d.rekening)?d.rekening:[]),jabatan_pengaju:norm(d.jabatan_pengaju)||('Kepala '+(group.bidang.nama_bidang||'Bidang/Bagian')),nama_pengaju:norm(d.nama_pengaju)||norm(user.nama),jabatan_tujuan:norm(d.jabatan_tujuan)||group.group,nama_tujuan:norm(d.nama_tujuan)||group.pimpinan,nomor_sptjm:norm(d.nomor_sptjm),status_pengajuan:existing?existing.status_pengajuan:'DRAFT',tahap_aktif:existing?existing.tahap_aktif:'BIDANG',updated_at:now};
  if(payload.jumlah_pengajuan<=0)return {success:false,message:'Jumlah pengajuan wajib lebih dari Rp0'};
  if(payload.jumlah_pengajuan>(num(r.jumlah)||(num(r.volume)*num(r.harga_satuan))))return {success:false,message:'Jumlah pengajuan tidak boleh melebihi nilai perencanaan'};
  if(existing){payload.riwayat=paymentHistoryV138_(existing,user,'Draft pengajuan diperbarui');updateRowFieldsFastV109_(SH_PAYMENT_V138,existing._row,payload);}else{payload.created_by=norm(user.id_user)||norm(user.username);payload.created_at=now;payload.riwayat=paymentHistoryV138_(null,user,'Draft pengajuan dibuat');appendObjectsV138_(SH_PAYMENT_V138,PAYMENT_HEADERS_V138,[payload]);}
  appendLog(norm(user.nama),'SIMPAN_DRAFT_PENGAJUAN',id,r.id_kegiatan);return {success:true,message:'Draft pengajuan pembayaran berhasil disimpan',id_pengajuan:id,pengajuan:findById(paymentRowsV138_(),'id_pengajuan',id)};
}
function uploadPaymentDocsBatchV138(req){
  ensurePaymentSheetsV138_();var user=req.user||{},p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan),items=Array.isArray(req.dokumen)?req.dokumen:[];
  if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};if(!paymentCanEditDraftV138_(user,p))return {success:false,message:'Dokumen hanya dapat diunggah saat pengajuan masih Draft atau Perbaikan'};
  if(!items.length)return {success:false,message:'Tidak ada dokumen yang dipilih'};var total=0,prepared=[],folder=paymentFolderV138_(p);
  try{
    items.forEach(function(it,index){var jenis=norm(it.jenis_dokumen),name=norm(it.file_name)||('dokumen-'+(index+1)),mime=norm(it.mime_type)||'application/octet-stream';if(PAYMENT_DOC_TYPES_V138.indexOf(jenis)<0)throw new Error('Jenis dokumen tidak valid: '+jenis);var bytes=Utilities.base64Decode(String(it.file_base64||'').replace(/^data:[^,]+,/,''));if(!bytes.length)throw new Error('File '+name+' kosong');if(bytes.length>PAYMENT_MAX_FILE_V138)throw new Error('File '+name+' melebihi 2 MB');total+=bytes.length;if(total>PAYMENT_MAX_BATCH_V138)throw new Error('Total upload melebihi 12 MB');var blob=Utilities.newBlob(bytes,mime,name),file=folder.createFile(blob);try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}prepared.push({jenis:jenis,name:name,mime:mime,file:file,url:file.getUrl()});});
    shortPaymentLockV138_(function(){
      var rows=paymentDocRowsV138_(),now=new Date();prepared.forEach(function(x,i){var existing=x.jenis==='Dokumen Pendukung Lain'?null:rows.find(function(d){return norm(d.id_pengajuan)===norm(p.id_pengajuan)&&paymentDocKeyV138_(d.jenis_dokumen)===paymentDocKeyV138_(x.jenis);});var hist=(existing&&norm(existing.riwayat)?norm(existing.riwayat)+'\n':'')+Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - '+(norm(user.nama)||'User')+' mengunggah '+x.name;if(existing){try{var old=driveFileIdV137_(existing.url_file);if(old)DriveApp.getFileById(old).setTrashed(true);}catch(e){}updateRowFieldsFastV109_(SH_PAYMENT_DOC_V138,existing._row,{nama_file:x.name,url_file:x.url,mime_type:x.mime,status_dokumen:'DIUNGGAH',catatan:'',tanggal_upload:now,upload_by:norm(user.nama),tanggal_verifikasi:'',verifikasi_by:'',riwayat:hist});}else{appendObjectsV138_(SH_PAYMENT_DOC_V138,PAYMENT_DOC_HEADERS_V138,[{id_dok_pengajuan:'PDOC-'+new Date().getTime()+'-'+i+'-'+Math.floor(Math.random()*900+100),id_pengajuan:p.id_pengajuan,id_kegiatan:p.id_kegiatan,id_bidang:p.id_bidang,jenis_dokumen:x.jenis,nama_file:x.name,url_file:x.url,mime_type:x.mime,status_dokumen:'DIUNGGAH',catatan:'',tanggal_upload:now,upload_by:norm(user.nama),tanggal_verifikasi:'',verifikasi_by:'',riwayat:hist}]);}});
      updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{updated_at:now,riwayat:paymentHistoryV138_(p,user,prepared.length+' dokumen pendukung diunggah')});
    });
  }catch(err){prepared.forEach(function(x){try{x.file.setTrashed(true);}catch(e){}});return {success:false,message:err.message||String(err)};}
  appendLog(norm(user.nama),'UPLOAD_DOK_PENGAJUAN',p.id_pengajuan,prepared.length+' file');return {success:true,message:prepared.length+' dokumen berhasil diunggah',dokumen:paymentDocRowsV138_().filter(function(d){return norm(d.id_pengajuan)===norm(p.id_pengajuan);})};
}
function paymentParseArrayV138_(value){try{var x=JSON.parse(norm(value)||'[]');return Array.isArray(x)?x:[];}catch(e){return [];}}
function paymentValidateFinancialRowsV138_(p){
  var amount=num(p.jumlah_pengajuan),rincian=paymentParseArrayV138_(p.rincian_json).filter(function(x){return norm(x.uraian)||num(x.jumlah)>0;}),rekening=paymentParseArrayV138_(p.rekening_json).filter(function(x){return norm(x.uraian)||norm(x.nama_rekening)||norm(x.nama_bank)||norm(x.nomor_rekening)||num(x.jumlah)>0;});
  if(!rincian.length)return 'Minimal satu rincian belanja wajib diisi';
  var badRincian=rincian.some(function(x){return !norm(x.uraian)||num(x.jumlah)<=0;});if(badRincian)return 'Setiap rincian belanja wajib memiliki uraian dan jumlah lebih dari Rp0';
  var totalRincian=rincian.reduce(function(n,x){return n+num(x.jumlah);},0);if(Math.abs(totalRincian-amount)>0.5)return 'Total rincian belanja harus sama dengan jumlah pengajuan';
  if(!rekening.length)return 'Minimal satu rekening penerima wajib diisi untuk Surat Perintah Pemindahbukuan';
  var badRekening=rekening.some(function(x){return !norm(x.uraian)||!norm(x.nama_rekening)||!norm(x.nama_bank)||!norm(x.nomor_rekening)||num(x.jumlah)<=0;});if(badRekening)return 'Setiap rekening penerima wajib berisi uraian, nama rekening, bank, nomor rekening, dan jumlah';
  var totalRekening=rekening.reduce(function(n,x){return n+num(x.jumlah);},0);if(Math.abs(totalRekening-amount)>0.5)return 'Total rekening penerima harus sama dengan jumlah pengajuan';
  return '';
}
function submitPaymentV138(req){
  var user=req.user||{},p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan);if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};if(!paymentCanEditDraftV138_(user,p))return {success:false,message:'Pengajuan tidak dapat diajukan dari status saat ini'};
  var required=paymentRequiredDocsV138_(p),map=paymentDocMapV138_(p.id_pengajuan),missing=required.filter(function(j){return !map[paymentDocKeyV138_(j)];});
  if(missing.length)return {success:false,message:'Dokumen wajib belum lengkap: '+missing.join(', ')};
  var mandatory=['nomor_nd_bidang','tanggal_nd_bidang','hari_tanggal_kegiatan','tempat_kegiatan','nomor_sptjm','jabatan_pengaju','nama_pengaju'];var kosong=mandatory.filter(function(k){return !norm(p[k]);});if(kosong.length)return {success:false,message:'Lengkapi data surat terlebih dahulu: '+kosong.join(', ')};
  var financialError=paymentValidateFinancialRowsV138_(p);if(financialError)return {success:false,message:financialError};
  var now=new Date(),group=paymentGroupDataV138_(p.id_bidang);updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{status_pengajuan:'MENUNGGU VERIFIKASI KEUANGAN',tahap_aktif:'VERIFIKATOR_KEUANGAN',verifikator_nama:group.verifier||'',verifikator_jabatan:group.group==='SEKRETARIS UMUM'?'WAKIL SEKRETARIS':('WAKIL '+group.group),updated_at:now,riwayat:paymentHistoryV138_(p,user,'Pengajuan dan Nota Dinas dikirim kepada Verifikator Keuangan')});
  var r=findById(getRows(SH_RENCANA),'id_kegiatan',p.id_kegiatan);if(r)updateRowFieldsFastV109_(SH_RENCANA,r._row,{status_pencairan:'MENUNGGU VERIFIKASI KEUANGAN'});upsertPencairan(p.id_kegiatan,p.id_bidang,'MENUNGGU VERIFIKASI KEUANGAN','Pengajuan pembayaran '+p.id_pengajuan);
  appendLog(norm(user.nama),'AJUKAN_PEMBAYARAN',p.id_pengajuan,p.id_kegiatan);return {success:true,message:'Pengajuan pembayaran berhasil dikirim ke Verifikator Keuangan'};
}
function verifyPaymentV138(req){
  var user=req.user||{},role=paymentRoleV138_(user),p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan);if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};if(role!=='VERIFIKATOR_KEUANGAN'&&role!=='ADMIN')return {success:false,message:'Akses Verifikator Keuangan diperlukan'};if(!canAccessBidang_(user,p.id_bidang)&&role!=='ADMIN')return {success:false,message:'Bidang ini tidak ditugaskan kepada akun Anda'};if(upper(p.status_pengajuan)!=='MENUNGGU VERIFIKASI KEUANGAN')return {success:false,message:'Pengajuan tidak sedang menunggu verifikasi keuangan'};
  var decision=upper(req.keputusan),note=norm(req.catatan),now=new Date();if(decision==='KEMBALIKAN'&&!note)return {success:false,message:'Alasan pengembalian wajib diisi'};
  if(decision==='KEMBALIKAN'){updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{status_pengajuan:'PERBAIKAN BIDANG',tahap_aktif:'BIDANG',catatan_verifikasi:note,updated_at:now,riwayat:paymentHistoryV138_(p,user,'Pengajuan dikembalikan ke Bidang | '+note)});upsertPencairan(p.id_kegiatan,p.id_bidang,'PERBAIKAN KEUANGAN',note);return {success:true,message:'Pengajuan dikembalikan kepada Bidang untuk perbaikan'};}
  if(decision!=='VALID')return {success:false,message:'Keputusan verifikasi tidak valid'};var required=paymentRequiredDocsV138_(p),map=paymentDocMapV138_(p.id_pengajuan),missing=required.filter(function(j){return !map[paymentDocKeyV138_(j)];});if(missing.length)return {success:false,message:'Dokumen belum lengkap: '+missing.join(', ')};
  paymentDocRowsV138_().filter(function(d){return norm(d.id_pengajuan)===norm(p.id_pengajuan);}).forEach(function(d){updateRowFieldsFastV109_(SH_PAYMENT_DOC_V138,d._row,{status_dokumen:'VALID',catatan:'',tanggal_verifikasi:now,verifikasi_by:norm(user.nama),riwayat:(norm(d.riwayat)?norm(d.riwayat)+'\n':'')+Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Dinyatakan valid oleh '+norm(user.nama)});});
  var group=paymentGroupDataV138_(p.id_bidang),nomor=norm(req.nomor_lembar_verifikasi)||('VER-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMdd-HHmm'));
  updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{status_pengajuan:'MENUNGGU PERSETUJUAN PIMPINAN',tahap_aktif:'PIMPINAN',catatan_verifikasi:note,nomor_lembar_verifikasi:nomor,verifikator_nama:norm(user.nama)||group.verifier,verifikator_jabatan:group.group==='SEKRETARIS UMUM'?'WAKIL SEKRETARIS':('WAKIL '+group.group),tanggal_verifikasi:now,updated_at:now,riwayat:paymentHistoryV138_(p,user,'Berkas dinyatakan lengkap dan sah; Lembar Verifikasi diterbitkan')});upsertPencairan(p.id_kegiatan,p.id_bidang,'MENUNGGU PERSETUJUAN PIMPINAN','Lembar Verifikasi '+nomor);
  appendLog(norm(user.nama),'VERIFIKASI_PENGAJUAN',p.id_pengajuan,'VALID');return {success:true,message:'Pengajuan valid dan diteruskan kepada Pimpinan'};
}
function approvePaymentV138(req){
  var user=req.user||{},role=paymentRoleV138_(user),p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan);if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};if(role!=='PIMPINAN'&&role!=='ADMIN')return {success:false,message:'Akses Pimpinan diperlukan'};if(upper(p.status_pengajuan)!=='MENUNGGU PERSETUJUAN PIMPINAN')return {success:false,message:'Pengajuan tidak sedang menunggu persetujuan Pimpinan'};
  var decision=upper(req.keputusan),note=norm(req.catatan),now=new Date();if(decision==='KEMBALIKAN'){if(!note)return {success:false,message:'Alasan pengembalian wajib diisi'};updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{status_pengajuan:'PERBAIKAN BIDANG',tahap_aktif:'BIDANG',catatan_verifikasi:note,updated_at:now,riwayat:paymentHistoryV138_(p,user,'Pimpinan mengembalikan pengajuan | '+note)});upsertPencairan(p.id_kegiatan,p.id_bidang,'PERBAIKAN DISPOSISI',note);return {success:true,message:'Pengajuan dikembalikan kepada Bidang'};}
  if(decision!=='SETUJUI')return {success:false,message:'Keputusan tidak valid'};var nomor=norm(req.nomor_nd_pimpinan),tgl=norm(req.tanggal_nd_pimpinan),jabatan=norm(req.pimpinan_jabatan)||paymentGroupDataV138_(p.id_bidang).group;if(!nomor||!tgl)return {success:false,message:'Nomor dan tanggal Nota Dinas kepada Ketua Harian wajib diisi'};
  updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{status_pengajuan:'MENUNGGU PERINTAH KETUA HARIAN',tahap_aktif:'KETUA_HARIAN',pimpinan_penyetuju:norm(user.nama),pimpinan_jabatan:jabatan,tanggal_persetujuan:now,nomor_nd_pimpinan:nomor,tanggal_nd_pimpinan:tgl,updated_at:now,riwayat:paymentHistoryV138_(p,user,'Lembar Verifikasi disetujui dan Nota Dinas kepada Ketua Harian diterbitkan')});upsertPencairan(p.id_kegiatan,p.id_bidang,'MENUNGGU PERINTAH KETUA HARIAN','Nota Dinas '+nomor);
  appendLog(norm(user.nama),'PERSETUJUAN_PENGAJUAN',p.id_pengajuan,nomor);return {success:true,message:'Pengajuan disetujui dan Nota Dinas kepada Ketua Harian berhasil dibuat'};
}
function issuePaymentOrderV138(req){
  var user=req.user||{},role=paymentRoleV138_(user),p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan);if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};if(role!=='PIMPINAN'&&role!=='ADMIN')return {success:false,message:'Akses Ketua Harian/Pimpinan diperlukan'};if(upper(p.status_pengajuan)!=='MENUNGGU PERINTAH KETUA HARIAN')return {success:false,message:'Pengajuan belum berada pada tahap Surat Perintah Pemindahbukuan'};
  var nomor=norm(req.nomor_sp2),tgl=norm(req.tanggal_perintah),namaSumber=norm(req.nama_rekening_sumber),noSumber=norm(req.nomor_rekening_sumber);if(!nomor||!tgl||!namaSumber||!noSumber)return {success:false,message:'Nomor SP2, tanggal perintah, nama rekening sumber, dan nomor rekening sumber wajib diisi'};var now=new Date(),kh=norm(req.ketua_harian_nama)||norm(user.nama)||paymentGroupDataV138_(p.id_bidang).ketua_harian;
  updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{status_pengajuan:'MENUNGGU PEMBAYARAN BENDAHARA',tahap_aktif:'BENDAHARA',ketua_harian_nama:kh,tanggal_perintah:tgl,nomor_sp2:nomor,nama_rekening_sumber:namaSumber,nomor_rekening_sumber:noSumber,updated_at:now,riwayat:paymentHistoryV138_(p,user,'Surat Perintah Pemindahbukuan diterbitkan kepada Bendahara Umum')});upsertPencairan(p.id_kegiatan,p.id_bidang,'MENUNGGU BENDAHARA','SP2 '+nomor);
  appendLog(norm(user.nama),'TERBIT_SP2',p.id_pengajuan,nomor);return {success:true,message:'Surat Perintah Pemindahbukuan berhasil diterbitkan kepada Bendahara'};
}
function completePaymentV138(req){
  var user=req.user||{},role=paymentRoleV138_(user),p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan);if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};if(role!=='BENDAHARA'&&role!=='ADMIN')return {success:false,message:'Akses Bendahara diperlukan'};if(upper(p.status_pengajuan)!=='MENUNGGU PEMBAYARAN BENDAHARA')return {success:false,message:'Pengajuan belum diteruskan kepada Bendahara'};
  var bytes=Utilities.base64Decode(String(req.file_base64||'').replace(/^data:[^,]+,/,''));if(!bytes.length)return {success:false,message:'Bukti pembayaran wajib diunggah'};if(bytes.length>PAYMENT_MAX_FILE_V138)return {success:false,message:'Bukti pembayaran maksimal 2 MB'};var folder=paymentFolderV138_(p),name=norm(req.file_name)||'Bukti Pembayaran',file=folder.createFile(Utilities.newBlob(bytes,norm(req.mime_type)||'application/octet-stream',name));try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  try{shortPaymentLockV138_(function(){var now=new Date();updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{status_pengajuan:'SELESAI',tahap_aktif:'SELESAI',bendahara_nama:norm(user.nama),tanggal_bayar:norm(req.tanggal_bayar)||Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyy-MM-dd'),catatan_bayar:norm(req.catatan),bukti_bayar_nama:name,bukti_bayar_url:file.getUrl(),updated_at:now,riwayat:paymentHistoryV138_(p,user,'Pembayaran selesai dan bukti pembayaran diunggah')});var r=findById(getRows(SH_RENCANA),'id_kegiatan',p.id_kegiatan);if(r)updateRowFieldsFastV109_(SH_RENCANA,r._row,{status_pencairan:'SELESAI'});upsertPencairan(p.id_kegiatan,p.id_bidang,'SELESAI','Pembayaran diselesaikan oleh Bendahara');});}catch(err){try{file.setTrashed(true);}catch(e){}return {success:false,message:err.message||String(err)};}
  appendLog(norm(user.nama),'PEMBAYARAN_SELESAI',p.id_pengajuan,p.id_kegiatan);return {success:true,message:'Pembayaran berhasil dicatat dan paket dinyatakan selesai',url_file:file.getUrl()};
}
function deletePaymentDraftV138(req){
  var user=req.user||{},p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan);if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};if(!paymentCanEditDraftV138_(user,p))return {success:false,message:'Hanya Draft atau Perbaikan yang dapat dihapus oleh pembuatnya'};
  var docs=paymentDocRowsV138_().filter(function(d){return norm(d.id_pengajuan)===norm(p.id_pengajuan);});docs.forEach(function(d){try{var id=driveFileIdV137_(d.url_file);if(id)DriveApp.getFileById(id).setTrashed(true);}catch(e){}});
  var ds=ensureSheetHeadersV138_(SH_PAYMENT_DOC_V138,PAYMENT_DOC_HEADERS_V138);docs.map(function(d){return d._row;}).sort(function(a,b){return b-a;}).forEach(function(row){ds.deleteRow(row);});ensureSheetHeadersV138_(SH_PAYMENT_V138,PAYMENT_HEADERS_V138).deleteRow(p._row);appendLog(norm(user.nama),'HAPUS_DRAFT_PENGAJUAN',p.id_pengajuan,p.id_kegiatan);return {success:true,message:'Draft pengajuan pembayaran berhasil dihapus'};
}
function paymentSummaryForDashboardV138_(user){
  return paymentRowsV138_().filter(function(p){return paymentCanReadV138_(user,p);}).map(function(p){return {id_pengajuan:p.id_pengajuan,id_kegiatan:p.id_kegiatan,id_bidang:p.id_bidang,nama_kegiatan:p.nama_kegiatan,status_pengajuan:p.status_pengajuan,tahap_aktif:p.tahap_aktif,jumlah_pengajuan:num(p.jumlah_pengajuan),updated_at:p.updated_at};});
}
var getDashboardV138Base_=getDashboard;
getDashboard=function(req){var res=getDashboardV138Base_(req);if(res&&res.success){try{ensurePaymentSheetsV138_();res.pengajuanPembayaranV138=paymentSummaryForDashboardV138_(req.user||{});}catch(e){res.pengajuanPembayaranV138=[];}}return res;};
var routeActionV138Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='getPaymentWorkspaceV138')return getPaymentWorkspaceV138(req);
  if(a==='savePaymentDraftV138')return savePaymentDraftV138(req);
  if(a==='uploadPaymentDocsBatchV138')return uploadPaymentDocsBatchV138(req);
  if(a==='submitPaymentV138')return submitPaymentV138(req);
  if(a==='verifyPaymentV138')return verifyPaymentV138(req);
  if(a==='approvePaymentV138')return approvePaymentV138(req);
  if(a==='issuePaymentOrderV138')return issuePaymentOrderV138(req);
  if(a==='completePaymentV138')return completePaymentV138(req);
  if(a==='deletePaymentDraftV138')return deletePaymentDraftV138(req);
  return routeActionV138Base_(a,req);
};
var doPostV138Base_=doPost;
doPost=function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}'),a=req.action||'';
    if(a==='getPaymentWorkspaceV138')return out(routeAction_(a,req));
    if(a==='uploadPaymentDocsBatchV138'||a==='completePaymentV138')return out(routeAction_(a,req));
    if(['savePaymentDraftV138','submitPaymentV138','verifyPaymentV138','approvePaymentV138','issuePaymentOrderV138','deletePaymentDraftV138'].indexOf(a)>=0)return withWriteLock(function(){return out(routeAction_(a,req));});
    return doPostV138Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err),stack:err&&err.stack?err.stack:''});}
};

/* =========================================================
   SIMPROV v139 - Pengaman Pengajuan Pembayaran dan TTE Bidang
   ========================================================= */
(function(){
  ['tte_bidang_oleh','tte_bidang_waktu','tte_bidang_token'].forEach(function(h){
    if(PAYMENT_HEADERS_V138.indexOf(h)<0)PAYMENT_HEADERS_V138.push(h);
  });
})();

var savePaymentDraftV139Base_=savePaymentDraftV138;
savePaymentDraftV138=function(req){
  ensurePaymentSheetsV138_();
  var d=req.data||{},r=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
  if(!r)return {success:false,message:'Kegiatan tidak ditemukan'};
  var paymentId=norm(d.id_pengajuan),same=paymentRowsV138_().find(function(p){return norm(p.id_kegiatan)===norm(r.id_kegiatan)&&norm(p.id_pengajuan)!==paymentId;});
  if(!paymentId&&same)return {success:false,message:'Kegiatan ini sudah pernah dibuatkan pengajuan pembayaran: '+norm(same.id_pengajuan)};
  var budget=num(r.jumlah)||(num(r.volume)*num(r.harga_satuan));
  var rincian=Array.isArray(d.rincian)?d.rincian:[],rekening=Array.isArray(d.rekening)?d.rekening:[];
  var totalRincian=rincian.reduce(function(n,x){return n+num(x&&x.jumlah);},0);
  var totalRekening=rekening.reduce(function(n,x){return n+num(x&&x.jumlah);},0);
  if(totalRincian>budget)return {success:false,message:'Jumlah pengajuan '+formatRp(totalRincian)+' melebihi pagu kegiatan '+formatRp(budget)};
  if(totalRekening>budget)return {success:false,message:'Total rekening tujuan '+formatRp(totalRekening)+' melebihi pagu kegiatan '+formatRp(budget)};
  if(totalRekening>totalRincian)return {success:false,message:'Total rekening tujuan tidak boleh melebihi jumlah pengajuan'};
  var result=savePaymentDraftV139Base_(req);
  if(result&&result.success)result.message=paymentId?'Perubahan pengajuan pembayaran berhasil disimpan':'Pengajuan pembayaran berhasil dibuat. Silakan unggah dokumen pendukung.';
  return result;
};

var uploadPaymentDocsBatchV139Base_=uploadPaymentDocsBatchV138;
uploadPaymentDocsBatchV138=function(req){
  var result=uploadPaymentDocsBatchV139Base_(req);
  if(result&&result.success){
    SpreadsheetApp.flush();
    result.dokumen=paymentDocRowsV138_().filter(function(d){return norm(d.id_pengajuan)===norm(req.id_pengajuan);});
  }
  return result;
};

var submitPaymentV139Base_=submitPaymentV138;
submitPaymentV138=function(req){
  var result=submitPaymentV139Base_(req);
  if(result&&result.success){
    var p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan),user=req.user||{},now=new Date();
    if(p){
      var actor=norm(user.nama)||norm(user.username)||'Pengguna Bidang';
      var token='TTE-PAY-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMddHHmmss')+'-'+Math.floor(Math.random()*9000+1000);
      updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{
        tte_bidang_oleh:actor,
        tte_bidang_waktu:now,
        tte_bidang_token:token,
        updated_at:now,
        riwayat:paymentHistoryV138_(p,user,'Nota Dinas Bidang dan SPTJM ditandatangani elektronik | '+token)
      });
      result.tte_bidang_oleh=actor;result.tte_bidang_waktu=now;result.tte_bidang_token=token;
      result.message='Nota Dinas Bidang dan SPTJM berhasil ditandatangani elektronik, lalu dikirim ke Verifikator Keuangan';
    }
  }
  return result;
};

var getPaymentWorkspaceV139Base_=getPaymentWorkspaceV138;
getPaymentWorkspaceV138=function(req){
  var result=getPaymentWorkspaceV139Base_(req);
  if(result&&result.success){
    var used={};(result.pengajuan||[]).forEach(function(p){used[norm(p.id_kegiatan)]=norm(p.id_pengajuan);});
    (result.kegiatan||[]).forEach(function(k){k.has_payment=!!used[norm(k.id_kegiatan)];k.payment_id=used[norm(k.id_kegiatan)]||'';});
  }
  return result;
};

/* =========================================================
   SIMPROV v140 - Response cepat perencanaan dan tujuan asli surat
   ========================================================= */
(function(){
  var SURAT_TUJUAN_ASLI_HEADERS_V140=['tujuan_asli_role','tujuan_asli_nama'];
  function ensureSuratTujuanAsliV140_(){
    ensureSuratSheetV133_();ensureExtraHeadersV136_(SH_SURAT_V133,SURAT_TUJUAN_ASLI_HEADERS_V140);
  }

  var saveSuratBaseV140_=saveSuratV133;
  saveSuratV133=function(req){
    ensureSuratTujuanAsliV140_();
    var result=saveSuratBaseV140_(req);
    if(result&&result.success&&result.id_surat){
      var s=findById(suratRowsV133_(),'id_surat',result.id_surat);
      if(s&&!norm(s.tujuan_asli_role))updateSuratV133_(s._row,{tujuan_asli_role:'PIMPINAN',tujuan_asli_nama:'Pimpinan'});
    }
    return result;
  };

  var savePerencanaanBaseV140_=savePerencanaan;
  savePerencanaan=function(req){
    var result=savePerencanaanBaseV140_(req);
    if(result&&result.success&&result.id_kegiatan){
      var row=findById(getRows(SH_RENCANA),'id_kegiatan',result.id_kegiatan);
      if(row)result.perencanaan=row;
    }
    return result;
  };
})();

/* =========================================================
   SIMPROV v141 - Perencanaan Super Cepat & Near-Realtime
   - Endpoint ringan khusus menu Perencanaan
   - Update/edit/verifikasi memakai satu kali tulis per baris
   - Response mengembalikan record terbaru agar frontend langsung berubah
   ========================================================= */
(function(){
  function planningRowsForUserV141_(user){
    var rows=getRows(SH_RENCANA),u=user||{};
    if(isAdminUser(u))return rows;
    if(isReviewerUser(u)||isPBJUser_(u))return rows.filter(function(r){return canAccessBidang_(u,r.id_bidang);});
    return rows.filter(function(r){return norm(r.id_bidang)===norm(u.id_bidang);});
  }
  function planningBidangsForUserV141_(user){
    var rows=getRows(SH_BIDANG),u=user||{};
    if(isAdminUser(u))return rows;
    if(isReviewerUser(u)||isPBJUser_(u))return rows.filter(function(r){return canAccessBidang_(u,r.id_bidang);});
    return rows.filter(function(r){return norm(r.id_bidang)===norm(u.id_bidang);});
  }
  function cleanPlanningRowV141_(r){
    var out={};Object.keys(r||{}).forEach(function(k){if(k!=='_row')out[k]=r[k];});return out;
  }
  function planningRevisionV141_(rows){
    var text=(rows||[]).map(function(r){return [r.id_kegiatan,r.id_bidang,r.nama_kegiatan,r.volume,r.satuan,r.harga_satuan,r.jumlah,r.status_perencanaan,r.alasan_penolakan,r.alasan_perubahan,r.perubahan_ke,r.riwayat_perubahan,r.waktu_pemilihan,r.status_pencairan].map(norm).join('|');}).join('~');
    var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.MD5,text,Utilities.Charset.UTF_8);
    return Utilities.base64EncodeWebSafe(digest).replace(/=+$/,'');
  }
  function getPerencanaanRealtimeV141(req){
    var user=req.user||{},rows=planningRowsForUserV141_(user),bidangs=planningBidangsForUserV141_(user);
    var totals={};rows.forEach(function(r){var id=norm(r.id_bidang);if(!totals[id])totals[id]={total:0,count:0,approved:0};totals[id].total+=num(r.jumlah)||(num(r.volume)*num(r.harga_satuan));totals[id].count++;if(upper(r.status_perencanaan)==='DISETUJUI')totals[id].approved++;});
    var rekap=bidangs.map(function(b){var id=norm(b.id_bidang),t=totals[id]||{total:0,count:0,approved:0};return {id_bidang:id,nama_bidang:b.nama_bidang,pagu:num(b.pagu),status_akses:b.status_akses,total_perencanaan:t.total,jumlah_kegiatan:t.count,kegiatan_disetujui:t.approved};});
    return {success:true,serverTime:new Date(),revision:planningRevisionV141_(rows),perencanaan:rows.map(cleanPlanningRowV141_),rekap:rekap};
  }

  function updatePerencanaanFastV141_(req){
    var user=req.user||{};if(isAdminUser(user))return {success:false,message:'Admin tidak boleh mengedit perencanaan bidang.'};
    var data=req.data||{},r=findById(getRows(SH_RENCANA),'id_kegiatan',data.id_kegiatan);if(!r)return {success:false,message:'Perencanaan tidak ditemukan'};
    if(norm(r.id_bidang)!==norm(user.id_bidang))return {success:false,message:'Tidak boleh edit data bidang lain'};
    if(!bidangIsOpen(user.id_bidang))return {success:false,message:'Akses perencanaan bidang sedang ditutup admin. Menu pencairan tetap bisa digunakan.'};
    if(isKegiatanPencairanFinal(data.id_kegiatan))return {success:false,message:'Kegiatan sudah selesai sampai validasi pencairan, perencanaan terkunci.'};
    var st=upper(r.status_perencanaan),mode=norm(data.mode)||'normal';
    if(mode==='change'){
      if(st!=='DISETUJUI')return {success:false,message:'Ajukan perubahan hanya untuk data yang sudah DISETUJUI'};
      if(!norm(data.alasan_perubahan))return {success:false,message:'Alasan perubahan wajib diisi'};
    }else if(st!=='DIAJUKAN'&&st!=='DITOLAK')return {success:false,message:'Data hanya bisa diedit saat status DIAJUKAN atau DITOLAK'};
    var volume=num(data.volume),harga=num(data.harga_satuan),jumlah=volume*harga;
    var kategori=upper(data.kategori||r.kategori)==='NON PENGADAAN'?'NON PENGADAAN':'PENGADAAN';
    var jenisNon=kategori==='NON PENGADAAN'?(norm(data.jenis_non_pengadaan||r.jenis_non_pengadaan)||'Honorarium'):'';
    var metode=kategori==='NON PENGADAAN'?'':metodePemilihanByNilai(jumlah),waktu=normalizeWaktuPemilihan(data.waktu_pemilihan);
    if(!norm(data.nama_kegiatan)||!volume||!harga)return {success:false,message:'Nama kegiatan, volume, dan harga wajib diisi'};
    if(!waktu)return {success:false,message:'Waktu pemilihan wajib diisi'};
    if(mode==='change'&&hasDokumenPencairanForKegiatanV63(data.id_kegiatan))return {success:false,message:'Perubahan perencanaan tidak dapat diajukan karena kegiatan sudah memiliki dokumen pencairan'};
    var cek=validasiPaguBidang(user.id_bidang,jumlah,data.id_kegiatan);if(!cek.ok)return {success:false,message:cek.message,detail:cek};
    var now=new Date(),waktuText=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
    var before={nama_kegiatan:norm(r.nama_kegiatan),keterangan:norm(r.keterangan||r.rincian_kebutuhan),volume:num(r.volume),satuan:norm(r.satuan),harga_satuan:num(r.harga_satuan),jumlah:num(r.jumlah)||(num(r.volume)*num(r.harga_satuan)),metode_pemilihan:norm(r.metode_pemilihan)||metodePemilihanByNilai(num(r.jumlah)||(num(r.volume)*num(r.harga_satuan))),waktu_pemilihan:norm(r.waktu_pemilihan)};
    var after={nama_kegiatan:norm(data.nama_kegiatan),keterangan:norm(data.keterangan||data.rincian_kebutuhan),volume:volume,satuan:norm(data.satuan),harga_satuan:harga,jumlah:jumlah,metode_pemilihan:metode,waktu_pemilihan:waktu};
    var marker='__COMPARE_V73__'+Utilities.base64EncodeWebSafe(JSON.stringify({waktu:waktuText,mode:mode,oleh:user.nama||'',sebelum:before,sesudah:after}));
    var fields={nama_kegiatan:data.nama_kegiatan||'',rincian_kebutuhan:data.rincian_kebutuhan||'',keterangan:data.keterangan||'',volume:volume,satuan:data.satuan||'',harga_satuan:harga,jumlah:jumlah,metode_pemilihan:metode,kategori:kategori,jenis_non_pengadaan:jenisNon,waktu_pemilihan:waktu};
    var oldHist=norm(r.riwayat_perubahan),message='';
    if(mode==='change'){
      var ke=num(r.perubahan_ke)+1,label='Perubahan Ke-'+ke,entry=waktuText+' - '+label+': '+norm(data.alasan_perubahan);
      fields.status_perencanaan='PERUBAHAN_DIAJUKAN';fields.alasan_perubahan=data.alasan_perubahan||'';fields.perubahan_ke=ke;fields.riwayat_perubahan=(oldHist?oldHist+'\n'+entry:entry)+'\n'+marker;
      message=label+' berhasil diajukan ke Verifikator';appendLog(user.nama,'AJUKAN_PERUBAHAN',data.id_kegiatan,label+' - '+data.alasan_perubahan);
    }else{
      var wasRejected=st==='DITOLAK',entry2=waktuText+' - '+(wasRejected?'Perbaikan diajukan ulang':'Data diedit dan diajukan ulang')+' oleh '+(user.nama||'');
      fields.status_perencanaan='DIAJUKAN';fields.alasan_penolakan=wasRejected?norm(r.alasan_penolakan):'';fields.riwayat_perubahan=(oldHist?oldHist+'\n'+entry2:entry2)+'\n'+marker;
      message=wasRejected?'Perbaikan perencanaan berhasil diajukan ulang ke Verifikator':'Perencanaan berhasil diajukan ulang';appendLog(user.nama,'EDIT_PERENCANAAN',data.id_kegiatan,wasRejected?'Perbaikan diajukan ulang':'Diajukan ulang');
    }
    updateRowFieldsFastV109_(SH_RENCANA,r._row,fields);
    var updated={};Object.keys(r).forEach(function(k){if(k!=='_row')updated[k]=r[k];});Object.keys(fields).forEach(function(k){updated[k]=fields[k];});
    return {success:true,message:message,perencanaan:updated};
  }

  function setStatusPerencanaanFastV141_(req,status){
    if(!isPBJUser_(req.user))throw new Error('Akses Verifikator diperlukan');
    var r=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);if(!r)return {success:false,message:'Perencanaan tidak ditemukan'};
    if(!canAccessBidang_(req.user,r.id_bidang))return {success:false,message:'Bidang ini tidak ditugaskan kepada akun Anda'};
    if(status==='DITOLAK'&&!norm(req.catatan))return {success:false,message:'Catatan perbaikan wajib diisi'};
    var now=new Date(),petugas=req.user&&req.user.nama?req.user.nama:'Verifikator',waktu=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm');
    var entry=status==='DISETUJUI'?(waktu+' - Verifikator: Perencanaan disetujui oleh '+petugas):(waktu+' - Verifikator: Perlu perbaikan - '+(req.catatan||''));
    var fields={status_perencanaan:status,alasan_penolakan:status==='DITOLAK'?(req.catatan||''):'',riwayat_perubahan:norm(r.riwayat_perubahan)?norm(r.riwayat_perubahan)+'\n'+entry:entry};
    updateRowFieldsFastV109_(SH_RENCANA,r._row,fields);
    appendLog(req.user.nama,status==='DISETUJUI'?'SETUJUI_PERENCANAAN':'TOLAK_PERENCANAAN',req.id_kegiatan,req.catatan||'');
    var updated={};Object.keys(r).forEach(function(k){if(k!=='_row')updated[k]=r[k];});Object.keys(fields).forEach(function(k){updated[k]=fields[k];});
    return {success:true,message:status==='DISETUJUI'?'Perencanaan disetujui':'Perencanaan dikembalikan untuk perbaikan',perencanaan:updated};
  }

  function savePerencanaanFastV141_(req){
    var user=req.user||{};if(isAdminUser(user))return {success:false,message:'Admin tidak boleh input perencanaan. Admin hanya menyetujui/menolak.'};
    var data=req.data||{},idBidang=user.id_bidang,volume=num(data.volume),harga=num(data.harga_satuan),jumlah=volume*harga;
    var kategori=upper(data.kategori)==='NON PENGADAAN'?'NON PENGADAAN':'PENGADAAN';
    var jenisNon=kategori==='NON PENGADAAN'?(norm(data.jenis_non_pengadaan)||'Honorarium'):'';
    var metode=kategori==='NON PENGADAAN'?'':metodePemilihanByNilai(jumlah),waktu=normalizeWaktuPemilihan(data.waktu_pemilihan);
    if(!norm(data.nama_kegiatan)||!volume||!harga)return {success:false,message:'Nama kegiatan, volume, dan harga wajib diisi'};
    if(!waktu)return {success:false,message:'Waktu pemilihan wajib diisi'};
    var bidang=findById(getRows(SH_BIDANG),'id_bidang',idBidang);if(!bidang)return {success:false,message:'Bidang tidak ditemukan'};
    if(upper(bidang.status_akses)!=='BUKA')return {success:false,message:'Akses perencanaan bidang sedang ditutup. Menu pencairan tetap bisa digunakan.'};
    var cek=validasiPaguBidang(idBidang,jumlah,'');if(!cek.ok)return {success:false,message:cek.message,detail:cek};
    var now=new Date(),id='KEG-'+now.getTime()+'-'+Math.floor(Math.random()*900+100);
    var row={id_kegiatan:id,id_bidang:idBidang,nama_kegiatan:data.nama_kegiatan||'',rincian_kebutuhan:data.rincian_kebutuhan||'',keterangan:data.keterangan||'',volume:volume,satuan:data.satuan||'',harga_satuan:harga,jumlah:jumlah,metode_pemilihan:metode,waktu_pemilihan:waktu,status_perencanaan:'DIAJUKAN',tanggal_input:now,input_by:user.nama||'',alasan_penolakan:'',alasan_perubahan:'',perubahan_ke:0,riwayat_perubahan:'',status_pencairan:kategori==='NON PENGADAAN'?'MENUNGGU PERSETUJUAN PBJ':'BELUM ADA DOKUMEN',kategori:kategori,jenis_non_pengadaan:jenisNon};
    appendByHeader(SH_RENCANA,row);appendLog(user.nama,'AJUKAN_PERENCANAAN',id,data.nama_kegiatan||'');
    return {success:true,message:'Perencanaan berhasil diajukan',id_kegiatan:id,perencanaan:row};
  }

  var routeActionV141Base_=routeAction_;
  routeAction_=function(a,req){
    if(a==='getPerencanaanRealtimeV141')return getPerencanaanRealtimeV141(req);
    if(a==='savePerencanaan')return savePerencanaanFastV141_(req);
    if(a==='updatePerencanaan')return updatePerencanaanFastV141_(req);
    if(a==='setujuiPerencanaan')return setStatusPerencanaanFastV141_(req,'DISETUJUI');
    if(a==='tolakPerencanaan')return setStatusPerencanaanFastV141_(req,'DITOLAK');
    return routeActionV141Base_(a,req);
  };
})();

/* =========================================================
   SIMPROV v142 - Patch Percepatan Baca Data (aman, aditif)
   ---------------------------------------------------------
   TUJUAN:
   Menghilangkan pembacaan sheet yang berulang-ulang dalam SATU
   permintaan baca (terutama getDashboard). Sebelumnya, untuk tiap
   kegiatan, sistem membaca ulang seluruh sheet DOKUMEN & PERENCANAAN
   berkali-kali lewat computeStatusPencairanKeuangan_ dan
   progressDokumenWajibV71_. Pada banyak kegiatan, satu kali buka
   dashboard bisa membaca sheet yang sama ratusan kali -> lambat.

   CARA KERJANYA (tanpa mengubah logika mana pun):
   - Hanya untuk action yang MURNI membaca (daftar READ_ACTIONS_FAST),
     hasil getRows disimpan sementara di memori SELAMA permintaan itu.
     Sheet yang sama jadi cukup dibaca 1x; sisanya diambil dari memori.
   - Data yang dikembalikan tetap SAMA PERSIS (disalin ulang tiap
     panggil, termasuk kolom _row), jadi tidak ada perilaku yang berubah.
   - PENGAMAN: setiap kali ada penulisan ke sheet (setCell / appendByHeader
     / updateRowFieldsFastV109_), cache langsung dibuang, sehingga
     pembacaan berikutnya selalu data terbaru. Jadi walau ada action baca
     yang diam-diam menulis, datanya tetap benar (paling-paling kurang cepat).
   - Untuk action yang menulis (simpan/verifikasi/upload/dll), cache
     TIDAK diaktifkan sama sekali -> perilakunya persis seperti sebelumnya.

   TIDAK mengubah: nama action, format request/response, nama sheet,
   nama kolom, ID data, folder/lampiran, maupun hasil perhitungan.
   ========================================================= */
(function(){
  // Action yang murni membaca data (tidak mengubah baris data).
  var READ_ACTIONS_FAST = {
    getDashboard: 1,
    getPublicDashboard: 1,
    getPerencanaanRealtimeV141: 1,
    getPaymentWorkspaceV138: 1,
    getSuratWorkspaceV133: 1,
    getSuratLampiranV137: 1,
    getSystemIdentity: 1,
    getVerifierAccounts: 1
  };

  // null  = memo mati (mode normal / menulis)
  // objek = memo aktif (sedang melayani 1 permintaan baca)
  var __rowsMemo = null;

  // --- Bungkus getRows: dalam 1 permintaan baca, sheet sama cukup dibaca 1x ---
  var __getRowsBaseV142 = getRows;
  getRows = function(name){
    if(!__rowsMemo) return __getRowsBaseV142(name);           // mode normal: apa adanya
    if(!Object.prototype.hasOwnProperty.call(__rowsMemo, name)){
      __rowsMemo[name] = __getRowsBaseV142(name);              // baca 1x dari Google Sheets
    }
    // Selalu kembalikan SALINAN baru: pemanggil boleh mengubah hasilnya
    // tanpa memengaruhi pemanggil lain (perilaku identik dengan baca ulang).
    var src = __rowsMemo[name], copy = [];
    for(var i=0; i<src.length; i++){
      var r = src[i], o = {};
      for(var k in r){ if(Object.prototype.hasOwnProperty.call(r,k)) o[k] = r[k]; }
      copy.push(o);
    }
    return copy;
  };

  // --- Pengaman: penulisan ke sheet membuang cache (data selalu terbaru) ---
  function __invalidateMemoV142(){ if(__rowsMemo) __rowsMemo = {}; }

  var __setCellBaseV142 = setCell;
  setCell = function(name, row, header, value){
    __invalidateMemoV142();
    return __setCellBaseV142(name, row, header, value);
  };

  var __appendByHeaderBaseV142 = appendByHeader;
  appendByHeader = function(name, obj){
    __invalidateMemoV142();
    return __appendByHeaderBaseV142(name, obj);
  };

  if(typeof updateRowFieldsFastV109_ === 'function'){
    var __updBaseV142 = updateRowFieldsFastV109_;
    updateRowFieldsFastV109_ = function(sheetName, row, fields){
      __invalidateMemoV142();
      return __updBaseV142(sheetName, row, fields);
    };
  }

  // --- Bungkus router paling akhir: memo hanya untuk action baca ---
  var __routeBaseV142 = routeAction_;
  routeAction_ = function(a, req){
    if(READ_ACTIONS_FAST[a]){
      __rowsMemo = {};                       // nyalakan memo untuk permintaan ini
      try { return __routeBaseV142(a, req); }
      finally { __rowsMemo = null; }          // selalu dimatikan setelah selesai
    }
    return __routeBaseV142(a, req);           // action lain: tanpa memo (persis lama)
  };
})();


/* =========================================================
   SIMPROV v144 - Indeks Data per Request (aman, aditif)
   ---------------------------------------------------------
   v142 sudah membuat sheet hanya dibaca sekali, tetapi helper status
   masih menyalin dan memfilter seluruh array untuk setiap kegiatan.
   Patch ini membuat indeks PERENCANAAN dan DOKUMEN satu kali selama
   action baca. Rumus status dan format response tetap sama.
   ========================================================= */
var __requestIndexV144_ = null;
function __rowsOnceV144_(sheetName){
  if(!__requestIndexV144_) return getRows(sheetName);
  if(!__requestIndexV144_.rows[sheetName]) __requestIndexV144_.rows[sheetName]=getRows(sheetName);
  return __requestIndexV144_.rows[sheetName];
}
function __mapOneV144_(sheetName,field){
  var key=sheetName+'|ONE|'+field;
  if(!__requestIndexV144_) return null;
  if(!__requestIndexV144_.maps[key]){
    var map={};
    __rowsOnceV144_(sheetName).forEach(function(r){var id=norm(r[field]);if(id&&!map[id])map[id]=r;});
    __requestIndexV144_.maps[key]=map;
  }
  return __requestIndexV144_.maps[key];
}
function __mapManyV144_(sheetName,field){
  var key=sheetName+'|MANY|'+field;
  if(!__requestIndexV144_) return null;
  if(!__requestIndexV144_.maps[key]){
    var map={};
    __rowsOnceV144_(sheetName).forEach(function(r){var id=norm(r[field]);if(!id)return;(map[id]||(map[id]=[])).push(r);});
    __requestIndexV144_.maps[key]=map;
  }
  return __requestIndexV144_.maps[key];
}

var progressDokumenWajibV144Base_=progressDokumenWajibV71_;
progressDokumenWajibV71_=function(idKegiatan){
  if(!__requestIndexV144_) return progressDokumenWajibV144Base_(idKegiatan);
  var id=norm(idKegiatan);
  var rencana=(__mapOneV144_(SH_RENCANA,'id_kegiatan')||{})[id];
  if(!rencana) return {required:[],requiredCount:0,uploaded:0,valid:0,missing:[],allUploaded:false,allValid:false};
  var nilai=rencana.jumlah||(num(rencana.volume)*num(rencana.harga_satuan));
  var required=dokumenKetentuanByNilai(nilai);
  var docs=((__mapManyV144_(SH_DOKUMEN,'id_kegiatan')||{})[id]||[]);
  var map={};
  docs.forEach(function(d){map[normalizeJenisDokumenKeyV71_(d.jenis_dokumen)]=d;});
  var uploaded=0,valid=0,missing=[];
  required.forEach(function(j){var d=map[normalizeJenisDokumenKeyV71_(j)]||null;if(d){uploaded++;if(isDocValidKeuangan_(d))valid++;}else missing.push(j);});
  return {required:required,requiredCount:required.length,uploaded:uploaded,valid:valid,missing:missing,allUploaded:uploaded===required.length,allValid:required.length>0&&valid===required.length};
};

var computeStatusPencairanV144Base_=computeStatusPencairanKeuangan_;
computeStatusPencairanKeuangan_=function(idKegiatan){
  if(!__requestIndexV144_) return computeStatusPencairanV144Base_(idKegiatan);
  var id=norm(idKegiatan);
  var rencana=(__mapOneV144_(SH_RENCANA,'id_kegiatan')||{})[id];
  var st=upper(rencana&&rencana.status_pencairan);
  if(['MENUNGGU VERIFIKASI KEUANGAN','MENUNGGU BENDAHARA','PERBAIKAN KEUANGAN','SELESAI'].indexOf(st)>=0) return st;
  var docs=((__mapManyV144_(SH_DOKUMEN,'id_kegiatan')||{})[id]||[]);
  var prog=progressDokumenWajibV71_(id);
  if(!docs.length) return 'MENUNGGU DOKUMEN PENCAIRAN';
  if(docs.some(isDocPerbaikanKeuangan_)) return 'PERBAIKAN DOKUMEN';
  if(!prog.allUploaded) return 'DOKUMEN BELUM LENGKAP';
  if(prog.allValid) return 'MENUNGGU FINALISASI';
  if(docs.some(function(d){var s=upper(d.status_verifikasi);return s==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN'||s==='MENUNGGU VERIFIKASI PERBAIKAN';})) return 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
  return 'MENUNGGU VERIFIKASI DOKUMEN';
};

var routeActionV144Base_=routeAction_;
routeAction_=function(a,req){
  var indexedReads={getDashboard:1,getPublicDashboard:1,getPerencanaanRealtimeV141:1,getPaymentWorkspaceV138:1,getSuratWorkspaceV133:1};
  if(indexedReads[a]){
    __requestIndexV144_={rows:{},maps:{}};
    try{return routeActionV144Base_(a,req);}finally{__requestIndexV144_=null;}
  }
  return routeActionV144Base_(a,req);
};

/* =========================================================
   SIMPROV v145 - Surat, sumber harga edit, dan pipeline pembayaran
   ---------------------------------------------------------
   Patch aditif. Tidak mengubah nama sheet/action/role yang sudah ada.
   ========================================================= */
(function(){
  var paymentEligibilityBaseV145_ = paymentEligibilityV138_;
  paymentEligibilityV138_ = function(r){
    if(!r) return {ready:false,reason:'Kegiatan tidak ditemukan',required:[],valid:0};
    var kategori=upper(r.kategori),metode=upper(r.metode_pemilihan);
    if(kategori==='NON PENGADAAN'||metode==='NON PENGADAAN'){
      return {ready:false,reason:'Paket Non Pengadaan diproses melalui menu Pencatatan Non Pengadaan',required:[],valid:0,hidden_from_payment:true};
    }
    if(upper(r.status_perencanaan)!=='DISETUJUI'){
      return {ready:false,reason:'Perencanaan belum disetujui Verifikator PBJ',required:[],valid:0};
    }
    /* Pencatatan Pengadaan/Belanja Langsung dapat membuat pengajuan segera
       setelah perencanaan disetujui. Dokumen pendukung tetap diperiksa pada
       alur Pengajuan Pembayaran oleh Verifikator Keuangan. */
    if(metode==='BELANJA LANGSUNG'){
      return {ready:true,reason:'Perencanaan telah disetujui dan siap dibuatkan pengajuan pembayaran',required:[],valid:0};
    }
    return paymentEligibilityBaseV145_(r);
  };

  var getPaymentWorkspaceBaseV145_ = getPaymentWorkspaceV138;
  getPaymentWorkspaceV138 = function(req){
    var res=getPaymentWorkspaceBaseV145_(req);
    if(res&&res.success&&Array.isArray(res.kegiatan)){
      res.kegiatan=res.kegiatan.filter(function(k){
        return upper(k.kategori)!=='NON PENGADAAN'&&upper(k.metode_pemilihan)!=='NON PENGADAAN';
      });
    }
    return res;
  };

  function standardEditMetaV145_(req){
    var d=req&&req.data||{},hasSource=Object.prototype.hasOwnProperty.call(d,'sumber_harga'),source=upper(d.sumber_harga||'');
    var plan=findById(getRows(SH_RENCANA),'id_kegiatan',d.id_kegiatan);
    if(!plan) return {ok:false,message:'Perencanaan tidak ditemukan'};
    /* Kompatibilitas untuk browser yang masih memakai frontend lama:
       bila sumber_harga belum dikirim, jangan mengubah metadata lama. */
    if(!hasSource) return {ok:true,fields:{}};
    if(source!=='SB'){
      return {ok:true,fields:{
        jenis_pengadaan:norm(d.jenis_pengadaan||plan.jenis_pengadaan),
        cara_pelaksanaan:norm(d.cara_pelaksanaan||plan.cara_pelaksanaan||'Penyedia'),
        id_standar_biaya:'',nama_standar_biaya:'',sifat_standar:'',nilai_standar:'',sumber_standar:''
      }};
    }
    var id=norm(d.id_standar_biaya);
    if(!id) return {ok:false,message:'Pilih Standar Biaya terlebih dahulu'};
    var standar=findById(getRowsOptional_(SH_STANDAR_BIAYA_V97),'id_standar',id);
    if(!standar) return {ok:false,message:'Standar Biaya yang dipilih tidak ditemukan atau sudah tidak tersedia'};
    if(upper(standar.status||'AKTIF')!=='AKTIF') return {ok:false,message:'Standar Biaya yang dipilih sudah tidak aktif'};
    var kategoriPlan=upper(plan.kategori)==='NON PENGADAAN'?'NON PENGADAAN':'PENGADAAN';
    var kategoriStandar=upper(standar.kategori_anggaran)==='NON PENGADAAN'?'NON PENGADAAN':'PENGADAAN';
    if(kategoriPlan!==kategoriStandar) return {ok:false,message:'Kategori Standar Biaya tidak sesuai dengan kategori perencanaan'};
    var limit=num(standar.besaran),harga=num(d.harga_satuan);
    if(upper(standar.sifat_standar)==='BATAS TERTINGGI'&&limit>0&&harga>limit){
      return {ok:false,message:'Harga satuan melebihi batas tertinggi Standar Biaya sebesar '+limit};
    }
    return {ok:true,fields:{
      jenis_pengadaan:kategoriPlan==='NON PENGADAAN'?'':norm(standar.jenis_pengadaan||d.jenis_pengadaan||plan.jenis_pengadaan),
      cara_pelaksanaan:norm(d.cara_pelaksanaan||plan.cara_pelaksanaan||'Penyedia'),
      id_standar_biaya:norm(standar.id_standar),
      nama_standar_biaya:norm(standar.jenis_biaya),
      sifat_standar:norm(standar.sifat_standar),
      nilai_standar:standar.besaran,
      sumber_standar:norm(standar.sumber_dasar)
    }};
  }

  var routeActionBaseV145_=routeAction_;
  routeAction_=function(a,req){
    if(a!=='updatePerencanaan') return routeActionBaseV145_(a,req);
    var meta=standardEditMetaV145_(req);
    if(!meta.ok) return {success:false,message:meta.message};
    var result=routeActionBaseV145_(a,req);
    if(!result||!result.success) return result;
    var keys=Object.keys(meta.fields||{});
    if(!keys.length) return result;
    var row=findById(getRows(SH_RENCANA),'id_kegiatan',req&&req.data&&req.data.id_kegiatan);
    if(!row) return result;
    updateRowFieldsFastV109_(SH_RENCANA,row._row,meta.fields);
    result.perencanaan=result.perencanaan||{};
    keys.forEach(function(k){result.perencanaan[k]=meta.fields[k];});
    return result;
  };
})();

/* =========================================================
   SIMPROV v146 - Alur Pengajuan Pembayaran Ringkas
   ---------------------------------------------------------
   Alur baru:
   BIDANG -> PIMPINAN/KETUA HARIAN -> VERIFIKATOR KEUANGAN
   -> BENDAHARA -> SELESAI.

   Status lama tetap dibaca agar data yang sudah berjalan tidak rusak.
   ========================================================= */
var SIMPROV_PAYMENT_FLOW_V146_='146.0';

submitPaymentV138=function(req){
  var user=req.user||{},p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan);
  if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};
  if(!paymentCanEditDraftV138_(user,p))return {success:false,message:'Pengajuan tidak dapat diajukan dari status saat ini'};
  var required=paymentRequiredDocsV138_(p),map=paymentDocMapV138_(p.id_pengajuan),missing=required.filter(function(j){return !map[paymentDocKeyV138_(j)];});
  if(missing.length)return {success:false,message:'Dokumen wajib belum lengkap: '+missing.join(', ')};
  var mandatory=['nomor_nd_bidang','tanggal_nd_bidang','hari_tanggal_kegiatan','tempat_kegiatan','nomor_sptjm','jabatan_pengaju','nama_pengaju'];
  var kosong=mandatory.filter(function(k){return !norm(p[k]);});
  if(kosong.length)return {success:false,message:'Lengkapi data surat terlebih dahulu: '+kosong.join(', ')};
  var financialError=paymentValidateFinancialRowsV138_(p);if(financialError)return {success:false,message:financialError};
  var now=new Date(),actor=norm(user.nama)||norm(user.username)||'Pengguna Bidang';
  var token='TTE-PAY-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMddHHmmss')+'-'+Math.floor(Math.random()*9000+1000);
  updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{
    status_pengajuan:'MENUNGGU PERSETUJUAN PIMPINAN',
    tahap_aktif:'PIMPINAN',
    tte_bidang_oleh:actor,
    tte_bidang_waktu:now,
    tte_bidang_token:token,
    updated_at:now,
    riwayat:paymentHistoryV138_(p,user,'Nota Dinas Bidang dan SPTJM ditandatangani elektronik, lalu diajukan kepada Pimpinan/Ketua Harian | '+token)
  });
  var r=findById(getRows(SH_RENCANA),'id_kegiatan',p.id_kegiatan);
  if(r)updateRowFieldsFastV109_(SH_RENCANA,r._row,{status_pencairan:'MENUNGGU PERSETUJUAN PIMPINAN'});
  upsertPencairan(p.id_kegiatan,p.id_bidang,'MENUNGGU PERSETUJUAN PIMPINAN','Pengajuan pembayaran '+p.id_pengajuan);
  appendLog(actor,'AJUKAN_PEMBAYARAN',p.id_pengajuan,'Diajukan kepada Pimpinan/Ketua Harian');
  return {success:true,message:'Nota Dinas dan SPTJM berhasil ditandatangani, lalu dikirim kepada Pimpinan/Ketua Harian',tte_bidang_oleh:actor,tte_bidang_waktu:now,tte_bidang_token:token,status_pengajuan:'MENUNGGU PERSETUJUAN PIMPINAN'};
};

approvePaymentV138=function(req){
  var user=req.user||{},role=paymentRoleV138_(user),p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan);
  if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};
  if(role!=='PIMPINAN'&&role!=='ADMIN')return {success:false,message:'Akses Pimpinan diperlukan'};
  var current=upper(p.status_pengajuan);
  if(['MENUNGGU PERSETUJUAN PIMPINAN','MENUNGGU PERINTAH KETUA HARIAN'].indexOf(current)<0)return {success:false,message:'Pengajuan tidak sedang menunggu persetujuan Pimpinan'};
  var decision=upper(req.keputusan),note=norm(req.catatan),now=new Date();
  if(decision==='KEMBALIKAN'){
    if(!note)return {success:false,message:'Alasan pengembalian wajib diisi'};
    updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{status_pengajuan:'PERBAIKAN BIDANG',tahap_aktif:'BIDANG',catatan_verifikasi:note,updated_at:now,riwayat:paymentHistoryV138_(p,user,'Pimpinan/Ketua Harian mengembalikan pengajuan kepada Bidang | '+note)});
    upsertPencairan(p.id_kegiatan,p.id_bidang,'PERBAIKAN DISPOSISI',note);
    appendLog(norm(user.nama),'PERSETUJUAN_PENGAJUAN',p.id_pengajuan,'DIKEMBALIKAN');
    return {success:true,message:'Pengajuan dikembalikan kepada Bidang untuk diperbaiki',status_pengajuan:'PERBAIKAN BIDANG'};
  }
  if(decision!=='SETUJUI')return {success:false,message:'Keputusan tidak valid'};
  var jabatan=norm(req.pimpinan_jabatan)||'KETUA HARIAN';
  updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{
    status_pengajuan:'MENUNGGU VERIFIKASI KEUANGAN',
    tahap_aktif:'VERIFIKATOR_KEUANGAN',
    pimpinan_penyetuju:norm(user.nama)||norm(user.username)||'Pimpinan',
    pimpinan_jabatan:jabatan,
    tanggal_persetujuan:now,
    catatan_verifikasi:note,
    updated_at:now,
    riwayat:paymentHistoryV138_(p,user,'Pengajuan disetujui secara elektronik oleh Pimpinan/Ketua Harian dan diteruskan kepada Verifikator Keuangan')
  });
  upsertPencairan(p.id_kegiatan,p.id_bidang,'MENUNGGU VERIFIKASI KEUANGAN','Disetujui Pimpinan/Ketua Harian');
  appendLog(norm(user.nama),'PERSETUJUAN_PENGAJUAN',p.id_pengajuan,'DISETUJUI -> VERIFIKATOR KEUANGAN');
  return {success:true,message:'Pengajuan disetujui dan diteruskan kepada Verifikator Keuangan',status_pengajuan:'MENUNGGU VERIFIKASI KEUANGAN'};
};

verifyPaymentV138=function(req){
  var user=req.user||{},role=paymentRoleV138_(user),p=findById(paymentRowsV138_(),'id_pengajuan',req.id_pengajuan);
  if(!p)return {success:false,message:'Pengajuan tidak ditemukan'};
  if(role!=='VERIFIKATOR_KEUANGAN'&&role!=='ADMIN')return {success:false,message:'Akses Verifikator Keuangan diperlukan'};
  if(!canAccessBidang_(user,p.id_bidang)&&role!=='ADMIN')return {success:false,message:'Bidang ini tidak ditugaskan kepada akun Anda'};
  if(upper(p.status_pengajuan)!=='MENUNGGU VERIFIKASI KEUANGAN')return {success:false,message:'Pengajuan tidak sedang menunggu verifikasi keuangan'};
  var decision=upper(req.keputusan),note=norm(req.catatan),now=new Date();
  if(decision==='KEMBALIKAN'){
    if(!note)return {success:false,message:'Alasan pengembalian wajib diisi'};
    updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{status_pengajuan:'PERBAIKAN BIDANG',tahap_aktif:'BIDANG',catatan_verifikasi:note,updated_at:now,riwayat:paymentHistoryV138_(p,user,'Verifikator Keuangan mengembalikan pengajuan kepada Bidang | '+note)});
    upsertPencairan(p.id_kegiatan,p.id_bidang,'PERBAIKAN KEUANGAN',note);
    appendLog(norm(user.nama),'VERIFIKASI_PENGAJUAN',p.id_pengajuan,'DIKEMBALIKAN');
    return {success:true,message:'Pengajuan dikembalikan kepada Bidang untuk diperbaiki',status_pengajuan:'PERBAIKAN BIDANG'};
  }
  if(decision!=='VALID')return {success:false,message:'Keputusan verifikasi tidak valid'};
  var required=paymentRequiredDocsV138_(p),map=paymentDocMapV138_(p.id_pengajuan),missing=required.filter(function(j){return !map[paymentDocKeyV138_(j)];});
  if(missing.length)return {success:false,message:'Dokumen belum lengkap: '+missing.join(', ')};
  paymentDocRowsV138_().filter(function(d){return norm(d.id_pengajuan)===norm(p.id_pengajuan);}).forEach(function(d){
    updateRowFieldsFastV109_(SH_PAYMENT_DOC_V138,d._row,{status_dokumen:'VALID',catatan:'',tanggal_verifikasi:now,verifikasi_by:norm(user.nama),riwayat:(norm(d.riwayat)?norm(d.riwayat)+'\n':'')+Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Dinyatakan valid oleh '+norm(user.nama)});
  });
  var group=paymentGroupDataV138_(p.id_bidang),nomor=norm(req.nomor_lembar_verifikasi)||('VER-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMdd-HHmm'));
  updateRowFieldsFastV109_(SH_PAYMENT_V138,p._row,{
    status_pengajuan:'MENUNGGU PEMBAYARAN BENDAHARA',
    tahap_aktif:'BENDAHARA',
    catatan_verifikasi:note,
    nomor_lembar_verifikasi:nomor,
    verifikator_nama:norm(user.nama)||group.verifier,
    verifikator_jabatan:'VERIFIKATOR KEUANGAN',
    tanggal_verifikasi:now,
    updated_at:now,
    riwayat:paymentHistoryV138_(p,user,'Berkas dinyatakan lengkap dan sah; Lembar Verifikasi diterbitkan; pengajuan diteruskan kepada Bendahara')
  });
  upsertPencairan(p.id_kegiatan,p.id_bidang,'MENUNGGU BENDAHARA','Lembar Verifikasi '+nomor);
  appendLog(norm(user.nama),'VERIFIKASI_PENGAJUAN',p.id_pengajuan,'VALID -> BENDAHARA');
  return {success:true,message:'Berkas valid dan pengajuan diteruskan kepada Bendahara',status_pengajuan:'MENUNGGU PEMBAYARAN BENDAHARA',nomor_lembar_verifikasi:nomor};
};


/* =========================================================
   SIMPROV v147 - Persistensi Sumber Harga Perencanaan
   ========================================================= */
(function(){
  if(REQUIRED_HEADERS.PERENCANAAN.indexOf('sumber_harga')<0)REQUIRED_HEADERS.PERENCANAAN.push('sumber_harga');

  function standardNameFromNoteV147_(value){
    var m=norm(value).match(/Standar\s+Biaya\s*:\s*([^|]+)/i);return m?norm(m[1]):'';
  }
  function sourceMetaV147_(d,current){
    d=d||{};current=current||{};
    var explicit=upper(d.sumber_harga||''),name=norm(d.nama_standar_biaya)||standardNameFromNoteV147_(d.keterangan),id=norm(d.id_standar_biaya);
    var source=explicit;
    if(!source){
      if(id||name||/Standar\s+Biaya\s*:/i.test(norm(d.keterangan)))source='SB';
      else if(/Harga\s+Pasar|Input\s+Manual/i.test(norm(d.keterangan)))source='PASAR';
      else source=upper(current.sumber_harga||'')||((norm(current.id_standar_biaya)||norm(current.nama_standar_biaya))?'SB':'PASAR');
    }
    if(source!=='SB')return {sumber_harga:'PASAR',id_standar_biaya:'',nama_standar_biaya:'',sifat_standar:'',nilai_standar:'',sumber_standar:''};
    var standards=getRowsOptional_(SH_STANDAR_BIAYA_V97),standard=null;
    if(id)standard=findById(standards,'id_standar',id);
    if(!standard&&name){var key=upper(name);standard=standards.find(function(s){return upper(s.jenis_biaya)===key;});}
    if(!standard){
      var harga=num(d.harga_satuan||current.harga_satuan),satuan=upper(d.satuan||current.satuan);
      standard=standards.find(function(s){return num(s.besaran)===harga&&(!satuan||upper(s.satuan)===satuan);});
    }
    return {
      sumber_harga:'SB',
      id_standar_biaya:norm(standard&&standard.id_standar)||id||norm(current.id_standar_biaya),
      nama_standar_biaya:norm(standard&&standard.jenis_biaya)||name||norm(current.nama_standar_biaya),
      sifat_standar:norm(standard&&standard.sifat_standar)||norm(current.sifat_standar),
      nilai_standar:standard?standard.besaran:(current.nilai_standar||d.harga_satuan||''),
      sumber_standar:norm(standard&&standard.sumber_dasar)||norm(current.sumber_standar)
    };
  }

  var routeActionBaseV147_=routeAction_;
  routeAction_=function(a,req){
    if(a!=='savePerencanaan'&&a!=='updatePerencanaan')return routeActionBaseV147_(a,req);
    var result=routeActionBaseV147_(a,req);if(!result||!result.success)return result;
    var d=req&&req.data||{},id=norm(d.id_kegiatan||result.id_kegiatan),row=findById(getRows(SH_RENCANA),'id_kegiatan',id);if(!row)return result;
    var meta=sourceMetaV147_(d,row);
    updateRowFieldsFastV109_(SH_RENCANA,row._row,meta);
    result.perencanaan=result.perencanaan||{};
    Object.keys(meta).forEach(function(k){result.perencanaan[k]=meta[k];});
    return result;
  };
})();


/* =========================================================
   SIMPROV v148 - Endpoint Login Ringan
   ========================================================= */
var SIMPROV_LOGIN_FAST_VERSION_V148_='148.0';
var LOGIN_CACHE_KEY_V148_='SIMPROV_LOGIN_DATA_V148';

function loginDataFastV148_(){
  var cache=CacheService.getScriptCache(),raw=cache.get(LOGIN_CACHE_KEY_V148_);
  if(raw){try{return JSON.parse(raw);}catch(e){}}
  var data={users:getRows(SH_USER),bidangs:getRows(SH_BIDANG)};
  try{cache.put(LOGIN_CACHE_KEY_V148_,JSON.stringify(data),20);}catch(e){}
  return data;
}
function clearLoginCacheV148_(){try{CacheService.getScriptCache().remove(LOGIN_CACHE_KEY_V148_);}catch(e){}}
function loginFastV148(req){
  var username=norm(req&&req.username),password=norm(req&&req.password);
  if(!username||!password)return {success:false,message:'Username dan password wajib diisi'};
  var data=loginDataFastV148_(),users=data.users||[],bidangs=data.bidangs||[];
  var u=users.find(function(x){return norm(x.username)===username&&norm(x.password)===password;});
  if(!u)return {success:false,message:'Username atau password salah'};
  if(upper(u.status)!=='AKTIF')return {success:false,message:'Akun tidak aktif'};
  var r=actualRoleV133_(u);u.role=r;
  if(r!=='BIDANG'){
    u.nama_bidang=roleNameUser(u);
    return {success:true,message:'Login berhasil',user:u,idle_timeout_minutes:30,absolute_session_hours:8};
  }
  var b=bidangs.find(function(x){return norm(x.id_bidang)===norm(u.id_bidang);});
  if(!b)return {success:false,message:'Bidang akun tidak ditemukan di sheet BIDANG'};
  u.nama_bidang=b.nama_bidang;u.pagu=num(b.pagu);u.status_akses=b.status_akses;u.role='BIDANG';
  return {success:true,message:'Login berhasil',user:u,idle_timeout_minutes:30,absolute_session_hours:8};
}

var routeActionBaseV148_=routeAction_;
routeAction_=function(a,req){
  if(a==='loginFastV148')return loginFastV148(req);
  var result=routeActionBaseV148_(a,req);
  if(result&&result.success&&['saveVerifierAccount','updateVerifierAccount','saveManagedAccountV133','updateManagedAccountV133'].indexOf(a)>=0)clearLoginCacheV148_();
  return result;
};

/* Login cepat dilewatkan sebelum pemeriksaan seluruh header agar salah
   username/password tidak menunggu bootstrap dashboard. */
var doPostBaseV148_=doPost;
doPost=function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}');
    if(req.action==='loginFastV148')return out(loginFastV148(req));
  }catch(e2){}
  return doPostBaseV148_(e);
};

/* =========================================================
   SIMPROV v155 - Non Pengadaan: simpan database + cetak HTML
   ---------------------------------------------------------
   - Berlaku untuk seluruh jenis NON PENGADAAN.
   - Data penerima disimpan berversi tanpa membuat file Drive.
   - Dokumen lama ber-URL Drive tetap dipertahankan.
   - Dokumen Honorarium TTD menjadi dokumen wajib pertama.
   ========================================================= */
var NON_REQUIRED_DOCS_V155_=['DOKUMEN HONORARIUM TTD','TANDA TERIMA','BUKTI POTONG PAJAK'];

function ensureNonV155Headers_(){
  ensureSheetHeadersV138_(SH_NON_PENGADAAN,REQUIRED_HEADERS.NON_PENGADAAN);
  ensureSheetHeadersV138_(SH_HONOR_PENERIMA,REQUIRED_HEADERS.HONOR_PENERIMA);
  ensureSheetHeadersV138_(SH_DOKUMEN_NON_PENGADAAN,REQUIRED_HEADERS.DOKUMEN_NON_PENGADAAN);
}
function latestNonVersionNumberV155_(idKegiatan){
  return getRowsOptional_(SH_NON_PENGADAAN).filter(function(x){return norm(x.id_kegiatan)===norm(idKegiatan);})
    .reduce(function(m,x){return Math.max(m,num(x.versi_pdf));},0);
}
function appendObjectsByCurrentHeaderV155_(sheetName,objects){
  if(!objects||!objects.length)return;
  var sheet=sh(sheetName),last=Math.max(1,sheet.getLastColumn());
  var headers=sheet.getRange(1,1,1,last).getValues()[0].map(norm);
  var rows=objects.map(function(o){return headers.map(function(h){return Object.prototype.hasOwnProperty.call(o,h)?o[h]:'';});});
  sheet.getRange(sheet.getLastRow()+1,1,rows.length,headers.length).setValues(rows);
}
function latestNonPrintRecordV155_(idKegiatan){
  var rows=getRowsOptional_(SH_NON_PENGADAAN).filter(function(x){return norm(x.id_kegiatan)===norm(idKegiatan)&&num(x.versi_pdf)>0;});
  rows.sort(function(a,b){return num(b.versi_pdf)-num(a.versi_pdf)||num(b._row)-num(a._row);});
  return rows[0]||null;
}
function latestRequiredNonDocsV155_(idKegiatan){
  ensureNonV155Headers_();
  var latestPrint=latestNonPrintRecordV155_(idKegiatan),currentVersion=latestPrint?num(latestPrint.versi_pdf):0;
  var rows=getRowsOptional_(SH_DOKUMEN_NON_PENGADAAN).filter(function(d){
    return norm(d.id_kegiatan)===norm(idKegiatan)&&NON_REQUIRED_DOCS_V155_.indexOf(upper(d.jenis_dokumen))>=0;
  }).sort(function(a,b){return num(a._row)-num(b._row);});
  var map={};
  rows.forEach(function(d){
    var key=upper(d.jenis_dokumen);
    if(key==='DOKUMEN HONORARIUM TTD'&&currentVersion>0){
      var dv=num(d.versi_dokumen);
      if(dv!==currentVersion)return;
    }
    map[key]=d;
  });
  return NON_REQUIRED_DOCS_V155_.map(function(j){return map[j];}).filter(Boolean);
}
// Nama fungsi lama tetap dipakai oleh seluruh patch sebelumnya, tetapi hasil aktif memakai 3 dokumen wajib.
latestRequiredNonDocsV109_=function(idKegiatan){return latestRequiredNonDocsV155_(idKegiatan);};

function nonDocStateV155_(idKegiatan){
  var docs=latestRequiredNonDocsV155_(idKegiatan);
  var complete=docs.length===NON_REQUIRED_DOCS_V155_.length&&docs.every(function(d){return !!norm(d.url_file);});
  var valid=complete&&docs.every(function(d){return upper(d.status_verifikasi)==='VALID DOKUMEN';});
  var repair=docs.some(function(d){return ['PERBAIKAN DOKUMEN','PERBAIKAN'].indexOf(upper(d.status_verifikasi))>=0;});
  var waitingRepair=docs.some(function(d){return upper(d.status_verifikasi)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';});
  var real=existingNonRealV110_(idKegiatan);
  var realFinal=!!real&&['FINAL','DISETUJUI','SELESAI','SAH'].indexOf(upper(real.status))>=0;
  var status='MENUNGGU DOKUMEN';
  if(repair)status='PERBAIKAN DOKUMEN';
  else if(waitingRepair)status='MENUNGGU VERIFIKASI PERBAIKAN';
  else if(valid&&realFinal)status='MENUNGGU FINALISASI';
  else if(valid&&real)status='MENUNGGU VERIFIKASI NILAI REALISASI';
  else if(valid)status='MENUNGGU PENCATATAN REALISASI';
  else if(complete)status='MENUNGGU VERIFIKASI DOKUMEN';
  return {status:status,complete:complete,valid:valid,repair:repair,docs:docs,realisasi:real,realFinal:realFinal};
}
function syncNonProcStatusV155_(idKegiatan){
  var state=nonDocStateV155_(idKegiatan);
  var r=findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan);
  var alreadyFinal=r&&upper(r.status_pencairan)==='SELESAI';
  if(!alreadyFinal&&r)updateRowFieldsFastV109_(SH_RENCANA,r._row,{status_pencairan:state.status});
  var latest=getLatestNonProc_(idKegiatan);
  if(latest&&!alreadyFinal)updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:state.status});
  if(alreadyFinal)state.status='SELESAI';
  return state;
}
syncNonProcStatusV109_=function(idKegiatan){return syncNonProcStatusV155_(idKegiatan);};
syncNonProcStatusV110_=function(idKegiatan){return syncNonProcStatusV155_(idKegiatan);};
syncFinalNonPengadaanV113_=function(idKegiatan){return syncNonProcStatusV155_(idKegiatan).status;};

function cleanNonRecipientV155_(rencana,p,i){
  var volume=num(p.volume),tarif=num(p.tarif_honor)||num(rencana.harga_satuan),bruto=volume*tarif;
  var nik=norm(p.nik_npwp).replace(/\D/g,''),kategori=upper(p.kategori_pajak||'INPUT MANUAL');
  var tarifPajak;
  if(kategori==='INPUT MANUAL')tarifPajak=num(p.tarif_pajak);
  else if(kategori==='ASN I-II')tarifPajak=0;
  else if(kategori==='ASN III')tarifPajak=5;
  else if(kategori==='ASN IV/PEJABAT')tarifPajak=15;
  else tarifPajak=2.5;
  if(!norm(p.nama_penerima))throw new Error('Nama penerima ke-'+(i+1)+' wajib diisi');
  if(!/^\d{16}$/.test(nik))throw new Error('NIK/NPWP penerima ke-'+(i+1)+' wajib tepat 16 digit angka');
  if(volume<=0)throw new Error('Volume penerima ke-'+(i+1)+' wajib lebih dari 0');
  if(tarif<=0)throw new Error('Tarif/nilai penerima ke-'+(i+1)+' wajib tersedia');
  if(tarifPajak<0||tarifPajak>100)throw new Error('Tarif pajak penerima ke-'+(i+1)+' harus 0 sampai 100 persen');
  var pajak=Math.round(bruto*tarifPajak/100),netto=bruto-pajak;
  return {nama_penerima:norm(p.nama_penerima),nik_npwp:nik,jabatan_peran:norm(p.jabatan_peran),volume:volume,satuan:norm(p.satuan)||norm(rencana.satuan)||'Orang/Kegiatan',tarif_honor:tarif,jenis_pajak:'PPh 21',kategori_pajak:kategori,tarif_pajak:tarifPajak,nilai_pajak:pajak,jumlah_bruto:bruto,jumlah_netto:netto};
}
function saveNonProcPrintDataV155_(req){
  ensureNonV155Headers_();
  var user=req.user||{},data=req.data||{},role=actualRoleV133_(user);
  if(role!=='BIDANG')return {success:false,message:'Pengisian data pembayaran Non Pengadaan hanya dapat dilakukan oleh User Bidang'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',data.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(publicCategory_(rencana)!=='NON PENGADAAN')return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  if(!isPlanningApproved_(rencana.status_perencanaan))return {success:false,message:'Data pembayaran hanya dapat disimpan setelah perencanaan DISETUJUI Verifikator PBJ'};
  if(upper(rencana.status_pencairan)==='SELESAI')return {success:false,message:'Paket sudah selesai dan tidak dapat dibuatkan versi baru'};
  var penerima=Array.isArray(data.penerima)?data.penerima:[];
  if(!penerima.length)return {success:false,message:'Minimal satu penerima/data pembayaran wajib diisi'};
  var clean=penerima.map(function(p,i){return cleanNonRecipientV155_(rencana,p,i);});
  var totalBruto=clean.reduce(function(n,p){return n+num(p.jumlah_bruto);},0);
  var totalPajak=clean.reduce(function(n,p){return n+num(p.nilai_pajak);},0);
  var totalNetto=clean.reduce(function(n,p){return n+num(p.jumlah_netto);},0);
  if(totalBruto>num(rencana.jumlah)+0.5)return {success:false,message:'Total bruto tidak boleh melebihi Nilai Perencanaan'};
  var now=new Date(),versi=latestNonVersionNumberV155_(rencana.id_kegiatan)+1;
  var idNon='NPG-'+now.getTime()+'-'+Math.floor(Math.random()*900+100);
  var nonRow={id_non_pengadaan:idNon,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,jenis_non_pengadaan:norm(rencana.jenis_non_pengadaan)||'Non Pengadaan',total_bruto:totalBruto,total_pajak:totalPajak,total_netto:totalNetto,status:'MENUNGGU DOKUMEN',tanggal_input:now,input_by:norm(user.nama),versi_pdf:versi,nama_file_pdf:'',url_pdf:'',tanggal_generate:now,generate_by:norm(user.nama)};
  appendObjectsByCurrentHeaderV155_(SH_NON_PENGADAAN,[nonRow]);
  var recipientRows=clean.map(function(p,i){return Object.assign({id_penerima:'HNR-'+now.getTime()+'-'+i+'-'+Math.floor(Math.random()*900+100),id_non_pengadaan:idNon,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,versi_pdf:versi,tanggal_input:now,input_by:norm(user.nama)},p);});
  appendObjectsByCurrentHeaderV155_(SH_HONOR_PENERIMA,recipientRows);
  var state=syncNonProcStatusV155_(rencana.id_kegiatan);
  appendLog(user.nama,'SIMPAN_DATA_CETAK_NON_PENGADAAN',rencana.id_kegiatan,'Versi '+versi+' | '+clean.length+' penerima | tanpa file Drive');
  nonRow.status=state.status;
  return {success:true,message:'Data berhasil disimpan. Menyiapkan dokumen cetak...',versi_dokumen:versi,non_pengadaan:nonRow,penerima:recipientRows,status_paket:state.status};
}

function uploadDokumenNonPengadaanBatchV155_(req){
  ensureNonV155Headers_();
  var user=req.user||{},items=Array.isArray(req.items)?req.items:[];
  if(actualRoleV133_(user)!=='BIDANG')return {success:false,message:'Upload dokumen dilakukan oleh User Bidang'};
  if(!items.length)return {success:false,message:'Tidak ada file yang dipilih'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(publicCategory_(rencana)!=='NON PENGADAAN')return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  var latestPrint=latestNonPrintRecordV155_(rencana.id_kegiatan),currentVersion=latestPrint?num(latestPrint.versi_pdf):0;
  var prepared=[],created=[];
  items.forEach(function(it,index){
    var jenis=norm(it.jenis_dokumen),key=upper(jenis);
    if(NON_REQUIRED_DOCS_V155_.indexOf(key)<0)throw new Error('Jenis dokumen tidak valid: '+jenis);
    if(key==='DOKUMEN HONORARIUM TTD'&&currentVersion<=0)throw new Error('Simpan data penerima dan cetak dokumen terlebih dahulu sebelum mengunggah Dokumen Honorarium TTD');
    assertUploadLimitV133_({file_base64:it.file_base64});
    var raw=String(it.file_base64||'').replace(/^data:[^,]+,/,'');
    if(!raw)throw new Error('File '+jenis+' kosong');
    prepared.push({jenis:jenis,key:key,name:norm(it.file_name)||('dokumen-'+(index+1)+'.pdf'),mime:norm(it.mime_type)||'application/pdf',bytes:Utilities.base64Decode(raw)});
  });
  var root=DriveApp.getFolderById(DRIVE_FOLDER_ID),bidangFolder=getOrCreateFolder(root,norm(rencana.id_bidang)+' - '+safeName(rencana.id_bidang));
  var npFolder=getOrCreateFolder(bidangFolder,'NON PENGADAAN'),kegFolder=getOrCreateFolder(npFolder,norm(rencana.id_kegiatan)+' - '+safeName(rencana.nama_kegiatan));
  try{
    prepared.forEach(function(x){var f=kegFolder.createFile(Utilities.newBlob(x.bytes,x.mime,x.name));try{f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}created.push({file:f,item:x,url:f.getUrl()});});
    var latest=ensureNonProcRecord_(rencana,user),now=new Date();
    var docs=created.map(function(x,i){return {id_dokumen_non:'DNP-'+now.getTime()+'-'+i+'-'+Math.floor(Math.random()*900+100),id_non_pengadaan:latest.id_non_pengadaan,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,jenis_dokumen:x.item.jenis,nama_file:x.item.name,url_file:x.url,tanggal_upload:now,upload_by:norm(user.nama),status_verifikasi:'MENUNGGU VERIFIKASI DOKUMEN',catatan_verifikator:'',tanggal_verifikasi:'',verifikasi_by:'',riwayat_dokumen:'Upload oleh '+norm(user.nama)+' untuk versi '+currentVersion,versi_dokumen:currentVersion};});
    appendObjectsByCurrentHeaderV155_(SH_DOKUMEN_NON_PENGADAAN,docs);
    var state=syncNonProcStatusV155_(rencana.id_kegiatan);
    appendLog(user.nama,'UPLOAD_DOKUMEN_NON_PENGADAAN',rencana.id_kegiatan,docs.map(function(d){return d.jenis_dokumen;}).join(', '));
    return {success:true,message:docs.length+' dokumen berhasil diunggah',dokumen:docs,status_paket:state.status};
  }catch(err){created.forEach(function(x){try{x.file.setTrashed(true);}catch(e){}});throw err;}
}

function uploadDokumenNonPengadaanV155_(req){
  var result=uploadDokumenNonPengadaanBatchV155_({user:req.user,id_kegiatan:req.id_kegiatan,items:[{jenis_dokumen:req.jenis_dokumen,file_name:req.file_name,mime_type:req.mime_type,file_base64:req.file_base64}]});
  if(result&&result.success&&Array.isArray(result.dokumen))result.dokumen=result.dokumen[0]||null;
  return result;
}

verifikasiRealisasiNonV112=function(req){
  var user=req.user||{};
  if(!(isAdminUser(user)||userRole_(user)==='VERIFIKATOR'))return {success:false,message:'Hanya Admin/Verifikator yang dapat memeriksa nilai realisasi'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);if(!rencana)return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!canAccessBidang_(user,rencana.id_bidang))return {success:false,message:'Kegiatan di luar bidang penugasan'};
  var real=existingNonRealV110_(req.id_kegiatan);if(!real)return {success:false,message:'Nilai realisasi belum dicatat oleh User Bidang'};
  var keputusan=upper(req.keputusan),now=new Date(),line='';
  if(keputusan==='SETUJUI'){
    line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Nilai realisasi disetujui oleh '+(user.nama||'Verifikator');
    updateRowFieldsFastV109_(SH_REALISASI,real._row,{status:'FINAL',riwayat_perubahan:norm(real.riwayat_perubahan)?norm(real.riwayat_perubahan)+'\n'+line:line});
  }else if(keputusan==='PERBAIKI'){
    var nilai=num(req.nilai_realisasi),catatan=norm(req.catatan);if(!nilai)return {success:false,message:'Nilai hasil perbaikan wajib diisi'};if(nilai>num(rencana.jumlah))return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan'};if(!catatan)return {success:false,message:'Catatan perbaikan wajib diisi'};
    line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Nilai realisasi diperbaiki dari '+num(real.nilai_realisasi)+' menjadi '+nilai+' oleh '+(user.nama||'Verifikator')+' | '+catatan;
    updateRowFieldsFastV109_(SH_REALISASI,real._row,{nilai_realisasi:nilai,keterangan:catatan,status:'FINAL',riwayat_perubahan:norm(real.riwayat_perubahan)?norm(real.riwayat_perubahan)+'\n'+line:line});
  }else return {success:false,message:'Keputusan tidak valid'};
  var state=syncNonProcStatusV155_(req.id_kegiatan);
  return {success:true,message:(keputusan==='SETUJUI'?'Nilai realisasi berhasil disetujui':'Nilai realisasi berhasil diperbaiki dan disetujui')+(state.status==='MENUNGGU FINALISASI'?'. Paket siap diselesaikan oleh Verifikator.':''),status:state.status};
};

selesaikanPaketNonPengadaanV116=function(req){
  var user=req.user||{};
  if(userRole_(user)!=='VERIFIKATOR'&&!isAdminUser(user))return {success:false,message:'Hanya Verifikator PBJ/Admin yang dapat menyelesaikan paket Non Pengadaan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);if(!rencana)return {success:false,message:'Kegiatan tidak ditemukan'};
  if(publicCategory_(rencana)!=='NON PENGADAAN')return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  if(!canAccessBidang_(user,rencana.id_bidang))return {success:false,message:'Kegiatan di luar bidang penugasan'};
  var state=nonDocStateV155_(rencana.id_kegiatan);
  if(!state.valid){
    var missing=NON_REQUIRED_DOCS_V155_.filter(function(j){var d=state.docs.find(function(x){return upper(x.jenis_dokumen)===j;});return !d||!norm(d.url_file)||upper(d.status_verifikasi)!=='VALID DOKUMEN';});
    return {success:false,message:'Dokumen wajib belum valid: '+missing.join(', ')};
  }
  if(!state.realFinal)return {success:false,message:'Nilai realisasi harus disetujui terlebih dahulu'};
  updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:'SELESAI'});
  var latest=getLatestNonProc_(rencana.id_kegiatan);if(latest)updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:'SELESAI'});
  appendLog(user.nama||'Verifikator','SELESAIKAN_PAKET_NON_PENGADAAN',rencana.id_kegiatan,'3 dokumen wajib dan nilai realisasi telah valid');
  return {success:true,message:'Paket Non Pengadaan berhasil diselesaikan',status:'SELESAI'};
};

var routeActionV155Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='saveNonProcPrintDataV155')return saveNonProcPrintDataV155_(req);
  if(a==='uploadDokumenNonPengadaanBatchV155')return uploadDokumenNonPengadaanBatchV155_(req);
  if(a==='uploadDokumenNonPengadaan')return uploadDokumenNonPengadaanV155_(req);
  return routeActionV155Base_(a,req);
};
var doPostV155Base_=doPost;
doPost=function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}');
    if(req.action==='saveNonProcPrintDataV155'||req.action==='uploadDokumenNonPengadaanBatchV155'){
      return withShortWriteLockV135_(function(){return out(routeAction_(req.action,req));});
    }
    return doPostV155Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err),stack:err&&err.stack?err.stack:''});}
};

/* v155 guard akhir: pencatatan realisasi wajib memakai 3 dokumen aktif. */
catatNonPengadaanV111=function(req){
  var user=req.user||{},rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(isAdminUser(user)||userRole_(user)==='VERIFIKATOR')return {success:false,message:'Pencatatan realisasi dilakukan oleh User Bidang'};
  if(publicCategory_(rencana)!=='NON PENGADAAN')return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  var state=nonDocStateV155_(rencana.id_kegiatan);
  if(!state.complete)return {success:false,message:'Realisasi dapat dicatat setelah Dokumen Honorarium TTD, Tanda Terima, dan Bukti Potong Pajak selesai diunggah'};
  var nilai=num(req.nilai_realisasi),namaPihak=norm(req.nama_pihak);
  if(!namaPihak)return {success:false,message:'Pihak/Penerima wajib diisi'};
  if(!nilai)return {success:false,message:'Nilai realisasi wajib diisi'};
  if(nilai>num(rencana.jumlah))return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan'};
  if(existingNonRealV110_(rencana.id_kegiatan))return {success:false,message:'Realisasi kegiatan ini sudah pernah dicatat'};
  var now=new Date(),realisasi={id_realisasi:'RLS-'+now.getTime(),id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,kategori:'NON PENGADAAN',metode:'NON PENGADAAN',nilai_perencanaan:num(rencana.jumlah),nilai_realisasi:nilai,tanggal_realisasi:now,nomor_bukti:'',nama_pihak:namaPihak,keterangan:norm(req.keterangan),input_by:user.nama||'',tanggal_input:now,status:'MENUNGGU VERIFIKASI',riwayat_perubahan:'Pencatatan awal oleh '+(user.nama||'User Bidang')};
  appendByHeader(SH_REALISASI,realisasi);
  var synced=syncNonProcStatusV155_(rencana.id_kegiatan);
  return {success:true,message:'Nilai realisasi berhasil dicatat dan menunggu pemeriksaan Verifikator',nilai_realisasi:nilai,nama_pihak:namaPihak,status:synced.status,realisasi:realisasi};
};

/* =========================================================
   SIMPROV v155 R1 - Penanda tangan daftar pembayaran
   Nama Bendahara diambil dari akun BENDAHARA aktif pada
   Manajemen Akses dan hanya dikirim melalui dashboard login.
   ========================================================= */
function nonPrintSignatoriesV155R1_(){
  var bendahara=getRows(SH_USER).find(function(u){
    return upper(u.role)==='BENDAHARA'&&upper(u.status||'AKTIF')!=='NONAKTIF';
  });
  return {bendahara:bendahara?norm(bendahara.nama):''};
}
var getDashboardV155R1Base_=getDashboard;
getDashboard=function(req){
  var result=getDashboardV155R1Base_(req);
  if(result&&result.success)result.nonPrintSignatories=nonPrintSignatoriesV155R1_();
  return result;
};

/* =========================================================
   SIMPROV v155 R2 - Honorarium-only print + flexible realization
   ---------------------------------------------------------
   - Jalur simpan/cetak database hanya untuk Honorarium.
   - Dokumen wajib dinamis: Honorarium 3, selain Honorarium 2.
   - Pencatatan realisasi tidak menunggu dokumen/verifikasi.
   ========================================================= */
function isHonorNonV155R2_(rencana){
  return upper(rencana&&rencana.jenis_non_pengadaan).indexOf('HONOR')>=0;
}
function requiredNonDocsV155R2_(rencana){
  return isHonorNonV155R2_(rencana)?['DOKUMEN HONORARIUM TTD','TANDA TERIMA','BUKTI POTONG PAJAK']:['TANDA TERIMA','BUKTI POTONG PAJAK'];
}

latestRequiredNonDocsV155_=function(idKegiatan){
  ensureNonV155Headers_();
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan),required=requiredNonDocsV155R2_(rencana);
  var latestPrint=isHonorNonV155R2_(rencana)?latestNonPrintRecordV155_(idKegiatan):null,currentVersion=latestPrint?num(latestPrint.versi_pdf):0;
  var rows=getRowsOptional_(SH_DOKUMEN_NON_PENGADAAN).filter(function(d){
    return norm(d.id_kegiatan)===norm(idKegiatan)&&required.indexOf(upper(d.jenis_dokumen))>=0;
  }).sort(function(a,b){return num(a._row)-num(b._row);});
  var map={};
  rows.forEach(function(d){
    var key=upper(d.jenis_dokumen);
    if(key==='DOKUMEN HONORARIUM TTD'&&currentVersion>0&&num(d.versi_dokumen)!==currentVersion)return;
    map[key]=d;
  });
  return required.map(function(j){return map[j];}).filter(Boolean);
};
latestRequiredNonDocsV109_=function(idKegiatan){return latestRequiredNonDocsV155_(idKegiatan);};

nonDocStateV155_=function(idKegiatan){
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan),required=requiredNonDocsV155R2_(rencana),docs=latestRequiredNonDocsV155_(idKegiatan);
  var complete=docs.length===required.length&&docs.every(function(d){return !!norm(d.url_file);});
  var valid=complete&&docs.every(function(d){return upper(d.status_verifikasi)==='VALID DOKUMEN';});
  var repair=docs.some(function(d){return ['PERBAIKAN DOKUMEN','PERBAIKAN'].indexOf(upper(d.status_verifikasi))>=0;});
  var waitingRepair=docs.some(function(d){return upper(d.status_verifikasi)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';});
  var real=existingNonRealV110_(idKegiatan),realFinal=!!real&&['FINAL','DISETUJUI','SELESAI','SAH'].indexOf(upper(real.status))>=0,status='MENUNGGU DOKUMEN';
  if(repair)status='PERBAIKAN DOKUMEN';
  else if(waitingRepair)status='MENUNGGU VERIFIKASI PERBAIKAN';
  else if(valid&&realFinal)status='MENUNGGU FINALISASI';
  else if(valid&&real)status='MENUNGGU VERIFIKASI NILAI REALISASI';
  else if(valid)status='MENUNGGU PENCATATAN REALISASI';
  else if(complete)status='MENUNGGU VERIFIKASI DOKUMEN';
  return {status:status,complete:complete,valid:valid,repair:repair,docs:docs,realisasi:real,realFinal:realFinal,required:required};
};

var saveNonProcPrintDataV155R2Base_=saveNonProcPrintDataV155_;
saveNonProcPrintDataV155_=function(req){
  var id=req&&req.data?req.data.id_kegiatan:'',rencana=findById(getRows(SH_RENCANA),'id_kegiatan',id);
  if(!rencana)return {success:false,message:'Kegiatan tidak ditemukan'};
  if(!isHonorNonV155R2_(rencana))return {success:false,message:'Pembuatan daftar pembayaran hanya tersedia untuk jenis Honorarium'};
  return saveNonProcPrintDataV155R2Base_(req);
};

var uploadDokumenNonPengadaanBatchV155R2Base_=uploadDokumenNonPengadaanBatchV155_;
uploadDokumenNonPengadaanBatchV155_=function(req){
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  if(!rencana)return {success:false,message:'Kegiatan tidak ditemukan'};
  var allowed=requiredNonDocsV155R2_(rencana),items=Array.isArray(req.items)?req.items:[];
  for(var i=0;i<items.length;i++){
    var key=upper(items[i].jenis_dokumen);
    if(allowed.indexOf(key)<0)return {success:false,message:'Jenis dokumen tidak berlaku untuk kegiatan ini: '+norm(items[i].jenis_dokumen)};
  }
  return uploadDokumenNonPengadaanBatchV155R2Base_(req);
};

catatNonPengadaanV111=function(req){
  var user=req.user||{},rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(isAdminUser(user)||userRole_(user)==='VERIFIKATOR')return {success:false,message:'Pencatatan realisasi dilakukan oleh User Bidang'};
  if(publicCategory_(rencana)!=='NON PENGADAAN')return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  if(!isPlanningApproved_(rencana.status_perencanaan))return {success:false,message:'Perencanaan harus disetujui Verifikator PBJ terlebih dahulu'};
  var nilai=num(req.nilai_realisasi),namaPihak=norm(req.nama_pihak);
  if(!namaPihak)return {success:false,message:'Pihak/Penerima wajib diisi'};
  if(!nilai)return {success:false,message:'Nilai realisasi wajib diisi'};
  if(nilai>num(rencana.jumlah))return {success:false,message:'Nilai realisasi tidak boleh melebihi nilai perencanaan'};
  if(existingNonRealV110_(rencana.id_kegiatan))return {success:false,message:'Realisasi kegiatan ini sudah pernah dicatat'};
  var now=new Date(),realisasi={id_realisasi:'RLS-'+now.getTime(),id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,kategori:'NON PENGADAAN',metode:'NON PENGADAAN',nilai_perencanaan:num(rencana.jumlah),nilai_realisasi:nilai,tanggal_realisasi:now,nomor_bukti:'',nama_pihak:namaPihak,keterangan:norm(req.keterangan),input_by:user.nama||'',tanggal_input:now,status:'MENUNGGU VERIFIKASI',riwayat_perubahan:'Pencatatan awal oleh '+(user.nama||'User Bidang')};
  appendByHeader(SH_REALISASI,realisasi);
  var synced=syncNonProcStatusV155_(rencana.id_kegiatan);
  return {success:true,message:'Nilai realisasi berhasil dicatat dan menunggu pemeriksaan Verifikator',nilai_realisasi:nilai,nama_pihak:namaPihak,status:synced.status,realisasi:realisasi};
};

selesaikanPaketNonPengadaanV116=function(req){
  var user=req.user||{};
  if(userRole_(user)!=='VERIFIKATOR'&&!isAdminUser(user))return {success:false,message:'Hanya Verifikator PBJ/Admin yang dapat menyelesaikan paket Non Pengadaan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);if(!rencana)return {success:false,message:'Kegiatan tidak ditemukan'};
  if(publicCategory_(rencana)!=='NON PENGADAAN')return {success:false,message:'Kegiatan ini bukan Non Pengadaan'};
  if(!canAccessBidang_(user,rencana.id_bidang))return {success:false,message:'Kegiatan di luar bidang penugasan'};
  var required=requiredNonDocsV155R2_(rencana),state=nonDocStateV155_(rencana.id_kegiatan);
  if(!state.valid){
    var missing=required.filter(function(j){var d=state.docs.find(function(x){return upper(x.jenis_dokumen)===j;});return !d||!norm(d.url_file)||upper(d.status_verifikasi)!=='VALID DOKUMEN';});
    return {success:false,message:'Dokumen wajib belum valid: '+missing.join(', ')};
  }
  if(!state.realFinal)return {success:false,message:'Nilai realisasi harus disetujui terlebih dahulu'};
  updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:'SELESAI'});
  var latest=getLatestNonProc_(rencana.id_kegiatan);if(latest)updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:'SELESAI'});
  appendLog(user.nama||'Verifikator','SELESAIKAN_PAKET_NON_PENGADAAN',rencana.id_kegiatan,required.length+' dokumen wajib dan nilai realisasi telah valid');
  return {success:true,message:'Paket Non Pengadaan berhasil diselesaikan',status:'SELESAI'};
};

/* =========================================================
   SIMPROV v156 - Multi Realisasi Non Honorarium
   ---------------------------------------------------------
   - Honorarium tetap memakai alur versi/cetak/verifikasi lama.
   - Non Honorarium dapat memiliki banyak baris realisasi.
   - Setiap realisasi dapat memiliki banyak lampiran PDF.
   - Total seluruh realisasi aktif tidak boleh melebihi pagu.
   - Non Honorarium tidak memerlukan verifikasi nilai/dokumen.
   ========================================================= */
['jenis_realisasi','tanggal_update','update_by'].forEach(function(h){
  if(REQUIRED_HEADERS.REALISASI.indexOf(h)<0)REQUIRED_HEADERS.REALISASI.push(h);
});
['id_realisasi'].forEach(function(h){
  if(REQUIRED_HEADERS.DOKUMEN_NON_PENGADAAN.indexOf(h)<0)REQUIRED_HEADERS.DOKUMEN_NON_PENGADAAN.push(h);
});

function ensureNonHonorMultiHeadersV156_(){
  ensureSheetHeadersV138_(SH_REALISASI,REQUIRED_HEADERS.REALISASI);
  ensureSheetHeadersV138_(SH_DOKUMEN_NON_PENGADAAN,REQUIRED_HEADERS.DOKUMEN_NON_PENGADAAN);
}
function isNonHonorV156_(rencana){
  return !!rencana&&publicCategory_(rencana)==='NON PENGADAAN'&&!isHonorNonV155R2_(rencana);
}
function activeNonHonorRealisasiV156_(idKegiatan){
  ensureNonHonorMultiHeadersV156_();
  return getRowsOptional_(SH_REALISASI).filter(function(r){
    return norm(r.id_kegiatan)===norm(idKegiatan)&&upper(r.status)!=='DIBATALKAN';
  }).sort(function(a,b){
    var da=new Date(a.tanggal_realisasi||a.tanggal_input||0).getTime()||0;
    var db=new Date(b.tanggal_realisasi||b.tanggal_input||0).getTime()||0;
    return da-db||num(a._row)-num(b._row);
  });
}
function totalNonHonorRealisasiV156_(idKegiatan,excludeId){
  return activeNonHonorRealisasiV156_(idKegiatan).reduce(function(total,r){
    return norm(r.id_realisasi)===norm(excludeId)?total:total+num(r.nilai_realisasi);
  },0);
}
function parseNonHonorDateV156_(value){
  if(value instanceof Date&&!isNaN(value.getTime()))return value;
  var raw=norm(value);
  if(!raw)return new Date();
  var m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
  var d=new Date(raw);
  return isNaN(d.getTime())?new Date():d;
}
function canEditNonHonorV156_(user,rencana){
  var role=actualRoleV133_(user);
  if(role==='ADMIN')return true;
  return role==='BIDANG'&&norm(user&&user.id_bidang)===norm(rencana&&rencana.id_bidang);
}
function appendObjectsBatchV156_(sheetName,objects){
  if(!objects||!objects.length)return;
  ensureHeaders(sheetName);
  var sheet=sh(sheetName),lastCol=Math.max(1,sheet.getLastColumn());
  var hs=sheet.getRange(1,1,1,lastCol).getValues()[0].map(norm);
  var keyHeader=(REQUIRED_HEADERS[sheetName]||[])[0],keyIdx=Math.max(0,hs.indexOf(keyHeader));
  var lastRow=Math.max(1,sheet.getLastRow()),target=2;
  if(lastRow>=2){
    var keys=sheet.getRange(2,keyIdx+1,lastRow-1,1).getValues();
    for(var i=keys.length-1;i>=0;i--){if(norm(keys[i][0])){target=i+3;break;}}
  }
  var values=objects.map(function(o){return hs.map(function(h){return Object.prototype.hasOwnProperty.call(o,h)?o[h]:'';});});
  var needed=target+values.length-1-sheet.getMaxRows();if(needed>0)sheet.insertRowsAfter(sheet.getMaxRows(),needed);
  sheet.getRange(target,1,values.length,hs.length).setValues(values);
}
function prepareNonHonorFilesV156_(items){
  items=Array.isArray(items)?items:[];
  var prepared=[];
  items.forEach(function(it,index){
    assertUploadLimitV133_({file_base64:it.file_base64});
    var raw=String(it.file_base64||'').replace(/^data:[^,]+,/,'');
    if(!raw)throw new Error('Lampiran ke-'+(index+1)+' kosong');
    var mime=norm(it.mime_type)||'application/pdf';
    if(mime!=='application/pdf')throw new Error('Lampiran harus berupa PDF');
    prepared.push({name:norm(it.file_name)||('lampiran-'+(index+1)+'.pdf'),mime:mime,bytes:Utilities.base64Decode(raw)});
  });
  return prepared;
}
function createNonHonorFilesV156_(rencana,idRealisasi,prepared){
  if(!prepared.length)return [];
  var root=DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var bidangFolder=getOrCreateFolder(root,norm(rencana.id_bidang)+' - '+safeName(rencana.id_bidang));
  var npFolder=getOrCreateFolder(bidangFolder,'NON PENGADAAN');
  var kegFolder=getOrCreateFolder(npFolder,norm(rencana.id_kegiatan)+' - '+safeName(rencana.nama_kegiatan));
  var realFolder=getOrCreateFolder(kegFolder,'REALISASI');
  var target=getOrCreateFolder(realFolder,norm(idRealisasi));
  var created=[];
  prepared.forEach(function(x){
    var f=target.createFile(Utilities.newBlob(x.bytes,x.mime,x.name));
    try{f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
    created.push({file:f,name:x.name,url:f.getUrl()});
  });
  return created;
}
function nonHonorDocumentRowsV156_(rencana,user,idRealisasi,created){
  var latest=ensureNonProcRecord_(rencana,user),now=new Date();
  return created.map(function(x,i){return {
    id_dokumen_non:'DNR-'+now.getTime()+'-'+i+'-'+Math.floor(Math.random()*900+100),
    id_non_pengadaan:latest.id_non_pengadaan,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,
    id_realisasi:idRealisasi,jenis_dokumen:'LAMPIRAN REALISASI',nama_file:x.name,url_file:x.url,
    tanggal_upload:now,upload_by:norm(user.nama),status_verifikasi:'TERCATAT',catatan_verifikator:'',
    tanggal_verifikasi:'',verifikasi_by:'',riwayat_dokumen:'Lampiran realisasi diunggah oleh '+(norm(user.nama)||'User Bidang'),versi_dokumen:0
  };});
}
function syncNonHonorStatusV156_(rencana){
  var rows=activeNonHonorRealisasiV156_(rencana.id_kegiatan),total=rows.reduce(function(s,r){return s+num(r.nilai_realisasi);},0);
  var current=upper(rencana.status_pencairan),status=current==='SELESAI'?'SELESAI':(rows.length?'PENCATATAN REALISASI':'MENUNGGU PENCATATAN REALISASI');
  if(current!==status)updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:status});
  var latest=getLatestNonProc_(rencana.id_kegiatan);
  if(latest)updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:status,total_bruto:total,total_pajak:0,total_netto:total});
  return {status:status,total:total,jumlah:rows.length,sisa:Math.max(0,num(rencana.jumlah)-total)};
}

function saveNonHonorRealizationV156_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Fitur multi realisasi hanya untuk Non Pengadaan selain Honorarium'};
  if(!canEditNonHonorV156_(user,rencana))return {success:false,message:'Pencatatan realisasi dilakukan oleh User Bidang'};
  if(!isPlanningApproved_(rencana.status_perencanaan))return {success:false,message:'Perencanaan harus disetujui Verifikator PBJ terlebih dahulu'};
  if(upper(rencana.status_pencairan)==='SELESAI')return {success:false,message:'Pencatatan paket sudah selesai'};
  var jenis=norm(req.jenis_realisasi),pihak=norm(req.nama_pihak),nilai=num(req.nilai_realisasi);
  if(!jenis)return {success:false,message:'Jenis realisasi wajib diisi'};
  if(nilai<=0)return {success:false,message:'Nilai realisasi wajib lebih dari 0'};
  var totalSebelum=totalNonHonorRealisasiV156_(rencana.id_kegiatan),pagu=num(rencana.jumlah);
  if(totalSebelum+nilai>pagu+0.5)return {success:false,message:'Total realisasi tidak boleh melebihi pagu. Sisa pagu '+formatRp(Math.max(0,pagu-totalSebelum))};
  var prepared=prepareNonHonorFilesV156_(req.items),now=new Date(),id='RLS-'+now.getTime()+'-'+Math.floor(Math.random()*900+100),created=[];
  try{
    created=createNonHonorFilesV156_(rencana,id,prepared);
    ensureNonProcRecord_(rencana,user);
    var row={id_realisasi:id,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,kategori:'NON PENGADAAN',metode:'NON PENGADAAN',jenis_realisasi:jenis,nilai_perencanaan:pagu,nilai_realisasi:nilai,tanggal_realisasi:parseNonHonorDateV156_(req.tanggal_realisasi),nomor_bukti:norm(req.nomor_bukti),nama_pihak:pihak,keterangan:norm(req.keterangan),input_by:norm(user.nama),tanggal_input:now,status:'FINAL',riwayat_perubahan:'Pencatatan awal oleh '+(norm(user.nama)||'User Bidang'),tanggal_update:now,update_by:norm(user.nama)};
    appendObjectsBatchV156_(SH_REALISASI,[row]);
    var docs=nonHonorDocumentRowsV156_(rencana,user,id,created);
    if(docs.length)appendObjectsBatchV156_(SH_DOKUMEN_NON_PENGADAAN,docs);
    var state=syncNonHonorStatusV156_(rencana);
    appendLog(user.nama,'TAMBAH_REALISASI_NON_HONOR',rencana.id_kegiatan,jenis+' | '+formatRp(nilai)+' | '+docs.length+' lampiran');
    return {success:true,message:'Realisasi berhasil ditambahkan',realisasi:row,dokumen:docs,total_realisasi:state.total,sisa_pagu:state.sisa,status_paket:state.status};
  }catch(err){created.forEach(function(x){try{x.file.setTrashed(true);}catch(e){}});throw err;}
}
function updateNonHonorRealizationV156_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},real=findById(getRows(SH_REALISASI),'id_realisasi',req.id_realisasi);
  if(!real)return {success:false,message:'Realisasi tidak ditemukan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',real.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Realisasi ini bukan transaksi Non Honorarium'};
  if(!canEditNonHonorV156_(user,rencana))return {success:false,message:'Anda tidak berhak mengubah realisasi ini'};
  if(upper(rencana.status_pencairan)==='SELESAI')return {success:false,message:'Pencatatan paket sudah selesai'};
  if(upper(real.status)==='DIBATALKAN')return {success:false,message:'Realisasi sudah dibatalkan'};
  var jenis=norm(req.jenis_realisasi),nilai=num(req.nilai_realisasi),pagu=num(rencana.jumlah);
  if(!jenis)return {success:false,message:'Jenis realisasi wajib diisi'};
  if(nilai<=0)return {success:false,message:'Nilai realisasi wajib lebih dari 0'};
  var totalLain=totalNonHonorRealisasiV156_(rencana.id_kegiatan,real.id_realisasi);
  if(totalLain+nilai>pagu+0.5)return {success:false,message:'Total realisasi tidak boleh melebihi pagu. Batas nilai untuk baris ini '+formatRp(Math.max(0,pagu-totalLain))};
  var now=new Date(),line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Diperbarui oleh '+(norm(user.nama)||'User');
  var fields={jenis_realisasi:jenis,nama_pihak:norm(req.nama_pihak),nilai_realisasi:nilai,tanggal_realisasi:parseNonHonorDateV156_(req.tanggal_realisasi),nomor_bukti:norm(req.nomor_bukti),keterangan:norm(req.keterangan),status:'FINAL',tanggal_update:now,update_by:norm(user.nama),riwayat_perubahan:norm(real.riwayat_perubahan)?norm(real.riwayat_perubahan)+'\n'+line:line};
  updateRowFieldsFastV109_(SH_REALISASI,real._row,fields);
  var state=syncNonHonorStatusV156_(rencana),updated=Object.assign({},real,fields);
  appendLog(user.nama,'UBAH_REALISASI_NON_HONOR',rencana.id_kegiatan,real.id_realisasi+' | '+formatRp(nilai));
  return {success:true,message:'Realisasi berhasil diperbarui',realisasi:updated,total_realisasi:state.total,sisa_pagu:state.sisa,status_paket:state.status};
}
function deleteNonHonorRealizationV156_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},real=findById(getRows(SH_REALISASI),'id_realisasi',req.id_realisasi);
  if(!real)return {success:false,message:'Realisasi tidak ditemukan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',real.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Realisasi ini bukan transaksi Non Honorarium'};
  if(!canEditNonHonorV156_(user,rencana))return {success:false,message:'Anda tidak berhak menghapus realisasi ini'};
  if(upper(rencana.status_pencairan)==='SELESAI')return {success:false,message:'Pencatatan paket sudah selesai'};
  var now=new Date(),line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Dibatalkan oleh '+(norm(user.nama)||'User');
  updateRowFieldsFastV109_(SH_REALISASI,real._row,{status:'DIBATALKAN',tanggal_update:now,update_by:norm(user.nama),riwayat_perubahan:norm(real.riwayat_perubahan)?norm(real.riwayat_perubahan)+'\n'+line:line});
  getRowsOptional_(SH_DOKUMEN_NON_PENGADAAN).filter(function(d){return norm(d.id_realisasi)===norm(real.id_realisasi)&&upper(d.status_verifikasi)!=='DIBATALKAN';}).forEach(function(d){updateRowFieldsFastV109_(SH_DOKUMEN_NON_PENGADAAN,d._row,{status_verifikasi:'DIBATALKAN',riwayat_dokumen:norm(d.riwayat_dokumen)?norm(d.riwayat_dokumen)+'\n'+line:line});});
  var state=syncNonHonorStatusV156_(rencana);
  appendLog(user.nama,'HAPUS_REALISASI_NON_HONOR',rencana.id_kegiatan,real.id_realisasi+' | '+formatRp(real.nilai_realisasi));
  return {success:true,message:'Realisasi dihapus dari pencatatan aktif',id_realisasi:real.id_realisasi,total_realisasi:state.total,sisa_pagu:state.sisa,status_paket:state.status};
}
function uploadNonHonorRealizationDocsV156_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},real=findById(getRows(SH_REALISASI),'id_realisasi',req.id_realisasi);
  if(!real||upper(real.status)==='DIBATALKAN')return {success:false,message:'Realisasi tidak ditemukan atau sudah dibatalkan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',real.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Lampiran fleksibel hanya untuk Non Pengadaan selain Honorarium'};
  if(!canEditNonHonorV156_(user,rencana))return {success:false,message:'Anda tidak berhak mengunggah lampiran'};
  if(upper(rencana.status_pencairan)==='SELESAI')return {success:false,message:'Pencatatan paket sudah selesai'};
  var prepared=prepareNonHonorFilesV156_(req.items);if(!prepared.length)return {success:false,message:'Pilih minimal satu file PDF'};
  var created=[];
  try{
    created=createNonHonorFilesV156_(rencana,real.id_realisasi,prepared);
    var docs=nonHonorDocumentRowsV156_(rencana,user,real.id_realisasi,created);
    appendObjectsBatchV156_(SH_DOKUMEN_NON_PENGADAAN,docs);
    appendLog(user.nama,'UPLOAD_LAMPIRAN_REALISASI_NON_HONOR',rencana.id_kegiatan,real.id_realisasi+' | '+docs.length+' file');
    return {success:true,message:docs.length+' lampiran berhasil diunggah',dokumen:docs};
  }catch(err){created.forEach(function(x){try{x.file.setTrashed(true);}catch(e){}});throw err;}
}
function deleteNonHonorRealizationDocV156_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},doc=findById(getRows(SH_DOKUMEN_NON_PENGADAAN),'id_dokumen_non',req.id_dokumen_non);
  if(!doc)return {success:false,message:'Lampiran tidak ditemukan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',doc.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana)||upper(doc.jenis_dokumen)!=='LAMPIRAN REALISASI')return {success:false,message:'Dokumen ini bukan lampiran realisasi fleksibel'};
  if(!canEditNonHonorV156_(user,rencana))return {success:false,message:'Anda tidak berhak menghapus lampiran'};
  if(upper(rencana.status_pencairan)==='SELESAI')return {success:false,message:'Pencatatan paket sudah selesai'};
  var now=new Date(),line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Lampiran dibatalkan oleh '+(norm(user.nama)||'User');
  updateRowFieldsFastV109_(SH_DOKUMEN_NON_PENGADAAN,doc._row,{status_verifikasi:'DIBATALKAN',riwayat_dokumen:norm(doc.riwayat_dokumen)?norm(doc.riwayat_dokumen)+'\n'+line:line});
  appendLog(user.nama,'HAPUS_LAMPIRAN_REALISASI_NON_HONOR',rencana.id_kegiatan,doc.id_dokumen_non);
  return {success:true,message:'Lampiran dihapus dari daftar aktif',id_dokumen_non:doc.id_dokumen_non};
}
function finishNonHonorPackageV156_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Penyelesaian mandiri hanya untuk Non Pengadaan selain Honorarium'};
  if(!canEditNonHonorV156_(user,rencana))return {success:false,message:'Pencatatan diselesaikan oleh User Bidang'};
  var rows=activeNonHonorRealisasiV156_(rencana.id_kegiatan),total=rows.reduce(function(s,r){return s+num(r.nilai_realisasi);},0),pagu=num(rencana.jumlah);
  if(!rows.length)return {success:false,message:'Minimal satu realisasi harus dicatat'};
  if(total>pagu+0.5)return {success:false,message:'Total realisasi melebihi pagu'};
  rows.forEach(function(real){if(upper(real.status)!=='FINAL')updateRowFieldsFastV109_(SH_REALISASI,real._row,{status:'FINAL',tanggal_update:new Date(),update_by:norm(user.nama)});});
  updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:'SELESAI'});
  var latest=ensureNonProcRecord_(rencana,user);if(latest)updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:'SELESAI',total_bruto:total,total_pajak:0,total_netto:total});
  appendLog(user.nama,'SELESAIKAN_PENCATATAN_NON_HONOR',rencana.id_kegiatan,rows.length+' realisasi | '+formatRp(total));
  return {success:true,message:'Pencatatan Non Pengadaan berhasil diselesaikan',status:'SELESAI',total_realisasi:total};
}

var requiredNonDocsV156Base_=requiredNonDocsV155R2_;
requiredNonDocsV155R2_=function(rencana){return isHonorNonV155R2_(rencana)?requiredNonDocsV156Base_(rencana):[];};
var nonDocStateV156Base_=nonDocStateV155_;
nonDocStateV155_=function(idKegiatan){
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan);
  if(!isNonHonorV156_(rencana))return nonDocStateV156Base_(idKegiatan);
  var rows=activeNonHonorRealisasiV156_(idKegiatan),total=rows.reduce(function(s,r){return s+num(r.nilai_realisasi);},0),done=upper(rencana.status_pencairan)==='SELESAI';
  return {status:done?'SELESAI':(rows.length?'PENCATATAN REALISASI':'MENUNGGU PENCATATAN REALISASI'),complete:true,valid:true,repair:false,docs:[],realisasi:rows[rows.length-1]||null,realFinal:rows.length>0,required:[],realisasi_list:rows,total_realisasi:total};
};

function ensureNonHonorMultiHeadersCachedV156_(){
  var cache=CacheService.getScriptCache(),key='SIMPROV_NON_HONOR_HEADERS_V156';
  if(cache.get(key)==='1')return;
  ensureNonHonorMultiHeadersV156_();
  try{cache.put(key,'1',21600);}catch(e){}
}
var getDashboardV156Base_=getDashboard;
getDashboard=function(req){ensureNonHonorMultiHeadersCachedV156_();return getDashboardV156Base_(req);};

var routeActionV156Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='saveNonHonorRealizationV156')return saveNonHonorRealizationV156_(req);
  if(a==='updateNonHonorRealizationV156')return updateNonHonorRealizationV156_(req);
  if(a==='deleteNonHonorRealizationV156')return deleteNonHonorRealizationV156_(req);
  if(a==='uploadNonHonorRealizationDocsV156')return uploadNonHonorRealizationDocsV156_(req);
  if(a==='deleteNonHonorRealizationDocV156')return deleteNonHonorRealizationDocV156_(req);
  if(a==='finishNonHonorPackageV156')return finishNonHonorPackageV156_(req);
  return routeActionV156Base_(a,req);
};
var doPostV156Base_=doPost;
doPost=function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}');
    var writes=['saveNonHonorRealizationV156','updateNonHonorRealizationV156','deleteNonHonorRealizationV156','uploadNonHonorRealizationDocsV156','deleteNonHonorRealizationDocV156','finishNonHonorPackageV156'];
    if(writes.indexOf(req.action)>=0)return withShortWriteLockV135_(function(){return out(routeAction_(req.action,req));});
    return doPostV156Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err),stack:err&&err.stack?err.stack:''});}
};

/* =========================================================
   SIMPROV v157 - Pemeriksaan PBJ Multi Realisasi Non Honorarium
   ---------------------------------------------------------
   - User Bidang mengajukan pencatatan untuk pemeriksaan PBJ.
   - User hanya dapat menyelesaikan setelah disetujui PBJ.
   - Verifikator PBJ dapat mengoreksi nilai dan menyelesaikan.
   - Paket selesai dapat dibuka kembali oleh Verifikator PBJ.
   - Honorarium tetap memakai alur khusus sebelumnya.
   ========================================================= */
var NH_STATUS_V157_={
  EMPTY:'MENUNGGU PENCATATAN REALISASI',
  EDITING:'PENCATATAN REALISASI',
  REVIEW:'MENUNGGU PEMERIKSAAN PBJ',
  READY:'SIAP DISELESAIKAN',
  REOPEN:'DIBUKA KEMBALI',
  DONE:'SELESAI'
};
function nonHonorPackageStatusV157_(rencana){
  var s=upper(rencana&&rencana.status_pencairan).replace(/_/g,' ');
  if(s===NH_STATUS_V157_.DONE)return NH_STATUS_V157_.DONE;
  if(s===NH_STATUS_V157_.REVIEW)return NH_STATUS_V157_.REVIEW;
  if(s===NH_STATUS_V157_.READY)return NH_STATUS_V157_.READY;
  if(s===NH_STATUS_V157_.REOPEN)return NH_STATUS_V157_.REOPEN;
  if(s===NH_STATUS_V157_.EDITING)return NH_STATUS_V157_.EDITING;
  return NH_STATUS_V157_.EMPTY;
}
function isNonHonorPBJV157_(user){return isPBJUser_(user);}
function isNonHonorOwnerV157_(user,rencana){
  return actualRoleV133_(user)==='BIDANG'&&norm(user&&user.id_bidang)===norm(rencana&&rencana.id_bidang);
}
function isNonHonorOwnerEditStageV157_(rencana){
  var s=nonHonorPackageStatusV157_(rencana);
  return [NH_STATUS_V157_.EMPTY,NH_STATUS_V157_.EDITING,NH_STATUS_V157_.REOPEN].indexOf(s)>=0;
}
function canNonHonorOwnerWriteV157_(user,rencana){
  if(actualRoleV133_(user)==='ADMIN')return isNonHonorOwnerEditStageV157_(rencana);
  return isNonHonorOwnerV157_(user,rencana)&&isNonHonorOwnerEditStageV157_(rencana);
}
function nonHonorTotalsV157_(rencana){
  var rows=activeNonHonorRealisasiV156_(rencana.id_kegiatan),total=rows.reduce(function(s,r){return s+num(r.nilai_realisasi);},0);
  return {rows:rows,total:total,sisa:Math.max(0,num(rencana.jumlah)-total)};
}
function setNonHonorPackageStatusV157_(rencana,user,status,logAction,logText){
  var totals=nonHonorTotalsV157_(rencana),now=new Date();
  updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:status});
  var latest=ensureNonProcRecord_(rencana,user||{});
  if(latest)updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:status,total_bruto:totals.total,total_pajak:0,total_netto:totals.total});
  if(logAction)appendLog(norm(user&&user.nama)||'Sistem',logAction,rencana.id_kegiatan,logText||status);
  return {status:status,total:totals.total,jumlah:totals.rows.length,sisa:totals.sisa};
}
function syncNonHonorStatusV157_(rencana,user){
  var current=nonHonorPackageStatusV157_(rencana),totals=nonHonorTotalsV157_(rencana),status=current;
  if(current===NH_STATUS_V157_.EMPTY&&totals.rows.length)status=NH_STATUS_V157_.EDITING;
  if(current===NH_STATUS_V157_.EDITING&&!totals.rows.length)status=NH_STATUS_V157_.EMPTY;
  if([NH_STATUS_V157_.REVIEW,NH_STATUS_V157_.READY,NH_STATUS_V157_.REOPEN,NH_STATUS_V157_.DONE].indexOf(current)>=0)status=current;
  if(upper(rencana.status_pencairan)!==status){
    updateRowFieldsFastV109_(SH_RENCANA,rencana._row,{status_pencairan:status});
  }
  var latest=getLatestNonProc_(rencana.id_kegiatan);
  if(latest)updateRowFieldsFastV109_(SH_NON_PENGADAAN,latest._row,{status:status,total_bruto:totals.total,total_pajak:0,total_netto:totals.total});
  return {status:status,total:totals.total,jumlah:totals.rows.length,sisa:totals.sisa};
}
function validateNonHonorTotalV157_(rencana,nilai,excludeId){
  var totalLain=totalNonHonorRealisasiV156_(rencana.id_kegiatan,excludeId),pagu=num(rencana.jumlah);
  if(totalLain+nilai>pagu+0.5)throw new Error('Total realisasi tidak boleh melebihi pagu. Batas nilai yang dapat disimpan '+formatRp(Math.max(0,pagu-totalLain)));
  return {totalLain:totalLain,pagu:pagu};
}
function saveNonHonorRealizationV157_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);
  requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Fitur multi realisasi hanya untuk Non Pengadaan selain Honorarium'};
  if(!canNonHonorOwnerWriteV157_(user,rencana))return {success:false,message:'Akses edit tidak tersedia. Jika paket sudah diajukan atau selesai, Verifikator PBJ harus membuka akses edit terlebih dahulu'};
  if(!isPlanningApproved_(rencana.status_perencanaan))return {success:false,message:'Perencanaan harus disetujui Verifikator PBJ terlebih dahulu'};
  var jenis=norm(req.jenis_realisasi),pihak=norm(req.nama_pihak),nilai=num(req.nilai_realisasi);
  if(!jenis)return {success:false,message:'Jenis realisasi wajib diisi'};
  if(nilai<=0)return {success:false,message:'Nilai realisasi wajib lebih dari 0'};
  var limit=validateNonHonorTotalV157_(rencana,nilai,''),prepared=prepareNonHonorFilesV156_(req.items),now=new Date(),id='RLS-'+now.getTime()+'-'+Math.floor(Math.random()*900+100),created=[];
  try{
    created=createNonHonorFilesV156_(rencana,id,prepared);
    ensureNonProcRecord_(rencana,user);
    var row={id_realisasi:id,id_kegiatan:rencana.id_kegiatan,id_bidang:rencana.id_bidang,kategori:'NON PENGADAAN',metode:'NON PENGADAAN',jenis_realisasi:jenis,nilai_perencanaan:limit.pagu,nilai_realisasi:nilai,tanggal_realisasi:parseNonHonorDateV156_(req.tanggal_realisasi),nomor_bukti:norm(req.nomor_bukti),nama_pihak:pihak,keterangan:norm(req.keterangan),input_by:norm(user.nama),tanggal_input:now,status:'FINAL',riwayat_perubahan:'Pencatatan awal oleh '+(norm(user.nama)||'User Bidang'),tanggal_update:now,update_by:norm(user.nama)};
    appendObjectsBatchV156_(SH_REALISASI,[row]);
    var docs=nonHonorDocumentRowsV156_(rencana,user,id,created);if(docs.length)appendObjectsBatchV156_(SH_DOKUMEN_NON_PENGADAAN,docs);
    var state=syncNonHonorStatusV157_(rencana,user);
    appendLog(user.nama,'TAMBAH_REALISASI_NON_HONOR',rencana.id_kegiatan,jenis+' | '+formatRp(nilai)+' | '+docs.length+' lampiran');
    return {success:true,message:'Realisasi berhasil ditambahkan',realisasi:row,dokumen:docs,total_realisasi:state.total,sisa_pagu:state.sisa,status_paket:state.status};
  }catch(err){created.forEach(function(x){try{x.file.setTrashed(true);}catch(e){}});throw err;}
}
function updateNonHonorRealizationV157_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},real=findById(getRows(SH_REALISASI),'id_realisasi',req.id_realisasi);
  if(!real)return {success:false,message:'Realisasi tidak ditemukan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',real.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Realisasi ini bukan transaksi Non Honorarium'};
  if(upper(real.status)==='DIBATALKAN')return {success:false,message:'Realisasi sudah dibatalkan'};
  var owner=canNonHonorOwnerWriteV157_(user,rencana),pbj=isNonHonorPBJV157_(user)&&!owner,stage=nonHonorPackageStatusV157_(rencana);
  if(stage===NH_STATUS_V157_.DONE)return {success:false,message:'Paket sudah selesai. Buka kembali akses edit sebelum mengubah nilai'};
  if(!pbj&&!owner)return {success:false,message:'Data sedang dikunci untuk pemeriksaan PBJ atau Anda tidak memiliki akses edit'};
  var nilai=num(req.nilai_realisasi);if(nilai<=0)return {success:false,message:'Nilai realisasi wajib lebih dari 0'};
  validateNonHonorTotalV157_(rencana,nilai,real.id_realisasi);
  var now=new Date(),actor=norm(user.nama)||'User',line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+(pbj?' - Nilai dikoreksi Verifikator PBJ ':' - Diperbarui oleh ')+actor;
  var fields={nilai_realisasi:nilai,status:'FINAL',tanggal_update:now,update_by:actor,riwayat_perubahan:norm(real.riwayat_perubahan)?norm(real.riwayat_perubahan)+'\n'+line:line};
  if(!pbj){
    var jenis=norm(req.jenis_realisasi);if(!jenis)return {success:false,message:'Jenis realisasi wajib diisi'};
    fields.jenis_realisasi=jenis;fields.nama_pihak=norm(req.nama_pihak);fields.tanggal_realisasi=parseNonHonorDateV156_(req.tanggal_realisasi);fields.nomor_bukti=norm(req.nomor_bukti);fields.keterangan=norm(req.keterangan);
  }
  updateRowFieldsFastV109_(SH_REALISASI,real._row,fields);
  var state=syncNonHonorStatusV157_(rencana,user),updated=Object.assign({},real,fields);
  appendLog(user.nama,pbj?'KOREKSI_NILAI_REALISASI_PBJ':'UBAH_REALISASI_NON_HONOR',rencana.id_kegiatan,real.id_realisasi+' | '+formatRp(nilai));
  return {success:true,message:pbj?'Nilai realisasi berhasil dikoreksi':'Realisasi berhasil diperbarui',realisasi:updated,total_realisasi:state.total,sisa_pagu:state.sisa,status_paket:state.status};
}
function deleteNonHonorRealizationV157_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},real=findById(getRows(SH_REALISASI),'id_realisasi',req.id_realisasi);if(!real)return {success:false,message:'Realisasi tidak ditemukan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',real.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Realisasi ini bukan transaksi Non Honorarium'};
  if(!canNonHonorOwnerWriteV157_(user,rencana))return {success:false,message:'Realisasi hanya dapat dihapus User Bidang saat akses edit terbuka'};
  var now=new Date(),line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Dibatalkan oleh '+(norm(user.nama)||'User');
  updateRowFieldsFastV109_(SH_REALISASI,real._row,{status:'DIBATALKAN',tanggal_update:now,update_by:norm(user.nama),riwayat_perubahan:norm(real.riwayat_perubahan)?norm(real.riwayat_perubahan)+'\n'+line:line});
  getRowsOptional_(SH_DOKUMEN_NON_PENGADAAN).filter(function(d){return norm(d.id_realisasi)===norm(real.id_realisasi)&&upper(d.status_verifikasi)!=='DIBATALKAN';}).forEach(function(d){updateRowFieldsFastV109_(SH_DOKUMEN_NON_PENGADAAN,d._row,{status_verifikasi:'DIBATALKAN',riwayat_dokumen:norm(d.riwayat_dokumen)?norm(d.riwayat_dokumen)+'\n'+line:line});});
  var state=syncNonHonorStatusV157_(rencana,user);appendLog(user.nama,'HAPUS_REALISASI_NON_HONOR',rencana.id_kegiatan,real.id_realisasi+' | '+formatRp(real.nilai_realisasi));
  return {success:true,message:'Realisasi dihapus dari pencatatan aktif',id_realisasi:real.id_realisasi,total_realisasi:state.total,sisa_pagu:state.sisa,status_paket:state.status};
}
function uploadNonHonorRealizationDocsV157_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},real=findById(getRows(SH_REALISASI),'id_realisasi',req.id_realisasi);
  if(!real||upper(real.status)==='DIBATALKAN')return {success:false,message:'Realisasi tidak ditemukan atau sudah dibatalkan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',real.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Lampiran fleksibel hanya untuk Non Pengadaan selain Honorarium'};
  if(!canNonHonorOwnerWriteV157_(user,rencana))return {success:false,message:'Lampiran hanya dapat diunggah User Bidang saat akses edit terbuka'};
  var prepared=prepareNonHonorFilesV156_(req.items);if(!prepared.length)return {success:false,message:'Pilih minimal satu file PDF'};
  var created=[];try{created=createNonHonorFilesV156_(rencana,real.id_realisasi,prepared);var docs=nonHonorDocumentRowsV156_(rencana,user,real.id_realisasi,created);appendObjectsBatchV156_(SH_DOKUMEN_NON_PENGADAAN,docs);appendLog(user.nama,'UPLOAD_LAMPIRAN_REALISASI_NON_HONOR',rencana.id_kegiatan,real.id_realisasi+' | '+docs.length+' file');return {success:true,message:docs.length+' lampiran berhasil diunggah',dokumen:docs};}catch(err){created.forEach(function(x){try{x.file.setTrashed(true);}catch(e){}});throw err;}
}
function deleteNonHonorRealizationDocV157_(req){
  ensureNonHonorMultiHeadersV156_();
  var user=req.user||{},doc=findById(getRows(SH_DOKUMEN_NON_PENGADAAN),'id_dokumen_non',req.id_dokumen_non);if(!doc)return {success:false,message:'Lampiran tidak ditemukan'};
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',doc.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana)||upper(doc.jenis_dokumen)!=='LAMPIRAN REALISASI')return {success:false,message:'Dokumen ini bukan lampiran realisasi fleksibel'};
  if(!canNonHonorOwnerWriteV157_(user,rencana))return {success:false,message:'Lampiran hanya dapat dihapus User Bidang saat akses edit terbuka'};
  var now=new Date(),line=Utilities.formatDate(now,Session.getScriptTimeZone(),'dd MMMM yyyy HH:mm')+' - Lampiran dibatalkan oleh '+(norm(user.nama)||'User');
  updateRowFieldsFastV109_(SH_DOKUMEN_NON_PENGADAAN,doc._row,{status_verifikasi:'DIBATALKAN',riwayat_dokumen:norm(doc.riwayat_dokumen)?norm(doc.riwayat_dokumen)+'\n'+line:line});appendLog(user.nama,'HAPUS_LAMPIRAN_REALISASI_NON_HONOR',rencana.id_kegiatan,doc.id_dokumen_non);
  return {success:true,message:'Lampiran dihapus dari daftar aktif',id_dokumen_non:doc.id_dokumen_non};
}
function submitNonHonorReviewV157_(req){
  var user=req.user||{},rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Pemeriksaan ini hanya untuk Non Pengadaan selain Honorarium'};
  if(!canNonHonorOwnerWriteV157_(user,rencana))return {success:false,message:'Hanya User Bidang dengan akses edit aktif yang dapat mengajukan pemeriksaan'};
  var totals=nonHonorTotalsV157_(rencana);if(!totals.rows.length)return {success:false,message:'Minimal satu realisasi harus dicatat'};if(totals.total>num(rencana.jumlah)+0.5)return {success:false,message:'Total realisasi melebihi pagu'};
  var state=setNonHonorPackageStatusV157_(rencana,user,NH_STATUS_V157_.REVIEW,'AJUKAN_PEMERIKSAAN_NON_HONOR',totals.rows.length+' realisasi | '+formatRp(totals.total));
  return {success:true,message:'Pencatatan berhasil diajukan kepada Verifikator PBJ',status:state.status,total_realisasi:state.total};
}
function approveNonHonorReviewV157_(req){
  var user=req.user||{},rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorPBJV157_(user))return {success:false,message:'Persetujuan hanya dapat dilakukan Verifikator PBJ'};
  if(!isNonHonorV156_(rencana))return {success:false,message:'Paket ini bukan Non Pengadaan selain Honorarium'};
  if(nonHonorPackageStatusV157_(rencana)!==NH_STATUS_V157_.REVIEW)return {success:false,message:'Paket belum diajukan untuk pemeriksaan PBJ'};
  var totals=nonHonorTotalsV157_(rencana);if(!totals.rows.length)return {success:false,message:'Belum ada realisasi untuk diperiksa'};if(totals.total>num(rencana.jumlah)+0.5)return {success:false,message:'Total realisasi melebihi pagu'};
  var state=setNonHonorPackageStatusV157_(rencana,user,NH_STATUS_V157_.READY,'SETUJUI_PEMERIKSAAN_NON_HONOR',totals.rows.length+' realisasi | '+formatRp(totals.total));
  return {success:true,message:'Hasil pemeriksaan disetujui. Paket siap diselesaikan',status:state.status,total_realisasi:state.total};
}
function finishNonHonorPackageV157_(req){
  var user=req.user||{},rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorV156_(rencana))return {success:false,message:'Penyelesaian ini hanya untuk Non Pengadaan selain Honorarium'};
  var role=actualRoleV133_(user),stage=nonHonorPackageStatusV157_(rencana),pbj=isNonHonorPBJV157_(user),owner=isNonHonorOwnerV157_(user,rencana);
  if(owner&&stage!==NH_STATUS_V157_.READY)return {success:false,message:'Paket hanya dapat diselesaikan User Bidang setelah diperiksa dan disetujui Verifikator PBJ'};
  if(pbj&&[NH_STATUS_V157_.REVIEW,NH_STATUS_V157_.READY].indexOf(stage)<0)return {success:false,message:'Verifikator PBJ dapat menyelesaikan paket setelah diajukan untuk pemeriksaan'};
  if(!owner&&!pbj)return {success:false,message:'Anda tidak berhak menyelesaikan paket ini'};
  var totals=nonHonorTotalsV157_(rencana);if(!totals.rows.length)return {success:false,message:'Minimal satu realisasi harus dicatat'};if(totals.total>num(rencana.jumlah)+0.5)return {success:false,message:'Total realisasi melebihi pagu'};
  var now=new Date();totals.rows.forEach(function(real){if(upper(real.status)!=='FINAL')updateRowFieldsFastV109_(SH_REALISASI,real._row,{status:'FINAL',tanggal_update:now,update_by:norm(user.nama)});});
  var state=setNonHonorPackageStatusV157_(rencana,user,NH_STATUS_V157_.DONE,pbj?'SELESAIKAN_NON_HONOR_OLEH_PBJ':'SELESAIKAN_NON_HONOR_OLEH_USER',totals.rows.length+' realisasi | '+formatRp(totals.total));
  return {success:true,message:pbj?'Paket berhasil diperiksa dan diselesaikan oleh Verifikator PBJ':'Paket Non Pengadaan berhasil diselesaikan',status:state.status,total_realisasi:state.total};
}
function reopenNonHonorPackageV157_(req){
  var user=req.user||{},rencana=findById(getRows(SH_RENCANA),'id_kegiatan',req.id_kegiatan);requireNonProcAccess_(user,rencana);
  if(!isNonHonorPBJV157_(user))return {success:false,message:'Hanya Verifikator PBJ yang dapat membuka akses edit user'};
  if(!isNonHonorV156_(rencana))return {success:false,message:'Paket ini bukan Non Pengadaan selain Honorarium'};
  var stage=nonHonorPackageStatusV157_(rencana);
  if([NH_STATUS_V157_.REVIEW,NH_STATUS_V157_.READY,NH_STATUS_V157_.DONE].indexOf(stage)<0)return {success:false,message:'Akses edit user sudah terbuka'};
  var state=setNonHonorPackageStatusV157_(rencana,user,NH_STATUS_V157_.REOPEN,'BUKA_KEMBALI_NON_HONOR','Akses edit User Bidang dibuka dari status '+stage);
  return {success:true,message:'Akses edit User Bidang berhasil dibuka. Paket harus diajukan kembali setelah diperbaiki',status:state.status,total_realisasi:state.total};
}

/* Jalur v156 tetap tersedia untuk browser cache lama, tetapi seluruh write
   diarahkan ke aturan v157 agar tahapan pemeriksaan tidak dapat dilewati. */
syncNonHonorStatusV156_=syncNonHonorStatusV157_;
canEditNonHonorV156_=canNonHonorOwnerWriteV157_;
var nonDocStateV157Base_=nonDocStateV155_;
nonDocStateV155_=function(idKegiatan){
  var rencana=findById(getRows(SH_RENCANA),'id_kegiatan',idKegiatan);
  if(!isNonHonorV156_(rencana))return nonDocStateV157Base_(idKegiatan);
  var totals=nonHonorTotalsV157_(rencana),stage=nonHonorPackageStatusV157_(rencana);
  return {status:stage,complete:true,valid:stage===NH_STATUS_V157_.READY||stage===NH_STATUS_V157_.DONE,repair:stage===NH_STATUS_V157_.REOPEN,docs:[],realisasi:totals.rows[totals.rows.length-1]||null,realFinal:stage===NH_STATUS_V157_.READY||stage===NH_STATUS_V157_.DONE,required:[],realisasi_list:totals.rows,total_realisasi:totals.total};
};

var routeActionV157Base_=routeAction_;
routeAction_=function(a,req){
  if(a==='saveNonHonorRealizationV156')return saveNonHonorRealizationV157_(req);
  if(a==='updateNonHonorRealizationV156')return updateNonHonorRealizationV157_(req);
  if(a==='deleteNonHonorRealizationV156')return deleteNonHonorRealizationV157_(req);
  if(a==='uploadNonHonorRealizationDocsV156')return uploadNonHonorRealizationDocsV157_(req);
  if(a==='deleteNonHonorRealizationDocV156')return deleteNonHonorRealizationDocV157_(req);
  if(a==='finishNonHonorPackageV156'||a==='finishNonHonorPackageV157')return finishNonHonorPackageV157_(req);
  if(a==='submitNonHonorReviewV157')return submitNonHonorReviewV157_(req);
  if(a==='approveNonHonorReviewV157')return approveNonHonorReviewV157_(req);
  if(a==='reopenNonHonorPackageV157')return reopenNonHonorPackageV157_(req);
  return routeActionV157Base_(a,req);
};
var doPostV157Base_=doPost;
doPost=function(e){
  try{
    var raw=e&&e.postData&&e.postData.contents?e.postData.contents:'{}',req=JSON.parse(raw||'{}');
    var writes=['saveNonHonorRealizationV156','updateNonHonorRealizationV156','deleteNonHonorRealizationV156','uploadNonHonorRealizationDocsV156','deleteNonHonorRealizationDocV156','finishNonHonorPackageV156','finishNonHonorPackageV157','submitNonHonorReviewV157','approveNonHonorReviewV157','reopenNonHonorPackageV157'];
    if(writes.indexOf(req.action)>=0)return withShortWriteLockV135_(function(){return out(routeAction_(req.action,req));});
    return doPostV157Base_(e);
  }catch(err){return out({success:false,message:err&&err.message?err.message:String(err),stack:err&&err.stack?err.stack:''});}
};

