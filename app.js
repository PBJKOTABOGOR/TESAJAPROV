const API_URL = "https://script.google.com/macros/s/AKfycbxzXUNJ-HrMnh5WCEotHq7gZIfkEVvS8V9vdEvdttJWn-EslQiD8QthZZ4AzZzr3Lte/exec";

let currentUser = null;
let dashboard = null;
let activeMenu = "Struktur Anggaran";
let perPage = 10;
let perencanaanPage = 1;
let pencairanPage = 1;
let filters = {
  rencanaBidang: "ALL", rencanaStatus: "ALL", rencanaSearch: "",
  cairBidang: "ALL", cairStatus: "ALL", cairSearch: ""
};
let VerifikatorEditRows = {};
let collapseState = { perencanaanInput: false, uploadPencairan: false };
let docGroupCollapse = {};

const MENUS_USER = ["Struktur Anggaran", "Perencanaan", "Pencairan", "Laporan"];
const MENUS_ADMIN = ["Dashboard Monitoring", "Struktur Anggaran", "Perencanaan", "Pencairan"];
const MENUS_REVIEWER = ["Dashboard Monitoring", "Struktur Anggaran", "Perencanaan", "Pencairan"];
const REVIEWER_ROLES = ["SEKDA", "AUDITOR"];

function roleCode(){ return String(currentUser?.id_bidang || "").toUpperCase(); }
function isAdmin(){ return roleCode() === "ADMIN"; }
function isReviewer(){ return REVIEWER_ROLES.includes(roleCode()); }
function canSeeAll(){ return isAdmin() || isReviewer(); }
function canManage(){ return isAdmin(); }
function roleLabel(){
  if(isAdmin()) return "ADMIN";
  if(isReviewer()) return roleCode();
  return "BIDANG";
}
function toNumber(v){
  if(v === null || v === undefined || v === "") return 0;
  if(typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v).trim().replace(/[^0-9,.-]/g, "");
  if(!s) return 0;
  if((s.match(/\./g) || []).length > 1 && !s.includes(",")) s = s.replace(/\./g, "");
  else if(s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if(s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const num = Number(s);
  return isFinite(num) ? num : 0;
}
function formatTanggalID(v){
  if(!v) return "-";
  const s = String(v).trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s+"T00:00:00+07:00") : new Date(s);
  if(!isNaN(d.getTime())) return d.toLocaleDateString("id-ID", {day:"2-digit", month:"long", year:"numeric", timeZone:"Asia/Jakarta"});
  return s;
}
function rupiah(n){ return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(toNumber(n)); }
function angkaID(n){ return new Intl.NumberFormat("id-ID", {maximumFractionDigits:0}).format(toNumber(n)); }
function formatAngkaInput(el){ const raw = String(el.value || "").replace(/[^0-9]/g, ""); el.value = raw ? angkaID(raw) : ""; }
function setAutoTotal(volumeId="volume", hargaId="harga", totalId="totalPreview"){
  const total = toNumber(document.getElementById(volumeId)?.value) * toNumber(document.getElementById(hargaId)?.value);
  const el = document.getElementById(totalId);
  if(el) el.value = rupiah(total);
  const isEdit = totalId !== "totalPreview";
  const metodeEl = document.getElementById(isEdit ? "editMetodePemilihan" : "metodePemilihan");
  if(metodeEl) metodeEl.value = total > 0 ? metodePemilihanByNilai(total) : "";
  const waktuEl = document.getElementById(isEdit ? "editWaktuPemilihan" : "waktuPemilihan");
  const preview = document.getElementById(isEdit ? "editMetodePreview" : "metodePreview");
  if(preview) preview.innerHTML = total > 0 ? ketentuanPemilihanHtml(total, waktuEl?.value || "") : "";
}
function onAngkaInput(el, volumeId="volume", hargaId="harga", totalId="totalPreview"){ formatAngkaInput(el); setAutoTotal(volumeId, hargaId, totalId); }
function onWaktuPemilihanInput(isEdit=false){ setAutoTotal(isEdit ? "editVolume" : "volume", isEdit ? "editHarga" : "harga", isEdit ? "editTotalPreview" : "totalPreview"); }
function esc(v){ return String(v ?? "").replace(/[&<>'"]/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[s])); }

const JENIS_DOKUMEN_SOP = [
  "Bukti Pembelian / Kwitansi",
  "Faktur Pembelian",
  "Surat Perintah Kerja",
  "Surat Perjanjian / Kontrak",
  "Berita Acara",
  "SPTJM",
  "Surat Permohonan Pembayaran",
  "Nota Dinas Pencairan",
  "Surat Perintah Pembayaran",
  "Dokumen Pendukung Lainnya"
];

function metodePemilihanByNilai(jumlah){
  const nilai = toNumber(jumlah);
  if(nilai <= 500000000) return "Belanja Langsung";
  if(nilai <= 1000000000) return "Pengadaan Langsung";
  return "Tender Manual";
}
function dokumenKetentuanByMetode(metode){
  const m = String(metode || "").toUpperCase();
  if(m === "BELANJA LANGSUNG") return ["Bukti Pembelian / Kwitansi", "Faktur Pembelian", "SPTJM", "Surat Permohonan Pembayaran", "Nota Dinas Pencairan", "Surat Perintah Pembayaran"];
  if(m === "PENGADAAN LANGSUNG") return ["Surat Perintah Kerja", "Berita Acara", "Bukti Pembelian / Kwitansi", "Faktur Pembelian", "SPTJM", "Surat Permohonan Pembayaran", "Nota Dinas Pencairan", "Surat Perintah Pembayaran"];
  if(m === "TENDER MANUAL") return ["Surat Perjanjian / Kontrak", "Surat Perintah Kerja", "Berita Acara", "Bukti Pembelian / Kwitansi", "Faktur Pembelian"];
  return JENIS_DOKUMEN_SOP;
}
function dokumenKetentuanByNilai(jumlah){ return dokumenKetentuanByMetode(metodePemilihanByNilai(jumlah)); }
function waktuPemilihanByNilai(jumlah){
  return "-";
}
function ketentuanPemilihanHtml(jumlah, waktuManual=""){
  const metode = metodePemilihanByNilai(jumlah);
  const docs = dokumenKetentuanByMetode(metode);
  return `<div class="metode-box shine-once">
    <div><span>Metode Otomatis</span><b>${esc(metode)}</b></div>
    <div><span>Waktu Pemilihan</span><b>${esc(waktuManual ? formatTanggalID(waktuManual) : "Diisi manual oleh user")}</b></div>
    <p><b>Dokumen pencairan yang perlu disiapkan:</b> ${docs.map(esc).join(", ")}.</p>
  </div>`;
}


function formatTanggalJam(v){
  if(!v) return "-";
  const raw = String(v);
  const d = new Date(raw);
  if(!isNaN(d.getTime())){
    return d.toLocaleDateString("id-ID", {day:"2-digit", month:"long", year:"numeric", timeZone:"Asia/Jakarta"}) + " pukul " +
           d.toLocaleTimeString("id-ID", {hour:"2-digit", minute:"2-digit", timeZone:"Asia/Jakarta"}) + " WIB";
  }
  return raw.replace("T"," ").replace("Z","");
}

function normalizeJenisDokumenLabel(v){
  const t = String(v || "").trim();
  const u = t.toUpperCase();
  if(u === "BERITA ACARA NEGOSIASI TEKNIS DAN HARGA" || u === "BERITA ACARA PENETAPAN PENYEDIA") return "Berita Acara";
  return t;
}

function docOptionsHtml(selected="", idKegiatan=""){
  const k = kegiatanById(idKegiatan);
  const list = k ? dokumenKetentuanByNilai(k.jumlah) : JENIS_DOKUMEN_SOP;
  return list.map(x => `<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join("");
}
function kegiatanById(id){
  return (dashboard?.perencanaan || []).find(k => String(k.id_kegiatan) === String(id)) || null;
}
function wajibDocNote(idKegiatan){
  const k = kegiatanById(idKegiatan);
  if(!k) return "";
  return ketentuanPemilihanHtml(k.jumlah);
}
function updateSaranDokumen(){
  const id = document.getElementById("dokKegiatan")?.value;
  const box = document.getElementById("saranDokumen");
  if(box) box.innerHTML = wajibDocNote(id);
  document.querySelectorAll("#uploadRows .jenisDok").forEach(sel => {
    sel.innerHTML = docOptionsHtml(sel.value, id);
  });
}

function statusDihitungPagu(status){
  return String(status || '').toUpperCase() !== 'PERLU PERBAIKAN';
}
function rekapBidangAktif(){
  if(canSeeAll()) return null;
  return (dashboard?.rekap || []).find(r => String(r.id_bidang) === String(currentUser?.id_bidang)) || null;
}
function totalAktifBidang(excludeId){
  if(!dashboard?.perencanaan) return 0;
  const ex = String(excludeId || '');
  return dashboard.perencanaan
    .filter(k => String(k.id_bidang) === String(currentUser?.id_bidang))
    .filter(k => !ex || String(k.id_kegiatan) !== ex)
    .filter(k => statusDihitungPagu(k.status_perencanaan))
    .reduce((s,k) => s + toNumber(k.jumlah), 0);
}
function cekPaguFrontend(jumlahBaru, excludeId){
  const rekap = rekapBidangAktif();
  if(!rekap) return {ok:true};
  const pagu = toNumber(rekap.pagu);
  const totalLain = totalAktifBidang(excludeId);
  const sisa = pagu - totalLain;
  const jumlah = toNumber(jumlahBaru);
  if(jumlah > sisa){
    return {ok:false, message:`Gagal menyimpan. Total perencanaan melebihi pagu bidang.\n\nSisa pagu saat ini: ${rupiah(sisa)}\nNilai yang diajukan: ${rupiah(jumlah)}\n\nSilakan kurangi volume/harga satuan atau minta Verifikator menyesuaikan pagu.`};
  }
  return {ok:true};
}

function showLoading(text="Memproses..."){ document.getElementById("loadingText").innerText = text; document.getElementById("loadingOverlay").classList.remove("hidden"); }
function hideLoading(){ document.getElementById("loadingOverlay").classList.add("hidden"); }

function displayStatusText(v){
  const t = String(v || "").toUpperCase();
  if(t === "DITOLAK") return "PERLU PERBAIKAN";
  if(t === "ADA YANG DITOLAK") return "PERLU PENYESUAIAN";
  return v || "-";
}

function badge(text){
  const t = String(text || "-").toUpperCase();
  const label = displayStatusText(t);
  let cls = "badge-gray";
  if(["DISETUJUI","VALID","DOKUMEN LENGKAP","SIAP DICAIRKAN","SUDAH DICAIRKAN","BUKA","AMAN"].includes(t)) cls = "badge-green";
  if(["DIAJUKAN","MENUNGGU","MENUNGGU VERIFIKASI","PERUBAHAN_DIAJUKAN"].includes(t)) cls = "badge-blue";
  if(["DITOLAK","PERLU PERBAIKAN","PERBAIKAN","TUTUP","MELEBIHI PAGU"].includes(t)) cls = "badge-red";
  if(["ADA YANG DITOLAK","BELUM ADA DOKUMEN","BELUM INPUT","PERLU DIPERIKSA","PERLU PENYESUAIAN"].includes(t)) cls = "badge-orange";
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}
async function apiPost(payload){
  const readOnlyActions = new Set(["login","getDashboard","forceDriveAuth"]);
  const isReadOnly = readOnlyActions.has(payload?.action);
  const maxTry = isReadOnly ? 2 : 1;
  let lastErr = null;

  for(let attempt=1; attempt<=maxTry; attempt++){
    const controller = new AbortController();
    const timeoutMs = isReadOnly ? 18000 : 45000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try{
      const res = await fetch(API_URL, {
        method:"POST",
        body: JSON.stringify(payload || {}),
        signal: controller.signal
      });
      const txt = await res.text();
      if(!res.ok){
        throw new Error(`API HTTP ${res.status}: ${String(txt || "").slice(0, 240)}`);
      }
      try{
        return JSON.parse(txt);
      }catch(e){
        if(String(txt || "").startsWith("<!DOCTYPE html>")){
          throw new Error("URL Web App tidak mengembalikan JSON. Cek Deploy Apps Script: Execute as Me, Who has access Anyone, lalu pastikan URL /exec sudah benar.");
        }
        throw new Error(String(txt || "Response bukan JSON").slice(0, 300));
      }
    }catch(err){
      lastErr = err;
      if(err.name === "AbortError") lastErr = new Error("API terlalu lama merespons. Coba ulangi, atau cek deploy Apps Script.");
      if(attempt < maxTry){
        await new Promise(resolve => setTimeout(resolve, 650 * attempt));
      }
    }finally{
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error("Gagal konek ke server/API.");
}
async function login(){
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("loginMsg");
  if(!username || !password){ msg.innerText = "Username dan password wajib diisi."; return; }
  showLoading("Login...");
  try{
    const r = await apiPost({action:"login", username, password});
    if(!r.success){ msg.innerText = r.message; return; }
    currentUser = r.user;
    localStorage.setItem("siporbo_user", JSON.stringify(currentUser));
    activeMenu = canSeeAll() ? "Dashboard Monitoring" : "Struktur Anggaran";
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appPage").classList.remove("hidden");
    await loadDashboard(false);
  }catch(err){ msg.innerText = "Gagal konek ke server/API: " + (err.message || err); console.error(err); }
  finally{ hideLoading(); }
}

function normalizeDashboardData(r){
  r = r || {};
  r.bidangs = Array.isArray(r.bidangs) ? r.bidangs : [];
  r.perencanaan = Array.isArray(r.perencanaan) ? r.perencanaan : [];
  r.pencairan = Array.isArray(r.pencairan) ? r.pencairan : [];
  r.dokumen = Array.isArray(r.dokumen) ? r.dokumen : [];
  r.rekap = Array.isArray(r.rekap) ? r.rekap : [];
  r.bidangMap = r.bidangMap || {};
  r.perencanaan = r.perencanaan.map(k => {
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume) * toNumber(k.harga_satuan)));
    return {
      ...k,
      jumlah,
      metode_pemilihan: k.metode_pemilihan || metodePemilihanByNilai(jumlah),
      waktu_pemilihan: k.waktu_pemilihan || ""
    };
  });
  return r;
}


function cacheKeyDashboard(){
  const u = currentUser || {};
  return `SIMPROV_DASHBOARD_CACHE_V45_${u.id_user || u.username || u.id_bidang || "guest"}`;
}
function readDashboardCache(){
  try{
    const raw = localStorage.getItem(cacheKeyDashboard());
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(!obj || !obj.data) return null;
    return obj;
  }catch(e){ return null; }
}
function writeDashboardCache(data){
  try{
    localStorage.setItem(cacheKeyDashboard(), JSON.stringify({savedAt:Date.now(), data}));
  }catch(e){
    // localStorage bisa penuh kalau dokumen banyak. Tidak fatal.
    console.warn("CACHE_WRITE_FAILED", e);
  }
}
function dashboardCacheAgeText(savedAt){
  if(!savedAt) return "";
  const sec = Math.max(0, Math.round((Date.now() - savedAt)/1000));
  if(sec < 60) return `${sec} detik lalu`;
  const min = Math.round(sec/60);
  if(min < 60) return `${min} menit lalu`;
  return `${Math.round(min/60)} jam lalu`;
}
function showFastCacheNotice(text){
  const el = document.getElementById("cacheNotice");
  if(el) el.remove();
  const div = document.createElement("div");
  div.id = "cacheNotice";
  div.className = "cache-notice";
  div.innerText = text;
  document.body.appendChild(div);
  setTimeout(()=>{ try{ div.remove(); }catch(e){} }, 3500);
}

async function loadDashboard(withLoader=true){
  const cached = readDashboardCache();
  let renderedCache = false;

  // Mode super cepat: tampilkan data cache dulu dalam hitungan milidetik.
  if(cached && cached.data){
    try{
      dashboard = normalizeDashboardData(cached.data);
      document.getElementById("userInfo").innerText = `${currentUser.nama || "-"} - ${currentUser.nama_bidang || currentUser.id_bidang || "-"}`;
      renderAll();
      renderedCache = true;
      showFastCacheNotice(`Data sedang diperbarui. Tampilan terakhir berhasil dimuat (${dashboardCacheAgeText(cached.savedAt)}).`);
    }catch(e){
      console.warn("CACHE_RENDER_FAILED", e);
    }
  }

  if(withLoader && !renderedCache) showLoading("Memuat data...");
  try{
    const r = await apiPost({action:"getDashboard", user: currentUser});
    if(!r.success){ 
      if(!renderedCache) alert(r.message || "Gagal memuat dashboard.");
      else showFastCacheNotice("Data terakhir berhasil dimuat. Sinkronisasi terbaru belum berhasil.");
      return; 
    }
    dashboard = normalizeDashboardData(r);
    writeDashboardCache(dashboard);
    document.getElementById("userInfo").innerText = `${currentUser.nama || "-"} - ${currentUser.nama_bidang || currentUser.id_bidang || "-"}`;
    try{
      renderAll();
      if(renderedCache) showFastCacheNotice("Data terbaru berhasil diperbarui.");
    }catch(renderErr){
      console.error("RENDER_DASHBOARD_ERROR:", renderErr);
      activeMenu = canSeeAll() ? "Dashboard Monitoring" : "Struktur Anggaran";
      renderMenu();
      renderSummary();
      document.getElementById("contentArea").innerHTML = `<section class="panel"><h3>Data berhasil dimuat</h3><p class="panel-sub">Tampilan menu sebelumnya gagal dirender. Silakan klik Refresh atau pindah menu. Detail teknis: ${esc(renderErr.message || renderErr)}</p></section>`;
    }
  }catch(err){ 
    console.error("LOAD_DASHBOARD_ERROR:", err); 
    if(!renderedCache) alert("Gagal memuat dashboard. Detail: " + String(err.message || err).slice(0, 240)); 
    else showFastCacheNotice("Data terakhir berhasil dimuat. Sinkronisasi terbaru belum berhasil.");
  }
  finally{ if(withLoader && !renderedCache) hideLoading(); }
}
async function refreshData(){ 
  // Refresh manual tetap paksa ambil data terbaru.
  showLoading("Sinkronisasi data terbaru...");
  try{
    const r = await apiPost({action:"getDashboard", user: currentUser});
    if(!r.success){ alert(r.message || "Gagal memuat dashboard."); return; }
    dashboard = normalizeDashboardData(r);
    writeDashboardCache(dashboard);
    renderAll();
    showFastCacheNotice("Data berhasil diperbarui.");
  }catch(err){
    alert("Gagal refresh data. Detail: " + String(err.message || err).slice(0,240));
  }finally{
    hideLoading();
  }
}
function renderAll(){ renderMenu(); renderSummary(); renderContent(); }
function setMenu(m){ activeMenu=m; perencanaanPage=1; pencairanPage=1; renderAll(); }
function renderMenu(){
  const menus = isAdmin() ? MENUS_ADMIN : (isReviewer() ? MENUS_REVIEWER : MENUS_USER);
  document.getElementById("menuNav").innerHTML = menus.map(m => `<button class="${activeMenu===m?'active':''}" onclick="setMenu('${m}')">${m}</button>`).join("");
}
function card(a,b){ return `<div class="summary-card"><span>${esc(a)}</span><b>${esc(b)}</b></div>`; }
function renderSummary(){
  const wrap = document.getElementById("summaryCards"); if(!dashboard){ wrap.innerHTML=""; return; }
  if(canSeeAll()){
    const pagu = dashboard.rekap.reduce((s,r)=>s+toNumber(r.pagu),0);
    const total = dashboard.rekap.reduce((s,r)=>s+toNumber(r.total_perencanaan),0);
    const dok = dashboard.dokumen.length;
    const valid = dashboard.dokumen.filter(d => isDocValidKeuanganV70(d)).length;
    wrap.innerHTML = card("Total Pagu", rupiah(pagu))+card("Total Perencanaan", rupiah(total))+card("Sisa Pagu", rupiah(pagu-total))+card("Dokumen Valid", `${valid}/${dok}`);
  } else {
    const r = dashboard.rekap.find(x => String(x.id_bidang)===String(currentUser.id_bidang)) || {};
    wrap.innerHTML = card("Pagu Bidang", rupiah(r.pagu))+card("Total Perencanaan", rupiah(r.total_perencanaan))+card("Sisa Pagu", rupiah(r.sisa_pagu))+card("Status Akses", r.status_akses || "-");
  }
}
function renderContent(){
  if(activeMenu==="Dashboard Monitoring") return renderMonitoring();
  if(activeMenu==="Struktur Anggaran") return renderStruktur();
  if(activeMenu==="Perencanaan") return renderPerencanaan();
  if(activeMenu==="Pencairan") return renderPencairan();
  if(activeMenu==="Laporan") return renderLaporanUser();
}

function renderLaporanUser(){
  const r = dashboard.rekap.find(x=>String(x.id_bidang)===String(currentUser.id_bidang)) || {};
  const totalKegiatan = (dashboard.perencanaan || []).length;
  const totalDokumen = (dashboard.dokumen || []).length;
  const dokValid = (dashboard.dokumen || []).filter(d => isDocValidKeuanganV70(d)).length;
  const perluPerbaikan = (dashboard.dokumen || []).filter(d => ["PERBAIKAN","DITOLAK"].includes(String(d.status_verifikasi||"").toUpperCase())).length;
  document.getElementById("contentArea").innerHTML = `
    <section class="panel fade-up premium-panel report-menu-panel">
      <div class="panel-title-row">
        <div>
          <h3>Laporan</h3>
          <p class="panel-sub">Unduh laporan lengkap bidang, mulai dari pagu, perencanaan, riwayat perubahan, sampai dokumen pencairan yang sudah diupload.</p>
        </div>
        <button class="btn-refresh" onclick="refreshData()">Refresh Data</button>
      </div>
      <div class="report-summary-grid">
        <div><span>Pagu Bidang</span><strong>${rupiah(r.pagu)}</strong></div>
        <div><span>Total Perencanaan</span><strong>${rupiah(r.total_perencanaan)}</strong></div>
        <div><span>Sisa Pagu</span><strong>${rupiah(r.sisa_pagu)}</strong></div>
        <div><span>Dokumen Valid</span><strong>${dokValid}/${totalDokumen}</strong></div>
      </div>
      <div class="report-card-main">
        <div>
          <h4>Laporan Lengkap Bidang</h4>
          <p>Laporan berisi ringkasan anggaran, daftar perencanaan, status persetujuan, alasan penolakan, riwayat perubahan, rekap dokumen pencairan, status dokumen, catatan Verifikator, tanggal upload, dan link file dokumen.</p>
          <div class="report-tags">
            <span>${esc(currentUser.nama_bidang || currentUser.bidang || currentUser.nama)}</span>
            <span>${totalKegiatan} kegiatan</span>
            <span>${totalDokumen} dokumen</span>
            <span>${perluPerbaikan} perlu perbaikan</span>
          </div>
        </div>
        <button class="btn-report-pdf" onclick="downloadDashboardPDF()">Download Laporan PDF</button>
      </div>
    </section>`;
}

function bidangName(id){ return dashboard.bidangMap?.[String(id)] || id || "-"; }
function kegiatanName(id){ const k = dashboard.perencanaan.find(x => String(x.id_kegiatan)===String(id)); return k?.nama_kegiatan || id || "-"; }
function getPencairanStatus(id){ const p = dashboard.pencairan.find(x => String(x.id_kegiatan)===String(id)); return p?.status_pencairan || dashboard.perencanaan.find(k => String(k.id_kegiatan)===String(id))?.status_pencairan || "BELUM ADA DOKUMEN"; }
function aksesPerencanaanTerbuka(){
  if(canSeeAll()) return false;
  const r = dashboard?.rekap?.find(x => String(x.id_bidang) === String(currentUser.id_bidang));
  return String(r?.status_akses || currentUser?.status_akses || "").toUpperCase() === "BUKA";
}
function isKegiatanLocked(k){
  const stCair = String(getPencairanStatus(k.id_kegiatan) || "").toUpperCase();
  if(["DOKUMEN LENGKAP","SIAP DICAIRKAN","SUDAH DICAIRKAN"].includes(stCair)) return true;
  const docs = (dashboard.dokumen || []).filter(d => String(d.id_kegiatan) === String(k.id_kegiatan));
  return docs.length > 0 && docs.every(d => String(d.status_verifikasi || "").toUpperCase() === "VALID");
}
function bidangOptions(selected="ALL", includeAll=true){
  return `${includeAll?`<option value="ALL" ${selected==='ALL'?'selected':''}>Semua Bidang</option>`:""}` + dashboard.bidangs.map(b => `<option value="${esc(b.id_bidang)}" ${selected===String(b.id_bidang)?'selected':''}>${esc(b.nama_bidang)}</option>`).join("");
}
function pager(total, page, fn){
  const pages = Math.max(1, Math.ceil(total/perPage));
  return `<div class="table-footer"><small class="muted">Menampilkan ${total?((page-1)*perPage+1):0}-${Math.min(page*perPage,total)} dari ${total} data</small><div class="pager"><button class="btn-soft" ${page<=1?'disabled':''} onclick="${fn}(${page-1})">Sebelumnya</button><b>${page}/${pages}</b><button class="btn-soft" ${page>=pages?'disabled':''} onclick="${fn}(${page+1})">Berikutnya</button></div></div>`;
}
function setPerPage(p){ perPage = Number(p)||10; perencanaanPage=1; pencairanPage=1; renderContent(); }
function goPerencanaanPage(p){ perencanaanPage=p; renderPerencanaan(); }
function goPencairanPage(p){ pencairanPage=p; renderPencairan(); }


function toggleCollapse(key){
  collapseState[key] = !collapseState[key];
  renderContent();
}
function collapseButton(key){
  return `<button class="btn-soft btn-toggle" onclick="toggleCollapse('${key}')">${collapseState[key] ? 'Maximize' : 'Minimize'}</button>`;
}
function setAdminEditRow(id, on){
  VerifikatorEditRows[id] = !!on;
  renderStruktur();
}
function onPaguAdminInput(el){
  formatAngkaInput(el);
}
function renderMonitoring(){
  const rows = dashboard.rekap.map(r=>{
    const pct=toNumber(r.pagu)?Math.min(100,Math.round(toNumber(r.total_perencanaan)/toNumber(r.pagu)*100)):0;
    const over = toNumber(r.sisa_pagu) < 0;
    return `<tr class="${over?'row-rejected':''}"><td><b>${esc(r.nama_bidang)}</b><br><small class="muted">${esc(r.id_bidang)}</small></td><td>${rupiah(r.pagu)}</td><td>${rupiah(r.total_perencanaan)}</td><td class="${over?'text-danger fw-bold':''}">${rupiah(r.sisa_pagu)}</td><td><div class="progress-bar"><div style="width:${pct}%"></div></div><small>${pct}%</small></td><td>${esc(r.jumlah_kegiatan||0)}</td><td>${esc(r.dokumen_upload||0)}</td><td>${esc(r.dokumen_valid||0)}</td><td>${badge(r.status_akses)}</td><td>${over?badge('MELEBIHI PAGU'):badge(r.status_progress)}</td></tr>`;
  }).join("");
  const cards = dashboard.rekap.map(r=>{
    const pct=toNumber(r.pagu)?Math.min(100,Math.round(toNumber(r.total_perencanaan)/toNumber(r.pagu)*100)):0;
    const over = toNumber(r.sisa_pagu) < 0;
    return `<div class="monitor-card ${over?'over-budget':''}">
      <div class="monitor-head"><div><b>${esc(r.nama_bidang)}</b><small>${esc(r.id_bidang)}</small></div><div>${over?badge('MELEBIHI PAGU'):badge(r.status_progress)}</div></div>
      <div class="monitor-grid">
        <div><span>Pagu</span><strong>${rupiah(r.pagu)}</strong></div>
        <div><span>Perencanaan</span><strong>${rupiah(r.total_perencanaan)}</strong></div>
        <div><span>Sisa Pagu</span><strong class="${over?'text-danger':''}">${rupiah(r.sisa_pagu)}</strong></div>
        <div><span>Kegiatan</span><strong>${esc(r.jumlah_kegiatan||0)}</strong></div>
        <div><span>Dokumen Upload</span><strong>${esc(r.dokumen_upload||0)}</strong></div>
        <div><span>Dokumen Valid</span><strong>${esc(r.dokumen_valid||0)}</strong></div>
      </div>
      <div class="progress-line"><div style="width:${pct}%"></div></div>
      <div class="monitor-foot"><span>Akses Input</span>${badge(r.status_akses)}</div>
    </div>`;
  }).join("");
  const totalBidang = dashboard.rekap.length;
  const bidangOver = dashboard.rekap.filter(r => toNumber(r.sisa_pagu) < 0).length;
  const perluPersetujuan = (dashboard.perencanaan || []).filter(k => ["DIAJUKAN","PERUBAHAN_DIAJUKAN"].includes(String(k.status_perencanaan||"").toUpperCase())).length;
  const dokMenunggu = (dashboard.dokumen || []).filter(d => ["","MENUNGGU","PERBAIKAN","PERLU PERBAIKAN"].includes(String(d.status_verifikasi||"").toUpperCase())).length;
  const auditBox = canSeeAll() ? `<div class="review-kpi-grid">
    <div><span>Total Bidang</span><strong>${totalBidang}</strong></div>
    <div><span>Perlu Persetujuan</span><strong>${perluPersetujuan}</strong></div>
    <div><span>Dokumen Perlu Dicek</span><strong>${dokMenunggu}</strong></div>
    <div><span>Bidang Melebihi Pagu</span><strong class="${bidangOver?'text-danger':''}">${bidangOver}</strong></div>
  </div>` : "";
  document.getElementById("contentArea").innerHTML = `<section class="panel fade-up"><div class="panel-title-row"><div><h3>${isReviewer()?'Dashboard Pemeriksaan':'Dashboard Monitoring Admin'}</h3><p class="panel-sub">${isReviewer()?'Tampilan khusus pemeriksaan seluruh bidang: pagu, perencanaan, dokumen, status akses, dan progres.':'Pantauan perencanaan dan pencairan dari semua bidang.'}</p></div><div class="action-group"><button class="btn-refresh" onclick="refreshData()">Refresh Data</button><button class="btn-soft btn-report" onclick="downloadDashboardPDF()">Cetak Laporan PDF</button></div></div>${auditBox}<div class="monitor-card-list">${cards || `<p class="empty">Belum ada data</p>`}</div><div class="table-hint">Geser tabel ke samping untuk melihat kolom lainnya.</div><div class="table-wrap dashboard-table" style="margin-top:10px"><table><thead><tr><th>Bidang</th><th>Pagu</th><th>Perencanaan</th><th>Sisa</th><th>%</th><th>Kegiatan</th><th>Dok Upload</th><th>Dok Valid</th><th>Akses</th><th>Progress</th></tr></thead><tbody>${rows || `<tr><td colspan="12" class="empty">Belum ada data</td></tr>`}</tbody></table></div></section>`;
}
function renderStruktur(){
  if(canManage()){
    const rows = dashboard.rekap.map(r=>{
      const id = String(r.id_bidang);
      const editing = !!VerifikatorEditRows[id];
      const paguView = angkaID(r.pagu);
      return `<div class="Verifikator-row premium-row ${editing?'editing':''}">
        <div><b>${esc(r.nama_bidang)}</b><br><small class="muted">${esc(r.id_bidang)}</small><br><small>Total: ${rupiah(r.total_perencanaan)} | Sisa: ${rupiah(r.sisa_pagu)}</small></div>
        <div class="field"><label>Pagu</label>${editing?`<input id="pagu_${esc(r.id_bidang)}" inputmode="numeric" value="${paguView}" oninput="onPaguAdminInput(this)">`:`<div class="readonly-display">Rp ${paguView}</div>`}</div>
        <div class="field"><label>Akses</label>${editing?`<select id="akses_${esc(r.id_bidang)}"><option value="BUKA" ${r.status_akses==='BUKA'?'selected':''}>BUKA</option><option value="TUTUP" ${r.status_akses==='TUTUP'?'selected':''}>TUTUP</option></select>`:`<div class="readonly-display">${esc(r.status_akses || '-')}</div>`}</div>
        <div>${badge(r.status_progress)}</div>
        <div class="Verifikator-actions">${editing?`<button onclick="updateBidang('${esc(r.id_bidang)}')">Simpan</button><button class="btn-soft" onclick="setAdminEditRow('${esc(r.id_bidang)}', false)">Batal</button>`:`<button class="btn-mini" onclick="setAdminEditRow('${esc(r.id_bidang)}', true)">Edit</button>`}</div>
      </div>`;
    }).join("");
    document.getElementById("contentArea").innerHTML = `<section class="panel fade-up premium-panel"><h3>Struktur Anggaran</h3><p class="panel-sub">Admin mengatur pagu dan akses input tiap bidang. Klik Edit dulu untuk mengubah data.</p>${rows || `<p class="muted">Belum ada bidang.</p>`}</section>`;
  } else if(isReviewer()){
    const cards = dashboard.rekap.map(r=>{
      const over = toNumber(r.sisa_pagu) < 0;
      return `<div class="review-row ${over?'over-budget':''}">
        <div class="review-title"><b>${esc(r.nama_bidang)}</b><small>${esc(r.id_bidang)}</small></div>
        <div class="review-metrics">
          <div><span>Pagu</span><strong>${rupiah(r.pagu)}</strong></div>
          <div><span>Total Perencanaan</span><strong>${rupiah(r.total_perencanaan)}</strong></div>
          <div><span>Sisa Pagu</span><strong class="${over?'text-danger':''}">${rupiah(r.sisa_pagu)}</strong></div>
          <div><span>Kegiatan</span><strong>${esc(r.jumlah_kegiatan||0)}</strong></div>
          <div><span>Dokumen</span><strong>${esc(r.dokumen_upload||0)} upload / ${esc(r.dokumen_valid||0)} valid</strong></div>
        </div>
        <div class="review-status">${badge(r.status_akses)} ${over?badge('MELEBIHI PAGU'):badge(r.status_progress)}</div>
      </div>`;
    }).join("");
    document.getElementById("contentArea").innerHTML = `<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Struktur Anggaran - Mode Pemeriksaan</h3><p class="panel-sub">Role ${roleLabel()} dapat melihat seluruh bidang secara read-only untuk memeriksa pagu, total perencanaan, sisa pagu, dokumen, dan status akses.</p></div><div class="action-group"><button class="btn-refresh" onclick="refreshData()">Refresh Data</button></div></div><div class="review-list">${cards || `<p class="muted">Belum ada bidang.</p>`}</div></section>`;
  } else {
    const r = dashboard.rekap.find(x=>String(x.id_bidang)===String(currentUser.id_bidang)) || {};
    document.getElementById("contentArea").innerHTML = `<section class="panel fade-up premium-panel"><h3>Ringkasan Bidang</h3><p class="panel-sub">Informasi anggaran dan progres bidang.</p><div class="action-group"><button class="btn-refresh" onclick="refreshData()">Refresh Data</button></div><div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Bidang</th><th>Pagu</th><th>Total Perencanaan</th><th>Sisa</th><th>Kegiatan</th><th>Dokumen</th><th>Akses</th><th>Progress</th></tr></thead><tbody><tr><td>${esc(r.nama_bidang)}</td><td>${rupiah(r.pagu)}</td><td>${rupiah(r.total_perencanaan)}</td><td>${rupiah(r.sisa_pagu)}</td><td>${esc(r.jumlah_kegiatan||0)}</td><td>${esc(r.dokumen_upload||0)}</td><td>${badge(r.status_akses)}</td><td>${badge(r.status_progress)}</td></tr></tbody></table></div></section>`;
  }
}
function filterBarPerencanaan(){
  return `<div class="filter-card"><div class="toolbar">${canSeeAll()?`<div class="field small"><label>Filter Bidang</label><select onchange="filters.rencanaBidang=this.value;perencanaanPage=1;renderPerencanaan()">${bidangOptions(filters.rencanaBidang,true)}</select></div>`:""}<div class="field small"><label>Filter Status</label><select onchange="filters.rencanaStatus=this.value;perencanaanPage=1;renderPerencanaan()"><option value="ALL">Semua Status</option>${["DIAJUKAN","DISETUJUI","PERLU PERBAIKAN","PERUBAHAN_DIAJUKAN"].map(s=>`<option value="${s}" ${filters.rencanaStatus===s?'selected':''}>${s}</option>`).join("")}</select></div><div class="field"><label>Search Nama Kegiatan</label><input value="${esc(filters.rencanaSearch)}" placeholder="Cari nama kegiatan..." oninput="filters.rencanaSearch=this.value;perencanaanPage=1;renderPerencanaan()"></div><div class="field small"><label>Per Halaman</label><select onchange="setPerPage(this.value)"><option ${perPage===10?'selected':''}>10</option><option ${perPage===25?'selected':''}>25</option><option ${perPage===50?'selected':''}>50</option></select></div><button class="btn-refresh" onclick="refreshData()">Refresh</button></div></div>`;
}
function getFilteredRencana(){
  let data = dashboard.perencanaan.filter(k=>k.id_kegiatan);
  if(canSeeAll() && filters.rencanaBidang !== "ALL") data = data.filter(k => String(k.id_bidang)===filters.rencanaBidang);
  if(filters.rencanaStatus !== "ALL") data = data.filter(k => String(k.status_perencanaan||"").toUpperCase()===filters.rencanaStatus);
  const q = filters.rencanaSearch.trim().toLowerCase();
  if(q) data = data.filter(k => String(k.nama_kegiatan||"").toLowerCase().includes(q));
  return data;
}
function renderPerencanaan(){
  const data = getFilteredRencana();
  const pageData = data.slice((perencanaanPage-1)*perPage, perencanaanPage*perPage);
  let html = "";
  if(!canSeeAll()){
    if(aksesPerencanaanTerbuka()){
      html += `<section class="panel fade-up premium-panel collapsible-panel"><div class="panel-head"><div><h3>Input Perencanaan</h3><p class="panel-sub">Input rencana kegiatan/kebutuhan. Setelah disimpan, status langsung DIAJUKAN ke Verifikator.</p></div>${collapseButton('perencanaanInput')}</div><div class="collapse-body ${collapseState.perencanaanInput?'hidden':''}"><div class="form-grid"><div class="field"><label>Nama Kegiatan</label><input id="namaKegiatan" placeholder="Contoh: Rapat Koordinasi"></div><div class="field"><label>Keterangan</label><input id="keterangan" placeholder="Opsional"></div><div class="field"><label>Volume</label><input id="volume" inputmode="numeric" placeholder="Contoh: 2" oninput="onAngkaInput(this)"></div><div class="field"><label>Satuan</label><input id="satuan" placeholder="Orang / Paket / Buah"></div><div class="field"><label>Harga Satuan</label><input id="harga" inputmode="numeric" placeholder="Contoh: 500.000" oninput="onAngkaInput(this)"></div><div class="field"><label>Total Otomatis</label><input id="totalPreview" class="readonly-total" value="Rp0" readonly></div><div class="field"><label>Metode</label><input id="metodePemilihan" class="readonly-total" placeholder="Otomatis sesuai pagu" readonly></div><div class="field"><label>Waktu Pemilihan</label><input id="waktuPemilihan" type="date" onchange="onWaktuPemilihanInput(false)"></div></div><div id="metodePreview" class="metode-preview"></div><button onclick="savePerencanaan()">Simpan & Ajukan</button><div id="saveMsg" class="msg"></div></div></section>`;
    } else {
      html += `<section class="panel fade-up locked-panel"><h3>Perencanaan Ditutup</h3><p class="panel-sub">🔒 Akses perencanaan bidang sedang ditutup oleh Verifikator. Kamu masih bisa membuka menu Pencairan untuk upload/revisi dokumen.</p></section>`;
    }
  }
  const rows = pageData.map(k=>renderPerencanaanRow(k)).join("");
  html += `<section class="panel fade-up"><h3>${isAdmin()?"Persetujuan Perencanaan":(isReviewer()?"Pemeriksaan Data Perencanaan":"Data Perencanaan")}</h3><p class="panel-sub">${isAdmin()?"Admin menyetujui/menolak perencanaan bidang.":(isReviewer()?"Role pemeriksa dapat melihat semua perencanaan, status, alasan penolakan, dan riwayat perubahan secara read-only.":"Daftar rencana kegiatan bidang sendiri.")}</p>${filterBarPerencanaan()}<div class="table-hint">Geser tabel ke samping untuk melihat kolom lainnya.</div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Bidang</th><th>Nama Kegiatan</th><th>Vol</th><th>Satuan</th><th>Harga</th><th>Jumlah</th><th>Metode</th><th>Waktu Pemilihan</th><th>Status</th><th>Alasan / Riwayat</th><th>Aksi</th></tr></thead><tbody>${rows || `<tr><td colspan="12" class="empty">Belum ada data</td></tr>`}</tbody></table></div>${pager(data.length, perencanaanPage, 'goPerencanaanPage')}</section>`;
  document.getElementById("contentArea").innerHTML = html;
  if(!canSeeAll()) setTimeout(updateSaranDokumen, 0);
}

function renderPerencanaanRow(k){
  const st = String(k.status_perencanaan||"DIAJUKAN").toUpperCase();
  const locked = isKegiatanLocked(k);
  const aksesBuka = aksesPerencanaanTerbuka();
  const note = `${k.alasan_penolakan?`<div class="reason-box"><b>Catatan penyesuaian:</b><br>${esc(k.alasan_penolakan)}</div>`:""}${k.alasan_perubahan?`<div class="history-box"><b>Alasan perubahan:</b><br>${esc(k.alasan_perubahan)}</div>`:""}${k.riwayat_perubahan?`<div class="history-box"><b>Riwayat:</b><br>${esc(k.riwayat_perubahan).replace(/\n/g,'<br>')}</div>`:""}` || `<span class="muted">-</span>`;
  let aksi = "";
  if(canManage()){
    if(st === "DIAJUKAN" || st === "PERUBAHAN_DIAJUKAN") aksi = `<button class="btn-mini btn-green" onclick="setujui('${esc(k.id_kegiatan)}')">Setujui</button><button class="btn-mini btn-orange" onclick="tolak('${esc(k.id_kegiatan)}')">Minta Perbaikan</button>`;
    else aksi = `<span class="muted">-</span>`;
  } else if(isReviewer()){
    aksi = `<span class="audit-pill">Read-only</span>`;
  } else if(locked){
    aksi = `<span class="status-done-pill">Selesai</span>`;
  } else if(!aksesBuka){
    aksi = `<span class="lock-badge">Akses perencanaan ditutup</span>`;
  } else {
    if(st === "DIAJUKAN" || st === "DITOLAK") aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','normal')">Edit</button><button class="btn-mini btn-red" onclick="hapusPerencanaan('${esc(k.id_kegiatan)}')">Hapus</button>`;
    else if(st === "DISETUJUI") aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','change')">Ajukan Perubahan</button>`;
    else aksi = `<span class="muted">Menunggu Verifikator</span>`;
  }
  const perubahan = toNumber(k.perubahan_ke) ? `<br><small class="muted">Perubahan Ke-${toNumber(k.perubahan_ke)}</small>` : "";
  const rowClass = locked ? "row-selesai" : (st === "DITOLAK" ? "row-perbaikan" : "row-proses");
  return `<tr class="rencana-row ${rowClass}"><td>${esc(k.id_kegiatan)}</td><td>${esc(bidangName(k.id_bidang))}</td><td><b>${esc(k.nama_kegiatan)}</b>${perubahan}</td><td>${esc(k.volume)}</td><td>${esc(k.satuan)}</td><td>${rupiah(k.harga_satuan)}</td><td><b>${rupiah(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)))}</b></td><td>${esc(k.metode_pemilihan || metodePemilihanByNilai(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan))))}</td><td>${esc(formatTanggalID(k.waktu_pemilihan || waktuPemilihanByNilai(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)))))}</td><td>${badge(st)}</td><td class="note-cell">${note}</td><td class="nowrap">${aksi}</td></tr>`;
}


function getFilteredDokumen(){
  let docs = dashboard.dokumen || [];
  if(canSeeAll() && filters.cairBidang !== "ALL") docs = docs.filter(d => String(d.id_bidang)===filters.cairBidang);
  if(filters.cairStatus !== "ALL") docs = docs.filter(d => String(d.status_verifikasi||"").toUpperCase()===filters.cairStatus);
  const q = filters.cairSearch.trim().toLowerCase();
  if(q) docs = docs.filter(d => kegiatanName(d.id_kegiatan).toLowerCase().includes(q));
  return docs;
}
function getRoleReportTitle(){
  return isAdmin() ? "ADMIN PBJ" : (isReviewer() ? roleLabel() : (currentUser?.nama_bidang || currentUser?.nama || "BIDANG"));
}

function formalReportText(v){
  return String(v == null ? "" : v)
    .replace(/ADA YANG DITOLAK/g, "PERLU PENYESUAIAN")
    .replace(/DITOLAK/g, "PERLU PERBAIKAN")
    .replace(/Ada yang ditolak/g, "Perlu Penyesuaian")
    .replace(/Ditolak/g, "Perlu Perbaikan")
    .replace(/ditolak/g, "perlu perbaikan");
}

function plainText(v){ return String(v == null ? "" : v).replace(/[<>&]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[s])); }
function htmlLink(url, label){
  if(!url) return "-";
  return `<a href="${esc(url)}" target="_blank">${plainText(label || "Buka File")}</a>`;
}
function formatTanggalCetak(date = new Date()){
  return new Intl.DateTimeFormat('id-ID', {
    weekday:'long', day:'2-digit', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone:'Asia/Jakarta', hour12:false
  }).format(date).replace(/\./g, ':') + ' WIB';
}
function openReportWindow(title, bodyHtml){
  const now = formatTanggalCetak();
  const w = window.open("", "_blank");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${plainText(title)}</title>
  <style>
    @page{size:A4 landscape;margin:12mm}
    *{box-sizing:border-box}
    body{font-family:Arial, Helvetica, sans-serif;color:#17263a;margin:0;background:#fff;font-size:10.5px;line-height:1.45}
    .report-page{width:100%}
    .kop{display:grid;grid-template-columns:58px 1fr auto;gap:14px;align-items:center;border-bottom:3px solid #0a3d70;padding-bottom:10px;margin-bottom:4px}
    .kop img{width:54px;height:54px;object-fit:contain}
    .kop h1{font-size:18px;line-height:1.2;margin:0;color:#0a3d70;text-transform:uppercase;letter-spacing:.2px}
    .kop .instansi{font-size:11px;font-weight:700;color:#26384f;margin-top:3px}
    .kop .meta{font-size:10px;color:#45566d;text-align:right;min-width:230px;line-height:1.5}
    .title-block{text-align:center;margin:12px 0 10px}
    .title-block h2{font-size:16px;text-transform:uppercase;margin:0;color:#0a3d70;text-decoration:underline}
    .title-block .sub{font-size:10.5px;color:#506176;margin-top:4px}
    .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:10px 0 12px}
    .card{border:1px solid #bdd4e8;border-radius:8px;padding:8px;background:#f7fbff;min-height:48px}
    .card span{display:block;font-size:8.5px;text-transform:uppercase;color:#53677e;font-weight:800;letter-spacing:.2px}
    .card b{display:block;font-size:12.5px;color:#0a3d70;margin-top:3px;line-height:1.25}
    h3{font-size:12.5px;margin:14px 0 6px;color:#0a3d70;text-transform:uppercase;border-left:4px solid #0a7bbf;padding-left:7px}
    .note{padding:7px 9px;background:#fff9eb;border:1px solid #f5d489;border-radius:7px;margin:8px 0;color:#594100;font-size:9.8px}
    table{width:100%;border-collapse:collapse;margin-top:5px;page-break-inside:auto}
    thead{display:table-header-group}
    tr{page-break-inside:avoid;page-break-after:auto}
    th{background:#eaf3fb;color:#0a315a;font-size:8.1px;text-transform:uppercase;letter-spacing:.15px;text-align:left;font-weight:800}
    th,td{border:1px solid #cdddea;padding:4.5px 5px;vertical-align:top}
    td{font-size:8.8px}
    tbody tr:nth-child(even) td{background:#fbfdff}
    a{color:#006bb6;text-decoration:underline;font-weight:700;word-break:break-all}
    .status{font-weight:800;color:#0a3d70}
    .red{color:#b91c1c;font-weight:800}
    .small{font-size:8px;color:#5c6e82}
    .signature{display:grid;grid-template-columns:1fr 280px;margin-top:20px;break-inside:avoid}
    .sign-box{text-align:center;font-size:10px;color:#1f2f45}
    .sign-space{height:54px}
    .btn-print{position:fixed;right:18px;top:18px;background:#0878bd;color:#fff;border:none;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.18)}

    td:nth-child(12),td:nth-child(13){line-height:1.35}
    .note b{color:#0a3d70}
    .report-page table{font-size:8.4px}
    .doc-report-item{padding:5px 0;border-bottom:1px dashed #cbd5e1}
    .doc-report-item:last-child{border-bottom:0}
    .doc-report-item b{color:#0a3d70}
    td:nth-child(7){line-height:1.35}
    .doc-report-item{padding:5px 0;border-bottom:1px dashed #cbd5e1}
    .doc-report-item:last-child{border-bottom:0}
    .doc-report-item b{color:#0a3d70}
    .report-page table{font-size:8.2px}
    @media print{.btn-print{display:none} a{color:#005ea8}.report-page{width:auto}}
  </style></head><body><button class="btn-print" onclick="window.print()">Cetak / Simpan PDF</button><div class="report-page">
  <div class="kop"><img src="logo-siporbo.png"><div><h1>SIMPROV</h1><div class="instansi">Sistem Informasi Monitoring Persiapan PORPROV</div><div class="small">Laporan Monitoring Persiapan PORPROV</div></div><div class="meta"><b>Tanggal Cetak</b><br>${plainText(now)}<br><b>Dicetak oleh</b><br>${plainText(getRoleReportTitle())}</div></div>
  <div class="title-block"><h2>${plainText(title)}</h2><div class="sub">Memuat rekap pagu, perencanaan, riwayat perubahan, dokumen pencairan, link dokumen, dan status verifikasi.</div></div>
  ${bodyHtml}
  
  <div class="signature"><div></div><div class="sign-box">Bogor, ${plainText(new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date()))}<br>Petugas/Pemeriksa,<div class="sign-space"></div>(........................................)</div></div>
  </div></body></html>`;
  w.document.open(); w.document.write(html); w.document.close();
}
function downloadDashboardPDF(){
  const userBidang = String(currentUser?.id_bidang || "");
  const semuaBidang = canSeeAll();
  const rekap = semuaBidang ? (dashboard.rekap || []) : (dashboard.rekap || []).filter(r => String(r.id_bidang) === userBidang);
  const perencanaan = semuaBidang ? (dashboard.perencanaan || []) : (dashboard.perencanaan || []).filter(k => String(k.id_bidang) === userBidang);
  const dokumen = semuaBidang ? (dashboard.dokumen || []) : (dashboard.dokumen || []).filter(d => String(d.id_bidang) === userBidang);
  const pagu = rekap.reduce((s,r)=>s+toNumber(r.pagu),0);
  const total = rekap.reduce((s,r)=>s+toNumber(r.total_perencanaan),0);
  const sisa = pagu - total;
  const valid = dokumen.filter(d=>isDocValidKeuanganV70(d)).length;
  const perluPersetujuan = perencanaan.filter(k => ["DIAJUKAN","PERUBAHAN_DIAJUKAN"].includes(String(k.status_perencanaan||"").toUpperCase())).length;
  const bidangOver = rekap.filter(r => toNumber(r.sisa_pagu) < 0).length;

  const rowsRekap = rekap.map((r,i)=>`<tr><td>${i+1}</td><td>${plainText(r.nama_bidang)}<br><span class="small">${plainText(r.id_bidang)}</span></td><td>${rupiah(r.pagu)}</td><td>${rupiah(r.total_perencanaan)}</td><td class="${toNumber(r.sisa_pagu)<0?'red':''}">${rupiah(r.sisa_pagu)}</td><td>${plainText(r.jumlah_kegiatan||0)}</td><td>${plainText(r.dokumen_upload||0)}</td><td>${plainText(r.dokumen_valid||0)}</td><td>${plainText(r.status_akses||'-')}</td><td class="status">${plainText(toNumber(r.sisa_pagu)<0?'MELEBIHI PAGU':displayStatusText(r.status_progress||'-'))}</td></tr>`).join("");

  const rowsPerencanaan = perencanaan.map((k,i)=>{
    const alasan = [k.alasan_penolakan ? `Catatan penyesuaian: ${k.alasan_penolakan}` : '', k.alasan_perubahan ? `Alasan perubahan: ${k.alasan_perubahan}` : '', k.riwayat_perubahan ? `Riwayat: ${k.riwayat_perubahan}` : ''].filter(Boolean).join('\n');
    return `<tr><td>${i+1}</td><td>${plainText(k.id_kegiatan)}</td><td>${plainText(bidangName(k.id_bidang))}</td><td>${plainText(k.nama_kegiatan)}</td><td>${plainText(k.keterangan||'-')}</td><td>${plainText(k.volume||0)} ${plainText(k.satuan||'')}</td><td>${rupiah(k.harga_satuan)}</td><td>${rupiah(k.jumlah)}</td><td>${plainText(k.metode_pemilihan || metodePemilihanByNilai(k.jumlah))}</td><td>${plainText(formatTanggalID(k.waktu_pemilihan || waktuPemilihanByNilai(k.jumlah)))}</td><td class="status">${plainText(displayStatusText(k.status_perencanaan||'-'))}</td><td>${plainText(formalReportText(alasan||'-')).replace(/\n/g,'<br>')}</td><td>${plainText(displayStatusText(k.status_pencairan||'-'))}</td></tr>`;
  }).join("");

  const rowsDokumen = dokumen.map((d,i)=>`<tr><td>${i+1}</td><td>${plainText(bidangName(d.id_bidang))}</td><td>${plainText(kegiatanName(d.id_kegiatan))}<br><span class="small">${plainText(d.id_kegiatan)}</span></td><td>${plainText(normalizeJenisDokumenLabel(d.jenis_dokumen))}</td><td>${plainText(d.nama_file||'-')}</td><td>${htmlLink(d.url_file, 'Buka File')}</td><td class="status">${plainText(displayStatusText(d.status_verifikasi||'MENUNGGU'))}</td><td>${plainText(displayStatusText(getPencairanStatus(d.id_kegiatan)))}</td><td>${plainText(d.catatan_Verifikator||'-')}</td><td>${plainText(formatTanggalJam(d.tanggal_upload))}</td></tr>`).join("");

  const body = `<div class="summary"><div class="card"><span>Total Pagu</span><b>${rupiah(pagu)}</b></div><div class="card"><span>Total Perencanaan</span><b>${rupiah(total)}</b></div><div class="card"><span>Sisa Pagu</span><b class="${sisa<0?'red':''}">${rupiah(sisa)}</b></div><div class="card"><span>Dokumen Valid</span><b>${valid}/${dokumen.length}</b></div><div class="card"><span>Perlu Pemeriksaan</span><b>${perluPersetujuan} rencana / ${bidangOver} pagu minus</b></div></div>
  <h3>1. Rekapitulasi Anggaran per Bidang</h3><table><thead><tr><th>No</th><th>Bidang</th><th>Pagu</th><th>Perencanaan</th><th>Sisa</th><th>Kegiatan</th><th>Dok Upload</th><th>Dok Valid</th><th>Akses</th><th>Progress</th></tr></thead><tbody>${rowsRekap || `<tr><td colspan="10">Belum ada data</td></tr>`}</tbody></table>
  <h3>2. Rekap Data Perencanaan dan Riwayat Perubahan</h3><table><thead><tr><th>No</th><th>ID Kegiatan</th><th>Bidang</th><th>Nama Kegiatan</th><th>Keterangan</th><th>Volume</th><th>Harga Satuan</th><th>Jumlah</th><th>Metode</th><th>Waktu Pemilihan</th><th>Status</th><th>Alasan/Riwayat</th><th>Status Pencairan</th></tr></thead><tbody>${rowsPerencanaan || `<tr><td colspan="13">Belum ada data perencanaan</td></tr>`}</tbody></table>
  <h3>3. Rekap Dokumen Pencairan dan Link File</h3><table><thead><tr><th>No</th><th>Bidang</th><th>Kegiatan</th><th>Jenis Dokumen</th><th>Nama File</th><th>Link File</th><th>Status Dokumen</th><th>Status Pencairan</th><th>Catatan Admin</th><th>Tanggal Upload</th></tr></thead><tbody>${rowsDokumen || `<tr><td colspan="10">Belum ada dokumen pencairan</td></tr>`}</tbody></table>`;
  openReportWindow(semuaBidang ? "Laporan Monitoring Keseluruhan SIMPROV" : "Laporan Monitoring Bidang " + (currentUser?.nama_bidang || currentUser?.nama || ""), body);
}
function downloadPerencanaanPDF(){
  const data = getFilteredRencana();
  const rows = data.map(k=>`<tr><td>${plainText(k.id_kegiatan)}</td><td>${plainText(bidangName(k.id_bidang))}</td><td>${plainText(k.nama_kegiatan)}</td><td>${plainText(k.keterangan||"-")}</td><td>${plainText(k.volume||0)}</td><td>${plainText(k.satuan||"-")}</td><td>${rupiah(k.harga_satuan)}</td><td>${rupiah(k.jumlah)}</td><td>${plainText(displayStatusText(k.status_perencanaan||"-"))}</td><td>${plainText((k.alasan_penolakan||k.alasan_perubahan||k.riwayat_perubahan||"-")).replace(/\n/g,"<br>")}</td><td>${plainText(displayStatusText(k.status_pencairan||"-"))}</td></tr>`).join("");
  openReportWindow("Rekap Perencanaan", `<div class="note">Laporan mengikuti filter yang sedang tampil pada aplikasi.</div><table><thead><tr><th>ID</th><th>Bidang</th><th>Nama Kegiatan</th><th>Keterangan</th><th>Vol</th><th>Satuan</th><th>Harga</th><th>Jumlah</th><th>Metode</th><th>Waktu Pemilihan</th><th>Status</th><th>Alasan / Riwayat</th><th>Status Pencairan</th></tr></thead><tbody>${rows || `<tr><td colspan="13">Belum ada data</td></tr>`}</tbody></table>`);
}
function downloadPencairanPDF(){
  const docs = getFilteredDokumen();
  const rows = docs.map(d=>`<tr><td>${plainText(bidangName(d.id_bidang))}</td><td>${plainText(kegiatanName(d.id_kegiatan))}<br><small>${plainText(d.id_kegiatan)}</small></td><td>${plainText(normalizeJenisDokumenLabel(d.jenis_dokumen))}</td><td>${plainText(d.nama_file||"-")}</td><td>${htmlLink(d.url_file, "Buka File")}</td><td>${plainText(displayStatusText(d.status_verifikasi||"MENUNGGU"))}</td><td>${plainText(displayStatusText(getPencairanStatus(d.id_kegiatan)))}</td><td>${plainText(d.catatan_Verifikator||"-")}</td><td>${plainText(formatTanggalJam(d.tanggal_upload))}</td></tr>`).join("");
  openReportWindow("Rekap Dokumen & Pencairan", `<div class="note">Laporan ini menampilkan link dokumen yang sudah diupload bidang. Klik “Buka File” untuk membuka dokumen dari Google Drive.</div><table><thead><tr><th>Bidang</th><th>Kegiatan</th><th>Jenis Dokumen</th><th>Nama File</th><th>Link File</th><th>Status Dokumen</th><th>Status Pencairan</th><th>Catatan Admin</th><th>Tanggal Upload</th></tr></thead><tbody>${rows || `<tr><td colspan="9">Belum ada dokumen</td></tr>`}</tbody></table>`);
}
function downloadStrukturPDF(){
  if(canSeeAll()) return downloadDashboardPDF();
  const r = dashboard.rekap.find(x=>String(x.id_bidang)===String(currentUser.id_bidang)) || {};
  openReportWindow("Ringkasan Bidang", `<div class="summary"><div class="card"><span>Bidang</span><b>${plainText(r.nama_bidang||"-")}</b></div><div class="card"><span>Pagu</span><b>${rupiah(r.pagu)}</b></div><div class="card"><span>Total Perencanaan</span><b>${rupiah(r.total_perencanaan)}</b></div><div class="card"><span>Sisa Pagu</span><b>${rupiah(r.sisa_pagu)}</b></div></div><table><thead><tr><th>Kegiatan</th><th>Dokumen Upload</th><th>Dokumen Valid</th><th>Status Akses</th><th>Progress</th></tr></thead><tbody><tr><td>${plainText(r.jumlah_kegiatan||0)}</td><td>${plainText(r.dokumen_upload||0)}</td><td>${plainText(r.dokumen_valid||0)}</td><td>${plainText(r.status_akses||"-")}</td><td>${plainText(displayStatusText(r.status_progress||"-"))}</td></tr></tbody></table>`);
}


function filterBarPencairan(){
  return `<div class="filter-card"><div class="toolbar">${canSeeAll()?`<div class="field small"><label>Filter Bidang</label><select onchange="filters.cairBidang=this.value;pencairanPage=1;renderPencairan()">${bidangOptions(filters.cairBidang,true)}</select></div>`:""}<div class="field small"><label>Filter Status Dokumen</label><select onchange="filters.cairStatus=this.value;pencairanPage=1;renderPencairan()"><option value="ALL">Semua Status</option>${["MENUNGGU","VALID","PERLU PERBAIKAN","PERBAIKAN"].map(s=>`<option value="${s}" ${filters.cairStatus===s?'selected':''}>${s}</option>`).join("")}</select></div><div class="field"><label>Search Nama Kegiatan</label><input value="${esc(filters.cairSearch)}" placeholder="Cari nama kegiatan..." oninput="filters.cairSearch=this.value;pencairanPage=1;renderPencairan()"></div><button class="btn-refresh" onclick="refreshData()">Refresh</button></div></div>`;
}
function renderPencairan(){
  let html = "";
  if(!canSeeAll()){
    const approved = dashboard.perencanaan.filter(k => String(k.status_perencanaan||"").toUpperCase()==="DISETUJUI");
    html += `<section class="panel fade-up premium-panel collapsible-panel"><div class="panel-head"><div><h3>Upload Dokumen Pencairan</h3><p class="panel-sub">Satu kegiatan bisa upload lebih dari satu dokumen. Tambah baris file jika dokumennya lebih dari satu.</p></div>${collapseButton('uploadPencairan')}</div><div class="collapse-body ${collapseState.uploadPencairan?'hidden':''}"><div class="form-grid"><div class="field"><label>Pilih Kegiatan</label><select id="dokKegiatan" onchange="updateSaranDokumen()">${approved.map(k=>`<option value="${esc(k.id_kegiatan)}">${esc(k.nama_kegiatan)} - ${esc(k.metode_pemilihan || metodePemilihanByNilai(k.jumlah))}</option>`).join("")}</select><div id="saranDokumen" class="auto-doc-note-wrap"></div></div></div><div id="uploadRows"><div class="doc-upload-row"><div class="field"><label>Jenis Dokumen</label><select class="jenisDok">${docOptionsHtml("", approved[0]?.id_kegiatan || "")}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileDok"></div><button class="btn-red" onclick="removeUploadRow(this)" type="button">Hapus</button></div></div><button class="btn-soft" onclick="addUploadRow()" type="button">+ Tambah File Dokumen</button> <button onclick="uploadDokumen()">Upload Semua Dokumen</button><div id="uploadMsg" class="msg">${approved.length?"":"Belum ada kegiatan yang DISETUJUI Verifikator."}</div></div></section>`;
  }
  let docs = getFilteredDokumen();
  const pageData = docs.slice((pencairanPage-1)*perPage, pencairanPage*perPage);
  const rows = pageData.map(d=>renderDokumenRow(d)).join("");
  html += `<section class="panel fade-up"><h3>Data Dokumen & Pencairan</h3><p class="panel-sub">${isAdmin()?"Admin memverifikasi dokumen dan memperbarui status pencairan.":(isReviewer()?"Role pemeriksa dapat melihat seluruh dokumen, status verifikasi, status pencairan, dan catatan Verifikator secara read-only.":"Daftar dokumen yang sudah diupload.")}</p>${filterBarPencairan()}<div class="table-hint">Geser tabel ke samping untuk melihat kolom lainnya.</div><div class="table-wrap"><table><thead><tr><th>Bidang</th><th>Kegiatan</th><th>Jenis Dokumen</th><th>File</th><th>Status Dokumen</th><th>Status Pencairan</th><th>Tanggal Upload</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>${rows || `<tr><td colspan="9" class="empty">Belum ada dokumen</td></tr>`}</tbody></table></div>${pager(docs.length, pencairanPage, 'goPencairanPage')}</section>`;
  document.getElementById("contentArea").innerHTML = html;
  if(!canSeeAll()) setTimeout(updateSaranDokumen, 0);
}
function renderDokumenRow(d){
  const st = String(d.status_verifikasi || 'MENUNGGU').toUpperCase();
  let aksi = `<span class="muted">-</span>`;
  if(canManage()){
    aksi = `<button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button>` +
           `<button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button>`;
  } else if(isReviewer()){
    aksi = `<span class="audit-pill">Read-only</span>`;
  } else if(st === 'PERBAIKAN' || st === 'DITOLAK'){
    aksi = `<div class="revision-box per-file-revision">
      <div class="revision-title">Upload Ulang</div>
      <input type="file" id="revisi_${esc(d.id_dokumen)}">
      <button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button>
    </div>`;
  }
  return `<tr><td>${esc(bidangName(d.id_bidang))}</td><td>${esc(kegiatanName(d.id_kegiatan))}</td><td>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen))}</td><td>${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file||'Buka file')}</a>`:esc(d.nama_file)}</td><td>${badge(d.status_verifikasi || 'MENUNGGU')}</td><td>${badge(getPencairanStatus(d.id_kegiatan))}</td><td><span class="upload-time">${esc(formatTanggalJam(d.tanggal_upload))}</span></td><td class="note-cell">${esc(d.catatan_Verifikator||'-')}</td><td>${aksi}</td></tr>`;
}
function addUploadRow(){
  const wrap = document.getElementById("uploadRows");
  const div = document.createElement("div");
  div.className = "doc-upload-row";
  div.innerHTML = `<div class="field"><label>Jenis Dokumen</label><select class="jenisDok">${docOptionsHtml("", document.getElementById("dokKegiatan")?.value || "")}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileDok"></div><button class="btn-red" onclick="removeUploadRow(this)" type="button">Hapus</button>`;
  wrap.appendChild(div);
}
function removeUploadRow(btn){ const rows = document.querySelectorAll(".doc-upload-row"); if(rows.length <= 1) return; btn.closest(".doc-upload-row").remove(); }
async function updateBidang(id){
  showLoading("Menyimpan bidang...");
  try{
    const r = await apiPost({action:"updateBidang", user:currentUser, id_bidang:id, pagu:toNumber(document.getElementById(`pagu_${id}`).value), status_akses:document.getElementById(`akses_${id}`).value});
    alert(r.message);
    if(r.success){ VerifikatorEditRows[id] = false; await loadDashboard(false); }
  }catch(e){alert(e.message)}finally{hideLoading();}
}
async function savePerencanaan(){
  if(!aksesPerencanaanTerbuka()){ alert("Akses perencanaan bidang sedang ditutup Verifikator. Menu pencairan tetap bisa digunakan."); return; }
  showLoading("Mengajukan perencanaan...");
  const data = {nama_kegiatan:document.getElementById("namaKegiatan").value, rincian_kebutuhan:"", keterangan:document.getElementById("keterangan").value, volume:toNumber(document.getElementById("volume").value), satuan:document.getElementById("satuan").value, harga_satuan:toNumber(document.getElementById("harga").value), metode_pemilihan:document.getElementById("metodePemilihan")?.value || "", waktu_pemilihan:document.getElementById("waktuPemilihan")?.value || ""};
  if(!data.waktu_pemilihan){ hideLoading(); alert("Waktu pemilihan wajib diisi."); return; }
  const jumlah = toNumber(data.volume) * toNumber(data.harga_satuan);
  const cek = cekPaguFrontend(jumlah, "");
  if(!cek.ok){ hideLoading(); alert(cek.message); return; }
  try{ const r = await apiPost({action:"savePerencanaan", user:currentUser, data}); document.getElementById("saveMsg").innerText = r.message; if(!r.success) alert(r.message); if(r.success) await loadDashboard(false); }catch(e){ console.error(e); alert("Gagal menyimpan / memuat ulang data. Detail: " + String(e.message || e).slice(0, 300)); }finally{hideLoading();}
}
function openEditModal(id, mode){
  const k = dashboard.perencanaan.find(x => String(x.id_kegiatan)===String(id)); if(!k) return;
  if(isKegiatanLocked(k)){ alert("Kegiatan sudah selesai sampai validasi pencairan, perencanaan terkunci."); return; }
  if(!aksesPerencanaanTerbuka()){ alert("Akses perencanaan bidang sedang ditutup Verifikator. Menu pencairan tetap bisa digunakan."); return; }
  document.getElementById("editMode").value = mode; document.getElementById("editIdKegiatan").value = k.id_kegiatan;
  document.getElementById("editNamaKegiatan").value = k.nama_kegiatan || ""; document.getElementById("editKeterangan").value = k.keterangan || ""; document.getElementById("editVolume").value = angkaID(k.volume); document.getElementById("editSatuan").value = k.satuan || ""; document.getElementById("editHarga").value = angkaID(k.harga_satuan); if(document.getElementById("editWaktuPemilihan")) document.getElementById("editWaktuPemilihan").value = /^\d{4}-\d{2}-\d{2}$/.test(String(k.waktu_pemilihan||"")) ? k.waktu_pemilihan : ""; document.getElementById("editAlasanPerubahan").value = "";
  document.getElementById("editModalTitle").innerText = mode === "change" ? `Ajukan Perubahan Perencanaan` : "Edit Perencanaan";
  document.getElementById("editModalSub").innerText = mode === "change" ? `Perubahan akan masuk sebagai Perubahan Ke-${toNumber(k.perubahan_ke)+1} dan menunggu Verifikator.` : "Data akan diajukan kembali ke Verifikator.";
  document.getElementById("alasanPerubahanWrap").classList.toggle("hidden", mode !== "change");
  setAutoTotal("editVolume","editHarga","editTotalPreview");
  document.getElementById("editModal").classList.remove("hidden");
}
function closeEditModal(){ document.getElementById("editModal").classList.add("hidden"); }
async function submitEditPerencanaan(){
  showLoading("Menyimpan perubahan...");
  const mode = document.getElementById("editMode").value;
  const data = {id_kegiatan:document.getElementById("editIdKegiatan").value, mode, nama_kegiatan:document.getElementById("editNamaKegiatan").value, rincian_kebutuhan:"", keterangan:document.getElementById("editKeterangan").value, volume:toNumber(document.getElementById("editVolume").value), satuan:document.getElementById("editSatuan").value, harga_satuan:toNumber(document.getElementById("editHarga").value), alasan_perubahan:document.getElementById("editAlasanPerubahan").value};
  const jumlah = toNumber(data.volume) * toNumber(data.harga_satuan);
  const cek = cekPaguFrontend(jumlah, data.id_kegiatan);
  if(!cek.ok){ hideLoading(); alert(cek.message); return; }
  try{ const r = await apiPost({action:"updatePerencanaan", user:currentUser, data}); alert(r.message); if(r.success){ closeEditModal(); await loadDashboard(false); } }catch(e){alert(e.message)}finally{hideLoading();}
}
async function hapusPerencanaan(id){ const k=dashboard.perencanaan.find(x=>String(x.id_kegiatan)===String(id)); if(k && isKegiatanLocked(k)){ alert("Kegiatan sudah terkunci karena dokumen pencairan sudah divalidasi."); return; } if(!aksesPerencanaanTerbuka()){ alert("Akses perencanaan bidang sedang ditutup Verifikator."); return; } if(!confirm("Hapus perencanaan ini?")) return; showLoading("Menghapus..."); try{ const r = await apiPost({action:"deletePerencanaan", user:currentUser, id_kegiatan:id}); alert(r.message); if(r.success) await loadDashboard(false); }catch(e){alert(e.message)}finally{hideLoading();} }
async function setujui(id){ showLoading("Menyetujui..."); try{ const r = await apiPost({action:"setujuiPerencanaan", user:currentUser, id_kegiatan:id}); alert(r.message); if(r.success) await loadDashboard(false); }catch(e){alert(e.message)}finally{hideLoading();} }
async function tolak(id){ const catatan = prompt("Alasan penolakan wajib diisi:"); if(!catatan) return; showLoading("Menolak..."); try{ const r = await apiPost({action:"tolakPerencanaan", user:currentUser, id_kegiatan:id, catatan}); alert(r.message); if(r.success) await loadDashboard(false); }catch(e){alert(e.message)}finally{hideLoading();} }
function fileToBase64(file){ return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result).split(',')[1]); reader.onerror=reject; reader.readAsDataURL(file); }); }
async function uploadDokumen(){
  const idKegiatan = document.getElementById("dokKegiatan")?.value; if(!idKegiatan){ alert("Pilih kegiatan dulu."); return; }
  const rows = [...document.querySelectorAll(".doc-upload-row")];
  const items = rows.map(row => ({jenis:row.querySelector(".jenisDok").value, file:row.querySelector(".fileDok").files[0]})).filter(x=>x.file);
  if(!items.length){ alert("Pilih minimal 1 file dokumen."); return; }
  showLoading(`Upload 1/${items.length} dokumen...`);
  try{
    for(let i=0;i<items.length;i++){
      document.getElementById("loadingText").innerText = `Upload ${i+1}/${items.length} dokumen...`;
      const base64 = await fileToBase64(items[i].file);
      const r = await apiPost({action:"uploadDokumen", user:currentUser, id_kegiatan:idKegiatan, jenis_dokumen:items[i].jenis, file_name:items[i].file.name, mime_type:items[i].file.type, file_base64:base64});
      if(!r.success) throw new Error(r.message);
    }
    alert("Dokumen berhasil diupload."); await loadDashboard(false);
  }catch(e){ alert(e.message || "Gagal upload dokumen."); }
  finally{ hideLoading(); }
}
async function verifDok(id, status){
  showLoading("Verifikasi dokumen...");
  try{
    const r=await apiPost({action:"verifyDokumen", user:currentUser, id_dokumen:id, status_verifikasi:status, catatan_Verifikator:""});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}
async function mintaPerbaikanDok(id){
  const catatan = prompt("Alasan perbaikan dokumen wajib diisi:");
  if(!catatan) return;
  showLoading("Mengirim status perbaikan...");
  try{
    const r=await apiPost({action:"verifyDokumen", user:currentUser, id_dokumen:id, status_verifikasi:"PERBAIKAN", catatan_Verifikator:catatan});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}
async function revisiDokumen(idDokumen){
  const input = document.getElementById(`revisi_${idDokumen}`);
  const file = input?.files?.[0];
  if(!file){ alert("Pilih file pengganti terlebih dahulu."); return; }
  showLoading("Upload ulang file dokumen...");
  try{
    const base64 = await fileToBase64(file);
    const r = await apiPost({action:"revisiDokumen", user:currentUser, id_dokumen:idDokumen, file_name:file.name, mime_type:file.type, file_base64:base64});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){ alert(e.message || "Gagal upload ulang file dokumen."); }
  finally{ hideLoading(); }
}
async function updateCair(id, status){
  // fungsi lama dibiarkan untuk kompatibilitas, tapi tombolnya sudah tidak ditampilkan
  const cat = prompt("Catatan status pencairan (opsional):") || "";
  showLoading("Update pencairan...");
  try{ const r=await apiPost({action:"updateStatusPencairan", user:currentUser, id_kegiatan:id, status_pencairan:status, catatan_Verifikator:cat}); alert(r.message); if(r.success) await loadDashboard(false); }catch(e){alert(e.message)}finally{hideLoading();}
}
function logout(){ localStorage.removeItem("siporbo_user"); currentUser=null; dashboard=null; document.getElementById("appPage").classList.add("hidden"); document.getElementById("loginPage").classList.remove("hidden"); }
window.onload = async function(){ const saved = localStorage.getItem("siporbo_user"); if(saved){ currentUser=JSON.parse(saved); activeMenu=isAdmin()?"Dashboard Monitoring":"Struktur Anggaran"; document.getElementById("loginPage").classList.add("hidden"); document.getElementById("appPage").classList.remove("hidden"); await loadDashboard(true); } };

/* =========================
   SIPORBO v11 behavior overrides
   ========================= */
function isPencairanComplete(idKegiatan){
  const st = String(getPencairanStatus(idKegiatan) || "").toUpperCase();
  if(["DOKUMEN LENGKAP","SIAP DICAIRKAN","SUDAH DICAIRKAN"].includes(st)) return true;
  const docs = (dashboard?.dokumen || []).filter(d => String(d.id_kegiatan) === String(idKegiatan));
  return docs.length > 0 && docs.every(d => String(d.status_verifikasi || "").toUpperCase() === "VALID");
}
function isKegiatanLocked(k){ return isPencairanComplete(k.id_kegiatan); }
function getApprovedOpenKegiatan(){
  return (dashboard?.perencanaan || []).filter(k =>
    String(k.status_perencanaan || "").toUpperCase() === "DISETUJUI" && !isPencairanComplete(k.id_kegiatan)
  );
}
function groupedDocs(){
  const docs = dashboard?.dokumen || [];
  const groups = {};
  docs.forEach(d => {
    const key = String(d.id_kegiatan || "");
    if(!groups[key]){
      const keg = (dashboard?.perencanaan || []).find(k => String(k.id_kegiatan) === key) || {};
      groups[key] = {id_kegiatan:key, id_bidang:d.id_bidang || keg.id_bidang, kegiatan:keg, docs:[]};
    }
    groups[key].docs.push(d);
  });
  return Object.values(groups);
}
function groupDocStatus(g){
  const docs = g.docs || [];
  if(!docs.length) return "BELUM ADA DOKUMEN";
  if(docs.some(d => ["PERBAIKAN","DITOLAK"].includes(String(d.status_verifikasi||"").toUpperCase()))) return "PERBAIKAN";
  if(docs.every(d => String(d.status_verifikasi||"").toUpperCase() === "VALID")) return "VALID";
  return "MENUNGGU";
}
function filterBarPencairan(){
  return `<div class="filter-card"><div class="toolbar">${canSeeAll()?`<div class="field small"><label>Filter Bidang</label><select onchange="filters.cairBidang=this.value;pencairanPage=1;renderPencairan()">${bidangOptions(filters.cairBidang,true)}</select></div>`:""}<div class="field small"><label>Filter Status Dokumen</label><select onchange="filters.cairStatus=this.value;pencairanPage=1;renderPencairan()"><option value="ALL">Semua Status</option>${["MENUNGGU","VALID","PERBAIKAN"].map(s=>`<option value="${s}" ${filters.cairStatus===s?'selected':''}>${s}</option>`).join("")}</select></div><div class="field"><label>Search Nama Kegiatan</label><input value="${esc(filters.cairSearch)}" placeholder="Cari nama kegiatan..." oninput="filters.cairSearch=this.value;pencairanPage=1;renderPencairan()"></div><button class="btn-refresh" onclick="refreshData()">Refresh</button></div></div>`;
}
function renderPencairan(){
  let html = "";
  if(!canSeeAll()){
    const approved = getApprovedOpenKegiatan();
    html += `<section class="panel fade-up premium-panel collapsible-panel"><div class="panel-head"><div><h3>Upload Dokumen Pencairan</h3><p class="panel-sub">Satu kegiatan bisa upload lebih dari satu dokumen. Jenis dokumen sudah disesuaikan dengan SOP pengadaan melalui penyedia.</p></div>${collapseButton('uploadPencairan')}</div><div class="collapse-body ${collapseState.uploadPencairan?'hidden':''}"><div class="form-grid"><div class="field"><label>Pilih Kegiatan</label><select id="dokKegiatan" onchange="updateSaranDokumen()">${approved.map(k=>`<option value="${esc(k.id_kegiatan)}">${esc(k.nama_kegiatan)} - ${esc(k.metode_pemilihan || metodePemilihanByNilai(k.jumlah))}</option>`).join("")}</select><div id="saranDokumen" class="auto-doc-note-wrap"></div></div></div><div id="uploadRows"><div class="doc-upload-row"><div class="field"><label>Jenis Dokumen</label><select class="jenisDok">${docOptionsHtml("", approved[0]?.id_kegiatan || "")}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileDok"></div><button class="btn-red" onclick="removeUploadRow(this)" type="button">Hapus</button></div></div><button class="btn-soft" onclick="addUploadRow()" type="button">+ Tambah File Dokumen</button> <button onclick="uploadDokumen()">Upload Semua Dokumen</button><div id="uploadMsg" class="msg">${approved.length?"":"Tidak ada kegiatan yang bisa diupload. Kegiatan harus DISETUJUI dan belum selesai validasi pencairan."}</div></div></section>`;
  }

  let groups = groupedDocs();
  if(canSeeAll() && filters.cairBidang !== "ALL") groups = groups.filter(g => String(g.id_bidang)===filters.cairBidang);
  if(filters.cairStatus !== "ALL") groups = groups.filter(g => groupDocStatus(g) === filters.cairStatus);
  const q = filters.cairSearch.trim().toLowerCase();
  if(q) groups = groups.filter(g => kegiatanName(g.id_kegiatan).toLowerCase().includes(q));
  const pageData = groups.slice((pencairanPage-1)*perPage, pencairanPage*perPage);
  const rows = pageData.map(g=>renderDokumenGroupRow(g)).join("");
  html += `<section class="panel fade-up"><h3>Data Dokumen & Pencairan</h3><p class="panel-sub">${isAdmin()?"Rekap dokumen digabung per kegiatan agar validasi lebih gampang. Kalau dokumen masih kurang, klik Perbaikan dan isi alasan.":"Rekap dokumen digabung per kegiatan agar lebih jelas."}</p>${filterBarPencairan()}<div class="table-wrap grouped"><table class="group-table"><thead><tr><th>Rekap Kegiatan</th></tr></thead><tbody>${rows || `<tr><td class="empty">Belum ada dokumen</td></tr>`}</tbody></table></div>${pager(groups.length, pencairanPage, 'goPencairanPage')}</section>`;
  document.getElementById("contentArea").innerHTML = html;
}
function effectivePencairanStatusV68(g){
  const stored = String(getPencairanStatus(g.id_kegiatan) || '').toUpperCase();
  const docs = g?.docs || [];
  if(stored === 'SELESAI') return 'SELESAI';
  if(!docs.length) return 'MENUNGGU DOKUMEN PENCAIRAN';
  if(docs.some(isDocRepairV64)) return 'PERBAIKAN DOKUMEN';
  if(docs.every(isDocValidV64)) return 'MENUNGGU FINALISASI';
  if(docs.some(d => statusTextNormV64(d.status_verifikasi).includes('VERIFIKASI PERBAIKAN'))) return 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
  return 'MENUNGGU VERIFIKASI DOKUMEN';
}
function renderDokumenGroupRow(g){
  const stGroup = groupDocStatus(g);
  const stCair = effectivePencairanStatusV68(g);
  const isCollapsed = docGroupCollapse[g.id_kegiatan] === undefined ? true : !!docGroupCollapse[g.id_kegiatan];
  const docsHtml = (g.docs || []).map(d => {
    const st = String(d.status_verifikasi || 'MENUNGGU').toUpperCase();
    let rev = "";
    if(!isAdmin() && (st === 'PERBAIKAN' || st === 'DITOLAK')){
      rev = `<div class="doc-action-box"><input type="file" id="revisi_${esc(d.id_dokumen)}"><button class="btn-mini" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Upload Revisi</button></div>`;
    }
    return `<div class="doc-item"><div><b>${esc(d.jenis_dokumen || '-')}</b><br><small class="muted">${esc(d.nama_file || '-')}</small></div><div>${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file || '-')}</div><div>${badge(d.status_verifikasi || 'MENUNGGU')}</div><div>${d.catatan_Verifikator?`<div class="group-reason"><b>Catatan:</b> ${esc(d.catatan_Verifikator)}</div>`:rev || `<span class="muted">-</span>`}</div></div>`;
  }).join("");
  let actions = `<span class="muted">-</span>`;
  if(isAdmin()){
    actions = `<div class="group-actions"><button class="btn-mini btn-green btn-wide" onclick="validKegiatanDokumen('${esc(g.id_kegiatan)}')">Valid</button><button class="btn-mini btn-orange btn-wide" onclick="perbaikanKegiatanDokumen('${esc(g.id_kegiatan)}')">Perbaikan</button></div>`;
  }
  return `<tr><td class="doc-group-card"><div class="doc-group-head doc-group-head-v12"><div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div><div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div><div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div><div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div><div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed ? 'Lihat Rincian' : 'Minimize'}</button></div></div><div class="doc-list ${isCollapsed ? 'hidden' : ''}">${docsHtml}</div><div class="doc-group-head doc-group-foot-v12" style="border-top:1px solid #e8f1f7;border-bottom:0"><div class="group-reason"><b>Rekap:</b> ${(g.docs||[]).length} file dokumen. ${isCollapsed ? 'Klik Lihat Rincian untuk membuka daftar file.' : 'Rincian file sedang ditampilkan.'}</div><div></div><div></div><div></div>${actions}</div></td></tr>`;
}
function toggleDocGroup(id){ docGroupCollapse[id] = !(docGroupCollapse[id] === undefined ? true : docGroupCollapse[id]); renderPencairan(); }
async function validKegiatanDokumen(idKegiatan){
  const docs = (dashboard?.dokumen || []).filter(d => String(d.id_kegiatan) === String(idKegiatan));
  if(!docs.length){ alert('Belum ada dokumen untuk kegiatan ini.'); return; }
  showLoading('Memvalidasi dokumen kegiatan...');
  try{
    for(const d of docs){
      if(String(d.status_verifikasi || '').toUpperCase() !== 'VALID'){
        const r = await apiPost({action:'verifyDokumen', user:currentUser, id_dokumen:d.id_dokumen, status_verifikasi:'VALID', catatan_Verifikator:''});
        if(!r.success) throw new Error(r.message);
      }
    }
    alert('Dokumen kegiatan sudah dinyatakan valid.');
    await loadDashboard(false);
  }catch(e){ alert(e.message || 'Gagal validasi dokumen.'); }
  finally{ hideLoading(); }
}
async function perbaikanKegiatanDokumen(idKegiatan){
  const catatan = prompt('Alasan perbaikan dokumen wajib diisi:');
  if(!catatan) return;
  const docs = (dashboard?.dokumen || []).filter(d => String(d.id_kegiatan) === String(idKegiatan));
  if(!docs.length){ alert('Belum ada dokumen untuk kegiatan ini.'); return; }
  showLoading('Mengirim status perbaikan kegiatan...');
  try{
    for(const d of docs){
      const r = await apiPost({action:'verifyDokumen', user:currentUser, id_dokumen:d.id_dokumen, status_verifikasi:'PERBAIKAN', catatan_Verifikator:catatan});
      if(!r.success) throw new Error(r.message);
    }
    alert('Status perbaikan sudah dikirim ke bidang.');
    await loadDashboard(false);
  }catch(e){ alert(e.message || 'Gagal mengirim perbaikan.'); }
  finally{ hideLoading(); }
}
function addUploadRow(){
  const wrap = document.getElementById("uploadRows");
  const div = document.createElement("div");
  div.className = "doc-upload-row";
  div.innerHTML = `<div class="field"><label>Jenis Dokumen</label><select class="jenisDok">${docOptionsHtml("", document.getElementById("dokKegiatan")?.value || "")}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileDok"></div><button class="btn-red" onclick="removeUploadRow(this)" type="button">Hapus</button>`;
  wrap.appendChild(div);
}


/* =========================
   SIMPROV v38 final overrides
   - Dokumen yang sudah pernah diupload tidak muncul lagi di dropdown upload awal.
   - Kegiatan yang seluruh dokumen wajibnya sudah diupload tidak muncul lagi di dropdown Pilih Kegiatan.
   - Upload ulang muncul per file yang statusnya PERBAIKAN/DITOLAK.
   - Admin dapat validasi/perbaikan per file di rincian kegiatan.
   ========================= */
function docTypeKey(v){
  return normalizeJenisDokumenLabel(String(v || ""))
    .toUpperCase()
    .replace(/\s+/g," ")
    .trim();
}
function requiredDocTypesForKegiatan(k){
  if(!k) return JENIS_DOKUMEN_SOP;
  return dokumenKetentuanByNilai(k.jumlah || (toNumber(k.volume) * toNumber(k.harga_satuan)));
}
function uploadedDocTypesForKegiatan(idKegiatan){
  return new Set((dashboard?.dokumen || [])
    .filter(d => String(d.id_kegiatan) === String(idKegiatan))
    .map(d => docTypeKey(d.jenis_dokumen)));
}
function remainingDocTypesForKegiatan(idKegiatan){
  const k = kegiatanById(idKegiatan);
  const required = requiredDocTypesForKegiatan(k);
  const uploaded = uploadedDocTypesForKegiatan(idKegiatan);
  return required.filter(x => !uploaded.has(docTypeKey(x)));
}
function kegiatanButuhUploadAwal(k){
  if(!k) return false;
  if(String(k.status_perencanaan || "").toUpperCase() !== "DISETUJUI") return false;
  if(isPencairanComplete(k.id_kegiatan)) return false;
  return remainingDocTypesForKegiatan(k.id_kegiatan).length > 0;
}
function getApprovedOpenKegiatan(){
  return (dashboard?.perencanaan || []).filter(k => kegiatanButuhUploadAwal(k));
}
function docOptionsHtml(selected="", idKegiatan=""){
  let list = idKegiatan ? remainingDocTypesForKegiatan(idKegiatan) : JENIS_DOKUMEN_SOP;
  if(selected && !list.some(x => docTypeKey(x) === docTypeKey(selected))){
    list = [selected, ...list];
  }
  if(!list.length){
    return `<option value="" disabled selected>Semua dokumen wajib sudah diupload</option>`;
  }
  return list.map(x => `<option value="${esc(x)}" ${docTypeKey(x)===docTypeKey(selected)?'selected':''}>${esc(x)}</option>`).join("");
}
function updateSaranDokumen(){
  const id = document.getElementById("dokKegiatan")?.value;
  const box = document.getElementById("saranDokumen");
  if(box) box.innerHTML = wajibDocNote(id);
  document.querySelectorAll("#uploadRows .jenisDok").forEach(sel => {
    const old = sel.value;
    sel.innerHTML = docOptionsHtml(old, id);
  });
}
function addUploadRow(){
  const idKegiatan = document.getElementById("dokKegiatan")?.value || "";
  if(idKegiatan && !remainingDocTypesForKegiatan(idKegiatan).length){
    alert("Semua jenis dokumen wajib untuk kegiatan ini sudah diupload. Jika ada dokumen berstatus PERBAIKAN, gunakan tombol Upload Ulang pada rincian file.");
    return;
  }
  const wrap = document.getElementById("uploadRows");
  const div = document.createElement("div");
  div.className = "doc-upload-row";
  div.innerHTML = `<div class="field"><label>Jenis Dokumen</label><select class="jenisDok">${docOptionsHtml("", idKegiatan)}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileDok"></div><button class="btn-red" onclick="removeUploadRow(this)" type="button">Hapus</button>`;
  wrap.appendChild(div);
}
async function uploadDokumen(){
  const idKegiatan = document.getElementById("dokKegiatan")?.value;
  if(!idKegiatan){ alert("Tidak ada kegiatan yang bisa diupload. Jika dokumen berstatus PERBAIKAN, upload ulang dari rincian dokumen di bawah."); return; }
  const rows = [...document.querySelectorAll(".doc-upload-row")];
  const items = rows.map(row => ({jenis:row.querySelector(".jenisDok").value, file:row.querySelector(".fileDok").files[0]})).filter(x=>x.file);
  if(!items.length){ alert("Pilih minimal 1 file dokumen."); return; }
  const remainingKeys = new Set(remainingDocTypesForKegiatan(idKegiatan).map(docTypeKey));
  for(const it of items){
    if(!remainingKeys.has(docTypeKey(it.jenis))){
      alert(`Jenis dokumen ${it.jenis} sudah pernah diupload. Jika perlu perbaikan, gunakan tombol Upload Ulang pada rincian file.`);
      return;
    }
  }
  showLoading(`Upload 1/${items.length} dokumen...`);
  try{
    for(let i=0;i<items.length;i++){
      document.getElementById("loadingText").innerText = `Upload ${i+1}/${items.length} dokumen...`;
      const base64 = await fileToBase64(items[i].file);
      const r = await apiPost({action:"uploadDokumen", user:currentUser, id_kegiatan:idKegiatan, jenis_dokumen:items[i].jenis, file_name:items[i].file.name, mime_type:items[i].file.type, file_base64:base64});
      if(!r.success) throw new Error(r.message);
    }
    alert("Dokumen berhasil diupload."); await loadDashboard(false);
  }catch(e){ alert(e.message || "Gagal upload dokumen."); }
  finally{ hideLoading(); }
}
function renderPencairan(){
  let html = "";
  if(!canSeeAll()){
    const approved = getApprovedOpenKegiatan();
    const firstId = approved[0]?.id_kegiatan || "";
    html += `<section class="panel fade-up premium-panel collapsible-panel"><div class="panel-head"><div><h3>Upload Dokumen Pencairan</h3><p class="panel-sub">Satu kegiatan bisa upload lebih dari satu dokumen. Jenis dokumen yang sudah diupload tidak muncul lagi di pilihan upload awal.</p></div>${collapseButton('uploadPencairan')}</div><div class="collapse-body ${collapseState.uploadPencairan?'hidden':''}"><div class="form-grid"><div class="field"><label>Pilih Kegiatan</label><select id="dokKegiatan" onchange="updateSaranDokumen()">${approved.map(k=>`<option value="${esc(k.id_kegiatan)}">${esc(k.nama_kegiatan)} - ${esc(k.metode_pemilihan || metodePemilihanByNilai(k.jumlah))}</option>`).join("")}</select><div id="saranDokumen" class="auto-doc-note-wrap"></div></div></div><div id="uploadRows"><div class="doc-upload-row"><div class="field"><label>Jenis Dokumen</label><select class="jenisDok">${docOptionsHtml("", firstId)}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileDok"></div><button class="btn-red" onclick="removeUploadRow(this)" type="button">Hapus</button></div></div><button class="btn-soft" onclick="addUploadRow()" type="button">+ Tambah File Dokumen</button> <button onclick="uploadDokumen()">Upload Semua Dokumen</button><div id="uploadMsg" class="msg">${approved.length?"":"Tidak ada dokumen baru yang perlu diupload. Jika ada file berstatus PERBAIKAN, gunakan tombol Upload Ulang pada rincian dokumen."}</div></div></section>`;
  }

  let groups = groupedDocs();
  if(canSeeAll() && filters.cairBidang !== "ALL") groups = groups.filter(g => String(g.id_bidang)===filters.cairBidang);
  if(filters.cairStatus !== "ALL") groups = groups.filter(g => groupDocStatus(g) === filters.cairStatus);
  const q = filters.cairSearch.trim().toLowerCase();
  if(q) groups = groups.filter(g => kegiatanName(g.id_kegiatan).toLowerCase().includes(q));
  const pageData = groups.slice((pencairanPage-1)*perPage, pencairanPage*perPage);
  const rows = pageData.map(g=>renderDokumenGroupRow(g)).join("");
  html += `<section class="panel fade-up"><h3>Data Dokumen & Pencairan</h3><p class="panel-sub">${isAdmin()?"Rekap dokumen digabung per kegiatan. Verifikasi dapat dilakukan per file dokumen agar lebih akurat.":"Rekap dokumen digabung per kegiatan. File yang berstatus PERBAIKAN dapat diupload ulang pada rincian file."}</p>${filterBarPencairan()}<div class="table-wrap grouped-wrap"><table class="grouped-table"><thead><tr><th>Rekap Kegiatan</th></tr></thead><tbody>${rows || `<tr><td class="empty">Belum ada dokumen</td></tr>`}</tbody></table></div>${pager(groups.length, pencairanPage, 'goPencairanPage')}</section>`;
  document.getElementById("contentArea").innerHTML = html;
  if(!canSeeAll()) setTimeout(updateSaranDokumen, 0);
}
function renderDokumenGroupRow(g){
  const stGroup = groupDocStatus(g);
  const stCair = getPencairanStatus(g.id_kegiatan);
  const isCollapsed = docGroupCollapse[g.id_kegiatan] === undefined ? false : !!docGroupCollapse[g.id_kegiatan];
  const docsHtml = (g.docs || []).map(d => {
    const st = String(d.status_verifikasi || 'MENUNGGU').toUpperCase();
    let actionHtml = `<span class="muted">-</span>`;
    if(canManage()){
      actionHtml = `<div class="doc-file-actions"><button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button><button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button></div>`;
    } else if(isReviewer()){
      actionHtml = `<span class="audit-pill">Read-only</span>`;
    } else if(st === 'PERBAIKAN' || st === 'DITOLAK'){
      actionHtml = `<div class="doc-action-box per-file-revision"><div class="revision-title">Upload Ulang</div><input type="file" id="revisi_${esc(d.id_dokumen)}"><button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button></div>`;
    }
    const catatan = d.catatan_Verifikator ? `<div class="group-reason"><b>Catatan:</b> ${esc(d.catatan_Verifikator)}</div>` : "";
    return `<div class="doc-item ${st==='PERBAIKAN'||st==='DITOLAK'?'doc-item-repair':''}"><div><b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || '-')}</b><br><small class="muted">${esc(d.nama_file || '-')}</small></div><div>${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file || '-')}</div><div>${badge(d.status_verifikasi || 'MENUNGGU')}</div><div>${catatan}${actionHtml}</div></div>`;
  }).join("");
  let actions = `<span class="muted">-</span>`;
  if(isAdmin()){
    actions = `<div class="group-actions"><button class="btn-mini btn-green btn-wide" onclick="validKegiatanDokumen('${esc(g.id_kegiatan)}')">Valid Semua</button><button class="btn-mini btn-orange btn-wide" onclick="perbaikanKegiatanDokumen('${esc(g.id_kegiatan)}')">Perbaikan Semua</button></div>`;
  }
  return `<tr><td class="doc-group-card"><div class="doc-group-head doc-group-head-v12"><div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div><div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div><div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div><div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div><div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed ? 'Lihat Rincian' : 'Minimize'}</button></div></div><div class="doc-list ${isCollapsed ? 'hidden' : ''}">${docsHtml}</div><div class="doc-group-head doc-group-foot-v12" style="border-top:1px solid #e8f1f7;border-bottom:0"><div class="group-reason"><b>Rekap:</b> ${(g.docs||[]).length} file dokumen. ${isCollapsed ? 'Klik Lihat Rincian untuk membuka daftar file.' : 'Rincian file sedang ditampilkan.'}</div><div></div><div></div><div></div>${actions}</div></td></tr>`;
}


/* =========================
   SIMPROV v39 final override
   Admin validasi/perbaikan per file dokumen, bukan tombol per kegiatan.
   ========================= */
function renderDokumenGroupRow(g){
  const stGroup = groupDocStatus(g);
  const stCair = getPencairanStatus(g.id_kegiatan);
  const isCollapsed = docGroupCollapse[g.id_kegiatan] === undefined ? false : !!docGroupCollapse[g.id_kegiatan];

  const docsHtml = (g.docs || []).map(d => {
    const st = String(d.status_verifikasi || 'MENUNGGU').toUpperCase();
    let actionHtml = `<span class="muted">-</span>`;

    if(canManage()){
      actionHtml = `<div class="doc-file-actions v39-file-actions">
        <button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button>
        <button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button>
      </div>`;
    } else if(isReviewer()){
      actionHtml = `<span class="audit-pill">Read-only</span>`;
    } else if(st === 'PERBAIKAN' || st === 'DITOLAK'){
      actionHtml = `<div class="doc-action-box per-file-revision">
        <div class="revision-title">Upload Ulang</div>
        <input type="file" id="revisi_${esc(d.id_dokumen)}">
        <button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button>
      </div>`;
    }

    const catatan = d.catatan_Verifikator ? `<div class="group-reason"><b>Catatan:</b> ${esc(d.catatan_Verifikator)}</div>` : "";
    return `<div class="doc-item ${st==='PERBAIKAN'||st==='DITOLAK'?'doc-item-repair':''}">
      <div><b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || '-')}</b><br><small class="muted">${esc(d.nama_file || '-')}</small></div>
      <div>${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file || '-')}</div>
      <div>${badge(d.status_verifikasi || 'MENUNGGU')}</div>
      <div class="doc-file-note-action">${catatan}${actionHtml}</div>
    </div>`;
  }).join("");

  return `<tr><td class="doc-group-card">
    <div class="doc-group-head doc-group-head-v12">
      <div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div>
      <div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div>
      <div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div>
      <div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div>
      <div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed ? 'Lihat Rincian' : 'Minimize'}</button></div>
    </div>
    <div class="doc-list ${isCollapsed ? 'hidden' : ''}">${docsHtml}</div>
    <div class="doc-group-head doc-group-foot-v12 v69-final-action" style="border-top:1px solid #e8f1f7;border-bottom:0">
      <div class="group-reason"><b>Rekap:</b> ${(g.docs||[]).length} file dokumen. ${isCollapsed ? 'Klik Lihat Rincian untuk membuka daftar file.' : 'Validasi/perbaikan dilakukan pada masing-masing file dokumen.'}</div>
      <div></div><div></div><div></div><span class="muted">-</span>
    </div>
  </td></tr>`;
}


/* =========================
   SIMPROV v41 safety override
   Mencegah dashboard gagal hanya karena 1 baris data perencanaan bermasalah.
   ========================= */
function renderPerencanaanRow(k){
  try{
    k = k || {};
    const st = String(k.status_perencanaan||"DIAJUKAN").toUpperCase();
    const locked = isKegiatanLocked(k);
    const aksesBuka = aksesPerencanaanTerbuka();
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const metode = k.metode_pemilihan || metodePemilihanByNilai(jumlah);
    const waktu = k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-";
    const note = `${k.alasan_penolakan?`<div class="reason-box"><b>Catatan penyesuaian:</b><br>${esc(k.alasan_penolakan)}</div>`:""}${k.alasan_perubahan?`<div class="history-box"><b>Alasan perubahan:</b><br>${esc(k.alasan_perubahan)}</div>`:""}${k.riwayat_perubahan?`<div class="history-box"><b>Riwayat:</b><br>${esc(k.riwayat_perubahan).replace(/\n/g,'<br>')}</div>`:""}` || `<span class="muted">-</span>`;
    let aksi = "";
    if(canManage()){
      if(st === "DIAJUKAN" || st === "PERUBAHAN_DIAJUKAN") aksi = `<button class="btn-mini btn-green" onclick="setujui('${esc(k.id_kegiatan)}')">Setujui</button><button class="btn-mini btn-orange" onclick="tolak('${esc(k.id_kegiatan)}')">Minta Perbaikan</button>`;
      else aksi = `<span class="muted">-</span>`;
    } else if(isReviewer()){
      aksi = `<span class="audit-pill">Read-only</span>`;
    } else if(locked){
      aksi = `<span class="status-done-pill">Selesai</span>`;
    } else if(!aksesBuka){
      aksi = `<span class="lock-badge">Akses perencanaan ditutup</span>`;
    } else {
      if(st === "DIAJUKAN" || st === "DITOLAK") aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','normal')">Edit</button><button class="btn-mini btn-red" onclick="hapusPerencanaan('${esc(k.id_kegiatan)}')">Hapus</button>`;
      else if(st === "DISETUJUI") aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','change')">Ajukan Perubahan</button>`;
      else aksi = `<span class="muted">Menunggu Verifikator</span>`;
    }
    const perubahan = toNumber(k.perubahan_ke) ? `<br><small class="muted">Perubahan Ke-${toNumber(k.perubahan_ke)}</small>` : "";
    const rowClass = locked ? "row-selesai" : (st === "DITOLAK" ? "row-perbaikan" : "row-proses");
    return `<tr class="rencana-row ${rowClass}">
      <td>${esc(k.id_kegiatan)}</td>
      <td>${esc(bidangName(k.id_bidang))}</td>
      <td><b>${esc(k.nama_kegiatan)}</b>${perubahan}</td>
      <td>${esc(k.volume)}</td>
      <td>${esc(k.satuan)}</td>
      <td>${rupiah(k.harga_satuan)}</td>
      <td><b>${rupiah(jumlah)}</b></td>
      <td>${esc(metode)}</td>
      <td>${esc(waktu)}</td>
      <td>${badge(st)}</td>
      <td class="note-cell">${note}</td>
      <td class="nowrap">${aksi}</td>
    </tr>`;
  }catch(e){
    console.error("ROW_PERENCANAAN_ERROR", e, k);
    return `<tr class="rencana-row row-perbaikan"><td colspan="12">Data kegiatan ${esc(k?.id_kegiatan || "-")} perlu dicek. Detail: ${esc(e.message || e)}</td></tr>`;
  }
}


/* =========================
   SIMPROV v43 final override
   Hilangkan box info metode/waktu/dokumen pada menu pencairan.
   Dropdown dokumen tetap otomatis mengikuti metode kegiatan.
   ========================= */
function updateSaranDokumen(){
  const box = document.getElementById("saranDokumen");
  if(box) box.innerHTML = "";
  const id = document.getElementById("dokKegiatan")?.value || "";
  document.querySelectorAll("#uploadRows .jenisDok").forEach(sel => {
    const old = sel.value;
    sel.innerHTML = docOptionsHtml(old, id);
  });
}


/* =========================
   SIMPROV v46 final override
   Info dokumen lengkap: tanggal upload, tanggal verifikasi, tanggal perbaikan/upload ulang, catatan Verifikator, dan riwayat.
   ========================= */
function fmtDateTimeID(v){
  if(!v) return "-";
  try{
    const d = new Date(v);
    if(isNaN(d.getTime())) return esc(String(v));
    return d.toLocaleString("id-ID", {day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit"}) + " WIB";
  }catch(e){ return esc(String(v)); }
}
function docTimelineHtml(d){
  const st = String(d.status_verifikasi || "MENUNGGU").toUpperCase();
  const rows = [];
  rows.push(`<div><span>Upload awal</span><b>${fmtDateTimeID(d.tanggal_upload)}</b>${d.upload_by ? `<small>oleh ${esc(d.upload_by)}</small>` : ""}</div>`);
  if(d.tanggal_verifikasi){
    rows.push(`<div><span>${st === "VALID" ? "Diverifikasi" : "Diperiksa Verifikator"}</span><b>${fmtDateTimeID(d.tanggal_verifikasi)}</b>${d.verifikasi_by ? `<small>oleh ${esc(d.verifikasi_by)}</small>` : ""}</div>`);
  }
  if(d.tanggal_revisi){
    rows.push(`<div><span>Upload ulang</span><b>${fmtDateTimeID(d.tanggal_revisi)}</b>${d.revisi_by ? `<small>oleh ${esc(d.revisi_by)}</small>` : ""}</div>`);
  }
  if(d.catatan_Verifikator){
    rows.push(`<div class="doc-Verifikator-note"><span>Catatan Verifikator</span><b>${esc(d.catatan_Verifikator)}</b></div>`);
  }
  if(d.riwayat_dokumen){
    rows.push(`<div class="doc-history"><span>Riwayat</span><b>${esc(d.riwayat_dokumen).replace(/\n/g,"<br>")}</b></div>`);
  }
  return `<div class="doc-timeline">${rows.join("")}</div>`;
}
function renderDokumenGroupRow(g){
  const stGroup = groupDocStatus(g);
  const stCair = getPencairanStatus(g.id_kegiatan);
  const isCollapsed = docGroupCollapse[g.id_kegiatan] === undefined ? false : !!docGroupCollapse[g.id_kegiatan];

  const docsHtml = (g.docs || []).map(d => {
    const st = String(d.status_verifikasi || 'MENUNGGU').toUpperCase();
    let actionHtml = `<span class="muted">-</span>`;

    if(canManage()){
      actionHtml = `<div class="doc-file-actions v39-file-actions">
        <button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button>
        <button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button>
      </div>`;
    } else if(isReviewer()){
      actionHtml = `<span class="audit-pill">Read-only</span>`;
    } else if(st === 'PERBAIKAN' || st === 'DITOLAK'){
      actionHtml = `<div class="doc-action-box per-file-revision compact-revision">
        <div class="revision-title">Upload Ulang</div>
        <input type="file" id="revisi_${esc(d.id_dokumen)}">
        <button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button>
      </div>`;
    }

    return `<div class="doc-item doc-item-v46 ${st==='PERBAIKAN'||st==='DITOLAK'?'doc-item-repair':''}">
      <div class="doc-main-info">
        <b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || '-')}</b>
        <small class="muted">${esc(d.nama_file || '-')}</small>
      </div>
      <div class="doc-link">${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file || '-')}</div>
      <div class="doc-status">${badge(d.status_verifikasi || 'MENUNGGU')}</div>
      <div class="doc-file-note-action">${docTimelineHtml(d)}${actionHtml}</div>
    </div>`;
  }).join("");

  return `<tr><td class="doc-group-card">
    <div class="doc-group-head doc-group-head-v12">
      <div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div>
      <div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div>
      <div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div>
      <div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div>
      <div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed ? 'Lihat Rincian' : 'Minimize'}</button></div>
    </div>
    <div class="doc-list ${isCollapsed ? 'hidden' : ''}">${docsHtml}</div>
    <div class="doc-group-head doc-group-foot-v12 v69-final-action" style="border-top:1px solid #e8f1f7;border-bottom:0">
      <div class="group-reason"><b>Rekap:</b> ${(g.docs||[]).length} file dokumen. ${isCollapsed ? 'Klik Lihat Rincian untuk membuka daftar file.' : 'Setiap file menampilkan riwayat upload, verifikasi, perbaikan, dan catatan Verifikator.'}</div>
      <div></div><div></div><div></div><span class="muted">-</span>
    </div>
  </td></tr>`;
}


/* =========================
   SIMPROV v47 final override
   Status/riwayat dokumen ditampilkan sebagai popup, bukan penuh di tabel.
   ========================= */
function openDocStatusModal(idDokumen){
  const d = (dashboard?.dokumen || []).find(x => String(x.id_dokumen) === String(idDokumen));
  if(!d){ alert("Data dokumen tidak ditemukan."); return; }

  const st = String(d.status_verifikasi || "MENUNGGU").toUpperCase();
  const rows = [];

  rows.push(`
    <div class="status-row">
      <div class="status-no">1.</div>
      <div>
        <b>Upload awal</b>
        <p><b>Tanggal:</b> ${fmtDateTimeID(d.tanggal_upload)}</p>
        <p><b>Oleh:</b> ${esc(d.upload_by || "-")}</p>
        <p><b>File:</b> ${d.url_file ? `<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file || "Buka file")}</a>` : esc(d.nama_file || "-")}</p>
      </div>
    </div>
  `);

  if(d.tanggal_verifikasi || d.catatan_Verifikator){
    rows.push(`
      <div class="status-row">
        <div class="status-no">2.</div>
        <div>
          <b>${st === "VALID" ? "Verifikasi dokumen" : "Hasil pemeriksaan dokumen"}</b>
          <p><b>Status:</b> ${esc(st)}</p>
          <p><b>Tanggal:</b> ${fmtDateTimeID(d.tanggal_verifikasi)}</p>
          <p><b>Admin:</b> ${esc(d.verifikasi_by || "-")}</p>
          ${d.catatan_Verifikator ? `<p><b>Catatan:</b> ${esc(d.catatan_Verifikator)}</p>` : ""}
        </div>
      </div>
    `);
  }

  if(d.tanggal_revisi){
    rows.push(`
      <div class="status-row">
        <div class="status-no">3.</div>
        <div>
          <b>Upload ulang / perbaikan file</b>
          <p><b>Tanggal:</b> ${fmtDateTimeID(d.tanggal_revisi)}</p>
          <p><b>Oleh:</b> ${esc(d.revisi_by || "-")}</p>
          <p><b>File terbaru:</b> ${d.url_file ? `<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file || "Buka file")}</a>` : esc(d.nama_file || "-")}</p>
        </div>
      </div>
    `);
  }

  if(d.riwayat_dokumen){
    rows.push(`
      <div class="status-row">
        <div class="status-no">R.</div>
        <div>
          <b>Riwayat Dokumen</b>
          <p>${esc(d.riwayat_dokumen).replace(/\n/g,"<br>")}</p>
        </div>
      </div>
    `);
  }

  const html = `
    <div class="status-modal-backdrop" id="docStatusModal" onclick="if(event.target.id==='docStatusModal') closeDocStatusModal()">
      <div class="status-modal-card">
        <div class="status-modal-head">
          <h3>Status Dokumen</h3>
          <button type="button" onclick="closeDocStatusModal()">Tutup</button>
        </div>
        <div class="status-modal-body">
          <div class="status-doc-title">
            <b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || "-")}</b>
            <span>${esc(kegiatanName(d.id_kegiatan))}</span>
          </div>
          ${rows.join("")}
        </div>
      </div>
    </div>
  `;

  const old = document.getElementById("docStatusModal");
  if(old) old.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}
function closeDocStatusModal(){
  const el = document.getElementById("docStatusModal");
  if(el) el.remove();
}
function renderDokumenGroupRow(g){
  const stGroup = groupDocStatus(g);
  const stCair = getPencairanStatus(g.id_kegiatan);
  const isCollapsed = docGroupCollapse[g.id_kegiatan] === undefined ? false : !!docGroupCollapse[g.id_kegiatan];

  const docsHtml = (g.docs || []).map(d => {
    const st = String(d.status_verifikasi || 'MENUNGGU').toUpperCase();
    let actionHtml = `<span class="muted">-</span>`;

    if(canManage()){
      actionHtml = `<div class="doc-file-actions v39-file-actions">
        <button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button>
        <button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button>
      </div>`;
    } else if(isReviewer()){
      actionHtml = `<span class="audit-pill">Read-only</span>`;
    } else if(st === 'PERBAIKAN' || st === 'DITOLAK'){
      actionHtml = `<div class="doc-action-box per-file-revision compact-revision">
        <div class="revision-title">Upload Ulang</div>
        <input type="file" id="revisi_${esc(d.id_dokumen)}">
        <button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button>
      </div>`;
    }

    return `<div class="doc-item doc-item-v47 ${st==='PERBAIKAN'||st==='DITOLAK'?'doc-item-repair':''}">
      <div class="doc-main-info">
        <b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || '-')}</b>
        <small class="muted">${esc(d.nama_file || '-')}</small>
      </div>
      <div class="doc-link">${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file || '-')}</div>
      <div class="doc-status">${badge(d.status_verifikasi || 'MENUNGGU')}</div>
      <div class="doc-file-note-action compact-status-action">
        <button class="btn-mini btn-detail" onclick="openDocStatusModal('${esc(d.id_dokumen)}')">Lihat Status</button>
        ${d.catatan_Verifikator ? `<span class="doc-alert-text">Ada catatan Verifikator</span>` : ""}
        ${actionHtml}
      </div>
    </div>`;
  }).join("");

  return `<tr><td class="doc-group-card">
    <div class="doc-group-head doc-group-head-v12">
      <div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div>
      <div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div>
      <div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div>
      <div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div>
      <div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed ? 'Lihat Rincian' : 'Minimize'}</button></div>
    </div>
    <div class="doc-list ${isCollapsed ? 'hidden' : ''}">${docsHtml}</div>
    <div class="doc-group-head doc-group-foot-v12 v69-final-action" style="border-top:1px solid #e8f1f7;border-bottom:0">
      <div class="group-reason"><b>Rekap:</b> ${(g.docs||[]).length} file dokumen. ${isCollapsed ? 'Klik Lihat Rincian untuk membuka daftar file.' : 'Status dan riwayat dokumen dapat dilihat melalui tombol Lihat Status.'}</div>
      <div></div><div></div><div></div><span class="muted">-</span>
    </div>
  </td></tr>`;
}


/* =========================
   SIMPROV v48 final override
   - Popup dokumen menampilkan posisi saat ini.
   - Label Admin diganti menjadi Verifikator.
   - Alasan/Riwayat perencanaan dibuat tombol Lihat dan popup.
   ========================= */
function getDocPosisiSaatIni(d){
  const st = String(d?.status_verifikasi || "MENUNGGU").toUpperCase();
  if(st === "VALID") return "Sudah diverifikasi";
  if(st === "PERBAIKAN" || st === "DITOLAK") return "Perlu perbaikan";
  if(st === "MENUNGGU" && d?.tanggal_revisi) return "Menunggu verifikasi perbaikan";
  return "Menunggu verifikasi";
}
function getRencanaPosisiSaatIni(k){
  const st = String(k?.status_perencanaan || "DIAJUKAN").toUpperCase();
  if(isKegiatanLocked(k)) return "Selesai";
  if(st === "DISETUJUI") return "Disetujui";
  if(st === "DITOLAK") return "Perlu perbaikan";
  if(st === "PERUBAHAN_DIAJUKAN") return "Menunggu verifikasi perubahan";
  if(st === "DIAJUKAN") return "Menunggu verifikasi perencanaan";
  return st.replace(/_/g, " ");
}
function openDocStatusModal(idDokumen){
  const d = (dashboard?.dokumen || []).find(x => String(x.id_dokumen) === String(idDokumen));
  if(!d){ alert("Data dokumen tidak ditemukan."); return; }

  const st = String(d.status_verifikasi || "MENUNGGU").toUpperCase();
  const posisi = getDocPosisiSaatIni(d);
  const rows = [];

  rows.push(`
    <div class="status-row status-position-row">
      <div class="status-no">✓</div>
      <div>
        <b>Posisi Saat Ini</b>
        <p><span class="status-position-text ${st === "VALID" ? "pos-valid" : (st === "PERBAIKAN" || st === "DITOLAK" ? "pos-repair" : "pos-wait")}">${esc(posisi)}</span></p>
      </div>
    </div>
  `);

  rows.push(`
    <div class="status-row">
      <div class="status-no">1.</div>
      <div>
        <b>Upload awal</b>
        <p><b>Tanggal:</b> ${fmtDateTimeID(d.tanggal_upload)}</p>
        <p><b>Oleh:</b> ${esc(d.upload_by || "-")}</p>
        <p><b>File:</b> ${d.url_file ? `<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file || "Buka file")}</a>` : esc(d.nama_file || "-")}</p>
      </div>
    </div>
  `);

  if(d.tanggal_verifikasi || d.catatan_Verifikator || st === "VALID" || st === "PERBAIKAN" || st === "DITOLAK"){
    rows.push(`
      <div class="status-row">
        <div class="status-no">2.</div>
        <div>
          <b>${st === "VALID" ? "Verifikasi dokumen" : "Hasil pemeriksaan dokumen"}</b>
          <p><b>Status:</b> ${esc(posisi)}</p>
          <p><b>Tanggal:</b> ${fmtDateTimeID(d.tanggal_verifikasi)}</p>
          <p><b>Verifikator:</b> ${esc(d.verifikasi_by || "-")}</p>
          ${d.catatan_Verifikator ? `<p><b>Catatan:</b> ${esc(d.catatan_Verifikator)}</p>` : ""}
        </div>
      </div>
    `);
  }

  if(d.tanggal_revisi){
    rows.push(`
      <div class="status-row">
        <div class="status-no">3.</div>
        <div>
          <b>Upload ulang / perbaikan file</b>
          <p><b>Tanggal:</b> ${fmtDateTimeID(d.tanggal_revisi)}</p>
          <p><b>Oleh:</b> ${esc(d.revisi_by || "-")}</p>
          <p><b>Status:</b> ${esc(posisi)}</p>
          <p><b>File terbaru:</b> ${d.url_file ? `<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file || "Buka file")}</a>` : esc(d.nama_file || "-")}</p>
        </div>
      </div>
    `);
  }

  if(d.riwayat_dokumen){
    rows.push(`
      <div class="status-row">
        <div class="status-no">R.</div>
        <div>
          <b>Riwayat Dokumen</b>
          <p>${esc(d.riwayat_dokumen).replace(/\bADMIN\b/g,"Verifikator").replace(/\bAdmin\b/g,"Verifikator").replace(/\n/g,"<br>")}</p>
        </div>
      </div>
    `);
  }

  const html = `
    <div class="status-modal-backdrop" id="docStatusModal" onclick="if(event.target.id==='docStatusModal') closeDocStatusModal()">
      <div class="status-modal-card">
        <div class="status-modal-head">
          <h3>Status Dokumen</h3>
          <button type="button" onclick="closeDocStatusModal()">Tutup</button>
        </div>
        <div class="status-modal-body">
          <div class="status-doc-title">
            <b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || "-")}</b>
            <span>${esc(kegiatanName(d.id_kegiatan))}</span>
          </div>
          ${rows.join("")}
        </div>
      </div>
    </div>
  `;

  const old = document.getElementById("docStatusModal");
  if(old) old.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}
function closeRencanaStatusModal(){
  const el = document.getElementById("rencanaStatusModal");
  if(el) el.remove();
}
function openRencanaStatusModal(idKegiatan){
  const k = (dashboard?.perencanaan || []).find(x => String(x.id_kegiatan) === String(idKegiatan));
  if(!k){ alert("Data perencanaan tidak ditemukan."); return; }
  const st = String(k.status_perencanaan || "DIAJUKAN").toUpperCase();
  const posisi = getRencanaPosisiSaatIni(k);
  const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
  const rows = [];

  rows.push(`
    <div class="status-row status-position-row">
      <div class="status-no">✓</div>
      <div>
        <b>Posisi Saat Ini</b>
        <p><span class="status-position-text ${st === "DISETUJUI" ? "pos-valid" : (st === "DITOLAK" ? "pos-repair" : "pos-wait")}">${esc(posisi)}</span></p>
      </div>
    </div>
  `);

  rows.push(`
    <div class="status-row">
      <div class="status-no">1.</div>
      <div>
        <b>Data Perencanaan</b>
        <p><b>Nama kegiatan:</b> ${esc(k.nama_kegiatan || "-")}</p>
        <p><b>Bidang:</b> ${esc(bidangName(k.id_bidang))}</p>
        <p><b>Jumlah:</b> ${rupiah(jumlah)}</p>
        <p><b>Metode:</b> ${esc(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</p>
        <p><b>Waktu Pemilihan:</b> ${esc(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-")}</p>
        <p><b>Tanggal Input:</b> ${fmtDateTimeID(k.tanggal_input)}</p>
      </div>
    </div>
  `);

  if(k.alasan_penolakan){
    rows.push(`
      <div class="status-row">
        <div class="status-no">2.</div>
        <div>
          <b>Catatan Penyesuaian</b>
          <p>${esc(k.alasan_penolakan)}</p>
        </div>
      </div>
    `);
  }

  if(k.alasan_perubahan || toNumber(k.perubahan_ke)){
    rows.push(`
      <div class="status-row">
        <div class="status-no">3.</div>
        <div>
          <b>Pengajuan Perubahan</b>
          <p><b>Perubahan:</b> ${toNumber(k.perubahan_ke) ? `Perubahan Ke-${toNumber(k.perubahan_ke)}` : "-"}</p>
          ${k.alasan_perubahan ? `<p><b>Alasan perubahan:</b> ${esc(k.alasan_perubahan)}</p>` : ""}
        </div>
      </div>
    `);
  }

  if(k.riwayat_perubahan){
    rows.push(`
      <div class="status-row">
        <div class="status-no">R.</div>
        <div>
          <b>Riwayat Perubahan</b>
          <p>${esc(k.riwayat_perubahan).replace(/\bADMIN\b/g,"Verifikator").replace(/\bAdmin\b/g,"Verifikator").replace(/\n/g,"<br>")}</p>
        </div>
      </div>
    `);
  }

  if(rows.length <= 2 && !k.alasan_penolakan && !k.alasan_perubahan && !k.riwayat_perubahan){
    rows.push(`
      <div class="status-row">
        <div class="status-no">-</div>
        <div>
          <b>Catatan / Riwayat</b>
          <p>Belum terdapat catatan penyesuaian atau riwayat perubahan.</p>
        </div>
      </div>
    `);
  }

  const html = `
    <div class="status-modal-backdrop" id="rencanaStatusModal" onclick="if(event.target.id==='rencanaStatusModal') closeRencanaStatusModal()">
      <div class="status-modal-card">
        <div class="status-modal-head">
          <h3>Status Perencanaan</h3>
          <button type="button" onclick="closeRencanaStatusModal()">Tutup</button>
        </div>
        <div class="status-modal-body">
          <div class="status-doc-title">
            <b>${esc(k.nama_kegiatan || "-")}</b>
            <span>${esc(k.id_kegiatan || "-")}</span>
          </div>
          ${rows.join("")}
        </div>
      </div>
    </div>
  `;
  const old = document.getElementById("rencanaStatusModal");
  if(old) old.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}
function renderPerencanaanRow(k){
  try{
    k = k || {};
    const st = String(k.status_perencanaan||"DIAJUKAN").toUpperCase();
    const locked = isKegiatanLocked(k);
    const aksesBuka = aksesPerencanaanTerbuka();
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const metode = k.metode_pemilihan || metodePemilihanByNilai(jumlah);
    const waktu = k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-";
    const hasNote = !!(k.alasan_penolakan || k.alasan_perubahan || k.riwayat_perubahan || toNumber(k.perubahan_ke));
    const note = `<button class="btn-mini btn-detail" onclick="openRencanaStatusModal('${esc(k.id_kegiatan)}')">${hasNote ? "Lihat Riwayat" : "Lihat"}</button>`;
    let aksi = "";
    if(canManage()){
      if(st === "DIAJUKAN" || st === "PERUBAHAN_DIAJUKAN") aksi = `<button class="btn-mini btn-green" onclick="setujui('${esc(k.id_kegiatan)}')">Setujui</button><button class="btn-mini btn-orange" onclick="tolak('${esc(k.id_kegiatan)}')">Minta Perbaikan</button>`;
      else aksi = `<span class="muted">-</span>`;
    } else if(isReviewer()){
      aksi = `<span class="audit-pill">Read-only</span>`;
    } else if(locked){
      aksi = `<span class="status-done-pill">Selesai</span>`;
    } else if(!aksesBuka){
      aksi = `<span class="lock-badge">Akses perencanaan ditutup</span>`;
    } else {
      if(st === "DIAJUKAN" || st === "DITOLAK") aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','normal')">Edit</button><button class="btn-mini btn-red" onclick="hapusPerencanaan('${esc(k.id_kegiatan)}')">Hapus</button>`;
      else if(st === "DISETUJUI") aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','change')">Ajukan Perubahan</button>`;
      else aksi = `<span class="muted">Menunggu Verifikator</span>`;
    }
    const perubahan = toNumber(k.perubahan_ke) ? `<br><small class="muted">Perubahan Ke-${toNumber(k.perubahan_ke)}</small>` : "";
    const rowClass = locked ? "row-selesai" : (st === "DITOLAK" ? "row-perbaikan" : "row-proses");
    return `<tr class="rencana-row ${rowClass}">
      <td>${esc(k.id_kegiatan)}</td>
      <td>${esc(bidangName(k.id_bidang))}</td>
      <td><b>${esc(k.nama_kegiatan)}</b>${perubahan}</td>
      <td>${esc(k.volume)}</td>
      <td>${esc(k.satuan)}</td>
      <td>${rupiah(k.harga_satuan)}</td>
      <td><b>${rupiah(jumlah)}</b></td>
      <td>${esc(metode)}</td>
      <td>${esc(waktu)}</td>
      <td>${badge(st)}</td>
      <td class="note-cell note-cell-popup">${note}</td>
      <td class="nowrap">${aksi}</td>
    </tr>`;
  }catch(e){
    console.error("ROW_PERENCANAAN_ERROR", e, k);
    return `<tr class="rencana-row row-perbaikan"><td colspan="12">Data kegiatan ${esc(k?.id_kegiatan || "-")} perlu dicek. Detail: ${esc(e.message || e)}</td></tr>`;
  }
}


/* =========================
   SIMPROV v49 final override
   - Status perencanaan setelah perbaikan menjadi "Menunggu verifikasi perbaikan".
   - Menu admin Struktur Anggaran dirapikan.
   - Admin dapat menambahkan bidang dari menu Struktur Anggaran.
   ========================= */
const adminEditRowsV49 = {};
function setAdminEditRow(id, val){ adminEditRowsV49[String(id)] = !!val; renderStruktur(); }

function getRencanaPosisiSaatIni(k){
  const st = String(k?.status_perencanaan || "DIAJUKAN").toUpperCase();
  const hasPerbaikan = !!(k?.alasan_penolakan || String(k?.riwayat_perubahan || "").toLowerCase().includes("perbaikan diajukan ulang"));
  if(isKegiatanLocked(k)) return "Selesai";
  if(st === "DISETUJUI") return "Disetujui";
  if(st === "DITOLAK") return "Perlu perbaikan";
  if(st === "PERUBAHAN_DIAJUKAN") return "Menunggu verifikasi perubahan";
  if(st === "DIAJUKAN" && hasPerbaikan) return "Menunggu verifikasi perbaikan";
  if(st === "DIAJUKAN") return "Menunggu verifikasi perencanaan";
  return st.replace(/_/g, " ");
}

function renderStruktur(){
  if(canManage()){
    const rows = (dashboard.rekap || []).map(r=>{
      const id = String(r.id_bidang);
      const editing = !!adminEditRowsV49[id];
      const paguView = angkaID(r.pagu);
      return `<div class="admin-budget-card ${editing?'editing':''}">
        <div class="admin-budget-info">
          <b>${esc(r.nama_bidang)}</b>
          <small>${esc(r.id_bidang)}</small>
          <span>Total Perencanaan: <b>${rupiah(r.total_perencanaan)}</b></span>
          <span>Sisa Pagu: <b>${rupiah(r.sisa_pagu)}</b></span>
        </div>
        <div class="field">
          <label>Pagu Bidang</label>
          ${editing?`<input id="pagu_${esc(r.id_bidang)}" inputmode="numeric" value="${paguView}" oninput="onPaguAdminInput(this)">`:`<div class="readonly-display">Rp ${paguView}</div>`}
        </div>
        <div class="field">
          <label>Akses Input</label>
          ${editing?`<select id="akses_${esc(r.id_bidang)}"><option value="BUKA" ${r.status_akses==='BUKA'?'selected':''}>BUKA</option><option value="TUTUP" ${r.status_akses==='TUTUP'?'selected':''}>TUTUP</option></select>`:`<div class="readonly-display">${esc(r.status_akses || '-')}</div>`}
        </div>
        <div class="admin-budget-status">${badge(r.status_progress)}</div>
        <div class="admin-budget-actions">${editing?`<button onclick="updateBidang('${esc(r.id_bidang)}')">Simpan</button><button class="btn-soft" onclick="setAdminEditRow('${esc(r.id_bidang)}', false)">Batal</button>`:`<button class="btn-mini" onclick="setAdminEditRow('${esc(r.id_bidang)}', true)">Edit</button>`}</div>
      </div>`;
    }).join("");
    document.getElementById("contentArea").innerHTML = `<section class="panel fade-up premium-panel struktur-admin-panel">
      <div class="panel-title-row">
        <div>
          <h3>Struktur Anggaran</h3>
          <p class="panel-sub">Verifikator mengatur pagu, akses input, dan data bidang. Klik Edit untuk mengubah pagu atau akses.</p>
        </div>
        <button onclick="openTambahBidangModal()">+ Tambah Bidang</button>
      </div>
      <div class="admin-budget-list">${rows || `<p class="muted">Belum ada bidang.</p>`}</div>
    </section>`;
  } else if(isReviewer()){
    const cards = (dashboard.rekap || []).map(r=>{
      const over = toNumber(r.sisa_pagu) < 0;
      return `<div class="review-row ${over?'over-budget':''}">
        <div class="review-title"><b>${esc(r.nama_bidang)}</b><small>${esc(r.id_bidang)}</small></div>
        <div class="review-metrics">
          <div><span>Pagu</span><strong>${rupiah(r.pagu)}</strong></div>
          <div><span>Total Perencanaan</span><strong>${rupiah(r.total_perencanaan)}</strong></div>
          <div><span>Sisa Pagu</span><strong class="${over?'text-danger':''}">${rupiah(r.sisa_pagu)}</strong></div>
          <div><span>Kegiatan</span><strong>${esc(r.jumlah_kegiatan||0)}</strong></div>
          <div><span>Dokumen</span><strong>${esc(r.dokumen_upload||0)} upload / ${esc(r.dokumen_valid||0)} valid</strong></div>
        </div>
        <div class="review-status">${badge(r.status_akses)} ${over?badge('MELEBIHI PAGU'):badge(r.status_progress)}</div>
      </div>`;
    }).join("");
    document.getElementById("contentArea").innerHTML = `<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Struktur Anggaran - Mode Pemeriksaan</h3><p class="panel-sub">Role ${roleLabel()} dapat melihat seluruh bidang secara read-only.</p></div></div><div class="review-grid">${cards || `<p class="muted">Belum ada bidang.</p>`}</div></section>`;
  } else {
    const r = dashboard.rekap.find(x => String(x.id_bidang)===String(currentUser.id_bidang)) || {};
    document.getElementById("contentArea").innerHTML = `<section class="panel fade-up premium-panel"><h3>Ringkasan Bidang</h3><p class="panel-sub">Informasi anggaran dan progres bidang.</p><button onclick="refreshData()">Refresh Data</button><div class="table-wrap"><table><thead><tr><th>Bidang</th><th>Pagu</th><th>Total Perencanaan</th><th>Sisa</th><th>Kegiatan</th><th>Dokumen</th><th>Akses</th><th>Progress</th></tr></thead><tbody><tr><td>${esc(r.nama_bidang||currentUser.nama_bidang||'-')}</td><td>${rupiah(r.pagu||0)}</td><td>${rupiah(r.total_perencanaan||0)}</td><td>${rupiah(r.sisa_pagu||0)}</td><td>${esc(r.jumlah_kegiatan||0)}</td><td>${esc(r.dokumen_upload||0)}</td><td>${badge(r.status_akses||'-')}</td><td>${badge(r.status_progress||'-')}</td></tr></tbody></table></div></section>`;
  }
}

function openTambahBidangModal(){
  const old = document.getElementById("tambahBidangModal");
  if(old) old.remove();
  const html = `<div class="status-modal-backdrop" id="tambahBidangModal" onclick="if(event.target.id==='tambahBidangModal') closeTambahBidangModal()">
    <div class="status-modal-card tambah-bidang-card">
      <div class="status-modal-head">
        <h3>Tambah Bidang</h3>
        <button type="button" onclick="closeTambahBidangModal()">Tutup</button>
      </div>
      <div class="status-modal-body">
        <div class="form-grid tambah-bidang-grid">
          <div class="field"><label>ID Bidang</label><input id="newIdBidang" placeholder="Contoh: BID-KTR-2026"></div>
          <div class="field"><label>Nama Bidang</label><input id="newNamaBidang" placeholder="Contoh: Kesekretariatan"></div>
          <div class="field"><label>Pagu</label><input id="newPaguBidang" inputmode="numeric" placeholder="Contoh: 10.000.000" oninput="onPaguAdminInput(this)"></div>
          <div class="field"><label>Akses Input</label><select id="newAksesBidang"><option value="BUKA">BUKA</option><option value="TUTUP">TUTUP</option></select></div>
          <div class="field full"><label>Keterangan</label><input id="newKetBidang" placeholder="Opsional"></div>
        </div>
        <div class="modal-actions-v49">
          <button onclick="submitTambahBidang()">Simpan Bidang</button>
          <button class="btn-soft" onclick="closeTambahBidangModal()">Batal</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}
function closeTambahBidangModal(){
  const el = document.getElementById("tambahBidangModal");
  if(el) el.remove();
}
async function submitTambahBidang(){
  const data = {
    id_bidang: document.getElementById("newIdBidang").value,
    nama_bidang: document.getElementById("newNamaBidang").value,
    pagu: toNumber(document.getElementById("newPaguBidang").value),
    status_akses: document.getElementById("newAksesBidang").value,
    keterangan: document.getElementById("newKetBidang").value
  };
  if(!data.id_bidang || !data.nama_bidang){ alert("ID bidang dan nama bidang wajib diisi."); return; }
  showLoading("Menyimpan bidang...");
  try{
    const r = await apiPost({action:"saveBidang", user:currentUser, ...data});
    alert(r.message || (r.success ? "Bidang berhasil disimpan" : "Gagal menyimpan bidang"));
    if(r.success){ closeTambahBidangModal(); await refreshData(); }
  }catch(e){ alert("Gagal menyimpan bidang. Detail: " + String(e.message || e).slice(0,240)); }
  finally{ hideLoading(); }
}

function openRencanaStatusModal(idKegiatan){
  const k = (dashboard?.perencanaan || []).find(x => String(x.id_kegiatan) === String(idKegiatan));
  if(!k){ alert("Data perencanaan tidak ditemukan."); return; }
  const st = String(k.status_perencanaan || "DIAJUKAN").toUpperCase();
  const posisi = getRencanaPosisiSaatIni(k);
  const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
  const rows = [];
  rows.push(`<div class="status-row status-position-row"><div class="status-no">✓</div><div><b>Posisi Saat Ini</b><p><span class="status-position-text ${st === "DISETUJUI" ? "pos-valid" : (st === "DITOLAK" ? "pos-repair" : "pos-wait")}">${esc(posisi)}</span></p></div></div>`);
  rows.push(`<div class="status-row"><div class="status-no">1.</div><div><b>Data Perencanaan</b><p><b>Nama kegiatan:</b> ${esc(k.nama_kegiatan || "-")}</p><p><b>Bidang:</b> ${esc(bidangName(k.id_bidang))}</p><p><b>Jumlah:</b> ${rupiah(jumlah)}</p><p><b>Metode:</b> ${esc(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</p><p><b>Waktu Pemilihan:</b> ${esc(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-")}</p><p><b>Tanggal Input:</b> ${fmtDateTimeID(k.tanggal_input)}</p></div></div>`);
  if(k.alasan_penolakan){ rows.push(`<div class="status-row"><div class="status-no">2.</div><div><b>Catatan Penyesuaian</b><p>${esc(k.alasan_penolakan)}</p></div></div>`); }
  if(k.alasan_perubahan || toNumber(k.perubahan_ke)){ rows.push(`<div class="status-row"><div class="status-no">3.</div><div><b>Pengajuan Perubahan</b><p><b>Perubahan:</b> ${toNumber(k.perubahan_ke) ? `Perubahan Ke-${toNumber(k.perubahan_ke)}` : "-"}</p>${k.alasan_perubahan ? `<p><b>Alasan perubahan:</b> ${esc(k.alasan_perubahan)}</p>` : ""}</div></div>`); }
  if(k.riwayat_perubahan){ rows.push(`<div class="status-row"><div class="status-no">R.</div><div><b>Riwayat Perubahan</b><p>${esc(k.riwayat_perubahan).replace(/\bADMIN\b/g,"Verifikator").replace(/\bAdmin\b/g,"Verifikator").replace(/\n/g,"<br>")}</p></div></div>`); }
  if(!k.alasan_penolakan && !k.alasan_perubahan && !k.riwayat_perubahan){ rows.push(`<div class="status-row"><div class="status-no">-</div><div><b>Catatan / Riwayat</b><p>Belum terdapat catatan penyesuaian atau riwayat perubahan.</p></div></div>`); }
  const html = `<div class="status-modal-backdrop" id="rencanaStatusModal" onclick="if(event.target.id==='rencanaStatusModal') closeRencanaStatusModal()"><div class="status-modal-card"><div class="status-modal-head"><h3>Status Perencanaan</h3><button type="button" onclick="closeRencanaStatusModal()">Tutup</button></div><div class="status-modal-body"><div class="status-doc-title"><b>${esc(k.nama_kegiatan || "-")}</b><span>${esc(k.id_kegiatan || "-")}</span></div>${rows.join("")}</div></div></div>`;
  const old = document.getElementById("rencanaStatusModal");
  if(old) old.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}


/* =========================
   SIMPROV v50 final override
   Perencanaan dibuat seperti pencairan:
   - Riwayat tampil sebagai tahapan.
   - Status DITOLAK tombolnya Ajukan Perbaikan, bukan Edit/Hapus.
   - Setelah perbaikan diajukan ulang, posisi menjadi Menunggu verifikasi perbaikan.
   ========================= */
function getRencanaPosisiSaatIni(k){
  const st = String(k?.status_perencanaan || "DIAJUKAN").toUpperCase();
  const riw = String(k?.riwayat_perubahan || "").toLowerCase();
  const hasPerbaikan = !!(k?.alasan_penolakan || riw.includes("perbaikan diajukan ulang") || riw.includes("diajukan ulang"));
  if(isKegiatanLocked(k)) return "Selesai";
  if(st === "DISETUJUI") return "Disetujui";
  if(st === "DITOLAK") return "Perlu perbaikan";
  if(st === "PERUBAHAN_DIAJUKAN") return "Menunggu verifikasi perubahan";
  if(st === "DIAJUKAN" && hasPerbaikan) return "Menunggu verifikasi perbaikan";
  if(st === "DIAJUKAN") return "Menunggu verifikasi perencanaan";
  return st.replace(/_/g, " ");
}
function rencanaRiwayatLines(k){
  const rows = [];
  if(k.riwayat_perubahan){
    String(k.riwayat_perubahan).split(/\n+/).filter(Boolean).forEach(x => rows.push(x));
  }
  return rows;
}
function openRencanaStatusModal(idKegiatan){
  const k = (dashboard?.perencanaan || []).find(x => String(x.id_kegiatan) === String(idKegiatan));
  if(!k){ alert("Data perencanaan tidak ditemukan."); return; }

  const st = String(k.status_perencanaan || "DIAJUKAN").toUpperCase();
  const posisi = getRencanaPosisiSaatIni(k);
  const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
  const rows = [];
  const riwayatRows = rencanaRiwayatLines(k);

  rows.push(`
    <div class="status-row status-position-row">
      <div class="status-no">✓</div>
      <div>
        <b>Posisi Saat Ini</b>
        <p><span class="status-position-text ${st === "DISETUJUI" ? "pos-valid" : (st === "DITOLAK" ? "pos-repair" : "pos-wait")}">${esc(posisi)}</span></p>
      </div>
    </div>
  `);

  rows.push(`
    <div class="status-row">
      <div class="status-no">1.</div>
      <div>
        <b>Input Perencanaan</b>
        <p><b>Tanggal:</b> ${fmtDateTimeID(k.tanggal_input)}</p>
        <p><b>Oleh:</b> ${esc(k.input_by || bidangName(k.id_bidang) || "-")}</p>
        <p><b>Kegiatan:</b> ${esc(k.nama_kegiatan || "-")}</p>
        <p><b>Jumlah:</b> ${rupiah(jumlah)}</p>
        <p><b>Metode:</b> ${esc(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</p>
        <p><b>Waktu Pemilihan:</b> ${esc(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-")}</p>
      </div>
    </div>
  `);

  if(k.alasan_penolakan){
    rows.push(`
      <div class="status-row">
        <div class="status-no">2.</div>
        <div>
          <b>Hasil pemeriksaan Verifikator</b>
          <p><b>Status:</b> Perlu perbaikan</p>
          <p><b>Catatan:</b> ${esc(k.alasan_penolakan)}</p>
        </div>
      </div>
    `);
  } else if(st === "DISETUJUI"){
    rows.push(`
      <div class="status-row">
        <div class="status-no">2.</div>
        <div>
          <b>Hasil pemeriksaan Verifikator</b>
          <p><b>Status:</b> Disetujui</p>
        </div>
      </div>
    `);
  }

  if(st === "DIAJUKAN" && (k.alasan_penolakan || String(k.riwayat_perubahan || "").toLowerCase().includes("perbaikan"))){
    rows.push(`
      <div class="status-row">
        <div class="status-no">3.</div>
        <div>
          <b>Perbaikan perencanaan</b>
          <p><b>Status:</b> Menunggu verifikasi perbaikan</p>
          <p>Data perencanaan telah diperbaiki dan diajukan kembali kepada Verifikator.</p>
        </div>
      </div>
    `);
  }

  if(k.alasan_perubahan || toNumber(k.perubahan_ke)){
    rows.push(`
      <div class="status-row">
        <div class="status-no">P.</div>
        <div>
          <b>Pengajuan Perubahan</b>
          <p><b>Perubahan:</b> ${toNumber(k.perubahan_ke) ? `Perubahan Ke-${toNumber(k.perubahan_ke)}` : "-"}</p>
          ${k.alasan_perubahan ? `<p><b>Alasan perubahan:</b> ${esc(k.alasan_perubahan)}</p>` : ""}
        </div>
      </div>
    `);
  }

  if(riwayatRows.length){
    rows.push(`
      <div class="status-row">
        <div class="status-no">R.</div>
        <div>
          <b>Riwayat Perencanaan</b>
          <p>${riwayatRows.map(x => esc(x).replace(/\bADMIN\b/g,"Verifikator").replace(/\bAdmin\b/g,"Verifikator")).join("<br>")}</p>
        </div>
      </div>
    `);
  } else if(!k.alasan_penolakan && !k.alasan_perubahan && st !== "DISETUJUI"){
    rows.push(`
      <div class="status-row">
        <div class="status-no">-</div>
        <div>
          <b>Catatan / Riwayat</b>
          <p>Belum terdapat catatan penyesuaian atau riwayat perubahan.</p>
        </div>
      </div>
    `);
  }

  const html = `<div class="status-modal-backdrop" id="rencanaStatusModal" onclick="if(event.target.id==='rencanaStatusModal') closeRencanaStatusModal()">
    <div class="status-modal-card">
      <div class="status-modal-head">
        <h3>Status Perencanaan</h3>
        <button type="button" onclick="closeRencanaStatusModal()">Tutup</button>
      </div>
      <div class="status-modal-body">
        <div class="status-doc-title">
          <b>${esc(k.nama_kegiatan || "-")}</b>
          <span>${esc(k.id_kegiatan || "-")}</span>
        </div>
        ${rows.join("")}
      </div>
    </div>
  </div>`;
  const old = document.getElementById("rencanaStatusModal");
  if(old) old.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}
function renderPerencanaanRow(k){
  try{
    k = k || {};
    const st = String(k.status_perencanaan||"DIAJUKAN").toUpperCase();
    const locked = isKegiatanLocked(k);
    const aksesBuka = aksesPerencanaanTerbuka();
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const metode = k.metode_pemilihan || metodePemilihanByNilai(jumlah);
    const waktu = k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-";
    const hasNote = !!(k.alasan_penolakan || k.alasan_perubahan || k.riwayat_perubahan || toNumber(k.perubahan_ke));
    const note = `<button class="btn-mini btn-detail" onclick="openRencanaStatusModal('${esc(k.id_kegiatan)}')">${hasNote ? "Lihat Riwayat" : "Lihat"}</button>`;

    let aksi = "";
    if(canManage()){
      if(st === "DIAJUKAN" || st === "PERUBAHAN_DIAJUKAN") aksi = `<button class="btn-mini btn-green" onclick="setujui('${esc(k.id_kegiatan)}')">Setujui</button><button class="btn-mini btn-orange" onclick="tolak('${esc(k.id_kegiatan)}')">Minta Perbaikan</button>`;
      else aksi = `<span class="muted">-</span>`;
    } else if(isReviewer()){
      aksi = `<span class="audit-pill">Read-only</span>`;
    } else if(locked){
      aksi = `<span class="status-done-pill">Selesai</span>`;
    } else if(!aksesBuka){
      aksi = `<span class="lock-badge">Akses perencanaan ditutup</span>`;
    } else {
      if(st === "DITOLAK") aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','repair')">Ajukan Perbaikan</button>`;
      else if(st === "DIAJUKAN") aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','normal')">Edit</button><button class="btn-mini btn-red" onclick="hapusPerencanaan('${esc(k.id_kegiatan)}')">Hapus</button>`;
      else if(st === "DISETUJUI") aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','change')">Ajukan Perubahan</button>`;
      else aksi = `<span class="muted">Menunggu Verifikator</span>`;
    }

    const perubahan = toNumber(k.perubahan_ke) ? `<br><small class="muted">Perubahan Ke-${toNumber(k.perubahan_ke)}</small>` : "";
    const rowClass = locked ? "row-selesai" : (st === "DITOLAK" ? "row-perbaikan" : "row-proses");
    return `<tr class="rencana-row ${rowClass}">
      <td>${esc(k.id_kegiatan)}</td>
      <td>${esc(bidangName(k.id_bidang))}</td>
      <td><b>${esc(k.nama_kegiatan)}</b>${perubahan}</td>
      <td>${esc(k.volume)}</td>
      <td>${esc(k.satuan)}</td>
      <td>${rupiah(k.harga_satuan)}</td>
      <td><b>${rupiah(jumlah)}</b></td>
      <td>${esc(metode)}</td>
      <td>${esc(waktu)}</td>
      <td>${badge(st)}</td>
      <td class="note-cell note-cell-popup">${note}</td>
      <td class="nowrap">${aksi}</td>
    </tr>`;
  }catch(e){
    console.error("ROW_PERENCANAAN_ERROR", e, k);
    return `<tr class="rencana-row row-perbaikan"><td colspan="12">Data kegiatan ${esc(k?.id_kegiatan || "-")} perlu dicek. Detail: ${esc(e.message || e)}</td></tr>`;
  }
}
function openEditModal(id, mode){
  const k = dashboard.perencanaan.find(x => String(x.id_kegiatan)===String(id)); if(!k) return;
  if(isKegiatanLocked(k)){ alert("Kegiatan sudah selesai sampai validasi pencairan, perencanaan terkunci."); return; }
  if(!aksesPerencanaanTerbuka()){ alert("Akses perencanaan bidang sedang ditutup Verifikator. Menu pencairan tetap bisa digunakan."); return; }

  const realMode = mode === "repair" ? "normal" : mode;
  document.getElementById("editMode").value = realMode;
  document.getElementById("editIdKegiatan").value = k.id_kegiatan;
  document.getElementById("editNamaKegiatan").value = k.nama_kegiatan || "";
  document.getElementById("editKeterangan").value = k.keterangan || "";
  document.getElementById("editVolume").value = angkaID(k.volume);
  document.getElementById("editSatuan").value = k.satuan || "";
  document.getElementById("editHarga").value = angkaID(k.harga_satuan);
  if(document.getElementById("editWaktuPemilihan")) document.getElementById("editWaktuPemilihan").value = /^\d{4}-\d{2}-\d{2}$/.test(String(k.waktu_pemilihan||"")) ? k.waktu_pemilihan : "";
  document.getElementById("editAlasanPerubahan").value = "";

  if(mode === "repair"){
    document.getElementById("editModalTitle").innerText = "Ajukan Perbaikan Perencanaan";
    document.getElementById("editModalSub").innerText = "Perbaiki data sesuai catatan Verifikator. Setelah disimpan, status menjadi Menunggu Verifikasi Perbaikan.";
  } else {
    document.getElementById("editModalTitle").innerText = mode === "change" ? `Ajukan Perubahan Perencanaan` : "Edit Perencanaan";
    document.getElementById("editModalSub").innerText = mode === "change" ? `Perubahan akan masuk sebagai Perubahan Ke-${toNumber(k.perubahan_ke)+1} dan menunggu Verifikator.` : "Data akan diajukan kembali ke Verifikator.";
  }
  document.getElementById("alasanPerubahanWrap").classList.toggle("hidden", mode !== "change");
  setAutoTotal("editVolume","editHarga","editTotalPreview");
  document.getElementById("editModal").classList.remove("hidden");
}


/* =========================
   SIMPROV v51 final override
   Riwayat Perencanaan selalu tampil sebagai tahapan, bukan hanya kalau ada riwayat_perubahan.
   ========================= */
function buildRencanaTimeline(k){
  const st = String(k.status_perencanaan || "DIAJUKAN").toUpperCase();
  const posisi = getRencanaPosisiSaatIni(k);
  const lines = [];

  lines.push({
    title:"Input Perencanaan",
    body:`Tanggal: ${fmtDateTimeID(k.tanggal_input)}<br>Oleh: ${esc(k.input_by || bidangName(k.id_bidang) || "-")}<br>Status: Diajukan ke Verifikator`
  });

  if(st === "DISETUJUI"){
    lines.push({
      title:"Hasil pemeriksaan Verifikator",
      body:`Status: Disetujui<br>Posisi saat ini: ${esc(posisi)}`
    });
  } else if(st === "DITOLAK"){
    lines.push({
      title:"Hasil pemeriksaan Verifikator",
      body:`Status: Perlu perbaikan${k.alasan_penolakan ? `<br>Catatan: ${esc(k.alasan_penolakan)}` : ""}`
    });
  } else if(st === "PERUBAHAN_DIAJUKAN"){
    lines.push({
      title:"Pengajuan perubahan",
      body:`Status: Menunggu verifikasi perubahan${k.alasan_perubahan ? `<br>Alasan perubahan: ${esc(k.alasan_perubahan)}` : ""}`
    });
  } else if(st === "DIAJUKAN" && (k.alasan_penolakan || String(k.riwayat_perubahan || "").toLowerCase().includes("perbaikan"))){
    lines.push({
      title:"Perbaikan perencanaan",
      body:"Status: Menunggu verifikasi perbaikan<br>Data telah diperbaiki dan diajukan kembali kepada Verifikator"
    });
  } else if(st === "DIAJUKAN"){
    lines.push({
      title:"Proses pemeriksaan",
      body:"Status: Menunggu verifikasi perencanaan"
    });
  }

  if(k.alasan_perubahan && st !== "PERUBAHAN_DIAJUKAN"){
    lines.push({
      title:"Alasan perubahan",
      body:esc(k.alasan_perubahan)
    });
  }

  const rawHist = String(k.riwayat_perubahan || "").trim();
  if(rawHist){
    rawHist.split(/\n+/).filter(Boolean).forEach(x => {
      lines.push({
        title:"Catatan riwayat",
        body:esc(x).replace(/\bADMIN\b/g,"Verifikator").replace(/\bAdmin\b/g,"Verifikator")
      });
    });
  }

  return lines;
}
function openRencanaStatusModal(idKegiatan){
  const k = (dashboard?.perencanaan || []).find(x => String(x.id_kegiatan) === String(idKegiatan));
  if(!k){ alert("Data perencanaan tidak ditemukan."); return; }

  const st = String(k.status_perencanaan || "DIAJUKAN").toUpperCase();
  const posisi = getRencanaPosisiSaatIni(k);
  const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
  const timeline = buildRencanaTimeline(k);

  const rows = [];
  rows.push(`
    <div class="status-row status-position-row">
      <div class="status-no">✓</div>
      <div>
        <b>Posisi Saat Ini</b>
        <p><span class="status-position-text ${st === "DISETUJUI" ? "pos-valid" : (st === "DITOLAK" ? "pos-repair" : "pos-wait")}">${esc(posisi)}</span></p>
      </div>
    </div>
  `);

  rows.push(`
    <div class="status-row">
      <div class="status-no">1.</div>
      <div>
        <b>Data Perencanaan</b>
        <p><b>Nama kegiatan:</b> ${esc(k.nama_kegiatan || "-")}</p>
        <p><b>Bidang:</b> ${esc(bidangName(k.id_bidang))}</p>
        <p><b>Jumlah:</b> ${rupiah(jumlah)}</p>
        <p><b>Metode:</b> ${esc(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</p>
        <p><b>Waktu Pemilihan:</b> ${esc(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-")}</p>
        <p><b>Tanggal Input:</b> ${fmtDateTimeID(k.tanggal_input)}</p>
      </div>
    </div>
  `);

  rows.push(`
    <div class="status-row">
      <div class="status-no">R.</div>
      <div>
        <b>Riwayat Perencanaan</b>
        <div class="rencana-timeline-list">
          ${timeline.map((x,i)=>`<div class="rencana-timeline-item"><span>${i+1}</span><div><b>${x.title}</b><p>${x.body}</p></div></div>`).join("")}
        </div>
      </div>
    </div>
  `);

  const html = `<div class="status-modal-backdrop" id="rencanaStatusModal" onclick="if(event.target.id==='rencanaStatusModal') closeRencanaStatusModal()">
    <div class="status-modal-card">
      <div class="status-modal-head">
        <h3>Status Perencanaan</h3>
        <button type="button" onclick="closeRencanaStatusModal()">Tutup</button>
      </div>
      <div class="status-modal-body">
        <div class="status-doc-title">
          <b>${esc(k.nama_kegiatan || "-")}</b>
          <span>${esc(k.id_kegiatan || "-")}</span>
        </div>
        ${rows.join("")}
      </div>
    </div>
  </div>`;
  const old = document.getElementById("rencanaStatusModal");
  if(old) old.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}


/* =========================
   SIMPROV v52 final override
   - Dropdown upload dokumen tidak menampilkan jenis dokumen yang sama pada baris tambahan.
   - Verifikator minta perbaikan dokumen mengirim catatan_admin yang benar ke backend.
   ========================= */
function selectedDocKeysInUploadRows(excludeSelect){
  const keys = new Set();
  document.querySelectorAll("#uploadRows .jenisDok").forEach(sel => {
    if(excludeSelect && sel === excludeSelect) return;
    const v = sel.value;
    if(v) keys.add(docTypeKey(v));
  });
  return keys;
}
function docOptionsForSelect(selected="", idKegiatan="", selectEl=null){
  let list = idKegiatan ? remainingDocTypesForKegiatan(idKegiatan) : JENIS_DOKUMEN_SOP;
  const selectedKey = docTypeKey(selected);
  const used = selectedDocKeysInUploadRows(selectEl);
  list = list.filter(x => !used.has(docTypeKey(x)) || docTypeKey(x) === selectedKey);
  if(selected && !list.some(x => docTypeKey(x) === selectedKey)) list = [selected, ...list];
  if(!list.length) return `<option value="" disabled selected>Semua jenis dokumen sudah dipilih/diupload</option>`;
  return list.map(x => `<option value="${esc(x)}" ${docTypeKey(x)===selectedKey?'selected':''}>${esc(x)}</option>`).join("");
}
function docOptionsHtml(selected="", idKegiatan=""){
  return docOptionsForSelect(selected, idKegiatan, null);
}
function refreshUploadJenisDokumenOptions(){
  const idKegiatan = document.getElementById("dokKegiatan")?.value || "";
  document.querySelectorAll("#uploadRows .jenisDok").forEach(sel => {
    const old = sel.value;
    sel.innerHTML = docOptionsForSelect(old, idKegiatan, sel);
    if(!sel.value && sel.options.length) sel.selectedIndex = 0;
  });
}
function updateSaranDokumen(){
  const id = document.getElementById("dokKegiatan")?.value || "";
  const box = document.getElementById("saranDokumen");
  if(box) box.innerHTML = "";
  refreshUploadJenisDokumenOptions();
}
function addUploadRow(){
  const idKegiatan = document.getElementById("dokKegiatan")?.value || "";
  const used = selectedDocKeysInUploadRows(null);
  const remaining = remainingDocTypesForKegiatan(idKegiatan).filter(x => !used.has(docTypeKey(x)));
  if(idKegiatan && !remaining.length){
    alert("Semua jenis dokumen wajib sudah dipilih atau sudah diupload. Jika ada dokumen berstatus PERBAIKAN, gunakan tombol Upload Ulang pada rincian file.");
    return;
  }
  const wrap = document.getElementById("uploadRows");
  const div = document.createElement("div");
  div.className = "doc-upload-row";
  div.innerHTML = `<div class="field"><label>Jenis Dokumen</label><select class="jenisDok" onchange="refreshUploadJenisDokumenOptions()">${remaining.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileDok"></div><button class="btn-red" onclick="removeUploadRow(this)" type="button">Hapus</button>`;
  wrap.appendChild(div);
  refreshUploadJenisDokumenOptions();
}
function removeUploadRow(btn){
  const row = btn.closest(".doc-upload-row");
  if(row) row.remove();
  refreshUploadJenisDokumenOptions();
}
async function uploadDokumen(){
  const idKegiatan = document.getElementById("dokKegiatan")?.value;
  if(!idKegiatan){ alert("Tidak ada kegiatan yang bisa diupload. Jika dokumen berstatus PERBAIKAN, upload ulang dari rincian dokumen di bawah."); return; }
  const rows = [...document.querySelectorAll(".doc-upload-row")];
  const items = rows.map(row => ({jenis:row.querySelector(".jenisDok")?.value || "", file:row.querySelector(".fileDok")?.files?.[0]})).filter(x=>x.file);
  if(!items.length){ alert("Pilih minimal 1 file dokumen."); return; }
  const picked = new Set();
  const remainingKeys = new Set(remainingDocTypesForKegiatan(idKegiatan).map(docTypeKey));
  for(const it of items){
    const key = docTypeKey(it.jenis);
    if(!key){ alert("Jenis dokumen wajib dipilih."); return; }
    if(picked.has(key)){ alert(`Jenis dokumen ${it.jenis} dipilih lebih dari satu kali. Silakan pilih jenis dokumen yang berbeda.`); return; }
    picked.add(key);
    if(!remainingKeys.has(key)){
      alert(`Jenis dokumen ${it.jenis} sudah pernah diupload. Jika perlu perbaikan, gunakan tombol Upload Ulang pada rincian file.`);
      return;
    }
  }
  showLoading(`Upload 1/${items.length} dokumen...`);
  try{
    for(let i=0;i<items.length;i++){
      document.getElementById("loadingText").innerText = `Upload ${i+1}/${items.length} dokumen...`;
      const base64 = await fileToBase64(items[i].file);
      const r = await apiPost({action:"uploadDokumen", user:currentUser, id_kegiatan:idKegiatan, jenis_dokumen:items[i].jenis, file_name:items[i].file.name, mime_type:items[i].file.type, file_base64:base64});
      if(!r.success) throw new Error(r.message);
    }
    alert("Dokumen berhasil diupload."); await loadDashboard(false);
  }catch(e){ alert(e.message || "Gagal upload dokumen."); }
  finally{ hideLoading(); }
}
async function verifDok(id, status){
  showLoading("Verifikasi dokumen...");
  try{
    const r=await apiPost({action:"verifyDokumen", user:currentUser, id_dokumen:id, status_verifikasi:status, catatan_admin:""});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}
async function mintaPerbaikanDok(id){
  const catatan = prompt("Alasan perbaikan dokumen wajib diisi:");
  if(!catatan || !String(catatan).trim()){ alert("Alasan perbaikan wajib diisi."); return; }
  showLoading("Mengirim status perbaikan...");
  try{
    const r=await apiPost({action:"verifyDokumen", user:currentUser, id_dokumen:id, status_verifikasi:"PERBAIKAN", catatan_admin:String(catatan).trim(), catatan_Verifikator:String(catatan).trim()});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}


/* v52 delegated change listener for duplicate prevention */
document.addEventListener('change', function(e){
  if(e.target && e.target.classList && e.target.classList.contains('jenisDok')){
    setTimeout(refreshUploadJenisDokumenOptions, 0);
  }
});


/* =========================
   SIMPROV v53 final override
   Dokumen laporan disesuaikan dengan versi terbaru:
   - posisi saat ini perencanaan,
   - riwayat perencanaan bentuk tahapan,
   - status dokumen, tanggal upload/verifikasi/perbaikan,
   - catatan Verifikator,
   - riwayat dokumen.
   ========================= */
function reportCatatanDokumen(d){
  return d.catatan_Verifikator || d.catatan_admin || d.catatan || "-";
}
function reportRiwayatDokumen(d){
  const rows = [];
  const posisi = typeof getDocPosisiSaatIni === "function" ? getDocPosisiSaatIni(d) : displayStatusText(d.status_verifikasi || "MENUNGGU");
  rows.push(`Posisi saat ini: ${posisi}`);
  rows.push(`Upload awal: ${formatTanggalJam(d.tanggal_upload)} oleh ${d.upload_by || "-"}`);
  if(d.tanggal_verifikasi || d.verifikasi_by || reportCatatanDokumen(d) !== "-"){
    rows.push(`Pemeriksaan Verifikator: ${formatTanggalJam(d.tanggal_verifikasi)} oleh ${d.verifikasi_by || "-"}${reportCatatanDokumen(d) !== "-" ? " - Catatan: " + reportCatatanDokumen(d) : ""}`);
  }
  if(d.tanggal_revisi || d.revisi_by){
    rows.push(`Upload ulang/perbaikan: ${formatTanggalJam(d.tanggal_revisi)} oleh ${d.revisi_by || "-"}`);
  }
  if(d.riwayat_dokumen){
    rows.push(`Riwayat: ${String(d.riwayat_dokumen).replace(/\bADMIN\b/g,"Verifikator").replace(/\bAdmin\b/g,"Verifikator")}`);
  }
  return rows.join("\n");
}
function reportRiwayatPerencanaan(k){
  const posisi = typeof getRencanaPosisiSaatIni === "function" ? getRencanaPosisiSaatIni(k) : displayStatusText(k.status_perencanaan || "-");
  const rows = [];
  rows.push(`Posisi saat ini: ${posisi}`);
  rows.push(`Input perencanaan: ${formatTanggalJam(k.tanggal_input)} oleh ${k.input_by || bidangName(k.id_bidang) || "-"}`);
  const st = String(k.status_perencanaan || "").toUpperCase();
  if(st === "DISETUJUI"){
    rows.push("Hasil pemeriksaan Verifikator: Disetujui");
  }
  if(st === "DITOLAK" || k.alasan_penolakan){
    rows.push(`Hasil pemeriksaan Verifikator: Perlu perbaikan${k.alasan_penolakan ? " - Catatan: " + k.alasan_penolakan : ""}`);
  }
  if(st === "DIAJUKAN" && (k.alasan_penolakan || String(k.riwayat_perubahan || "").toLowerCase().includes("perbaikan"))){
    rows.push("Perbaikan perencanaan: Menunggu verifikasi perbaikan");
  }
  if(k.alasan_perubahan || toNumber(k.perubahan_ke)){
    rows.push(`Pengajuan perubahan: ${toNumber(k.perubahan_ke) ? "Perubahan Ke-" + toNumber(k.perubahan_ke) : "-"}${k.alasan_perubahan ? " - " + k.alasan_perubahan : ""}`);
  }
  if(k.riwayat_perubahan){
    rows.push(`Riwayat: ${String(k.riwayat_perubahan).replace(/\bADMIN\b/g,"Verifikator").replace(/\bAdmin\b/g,"Verifikator")}`);
  }
  return rows.join("\n");
}
function downloadDashboardPDF(){
  const userBidang = String(currentUser?.id_bidang || "");
  const semuaBidang = canSeeAll();
  const rekap = semuaBidang ? (dashboard.rekap || []) : (dashboard.rekap || []).filter(r => String(r.id_bidang) === userBidang);
  const perencanaan = semuaBidang ? (dashboard.perencanaan || []) : (dashboard.perencanaan || []).filter(k => String(k.id_bidang) === userBidang);
  const dokumen = semuaBidang ? (dashboard.dokumen || []) : (dashboard.dokumen || []).filter(d => String(d.id_bidang) === userBidang);

  const pagu = rekap.reduce((s,r)=>s+toNumber(r.pagu),0);
  const total = rekap.reduce((s,r)=>s+toNumber(r.total_perencanaan),0);
  const sisa = pagu - total;
  const valid = dokumen.filter(d=>isDocValidKeuanganV70(d)).length;
  const perbaikanDok = dokumen.filter(d=>["PERBAIKAN","DITOLAK"].includes(String(d.status_verifikasi||"").toUpperCase())).length;
  const menungguDok = dokumen.filter(d=>["","MENUNGGU"].includes(String(d.status_verifikasi||"").toUpperCase())).length;
  const perluPersetujuan = perencanaan.filter(k => ["DIAJUKAN","PERUBAHAN_DIAJUKAN"].includes(String(k.status_perencanaan||"").toUpperCase())).length;
  const perluPerbaikanRencana = perencanaan.filter(k => String(k.status_perencanaan||"").toUpperCase()==="DITOLAK").length;
  const bidangOver = rekap.filter(r => toNumber(r.sisa_pagu) < 0).length;

  const rowsRekap = rekap.map((r,i)=>`<tr>
    <td>${i+1}</td>
    <td>${plainText(r.nama_bidang)}<br><span class="small">${plainText(r.id_bidang)}</span></td>
    <td>${rupiah(r.pagu)}</td>
    <td>${rupiah(r.total_perencanaan)}</td>
    <td class="${toNumber(r.sisa_pagu)<0?'red':''}">${rupiah(r.sisa_pagu)}</td>
    <td>${plainText(r.jumlah_kegiatan||0)}</td>
    <td>${plainText(r.dokumen_upload||0)}</td>
    <td>${plainText(r.dokumen_valid||0)}</td>
    <td>${plainText(r.status_akses||'-')}</td>
    <td class="status">${plainText(toNumber(r.sisa_pagu)<0?'MELEBIHI PAGU':displayStatusText(r.status_progress||'-'))}</td>
  </tr>`).join("");

  const rowsPerencanaan = perencanaan.map((k,i)=>{
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const posisi = typeof getRencanaPosisiSaatIni === "function" ? getRencanaPosisiSaatIni(k) : displayStatusText(k.status_perencanaan || "-");
    const riwayat = reportRiwayatPerencanaan(k);
    return `<tr>
      <td>${i+1}</td>
      <td>${plainText(k.id_kegiatan)}</td>
      <td>${plainText(bidangName(k.id_bidang))}</td>
      <td>${plainText(k.nama_kegiatan)}</td>
      <td>${plainText(k.keterangan||'-')}</td>
      <td>${plainText(k.volume||0)} ${plainText(k.satuan||'')}</td>
      <td>${rupiah(k.harga_satuan)}</td>
      <td>${rupiah(jumlah)}</td>
      <td>${plainText(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</td>
      <td>${plainText(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-")}</td>
      <td class="status">${plainText(posisi)}</td>
      <td>${plainText(formalReportText(riwayat)).replace(/\n/g,'<br>')}</td>
      <td>${plainText(displayStatusText(getPencairanStatus(k.id_kegiatan)))}</td>
    </tr>`;
  }).join("");

  const rowsDokumen = dokumen.map((d,i)=>{
    const posisi = typeof getDocPosisiSaatIni === "function" ? getDocPosisiSaatIni(d) : displayStatusText(d.status_verifikasi || "MENUNGGU");
    return `<tr>
      <td>${i+1}</td>
      <td>${plainText(bidangName(d.id_bidang))}</td>
      <td>${plainText(kegiatanName(d.id_kegiatan))}<br><span class="small">${plainText(d.id_kegiatan)}</span></td>
      <td>${plainText(normalizeJenisDokumenLabel(d.jenis_dokumen))}</td>
      <td>${plainText(d.nama_file||'-')}</td>
      <td>${htmlLink(d.url_file, 'Buka File')}</td>
      <td class="status">${plainText(posisi)}</td>
      <td>${plainText(displayStatusText(getPencairanStatus(d.id_kegiatan)))}</td>
      <td>${plainText(reportCatatanDokumen(d))}</td>
      <td>${plainText(formatTanggalJam(d.tanggal_upload))}</td>
      <td>${plainText(formatTanggalJam(d.tanggal_verifikasi))}</td>
      <td>${plainText(formatTanggalJam(d.tanggal_revisi))}</td>
      <td>${plainText(formalReportText(reportRiwayatDokumen(d))).replace(/\n/g,'<br>')}</td>
    </tr>`;
  }).join("");

  const body = `<div class="summary">
    <div class="card"><span>Total Pagu</span><b>${rupiah(pagu)}</b></div>
    <div class="card"><span>Total Perencanaan</span><b>${rupiah(total)}</b></div>
    <div class="card"><span>Sisa Pagu</span><b class="${sisa<0?'red':''}">${rupiah(sisa)}</b></div>
    <div class="card"><span>Dokumen Valid</span><b>${valid}/${dokumen.length}</b></div>
    <div class="card"><span>Perlu Pemeriksaan</span><b>${perluPersetujuan} rencana / ${menungguDok} dokumen</b></div>
  </div>
  <div class="note"><b>Ringkasan Pemeriksaan:</b> ${perluPerbaikanRencana} perencanaan perlu perbaikan, ${perbaikanDok} dokumen perlu perbaikan, ${bidangOver} bidang melebihi pagu.</div>
  <h3>1. Rekapitulasi Anggaran per Bidang</h3>
  <table><thead><tr><th>No</th><th>Bidang</th><th>Pagu</th><th>Perencanaan</th><th>Sisa</th><th>Kegiatan</th><th>Dok Upload</th><th>Dok Valid</th><th>Akses</th><th>Progress</th></tr></thead><tbody>${rowsRekap || `<tr><td colspan="10">Belum ada data</td></tr>`}</tbody></table>
  <h3>2. Rekap Data Perencanaan dan Riwayat Pemeriksaan</h3>
  <table><thead><tr><th>No</th><th>ID Kegiatan</th><th>Bidang</th><th>Nama Kegiatan</th><th>Keterangan</th><th>Volume</th><th>Harga Satuan</th><th>Jumlah</th><th>Metode</th><th>Waktu Pemilihan</th><th>Posisi Saat Ini</th><th>Riwayat Perencanaan</th><th>Status Pencairan</th></tr></thead><tbody>${rowsPerencanaan || `<tr><td colspan="13">Belum ada data perencanaan</td></tr>`}</tbody></table>
  <h3>3. Rekap Dokumen Pencairan, Verifikasi, dan Link File</h3>
  <table><thead><tr><th>No</th><th>Bidang</th><th>Kegiatan</th><th>Jenis Dokumen</th><th>Nama File</th><th>Link File</th><th>Posisi Dokumen</th><th>Status Pencairan</th><th>Catatan Verifikator</th><th>Tanggal Upload</th><th>Tanggal Verifikasi</th><th>Tanggal Perbaikan</th><th>Riwayat Dokumen</th></tr></thead><tbody>${rowsDokumen || `<tr><td colspan="13">Belum ada dokumen pencairan</td></tr>`}</tbody></table>`;

  openReportWindow(semuaBidang ? "Laporan Monitoring Keseluruhan SIMPROV" : "Laporan Monitoring Bidang " + (currentUser?.nama_bidang || currentUser?.nama || ""), body);
}
function downloadPerencanaanPDF(){
  const data = getFilteredRencana();
  const rows = data.map((k,i)=>{
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const posisi = typeof getRencanaPosisiSaatIni === "function" ? getRencanaPosisiSaatIni(k) : displayStatusText(k.status_perencanaan || "-");
    return `<tr>
      <td>${i+1}</td><td>${plainText(k.id_kegiatan)}</td><td>${plainText(bidangName(k.id_bidang))}</td><td>${plainText(k.nama_kegiatan)}</td>
      <td>${plainText(k.keterangan||"-")}</td><td>${plainText(k.volume||0)} ${plainText(k.satuan||"-")}</td>
      <td>${rupiah(k.harga_satuan)}</td><td>${rupiah(jumlah)}</td>
      <td>${plainText(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</td><td>${plainText(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-")}</td>
      <td class="status">${plainText(posisi)}</td><td>${plainText(formalReportText(reportRiwayatPerencanaan(k))).replace(/\n/g,"<br>")}</td><td>${plainText(displayStatusText(getPencairanStatus(k.id_kegiatan)))}</td>
    </tr>`;
  }).join("");
  openReportWindow("Rekap Perencanaan", `<div class="note">Laporan mengikuti filter yang sedang tampil pada aplikasi.</div><table><thead><tr><th>No</th><th>ID</th><th>Bidang</th><th>Nama Kegiatan</th><th>Keterangan</th><th>Volume</th><th>Harga Satuan</th><th>Jumlah</th><th>Metode</th><th>Waktu Pemilihan</th><th>Posisi Saat Ini</th><th>Riwayat Perencanaan</th><th>Status Pencairan</th></tr></thead><tbody>${rows || `<tr><td colspan="13">Belum ada data</td></tr>`}</tbody></table>`);
}

/* SIMPROV v54 final override - laporan dokumen per kegiatan dan riwayat ringkas */
function reportCatatanDokumenV54(d){
  return d.catatan_Verifikator || d.catatan_admin || d.catatan || "-";
}
function reportDocStatusRawV54(d){
  return String(d.status_verifikasi || "MENUNGGU").toUpperCase();
}
function reportGroupDocStatusV54(docs){
  if(!docs || !docs.length) return "BELUM ADA DOKUMEN";
  if(docs.some(d => ["PERBAIKAN","DITOLAK"].includes(reportDocStatusRawV54(d)))) return "PERLU PERBAIKAN";
  if(docs.every(d => reportDocStatusRawV54(d) === "VALID")) return "SUDAH DIVERIFIKASI";
  return "MENUNGGU VERIFIKASI";
}
function reportGroupPencairanStatusV54(idKegiatan, docs){
  const st = reportGroupDocStatusV54(docs);
  if(st === "SUDAH DIVERIFIKASI") return "SUDAH DIVERIFIKASI";
  if(st === "PERLU PERBAIKAN") return "PERLU PERBAIKAN";
  if(st === "MENUNGGU VERIFIKASI") return "MENUNGGU VERIFIKASI";
  return displayStatusText(getPencairanStatus(idKegiatan));
}
function reportTahapanDokumenRingkasV54(d){
  const rows = [];
  rows.push(`Upload awal: ${formatTanggalJam(d.tanggal_upload)} oleh ${d.upload_by || "-"}`);
  if(d.tanggal_verifikasi || d.verifikasi_by || reportCatatanDokumenV54(d) !== "-"){
    const st = reportDocStatusRawV54(d);
    const hasil = st === "VALID" ? "Dokumen valid" : (st === "PERBAIKAN" || st === "DITOLAK" ? "Perlu perbaikan" : displayStatusText(st));
    rows.push(`Pemeriksaan Verifikator: ${formatTanggalJam(d.tanggal_verifikasi)} oleh ${d.verifikasi_by || "-"} - ${hasil}${reportCatatanDokumenV54(d) !== "-" ? " (" + reportCatatanDokumenV54(d) + ")" : ""}`);
  }
  if(d.tanggal_revisi || d.revisi_by){
    rows.push(`Upload ulang/perbaikan: ${formatTanggalJam(d.tanggal_revisi)} oleh ${d.revisi_by || "-"}`);
  }
  const stAkhir = reportDocStatusRawV54(d);
  if(stAkhir === "VALID") rows.push("Posisi akhir: Sudah diverifikasi");
  else if(stAkhir === "PERBAIKAN" || stAkhir === "DITOLAK") rows.push("Posisi akhir: Perlu perbaikan");
  else if(stAkhir === "MENUNGGU" && d.tanggal_revisi) rows.push("Posisi akhir: Menunggu verifikasi perbaikan");
  else rows.push("Posisi akhir: Menunggu verifikasi");
  return rows.join("\n");
}
function reportDokumenGroupedRowsV54(dokumen){
  const grouped = {};
  (dokumen || []).forEach(d => {
    const id = String(d.id_kegiatan || "-");
    if(!grouped[id]) grouped[id] = [];
    grouped[id].push(d);
  });
  return Object.entries(grouped).map(([id, docs], i) => {
    const first = docs[0] || {};
    const dokList = docs.map((d,idx)=>`<div class="doc-report-item">
      <b>${idx+1}. ${plainText(normalizeJenisDokumenLabel(d.jenis_dokumen))}</b><br>
      File: ${plainText(d.nama_file || "-")} ${d.url_file ? ` - ${htmlLink(d.url_file, "Buka File")}` : ""}<br>
      Status Dokumen: <b>${plainText(displayStatusText(d.status_verifikasi || "MENUNGGU"))}</b><br>
      Catatan Verifikator: ${plainText(reportCatatanDokumenV54(d))}<br>
      Tahapan: ${plainText(reportTahapanDokumenRingkasV54(d)).replace(/\n/g,"<br>")}
    </div>`).join("");
    return `<tr>
      <td>${i+1}</td>
      <td>${plainText(bidangName(first.id_bidang))}</td>
      <td>${plainText(kegiatanName(id))}<br><span class="small">${plainText(id)}</span></td>
      <td class="status">${plainText(reportGroupDocStatusV54(docs))}</td>
      <td class="status">${plainText(reportGroupPencairanStatusV54(id, docs))}</td>
      <td>${docs.length} dokumen</td>
      <td>${dokList}</td>
    </tr>`;
  }).join("");
}
function downloadDashboardPDF(){
  const userBidang = String(currentUser?.id_bidang || "");
  const semuaBidang = canSeeAll();
  const rekap = semuaBidang ? (dashboard.rekap || []) : (dashboard.rekap || []).filter(r => String(r.id_bidang) === userBidang);
  const perencanaan = semuaBidang ? (dashboard.perencanaan || []) : (dashboard.perencanaan || []).filter(k => String(k.id_bidang) === userBidang);
  const dokumen = semuaBidang ? (dashboard.dokumen || []) : (dashboard.dokumen || []).filter(d => String(d.id_bidang) === userBidang);
  const pagu = rekap.reduce((s,r)=>s+toNumber(r.pagu),0);
  const total = rekap.reduce((s,r)=>s+toNumber(r.total_perencanaan),0);
  const sisa = pagu - total;
  const valid = dokumen.filter(d=>isDocValidKeuanganV70(d)).length;
  const perbaikanDok = dokumen.filter(d=>["PERBAIKAN","DITOLAK"].includes(String(d.status_verifikasi||"").toUpperCase())).length;
  const menungguDok = dokumen.filter(d=>["","MENUNGGU"].includes(String(d.status_verifikasi||"").toUpperCase())).length;
  const perluPersetujuan = perencanaan.filter(k => ["DIAJUKAN","PERUBAHAN_DIAJUKAN"].includes(String(k.status_perencanaan||"").toUpperCase())).length;
  const perluPerbaikanRencana = perencanaan.filter(k => String(k.status_perencanaan||"").toUpperCase()==="DITOLAK").length;
  const bidangOver = rekap.filter(r => toNumber(r.sisa_pagu) < 0).length;

  const rowsRekap = rekap.map((r,i)=>`<tr><td>${i+1}</td><td>${plainText(r.nama_bidang)}<br><span class="small">${plainText(r.id_bidang)}</span></td><td>${rupiah(r.pagu)}</td><td>${rupiah(r.total_perencanaan)}</td><td class="${toNumber(r.sisa_pagu)<0?'red':''}">${rupiah(r.sisa_pagu)}</td><td>${plainText(r.jumlah_kegiatan||0)}</td><td>${plainText(r.dokumen_upload||0)}</td><td>${plainText(r.dokumen_valid||0)}</td><td>${plainText(r.status_akses||'-')}</td><td class="status">${plainText(toNumber(r.sisa_pagu)<0?'MELEBIHI PAGU':displayStatusText(r.status_progress||'-'))}</td></tr>`).join("");

  const rowsPerencanaan = perencanaan.map((k,i)=>{
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const posisi = typeof getRencanaPosisiSaatIni === "function" ? getRencanaPosisiSaatIni(k) : displayStatusText(k.status_perencanaan || "-");
    const riwayat = reportRiwayatPerencanaan(k);
    return `<tr><td>${i+1}</td><td>${plainText(k.id_kegiatan)}</td><td>${plainText(bidangName(k.id_bidang))}</td><td>${plainText(k.nama_kegiatan)}</td><td>${plainText(k.keterangan||'-')}</td><td>${plainText(k.volume||0)} ${plainText(k.satuan||'')}</td><td>${rupiah(k.harga_satuan)}</td><td>${rupiah(jumlah)}</td><td>${plainText(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</td><td>${plainText(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-")}</td><td class="status">${plainText(posisi)}</td><td>${plainText(formalReportText(riwayat)).replace(/\n/g,'<br>')}</td><td>${plainText(displayStatusText(getPencairanStatus(k.id_kegiatan)))}</td></tr>`;
  }).join("");

  const rowsDokumenGrouped = reportDokumenGroupedRowsV54(dokumen);

  const body = `<div class="summary"><div class="card"><span>Total Pagu</span><b>${rupiah(pagu)}</b></div><div class="card"><span>Total Perencanaan</span><b>${rupiah(total)}</b></div><div class="card"><span>Sisa Pagu</span><b class="${sisa<0?'red':''}">${rupiah(sisa)}</b></div><div class="card"><span>Dokumen Valid</span><b>${valid}/${dokumen.length}</b></div><div class="card"><span>Perlu Pemeriksaan</span><b>${perluPersetujuan} rencana / ${menungguDok} dokumen</b></div></div>
  <div class="note"><b>Ringkasan Pemeriksaan:</b> ${perluPerbaikanRencana} perencanaan perlu perbaikan, ${perbaikanDok} dokumen perlu perbaikan, ${bidangOver} bidang melebihi pagu.</div>
  <h3>1. Rekapitulasi Anggaran per Bidang</h3><table><thead><tr><th>No</th><th>Bidang</th><th>Pagu</th><th>Perencanaan</th><th>Sisa</th><th>Kegiatan</th><th>Dok Upload</th><th>Dok Valid</th><th>Akses</th><th>Progress</th></tr></thead><tbody>${rowsRekap || `<tr><td colspan="10">Belum ada data</td></tr>`}</tbody></table>
  <h3>2. Rekap Data Perencanaan dan Riwayat Pemeriksaan</h3><table><thead><tr><th>No</th><th>ID Kegiatan</th><th>Bidang</th><th>Nama Kegiatan</th><th>Keterangan</th><th>Volume</th><th>Harga Satuan</th><th>Jumlah</th><th>Metode</th><th>Waktu Pemilihan</th><th>Posisi Saat Ini</th><th>Riwayat Perencanaan</th><th>Status Pencairan</th></tr></thead><tbody>${rowsPerencanaan || `<tr><td colspan="13">Belum ada data perencanaan</td></tr>`}</tbody></table>
  <h3>3. Rekap Dokumen Pencairan per Kegiatan</h3><table><thead><tr><th>No</th><th>Bidang</th><th>Kegiatan</th><th>Status Dokumen Kegiatan</th><th>Status Pencairan Kegiatan</th><th>Jumlah Dokumen</th><th>Rincian Dokumen dan Tahapan Proses</th></tr></thead><tbody>${rowsDokumenGrouped || `<tr><td colspan="7">Belum ada dokumen pencairan</td></tr>`}</tbody></table>`;

  openReportWindow(semuaBidang ? "Laporan Monitoring Keseluruhan SIMPROV" : "Laporan Monitoring Bidang " + (currentUser?.nama_bidang || currentUser?.nama || ""), body);
}


/* =========================
   SIMPROV v55 final override
   Laporan untuk Admin/SEKDA/Auditor juga wajib memakai format terbaru:
   - dokumen dikelompokkan per kegiatan
   - riwayat dokumen ringkas tahapan
   - status pencairan kegiatan mengacu status dokumen kegiatan
   ========================= */
function reportCatatanDokumenV55(d){
  return d.catatan_Verifikator || d.catatan_admin || d.catatan || "-";
}
function reportDocStatusRawV55(d){
  return String(d.status_verifikasi || "MENUNGGU").toUpperCase();
}
function reportGroupDocStatusV55(docs){
  if(!docs || !docs.length) return "BELUM ADA DOKUMEN";
  if(docs.some(d => ["PERBAIKAN","DITOLAK"].includes(reportDocStatusRawV55(d)))) return "PERLU PERBAIKAN";
  if(docs.every(d => reportDocStatusRawV55(d) === "VALID")) return "SUDAH DIVERIFIKASI";
  return "MENUNGGU VERIFIKASI";
}
function reportGroupPencairanStatusV55(idKegiatan, docs){
  const st = reportGroupDocStatusV55(docs);
  if(st === "SUDAH DIVERIFIKASI") return "SUDAH DIVERIFIKASI";
  if(st === "PERLU PERBAIKAN") return "PERLU PERBAIKAN";
  if(st === "MENUNGGU VERIFIKASI") return "MENUNGGU VERIFIKASI";
  return displayStatusText(getPencairanStatus(idKegiatan));
}
function reportTahapanDokumenRingkasV55(d){
  const rows = [];
  rows.push(`Upload awal: ${formatTanggalJam(d.tanggal_upload)} oleh ${d.upload_by || "-"}`);

  if(d.tanggal_verifikasi || d.verifikasi_by || reportCatatanDokumenV55(d) !== "-"){
    const st = reportDocStatusRawV55(d);
    const hasil = st === "VALID" ? "Dokumen valid" : (st === "PERBAIKAN" || st === "DITOLAK" ? "Perlu perbaikan" : displayStatusText(st));
    rows.push(`Pemeriksaan Verifikator: ${formatTanggalJam(d.tanggal_verifikasi)} oleh ${d.verifikasi_by || "-"} - ${hasil}${reportCatatanDokumenV55(d) !== "-" ? " (" + reportCatatanDokumenV55(d) + ")" : ""}`);
  }

  if(d.tanggal_revisi || d.revisi_by){
    rows.push(`Upload ulang/perbaikan: ${formatTanggalJam(d.tanggal_revisi)} oleh ${d.revisi_by || "-"}`);
  }

  const stAkhir = reportDocStatusRawV55(d);
  if(stAkhir === "VALID") rows.push("Posisi akhir: Sudah diverifikasi");
  else if(stAkhir === "PERBAIKAN" || stAkhir === "DITOLAK") rows.push("Posisi akhir: Perlu perbaikan");
  else if(stAkhir === "MENUNGGU" && d.tanggal_revisi) rows.push("Posisi akhir: Menunggu verifikasi perbaikan");
  else rows.push("Posisi akhir: Menunggu verifikasi");

  return rows.join("\n");
}
function reportRiwayatPerencanaanV55(k){
  if(typeof reportRiwayatPerencanaan === "function"){
    return reportRiwayatPerencanaan(k);
  }
  const posisi = typeof getRencanaPosisiSaatIni === "function" ? getRencanaPosisiSaatIni(k) : displayStatusText(k.status_perencanaan || "-");
  const rows = [];
  rows.push(`Posisi saat ini: ${posisi}`);
  rows.push(`Input perencanaan: ${formatTanggalJam(k.tanggal_input)} oleh ${k.input_by || bidangName(k.id_bidang) || "-"}`);
  if(k.alasan_penolakan) rows.push(`Hasil pemeriksaan Verifikator: Perlu perbaikan - ${k.alasan_penolakan}`);
  if(k.riwayat_perubahan) rows.push(String(k.riwayat_perubahan).replace(/\bADMIN\b/g,"Verifikator").replace(/\bAdmin\b/g,"Verifikator"));
  return rows.join("\n");
}
function reportDokumenGroupedRowsV55(dokumen){
  const grouped = {};
  (dokumen || []).forEach(d => {
    const id = String(d.id_kegiatan || "-");
    if(!grouped[id]) grouped[id] = [];
    grouped[id].push(d);
  });

  return Object.entries(grouped).map(([id, docs], i) => {
    const first = docs[0] || {};
    const valid = docs.filter(d => reportDocStatusRawV55(d) === "VALID").length;
    const dokList = docs.map((d,idx)=>`<div class="doc-report-item">
      <b>${idx+1}. ${plainText(normalizeJenisDokumenLabel(d.jenis_dokumen))}</b><br>
      File: ${plainText(d.nama_file || "-")} ${d.url_file ? ` - ${htmlLink(d.url_file, "Buka File")}` : ""}<br>
      Status Dokumen: <b>${plainText(displayStatusText(d.status_verifikasi || "MENUNGGU"))}</b><br>
      Catatan Verifikator: ${plainText(reportCatatanDokumenV55(d))}<br>
      Tahapan: ${plainText(reportTahapanDokumenRingkasV55(d)).replace(/\n/g,"<br>")}
    </div>`).join("");

    return `<tr>
      <td>${i+1}</td>
      <td>${plainText(bidangName(first.id_bidang))}</td>
      <td>${plainText(kegiatanName(id))}<br><span class="small">${plainText(id)}</span></td>
      <td class="status">${plainText(reportGroupDocStatusV55(docs))}</td>
      <td class="status">${plainText(reportGroupPencairanStatusV55(id, docs))}</td>
      <td>${valid}/${docs.length} valid</td>
      <td>${dokList}</td>
    </tr>`;
  }).join("");
}
function buildMonitoringReportBodyV55(semuaBidang){
  const userBidang = String(currentUser?.id_bidang || "");
  const rekap = semuaBidang ? (dashboard.rekap || []) : (dashboard.rekap || []).filter(r => String(r.id_bidang) === userBidang);
  const perencanaan = semuaBidang ? (dashboard.perencanaan || []) : (dashboard.perencanaan || []).filter(k => String(k.id_bidang) === userBidang);
  const dokumen = semuaBidang ? (dashboard.dokumen || []) : (dashboard.dokumen || []).filter(d => String(d.id_bidang) === userBidang);

  const pagu = rekap.reduce((s,r)=>s+toNumber(r.pagu),0);
  const total = rekap.reduce((s,r)=>s+toNumber(r.total_perencanaan),0);
  const sisa = pagu - total;
  const valid = dokumen.filter(d=>isDocValidKeuanganV70(d)).length;
  const perbaikanDok = dokumen.filter(d=>["PERBAIKAN","DITOLAK"].includes(String(d.status_verifikasi||"").toUpperCase())).length;
  const menungguDok = dokumen.filter(d=>["","MENUNGGU"].includes(String(d.status_verifikasi||"").toUpperCase())).length;
  const perluPersetujuan = perencanaan.filter(k => ["DIAJUKAN","PERUBAHAN_DIAJUKAN"].includes(String(k.status_perencanaan||"").toUpperCase())).length;
  const perluPerbaikanRencana = perencanaan.filter(k => String(k.status_perencanaan||"").toUpperCase()==="DITOLAK").length;
  const bidangOver = rekap.filter(r => toNumber(r.sisa_pagu) < 0).length;

  const rowsRekap = rekap.map((r,i)=>`<tr>
    <td>${i+1}</td>
    <td>${plainText(r.nama_bidang)}<br><span class="small">${plainText(r.id_bidang)}</span></td>
    <td>${rupiah(r.pagu)}</td>
    <td>${rupiah(r.total_perencanaan)}</td>
    <td class="${toNumber(r.sisa_pagu)<0?'red':''}">${rupiah(r.sisa_pagu)}</td>
    <td>${plainText(r.jumlah_kegiatan||0)}</td>
    <td>${plainText(r.dokumen_upload||0)}</td>
    <td>${plainText(r.dokumen_valid||0)}</td>
    <td>${plainText(r.status_akses||'-')}</td>
    <td class="status">${plainText(toNumber(r.sisa_pagu)<0?'MELEBIHI PAGU':displayStatusText(r.status_progress||'-'))}</td>
  </tr>`).join("");

  const rowsPerencanaan = perencanaan.map((k,i)=>{
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const posisi = typeof getRencanaPosisiSaatIni === "function" ? getRencanaPosisiSaatIni(k) : displayStatusText(k.status_perencanaan || "-");
    const riwayat = reportRiwayatPerencanaanV55(k);
    return `<tr>
      <td>${i+1}</td>
      <td>${plainText(k.id_kegiatan)}</td>
      <td>${plainText(bidangName(k.id_bidang))}</td>
      <td>${plainText(k.nama_kegiatan)}</td>
      <td>${plainText(k.keterangan||'-')}</td>
      <td>${plainText(k.volume||0)} ${plainText(k.satuan||'')}</td>
      <td>${rupiah(k.harga_satuan)}</td>
      <td>${rupiah(jumlah)}</td>
      <td>${plainText(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</td>
      <td>${plainText(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-")}</td>
      <td class="status">${plainText(posisi)}</td>
      <td>${plainText(formalReportText(riwayat)).replace(/\n/g,'<br>')}</td>
      <td>${plainText(displayStatusText(getPencairanStatus(k.id_kegiatan)))}</td>
    </tr>`;
  }).join("");

  const rowsDokumenGrouped = reportDokumenGroupedRowsV55(dokumen);

  return `<div class="summary">
    <div class="card"><span>Total Pagu</span><b>${rupiah(pagu)}</b></div>
    <div class="card"><span>Total Perencanaan</span><b>${rupiah(total)}</b></div>
    <div class="card"><span>Sisa Pagu</span><b class="${sisa<0?'red':''}">${rupiah(sisa)}</b></div>
    <div class="card"><span>Dokumen Valid</span><b>${valid}/${dokumen.length}</b></div>
    <div class="card"><span>Perlu Pemeriksaan</span><b>${perluPersetujuan} rencana / ${menungguDok} dokumen</b></div>
  </div>
  <div class="note"><b>Ringkasan Pemeriksaan:</b> ${perluPerbaikanRencana} perencanaan perlu perbaikan, ${perbaikanDok} dokumen perlu perbaikan, ${bidangOver} bidang melebihi pagu.</div>

  <h3>1. Rekapitulasi Anggaran per Bidang</h3>
  <table><thead><tr><th>No</th><th>Bidang</th><th>Pagu</th><th>Perencanaan</th><th>Sisa</th><th>Kegiatan</th><th>Dok Upload</th><th>Dok Valid</th><th>Akses</th><th>Progress</th></tr></thead><tbody>${rowsRekap || `<tr><td colspan="10">Belum ada data</td></tr>`}</tbody></table>

  <h3>2. Rekap Data Perencanaan dan Riwayat Pemeriksaan</h3>
  <table><thead><tr><th>No</th><th>ID Kegiatan</th><th>Bidang</th><th>Nama Kegiatan</th><th>Keterangan</th><th>Volume</th><th>Harga Satuan</th><th>Jumlah</th><th>Metode</th><th>Waktu Pemilihan</th><th>Posisi Saat Ini</th><th>Riwayat Perencanaan</th><th>Status Pencairan</th></tr></thead><tbody>${rowsPerencanaan || `<tr><td colspan="13">Belum ada data perencanaan</td></tr>`}</tbody></table>

  <h3>3. Rekap Dokumen Pencairan per Kegiatan</h3>
  <table><thead><tr><th>No</th><th>Bidang</th><th>Kegiatan</th><th>Status Dokumen Kegiatan</th><th>Status Pencairan Kegiatan</th><th>Dokumen Valid</th><th>Rincian Dokumen dan Tahapan Proses</th></tr></thead><tbody>${rowsDokumenGrouped || `<tr><td colspan="7">Belum ada dokumen pencairan</td></tr>`}</tbody></table>`;
}
function downloadDashboardPDF(){
  const semuaBidang = canSeeAll();
  const title = semuaBidang ? "Laporan Monitoring Keseluruhan SIMPROV" : "Laporan Monitoring Bidang " + (currentUser?.nama_bidang || currentUser?.nama || "");
  openReportWindow(title, buildMonitoringReportBodyV55(semuaBidang));
}
function renderLaporan(){
  const semuaBidang = canSeeAll();
  const title = semuaBidang ? "Laporan Monitoring Keseluruhan SIMPROV" : "Laporan Monitoring Bidang " + (currentUser?.nama_bidang || currentUser?.nama || "");
  openReportWindow(title, buildMonitoringReportBodyV55(semuaBidang));
}
function cetakLaporan(){ downloadDashboardPDF(); }
function generateReport(){ downloadDashboardPDF(); }
function downloadLaporanPDF(){ downloadDashboardPDF(); }


/* =========================
   SIMPROV v56 final override
   Validasi tombol dokumen Verifikator:
   - Jika dokumen sudah VALID, tombol Valid/Perbaikan nonaktif.
   - Jika dokumen status PERBAIKAN/DITOLAK, Verifikator menunggu user upload ulang, tombol nonaktif.
   - Jika dokumen MENUNGGU, tombol Valid/Perbaikan aktif.
   ========================= */
function canVerifyDocumentNowV56(d){
  const st = String(d?.status_verifikasi || "MENUNGGU").toUpperCase();
  return st === "MENUNGGU" || st === "";
}
function docActionInfoV56(d){
  const st = String(d?.status_verifikasi || "MENUNGGU").toUpperCase();
  if(st === "VALID"){
    return {active:false, label:"Dokumen sudah valid", cls:"valid"};
  }
  if(st === "PERBAIKAN" || st === "DITOLAK"){
    return {active:false, label:"Menunggu upload perbaikan dari bidang", cls:"repair"};
  }
  return {active:true, label:"Menunggu verifikasi", cls:"wait"};
}
function renderDokumenGroupRow(g){
  const stGroup = groupDocStatus(g);
  const stCair = getPencairanStatus(g.id_kegiatan);
  const isCollapsed = docGroupCollapse[g.id_kegiatan] === undefined ? false : !!docGroupCollapse[g.id_kegiatan];

  const docsHtml = (g.docs || []).map(d => {
    const st = String(d.status_verifikasi || 'MENUNGGU').toUpperCase();
    const info = docActionInfoV56(d);
    let actionHtml = `<span class="muted">-</span>`;

    if(canManage()){
      if(info.active){
        actionHtml = `<div class="doc-file-actions v39-file-actions">
          <button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button>
          <button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button>
        </div>`;
      }else{
        actionHtml = `<div class="doc-file-actions v56-disabled-actions">
          <span class="doc-action-lock ${esc(info.cls)}">${esc(info.label)}</span>
          <button class="btn-mini btn-disabled" disabled>Valid</button>
          <button class="btn-mini btn-disabled" disabled>Perbaikan</button>
        </div>`;
      }
    } else if(isReviewer()){
      actionHtml = `<span class="audit-pill">Read-only</span>`;
    } else if(st === 'PERBAIKAN' || st === 'DITOLAK'){
      actionHtml = `<div class="doc-action-box per-file-revision compact-revision">
        <div class="revision-title">Upload Ulang</div>
        <input type="file" id="revisi_${esc(d.id_dokumen)}">
        <button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button>
      </div>`;
    }

    return `<div class="doc-item doc-item-v47 ${st==='PERBAIKAN'||st==='DITOLAK'?'doc-item-repair':''}">
      <div class="doc-main-info">
        <b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || '-')}</b>
        <small class="muted">${esc(d.nama_file || '-')}</small>
      </div>
      <div class="doc-link">${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file || '-')}</div>
      <div class="doc-status">${badge(d.status_verifikasi || 'MENUNGGU')}</div>
      <div class="doc-file-note-action compact-status-action">
        <button class="btn-mini btn-detail" onclick="openDocStatusModal('${esc(d.id_dokumen)}')">Lihat Status</button>
        ${(d.catatan_Verifikator || d.catatan_admin) ? `<span class="doc-alert-text">Ada catatan Verifikator</span>` : ""}
        ${actionHtml}
      </div>
    </div>`;
  }).join("");

  return `<tr><td class="doc-group-card">
    <div class="doc-group-head doc-group-head-v12">
      <div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div>
      <div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div>
      <div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div>
      <div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div>
      <div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed ? 'Lihat Rincian' : 'Minimize'}</button></div>
    </div>
    <div class="doc-list ${isCollapsed ? 'hidden' : ''}">${docsHtml}</div>
    <div class="doc-group-head doc-group-foot-v12 v69-final-action" style="border-top:1px solid #e8f1f7;border-bottom:0">
      <div class="group-reason"><b>Rekap:</b> ${(g.docs||[]).length} file dokumen. ${isCollapsed ? 'Klik Lihat Rincian untuk membuka daftar file.' : 'Validasi/perbaikan hanya aktif untuk dokumen yang berstatus MENUNGGU.'}</div>
      <div></div><div></div><div></div><span class="muted">-</span>
    </div>
  </td></tr>`;
}
async function verifDok(id, status){
  const d = (dashboard?.dokumen || []).find(x => String(x.id_dokumen) === String(id));
  if(d && !canVerifyDocumentNowV56(d)){
    alert(String(d.status_verifikasi || "").toUpperCase() === "VALID" ? "Dokumen sudah valid." : "Dokumen masih menunggu upload perbaikan dari bidang.");
    return;
  }
  showLoading("Verifikasi dokumen...");
  try{
    const r=await apiPost({action:"verifyDokumen", user:currentUser, id_dokumen:id, status_verifikasi:status, catatan_admin:"", catatan_Verifikator:""});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}
async function mintaPerbaikanDok(id){
  const d = (dashboard?.dokumen || []).find(x => String(x.id_dokumen) === String(id));
  if(d && !canVerifyDocumentNowV56(d)){
    alert(String(d.status_verifikasi || "").toUpperCase() === "VALID" ? "Dokumen sudah valid." : "Dokumen masih menunggu upload perbaikan dari bidang.");
    return;
  }
  const catatan = prompt("Alasan perbaikan dokumen wajib diisi:");
  if(!catatan || !String(catatan).trim()){ alert("Alasan perbaikan wajib diisi."); return; }
  showLoading("Mengirim status perbaikan...");
  try{
    const r=await apiPost({action:"verifyDokumen", user:currentUser, id_dokumen:id, status_verifikasi:"PERBAIKAN", catatan_admin:String(catatan).trim(), catatan_Verifikator:String(catatan).trim()});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}


/* =========================
   SIMPROV v57 final override
   Tombol aksi perencanaan user:
   - Pengajuan awal: Edit + Hapus tetap aktif.
   - Perlu Perbaikan: Ajukan Perbaikan, tanpa Hapus.
   - Setelah perbaikan diajukan ulang / Menunggu verifikasi perbaikan: Edit masih boleh untuk koreksi ulang, Hapus nonaktif agar riwayat tidak hilang.
   ========================= */
function isRencanaProsesPerbaikanV57(k){
  const st = String(k?.status_perencanaan || "DIAJUKAN").toUpperCase();
  const riw = String(k?.riwayat_perubahan || "").toLowerCase();
  return st === "DITOLAK" || (st === "DIAJUKAN" && (k?.alasan_penolakan || riw.includes("perbaikan diajukan ulang") || riw.includes("perlu perbaikan")));
}
function rencanaStatusTampilV57(k){
  const st = String(k?.status_perencanaan || "DIAJUKAN").toUpperCase();
  if(st === "DIAJUKAN" && isRencanaProsesPerbaikanV57(k)) return "MENUNGGU VERIFIKASI PERBAIKAN";
  return st;
}
function renderPerencanaanRow(k){
  try{
    k = k || {};
    const st = String(k.status_perencanaan||"DIAJUKAN").toUpperCase();
    const stTampil = rencanaStatusTampilV57(k);
    const prosesPerbaikan = isRencanaProsesPerbaikanV57(k);
    const locked = isKegiatanLocked(k);
    const aksesBuka = aksesPerencanaanTerbuka();
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const metode = k.metode_pemilihan || metodePemilihanByNilai(jumlah);
    const waktu = k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-";
    const hasNote = !!(k.alasan_penolakan || k.alasan_perubahan || k.riwayat_perubahan || toNumber(k.perubahan_ke));
    const note = `<button class="btn-mini btn-detail" onclick="openRencanaStatusModal('${esc(k.id_kegiatan)}')">${hasNote ? "Lihat Riwayat" : "Lihat"}</button>`;

    let aksi = "";
    if(canManage()){
      if(st === "DIAJUKAN" || st === "PERUBAHAN_DIAJUKAN") aksi = `<button class="btn-mini btn-green" onclick="setujui('${esc(k.id_kegiatan)}')">Setujui</button><button class="btn-mini btn-orange" onclick="tolak('${esc(k.id_kegiatan)}')">Minta Perbaikan</button>`;
      else aksi = `<span class="muted">-</span>`;
    } else if(isReviewer()){
      aksi = `<span class="audit-pill">Read-only</span>`;
    } else if(locked){
      aksi = `<span class="status-done-pill">Selesai</span>`;
    } else if(!aksesBuka){
      aksi = `<span class="lock-badge">Akses perencanaan ditutup</span>`;
    } else {
      if(st === "DITOLAK"){
        aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','repair')">Ajukan Perbaikan</button>`;
      } else if(st === "DIAJUKAN" && prosesPerbaikan){
        aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','repair')">Edit Perbaikan</button><span class="delete-locked-info">Hapus nonaktif</span>`;
      } else if(st === "DIAJUKAN"){
        aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','normal')">Edit</button><button class="btn-mini btn-red" onclick="hapusPerencanaan('${esc(k.id_kegiatan)}')">Hapus</button>`;
      } else if(st === "DISETUJUI"){
        aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','change')">Ajukan Perubahan</button>`;
      } else {
        aksi = `<span class="muted">Menunggu Verifikator</span>`;
      }
    }

    const perubahan = toNumber(k.perubahan_ke) ? `<br><small class="muted">Perubahan Ke-${toNumber(k.perubahan_ke)}</small>` : "";
    const rowClass = locked ? "row-selesai" : (st === "DITOLAK" ? "row-perbaikan" : (prosesPerbaikan ? "row-menunggu-perbaikan" : "row-proses"));
    return `<tr class="rencana-row ${rowClass}">
      <td>${esc(k.id_kegiatan)}</td>
      <td>${esc(bidangName(k.id_bidang))}</td>
      <td><b>${esc(k.nama_kegiatan)}</b>${perubahan}</td>
      <td>${esc(k.volume)}</td>
      <td>${esc(k.satuan)}</td>
      <td>${rupiah(k.harga_satuan)}</td>
      <td><b>${rupiah(jumlah)}</b></td>
      <td>${esc(metode)}</td>
      <td>${esc(waktu)}</td>
      <td>${badge(stTampil)}</td>
      <td class="note-cell note-cell-popup">${note}</td>
      <td class="nowrap aksi-perencanaan-v57">${aksi}</td>
    </tr>`;
  }catch(e){
    console.error("ROW_PERENCANAAN_ERROR", e, k);
    return `<tr class="rencana-row row-perbaikan"><td colspan="12">Data kegiatan ${esc(k?.id_kegiatan || "-")} perlu dicek. Detail: ${esc(e.message || e)}</td></tr>`;
  }
}


/* =========================
   SIMPROV v58 final override
   Perbaikan tampilan aksi perencanaan:
   - Status MENUNGGU VERIFIKASI PERBAIKAN hanya menampilkan tombol Edit Perbaikan.
   - Label "Hapus nonaktif" dihapus agar tampilan lebih bersih.
   ========================= */
function renderPerencanaanRow(k){
  try{
    k = k || {};
    const st = String(k.status_perencanaan||"DIAJUKAN").toUpperCase();
    const stTampil = typeof rencanaStatusTampilV57 === "function" ? rencanaStatusTampilV57(k) : st;
    const prosesPerbaikan = typeof isRencanaProsesPerbaikanV57 === "function" ? isRencanaProsesPerbaikanV57(k) : false;
    const locked = isKegiatanLocked(k);
    const aksesBuka = aksesPerencanaanTerbuka();
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const metode = k.metode_pemilihan || metodePemilihanByNilai(jumlah);
    const waktu = k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-";
    const hasNote = !!(k.alasan_penolakan || k.alasan_perubahan || k.riwayat_perubahan || toNumber(k.perubahan_ke));
    const note = `<button class="btn-mini btn-detail" onclick="openRencanaStatusModal('${esc(k.id_kegiatan)}')">${hasNote ? "Lihat Riwayat" : "Lihat"}</button>`;

    let aksi = "";
    if(canManage()){
      if(st === "DIAJUKAN" || st === "PERUBAHAN_DIAJUKAN") {
        aksi = `<button class="btn-mini btn-green" onclick="setujui('${esc(k.id_kegiatan)}')">Setujui</button><button class="btn-mini btn-orange" onclick="tolak('${esc(k.id_kegiatan)}')">Minta Perbaikan</button>`;
      } else {
        aksi = `<span class="muted">-</span>`;
      }
    } else if(isReviewer()){
      aksi = `<span class="audit-pill">Read-only</span>`;
    } else if(locked){
      aksi = `<span class="status-done-pill">Selesai</span>`;
    } else if(!aksesBuka){
      aksi = `<span class="lock-badge">Akses perencanaan ditutup</span>`;
    } else {
      if(st === "DITOLAK"){
        aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','repair')">Ajukan Perbaikan</button>`;
      } else if(st === "DIAJUKAN" && prosesPerbaikan){
        aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','repair')">Edit Perbaikan</button>`;
      } else if(st === "DIAJUKAN"){
        aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','normal')">Edit</button><button class="btn-mini btn-red" onclick="hapusPerencanaan('${esc(k.id_kegiatan)}')">Hapus</button>`;
      } else if(st === "DISETUJUI"){
        aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','change')">Ajukan Perubahan</button>`;
      } else {
        aksi = `<span class="muted">Menunggu Verifikator</span>`;
      }
    }

    const perubahan = toNumber(k.perubahan_ke) ? `<br><small class="muted">Perubahan Ke-${toNumber(k.perubahan_ke)}</small>` : "";
    const rowClass = locked ? "row-selesai" : (st === "DITOLAK" ? "row-perbaikan" : (prosesPerbaikan ? "row-menunggu-perbaikan" : "row-proses"));

    return `<tr class="rencana-row ${rowClass}">
      <td>${esc(k.id_kegiatan)}</td>
      <td>${esc(bidangName(k.id_bidang))}</td>
      <td><b>${esc(k.nama_kegiatan)}</b>${perubahan}</td>
      <td>${esc(k.volume)}</td>
      <td>${esc(k.satuan)}</td>
      <td>${rupiah(k.harga_satuan)}</td>
      <td><b>${rupiah(jumlah)}</b></td>
      <td>${esc(metode)}</td>
      <td>${esc(waktu)}</td>
      <td>${badge(stTampil)}</td>
      <td class="note-cell note-cell-popup">${note}</td>
      <td class="nowrap aksi-perencanaan-v58">${aksi}</td>
    </tr>`;
  }catch(e){
    console.error("ROW_PERENCANAAN_ERROR", e, k);
    return `<tr class="rencana-row row-perbaikan"><td colspan="12">Data kegiatan ${esc(k?.id_kegiatan || "-")} perlu dicek. Detail: ${esc(e.message || e)}</td></tr>`;
  }
}


/* =========================
   SIMPROV v59 final override
   Menu Admin/Verifikator Pencairan:
   - Hapus label kecil: Ada catatan Verifikator, Menunggu upload perbaikan dari bidang, Dokumen sudah valid.
   - Tombol Valid/Perbaikan tetap nonaktif sesuai status, tapi tanpa label tambahan.
   - Posisi Saat Ini pada popup dokumen status PERBAIKAN menjadi "Menunggu upload perbaikan dari bidang".
   ========================= */
function getDocPosisiSaatIni(d){
  const st = String(d?.status_verifikasi || "MENUNGGU").toUpperCase();
  if(st === "VALID") return "Sudah diverifikasi";
  if(st === "PERBAIKAN" || st === "DITOLAK") return "Menunggu upload perbaikan dari bidang";
  if(st === "MENUNGGU" && d?.tanggal_revisi) return "Menunggu verifikasi perbaikan";
  return "Menunggu verifikasi";
}
function renderDokumenGroupRow(g){
  const stGroup = groupDocStatus(g);
  const stCair = getPencairanStatus(g.id_kegiatan);
  const isCollapsed = docGroupCollapse[g.id_kegiatan] === undefined ? false : !!docGroupCollapse[g.id_kegiatan];

  const docsHtml = (g.docs || []).map(d => {
    const st = String(d.status_verifikasi || 'MENUNGGU').toUpperCase();
    const canVerify = (st === "MENUNGGU" || st === "");
    let actionHtml = `<span class="muted">-</span>`;

    if(canManage()){
      if(canVerify){
        actionHtml = `<div class="doc-file-actions v59-file-actions">
          <button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button>
          <button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button>
        </div>`;
      }else{
        actionHtml = `<div class="doc-file-actions v59-file-actions">
          <button class="btn-mini btn-disabled" disabled>Valid</button>
          <button class="btn-mini btn-disabled" disabled>Perbaikan</button>
        </div>`;
      }
    } else if(isReviewer()){
      actionHtml = `<span class="audit-pill">Read-only</span>`;
    } else if(st === 'PERBAIKAN' || st === 'DITOLAK'){
      actionHtml = `<div class="doc-action-box per-file-revision compact-revision">
        <div class="revision-title">Upload Ulang</div>
        <input type="file" id="revisi_${esc(d.id_dokumen)}">
        <button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button>
      </div>`;
    }

    return `<div class="doc-item doc-item-v47 ${st==='PERBAIKAN'||st==='DITOLAK'?'doc-item-repair':''}">
      <div class="doc-main-info">
        <b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || '-')}</b>
        <small class="muted">${esc(d.nama_file || '-')}</small>
      </div>
      <div class="doc-link">${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file || '-')}</div>
      <div class="doc-status">${badge(d.status_verifikasi || 'MENUNGGU')}</div>
      <div class="doc-file-note-action compact-status-action v59-status-action">
        <button class="btn-mini btn-detail" onclick="openDocStatusModal('${esc(d.id_dokumen)}')">Lihat Status</button>
        ${actionHtml}
      </div>
    </div>`;
  }).join("");

  return `<tr><td class="doc-group-card">
    <div class="doc-group-head doc-group-head-v12">
      <div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div>
      <div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div>
      <div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div>
      <div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div>
      <div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed ? 'Lihat Rincian' : 'Minimize'}</button></div>
    </div>
    <div class="doc-list ${isCollapsed ? 'hidden' : ''}">${docsHtml}</div>
    <div class="doc-group-head doc-group-foot-v12 v69-final-action" style="border-top:1px solid #e8f1f7;border-bottom:0">
      <div class="group-reason"><b>Rekap:</b> ${(g.docs||[]).length} file dokumen. Validasi/perbaikan aktif hanya untuk dokumen berstatus MENUNGGU.</div>
      <div></div><div></div><div></div><span class="muted">-</span>
    </div>
  </td></tr>`;
}
async function verifDok(id, status){
  const d = (dashboard?.dokumen || []).find(x => String(x.id_dokumen) === String(id));
  const st = String(d?.status_verifikasi || "MENUNGGU").toUpperCase();
  if(d && !(st === "MENUNGGU" || st === "")){
    alert(st === "VALID" ? "Dokumen sudah valid." : "Posisi saat ini menunggu upload perbaikan dari bidang.");
    return;
  }
  showLoading("Verifikasi dokumen...");
  try{
    const r=await apiPost({action:"verifyDokumen", user:currentUser, id_dokumen:id, status_verifikasi:status, catatan_admin:"", catatan_Verifikator:""});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}
async function mintaPerbaikanDok(id){
  const d = (dashboard?.dokumen || []).find(x => String(x.id_dokumen) === String(id));
  const st = String(d?.status_verifikasi || "MENUNGGU").toUpperCase();
  if(d && !(st === "MENUNGGU" || st === "")){
    alert(st === "VALID" ? "Dokumen sudah valid." : "Posisi saat ini menunggu upload perbaikan dari bidang.");
    return;
  }
  const catatan = prompt("Catatan perbaikan dokumen wajib diisi:");
  if(!catatan || !String(catatan).trim()){ alert("Catatan perbaikan wajib diisi."); return; }
  showLoading("Mengirim status perbaikan...");
  try{
    const r=await apiPost({action:"verifyDokumen", user:currentUser, id_dokumen:id, status_verifikasi:"PERBAIKAN", catatan_admin:String(catatan).trim(), catatan_Verifikator:String(catatan).trim()});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}


/* =========================
   SIMPROV v60 final override
   Warna status dibuat lebih jelas:
   - Hijau  : Disetujui / Valid / Selesai
   - Merah  : Perlu Perbaikan / Ditolak / Perbaikan Dokumen
   - Biru   : Diajukan / Menunggu Verifikasi
   - Kuning : Menunggu Verifikasi Perbaikan / Perubahan Diajukan
   ========================= */
function statusColorClassV60(v){
  const s = String(v || "").toUpperCase().trim();
  if(["DISETUJUI","VALID","SELESAI","DOKUMEN LENGKAP","SUDAH DIVERIFIKASI","SUDAH DIVALIDASI"].includes(s)) return "status-green";
  if(["DITOLAK","PERLU PERBAIKAN","PERBAIKAN","PERBAIKAN DOKUMEN","MELEBIHI PAGU"].includes(s)) return "status-red";
  if(["MENUNGGU VERIFIKASI PERBAIKAN","MENUNGGU UPLOAD PERBAIKAN DARI BIDANG","PERUBAHAN_DIAJUKAN","PERUBAHAN DIAJUKAN"].includes(s)) return "status-yellow";
  if(["DIAJUKAN","MENUNGGU","MENUNGGU VERIFIKASI","MENUNGGU VERIFIKASI PERENCANAAN","BELUM ADA DOKUMEN"].includes(s)) return "status-blue";
  if(["BELUM INPUT","BELUM ADA DATA"].includes(s)) return "status-gray";
  if(["BUKA","AKTIF"].includes(s)) return "status-green-soft";
  if(["TUTUP","NONAKTIF"].includes(s)) return "status-red-soft";
  return "status-gray";
}
function displayStatusTextV60(v){
  const s = String(v || "-").toUpperCase().trim();
  const map = {
    "DIAJUKAN":"DIAJUKAN",
    "DISETUJUI":"DISETUJUI",
    "DITOLAK":"PERLU PERBAIKAN",
    "PERBAIKAN":"PERLU PERBAIKAN",
    "PERUBAHAN_DIAJUKAN":"MENUNGGU VERIFIKASI PERUBAHAN",
    "MENUNGGU":"MENUNGGU VERIFIKASI",
    "VALID":"VALID",
    "BELUM_INPUT":"BELUM INPUT"
  };
  return map[s] || s.replace(/_/g," ");
}
function badge(v){
  const text = displayStatusTextV60(v);
  const cls = statusColorClassV60(text);
  return `<span class="status-badge-v60 ${cls}">${esc(text)}</span>`;
}
function getRencanaRowClassV60(k){
  const stText = typeof rencanaStatusTampilV57 === "function" ? rencanaStatusTampilV57(k) : String(k?.status_perencanaan || "DIAJUKAN").toUpperCase();
  const cls = statusColorClassV60(stText);
  if(cls === "status-green") return "row-status-green";
  if(cls === "status-red") return "row-status-red";
  if(cls === "status-yellow") return "row-status-yellow";
  if(cls === "status-blue") return "row-status-blue";
  return "row-status-gray";
}
function renderPerencanaanRow(k){
  try{
    k = k || {};
    const st = String(k.status_perencanaan||"DIAJUKAN").toUpperCase();
    const stTampil = typeof rencanaStatusTampilV57 === "function" ? rencanaStatusTampilV57(k) : st;
    const prosesPerbaikan = typeof isRencanaProsesPerbaikanV57 === "function" ? isRencanaProsesPerbaikanV57(k) : false;
    const locked = isKegiatanLocked(k);
    const aksesBuka = aksesPerencanaanTerbuka();
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const metode = k.metode_pemilihan || metodePemilihanByNilai(jumlah);
    const waktu = k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-";
    const hasNote = !!(k.alasan_penolakan || k.alasan_perubahan || k.riwayat_perubahan || toNumber(k.perubahan_ke));
    const note = `<button class="btn-mini btn-detail" onclick="openRencanaStatusModal('${esc(k.id_kegiatan)}')">${hasNote ? "Lihat Riwayat" : "Lihat"}</button>`;

    let aksi = "";
    if(canManage()){
      if(st === "DIAJUKAN" || st === "PERUBAHAN_DIAJUKAN") {
        aksi = `<button class="btn-mini btn-green" onclick="setujui('${esc(k.id_kegiatan)}')">Setujui</button><button class="btn-mini btn-orange" onclick="tolak('${esc(k.id_kegiatan)}')">Minta Perbaikan</button>`;
      } else {
        aksi = `<span class="muted">-</span>`;
      }
    } else if(isReviewer()){
      aksi = `<span class="audit-pill">Read-only</span>`;
    } else if(locked){
      aksi = `<span class="status-done-pill">Selesai</span>`;
    } else if(!aksesBuka){
      aksi = `<span class="lock-badge">Akses perencanaan ditutup</span>`;
    } else {
      if(st === "DITOLAK"){
        aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','repair')">Ajukan Perbaikan</button>`;
      } else if(st === "DIAJUKAN" && prosesPerbaikan){
        aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','repair')">Edit Perbaikan</button>`;
      } else if(st === "DIAJUKAN"){
        aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','normal')">Edit</button><button class="btn-mini btn-red" onclick="hapusPerencanaan('${esc(k.id_kegiatan)}')">Hapus</button>`;
      } else if(st === "DISETUJUI"){
        aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','change')">Ajukan Perubahan</button>`;
      } else {
        aksi = `<span class="muted">Menunggu Verifikator</span>`;
      }
    }

    const perubahan = toNumber(k.perubahan_ke) ? `<br><small class="muted">Perubahan Ke-${toNumber(k.perubahan_ke)}</small>` : "";
    const rowClass = locked ? "row-status-green" : getRencanaRowClassV60(k);

    return `<tr class="rencana-row ${rowClass}">
      <td>${esc(k.id_kegiatan)}</td>
      <td>${esc(bidangName(k.id_bidang))}</td>
      <td><b>${esc(k.nama_kegiatan)}</b>${perubahan}</td>
      <td>${esc(k.volume)}</td>
      <td>${esc(k.satuan)}</td>
      <td>${rupiah(k.harga_satuan)}</td>
      <td><b>${rupiah(jumlah)}</b></td>
      <td>${esc(metode)}</td>
      <td>${esc(waktu)}</td>
      <td>${badge(stTampil)}</td>
      <td class="note-cell note-cell-popup">${note}</td>
      <td class="nowrap aksi-perencanaan-v58">${aksi}</td>
    </tr>`;
  }catch(e){
    console.error("ROW_PERENCANAAN_ERROR", e, k);
    return `<tr class="rencana-row row-status-red"><td colspan="12">Data kegiatan ${esc(k?.id_kegiatan || "-")} perlu dicek. Detail: ${esc(e.message || e)}</td></tr>`;
  }
}


/* v60 legend helper */
function injectStatusLegendV60(){
  const panel = document.querySelector("#contentArea .panel, #contentArea section");
  if(!panel || panel.querySelector(".status-legend-v60")) return;
  const tableWrap = panel.querySelector(".table-wrap, table");
  if(!tableWrap) return;
  const legend = document.createElement("div");
  legend.className = "status-legend-v60";
  legend.innerHTML = `<span><i class="l-green"></i>Disetujui / valid</span><span><i class="l-red"></i>Perlu perbaikan</span><span><i class="l-blue"></i>Diajukan / menunggu verifikasi</span><span><i class="l-yellow"></i>Menunggu verifikasi perbaikan</span>`;
  tableWrap.parentNode.insertBefore(legend, tableWrap);
}
if(typeof renderPerencanaan === "function" && !window.__renderPerencanaanV60Wrapped){
  window.__renderPerencanaanV60Wrapped = true;
  const __oldRenderPerencanaanV60 = renderPerencanaan;
  renderPerencanaan = function(){
    const r = __oldRenderPerencanaanV60.apply(this, arguments);
    setTimeout(injectStatusLegendV60, 0);
    return r;
  }
}


/* =========================
   SIMPROV v61 final override
   Waktu Pemilihan wajib dan tidak hilang saat edit/perbaikan/perubahan.
   Penyebab strip: data edit sebelumnya belum mengirim field waktu_pemilihan ke backend.
   ========================= */
function normalizeDateForInputV61(v){
  const s = String(v || "").trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Format Indonesia dari tampilan lama, contoh: 10 Juli 2026
  const bulan = {
    januari:"01", februari:"02", maret:"03", april:"04", mei:"05", juni:"06",
    juli:"07", agustus:"08", september:"09", oktober:"10", november:"11", desember:"12"
  };
  const m = s.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if(m && bulan[m[2]]) return `${m[3]}-${bulan[m[2]]}-${String(m[1]).padStart(2,"0")}`;
  return "";
}
function ensureWaktuRequiredV61(){
  const w = document.getElementById("waktuPemilihan");
  if(w){
    w.required = true;
    w.setAttribute("required","required");
  }
  const ew = document.getElementById("editWaktuPemilihan");
  if(ew){
    ew.required = true;
    ew.setAttribute("required","required");
  }
}
function openEditModal(id, mode){
  const k = dashboard.perencanaan.find(x => String(x.id_kegiatan)===String(id)); if(!k) return;
  if(isKegiatanLocked(k)){ alert("Kegiatan sudah selesai sampai validasi pencairan, perencanaan terkunci."); return; }
  if(!aksesPerencanaanTerbuka()){ alert("Akses perencanaan bidang sedang ditutup Verifikator. Menu pencairan tetap bisa digunakan."); return; }

  const realMode = mode === "repair" ? "normal" : mode;
  document.getElementById("editMode").value = realMode;
  document.getElementById("editIdKegiatan").value = k.id_kegiatan;
  document.getElementById("editNamaKegiatan").value = k.nama_kegiatan || "";
  document.getElementById("editKeterangan").value = k.keterangan || "";
  document.getElementById("editVolume").value = angkaID(k.volume);
  document.getElementById("editSatuan").value = k.satuan || "";
  document.getElementById("editHarga").value = angkaID(k.harga_satuan);

  const waktu = normalizeDateForInputV61(k.waktu_pemilihan);
  if(document.getElementById("editWaktuPemilihan")) document.getElementById("editWaktuPemilihan").value = waktu;

  document.getElementById("editAlasanPerubahan").value = "";
  if(mode === "repair"){
    document.getElementById("editModalTitle").innerText = "Ajukan Perbaikan Perencanaan";
    document.getElementById("editModalSub").innerText = "Perbaiki data sesuai catatan Verifikator. Waktu pemilihan wajib diisi.";
  } else {
    document.getElementById("editModalTitle").innerText = mode === "change" ? `Ajukan Perubahan Perencanaan` : "Edit Perencanaan";
    document.getElementById("editModalSub").innerText = mode === "change" ? `Perubahan akan masuk sebagai Perubahan Ke-${toNumber(k.perubahan_ke)+1} dan menunggu Verifikator.` : "Data akan diajukan kembali ke Verifikator.";
  }
  document.getElementById("alasanPerubahanWrap").classList.toggle("hidden", mode !== "change");
  setAutoTotal("editVolume","editHarga","editTotalPreview");
  ensureWaktuRequiredV61();
  document.getElementById("editModal").classList.remove("hidden");
}
async function submitEditPerencanaan(){
  showLoading("Menyimpan perubahan...");
  const mode = document.getElementById("editMode").value;
  const waktu = document.getElementById("editWaktuPemilihan")?.value || "";
  if(!waktu){ hideLoading(); alert("Waktu pemilihan wajib diisi."); return; }

  const data = {
    id_kegiatan:document.getElementById("editIdKegiatan").value,
    mode,
    nama_kegiatan:document.getElementById("editNamaKegiatan").value,
    rincian_kebutuhan:"",
    keterangan:document.getElementById("editKeterangan").value,
    volume:toNumber(document.getElementById("editVolume").value),
    satuan:document.getElementById("editSatuan").value,
    harga_satuan:toNumber(document.getElementById("editHarga").value),
    waktu_pemilihan:waktu,
    alasan_perubahan:document.getElementById("editAlasanPerubahan").value
  };
  const jumlah = toNumber(data.volume) * toNumber(data.harga_satuan);
  const cek = cekPaguFrontend(jumlah, data.id_kegiatan);
  if(!cek.ok){ hideLoading(); alert(cek.message); return; }
  try{
    const r = await apiPost({action:"updatePerencanaan", user:currentUser, data});
    alert(r.message);
    if(r.success){ closeEditModal(); await loadDashboard(false); }
  }catch(e){alert(e.message)}finally{hideLoading();}
}
const __oldRenderPerencanaanV61 = typeof renderPerencanaan === "function" ? renderPerencanaan : null;
if(__oldRenderPerencanaanV61 && !window.__renderPerencanaanV61Wrapped){
  window.__renderPerencanaanV61Wrapped = true;
  renderPerencanaan = function(){
    const r = __oldRenderPerencanaanV61.apply(this, arguments);
    setTimeout(ensureWaktuRequiredV61, 0);
    return r;
  };
}


/* =========================
   SIMPROV v62 final override
   Warna menu pencairan per kegiatan:
   - Semua dokumen VALID = kartu kegiatan hijau.
   - Ada dokumen PERBAIKAN/DITOLAK = kartu kegiatan merah.
   - Masih menunggu verifikasi = kartu kegiatan biru.
   ========================= */
function docGroupColorClassV62(g){
  const docs = g?.docs || [];
  if(!docs.length) return "doc-group-gray";
  const statuses = docs.map(d => String(d.status_verifikasi || "MENUNGGU").toUpperCase());
  if(statuses.every(s => s === "VALID")) return "doc-group-green";
  if(statuses.some(s => s === "PERBAIKAN" || s === "DITOLAK")) return "doc-group-red";
  return "doc-group-blue";
}
function renderDokumenGroupRow(g){
  const stGroup = groupDocStatus(g);
  const stCair = getPencairanStatus(g.id_kegiatan);
  const isCollapsed = docGroupCollapse[g.id_kegiatan] === undefined ? false : !!docGroupCollapse[g.id_kegiatan];
  const colorClass = docGroupColorClassV62(g);

  const docsHtml = (g.docs || []).map(d => {
    const st = String(d.status_verifikasi || 'MENUNGGU').toUpperCase();
    const canVerify = (st === "MENUNGGU" || st === "");
    let actionHtml = `<span class="muted">-</span>`;

    if(canManage()){
      if(canVerify){
        actionHtml = `<div class="doc-file-actions v59-file-actions">
          <button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button>
          <button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button>
        </div>`;
      }else{
        actionHtml = `<div class="doc-file-actions v59-file-actions">
          <button class="btn-mini btn-disabled" disabled>Valid</button>
          <button class="btn-mini btn-disabled" disabled>Perbaikan</button>
        </div>`;
      }
    } else if(isReviewer()){
      actionHtml = `<span class="audit-pill">Read-only</span>`;
    } else if(st === 'PERBAIKAN' || st === 'DITOLAK'){
      actionHtml = `<div class="doc-action-box per-file-revision compact-revision">
        <div class="revision-title">Upload Ulang</div>
        <input type="file" id="revisi_${esc(d.id_dokumen)}">
        <button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button>
      </div>`;
    }

    return `<div class="doc-item doc-item-v47 ${st==='PERBAIKAN'||st==='DITOLAK'?'doc-item-repair':(st==='VALID'?'doc-item-valid':'doc-item-wait')}">
      <div class="doc-main-info">
        <b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || '-')}</b>
        <small class="muted">${esc(d.nama_file || '-')}</small>
      </div>
      <div class="doc-link">${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file || '-')}</div>
      <div class="doc-status">${badge(d.status_verifikasi || 'MENUNGGU')}</div>
      <div class="doc-file-note-action compact-status-action v59-status-action">
        <button class="btn-mini btn-detail" onclick="openDocStatusModal('${esc(d.id_dokumen)}')">Lihat Status</button>
        ${actionHtml}
      </div>
    </div>`;
  }).join("");

  return `<tr><td class="doc-group-card ${colorClass}">
    <div class="doc-group-head doc-group-head-v12">
      <div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div>
      <div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div>
      <div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div>
      <div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div>
      <div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed ? 'Lihat Rincian' : 'Minimize'}</button></div>
    </div>
    <div class="doc-list ${isCollapsed ? 'hidden' : ''}">${docsHtml}</div>
    <div class="doc-group-head doc-group-foot-v12 v69-final-action" style="border-top:1px solid #e8f1f7;border-bottom:0">
      <div class="group-reason"><b>Rekap:</b> ${(g.docs||[]).length} file dokumen. ${colorClass === "doc-group-green" ? "Seluruh dokumen pada kegiatan ini sudah valid." : "Validasi/perbaikan aktif hanya untuk dokumen berstatus MENUNGGU."}</div>
      <div></div><div></div><div></div><span class="muted">-</span>
    </div>
  </td></tr>`;
}


/* =========================
   SIMPROV v63 final override
   Perencanaan tidak bisa ajukan perubahan jika kegiatan sudah punya dokumen pencairan.
   Alurnya: setelah masuk pencairan/upload dokumen, perubahan perencanaan dikunci agar histori pencairan tidak bentrok.
   ========================= */
function hasDokumenPencairanV63(idKegiatan){
  return (dashboard?.dokumen || []).some(d => String(d.id_kegiatan) === String(idKegiatan));
}
function renderPerencanaanRow(k){
  try{
    k = k || {};
    const st = String(k.status_perencanaan||"DIAJUKAN").toUpperCase();
    const stTampil = typeof rencanaStatusTampilV57 === "function" ? rencanaStatusTampilV57(k) : st;
    const prosesPerbaikan = typeof isRencanaProsesPerbaikanV57 === "function" ? isRencanaProsesPerbaikanV57(k) : false;
    const locked = isKegiatanLocked(k);
    const aksesBuka = aksesPerencanaanTerbuka();
    const sudahAdaDokumen = hasDokumenPencairanV63(k.id_kegiatan);
    const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const metode = k.metode_pemilihan || metodePemilihanByNilai(jumlah);
    const waktu = k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-";
    const hasNote = !!(k.alasan_penolakan || k.alasan_perubahan || k.riwayat_perubahan || toNumber(k.perubahan_ke));
    const note = `<button class="btn-mini btn-detail" onclick="openRencanaStatusModal('${esc(k.id_kegiatan)}')">${hasNote ? "Lihat Riwayat" : "Lihat"}</button>`;

    let aksi = "";
    if(canVerifyPBJ()){
      if(st === "DIAJUKAN" || st === "PERUBAHAN_DIAJUKAN") {
        aksi = `<button class="btn-mini btn-green" onclick="setujui('${esc(k.id_kegiatan)}')">Setujui</button><button class="btn-mini btn-orange" onclick="tolak('${esc(k.id_kegiatan)}')">Minta Perbaikan</button>`;
      } else {
        aksi = `<span class="muted">-</span>`;
      }
    } else if(isReviewer()){
      aksi = `<span class="audit-pill">Read-only</span>`;
    } else if(locked){
      aksi = `<span class="status-done-pill">Selesai</span>`;
    } else if(!aksesBuka){
      aksi = `<span class="lock-badge">Akses perencanaan ditutup</span>`;
    } else {
      if(st === "DITOLAK"){
        aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','repair')">Ajukan Perbaikan</button>`;
      } else if(st === "DIAJUKAN" && prosesPerbaikan){
        aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','repair')">Edit Perbaikan</button>`;
      } else if(st === "DIAJUKAN"){
        aksi = `<button class="btn-mini" onclick="openEditModal('${esc(k.id_kegiatan)}','normal')">Edit</button><button class="btn-mini btn-red" onclick="hapusPerencanaan('${esc(k.id_kegiatan)}')">Hapus</button>`;
      } else if(st === "DISETUJUI"){
        if(sudahAdaDokumen){
          aksi = `<span class="change-locked-pill">Sudah masuk pencairan</span>`;
        }else{
          aksi = `<button class="btn-mini btn-orange" onclick="openEditModal('${esc(k.id_kegiatan)}','change')">Ajukan Perubahan</button>`;
        }
      } else {
        aksi = `<span class="muted">Menunggu Verifikator</span>`;
      }
    }

    const perubahan = toNumber(k.perubahan_ke) ? `<br><small class="muted">Perubahan Ke-${toNumber(k.perubahan_ke)}</small>` : "";
    const rowClass = locked ? "row-status-green" : (typeof getRencanaRowClassV60 === "function" ? getRencanaRowClassV60(k) : "row-proses");

    return `<tr class="rencana-row ${rowClass}">
      <td>${esc(k.id_kegiatan)}</td>
      <td>${esc(bidangName(k.id_bidang))}</td>
      <td><b>${esc(k.nama_kegiatan)}</b>${perubahan}</td>
      <td>${esc(k.volume)}</td>
      <td>${esc(k.satuan)}</td>
      <td>${rupiah(k.harga_satuan)}</td>
      <td><b>${rupiah(jumlah)}</b></td>
      <td>${esc(metode)}</td>
      <td>${esc(waktu)}</td>
      <td>${badge(stTampil)}</td>
      <td class="note-cell note-cell-popup">${note}</td>
      <td class="nowrap aksi-perencanaan-v63">${aksi}</td>
    </tr>`;
  }catch(e){
    console.error("ROW_PERENCANAAN_ERROR", e, k);
    return `<tr class="rencana-row row-status-red"><td colspan="12">Data kegiatan ${esc(k?.id_kegiatan || "-")} perlu dicek. Detail: ${esc(e.message || e)}</td></tr>`;
  }
}
function openEditModal(id, mode){
  const k = dashboard.perencanaan.find(x => String(x.id_kegiatan)===String(id)); if(!k) return;
  if(mode === "change" && hasDokumenPencairanV63(id)){
    alert("Perubahan perencanaan tidak dapat diajukan karena kegiatan sudah memiliki dokumen pencairan.");
    return;
  }
  if(isKegiatanLocked(k)){ alert("Kegiatan sudah selesai sampai validasi pencairan, perencanaan terkunci."); return; }
  if(!aksesPerencanaanTerbuka()){ alert("Akses perencanaan bidang sedang ditutup Verifikator. Menu pencairan tetap bisa digunakan."); return; }

  const realMode = mode === "repair" ? "normal" : mode;
  document.getElementById("editMode").value = realMode;
  document.getElementById("editIdKegiatan").value = k.id_kegiatan;
  document.getElementById("editNamaKegiatan").value = k.nama_kegiatan || "";
  document.getElementById("editKeterangan").value = k.keterangan || "";
  document.getElementById("editVolume").value = angkaID(k.volume);
  document.getElementById("editSatuan").value = k.satuan || "";
  document.getElementById("editHarga").value = angkaID(k.harga_satuan);

  const waktu = typeof normalizeDateForInputV61 === "function" ? normalizeDateForInputV61(k.waktu_pemilihan) : (k.waktu_pemilihan || "");
  if(document.getElementById("editWaktuPemilihan")) document.getElementById("editWaktuPemilihan").value = waktu;

  document.getElementById("editAlasanPerubahan").value = "";
  if(mode === "repair"){
    document.getElementById("editModalTitle").innerText = "Ajukan Perbaikan Perencanaan";
    document.getElementById("editModalSub").innerText = "Perbaiki data sesuai catatan Verifikator. Waktu pemilihan wajib diisi.";
  } else {
    document.getElementById("editModalTitle").innerText = mode === "change" ? `Ajukan Perubahan Perencanaan` : "Edit Perencanaan";
    document.getElementById("editModalSub").innerText = mode === "change" ? `Perubahan akan masuk sebagai Perubahan Ke-${toNumber(k.perubahan_ke)+1} dan menunggu Verifikator.` : "Data akan diajukan kembali ke Verifikator.";
  }
  document.getElementById("alasanPerubahanWrap").classList.toggle("hidden", mode !== "change");
  setAutoTotal("editVolume","editHarga","editTotalPreview");
  if(typeof ensureWaktuRequiredV61 === "function") ensureWaktuRequiredV61();
  document.getElementById("editModal").classList.remove("hidden");
}

/* =========================
   SIMPROV v64 patch - Verifikator + Finalisasi Kegiatan
   Patch tambahan saja: tidak mengubah desain/menu existing, hanya pembatasan role dan status alur pencairan.
   ========================= */
function isKeuangan(){
  const r = roleCode();
  const role = String(currentUser?.role || '').toUpperCase();
  return r === 'KEUANGAN' || r === 'VERIF_KEUANGAN' || r === 'VERIFIKATOR_KEUANGAN' || role === 'KEUANGAN' || role === 'VERIFIKATOR';
}
function isReviewer(){ return REVIEWER_ROLES.includes(roleCode()) || isKeuangan(); }
function canSeeAll(){ return isAdmin() || isReviewer() || isKeuangan(); }
function canVerifyKeuangan(){ return isKeuangan(); }
function canFinalizePBJ(){ return isAdmin(); }
function roleLabel(){
  if(isAdmin()) return 'VERIFIKATOR';
  if(isKeuangan()) return 'VERIFIKATOR';
  if(isReviewer()) return roleCode();
  return 'BIDANG';
}
function renderMenu(){
  const menus = isKeuangan() ? ['Dashboard Monitoring','Pencairan'] : (isAdmin() ? MENUS_ADMIN : (isReviewer() ? MENUS_REVIEWER : MENUS_USER));
  if(!menus.includes(activeMenu)) activeMenu = menus[0];
  document.getElementById('menuNav').innerHTML = menus.map(m => `<button class="${activeMenu===m?'active':''}" onclick="setMenu('${m}')">${m}</button>`).join('');
}
function statusTextNormV64(v){ return String(v || '').toUpperCase().trim(); }
function isDocValidV64(d){ const s = statusTextNormV64(d?.status_verifikasi || d); return s === 'VALID' || s === 'VALID DOKUMEN'; }
function isDocRepairV64(d){ const s = statusTextNormV64(d?.status_verifikasi || d); return s === 'PERBAIKAN' || s === 'PERBAIKAN DOKUMEN' || s === 'DITOLAK'; }
function isDocWaitV64(d){
  const s = statusTextNormV64(d?.status_verifikasi || d);
  return !s || ['MENUNGGU','MENUNGGU VERIFIKASI','MENUNGGU VERIFIKASI DOKUMEN','MENUNGGU VERIFIKASI PERBAIKAN','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN'].includes(s);
}
function statusColorClassV60(v){
  const s = String(v || '').toUpperCase().trim();
  if(['DISETUJUI','VALID','VALID DOKUMEN','SELESAI','DOKUMEN LENGKAP','SUDAH DIVERIFIKASI','SUDAH DIVALIDASI'].includes(s)) return 'status-green';
  if(['DITOLAK','PERLU PERBAIKAN','PERBAIKAN','PERBAIKAN DOKUMEN','PERBAIKAN DOKUMEN','MELEBIHI PAGU'].includes(s)) return 'status-red';
  if(['MENUNGGU VERIFIKASI PERBAIKAN','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN','MENUNGGU UPLOAD PERBAIKAN DARI BIDANG','PERUBAHAN_DIAJUKAN','PERUBAHAN DIAJUKAN'].includes(s)) return 'status-yellow';
  if(['DIAJUKAN','MENUNGGU','MENUNGGU VERIFIKASI','MENUNGGU VERIFIKASI DOKUMEN','MENUNGGU VERIFIKASI PERENCANAAN','MENUNGGU DOKUMEN PENCAIRAN','MENUNGGU FINALISASI','BELUM ADA DOKUMEN'].includes(s)) return 'status-blue';
  if(['BELUM INPUT','BELUM ADA DATA'].includes(s)) return 'status-gray';
  if(['BUKA','AKTIF'].includes(s)) return 'status-green-soft';
  if(['TUTUP','NONAKTIF'].includes(s)) return 'status-red-soft';
  return 'status-gray';
}
function displayStatusTextV60(v){
  const s = String(v || '-').toUpperCase().trim();
  const map = {
    'DIAJUKAN':'DIAJUKAN',
    'DISETUJUI':'DISETUJUI PBJ',
    'DITOLAK':'PERLU PERBAIKAN',
    'PERBAIKAN':'PERLU PERBAIKAN',
    'PERBAIKAN DOKUMEN':'PERBAIKAN DOKUMEN',
    'VALID':'VALID DOKUMEN',
    'VALID DOKUMEN':'VALID DOKUMEN',
    'MENUNGGU':'MENUNGGU VERIFIKASI DOKUMEN',
    'MENUNGGU VERIFIKASI':'MENUNGGU VERIFIKASI DOKUMEN',
    'PERUBAHAN_DIAJUKAN':'MENUNGGU VERIFIKASI PERUBAHAN',
    'BELUM_INPUT':'BELUM INPUT'
  };
  return map[s] || s.replace(/_/g,' ');
}
function badge(v){
  const text = displayStatusTextV60(v);
  const cls = statusColorClassV60(text);
  return `<span class="status-badge-v60 ${cls}">${esc(text)}</span>`;
}
function renderSummary(){
  const wrap = document.getElementById('summaryCards'); if(!dashboard){ wrap.innerHTML=''; return; }
  if(canSeeAll()){
    const pagu = dashboard.rekap.reduce((s,r)=>s+toNumber(r.pagu),0);
    const total = dashboard.rekap.reduce((s,r)=>s+toNumber(r.total_perencanaan),0);
    const dok = dashboard.dokumen.length;
    const valid = dashboard.dokumen.filter(isDocValidV64).length;
    wrap.innerHTML = card('Total Pagu', rupiah(pagu))+card('Total Perencanaan', rupiah(total))+card('Sisa Pagu', rupiah(pagu-total))+card('Dokumen Valid Dokumen', `${valid}/${dok}`);
  } else {
    const r = dashboard.rekap.find(x => String(x.id_bidang)===String(currentUser.id_bidang)) || {};
    wrap.innerHTML = card('Pagu Bidang', rupiah(r.pagu))+card('Total Perencanaan', rupiah(r.total_perencanaan))+card('Sisa Pagu', rupiah(r.sisa_pagu))+card('Status Akses', r.status_akses || '-');
  }
}
function isPencairanComplete(idKegiatan){
  const st = String(getPencairanStatus(idKegiatan) || '').toUpperCase();
  return st === 'SELESAI';
}
function isKegiatanLocked(k){ return isPencairanComplete(k.id_kegiatan); }
function kegiatanButuhUploadAwal(k){
  if(!k) return false;
  if(String(k.status_perencanaan || '').toUpperCase() !== 'DISETUJUI') return false;
  if(isPencairanComplete(k.id_kegiatan)) return false;
  return remainingDocTypesForKegiatan(k.id_kegiatan).length > 0;
}
function groupDocStatus(g){
  const docs = g.docs || [];
  if(!docs.length) return 'BELUM ADA DOKUMEN';
  if(docs.some(isDocRepairV64)) return 'PERBAIKAN DOKUMEN';
  if(docs.every(isDocValidV64)) return 'VALID DOKUMEN';
  if(docs.some(d => statusTextNormV64(d.status_verifikasi).includes('PERBAIKAN'))) return 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
  return 'MENUNGGU VERIFIKASI DOKUMEN';
}
function docGroupColorClassV62(g){
  const docs = g?.docs || [];
  if(!docs.length) return 'doc-group-gray';
  if(docs.every(isDocValidV64)) return 'doc-group-green';
  if(docs.some(isDocRepairV64)) return 'doc-group-red';
  return 'doc-group-blue';
}
function getDocPosisiSaatIni(d){
  const st = String(d?.status_verifikasi || 'MENUNGGU').toUpperCase();
  if(isDocValidV64(d)) return 'Sudah divalidasi Verifikator';
  if(isDocRepairV64(d)) return 'Menunggu upload perbaikan dari bidang';
  if(st.includes('PERBAIKAN')) return 'Menunggu verifikasi perbaikan Keuangan';
  return 'Menunggu verifikasi Keuangan';
}
function canVerifyDocumentNowV64(d){ return isDocWaitV64(d); }
function allDocsValidKeuanganV64(idKegiatan){
  const docs = (dashboard?.dokumen || []).filter(d => String(d.id_kegiatan) === String(idKegiatan));
  return docs.length > 0 && docs.every(isDocValidV64);
}
async function selesaikanKegiatanPBJ(idKegiatan){
  if(!canFinalizePBJ()) return;
  if(!allDocsValidKeuanganV64(idKegiatan)){ alert('Semua dokumen harus VALID oleh Keuangan terlebih dahulu.'); return; }
  if(!confirm('Verifikasi PBJ dan selesaikan kegiatan ini? Status akhir akan menjadi SELESAI.')) return;
  showLoading('Menyelesaikan kegiatan...');
  try{
    const r = await apiPost({action:'updateStatusPencairan', user:currentUser, id_kegiatan:idKegiatan, status_pencairan:'SELESAI', catatan_admin:'Diselesaikan oleh Verifikator'});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){ alert(e.message || 'Gagal menyelesaikan kegiatan.'); }
  finally{ hideLoading(); }
}
function renderDokumenGroupRow(g){
  const stGroup = groupDocStatus(g);
  // Jangan memakai status tersimpan yang bisa masih stale. Status tampilan dihitung
  // langsung dari kondisi dokumen terbaru: Keuangan -> PBJ -> Selesai.
  const stCair = effectivePencairanStatusV68(g);
  const stCairU = String(stCair || '').toUpperCase();
  const isCollapsed = docGroupCollapse[g.id_kegiatan] === undefined ? false : !!docGroupCollapse[g.id_kegiatan];
  const colorClass = docGroupColorClassV62(g);
  const docsHtml = (g.docs || []).map(d => {
    const st = String(d.status_verifikasi || 'MENUNGGU VERIFIKASI DOKUMEN').toUpperCase();
    let actionHtml = `<span class="muted">-</span>`;
    if(canVerifyKeuangan()){
      if(canVerifyDocumentNowV64(d)){
        actionHtml = `<div class="doc-file-actions v59-file-actions">
          <button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button>
          <button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button>
        </div>`;
      }else{
        actionHtml = `<div class="doc-file-actions v59-file-actions"><button class="btn-mini btn-disabled" disabled>Valid</button><button class="btn-mini btn-disabled" disabled>Perbaikan</button></div>`;
      }
    } else if(isAdmin() || isReviewer()){
      actionHtml = `<span class="audit-pill">Read-only</span>`;
    } else if(isDocRepairV64(d)){
      actionHtml = `<div class="doc-action-box per-file-revision compact-revision">
        <div class="revision-title">Upload Ulang</div>
        <input type="file" id="revisi_${esc(d.id_dokumen)}">
        <button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button>
      </div>`;
    }
    return `<div class="doc-item doc-item-v47 ${isDocRepairV64(d)?'doc-item-repair':(isDocValidV64(d)?'doc-item-valid':'doc-item-wait')}">
      <div class="doc-main-info"><b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen) || '-')}</b><small class="muted">${esc(d.nama_file || '-')}</small></div>
      <div class="doc-link">${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file || '-')}</div>
      <div class="doc-status">${badge(d.status_verifikasi || 'MENUNGGU VERIFIKASI DOKUMEN')}</div>
      <div class="doc-file-note-action compact-status-action v59-status-action"><button class="btn-mini btn-detail" onclick="openDocStatusModal('${esc(d.id_dokumen)}')">Lihat Status</button>${actionHtml}</div>
    </div>`;
  }).join('');
  let finalAction = `<span class="muted">-</span>`;
  if(canFinalizePBJ()){
    if(stCairU === 'SELESAI'){
      finalAction = `<span class="status-done-pill">SELESAI</span>`;
    }else if(allDocsValidKeuanganV64(g.id_kegiatan)){
      finalAction = `<button class="btn-mini btn-green btn-wide" onclick="selesaikanKegiatanPBJ('${esc(g.id_kegiatan)}')">Selesaikan Kegiatan</button>`;
    }else{
      finalAction = `<button class="btn-mini btn-disabled btn-wide" disabled title="Semua dokumen harus VALID DOKUMEN terlebih dahulu">Menunggu Valid Dokumen</button>`;
    }
  }
  const rekapText = stCairU === 'SELESAI' ? 'Kegiatan sudah selesai.' : (colorClass === 'doc-group-green' ? 'Seluruh dokumen sudah valid Keuangan. Menunggu verifikasi/finalisasi PBJ.' : 'Validasi/perbaikan dokumen dilakukan oleh Verifikator.');
  return `<tr><td class="doc-group-card ${colorClass}">
    <div class="doc-group-head doc-group-head-v12">
      <div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div>
      <div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div>
      <div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div>
      <div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div>
      <div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed ? 'Lihat Rincian' : 'Minimize'}</button></div>
    </div>
    <div class="doc-list ${isCollapsed ? 'hidden' : ''}">${docsHtml}</div>
    <div class="doc-group-head doc-group-foot-v12 v69-final-action" style="border-top:1px solid #e8f1f7;border-bottom:0">
      <div class="group-reason"><b>Rekap:</b> ${(g.docs||[]).length} file dokumen. ${rekapText}</div>
      <div></div><div></div><div></div>${finalAction}
    </div>
  </td></tr>`;
}
async function verifDok(id, status){
  if(!canVerifyKeuangan()){ alert('Validasi dokumen hanya dapat dilakukan oleh Verifikator.'); return; }
  const d = (dashboard?.dokumen || []).find(x => String(x.id_dokumen) === String(id));
  if(d && !canVerifyDocumentNowV64(d)){
    alert(isDocValidV64(d) ? 'Dokumen sudah valid Keuangan.' : 'Dokumen masih menunggu upload perbaikan dari bidang.');
    return;
  }
  showLoading('Verifikasi dokumen oleh Keuangan...');
  try{
    const r=await apiPost({action:'verifyDokumen', user:currentUser, id_dokumen:id, status_verifikasi:status, catatan_admin:'', catatan_keuangan:''});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}
async function mintaPerbaikanDok(id){
  if(!canVerifyKeuangan()){ alert('Perbaikan dokumen hanya dapat diminta oleh Verifikator.'); return; }
  const d = (dashboard?.dokumen || []).find(x => String(x.id_dokumen) === String(id));
  if(d && !canVerifyDocumentNowV64(d)){
    alert(isDocValidV64(d) ? 'Dokumen sudah valid Keuangan.' : 'Dokumen masih menunggu upload perbaikan dari bidang.');
    return;
  }
  const catatan = prompt('Catatan perbaikan dokumen wajib diisi:');
  if(!catatan || !String(catatan).trim()){ alert('Catatan perbaikan wajib diisi.'); return; }
  showLoading('Mengirim status perbaikan Keuangan...');
  try{
    const r=await apiPost({action:'verifyDokumen', user:currentUser, id_dokumen:id, status_verifikasi:'PERBAIKAN', catatan_admin:String(catatan).trim(), catatan_keuangan:String(catatan).trim()});
    alert(r.message); if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}
function filterBarPencairan(){
  const statusOpts = ['MENUNGGU VERIFIKASI DOKUMEN','VALID DOKUMEN','PERBAIKAN DOKUMEN','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN'].map(s=>`<option value="${s}" ${filters.cairStatus===s?'selected':''}>${s}</option>`).join('');
  return `<div class="filter-card"><div class="toolbar">${canSeeAll()?`<div class="field small"><label>Filter Bidang</label><select onchange="filters.cairBidang=this.value;pencairanPage=1;renderPencairan()">${bidangOptions(filters.cairBidang,true)}</select></div>`:''}<div class="field small"><label>Filter Status Dokumen</label><select onchange="filters.cairStatus=this.value;pencairanPage=1;renderPencairan()"><option value="ALL">Semua Status</option>${statusOpts}</select></div><div class="field"><label>Search Nama Kegiatan</label><input value="${esc(filters.cairSearch)}" placeholder="Cari nama kegiatan..." oninput="filters.cairSearch=this.value;pencairanPage=1;renderPencairan()"></div><button class="btn-refresh" onclick="refreshData()">Refresh</button></div></div>`;
}
const __oldLoginV64 = login;
login = async function(){
  await __oldLoginV64();
  if(currentUser && isKeuangan() && activeMenu !== 'Pencairan') { activeMenu = 'Pencairan'; renderAll(); }
};
window.onload = async function(){
  const saved = localStorage.getItem('siporbo_user');
  if(saved){
    currentUser=JSON.parse(saved);
    activeMenu=isKeuangan()?'Pencairan':(isAdmin()?'Dashboard Monitoring':'Struktur Anggaran');
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appPage').classList.remove('hidden');
    await loadDashboard(true);
  }
};


/* =========================
   SIMPROV v65 - Akun Verifikator & pembagian bidang
   ========================= */
function explicitRoleV65(){
  return String(currentUser?.role || currentUser?.id_bidang || '').toUpperCase().replace(/\s+/g,'_');
}
function isPBJVerifierV65(){ return ['ADMIN','VERIFIKATOR_PBJ','PBJ'].includes(explicitRoleV65()); }
function isSuperAdminV65(){ return explicitRoleV65()==='ADMIN'; }
function isKeuangan(){ return ['KEUANGAN','VERIFIKATOR_KEUANGAN','VERIF_KEUANGAN'].includes(explicitRoleV65()); }
function isAdmin(){ return isSuperAdminV65(); }
function canVerifyPBJ(){ return isPBJVerifierV65(); }
function isReviewer(){ return REVIEWER_ROLES.includes(roleCode()) || isKeuangan() || (isPBJVerifierV65() && !isSuperAdminV65()); }
function canSeeAll(){ return isSuperAdminV65() || isReviewer() || isKeuangan(); }
function canFinalizePBJ(){ return isPBJVerifierV65(); }
function roleLabel(){
  if(isSuperAdminV65()) return 'ADMIN / VERIFIKATOR';
  if(isPBJVerifierV65()) return 'VERIFIKATOR';
  if(isKeuangan()) return 'VERIFIKATOR';
  if(REVIEWER_ROLES.includes(roleCode())) return roleCode();
  return 'BIDANG';
}
function renderMenu(){
  let menus;
  if(isSuperAdminV65()) menus=['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pencairan','Manajemen Akses'];
  else if(isPBJVerifierV65()) menus=['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pencairan'];
  else if(isKeuangan()) menus=['Dashboard Monitoring','Pencairan'];
  else menus=isReviewer()?MENUS_REVIEWER:MENUS_USER;
  if(!menus.includes(activeMenu)) activeMenu=menus[0];
  document.getElementById('menuNav').innerHTML=menus.map(m=>`<button class="${activeMenu===m?'active':''}" onclick="setMenu('${m}')">${m}</button>`).join('');
}
const renderContentBeforeV65 = renderContent;
renderContent = function(){
  if(activeMenu==='Manajemen Akses') return renderManajemenAkunV65();
  return renderContentBeforeV65();
};
function verifierUsersV65(){ return dashboard?.verifierUsers || []; }
function bidangChecksV65(selected=[]){
  const set=new Set((selected||[]).map(String));
  return (dashboard?.bidangs||[]).map(b=>`<label class="account-scope-item"><input type="checkbox" name="akunBidang" value="${esc(b.id_bidang)}" ${set.has(String(b.id_bidang))?'checked':''}><span><b>${esc(b.nama_bidang)}</b><small>${esc(b.id_bidang)}</small></span></label>`).join('');
}
function renderManajemenAkunV65(){
  if(!isSuperAdminV65()){ document.getElementById('contentArea').innerHTML='<section class="panel"><h3>Akses ditolak</h3></section>'; return; }
  const users=verifierUsersV65();
  const rows=users.map(u=>{
    const ids=String(u.bidang_akses||'').split(',').map(x=>x.trim()).filter(Boolean);
    const names=ids.map(id=>bidangName(id)).join(', ') || '-';
    return `<div class="admin-budget-card account-card-v65">
      <div class="admin-budget-info"><b>${esc(u.nama||'-')}</b><small>${esc(u.id_user||'')} • ${esc(u.username||'')}</small></div>
      <div><span class="badge badge-blue">${esc(String(u.role||'').replaceAll('_',' '))}</span></div>
      <div class="account-scope-text"><small>Bidang Penugasan</small><br>${esc(names)}</div>
      <div>${badge(u.status||'AKTIF')}</div>
      <div><button class="btn-mini" onclick="openEditVerifierV65('${esc(u.id_user)}')">Edit</button></div>
    </div>`;
  }).join('');
  document.getElementById('contentArea').innerHTML=`<section class="panel fade-up premium-panel">
    <div class="panel-title-row"><div><h3>Manajemen Akses dan Akun Verifikator</h3><p class="panel-sub">Admin membuat akun Verifikator/Keuangan dan menentukan bidang yang boleh ditangani.</p></div><button class="btn-refresh" onclick="openCreateVerifierV65()">+ Buat Akun</button></div>
    <div class="admin-budget-list">${rows||'<p class="muted">Belum ada akun verifikator tambahan.</p>'}</div>
  </section><div id="verifierModalV65" class="modal hidden"></div>`;
}
function verifierFormModalV65(u){
  const editing=!!u;
  const selected=String(u?.bidang_akses||'').split(',').map(x=>x.trim()).filter(Boolean);
  const modal=document.getElementById('verifierModalV65');
  modal.className='modal';
  modal.innerHTML=`<div class="modal-card modal-wide"><div class="modal-head"><h3>${editing?'Edit':'Buat'} Akun Verifikator</h3><button onclick="closeVerifierModalV65()">×</button></div>
    <div class="form-grid">
      <div class="field"><label>Nama Petugas</label><input id="akunNama" value="${esc(u?.nama||'')}" placeholder="Contoh: Udin"></div>
      <div class="field"><label>Role</label><select id="akunRole"><option value="VERIFIKATOR_PBJ" ${String(u?.role)==='VERIFIKATOR_PBJ'?'selected':''}>Verifikator</option><option value="VERIFIKATOR_KEUANGAN" ${String(u?.role)==='VERIFIKATOR_KEUANGAN'?'selected':''}>Verifikator</option></select></div>
      <div class="field"><label>Username</label><input id="akunUsername" value="${esc(u?.username||'')}" placeholder="udin_pbj"></div>
      <div class="field"><label>Password ${editing?'(kosongkan jika tidak diubah)':''}</label><input id="akunPassword" type="text" placeholder="Password akun"></div>
      ${editing?`<div class="field"><label>Status</label><select id="akunStatus"><option value="AKTIF" ${String(u?.status).toUpperCase()==='AKTIF'?'selected':''}>AKTIF</option><option value="NONAKTIF" ${String(u?.status).toUpperCase()==='NONAKTIF'?'selected':''}>NONAKTIF</option></select></div>`:''}
    </div>
    <div class="field"><label>Pilih Bidang Penugasan</label><div class="account-scope-grid">${bidangChecksV65(selected)}</div></div>
    <div class="modal-actions"><button class="btn-soft" onclick="closeVerifierModalV65()">Batal</button><button onclick="saveVerifierV65('${esc(u?.id_user||'')}')">Simpan</button></div>
  </div>`;
}
function openCreateVerifierV65(){ verifierFormModalV65(null); }
function openEditVerifierV65(id){ const u=verifierUsersV65().find(x=>String(x.id_user)===String(id)); if(u) verifierFormModalV65(u); }
function closeVerifierModalV65(){ const m=document.getElementById('verifierModalV65'); if(m){m.className='modal hidden';m.innerHTML='';} }
async function saveVerifierV65(id){
  const bidang_akses=[...document.querySelectorAll('input[name="akunBidang"]:checked')].map(x=>x.value);
  const data={id_user:id,nama:document.getElementById('akunNama').value.trim(),role:document.getElementById('akunRole').value,username:document.getElementById('akunUsername').value.trim(),password:document.getElementById('akunPassword').value,bidang_akses,status:document.getElementById('akunStatus')?.value||'AKTIF'};
  if(!data.nama||!data.username||(!id&&!data.password)||!bidang_akses.length){ alert('Nama, username, password, dan minimal satu bidang wajib diisi.'); return; }
  showLoading('Menyimpan akun...');
  try{ const r=await apiPost({action:id?'updateVerifierAccount':'saveVerifierAccount',user:currentUser,data}); alert(r.message); if(r.success){closeVerifierModalV65();await loadDashboard(false);} }catch(e){alert(e.message)}finally{hideLoading();}
}

/* =========================
   SIMPROV v66 - Revisi waktu edit & laporan berbasis role
   1) Waktu Pemilihan pada modal edit selalu mengikuti data terakhir.
   2) Laporan Verifikator hanya memuat bidang penugasannya.
   3) Laporan Verifikator hanya memuat Rekap Dokumen Pencairan
      per Kegiatan dari bidang penugasannya.
   ========================= */
function normalizeDateForInputV61(v){
  if(v === null || v === undefined || v === '') return '';

  // Google Apps Script dapat mengirim Date sebagai ISO timestamp.
  // Gunakan tanggal lokal browser agar tanggal WIB tidak mundur satu hari.
  if(v instanceof Date && !isNaN(v.getTime())){
    return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
  }

  const s = String(v).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  if(/^\d{4}-\d{2}-\d{2}T/.test(s)){
    const d = new Date(s);
    if(!isNaN(d.getTime())){
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    return s.slice(0,10);
  }

  const slash = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if(slash) return `${slash[3]}-${String(slash[2]).padStart(2,'0')}-${String(slash[1]).padStart(2,'0')}`;

  const bulan = {
    januari:'01', februari:'02', maret:'03', april:'04', mei:'05', juni:'06',
    juli:'07', agustus:'08', september:'09', oktober:'10', november:'11', desember:'12'
  };
  const indo = s.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if(indo && bulan[indo[2]]) return `${indo[3]}-${bulan[indo[2]]}-${String(indo[1]).padStart(2,'0')}`;

  const d = new Date(s);
  if(!isNaN(d.getTime())){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  return '';
}

function reportDocStatusV66(d){
  return String(d?.status_verifikasi || 'MENUNGGU VERIFIKASI DOKUMEN').trim().toUpperCase();
}
function reportGroupDocStatusV66(docs){
  if(!docs?.length) return 'BELUM ADA DOKUMEN';
  const sts = docs.map(reportDocStatusV66);
  if(sts.some(s => s.includes('PERBAIKAN'))) return 'PERLU PERBAIKAN DOKUMEN';
  if(sts.every(s => s === 'VALID' || s === 'VALID DOKUMEN')) return 'VALID DOKUMEN';
  if(sts.some(s => s.includes('VERIFIKASI PERBAIKAN'))) return 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
  return 'MENUNGGU VERIFIKASI DOKUMEN';
}
function reportCatatanDokumenV66(d){
  return d?.catatan_keuangan || d?.catatan_admin || d?.catatan_Verifikator || d?.catatan || '-';
}
function reportTahapanDokumenV66(d){
  const rows=[];
  rows.push(`Upload awal: ${formatTanggalJam(d.tanggal_upload)} oleh ${d.upload_by || '-'}`);
  if(d.tanggal_verifikasi || d.verifikasi_by || reportCatatanDokumenV66(d) !== '-'){
    rows.push(`Pemeriksaan Verifikator: ${formatTanggalJam(d.tanggal_verifikasi)} oleh ${d.verifikasi_by || '-'} - ${displayStatusText(d.status_verifikasi || 'MENUNGGU VERIFIKASI DOKUMEN')}${reportCatatanDokumenV66(d) !== '-' ? ' ('+reportCatatanDokumenV66(d)+')' : ''}`);
  }
  if(d.tanggal_revisi || d.revisi_by) rows.push(`Upload ulang/perbaikan: ${formatTanggalJam(d.tanggal_revisi)} oleh ${d.revisi_by || '-'}`);
  rows.push(`Posisi akhir: ${displayStatusText(d.status_verifikasi || 'MENUNGGU VERIFIKASI DOKUMEN')}`);
  return rows.join('\n');
}
function reportDokumenGroupedRowsV66(dokumen){
  const grouped={};
  (dokumen || []).forEach(d => {
    const id=String(d.id_kegiatan || '-');
    if(!grouped[id]) grouped[id]=[];
    grouped[id].push(d);
  });
  return Object.entries(grouped).map(([id,docs],i)=>{
    const first=docs[0] || {};
    const rincian=docs.map((d,idx)=>`<div class="doc-report-item">
      <b>${idx+1}. ${plainText(normalizeJenisDokumenLabel(d.jenis_dokumen))}</b><br>
      File: ${plainText(d.nama_file || '-')} ${d.url_file ? ` - ${htmlLink(d.url_file,'Buka File')}` : ''}<br>
      Status: <b>${plainText(displayStatusText(d.status_verifikasi || 'MENUNGGU VERIFIKASI DOKUMEN'))}</b><br>
      Catatan Verifikator: ${plainText(reportCatatanDokumenV66(d))}<br>
      Tahapan: ${plainText(reportTahapanDokumenV66(d)).replace(/\n/g,'<br>')}
    </div>`).join('');
    return `<tr><td>${i+1}</td><td>${plainText(bidangName(first.id_bidang))}</td><td>${plainText(kegiatanName(id))}<br><span class="small">${plainText(id)}</span></td><td class="status">${plainText(reportGroupDocStatusV66(docs))}</td><td class="status">${plainText(displayStatusText(getPencairanStatus(id)))}</td><td>${docs.length} dokumen</td><td>${rincian}</td></tr>`;
  }).join('');
}
function assignedReportIdsV66(){
  return String(currentUser?.bidang_akses || '').split(/[,;|\n]+/).map(x=>x.trim()).filter(Boolean);
}
function filterAssignedV66(rows){
  const ids=assignedReportIdsV66();
  if(isSuperAdminV65() || REVIEWER_ROLES.includes(roleCode())) return rows || [];
  if(isPBJVerifierV65() || isKeuangan()) return (rows || []).filter(x=>ids.includes(String(x.id_bidang)));
  return (rows || []).filter(x=>String(x.id_bidang)===String(currentUser?.id_bidang || ''));
}
function downloadDashboardPDF(){
  const rekap=filterAssignedV66(dashboard.rekap || []);
  const perencanaan=filterAssignedV66(dashboard.perencanaan || []);
  const dokumen=filterAssignedV66(dashboard.dokumen || []);

  if(isKeuangan()){
    const rows=reportDokumenGroupedRowsV66(dokumen);
    const bidangNames=[...new Set(dokumen.map(d=>bidangName(d.id_bidang)))].filter(Boolean).join(', ') || '-';
    const body=`<div class="note"><b>Verifikator:</b> ${plainText(currentUser?.nama || '-')}<br><b>Bidang Penugasan:</b> ${plainText(bidangNames)}</div>
      <h3>Rekap Dokumen Pencairan per Kegiatan</h3>
      <table><thead><tr><th>No</th><th>Bidang</th><th>Kegiatan</th><th>Status Dokumen Kegiatan</th><th>Status Pencairan Kegiatan</th><th>Jumlah Dokumen</th><th>Rincian Dokumen dan Tahapan Proses</th></tr></thead><tbody>${rows || '<tr><td colspan="7">Belum ada dokumen pencairan pada bidang penugasan</td></tr>'}</tbody></table>`;
    openReportWindow('Laporan Verifikator - Bidang Penugasan',body);
    return;
  }

  const pagu=rekap.reduce((s,r)=>s+toNumber(r.pagu),0);
  const total=rekap.reduce((s,r)=>s+toNumber(r.total_perencanaan),0);
  const sisa=pagu-total;
  const rowsRekap=rekap.map((r,i)=>`<tr><td>${i+1}</td><td>${plainText(r.nama_bidang)}<br><span class="small">${plainText(r.id_bidang)}</span></td><td>${rupiah(r.pagu)}</td><td>${rupiah(r.total_perencanaan)}</td><td>${rupiah(r.sisa_pagu)}</td><td>${plainText(r.jumlah_kegiatan||0)}</td><td>${plainText(r.dokumen_upload||0)}</td><td>${plainText(r.dokumen_valid||0)}</td><td>${plainText(r.status_akses||'-')}</td><td class="status">${plainText(displayStatusText(r.status_progress||'-'))}</td></tr>`).join('');
  const rowsPerencanaan=perencanaan.map((k,i)=>{
    const jumlah=toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
    const posisi=typeof getRencanaPosisiSaatIni==='function' ? getRencanaPosisiSaatIni(k) : displayStatusText(k.status_perencanaan||'-');
    const riwayat=reportRiwayatPerencanaan(k);
    return `<tr><td>${i+1}</td><td>${plainText(k.id_kegiatan)}</td><td>${plainText(bidangName(k.id_bidang))}</td><td>${plainText(k.nama_kegiatan)}</td><td>${plainText(k.keterangan||'-')}</td><td>${plainText(k.volume||0)} ${plainText(k.satuan||'')}</td><td>${rupiah(k.harga_satuan)}</td><td>${rupiah(jumlah)}</td><td>${plainText(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</td><td>${plainText(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : '-')}</td><td class="status">${plainText(posisi)}</td><td>${plainText(formalReportText(riwayat)).replace(/\n/g,'<br>')}</td><td>${plainText(displayStatusText(getPencairanStatus(k.id_kegiatan)))}</td></tr>`;
  }).join('');
  const rowsDok=reportDokumenGroupedRowsV66(dokumen);
  const title=isPBJVerifierV65() && !isSuperAdminV65() ? 'Laporan Verifikator - Bidang Penugasan' : (isSuperAdminV65() ? 'Laporan Monitoring Keseluruhan SIMPROV' : `Laporan Monitoring Bidang ${currentUser?.nama_bidang || currentUser?.nama || ''}`);
  const body=`<div class="summary"><div class="card"><span>Total Pagu</span><b>${rupiah(pagu)}</b></div><div class="card"><span>Total Perencanaan</span><b>${rupiah(total)}</b></div><div class="card"><span>Sisa Pagu</span><b>${rupiah(sisa)}</b></div><div class="card"><span>Jumlah Kegiatan</span><b>${perencanaan.length}</b></div></div>
    <h3>1. Rekapitulasi Anggaran per Bidang</h3><table><thead><tr><th>No</th><th>Bidang</th><th>Pagu</th><th>Perencanaan</th><th>Sisa</th><th>Kegiatan</th><th>Dok Upload</th><th>Dok Valid</th><th>Akses</th><th>Progress</th></tr></thead><tbody>${rowsRekap || '<tr><td colspan="10">Belum ada data</td></tr>'}</tbody></table>
    <h3>2. Rekap Data Perencanaan dan Riwayat Pemeriksaan</h3><table><thead><tr><th>No</th><th>ID Kegiatan</th><th>Bidang</th><th>Nama Kegiatan</th><th>Keterangan</th><th>Volume</th><th>Harga Satuan</th><th>Jumlah</th><th>Metode</th><th>Waktu Pemilihan</th><th>Posisi Saat Ini</th><th>Riwayat Perencanaan</th><th>Status Pencairan</th></tr></thead><tbody>${rowsPerencanaan || '<tr><td colspan="13">Belum ada data perencanaan</td></tr>'}</tbody></table>
    <h3>3. Rekap Dokumen Pencairan per Kegiatan</h3><table><thead><tr><th>No</th><th>Bidang</th><th>Kegiatan</th><th>Status Dokumen Kegiatan</th><th>Status Pencairan Kegiatan</th><th>Jumlah Dokumen</th><th>Rincian Dokumen dan Tahapan Proses</th></tr></thead><tbody>${rowsDok || '<tr><td colspan="7">Belum ada dokumen pencairan</td></tr>'}</tbody></table>`;
  openReportWindow(title,body);
}
function cetakLaporan(){ downloadDashboardPDF(); }
function generateReport(){ downloadDashboardPDF(); }
function downloadLaporanPDF(){ downloadDashboardPDF(); }


/* =========================
   SIMPROV v67 - Superadmin dua tahap & status final PBJ
   ========================= */
function canVerifyKeuangan(){ return isKeuangan() || isSuperAdminV65(); }
function canFinalizePBJ(){ return isPBJVerifierV65(); }

/* =========================
   SIMPROV v70 - finalisasi PBJ stabil + detail kegiatan pada pencairan
   ========================= */
function roleNormV70(){
  return String(currentUser?.role || currentUser?.nama_role || currentUser?.id_bidang || '')
    .trim().toUpperCase().replace(/[\s-]+/g,'_');
}
function isPBJFinalizerV70(){
  return ['ADMIN','SUPERADMIN','SUPER_ADMIN','VERIFIKATOR_PBJ','VERIF_PBJ','PBJ'].includes(roleNormV70());
}
function canFinalizePBJ(){ return isPBJFinalizerV70(); }
function canVerifyPBJ(){ return isPBJFinalizerV70(); }
function rencanaByIdV70(id){
  return (dashboard?.perencanaan || []).find(x => String(x.id_kegiatan) === String(id)) || {};
}
function docStatusNormV70(d){
  return String(d?.status_verifikasi || '').trim().toUpperCase().replace(/_/g,' ');
}
function isDocValidKeuanganV70(d){
  const s=docStatusNormV70(d);
  return s === 'VALID' || s === 'VALID DOKUMEN' || s === 'VALID OLEH KEUANGAN';
}
function normalizeDocKeyV71(v){
  return String(normalizeJenisDokumenLabel(v)||v||'').trim().toUpperCase().replace(/\s*\/\s*/g,' / ').replace(/\s+/g,' ');
}
function documentProgressV71(idKegiatan){
  const meta=kegiatanMetaV70(idKegiatan);
  const required=dokumenKetentuanByMetode(meta.metode);
  const docs=(dashboard?.dokumen || []).filter(d=>String(d.id_kegiatan)===String(idKegiatan));
  const byKey=new Map();
  docs.forEach(d=>byKey.set(normalizeDocKeyV71(d.jenis_dokumen),d));
  const requiredDocs=required.map(j=>({jenis:j,doc:byKey.get(normalizeDocKeyV71(j))||null}));
  const uploaded=requiredDocs.filter(x=>x.doc).length;
  const valid=requiredDocs.filter(x=>x.doc && isDocValidKeuanganV70(x.doc)).length;
  const missing=requiredDocs.filter(x=>!x.doc).map(x=>x.jenis);
  const invalid=requiredDocs.filter(x=>x.doc && !isDocValidKeuanganV70(x.doc)).map(x=>x.jenis);
  return {required,requiredCount:required.length,docs,uploaded,valid,missing,invalid,completeUpload:uploaded===required.length,allValid:valid===required.length && required.length>0};
}
function allDocsValidKeuanganV64(idKegiatan){
  return documentProgressV71(idKegiatan).allValid;
}
function effectivePencairanStatusV70(g){
  const saved=String(getPencairanStatus(g.id_kegiatan)||'').toUpperCase();
  if(saved==='SELESAI') return 'SELESAI';
  const docs=g.docs||[];
  const prog=documentProgressV71(g.id_kegiatan);
  if(!docs.length) return 'MENUNGGU DOKUMEN PENCAIRAN';
  if(!prog.completeUpload) return 'DOKUMEN BELUM LENGKAP';
  if(prog.allValid) return 'MENUNGGU FINALISASI';
  if(docs.some(isDocRepairV64)) return 'PERBAIKAN DOKUMEN';
  if(docs.some(d=>docStatusNormV70(d).includes('PERBAIKAN'))) return 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
  return 'MENUNGGU VERIFIKASI DOKUMEN';
}
function formatInputDateTimeV70(v){
  if(!v) return '-';
  try { return fmtDateTimeID(v); } catch(e) { return formatTanggalJam(v); }
}
function kegiatanMetaV70(id){
  const k=rencanaByIdV70(id);
  const jumlah=toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
  return {
    k,
    jumlah,
    metode:k.metode_pemilihan || metodePemilihanByNilai(jumlah),
    waktu:k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : '-',
    tanggal:k.tanggal_input ? formatInputDateTimeV70(k.tanggal_input) : (k.created_at ? formatInputDateTimeV70(k.created_at) : '-')
  };
}
async function selesaikanKegiatanPBJ(idKegiatan){
  if(!isPBJFinalizerV70()){ alert('Akses finalisasi hanya untuk Admin/Superadmin atau Verifikator.'); return; }
  if(!allDocsValidKeuanganV64(idKegiatan)){
    alert('Belum dapat diselesaikan. Seluruh dokumen harus berstatus VALID DOKUMEN terlebih dahulu.'); return;
  }
  if(!confirm('Seluruh dokumen sudah VALID DOKUMEN. Verifikasi PBJ dan ubah status kegiatan menjadi SELESAI?')) return;
  showLoading('Verifikasi PBJ dan menyelesaikan kegiatan...');
  try{
    const r=await apiPost({action:'updateStatusPencairan',user:currentUser,id_kegiatan:idKegiatan,status_pencairan:'SELESAI',catatan_admin:'Diverifikasi PBJ dan diselesaikan oleh '+(currentUser?.nama||currentUser?.username||'Verifikator')});
    alert(r.message || (r.success?'Kegiatan berhasil diselesaikan.':'Gagal menyelesaikan kegiatan.'));
    if(r.success) await loadDashboard(false);
  }catch(e){ alert(e.message || 'Gagal menyelesaikan kegiatan.'); }
  finally{ hideLoading(); }
}
function renderDokumenGroupRow(g){
  const stGroup=groupDocStatus(g);
  const stCair=effectivePencairanStatusV70(g);
  const isCollapsed=docGroupCollapse[g.id_kegiatan]===undefined?false:!!docGroupCollapse[g.id_kegiatan];
  const colorClass=docGroupColorClassV62(g);
  const meta=kegiatanMetaV70(g.id_kegiatan);
  const docsHtml=(g.docs||[]).map(d=>{
    let actionHtml='<span class="muted">-</span>';
    if(canVerifyKeuangan()){
      if(canVerifyDocumentNowV64(d)) actionHtml=`<div class="doc-file-actions v59-file-actions"><button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button><button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button></div>`;
      else actionHtml='<div class="doc-file-actions v59-file-actions"><button class="btn-mini btn-disabled" disabled>Valid</button><button class="btn-mini btn-disabled" disabled>Perbaikan</button></div>';
    }else if(isPBJFinalizerV70() || isReviewer()) actionHtml='<span class="audit-pill">Read-only</span>';
    else if(isDocRepairV64(d)) actionHtml=`<div class="doc-action-box per-file-revision compact-revision"><div class="revision-title">Upload Ulang</div><input type="file" id="revisi_${esc(d.id_dokumen)}"><button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button></div>`;
    return `<div class="doc-item doc-item-v47 ${isDocRepairV64(d)?'doc-item-repair':(isDocValidKeuanganV70(d)?'doc-item-valid':'doc-item-wait')}"><div class="doc-main-info"><b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen)||'-')}</b><small class="muted">${esc(d.nama_file||'-')}</small></div><div class="doc-link">${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file||'-')}</div><div class="doc-status">${badge(d.status_verifikasi||'MENUNGGU VERIFIKASI DOKUMEN')}</div><div class="doc-file-note-action compact-status-action v59-status-action"><button class="btn-mini btn-detail" onclick="openDocStatusModal('${esc(d.id_dokumen)}')">Lihat Status</button>${actionHtml}</div></div>`;
  }).join('');
  const prog=documentProgressV71(g.id_kegiatan);
  let finalAction='';
  if(isPBJFinalizerV70()){
    if(stCair==='SELESAI') finalAction='<span class="status-done-pill">SELESAI</span>';
    else if(prog.allValid) finalAction=`<button class="btn-mini btn-green btn-wide v70-final-btn" onclick="selesaikanKegiatanPBJ('${esc(g.id_kegiatan)}')">Selesaikan Kegiatan</button>`;
    else finalAction=`<button class="btn-mini btn-disabled btn-wide v70-final-btn" disabled>${prog.uploaded}/${prog.requiredCount} Dokumen • ${prog.valid} Valid</button>`;
  }else finalAction='<span class="muted">Finalisasi dilakukan Verifikator</span>';
  const progressHtml=`<div class="v72-doc-progress"><b>${prog.uploaded}/${prog.requiredCount} Dokumen Terunggah</b><span>${prog.valid}/${prog.requiredCount} Valid Dokumen</span>${prog.missing.length?`<small>Belum diupload: ${esc(prog.missing.join(', '))}</small>`:''}</div>`;
  const finalNote=stCair==='MENUNGGU FINALISASI'?'Seluruh dokumen wajib sudah lengkap dan valid Keuangan. Siap diverifikasi PBJ.':(stCair==='SELESAI'?'Kegiatan telah selesai.':(!prog.completeUpload?`Dokumen wajib belum lengkap (${prog.uploaded}/${prog.requiredCount}).`:`Menunggu validasi Keuangan (${prog.valid}/${prog.requiredCount} valid).`));
  return `<tr><td class="doc-group-card ${prog.allValid?colorClass:(prog.missing.length?'doc-group-blue':colorClass)}"><div class="doc-group-head doc-group-head-v12 v70-group-head"><div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small><div class="v70-kegiatan-meta"><span><b>Jumlah:</b> ${rupiah(meta.jumlah)}</span><span><b>Metode:</b> ${esc(meta.metode)}</span><span><b>Waktu Pemilihan:</b> ${esc(meta.waktu)}</span></div></div><div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div><div><small class="muted">Kelengkapan</small><br>${progressHtml}</div><div><small class="muted">Status Pencairan</small><br>${badge(stCair)}</div><div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed?'Lihat Rincian':'Minimize'}</button></div></div><div class="doc-list ${isCollapsed?'hidden':''}">${docsHtml}</div><div class="v70-final-row"><div><b>Tahap Finalisasi</b><small>${finalNote}</small></div>${finalAction}</div></td></tr>`;
}
function openDocStatusModal(idDokumen){
  const d=(dashboard?.dokumen||[]).find(x=>String(x.id_dokumen)===String(idDokumen));
  if(!d){alert('Data dokumen tidak ditemukan.');return;}
  const meta=kegiatanMetaV70(d.id_kegiatan), k=meta.k;
  const cat=d.catatan_keuangan||d.catatan_admin||d.catatan_Verifikator||d.catatan||'-';
  const html=`<div class="status-modal-backdrop" id="docStatusModal" onclick="if(event.target.id==='docStatusModal') closeDocStatusModal()"><div class="status-modal-card v70-status-card"><div class="status-modal-head"><h3>Status Dokumen</h3><button type="button" onclick="closeDocStatusModal()">Tutup</button></div><div class="status-modal-body"><div class="status-doc-title"><b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen)||'-')}</b><span>${esc(kegiatanName(d.id_kegiatan))}</span></div><div class="v70-plan-box"><h4>Data Perencanaan</h4><p><b>Nama kegiatan:</b> ${esc(k.nama_kegiatan||kegiatanName(d.id_kegiatan)||'-')}</p><p><b>Bidang:</b> ${esc(bidangName(d.id_bidang))}</p><p><b>Jumlah:</b> ${rupiah(meta.jumlah)}</p><p><b>Metode:</b> ${esc(meta.metode)}</p><p><b>Waktu Pemilihan:</b> ${esc(meta.waktu)}</p><p><b>Tanggal Input:</b> ${esc(meta.tanggal)}</p></div><div class="status-row status-position-row"><div class="status-no">✓</div><div><b>Posisi Saat Ini</b><p>${badge(d.status_verifikasi||'MENUNGGU VERIFIKASI DOKUMEN')}</p></div></div><div class="status-row"><div class="status-no">1.</div><div><b>Upload awal</b><p><b>Tanggal:</b> ${formatInputDateTimeV70(d.tanggal_upload)}</p><p><b>Oleh:</b> ${esc(d.upload_by||'-')}</p><p><b>File:</b> ${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file||'Buka file')}</a>`:esc(d.nama_file||'-')}</p></div></div><div class="status-row"><div class="status-no">2.</div><div><b>Pemeriksaan Verifikator</b><p><b>Status:</b> ${esc(displayStatusTextV60(d.status_verifikasi||'MENUNGGU VERIFIKASI DOKUMEN'))}</p><p><b>Tanggal:</b> ${formatInputDateTimeV70(d.tanggal_verifikasi)}</p><p><b>Verifikator:</b> ${esc(d.verifikasi_by||'-')}</p><p><b>Catatan:</b> ${esc(cat)}</p></div></div>${d.tanggal_revisi?`<div class="status-row"><div class="status-no">3.</div><div><b>Upload ulang/perbaikan</b><p><b>Tanggal:</b> ${formatInputDateTimeV70(d.tanggal_revisi)}</p><p><b>Oleh:</b> ${esc(d.revisi_by||'-')}</p></div></div>`:''}${d.riwayat_dokumen?`<div class="status-row"><div class="status-no">R.</div><div><b>Riwayat Dokumen</b><p>${esc(normalizeVerifierHistoryV91(d.riwayat_dokumen)).replace(/\n/g,'<br>')}</p></div></div>`:''}</div></div></div>`;
  document.getElementById('docStatusModal')?.remove();
  document.body.insertAdjacentHTML('beforeend',html);
}

/* =========================
   SIMPROV v73
   Perbandingan data sebelum dan sesudah perbaikan/perubahan perencanaan.
   ========================= */
function decodeCompareV73(line){
  try{
    const marker = "__COMPARE_V73__";
    if(!String(line||"").startsWith(marker)) return null;
    let b64 = String(line).slice(marker.length).replace(/-/g,"+").replace(/_/g,"/");
    while(b64.length % 4) b64 += "=";
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder("utf-8").decode(bytes));
  }catch(e){ return null; }
}
function getCompareHistoryV73(k){
  return String(k?.riwayat_perubahan||"").split(/\n+/).map(decodeCompareV73).filter(Boolean);
}
function cleanRencanaHistoryV73(k){
  return String(k?.riwayat_perubahan||"").split(/\n+/).filter(x => x && !x.startsWith("__COMPARE_V73__"));
}
function compareValV73(field, value){
  if(["harga_satuan","jumlah"].includes(field)) return rupiah(toNumber(value));
  if(field === "waktu_pemilihan") return value ? formatTanggalID(value) : "-";
  return String(value ?? "-") || "-";
}
function renderCompareV73(c){
  if(!c) return "";
  const labels = {
    nama_kegiatan:"Nama Kegiatan", keterangan:"Keterangan", volume:"Volume", satuan:"Satuan",
    harga_satuan:"Harga Satuan", jumlah:"Jumlah", metode_pemilihan:"Metode", waktu_pemilihan:"Waktu Pemilihan"
  };
  const fields = Object.keys(labels);
  const changed = fields.filter(f => String(c.sebelum?.[f] ?? "") !== String(c.sesudah?.[f] ?? ""));
  const rows = fields.map(f => {
    const beda = changed.includes(f);
    return `<tr class="${beda?'compare-changed-v73':''}"><td><b>${labels[f]}</b>${beda?'<span class="compare-badge-v73">DIUBAH</span>':''}</td><td>${esc(compareValV73(f,c.sebelum?.[f]))}</td><td>${esc(compareValV73(f,c.sesudah?.[f]))}</td></tr>`;
  }).join("");
  return `<div class="compare-wrap-v73"><div class="compare-head-v73"><b>Perbandingan Sebelum & Setelah</b><span>${esc(c.waktu||"")} · ${esc(c.oleh||"User Bidang")}</span></div><div class="compare-table-scroll-v73"><table class="compare-table-v73"><thead><tr><th>Data</th><th>Sebelum</th><th>Setelah</th></tr></thead><tbody>${rows}</tbody></table></div>${changed.length?`<p class="compare-note-v73">${changed.length} bagian data mengalami perubahan.</p>`:`<p class="compare-note-v73">Tidak ada perbedaan nilai yang terdeteksi.</p>`}</div>`;
}

// Override final agar tombol Lihat Riwayat pada proses perbaikan menjadi Lihat Perubahan.
const renderPerencanaanRowV72 = renderPerencanaanRow;
renderPerencanaanRow = function(k){
  let html = renderPerencanaanRowV72(k);
  const st = String(k?.status_perencanaan||"").toUpperCase();
  const isRepair = st === "DIAJUKAN" && (typeof isRencanaProsesPerbaikanV57 === "function" ? isRencanaProsesPerbaikanV57(k) : false);
  if(isRepair && getCompareHistoryV73(k).length){
    html = html.replace(/>Lihat Riwayat<\/button>/, '>Lihat Perubahan</button>');
  }
  return html;
};

// Override modal status perencanaan: tampilkan snapshot perubahan terbaru sebelum tombol Setujui/Minta Perbaikan digunakan.
openRencanaStatusModal = function(idKegiatan){
  const k = (dashboard?.perencanaan || []).find(x => String(x.id_kegiatan) === String(idKegiatan));
  if(!k){ alert("Data perencanaan tidak ditemukan."); return; }
  const st = String(k.status_perencanaan || "DIAJUKAN").toUpperCase();
  const posisi = getRencanaPosisiSaatIni(k);
  const jumlah = toNumber(k.jumlah || (toNumber(k.volume)*toNumber(k.harga_satuan)));
  const compare = getCompareHistoryV73(k);
  const latestCompare = compare.length ? compare[compare.length-1] : null;
  const history = cleanRencanaHistoryV73(k);
  const rows = [];
  rows.push(`<div class="status-row status-position-row"><div class="status-no">✓</div><div><b>Posisi Saat Ini</b><p><span class="status-position-text ${st === "DISETUJUI" ? "pos-valid" : (st === "DITOLAK" ? "pos-repair" : "pos-wait")}">${esc(posisi)}</span></p></div></div>`);
  if(latestCompare && ["DIAJUKAN","PERUBAHAN_DIAJUKAN"].includes(st)){
    rows.push(`<div class="status-row compare-status-row-v73"><div class="status-no">↔</div><div><b>Data Perubahan yang Sedang Diajukan</b>${renderCompareV73(latestCompare)}</div></div>`);
  }
  rows.push(`<div class="status-row"><div class="status-no">1.</div><div><b>Data Perencanaan Saat Ini</b><p><b>Nama kegiatan:</b> ${esc(k.nama_kegiatan || "-")}</p><p><b>Bidang:</b> ${esc(bidangName(k.id_bidang))}</p><p><b>Jumlah:</b> ${rupiah(jumlah)}</p><p><b>Metode:</b> ${esc(k.metode_pemilihan || metodePemilihanByNilai(jumlah))}</p><p><b>Waktu Pemilihan:</b> ${esc(k.waktu_pemilihan ? formatTanggalID(k.waktu_pemilihan) : "-")}</p><p><b>Tanggal Input:</b> ${fmtDateTimeID(k.tanggal_input)}</p></div></div>`);
  if(k.alasan_penolakan) rows.push(`<div class="status-row"><div class="status-no">2.</div><div><b>Catatan Verifikator Sebelumnya</b><p>${esc(k.alasan_penolakan)}</p></div></div>`);
  if(k.alasan_perubahan || toNumber(k.perubahan_ke)) rows.push(`<div class="status-row"><div class="status-no">3.</div><div><b>Pengajuan Perubahan</b><p><b>Perubahan:</b> ${toNumber(k.perubahan_ke) ? `Perubahan Ke-${toNumber(k.perubahan_ke)}` : "-"}</p>${k.alasan_perubahan ? `<p><b>Alasan perubahan:</b> ${esc(k.alasan_perubahan)}</p>` : ""}</div></div>`);
  if(history.length) rows.push(`<div class="status-row"><div class="status-no">R.</div><div><b>Riwayat Perencanaan</b><p>${history.map(x=>esc(x).replace(/\bADMIN\b/g,"Verifikator").replace(/\bAdmin\b/g,"Verifikator")).join("<br>")}</p></div></div>`);
  const html = `<div class="status-modal-backdrop" id="rencanaStatusModal" onclick="if(event.target.id==='rencanaStatusModal') closeRencanaStatusModal()"><div class="status-modal-card status-modal-wide-v73"><div class="status-modal-head"><h3>${latestCompare ? "Perubahan Perencanaan" : "Status Perencanaan"}</h3><button type="button" onclick="closeRencanaStatusModal()">Tutup</button></div><div class="status-modal-body"><div class="status-doc-title"><b>${esc(k.nama_kegiatan || "-")}</b><span>${esc(k.id_kegiatan || "-")}</span></div>${rows.join("")}</div></div></div>`;
  document.getElementById("rencanaStatusModal")?.remove();
  document.body.insertAdjacentHTML("beforeend", html);
};

/* =========================
   SIMPROV v74
   1. Legenda warna tampil juga pada menu Perencanaan User Bidang.
   2. Jika tahap pencairan kegiatan sudah SELESAI, aksi pada tabel
      Perencanaan User Bidang menampilkan status SELESAI.
   ========================= */
function injectStatusLegendV74(){
  const panels = Array.from(document.querySelectorAll('#contentArea .panel, #contentArea section'));
  const panel = panels.find(p => p.querySelector('table') && /Data Perencanaan|Persetujuan Perencanaan|Pemeriksaan Data Perencanaan/i.test(p.textContent || ''));
  if(!panel) return;
  panel.querySelectorAll('.status-legend-v74').forEach(x => x.remove());
  const tableWrap = panel.querySelector('.table-wrap') || panel.querySelector('table');
  if(!tableWrap) return;
  const legend = document.createElement('div');
  legend.className = 'status-legend-v60 status-legend-v74';
  legend.innerHTML = '<span><i class="l-green"></i>Disetujui / valid</span><span><i class="l-red"></i>Perlu perbaikan</span><span><i class="l-blue"></i>Diajukan / menunggu verifikasi</span><span><i class="l-yellow"></i>Menunggu verifikasi perbaikan</span>';
  tableWrap.parentNode.insertBefore(legend, tableWrap);
}

if(typeof renderPerencanaan === 'function' && !window.__renderPerencanaanV74Wrapped){
  window.__renderPerencanaanV74Wrapped = true;
  const __renderPerencanaanBeforeV74 = renderPerencanaan;
  renderPerencanaan = function(){
    const result = __renderPerencanaanBeforeV74.apply(this, arguments);
    setTimeout(injectStatusLegendV74, 0);
    return result;
  };
}

function isKegiatanSelesaiV74(idKegiatan){
  const status = String(getPencairanStatus(idKegiatan) || '').trim().toUpperCase().replace(/_/g, ' ');
  return status === 'SELESAI';
}

if(typeof renderPerencanaanRow === 'function' && !window.__renderPerencanaanRowV74Wrapped){
  window.__renderPerencanaanRowV74Wrapped = true;
  const __renderPerencanaanRowBeforeV74 = renderPerencanaanRow;
  renderPerencanaanRow = function(k){
    let html = __renderPerencanaanRowBeforeV74.apply(this, arguments);
    if(!canVerifyPBJ() && !isReviewer() && isKegiatanSelesaiV74(k?.id_kegiatan)){
      html = html.replace(
        /<td class="nowrap aksi-perencanaan-v63">[\s\S]*?<\/td>/,
        '<td class="nowrap aksi-perencanaan-v63"><span class="status-done-pill">SELESAI</span></td>'
      );
    }
    return html;
  };
}


/* =========================================================
   SIMPROV v77 - Satu Verifikator Internal
   - Satu role VERIFIKATOR menangani perencanaan, pemeriksaan dokumen,
     dan finalisasi sesuai bidang penugasan.
   - Legacy VERIFIKATOR_PBJ / VERIFIKATOR_KEUANGAN tetap dikenali.
   - Identitas Ketua Umum dan Verifikator dapat diatur Admin.
   ========================================================= */
function roleNormV77(){
  const r=String(currentUser?.role || currentUser?.id_bidang || '').toUpperCase().replace(/\s+/g,'_');
  if(['VERIFIKATOR','VERIFIKATOR_PBJ','PBJ','VERIFIKATOR_KEUANGAN','KEUANGAN','VERIF_KEUANGAN'].includes(r)) return 'VERIFIKATOR';
  return r;
}
function isVerifierV77(){ return roleNormV77()==='VERIFIKATOR'; }
function isSuperAdminV65(){ return roleNormV77()==='ADMIN'; }
function isPBJVerifierV65(){ return isSuperAdminV65() || isVerifierV77(); }
function isKeuangan(){ return isVerifierV77(); }
function isAdmin(){ return isSuperAdminV65(); }
function canVerifyPBJ(){ return isSuperAdminV65() || isVerifierV77(); }
function canVerifyKeuangan(){ return isSuperAdminV65() || isVerifierV77(); }
function canFinalizePBJ(){ return isSuperAdminV65() || isVerifierV77(); }
function isReviewer(){ return REVIEWER_ROLES.includes(roleCode()) || isVerifierV77(); }
function canSeeAll(){ return isSuperAdminV65() || isReviewer(); }
function roleLabel(){
  if(isSuperAdminV65()) return 'ADMIN / SUPERADMIN';
  if(isVerifierV77()) return 'VERIFIKATOR';
  if(REVIEWER_ROLES.includes(roleCode())) return roleCode();
  return 'BIDANG';
}
function renderMenu(){
  let menus;
  if(isSuperAdminV65()) menus=['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pencairan','Manajemen Akses'];
  else if(isVerifierV77()) menus=['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pencairan','Laporan'];
  else menus=isReviewer()?MENUS_REVIEWER:MENUS_USER;
  if(!menus.includes(activeMenu)) activeMenu=menus[0];
  document.getElementById('menuNav').innerHTML=menus.map(m=>`<button class="${activeMenu===m?'active':''}" onclick="setMenu('${m}')">${m}</button>`).join('');
}
function identityV77(){ return dashboard?.systemIdentity || {}; }
function updateIdentityHeaderV77(){
  const info=document.getElementById('userInfo');
  if(!info) return;
  const i=identityV77();
  const ketua=i.ketua_umum ? `Ketua Umum: ${i.ketua_umum}` : 'Ketua Umum: belum diatur';
  const ver=i.verifikator ? `Verifikator: ${i.verifikator}` : 'Verifikator: belum diatur';
  let box=document.getElementById('systemIdentityV77');
  if(!box){ box=document.createElement('div'); box.id='systemIdentityV77'; box.className='system-identity-v77'; info.insertAdjacentElement('afterend',box); }
  box.innerHTML=`<span>${esc(ketua)}</span><span>${esc(ver)}</span>`;
}
const renderAllBeforeV77=renderAll;
renderAll=function(){ renderAllBeforeV77(); updateIdentityHeaderV77(); };
function verifierUsersV65(){ return (dashboard?.verifierUsers||[]).filter(u=>['VERIFIKATOR','VERIFIKATOR_PBJ','VERIFIKATOR_KEUANGAN','PBJ','KEUANGAN'].includes(String(u.role||'').toUpperCase())); }
function renderManajemenAkunV65(){
  if(!isSuperAdminV65()){ document.getElementById('contentArea').innerHTML='<section class="panel"><h3>Akses ditolak</h3></section>'; return; }
  const users=verifierUsersV65();
  const rows=users.map(u=>{
    const ids=String(u.bidang_akses||'').split(',').map(x=>x.trim()).filter(Boolean);
    const names=ids.map(id=>bidangName(id)).join(', ') || '-';
    return `<div class="admin-budget-card account-card-v65"><div class="admin-budget-info"><b>${esc(u.nama||'-')}</b><small>${esc(u.id_user||'')} • ${esc(u.username||'')}</small></div><div><span class="badge badge-blue">VERIFIKATOR</span></div><div class="account-scope-text"><small>Bidang Penugasan</small><br>${esc(names)}</div><div>${badge(u.status||'AKTIF')}</div><div><button class="btn-mini" onclick="openEditVerifierV65('${esc(u.id_user)}')">Edit</button></div></div>`;
  }).join('');
  const i=identityV77();
  document.getElementById('contentArea').innerHTML=`
  <section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Identitas Penanggung Jawab</h3><p class="panel-sub">Nama ini tampil pada header dan digunakan sebagai identitas resmi aplikasi.</p></div></div><div class="form-grid"><div class="field"><label>Nama Ketua Umum</label><input id="ketuaUmumV77" value="${esc(i.ketua_umum||'')}" placeholder="Nama lengkap Ketua Umum"></div><div class="field"><label>Nama Verifikator</label><input id="verifikatorUtamaV77" value="${esc(i.verifikator||users[0]?.nama||'')}" placeholder="Nama lengkap Verifikator"></div></div><button onclick="saveIdentityV77()">Simpan Identitas</button><div id="identityMsgV77" class="msg"></div></section>
  <section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Manajemen Akses dan Akun Verifikator</h3><p class="panel-sub">Satu jenis Verifikator menangani perencanaan, dokumen, dan finalisasi sesuai bidang penugasannya.</p></div><button class="btn-refresh" onclick="openCreateVerifierV65()">+ Buat Akun</button></div><div class="admin-budget-list">${rows||'<p class="muted">Belum ada akun verifikator.</p>'}</div></section><div id="verifierModalV65" class="modal hidden"></div>`;
}
function verifierFormModalV65(u){
  const editing=!!u; const selected=String(u?.bidang_akses||'').split(',').map(x=>x.trim()).filter(Boolean); const modal=document.getElementById('verifierModalV65');
  modal.className='modal';
  modal.innerHTML=`<div class="modal-card modal-wide"><div class="modal-head"><h3>${editing?'Edit':'Buat'} Akun Verifikator</h3><button onclick="closeVerifierModalV65()">×</button></div><div class="form-grid"><div class="field"><label>Nama Verifikator</label><input id="akunNama" value="${esc(u?.nama||'')}" placeholder="Contoh: Udin"></div><div class="field"><label>Role</label><input id="akunRoleDisplay" value="VERIFIKATOR" readonly><input type="hidden" id="akunRole" value="VERIFIKATOR"></div><div class="field"><label>Username</label><input id="akunUsername" value="${esc(u?.username||'')}" placeholder="udin_verifikator"></div><div class="field"><label>Password ${editing?'(kosongkan jika tidak diubah)':''}</label><input id="akunPassword" type="text" placeholder="Password akun"></div>${editing?`<div class="field"><label>Status</label><select id="akunStatus"><option value="AKTIF" ${String(u?.status).toUpperCase()==='AKTIF'?'selected':''}>AKTIF</option><option value="NONAKTIF" ${String(u?.status).toUpperCase()==='NONAKTIF'?'selected':''}>NONAKTIF</option></select></div>`:''}</div><div class="field"><label>Pilih Bidang Penugasan</label><div class="account-scope-grid">${bidangChecksV65(selected)}</div></div><div class="modal-actions"><button class="btn-soft" onclick="closeVerifierModalV65()">Batal</button><button onclick="saveVerifierV65('${esc(u?.id_user||'')}')">Simpan</button></div></div>`;
}
async function saveIdentityV77(){
  const ketua_umum=document.getElementById('ketuaUmumV77')?.value.trim();
  const verifikator=document.getElementById('verifikatorUtamaV77')?.value.trim();
  if(!ketua_umum||!verifikator){ alert('Nama Ketua Umum dan Verifikator wajib diisi.'); return; }
  showLoading('Menyimpan identitas...');
  try{ const r=await apiPost({action:'saveSystemIdentity',user:currentUser,data:{ketua_umum,verifikator}}); alert(r.message); if(r.success){ dashboard.systemIdentity=r.identity; renderAll(); } }catch(e){alert(e.message)}finally{hideLoading();}
}
function normalizeDocStatusV77(v){
  const s=String(v||'').toUpperCase();
  if(s==='VALID KEUANGAN') return 'VALID DOKUMEN';
  if(s==='PERBAIKAN KEUANGAN') return 'PERBAIKAN DOKUMEN';
  if(s==='MENUNGGU VERIFIKASI KEUANGAN') return 'MENUNGGU VERIFIKASI DOKUMEN';
  if(s==='MENUNGGU VERIFIKASI PERBAIKAN KEUANGAN') return 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
  if(s==='MENUNGGU VERIFIKASI PBJ') return 'MENUNGGU FINALISASI';
  return s;
}


/* =========================================================
   SIMPROV v78 - Dashboard Publik + Identitas Lengkap
   ========================================================= */
function showLoginFromPublic(){
  document.getElementById('publicPage')?.classList.add('hidden');
  document.getElementById('loginPage')?.classList.remove('hidden');
  setTimeout(()=>document.getElementById('username')?.focus(),50);
}
function showPublicFromLogin(){
  document.getElementById('loginPage')?.classList.add('hidden');
  document.getElementById('publicPage')?.classList.remove('hidden');
}
function publicMetricCard(label,value,sub,cls=''){
  return `<article class="public-metric ${cls}"><small>${esc(label)}</small><strong>${esc(value)}</strong>${sub?`<span>${esc(sub)}</span>`:''}</article>`;
}
async function loadPublicDashboard(force=false){
  const sum=document.getElementById('publicSummary'); if(!sum) return;
  if(force) sum.innerHTML='<div class="public-loading">Memperbarui data...</div>';
  try{
    const r=await apiPost({action:'getPublicDashboard'});
    if(!r.success) throw new Error(r.message||'Gagal memuat dashboard publik');
    const s=r.summary||{}, ident=r.identity||{};
    document.getElementById('publicIdentity').innerHTML=[ident.ketua_umum&&`Ketua Umum: ${esc(ident.ketua_umum)}`,ident.sekretaris_umum&&`Sekretaris Umum: ${esc(ident.sekretaris_umum)}`,ident.verifikator&&`Verifikator: ${esc(ident.verifikator)}`].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
    sum.innerHTML=[
      publicMetricCard('Total Pagu Keseluruhan',rupiah(s.total_pagu),'Seluruh anggaran','blue'),
      publicMetricCard('Pagu Pengadaan',rupiah(s.pagu_pengadaan),'Alokasi pengadaan'),
      publicMetricCard('Pagu Non Pengadaan',rupiah(s.pagu_non_pengadaan),'Alokasi non pengadaan'),
      publicMetricCard('Perencanaan Keseluruhan',rupiah(s.perencanaan_total),`${s.jumlah_kegiatan||0} kegiatan`,'yellow'),
      publicMetricCard('Realisasi Pengadaan',rupiah(s.realisasi_pengadaan),'Nilai yang telah disahkan','green'),
      publicMetricCard('Realisasi Non Pengadaan',rupiah(s.realisasi_non_pengadaan),'Nilai yang telah disahkan','green'),
      publicMetricCard('Realisasi Keseluruhan',rupiah(s.realisasi_total),`${Number(s.persentase_realisasi||0).toFixed(1)}% dari pagu`,'green'),
      publicMetricCard('Sisa Pagu Anggaran',rupiah(s.sisa_pagu),'Pagu dikurangi realisasi','red'),
      publicMetricCard('Kegiatan Pengadaan',String(s.jumlah_pengadaan||0),`${s.jumlah_selesai||0} kegiatan selesai`),
      publicMetricCard('Kegiatan Non Pengadaan',String(s.jumlah_non_pengadaan||0),'Honorarium dan non pengadaan lainnya')
    ].join('');
    const pct=Math.max(0,Math.min(100,Number(s.persentase_realisasi||0)));
    document.getElementById('publicProgress').innerHTML=`<div class="big-percent">${pct.toFixed(1)}%</div><div class="public-progress-track"><i style="width:${pct}%"></i></div><div class="public-progress-notes"><span>Realisasi ${rupiah(s.realisasi_total)}</span><span>Sisa ${rupiah(s.sisa_pagu)}</span></div>`;
    const per=Number(s.perencanaan_total||0), pg=Number(s.perencanaan_pengadaan||0), np=Number(s.perencanaan_non_pengadaan||0); const ppg=per?pg/per*100:0;
    document.getElementById('publicComposition').innerHTML=`<div class="composition-bar"><i style="width:${ppg}%"></i></div><div class="composition-legend"><span><b>Pengadaan</b>${rupiah(pg)}</span><span><b>Non Pengadaan</b>${rupiah(np)}</span></div>`;
    const rows=(r.ringkasan||[]).map(x=>`<tr><td>${esc(x.nama_bidang||x.id_bidang)}</td><td>${rupiah(x.pagu)}</td><td>${rupiah(x.perencanaan_pengadaan)}</td><td>${rupiah(x.perencanaan_non_pengadaan)}</td><td>${x.jumlah_kegiatan||0}</td><td>${x.kegiatan_selesai||0}</td></tr>`).join('');
    document.getElementById('publicBidangTable').innerHTML=`<table><thead><tr><th>Bidang</th><th>Pagu</th><th>Perencanaan Pengadaan</th><th>Perencanaan Non Pengadaan</th><th>Kegiatan</th><th>Selesai</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">Belum ada data</td></tr>'}</tbody></table>`;
  }catch(e){ sum.innerHTML=`<div class="public-error">Dashboard publik belum dapat dimuat: ${esc(e.message||e)}</div>`; }
}

// Identitas: Ketua Umum, Sekretaris Umum, dan Verifikator
function updateIdentityHeaderV77(){
  const info=document.getElementById('userInfo'); if(!info) return;
  const i=identityV77();
  const vals=[`Ketua Umum: ${i.ketua_umum||'belum diatur'}`,`Sekretaris Umum: ${i.sekretaris_umum||'belum diatur'}`,`Verifikator: ${i.verifikator||'belum diatur'}`];
  let box=document.getElementById('systemIdentityV77');
  if(!box){box=document.createElement('div');box.id='systemIdentityV77';box.className='system-identity-v77';info.insertAdjacentElement('afterend',box);}
  box.innerHTML=vals.map(v=>`<span>${esc(v)}</span>`).join('');
}
const __renderManageV78=renderManajemenAkunV65;
renderManajemenAkunV65=function(){
  __renderManageV78();
  const panel=document.querySelector('#contentArea .panel'); if(!panel) return;
  const grid=panel.querySelector('.form-grid'); if(!grid||document.getElementById('sekretarisUmumV78')) return;
  const i=identityV77();
  const field=document.createElement('div');field.className='field';field.innerHTML=`<label>Nama Sekretaris Umum</label><input id="sekretarisUmumV78" value="${esc(i.sekretaris_umum||'')}" placeholder="Nama lengkap Sekretaris Umum">`;
  const verField=Array.from(grid.children).find(x=>/Nama Verifikator/i.test(x.textContent||''));
  grid.insertBefore(field,verField||null);
};
saveIdentityV77=async function(){
  const ketua_umum=document.getElementById('ketuaUmumV77')?.value.trim();
  const sekretaris_umum=document.getElementById('sekretarisUmumV78')?.value.trim();
  const verifikator=document.getElementById('verifikatorUtamaV77')?.value.trim();
  if(!ketua_umum||!sekretaris_umum||!verifikator){alert('Ketua Umum, Sekretaris Umum, dan Verifikator wajib diisi.');return;}
  showLoading('Menyimpan identitas...');
  try{const r=await apiPost({action:'saveSystemIdentity',user:currentUser,data:{ketua_umum,sekretaris_umum,verifikator}});alert(r.message);if(r.success){dashboard.systemIdentity=r.identity;renderAll();}}catch(e){alert(e.message)}finally{hideLoading();}
};

// Hilangkan legenda ganda: sisakan satu baris pada panel perencanaan.
function dedupePlanningLegendsV78(){
  document.querySelectorAll('#contentArea .panel, #contentArea section').forEach(panel=>{
    if(!/Data Perencanaan|Persetujuan Perencanaan|Pemeriksaan Data Perencanaan/i.test(panel.textContent||'')) return;
    const legends=Array.from(panel.querySelectorAll('.status-legend-v60,.status-legend-v74'));
    legends.slice(1).forEach(x=>x.remove());
  });
}
const __renderAllV78=renderAll;
renderAll=function(){__renderAllV78();updateIdentityHeaderV77();setTimeout(dedupePlanningLegendsV78,0);};

window.onload=async function(){
  const saved=localStorage.getItem('siporbo_user');
  if(saved){
    currentUser=JSON.parse(saved);activeMenu=isAdmin()?'Dashboard Monitoring':'Struktur Anggaran';
    document.getElementById('publicPage')?.classList.add('hidden');document.getElementById('loginPage')?.classList.add('hidden');document.getElementById('appPage')?.classList.remove('hidden');await loadDashboard(true);
  }else{
    document.getElementById('appPage')?.classList.add('hidden');document.getElementById('loginPage')?.classList.add('hidden');document.getElementById('publicPage')?.classList.remove('hidden');loadPublicDashboard(false);
  }
};

/* =========================================================
   SIMPROV v79 - UI NON PENGADAAN / HONORARIUM
   ========================================================= */
function isNonPengadaanV79(k){
  return String(k?.kategori||k?.metode_pemilihan||'').toUpperCase().includes('NON');
}
renderMenu=function(){
  let menus;
  if(isSuperAdminV65()) menus=['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pencairan','Non Pengadaan','Manajemen Akses'];
  else if(isVerifierV77()) menus=['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pencairan','Non Pengadaan','Laporan'];
  else menus=isReviewer()?['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pencairan','Non Pengadaan','Laporan']:['Struktur Anggaran','Perencanaan','Pencairan','Non Pengadaan','Laporan'];
  if(!menus.includes(activeMenu)) activeMenu=menus[0];
  document.getElementById('menuNav').innerHTML=menus.map(m=>`<button class="${activeMenu===m?'active':''}" onclick="setMenu('${m}')">${m}</button>`).join('');
};
const __renderContentV79=renderContent;
renderContent=function(){
  if(activeMenu==='Non Pengadaan') return renderNonPengadaanV79();
  return __renderContentV79();
};

const __renderPerencanaanV79=renderPerencanaan;
renderPerencanaan=function(){
  __renderPerencanaanV79();
  if(canSeeAll()) return;
  const nama=document.getElementById('namaKegiatan');
  const grid=nama?.closest('.form-grid');
  if(!grid||document.getElementById('kategoriPerencanaanV79')) return;
  const kategori=document.createElement('div');
  kategori.className='field';
  kategori.innerHTML=`<label>Kategori Perencanaan</label><select id="kategoriPerencanaanV79" onchange="toggleKategoriV79()"><option value="PENGADAAN">Pengadaan</option><option value="NON PENGADAAN">Non Pengadaan</option></select>`;
  grid.insertBefore(kategori,grid.firstElementChild);
  const jenis=document.createElement('div');
  jenis.className='field hidden';jenis.id='jenisNonWrapV79';
  jenis.innerHTML=`<label>Jenis Non Pengadaan</label><select id="jenisNonPengadaanV79"><option>Honorarium</option><option>Perjalanan Dinas</option><option>Uang Saku</option><option>Hadiah/Penghargaan</option><option>Belanja Non Pengadaan Lainnya</option></select>`;
  grid.insertBefore(jenis,kategori.nextSibling);
  toggleKategoriV79();
};
function toggleKategoriV79(){
  const non=document.getElementById('kategoriPerencanaanV79')?.value==='NON PENGADAAN';
  document.getElementById('jenisNonWrapV79')?.classList.toggle('hidden',!non);
  const metode=document.getElementById('metodePemilihan');
  if(metode) metode.value=non?'NON PENGADAAN':'';
}

savePerencanaan=async function(){
  if(!aksesPerencanaanTerbuka()){alert('Akses perencanaan bidang sedang ditutup.');return;}
  const kategori=document.getElementById('kategoriPerencanaanV79')?.value||'PENGADAAN';
  const data={
    nama_kegiatan:document.getElementById('namaKegiatan').value,
    rincian_kebutuhan:'',
    keterangan:document.getElementById('keterangan').value,
    volume:toNumber(document.getElementById('volume').value),
    satuan:document.getElementById('satuan').value,
    harga_satuan:toNumber(document.getElementById('harga').value),
    metode_pemilihan:kategori==='NON PENGADAAN'?'NON PENGADAAN':(document.getElementById('metodePemilihan')?.value||''),
    waktu_pemilihan:document.getElementById('waktuPemilihan')?.value||'',
    kategori,
    jenis_non_pengadaan:kategori==='NON PENGADAAN'?(document.getElementById('jenisNonPengadaanV79')?.value||'Honorarium'):''
  };
  if(!data.waktu_pemilihan){alert(kategori==='NON PENGADAAN'?'Waktu pelaksanaan wajib diisi.':'Waktu pemilihan wajib diisi.');return;}
  const cek=cekPaguFrontend(data.volume*data.harga_satuan,'');
  if(!cek.ok){alert(cek.message);return;}
  showLoading('Mengajukan perencanaan...');
  try{
    const r=await apiPost({action:'savePerencanaan',user:currentUser,data});
    document.getElementById('saveMsg').innerText=r.message;
    if(!r.success) alert(r.message);
    if(r.success) applyCreatedPlanningV140(r,data);
  }catch(e){alert(e.message)}finally{hideLoading();}
};

const __renderRowV79=renderPerencanaanRow;
renderPerencanaanRow=function(k){
  let html=__renderRowV79(k);
  if(isNonPengadaanV79(k)){
    html=html.replace(/<td>NON PENGADAAN<\/td>/i,`<td><b>NON PENGADAAN</b><br><small>${esc(k.jenis_non_pengadaan||'Honorarium')}</small></td>`);
    if(!canManage()&&!isReviewer()&&String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI'){
      html=html.replace(/<td class="nowrap[^"]*">[\s\S]*?<\/td>\s*<\/tr>$/,`<td class="nowrap"><button class="btn-mini btn-green" onclick="openHonorModalV79('${esc(k.id_kegiatan)}')">Buat Dokumen</button></td></tr>`);
    }
  }
  return html;
};

function latestNonV79(id){
  return (dashboard.nonPengadaan||[]).filter(x=>String(x.id_kegiatan)===String(id)).sort((a,b)=>toNumber(b.versi_pdf)-toNumber(a.versi_pdf))[0];
}
function docsNonV79(id){
  return (dashboard.dokumenNonPengadaan||[]).filter(x=>String(x.id_kegiatan)===String(id));
}
function renderNonPengadaanV79(){
  const list=(dashboard.perencanaan||[]).filter(k=>isNonPengadaanV79(k)&&String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI');
  const cards=list.map(k=>{
    const n=latestNonV79(k.id_kegiatan),docs=docsNonV79(k.id_kegiatan);
    const wajib=['Tanda Terima','Bukti Potong Pajak'];
    const uploaded=wajib.filter(j=>docs.some(d=>String(d.jenis_dokumen||'').toLowerCase()===j.toLowerCase())).length;
    const valid=wajib.filter(j=>docs.some(d=>String(d.jenis_dokumen||'').toLowerCase()===j.toLowerCase()&&String(d.status_verifikasi||'').toUpperCase()==='VALID DOKUMEN')).length;
    return `<article class="non-card-v79">
      <div class="non-card-head-v79"><div><b>${esc(k.nama_kegiatan)}</b><small>${esc(k.id_kegiatan)} • ${esc(bidangName(k.id_bidang))}</small></div>${badge(n?n.status:'MENUNGGU PEMBUATAN DOKUMEN')}</div>
      <div class="non-summary-v79">
        <span><small>Jenis</small><b>${esc(k.jenis_non_pengadaan||'Honorarium')}</b></span>
        <span><small>Nilai Perencanaan</small><b>${rupiah(k.jumlah)}</b></span>
        <span><small>Total Bruto</small><b>${rupiah(n?.total_bruto||0)}</b></span>
        <span><small>Total Pajak</small><b>${rupiah(n?.total_pajak||0)}</b></span>
        <span><small>Total Netto</small><b>${rupiah(n?.total_netto||0)}</b></span>
        <span><small>Dokumen Wajib</small><b>${uploaded}/2 terunggah • ${valid}/2 valid</b></span>
      </div>
      <div class="non-actions-v79">
        ${!n?`<button class="btn-green" onclick="openHonorModalV79('${esc(k.id_kegiatan)}')">Buat Dokumen Honorarium</button>`:`<a class="btn-link-v79" target="_blank" href="${esc(n.url_pdf||'#')}">Download Dokumen V${esc(n.versi_pdf||1)}</a><button onclick="openHonorModalV79('${esc(k.id_kegiatan)}')">Buat Versi Baru</button>`}
        ${n&&!canSeeAll()?`<select id="jenisNon_${esc(k.id_kegiatan)}"><option>Tanda Terima</option><option>Bukti Potong Pajak</option><option>Surat Tugas/SK</option><option>Daftar Hadir</option><option>Bukti Transfer/Pembayaran</option><option>Dokumen Pendukung Lainnya</option></select><input type="file" id="fileNon_${esc(k.id_kegiatan)}"><button onclick="uploadNonV79('${esc(k.id_kegiatan)}')">Upload Dokumen</button>`:''}
      </div>
      <div class="non-docs-v79">${docs.map(d=>`<div><span>${esc(d.jenis_dokumen)}</span><a target="_blank" href="${esc(d.url_file)}">${esc(d.nama_file||'Buka File')}</a>${badge(d.status_verifikasi||'MENUNGGU VERIFIKASI DOKUMEN')}${(canManage()||isVerifierV77())?`<button class="btn-mini btn-green" onclick="verifyNonV79('${esc(d.id_dokumen_non)}','VALID DOKUMEN')">Valid</button><button class="btn-mini btn-orange" onclick="verifyNonV79('${esc(d.id_dokumen_non)}','PERBAIKAN DOKUMEN')">Perbaikan</button>`:''}</div>`).join('')||'<p class="muted">Belum ada dokumen pendukung.</p>'}</div>
    </article>`;
  }).join('');
  document.getElementById('contentArea').innerHTML=`<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Non Pengadaan</h3><p class="panel-sub">Kegiatan Non Pengadaan dikelola pada menu ini. Buat dokumen honorarium, lalu unggah Tanda Terima dan Bukti Potong Pajak.</p></div><button class="btn-refresh" onclick="refreshData()">Refresh</button></div>${cards||'<p class="muted">Belum ada kegiatan Non Pengadaan yang disetujui.</p>'}</section><div id="honorModalV79" class="modal hidden"></div>`;
}
function honorRowV79(){
  return `<div class="honor-row-v79"><input class="hnama" placeholder="Nama penerima"><input class="hnik" placeholder="NIK/NPWP (opsional)"><input class="hperan" placeholder="Jabatan/Peran"><input class="hvol" inputmode="numeric" value="1" placeholder="Volume"><input class="hsatuan" value="Orang/Kegiatan" placeholder="Satuan"><input class="htarif" inputmode="numeric" placeholder="Tarif honor" oninput="onAngkaInput(this)"><select class="hjenis"><option value="PERSENTASE">Persentase Pajak</option><option value="TIDAK DIPOTONG">Tidak Dipotong Pajak</option><option value="NOMINAL">Nominal Pajak Manual</option></select><input class="hpajak" inputmode="decimal" value="0" placeholder="Tarif % / nominal"><button class="btn-red" onclick="this.closest('.honor-row-v79').remove()">Hapus</button></div>`;
}
function openHonorModalV79(id){
  const k=dashboard.perencanaan.find(x=>String(x.id_kegiatan)===String(id));if(!k)return;
  let m=document.getElementById('honorModalV79');
  if(!m){m=document.createElement('div');m.id='honorModalV79';m.className='modal hidden';document.body.appendChild(m);}
  m.className='modal';
  m.innerHTML=`<div class="modal-card modal-wide"><div class="modal-head"><div><h3>Buat Dokumen Honorarium</h3><p>${esc(k.nama_kegiatan)}</p></div><button onclick="document.getElementById('honorModalV79').classList.add('hidden')">×</button></div><input type="hidden" id="honorKegV79" value="${esc(id)}"><div id="honorRowsV79">${honorRowV79()}</div><button class="btn-soft" onclick="document.getElementById('honorRowsV79').insertAdjacentHTML('beforeend',honorRowV79())">+ Tambah Penerima</button><div class="modal-actions"><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Batal</button><button class="btn-green" onclick="generateHonorV79()">Buat PDF Honorarium</button></div></div>`;
}
async function generateHonorV79(){
  const id=document.getElementById('honorKegV79').value;
  const penerima=[...document.querySelectorAll('.honor-row-v79')].map(r=>({
    nama_penerima:r.querySelector('.hnama').value,
    nik_npwp:r.querySelector('.hnik').value,
    jabatan_peran:r.querySelector('.hperan').value,
    volume:toNumber(r.querySelector('.hvol').value),
    satuan:r.querySelector('.hsatuan').value,
    tarif_honor:toNumber(r.querySelector('.htarif').value),
    jenis_pajak:r.querySelector('.hjenis').value,
    tarif_pajak:toNumber(r.querySelector('.hpajak').value),
    nilai_pajak:toNumber(r.querySelector('.hpajak').value)
  }));
  showLoading('Menyiapkan dokumen honorarium...');
  try{
    const res=await apiPost({action:'generateHonorPdf',user:currentUser,data:{id_kegiatan:id,penerima}});
    alert(res.message);
    if(res.success){document.getElementById('honorModalV79').classList.add('hidden');await loadDashboard(false);activeMenu='Non Pengadaan';renderAll();}
  }catch(e){alert(e.message)}finally{hideLoading();}
}
async function uploadNonV79(id){
  const file=document.getElementById('fileNon_'+id)?.files?.[0],jenis=document.getElementById('jenisNon_'+id)?.value;
  if(!file){alert('Pilih file terlebih dahulu');return;}
  showLoading('Mengupload dokumen...');
  try{
    const b64=await fileToBase64(file);
    const r=await apiPost({action:'uploadDokumenNonPengadaan',user:currentUser,id_kegiatan:id,jenis_dokumen:jenis,file_name:file.name,mime_type:file.type,file_base64:b64});
    alert(r.message);
    if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}
async function verifyNonV79(id,status){
  let note='';
  if(status==='PERBAIKAN DOKUMEN'){note=prompt('Catatan perbaikan:')||'';if(!note)return;}
  showLoading('Memperbarui status...');
  try{
    const r=await apiPost({action:'verifyDokumenNonPengadaan',user:currentUser,id_dokumen_non:id,status_verifikasi:status,catatan_verifikator:note});
    alert(r.message);
    if(r.success) await loadDashboard(false);
  }catch(e){alert(e.message)}finally{hideLoading();}
}

/* =========================================================
   SIMPROV v81 - Revisi Non Pengadaan, Realisasi, Layout Perencanaan
   ========================================================= */
function isNonKategoriV81(k){
  return String(k?.kategori || '').toUpperCase() === 'NON PENGADAAN' || isNonPengadaanV79(k);
}
function getDashboardSummaryV81(){
  const out = Object.assign({total_pagu:0,total_perencanaan:0,total_realisasi:0,realisasi_pengadaan:0,realisasi_non_pengadaan:0,sisa_pagu:0}, dashboard?.summary || {});
  if(!dashboard) return out;
  if(!out.total_pagu && Array.isArray(dashboard.rekap)) out.total_pagu = dashboard.rekap.reduce((s,r)=>s+toNumber(r.pagu),0);
  if(!out.total_perencanaan && Array.isArray(dashboard.rekap)) out.total_perencanaan = dashboard.rekap.reduce((s,r)=>s+toNumber(r.total_perencanaan),0);
  if(!out.total_realisasi){
    if(Array.isArray(dashboard.realisasi) && dashboard.realisasi.length){
      out.total_realisasi = dashboard.realisasi.filter(r=>['FINAL','DISETUJUI','SELESAI','SAH'].includes(String(r.status||'').toUpperCase())).reduce((s,r)=>s+toNumber(r.nilai_realisasi),0);
    }else if(Array.isArray(dashboard.rekap)){
      out.total_realisasi = dashboard.rekap.reduce((s,r)=>s+toNumber(r.total_realisasi),0);
    }
  }
  if(!out.sisa_pagu) out.sisa_pagu = out.total_pagu - out.total_realisasi;
  return out;
}
const __renderSummaryV81 = renderSummary;
renderSummary = function(){
  const wrap = document.getElementById('summaryCards'); if(!wrap || !dashboard){ if(wrap) wrap.innerHTML=''; return; }
  const sum = getDashboardSummaryV81();
  if(canSeeAll()){
    const dok = (dashboard.dokumen||[]).length;
    const valid = (dashboard.dokumen||[]).filter(isDocValidV64).length;
    wrap.innerHTML = card('Total Pagu', rupiah(sum.total_pagu))
      + card('Total Perencanaan', rupiah(sum.total_perencanaan))
      + card('Total Realisasi', rupiah(sum.total_realisasi))
      + card('Sisa Pagu', rupiah(sum.sisa_pagu))
      + card('Dokumen Valid', `${valid}/${dok}`);
  }else{
    const r = (dashboard.rekap||[]).find(x=>String(x.id_bidang)===String(currentUser.id_bidang)) || {};
    const realisasiBidang = toNumber(r.total_realisasi);
    const sisaBidang = toNumber(r.pagu) - realisasiBidang;
    wrap.innerHTML = card('Pagu Bidang', rupiah(r.pagu))
      + card('Total Perencanaan', rupiah(r.total_perencanaan))
      + card('Total Realisasi', rupiah(realisasiBidang))
      + card('Sisa Pagu', rupiah(sisaBidang))
      + card('Status Akses', r.status_akses || '-');
  }
};

function syncNonPengadaanUiV81(){
  const non = document.getElementById('kategoriPerencanaanV79')?.value === 'NON PENGADAAN';
  const metodeInput = document.getElementById('metodePemilihan');
  const metodeField = metodeInput?.closest('.field');
  const metodePreview = document.getElementById('metodePreview');
  const waktuLabel = document.querySelector('label[for="waktuPemilihan"]') || document.getElementById('waktuPemilihan')?.closest('.field')?.querySelector('label');
  if(metodeField) metodeField.classList.toggle('hidden', non);
  if(waktuLabel) waktuLabel.textContent = non ? 'Waktu Pelaksanaan' : 'Waktu Pemilihan';
  if(metodeInput) metodeInput.value = non ? '' : metodeInput.value;
  if(metodePreview){
    if(non){
      const jenis = document.getElementById('jenisNonPengadaanV79')?.value || 'Honorarium';
      metodePreview.innerHTML = `<div class="metode-grid"><div class="metode-card"><span>KATEGORI</span><b>Non Pengadaan</b></div><div class="metode-card"><span>JENIS NON PENGADAAN</span><b>${esc(jenis)}</b></div></div><div class="doc-help-box"><b>Keterangan:</b> Non Pengadaan tidak menggunakan metode pemilihan. Setelah disetujui PBJ, proses dilanjutkan di menu <b>Non Pengadaan</b>.</div>`;
    }
  }
}
const __toggleKategoriV81 = toggleKategoriV79;
toggleKategoriV79 = function(){ __toggleKategoriV81(); syncNonPengadaanUiV81(); };
const __onAngkaInputV81 = onAngkaInput;
onAngkaInput = function(el, volumeId='volume', hargaId='harga', totalId='totalPreview'){ __onAngkaInputV81(el, volumeId, hargaId, totalId); syncNonPengadaanUiV81(); };
const __onWaktuPemilihanInputV81 = onWaktuPemilihanInput;
onWaktuPemilihanInput = function(isEdit=false){ __onWaktuPemilihanInputV81(isEdit); syncNonPengadaanUiV81(); };

const __renderPerencanaanV81 = renderPerencanaan;
renderPerencanaan = function(){
  __renderPerencanaanV81();
  if(!canSeeAll()) { syncNonPengadaanUiV81(); const jenis=document.getElementById('jenisNonPengadaanV79'); if(jenis) jenis.onchange=syncNonPengadaanUiV81; }
  const panels = [...document.querySelectorAll('#contentArea .panel')].filter(p=>/Persetujuan Perencanaan|Data Perencanaan|Pemeriksaan Data Perencanaan/i.test(p.textContent||''));
  panels.forEach(panel=>{
    panel.querySelectorAll('.table-hint').forEach(el=>el.remove());
    const wrap = panel.querySelector('.table-wrap');
    const table = panel.querySelector('table');
    if(wrap) wrap.classList.add('planning-table-wrap-v81');
    if(table) table.classList.add('planning-table-v81');
  });
};

const __renderPerencanaanRowV81Base = renderPerencanaanRow;
renderPerencanaanRow = function(k){
  let html = __renderPerencanaanRowV81Base(k);
  if(isNonKategoriV81(k)){
    html = html.replace(/<td><b>NON PENGADAAN<\/b><br><small>([\s\S]*?)<\/small><\/td>/i, '<td class="text-center">-</td>');
    html = html.replace(/(<td><b>)([\s\S]*?)(<\/b>)([\s\S]*?<\/td>)/i, `$1$2$3<br><small class="muted">Non Pengadaan • ${esc(k.jenis_non_pengadaan||'Honorarium')}</small>$4`);
    html = html.replace(/(<td>)(?:\s*<b>NON PENGADAAN<\/b><br><small>[\s\S]*?<\/small>|NON PENGADAAN)(<\/td>)/i, '$1-$2');
  }
  return html;
};

function honorRowV79(){
  return `<div class="honor-row-v81">
    <div class="field"><label>Nama Penerima</label><input class="hnama" placeholder="Nama penerima"></div>
    <div class="field"><label>NIK / NPWP</label><input class="hnik" placeholder="Opsional"></div>
    <div class="field"><label>Jabatan / Peran</label><input class="hperan" placeholder="Contoh: Narasumber"></div>
    <div class="field small"><label>Volume</label><input class="hvol" inputmode="numeric" value="1" placeholder="1"></div>
    <div class="field small"><label>Satuan</label><input class="hsatuan" value="Orang/Kegiatan" placeholder="Satuan"></div>
    <div class="field small"><label>Tarif Honor</label><input class="htarif" inputmode="numeric" placeholder="0" oninput="onAngkaInput(this)"></div>
    <div class="field small"><label>Jenis Pajak</label><select class="hjenis"><option value="PERSENTASE">Persentase Pajak</option><option value="TIDAK DIPOTONG">Tidak Dipotong Pajak</option><option value="NOMINAL">Nominal Pajak Manual</option></select></div>
    <div class="field small"><label>Tarif % / Nominal</label><input class="hpajak" inputmode="decimal" value="0" placeholder="0"></div>
    <div class="honor-remove-wrap"><button class="btn-red" type="button" onclick="this.closest('.honor-row-v81').remove()">Hapus</button></div>
  </div>`;
}
function openHonorModalV79(id){
  const k=(dashboard.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id)); if(!k) return;
  let m=document.getElementById('honorModalV79');
  if(!m){ m=document.createElement('div'); m.id='honorModalV79'; m.className='modal hidden'; document.body.appendChild(m); }
  m.className='modal';
  m.innerHTML=`<div class="modal-card modal-wide honor-modal-v81 fade-up">
    <div class="modal-head"><div><h3>Buat Dokumen Honorarium</h3><p>${esc(k.nama_kegiatan)} • ${esc(bidangName(k.id_bidang))}</p></div><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Tutup</button></div>
    <input type="hidden" id="honorKegV79" value="${esc(id)}">
    <div class="honor-modal-info-v81">
      <div><span>ID Kegiatan</span><b>${esc(k.id_kegiatan)}</b></div>
      <div><span>Jenis</span><b>${esc(k.jenis_non_pengadaan||'Honorarium')}</b></div>
      <div><span>Nilai Perencanaan</span><b>${rupiah(k.jumlah)}</b></div>
      <div><span>Petunjuk</span><b>Isi penerima honor dengan lengkap sebelum membuat dokumen.</b></div>
    </div>
    <div class="honor-modal-body-v81">
      <div class="honor-head-row-v81"><span>Daftar Penerima Honorarium</span><button class="btn-soft" type="button" onclick="document.getElementById('honorRowsV79').insertAdjacentHTML('beforeend', honorRowV79())">+ Tambah Penerima</button></div>
      <div id="honorRowsV79" class="honor-rows-v81">${honorRowV79()}</div>
    </div>
    <div class="modal-actions honor-actions-v81"><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Batal</button><button id="btnGenerateHonorV81" class="btn-green" onclick="generateHonorV79()">Buat Dokumen Honorarium</button></div>
  </div>`;
}
async function generateHonorV79(){
  const btn=document.getElementById('btnGenerateHonorV81');
  if(btn?.dataset.busy==='1') return;
  const id=document.getElementById('honorKegV79')?.value;
  const penerima=[...document.querySelectorAll('.honor-row-v81')].map(r=>({
    nama_penerima:r.querySelector('.hnama')?.value || '',
    nik_npwp:r.querySelector('.hnik')?.value || '',
    jabatan_peran:r.querySelector('.hperan')?.value || '',
    volume:toNumber(r.querySelector('.hvol')?.value),
    satuan:r.querySelector('.hsatuan')?.value || '',
    tarif_honor:toNumber(r.querySelector('.htarif')?.value),
    jenis_pajak:r.querySelector('.hjenis')?.value || 'PERSENTASE',
    tarif_pajak:toNumber(r.querySelector('.hpajak')?.value),
    nilai_pajak:toNumber(r.querySelector('.hpajak')?.value)
  })).filter(x=>x.nama_penerima || x.tarif_honor || x.volume);
  if(!penerima.length){ alert('Minimal satu penerima honor wajib diisi.'); return; }
  if(btn){ btn.dataset.busy='1'; btn.disabled=true; btn.textContent='Memproses...'; }
  showLoading('Menyiapkan dokumen honorarium...');
  const wait=(ms)=>new Promise(res=>setTimeout(res,ms));
  try{
    let res=null;
    for(let attempt=0; attempt<3; attempt++){
      res = await apiPost({action:'generateHonorPdf',user:currentUser,data:{id_kegiatan:id,penerima}});
      if(res?.success) break;
      if(String(res?.message||'').includes('Server sedang memproses data')) await wait(1800*(attempt+1)); else break;
    }
    alert(res.message || 'Proses selesai');
    if(res.success){ document.getElementById('honorModalV79')?.classList.add('hidden'); await loadDashboard(false); activeMenu='Non Pengadaan'; renderAll(); }
  }catch(e){ alert(e.message || e); }
  finally{ hideLoading(); if(btn){ btn.dataset.busy='0'; btn.disabled=false; btn.textContent='Buat Dokumen Honorarium'; } }
}

const __renderNonPengadaanV81 = renderNonPengadaanV79;
renderNonPengadaanV79 = function(){ __renderNonPengadaanV81(); const modal=document.getElementById('honorModalV79'); if(modal) modal.classList.add('hidden'); };

/* =========================================================
   SIMPROV v82 - Dashboard Publik Ringkas + Cache + Layout Lebar
   ========================================================= */
function publicCacheKeyV82(){ return 'SIMPROV_PUBLIC_CACHE_V82'; }
function readPublicCacheV82(){ try{ return JSON.parse(localStorage.getItem(publicCacheKeyV82())||'null'); }catch(e){ return null; } }
function writePublicCacheV82(data){ try{ localStorage.setItem(publicCacheKeyV82(), JSON.stringify({savedAt:Date.now(), data})); }catch(e){} }
function publicLoadingMarkupV82(text='Memuat dashboard publik...'){
  return `<div class="public-loading public-loading-v82"><div class="public-spinner-v82"></div><div><b>${esc(text)}</b><small>Mohon tunggu sebentar</small></div></div>`;
}
function renderPublicDashboardV82(payload, fromCache=false){
  const sum=document.getElementById('publicSummary'); if(!sum) return;
  const s=payload.summary||{}, ident=payload.identity||{};
  document.getElementById('publicIdentity').innerHTML=[ident.ketua_umum&&`Ketua Umum: ${esc(ident.ketua_umum)}`,ident.sekretaris_umum&&`Sekretaris Umum: ${esc(ident.sekretaris_umum)}`,ident.verifikator&&`Verifikator: ${esc(ident.verifikator)}`].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
  sum.innerHTML=[
    publicMetricCard('Total Pagu', rupiah(s.total_pagu), 'Total anggaran keseluruhan', 'blue'),
    publicMetricCard('Realisasi Pagu', rupiah(s.realisasi_total), `${Number(s.persentase_realisasi||0).toFixed(1)}% dari pagu`, 'green'),
    publicMetricCard('Sisa Pagu', rupiah(s.sisa_pagu), 'Pagu dikurangi realisasi', 'red'),
    publicMetricCard('Jumlah Kegiatan', String(s.jumlah_kegiatan||0), `${s.jumlah_selesai||0} kegiatan selesai`, 'yellow')
  ].join('');
  const pct=Math.max(0,Math.min(100,Number(s.persentase_realisasi||0)));
  const progress=document.getElementById('publicProgress');
  if(progress) progress.innerHTML=`<div class="big-percent">${pct.toFixed(1)}%</div><div class="public-progress-track"><i style="width:${pct}%"></i></div><div class="public-progress-notes"><span>Total Pagu ${rupiah(s.total_pagu)}</span><span>Realisasi ${rupiah(s.realisasi_total)}</span><span>Sisa ${rupiah(s.sisa_pagu)}</span></div>`;
  const composition=document.getElementById('publicComposition');
  if(composition) composition.innerHTML=`<div class="public-simple-stats-v82"><div><span>Total Perencanaan</span><b>${rupiah(s.perencanaan_total||0)}</b></div><div><span>Kegiatan Berjalan</span><b>${Math.max(0,(s.jumlah_kegiatan||0)-(s.jumlah_selesai||0))}</b></div><div><span>Kegiatan Selesai</span><b>${s.jumlah_selesai||0}</b></div></div>${fromCache?`<div class="public-cache-info-v82">Tampilan cache: ${dashboardCacheAgeText(payload.savedAt)}</div>`:''}`;
  const panelTitles=document.querySelectorAll('#publicPage .public-panel h3');
  if(panelTitles[1]) panelTitles[1].textContent='Ringkasan Kegiatan';
  const rows=(payload.ringkasan||[]).map(x=>`<tr><td>${esc(x.nama_bidang||x.id_bidang)}</td><td>${rupiah(x.pagu)}</td><td>${rupiah(x.total_perencanaan || (Number(x.perencanaan_pengadaan||0)+Number(x.perencanaan_non_pengadaan||0)))}</td><td>${rupiah(x.realisasi_total||0)}</td><td>${rupiah(x.sisa_pagu||0)}</td><td>${x.jumlah_kegiatan||0}</td><td>${x.kegiatan_selesai||0}</td></tr>`).join('');
  document.getElementById('publicBidangTable').innerHTML=`<table class="public-table-v82"><thead><tr><th>Bidang</th><th>Total Pagu</th><th>Total Perencanaan</th><th>Realisasi</th><th>Sisa Pagu</th><th>Kegiatan</th><th>Selesai</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="empty">Belum ada data</td></tr>'}</tbody></table>`;
}
loadPublicDashboard = async function(force=false){
  const sum=document.getElementById('publicSummary'); if(!sum) return;
  const progress=document.getElementById('publicProgress'); const composition=document.getElementById('publicComposition');
  const cached = readPublicCacheV82();
  let hasCache=false;
  if(cached?.data && !force){
    try{ renderPublicDashboardV82({...cached.data, savedAt:cached.savedAt}, true); hasCache=true; }catch(e){ console.warn('PUBLIC_CACHE_RENDER_FAILED', e); }
  }
  if(!hasCache || force){
    sum.innerHTML = publicLoadingMarkupV82(force ? 'Memperbarui dashboard publik...' : 'Memuat dashboard publik...');
    if(progress) progress.innerHTML = publicLoadingMarkupV82('Memuat progres...');
    if(composition) composition.innerHTML = publicLoadingMarkupV82('Memuat ringkasan kegiatan...');
  }else{
    showFastCacheNotice(`Dashboard publik dimuat dari cache (${dashboardCacheAgeText(cached.savedAt)}). Sedang diperbarui...`);
  }
  try{
    const r=await apiPost({action:'getPublicDashboard'});
    if(!r.success) throw new Error(r.message||'Gagal memuat dashboard publik');
    writePublicCacheV82(r);
    renderPublicDashboardV82(r, false);
  }catch(e){
    if(!hasCache){
      sum.innerHTML=`<div class="public-error">Dashboard publik belum dapat dimuat: ${esc(e.message||e)}</div>`;
      if(progress) progress.innerHTML='';
      if(composition) composition.innerHTML='';
    }else{
      showFastCacheNotice('Gagal memperbarui dashboard publik. Tampilan cache terakhir tetap digunakan.');
    }
  }
};

/* =========================================================
   SIMPROV v83 - Pencatatan Pengadaan & Non Pengadaan
   ========================================================= */
const nonGroupCollapseV83 = {};
function isProcurementV83(k){ return !isNonKategoriV81(k); }
function canUploadNonV83(){ return !canManage() && !isReviewer(); }
function menuItemsV83(){
  if(isSuperAdminV65()) return [
    ['Dashboard Monitoring','Dashboard Monitoring'],['Struktur Anggaran','Struktur Anggaran'],['Perencanaan','Perencanaan'],['Pencairan','Pencatatan Pengadaan'],['Non Pengadaan','Pencatatan Non Pengadaan'],['Manajemen Akses','Manajemen Akses']
  ];
  if(isVerifierV77()) return [
    ['Dashboard Monitoring','Dashboard Monitoring'],['Struktur Anggaran','Struktur Anggaran'],['Perencanaan','Perencanaan'],['Pencairan','Pencatatan Pengadaan'],['Non Pengadaan','Pencatatan Non Pengadaan'],['Laporan','Laporan']
  ];
  if(isReviewer()) return [
    ['Dashboard Monitoring','Dashboard Monitoring'],['Struktur Anggaran','Struktur Anggaran'],['Perencanaan','Perencanaan'],['Pencairan','Pencatatan Pengadaan'],['Non Pengadaan','Pencatatan Non Pengadaan'],['Laporan','Laporan']
  ];
  return [['Struktur Anggaran','Struktur Anggaran'],['Perencanaan','Perencanaan'],['Pencairan','Pencatatan Pengadaan'],['Non Pengadaan','Pencatatan Non Pengadaan'],['Laporan','Laporan']];
}
renderMenu=function(){
  const menus=menuItemsV83();
  if(!menus.some(x=>x[0]===activeMenu)) activeMenu=menus[0][0];
  document.getElementById('menuNav').innerHTML=menus.map(([key,label])=>`<button class="${activeMenu===key?'active':''}" onclick="setMenu('${key}')">${label}</button>`).join('');
};

const __renderPencairanV83Base = renderPencairan;
renderPencairan = function(){
  const original = dashboard?.perencanaan || [];
  if(dashboard) dashboard.perencanaan = original.filter(isProcurementV83);
  try{ __renderPencairanV83Base(); }
  finally{ if(dashboard) dashboard.perencanaan = original; }
  const area=document.getElementById('contentArea'); if(!area) return;
  area.querySelectorAll('h3').forEach(h=>{
    if(/Upload Dokumen Pencairan/i.test(h.textContent)) h.textContent='Upload Dokumen Pengadaan';
    if(/Data Dokumen & Pencairan/i.test(h.textContent)) h.textContent='Data Dokumen & Pencatatan Pengadaan';
  });
  area.querySelectorAll('.panel-sub').forEach(p=>{
    p.innerHTML=p.innerHTML.replace(/pencairan/gi,'pencatatan pengadaan');
  });
};

function nonDocTypesV83(){ return ['Tanda Terima','Bukti Potong Pajak']; }
function nonDocOptionsV83(selected=''){
  return nonDocTypesV83().map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('');
}
function approvedNonActivitiesV83(){
  return (dashboard?.perencanaan||[]).filter(k=>isNonKategoriV81(k) && String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI');
}
function addNonUploadRowV83(){
  document.getElementById('nonUploadRowsV83')?.insertAdjacentHTML('beforeend', `<div class="doc-upload-row non-upload-row-v83"><div class="field"><label>Jenis Dokumen</label><select class="jenisNonDokV83">${nonDocOptionsV83()}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileNonDokV83"></div><button class="btn-red" type="button" onclick="this.closest('.non-upload-row-v83').remove()">Hapus</button></div>`);
}
async function uploadAllNonV83(){
  const id=document.getElementById('nonKegiatanV83')?.value;
  if(!id){ alert('Pilih kegiatan Non Pengadaan terlebih dahulu.'); return; }
  const rows=[...document.querySelectorAll('.non-upload-row-v83')];
  const selected=rows.map(r=>({jenis:r.querySelector('.jenisNonDokV83')?.value,file:r.querySelector('.fileNonDokV83')?.files?.[0]})).filter(x=>x.file);
  if(!selected.length){ alert('Pilih minimal satu file dokumen.'); return; }
  showLoading('Mengupload dokumen Non Pengadaan...');
  try{
    for(const item of selected){
      const b64=await fileToBase64(item.file);
      const res=await apiPost({action:'uploadDokumenNonPengadaan',user:currentUser,id_kegiatan:id,jenis_dokumen:item.jenis,file_name:item.file.name,mime_type:item.file.type,file_base64:b64});
      if(!res.success) throw new Error(res.message||'Upload gagal');
    }
    alert('Dokumen Non Pengadaan berhasil diupload.');
    await loadDashboard(false); activeMenu='Non Pengadaan'; renderAll();
  }catch(e){ alert(e.message||e); }
  finally{ hideLoading(); }
}
function toggleNonGroupV83(id){ nonGroupCollapseV83[id]=!(nonGroupCollapseV83[id]===undefined?true:nonGroupCollapseV83[id]); renderNonPengadaanV79(); }
function nonStatusSummaryV83(docs){
  if(!docs.length) return 'BELUM ADA DOKUMEN';
  if(docs.some(d=>String(d.status_verifikasi||'').toUpperCase()==='PERBAIKAN DOKUMEN')) return 'PERBAIKAN DOKUMEN';
  if(docs.every(d=>String(d.status_verifikasi||'').toUpperCase()==='VALID DOKUMEN')) return 'DOKUMEN VALID';
  return 'MENUNGGU VERIFIKASI DOKUMEN';
}
renderNonPengadaanV79=function(){
  const list=approvedNonActivitiesV83();
  const uploadSection=canUploadNonV83()?`<section class="panel fade-up premium-panel collapsible-panel"><div class="panel-head"><div><h3>Upload Dokumen Non Pengadaan</h3><p class="panel-sub">Pilih kegiatan Non Pengadaan, kemudian upload satu atau beberapa dokumen pendukung.</p></div></div><div class="form-grid"><div class="field"><label>Pilih Kegiatan</label><select id="nonKegiatanV83">${list.map(k=>`<option value="${esc(k.id_kegiatan)}">${esc(k.nama_kegiatan)} - ${esc(k.jenis_non_pengadaan||'Non Pengadaan')}</option>`).join('')}</select></div></div><div id="nonUploadRowsV83"><div class="doc-upload-row non-upload-row-v83"><div class="field"><label>Jenis Dokumen</label><select class="jenisNonDokV83">${nonDocOptionsV83()}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileNonDokV83"></div><button class="btn-red" type="button" onclick="this.closest('.non-upload-row-v83').remove()">Hapus</button></div></div><button class="btn-soft" type="button" onclick="addNonUploadRowV83()">+ Tambah File Dokumen</button> <button type="button" onclick="uploadAllNonV83()">Upload Semua Dokumen</button><div class="msg">${list.length?'':'Belum ada kegiatan Non Pengadaan yang disetujui Verifikator.'}</div></section>`:'';
  const cards=list.map(k=>{
    const n=latestNonV79(k.id_kegiatan), docs=docsNonV79(k.id_kegiatan), collapsed=nonGroupCollapseV83[k.id_kegiatan]===undefined?true:nonGroupCollapseV83[k.id_kegiatan];
    const status=nonStatusSummaryV83(docs);
    const docRows=docs.map(d=>`<div class="doc-item-v83"><div><b>${esc(d.jenis_dokumen)}</b><small>${esc(d.nama_file||'')}</small></div><a target="_blank" href="${esc(d.url_file||'#')}">Buka File</a>${badge(d.status_verifikasi||'MENUNGGU VERIFIKASI DOKUMEN')}<button class="btn-mini btn-soft" onclick="alert('${esc((d.catatan_verifikator||'Belum ada catatan').replace(/'/g,"\\'"))}')">Lihat Status</button>${(canManage()||isVerifierV77())?`<button class="btn-mini btn-green" onclick="verifyNonV79('${esc(d.id_dokumen_non)}','VALID DOKUMEN')">Valid</button><button class="btn-mini btn-orange" onclick="verifyNonV79('${esc(d.id_dokumen_non)}','PERBAIKAN DOKUMEN')">Perbaikan</button>`:''}</div>`).join('');
    return `<article class="non-card-v83 ${status==='DOKUMEN VALID'?'is-valid':''}"><div class="non-card-head-v83"><div><b>${esc(k.nama_kegiatan)}</b><small>${esc(k.id_kegiatan)} • ${esc(bidangName(k.id_bidang))}</small><div class="v70-kegiatan-meta"><span><b>Jenis:</b> ${esc(k.jenis_non_pengadaan||'Non Pengadaan')}</span><span><b>Jumlah:</b> ${rupiah(k.jumlah)}</span><span><b>Waktu:</b> ${esc(formatTanggal(k.waktu_pemilihan)||'-')}</span></div></div><div class="non-card-right-v83">${badge(status)}<button class="btn-soft" onclick="toggleNonGroupV83('${esc(k.id_kegiatan)}')">${collapsed?'Lihat Rincian':'Minimize'}</button></div></div><div class="non-card-actions-v83">${String(k.jenis_non_pengadaan||'').toLowerCase().includes('honor')?(!n?.url_pdf?`<button class="btn-green" onclick="openHonorModalV79('${esc(k.id_kegiatan)}')">Buat Dokumen Honorarium</button>`:`<a class="btn-link-v79" target="_blank" href="${esc(n.url_pdf)}">Download Dokumen V${esc(n.versi_pdf||1)}</a><button class="btn-soft" onclick="openHonorModalV79('${esc(k.id_kegiatan)}')">Buat Versi Baru</button>`):''}<span>${docs.length} dokumen diupload</span></div><div class="non-card-body-v83 ${collapsed?'hidden':''}">${docRows||'<p class="muted">Belum ada dokumen yang diupload.</p>'}</div></article>`;
  }).join('');
  document.getElementById('contentArea').innerHTML=`${uploadSection}<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Data Dokumen & Pencatatan Non Pengadaan</h3><p class="panel-sub">Seluruh kegiatan Non Pengadaan dikelola pada menu ini dan tidak masuk ke Pencatatan Pengadaan.</p></div><button class="btn-refresh" onclick="refreshData()">Refresh</button></div><div class="filter-card"><div class="toolbar"><div class="field"><label>Search Nama Kegiatan</label><input placeholder="Cari nama kegiatan..." oninput="filters.cairSearch=this.value"></div></div></div><div class="non-list-v83">${cards||'<div class="empty-box">Belum ada kegiatan Non Pengadaan yang disetujui.</div>'}</div></section><div id="honorModalV79" class="modal-backdrop hidden"></div>`;
};

openHonorModalV79=function(id){
  const k=(dashboard.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id)); if(!k) return;
  let m=document.getElementById('honorModalV79');
  if(!m){ m=document.createElement('div'); m.id='honorModalV79'; document.body.appendChild(m); }
  m.className='modal-backdrop honor-backdrop-v83';
  m.innerHTML=`<div class="modal-card honor-modal-v83 fade-up"><div class="modal-head"><div><h3>Buat Dokumen Honorarium</h3><p>${esc(k.nama_kegiatan)} • ${esc(bidangName(k.id_bidang))}</p></div><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Tutup</button></div><input type="hidden" id="honorKegV79" value="${esc(id)}"><div class="honor-modal-info-v81"><div><span>ID Kegiatan</span><b>${esc(k.id_kegiatan)}</b></div><div><span>Jenis</span><b>${esc(k.jenis_non_pengadaan||'Honorarium')}</b></div><div><span>Nilai Perencanaan</span><b>${rupiah(k.jumlah)}</b></div><div><span>Petunjuk</span><b>Isi data penerima honor secara lengkap.</b></div></div><div class="honor-modal-body-v81"><div class="honor-head-row-v81"><span>Daftar Penerima Honorarium</span><button class="btn-soft" type="button" onclick="document.getElementById('honorRowsV79').insertAdjacentHTML('beforeend', honorRowV79())">+ Tambah Penerima</button></div><div id="honorRowsV79" class="honor-rows-v81">${honorRowV79()}</div></div><div class="modal-actions honor-actions-v81"><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Batal</button><button id="btnGenerateHonorV81" class="btn-green" onclick="generateHonorV79()">Buat Dokumen Honorarium</button></div></div>`;
};

/* =========================================================
   SIMPROV v84 - Fix Final Non Pengadaan, PDF Honor, Mobile Table
   ========================================================= */
function isApprovedPlanningV84(status){
  const s=String(status||'').toUpperCase().replace(/_/g,' ');
  return s==='DISETUJUI' || s==='DISETUJUI PBJ' || s.startsWith('DISETUJUI');
}
function compactRupiahV84(value){
  const n=Number(value||0), a=Math.abs(n);
  const fmt=(x)=>Number.isInteger(x)?String(x):x.toFixed(1).replace('.',',');
  if(a>=1e12) return 'Rp '+fmt(n/1e12)+' Triliun';
  if(a>=1e9) return 'Rp '+fmt(n/1e9)+' Miliar';
  if(a>=1e6) return 'Rp '+fmt(n/1e6)+' Juta';
  if(a>=1e3) return 'Rp '+fmt(n/1e3)+' Ribu';
  return rupiah(n);
}
approvedNonActivitiesV83=function(){
  return (dashboard?.perencanaan||[]).filter(k=>isNonKategoriV81(k) && isApprovedPlanningV84(k.status_perencanaan));
};

/* Pastikan menu yang dipilih selalu merender modul yang benar. */
renderContent=function(){
  if(activeMenu==='Dashboard Monitoring') return renderMonitoring();
  if(activeMenu==='Struktur Anggaran') return renderStrukturAnggaran();
  if(activeMenu==='Perencanaan') return renderPerencanaan();
  if(activeMenu==='Pencairan') return renderPencairan();
  if(activeMenu==='Non Pengadaan') return renderNonPengadaanV79();
  if(activeMenu==='Manajemen Akses') return renderManajemenAkunV65();
  if(activeMenu==='Laporan') return renderLaporan();
  return renderStrukturAnggaran();
};
setMenu=function(m){
  activeMenu=m; perencanaanPage=1; pencairanPage=1;
  renderMenu(); renderSummary(); renderContent(); updateIdentityHeaderV77();
  window.scrollTo({top:0,behavior:'smooth'});
};

/* Dashboard publik: angka besar dibuat mudah dibaca. */
renderPublicDashboardV82=function(payload, fromCache=false){
  const sum=document.getElementById('publicSummary'); if(!sum) return;
  const s=payload.summary||{}, ident=payload.identity||{};
  document.getElementById('publicIdentity').innerHTML=[ident.ketua_umum&&`Ketua Umum: ${esc(ident.ketua_umum)}`,ident.sekretaris_umum&&`Sekretaris Umum: ${esc(ident.sekretaris_umum)}`,ident.verifikator&&`Verifikator: ${esc(ident.verifikator)}`].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
  sum.innerHTML=[
    publicMetricCard('Total Pagu',compactRupiahV84(s.total_pagu),'Total anggaran keseluruhan','blue'),
    publicMetricCard('Realisasi Pagu',compactRupiahV84(s.realisasi_total),`${Number(s.persentase_realisasi||0).toFixed(1)}% dari pagu`,'green'),
    publicMetricCard('Sisa Pagu',compactRupiahV84(s.sisa_pagu),'Pagu dikurangi realisasi','red'),
    publicMetricCard('Jumlah Kegiatan',String(s.jumlah_kegiatan||0),`${s.jumlah_selesai||0} kegiatan selesai`,'yellow')
  ].join('');
  const pct=Math.max(0,Math.min(100,Number(s.persentase_realisasi||0)));
  const progress=document.getElementById('publicProgress');
  if(progress) progress.innerHTML=`<div class="big-percent">${pct.toFixed(1)}%</div><div class="public-progress-track"><i style="width:${pct}%"></i></div><div class="public-progress-notes"><span>Total Pagu ${compactRupiahV84(s.total_pagu)}</span><span>Realisasi ${compactRupiahV84(s.realisasi_total)}</span><span>Sisa ${compactRupiahV84(s.sisa_pagu)}</span></div>`;
  const composition=document.getElementById('publicComposition');
  if(composition) composition.innerHTML=`<p class="public-system-note-v84">Ringkasan berikut hanya menghitung kegiatan yang sudah diinput ke dalam SIMPROV.</p><div class="public-simple-stats-v82"><div><span>Total Perencanaan Terinput</span><b>${compactRupiahV84(s.perencanaan_total||0)}</b></div><div><span>Kegiatan Terinput</span><b>${s.jumlah_kegiatan||0}</b></div><div><span>Kegiatan Selesai</span><b>${s.jumlah_selesai||0}</b></div></div>${fromCache?`<div class="public-cache-info-v82">Tampilan cache: ${dashboardCacheAgeText(payload.savedAt)}</div>`:''}`;
  const rows=(payload.ringkasan||[]).map(x=>`<tr><td>${esc(x.nama_bidang||x.id_bidang)}</td><td title="${rupiah(x.pagu)}">${compactRupiahV84(x.pagu)}</td><td title="${rupiah(x.total_perencanaan||0)}">${compactRupiahV84(x.total_perencanaan||0)}</td><td title="${rupiah(x.realisasi_total||0)}">${compactRupiahV84(x.realisasi_total||0)}</td><td title="${rupiah(x.sisa_pagu||0)}">${compactRupiahV84(x.sisa_pagu||0)}</td><td>${x.jumlah_kegiatan||0}</td><td>${x.kegiatan_selesai||0}</td></tr>`).join('');
  document.getElementById('publicBidangTable').innerHTML=`<table class="public-table-v82"><thead><tr><th>Bidang</th><th>Total Pagu</th><th>Total Perencanaan</th><th>Realisasi</th><th>Sisa Pagu</th><th>Kegiatan</th><th>Selesai</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="empty">Belum ada data</td></tr>'}</tbody></table>`;
};

/* Kartu Non Pengadaan tetap muncul walau PDF honor belum dibuat. */
const __renderNonV84Base=renderNonPengadaanV79;
renderNonPengadaanV79=function(){
  __renderNonV84Base();
  const list=approvedNonActivitiesV83();
  const select=document.getElementById('nonKegiatanV83');
  if(select && !select.options.length && list.length){
    select.innerHTML=list.map(k=>`<option value="${esc(k.id_kegiatan)}">${esc(k.nama_kegiatan)} - ${esc(k.jenis_non_pengadaan||'Non Pengadaan')}</option>`).join('');
  }
};

/* =========================================================
   SIMPROV v86 - FINAL STABILITY FIX
   Satu blok kompatibilitas untuk seluruh pemanggilan menu.
   ========================================================= */
function renderStrukturAnggaran(){ return renderStruktur(); }
function formatTanggal(v){ return formatTanggalID(v); }

function injectSinglePlanningLegendV86(){
  const panels=[...document.querySelectorAll('#contentArea .panel, #contentArea section')];
  const panel=panels.find(p=>p.querySelector('table') && /Data Perencanaan|Persetujuan Perencanaan|Pemeriksaan Data Perencanaan/i.test(p.textContent||''));
  if(!panel) return;
  panel.querySelectorAll('.status-legend-v60,.status-legend-v74').forEach(el=>el.remove());
  const tableWrap=panel.querySelector('.table-wrap') || panel.querySelector('table');
  if(!tableWrap || !tableWrap.parentNode) return;
  const legend=document.createElement('div');
  legend.className='status-legend-v60 status-legend-final-v86';
  legend.innerHTML='<span><i class="l-green"></i>Disetujui / valid</span><span><i class="l-red"></i>Perlu perbaikan</span><span><i class="l-blue"></i>Diajukan / menunggu verifikasi</span><span><i class="l-yellow"></i>Menunggu verifikasi perbaikan</span>';
  tableWrap.parentNode.insertBefore(legend,tableWrap);
}
injectStatusLegendV60=injectSinglePlanningLegendV86;
injectStatusLegendV74=injectSinglePlanningLegendV86;
dedupePlanningLegendsV78=injectSinglePlanningLegendV86;

renderContent=function(){
  if(activeMenu==='Dashboard Monitoring') return renderMonitoring();
  if(activeMenu==='Struktur Anggaran') return renderStruktur();
  if(activeMenu==='Perencanaan') return renderPerencanaan();
  if(activeMenu==='Pencairan') return renderPencairan();
  if(activeMenu==='Non Pengadaan') return renderNonPengadaanV79();
  if(activeMenu==='Manajemen Akses') return renderManajemenAkunV65();
  if(activeMenu==='Laporan') return typeof renderLaporan==='function' ? renderLaporan() : renderLaporanUser();
  return renderStruktur();
};

renderAll=function(){
  renderMenu();
  renderSummary();
  renderContent();
  if(typeof updateIdentityHeaderV77==='function') updateIdentityHeaderV77();
  setTimeout(injectSinglePlanningLegendV86,0);
  setTimeout(injectSinglePlanningLegendV86,80);
};

setMenu=function(m){
  activeMenu=m;
  perencanaanPage=1;
  pencairanPage=1;
  renderAll();
  window.scrollTo({top:0,behavior:'smooth'});
};

/* =========================================================
   SIMPROV v87 - Honorarium Final: NIK 16 digit, PPh 21 otomatis,
   dokumen terkunci setelah dibuat, dan modal lebih lebar.
   ========================================================= */
function honorTaxRateV87(category){
  const c=String(category||'NON ASN').toUpperCase();
  if(c==='ASN I-II') return 0;
  if(c==='ASN III') return 5;
  if(c==='ASN IV/PEJABAT') return 15;
  return 2.5;
}
function syncHonorTaxV87(selectEl){
  const row=selectEl.closest('.honor-row-v87');
  const rate=honorTaxRateV87(selectEl.value);
  const input=row?.querySelector('.hpajak');
  if(input) input.value=String(rate).replace('.',',');
}
function honorRowV79(){
  return `<div class="honor-row-v87">
    <div class="field"><label>Nama Penerima</label><input class="hnama" placeholder="Nama lengkap" autocomplete="off"></div>
    <div class="field"><label>NIK (16 Digit)</label><input class="hnik" inputmode="numeric" maxlength="16" pattern="[0-9]{16}" placeholder="16 digit angka" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,16)"></div>
    <div class="field"><label>Jabatan / Peran</label><input class="hperan" placeholder="Contoh: Narasumber"></div>
    <div class="field"><label>Volume</label><input class="hvol" inputmode="numeric" value="1" placeholder="1"></div>
    <div class="field"><label>Satuan</label><input class="hsatuan" value="Orang/Kegiatan" placeholder="Satuan"></div>
    <div class="field"><label>Tarif Honor</label><input class="htarif" inputmode="numeric" placeholder="0" oninput="onAngkaInput(this)"></div>
    <div class="field"><label>Kategori Penerima</label><select class="hkategori" onchange="syncHonorTaxV87(this)"><option value="NON ASN">Non-ASN / Bukan Pegawai</option><option value="ASN I-II">ASN Golongan I–II</option><option value="ASN III">ASN Golongan III</option><option value="ASN IV/PEJABAT">ASN Golongan IV / Pejabat Negara</option></select></div>
    <div class="field"><label>Tarif PPh 21</label><input class="hpajak" value="2,5" readonly></div>
    <div class="honor-remove-wrap"><button class="btn-red" type="button" onclick="this.closest('.honor-row-v87').remove()">Hapus</button></div>
  </div>`;
}
openHonorModalV79=function(id){
  const k=(dashboard.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id)); if(!k) return;
  const existing=latestNonV79(id);
  if(existing?.url_pdf){ alert('Dokumen honorarium sudah dibuat dan tidak dapat diubah kembali.'); return; }
  let m=document.getElementById('honorModalV79');
  if(!m){m=document.createElement('div');m.id='honorModalV79';document.body.appendChild(m);}
  m.className='modal-backdrop honor-backdrop-v87';
  m.innerHTML=`<div class="modal-card honor-modal-v87 fade-up">
    <div class="modal-head"><div><h3>Buat Dokumen Honorarium</h3><p>${esc(k.nama_kegiatan)} • ${esc(bidangName(k.id_bidang))}</p></div><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Tutup</button></div>
    <input type="hidden" id="honorKegV79" value="${esc(id)}">
    <div class="honor-modal-info-v81"><div><span>ID Kegiatan</span><b>${esc(k.id_kegiatan)}</b></div><div><span>Jenis</span><b>${esc(k.jenis_non_pengadaan||'Honorarium')}</b></div><div><span>Nilai Perencanaan</span><b>${rupiah(k.jumlah)}</b></div><div><span>Pajak</span><b>PPh Pasal 21 dihitung otomatis berdasarkan kategori penerima.</b></div></div>
    <div class="honor-tax-note-v87"><b>Catatan:</b> honorarium orang pribadi dikenakan PPh Pasal 21, bukan PPN. Tarif otomatis: ASN Gol. I–II 0%, ASN Gol. III 5%, ASN Gol. IV/Pejabat 15%, dan Non-ASN menggunakan tarif efektif awal 2,5%.</div>
    <div class="honor-modal-body-v81"><div class="honor-head-row-v81"><span>Daftar Penerima Honorarium</span><button class="btn-soft" type="button" onclick="document.getElementById('honorRowsV79').insertAdjacentHTML('beforeend',honorRowV79())">+ Tambah Penerima</button></div><div id="honorRowsV79" class="honor-rows-v87">${honorRowV79()}</div></div>
    <div class="modal-actions honor-actions-v81"><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Batal</button><button id="btnGenerateHonorV81" class="btn-green" onclick="generateHonorV79()">Buat Dokumen Honorarium</button></div>
  </div>`;
};
generateHonorV79=async function(){
  const btn=document.getElementById('btnGenerateHonorV81'); if(btn?.dataset.busy==='1') return;
  const id=document.getElementById('honorKegV79')?.value;
  const rows=[...document.querySelectorAll('.honor-row-v87')];
  const penerima=[];
  for(let i=0;i<rows.length;i++){
    const r=rows[i], nik=(r.querySelector('.hnik')?.value||'').replace(/\D/g,'');
    const nama=r.querySelector('.hnama')?.value.trim()||'';
    const volume=toNumber(r.querySelector('.hvol')?.value), tarif=toNumber(r.querySelector('.htarif')?.value);
    if(!nama){alert(`Nama penerima ke-${i+1} wajib diisi.`);return;}
    if(!/^\d{16}$/.test(nik)){alert(`NIK penerima ke-${i+1} wajib tepat 16 digit angka.`);return;}
    if(!volume||!tarif){alert(`Volume dan tarif honor penerima ke-${i+1} wajib diisi.`);return;}
    const kategori=r.querySelector('.hkategori')?.value||'NON ASN';
    penerima.push({nama_penerima:nama,nik_npwp:nik,jabatan_peran:r.querySelector('.hperan')?.value||'',volume,satuan:r.querySelector('.hsatuan')?.value||'Orang/Kegiatan',tarif_honor:tarif,kategori_pajak:kategori,jenis_pajak:'PPh 21 OTOMATIS',tarif_pajak:honorTaxRateV87(kategori),nilai_pajak:0});
  }
  if(!penerima.length){alert('Minimal satu penerima honor wajib diisi.');return;}
  if(btn){btn.dataset.busy='1';btn.disabled=true;btn.textContent='Memproses...';}
  showLoading('Menyiapkan dokumen honorarium...');
  try{
    const res=await apiPost({action:'generateHonorPdf',user:currentUser,data:{id_kegiatan:id,penerima}});
    alert(res.message||'Proses selesai');
    if(res.success){document.getElementById('honorModalV79')?.classList.add('hidden');await loadDashboard(false);activeMenu='Non Pengadaan';renderAll();}
  }catch(e){alert(e.message||e);}finally{hideLoading();if(btn){btn.dataset.busy='0';btn.disabled=false;btn.textContent='Buat Dokumen Honorarium';}}
};

const __renderNonPengadaanV87=renderNonPengadaanV79;
renderNonPengadaanV79=function(){
  __renderNonPengadaanV87();
  document.querySelectorAll('.non-card-v83').forEach(card=>{
    const link=card.querySelector('a.btn-link-v79');
    if(link){
      card.querySelectorAll('button').forEach(btn=>{if(/Buat Versi Baru|Buat Dokumen Honorarium/i.test(btn.textContent||'')){btn.disabled=true;btn.textContent='Dokumen Sudah Dibuat';btn.classList.add('btn-disabled-v87');}});
    }
  });
};

const __renderPlanningRowV87=renderPerencanaanRow;
renderPerencanaanRow=function(k){
  let html=__renderPlanningRowV87(k);
  if(isNonKategoriV81(k) && latestNonV79(k.id_kegiatan)?.url_pdf){
    html=html.replace(/<button[^>]*onclick="openHonorModalV79\('[^']+'\)"[^>]*>[^<]*<\/button>/i,'<button class="btn-mini btn-disabled-v87" disabled>Dokumen Sudah Dibuat</button>');
  }
  return html;
};


/* SIMPROV v88 - Aksi Perencanaan Stabil */
const __renderPlanningRowV88 = renderPerencanaanRow;
renderPerencanaanRow = function(k){
  let html = __renderPlanningRowV88(k);
  html = html.replace(/<td class="nowrap([^"]*)">([\s\S]*?)<\/td>\s*<\/tr>$/, function(_, cls, content){
    return `<td class="nowrap${cls} action-cell-v88"><div class="action-buttons-v88">${content}</div></td></tr>`;
  });
  return html;
};

/* SIMPROV v89 - Verifikator dapat validasi dokumen Non Pengadaan sesuai bidang penugasan. */

/* =========================================================
   SIMPROV v90 - Penyelarasan Verifikasi Dokumen Pengadaan & Non Pengadaan
   ========================================================= */
const nonGroupCollapseV90 = {};
function nonDocStatusV90(d){ return String(d?.status_verifikasi||'MENUNGGU VERIFIKASI DOKUMEN').toUpperCase(); }
function isNonDocValidV90(d){ return nonDocStatusV90(d)==='VALID DOKUMEN'; }
function isNonDocRepairV90(d){ return nonDocStatusV90(d)==='PERBAIKAN DOKUMEN'; }
function canVerifyNonDocV90(d){ const s=nonDocStatusV90(d); return s.includes('MENUNGGU VERIFIKASI'); }
function canBulkVerifyV90(){ return canVerifyKeuangan() || isVerifierV77() || isAdmin(); }
function escapeJsTextV90(v){ return String(v||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,'\\n'); }

function toggleAllGroupChecksV90(kind,id,checked){
  document.querySelectorAll(`input[data-bulk-kind="${kind}"][data-group-id="${CSS.escape(String(id))}"]`).forEach(x=>{if(!x.disabled)x.checked=checked;});
}
async function bulkVerifyGroupV90(kind,id){
  if(!canBulkVerifyV90()){alert('Fitur ini hanya tersedia untuk Verifikator.');return;}
  const isNon=kind==='non';
  const docs=isNon?docsNonV79(id):(dashboard?.dokumen||[]).filter(d=>String(d.id_kegiatan)===String(id));
  const actionable=docs.filter(d=>isNon?canVerifyNonDocV90(d):canVerifyDocumentNowV64(d));
  if(!actionable.length){alert('Tidak ada dokumen yang sedang menunggu verifikasi.');return;}
  const selected=new Set([...document.querySelectorAll(`input[data-bulk-kind="${kind}"][data-group-id="${CSS.escape(String(id))}"]:checked`)].map(x=>String(x.value)));
  const validDocs=actionable.filter(d=>selected.has(String(isNon?d.id_dokumen_non:d.id_dokumen)));
  const repairDocs=actionable.filter(d=>!selected.has(String(isNon?d.id_dokumen_non:d.id_dokumen)));
  let note='';
  if(repairDocs.length){
    note=prompt(`${repairDocs.length} dokumen yang tidak dicentang akan ditetapkan PERBAIKAN. Masukkan catatan perbaikan umum:`)||'';
    if(!note.trim()) return;
  }
  if(!confirm(`Proses ${actionable.length} dokumen?\n${validDocs.length} VALID\n${repairDocs.length} PERBAIKAN`)) return;
  showLoading('Memproses verifikasi dokumen...');
  try{
    for(const d of validDocs){
      const payload=isNon?{action:'verifyDokumenNonPengadaan',user:currentUser,id_dokumen_non:d.id_dokumen_non,status_verifikasi:'VALID DOKUMEN',catatan_verifikator:''}:{action:'verifyDokumen',user:currentUser,id_dokumen:d.id_dokumen,status_verifikasi:'VALID',catatan_admin:''};
      const r=await apiPost(payload); if(!r.success) throw new Error(r.message||'Gagal memvalidasi dokumen');
    }
    for(const d of repairDocs){
      const payload=isNon?{action:'verifyDokumenNonPengadaan',user:currentUser,id_dokumen_non:d.id_dokumen_non,status_verifikasi:'PERBAIKAN DOKUMEN',catatan_verifikator:note}:{action:'verifyDokumen',user:currentUser,id_dokumen:d.id_dokumen,status_verifikasi:'PERBAIKAN',catatan_admin:note};
      const r=await apiPost(payload); if(!r.success) throw new Error(r.message||'Gagal menetapkan perbaikan dokumen');
    }
    await loadDashboard(false);
    alert('Verifikasi dokumen berhasil diproses.');
  }catch(e){alert(e.message||e);}finally{hideLoading();}
}

function openNonDocStatusModalV90(id){
  const d=(dashboard?.dokumenNonPengadaan||[]).find(x=>String(x.id_dokumen_non)===String(id)); if(!d) return;
  const k=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(d.id_kegiatan))||{};
  const history=String(d.riwayat_dokumen||'').split(/\n+/).filter(Boolean);
  const m=document.createElement('div');m.className='modal-backdrop';m.id='nonStatusModalV90';
  m.innerHTML=`<div class="modal-card doc-status-modal-v90"><div class="modal-head"><div><h3>Status & Riwayat Dokumen</h3><p>${esc(d.jenis_dokumen||'-')}</p></div><button class="btn-soft" onclick="document.getElementById('nonStatusModalV90')?.remove()">Tutup</button></div>
  <div class="status-detail-grid-v90"><div><span>Nama Kegiatan</span><b>${esc(k.nama_kegiatan||'-')}</b></div><div><span>Bidang</span><b>${esc(bidangName(d.id_bidang))}</b></div><div><span>Status</span>${badge(d.status_verifikasi||'MENUNGGU VERIFIKASI DOKUMEN')}</div><div><span>File</span><b>${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file||'Buka File')}</a>`:esc(d.nama_file||'-')}</b></div><div><span>Upload Oleh</span><b>${esc(d.upload_by||'-')}</b></div><div><span>Verifikasi Oleh</span><b>${esc(d.verifikasi_by||'-')}</b></div></div>
  <div class="status-note-v90"><b>Catatan Verifikator</b><p>${esc(d.catatan_verifikator||'Belum ada catatan.')}</p></div>
  <div class="status-history-v90"><b>Riwayat Dokumen</b>${history.length?history.map(x=>`<div>${esc(normalizeVerifierHistoryV91(x))}</div>`).join(''):'<p class="muted">Belum ada riwayat tambahan.</p>'}</div></div>`;
  document.body.appendChild(m);
}
async function revisiNonDokumenV90(id){
  const input=document.getElementById('revisiNon_'+id),file=input?.files?.[0];
  if(!file){alert('Pilih file perbaikan terlebih dahulu.');return;}
  showLoading('Mengupload perbaikan dokumen...');
  try{const b64=await fileToBase64(file);const r=await apiPost({action:'revisiDokumenNonPengadaan',user:currentUser,id_dokumen_non:id,file_name:file.name,mime_type:file.type,file_base64:b64});alert(r.message);if(r.success)await loadDashboard(false);}catch(e){alert(e.message||e);}finally{hideLoading();}
}

/* Pencatatan Pengadaan: default minimize + verifikasi satuan maupun massal */
renderDokumenGroupRow=function(g){
  const stGroup=groupDocStatus(g),stCair=effectivePencairanStatusV68(g),stCairU=String(stCair||'').toUpperCase();
  const isCollapsed=docGroupCollapse[g.id_kegiatan]===undefined?true:!!docGroupCollapse[g.id_kegiatan];
  const colorClass=docGroupColorClassV62(g),docs=g.docs||[];
  const docsHtml=docs.map(d=>{
    let actionHtml='<span class="muted">-</span>';
    if(canVerifyKeuangan()){
      if(canVerifyDocumentNowV64(d)) actionHtml=`<div class="doc-file-actions v59-file-actions"><button class="btn-mini btn-green" onclick="verifDok('${esc(d.id_dokumen)}','VALID')">Valid</button><button class="btn-mini btn-orange" onclick="mintaPerbaikanDok('${esc(d.id_dokumen)}')">Perbaikan</button></div>`;
      else actionHtml='<div class="doc-file-actions v59-file-actions"><button class="btn-mini btn-disabled" disabled>Valid</button><button class="btn-mini btn-disabled" disabled>Perbaikan</button></div>';
    }else if(isAdmin()||isReviewer()) actionHtml='<span class="audit-pill">Read-only</span>';
    else if(isDocRepairV64(d)) actionHtml=`<div class="doc-action-box per-file-revision compact-revision"><div class="revision-title">Upload Ulang</div><input type="file" id="revisi_${esc(d.id_dokumen)}"><button class="btn-mini btn-upload-ulang" onclick="revisiDokumen('${esc(d.id_dokumen)}')">Kirim File</button></div>`;
    const check=canVerifyKeuangan()&&canVerifyDocumentNowV64(d)?`<label class="bulk-check-v90" title="Centang jika dokumen valid"><input type="checkbox" data-bulk-kind="proc" data-group-id="${esc(g.id_kegiatan)}" value="${esc(d.id_dokumen)}"><span>Valid</span></label>`:'';
    return `<div class="doc-item doc-item-v47 ${isDocRepairV64(d)?'doc-item-repair':(isDocValidV64(d)?'doc-item-valid':'doc-item-wait')}">${check}<div class="doc-main-info"><b>${esc(normalizeJenisDokumenLabel(d.jenis_dokumen)||'-')}</b><small class="muted">${esc(d.nama_file||'-')}</small></div><div class="doc-link">${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:esc(d.nama_file||'-')}</div><div class="doc-status">${badge(d.status_verifikasi||'MENUNGGU VERIFIKASI DOKUMEN')}</div><div class="doc-file-note-action compact-status-action v59-status-action"><button class="btn-mini btn-detail" onclick="openDocStatusModal('${esc(d.id_dokumen)}')">Lihat Status</button>${actionHtml}</div></div>`;
  }).join('');
  const actionable=docs.filter(canVerifyDocumentNowV64).length;
  const bulk=canVerifyKeuangan()&&actionable?`<div class="bulk-toolbar-v90"><label><input type="checkbox" onchange="toggleAllGroupChecksV90('proc','${esc(g.id_kegiatan)}',this.checked)"> Centang semua sebagai valid</label><button class="btn-mini btn-green" onclick="bulkVerifyGroupV90('proc','${esc(g.id_kegiatan)}')">Proses Pilihan</button><small>Dicentang = Valid, tidak dicentang = Perbaikan</small></div>`:'';
  let finalAction='<span class="muted">-</span>';
  if(canFinalizePBJ()){if(stCairU==='SELESAI')finalAction='<span class="status-done-pill">SELESAI</span>';else if(allDocsValidKeuanganV64(g.id_kegiatan))finalAction=`<button class="btn-mini btn-green btn-wide" onclick="selesaikanKegiatanPBJ('${esc(g.id_kegiatan)}')">Selesaikan Kegiatan</button>`;else finalAction='<button class="btn-mini btn-disabled btn-wide" disabled>Menunggu Valid Dokumen</button>';}
  return `<tr><td class="doc-group-card ${colorClass}"><div class="doc-group-head doc-group-head-v12"><div class="doc-group-title"><b>${esc(kegiatanName(g.id_kegiatan))}</b><small>${esc(g.id_kegiatan)}</small></div><div><small class="muted">Bidang</small><br><b>${esc(bidangName(g.id_bidang))}</b></div><div><small class="muted">Status Dokumen</small><br>${badge(stGroup)}</div><div><small class="muted">Status Pencatatan</small><br>${badge(stCair)}</div><div class="doc-toggle-wrap"><button class="btn-mini btn-detail" onclick="toggleDocGroup('${esc(g.id_kegiatan)}')">${isCollapsed?'Lihat Rincian':'Minimize'}</button></div></div><div class="doc-list ${isCollapsed?'hidden':''}">${bulk}${docsHtml}</div><div class="doc-group-head doc-group-foot-v12 v69-final-action"><div class="group-reason"><b>Rekap:</b> ${docs.length} file dokumen. ${isCollapsed?'Klik Lihat Rincian untuk membuka daftar file.':'Validasi dapat dilakukan satu per satu atau sekaligus melalui pilihan centang.'}</div><div></div><div></div><div></div>${finalAction}</div></td></tr>`;
};

/* Pencatatan Non Pengadaan: mekanisme dan tampilan setara Pengadaan */
function toggleNonGroupV90(id){nonGroupCollapseV90[id]=!(nonGroupCollapseV90[id]===undefined?true:nonGroupCollapseV90[id]);renderNonPengadaanV79();}
renderNonPengadaanV79=function(){
  const list=approvedNonActivitiesV83();
  const uploadSection=canUploadNonV83()?`<section class="panel fade-up premium-panel collapsible-panel"><div class="panel-head"><div><h3>Upload Dokumen Non Pengadaan</h3><p class="panel-sub">Pilih kegiatan lalu upload satu atau beberapa dokumen pendukung.</p></div></div><div class="form-grid"><div class="field"><label>Pilih Kegiatan</label><select id="nonKegiatanV83">${list.map(k=>`<option value="${esc(k.id_kegiatan)}">${esc(k.nama_kegiatan)} - ${esc(k.jenis_non_pengadaan||'Non Pengadaan')}</option>`).join('')}</select></div></div><div id="nonUploadRowsV83"><div class="doc-upload-row non-upload-row-v83"><div class="field"><label>Jenis Dokumen</label><select class="jenisNonDokV83">${nonDocOptionsV83()}</select></div><div class="field"><label>File Dokumen</label><input type="file" class="fileNonDokV83"></div><button class="btn-red" type="button" onclick="this.closest('.non-upload-row-v83').remove()">Hapus</button></div></div><button class="btn-soft" type="button" onclick="addNonUploadRowV83()">+ Tambah File Dokumen</button> <button type="button" onclick="uploadAllNonV83()">Upload Semua Dokumen</button></section>`:'';
  const cards=list.map(k=>{
    const n=latestNonV79(k.id_kegiatan),docs=docsNonV79(k.id_kegiatan),collapsed=nonGroupCollapseV90[k.id_kegiatan]===undefined?true:!!nonGroupCollapseV90[k.id_kegiatan],status=nonStatusSummaryV83(docs);
    const rows=docs.map(d=>{
      let action='<span class="muted">-</span>';
      if(canBulkVerifyV90()){
        if(canVerifyNonDocV90(d)) action=`<div class="doc-file-actions"><button class="btn-mini btn-green" onclick="verifyNonV79('${esc(d.id_dokumen_non)}','VALID DOKUMEN')">Valid</button><button class="btn-mini btn-orange" onclick="verifyNonV79('${esc(d.id_dokumen_non)}','PERBAIKAN DOKUMEN')">Perbaikan</button></div>`;
        else action='<div class="doc-file-actions"><button class="btn-mini btn-disabled" disabled>Valid</button><button class="btn-mini btn-disabled" disabled>Perbaikan</button></div>';
      }else if(isNonDocRepairV90(d)) action=`<div class="doc-action-box per-file-revision compact-revision"><div class="revision-title">Upload Ulang</div><input type="file" id="revisiNon_${esc(d.id_dokumen_non)}"><button class="btn-mini btn-upload-ulang" onclick="revisiNonDokumenV90('${esc(d.id_dokumen_non)}')">Kirim File</button></div>`;
      const check=canBulkVerifyV90()&&canVerifyNonDocV90(d)?`<label class="bulk-check-v90" title="Centang jika dokumen valid"><input type="checkbox" data-bulk-kind="non" data-group-id="${esc(k.id_kegiatan)}" value="${esc(d.id_dokumen_non)}"><span>Valid</span></label>`:'';
      return `<div class="doc-item doc-item-v47 ${isNonDocRepairV90(d)?'doc-item-repair':(isNonDocValidV90(d)?'doc-item-valid':'doc-item-wait')}">${check}<div class="doc-main-info"><b>${esc(d.jenis_dokumen||'-')}</b><small class="muted">${esc(d.nama_file||'-')}</small></div><div class="doc-link">${d.url_file?`<a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:'-'}</div><div class="doc-status">${badge(d.status_verifikasi||'MENUNGGU VERIFIKASI DOKUMEN')}</div><div class="doc-file-note-action compact-status-action"><button class="btn-mini btn-detail" onclick="openNonDocStatusModalV90('${esc(d.id_dokumen_non)}')">Lihat Status</button>${action}</div></div>`;
    }).join('');
    const actionable=docs.filter(canVerifyNonDocV90).length;
    const bulk=canBulkVerifyV90()&&actionable?`<div class="bulk-toolbar-v90"><label><input type="checkbox" onchange="toggleAllGroupChecksV90('non','${esc(k.id_kegiatan)}',this.checked)"> Centang semua sebagai valid</label><button class="btn-mini btn-green" onclick="bulkVerifyGroupV90('non','${esc(k.id_kegiatan)}')">Proses Pilihan</button><small>Dicentang = Valid, tidak dicentang = Perbaikan</small></div>`:'';
    const honorAction=String(k.jenis_non_pengadaan||'').toLowerCase().includes('honor')?(n?.url_pdf?`<a class="btn-link-v79" target="_blank" href="${esc(n.url_pdf)}">Download Dokumen V${esc(n.versi_pdf||1)}</a><button class="btn-soft btn-disabled-v87" disabled>Dokumen Sudah Dibuat</button>`:`<button class="btn-green" onclick="openHonorModalV79('${esc(k.id_kegiatan)}')">Buat Dokumen Honorarium</button>`):'';
    return `<article class="non-card-v83 ${status==='DOKUMEN VALID'?'is-valid':''}"><div class="non-card-head-v83"><div><b>${esc(k.nama_kegiatan)}</b><small>${esc(k.id_kegiatan)} • ${esc(bidangName(k.id_bidang))}</small><div class="v70-kegiatan-meta"><span><b>Jenis:</b> ${esc(k.jenis_non_pengadaan||'Non Pengadaan')}</span><span><b>Jumlah:</b> ${rupiah(k.jumlah)}</span><span><b>Waktu:</b> ${esc(formatTanggal(k.waktu_pemilihan)||'-')}</span></div></div><div class="non-card-right-v83">${badge(status)}<button class="btn-soft" onclick="toggleNonGroupV90('${esc(k.id_kegiatan)}')">${collapsed?'Lihat Rincian':'Minimize'}</button></div></div><div class="non-card-actions-v83">${honorAction}<span>${docs.length} dokumen diupload</span></div><div class="non-card-body-v83 ${collapsed?'hidden':''}">${bulk}${rows||'<p class="muted">Belum ada dokumen yang diupload.</p>'}<div class="doc-group-foot-v90"><b>Rekap:</b> ${docs.length} file dokumen. Validasi dapat dilakukan satu per satu atau sekaligus melalui pilihan centang.</div></div></article>`;
  }).join('');
  document.getElementById('contentArea').innerHTML=`${uploadSection}<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Data Dokumen & Pencatatan Non Pengadaan</h3><p class="panel-sub">Mekanisme pemeriksaan, riwayat, perbaikan, dan validasi dibuat sama dengan Pencatatan Pengadaan.</p></div><button class="btn-refresh" onclick="refreshData()">Refresh</button></div><div class="filter-card"><div class="toolbar"><div class="field"><label>Search Nama Kegiatan</label><input value="${esc(filters.cairSearch||'')}" placeholder="Cari nama kegiatan..." oninput="filters.cairSearch=this.value;renderNonPengadaanV79()"></div></div></div><div class="non-list-v83">${cards||'<div class="empty-box">Belum ada kegiatan Non Pengadaan yang disetujui.</div>'}</div></section><div id="honorModalV79" class="modal-backdrop hidden"></div>`;
};

/* =========================================================
   SIMPROV v91 - Penyempurnaan Verifikator & Non Pengadaan
   ========================================================= */
function normalizeVerifierHistoryV91(value){
  return String(value||'')
    .replace(/\(Admin\s*\/\s*Keuangan\)/gi,'(Verifikator)')
    .replace(/\(Keuangan\)/gi,'(Verifikator)')
    .replace(/Pemeriksaan Keuangan/gi,'Pemeriksaan Verifikator')
    .replace(/oleh Keuangan/gi,'oleh Verifikator');
}

nonStatusSummaryV83=function(docs){
  const required=['Tanda Terima','Bukti Potong Pajak'];
  const latestByType={};
  (docs||[]).forEach(d=>{ latestByType[String(d.jenis_dokumen||'').trim().toLowerCase()]=d; });
  const matched=required.map(x=>latestByType[x.toLowerCase()]).filter(Boolean);
  if(!matched.length) return 'BELUM ADA DOKUMEN';
  if(matched.some(d=>isNonDocRepairV90(d))) return 'PERBAIKAN DOKUMEN';
  if(matched.length<required.length) return 'DOKUMEN BELUM LENGKAP';
  if(matched.every(d=>isNonDocValidV90(d))) return 'DOKUMEN VALID';
  if(matched.some(d=>nonDocStatusV90(d).includes('PERBAIKAN'))) return 'MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
  return 'MENUNGGU VERIFIKASI DOKUMEN';
};

const __renderPlanningRowV91=renderPerencanaanRow;
renderPerencanaanRow=function(k){
  let html=__renderPlanningRowV91(k);
  if(isNonKategoriV81(k) && !String(k.jenis_non_pengadaan||'').toLowerCase().includes('honor')){
    html=html.replace(/<button[^>]*onclick="openHonorModalV79\('[^']+'\)"[^>]*>[\s\S]*?<\/button>/gi,
      '<button class="btn-mini btn-disabled-v87" disabled>Upload Manual di Pencatatan Non Pengadaan</button>');
    html=html.replace(/>Buat Dokumen<\/button>/gi,'>Upload Manual di Pencatatan Non Pengadaan</button>');
  }
  return html;
};
const __docsNonV91=docsNonV79;
docsNonV79=function(id){
  const allowed=new Set(['tanda terima','bukti potong pajak']);
  return (__docsNonV91(id)||[]).filter(d=>allowed.has(String(d.jenis_dokumen||'').trim().toLowerCase()));
};

/* =========================================================
   SIMPROV v92 - Honorarium revisi & detail kegiatan upload
   ========================================================= */
function honorTaxRateV92(category, manualValue=0){
  const c=String(category||'').toUpperCase();
  if(c==='INPUT MANUAL') return Number(manualValue||0);
  return honorTaxRateV87(c);
}
function syncHonorTaxV92(selectEl){
  const row=selectEl.closest('.honor-row-v92');
  const input=row?.querySelector('.hpajak');
  const manual=String(selectEl.value||'').toUpperCase()==='INPUT MANUAL';
  if(input){
    input.readOnly=!manual;
    input.classList.toggle('manual-tax-v92',manual);
    if(!manual) input.value=String(honorTaxRateV87(selectEl.value)).replace('.',',');
    else { input.value=''; input.placeholder='Masukkan persen'; input.focus(); }
  }
}
honorRowV79=function(){
  return `<div class="honor-row-v92">
    <div class="honor-row-main-v92">
      <div class="field"><label>Nama Penerima</label><input class="hnama" placeholder="Nama lengkap" autocomplete="off"></div>
      <div class="field"><label>NIK/NPWP (16 Digit)</label><input class="hnik" inputmode="numeric" maxlength="16" pattern="[0-9]{16}" placeholder="16 digit angka" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,16)"></div>
      <div class="field"><label>Jabatan / Peran</label><input class="hperan" placeholder="Contoh: Narasumber"></div>
      <div class="field field-small-v92"><label>Volume</label><input class="hvol" inputmode="numeric" value="1" placeholder="1"></div>
    </div>
    <div class="honor-row-main-v92 honor-row-second-v92">
      <div class="field"><label>Satuan</label><input class="hsatuan" value="Orang/Kegiatan" placeholder="Contoh: Orang/Kegiatan"></div>
      <div class="field"><label>Tarif Honor</label><input class="htarif" inputmode="numeric" placeholder="0" oninput="onAngkaInput(this)"></div>
      <div class="field"><label>Kategori</label><select class="hkategori" onchange="syncHonorTaxV92(this)"><option value="NON ASN">Non-ASN / Bukan Pegawai</option><option value="ASN I-II">ASN Golongan I–II</option><option value="ASN III">ASN Golongan III</option><option value="ASN IV/PEJABAT">ASN Golongan IV / Pejabat Negara</option><option value="INPUT MANUAL">Input Pajak Manual</option></select></div>
      <div class="field field-small-v92"><label>Tarif PPh 21 (%)</label><input class="hpajak" value="2,5" readonly inputmode="decimal"></div>
      <div class="honor-remove-wrap"><button class="btn-red" type="button" onclick="this.closest('.honor-row-v92').remove()">Hapus</button></div>
    </div>
  </div>`;
};
openHonorModalV79=function(id){
  const k=(dashboard.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id)); if(!k) return;
  const docs=docsNonV79(id)||[];
  if(docs.some(d=>d.url_file)){ alert('Dokumen kegiatan sudah diupload. Dokumen honorarium tidak dapat dibuat ulang.'); return; }
  let m=document.getElementById('honorModalV79');
  if(!m){m=document.createElement('div');m.id='honorModalV79';document.body.appendChild(m);}
  m.className='modal-backdrop honor-backdrop-v87';
  const latest=latestNonV79(id);
  m.innerHTML=`<div class="modal-card honor-modal-v92 fade-up">
    <div class="modal-head"><div><h3>Buat Dokumen Honorarium</h3><p>${esc(k.nama_kegiatan)} • ${esc(bidangName(k.id_bidang))}</p></div><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Tutup</button></div>
    <input type="hidden" id="honorKegV79" value="${esc(id)}">
    <div class="honor-modal-info-v81"><div><span>ID Kegiatan</span><b>${esc(k.id_kegiatan)}</b></div><div><span>Jenis</span><b>${esc(k.jenis_non_pengadaan||'Honorarium')}</b></div><div><span>Nilai Perencanaan</span><b>${rupiah(k.jumlah)}</b></div><div><span>Versi Selanjutnya</span><b>V${Number(latest?.versi_pdf||0)+1}</b></div></div>
    <div class="honor-tax-note-v87"><b>Catatan:</b> tarif otomatis tersedia sesuai kategori. Pilih <b>Input Pajak Manual</b> apabila persentase pajak perlu ditentukan sendiri.</div>
    <div class="honor-modal-body-v81"><div class="honor-head-row-v81"><span>Daftar Penerima Honorarium</span><button class="btn-soft" type="button" onclick="document.getElementById('honorRowsV79').insertAdjacentHTML('beforeend',honorRowV79())">+ Tambah Penerima</button></div><div id="honorRowsV79" class="honor-rows-v92">${honorRowV79()}</div></div>
    <div class="modal-actions honor-actions-v81"><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Batal</button><button id="btnGenerateHonorV81" class="btn-green" onclick="generateHonorV79()">${latest?.url_pdf?'Buat Versi Baru':'Buat Dokumen Honorarium'}</button></div>
  </div>`;
};
generateHonorV79=async function(){
  const btn=document.getElementById('btnGenerateHonorV81'); if(btn?.dataset.busy==='1') return;
  const id=document.getElementById('honorKegV79')?.value;
  const rows=[...document.querySelectorAll('.honor-row-v92')], penerima=[];
  for(let i=0;i<rows.length;i++){
    const r=rows[i], nik=(r.querySelector('.hnik')?.value||'').replace(/\D/g,''), nama=r.querySelector('.hnama')?.value.trim()||'';
    const volume=toNumber(r.querySelector('.hvol')?.value), tarif=toNumber(r.querySelector('.htarif')?.value), kategori=r.querySelector('.hkategori')?.value||'NON ASN';
    const manual=String(kategori).toUpperCase()==='INPUT MANUAL';
    const rate=honorTaxRateV92(kategori,toNumber(r.querySelector('.hpajak')?.value));
    if(!nama){alert(`Nama penerima ke-${i+1} wajib diisi.`);return;}
    if(!/^\d{16}$/.test(nik)){alert(`NIK/NPWP penerima ke-${i+1} wajib tepat 16 digit angka.`);return;}
    if(!volume||!tarif){alert(`Volume dan tarif honor penerima ke-${i+1} wajib diisi.`);return;}
    if(manual && (rate<0||rate>100)){alert(`Tarif pajak manual penerima ke-${i+1} harus antara 0 sampai 100%.`);return;}
    penerima.push({nama_penerima:nama,nik_npwp:nik,jabatan_peran:r.querySelector('.hperan')?.value||'',volume,satuan:r.querySelector('.hsatuan')?.value||'Orang/Kegiatan',tarif_honor:tarif,kategori_pajak:kategori,jenis_pajak:manual?'PPh 21 MANUAL':'PPh 21 OTOMATIS',tarif_pajak:rate,nilai_pajak:0});
  }
  if(!penerima.length){alert('Minimal satu penerima honor wajib diisi.');return;}
  if(btn){btn.dataset.busy='1';btn.disabled=true;btn.textContent='Memproses...';}
  showLoading('Menyiapkan dokumen honorarium...');
  try{
    const res=await apiPost({action:'generateHonorPdf',user:currentUser,data:{id_kegiatan:id,penerima}});
    alert(res.message||'Proses selesai');
    if(res.success){document.getElementById('honorModalV79')?.classList.add('hidden');await loadDashboard(false);activeMenu='Non Pengadaan';renderAll();}
  }catch(e){alert(e.message||e);}finally{hideLoading();if(btn){btn.dataset.busy='0';btn.disabled=false;btn.textContent='Buat Dokumen Honorarium';}}
};

function kegiatanDetailHtmlV92(k){
  if(!k) return '';
  return `<div class="selected-kegiatan-detail-v92"><div><span>ID Kegiatan</span><b>${esc(k.id_kegiatan||'-')}</b></div><div><span>Nama Kegiatan</span><b>${esc(k.nama_kegiatan||'-')}</b></div><div><span>Bidang</span><b>${esc(bidangName(k.id_bidang)||'-')}</b></div><div><span>Kategori/Jenis</span><b>${esc(isNonKategoriV81(k)?('Non Pengadaan • '+(k.jenis_non_pengadaan||'-')):(k.metode_pemilihan||'-'))}</b></div><div><span>Jumlah</span><b>${rupiah(k.jumlah||0)}</b></div><div><span>Waktu</span><b>${esc(formatTanggalID(k.waktu_pemilihan)||'-')}</b></div></div>`;
}
const __updateSaranV92=updateSaranDokumen;
updateSaranDokumen=function(){
  __updateSaranV92();
  const id=document.getElementById('dokKegiatan')?.value;
  const k=(dashboard.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));
  const box=document.getElementById('saranDokumen'); if(box) box.innerHTML=kegiatanDetailHtmlV92(k);
};
function updateNonKegiatanDetailV92(){
  const id=document.getElementById('nonKegiatanV83')?.value;
  const k=(dashboard.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));
  const box=document.getElementById('nonKegiatanDetailV92'); if(box) box.innerHTML=kegiatanDetailHtmlV92(k);
}
const __renderNonV92=renderNonPengadaanV79;
renderNonPengadaanV79=function(){
  __renderNonV92();
  const sel=document.getElementById('nonKegiatanV83');
  if(sel){
    sel.setAttribute('onchange','updateNonKegiatanDetailV92()');
    const fg=sel.closest('.form-grid');
    if(fg && !document.getElementById('nonKegiatanDetailV92')) fg.insertAdjacentHTML('afterend','<div id="nonKegiatanDetailV92"></div>');
    updateNonKegiatanDetailV92();
  }
  document.querySelectorAll('.non-card-v83').forEach(card=>{
    const id=card.querySelector('small')?.textContent?.split('•')[0]?.trim();
    const docs=id?docsNonV79(id):[];
    const link=card.querySelector('a.btn-link-v79');
    if(link && !docs.some(d=>d.url_file)){
      const disabled=[...card.querySelectorAll('button')].find(b=>/Dokumen Sudah Dibuat/i.test(b.textContent||''));
      if(disabled){disabled.disabled=false;disabled.classList.remove('btn-disabled-v87');disabled.textContent='Buat Versi Baru';disabled.setAttribute('onclick',`openHonorModalV79('${esc(id)}')`);}
    }
  });
};
const __renderPlanningV92=renderPerencanaanRow;
renderPerencanaanRow=function(k){
  let html=__renderPlanningV92(k);
  if(isNonKategoriV81(k) && String(k.jenis_non_pengadaan||'').toLowerCase().includes('honor')){
    const docs=docsNonV79(k.id_kegiatan)||[], latest=latestNonV79(k.id_kegiatan);
    if(latest?.url_pdf && !docs.some(d=>d.url_file)) html=html.replace(/<button[^>]*disabled[^>]*>Dokumen Sudah Dibuat<\/button>/i,`<button class="btn-mini btn-green" onclick="openHonorModalV79('${esc(k.id_kegiatan)}')">Buat Versi Baru</button>`);
  }
  return html;
};

/* =========================================================
   SIMPROV v93 - Laporan Non Pengadaan, Hak Akses Honor,
   Pembuatan Versi, dan Upload Langsung pada Rincian
   ========================================================= */
function canCreateHonorV93(){
  return !!currentUser && !isAdmin() && !isVerifierV77() && !isReviewer();
}

/* Pastikan modal versi baru hanya bisa dibuka oleh User Bidang dan
   tetap dapat dibuat selama belum ada dokumen pendukung yang diunggah. */
const __openHonorModalV93Base = openHonorModalV79;
openHonorModalV79 = function(id){
  if(!canCreateHonorV93()){
    alert('Pembuatan dokumen honorarium hanya dapat dilakukan oleh User Bidang.');
    return;
  }
  const docs=(docsNonV79(id)||[]).filter(d=>String(d.url_file||'').trim());
  if(docs.length){
    alert('Dokumen kegiatan sudah diupload. Dokumen honorarium tidak dapat dibuat ulang.');
    return;
  }
  return __openHonorModalV93Base(id);
};

/* Override terakhir untuk menghindari penguncian lama hanya karena PDF V1 telah dibuat. */
const __generateHonorV93Base = generateHonorV79;
generateHonorV79 = async function(){
  if(!canCreateHonorV93()){
    alert('Pembuatan dokumen honorarium hanya dapat dilakukan oleh User Bidang.');
    return;
  }
  const id=document.getElementById('honorKegV79')?.value;
  const docs=(docsNonV79(id)||[]).filter(d=>String(d.url_file||'').trim());
  if(docs.length){
    alert('Dokumen kegiatan sudah diupload. Dokumen honorarium tidak dapat dibuat ulang.');
    return;
  }
  return __generateHonorV93Base();
};

function allowedNonDocsV93(){ return ['Tanda Terima','Bukti Potong Pajak']; }
function missingNonDocsV93(id){
  const existing=new Set((docsNonV79(id)||[]).filter(d=>String(d.url_file||'').trim()).map(d=>String(d.jenis_dokumen||'').trim().toLowerCase()));
  return allowedNonDocsV93().filter(j=>!existing.has(j.toLowerCase()));
}
async function uploadInlineNonV93(id,jenis){
  if(!canCreateHonorV93()) return;
  const input=document.getElementById(`inlineNonFileV93_${CSS.escape(String(id))}_${jenis==='Tanda Terima'?'tt':'bp'}`);
  const file=input?.files?.[0];
  if(!file){alert(`Pilih file ${jenis} terlebih dahulu.`);return;}
  showLoading(`Mengupload ${jenis}...`);
  try{
    const b64=await fileToBase64(file);
    const r=await apiPost({action:'uploadDokumenNonPengadaan',user:currentUser,id_kegiatan:id,jenis_dokumen:jenis,file_name:file.name,mime_type:file.type,file_base64:b64});
    alert(r.message||'Proses selesai');
    if(r.success){await loadDashboard(false);activeMenu='Non Pengadaan';renderAll();}
  }catch(e){alert(e.message||e);}finally{hideLoading();}
}
function inlineNonUploadHtmlV93(k){
  if(!canCreateHonorV93()) return '';
  const missing=missingNonDocsV93(k.id_kegiatan);
  if(!missing.length) return '<div class="inline-non-complete-v93">Seluruh dokumen wajib sudah diupload.</div>';
  return `<div class="inline-non-upload-v93"><div class="inline-non-title-v93"><b>Upload Dokumen yang Belum Tersedia</b><span>${missing.length} dokumen belum diupload</span></div>${missing.map(j=>{const key=j==='Tanda Terima'?'tt':'bp';return `<div class="inline-non-row-v93"><div><b>${esc(j)}</b><small>PDF/JPG/PNG sesuai dokumen asli</small></div><input type="file" id="inlineNonFileV93_${esc(k.id_kegiatan)}_${key}" accept=".pdf,.jpg,.jpeg,.png"><button class="btn-mini btn-upload-ulang" onclick="uploadInlineNonV93('${esc(k.id_kegiatan)}','${esc(j)}')">Upload</button></div>`}).join('')}</div>`;
}

const __renderNonV93Base = renderNonPengadaanV79;
renderNonPengadaanV79 = function(){
  __renderNonV93Base();
  const list=(dashboard.perencanaan||[]).filter(k=>isNonKategoriV81(k));
  document.querySelectorAll('.non-card-v83').forEach(card=>{
    const id=(card.querySelector('small')?.textContent||'').split('•')[0].trim();
    const k=list.find(x=>String(x.id_kegiatan)===String(id));
    if(!k) return;
    /* Admin/Verifikator hanya memeriksa, tidak membuat dokumen. */
    if(!canCreateHonorV93()){
      card.querySelectorAll('button').forEach(btn=>{
        if(/Buat Dokumen Honorarium|Buat Versi Baru/i.test(btn.textContent||'')) btn.remove();
      });
    }
    const body=card.querySelector('.non-card-body-v83');
    if(body && !body.querySelector('.inline-non-upload-v93,.inline-non-complete-v93')){
      body.insertAdjacentHTML('beforeend',inlineNonUploadHtmlV93(k));
    }
  });
};

/* Tombol pada tabel Perencanaan hanya untuk User Bidang. */
const __renderPlanningV93Base=renderPerencanaanRow;
renderPerencanaanRow=function(k){
  let html=__renderPlanningV93Base(k);
  if((isAdmin()||isVerifierV77()||isReviewer()) && isNonKategoriV81(k)){
    html=html.replace(/<button[^>]*onclick="openHonorModalV79\('[^']+'\)"[^>]*>[^<]*<\/button>/gi,'<span class="muted">-</span>');
  }
  return html;
};

/* Laporan monitoring: tambahkan rekap Non Pengadaan dan dokumennya. */
const __buildMonitoringReportV93Base=buildMonitoringReportBodyV55;
buildMonitoringReportBodyV55=function(semuaBidang){
  let html=__buildMonitoringReportV93Base(semuaBidang);
  const userBidang=String(currentUser?.id_bidang||'');
  const plans=(dashboard.perencanaan||[]).filter(k=>isNonKategoriV81(k) && (semuaBidang||String(k.id_bidang)===userBidang));
  const docs=(dashboard.dokumenNonPengadaan||[]).filter(d=>semuaBidang||String(d.id_bidang)===userBidang);
  const latestRows=dashboard.nonPengadaan||[];
  const rows=plans.map((k,i)=>{
    const kd=docs.filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
    const valid=kd.filter(d=>String(d.status_verifikasi||'').toUpperCase()==='VALID DOKUMEN').length;
    const latest=latestRows.filter(n=>String(n.id_kegiatan)===String(k.id_kegiatan)).sort((a,b)=>toNumber(b.versi_pdf)-toNumber(a.versi_pdf))[0];
    const detail=allowedNonDocsV93().map(j=>{
      const d=kd.find(x=>String(x.jenis_dokumen||'').toLowerCase()===j.toLowerCase());
      return `<div><b>${plainText(j)}</b>: ${d?`${plainText(displayStatusText(d.status_verifikasi||'-'))}${d.url_file?` - <a href="${esc(d.url_file)}" target="_blank">Buka File</a>`:''}`:'BELUM DIUPLOAD'}</div>`;
    }).join('');
    return `<tr><td>${i+1}</td><td>${plainText(k.id_kegiatan)}</td><td>${plainText(bidangName(k.id_bidang))}</td><td>${plainText(k.nama_kegiatan)}</td><td>${plainText(k.jenis_non_pengadaan||'-')}</td><td>${rupiah(k.jumlah||0)}</td><td>${latest?.url_pdf?`V${plainText(latest.versi_pdf||1)} - <a href="${esc(latest.url_pdf)}" target="_blank">Buka Dokumen Honor</a>`:'-'}</td><td>${valid}/2 valid</td><td>${detail}</td></tr>`;
  }).join('');
  const section=`<h3>4. Rekap Kegiatan dan Dokumen Non Pengadaan</h3><table><thead><tr><th>No</th><th>ID Kegiatan</th><th>Bidang</th><th>Nama Kegiatan</th><th>Jenis</th><th>Jumlah</th><th>Dokumen Honor</th><th>Dokumen Valid</th><th>Rincian Dokumen</th></tr></thead><tbody>${rows||'<tr><td colspan="9">Belum ada kegiatan Non Pengadaan</td></tr>'}</tbody></table>`;
  return html+section;
};


/* =========================================================
   SIMPROV v94 (frontend) - Menu Pengadaan Langsung ala SPSE,
   Master Penyedia, dan Pencatatan Belanja Langsung <= 500jt.
   ========================================================= */

const TAHAPAN_PL_V94 = [
  {no:1, nama:'Survei Harga & HPS', dok:['Hasil Survey Harga','Spesifikasi Teknis dan HPS']},
  {no:2, nama:'Undangan Pengadaan Langsung', dok:['Surat Undangan Pengadaan Langsung']},
  {no:3, nama:'Penawaran, Evaluasi & Negosiasi', dok:['Surat Penawaran','Berita Acara Evaluasi dan Negosiasi']},
  {no:4, nama:'Penetapan Penyedia', dok:['Berita Acara Hasil Pengadaan Langsung']},
  {no:5, nama:'SPK / Surat Perjanjian', dok:['Surat Perintah Kerja']},
  {no:6, nama:'Pemeriksaan & Serah Terima', dok:['Berita Acara Pemeriksaan Barang/Pekerjaan','Berita Acara Serah Terima']},
  {no:7, nama:'Pembayaran', dok:['Kuitansi / Nota / Invoice','Faktur Pembelian','SPTJM','Surat Permohonan Pembayaran','Nota Dinas Pencairan','Surat Perintah Pembayaran']}
];
function tahapanDefFeV95(metode){
  const m = String(metode || '').toUpperCase();
  return TAHAPAN_PL_V94.map(t => (t.no === 5 && m === 'TENDER MANUAL') ? {no:5, nama:'Surat Perjanjian / Kontrak', dok:['Surat Perjanjian / Kontrak']} : t);
}

dokumenKetentuanByMetode = function(metode){
  const m = String(metode || "").toUpperCase();
  if(m === "BELANJA LANGSUNG") return ["Hasil Survey Harga","Spesifikasi Teknis dan HPS","Kuitansi / Nota / Invoice","Berita Acara Pemeriksaan Barang/Pekerjaan","Berita Acara Serah Terima","Faktur Pembelian","SPTJM","Surat Permohonan Pembayaran","Nota Dinas Pencairan","Surat Perintah Pembayaran"];
  if(m === "PENGADAAN LANGSUNG" || m === "TENDER MANUAL"){
    const out = [];
    tahapanDefFeV95(m).forEach(t => t.dok.forEach(j => { if(!out.includes(j)) out.push(j); }));
    return out;
  }
  return JENIS_DOKUMEN_SOP;
};

function metodeKegiatanV94(k){ return String(k?.metode_pemilihan || metodePemilihanByNilai(k?.jumlah)).toUpperCase(); }
function isBLV94(k){ return metodeKegiatanV94(k) === 'BELANJA LANGSUNG'; }
function isPipelineV94(k){ const m = metodeKegiatanV94(k); return m === 'PENGADAAN LANGSUNG' || m === 'TENDER MANUAL'; }
function dokKeyV94(v){ return String(v ?? '').trim().toUpperCase().replace(/\s*\/\s*/g,' / ').replace(/\s+/g,' '); }
function isDokValidV94(d){ const s = String(d?.status_verifikasi || '').toUpperCase(); return s === 'VALID' || s === 'VALID DOKUMEN' || s === 'VALID KEUANGAN'; }

function tahapanStateFeV94(k){
  const rows = (dashboard?.pbjTahapanV94 || []).filter(t => String(t.id_kegiatan) === String(k.id_kegiatan));
  const docs = (dashboard?.dokumen || []).filter(d => String(d.id_kegiatan) === String(k.id_kegiatan));
  const docMap = {}; docs.forEach(d => docMap[dokKeyV94(d.jenis_dokumen)] = d);
  const approved = String(k.status_perencanaan || '').toUpperCase() === 'DISETUJUI';
  return tahapanDefFeV95(metodeKegiatanV94(k)).map(t => {
    const row = rows.find(x => toNumber(x.tahap) === t.no) || null;
    const dok = t.dok.map(j => {
      const d = docMap[dokKeyV94(j)] || null;
      return {jenis:j, uploaded:!!d, valid:!!(d && isDokValidV94(d)), status:d ? String(d.status_verifikasi || 'MENUNGGU') : 'BELUM DIUPLOAD', url:d ? String(d.url_file || '') : ''};
    });
    let status = row ? String(row.status || 'BELUM').toUpperCase() : 'BELUM';
    return {tahap:t.no, nama_tahap:t.nama, status, dok, dok_lengkap_valid:dok.every(x => x.valid),
      nama_penyedia:row ? String(row.nama_penyedia || '') : '', nilai_negosiasi:row ? toNumber(row.nilai_negosiasi) : 0,
      nomor_dokumen:row ? String(row.nomor_dokumen || '') : '', tanggal_mulai:row ? String(row.tanggal_mulai || '') : '',
      tanggal_selesai:row ? String(row.tanggal_selesai || '') : '', catatan:row ? String(row.catatan || '') : '',
      updated_by:row ? String(row.updated_by || '') : ''};
  });
}
function kontrakInfoFeV94(k){
  const st = tahapanStateFeV94(k);
  let nilai = 0, penyedia = '';
  st.forEach(t => { if(t.nilai_negosiasi > 0) nilai = t.nilai_negosiasi; if(t.nama_penyedia) penyedia = t.nama_penyedia; });
  return {nilai, penyedia};
}

/* Muat data penyedia + tahapan setelah dashboard dimuat */
const __loadDashboardV94Base = loadDashboard;
loadDashboard = async function(withLoader = true){
  await __loadDashboardV94Base(withLoader);
  await loadPbjDataV94();
};
async function loadPbjDataV94(){
  if(!currentUser || !dashboard) return;
  try{
    const r = await apiPost({action:'getPbjDataV94', user:currentUser});
    if(r?.success){
      dashboard.penyediaV94 = Array.isArray(r.penyedia) ? r.penyedia : [];
      dashboard.pbjTahapanV94 = Array.isArray(r.tahapan) ? r.tahapan : [];
      if(activeMenu === 'Pengadaan Langsung') renderContent();
    }
  }catch(e){ dashboard.penyediaV94 = dashboard.penyediaV94 || []; dashboard.pbjTahapanV94 = dashboard.pbjTahapanV94 || []; }
}

/* Menu baru: Pengadaan Langsung (setelah Pencairan) */
const __menuItemsV94Base = menuItemsV83;
menuItemsV83 = function(){
  const m = __menuItemsV94Base().map(x => x.slice());
  if(!m.some(x => x[0] === 'Pengadaan Langsung')){
    const i = m.findIndex(x => x[0] === 'Pencairan');
    m.splice(i >= 0 ? i + 1 : m.length, 0, ['Pengadaan Langsung','Pengadaan Langsung']);
  }
  return m;
};
const __renderContentV94Base = renderContent;
renderContent = function(){
  if(activeMenu === 'Pengadaan Langsung') return renderPengadaanLangsungV94();
  return __renderContentV94Base();
};

function penyediaDatalistV94(){
  const list = (dashboard?.penyediaV94 || []).filter(p => String(p.status_aktif || 'AKTIF').toUpperCase() !== 'NONAKTIF');
  return `<datalist id="penyediaListV94">${list.map(p => `<option value="${esc(p.nama_penyedia)}">`).join('')}</datalist>`;
}

function stepperHtmlV94(k, state){
  return `<div class="pl-stepper-v94">${state.map(t => {
    const cls = t.status === 'SELESAI' ? 'done' : (t.status === 'PROSES' ? 'proses' : (state.find(x => x.tahap === t.tahap - 1)?.status === 'SELESAI' || t.tahap === 1 ? 'next' : 'locked'));
    return `<div class="pl-step-v94 ${cls}"><div class="pl-step-dot-v94">${t.status === 'SELESAI' ? '&#10003;' : t.tahap}</div><div class="pl-step-name-v94">${esc(t.nama_tahap)}</div></div>`;
  }).join('<div class="pl-step-line-v94"></div>')}</div>`;
}

function tahapDetailHtmlV94(k, t, aktifBisaDiproses){
  const dokRows = t.dok.map(x => `<div class="pl-dok-row-v94"><span class="pl-dok-chip-v94 ${x.valid ? 'ok' : (x.uploaded ? 'wait' : 'no')}">${x.valid ? 'VALID' : (x.uploaded ? esc(displayStatusText(x.status)) : 'BELUM DIUPLOAD')}</span> ${esc(x.jenis)}${x.url ? ` - <a href="${esc(x.url)}" target="_blank">Buka File</a>` : ''}</div>`).join('') || '';
  const info = [];
  if(t.nama_penyedia) info.push(`Penyedia: <b>${esc(t.nama_penyedia)}</b>`);
  if(t.nilai_negosiasi > 0) info.push(`Nilai Negosiasi: <b>${rupiah(t.nilai_negosiasi)}</b>`);
  if(t.nomor_dokumen) info.push(`No. Dokumen: ${esc(t.nomor_dokumen)}`);
  if(t.tanggal_mulai || t.tanggal_selesai) info.push(`Periode: ${esc(t.tanggal_mulai || '-') } s.d. ${esc(t.tanggal_selesai || '-')}`);
  if(t.catatan) info.push(`Catatan: ${esc(t.catatan)}`);
  if(t.updated_by && t.status === 'SELESAI') info.push(`<span class="small">Diselesaikan oleh ${esc(t.updated_by)}</span>`);

  let uploadHtml = '';
  if(canUploadNonV83() && t.dok.some(x => !x.valid) && String(k.status_pencairan || '').toUpperCase() !== 'SELESAI'){
    const opsi = t.dok.filter(x => !x.uploaded || !x.valid).map(x => `<option value="${esc(x.jenis)}">${esc(x.jenis)}</option>`).join('');
    uploadHtml = `<div class="pl-upload-v94"><b>Upload dokumen tahap ini:</b><div class="pl-upload-row-v94"><select id="plJenis-${esc(k.id_kegiatan)}-${t.tahap}">${opsi}</select><input type="file" id="plFile-${esc(k.id_kegiatan)}-${t.tahap}"><button class="btn-soft" onclick="uploadDokTahapV94('${esc(k.id_kegiatan)}',${t.tahap})" type="button">Upload</button></div></div>`;
  }

  let formHtml = '';
  if(isPBJVerifierV65() && aktifBisaDiproses && t.status !== 'SELESAI'){
    const butuhPenyedia = t.tahap === 3 || t.tahap === 4;
    const butuhNego = t.tahap === 3;
    const butuhTanggal = t.tahap === 5;
    formHtml = `<div class="pl-form-v94">
      ${butuhPenyedia ? `<div class="field"><label>Nama Penyedia${t.tahap === 4 ? ' (terpilih)' : ''}</label><input list="penyediaListV94" id="plPenyedia-${esc(k.id_kegiatan)}-${t.tahap}" placeholder="Ketik nama penyedia (otomatis masuk master)" value="${esc(t.nama_penyedia)}"></div>` : ''}
      ${butuhNego ? `<div class="field"><label>Nilai Hasil Negosiasi (Rp)</label><input type="number" id="plNego-${esc(k.id_kegiatan)}-${t.tahap}" min="0" value="${t.nilai_negosiasi || ''}" placeholder="Maks. ${rupiah(k.jumlah)}"></div>` : ''}
      <div class="field"><label>Nomor Dokumen (BA/SPPBJ/SPK)</label><input type="text" id="plNomor-${esc(k.id_kegiatan)}-${t.tahap}" value="${esc(t.nomor_dokumen)}"></div>
      ${butuhTanggal ? `<div class="field"><label>Tanggal Mulai</label><input type="date" id="plMulai-${esc(k.id_kegiatan)}-${t.tahap}" value="${esc(t.tanggal_mulai)}"></div><div class="field"><label>Tanggal Selesai</label><input type="date" id="plAkhir-${esc(k.id_kegiatan)}-${t.tahap}" value="${esc(t.tanggal_selesai)}"></div>` : ''}
      <div class="field"><label>Catatan</label><input type="text" id="plCatatan-${esc(k.id_kegiatan)}-${t.tahap}" value="${esc(t.catatan)}"></div>
      <button onclick="selesaikanTahapV94('${esc(k.id_kegiatan)}',${t.tahap})" type="button" ${t.dok_lengkap_valid ? '' : 'disabled title="Dokumen tahap ini belum lengkap/VALID"'}>Selesaikan Tahap ${t.tahap}</button>
    </div>`;
  }
  let bukaHtml = '';
  if(isPBJVerifierV65() && t.status === 'SELESAI' && String(k.status_pencairan || '').toUpperCase() !== 'SELESAI'){
    bukaHtml = `<button class="btn-soft pl-buka-v94" onclick="bukaTahapV94('${esc(k.id_kegiatan)}',${t.tahap})" type="button">Buka Kembali</button>`;
  }
  return `<details class="pl-tahap-v94 ${t.status === 'SELESAI' ? 'done' : ''}" ${aktifBisaDiproses && t.status !== 'SELESAI' ? 'open' : ''}>
    <summary><span class="pl-tahap-no-v94">Tahap ${t.tahap}</span> ${esc(t.nama_tahap)} <span class="pl-tahap-status-v94 ${t.status === 'SELESAI' ? 'ok' : ''}">${esc(t.status)}</span></summary>
    <div class="pl-tahap-body-v94">${info.length ? `<div class="pl-info-v94">${info.join(' &middot; ')}</div>` : ''}${dokRows}${uploadHtml}${formHtml}${bukaHtml}</div>
  </details>`;
}

function renderPengadaanLangsungV94(){
  const plans = (dashboard?.perencanaan || []).filter(k => isProcurementV83(k) && isPipelineV94(k));
  const approved = plans.filter(k => String(k.status_perencanaan || '').toUpperCase() === 'DISETUJUI');
  const belum = plans.length - approved.length;

  const cards = approved.map(k => {
    const state = tahapanStateFeV94(k);
    const selesaiCount = state.filter(t => t.status === 'SELESAI').length;
    const final = String(k.status_pencairan || '').toUpperCase() === 'SELESAI';
    const info = kontrakInfoFeV94(k);
    let nextIdx = state.findIndex(t => t.status !== 'SELESAI');
    const tahapHtml = state.map((t, i) => tahapDetailHtmlV94(k, t, i === nextIdx && !final)).join('');
    return `<section class="panel fade-up premium-panel pl-card-v94">
      <div class="panel-head"><div>
        <h3>${esc(k.nama_kegiatan)}</h3>
        <p class="panel-sub">${esc(k.id_kegiatan)} &middot; ${esc(bidangName(k.id_bidang))} &middot; ${esc(k.metode_pemilihan || metodePemilihanByNilai(k.jumlah))} &middot; Pagu ${rupiah(k.jumlah)}${info.nilai ? ` &middot; Negosiasi ${rupiah(info.nilai)}` : ''}${info.penyedia ? ` &middot; Penyedia: ${esc(info.penyedia)}` : ''}</p>
      </div>
      <span class="pl-progress-v94 ${final ? 'ok' : ''}">${final ? 'SELESAI' : 'Tahap ' + selesaiCount + '/7'}</span></div>
      ${stepperHtmlV94(k, state)}
      ${tahapHtml}
    </section>`;
  }).join('');

  let penyediaPanel = '';
  if(isPBJVerifierV65()){
    const rows = (dashboard?.penyediaV94 || []).map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.nama_penyedia)}</td><td>${esc(p.npwp || '-')}</td><td>${esc(p.bank || '-')} ${esc(p.no_rekening || '')}</td><td>${esc(p.nama_kontak || '-')} ${esc(p.no_hp || '')}</td><td>${esc(String(p.status_aktif || 'AKTIF'))}</td><td><button class="btn-soft" onclick="editPenyediaV94('${esc(p.id_penyedia)}')" type="button">Edit</button></td></tr>`).join('');
    penyediaPanel = `<section class="panel fade-up premium-panel collapsible-panel">
      <div class="panel-head"><div><h3>Master Penyedia</h3><p class="panel-sub">Daftar rekanan/penyedia. Nama yang diketik manual pada tahapan otomatis terdaftar di sini agar tidak terjadi duplikasi ejaan.</p></div>${collapseButton('penyediaV94')}</div>
      <div class="collapse-body ${collapseState.penyediaV94 ? 'hidden' : ''}">
      <div class="form-grid">
        <input type="hidden" id="pydId">
        <div class="field"><label>Nama Penyedia *</label><input type="text" id="pydNama"></div>
        <div class="field"><label>NPWP</label><input type="text" id="pydNpwp"></div>
        <div class="field"><label>Alamat</label><input type="text" id="pydAlamat"></div>
        <div class="field"><label>Bank</label><input type="text" id="pydBank"></div>
        <div class="field"><label>No. Rekening</label><input type="text" id="pydRek"></div>
        <div class="field"><label>Nama Kontak</label><input type="text" id="pydKontak"></div>
        <div class="field"><label>No. HP</label><input type="text" id="pydHp"></div>
        <div class="field"><label>Status</label><select id="pydStatus"><option value="AKTIF">AKTIF</option><option value="NONAKTIF">NONAKTIF</option></select></div>
      </div>
      <button onclick="savePenyediaFormV94()" type="button">Simpan Penyedia</button> <button class="btn-soft" onclick="resetPenyediaFormV94()" type="button">Reset Form</button>
      <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>No</th><th>Nama</th><th>NPWP</th><th>Rekening</th><th>Kontak</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty">Belum ada penyedia terdaftar</td></tr>'}</tbody></table></div>
      </div></section>`;
  }

  document.getElementById('contentArea').innerHTML = `${penyediaDatalistV94()}
    <section class="panel fade-up">
      <div class="panel-title-row"><div><h3>Pengadaan Langsung (di atas 500 juta)</h3>
      <p class="panel-sub">Proses bertahap ala SPSE: paket &rarr; penawaran &rarr; evaluasi &amp; negosiasi &rarr; penetapan penyedia &rarr; kontrak &rarr; serah terima &amp; pembayaran. Seluruh dokumen tiap tahap wajib VALID sebelum tahap berikutnya dibuka, dan seluruh tahap wajib tuntas sebelum pencairan diselesaikan.</p></div>
      <button class="btn-refresh" onclick="refreshData()">Refresh Data</button></div>
      ${belum ? `<p class="small">${belum} kegiatan Pengadaan Langsung/Tender masih menunggu persetujuan perencanaan dan belum masuk pipeline.</p>` : ''}
    </section>
    ${penyediaPanel}
    ${cards || '<section class="panel fade-up"><p class="empty">Belum ada kegiatan Pengadaan Langsung / Tender Manual yang DISETUJUI.</p></section>'}`;
}

async function selesaikanTahapV94(idKegiatan, tahap){
  const g = id => document.getElementById(id)?.value || '';
  const data = {
    nama_penyedia: g(`plPenyedia-${idKegiatan}-${tahap}`),
    nilai_negosiasi: g(`plNego-${idKegiatan}-${tahap}`),
    nomor_dokumen: g(`plNomor-${idKegiatan}-${tahap}`),
    tanggal_mulai: g(`plMulai-${idKegiatan}-${tahap}`),
    tanggal_selesai: g(`plAkhir-${idKegiatan}-${tahap}`),
    catatan: g(`plCatatan-${idKegiatan}-${tahap}`)
  };
  if(!confirm(`Tandai Tahap ${tahap} SELESAI untuk kegiatan ini?`)) return;
  showLoading('Menyimpan tahapan...');
  try{
    const r = await apiPost({action:'updateTahapanV94', user:currentUser, id_kegiatan:idKegiatan, tahap, data});
    alert(r.message || (r.success ? 'Berhasil' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}
async function bukaTahapV94(idKegiatan, tahap){
  if(!confirm(`Buka kembali Tahap ${tahap} untuk perbaikan?`)) return;
  showLoading('Membuka tahapan...');
  try{
    const r = await apiPost({action:'updateTahapanV94', user:currentUser, id_kegiatan:idKegiatan, tahap, mode:'BUKA'});
    alert(r.message || (r.success ? 'Berhasil' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}
async function uploadDokTahapV94(idKegiatan, tahap){
  const jenis = document.getElementById(`plJenis-${idKegiatan}-${tahap}`)?.value;
  const file = document.getElementById(`plFile-${idKegiatan}-${tahap}`)?.files?.[0];
  if(!jenis || !file){ alert('Pilih jenis dokumen dan file dulu.'); return; }
  showLoading('Upload dokumen tahap ' + tahap + '...');
  try{
    const base64 = await fileToBase64(file);
    const r = await apiPost({action:'uploadDokumen', user:currentUser, id_kegiatan:idKegiatan, jenis_dokumen:jenis, file_name:file.name, mime_type:file.type, file_base64:base64});
    alert(r.message || (r.success ? 'Dokumen terupload' : 'Gagal upload'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}
function resetPenyediaFormV94(){ ['pydId','pydNama','pydNpwp','pydAlamat','pydBank','pydRek','pydKontak','pydHp'].forEach(i => { const el = document.getElementById(i); if(el) el.value = ''; }); const s = document.getElementById('pydStatus'); if(s) s.value = 'AKTIF'; }
function editPenyediaV94(id){
  const p = (dashboard?.penyediaV94 || []).find(x => String(x.id_penyedia) === String(id));
  if(!p) return;
  const set = (i, v) => { const el = document.getElementById(i); if(el) el.value = v || ''; };
  set('pydId', p.id_penyedia); set('pydNama', p.nama_penyedia); set('pydNpwp', p.npwp); set('pydAlamat', p.alamat);
  set('pydBank', p.bank); set('pydRek', p.no_rekening); set('pydKontak', p.nama_kontak); set('pydHp', p.no_hp);
  set('pydStatus', String(p.status_aktif || 'AKTIF').toUpperCase());
  document.getElementById('pydNama')?.scrollIntoView({behavior:'smooth', block:'center'});
}
async function savePenyediaFormV94(){
  const g = id => document.getElementById(id)?.value || '';
  if(!g('pydNama').trim()){ alert('Nama penyedia wajib diisi.'); return; }
  showLoading('Menyimpan penyedia...');
  try{
    const r = await apiPost({action:'savePenyediaV94', user:currentUser, data:{id_penyedia:g('pydId'), nama_penyedia:g('pydNama'), npwp:g('pydNpwp'), alamat:g('pydAlamat'), bank:g('pydBank'), no_rekening:g('pydRek'), nama_kontak:g('pydKontak'), no_hp:g('pydHp'), status_aktif:g('pydStatus')}});
    alert(r.message || (r.success ? 'Tersimpan' : 'Gagal'));
    if(r.success){ resetPenyediaFormV94(); await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}

/* Pencatatan Belanja Langsung (<= 500jt) di menu Pencairan untuk User Bidang.
   Kegiatan Pengadaan Langsung/Tender diarahkan ke menu tahapan. */
const __renderPencairanV94Base = renderPencairan;
renderPencairan = function(){
  __renderPencairanV94Base();
  const area = document.getElementById('contentArea');
  if(!area || !dashboard) return;
  if(!canUploadNonV83()) return;
  const blList = (dashboard.perencanaan || []).filter(k =>
    isProcurementV83(k) && isBLV94(k) &&
    String(k.status_perencanaan || '').toUpperCase() === 'DISETUJUI' &&
    String(k.status_pencairan || '').toUpperCase() !== 'SELESAI' &&
    String(k.id_bidang) === String(currentUser?.id_bidang || ''));
  const opsi = blList.map(k => `<option value="${esc(k.id_kegiatan)}" data-jumlah="${toNumber(k.jumlah)}">${esc(k.nama_kegiatan)} - ${rupiah(k.jumlah)}</option>`).join('');
  const panel = document.createElement('div');
  panel.innerHTML = `${penyediaDatalistV94()}<section class="panel fade-up premium-panel bl-catat-v94">
    <div class="panel-head"><div><h3>Pencatatan Belanja Langsung (&le; 500 juta)</h3>
    <p class="panel-sub">Sesuai ketentuan, belanja sampai dengan 500 juta cukup dicatat tanpa syarat kelengkapan dokumen. Setelah dicatat, kegiatan langsung berstatus SELESAI dan masuk realisasi. Upload bukti (kwitansi, SPTJM, dsb.) tetap tersedia bila diperlukan.</p></div></div>
    ${blList.length ? `<div class="form-grid">
      <div class="field"><label>Pilih Kegiatan</label><select id="blKegiatanV94">${opsi}</select></div>
      <div class="field"><label>Nilai Realisasi (Rp) *</label><input type="number" id="blNilaiV94" min="1"></div>
      <div class="field"><label>Nama Penyedia / Toko</label><input list="penyediaListV94" id="blPenyediaV94" placeholder="Opsional - otomatis masuk master penyedia"></div>
      <div class="field"><label>Nomor Bukti (Kwitansi/Nota)</label><input type="text" id="blBuktiV94"></div>
      <div class="field"><label>Keterangan</label><input type="text" id="blKetV94"></div>
    </div>
    <button onclick="submitCatatBLV94()" type="button">Catat &amp; Tandai Selesai</button>` : '<p class="empty">Tidak ada kegiatan Belanja Langsung yang menunggu pencatatan.</p>'}
  </section>`;
  const fragV94 = document.createDocumentFragment();
  while(panel.firstChild) fragV94.appendChild(panel.firstChild);
  area.insertBefore(fragV94, area.firstChild);
};
async function submitCatatBLV94(){
  const id = document.getElementById('blKegiatanV94')?.value;
  const nilai = toNumber(document.getElementById('blNilaiV94')?.value);
  if(!id){ alert('Pilih kegiatan dulu.'); return; }
  if(nilai <= 0){ alert('Isi nilai realisasi.'); return; }
  const maks = toNumber(document.querySelector(`#blKegiatanV94 option[value="${CSS.escape(id)}"]`)?.dataset?.jumlah);
  if(maks > 0 && nilai > maks){ alert(`Nilai realisasi melebihi nilai perencanaan (${rupiah(maks)}).`); return; }
  if(!confirm('Catat realisasi dan tandai kegiatan SELESAI?')) return;
  showLoading('Mencatat Belanja Langsung...');
  try{
    const r = await apiPost({action:'catatBelanjaLangsungV118', user:currentUser, id_kegiatan:id,
      nilai_realisasi:nilai, nama_penyedia:document.getElementById('blPenyediaV94')?.value || '',
      nomor_bukti:document.getElementById('blBuktiV94')?.value || '', keterangan:document.getElementById('blKetV94')?.value || ''});
    alert(r.message || (r.success ? 'Tercatat' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}


/* =========================================================
   SIMPROV v95 (frontend)
   - Tampilan list paket ala SPSE untuk menu Pencairan
     (Pencatatan Pengadaan), Pengadaan Langsung, dan Non Pengadaan:
     halaman awal berisi daftar paket hasil generate dari
     Perencanaan; klik paket -> detail (penyedia, nilai realisasi,
     upload dokumen / pipeline tahapan).
   - Referensi Standar Satuan Biaya sesuai SK 040.2/KONI.Kt.Bgr/SK/II/2026
     sebagai acuan input Perencanaan.
   ========================================================= */

const STANDAR_BIAYA_V95 = [
  {grup:'A. Insentif Khusus Pelindung & Pengurus Kontingen', items:[
    ['Pelindung Kontingen','Orang/Bulan',5000000],['Penanggung Jawab','Orang/Bulan',5000000],['Ketua Kontingen','Orang/Bulan',5000000],
    ['Wakil Ketua','Orang/Bulan',4500000],['Sekretaris','Orang/Bulan',4500000],['Wakil Sekretaris','Orang/Bulan',3500000],
    ['Bendahara','Orang/Bulan',4500000],['Wakil Bendahara','Orang/Bulan',3500000],['Koordinator Wilayah','Orang/Bulan',3000000],
    ['Sub Koordinator Wilayah','Orang/Bulan',2500000],['Ketua Bidang','Orang/Bulan',2500000],['Anggota','Orang/Bulan',2000000]]},
  {grup:'B. Insentif Khusus Atlet dan Pelatih', items:[
    ['Insentif Atlit Andalan Perorangan Olympiade','Orang/Bulan',5000000],['Insentif Atlit Andalan Perorangan Asian Games','Orang/Bulan',4500000],
    ['Insentif Atlit Andalan Perorangan Sea Games','Orang/Bulan',4000000],['Insentif Atlit Andalan Perorangan Nasional','Orang/Bulan',3500000],
    ['Insentif Atlit Andalan Perorangan PON','Orang/Bulan',3000000],['Insentif Atlit Andalan Pasangan PON','Orang/Bulan',2500000],
    ['Insentif Atlit Andalan Beregu PON','Orang/Bulan',2000000],['Insentif Atlit Prioritas Perorangan Porprov','Orang/Bulan',1500000],
    ['Insentif Atlit Potensial Perorangan','Orang/Bulan',1000000],['Insentif Atlit Potensial Beregu','Orang/Bulan',800000],
    ['Insentif Pelatih Andalan Porprov','Orang/Bulan',3000000],['Insentif Pelatih Porprov','Orang/Bulan',1500000]]},
  {grup:'C. Uang Saku', items:[
    ['Uang Saku Tenaga Perbantuan Kontingen Porprov','Orang/Kegiatan',3000000],['Uang Saku Pengurus Kontingen Porprov','Orang/Kegiatan',3000000],
    ['Uang Saku Atlet Porprov','Orang/Kegiatan',3000000],['Uang Saku Pelatih Porprov','Orang/Kegiatan',3000000],
    ['Uang Saku Manajer Tim Porprov','Orang/Kegiatan',5000000],['Uang Saku Official Tim Porprov','Orang/Kegiatan',3000000],
    ['Uang Saku Wasit Porprov','Orang/Kegiatan',3000000]]},
  {grup:'D. Honorarium Game Week PB Porprov', items:[
    ['Dewan Pembina','Orang/Hari',1250000],['Ketua Umum','Orang/Hari',1250000],['Ketua Harian','Orang/Hari',1150000],
    ['Wakil Ketua Harian','Orang/Hari',1000000],['Ketua I, II dan III','Orang/Hari',1000000],['Sekretaris Umum','Orang/Hari',1000000],
    ['Bendahara Umum','Orang/Hari',1000000],['Wakil Ketua I, II dan III','Orang/Hari',900000],['Wakil Sekretaris','Orang/Hari',900000],
    ['Wakil Bendahara','Orang/Hari',900000],['Verifikator','Orang/Hari',900000],['Kepala Bidang/Kepala Bagian','Orang/Hari',800000],
    ['Anggota','Orang/Hari',600000],['Panitia Pembantu','Orang/Hari',300000],['Tenaga IT Media Centre','Orang/Hari',300000],
    ['Liaison Officer (LO)','Orang/Hari',250000],['Petugas Lapangan','Orang/Hari',100000]]},
  {grup:'E. Honorarium Masa Persiapan PB Porprov', items:[
    ['Dewan Pembina','Orang/Hari',5000000],['Ketua Umum','Orang/Hari',5000000],['Ketua Harian','Orang/Hari',4500000],
    ['Wakil Ketua Harian','Orang/Hari',4000000],['Ketua I, II dan III','Orang/Hari',4000000],['Sekretaris Umum','Orang/Hari',4000000],
    ['Bendahara Umum','Orang/Hari',4000000],['Wakil Ketua I, II dan III','Orang/Hari',3500000],['Wakil Sekretaris','Orang/Hari',3500000],
    ['Wakil Bendahara','Orang/Hari',3500000],['Verifikator','Orang/Hari',3500000],['Kepala Bidang/Kepala Badan','Orang/Hari',3000000],
    ['Anggota','Orang/Hari',2000000]]},
  {grup:'F. Honorarium Monitoring Venue', items:[
    ['Technical Delegate','Orang/Kegiatan',900000],['Supervisi/Panpel Cabor','Orang/Kegiatan',150000]]},
  {grup:'G. Konsultan Hukum dan Advokasi', items:[
    ['Legal Opinion','Paket',30000000],['Pendampingan Hukum','Paket','At Cost'],['Biaya Protes','Kali',5000000]]},
  {grup:'H. Jasa Dokumentasi', items:[
    ['Editor','Paket',8000000],['Photografer','Paket',7000000],['Social Media Admin','Paket',7000000],['Videografer','Paket',6500000]]},
  {grup:'I. Jasa Media dan Publikasi', items:[
    ['Publikasi Media Cetak Lokal Hitam/Putih (1/4 hal)','Publikasi',3167274],['Publikasi Media Cetak Lokal Berwarna (1/4 hal)','Publikasi',7500000],
    ['Publikasi Media Cetak Regional Hitam/Putih (1/4 hal)','Publikasi',11517360],['Publikasi Media Cetak Regional Berwarna (1/4 hal)','Publikasi',16354651],
    ['Publikasi Media Cetak Nasional Hitam/Putih (1/4 hal)','Publikasi',30521004],['Publikasi Media Cetak Nasional Berwarna (1/4 hal)','Publikasi',57586800],
    ['Publikasi Media Online Lokal','Publikasi/Tayang',1299900],['Publikasi Media Online Regional','Publikasi/Tayang',2961607],
    ['Publikasi Media Online Nasional','Publikasi/Tayang',5758680],['Publikasi Radio Lokal','Publikasi/Tayang',1029000]]},
  {grup:'J. Akomodasi, Transportasi & Konsumsi', items:[
    ['Snack','Per orang',15000],['Snack VIP','Per orang',30000],['Snack Hotel','Per orang',49000],
    ['Nasi Box','Per orang',30000],['Nasi Box VIP','Per orang',50000],['Prasmanan','Per orang',60000],['Prasmanan VIP','Per orang',100000],['Jamuan Makan Hotel','Per orang',100000],
    ['Mini Bus Sedang','Per Unit/hari',500000],['Mini Bus Besar','Per Unit/hari',700000],['Bus Medium','Per Unit/hari',2000000],['Bus Large','Per Unit/hari',3500000],
    ['Uang Biaya Transportasi Lokal','Per Unit/hari',250000],
    ['Penginapan Fullboard','Per orang',600000],['Biaya Penginapan','Kamar',600000],['Biaya Pemondokan Non Hotel','Per orang',200000],['Biaya Penginapan VIP','Per orang','At Cost']]},
  {grup:'K. Uang Pengganti Transport', items:[
    ['Pengganti Transport Technical Delegate','Orang/Kegiatan',500000],['Pengganti Transport Supervisi/Panpel Cabor','Orang/Kegiatan',100000],
    ['Pengganti Transport Game Week LO','Orang/Kegiatan',100000],['Pengganti Transport Game Week Petugas Lapang','Orang/Kegiatan',100000],
    ['Pengganti Transport Game Week Panitia Pembantu','Orang/Kegiatan',100000],['Biaya Transport Lokal','Per Unit/hari',250000]]},
  {grup:'L. Uang Pengganti Makan (Voucher)', items:[
    ['Uang Pengganti Makan VIP/Voucher VIP','Orang/Hari',110000],['Uang Pengganti Makan/Voucher','Orang/Hari',60000]]},
  {grup:'M. Uang Ekstra Fooding', items:[['Uang Ekstra Fooding Kontingen Porprov','Orang/Hari',80000]]},
  {grup:'N. Dana Motivasi Langsung Peraih Medali Emas', items:[
    ['Perorangan','Medali',5000000],['Berpasangan','Medali',8000000],['Beregu 3 Orang','Medali',12000000],['Beregu Lebih dari 3 Orang','Medali',15000000]]},
  {grup:'O. Biaya Operasional Tenaga Medis', items:[['Dokter','Paket',2000000],['Masseur','Paket',1500000]]},
  {grup:'P. Operasional CDM & Penanggung Jawab Kontingen', items:[
    ['Pelindung','Paket',10000000],['Penanggung Jawab','Paket',10000000],['Chief de Mission','Paket',10000000]]},
  {grup:'Q. ATK, Barang Cetakan, dan Penutup Badan', items:[
    ['Alat Tulis Kantor (ATK)','-','At Cost'],['Backdrop','Buah',500000],['Baligo','Buah',500000],['Spanduk','Buah',100000],
    ['Sticker','Buah',10000],['Sticker Transportasi','Buah',20000],['Umbul-Umbul','Buah',100000],['X Banner','Buah',150000],
    ['Buku I','Buah',75000],['Buku II','Buah',50000],['Buku III','Buah',30000],['Dokumen Kesepakatan','Buah',20000],
    ['Boneka Maskot Rubo','Buah',60000],['Plakat','Buah',250000],['Fotocopy','Lembar',200],['Lembar Monitoring','Lembar',200],
    ['Kontrak Pengadaan/Materi Meeting/Bagan Pertandingan','Buah',10000],['Sertifikat Juara dan Piagam Peserta','Buah',10000],
    ['Technical Handbook Cabor','Buah',10000],['T-Shirt','Buah',125000],['Rompi','Buah',175000]]},
  {grup:'R. Kegiatan Pendidikan dan Pelatihan/Bimtek', items:[
    ['Honorarium Narasumber','Orang/Kegiatan',1000000],['Pengganti Transport Narasumber Bimtek','Orang/Kegiatan',500000],
    ['Uang Saku Peserta','Orang/Kegiatan',150000],['Uang Saku Monitoring Evaluasi','Orang/Kegiatan',150000],
    ['Uang Saku Pelaporan Admin','Orang/Kegiatan',150000],['Uang Saku Tenaga IT','Orang/Kegiatan',150000],
    ['Pengganti Transport Peserta Bimtek','Orang/Kegiatan',100000],['Seminar KIT','Paket',50000]]},
  {grup:'S. Satuan Biaya Perjalanan Dinas', items:[
    ['Uang Harian Perjalanan Dinas (Jawa Barat)','Orang/Hari',430000],
    ['Uang Representasi - Pelindung/Penanggungjawab/Ketua Kontingen/Ketua Umum/Dewan Pembina/Ketua Harian','Orang/Hari',250000],
    ['Uang Representasi - Wakil Ketua Kontingen/Wakil Ketua Harian/Ketua PB','Orang/Hari',200000],
    ['Uang Representasi - Wakil Ketua PB/Sekretaris/Bendahara/Verifikator','Orang/Hari',150000],
    ['Transportasi ke Kabupaten Bogor','Kendaraan',195000],['Transportasi ke Kota Depok','Kendaraan',240000],
    ['Transportasi ke Kota Sukabumi','Kendaraan',400000],['Transportasi ke Kabupaten Cianjur','Kendaraan',350000],
    ['Transportasi ke Kota Bekasi','Kendaraan',390000],['Transportasi ke Kabupaten Sukabumi','Kendaraan',470000],
    ['Transportasi ke Kabupaten Bekasi','Kendaraan',390000],['Transportasi ke Kabupaten Karawang','Kendaraan',540000],
    ['Transportasi ke Kabupaten Purwakarta','Kendaraan',760000],['Transportasi ke Kabupaten Bandung Barat','Kendaraan',1020000],
    ['Transportasi ke Kota Cimahi','Kendaraan',1050000],['Transportasi ke Kabupaten Bandung','Kendaraan',1130000],
    ['Transportasi ke Kota Bandung','Kendaraan',1080000],['Transportasi ke Kabupaten Subang','Kendaraan',950000],
    ['Transportasi ke Kabupaten Sumedang','Kendaraan',1350000],['Transportasi ke Kabupaten Garut','Kendaraan',1110000],
    ['Transportasi ke Kabupaten Majalengka','Kendaraan',1370000],['Transportasi ke Kabupaten Tasikmalaya','Kendaraan',1350000],
    ['Transportasi ke Kota Tasikmalaya','Kendaraan',1300000],['Transportasi ke Kabupaten Ciamis','Kendaraan',1670000],
    ['Transportasi ke Kota Banjar','Kendaraan',1790000],['Transportasi ke Kabupaten Indramayu','Kendaraan',1530000],
    ['Transportasi ke Kabupaten Cirebon','Kendaraan',1560000],['Transportasi ke Kabupaten Kuningan','Kendaraan',1700000],
    ['Transportasi ke Kota Cirebon','Kendaraan',1560000],['Transportasi ke Kabupaten Pangandaran','Kendaraan',2020000]]},
  {grup:'T. Satuan Biaya Paket Pelaksanaan Kegiatan Porprov', items:[
    ['Focus Group Discussion (FGD) Porprov 2026','Paket',50000000],['Pembuatan Aplikasi Porprov','Paket',20000000],
    ['Sewa Peralatan dan Perlengkapan Kantor PB Porprov','Paket',25000000],['Penutupan Porprov 2026 & Penyerahan Bendera','Paket',50000000],
    ['Dekorasi Ruang Media Center','Paket',25000000],['Alat dan Kelengkapan UPP','Paket',67760000],
    ['Perlengkapan Pos Pengamanan Terpadu','Paket',77985000],['Kesekretariatan PB Porprov','Paket',25000000],
    ['Kesekretariatan Pertandingan Cabang Olahraga','Paket',6000000],['Pembuatan Laporan Pertanggungjawaban Cabor','Paket',2500000]]},
  {grup:'U. Sewa Venue dan Kelengkapan Fasilitas Pendukung', items:[
    ['Sewa Venue dan Kelengkapan Fasilitas Pendukung (dasar: hasil survey)','Paket','At Cost']]},
  {grup:'V. Apparel dan Peralatan Latihan/Pertandingan Cabor', items:[
    ['Apparel (dasar: survey min. 2 penyedia)','Paket','At Cost'],['Peralatan dan Perlengkapan Latihan & Pertandingan Cabor (dasar: survey min. 2 penyedia)','Paket','At Cost']]}
];

let sbvSearchV95 = '';
function openStandarBiayaV95(){
  let modal = document.getElementById('sbvModalV95');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'sbvModalV95';
    modal.className = 'sbv-overlay-v95 hidden';
    modal.innerHTML = `<div class="sbv-box-v95">
      <div class="sbv-head-v95"><div><h3>Standar Satuan Biaya Porprov XV 2026</h3>
      <p class="panel-sub">SK Ketua Umum KONI Kota Bogor No. 040.2/KONI.Kt.Bgr/SK/II/2026. Berfungsi sebagai batas tertinggi/estimasi dalam penyusunan dan pelaksanaan anggaran. Gunakan sebagai acuan Harga Satuan saat input Perencanaan.</p></div>
      <button class="btn-red" onclick="document.getElementById('sbvModalV95').classList.add('hidden')" type="button">Tutup</button></div>
      <input type="text" id="sbvSearchV95" placeholder="Cari jenis biaya... (mis. honor, snack, transport)" oninput="sbvSearchV95=this.value;renderStandarBiayaBodyV95()">
      <div id="sbvBodyV95" class="sbv-body-v95"></div></div>`;
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');
  renderStandarBiayaBodyV95();
}
function renderStandarBiayaBodyV95(){
  const q = String(sbvSearchV95 || '').toLowerCase();
  const html = STANDAR_BIAYA_V95.map(g => {
    const rows = g.items.filter(it => !q || it[0].toLowerCase().includes(q) || g.grup.toLowerCase().includes(q))
      .map(it => `<tr><td>${esc(it[0])}</td><td>${esc(it[1])}</td><td class="sbv-nilai-v95">${typeof it[2] === 'number' ? rupiah(it[2]) : esc(it[2])}</td></tr>`).join('');
    if(!rows) return '';
    return `<h4>${esc(g.grup)}</h4><table><thead><tr><th>Jenis Biaya</th><th>Satuan</th><th>Besaran</th></tr></thead><tbody>${rows}</tbody></table>`;
  }).join('');
  const body = document.getElementById('sbvBodyV95');
  if(body) body.innerHTML = html || '<p class="empty">Tidak ada jenis biaya yang cocok.</p>';
}
/* Tombol Standar Biaya di menu Perencanaan */
const __renderPerencanaanV95Base = renderPerencanaan;
renderPerencanaan = function(){
  __renderPerencanaanV95Base();
  const area = document.getElementById('contentArea');
  if(!area) return;
  const firstPanel = area.querySelector('.panel-title-row .action-group') || area.querySelector('.panel-title-row');
  const btn = document.createElement('button');
  btn.className = 'btn-soft';
  btn.type = 'button';
  btn.textContent = 'Standar Biaya';
  btn.onclick = openStandarBiayaV95;
  if(firstPanel) firstPanel.appendChild(btn);
  else area.insertAdjacentHTML('afterbegin', `<section class="panel fade-up"><button class="btn-soft" type="button" onclick="openStandarBiayaV95()">Lihat Standar Biaya</button></section>`);
};

/* ---------- Tampilan List Paket ala SPSE ---------- */
let paketAktifV95 = null;      // id_kegiatan yang sedang dibuka detailnya
let paketSearchV95 = '';
const __setMenuV95Base = setMenu;
setMenu = function(m){ paketAktifV95 = null; paketSearchV95 = ''; __setMenuV95Base(m); };

function metodeBadgeV95(k){
  if(isNonKategoriV81(k)) return `<span class="paket-badge-v95 non">${esc(k.jenis_non_pengadaan || 'Non Pengadaan')}</span>`;
  const m = metodeKegiatanV94(k);
  const cls = m === 'BELANJA LANGSUNG' ? 'bl' : (m === 'PENGADAAN LANGSUNG' ? 'pl' : 'tm');
  return `<span class="paket-badge-v95 ${cls}">${esc(k.metode_pemilihan || metodePemilihanByNilai(k.jumlah))}</span> <span class="paket-badge-v95 ver">SIMPROV v95</span>`;
}
function paketStatusV95(k){
  const sp = String(k.status_perencanaan || '').toUpperCase();
  if(sp !== 'DISETUJUI') return sp === 'DITOLAK' ? 'DITOLAK' : 'MENUNGGU PERSETUJUAN PERENCANAAN';
  const st = String(getPencairanStatus(k.id_kegiatan) || '').toUpperCase();
  if(st === 'SELESAI') return 'Paket Sudah Selesai';
  return displayStatusText(st);
}
function paketTanggalV95(k){ return k.tanggal_input ? formatTanggalJam(k.tanggal_input).split(' ').slice(0,3).join(' ') : '-'; }

function paketListHtmlV95(list, opts){
  const q = paketSearchV95.toLowerCase();
  const rows = list
    .filter(k => !q || String(k.nama_kegiatan || '').toLowerCase().includes(q) || String(k.id_kegiatan || '').toLowerCase().includes(q) || bidangName(k.id_bidang).toLowerCase().includes(q))
    .map(k => `<tr class="paket-row-v95">
      <td><a href="javascript:void(0)" onclick="bukaPaketV95('${esc(k.id_kegiatan)}')" class="paket-link-v95">${esc(k.nama_kegiatan)}</a> ${metodeBadgeV95(k)}</td>
      <td>${esc(paketStatusV95(k))}</td>
      <td>${esc(paketTanggalV95(k))}</td>
      <td>${esc(bidangName(k.id_bidang))}</td>
      <td><button class="btn-soft paket-buka-v95" onclick="bukaPaketV95('${esc(k.id_kegiatan)}')" type="button">${esc(opts.aksiLabel || 'Buka Paket')}</button></td>
    </tr>`).join('');
  const buatBtn = (!canManage() && !isReviewer()) ? `<button onclick="buatPaketV95()" type="button" class="paket-buat-v95">Buat Paket</button>` : '';
  return `<section class="panel fade-up premium-panel">
    <div class="panel-title-row"><div><h3>${esc(opts.judul)}</h3><p class="panel-sub">${opts.sub}</p></div>
    <div class="action-group">${buatBtn}<button class="btn-refresh" onclick="refreshData()" type="button">Refresh Data</button></div></div>
    ${opts.info || ''}
    <div class="paket-toolbar-v95"><span>Tampilan <b>${list.length}</b> paket</span>
    <input type="text" placeholder="Cari nama paket / bidang..." value="${esc(paketSearchV95)}" oninput="paketSearchV95=this.value;renderContent()"></div>
    <div class="table-wrap"><table class="paket-table-v95"><thead><tr><th>Nama Paket</th><th>Status</th><th>Tanggal Buat</th><th>Bidang / Satuan Kerja</th><th>Aksi</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="empty">Belum ada paket. Paket muncul otomatis dari Perencanaan yang sudah dibuat${opts.butuhSetuju ? ' dan DISETUJUI' : ''}. Klik "Buat Paket" untuk membuat perencanaan baru.</td></tr>`}</tbody></table></div>
  </section>`;
}
function bukaPaketV95(id){ paketAktifV95 = String(id); renderContent(); }
function tutupPaketV95(){ paketAktifV95 = null; renderContent(); }
function buatPaketV95(){
  alert('Paket dibuat melalui menu Perencanaan. Setelah perencanaan DISETUJUI Verifikator, paket otomatis muncul di daftar ini.');
  setMenu('Perencanaan');
}
function backBarV95(k, label){
  return `<section class="panel fade-up paket-backbar-v95"><button class="btn-soft" onclick="tutupPaketV95()" type="button">&larr; Kembali ke Daftar Paket</button>
  <div><b>${esc(k.nama_kegiatan)}</b><br><small>${esc(k.id_kegiatan)} &middot; ${esc(bidangName(k.id_bidang))} &middot; ${esc(label)} &middot; Nilai Perencanaan ${rupiah(k.jumlah)}</small></div>
  <span class="pl-progress-v94 ${String(k.status_pencairan || '').toUpperCase() === 'SELESAI' ? 'ok' : ''}">${esc(paketStatusV95(k))}</span></section>`;
}

/* ----- Menu Pencairan -> Pencatatan Pengadaan (Belanja Langsung <= 500jt) ----- */
function renderPencatatanPengadaanV95(){
  const all = (dashboard?.perencanaan || []).filter(k => isProcurementV83(k) && isBLV94(k));
  if(paketAktifV95){
    const k = all.find(x => String(x.id_kegiatan) === paketAktifV95);
    if(k) return renderDetailPencatatanV95(k);
    paketAktifV95 = null;
  }
  document.getElementById('contentArea').innerHTML = paketListHtmlV95(all, {
    judul:'Pencatatan Pengadaan - Belanja Langsung (&le; 500 juta)',
    sub:'Daftar paket Belanja Langsung yang telah dibuat dari perencanaan.',
    aksiLabel:'Paket Pencatatan', butuhSetuju:true,
    info:(dashboard?.perencanaan || []).some(k => isProcurementV83(k) && isPipelineV94(k)) ? '<p class="small">Paket Pengadaan Langsung dan Tender tersedia pada menu Pengadaan Langsung.</p>' : ''
  });
}
function dokumenTableV95(k, jenisList){
  const docs = (dashboard?.dokumen || []).filter(d => String(d.id_kegiatan) === String(k.id_kegiatan));
  const rows = jenisList.map(j => {
    const d = docs.find(x => dokKeyV94(x.jenis_dokumen) === dokKeyV94(j));
    let aksi = '-';
    if(d && isPBJVerifierV65() && !isDokValidV94(d) && !['PERBAIKAN DOKUMEN','PERBAIKAN'].includes(String(d.status_verifikasi || '').toUpperCase())){
      aksi = `<button class="btn-soft" onclick="verifDokV95('${esc(d.id_dokumen)}','VALID')" type="button">Valid</button> <button class="btn-red" onclick="verifDokV95('${esc(d.id_dokumen)}','PERBAIKAN')" type="button">Perbaikan</button>`;
    }
    return `<tr><td>${esc(j)}</td><td>${d ? `<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file || 'Buka File')}</a>` : '<span class="muted">Belum diupload</span>'}</td>
      <td>${d ? badge(d.status_verifikasi || 'MENUNGGU') : '-'}</td><td>${d ? esc(d.catatan_Verifikator || d.catatan_admin || '-') : '-'}</td><td>${aksi}</td></tr>`;
  }).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Jenis Dokumen</th><th>File</th><th>Status</th><th>Catatan</th><th>Verifikasi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderDetailPencatatanV95(k){
  const final = String(k.status_pencairan || '').toUpperCase() === 'SELESAI';
  const approved = String(k.status_perencanaan || '').toUpperCase() === 'DISETUJUI';
  const isBidangSendiri = !canManage() && !isReviewer() && String(k.id_bidang) === String(currentUser?.id_bidang || '');
  const jenisList = dokumenKetentuanByMetode('BELANJA LANGSUNG');
  const real = (dashboard?.realisasi || []).find(r => String(r.id_kegiatan) === String(k.id_kegiatan));
  let catatHtml = '';
  if(!approved){
    catatHtml = `<p class="empty">Perencanaan paket ini belum DISETUJUI Verifikator, pencatatan belum bisa dilakukan.</p>`;
  } else if(final){
    catatHtml = `<div class="inline-non-complete-v93">Paket sudah SELESAI dicatat.${real ? ` Nilai realisasi ${rupiah(real.nilai_realisasi)}${real.keterangan ? ' - ' + esc(real.keterangan) : ''}` : ''}</div>`;
  } else if(isBidangSendiri){
    catatHtml = `${penyediaDatalistV94()}<div class="form-grid">
      <div class="field"><label>Nama Penyedia / Toko</label><input list="penyediaListV94" id="blPenyediaV94" placeholder="Ketik nama (otomatis masuk master penyedia)"></div>
      <div class="field"><label>Nilai Realisasi (Rp) *</label><input type="number" id="blNilaiV94" min="1" placeholder="Maks. ${rupiah(k.jumlah)}"></div>
      <div class="field"><label>Nomor Bukti (Kuitansi/Nota/Invoice)</label><input type="text" id="blBuktiV94"></div>
      <div class="field"><label>Keterangan</label><input type="text" id="blKetV94"></div></div>
      <button onclick="submitCatatBLDetailV95('${esc(k.id_kegiatan)}')" type="button">Catat &amp; Tandai Selesai</button>`;
  } else if(isPBJVerifierV65()){
    catatHtml = `<p class="small">Pencatatan dilakukan User Bidang. Sebagai Verifikator, Anda dapat menandai paket SELESAI tanpa syarat kelengkapan dokumen (sesuai ketentuan pencatatan).</p>
      <button onclick="selesaikanBLV95('${esc(k.id_kegiatan)}')" type="button">Tandai Paket SELESAI</button>`;
  } else {
    catatHtml = `<p class="small">Menunggu pencatatan oleh User Bidang.</p>`;
  }
  let uploadHtml = '';
  if(approved && isBidangSendiri){
    uploadHtml = `<div class="pl-upload-v94"><b>Upload dokumen pendukung (opsional, tidak menghambat pencatatan):</b>
      <div class="pl-upload-row-v94"><select id="blJenisDokV95">${jenisList.map(j => `<option value="${esc(j)}">${esc(j)}</option>`).join('')}</select>
      <input type="file" id="blFileDokV95"><button class="btn-soft" onclick="uploadDokBLV95('${esc(k.id_kegiatan)}')" type="button">Upload</button></div></div>`;
  }
  document.getElementById('contentArea').innerHTML = `${backBarV95(k, k.metode_pemilihan || 'Belanja Langsung')}
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Pencatatan Realisasi</h3>
    <p class="panel-sub">Isi nama penyedia dan nilai realisasi belanja. Setelah dicatat, paket langsung berstatus SELESAI dan masuk realisasi anggaran.</p></div></div>${catatHtml}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Dokumen Paket (sesuai SK: Survey Harga, HPS, Kuitansi, BA, dan dokumen pencairan)</h3></div></div>
    ${uploadHtml}${dokumenTableV95(k, jenisList)}</section>`;
}
async function submitCatatBLDetailV95(id){
  const nilai = toNumber(document.getElementById('blNilaiV94')?.value);
  if(nilai <= 0){ alert('Isi nilai realisasi.'); return; }
  if(!confirm('Catat realisasi dan tandai paket SELESAI?')) return;
  showLoading('Mencatat Belanja Langsung...');
  try{
    const r = await apiPost({action:'catatBelanjaLangsungV118', user:currentUser, id_kegiatan:id,
      nilai_realisasi:nilai, nama_penyedia:document.getElementById('blPenyediaV94')?.value || '',
      nomor_bukti:document.getElementById('blBuktiV94')?.value || '', keterangan:document.getElementById('blKetV94')?.value || ''});
    alert(r.message || (r.success ? 'Tercatat' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}
async function selesaikanBLV95(id){
  const catatan = prompt('Catatan penyelesaian (opsional):') || '';
  if(!confirm('Tandai paket Belanja Langsung ini SELESAI?')) return;
  showLoading('Menyelesaikan paket...');
  try{
    const r = await apiPost({action:'updateStatusPencairan', user:currentUser, id_kegiatan:id, status_pencairan:'SELESAI', catatan_admin:catatan});
    alert(r.message || (r.success ? 'Selesai' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}
async function uploadDokBLV95(id){
  const jenis = document.getElementById('blJenisDokV95')?.value;
  const file = document.getElementById('blFileDokV95')?.files?.[0];
  if(!jenis || !file){ alert('Pilih jenis dokumen dan file dulu.'); return; }
  showLoading('Upload dokumen...');
  try{
    const base64 = await fileToBase64(file);
    const r = await apiPost({action:'uploadDokumen', user:currentUser, id_kegiatan:id, jenis_dokumen:jenis, file_name:file.name, mime_type:file.type, file_base64:base64});
    alert(r.message || (r.success ? 'Dokumen terupload' : 'Gagal upload'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}
async function verifDokV95(idDok, status){
  let catatan = '';
  if(status === 'PERBAIKAN'){
    catatan = prompt('Alasan perbaikan (wajib):') || '';
    if(!catatan.trim()){ alert('Alasan perbaikan wajib diisi.'); return; }
  }
  showLoading('Memperbarui status dokumen...');
  try{
    const r = await apiPost({action:'verifyDokumen', user:currentUser, id_dokumen:idDok, status_verifikasi:status, catatan_admin:catatan});
    alert(r.message || (r.success ? 'Status diperbarui' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}

/* ----- Menu Pengadaan Langsung (> 500jt): list -> detail pipeline ----- */
function renderPengadaanLangsungV95(){
  const all = (dashboard?.perencanaan || []).filter(k => isProcurementV83(k) && isPipelineV94(k));
  if(paketAktifV95){
    const k = all.find(x => String(x.id_kegiatan) === paketAktifV95);
    if(k) return renderDetailPengadaanLangsungV95(k);
    paketAktifV95 = null;
  }
  let penyediaPanel = '';
  if(isPBJVerifierV65()){
    const rows = (dashboard?.penyediaV94 || []).map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.nama_penyedia)}</td><td>${esc(p.npwp || '-')}</td><td>${esc(p.bank || '-')} ${esc(p.no_rekening || '')}</td><td>${esc(p.nama_kontak || '-')} ${esc(p.no_hp || '')}</td><td>${esc(String(p.status_aktif || 'AKTIF'))}</td><td><button class="btn-soft" onclick="editPenyediaV94('${esc(p.id_penyedia)}')" type="button">Edit</button></td></tr>`).join('');
    penyediaPanel = `<section class="panel fade-up premium-panel collapsible-panel">
      <div class="panel-head"><div><h3>Master Penyedia</h3><p class="panel-sub">Karena penyedia tidak terhubung SPSE, nama yang diketik manual otomatis terdaftar di master ini agar ejaan konsisten.</p></div>${collapseButton('penyediaV94')}</div>
      <div class="collapse-body ${collapseState.penyediaV94 ? 'hidden' : ''}">
      <div class="form-grid"><input type="hidden" id="pydId">
        <div class="field"><label>Nama Penyedia *</label><input type="text" id="pydNama"></div>
        <div class="field"><label>NPWP</label><input type="text" id="pydNpwp"></div>
        <div class="field"><label>Alamat</label><input type="text" id="pydAlamat"></div>
        <div class="field"><label>Bank</label><input type="text" id="pydBank"></div>
        <div class="field"><label>No. Rekening</label><input type="text" id="pydRek"></div>
        <div class="field"><label>Nama Kontak</label><input type="text" id="pydKontak"></div>
        <div class="field"><label>No. HP</label><input type="text" id="pydHp"></div>
        <div class="field"><label>Status</label><select id="pydStatus"><option value="AKTIF">AKTIF</option><option value="NONAKTIF">NONAKTIF</option></select></div></div>
      <button onclick="savePenyediaFormV94()" type="button">Simpan Penyedia</button> <button class="btn-soft" onclick="resetPenyediaFormV94()" type="button">Reset Form</button>
      <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>No</th><th>Nama</th><th>NPWP</th><th>Rekening</th><th>Kontak</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty">Belum ada penyedia terdaftar</td></tr>'}</tbody></table></div>
      </div></section>`;
  }
  document.getElementById('contentArea').innerHTML = paketListHtmlV95(all, {
    judul:'Pengadaan Langsung (di atas 500 juta)',
    sub:'Sesuai SK 040.3/2026 Pasal 9: survei harga &rarr; spesifikasi &amp; HPS &rarr; undangan &rarr; penawaran, evaluasi &amp; negosiasi &rarr; penetapan penyedia &rarr; SPK/Surat Perjanjian &rarr; pemeriksaan &amp; serah terima &rarr; pembayaran. Dokumen tiap tahap wajib VALID sebelum lanjut, dan seluruh tahap wajib tuntas sebelum pencairan.',
    aksiLabel:'Buka Tahapan', butuhSetuju:false
  }) + penyediaPanel;
}
function renderDetailPengadaanLangsungV95(k){
  const state = tahapanStateFeV94(k);
  const final = String(k.status_pencairan || '').toUpperCase() === 'SELESAI';
  const approved = String(k.status_perencanaan || '').toUpperCase() === 'DISETUJUI';
  const info = kontrakInfoFeV94(k);
  let nextIdx = state.findIndex(t => t.status !== 'SELESAI');
  const tahapHtml = approved ? state.map((t, i) => tahapDetailHtmlV94(k, t, i === nextIdx && !final)).join('') : '<p class="empty">Perencanaan paket ini belum DISETUJUI, tahapan belum dapat diproses.</p>';
  let finalisasiHtml = '';
  if(isPBJVerifierV65() && approved && !final){
    const semuaSelesai = state.every(t => t.status === 'SELESAI');
    finalisasiHtml = `<section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Finalisasi Pencairan</h3>
      <p class="panel-sub">Seluruh tahapan dan dokumen wajib tuntas terlebih dahulu. Nilai realisasi memakai nilai hasil negosiasi bila ada.</p></div></div>
      <button onclick="selesaikanBLV95('${esc(k.id_kegiatan)}')" type="button" ${semuaSelesai ? '' : 'disabled title="Masih ada tahap yang belum SELESAI"'}>Selesaikan Paket (Pencairan)</button></section>`;
  }
  document.getElementById('contentArea').innerHTML = `${penyediaDatalistV94()}${backBarV95(k, (k.metode_pemilihan || 'Pengadaan Langsung') + (info.nilai ? ` \u00b7 Negosiasi ${rupiah(info.nilai)}` : '') + (info.penyedia ? ` \u00b7 ${info.penyedia}` : ''))}
    <section class="panel fade-up premium-panel pl-card-v94">${stepperHtmlV94(k, state)}${tahapHtml}</section>${finalisasiHtml}`;
}

/* ----- Menu Non Pengadaan: list -> detail (pakai tampilan rincian v93) ----- */
function renderNonPengadaanV95(){
  const all = (dashboard?.perencanaan || []).filter(k => isNonKategoriV81(k));
  if(paketAktifV95){
    const k = all.find(x => String(x.id_kegiatan) === paketAktifV95);
    if(k) return renderDetailNonPengadaanV95(k);
    paketAktifV95 = null;
  }
  document.getElementById('contentArea').innerHTML = paketListHtmlV95(all, {
    judul:'Pencatatan Non Pengadaan',
    sub:'Paket anggaran non pengadaan (honorarium, insentif, uang saku, dsb. sesuai Standar Biaya SK 040.2/2026). Dokumen yang diupload: Tanda Terima dan Bukti Potong Pajak. Klik paket untuk mengelola penerima honor dan dokumen.',
    aksiLabel:'Paket Pencatatan', butuhSetuju:true
  });
}
function renderDetailNonPengadaanV95(k){
  const original = dashboard.perencanaan;
  dashboard.perencanaan = original.filter(x => String(x.id_kegiatan) === String(k.id_kegiatan));
  try{ renderNonPengadaanV79(); }
  finally{ dashboard.perencanaan = original; }
  const area = document.getElementById('contentArea');
  if(area) area.insertAdjacentHTML('afterbegin', backBarV95(k, k.jenis_non_pengadaan || 'Non Pengadaan'));
}

/* Router konten v95 */
const __renderContentV95Base = renderContent;
renderContent = function(){
  if(activeMenu === 'Pencairan') return renderPencatatanPengadaanV95();
  if(activeMenu === 'Pengadaan Langsung') return renderPengadaanLangsungV95();
  if(activeMenu === 'Non Pengadaan') return renderNonPengadaanV95();
  return __renderContentV95Base();
};


/* =========================================================
   SIMPROV v96 (frontend) - Revisi:
   1. Upload dokumen langsung per-baris di tabel (bisa banyak file sekaligus)
   2. Input nilai realisasi berformat titik otomatis + tidak boleh melebihi pagu
   3. Pengadaan Langsung: kartu Penyedia & Nilai Realisasi + download template
      SPK/Surat Perjanjian/BA Pemeriksaan/BAST/Kuitansi (format SK) untuk di-ttd lalu upload
   4. Detail Non Pengadaan baru yang lebih ramah + pihak & nilai realisasi
   5. Form Perencanaan: Sumber Harga (Standar Biaya / Harga Pasar) dengan
      picker "Cari & Pilih" - harga satuan & satuan terisi otomatis, kategori
      otomatis Non Pengadaan untuk honorarium dan sejenisnya
   6-7. Polesan tampilan + loading paralel & pencarian tanpa render ulang
   ========================================================= */

/* ---------- (2) Input rupiah berformat ---------- */
function onRupiahInputV96(el){
  const digits = String(el.value || '').replace(/[^\d]/g, '');
  let v = digits ? parseInt(digits, 10) : 0;
  const max = toNumber(el.dataset.max);
  let over = false;
  if(max > 0 && v > max){ v = max; over = true; }
  el.value = v ? v.toLocaleString('id-ID') : '';
  el.classList.toggle('input-over-v96', false);
  if(over){
    el.classList.add('input-over-v96');
    let w = el.parentElement?.querySelector('.max-warn-v96');
    if(!w && el.parentElement){ w = document.createElement('small'); w.className = 'max-warn-v96'; el.parentElement.appendChild(w); }
    if(w) w.textContent = 'Maksimal ' + rupiah(max) + ' (nilai perencanaan)';
    setTimeout(() => { el.classList.remove('input-over-v96'); }, 900);
  } else {
    el.parentElement?.querySelector('.max-warn-v96')?.remove();
  }
}
function valRupiahV96(id){ return toNumber(String(document.getElementById(id)?.value || '').replace(/\./g, '').replace(/,/g, '')); }

/* ---------- (7) Loading paralel: data PBJ diambil bersamaan dashboard ---------- */
loadDashboard = async function(withLoader = true){
  const pbjPromise = currentUser ? apiPost({action:'getPbjDataV94', user:currentUser}).catch(() => null) : null;
  await __loadDashboardV94Base(withLoader);
  if(pbjPromise){
    const r = await pbjPromise;
    if(r?.success && dashboard){
      dashboard.penyediaV94 = Array.isArray(r.penyedia) ? r.penyedia : [];
      dashboard.pbjTahapanV94 = Array.isArray(r.tahapan) ? r.tahapan : [];
    }
  }
};

/* ---------- (7) Pencarian paket tanpa render ulang (fokus tidak hilang) ---------- */
function filterPaketRowsV96(input){
  paketSearchV95 = input.value;
  const q = input.value.toLowerCase();
  const tbody = document.getElementById('paketTbodyV96');
  if(!tbody) return;
  let n = 0;
  tbody.querySelectorAll('tr[data-q]').forEach(tr => {
    const show = !q || tr.dataset.q.includes(q);
    tr.style.display = show ? '' : 'none';
    if(show) n++;
  });
  const c = document.getElementById('paketCountV96');
  if(c) c.textContent = n;
}
paketListHtmlV95 = function(list, opts){
  const q = paketSearchV95.toLowerCase();
  const rows = list.map(k => {
    const key = (String(k.nama_kegiatan || '') + ' ' + String(k.id_kegiatan || '') + ' ' + bidangName(k.id_bidang) + ' ' + paketStatusV95(k)).toLowerCase();
    return `<tr class="paket-row-v95" data-q="${esc(key)}" style="${q && !key.includes(q) ? 'display:none' : ''}">
      <td><a href="javascript:void(0)" onclick="bukaPaketV95('${esc(k.id_kegiatan)}')" class="paket-link-v95">${esc(k.nama_kegiatan)}</a><div class="paket-meta-v96">${metodeBadgeV95(k)}</div></td>
      <td><span class="paket-status-v96 ${String(getPencairanStatus(k.id_kegiatan) || '').toUpperCase() === 'SELESAI' ? 'ok' : ''}">${esc(paketStatusV95(k))}</span></td>
      <td>${esc(paketTanggalV95(k))}</td>
      <td>${esc(bidangName(k.id_bidang))}</td>
      <td><button class="btn-soft paket-buka-v95" onclick="bukaPaketV95('${esc(k.id_kegiatan)}')" type="button">${esc(opts.aksiLabel || 'Buka Paket')}</button></td>
    </tr>`;
  }).join('');
  const buatBtn = (!canManage() && !isReviewer()) ? `<button onclick="buatPaketV95()" type="button" class="paket-buat-v95">+ Buat Paket</button>` : '';
  return `<section class="panel fade-up premium-panel">
    <div class="panel-title-row"><div><h3>${esc(opts.judul)}</h3><p class="panel-sub">${opts.sub}</p></div>
    <div class="action-group">${buatBtn}<button class="btn-refresh" onclick="refreshData()" type="button">Refresh Data</button></div></div>
    ${opts.info || ''}
    <div class="paket-toolbar-v95"><span>Tampilan <b id="paketCountV96">${list.length}</b> paket</span>
    <input type="text" placeholder="Cari nama paket / bidang / status..." value="${esc(paketSearchV95)}" oninput="filterPaketRowsV96(this)"></div>
    <div class="table-wrap"><table class="paket-table-v95"><thead><tr><th>Nama Paket</th><th>Status</th><th>Tanggal Buat</th><th>Bidang / Satuan Kerja</th><th>Aksi</th></tr></thead>
    <tbody id="paketTbodyV96">${rows || `<tr><td colspan="5" class="empty">Belum ada paket. Paket muncul otomatis dari Perencanaan${opts.butuhSetuju ? ' yang sudah DISETUJUI' : ''}. Klik "+ Buat Paket" untuk membuat perencanaan baru.</td></tr>`}</tbody></table></div>
  </section>`;
};

/* ---------- (1) Tabel dokumen dengan upload per-baris ---------- */
let pendingUploadsV96 = {};
function dokumenTableV95(k, jenisList, ctx){
  ctx = ctx || 'PGD'; // PGD = dokumen pengadaan, NON = dokumen non pengadaan
  const isNon = ctx === 'NON';
  const docs = isNon
    ? (dashboard?.dokumenNonPengadaan || []).filter(d => String(d.id_kegiatan) === String(k.id_kegiatan))
    : (dashboard?.dokumen || []).filter(d => String(d.id_kegiatan) === String(k.id_kegiatan));
  const final = String(k.status_pencairan || '').toUpperCase() === 'SELESAI';
  const bolehUpload = !canManage() && !isReviewer() && String(k.id_bidang) === String(currentUser?.id_bidang || '') && String(k.status_perencanaan || '').toUpperCase() === 'DISETUJUI';
  let adaSlotUpload = false;
  const rows = jenisList.map(j => {
    const d = docs.find(x => dokKeyV94(x.jenis_dokumen) === dokKeyV94(j));
    const valid = d && (isNon ? String(d.status_verifikasi || '').toUpperCase() === 'VALID DOKUMEN' : isDokValidV94(d));
    let aksi = '-';
    if(d && isPBJVerifierV65() && !valid && !['PERBAIKAN DOKUMEN','PERBAIKAN'].includes(String(d.status_verifikasi || '').toUpperCase())){
      const idd = isNon ? d.id_dokumen_non : d.id_dokumen;
      aksi = `<button class="btn-soft" onclick="verifDokV96('${esc(idd)}','VALID','${ctx}')" type="button">Valid</button> <button class="btn-red" onclick="verifDokV96('${esc(idd)}','PERBAIKAN','${ctx}')" type="button">Perbaikan</button>`;
    }
    let uploadCell = '';
    if(bolehUpload && !valid){
      adaSlotUpload = true;
      uploadCell = `<input type="file" class="dok-file-v96" data-jenis="${esc(j)}" data-ctx="${ctx}" onchange="this.closest('tr').classList.toggle('siap-upload-v96', this.files.length>0); tampilkanTombolUploadV96()">`;
    }
    return `<tr><td>${esc(j)}</td>
      <td>${d ? `<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file || 'Buka File')}</a>` : '<span class="muted">Belum diupload</span>'}</td>
      <td>${d ? badge(d.status_verifikasi || 'MENUNGGU') : '-'}</td>
      ${uploadCell !== '' || adaSlotUpload || bolehUpload ? `<td>${uploadCell || '<span class="muted kecil-v96">' + (valid ? 'Sudah valid' : '-') + '</span>'}</td>` : ''}
      <td>${d ? esc(d.catatan_verifikator || d.catatan_Verifikator || d.catatan_admin || '-') : '-'}</td><td>${aksi}</td></tr>`;
  }).join('');
  const headUpload = bolehUpload ? '<th>Upload File</th>' : '';
  const tombol = bolehUpload ? `<div class="dok-upload-bar-v96 hidden" id="dokUploadBarV96"><span id="dokUploadInfoV96"></span><button onclick="uploadSemuaDokV96('${esc(k.id_kegiatan)}')" type="button">Upload File Terpilih</button></div>` : '';
  return `${tombol}<div class="table-wrap"><table class="dok-table-v96"><thead><tr><th>Jenis Dokumen</th><th>File</th><th>Status</th>${headUpload}<th>Catatan</th><th>Verifikasi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function tampilkanTombolUploadV96(){
  const files = document.querySelectorAll('.dok-file-v96');
  let n = 0;
  files.forEach(f => { if(f.files?.length) n++; });
  const bar = document.getElementById('dokUploadBarV96');
  if(bar){
    bar.classList.toggle('hidden', n === 0);
    const info = document.getElementById('dokUploadInfoV96');
    if(info) info.textContent = n + ' file dipilih, siap diupload sekaligus';
  }
}
async function uploadSemuaDokV96(idKegiatan){
  const inputs = Array.from(document.querySelectorAll('.dok-file-v96')).filter(f => f.files?.length);
  if(!inputs.length){ alert('Pilih file pada baris dokumen dulu.'); return; }
  showLoading('Upload 1/' + inputs.length + ' dokumen...');
  let ok = 0, gagal = [];
  for(let i = 0; i < inputs.length; i++){
    const inp = inputs[i], file = inp.files[0], jenis = inp.dataset.jenis, ctx = inp.dataset.ctx;
    document.getElementById('loadingText').innerText = `Upload ${i + 1}/${inputs.length}: ${jenis}...`;
    try{
      const base64 = await fileToBase64(file);
      const action = ctx === 'NON' ? 'uploadDokumenNonPengadaan' : 'uploadDokumen';
      const r = await apiPost({action, user:currentUser, id_kegiatan:idKegiatan, jenis_dokumen:jenis, file_name:file.name, mime_type:file.type, file_base64:base64});
      if(r.success) ok++; else gagal.push(jenis + ': ' + (r.message || 'gagal'));
    }catch(e){ gagal.push(jenis + ': ' + e.message); }
  }
  hideLoading();
  alert(`${ok} dokumen berhasil diupload.` + (gagal.length ? `\nGagal:\n- ${gagal.join('\n- ')}` : ''));
  await loadDashboard(false); renderAll();
}
async function verifDokV96(idDok, status, ctx){
  let catatan = '';
  if(status === 'PERBAIKAN'){
    catatan = prompt('Alasan perbaikan (wajib):') || '';
    if(!catatan.trim()){ alert('Alasan perbaikan wajib diisi.'); return; }
  }
  showLoading('Memperbarui status dokumen...');
  try{
    const r = ctx === 'NON'
      ? await apiPost({action:'verifyDokumenNonPengadaan', user:currentUser, id_dokumen_non:idDok, status_verifikasi:status === 'VALID' ? 'VALID DOKUMEN' : 'PERBAIKAN DOKUMEN', catatan_verifikator:catatan})
      : await apiPost({action:'verifyDokumen', user:currentUser, id_dokumen:idDok, status_verifikasi:status, catatan_admin:catatan});
    alert(r.message || (r.success ? 'Status diperbarui' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}

/* ---------- (1)(2) Detail Pencatatan Pengadaan versi baru ---------- */
function renderDetailPencatatanV95(k){
  const final = String(k.status_pencairan || '').toUpperCase() === 'SELESAI';
  const approved = String(k.status_perencanaan || '').toUpperCase() === 'DISETUJUI';
  const isBidangSendiri = !canManage() && !isReviewer() && String(k.id_bidang) === String(currentUser?.id_bidang || '');
  const jenisList = dokumenKetentuanByMetode('BELANJA LANGSUNG');
  const real = (dashboard?.realisasi || []).find(r => String(r.id_kegiatan) === String(k.id_kegiatan));
  const pagu = toNumber(k.jumlah);
  let catatHtml = '';
  if(!approved){
    catatHtml = `<p class="empty">Perencanaan paket ini belum DISETUJUI Verifikator, pencatatan belum bisa dilakukan.</p>`;
  } else if(final){
    catatHtml = `<div class="selesai-banner-v96">&#10003; Paket sudah SELESAI dicatat.${real ? ` Nilai realisasi <b>${rupiah(real.nilai_realisasi)}</b>${real.keterangan ? ' &middot; ' + esc(real.keterangan) : ''}` : ''}</div>`;
  } else if(isBidangSendiri){
    catatHtml = `${penyediaDatalistV94()}<div class="form-grid">
      <div class="field"><label>Nama Penyedia / Toko</label><input list="penyediaListV94" id="blPenyediaV94" placeholder="Ketik nama (otomatis masuk master penyedia)"></div>
      <div class="field"><label>Nilai Realisasi (Rp) *</label><input inputmode="numeric" id="blNilaiV94" data-max="${pagu}" oninput="onRupiahInputV96(this)" placeholder="Maks. ${rupiah(pagu)}"></div>
      <div class="field"><label>Nomor Bukti (Kuitansi/Nota/Invoice)</label><input type="text" id="blBuktiV94"></div>
      <div class="field"><label>Keterangan</label><input type="text" id="blKetV94"></div></div>
      <button onclick="submitCatatBLDetailV95('${esc(k.id_kegiatan)}')" type="button">Catat &amp; Tandai Selesai</button>
      <button class="btn-soft" onclick="downloadTemplateV96('${esc(k.id_kegiatan)}','KUITANSI')" type="button">Download Template Kuitansi (SK)</button>`;
  } else if(isPBJVerifierV65()){
    catatHtml = `<p class="small">Pencatatan dilakukan User Bidang. Sebagai Verifikator, Anda dapat menandai paket SELESAI tanpa syarat kelengkapan dokumen.</p>
      <button onclick="selesaikanBLV95('${esc(k.id_kegiatan)}')" type="button">Tandai Paket SELESAI</button>`;
  } else {
    catatHtml = `<p class="small">Menunggu pencatatan oleh User Bidang.</p>`;
  }
  document.getElementById('contentArea').innerHTML = `${backBarV95(k, k.metode_pemilihan || 'Belanja Langsung')}
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Pencatatan Realisasi</h3>
    <p class="panel-sub">Isi nama penyedia dan nilai realisasi belanja (otomatis berformat titik, maksimal sebesar nilai perencanaan). Setelah dicatat, paket langsung SELESAI dan masuk realisasi anggaran.</p></div></div>${catatHtml}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Dokumen Paket</h3>
    <p class="panel-sub">Kelola dokumen pendukung paket pada bagian berikut.</p></div></div>
    ${dokumenTableV95(k, jenisList, 'PGD')}</section>`;
}
async function submitCatatBLDetailV95(id){
  const nilai = valRupiahV96('blNilaiV94');
  if(nilai <= 0){ alert('Isi nilai realisasi.'); return; }
  if(!confirm('Catat realisasi ' + rupiah(nilai) + ' dan tandai paket SELESAI?')) return;
  showLoading('Mencatat Belanja Langsung...');
  try{
    const r = await apiPost({action:'catatBelanjaLangsungV118', user:currentUser, id_kegiatan:id,
      nilai_realisasi:nilai, nama_penyedia:document.getElementById('blPenyediaV94')?.value || '',
      nomor_bukti:document.getElementById('blBuktiV94')?.value || '', keterangan:document.getElementById('blKetV94')?.value || ''});
    alert(r.message || (r.success ? 'Tercatat' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}

/* ---------- (3) Template dokumen SK: download -> ttd -> upload ---------- */
async function downloadTemplateV96(idKegiatan, jenis){
  showLoading('Membuat template dokumen sesuai format SK...');
  try{
    const k = (dashboard?.perencanaan || []).find(x => String(x.id_kegiatan) === String(idKegiatan)) || {};
    const nilaiEl = document.getElementById('plNilaiRealisasiV96');
    const penyediaEl = document.getElementById('plPenyediaUtamaV96');
    const r = await apiPost({action:'generateDokPengadaanV96', user:currentUser, id_kegiatan:idKegiatan, jenis,
      nama_penyedia:penyediaEl?.value || '', nilai:nilaiEl ? valRupiahV96('plNilaiRealisasiV96') : 0});
    if(r.success && r.url){ alert(r.message); window.open(r.url, '_blank'); }
    else alert(r.message || 'Gagal membuat template');
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}

/* ---------- (3) Detail Pengadaan Langsung: penyedia + nilai realisasi + template ---------- */
function renderDetailPengadaanLangsungV95(k){
  const state = tahapanStateFeV94(k);
  const final = String(k.status_pencairan || '').toUpperCase() === 'SELESAI';
  const approved = String(k.status_perencanaan || '').toUpperCase() === 'DISETUJUI';
  const info = kontrakInfoFeV94(k);
  const pagu = toNumber(k.jumlah);
  const tender = metodeKegiatanV94(k) === 'TENDER MANUAL';
  let nextIdx = state.findIndex(t => t.status !== 'SELESAI');
  const tahapHtml = approved ? state.map((t, i) => tahapDetailHtmlV94(k, t, i === nextIdx && !final)).join('') : '<p class="empty">Perencanaan paket ini belum DISETUJUI, tahapan belum dapat diproses.</p>';

  let penyediaCard = '';
  if(approved){
    const bisaEdit = isPBJVerifierV65() && !final;
    penyediaCard = `<section class="panel fade-up premium-panel pl-penyedia-card-v96"><div class="panel-head"><div><h3>Penyedia &amp; Nilai Realisasi</h3>
      <p class="panel-sub">Nilai realisasi = hasil negosiasi/kontrak (maksimal sebesar pagu ${rupiah(pagu)}). Data ini dipakai untuk template SPK/BAST dan menjadi nilai realisasi saat finalisasi.</p></div></div>
      ${penyediaDatalistV94()}
      <div class="form-grid">
        <div class="field"><label>Nama Penyedia Terpilih</label><input list="penyediaListV94" id="plPenyediaUtamaV96" value="${esc(info.penyedia)}" ${bisaEdit ? '' : 'readonly'} placeholder="Ketik nama penyedia (otomatis masuk master)"></div>
        <div class="field"><label>Nilai HPS (Rp)</label><input inputmode="numeric" id="plNilaiHpsV101" oninput="onRupiahInputV96(this)" value="${Number((dashboard?.prosesPengadaanV96||[]).find(x=>String(x.id_kegiatan)===String(k.id_kegiatan))?.nilai_hps||k.jumlah||0).toLocaleString('id-ID')}" ${bisaEdit ? '' : 'readonly'}></div>
        <div class="field"><label>Nilai Realisasi / Kontrak (Rp)</label><input inputmode="numeric" id="plNilaiRealisasiV96" data-max="${pagu}" oninput="onRupiahInputV96(this)" value="${info.nilai ? Number(info.nilai).toLocaleString('id-ID') : ''}" ${bisaEdit ? '' : 'readonly'} placeholder="Maks. ${rupiah(pagu)}"></div>
      </div>
      ${bisaEdit ? `<button onclick="simpanPenyediaNilaiPLV96('${esc(k.id_kegiatan)}')" type="button">Simpan Penyedia &amp; Nilai</button>` : ''}
      <div class="tpl-bar-v96"><b>Template dokumen siap isi (format Lampiran II SK) - download, tanda tangani, lalu upload di tahap terkait:</b><div class="tpl-btns-v96">
        <button class="btn-soft" onclick="downloadTemplateV96('${esc(k.id_kegiatan)}','${tender ? 'SURAT_PERJANJIAN' : 'SPK'}')" type="button">${tender ? 'Surat Perjanjian' : 'SPK'}</button>
        <button class="btn-soft" onclick="downloadTemplateV96('${esc(k.id_kegiatan)}','BA_PEMERIKSAAN')" type="button">BA Pemeriksaan</button>
        <button class="btn-soft" onclick="downloadTemplateV96('${esc(k.id_kegiatan)}','BAST')" type="button">BAST</button>
        <button class="btn-soft" onclick="downloadTemplateV96('${esc(k.id_kegiatan)}','KUITANSI')" type="button">Kuitansi</button>
      </div></div></section>`;
  }
  let finalisasiHtml = '';
  if(isPBJVerifierV65() && approved && !final){
    const semuaSelesai = state.every(t => t.status === 'SELESAI');
    finalisasiHtml = `<section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Finalisasi Pencairan</h3>
      <p class="panel-sub">Seluruh tahapan dan dokumen wajib tuntas. Nilai realisasi memakai nilai kontrak/negosiasi di atas.</p></div></div>
      <button onclick="selesaikanBLV95('${esc(k.id_kegiatan)}')" type="button" ${semuaSelesai ? '' : 'disabled title="Masih ada tahap yang belum SELESAI"'}>Selesaikan Paket (Pencairan)</button></section>`;
  }
  document.getElementById('contentArea').innerHTML = `${backBarV95(k, (k.metode_pemilihan || 'Pengadaan Langsung') + (info.nilai ? ` \u00b7 Realisasi ${rupiah(info.nilai)}` : '') + (info.penyedia ? ` \u00b7 ${info.penyedia}` : ''))}
    ${penyediaCard}
    <section class="panel fade-up premium-panel pl-card-v94">${stepperHtmlV94(k, state)}${tahapHtml}</section>${finalisasiHtml}`;
}
async function simpanPenyediaNilaiPLV96(id){
  const nama = document.getElementById('plPenyediaUtamaV96')?.value || '';
  const nilai = valRupiahV96('plNilaiRealisasiV96');
  if(!nama && nilai <= 0){ alert('Isi nama penyedia dan/atau nilai realisasi dulu.'); return; }
  showLoading('Menyimpan penyedia & nilai...');
  try{
    const r = await apiPost({action:'updateTahapanV94', user:currentUser, id_kegiatan:id, tahap:3, mode:'SIMPAN', data:{nama_penyedia:nama, nilai_negosiasi:nilai}});
    alert(r.message || (r.success ? 'Tersimpan' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}

/* ---------- (4) Detail Non Pengadaan versi baru ---------- */
function renderDetailNonPengadaanV95(k){
  const n = (typeof latestNonV79 === 'function') ? latestNonV79(k.id_kegiatan) : null;
  const final = String(k.status_pencairan || '').toUpperCase() === 'SELESAI';
  const approved = String(k.status_perencanaan || '').toUpperCase() === 'DISETUJUI';
  const isBidangSendiri = !canManage() && !isReviewer() && String(k.id_bidang) === String(currentUser?.id_bidang || '');
  const pagu = toNumber(k.jumlah);
  const real = (dashboard?.realisasi || []).find(r => String(r.id_kegiatan) === String(k.id_kegiatan));
  const isHonor = String(k.jenis_non_pengadaan || 'Honorarium').toUpperCase().includes('HONOR');
  const ringkas = `<div class="non-stat-grid-v96">
    <div class="non-stat-v96"><small>Jenis</small><b>${esc(k.jenis_non_pengadaan || 'Honorarium')}</b></div>
    <div class="non-stat-v96"><small>Nilai Perencanaan</small><b>${rupiah(pagu)}</b></div>
    <div class="non-stat-v96"><small>Total Bruto</small><b>${rupiah(n?.total_bruto || 0)}</b></div>
    <div class="non-stat-v96"><small>Total Pajak</small><b>${rupiah(n?.total_pajak || 0)}</b></div>
    <div class="non-stat-v96"><small>Total Netto</small><b>${rupiah(n?.total_netto || 0)}</b></div>
    <div class="non-stat-v96"><small>Dokumen PDF</small><b>${n?.url_pdf ? `<a href="${esc(n.url_pdf)}" target="_blank">Buka PDF v${esc(String(n.versi_pdf || 1))}</a>` : 'Belum dibuat'}</b></div>
  </div>`;
  let honorBtn = '';
  if(isHonor && isBidangSendiri && approved && !final){
    honorBtn = `<button onclick="openHonorModalV79('${esc(k.id_kegiatan)}')" type="button">${n?.url_pdf ? 'Buat Ulang Dokumen Honor' : '+ Buat Dokumen Honorarium (hitung pajak otomatis)'}</button>`;
  }
  let catatHtml = '';
  if(!approved){
    catatHtml = '<p class="empty">Perencanaan belum DISETUJUI Verifikator.</p>';
  } else if(final){
    catatHtml = `<div class="selesai-banner-v96">&#10003; Paket sudah SELESAI dicatat.${real ? ` Nilai realisasi <b>${rupiah(real.nilai_realisasi)}</b>${real.keterangan ? ' &middot; ' + esc(real.keterangan) : ''}` : ''}</div>`;
  } else if(isBidangSendiri){
    const saran = toNumber(n?.total_bruto) || pagu;
    catatHtml = `<div class="form-grid">
      <div class="field"><label>Pihak / Penerima / Penyedia</label><input type="text" id="npPihakV96" placeholder="Contoh: Para penerima honor sesuai daftar / Nama pihak"></div>
      <div class="field"><label>Nilai Realisasi (Rp) *</label><input inputmode="numeric" id="npNilaiV96" data-max="${pagu}" oninput="onRupiahInputV96(this)" value="${saran ? Number(Math.min(saran, pagu)).toLocaleString('id-ID') : ''}" placeholder="Maks. ${rupiah(pagu)}"></div>
      <div class="field"><label>Nomor Bukti</label><input type="text" id="npBuktiV96"></div>
      <div class="field"><label>Keterangan</label><input type="text" id="npKetV96"></div></div>
      <button onclick="submitCatatNonV96('${esc(k.id_kegiatan)}')" type="button">Catat &amp; Tandai Selesai</button>
      <p class="small">Nilai terisi otomatis dari total bruto dokumen honor (bisa diubah). Maksimal sebesar nilai perencanaan.</p>`;
  } else {
    catatHtml = '<p class="small">Pencatatan dilakukan User Bidang pemilik kegiatan.</p>';
  }
  document.getElementById('contentArea').innerHTML = `${backBarV95(k, k.jenis_non_pengadaan || 'Non Pengadaan')}
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Ringkasan Paket Non Pengadaan</h3></div></div>${ringkas}${honorBtn}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Pencatatan Realisasi</h3>
    <p class="panel-sub">Isi pihak penerima dan nilai realisasi. Setelah dicatat, paket SELESAI dan masuk realisasi anggaran non pengadaan.</p></div></div>${catatHtml}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Dokumen Wajib (Tanda Terima &amp; Bukti Potong Pajak)</h3>
    <p class="panel-sub">Pilih file langsung pada baris dokumen lalu klik "Upload File Terpilih".</p></div></div>
    ${dokumenTableV95(k, ['Tanda Terima','Bukti Potong Pajak'], 'NON')}</section>
    <div id="honorModalV79" class="modal hidden"></div>`;
}
async function submitCatatNonV96(id){
  const nilai = valRupiahV96('npNilaiV96');
  if(nilai <= 0){ alert('Isi nilai realisasi.'); return; }
  if(!confirm('Catat realisasi ' + rupiah(nilai) + ' dan tandai paket SELESAI?')) return;
  showLoading('Mencatat realisasi Non Pengadaan...');
  try{
    const r = await apiPost({action:'catatNonPengadaanV96', user:currentUser, id_kegiatan:id,
      nilai_realisasi:nilai, nama_pihak:document.getElementById('npPihakV96')?.value || '',
      nomor_bukti:document.getElementById('npBuktiV96')?.value || '', keterangan:document.getElementById('npKetV96')?.value || ''});
    alert(r.message || (r.success ? 'Tercatat' : 'Gagal'));
    if(r.success){ await loadDashboard(false); renderAll(); }
  }catch(e){ alert('Gagal: ' + e.message); }
  finally{ hideLoading(); }
}

/* ---------- (5) Sumber Harga & Standar Biaya di form Perencanaan (ala SPSE) ---------- */
const SB_FLAT_V96 = [];
STANDAR_BIAYA_V95.forEach(g => {
  const huruf = g.grup.trim().charAt(0);
  g.items.forEach(it => SB_FLAT_V96.push({huruf, grup:g.grup.replace(/^[A-Z]\.\s*/,''), nama:it[0], satuan:it[1], nilai:it[2]}));
});
function grupKeNonV96(huruf){
  if('ABDEF'.includes(huruf)) return 'Honorarium';
  if('CLM'.includes(huruf)) return 'Uang Saku';
  if('KS'.includes(huruf)) return 'Perjalanan Dinas';
  if(huruf === 'N') return 'Hadiah/Penghargaan';
  return '';
}
let sbPickIdxV96 = -1;
function openSbPickerV96(){
  let m = document.getElementById('sbPickerV96');
  if(!m){
    m = document.createElement('div');
    m.id = 'sbPickerV96';
    m.className = 'sbv-overlay-v95 hidden';
    m.innerHTML = `<div class="sbv-box-v95"><div class="sbv-head-v95"><div><h3>Pilih Standar Biaya</h3>
      <p class="panel-sub">Cari nama biaya, kelompok, satuan, atau nilai. Klik untuk memakai - harga satuan dan satuan terisi otomatis; honorarium/uang saku otomatis masuk kategori Non Pengadaan.</p></div>
      <button class="btn-red" onclick="document.getElementById('sbPickerV96').classList.add('hidden')" type="button">Tutup</button></div>
      <input type="text" placeholder="Cari standar biaya..." oninput="renderSbPickerListV96(this.value)">
      <div class="sbv-body-v95" id="sbPickerListV96"></div></div>`;
    document.body.appendChild(m);
  }
  m.classList.remove('hidden');
  renderSbPickerListV96('');
}
function renderSbPickerListV96(q){
  q = String(q || '').toLowerCase();
  const el = document.getElementById('sbPickerListV96');
  if(!el) return;
  const html = SB_FLAT_V96.map((it, i) => {
    const key = (it.nama + ' ' + it.grup + ' ' + it.satuan + ' ' + it.nilai).toLowerCase();
    if(q && !key.includes(q)) return '';
    const nilaiTxt = typeof it.nilai === 'number' ? rupiah(it.nilai) : esc(String(it.nilai));
    return `<div class="sb-card-v96" onclick="pilihSbV96(${i})">
      <div class="sb-huruf-v96">${esc(it.huruf)}</div>
      <div class="sb-info-v96"><b>${esc(it.nama)}</b><small>${esc(it.grup)} &middot; ${esc(it.satuan)}</small></div>
      <div class="sb-nilai-v96"><b>${nilaiTxt}</b><small>BATAS TERTINGGI</small></div></div>`;
  }).join('');
  el.innerHTML = html || '<p class="empty">Tidak ada yang cocok.</p>';
}
function pilihSbV96(i){
  const it = SB_FLAT_V96[i];
  if(!it) return;
  sbPickIdxV96 = i;
  const label = document.getElementById('sbTerpilihV96');
  if(label) label.value = it.nama + ' (' + it.satuan + ')';
  const harga = document.getElementById('harga');
  if(harga && typeof it.nilai === 'number'){ harga.value = Number(it.nilai).toLocaleString('id-ID'); harga.dispatchEvent(new Event('input')); }
  const satuan = document.getElementById('satuan');
  if(satuan) satuan.value = it.satuan;
  const jenisNon = grupKeNonV96(it.huruf);
  const kategori = document.getElementById('kategoriPerencanaanV79');
  if(kategori){
    kategori.value = jenisNon ? 'NON PENGADAAN' : 'PENGADAAN';
    if(typeof toggleKategoriV79 === 'function') toggleKategoriV79();
    const jn = document.getElementById('jenisNonPengadaanV79');
    if(jn && jenisNon) jn.value = jenisNon;
  }
  document.getElementById('sbPickerV96')?.classList.add('hidden');
  document.getElementById('sbWrapV96')?.classList.remove('hidden');
}
function toggleSumberHargaV96(){
  const pakaiSb = document.getElementById('sumberHargaV96')?.value === 'SB';
  document.getElementById('sbFieldV96')?.classList.toggle('hidden', !pakaiSb);
  if(!pakaiSb){ sbPickIdxV96 = -1; const l = document.getElementById('sbTerpilihV96'); if(l) l.value = ''; }
}
const __renderPerencanaanV96Base = renderPerencanaan;
renderPerencanaan = function(){
  __renderPerencanaanV96Base();
  if(canSeeAll()) return;
  const grid = document.getElementById('namaKegiatan')?.closest('.form-grid');
  if(!grid || document.getElementById('sumberHargaV96')) return;
  const blok = document.createElement('div');
  blok.className = 'sb-blok-v96';
  blok.id = 'sbWrapV96';
  blok.innerHTML = `<b class="sb-blok-title-v96">Sumber dan Referensi Biaya</b><div class="form-grid">
    <div class="field"><label>Sumber Harga</label><select id="sumberHargaV96" onchange="toggleSumberHargaV96()">
      <option value="SB">Gunakan Standar Biaya</option>
      <option value="PASAR">Harga Pasar / Input Manual</option></select></div>
    <div class="field" id="sbFieldV96"><label>Standar Biaya</label><div class="sb-pick-row-v96">
      <input type="text" id="sbTerpilihV96" readonly placeholder="Cari & pilih standar biaya...">
      <button class="sb-pick-btn-v96" onclick="openSbPickerV96()" type="button">Cari &amp; Pilih</button></div></div>
    <div class="field"><label>Jenis Pengadaan</label><select id="jenisPengadaanV96"><option>Barang</option><option>Jasa Konstruksi</option><option>Jasa Konsultansi</option><option>Jasa Lainnya</option></select></div>
    <div class="field"><label>Cara Pelaksanaan</label><select id="caraPelaksanaanV96"><option>Penyedia</option><option>Swakelola</option></select></div>
  </div>`;
  grid.parentElement.insertBefore(blok, grid);
};
/* Sisipkan meta sumber biaya ke keterangan saat simpan (tanpa mengubah backend) */
const __savePerencanaanV96Base = savePerencanaan;
savePerencanaan = async function(){
  const ketEl = document.getElementById('keterangan');
  const asli = ketEl ? ketEl.value : '';
  if(ketEl && document.getElementById('sumberHargaV96')){
    const sb = sbPickIdxV96 >= 0 ? SB_FLAT_V96[sbPickIdxV96] : null;
    const meta = [
      document.getElementById('jenisPengadaanV96')?.value || '',
      document.getElementById('caraPelaksanaanV96')?.value || '',
      document.getElementById('sumberHargaV96')?.value === 'SB' ? ('Standar Biaya: ' + (sb ? sb.nama : '-')) : 'Harga Pasar / Input Manual'
    ].filter(Boolean).join(' | ');
    ketEl.value = (asli ? asli + ' | ' : '') + meta;
  }
  try{ await __savePerencanaanV96Base(); }
  finally{ if(ketEl) ketEl.value = asli; sbPickIdxV96 = -1; const l = document.getElementById('sbTerpilihV96'); if(l) l.value = ''; }
};

/* =========================================================
   SIMPROV v101 - Revisi Honor, Template SK, HPS, Non Pengadaan
   ========================================================= */
(function(){
  const oldToggle = window.toggleKategoriV79;
  window.toggleKategoriV79 = function(){
    if(typeof oldToggle === 'function') oldToggle();
    const non = document.getElementById('kategoriPerencanaanV79')?.value === 'NON PENGADAAN';
    const jp = document.getElementById('jenisPengadaanV96');
    if(jp){
      if(non){
        jp.innerHTML = '<option value="NON PENGADAAN">Non Pengadaan</option>';
        jp.value = 'NON PENGADAAN';
        jp.disabled = true;
      }else{
        jp.disabled = false;
        if(![...jp.options].some(o=>o.value==='Barang')) jp.innerHTML='<option>Barang</option><option>Jasa Konstruksi</option><option>Jasa Konsultansi</option><option>Jasa Lainnya</option>';
      }
    }
  };

  const oldOpen = window.openHonorModalV79;
  window.openHonorModalV79 = function(id){
    const res = oldOpen(id);
    setTimeout(()=>{
      const modal=document.getElementById('honorModalV79');
      if(!modal) return;
      const note=modal.querySelector('.honor-tax-note-v87');
      if(note) note.insertAdjacentHTML('beforeend','<br><b>Urutan pengesahan dokumen:</b> Pelaksana Kegiatan Pengadaan, Verifikator, dan Penerima Honor.');
    },0);
    return res;
  };

  const oldRenderPL = window.renderDetailPengadaanLangsungV95;
  window.renderDetailPengadaanLangsungV95 = function(k){
    oldRenderPL(k);
    const bar=document.querySelector('.tpl-bar-v96');
    if(!bar) return;
    bar.innerHTML=`<b>Data template dokumen</b>
      <div class="template-meta-grid-v101">
        <div class="field"><label>Nomor Dokumen</label><input id="tplNomorV101" placeholder="Contoh: 027/SPK/PORPROV/VII/2026"></div>
        <div class="field"><label>Pejabat yang Menandatangani</label><input id="tplPejabatV101" placeholder="Nama pejabat penandatangan"></div>
        <div class="field"><label>Nama Penyedia</label><input id="tplPenyediaV101" value="${esc(document.getElementById('plPenyediaUtamaV96')?.value||'')}" placeholder="Nama penyedia"></div>
      </div>
      <div class="tpl-btns-v96">
        <button class="btn-soft" onclick="downloadTemplateV101('${esc(k.id_kegiatan)}','SPESIFIKASI DAN HPS')" type="button">Spesifikasi &amp; HPS</button>
        <button class="btn-soft" onclick="downloadTemplateV101('${esc(k.id_kegiatan)}','SPK')" type="button">SPK</button>
        <button class="btn-soft" onclick="downloadTemplateV101('${esc(k.id_kegiatan)}','BA PEMERIKSAAN')" type="button">BA Pemeriksaan</button>
        <button class="btn-soft" onclick="downloadTemplateV101('${esc(k.id_kegiatan)}','BA SERAH TERIMA PENYEDIA')" type="button">BAST Penyedia</button>
        <button class="btn-soft" onclick="downloadTemplateV101('${esc(k.id_kegiatan)}','BA SERAH TERIMA KETUA UMUM')" type="button">BAST Ketua Umum</button>
      </div>`;
  };
})();

async function downloadTemplateV101(idKegiatan, jenis){
  const nomor=document.getElementById('tplNomorV101')?.value.trim()||'';
  const pejabat=document.getElementById('tplPejabatV101')?.value.trim()||'';
  const penyedia=document.getElementById('tplPenyediaV101')?.value.trim()||'';
  if(!nomor){ alert('Nomor dokumen wajib diisi.'); return; }
  if(!pejabat){ alert('Nama pejabat yang menandatangani wajib diisi.'); return; }
  if(!penyedia){ alert('Nama penyedia wajib diisi.'); return; }
  showLoading('Membuat template dokumen sesuai SK...');
  try{
    const r=await apiPost({action:'generateProcurementTemplateV101',user:currentUser,data:{id_kegiatan:idKegiatan,jenis_template:jenis,nomor_dokumen:nomor,pejabat_penandatangan:pejabat,nama_penyedia:penyedia,nilai_hps:valRupiahV96('plNilaiHpsV101')}});
    alert(r.message||'');
    if(r.success&&r.url_file) window.open(r.url_file,'_blank');
  }catch(e){alert('Gagal: '+e.message);}finally{hideLoading();}
}

/* =========================================================
   SIMPROV v102 - UI Struktur PPK dan Keterangan Non Pengadaan
   ========================================================= */
function ppkStructurePanelV102(){
  const i=dashboard?.systemIdentity||{};
  return `<section class="panel fade-up premium-panel ppk-structure-v102">
    <div class="panel-title-row"><div><h3>Pejabat Penanda Tangan Komitmen</h3><p class="panel-sub">Nama pejabat diisi oleh Admin. Sistem otomatis menerapkan pejabat sesuai kelompok bidang.</p></div></div>
    <div class="ppk-grid-v102">
      <div class="field"><label>Ketua Harian</label><input id="ppkKetuaHarian" value="${esc(i.ketua_harian||'')}" placeholder="Nama Ketua Harian"><small>Membidangi Kesekretariatan.</small></div>
      <div class="field"><label>Wakil Ketua Harian — Verifikator Pencairan</label><input id="ppkWakilKetuaHarian" value="${esc(i.wakil_ketua_harian||'')}" placeholder="Nama Wakil Ketua Harian"><small>Menandatangani verifikasi pencairan bidang Kesekretariatan.</small></div>
      <div class="field"><label>Ketua I</label><input id="ppkKetuaI" value="${esc(i.ketua_i||'')}" placeholder="Nama Ketua I"><small>Membidangi Penyiaran dan Pelayanan Media; Akomodasi, Konsumsi dan Pengarahan Massa; Kesehatan.</small></div>
      <div class="field"><label>Wakil Ketua I — Verifikator Pencairan</label><input id="ppkWakilKetuaI" value="${esc(i.wakil_ketua_i||'')}" placeholder="Nama Wakil Ketua I"><small>Menandatangani verifikasi pencairan bidang Ketua I.</small></div>
      <div class="field"><label>Ketua II</label><input id="ppkKetuaII" value="${esc(i.ketua_ii||'')}" placeholder="Nama Ketua II"><small>Membidangi Organisasi dan Hukum; Keamanan; Transportasi.</small></div>
      <div class="field"><label>Wakil Ketua II — Verifikator Pencairan</label><input id="ppkWakilKetuaII" value="${esc(i.wakil_ketua_ii||'')}" placeholder="Nama Wakil Ketua II"><small>Menandatangani verifikasi pencairan bidang Ketua II.</small></div>
      <div class="field"><label>Ketua III</label><input id="ppkKetuaIII" value="${esc(i.ketua_iii||'')}" placeholder="Nama Ketua III"><small>Membidangi Pertandingan dan Perwasitan; Sarana dan Prasarana Pertandingan; Teknologi Informasi dan Komunikasi.</small></div>
      <div class="field"><label>Wakil Ketua III — Verifikator Pencairan</label><input id="ppkWakilKetuaIII" value="${esc(i.wakil_ketua_iii||'')}" placeholder="Nama Wakil Ketua III"><small>Menandatangani verifikasi pencairan bidang Ketua III.</small></div>
      <div class="field"><label>Sekretaris Umum</label><input id="ppkSekum" value="${esc(i.sekretaris_umum||'')}" placeholder="Nama Sekretaris Umum"><small>Membidangi Kerjasama dan Usaha; Pengadaan Barang dan Jasa.</small></div>
      <div class="field"><label>Wakil Sekretaris — Verifikator Pencairan</label><input id="ppkWakilSekretaris" value="${esc(i.wakil_sekretaris||'')}" placeholder="Nama Wakil Sekretaris"><small>Menandatangani verifikasi pencairan bidang Sekretaris Umum.</small></div>
    </div>
    <div class="actions"><button id="btnSavePpkStructureV102" type="button" onclick="savePpkStructureV102()">Simpan Struktur Pejabat</button></div>
  </section>`;
}
async function savePpkStructureV102(){
  const btn=document.getElementById('btnSavePpkStructureV102');
  if(btn?.dataset.busy==='1') return;
  if(btn){btn.dataset.busy='1';btn.disabled=true;btn.textContent='Menyimpan...';}
  showLoading('Menyimpan struktur pejabat...');
  try{
    const res=await apiPost({action:'savePpkStructureV102',user:currentUser,data:{
      ketua_harian:document.getElementById('ppkKetuaHarian')?.value||'',
      ketua_i:document.getElementById('ppkKetuaI')?.value||'',
      ketua_ii:document.getElementById('ppkKetuaII')?.value||'',
      ketua_iii:document.getElementById('ppkKetuaIII')?.value||'',
      sekretaris_umum:document.getElementById('ppkSekum')?.value||'',
      wakil_ketua_harian:document.getElementById('ppkWakilKetuaHarian')?.value||'',
      wakil_ketua_i:document.getElementById('ppkWakilKetuaI')?.value||'',
      wakil_ketua_ii:document.getElementById('ppkWakilKetuaII')?.value||'',
      wakil_ketua_iii:document.getElementById('ppkWakilKetuaIII')?.value||'',
      wakil_sekretaris:document.getElementById('ppkWakilSekretaris')?.value||''
    }});
    if(!res.success) throw new Error(res.message||'Gagal menyimpan');
    await loadDashboard(false);
    renderAll();
    alert(res.message||'Struktur pejabat berhasil disimpan');
  }catch(e){ alert(e.message||String(e)); }
  finally{
    hideLoading();
    if(btn){btn.dataset.busy='0';btn.disabled=false;btn.textContent='Simpan Struktur Pejabat';}
  }
}
const renderStrukturV102Base_ = renderStruktur;
renderStruktur = function(){ renderStrukturV102Base_(); };

function syncNonPengadaanUiV102(){
  const non=document.getElementById('kategoriPerencanaanV79')?.value==='NON PENGADAAN';
  const box=document.getElementById('metodePreview');
  if(non && box){
    const jenis=document.getElementById('jenisNonPengadaanV79')?.value||'Honorarium';
    box.innerHTML=`<div class="non-info-v102"><div><span>Kategori</span><strong>Non Pengadaan</strong></div><div><span>Jenis Non Pengadaan</span><strong>${esc(jenis)}</strong></div><p><b>Keterangan:</b> Non Pengadaan tidak menggunakan metode pemilihan. Setelah disetujui Verifikator, proses dilanjutkan pada menu <b>Pencatatan Non Pengadaan</b>.</p></div>`;
  }
}
const syncNonPengadaanUiV102Base_=syncNonPengadaanUiV81;
syncNonPengadaanUiV81=function(){ syncNonPengadaanUiV102Base_(); syncNonPengadaanUiV102(); };


/* =========================================================
   SIMPROV v103 - Revisi alur Honorarium & Non Pengadaan
   ========================================================= */

// Identitas Ketua Umum/Sekretaris/Verifikator tidak lagi ditampilkan sebagai form terpisah.
renderManajemenAkunV65 = function(){
  if(!isSuperAdminV65()){ document.getElementById('contentArea').innerHTML='<section class="panel"><h3>Akses ditolak</h3></section>'; return; }
  const users=verifierUsersV65();
  const rows=users.map(u=>{
    const ids=String(u.bidang_akses||'').split(',').map(x=>x.trim()).filter(Boolean);
    const names=ids.map(id=>bidangName(id)).join(', ') || '-';
    return `<div class="admin-budget-card account-card-v65"><div class="admin-budget-info"><b>${esc(u.nama||'-')}</b><small>${esc(u.id_user||'')} • ${esc(u.username||'')}</small></div><div><span class="badge badge-blue">VERIFIKATOR</span></div><div class="account-scope-text"><small>Bidang Penugasan</small><br>${esc(names)}</div><div>${badge(u.status||'AKTIF')}</div><div><button class="btn-mini" onclick="openEditVerifierV65('${esc(u.id_user)}')">Edit</button></div></div>`;
  }).join('');
  document.getElementById('contentArea').innerHTML=`${ppkStructurePanelV102()}<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Manajemen Akses dan Akun Verifikator</h3><p class="panel-sub">Verifikator menangani perencanaan, dokumen, dan finalisasi sesuai bidang penugasannya.</p></div><button class="btn-refresh" onclick="openCreateVerifierV65()">+ Buat Akun</button></div><div class="admin-budget-list">${rows||'<p class="muted">Belum ada akun verifikator.</p>'}</div></section><div id="verifierModalV65" class="modal hidden"></div>`;
};

function honorPlannedRateV103(){
  const id=document.getElementById('honorKegV79')?.value;
  const k=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));
  return toNumber(k?.harga_satuan)||0;
}
function honorRowV79(){
  const rate=honorPlannedRateV103();
  return `<div class="honor-row-v87 honor-row-v103">
    <div class="field"><label>Nama Penerima</label><input class="hnama" placeholder="Nama lengkap" autocomplete="off"></div>
    <div class="field"><label>NIK/NPWP (16 Digit)</label><input class="hnik" inputmode="numeric" maxlength="16" pattern="[0-9]{16}" placeholder="16 digit angka" oninput="this.value=this.value.replace(/\D/g,'').slice(0,16)"></div>
    <div class="field"><label>Jabatan / Peran</label><input class="hperan" placeholder="Contoh: Narasumber"></div>
    <div class="field"><label>Volume</label><input class="hvol" inputmode="numeric" value="1" placeholder="1"></div>
    <div class="field"><label>Satuan</label><input class="hsatuan" value="Orang/Kegiatan" placeholder="Satuan"></div>
    <div class="field"><label>Nilai Honor</label><input class="htarif" inputmode="numeric" value="${rate?Number(rate).toLocaleString('id-ID'):''}" data-value="${rate}" readonly title="Otomatis dari Harga Satuan Perencanaan"></div>
    <div class="field"><label>Kategori</label><select class="hkategori" onchange="syncHonorTaxV87(this)"><option value="NON ASN">Non-ASN / Bukan Pegawai</option><option value="ASN I-II">ASN Golongan I–II</option><option value="ASN III">ASN Golongan III</option><option value="ASN IV/PEJABAT">ASN Golongan IV / Pejabat Negara</option><option value="INPUT MANUAL">Input Pajak Manual</option></select></div>
    <div class="field"><label>Tarif PPh 21 (%)</label><input class="hpajak" value="2,5" readonly></div>
    <div class="honor-remove-wrap"><button class="btn-red" type="button" onclick="this.closest('.honor-row-v87').remove()">Hapus</button></div>
  </div>`;
}

openHonorModalV79=function(id){
  const k=(dashboard.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id)); if(!k) return;
  const existing=latestNonV79(id);
  const dokKegiatan=(dashboard?.dokumenNonPengadaan||[]).filter(d=>String(d.id_kegiatan)===String(id)&&d.url_file);
  const adaPerbaikan=dokKegiatan.some(d=>['PERBAIKAN DOKUMEN','PERBAIKAN','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN'].includes(String(d.status_verifikasi||'').toUpperCase()));
  if(dokKegiatan.length && !adaPerbaikan){ alert('Dokumen kegiatan sudah diupload dan sedang diproses. Dokumen honorarium dapat dibuat ulang apabila terdapat permintaan perbaikan.'); return; }
  let m=document.getElementById('honorModalV79'); if(!m){m=document.createElement('div');m.id='honorModalV79';document.body.appendChild(m);}
  m.className='modal-backdrop honor-backdrop-v87';
  m.innerHTML=`<div class="modal-card honor-modal-v87 fade-up"><div class="modal-head"><div><h3>Buat Dokumen Honorarium</h3><p>${esc(k.nama_kegiatan)} • ${esc(bidangName(k.id_bidang))}</p></div><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Tutup</button></div>
    <input type="hidden" id="honorKegV79" value="${esc(id)}"><div class="honor-modal-info-v81"><div><span>ID Kegiatan</span><b>${esc(k.id_kegiatan)}</b></div><div><span>Jenis</span><b>${esc(k.jenis_non_pengadaan||'Honorarium')}</b></div><div><span>Nilai Perencanaan</span><b>${rupiah(k.jumlah)}</b></div><div><span>Nilai Honor</span><b>${rupiah(k.harga_satuan||0)} per ${esc(k.satuan||'satuan')}</b></div></div>
    <div class="honor-tax-note-v87"><b>Catatan:</b> Nilai Honor diambil otomatis dari Harga Satuan Perencanaan dan tidak dapat diedit. PPh Pasal 21 dihitung sesuai kategori penerima.</div>
    <div class="honor-modal-body-v81"><div class="honor-head-row-v81"><span>Daftar Penerima Honorarium</span><button class="btn-soft" type="button" onclick="document.getElementById('honorRowsV79').insertAdjacentHTML('beforeend',honorRowV79())">+ Tambah Penerima</button></div><div id="honorRowsV79" class="honor-rows-v87">${honorRowV79()}</div></div>
    <div class="modal-actions honor-actions-v81"><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Batal</button><button id="btnGenerateHonorV81" class="btn-green" onclick="generateHonorV79()">Buat Dokumen Honorarium</button></div></div>`;
};

generateHonorV79=async function(){
  const btn=document.getElementById('btnGenerateHonorV81'); if(btn?.dataset.busy==='1') return;
  const id=document.getElementById('honorKegV79')?.value;
  const k=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));
  const plannedRate=toNumber(k?.harga_satuan)||0;
  const rows=[...document.querySelectorAll('.honor-row-v87')], penerima=[];
  for(let i=0;i<rows.length;i++){
    const r=rows[i], nik=(r.querySelector('.hnik')?.value||'').replace(/\D/g,''), nama=r.querySelector('.hnama')?.value.trim()||'', volume=toNumber(r.querySelector('.hvol')?.value);
    if(!nama){alert(`Nama penerima ke-${i+1} wajib diisi.`);return;} if(!/^\d{16}$/.test(nik)){alert(`NIK/NPWP penerima ke-${i+1} wajib tepat 16 digit angka.`);return;} if(!volume||!plannedRate){alert(`Volume wajib diisi dan Nilai Honor harus tersedia dari Perencanaan.`);return;}
    const kategori=r.querySelector('.hkategori')?.value||'NON ASN';
    penerima.push({nama_penerima:nama,nik_npwp:nik,jabatan_peran:r.querySelector('.hperan')?.value||'',volume,satuan:r.querySelector('.hsatuan')?.value||k?.satuan||'Orang/Kegiatan',tarif_honor:plannedRate,kategori_pajak:kategori,jenis_pajak:'PPh 21',tarif_pajak:toNumber(r.querySelector('.hpajak')?.value),nilai_pajak:0});
  }
  const total=penerima.reduce((s,p)=>s+(p.volume*p.tarif_honor),0); if(total>toNumber(k?.jumlah)){alert('Total bruto honor melebihi Nilai Perencanaan. Sesuaikan jumlah penerima atau volume.');return;}
  if(btn){btn.dataset.busy='1';btn.disabled=true;btn.textContent='Memproses...';}
  showLoading('Membuat dokumen honorarium dan menyimpan ke Google Drive...');
  try{const res=await apiPost({action:'generateHonorPdf',user:currentUser,data:{id_kegiatan:id,penerima}});alert(res.message||'Proses selesai');if(res.success){document.getElementById('honorModalV79')?.classList.add('hidden');await loadDashboard(false);renderAll();}}
  catch(e){alert(e.message||e);}finally{hideLoading();if(btn){btn.dataset.busy='0';btn.disabled=false;btn.textContent='Buat Dokumen Honorarium';}}
};

function nonPipelineV103(k,n,docs,real){
  const approved=String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const generated=!String(k.jenis_non_pengadaan||'').toUpperCase().includes('HONOR') || !!n?.url_pdf;
  const uploaded=docs.filter(d=>d.url_file).length;
  const valid=docs.filter(d=>String(d.status_verifikasi||'').toUpperCase()==='VALID DOKUMEN').length;
  const final=String(k.status_pencairan||'').toUpperCase()==='SELESAI'||!!real;
  const stages=[['Perencanaan Disetujui',approved],['Dokumen Honor Dibuat',generated],['Dokumen Wajib Diunggah',uploaded>=2],['Verifikasi Dokumen',valid>=2],['Pencatatan Realisasi',!!real],['Selesai',final]];
  return `<div class="pipeline-v103">${stages.map((s,i)=>`<div class="pipe-step-v103 ${s[1]?'done':''}"><span>${i+1}</span><b>${s[0]}</b></div>`).join('')}</div>`;
}

renderDetailNonPengadaanV95=function(k){
  const n=(typeof latestNonV79==='function')?latestNonV79(k.id_kegiatan):null;
  const docs=(dashboard?.dokumenNonPengadaan||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const real=(dashboard?.realisasi||[]).find(r=>String(r.id_kegiatan)===String(k.id_kegiatan));
  const final=String(k.status_pencairan||'').toUpperCase()==='SELESAI';
  const approved=String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const isBidangSendiri=!canManage()&&!isReviewer()&&String(k.id_bidang)===String(currentUser?.id_bidang||'');
  const isHonor=String(k.jenis_non_pengadaan||'Honorarium').toUpperCase().includes('HONOR');
  const uploadedCount=docs.filter(d=>d.url_file).length, validCount=docs.filter(d=>String(d.status_verifikasi||'').toUpperCase()==='VALID DOKUMEN').length;
  const ringkas=`<div class="non-stat-grid-v96"><div class="non-stat-v96"><small>Jenis</small><b>${esc(k.jenis_non_pengadaan||'Non Pengadaan')}</b></div><div class="non-stat-v96"><small>Nilai Perencanaan</small><b>${rupiah(k.jumlah)}</b></div><div class="non-stat-v96"><small>Total Bruto</small><b>${rupiah(n?.total_bruto||0)}</b></div><div class="non-stat-v96"><small>Total Pajak</small><b>${rupiah(n?.total_pajak||0)}</b></div><div class="non-stat-v96"><small>Total Netto</small><b>${rupiah(n?.total_netto||0)}</b></div><div class="non-stat-v96"><small>Dokumen PDF</small><b>${n?.url_pdf?`<a href="${esc(n.url_pdf)}" target="_blank">Buka PDF v${esc(String(n.versi_pdf||1))}</a>`:'Belum dibuat'}</b></div></div>`;
  const honorBtn=isHonor&&isBidangSendiri&&approved&&!final?`<button onclick="openHonorModalV79('${esc(k.id_kegiatan)}')" type="button">${n?.url_pdf?'Buat Ulang Dokumen Honor':'Buat Dokumen Honorarium'}</button>`:'';
  let catatHtml='';
  if(!approved) catatHtml='<p class="empty">Perencanaan belum DISETUJUI Verifikator.</p>';
  else if(final) catatHtml=`<div class="selesai-banner-v96">✓ Paket sudah SELESAI dicatat.${real?` Nilai realisasi <b>${rupiah(real.nilai_realisasi)}</b>`:''}</div>`;
  else if(uploadedCount<2) catatHtml='<div class="notice-v103">Upload terlebih dahulu Tanda Terima dan Bukti Potong Pajak sebelum mengisi realisasi.</div>';
  else if(isBidangSendiri){ const bruto=toNumber(n?.total_bruto)||toNumber(k.jumlah)||0; catatHtml=`<div class="form-grid"><div class="field"><label>Pihak / Penerima</label><input type="text" id="npPihakV96" value="" placeholder="Nama pihak penerima"></div><div class="field"><label>Nilai Realisasi (Rp)</label><input inputmode="numeric" id="npNilaiV96" value="${bruto?Number(bruto).toLocaleString('id-ID'):''}" data-value="${bruto}"></div><div class="field span-2"><label>Keterangan</label><input type="text" id="npKetV96"></div></div><button onclick="submitCatatNonV96('${esc(k.id_kegiatan)}')" type="button">Catat Realisasi</button><p class="small">Nilai realisasi dicatat berdasarkan nilai bruto sebelum potongan pajak dan tidak boleh melebihi nilai perencanaan.</p>`; }
  else catatHtml='<p class="small">Pencatatan dilakukan User Bidang pemilik kegiatan setelah dokumen diunggah.</p>';
  document.getElementById('contentArea').innerHTML=`${backBarV95(k,k.jenis_non_pengadaan||'Non Pengadaan')}<section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Tahapan Pencatatan Non Pengadaan</h3><p class="panel-sub">Selesaikan tahapan secara berurutan.</p></div></div>${nonPipelineV103(k,n,docs,real)}</section><section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Ringkasan Paket Non Pengadaan</h3></div></div>${ringkas}${honorBtn}</section><section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Dokumen Wajib</h3><p class="panel-sub">Pilih kedua file, kemudian klik Upload Semua File.</p></div></div>${dokumenTableV95(k,['Tanda Terima','Bukti Potong Pajak'],'NON')}</section><section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Pencatatan Realisasi</h3><p class="panel-sub">Tahap ini terbuka setelah kedua dokumen wajib diunggah.</p></div></div>${catatHtml}</section><div id="honorModalV79" class="modal hidden"></div>`;
  const upBtn=document.querySelector('#dokUploadBarV96 button'); if(upBtn) upBtn.textContent='Upload Semua File';
};

submitCatatNonV96=async function(id){
  const nilai=valRupiahV96('npNilaiV96'); if(nilai<=0){alert('Nilai realisasi netto belum tersedia.');return;} if(!confirm('Catat realisasi '+rupiah(nilai)+'?')) return;
  showLoading('Mencatat realisasi Non Pengadaan...');
  try{const r=await apiPost({action:'catatNonPengadaanV96',user:currentUser,id_kegiatan:id,nilai_realisasi:nilai,nama_pihak:document.getElementById('npPihakV96')?.value||'',nomor_bukti:'',keterangan:document.getElementById('npKetV96')?.value||''});alert(r.message||(r.success?'Tercatat':'Gagal'));if(r.success){await loadDashboard(false);renderAll();}}
  catch(e){alert('Gagal: '+e.message);}finally{hideLoading();}
};

/* =========================================================
   SIMPROV v104 - Penyempurnaan Perencanaan & Non Pengadaan
   ========================================================= */
function statusPipelineNonV104(stage, state){
  return `<div class="pipe-step-v103 ${state}"><span>${stage.no}</span><b>${stage.label}</b></div>`;
}

nonPipelineV103 = function(k,n,docs,real){
  const up=s=>String(s||'').toUpperCase();
  const approved=up(k.status_perencanaan)==='DISETUJUI';
  const isHonor=up(k.jenis_non_pengadaan||'').includes('HONOR');
  const generated=!isHonor || !!n?.url_pdf;
  const uploadedDocs=(docs||[]).filter(d=>d.url_file);
  const uploaded=uploadedDocs.length>=2;
  const hasRepair=uploadedDocs.some(d=>['PERBAIKAN DOKUMEN','PERBAIKAN','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN'].includes(up(d.status_verifikasi)));
  const allValid=uploadedDocs.length>=2 && uploadedDocs.every(d=>up(d.status_verifikasi)==='VALID DOKUMEN');
  const waitingVerification=uploaded && !allValid && !hasRepair;
  const final=up(k.status_pencairan)==='SELESAI'||!!real;
  const stages=[
    {no:1,label:'Perencanaan Disetujui',state:approved?'done':''},
    {no:2,label:'Dokumen Honor Dibuat',state:generated?'done':''},
    {no:3,label:'Dokumen Wajib Diunggah',state:hasRepair?'repair':(uploaded?'done':'')},
    {no:4,label:'Verifikasi Dokumen',state:allValid?'done':(waitingVerification?'waiting':(hasRepair?'repair':''))},
    {no:5,label:'Pencatatan Realisasi',state:real?'done':''},
    {no:6,label:'Selesai',state:final?'done':''}
  ];
  return `<div class="pipeline-v103">${stages.map(x=>statusPipelineNonV104(x,x.state)).join('')}</div>`;
};

function openNonHistoryV104(id){
  const d=(dashboard?.dokumenNonPengadaan||[]).find(x=>String(x.id_dokumen_non)===String(id));
  if(!d){alert('Riwayat dokumen tidak ditemukan.');return;}
  if(typeof openNonDocStatusModalV90==='function'){openNonDocStatusModalV90(id);return;}
  alert((d.riwayat_dokumen||'Belum ada riwayat')+'\n\nCatatan: '+(d.catatan_verifikator||'-'));
}

dokumenTableV95 = function(k, jenisList, ctx){
  ctx=ctx||'PGD';
  const isNon=ctx==='NON';
  const docs=isNon?(dashboard?.dokumenNonPengadaan||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan)):(dashboard?.dokumen||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const bolehUpload=!canManage()&&!isReviewer()&&String(k.id_bidang)===String(currentUser?.id_bidang||'')&&String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const rows=jenisList.map(j=>{
    const d=docs.find(x=>dokKeyV94(x.jenis_dokumen)===dokKeyV94(j));
    const st=String(d?.status_verifikasi||'').toUpperCase();
    const valid=d&&(isNon?st==='VALID DOKUMEN':isDokValidV94(d));
    const repair=d&&['PERBAIKAN DOKUMEN','PERBAIKAN','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN'].includes(st);
    const canChoose=bolehUpload&&(!d||repair);
    let aksi='-';
    if(d&&isPBJVerifierV65()&&!valid&&!repair){
      const idd=isNon?d.id_dokumen_non:d.id_dokumen;
      aksi=`<button class="btn-soft" onclick="verifDokV96('${esc(idd)}','VALID','${ctx}')" type="button">Valid</button> <button class="btn-red" onclick="verifDokV96('${esc(idd)}','PERBAIKAN','${ctx}')" type="button">Perbaikan</button>`;
    }
    const uploadCell=canChoose?`<input type="file" class="dok-file-v96" data-jenis="${esc(j)}" data-ctx="${ctx}" onchange="this.closest('tr').classList.toggle('siap-upload-v96',this.files.length>0);tampilkanTombolUploadV96()">`:(d?`<span class="muted kecil-v96">${repair?'Upload ulang tersedia':'Sudah diupload'}</span>`:'<span class="muted kecil-v96">-</span>');
    const history=d?`<button class="btn-mini btn-detail" onclick="${isNon?`openNonHistoryV104('${esc(d.id_dokumen_non)}')`:`openDocStatusModal('${esc(d.id_dokumen)}')`}" type="button">Riwayat</button>`:'-';
    return `<tr><td>${esc(j)}</td><td>${d?`<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file||'Buka File')}</a>`:'<span class="muted">Belum diupload</span>'}</td><td>${d?badge(d.status_verifikasi||'MENUNGGU'):'-'}</td>${bolehUpload?`<td>${uploadCell}</td>`:''}<td>${d?esc(d.catatan_verifikator||d.catatan_Verifikator||d.catatan_admin||'-'):'-'}</td><td>${history}</td><td>${aksi}</td></tr>`;
  }).join('');
  const tombol=bolehUpload?`<div class="dok-upload-bar-v96 hidden" id="dokUploadBarV96"><span id="dokUploadInfoV96"></span><button onclick="uploadSemuaDokV96('${esc(k.id_kegiatan)}')" type="button">Upload Semua File</button></div>`:'';
  return `${tombol}<div class="table-wrap"><table class="dok-table-v96"><thead><tr><th>Jenis Dokumen</th><th>File</th><th>Status</th>${bolehUpload?'<th>Upload File</th>':''}<th>Catatan</th><th>Riwayat</th><th>Verifikasi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
};


/* =========================================================
   SIMPROV v105 - Pipeline Pencatatan Pengadaan, HPS Rinci,
   form penyedia/realisasi, template kuitansi, dan upload PL
   ========================================================= */
function isOwnerBidangV105(k){
  return !isReviewer() && !canManage() && String(k?.id_bidang||'')===String(currentUser?.id_bidang||'');
}
function blPipelineV105(k, docs, real){
  const up=s=>String(s||'').toUpperCase();
  const required=dokumenKetentuanByMetode('BELANJA LANGSUNG');
  const mapped=required.map(j=>(docs||[]).find(d=>dokKeyV94(d.jenis_dokumen)===dokKeyV94(j))).filter(Boolean);
  const uploaded=mapped.length>=required.length;
  const repair=mapped.some(d=>['PERBAIKAN','PERBAIKAN DOKUMEN','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN'].includes(up(d.status_verifikasi)));
  const allValid=uploaded && mapped.every(d=>isDokValidV94(d));
  const waiting=uploaded && !allValid && !repair;
  const final=up(k.status_pencairan)==='SELESAI'||!!real;
  const stages=[
    {no:1,label:'Perencanaan Disetujui',state:up(k.status_perencanaan)==='DISETUJUI'?'done':''},
    {no:2,label:'Dokumen Diunggah',state:repair?'repair':(uploaded?'done':'')},
    {no:3,label:'Verifikasi Dokumen',state:allValid?'done':(waiting?'waiting':(repair?'repair':''))},
    {no:4,label:'Pencatatan Realisasi',state:real?'done':''},
    {no:5,label:'Selesai',state:final?'done':''}
  ];
  return `<div class="pipeline-v103">${stages.map(x=>statusPipelineNonV104(x,x.state)).join('')}</div>`;
}
function getBlFormV105(k, docs, real){
  const approved=String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const final=String(k.status_pencairan||'').toUpperCase()==='SELESAI';
  const required=dokumenKetentuanByMetode('BELANJA LANGSUNG');
  const uploadedCount=required.filter(j=>(docs||[]).some(d=>dokKeyV94(d.jenis_dokumen)===dokKeyV94(j)&&d.url_file)).length;
  const owner=isOwnerBidangV105(k);
  if(!approved) return '<p class="empty">Perencanaan belum disetujui.</p>';
  if(final) return `<div class="selesai-banner-v96">✓ Paket sudah selesai.${real?` Nilai realisasi <b>${rupiah(real.nilai_realisasi)}</b>`:''}</div>`;
  if(uploadedCount<required.length) return `<div class="notice-v103">Lengkapi dokumen terlebih dahulu (${uploadedCount}/${required.length} terunggah).</div>`;
  if(!owner) return '<p class="small">Pencatatan realisasi dilakukan oleh User Bidang.</p>';
  return `${penyediaDatalistV94()}<div class="form-grid">
    <div class="field"><label>Nama Penyedia / Toko *</label><input list="penyediaListV94" id="blPenyediaV94" placeholder="Nama penyedia"></div>
    <div class="field"><label>Nilai Realisasi (Rp) *</label><input inputmode="numeric" id="blNilaiV94" data-max="${toNumber(k.jumlah)}" oninput="onRupiahInputV96(this)" placeholder="Maks. ${rupiah(k.jumlah)}"></div>
    <div class="field span-2"><label>Keterangan *</label><input type="text" id="blKetV94" placeholder="Uraian transaksi"></div>
  </div>
  <div class="action-group"><button onclick="submitCatatBLDetailV95('${esc(k.id_kegiatan)}')" type="button">Catat Realisasi</button>
  <button class="btn-soft" onclick="downloadKuitansiV105('${esc(k.id_kegiatan)}')" type="button">Download Template Kuitansi</button></div>`;
}
renderDetailPencatatanV95=function(k){
  const docs=(dashboard?.dokumen||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const real=(dashboard?.realisasi||[]).find(r=>String(r.id_kegiatan)===String(k.id_kegiatan));
  const jenisList=dokumenKetentuanByMetode('BELANJA LANGSUNG');
  document.getElementById('contentArea').innerHTML=`${backBarV95(k,k.metode_pemilihan||'Belanja Langsung')}
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Tahapan Pencatatan Pengadaan</h3></div></div>${blPipelineV105(k,docs,real)}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Dokumen Wajib</h3></div></div>${dokumenTableV95(k,jenisList,'PGD')}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Pencatatan Realisasi</h3></div></div>${getBlFormV105(k,docs,real)}</section>`;
  const b=document.querySelector('#dokUploadBarV96 button'); if(b)b.textContent='Upload Semua File';
};
async function downloadKuitansiV105(id){
  const nama=document.getElementById('blPenyediaV94')?.value.trim()||'';
  const nilai=valRupiahV96('blNilaiV94');
  const ket=document.getElementById('blKetV94')?.value.trim()||'';
  if(!nama||nilai<=0||!ket){alert('Isi Nama Penyedia, Nilai Realisasi, dan Keterangan terlebih dahulu.');return;}
  showLoading('Membuat template kuitansi...');
  try{
    const r=await apiPost({action:'generateDokPengadaanV96',user:currentUser,id_kegiatan:id,jenis:'KUITANSI',nama_penyedia:nama,nilai:nilai,keterangan:ket});
    alert(r.message||(r.success?'Template berhasil dibuat':'Gagal membuat template'));
    if(r.success&&r.url)window.open(r.url,'_blank');
  }catch(e){alert('Gagal: '+e.message);}finally{hideLoading();}
}

function hpsRowsHtmlV105(k,p){
  const raw=String(p?.spesifikasi_teknis||'').startsWith('[HPSJSON]')?String(p.spesifikasi_teknis).slice(9):'';
  let rows=[]; try{rows=raw?JSON.parse(raw):[]}catch(e){}
  if(!Array.isArray(rows)||!rows.length) rows=[{uraian:k.nama_kegiatan||'',satuan:k.satuan||'',vol:toNumber(k.volume)||1,harga:Math.round((toNumber(p?.nilai_hps)||toNumber(k.jumlah))/(toNumber(k.volume)||1)),pajak:0,keterangan:''}];
  return rows.map((r,i)=>`<tr class="hps-row-v105">
    <td><input class="hps-uraian-v105" value="${esc(r.uraian||'')}"></td>
    <td><input class="hps-satuan-v105" value="${esc(r.satuan||'')}"></td>
    <td><input class="hps-vol-v105" inputmode="decimal" value="${esc(String(r.vol||1))}" oninput="hitungHpsV105()"></td>
    <td><input class="hps-harga-v105" inputmode="numeric" value="${Number(r.harga||0).toLocaleString('id-ID')}" oninput="onRupiahInputV96(this);hitungHpsV105()"></td>
    <td><input class="hps-pajak-v105" inputmode="decimal" value="${esc(String(r.pajak||0))}" oninput="hitungHpsV105()"></td>
    <td class="hps-total-v105">${rupiah((Number(r.vol)||0)*(Number(r.harga)||0)*(1+(Number(r.pajak)||0)/100))}</td>
    <td><input class="hps-ket-v105" value="${esc(r.keterangan||'')}"></td>
    <td><button class="btn-red" type="button" onclick="this.closest('tr').remove();hitungHpsV105()">Hapus</button></td>
  </tr>`).join('');
}
function addHpsRowV105(){
  document.querySelector('#hpsBodyV105')?.insertAdjacentHTML('beforeend',hpsRowsHtmlV105({nama_kegiatan:'',satuan:'',volume:1,jumlah:0},{spesifikasi_teknis:'[HPSJSON][]'}));hitungHpsV105();
}
function collectHpsV105(){
  return [...document.querySelectorAll('.hps-row-v105')].map(tr=>({
    uraian:tr.querySelector('.hps-uraian-v105')?.value||'',satuan:tr.querySelector('.hps-satuan-v105')?.value||'',
    vol:parseFloat((tr.querySelector('.hps-vol-v105')?.value||'0').replace(',','.'))||0,
    harga:toNumber(tr.querySelector('.hps-harga-v105')?.value||0),pajak:parseFloat((tr.querySelector('.hps-pajak-v105')?.value||'0').replace(',','.'))||0,
    keterangan:tr.querySelector('.hps-ket-v105')?.value||''
  }));
}
function hitungHpsV105(){
  let total=0; document.querySelectorAll('.hps-row-v105').forEach(tr=>{const v=parseFloat((tr.querySelector('.hps-vol-v105')?.value||'0').replace(',','.'))||0,h=toNumber(tr.querySelector('.hps-harga-v105')?.value||0),p=parseFloat((tr.querySelector('.hps-pajak-v105')?.value||'0').replace(',','.'))||0,t=v*h*(1+p/100);total+=t;const c=tr.querySelector('.hps-total-v105');if(c)c.textContent=rupiah(t);});
  const el=document.getElementById('hpsTotalV105'); if(el)el.textContent=rupiah(total); return Math.round(total);
}

renderDetailPengadaanLangsungV95=function(k){
  const state=tahapanStateFeV94(k), final=String(k.status_pencairan||'').toUpperCase()==='SELESAI', approved=String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const info=kontrakInfoFeV94(k), pagu=toNumber(k.jumlah), tender=metodeKegiatanV94(k)==='TENDER MANUAL';
  const proc=(dashboard?.prosesPengadaanV96||[]).find(x=>String(x.id_kegiatan)===String(k.id_kegiatan))||{};
  const owner=isOwnerBidangV105(k), editable=(owner||isSuperAdminV65())&&!final;
  let nextIdx=state.findIndex(t=>t.status!=='SELESAI');
  const tahapHtml=approved?state.map((t,i)=>tahapDetailHtmlV94(k,t,i===nextIdx&&!final)).join(''):'<p class="empty">Perencanaan belum disetujui.</p>';
  const card=approved?`<section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Penyedia, Realisasi &amp; HPS</h3></div></div>${penyediaDatalistV94()}
    <div class="form-grid"><div class="field"><label>Nama Penyedia Terpilih</label><input list="penyediaListV94" id="plPenyediaUtamaV96" value="${esc(info.penyedia)}" ${editable?'':'readonly'}></div>
    <div class="field"><label>Nilai Realisasi / Kontrak (Rp)</label><input inputmode="numeric" id="plNilaiRealisasiV96" data-max="${pagu}" oninput="onRupiahInputV96(this)" value="${info.nilai?Number(info.nilai).toLocaleString('id-ID'):''}" ${editable?'':'readonly'}></div></div>
    <div class="hps-box-v105"><div class="panel-title-row"><div><h4>Rincian HPS</h4></div>${editable?'<button class="btn-soft" type="button" onclick="addHpsRowV105()">+ Tambah Baris</button>':''}</div>
    <div class="table-wrap"><table class="hps-table-v105"><thead><tr><th>Jenis Barang/Jasa</th><th>Satuan</th><th>Vol</th><th>Harga/Biaya</th><th>Pajak (%)</th><th>Total</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody id="hpsBodyV105">${hpsRowsHtmlV105(k,proc)}</tbody></table></div>
    <div class="hps-grand-v105">TOTAL NILAI HPS <b id="hpsTotalV105">${rupiah(toNumber(proc.nilai_hps)||pagu)}</b></div></div>
    ${editable?`<button onclick="simpanPenyediaNilaiPLV105('${esc(k.id_kegiatan)}')" type="button">Simpan Penyedia, Realisasi &amp; HPS</button>`:''}
    <div class="tpl-bar-v96"><b>Data template dokumen</b><div class="template-meta-grid-v101"><div class="field"><label>Nomor Dokumen</label><input id="tplNomorV101"></div><div class="field"><label>Pejabat yang Menandatangani</label><input id="tplPejabatV101"></div><div class="field"><label>Nama Penyedia</label><input id="tplPenyediaV101" value="${esc(info.penyedia)}"></div></div><div class="tpl-btns-v96"><button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','SPESIFIKASI DAN HPS')">Spesifikasi &amp; HPS</button><button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','${tender?'SURAT PERJANJIAN':'SPK'}')">${tender?'Surat Perjanjian':'SPK'}</button><button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','BA PEMERIKSAAN')">BA Pemeriksaan</button><button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','BA SERAH TERIMA PENYEDIA')">BAST Penyedia</button><button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','BA SERAH TERIMA KETUA UMUM')">BAST Ketua Umum</button></div></div>
  </section>`:'';
  document.getElementById('contentArea').innerHTML=`${backBarV95(k,(k.metode_pemilihan||'Pengadaan Langsung'))}${card}<section class="panel fade-up premium-panel pl-card-v94">${stepperHtmlV94(k,state)}${tahapHtml}</section>`;
  setTimeout(hitungHpsV105,0);
};
async function simpanPenyediaNilaiPLV105(id){
  const nama=document.getElementById('plPenyediaUtamaV96')?.value.trim()||'', nilai=valRupiahV96('plNilaiRealisasiV96'), rows=collectHpsV105(), hps=hitungHpsV105();
  if(!nama){alert('Nama penyedia wajib diisi.');return;} if(hps<=0){alert('Rincian HPS wajib diisi.');return;} if(nilai<=0){alert('Nilai realisasi/kontrak wajib diisi.');return;}
  showLoading('Menyimpan penyedia, realisasi, dan HPS...');
  try{const k=kegiatanById(id)||{};const r=await apiPost({action:'saveProsesPengadaanV96',user:currentUser,data:{id_kegiatan:id,jalur_proses:metodeKegiatanV94(k)==='TENDER MANUAL'?'TENDER':'PENGADAAN LANGSUNG',nama_penyedia_snapshot:nama,nilai_hps:hps,nilai_kontrak:nilai,nilai_realisasi:nilai,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows)}});alert(r.message||(r.success?'Tersimpan':'Gagal'));if(r.success){await loadDashboard(false);renderAll();}}
  catch(e){alert('Gagal: '+e.message);}finally{hideLoading();}
}
async function downloadTemplateV105(id,jenis){
  const nomor=document.getElementById('tplNomorV101')?.value.trim()||'', pejabat=document.getElementById('tplPejabatV101')?.value.trim()||'', penyedia=document.getElementById('tplPenyediaV101')?.value.trim()||'';
  if(!nomor||!pejabat||!penyedia){alert('Isi Nomor Dokumen, Pejabat Penandatangan, dan Nama Penyedia terlebih dahulu.');return;}
  const hps=hitungHpsV105();
  showLoading('Membuat template dokumen...');
  try{const r=await apiPost({action:'generateProcurementTemplateV101',user:currentUser,data:{id_kegiatan:id,jenis_template:jenis,nomor_dokumen:nomor,pejabat_penandatangan:pejabat,nama_penyedia:penyedia,nilai_hps:hps}});alert(r.message||'');if(r.success&&r.url_file)window.open(r.url_file,'_blank');}
  catch(e){alert('Gagal: '+e.message);}finally{hideLoading();}
}

/* =========================================================
   SIMPROV v106 - Perbaikan Honorarium dan Upload Perbaikan
   ========================================================= */
function honorPlannedV106(){
  const id=document.getElementById('honorKegV79')?.value||'';
  return (dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id))||{};
}
function honorRowV79(){
  const k=honorPlannedV106();
  const rate=toNumber(k?.harga_satuan)||0;
  return `<div class="honor-row-v87 honor-row-v103">
    <div class="field"><label>Nama Penerima</label><input class="hnama" placeholder="Nama lengkap" autocomplete="off"></div>
    <div class="field"><label>NIK/NPWP (16 Digit)</label><input class="hnik" inputmode="numeric" maxlength="16" placeholder="16 digit angka" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,16)"></div>
    <div class="field"><label>Jabatan / Peran</label><input class="hperan" placeholder="Contoh: Peserta"></div>
    <div class="field"><label>Volume</label><input class="hvol" inputmode="numeric" value="1" min="1" step="1" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
    <div class="field"><label>Satuan</label><input class="hsatuan" value="${esc(k?.satuan||'Orang/Kegiatan')}" readonly></div>
    <div class="field"><label>Nilai Honor per Satuan</label><input class="htarif" value="${rate?Number(rate).toLocaleString('id-ID'):''}" data-value="${rate}" readonly></div>
    <div class="field"><label>Kategori</label><select class="hkategori" onchange="syncHonorTaxV87(this)"><option value="NON ASN">Non-ASN / Bukan Pegawai</option><option value="ASN I-II">ASN Golongan I–II</option><option value="ASN III">ASN Golongan III</option><option value="ASN IV/PEJABAT">ASN Golongan IV / Pejabat Negara</option><option value="INPUT MANUAL">Input Pajak Manual</option></select></div>
    <div class="field"><label>Tarif PPh 21 (%)</label><input class="hpajak" value="2,5" readonly></div>
    <div class="honor-remove-wrap"><button class="btn-red" type="button" onclick="this.closest('.honor-row-v87').remove()">Hapus</button></div>
  </div>`;
}

generateHonorV79=async function(){
  const btn=document.getElementById('btnGenerateHonorV81'); if(btn?.dataset.busy==='1') return;
  const modal=document.getElementById('honorModalV79');
  const id=modal?.querySelector('#honorKegV79')?.value||'';
  const k=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));
  if(!k){alert('Data kegiatan tidak ditemukan. Silakan tutup lalu buka kembali form.');return;}
  const plannedRate=toNumber(k.harga_satuan)||0;
  const plannedVolume=toNumber(k.volume)||0;
  const rows=[...(modal?.querySelectorAll('#honorRowsV79 .honor-row-v87')||[])];
  if(!rows.length){alert('Baris penerima honor tidak ditemukan. Silakan tutup lalu buka kembali form.');return;}
  const penerima=[]; let totalVolume=0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    const nama=(r.querySelector('.hnama')?.value||'').trim();
    const nik=(r.querySelector('.hnik')?.value||'').replace(/\D/g,'');
    const volume=toNumber(r.querySelector('.hvol')?.value);
    if(!nama){alert(`Nama penerima ke-${i+1} wajib diisi.`);return;}
    if(!/^\d{16}$/.test(nik)){alert(`NIK/NPWP penerima ke-${i+1} wajib tepat 16 digit angka.`);return;}
    if(!volume||volume<=0){alert(`Volume penerima ke-${i+1} wajib diisi.`);return;}
    if(!plannedRate){alert('Nilai Honor belum tersedia dari Perencanaan.');return;}
    totalVolume+=volume;
    const kategori=r.querySelector('.hkategori')?.value||'NON ASN';
    penerima.push({nama_penerima:nama,nik_npwp:nik,jabatan_peran:r.querySelector('.hperan')?.value||'',volume,satuan:k.satuan||'Orang/Kegiatan',tarif_honor:plannedRate,kategori_pajak:kategori,jenis_pajak:'PPh 21',tarif_pajak:toNumber(r.querySelector('.hpajak')?.value),nilai_pajak:0});
  }
  if(plannedVolume>0 && totalVolume>plannedVolume){alert(`Total volume penerima (${totalVolume}) melebihi Volume Perencanaan (${plannedVolume}).`);return;}
  const total=penerima.reduce((s,p)=>s+(p.volume*plannedRate),0);
  if(total>toNumber(k.jumlah)){alert(`Total honor ${rupiah(total)} melebihi Nilai Perencanaan ${rupiah(k.jumlah)}.`);return;}
  if(btn){btn.dataset.busy='1';btn.disabled=true;btn.textContent='Memproses...';}
  showLoading('Membuat dokumen honorarium dan menyimpan ke Google Drive...');
  try{
    const res=await apiPost({action:'generateHonorPdf',user:currentUser,data:{id_kegiatan:id,penerima}});
    alert(res.message||'Proses selesai');
    if(res.success){modal?.classList.add('hidden');await loadDashboard(false);renderAll();}
  }catch(e){alert(e.message||e);}finally{hideLoading();if(btn){btn.dataset.busy='0';btn.disabled=false;btn.textContent='Buat Dokumen Honorarium';}}
};

// Status upload ulang harus langsung terbaca sebagai menunggu verifikasi perbaikan.
const uploadSemuaDokV106Base=uploadSemuaDokV96;
uploadSemuaDokV96=async function(idKegiatan){
  await uploadSemuaDokV106Base(idKegiatan);
  // Paksa sinkronisasi terbaru agar Choose File hilang setelah upload berhasil.
  try{await loadDashboard(false);renderAll();}catch(e){}
};

/* =========================================================
   SIMPROV v107 - Penguncian Nilai Honor dan Cache Bust
   ========================================================= */
function lockHonorRateV107(){
  const modal=document.getElementById('honorModalV79');
  const k=honorPlannedV106();
  const rate=toNumber(k?.harga_satuan)||0;
  modal?.querySelectorAll('.honor-row-v87 .htarif').forEach(function(el){
    el.value=rate?Number(rate).toLocaleString('id-ID'):'';
    el.dataset.value=String(rate);
    el.readOnly=true;
    el.setAttribute('readonly','readonly');
    el.setAttribute('aria-readonly','true');
    el.tabIndex=-1;
    el.oninput=function(){ this.value=rate?Number(rate).toLocaleString('id-ID'):''; this.dataset.value=String(rate); };
    el.onfocus=function(){ this.blur(); };
  });
}

const openHonorModalV107Base=openHonorModalV79;
openHonorModalV79=function(id){
  const result=openHonorModalV107Base(id);
  setTimeout(lockHonorRateV107,0);
  return result;
};

const honorRowV107Base=honorRowV79;
honorRowV79=function(){
  const html=honorRowV107Base();
  setTimeout(lockHonorRateV107,0);
  return html;
};

/* =========================================================
   SIMPROV v108 (frontend)
   1. Non Pengadaan: nilai realisasi non-honor bisa diisi manual; syarat
      dokumen lengkap ditampilkan sebagai checklist yang jelas.
   2. Upload perbaikan kini benar-benar mengganti file: baris berstatus
      PERBAIKAN dirutekan ke action revisi (bukan upload baru yang ditolak).
   3. Verifikasi massal: ceklis banyak dokumen lalu Valid/Perbaikan sekaligus.
   4. Pengadaan Langsung: Nilai Realisasi terkunci sampai SEMUA dokumen
      tahapan terupload.
   5. Pajak pada rincian HPS MEMOTONG total (input 11 -> total -11%).
   6-9. Field Pelaksana & Lingkup Pekerjaan untuk template; Surat
      Perjanjian (Tender) kini valid; template lebih cepat (tanpa reload).
   ========================================================= */

(function(){const s=document.createElement('style');s.textContent=`
.bulk-verif-bar-v108{display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:10px 14px;margin-bottom:10px;flex-wrap:wrap}
.bulk-verif-bar-v108 b{color:#166534}
.dok-cek-v108{width:17px;height:17px;cursor:pointer}
.hint-lock-v108{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:8px 12px;font-size:12.5px;color:#713f12;margin:6px 0}
.cek-list-v108{margin:8px 0;font-size:13px}
.cek-list-v108 span{display:inline-block;margin-right:14px}
.cek-list-v108 .ok{color:#166534;font-weight:700}.cek-list-v108 .no{color:#b91c1c;font-weight:700}
.hps-grand-net-v105{font-size:12.5px;color:#475569;margin-top:4px}`;document.head.appendChild(s);})();

/* ---------- (5) Pajak MEMOTONG total HPS ---------- */
hitungHpsV105=function(){
  let bruto=0,pajak=0;
  document.querySelectorAll('.hps-row-v105').forEach(tr=>{
    const v=parseFloat((tr.querySelector('.hps-vol-v105')?.value||'0').replace(',','.'))||0;
    const h=toNumber(tr.querySelector('.hps-harga-v105')?.value||0);
    const p=parseFloat((tr.querySelector('.hps-pajak-v105')?.value||'0').replace(',','.'))||0;
    const b=v*h, pot=Math.round(b*p/100), t=b-pot;
    bruto+=b; pajak+=pot;
    const c=tr.querySelector('.hps-total-v105'); if(c)c.textContent=rupiah(t);
  });
  const total=bruto-pajak;
  const el=document.getElementById('hpsTotalV105');
  if(el){el.textContent=rupiah(total);
    let net=document.getElementById('hpsNetInfoV108');
    if(!net){net=document.createElement('div');net.id='hpsNetInfoV108';net.className='hps-grand-net-v105';el.closest('.hps-grand-v105')?.appendChild(net);}
    net.textContent='Bruto '+rupiah(bruto)+' - Pajak '+rupiah(pajak)+' = Total setelah dipotong pajak';}
  return Math.round(total);
};
const __hpsRowsHtmlV108Base=hpsRowsHtmlV105;
hpsRowsHtmlV105=function(k,p){
  return __hpsRowsHtmlV108Base(k,p).replace(/class="hps-total-v105">[^<]*</g,'class="hps-total-v105">-<');
};

/* ---------- (2)(3) Tabel dokumen: id revisi + ceklis verifikasi massal ---------- */
dokumenTableV95=function(k,jenisList,ctx){
  ctx=ctx||'PGD';
  const isNon=ctx==='NON';
  const docs=isNon?(dashboard?.dokumenNonPengadaan||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan)):(dashboard?.dokumen||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const bolehUpload=!canManage()&&!isReviewer()&&String(k.id_bidang)===String(currentUser?.id_bidang||'')&&String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const verifier=isPBJVerifierV65();
  let adaPending=false;
  const rows=jenisList.map(j=>{
    const d=docs.find(x=>dokKeyV94(x.jenis_dokumen)===dokKeyV94(j));
    const st=String(d?.status_verifikasi||'').toUpperCase();
    const valid=d&&(isNon?st==='VALID DOKUMEN':isDokValidV94(d));
    const repair=d&&['PERBAIKAN DOKUMEN','PERBAIKAN'].includes(st);
    const waitingRepair=d&&st==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';
    const canChoose=bolehUpload&&(!d||repair);
    const idd=d?(isNon?d.id_dokumen_non:d.id_dokumen):'';
    const bisaVerif=d&&verifier&&!valid&&!repair;
    if(bisaVerif)adaPending=true;
    let aksi='-';
    if(bisaVerif) aksi=`<button class="btn-soft" onclick="verifDokV96('${esc(idd)}','VALID','${ctx}')" type="button">Valid</button> <button class="btn-red" onclick="verifDokV96('${esc(idd)}','PERBAIKAN','${ctx}')" type="button">Perbaikan</button>`;
    const cekCell=verifier?`<td>${bisaVerif?`<input type="checkbox" class="dok-cek-v108" data-idd="${esc(idd)}" data-ctx="${ctx}" onchange="updateBulkBarV108()">`:'-'}</td>`:'';
    const uploadCell=canChoose?`<input type="file" class="dok-file-v96" data-jenis="${esc(j)}" data-ctx="${ctx}" data-idd="${esc(idd)}" data-repair="${repair?'1':'0'}" onchange="this.closest('tr').classList.toggle('siap-upload-v96',this.files.length>0);tampilkanTombolUploadV96()">`:(d?`<span class="muted kecil-v96">${repair?'Upload ulang tersedia':(waitingRepair?'Menunggu verifikasi perbaikan':'Sudah diupload')}</span>`:'<span class="muted kecil-v96">-</span>');
    const history=d?`<button class="btn-mini btn-detail" onclick="${isNon?`openNonHistoryV104('${esc(d.id_dokumen_non)}')`:`openDocStatusModal('${esc(d.id_dokumen)}')`}" type="button">Riwayat</button>`:'-';
    return `<tr>${cekCell}<td>${esc(j)}</td><td>${d?`<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file||'Buka File')}</a>`:'<span class="muted">Belum diupload</span>'}</td><td>${d?badge(d.status_verifikasi||'MENUNGGU'):'-'}</td>${bolehUpload?`<td>${uploadCell}</td>`:''}<td>${d?esc(d.catatan_verifikator||d.catatan_Verifikator||d.catatan_admin||'-'):'-'}</td><td>${history}</td><td>${aksi}</td></tr>`;
  }).join('');
  const tombolUpload=bolehUpload?`<div class="dok-upload-bar-v96 hidden" id="dokUploadBarV96"><span id="dokUploadInfoV96"></span><button onclick="uploadSemuaDokV96('${esc(k.id_kegiatan)}')" type="button">Upload Semua File</button></div>`:'';
  const bulkBar=(verifier&&adaPending)?`<div class="bulk-verif-bar-v108"><label><input type="checkbox" class="dok-cek-v108" id="cekSemuaV108" onchange="document.querySelectorAll('.dok-cek-v108[data-idd]').forEach(c=>{c.checked=this.checked});updateBulkBarV108()"> Pilih semua</label><b id="bulkInfoV108">0 dipilih</b><button onclick="bulkVerifV108('VALID')" type="button">Valid-kan Terpilih</button><button class="btn-red" onclick="bulkVerifV108('PERBAIKAN')" type="button">Perbaikan Terpilih</button><span class="small">Dokumen yang tidak diceklis tetap bisa diverifikasi satu per satu.</span></div>`:'';
  return `${tombolUpload}${bulkBar}<div class="table-wrap"><table class="dok-table-v96"><thead><tr>${verifier?'<th>Pilih</th>':''}<th>Jenis Dokumen</th><th>File</th><th>Status</th>${bolehUpload?'<th>Upload File</th>':''}<th>Catatan</th><th>Riwayat</th><th>Verifikasi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
};
function updateBulkBarV108(){
  const n=document.querySelectorAll('.dok-cek-v108[data-idd]:checked').length;
  const el=document.getElementById('bulkInfoV108'); if(el)el.textContent=n+' dipilih';
}
async function bulkVerifV108(status){
  const ceks=[...document.querySelectorAll('.dok-cek-v108[data-idd]:checked')];
  if(!ceks.length){alert('Ceklis dulu dokumen yang mau diverifikasi.');return;}
  let catatan='';
  if(status==='PERBAIKAN'){catatan=prompt('Alasan perbaikan untuk '+ceks.length+' dokumen terpilih (wajib):')||'';if(!catatan.trim()){alert('Alasan perbaikan wajib diisi.');return;}}
  if(!confirm((status==='VALID'?'Valid-kan ':'Tandai PERBAIKAN ')+ceks.length+' dokumen terpilih?'))return;
  showLoading('Verifikasi 1/'+ceks.length+'...');
  let ok=0,gagal=[];
  for(let i=0;i<ceks.length;i++){
    const idd=ceks[i].dataset.idd, ctx=ceks[i].dataset.ctx;
    document.getElementById('loadingText').innerText='Verifikasi '+(i+1)+'/'+ceks.length+'...';
    try{
      const r=ctx==='NON'
        ?await apiPost({action:'verifyDokumenNonPengadaan',user:currentUser,id_dokumen_non:idd,status_verifikasi:status==='VALID'?'VALID DOKUMEN':'PERBAIKAN DOKUMEN',catatan_verifikator:catatan})
        :await apiPost({action:'verifyDokumen',user:currentUser,id_dokumen:idd,status_verifikasi:status,catatan_admin:catatan});
      if(r.success)ok++;else gagal.push(r.message||'gagal');
    }catch(e){gagal.push(e.message);}
  }
  hideLoading();
  alert(ok+' dokumen berhasil di'+(status==='VALID'?'validasi':'tandai perbaikan')+'.'+(gagal.length?'\nGagal:\n- '+gagal.join('\n- '):''));
  await loadDashboard(false);renderAll();
}

/* ---------- (2) Upload perbaikan dirutekan ke action revisi ---------- */
uploadSemuaDokV96=async function(idKegiatan){
  const inputs=Array.from(document.querySelectorAll('.dok-file-v96')).filter(f=>f.files?.length);
  if(!inputs.length){alert('Pilih file pada baris dokumen dulu.');return;}
  showLoading('Upload 1/'+inputs.length+' dokumen...');
  let ok=0,gagal=[];
  for(let i=0;i<inputs.length;i++){
    const inp=inputs[i],file=inp.files[0],jenis=inp.dataset.jenis,ctx=inp.dataset.ctx;
    const isRevisi=inp.dataset.repair==='1'&&inp.dataset.idd;
    document.getElementById('loadingText').innerText=(isRevisi?'Upload ulang ':'Upload ')+(i+1)+'/'+inputs.length+': '+jenis+'...';
    try{
      const base64=await fileToBase64(file);
      let r;
      if(isRevisi){
        r=ctx==='NON'
          ?await apiPost({action:'revisiDokumenNonPengadaan',user:currentUser,id_dokumen_non:inp.dataset.idd,file_name:file.name,mime_type:file.type,file_base64:base64})
          :await apiPost({action:'revisiDokumen',user:currentUser,id_dokumen:inp.dataset.idd,file_name:file.name,mime_type:file.type,file_base64:base64});
      }else{
        r=await apiPost({action:ctx==='NON'?'uploadDokumenNonPengadaan':'uploadDokumen',user:currentUser,id_kegiatan:idKegiatan,jenis_dokumen:jenis,file_name:file.name,mime_type:file.type,file_base64:base64});
      }
      if(r.success)ok++;else gagal.push(jenis+': '+(r.message||'gagal'));
    }catch(e){gagal.push(jenis+': '+e.message);}
  }
  hideLoading();
  alert(ok+' dokumen berhasil diupload.'+(gagal.length?'\nGagal:\n- '+gagal.join('\n- '):''));
  await loadDashboard(false);renderAll();
};

/* ---------- (4)(6)(7) Kartu Penyedia, Realisasi & HPS + template ---------- */
function semuaDokTerunggahV108(k){
  const state=tahapanStateFeV94(k);
  const semua=[]; state.forEach(t=>t.dok.forEach(x=>semua.push(x)));
  const kurang=semua.filter(x=>!x.uploaded).map(x=>x.jenis);
  return {lengkap:kurang.length===0,kurang:kurang,total:semua.length};
}
renderDetailPengadaanLangsungV95=function(k){
  const state=tahapanStateFeV94(k), final=String(k.status_pencairan||'').toUpperCase()==='SELESAI', approved=String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const info=kontrakInfoFeV94(k), pagu=toNumber(k.jumlah), tender=metodeKegiatanV94(k)==='TENDER MANUAL';
  const proc=(dashboard?.prosesPengadaanV96||[]).find(x=>String(x.id_kegiatan)===String(k.id_kegiatan))||{};
  const owner=isOwnerBidangV105(k), editable=(owner||isSuperAdminV65())&&!final;
  const dok=semuaDokTerunggahV108(k);
  const nilaiBisa=editable&&dok.lengkap;
  let nextIdx=state.findIndex(t=>t.status!=='SELESAI');
  const tahapHtml=approved?state.map((t,i)=>tahapDetailHtmlV94(k,t,i===nextIdx&&!final)).join(''):'<p class="empty">Perencanaan belum disetujui.</p>';
  const nilaiHint=(!dok.lengkap&&editable)?`<div class="hint-lock-v108">Nilai Realisasi terkunci: upload dulu seluruh dokumen tahapan (${dok.total-dok.kurang.length}/${dok.total}). Belum diupload: ${dok.kurang.slice(0,4).map(esc).join(', ')}${dok.kurang.length>4?' dan '+(dok.kurang.length-4)+' lainnya':''}.</div>`:'';
  const card=approved?`<section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Penyedia, Realisasi &amp; HPS</h3></div></div>${penyediaDatalistV94()}
    <div class="form-grid"><div class="field"><label>Nama Penyedia Terpilih</label><input list="penyediaListV94" id="plPenyediaUtamaV96" value="${esc(info.penyedia)}" ${editable?'':'readonly'}></div>
    <div class="field"><label>Nilai Realisasi / Kontrak (Rp)${nilaiBisa?'':' &#128274;'}</label><input inputmode="numeric" id="plNilaiRealisasiV96" data-max="${pagu}" oninput="onRupiahInputV96(this)" value="${info.nilai?Number(info.nilai).toLocaleString('id-ID'):''}" ${nilaiBisa?'':'readonly'} ${nilaiBisa?'':'title="Terbuka setelah semua dokumen tahapan diupload"'}></div></div>
    ${nilaiHint}
    <div class="hps-box-v105"><div class="panel-title-row"><div><h4>Rincian HPS</h4><p class="panel-sub">Pajak (%) memotong total: input 11 berarti total baris dikurangi 11%.</p></div>${editable?'<button class="btn-soft" type="button" onclick="addHpsRowV105()">+ Tambah Baris</button>':''}</div>
    <div class="table-wrap"><table class="hps-table-v105"><thead><tr><th>Jenis Barang/Jasa</th><th>Satuan</th><th>Vol</th><th>Harga/Biaya</th><th>Pajak (%)</th><th>Total</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody id="hpsBodyV105">${hpsRowsHtmlV105(k,proc)}</tbody></table></div>
    <div class="hps-grand-v105">TOTAL NILAI HPS (setelah dipotong pajak) <b id="hpsTotalV105">-</b></div></div>
    ${editable?`<button onclick="simpanPenyediaNilaiPLV105('${esc(k.id_kegiatan)}')" type="button">Simpan Penyedia, Realisasi &amp; HPS</button>`:''}
    <div class="tpl-bar-v96"><b>Data template dokumen</b>
    <div class="template-meta-grid-v101">
      <div class="field"><label>Nomor Dokumen</label><input id="tplNomorV101" value="${esc(proc.nomor_spk_kontrak||'')}"></div>
      <div class="field"><label>Pejabat Penanda Tangan Komitmen</label><input id="tplPejabatV101"></div>
      <div class="field"><label>Pelaksana Kegiatan Pengadaan</label><input id="tplPelaksanaV108"></div>
      <div class="field"><label>Nama Penyedia</label><input id="tplPenyediaV101" value="${esc(info.penyedia)}"></div>
      <div class="field span-2"><label>Lingkup &amp; Spesifikasi Pekerjaan (untuk SPK)</label><input id="tplLingkupV108" placeholder="Contoh: Menyediakan pengadaan ${esc(k.nama_kegiatan)} sesuai spesifikasi HPS"></div>
    </div>
    <div class="tpl-btns-v96">
      <button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','SURVEY HARGA')">Survey Harga</button>
      <button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','SPESIFIKASI DAN HPS')">Spesifikasi &amp; HPS</button>
      <button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','${tender?'SURAT PERJANJIAN':'SPK'}')">${tender?'Surat Perjanjian':'SPK'}</button>
      <button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','BA PEMERIKSAAN')">BA Pemeriksaan</button>
      <button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','BA SERAH TERIMA PENYEDIA')">BAST Penyedia</button>
      <button class="btn-soft" onclick="downloadTemplateV105('${esc(k.id_kegiatan)}','BA SERAH TERIMA KETUA UMUM')">BAST Ketua Umum</button>
    </div><p class="small">Template terisi otomatis lengkap dengan blok tanda tangan (BAST Ketua Umum ditandatangani Dedy Sumarna selaku Ketua Umum KONI Kota Bogor). Download, tanda tangani, lalu upload pada baris dokumen terkait.</p></div>
  </section>`:'';
  document.getElementById('contentArea').innerHTML=`${backBarV95(k,(k.metode_pemilihan||'Pengadaan Langsung'))}${card}<section class="panel fade-up premium-panel pl-card-v94">${stepperHtmlV94(k,state)}${tahapHtml}</section>`;
  setTimeout(hitungHpsV105,0);
  const pj=document.getElementById('tplPejabatV101'); if(pj&&proc.catatan&&String(proc.catatan).startsWith('Pejabat penandatangan: ')) pj.value=String(proc.catatan).slice(23);
};
simpanPenyediaNilaiPLV105=async function(id){
  const k=kegiatanById(id)||{};
  const nama=document.getElementById('plPenyediaUtamaV96')?.value.trim()||'', nilai=valRupiahV96('plNilaiRealisasiV96'), rows=collectHpsV105(), hps=hitungHpsV105();
  const dok=semuaDokTerunggahV108(k);
  if(!nama){alert('Nama penyedia wajib diisi.');return;}
  if(hps<=0){alert('Rincian HPS wajib diisi.');return;}
  if(dok.lengkap&&nilai<=0){alert('Nilai realisasi/kontrak wajib diisi (semua dokumen sudah terupload).');return;}
  showLoading('Menyimpan penyedia, realisasi, dan HPS...');
  try{
    const data={id_kegiatan:id,jalur_proses:metodeKegiatanV94(k)==='TENDER MANUAL'?'TENDER':'PENGADAAN LANGSUNG',nama_penyedia_snapshot:nama,nilai_hps:hps,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows)};
    if(dok.lengkap&&nilai>0){data.nilai_kontrak=nilai;data.nilai_realisasi=nilai;}
    const r=await apiPost({action:'saveProsesPengadaanV96',user:currentUser,data});
    alert(r.message||(r.success?'Tersimpan':'Gagal'));
    if(r.success){await loadDashboard(false);renderAll();}
  }catch(e){alert('Gagal: '+e.message);}finally{hideLoading();}
};
downloadTemplateV105=async function(id,jenis){
  const nomor=document.getElementById('tplNomorV101')?.value.trim()||'';
  const pejabat=document.getElementById('tplPejabatV101')?.value.trim()||'';
  const pelaksana=document.getElementById('tplPelaksanaV108')?.value.trim()||'';
  const penyedia=document.getElementById('tplPenyediaV101')?.value.trim()||'';
  const lingkup=document.getElementById('tplLingkupV108')?.value.trim()||'';
  if(!nomor||!pejabat||!penyedia){alert('Isi Nomor Dokumen, Pejabat Penanda Tangan Komitmen, dan Nama Penyedia terlebih dahulu.');return;}
  if(jenis==='SURVEY HARGA'&&!pelaksana){alert('Isi Pelaksana Kegiatan Pengadaan (penandatangan Survey Harga).');return;}
  const hps=hitungHpsV105();
  showLoading('Membuat template '+jenis+'...');
  try{
    const r=await apiPost({action:'generateProcurementTemplateV101',user:currentUser,data:{id_kegiatan:id,jenis_template:jenis,nomor_dokumen:nomor,pejabat_penandatangan:pejabat,pelaksana_pengadaan:pelaksana,nama_penyedia:penyedia,lingkup_pekerjaan:lingkup,nilai_hps:hps}});
    alert(r.message||'');
    if(r.success&&r.url_file)window.open(r.url_file,'_blank');
  }catch(e){alert('Gagal: '+e.message);}finally{hideLoading();}
};

/* ---------- (1) Non Pengadaan: checklist jelas + nilai manual non-honor ---------- */
const __renderDetailNonV108Base=renderDetailNonPengadaanV95;
renderDetailNonPengadaanV95=function(k){
  __renderDetailNonV108Base(k);
  const docs=(dashboard?.dokumenNonPengadaan||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan)&&d.url_file);
  const isHonor=String(k.jenis_non_pengadaan||'Honorarium').toUpperCase().includes('HONOR');
  const n=(typeof latestNonV79==='function')?latestNonV79(k.id_kegiatan):null;
  const punya=j=>docs.some(d=>dokKeyV94(d.jenis_dokumen)===dokKeyV94(j));
  // Checklist syarat menggantikan notice polos
  const notice=document.querySelector('.notice-v103');
  if(notice){
    const items=[['Tanda Terima',punya('Tanda Terima')],['Bukti Potong Pajak',punya('Bukti Potong Pajak')]];
    if(isHonor)items.unshift(['Dokumen Honor dibuat',!!n?.url_pdf]);
    notice.innerHTML='Pencatatan realisasi terbuka setelah syarat berikut terpenuhi:<div class="cek-list-v108">'+items.map(x=>`<span class="${x[1]?'ok':'no'}">${x[1]?'&#10003;':'&#10007;'} ${esc(x[0])}</span>`).join('')+'</div>';
  }
  // Non-honor: nilai realisasi bisa diisi manual (netto tidak tersedia)
  const nilaiEl=document.getElementById('npNilaiV96');
  if(nilaiEl&&!isHonor){
    nilaiEl.readOnly=false;
    nilaiEl.dataset.max=String(toNumber(k.jumlah));
    nilaiEl.setAttribute('oninput','onRupiahInputV96(this)');
    nilaiEl.placeholder='Maks. '+rupiah(k.jumlah);
  }
};

/* =========================================================
   SIMPROV v109 - Fokus Pencatatan Non Pengadaan
   ========================================================= */
function latestRequiredNonDocsV109(docs){
  const wanted=['TANDA TERIMA','BUKTI POTONG PAJAK'], map={};
  (docs||[]).forEach(d=>{const j=String(d.jenis_dokumen||'').trim().toUpperCase();if(wanted.includes(j))map[j]=d;});
  return wanted.map(j=>map[j]).filter(Boolean);
}
nonPipelineV103=function(k,n,docs,real){
  const up=s=>String(s||'').toUpperCase();
  const latest=latestRequiredNonDocsV109(docs);
  const approved=up(k.status_perencanaan)==='DISETUJUI';
  const isHonor=up(k.jenis_non_pengadaan||'').includes('HONOR');
  const generated=!isHonor||!!n?.url_pdf;
  const complete=latest.length===2&&latest.every(d=>d.url_file);
  const hasRepair=latest.some(d=>['PERBAIKAN DOKUMEN','PERBAIKAN'].includes(up(d.status_verifikasi)));
  const waitingRepair=latest.some(d=>up(d.status_verifikasi)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN');
  const allValid=complete&&latest.every(d=>up(d.status_verifikasi)==='VALID DOKUMEN');
  const waitingVerification=complete&&!allValid&&!hasRepair;
  const final=up(k.status_pencairan)==='SELESAI'||!!real;
  const stages=[
    {no:1,label:'Perencanaan Disetujui',state:approved?'done':''},
    {no:2,label:'Dokumen Honor Dibuat',state:generated?'done':''},
    {no:3,label:'Dokumen Wajib Diunggah',state:hasRepair?'repair':(complete?'done':(waitingRepair?'waiting':''))},
    {no:4,label:'Verifikasi Dokumen',state:allValid?'done':(waitingVerification||waitingRepair?'waiting':(hasRepair?'repair':''))},
    {no:5,label:'Pencatatan Realisasi',state:real?'done':(allValid?'waiting':'')},
    {no:6,label:'Selesai',state:final?'done':''}
  ];
  return `<div class="pipeline-v103">${stages.map(x=>statusPipelineNonV104(x,x.state)).join('')}</div>`;
};

const renderDetailNonPengadaanV109Base=renderDetailNonPengadaanV95;
renderDetailNonPengadaanV95=function(k){
  renderDetailNonPengadaanV109Base(k);
  const docs=(dashboard?.dokumenNonPengadaan||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const latest=latestRequiredNonDocsV109(docs);
  const allValid=latest.length===2&&latest.every(d=>String(d.status_verifikasi||'').toUpperCase()==='VALID DOKUMEN');
  const real=(dashboard?.realisasi||[]).find(r=>String(r.id_kegiatan)===String(k.id_kegiatan));
  if(allValid&&!real){
    const panel=[...document.querySelectorAll('#contentArea section.panel')].find(s=>s.querySelector('h3')?.textContent.trim()==='Pencatatan Realisasi');
    if(panel){
      const n=(typeof latestNonV79==='function')?latestNonV79(k.id_kegiatan):null;
      const bruto=toNumber(n?.total_bruto)||toNumber(k.jumlah)||0;
      const isOwner=!canManage()&&!isReviewer()&&String(k.id_bidang)===String(currentUser?.id_bidang||'');
      const content=panel.querySelector('.panel-head')?.nextElementSibling;
      if(isOwner && content && !document.getElementById('npNilaiV96')){
        content.outerHTML=`<div><div class="form-grid"><div class="field"><label>Pihak / Penerima</label><input type="text" id="npPihakV96" value=""></div><div class="field"><label>Nilai Realisasi (Rp)</label><input inputmode="numeric" id="npNilaiV96" value="${Number(netto).toLocaleString('id-ID')}" data-value="${netto}" readonly></div><div class="field span-2"><label>Keterangan</label><input type="text" id="npKetV96"></div></div><button onclick="submitCatatNonV96('${esc(k.id_kegiatan)}')" type="button">Catat Realisasi</button></div>`;
      }
    }
  }
};

submitCatatNonV96=async function(id){
  const nilai=valRupiahV96('npNilaiV96');
  if(nilai<=0){alert('Nilai realisasi netto belum tersedia.');return;}
  if(!confirm('Catat realisasi '+rupiah(nilai)+'?'))return;
  showLoading('Menyimpan realisasi...');
  try{
    const r=await apiPost({action:'catatNonPengadaanV109',user:currentUser,id_kegiatan:id,nilai_realisasi:nilai,nama_pihak:document.getElementById('npPihakV96')?.value||'',keterangan:document.getElementById('npKetV96')?.value||''});
    if(!r.success)throw new Error(r.message||'Gagal mencatat realisasi');
    alert(r.message||'Realisasi berhasil dicatat');
    if(dashboard){
      dashboard.realisasi=dashboard.realisasi||[];
      dashboard.realisasi.push({id_kegiatan:id,nilai_realisasi:nilai,status:'FINAL'});
      const k=(dashboard.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));if(k)k.status_pencairan='SELESAI';
    }
    renderAll();
  }catch(e){alert(e.message||String(e));}finally{hideLoading();}
};

const bulkVerifV108Base=typeof bulkVerifV108==='function'?bulkVerifV108:null;
bulkVerifV108=async function(status){
  const ceks=[...document.querySelectorAll('.dok-cek-v108[data-idd]:checked')];
  if(!ceks.length){alert('Pilih minimal satu dokumen.');return;}
  const isNon=ceks.every(c=>c.dataset.ctx==='NON');
  if(!isNon){return bulkVerifV108Base?bulkVerifV108Base(status):null;}
  let catatan='';
  if(status==='PERBAIKAN'){catatan=prompt('Masukkan alasan perbaikan untuk dokumen terpilih:','')||'';if(!catatan.trim())return;}
  if(!confirm((status==='VALID'?'Valid-kan ':'Tandai PERBAIKAN ')+ceks.length+' dokumen terpilih?'))return;
  showLoading('Memproses '+ceks.length+' dokumen...');
  try{
    const items=ceks.map(c=>({id_dokumen_non:c.dataset.idd,status_verifikasi:status==='VALID'?'VALID DOKUMEN':'PERBAIKAN DOKUMEN',catatan_verifikator:catatan}));
    const r=await apiPost({action:'bulkVerifyDokumenNonV109',user:currentUser,items});
    if(!r.success)throw new Error(r.message||'Gagal memproses dokumen');
    items.forEach(it=>{const d=(dashboard?.dokumenNonPengadaan||[]).find(x=>String(x.id_dokumen_non)===String(it.id_dokumen_non));if(d){d.status_verifikasi=it.status_verifikasi;d.catatan_verifikator=it.catatan_verifikator;}});
    alert(r.message);
    renderAll();
  }catch(e){alert(e.message||String(e));}finally{hideLoading();}
};

/* =========================================================
   SIMPROV v110 - Realisasi setelah upload, koreksi Verifikator
   ========================================================= */
nonPipelineV103=function(k,n,docs,real){
  const up=s=>String(s||'').toUpperCase();
  const latest=latestRequiredNonDocsV109(docs);
  const approved=up(k.status_perencanaan)==='DISETUJUI';
  const isHonor=up(k.jenis_non_pengadaan||'').includes('HONOR');
  const generated=!isHonor||!!n?.url_pdf;
  const complete=latest.length===2&&latest.every(d=>d.url_file);
  const hasRepair=latest.some(d=>['PERBAIKAN DOKUMEN','PERBAIKAN'].includes(up(d.status_verifikasi)));
  const waitingRepair=latest.some(d=>up(d.status_verifikasi)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN');
  const allValid=complete&&latest.every(d=>up(d.status_verifikasi)==='VALID DOKUMEN');
  const final=up(k.status_pencairan)==='SELESAI';
  const stages=[
    {no:1,label:'Perencanaan Disetujui',state:approved?'done':''},
    {no:2,label:'Dokumen Honor Dibuat',state:generated?'done':''},
    {no:3,label:'Dokumen Wajib Diunggah',state:hasRepair?'repair':(complete?'done':(waitingRepair?'waiting':''))},
    {no:4,label:'Pencatatan Realisasi',state:real?'done':(complete?'waiting':'')},
    {no:5,label:'Verifikasi Dokumen',state:allValid?'done':(hasRepair?'repair':((complete||waitingRepair)?'waiting':''))},
    {no:6,label:'Selesai',state:final?'done':''}
  ];
  return `<div class="pipeline-v103">${stages.map(x=>statusPipelineNonV104(x,x.state)).join('')}</div>`;
};

renderDetailNonPengadaanV95=function(k){
  const n=(typeof latestNonV79==='function')?latestNonV79(k.id_kegiatan):null;
  const docs=(dashboard?.dokumenNonPengadaan||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const latest=latestRequiredNonDocsV109(docs);
  const real=(dashboard?.realisasi||[]).find(r=>String(r.id_kegiatan)===String(k.id_kegiatan)&&String(r.status||'').toUpperCase()!=='DIBATALKAN');
  const final=String(k.status_pencairan||'').toUpperCase()==='SELESAI';
  const approved=String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const isOwner=!canManage()&&!isReviewer()&&String(k.id_bidang)===String(currentUser?.id_bidang||'');
  const canVerify=canManage()||isVerifierV77();
  const isHonor=String(k.jenis_non_pengadaan||'Honorarium').toUpperCase().includes('HONOR');
  const complete=latest.length===2&&latest.every(d=>d.url_file);
  const allValid=complete&&latest.every(d=>String(d.status_verifikasi||'').toUpperCase()==='VALID DOKUMEN');
  const ringkas=`<div class="non-stat-grid-v96"><div class="non-stat-v96"><small>Jenis</small><b>${esc(k.jenis_non_pengadaan||'Non Pengadaan')}</b></div><div class="non-stat-v96"><small>Nilai Perencanaan</small><b>${rupiah(k.jumlah)}</b></div><div class="non-stat-v96"><small>Total Bruto</small><b>${rupiah(n?.total_bruto||0)}</b></div><div class="non-stat-v96"><small>Total Pajak</small><b>${rupiah(n?.total_pajak||0)}</b></div><div class="non-stat-v96"><small>Total Netto</small><b>${rupiah(n?.total_netto||0)}</b></div><div class="non-stat-v96"><small>Dokumen PDF</small><b>${n?.url_pdf?`<a href="${esc(n.url_pdf)}" target="_blank">Buka PDF v${esc(String(n.versi_pdf||1))}</a>`:'Belum dibuat'}</b></div></div>`;
  const honorBtn=isHonor&&isOwner&&approved&&!final?`<button onclick="openHonorModalV79('${esc(k.id_kegiatan)}')" type="button">${n?.url_pdf?'Buat Ulang Dokumen Honor':'Buat Dokumen Honorarium'}</button>`:'';
  let catatHtml='';
  if(!approved) catatHtml='<p class="empty">Perencanaan belum disetujui Verifikator.</p>';
  else if(final) catatHtml=`<div class="selesai-banner-v96">✓ Paket sudah selesai.${real?` Nilai realisasi <b>${rupiah(real.nilai_realisasi)}</b>`:''}</div>`;
  else if(!complete) catatHtml='<div class="notice-v103">Nilai realisasi dapat diisi setelah Tanda Terima dan Bukti Potong Pajak selesai diunggah.</div>';
  else if(real){
    catatHtml=`<div class="notice-v103"><b>Nilai realisasi telah dicatat:</b> ${rupiah(real.nilai_realisasi)}<br><span class="small">Status: ${esc(displayStatusText(real.status||'MENUNGGU VERIFIKASI'))}. Nilai ini diperiksa bersama dokumen oleh Verifikator.</span></div>`;
    if(canVerify){
      catatHtml+=`<div class="form-grid"><div class="field"><label>Nilai Realisasi Hasil Pemeriksaan (Rp)</label><input inputmode="numeric" id="npKoreksiNilaiV110" value="${Number(toNumber(real.nilai_realisasi)).toLocaleString('id-ID')}" data-value="${toNumber(real.nilai_realisasi)}" oninput="onRupiahInputV96(this)"></div><div class="field span-2"><label>Catatan Koreksi</label><input type="text" id="npKoreksiCatatanV110" placeholder="Wajib diisi apabila nilai diubah"></div></div><button class="btn-orange" onclick="koreksiRealisasiNonV110('${esc(k.id_kegiatan)}')" type="button">Simpan Koreksi Nilai</button><p class="small">Setiap perubahan nilai oleh Verifikator disimpan dalam riwayat pemeriksaan.</p>`;
    }
  } else if(isOwner){
    const bruto=toNumber(n?.total_bruto)||toNumber(k.jumlah)||0;
    catatHtml=`<div class="form-grid"><div class="field"><label>Pihak / Penerima</label><input type="text" id="npPihakV96" value="" placeholder="Nama pihak penerima"></div><div class="field"><label>Nilai Realisasi (Rp)</label><input inputmode="numeric" id="npNilaiV96" value="${bruto?Number(bruto).toLocaleString('id-ID'):''}" data-value="${bruto}" data-max="${toNumber(k.jumlah)}" oninput="onRupiahInputV96(this)"></div><div class="field span-2"><label>Keterangan</label><input type="text" id="npKetV96"></div></div><button onclick="submitCatatNonV96('${esc(k.id_kegiatan)}')" type="button">Catat Realisasi</button><p class="small">Nilai realisasi akan diperiksa oleh Verifikator bersama dokumen. Nilai tidak boleh melebihi nilai perencanaan.</p>`;
  } else catatHtml='<p class="small">Nilai realisasi dicatat oleh User Bidang setelah seluruh dokumen selesai diunggah.</p>';
  document.getElementById('contentArea').innerHTML=`${backBarV95(k,k.jenis_non_pengadaan||'Non Pengadaan')}<section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Tahapan Pencatatan Non Pengadaan</h3><p class="panel-sub">Proses dokumen, realisasi, dan pemeriksaan ditampilkan secara berurutan.</p></div></div>${nonPipelineV103(k,n,docs,real)}</section><section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Ringkasan Paket Non Pengadaan</h3></div></div>${ringkas}${honorBtn}</section><section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Dokumen Wajib</h3><p class="panel-sub">Unggah Tanda Terima dan Bukti Potong Pajak.</p></div></div>${dokumenTableV95(k,['Tanda Terima','Bukti Potong Pajak'],'NON')}</section><section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Pencatatan Realisasi</h3><p class="panel-sub">Nilai dapat dicatat setelah seluruh dokumen diunggah dan diperiksa oleh Verifikator pada tahap berikutnya.</p></div></div>${catatHtml}</section><div id="honorModalV79" class="modal hidden"></div>`;
  const upBtn=document.querySelector('#dokUploadBarV96 button'); if(upBtn) upBtn.textContent='Upload Semua File';
};

submitCatatNonV96=async function(id){
  const nilai=valRupiahV96('npNilaiV96');
  if(nilai<=0){alert('Nilai realisasi wajib diisi.');return;}
  if(!confirm('Catat realisasi '+rupiah(nilai)+' untuk diperiksa Verifikator?'))return;
  showLoading('Menyimpan nilai realisasi...');
  try{
    const r=await apiPost({action:'catatNonPengadaanV110',user:currentUser,id_kegiatan:id,nilai_realisasi:nilai,nama_pihak:document.getElementById('npPihakV96')?.value||'',keterangan:document.getElementById('npKetV96')?.value||''});
    if(!r.success)throw new Error(r.message||'Gagal mencatat realisasi');
    alert(r.message||'Nilai realisasi berhasil dicatat');
    await loadDashboard(false);renderAll();
  }catch(e){alert(e.message||String(e));}finally{hideLoading();}
};

async function koreksiRealisasiNonV110(id){
  const nilai=valRupiahV96('npKoreksiNilaiV110');
  const catatan=(document.getElementById('npKoreksiCatatanV110')?.value||'').trim();
  if(nilai<=0){alert('Nilai realisasi wajib diisi.');return;}
  if(!catatan){alert('Catatan alasan koreksi wajib diisi.');return;}
  if(!confirm('Simpan koreksi nilai realisasi menjadi '+rupiah(nilai)+'?'))return;
  showLoading('Menyimpan koreksi nilai...');
  try{
    const r=await apiPost({action:'koreksiRealisasiNonV110',user:currentUser,id_kegiatan:id,nilai_realisasi:nilai,catatan});
    if(!r.success)throw new Error(r.message||'Gagal memperbaiki nilai realisasi');
    alert(r.message||'Koreksi nilai berhasil disimpan');
    await loadDashboard(false);renderAll();
  }catch(e){alert(e.message||String(e));}finally{hideLoading();}
}


/* =========================================================
   SIMPROV v111 - Fokus Pencatatan Non Pengadaan & kecepatan
   ========================================================= */

/* 1. Pihak/Penerima selalu kosong agar diisi sendiri oleh User Bidang. */
const __renderDetailNonPengadaanV111Base = renderDetailNonPengadaanV95;
renderDetailNonPengadaanV95 = function(k){
  const result = __renderDetailNonPengadaanV111Base.apply(this,arguments);
  const pihak = document.getElementById('npPihakV96');
  if(pihak){
    pihak.value = '';
    pihak.removeAttribute('readonly');
    pihak.placeholder = 'Ketik nama pihak/penerima';
    pihak.autocomplete = 'off';
  }
  const nilai = document.getElementById('npNilaiV96');
  if(nilai && k){ nilai.dataset.max = String(toNumber(k.jumlah)||0); }
  return result;
};

/* 2. Data Perencanaan bisa diurutkan berdasarkan input terbaru/terlama. */
let urutanPerencanaanV111 = 'TERBARU';
function waktuPerencanaanV111(k){
  const d = new Date(k?.tanggal_input || 0);
  if(!Number.isNaN(d.getTime())) return d.getTime();
  const idTime = Number(String(k?.id_kegiatan||'').replace(/\D/g,''));
  return Number.isFinite(idTime) ? idTime : 0;
}
function setUrutanPerencanaanV111(v){
  urutanPerencanaanV111 = v === 'TERLAMA' ? 'TERLAMA' : 'TERBARU';
  perencanaanPage = 1;
  renderPerencanaan();
}
const __renderPerencanaanV111Base = renderPerencanaan;
renderPerencanaan = function(){
  if(!dashboard || !Array.isArray(dashboard.perencanaan)) return __renderPerencanaanV111Base.apply(this,arguments);
  const original = dashboard.perencanaan;
  dashboard.perencanaan = original.slice().sort(function(a,b){
    const diff = waktuPerencanaanV111(b) - waktuPerencanaanV111(a);
    return urutanPerencanaanV111 === 'TERLAMA' ? -diff : diff;
  });
  try{
    const result = __renderPerencanaanV111Base.apply(this,arguments);
    const panel = [...document.querySelectorAll('#contentArea .panel')].find(function(p){
      return p.querySelector('table') && /Data Perencanaan|Persetujuan Perencanaan|Pemeriksaan Data Perencanaan/i.test(p.textContent||'');
    });
    const toolbar = panel?.querySelector('.toolbar');
    if(toolbar && !document.getElementById('urutanPerencanaanV111')){
      const wrap = document.createElement('div');
      wrap.className = 'field small';
      wrap.innerHTML = '<label>Urutkan Data</label><select id="urutanPerencanaanV111" onchange="setUrutanPerencanaanV111(this.value)"><option value="TERBARU" '+(urutanPerencanaanV111==='TERBARU'?'selected':'')+'>Input Terbaru</option><option value="TERLAMA" '+(urutanPerencanaanV111==='TERLAMA'?'selected':'')+'>Input Terlama</option></select>';
      const refresh = toolbar.querySelector('.btn-refresh');
      toolbar.insertBefore(wrap,refresh||null);
    }
    return result;
  }finally{
    dashboard.perencanaan = original;
  }
};

/* 3. Harga Pasar/Input Manual selalu kembali ke kategori Pengadaan. */
const __toggleSumberHargaV111Base = toggleSumberHargaV96;
toggleSumberHargaV96 = function(){
  __toggleSumberHargaV111Base.apply(this,arguments);
  const sumber = document.getElementById('sumberHargaV96')?.value;
  if(sumber === 'PASAR'){
    const kategori = document.getElementById('kategoriPerencanaanV79');
    if(kategori){
      kategori.value = 'PENGADAAN';
      if(typeof toggleKategoriV79 === 'function') toggleKategoriV79();
    }
    const jenisNon = document.getElementById('jenisNonPengadaanV79');
    if(jenisNon) jenisNon.value = '';
    const jenisPengadaan = document.getElementById('jenisPengadaanV96');
    if(jenisPengadaan){
      jenisPengadaan.disabled = false;
      if(![...jenisPengadaan.options].some(function(o){return o.value==='Barang';})){
        jenisPengadaan.innerHTML = '<option>Barang</option><option>Jasa Konstruksi</option><option>Jasa Konsultansi</option><option>Jasa Lainnya</option>';
      }
      jenisPengadaan.value = 'Barang';
    }
    const cara = document.getElementById('caraPelaksanaanV96');
    if(cara){ cara.disabled = false; if(!cara.value) cara.value='Penyedia'; }
  }
};

/* Rapikan label sumber harga setiap kali form Perencanaan dirender. */
const __renderPerencanaanLabelV111Base = renderPerencanaan;
renderPerencanaan = function(){
  const result = __renderPerencanaanLabelV111Base.apply(this,arguments);
  const opsi = document.querySelector('#sumberHargaV96 option[value="PASAR"]');
  if(opsi) opsi.textContent = 'Harga Pasar / Input Manual';
  return result;
};

/* 4. Pencatatan realisasi tidak menunggu reload dashboard penuh.
   Data lokal langsung diperbarui, sinkronisasi server berjalan diam-diam. */
let __silentDashboardTimerV111 = null;
function syncDashboardSilentV111(){
  clearTimeout(__silentDashboardTimerV111);
  __silentDashboardTimerV111 = setTimeout(async function(){
    try{
      const r = await apiPost({action:'getDashboard',user:currentUser});
      if(r?.success){
        dashboard = normalizeDashboardData(r);
        writeDashboardCache(dashboard);
        if(activeMenu === 'Non Pengadaan' || activeMenu === 'Pencatatan Non Pengadaan') renderAll();
      }
    }catch(e){ console.warn('SILENT_SYNC_V111',e); }
  },250);
}
submitCatatNonV96 = async function(id){
  const pihak = (document.getElementById('npPihakV96')?.value||'').trim();
  const nilai = valRupiahV96('npNilaiV96');
  const kegiatan = kegiatanById(id);
  const max = toNumber(kegiatan?.jumlah||0);
  if(!pihak){ alert('Pihak/Penerima wajib diisi.'); return; }
  if(nilai<=0){ alert('Nilai realisasi wajib diisi.'); return; }
  if(max>0 && nilai>max){ alert('Nilai realisasi tidak boleh melebihi '+rupiah(max)+'.'); return; }
  if(!confirm('Catat realisasi '+rupiah(nilai)+' untuk diperiksa Verifikator?')) return;
  showLoading('Menyimpan nilai realisasi...');
  try{
    const r = await apiPost({action:'catatNonPengadaanV111',user:currentUser,id_kegiatan:id,nilai_realisasi:nilai,nama_pihak:pihak,keterangan:document.getElementById('npKetV96')?.value||''});
    if(!r.success) throw new Error(r.message||'Gagal mencatat realisasi');
    dashboard.realisasi = Array.isArray(dashboard.realisasi) ? dashboard.realisasi : [];
    dashboard.realisasi.push(Object.assign({id_kegiatan:id,id_bidang:kegiatan?.id_bidang||'',kategori:'NON PENGADAAN',metode:'NON PENGADAAN',status:'MENUNGGU VERIFIKASI',tanggal_input:new Date().toISOString()},r.realisasi||{nilai_realisasi:nilai,nama_pihak:pihak}));
    if(kegiatan) kegiatan.status_pencairan = r.status || 'MENUNGGU VERIFIKASI DOKUMEN';
    const np = (dashboard.nonPengadaan||[]).filter(function(x){return String(x.id_kegiatan)===String(id);}).sort(function(a,b){return toNumber(b.versi_pdf)-toNumber(a.versi_pdf);})[0];
    if(np) np.status = r.status || 'MENUNGGU VERIFIKASI DOKUMEN';
    writeDashboardCache(dashboard);
    renderAll();
    hideLoading();
    alert(r.message||'Nilai realisasi berhasil dicatat');
    syncDashboardSilentV111();
  }catch(e){
    hideLoading();
    alert(e.message||String(e));
  }
};

/* Optimasi upload/verifikasi v111: pembacaan file paralel, tampilan lokal langsung diperbarui. */
function updateDokumenLokalV111(ctx,isRevisi,idDok,dokumen){
  if(!dokumen || !dashboard) return;
  const key = ctx==='NON' ? 'dokumenNonPengadaan' : 'dokumen';
  const idField = ctx==='NON' ? 'id_dokumen_non' : 'id_dokumen';
  dashboard[key] = Array.isArray(dashboard[key]) ? dashboard[key] : [];
  if(isRevisi){
    const target = dashboard[key].find(function(d){ return String(d[idField])===String(idDok); });
    if(target) Object.assign(target,dokumen);
    else dashboard[key].push(dokumen);
  }else{
    dashboard[key].push(dokumen);
  }
}
uploadSemuaDokV96 = async function(idKegiatan){
  const inputs = Array.from(document.querySelectorAll('.dok-file-v96')).filter(function(f){return f.files?.length;});
  if(!inputs.length){ alert('Pilih file pada baris dokumen dulu.'); return; }
  showLoading('Menyiapkan '+inputs.length+' dokumen...');
  try{
    const prepared = await Promise.all(inputs.map(async function(inp){
      const file = inp.files[0];
      return {inp:inp,file:file,base64:await fileToBase64(file)};
    }));
    let ok=0, gagal=[];
    for(let i=0;i<prepared.length;i++){
      const item=prepared[i], inp=item.inp, file=item.file, jenis=inp.dataset.jenis, ctx=inp.dataset.ctx;
      const isRevisi=inp.dataset.repair==='1'&&inp.dataset.idd;
      const lt=document.getElementById('loadingText');
      if(lt) lt.innerText=(isRevisi?'Upload ulang ':'Upload ')+(i+1)+'/'+prepared.length+': '+jenis+'...';
      try{
        let r;
        if(isRevisi){
          r=ctx==='NON'
            ?await apiPost({action:'revisiDokumenNonPengadaan',user:currentUser,id_dokumen_non:inp.dataset.idd,file_name:file.name,mime_type:file.type,file_base64:item.base64})
            :await apiPost({action:'revisiDokumen',user:currentUser,id_dokumen:inp.dataset.idd,file_name:file.name,mime_type:file.type,file_base64:item.base64});
        }else{
          r=await apiPost({action:ctx==='NON'?'uploadDokumenNonPengadaan':'uploadDokumen',user:currentUser,id_kegiatan:idKegiatan,jenis_dokumen:jenis,file_name:file.name,mime_type:file.type,file_base64:item.base64});
        }
        if(r.success){
          ok++;
          updateDokumenLokalV111(ctx,!!isRevisi,inp.dataset.idd,r.dokumen);
        }else gagal.push(jenis+': '+(r.message||'gagal'));
      }catch(e){ gagal.push(jenis+': '+(e.message||e)); }
    }
    const kegiatan=kegiatanById(idKegiatan);
    if(kegiatan && ok) kegiatan.status_pencairan='MENUNGGU VERIFIKASI DOKUMEN';
    writeDashboardCache(dashboard);
    renderAll();
    hideLoading();
    alert(ok+' dokumen berhasil diupload.'+(gagal.length?'\nGagal:\n- '+gagal.join('\n- '):''));
    syncDashboardSilentV111();
  }catch(e){
    hideLoading();
    alert('Gagal menyiapkan/upload dokumen: '+(e.message||e));
  }
};

verifDokV96 = async function(idDok,status,ctx){
  let catatan='';
  if(status==='PERBAIKAN'){
    catatan=prompt('Alasan perbaikan (wajib):')||'';
    if(!catatan.trim()){alert('Alasan perbaikan wajib diisi.');return;}
  }
  showLoading('Memperbarui status dokumen...');
  try{
    const r=ctx==='NON'
      ?await apiPost({action:'verifyDokumenNonPengadaan',user:currentUser,id_dokumen_non:idDok,status_verifikasi:status==='VALID'?'VALID DOKUMEN':'PERBAIKAN DOKUMEN',catatan_verifikator:catatan})
      :await apiPost({action:'verifyDokumen',user:currentUser,id_dokumen:idDok,status_verifikasi:status,catatan_admin:catatan});
    if(!r.success) throw new Error(r.message||'Gagal memperbarui status');
    const key=ctx==='NON'?'dokumenNonPengadaan':'dokumen';
    const idField=ctx==='NON'?'id_dokumen_non':'id_dokumen';
    const d=(dashboard?.[key]||[]).find(function(x){return String(x[idField])===String(idDok);});
    if(d){
      d.status_verifikasi=ctx==='NON'?(status==='VALID'?'VALID DOKUMEN':'PERBAIKAN DOKUMEN'):(status==='VALID'?'VALID DOKUMEN':'PERBAIKAN DOKUMEN');
      if(ctx==='NON') d.catatan_verifikator=catatan; else d.catatan_admin=catatan;
      d.verifikasi_by=currentUser?.nama||'Verifikator';
      d.tanggal_verifikasi=new Date().toISOString();
      const k=kegiatanById(d.id_kegiatan);
      if(k && ctx==='NON'){
        const docs=(dashboard.dokumenNonPengadaan||[]).filter(function(x){return String(x.id_kegiatan)===String(k.id_kegiatan);});
        const latest=latestRequiredNonDocsV109(docs);
        const real=(dashboard.realisasi||[]).find(function(x){return String(x.id_kegiatan)===String(k.id_kegiatan)&&String(x.status||'').toUpperCase()!=='DIBATALKAN';});
        const allValid=latest.length===2&&latest.every(function(x){return String(x.status_verifikasi||'').toUpperCase()==='VALID DOKUMEN';});
        const repair=latest.some(function(x){return ['PERBAIKAN DOKUMEN','PERBAIKAN'].includes(String(x.status_verifikasi||'').toUpperCase());});
        k.status_pencairan=allValid&&real?'SELESAI':(repair?'PERBAIKAN DOKUMEN':'MENUNGGU VERIFIKASI DOKUMEN');
      }
    }
    writeDashboardCache(dashboard);
    renderAll();
    hideLoading();
    alert(r.message||'Status diperbarui');
    syncDashboardSilentV111();
  }catch(e){
    hideLoading();
    alert('Gagal: '+(e.message||e));
  }
};

/* =========================================================
   SIMPROV v112 - Honorarium dan persetujuan realisasi
   ========================================================= */
function honorRowV112(k){
  k=k||{};
  const rate=toNumber(k.harga_satuan)||0;
  return `<div class="honor-row-v112 honor-row-v87">
    <div class="field"><label>Nama Penerima</label><input class="hnama" placeholder="Nama lengkap" autocomplete="off"></div>
    <div class="field"><label>NIK/NPWP (16 Digit)</label><input class="hnik" inputmode="numeric" maxlength="16" placeholder="16 digit angka" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,16)"></div>
    <div class="field"><label>Jabatan / Peran</label><input class="hperan" placeholder="Contoh: Peserta"></div>
    <div class="field"><label>Volume</label><input class="hvol" inputmode="numeric" value="1" min="1" step="1" oninput="this.value=this.value.replace(/[^0-9]/g,'')"></div>
    <div class="field"><label>Satuan</label><input class="hsatuan" value="${esc(k.satuan||'Orang/Kegiatan')}" readonly></div>
    <div class="field"><label>Nilai Honor per Satuan</label><input class="htarif" value="${rate?Number(rate).toLocaleString('id-ID'):''}" data-value="${rate}" readonly tabindex="-1"></div>
    <div class="field"><label>Kategori</label><select class="hkategori" onchange="syncHonorTaxV112(this)"><option value="INPUT MANUAL" selected>Input Pajak Manual</option><option value="NON ASN">Non-ASN / Bukan Pegawai</option><option value="ASN I-II">ASN Golongan I–II</option><option value="ASN III">ASN Golongan III</option><option value="ASN IV/PEJABAT">ASN Golongan IV / Pejabat Negara</option></select></div>
    <div class="field"><label>Tarif PPh 21 (%)</label><input class="hpajak" value="" placeholder="Masukkan persen" inputmode="decimal"></div>
    <div class="honor-remove-wrap"><button class="btn-red" type="button" onclick="this.closest('.honor-row-v112').remove()">Hapus</button></div>
  </div>`;
}
function syncHonorTaxV112(sel){
  const input=sel.closest('.honor-row-v112')?.querySelector('.hpajak'); if(!input)return;
  const v=String(sel.value||'').toUpperCase();
  const rates={'NON ASN':'2,5','ASN I-II':'0','ASN III':'5','ASN IV/PEJABAT':'15'};
  if(v==='INPUT MANUAL'){input.readOnly=false;input.value='';input.placeholder='Masukkan persen';}
  else{input.readOnly=true;input.value=rates[v]||'0';input.placeholder='';}
}
openHonorModalV79=function(id){
  const k=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));
  if(!k){alert('Data kegiatan tidak ditemukan.');return;}
  const docs=typeof docsNonV79==='function'?docsNonV79(id):[];
  const adaPerbaikan=docs.some(d=>['PERBAIKAN DOKUMEN','PERBAIKAN','MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN'].includes(String(d.status_verifikasi||'').toUpperCase()));
  if(docs.some(d=>d.url_file)&&!adaPerbaikan){alert('Dokumen kegiatan sudah diupload. Dokumen honorarium tidak dapat dibuat ulang.');return;}
  let m=document.getElementById('honorModalV79');
  if(!m){m=document.createElement('div');m.id='honorModalV79';document.body.appendChild(m);}
  m.className='modal-backdrop honor-backdrop-v87';
  const latest=typeof latestNonV79==='function'?latestNonV79(id):null;
  m.innerHTML=`<div class="modal-card honor-modal-v92 fade-up">
    <div class="modal-head"><div><h3>Buat Dokumen Honorarium</h3><p>${esc(k.nama_kegiatan)} • ${esc(bidangName(k.id_bidang))}</p></div><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Tutup</button></div>
    <input type="hidden" id="honorKegV79" value="${esc(id)}">
    <div class="honor-modal-info-v81"><div><span>ID Kegiatan</span><b>${esc(k.id_kegiatan)}</b></div><div><span>Jenis</span><b>${esc(k.jenis_non_pengadaan||'Honorarium')}</b></div><div><span>Nilai Perencanaan</span><b>${rupiah(k.jumlah)}</b></div><div><span>Nilai Honor</span><b>${rupiah(k.harga_satuan)} per ${esc(k.satuan||'Satuan')}</b></div></div>
    <div class="honor-tax-note-v87"><b>Catatan:</b> Nilai honor mengikuti Harga Satuan Perencanaan dan tidak dapat diubah. Total honor tidak boleh melebihi Nilai Perencanaan.</div>
    <div class="honor-modal-body-v81"><div class="honor-head-row-v81"><span>Daftar Penerima Honorarium</span><button class="btn-soft" type="button" onclick="document.getElementById('honorRowsV79').insertAdjacentHTML('beforeend',honorRowV112(kegiatanById(document.getElementById('honorKegV79').value)))">+ Tambah Penerima</button></div><div id="honorRowsV79" class="honor-rows-v92">${honorRowV112(k)}</div></div>
    <div class="modal-actions honor-actions-v81"><button class="btn-soft" onclick="document.getElementById('honorModalV79').classList.add('hidden')">Batal</button><button id="btnGenerateHonorV81" class="btn-green" onclick="generateHonorV112()">${latest?.url_pdf?'Buat Versi Baru':'Buat Dokumen Honorarium'}</button></div>
  </div>`;
};
async function generateHonorV112(){
  const btn=document.getElementById('btnGenerateHonorV81'); if(btn?.dataset.busy==='1')return;
  const id=document.getElementById('honorKegV79')?.value||'';
  const k=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));
  if(!k){alert('Data kegiatan tidak ditemukan.');return;}
  const plannedRate=toNumber(k.harga_satuan)||0, plannedVolume=toNumber(k.volume)||0, plannedTotal=toNumber(k.jumlah)||0;
  const rows=[...document.querySelectorAll('#honorRowsV79 .honor-row-v112')];
  if(!rows.length){alert('Minimal satu penerima honor wajib diisi.');return;}
  const penerima=[];let totalVolume=0,totalBruto=0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i], nama=(r.querySelector('.hnama')?.value||'').trim(), nik=(r.querySelector('.hnik')?.value||'').replace(/\D/g,''), volume=toNumber(r.querySelector('.hvol')?.value), kategori=r.querySelector('.hkategori')?.value||'INPUT MANUAL', pajak=toNumber(r.querySelector('.hpajak')?.value);
    if(!nama){alert(`Nama penerima ke-${i+1} wajib diisi.`);return;}
    if(!/^\d{16}$/.test(nik)){alert(`NIK/NPWP penerima ke-${i+1} wajib tepat 16 digit.`);return;}
    if(!volume||volume<=0){alert(`Volume penerima ke-${i+1} wajib diisi.`);return;}
    if(!plannedRate){alert('Nilai Honor belum tersedia dari Perencanaan.');return;}
    if(pajak<0||pajak>100){alert(`Tarif PPh 21 penerima ke-${i+1} harus 0–100%.`);return;}
    totalVolume+=volume; totalBruto+=volume*plannedRate;
    penerima.push({nama_penerima:nama,nik_npwp:nik,jabatan_peran:r.querySelector('.hperan')?.value||'',volume,satuan:k.satuan||'Orang/Kegiatan',tarif_honor:plannedRate,kategori_pajak:kategori,jenis_pajak:'PPh 21',tarif_pajak:pajak,nilai_pajak:0});
  }
  // Volume pada setiap penerima adalah pengali honor penerima tersebut.
  // Validasi utama menggunakan total bruto agar pembuatan versi baru tidak salah menghitung akumulasi volume.
  if(plannedTotal>0&&totalBruto>plannedTotal){alert(`Total honor ${rupiah(totalBruto)} melebihi Nilai Perencanaan ${rupiah(plannedTotal)}.`);return;}
  btn.dataset.busy='1';btn.disabled=true;btn.textContent='Memproses...';showLoading('Membuat dokumen honorarium...');
  try{const res=await apiPost({action:'generateHonorPdf',user:currentUser,data:{id_kegiatan:id,penerima}});if(!res.success)throw new Error(res.message||'Gagal membuat dokumen');document.getElementById('honorModalV79')?.classList.add('hidden');alert(res.message||'Dokumen berhasil dibuat');if(res.url_pdf)window.open(res.url_pdf,'_blank');syncDashboardSilentV111();}
  catch(e){alert(e.message||String(e));}
  finally{hideLoading();btn.dataset.busy='0';btn.disabled=false;btn.textContent='Buat Dokumen Honorarium';}
}
function verifikasiRealisasiNonV112(id,mode){
  const input=document.getElementById('npKoreksiNilaiV110');
  const nilai=input?valRupiahV96('npKoreksiNilaiV110'):0;
  const catatan=(document.getElementById('npKoreksiCatatanV110')?.value||'').trim();
  if(mode==='PERBAIKI'&&!catatan){alert('Catatan perbaikan wajib diisi.');return;}
  if(mode==='PERBAIKI'&&nilai<=0){alert('Nilai hasil perbaikan wajib diisi.');return;}
  if(!confirm(mode==='SETUJUI'?'Setujui nilai realisasi ini?':'Simpan perbaikan nilai realisasi?'))return;
  showLoading(mode==='SETUJUI'?'Menyetujui nilai realisasi...':'Menyimpan perbaikan nilai...');
  apiPost({action:'verifikasiRealisasiNonV112',user:currentUser,id_kegiatan:id,keputusan:mode,nilai_realisasi:nilai,catatan:catatan}).then(r=>{if(!r.success)throw new Error(r.message||'Gagal');alert(r.message||'Berhasil');return loadDashboard(false);}).then(()=>renderAll()).catch(e=>alert(e.message||String(e))).finally(hideLoading);
}
const __renderDetailNonV112Base=renderDetailNonPengadaanV95;
renderDetailNonPengadaanV95=function(k){
  const out=__renderDetailNonV112Base.apply(this,arguments);
  if(canManage()||isVerifierV77()){
    const real=(dashboard?.realisasi||[]).find(r=>String(r.id_kegiatan)===String(k.id_kegiatan)&&String(r.status||'').toUpperCase()!=='DIBATALKAN');
    if(real&&String(real.status||'').toUpperCase()!=='FINAL'){
      const btn=document.querySelector('button[onclick^="koreksiRealisasiNonV110"]');
      if(btn){btn.outerHTML=`<div class="realisasi-verif-actions-v112"><button class="btn-green" type="button" onclick="verifikasiRealisasiNonV112('${esc(k.id_kegiatan)}','SETUJUI')">Setujui Nilai Realisasi</button><button class="btn-orange" type="button" onclick="verifikasiRealisasiNonV112('${esc(k.id_kegiatan)}','PERBAIKI')">Perbaiki Nilai Realisasi</button></div>`;}
    }
  }
  return out;
};

/* =========================================================
   SIMPROV v113 - Finalisasi Non Pengadaan, Ringkasan Kontekstual,
   dan Nilai Honor mengikuti volume
   ========================================================= */
function isRealFinalV113(real){
  return !!real && ['FINAL','DISETUJUI','SELESAI','SAH'].includes(String(real.status||'').toUpperCase());
}
function latestNonRealV113_(idKegiatan){
  const rows=(dashboard?.realisasi||[]).filter(r=>String(r.id_kegiatan)===String(idKegiatan)&&String(r.status||'').toUpperCase()!=='DIBATALKAN');
  if(!rows.length) return null;
  const finals=rows.filter(isRealFinalV113);
  const source=finals.length?finals:rows;
  return source.slice().sort((a,b)=>{
    const ra=toNumber(a._row), rb=toNumber(b._row);
    if(ra||rb) return rb-ra;
    const da=new Date(a.tanggal_input||a.tanggal_realisasi||0).getTime()||0;
    const db=new Date(b.tanggal_input||b.tanggal_realisasi||0).getTime()||0;
    return db-da;
  })[0]||null;
}

nonPipelineV103=function(k,n,docs,real){
  const up=s=>String(s||'').toUpperCase();
  const latest=latestRequiredNonDocsV109(docs);
  const approved=up(k.status_perencanaan)==='DISETUJUI';
  const isHonor=up(k.jenis_non_pengadaan||'').includes('HONOR');
  const generated=!isHonor||!!n?.url_pdf;
  const complete=latest.length===2&&latest.every(d=>d.url_file);
  const hasRepair=latest.some(d=>['PERBAIKAN DOKUMEN','PERBAIKAN'].includes(up(d.status_verifikasi)));
  const waitingRepair=latest.some(d=>up(d.status_verifikasi)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN');
  const allValid=complete&&latest.every(d=>up(d.status_verifikasi)==='VALID DOKUMEN');
  const latestReal=latestNonRealV113_(k.id_kegiatan)||real;
  const realFinal=isRealFinalV113(latestReal);
  const final=up(k.status_pencairan)==='SELESAI'||up(n?.status)==='SELESAI';
  const stages=[
    {no:1,label:'Perencanaan Disetujui',state:approved?'done':''},
    {no:2,label:'Dokumen Honor Dibuat',state:generated?'done':''},
    {no:3,label:'Dokumen Wajib Diunggah',state:hasRepair?'repair':(complete?'done':(waitingRepair?'waiting':''))},
    {no:4,label:'Pencatatan Realisasi',state:latestReal?'done':(complete?'waiting':'')},
    {no:5,label:'Verifikasi Dokumen',state:(allValid&&realFinal)?'done':(hasRepair?'repair':((complete||waitingRepair||latestReal)?'waiting':''))},
    {no:6,label:'Selesai',state:final?'done':((allValid&&realFinal)?'waiting':'')}
  ];
  return `<div class="pipeline-v103">${stages.map(x=>statusPipelineNonV104(x,x.state)).join('')}</div>`;
};

async function selesaikanPaketNonPengadaanV116(id){
  if(!confirm('Selesaikan paket Non Pengadaan ini? Setelah selesai, pipeline akan ditutup.')) return;
  showLoading('Menyelesaikan paket Non Pengadaan...');
  try{
    const r=await apiPost({action:'selesaikanPaketNonPengadaanV116',user:currentUser,id_kegiatan:id});
    if(!r.success) throw new Error(r.message||'Gagal menyelesaikan paket');
    await loadDashboard(false);
    renderAll();
    alert(r.message||'Paket Non Pengadaan selesai');
  }catch(e){alert(e.message||String(e));}
  finally{hideLoading();}
}

const __renderDetailNonV113Base=renderDetailNonPengadaanV95;
renderDetailNonPengadaanV95=function(k){
  const result=__renderDetailNonV113Base.apply(this,arguments);
  const docs=(dashboard?.dokumenNonPengadaan||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const latest=latestRequiredNonDocsV109(docs);
  const real=latestNonRealV113_(k.id_kegiatan);
  const n=(typeof latestNonV79==='function')?latestNonV79(k.id_kegiatan):null;
  const allValid=latest.length===2&&latest.every(d=>String(d.status_verifikasi||'').toUpperCase()==='VALID DOKUMEN'&&!!d.url_file);
  const realFinal=isRealFinalV113(real);
  const final=String(k.status_pencairan||'').toUpperCase()==='SELESAI'||String(n?.status||'').toUpperCase()==='SELESAI';
  if(final){
    const badgeEl=document.querySelector('.package-topbar-v95 .status-badge-v60, .detail-backbar-v95 .status-badge-v60');
    if(badgeEl){badgeEl.className='status-badge-v60 status-green';badgeEl.textContent='SELESAI';}
  }else if(isVerifierV77()&&allValid&&realFinal&&!document.getElementById('finalizeNonPackageV116')){
    const area=document.getElementById('contentArea');
    if(area) area.insertAdjacentHTML('beforeend',`<section id="finalizeNonPackageV116" class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Finalisasi Paket</h3><p class="panel-sub">Dokumen dan nilai realisasi telah valid. Klik tombol di bawah untuk menutup paket.</p></div></div><button class="btn-green" type="button" onclick="selesaikanPaketNonPengadaanV116('${esc(k.id_kegiatan)}')">Selesai Paket</button></section>`);
  }
  return result;
};

function dokumenSummaryByMenuV113(){
  const peng=(dashboard?.dokumen||[]).filter(d=>d&&d.url_file);
  const non=(dashboard?.dokumenNonPengadaan||[]).filter(d=>d&&d.url_file);
  const menu=String(activeMenu||'');
  if(menu==='Non Pengadaan'||menu==='Pencatatan Non Pengadaan') return non;
  if(menu==='Pencairan'||menu==='Pencatatan Pengadaan'||menu==='Pengadaan Langsung') return peng;
  return peng.concat(non);
}

renderSummary=function(){
  const wrap=document.getElementById('summaryCards');
  if(!wrap||!dashboard){if(wrap)wrap.innerHTML='';return;}
  const sum=getDashboardSummaryV81();
  const docs=dokumenSummaryByMenuV113();
  const valid=docs.filter(isDocValidV64).length;
  if(canSeeAll()){
    wrap.innerHTML=card('Total Pagu',rupiah(sum.total_pagu))
      +card('Total Perencanaan',rupiah(sum.total_perencanaan))
      +card('Total Realisasi',rupiah(sum.total_realisasi))
      +card('Sisa Pagu',rupiah(sum.sisa_pagu))
      +card('Dokumen Valid',`${valid}/${docs.length}`);
  }else{
    const r=(dashboard.rekap||[]).find(x=>String(x.id_bidang)===String(currentUser.id_bidang))||{};
    const realisasiBidang=toNumber(r.total_realisasi);
    wrap.innerHTML=card('Pagu Bidang',rupiah(r.pagu))
      +card('Total Perencanaan',rupiah(r.total_perencanaan))
      +card('Total Realisasi',rupiah(realisasiBidang))
      +card('Sisa Pagu',rupiah(toNumber(r.pagu)-realisasiBidang))
      +card('Status Akses',r.status_akses||'-');
  }
};

function syncHonorAmountV113(input){
  const row=input?.closest('.honor-row-v112'); if(!row)return;
  const vol=Math.max(0,toNumber(row.querySelector('.hvol')?.value));
  const rate=toNumber(row.dataset.unitRate);
  const total=vol*rate;
  const out=row.querySelector('.htarif');
  if(out){out.value=Number(total||0).toLocaleString('id-ID');out.dataset.value=String(total);}
}

honorRowV112=function(k){
  k=k||{};
  const rate=toNumber(k.harga_satuan)||0;
  return `<div class="honor-row-v112 honor-row-v87" data-unit-rate="${rate}">
    <div class="field"><label>Nama Penerima</label><input class="hnama" placeholder="Nama lengkap" autocomplete="off"></div>
    <div class="field"><label>NIK/NPWP (16 Digit)</label><input class="hnik" inputmode="numeric" maxlength="16" placeholder="16 digit angka" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,16)"></div>
    <div class="field"><label>Jabatan / Peran</label><input class="hperan" placeholder="Contoh: Peserta"></div>
    <div class="field"><label>Volume</label><input class="hvol" inputmode="numeric" value="1" min="1" step="1" oninput="this.value=this.value.replace(/[^0-9]/g,'');syncHonorAmountV113(this)"></div>
    <div class="field"><label>Satuan</label><input class="hsatuan" value="${esc(k.satuan||'Orang/Kegiatan')}" readonly></div>
    <div class="field"><label>Nilai Honor</label><input class="htarif" value="${rate?Number(rate).toLocaleString('id-ID'):''}" data-value="${rate}" readonly tabindex="-1" title="Volume × Harga Satuan Perencanaan"></div>
    <div class="field"><label>Kategori</label><select class="hkategori" onchange="syncHonorTaxV112(this)"><option value="INPUT MANUAL" selected>Input Pajak Manual</option><option value="NON ASN">Non-ASN / Bukan Pegawai</option><option value="ASN I-II">ASN Golongan I–II</option><option value="ASN III">ASN Golongan III</option><option value="ASN IV/PEJABAT">ASN Golongan IV / Pejabat Negara</option></select></div>
    <div class="field"><label>Tarif PPh 21 (%)</label><input class="hpajak" value="" placeholder="Masukkan persen" inputmode="decimal"></div>
    <div class="honor-remove-wrap"><button class="btn-red" type="button" onclick="this.closest('.honor-row-v112').remove()">Hapus</button></div>
  </div>`;
};

/* =========================================================
   SIMPROV v117 - Sinkron tampilan paket selesai & pipeline
   Pencatatan Pengadaan
   ========================================================= */
function paketSudahSelesaiV117(k){
  return String(getPencairanStatus(k.id_kegiatan)||k.status_pencairan||'').toUpperCase()==='SELESAI';
}

paketListHtmlV95 = function(list, opts){
  const q=String(paketSearchV95||'').toLowerCase();
  const filtered=list.filter(k=>!q||String(k.nama_kegiatan||'').toLowerCase().includes(q)||String(k.id_kegiatan||'').toLowerCase().includes(q)||bidangName(k.id_bidang).toLowerCase().includes(q)||paketStatusV95(k).toLowerCase().includes(q));
  const rows=filtered.map(k=>{
    const selesai=paketSudahSelesaiV117(k);
    return `<tr class="paket-row-v95 ${selesai?'paket-row-selesai-v117':''}">
      <td><a href="javascript:void(0)" onclick="bukaPaketV95('${esc(k.id_kegiatan)}')" class="paket-link-v95 ${selesai?'paket-link-selesai-v117':''}">${esc(k.nama_kegiatan)}</a> ${metodeBadgeV95(k)}</td>
      <td>${selesai?'<span class="paket-status-selesai-v117">Paket Sudah Selesai</span>':esc(paketStatusV95(k))}</td>
      <td>${esc(paketTanggalV95(k))}</td><td>${esc(bidangName(k.id_bidang))}</td>
      <td><button class="btn-soft paket-buka-v95" onclick="bukaPaketV95('${esc(k.id_kegiatan)}')" type="button">${esc(opts.aksiLabel||'Buka Paket')}</button></td></tr>`;
  }).join('');
  const buatBtn=(!canManage()&&!isReviewer())?`<button onclick="buatPaketV95()" type="button" class="paket-buat-v95">+ Buat Paket</button>`:'';
  return `<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>${esc(opts.judul)}</h3><p class="panel-sub">${opts.sub}</p></div><div class="action-group">${buatBtn}<button class="btn-refresh" onclick="refreshData()" type="button">Refresh Data</button></div></div>${opts.info||''}<div class="paket-toolbar-v95"><span>Tampilan <b id="paketCountV96">${filtered.length}</b> paket</span><input type="text" placeholder="Cari nama paket / bidang / status..." value="${esc(paketSearchV95)}" oninput="paketSearchV95=this.value;renderContent()"></div><div class="table-wrap"><table class="paket-table-v95"><thead><tr><th>Nama Paket</th><th>Status</th><th>Tanggal Buat</th><th>Bidang / Satuan Kerja</th><th>Aksi</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">Belum ada paket.</td></tr>'}</tbody></table></div></section>`;
};

function pipelinePencatatanPengadaanV117(k, docs, real){
  const required=dokumenKetentuanByMetode('BELANJA LANGSUNG');
  const byKey={};
  (docs||[]).forEach(d=>{byKey[dokKeyV94(d.jenis_dokumen)]=d;});
  const picked=required.map(j=>byKey[dokKeyV94(j)]).filter(Boolean);
  const complete=required.length>0&&picked.length===required.length&&picked.every(d=>d.url_file);
  const repair=picked.some(d=>['PERBAIKAN','PERBAIKAN DOKUMEN'].includes(String(d.status_verifikasi||'').toUpperCase()));
  const allValid=complete&&picked.every(d=>isDokValidV94(d));
  const hasReal=!!real;
  const final=paketSudahSelesaiV117(k);
  const stages=[
    {no:1,label:'Perencanaan Disetujui',state:String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI'?'done':''},
    {no:2,label:'Dokumen Wajib Diunggah',state:repair?'repair':(complete?'done':'')},
    {no:3,label:'Pencatatan Realisasi',state:hasReal?'done':(complete?'waiting':'')},
    {no:4,label:'Verifikasi Dokumen',state:allValid?'done':(repair?'repair':(complete?'waiting':''))},
    {no:5,label:'Selesai',state:final?'done':((allValid&&hasReal)?'waiting':'')}
  ];
  return `<div class="pipeline-v103 pipeline-pgd-v117">${stages.map(x=>statusPipelineNonV104(x,x.state)).join('')}</div>`;
}

renderDetailPencatatanV95 = function(k){
  const final=paketSudahSelesaiV117(k);
  const approved=String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const isBidangSendiri=!canManage()&&!isReviewer()&&String(k.id_bidang)===String(currentUser?.id_bidang||'');
  const jenisList=dokumenKetentuanByMetode('BELANJA LANGSUNG');
  const docs=(dashboard?.dokumen||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const real=(dashboard?.realisasi||[]).find(r=>String(r.id_kegiatan)===String(k.id_kegiatan)&&String(r.status||'').toUpperCase()!=='DIBATALKAN');
  const complete=jenisList.length>0&&jenisList.every(j=>docs.some(d=>dokKeyV94(d.jenis_dokumen)===dokKeyV94(j)&&d.url_file));
  const pagu=toNumber(k.jumlah);
  let catatHtml='';
  if(final){
    catatHtml=`<div class="selesai-banner-v96">✓ Paket sudah SELESAI dicatat.${real?` Nilai realisasi <b>${rupiah(real.nilai_realisasi)}</b>`:''}</div>`;
  }else if(!approved){
    catatHtml='<p class="empty">Perencanaan paket belum disetujui.</p>';
  }else if(isBidangSendiri){
    catatHtml=complete?`${penyediaDatalistV94()}<div class="form-grid"><div class="field"><label>Nama Penyedia / Toko *</label><input list="penyediaListV94" id="blPenyediaV94" placeholder="Nama penyedia"></div><div class="field"><label>Nilai Realisasi (Rp) *</label><input inputmode="numeric" id="blNilaiV94" data-max="${pagu}" oninput="onRupiahInputV96(this)" placeholder="Maks. ${rupiah(pagu)}"></div><div class="field"><label>Keterangan *</label><input id="blKetV94" placeholder="Uraian transaksi"></div></div><button onclick="submitCatatBLDetailV117('${esc(k.id_kegiatan)}')" type="button">Catat Realisasi</button>`:'<div class="notice-v103">Pencatatan realisasi terbuka setelah seluruh dokumen wajib diunggah.</div>';
  }else if(isPBJVerifierV65()){
    catatHtml=real?`<div class="notice-v103">Nilai realisasi tercatat: <b>${rupiah(real.nilai_realisasi)}</b>.</div>${!final?`<button class="btn-green" onclick="selesaikanBLV95('${esc(k.id_kegiatan)}')" type="button">Selesai Paket</button>`:''}`:'<p class="small">Menunggu pencatatan realisasi oleh User Bidang.</p>';
  }else catatHtml='<p class="small">Menunggu proses oleh User Bidang dan Verifikator.</p>';

  document.getElementById('contentArea').innerHTML=`${backBarV95(k,k.metode_pemilihan||'Belanja Langsung')}
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Tahapan Pencatatan Pengadaan</h3><p class="panel-sub">Proses dokumen, realisasi, pemeriksaan, dan penyelesaian ditampilkan secara berurutan.</p></div></div>${pipelinePencatatanPengadaanV117(k,docs,real)}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Dokumen Wajib</h3></div></div>${dokumenTableV95(k,jenisList,'PGD')}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Pencatatan Realisasi</h3></div></div>${catatHtml}</section>`;
};

async function submitCatatBLDetailV117(id){
  const nilai=valRupiahV96('blNilaiV94');
  const nama=(document.getElementById('blPenyediaV94')?.value||'').trim();
  const ket=(document.getElementById('blKetV94')?.value||'').trim();
  const k=kegiatanById(id), max=toNumber(k?.jumlah||0);
  if(!nama){alert('Nama penyedia wajib diisi.');return;}
  if(nilai<=0){alert('Nilai realisasi wajib diisi.');return;}
  if(max>0&&nilai>max){alert('Nilai realisasi tidak boleh melebihi '+rupiah(max)+'.');return;}
  if(!ket){alert('Keterangan wajib diisi.');return;}
  if(!confirm('Catat realisasi '+rupiah(nilai)+'?'))return;
  showLoading('Menyimpan nilai realisasi...');
  try{
    const r=await apiPost({action:'catatBelanjaLangsungV118',user:currentUser,id_kegiatan:id,nilai_realisasi:nilai,nama_penyedia:nama,nomor_bukti:'',keterangan:ket});
    if(!r.success)throw new Error(r.message||'Gagal mencatat realisasi');
    await loadDashboard(false);renderAll();alert(r.message||'Realisasi berhasil dicatat');
  }catch(e){alert(e.message||String(e));}finally{hideLoading();}
}


/* =========================================================
   SIMPROV v119 - Verifikasi nilai realisasi Pencatatan Pengadaan
   dan realisasi Non Pengadaan memakai nilai bruto
   ========================================================= */
function isRealFinalPengadaanV119(real){
  return !!real && ['FINAL','DISETUJUI','SELESAI','SAH'].includes(String(real.status||'').toUpperCase());
}
async function verifikasiRealisasiPengadaanV119(id, keputusan){
  const nilai=valRupiahV96('pgKoreksiNilaiV119');
  const catatan=(document.getElementById('pgKoreksiCatatanV119')?.value||'').trim();
  if(keputusan==='PERBAIKI'&&nilai<=0){alert('Nilai hasil perbaikan wajib diisi.');return;}
  if(keputusan==='PERBAIKI'&&!catatan){alert('Catatan perbaikan wajib diisi.');return;}
  if(!confirm(keputusan==='SETUJUI'?'Setujui nilai realisasi ini?':'Simpan koreksi nilai realisasi ini?'))return;
  showLoading(keputusan==='SETUJUI'?'Menyetujui nilai realisasi...':'Menyimpan koreksi nilai...');
  try{
    const r=await apiPost({action:'verifikasiRealisasiPengadaanV119',user:currentUser,id_kegiatan:id,keputusan,nilai_realisasi:nilai,catatan});
    if(!r.success)throw new Error(r.message||'Gagal memeriksa nilai realisasi');
    await loadDashboard(false);renderAll();alert(r.message||'Nilai realisasi berhasil diperiksa');
  }catch(e){alert(e.message||String(e));}finally{hideLoading();}
}

const __renderDetailPencatatanV119Base=renderDetailPencatatanV95;
renderDetailPencatatanV95=function(k){
  __renderDetailPencatatanV119Base.apply(this,arguments);
  if(!(isPBJVerifierV65()||canManage()))return;
  const final=paketSudahSelesaiV117(k);
  const real=(dashboard?.realisasi||[]).find(r=>String(r.id_kegiatan)===String(k.id_kegiatan)&&String(r.status||'').toUpperCase()!=='DIBATALKAN');
  const panels=[...document.querySelectorAll('#contentArea section.panel')];
  const target=panels.find(x=>x.querySelector('h3')?.textContent.trim()==='Pencatatan Realisasi');
  if(!target||!real||final)return;
  const nilai=toNumber(real.nilai_realisasi);
  if(isRealFinalPengadaanV119(real)){
    target.innerHTML=`<div class="panel-head"><div><h3>Pencatatan Realisasi</h3></div></div><div class="notice-v103">Nilai realisasi telah disetujui: <b>${rupiah(nilai)}</b>.</div><button class="btn-green" onclick="selesaikanBLV95('${esc(k.id_kegiatan)}')" type="button">Selesai Paket</button>`;
  }else{
    target.innerHTML=`<div class="panel-head"><div><h3>Pencatatan Realisasi</h3><p class="panel-sub">Periksa nilai yang dicatat oleh User Bidang. Nilai dapat disetujui atau dikoreksi oleh Verifikator.</p></div></div>
      <div class="notice-v103">Nilai realisasi tercatat: <b>${rupiah(nilai)}</b>.</div>
      <div class="form-grid"><div class="field"><label>Nilai Realisasi Hasil Pemeriksaan (Rp)</label><input inputmode="numeric" id="pgKoreksiNilaiV119" value="${Number(nilai).toLocaleString('id-ID')}" data-max="${toNumber(k.jumlah)}" oninput="onRupiahInputV96(this)"></div><div class="field span-2"><label>Catatan Koreksi</label><input id="pgKoreksiCatatanV119" placeholder="Wajib diisi apabila nilai diperbaiki"></div></div>
      <div class="realisasi-verif-actions-v112"><button class="btn-green" type="button" onclick="verifikasiRealisasiPengadaanV119('${esc(k.id_kegiatan)}','SETUJUI')">Setujui Nilai Realisasi</button><button class="btn-orange" type="button" onclick="verifikasiRealisasiPengadaanV119('${esc(k.id_kegiatan)}','PERBAIKI')">Perbaiki Nilai Realisasi</button></div>`;
  }
};

const __pipelinePencatatanPengadaanV119Base=pipelinePencatatanPengadaanV117;
pipelinePencatatanPengadaanV117=function(k,docs,real){
  const html=__pipelinePencatatanPengadaanV119Base(k,docs,real);
  if(!real||isRealFinalPengadaanV119(real))return html;
  return html.replace('Pencatatan Realisasi</', 'Pencatatan Realisasi</');
};

/* =========================================================
   SIMPROV v120 - Fokus Pencatatan Pengadaan
   Non Pengadaan tidak diubah.
   ========================================================= */
function realisasiPengadaanAktifV120(id){
  const rows=(dashboard?.realisasi||[]).filter(r=>String(r.id_kegiatan)===String(id)&&String(r.kategori||'').toUpperCase()!=='NON PENGADAAN'&&!['DIBATALKAN','BATAL'].includes(String(r.status||'').toUpperCase()));
  return rows.length?rows[rows.length-1]:null;
}

const __paketStatusV120Base=paketStatusV95;
paketStatusV95=function(k){
  if(isNonKategoriV81(k)) return __paketStatusV120Base(k);
  const sp=String(k.status_perencanaan||'').toUpperCase();
  if(sp!=='DISETUJUI') return __paketStatusV120Base(k);
  if(paketSudahSelesaiV117(k)) return 'Paket Sudah Selesai';
  const real=realisasiPengadaanAktifV120(k.id_kegiatan);
  if(real){
    const rs=String(real.status||'').toUpperCase();
    if(['FINAL','DISETUJUI','SELESAI','SAH'].includes(rs)) return 'MENUNGGU FINALISASI';
    return 'MENUNGGU VERIFIKASI NILAI REALISASI';
  }
  const jenis=dokumenKetentuanByMetode('BELANJA LANGSUNG');
  const docs=(dashboard?.dokumen||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const complete=jenis.length>0&&jenis.every(j=>docs.some(d=>dokKeyV94(d.jenis_dokumen)===dokKeyV94(j)&&d.url_file));
  if(complete) return 'MENUNGGU PENCATATAN REALISASI';
  return __paketStatusV120Base(k);
};

pipelinePencatatanPengadaanV117=function(k,docs,real){
  const required=dokumenKetentuanByMetode('BELANJA LANGSUNG');
  const byKey={};
  (docs||[]).forEach(d=>{byKey[dokKeyV94(d.jenis_dokumen)]=d;});
  const picked=required.map(j=>byKey[dokKeyV94(j)]).filter(Boolean);
  const complete=required.length>0&&picked.length===required.length&&picked.every(d=>d.url_file);
  const repair=picked.some(d=>['PERBAIKAN','PERBAIKAN DOKUMEN'].includes(String(d.status_verifikasi||'').toUpperCase()));
  const allValid=complete&&picked.every(d=>isDokValidV94(d));
  const hasReal=!!real;
  const realFinal=isRealFinalPengadaanV119(real);
  const final=paketSudahSelesaiV117(k);
  const stages=[
    {no:1,label:'Perencanaan Disetujui',state:String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI'?'done':''},
    {no:2,label:'Dokumen Wajib Diunggah',state:repair?'repair':(complete?'done':'')},
    {no:3,label:'Pencatatan Realisasi',state:realFinal?'done':(hasReal?'waiting':(complete?'waiting':''))},
    {no:4,label:'Verifikasi Dokumen & Realisasi',state:(allValid&&realFinal)?'done':(repair?'repair':((complete||hasReal)?'waiting':''))},
    {no:5,label:'Selesai',state:final?'done':((allValid&&realFinal)?'waiting':'')}
  ];
  return `<div class="pipeline-v103 pipeline-pgd-v117">${stages.map(x=>statusPipelineNonV104(x,x.state)).join('')}</div>`;
};

renderDetailPencatatanV95=function(k){
  const final=paketSudahSelesaiV117(k);
  const approved=String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const isBidangSendiri=!canManage()&&!isReviewer()&&String(k.id_bidang)===String(currentUser?.id_bidang||'');
  const jenisList=dokumenKetentuanByMetode('BELANJA LANGSUNG');
  const docs=(dashboard?.dokumen||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const real=realisasiPengadaanAktifV120(k.id_kegiatan);
  const complete=jenisList.length>0&&jenisList.every(j=>docs.some(d=>dokKeyV94(d.jenis_dokumen)===dokKeyV94(j)&&d.url_file));
  const allValid=complete&&jenisList.every(j=>{const d=docs.find(x=>dokKeyV94(x.jenis_dokumen)===dokKeyV94(j));return d&&isDokValidV94(d);});
  const pagu=toNumber(k.jumlah);
  let catatHtml='';

  if(final){
    catatHtml=`<div class="selesai-banner-v96">✓ Paket sudah SELESAI dicatat.${real?` Nilai realisasi <b>${rupiah(real.nilai_realisasi)}</b>`:''}</div>`;
  }else if(!approved){
    catatHtml='<p class="empty">Perencanaan paket belum disetujui.</p>';
  }else if(isBidangSendiri){
    if(real){
      const rf=isRealFinalPengadaanV119(real);
      catatHtml=`<div class="notice-v103"><b>Nilai realisasi telah dicatat: ${rupiah(real.nilai_realisasi)}</b><br>Status: ${rf?'NILAI REALISASI DISETUJUI. Menunggu finalisasi paket.':'MENUNGGU VERIFIKASI. Nilai diperiksa bersama dokumen oleh Verifikator.'}</div>`;
    }else if(complete){
      catatHtml=`${penyediaDatalistV94()}<div class="form-grid"><div class="field"><label>Nama Penyedia / Toko *</label><input list="penyediaListV94" id="blPenyediaV94" placeholder="Nama penyedia"></div><div class="field"><label>Nilai Realisasi (Rp) *</label><input inputmode="numeric" id="blNilaiV94" data-max="${pagu}" oninput="onRupiahInputV96(this)" placeholder="Maks. ${rupiah(pagu)}"></div><div class="field"><label>Keterangan *</label><input id="blKetV94" placeholder="Uraian transaksi"></div></div><button onclick="submitCatatBLDetailV117('${esc(k.id_kegiatan)}')" type="button">Catat Realisasi</button>`;
    }else{
      catatHtml='<div class="notice-v103">Pencatatan realisasi terbuka setelah seluruh dokumen wajib diunggah.</div>';
    }
  }else if(isPBJVerifierV65()||canManage()){
    if(!real){
      catatHtml='<p class="small">Menunggu pencatatan realisasi oleh User Bidang.</p>';
    }else if(isRealFinalPengadaanV119(real)){
      catatHtml=`<div class="notice-v103"><b>Nilai realisasi telah disetujui: ${rupiah(real.nilai_realisasi)}</b></div>${allValid?`<section class="finalisasi-inline-v120"><h4>Finalisasi Paket</h4><p class="small">Dokumen dan nilai realisasi telah valid.</p><button class="btn-green" onclick="selesaikanBLV95('${esc(k.id_kegiatan)}')" type="button">Selesai Paket</button></section>`:'<p class="small">Menunggu seluruh dokumen dinyatakan valid.</p>'}`;
    }else{
      const nilai=toNumber(real.nilai_realisasi);
      catatHtml=`<div class="notice-v103"><b>Nilai realisasi telah dicatat: ${rupiah(nilai)}</b><br>Status: MENUNGGU VERIFIKASI. Periksa nilai bersama dokumen.</div>
      <div class="form-grid"><div class="field"><label>Nilai Realisasi Hasil Pemeriksaan (Rp)</label><input inputmode="numeric" id="pgKoreksiNilaiV119" value="${Number(nilai).toLocaleString('id-ID')}" data-max="${pagu}" oninput="onRupiahInputV96(this)"></div><div class="field span-2"><label>Catatan Koreksi</label><input id="pgKoreksiCatatanV119" placeholder="Wajib diisi apabila nilai diperbaiki"></div></div>
      <div class="realisasi-verif-actions-v112"><button class="btn-green" type="button" onclick="verifikasiRealisasiPengadaanV119('${esc(k.id_kegiatan)}','SETUJUI')">Setujui Nilai Realisasi</button><button class="btn-orange" type="button" onclick="verifikasiRealisasiPengadaanV119('${esc(k.id_kegiatan)}','PERBAIKI')">Perbaiki Nilai Realisasi</button></div>`;
    }
  }else{
    catatHtml='<p class="small">Menunggu proses oleh User Bidang dan Verifikator.</p>';
  }

  document.getElementById('contentArea').innerHTML=`${backBarV95(k,k.metode_pemilihan||'Belanja Langsung')}
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Tahapan Pencatatan Pengadaan</h3><p class="panel-sub">Proses dokumen, realisasi, pemeriksaan, dan penyelesaian ditampilkan secara berurutan.</p></div></div>${pipelinePencatatanPengadaanV117(k,docs,real)}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Dokumen Wajib</h3></div></div>${dokumenTableV95(k,jenisList,'PGD')}</section>
    <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Pencatatan Realisasi</h3></div></div>${catatHtml}</section>`;
};


/* =========================================================
   SIMPROV v121 - Bukti Pembelian & Template HPS Opsional
   Fokus Pencatatan Pengadaan; Non Pengadaan tidak diubah.
   ========================================================= */
function hpsOptionalRowV121(data){
  data=data||{};
  return `<tr class="hps-opt-row-v121">
    <td><input class="hps-opt-uraian" value="${esc(data.uraian||'')}"></td>
    <td><input class="hps-opt-spesifikasi" value="${esc(data.spesifikasi||'')}"></td>
    <td><input class="hps-opt-vol" inputmode="decimal" value="${esc(String(data.vol||1))}" oninput="hitungHpsOptionalV121()"></td>
    <td><input class="hps-opt-satuan" value="${esc(data.satuan||'Paket')}"></td>
    <td><input class="hps-opt-harga" inputmode="numeric" value="${Number(data.harga||0).toLocaleString('id-ID')}" oninput="onRupiahInputV96(this);hitungHpsOptionalV121()"></td>
    <td class="hps-opt-jumlah">${rupiah((Number(data.vol)||0)*(Number(data.harga)||0))}</td>
    <td><button class="btn-red" type="button" onclick="this.closest('tr').remove();hitungHpsOptionalV121()">Hapus</button></td>
  </tr>`;
}
function addHpsOptionalRowV121(){document.getElementById('hpsOptBodyV121')?.insertAdjacentHTML('beforeend',hpsOptionalRowV121());hitungHpsOptionalV121();}
function hitungHpsOptionalV121(){
  let total=0;
  document.querySelectorAll('.hps-opt-row-v121').forEach(tr=>{
    const v=parseFloat((tr.querySelector('.hps-opt-vol')?.value||'0').replace(',','.'))||0;
    const h=toNumber(tr.querySelector('.hps-opt-harga')?.value||0); const t=v*h; total+=t;
    const c=tr.querySelector('.hps-opt-jumlah'); if(c)c.textContent=rupiah(t);
  });
  const el=document.getElementById('hpsOptTotalV121');if(el)el.textContent=rupiah(total);return Math.round(total);
}
function collectHpsOptionalV121(){return [...document.querySelectorAll('.hps-opt-row-v121')].map(tr=>({
  uraian:tr.querySelector('.hps-opt-uraian')?.value.trim()||'',
  spesifikasi:tr.querySelector('.hps-opt-spesifikasi')?.value.trim()||'',
  vol:parseFloat((tr.querySelector('.hps-opt-vol')?.value||'0').replace(',','.'))||0,
  satuan:tr.querySelector('.hps-opt-satuan')?.value.trim()||'',
  harga:toNumber(tr.querySelector('.hps-opt-harga')?.value||0),pajak:0,keterangan:''
}));}
function bukaHpsOptionalV121(id){
  const k=kegiatanById(id)||{};
  const proc=(dashboard?.prosesPengadaanV96||[]).find(x=>String(x.id_kegiatan)===String(id))||{};
  let rows=[];const raw=String(proc.spesifikasi_teknis||'');
  if(raw.startsWith('[HPSJSON]')){try{rows=JSON.parse(raw.slice(9))||[]}catch(e){}}
  if(!rows.length)rows=[{uraian:k.nama_kegiatan||'',spesifikasi:k.keterangan||'',vol:toNumber(k.volume)||1,satuan:k.satuan||'Paket',harga:Math.round(toNumber(k.jumlah)/(toNumber(k.volume)||1))}];
  const bidang=(dashboard?.bidang||dashboard?.bidangs||[]).find(b=>String(b.id_bidang)===String(k.id_bidang))||{};
  const modal=document.createElement('div');modal.id='hpsOptionalModalV121';modal.className='modal';
  modal.innerHTML=`<div class="modal-card modal-wide-v121"><div class="modal-head"><div><h3>Input Spesifikasi Teknis dan HPS</h3><p class="panel-sub">Template ini opsional. Dokumen tetap dapat diunggah manual.</p></div><button class="btn-soft" onclick="document.getElementById('hpsOptionalModalV121').remove()">Tutup</button></div>
  <div class="form-grid"><div class="field"><label>Nomor Dokumen</label><input id="hpsOptNomorV121" placeholder="Nomor HPS"></div><div class="field"><label>Pejabat Penanda Tangan Komitmen</label><input id="hpsOptPejabatV121" value="${esc(bidang.pejabat_komitmen||'')}"></div><div class="field"><label>Nama Penyedia</label><input id="hpsOptPenyediaV121" value="${esc(proc.nama_penyedia_snapshot||'')}"></div></div>
  <div class="panel-title-row"><h4>Rincian HPS</h4><button class="btn-soft" onclick="addHpsOptionalRowV121()">+ Tambah Baris</button></div>
  <div class="table-wrap"><table class="hps-table-v105"><thead><tr><th>Uraian</th><th>Spesifikasi Barang</th><th>Volume</th><th>Satuan</th><th>Harga Satuan</th><th>Jumlah</th><th>Aksi</th></tr></thead><tbody id="hpsOptBodyV121">${rows.map(hpsOptionalRowV121).join('')}</tbody></table></div>
  <div class="hps-grand-v105">TOTAL NILAI HPS <b id="hpsOptTotalV121">Rp 0</b></div>
  <div class="action-group"><button class="btn-soft" onclick="simpanHpsOptionalV121('${esc(id)}',false)">Simpan Data HPS</button><button class="btn-green" onclick="simpanHpsOptionalV121('${esc(id)}',true)">Buat Template PDF</button></div></div>`;
  document.body.appendChild(modal);setTimeout(hitungHpsOptionalV121,0);
}
async function simpanHpsOptionalV121(id,buatPdf){
  const rows=collectHpsOptionalV121(), total=hitungHpsOptionalV121();
  if(!rows.length||rows.some(x=>!x.uraian||!x.spesifikasi||!x.satuan||x.vol<=0||x.harga<=0)){alert('Lengkapi seluruh rincian HPS.');return;}
  const k=kegiatanById(id)||{}; if(total>toNumber(k.jumlah)){alert('Total HPS tidak boleh melebihi nilai perencanaan.');return;}
  const nomor=document.getElementById('hpsOptNomorV121')?.value.trim()||'';
  const pejabat=document.getElementById('hpsOptPejabatV121')?.value.trim()||'';
  const penyedia=document.getElementById('hpsOptPenyediaV121')?.value.trim()||'';
  if(buatPdf&&(!nomor||!pejabat)){alert('Nomor dokumen dan pejabat penandatangan wajib diisi untuk membuat PDF.');return;}
  showLoading(buatPdf?'Membuat template HPS...':'Menyimpan data HPS...');
  try{
    let r=await apiPost({action:'saveProsesPengadaanV96',user:currentUser,data:{id_kegiatan:id,jalur_proses:'PENCATATAN PENGADAAN',nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows)}});
    if(!r.success)throw new Error(r.message||'Gagal menyimpan HPS');
    if(buatPdf){r=await apiPost({action:'generateProcurementTemplateV101',user:currentUser,data:{id_kegiatan:id,jenis_template:'SPESIFIKASI DAN HPS',nomor_dokumen:nomor,pejabat_penandatangan:pejabat,nama_penyedia:penyedia||'-',nilai_hps:total}});if(!r.success)throw new Error(r.message||'Gagal membuat PDF');if(r.url_file)window.open(r.url_file,'_blank');}
    await loadDashboard(false);document.getElementById('hpsOptionalModalV121')?.remove();renderAll();
  }catch(e){alert(e.message||String(e));}finally{hideLoading();}
}
function pasangTombolHpsOptionalV121(k){
  document.querySelectorAll('#contentArea tbody tr').forEach(tr=>{
    const cells=tr.querySelectorAll('td');if(!cells.length)return;
    if(dokKeyV94(cells[0].textContent)===dokKeyV94('Spesifikasi Teknis dan HPS')&&!tr.querySelector('.btn-hps-opt-v121')){
      const btn=document.createElement('button');btn.type='button';btn.className='btn-soft btn-hps-opt-v121';btn.textContent='Buat Template HPS';btn.onclick=()=>bukaHpsOptionalV121(k.id_kegiatan);cells[0].appendChild(document.createElement('br'));cells[0].appendChild(btn);
    }
  });
}
const __renderDetailPencatatanV121Base=renderDetailPencatatanV95;
renderDetailPencatatanV95=function(k){__renderDetailPencatatanV121Base(k);setTimeout(()=>pasangTombolHpsOptionalV121(k),0);};

/* =========================================================
   SIMPROV v122 - Modal HPS fixed, template cetak lokal,
   dan upload paralel lebih cepat.
   ========================================================= */
function closeHpsOptionalV122(){
  document.getElementById('hpsOptionalModalV121')?.remove();
  document.body.classList.remove('modal-open-v122');
}

bukaHpsOptionalV121=function(id){
  closeHpsOptionalV122();
  const k=kegiatanById(id)||{};
  const proc=(dashboard?.prosesPengadaanV96||[]).find(x=>String(x.id_kegiatan)===String(id))||{};
  let rows=[];const raw=String(proc.spesifikasi_teknis||'');
  if(raw.startsWith('[HPSJSON]')){try{rows=JSON.parse(raw.slice(9))||[]}catch(e){rows=[];}}
  if(!rows.length)rows=[{uraian:k.nama_kegiatan||'',spesifikasi:k.keterangan||'',vol:toNumber(k.volume)||1,satuan:k.satuan||'Paket',harga:Math.round(toNumber(k.jumlah)/(toNumber(k.volume)||1))}];
  const bidang=(dashboard?.bidang||dashboard?.bidangs||[]).find(b=>String(b.id_bidang)===String(k.id_bidang))||{};
  const modal=document.createElement('div');
  modal.id='hpsOptionalModalV121';
  modal.className='modal-backdrop hps-modal-backdrop-v122';
  modal.addEventListener('click',e=>{if(e.target===modal)closeHpsOptionalV122();});
  modal.innerHTML=`<div class="modal-card modal-wide-v121 hps-modal-card-v122" role="dialog" aria-modal="true">
    <div class="modal-head"><div><h3>Input Spesifikasi Teknis dan HPS</h3><p class="panel-sub">Template ini opsional. Dokumen tetap dapat diunggah manual.</p></div><button class="btn-soft" type="button" onclick="closeHpsOptionalV122()">Tutup</button></div>
    <div class="form-grid"><div class="field"><label>Nomor Dokumen</label><input id="hpsOptNomorV121" placeholder="Nomor HPS"></div><div class="field"><label>Pejabat Penanda Tangan Komitmen</label><input id="hpsOptPejabatV121" value="${esc(bidang.pejabat_komitmen||'')}"></div><div class="field"><label>Nama Penyedia</label><input id="hpsOptPenyediaV121" value="${esc(proc.nama_penyedia_snapshot||'')}"></div></div>
    <div class="panel-title-row"><h4>Rincian HPS</h4><button class="btn-soft" type="button" onclick="addHpsOptionalRowV121()">+ Tambah Baris</button></div>
    <div class="table-wrap hps-table-wrap-v122"><table class="hps-table-v105"><thead><tr><th>Uraian</th><th>Spesifikasi Barang</th><th>Volume</th><th>Satuan</th><th>Harga Satuan</th><th>Jumlah</th><th>Aksi</th></tr></thead><tbody id="hpsOptBodyV121">${rows.map(hpsOptionalRowV121).join('')}</tbody></table></div>
    <div class="hps-grand-v105">TOTAL NILAI HPS <b id="hpsOptTotalV121">Rp 0</b></div>
    <div class="action-group"><button class="btn-soft" type="button" onclick="simpanHpsOptionalV121('${esc(id)}',false)">Simpan Data HPS</button><button class="btn-green" type="button" onclick="bukaTemplateCetakHpsV122('${esc(id)}')">Buka Template Cetak</button></div>
  </div>`;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open-v122');
  setTimeout(()=>{hitungHpsOptionalV121();modal.querySelector('input')?.focus();},0);
};

function escapePrintV122(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
function buildHpsPrintHtmlV122(meta,rows,total){
  const tanggal=new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
  const body=rows.map((x,i)=>`<tr><td>${i+1}</td><td>${escapePrintV122(x.uraian)}</td><td>${escapePrintV122(x.spesifikasi)}</td><td>${escapePrintV122(x.vol)}</td><td>${escapePrintV122(x.satuan)}</td><td class="num">${rupiah(x.harga)}</td><td class="num">${rupiah(x.vol*x.harga)}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Spesifikasi Teknis dan HPS</title><style>
  @page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:12px}.toolbar{position:sticky;top:0;background:#eef6fd;padding:10px;display:flex;gap:8px;justify-content:flex-end;border-bottom:1px solid #cbdceb}.toolbar button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.print{background:#0f6fb3;color:white}.close{background:#e8eef4}.sheet{padding:18px 4px}.header{text-align:center}.header h1{font-size:18px;margin:0 0 6px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 28px;margin:20px 0}.meta div{display:grid;grid-template-columns:150px 10px 1fr}.meta b{font-weight:700}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #111;padding:7px;vertical-align:top}th{text-align:center;background:#f2f5f8}.num{text-align:right;white-space:nowrap}.total td{font-weight:700}.sign{margin-top:34px;display:flex;justify-content:flex-end}.signbox{text-align:center;width:360px}.space{height:78px}.notes{margin-top:26px;line-height:1.5}@media print{.toolbar{display:none}.sheet{padding:0}}
  </style></head><body><div class="toolbar"><button class="close" onclick="window.close()">Tutup</button><button class="print" onclick="window.print()">Cetak / Simpan PDF</button></div><div class="sheet"><div class="header"><h1>SPESIFIKASI TEKNIS DAN HARGA PERKIRAAN SENDIRI (HPS)</h1><b>${escapePrintV122(meta.namaKegiatan)}</b></div><div class="meta"><div><b>Nomor Dokumen</b><span>:</span><span>${escapePrintV122(meta.nomor||'-')}</span></div><div><b>Tanggal</b><span>:</span><span>${tanggal}</span></div><div><b>Bidang</b><span>:</span><span>${escapePrintV122(meta.bidang||'-')}</span></div><div><b>Nama Penyedia</b><span>:</span><span>${escapePrintV122(meta.penyedia||'-')}</span></div></div><table><thead><tr><th style="width:42px">No</th><th>Uraian</th><th>Spesifikasi Barang/Pekerjaan</th><th style="width:70px">Volume</th><th style="width:90px">Satuan</th><th style="width:120px">Harga Satuan</th><th style="width:125px">Jumlah</th></tr></thead><tbody>${body}<tr class="total"><td colspan="6" style="text-align:right">JUMLAH</td><td class="num">${rupiah(total)}</td></tr></tbody></table><div class="sign"><div class="signbox">Bogor, ${tanggal}<br>Pejabat Penanda Tangan Komitmen,<br>transaksi, kontrak/Surat Perintah Kerja<div class="space"></div><b>${escapePrintV122(meta.pejabat||'................................')}</b></div></div><div class="notes"><b>Catatan:</b><br>• Harga barang/jasa sudah termasuk pajak.<br>• Penyedia Barang/Jasa: ${escapePrintV122(meta.penyedia||'-')}</div></div></body></html>`;
}

async function bukaTemplateCetakHpsV122(id){
  const rows=collectHpsOptionalV121(),total=hitungHpsOptionalV121();
  if(!rows.length||rows.some(x=>!x.uraian||!x.spesifikasi||!x.satuan||x.vol<=0||x.harga<=0)){alert('Lengkapi seluruh rincian HPS.');return;}
  const k=kegiatanById(id)||{};
  if(total>toNumber(k.jumlah)){alert('Total HPS tidak boleh melebihi nilai perencanaan.');return;}
  const nomor=document.getElementById('hpsOptNomorV121')?.value.trim()||'';
  const pejabat=document.getElementById('hpsOptPejabatV121')?.value.trim()||'';
  const penyedia=document.getElementById('hpsOptPenyediaV121')?.value.trim()||'';
  if(!nomor||!pejabat){alert('Nomor dokumen dan pejabat penandatangan wajib diisi.');return;}
  const win=window.open('about:blank','_blank');
  if(!win){alert('Popup diblokir browser. Izinkan popup untuk membuka template cetak.');return;}
  const bidang=(dashboard?.bidang||dashboard?.bidangs||[]).find(b=>String(b.id_bidang)===String(k.id_bidang))||{};
  win.document.open();win.document.write(buildHpsPrintHtmlV122({nomor,pejabat,penyedia,namaKegiatan:k.nama_kegiatan||'',bidang:bidang.nama_bidang||k.nama_bidang||''},rows,total));win.document.close();
  // Simpan data ke backend tanpa menahan pembukaan template.
  apiPost({action:'saveProsesPengadaanV96',user:currentUser,data:{id_kegiatan:id,jalur_proses:'PENCATATAN PENGADAAN',nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows)}}).then(r=>{if(r?.success){const p=(dashboard?.prosesPengadaanV96||[]).find(x=>String(x.id_kegiatan)===String(id));if(p)Object.assign(p,{nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows)});writeDashboardCache(dashboard);}}).catch(()=>{});
}

simpanHpsOptionalV121=async function(id,buatPdf){
  if(buatPdf){return bukaTemplateCetakHpsV122(id);}
  const rows=collectHpsOptionalV121(),total=hitungHpsOptionalV121();
  if(!rows.length||rows.some(x=>!x.uraian||!x.spesifikasi||!x.satuan||x.vol<=0||x.harga<=0)){alert('Lengkapi seluruh rincian HPS.');return;}
  const k=kegiatanById(id)||{};if(total>toNumber(k.jumlah)){alert('Total HPS tidak boleh melebihi nilai perencanaan.');return;}
  const penyedia=document.getElementById('hpsOptPenyediaV121')?.value.trim()||'';
  showLoading('Menyimpan data HPS...');
  try{const r=await apiPost({action:'saveProsesPengadaanV96',user:currentUser,data:{id_kegiatan:id,jalur_proses:'PENCATATAN PENGADAAN',nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows)}});if(!r.success)throw new Error(r.message||'Gagal menyimpan HPS');const p=(dashboard?.prosesPengadaanV96||[]).find(x=>String(x.id_kegiatan)===String(id));if(p)Object.assign(p,{nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows)});writeDashboardCache(dashboard);closeHpsOptionalV122();renderAll();alert('Data HPS berhasil disimpan.');syncDashboardSilentV111();}catch(e){alert(e.message||String(e));}finally{hideLoading();}
};

/* Upload dokumen paralel (maks. 3 bersamaan) agar paket banyak dokumen lebih cepat. */
async function runPoolV122(items,limit,worker){let next=0;const runners=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=next++;if(i>=items.length)return;await worker(items[i],i);}});await Promise.all(runners);}
uploadSemuaDokV96=async function(idKegiatan){
  const inputs=Array.from(document.querySelectorAll('.dok-file-v96')).filter(f=>f.files?.length);
  if(!inputs.length){alert('Pilih file pada baris dokumen dulu.');return;}
  showLoading('Menyiapkan '+inputs.length+' dokumen...');
  try{
    const prepared=await Promise.all(inputs.map(async inp=>{const file=inp.files[0];return{inp,file,base64:await fileToBase64(file)};}));
    let ok=0;const gagal=[];
    await runPoolV122(prepared,3,async(item,i)=>{
      const inp=item.inp,file=item.file,jenis=inp.dataset.jenis,ctx=inp.dataset.ctx,isRevisi=inp.dataset.repair==='1'&&inp.dataset.idd;
      const lt=document.getElementById('loadingText');if(lt)lt.innerText='Mengunggah '+(i+1)+'/'+prepared.length+': '+jenis+'...';
      try{let r;if(isRevisi){r=ctx==='NON'?await apiPost({action:'revisiDokumenNonPengadaan',user:currentUser,id_dokumen_non:inp.dataset.idd,file_name:file.name,mime_type:file.type,file_base64:item.base64}):await apiPost({action:'revisiDokumen',user:currentUser,id_dokumen:inp.dataset.idd,file_name:file.name,mime_type:file.type,file_base64:item.base64});}else{r=await apiPost({action:ctx==='NON'?'uploadDokumenNonPengadaan':'uploadDokumen',user:currentUser,id_kegiatan:idKegiatan,jenis_dokumen:jenis,file_name:file.name,mime_type:file.type,file_base64:item.base64});}if(r.success){ok++;updateDokumenLokalV111(ctx,!!isRevisi,inp.dataset.idd,r.dokumen);}else{gagal.push(jenis+': '+(r.message||'gagal'));}}catch(e){gagal.push(jenis+': '+(e.message||e));}
    });
    const kegiatan=kegiatanById(idKegiatan);if(kegiatan&&ok)kegiatan.status_pencairan='MENUNGGU VERIFIKASI DOKUMEN';writeDashboardCache(dashboard);renderAll();alert(ok+' dokumen berhasil diupload.'+(gagal.length?'\nGagal:\n- '+gagal.join('\n- '):''));syncDashboardSilentV111();
  }catch(e){alert('Gagal menyiapkan/upload dokumen: '+(e.message||e));}finally{hideLoading();}
};

/* =========================================================
   SIMPROV v123 - Fokus Pengadaan Langsung
   - Lihat paket dari Data Perencanaan
   - Urutan menu: Pengadaan Langsung sebelum Pencatatan
   - Tahap 1-6 dapat diunggah tanpa menunggu verifikasi tahap sebelumnya
   - Tahap 7 terbuka setelah seluruh dokumen tahap 1-6 VALID
   - Semua generator template berupa tampilan cetak/browser; tidak membuat file Drive
   - Referensi format resmi dibuka dari tautan yang ditetapkan Admin
   ========================================================= */

const TEMPLATE_ACUAN_PL_V123 = {
  'Hasil Survey Harga': 'https://docs.google.com/document/d/14j7drG8yHZNDkt_JoEbuJcevlBtZRyiw/edit?usp=sharing&ouid=112056673586247860314&rtpof=true&sd=true',
  'Spesifikasi Teknis dan HPS': 'https://docs.google.com/document/d/1qhYrUspAPu8I3qbez51bQf5uFSF2QnJ7/edit?usp=sharing&ouid=112056673586247860314&rtpof=true&sd=true',
  'Surat Perintah Kerja': 'https://docs.google.com/document/d/1AFFVucVcGGs7SnacuPnI1UK-whdtjO4O/edit?usp=sharing&ouid=112056673586247860314&rtpof=true&sd=true',
  'Berita Acara Pemeriksaan Barang/Pekerjaan': 'https://docs.google.com/document/d/1YkKKI-6XT1ep5UjeFtuuVy7s2Z2jgD0p/edit?usp=sharing&ouid=112056673586247860314&rtpof=true&sd=true',
  'Berita Acara Serah Terima': 'https://docs.google.com/document/d/1R5i8yL5HmPhOxxn9DU2CNc6BMEHdRI9N/edit?usp=sharing&ouid=112056673586247860314&rtpof=true&sd=true',
  'Kuitansi / Nota / Invoice': 'https://docs.google.com/document/d/1lxYNMR_IMlRpTZcir2oLapQFKrKTvG2z/edit?usp=sharing&ouid=112056673586247860314&rtpof=true&sd=true'
};

/* Pastikan dokumen Bukti Pembelian/Kwitansi masuk Tahap Pembayaran agar
   sama dengan ketentuan backend dan finalisasi tidak tertahan. */
(function syncTahapPembayaranV123(){
  const t=(typeof TAHAPAN_PL_V94!=='undefined'?TAHAPAN_PL_V94:[]).find(x=>Number(x.no)===7);
  if(t && !t.dok.some(x=>dokKeyV94(x)===dokKeyV94('Bukti Pembelian / Kwitansi'))){
    const pos=Math.max(1,t.dok.findIndex(x=>dokKeyV94(x)===dokKeyV94('Kuitansi / Nota / Invoice'))+1);
    t.dok.splice(pos,0,'Bukti Pembelian / Kwitansi');
  }
})();

/* Urutan menu sesuai alur kerja. */
const __menuItemsV123Base = menuItemsV83;
menuItemsV83 = function(){
  const items=__menuItemsV123Base().map(x=>x.slice());
  const order=['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pengadaan Langsung','Pencairan','Non Pengadaan','Manajemen Akses','Laporan'];
  return items.sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0]));
};

function latestDocMapPLV123(id){
  const out={};
  (dashboard?.dokumen||[]).filter(d=>String(d.id_kegiatan)===String(id)).forEach(d=>{
    out[dokKeyV94(d.jenis_dokumen)]=d;
  });
  return out;
}
function statusDocPLV123(d){return String(d?.status_verifikasi||'').toUpperCase();}
function isRepairDocPLV123(d){return ['PERBAIKAN','PERBAIKAN DOKUMEN'].includes(statusDocPLV123(d));}
function isWaitingRepairDocPLV123(d){return statusDocPLV123(d)==='MENUNGGU VERIFIKASI PERBAIKAN DOKUMEN';}
function tahapStatePLV123(k){
  const map=latestDocMapPLV123(k.id_kegiatan);
  return tahapanDefFeV95(metodeKegiatanV94(k)).map(t=>{
    const docs=t.dok.map(j=>({jenis:j,doc:map[dokKeyV94(j)]||null}));
    const uploaded=docs.length>0&&docs.every(x=>!!x.doc?.url_file);
    const valid=uploaded&&docs.every(x=>isDokValidV94(x.doc));
    const repair=docs.some(x=>isRepairDocPLV123(x.doc));
    const waitingRepair=docs.some(x=>isWaitingRepairDocPLV123(x.doc));
    const countUpload=docs.filter(x=>!!x.doc?.url_file).length;
    const countValid=docs.filter(x=>x.doc&&isDokValidV94(x.doc)).length;
    return {no:t.no,nama:t.nama,dok:t.dok,docs,uploaded,valid,repair,waitingRepair,countUpload,countValid};
  });
}
function realisasiPLV123(id){
  if(typeof realisasiPengadaanAktifV120==='function') return realisasiPengadaanAktifV120(id);
  const rows=(dashboard?.realisasi||[]).filter(r=>String(r.id_kegiatan)===String(id)&&String(r.kategori||'').toUpperCase()!=='NON PENGADAAN'&&!['BATAL','DIBATALKAN'].includes(String(r.status||'').toUpperCase()));
  return rows.length?rows[rows.length-1]:null;
}
function processPLV123(id){
  const rows=(dashboard?.prosesPengadaanV96||dashboard?.prosesPengadaan||[]).filter(x=>String(x.id_kegiatan)===String(id));
  return rows.length?rows[rows.length-1]:{};
}
function priorStagesValidPLV123(states){return states.slice(0,6).every(x=>x.valid);}
function packageFinalPLV123(k){return String(k.status_pencairan||getPencairanStatus(k.id_kegiatan)||'').toUpperCase()==='SELESAI';}
function currentStagePLV123(k,states,real){
  const first=states.slice(0,6).find(x=>!x.valid);
  if(first)return first.no;
  return 7;
}
function stageStatusTextPLV123(s,opened,final){
  if(final)return 'Selesai';
  if(s.valid)return 'Selesai';
  if(s.repair)return 'Perlu Perbaikan';
  if(s.waitingRepair)return 'Menunggu Verifikasi Perbaikan';
  if(s.uploaded)return 'Menunggu Verifikasi';
  if(s.countUpload>0)return `${s.countUpload}/${s.dok.length} Dokumen Diunggah`;
  return opened?'Siap Dikerjakan':'Belum Dibuka';
}

/* Status daftar paket selalu mengikuti posisi proses aktual. */
const __paketStatusV123Base = paketStatusV95;
paketStatusV95 = function(k){
  if(!isPipelineV94(k))return __paketStatusV123Base(k);
  if(String(k.status_perencanaan||'').toUpperCase()!=='DISETUJUI')return __paketStatusV123Base(k);
  if(packageFinalPLV123(k))return 'Paket Sudah Selesai';
  const states=tahapStatePLV123(k),real=realisasiPLV123(k.id_kegiatan),preValid=priorStagesValidPLV123(states),st7=states[6];
  if(!preValid){
    const s=states.slice(0,6).find(x=>!x.valid)||states[0];
    if(s.repair)return `TAHAP ${s.no} PERLU PERBAIKAN`;
    if(s.uploaded||s.waitingRepair)return `MENUNGGU VERIFIKASI TAHAP ${s.no}`;
    if(s.countUpload>0)return `TAHAP ${s.no} — DOKUMEN BELUM LENGKAP`;
    return `TAHAP ${s.no} — ${s.nama.toUpperCase()}`;
  }
  if(!st7.uploaded)return 'TAHAP 7 — PEMBAYARAN';
  if(st7.repair)return 'PEMBAYARAN PERLU PERBAIKAN';
  if(!real)return st7.valid?'MENUNGGU PENCATATAN REALISASI':'MENUNGGU VERIFIKASI DOKUMEN PEMBAYARAN';
  if(!isRealFinalPengadaanV119(real))return 'MENUNGGU VERIFIKASI NILAI REALISASI';
  if(!st7.valid)return 'MENUNGGU VERIFIKASI DOKUMEN PEMBAYARAN';
  return 'MENUNGGU FINALISASI';
};

function closeModalPLV123(){
  document.getElementById('modalPLV123')?.remove();
  document.body.classList.remove('modal-open-v122');
}
function modalShellPLV123(title,sub,body){
  closeModalPLV123();
  const modal=document.createElement('div');
  modal.id='modalPLV123';
  modal.className='modal-backdrop modal-pl-v123';
  modal.innerHTML=`<div class="modal-card modal-stage-v123"><div class="modal-head"><div><small class="eyebrow-v123">PENGADAAN LANGSUNG</small><h3>${esc(title)}</h3><p class="panel-sub">${esc(sub||'')}</p></div><button class="btn-soft" type="button" onclick="closeModalPLV123()">Tutup</button></div><div class="modal-stage-body-v123">${body}</div></div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)closeModalPLV123();});
  document.body.appendChild(modal);
  document.body.classList.add('modal-open-v122');
  return modal;
}

function openTemplateSourceV123(url){
  const w=window.open(url,'_blank','noopener');
  if(!w)alert('Popup diblokir browser. Izinkan popup untuk membuka template.');
}
function genericTemplateHtmlV123(k,jenis){
  const tanggal=new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
  const bidang=(dashboard?.bidang||dashboard?.bidangs||[]).find(b=>String(b.id_bidang)===String(k.id_bidang))||{};
  const pejabat=bidang.pejabat_komitmen||'-';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapePrintV122(jenis)}</title><style>@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:12px}.toolbar{position:sticky;top:0;padding:10px;background:#eef6fd;display:flex;justify-content:flex-end;gap:8px;border-bottom:1px solid #ccddeb}.toolbar button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.print{background:#0f6fb3;color:#fff}.close{background:#e9eef3}.sheet{padding:18px}.head{text-align:center;margin-bottom:28px}.head h1{font-size:18px;margin:0 0 8px}.meta{display:grid;grid-template-columns:150px 12px 1fr;gap:6px;margin-bottom:22px}.box{border:1px solid #111;min-height:310px;padding:14px}.sign{display:flex;justify-content:flex-end;margin-top:30px}.sign div{text-align:center;width:330px}.space{height:80px}@media print{.toolbar{display:none}.sheet{padding:0}}</style></head><body><div class="toolbar"><button class="close" onclick="window.close()">Tutup</button><button class="print" onclick="window.print()">Cetak / Simpan PDF</button></div><div class="sheet"><div class="head"><h1>${escapePrintV122(jenis.toUpperCase())}</h1><b>${escapePrintV122(k.nama_kegiatan||'')}</b></div><div class="meta"><b>ID Kegiatan</b><span>:</span><span>${escapePrintV122(k.id_kegiatan||'-')}</span><b>Bidang</b><span>:</span><span>${escapePrintV122(bidang.nama_bidang||bidangName(k.id_bidang)||'-')}</span><b>Nilai Perencanaan</b><span>:</span><span>${escapePrintV122(rupiah(k.jumlah||0))}</span><b>Tanggal</b><span>:</span><span>${escapePrintV122(tanggal)}</span></div><div class="box"><b>Isi Dokumen:</b><br><br></div><div class="sign"><div>Bogor, ${escapePrintV122(tanggal)}<br>Pejabat Penanda Tangan Komitmen<div class="space"></div><b>${escapePrintV122(pejabat)}</b></div></div></div></body></html>`;
}
function openGenericTemplateV123(id,jenis){
  const k=kegiatanById(id);if(!k)return alert('Data kegiatan tidak ditemukan.');
  const w=window.open('about:blank','_blank');
  if(!w)return alert('Popup diblokir browser. Izinkan popup untuk membuka template cetak.');
  w.document.open();w.document.write(genericTemplateHtmlV123(k,jenis));w.document.close();
}
function templateButtonsStageV123(k,stage){
  return `<div class="template-stage-grid-v123">${stage.dok.map(j=>{
    const source=TEMPLATE_ACUAN_PL_V123[j];
    return `<article class="template-item-v123"><div><b>${esc(j)}</b><small>${source?'Template acuan tersedia.':'Belum tersedia template acuan.'}</small></div><div class="action-group">${source?`<button class="btn-soft" type="button" onclick="openTemplateSourceV123('${esc(source)}')">Buka Template</button>`:''}</div></article>`;
  }).join('')}</div>`;
}
function openAllTemplatesPLV123(id){
  const k=kegiatanById(id);if(!k)return;
  const states=tahapStatePLV123(k);
  const body=states.map(s=>`<section class="template-stage-section-v123"><h4>Tahap ${s.no} — ${esc(s.nama)}</h4>${templateButtonsStageV123(k,s)}</section>`).join('');
  modalShellPLV123('Template Dokumen',k.nama_kegiatan,body);
}
function openRingkasanDokumenPLV123(id){
  const k=kegiatanById(id);if(!k)return;
  const states=tahapStatePLV123(k);
  const rows=states.flatMap(s=>s.docs.map(x=>{
    const d=x.doc;
    return `<tr><td>${s.no}</td><td>${esc(s.nama)}</td><td>${esc(x.jenis)}</td><td>${d?`<a target="_blank" href="${esc(d.url_file||'#')}">${esc(d.nama_file||'Buka File')}</a>`:'Belum diunggah'}</td><td>${d?badge(d.status_verifikasi||'MENUNGGU'):'-'}</td></tr>`;
  })).join('');
  modalShellPLV123('Ringkasan Dokumen',k.nama_kegiatan,`<div class="table-wrap"><table><thead><tr><th>Tahap</th><th>Nama Tahap</th><th>Jenis Dokumen</th><th>File</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}

/* Tabel khusus tahapan: tetap cepat, mendukung upload sekaligus, revisi,
   verifikasi per baris/massal, dan terkunci setelah paket selesai. */
function dokumenTahapPLV123(k,jenisList){
  const docs=(dashboard?.dokumen||[]).filter(d=>String(d.id_kegiatan)===String(k.id_kegiatan));
  const final=packageFinalPLV123(k);
  const owner=!canManage()&&!isReviewer()&&String(k.id_bidang)===String(currentUser?.id_bidang||'')&&String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI';
  const bolehUpload=owner&&!final;
  const verifier=isPBJVerifierV65()||canManage();
  let adaPending=false;
  const rows=jenisList.map(j=>{
    const d=[...docs].reverse().find(x=>dokKeyV94(x.jenis_dokumen)===dokKeyV94(j));
    const st=statusDocPLV123(d),valid=d&&isDokValidV94(d),repair=d&&isRepairDocPLV123(d),waitingRepair=d&&isWaitingRepairDocPLV123(d);
    const canChoose=bolehUpload&&(!d||repair);
    const idd=d?.id_dokumen||'';
    const bisaVerif=d&&verifier&&!valid&&!repair;
    if(bisaVerif)adaPending=true;
    const cek=verifier?`<td>${bisaVerif?`<input type="checkbox" class="dok-cek-v108" data-idd="${esc(idd)}" data-ctx="PGD" onchange="updateBulkBarV108()">`:'-'}</td>`:'';
    const upload=canChoose?`<input type="file" class="dok-file-v96" data-jenis="${esc(j)}" data-ctx="PGD" data-idd="${esc(idd)}" data-repair="${repair?'1':'0'}" onchange="this.closest('tr').classList.toggle('siap-upload-v96',this.files.length>0);tampilkanTombolUploadV96()">`:(d?`<span class="muted kecil-v96">${repair?'Upload ulang tersedia':(waitingRepair?'Menunggu verifikasi perbaikan':'Sudah diupload')}</span>`:'<span class="muted kecil-v96">-</span>');
    const hist=d?`<button class="btn-mini btn-detail" type="button" onclick="openDocStatusModal('${esc(idd)}')">Riwayat</button>`:'-';
    const aksi=bisaVerif?`<button class="btn-soft" type="button" onclick="verifDokV96('${esc(idd)}','VALID','PGD')">Valid</button> <button class="btn-red" type="button" onclick="verifDokV96('${esc(idd)}','PERBAIKAN','PGD')">Perbaikan</button>`:'-';
    return `<tr>${cek}<td>${esc(j)}</td><td>${d?`<a href="${esc(d.url_file)}" target="_blank">${esc(d.nama_file||'Buka File')}</a>`:'<span class="muted">Belum diupload</span>'}</td><td>${d?badge(d.status_verifikasi||'MENUNGGU'):'-'}</td>${bolehUpload?`<td>${upload}</td>`:''}<td>${d?esc(d.catatan_admin||d.catatan_verifikator||'-'):'-'}</td><td>${hist}</td><td>${aksi}</td></tr>`;
  }).join('');
  const uploadBar=bolehUpload?`<div class="dok-upload-bar-v96 hidden" id="dokUploadBarV96"><span id="dokUploadInfoV96"></span><button type="button" onclick="uploadSemuaDokV96('${esc(k.id_kegiatan)}')">Upload Semua File</button></div>`:'';
  const bulk=verifier&&adaPending?`<div class="bulk-verif-bar-v108"><label><input type="checkbox" id="cekSemuaV108" onchange="document.querySelectorAll('.dok-cek-v108[data-idd]').forEach(c=>c.checked=this.checked);updateBulkBarV108()"> Pilih semua</label><b id="bulkInfoV108">0 dipilih</b><button type="button" onclick="bulkVerifV108('VALID')">Valid-kan Terpilih</button><button class="btn-red" type="button" onclick="bulkVerifV108('PERBAIKAN')">Perbaikan Terpilih</button></div>`:'';
  return `${final?'<div class="selesai-banner-v96">Paket telah selesai. Seluruh data dan dokumen terkunci.</div>':''}${uploadBar}${bulk}<div class="table-wrap"><table class="dok-table-v96"><thead><tr>${verifier?'<th>Pilih</th>':''}<th>Jenis Dokumen</th><th>File</th><th>Status</th>${bolehUpload?'<th>Upload File</th>':''}<th>Catatan</th><th>Riwayat</th><th>Verifikasi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function realisasiTahap7PLV123(k,stage7){
  const final=packageFinalPLV123(k),real=realisasiPLV123(k.id_kegiatan),pagu=toNumber(k.jumlah),owner=!canManage()&&!isReviewer()&&String(k.id_bidang)===String(currentUser?.id_bidang||'');
  if(final)return `<div class="selesai-banner-v96">Paket sudah selesai.${real?` Nilai realisasi <b>${rupiah(real.nilai_realisasi)}</b>.`:''}</div>`;
  if(owner){
    if(real){
      const rf=isRealFinalPengadaanV119(real);
      return `<div class="notice-v103"><b>Nilai realisasi telah dicatat: ${rupiah(real.nilai_realisasi)}</b><br>Status: ${rf?'DISETUJUI VERIFIKATOR — menunggu finalisasi paket.':'MENUNGGU VERIFIKASI NILAI REALISASI.'}</div>`;
    }
    if(!stage7.uploaded)return '<div class="notice-v103">Unggah seluruh dokumen pembayaran terlebih dahulu, kemudian catat nilai realisasi.</div>';
    const proc=processPLV123(k.id_kegiatan);
    return `${penyediaDatalistV94()}<div class="form-grid"><div class="field"><label>Nama Penyedia *</label><input list="penyediaListV94" id="blPenyediaV94" value="${esc(proc.nama_penyedia_snapshot||'')}" placeholder="Nama penyedia"></div><div class="field"><label>Nilai Realisasi / Kontrak (Rp) *</label><input inputmode="numeric" id="blNilaiV94" data-max="${pagu}" oninput="onRupiahInputV96(this)" placeholder="Maks. ${rupiah(pagu)}"></div><div class="field"><label>Keterangan *</label><input id="blKetV94" placeholder="Uraian transaksi"></div></div><button type="button" onclick="submitCatatBLDetailV117('${esc(k.id_kegiatan)}')">Catat Realisasi</button>`;
  }
  if(isPBJVerifierV65()||canManage()){
    if(!real)return '<p class="small">Menunggu User Bidang mengunggah dokumen pembayaran dan mencatat nilai realisasi.</p>';
    const nilai=toNumber(real.nilai_realisasi);
    if(!isRealFinalPengadaanV119(real))return `<div class="notice-v103"><b>Nilai realisasi tercatat: ${rupiah(nilai)}</b><br>Periksa dan setujui atau koreksi nilai berikut.</div><div class="form-grid"><div class="field"><label>Nilai Realisasi Hasil Pemeriksaan (Rp)</label><input inputmode="numeric" id="pgKoreksiNilaiV119" value="${Number(nilai).toLocaleString('id-ID')}" data-max="${pagu}" oninput="onRupiahInputV96(this)"></div><div class="field span-2"><label>Catatan Koreksi</label><input id="pgKoreksiCatatanV119" placeholder="Wajib diisi apabila nilai diperbaiki"></div></div><div class="realisasi-verif-actions-v112"><button class="btn-green" type="button" onclick="verifikasiRealisasiPengadaanV119('${esc(k.id_kegiatan)}','SETUJUI')">Setujui Nilai Realisasi</button><button class="btn-orange" type="button" onclick="verifikasiRealisasiPengadaanV119('${esc(k.id_kegiatan)}','PERBAIKI')">Perbaiki Nilai Realisasi</button></div>`;
    if(!stage7.valid)return `<div class="notice-v103"><b>Nilai realisasi telah disetujui: ${rupiah(nilai)}</b><br>Menunggu seluruh dokumen pembayaran dinyatakan valid.</div>`;
    return `<div class="notice-v103"><b>Nilai realisasi telah disetujui: ${rupiah(nilai)}</b><br>Seluruh dokumen pembayaran valid. Paket siap difinalisasi.</div><button class="btn-green" type="button" onclick="selesaikanBLV95('${esc(k.id_kegiatan)}')">Selesai Paket</button>`;
  }
  return '<p class="small">Menunggu proses User Bidang dan Verifikator.</p>';
}

function openTahapPLV123(id,no){
  const k=kegiatanById(id);if(!k)return alert('Paket tidak ditemukan.');
  const states=tahapStatePLV123(k),s=states.find(x=>x.no===Number(no));if(!s)return;
  const preValid=priorStagesValidPLV123(states),owner=!canManage()&&!isReviewer();
  if(Number(no)===7&&!preValid&&owner){alert('Tahap Pembayaran dibuka setelah seluruh dokumen Tahap 1 sampai Tahap 6 dinyatakan valid oleh Verifikator.');return;}
  const template=`<section class="stage-modal-section-v123"><div class="panel-title-row"><div><h4>Template Dokumen (Opsional)</h4><p class="panel-sub">Template tidak wajib digunakan. Dokumen final tetap diunggah secara manual.</p></div></div>${templateButtonsStageV123(k,s)}</section>`;
  const docs=`<section class="stage-modal-section-v123"><h4>Dokumen Tahap</h4>${dokumenTahapPLV123(k,s.dok)}</section>`;
  const real=Number(no)===7?`<section class="stage-modal-section-v123"><h4>Pencatatan Realisasi</h4>${realisasiTahap7PLV123(k,s)}</section>`:'';
  modalShellPLV123(`Tahap ${s.no} — ${s.nama}`,k.nama_kegiatan,template+docs+real);
}

function renderDetailPengadaanLangsungV123(k){
  const states=tahapStatePLV123(k),real=realisasiPLV123(k.id_kegiatan),proc=processPLV123(k.id_kegiatan),final=packageFinalPLV123(k),preValid=priorStagesValidPLV123(states),active=currentStagePLV123(k,states,real);
  const done=states.slice(0,6).filter(x=>x.valid).length+(final?1:0),pct=Math.round(done/7*100);
  const penyedia=proc.nama_penyedia_snapshot||proc.nama_penyedia||kontrakInfoFeV94(k).penyedia||'-';
  const nilaiHps=toNumber(proc.nilai_hps||0),nilaiReal=toNumber(real?.nilai_realisasi||proc.nilai_realisasi||0);
  const cards=states.map(s=>{
    const unlocked=final||s.no<=6||preValid||(isPBJVerifierV65()||canManage());
    const opened=unlocked;
    const stateClass=final||s.valid?'done':(s.repair?'repair':(s.uploaded||s.countUpload?'waiting':(unlocked?'open':'locked')));
    const status=stageStatusTextPLV123(s,opened,final);
    return `<article class="stage-card-v123 ${stateClass}"><div class="stage-card-head-v123"><span>${s.no}</span><small>${esc(status)}</small></div><h4>${esc(s.nama)}</h4><p>${s.countValid}/${s.dok.length} dokumen valid</p><button type="button" class="btn-soft" ${unlocked?`onclick="openTahapPLV123('${esc(k.id_kegiatan)}',${s.no})"`:'disabled'}>${unlocked?(final?'Lihat Tahap':'Kelola Tahap'):'Belum Dibuka'}</button></article>`;
  }).join('');
  document.getElementById('contentArea').innerHTML=`${backBarV95(k,k.metode_pemilihan||'Pengadaan Langsung')}
  <section class="panel fade-up premium-panel progress-pl-v123"><div class="progress-head-v123"><div><small>PROGRES PAKET</small><h3>${final?'Paket Selesai':`Tahap ${active} — ${esc(states[active-1]?.nama||'')}`}</h3><p>${done} dari 7 tahapan selesai.</p></div><div class="progress-circle-v123" style="--p:${pct}"><b>${pct}%</b></div></div><div class="progress-line-v123"><i style="width:${pct}%"></i></div><div class="summary-pl-v123"><div><span>Pagu Perencanaan</span><b>${rupiah(k.jumlah)}</b></div><div><span>Penyedia</span><b>${esc(penyedia||'Belum diisi')}</b></div><div><span>Nilai HPS</span><b>${rupiah(nilaiHps)}</b></div><div><span>Nilai Realisasi / Kontrak</span><b>${rupiah(nilaiReal)}</b></div></div><div class="action-group actions-pl-v123"><button type="button" onclick="openTahapPLV123('${esc(k.id_kegiatan)}',${active})">Kelola Tahap Aktif</button><button class="btn-soft" type="button" onclick="openAllTemplatesPLV123('${esc(k.id_kegiatan)}')">Template Dokumen</button><button class="btn-soft" type="button" onclick="openRingkasanDokumenPLV123('${esc(k.id_kegiatan)}')">Ringkasan Dokumen</button></div></section>
  <section class="panel fade-up premium-panel"><div class="panel-head"><div><h3>Tahapan Pengadaan</h3><p class="panel-sub">Tahap 1 sampai 6 dapat diunggah tanpa menunggu pemeriksaan tahap sebelumnya. Tahap Pembayaran dibuka setelah seluruh dokumen Tahap 1–6 valid.</p></div></div><div class="stage-grid-v123">${cards}</div></section>`;
}

renderDetailPengadaanLangsungV95 = function(k){return renderDetailPengadaanLangsungV123(k);};
renderPengadaanLangsungV95 = function(){
  const all=(dashboard?.perencanaan||[]).filter(k=>isProcurementV83(k)&&isPipelineV94(k)&&String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI');
  if(paketAktifV95){const k=all.find(x=>String(x.id_kegiatan)===String(paketAktifV95));if(k)return renderDetailPengadaanLangsungV123(k);paketAktifV95=null;}
  document.getElementById('contentArea').innerHTML=paketListHtmlV95(all,{judul:'Pengadaan Langsung',sub:'Paket yang telah disetujui diproses melalui tahapan dokumen, pemeriksaan, pembayaran, dan realisasi.',aksiLabel:'Buka Paket',butuhSetuju:true});
};

/* HPS Pengadaan Langsung memakai modal cetak lokal yang sama, tetapi jalur
   proses disimpan sebagai PENGADAAN LANGSUNG. */
function bukaHpsPengadaanLangsungV123(id){
  window.__hpsJalurV123='PENGADAAN LANGSUNG';
  bukaHpsOptionalV121(id);
}
const __bukaHpsOptionalV123Base=bukaHpsOptionalV121;
bukaHpsOptionalV121=function(id){
  if(!window.__hpsJalurV123){const k=kegiatanById(id);window.__hpsJalurV123=isPipelineV94(k)?'PENGADAAN LANGSUNG':'PENCATATAN PENGADAAN';}
  return __bukaHpsOptionalV123Base(id);
};
const __simpanHpsOptionalV123Base=simpanHpsOptionalV121;
simpanHpsOptionalV121=async function(id,buatPdf){
  if(buatPdf)return bukaTemplateCetakHpsV122(id);
  const rows=collectHpsOptionalV121(),total=hitungHpsOptionalV121();
  if(!rows.length||rows.some(x=>!x.uraian||!x.spesifikasi||!x.satuan||x.vol<=0||x.harga<=0)){alert('Lengkapi seluruh rincian HPS.');return;}
  const k=kegiatanById(id)||{};if(total>toNumber(k.jumlah)){alert('Total HPS tidak boleh melebihi nilai perencanaan.');return;}
  const penyedia=document.getElementById('hpsOptPenyediaV121')?.value.trim()||'';
  const jalur=isPipelineV94(k)?'PENGADAAN LANGSUNG':'PENCATATAN PENGADAAN';
  showLoading('Menyimpan data HPS...');
  try{const r=await apiPost({action:'saveProsesPengadaanV96',user:currentUser,data:{id_kegiatan:id,jalur_proses:jalur,nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows)}});if(!r.success)throw new Error(r.message||'Gagal menyimpan HPS');const p=(dashboard?.prosesPengadaanV96||[]).find(x=>String(x.id_kegiatan)===String(id));if(p)Object.assign(p,{nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows),jalur_proses:jalur});else{dashboard.prosesPengadaanV96=dashboard.prosesPengadaanV96||[];dashboard.prosesPengadaanV96.push({id_kegiatan:id,id_bidang:k.id_bidang,nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows),jalur_proses:jalur});}writeDashboardCache(dashboard);closeHpsOptionalV122();renderAll();alert('Data HPS berhasil disimpan.');syncDashboardSilentV111();}catch(e){alert(e.message||String(e));}finally{hideLoading();window.__hpsJalurV123='';}
};

/* Tombol Lihat Paket pada Data Perencanaan setelah disetujui. */
function lihatPaketDariPerencanaanV123(id){
  const k=kegiatanById(id);if(!k)return alert('Data perencanaan tidak ditemukan.');
  if(String(k.status_perencanaan||'').toUpperCase()!=='DISETUJUI')return alert('Perencanaan belum disetujui Verifikator.');
  paketAktifV95=String(id);paketSearchV95='';
  if(isNonKategoriV81(k))activeMenu='Non Pengadaan';
  else if(isPipelineV94(k))activeMenu='Pengadaan Langsung';
  else activeMenu='Pencairan';
  renderMenu();renderSummary();renderContent();updateIdentityHeaderV77();window.scrollTo({top:0,behavior:'smooth'});
}
function injectLihatPaketPerencanaanV123(){
  const approved=(dashboard?.perencanaan||[]).filter(k=>String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI');
  if(!approved.length)return;
  document.querySelectorAll('#contentArea table tbody tr').forEach(tr=>{
    const text=tr.textContent||'';
    const k=approved.find(x=>text.includes(String(x.id_kegiatan)));
    if(!k)return;
    const last=tr.querySelector('td:last-child');if(!last||last.querySelector('.btn-lihat-paket-v123'))return;
    const b=document.createElement('button');b.type='button';b.className='btn-mini btn-detail btn-lihat-paket-v123';b.textContent='Lihat Paket';b.onclick=()=>lihatPaketDariPerencanaanV123(k.id_kegiatan);last.appendChild(b);
  });
}
const __renderPerencanaanV123Base=renderPerencanaan;
renderPerencanaan=function(){const r=__renderPerencanaanV123Base.apply(this,arguments);setTimeout(injectLihatPaketPerencanaanV123,0);return r;};


/* v123 final safety: modal tahapan selalu ditutup saat konten dirender ulang,
   sehingga tidak ada popup lama/stale setelah upload atau verifikasi. */
const __renderAllV123Base=renderAll;
renderAll=function(){closeModalPLV123();return __renderAllV123Base.apply(this,arguments);};

/* Simpan HPS dari halaman cetak dengan jalur proses yang benar. */
bukaTemplateCetakHpsV122=async function(id){
  const rows=collectHpsOptionalV121(),total=hitungHpsOptionalV121();
  if(!rows.length||rows.some(x=>!x.uraian||!x.spesifikasi||!x.satuan||x.vol<=0||x.harga<=0)){alert('Lengkapi seluruh rincian HPS.');return;}
  const k=kegiatanById(id)||{};
  if(total>toNumber(k.jumlah)){alert('Total HPS tidak boleh melebihi nilai perencanaan.');return;}
  const nomor=document.getElementById('hpsOptNomorV121')?.value.trim()||'';
  const pejabat=document.getElementById('hpsOptPejabatV121')?.value.trim()||'';
  const penyedia=document.getElementById('hpsOptPenyediaV121')?.value.trim()||'';
  if(!nomor||!pejabat){alert('Nomor dokumen dan pejabat penandatangan wajib diisi.');return;}
  const win=window.open('about:blank','_blank');
  if(!win){alert('Popup diblokir browser. Izinkan popup untuk membuka template cetak.');return;}
  const bidang=(dashboard?.bidang||dashboard?.bidangs||[]).find(b=>String(b.id_bidang)===String(k.id_bidang))||{};
  win.document.open();win.document.write(buildHpsPrintHtmlV122({nomor,pejabat,penyedia,namaKegiatan:k.nama_kegiatan||'',bidang:bidang.nama_bidang||k.nama_bidang||''},rows,total));win.document.close();
  const jalur=isPipelineV94(k)?'PENGADAAN LANGSUNG':'PENCATATAN PENGADAAN';
  apiPost({action:'saveProsesPengadaanV96',user:currentUser,data:{id_kegiatan:id,jalur_proses:jalur,nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows)}}).then(r=>{
    if(!r?.success)return;
    dashboard.prosesPengadaanV96=dashboard.prosesPengadaanV96||[];
    let p=dashboard.prosesPengadaanV96.find(x=>String(x.id_kegiatan)===String(id));
    if(!p){p={id_kegiatan:id,id_bidang:k.id_bidang};dashboard.prosesPengadaanV96.push(p);}
    Object.assign(p,{nama_penyedia_snapshot:penyedia,nilai_hps:total,spesifikasi_teknis:'[HPSJSON]'+JSON.stringify(rows),jalur_proses:jalur});
    writeDashboardCache(dashboard);
  }).catch(()=>{});
};


/* =========================================================
   SIMPROV v125 - Template acuan Pengadaan Langsung saja
   - "Bukti Pembelian / Kwitansi" disatukan ke "Kuitansi / Nota / Invoice".
   - Dokumen wajib Belanja Langsung menjadi 10 jenis.
   - Data dokumen lama tetap tersimpan, tetapi tidak lagi dihitung sebagai syarat terpisah.
   ========================================================= */
(function fixDokumenWajibPencatatanV124(){
  const unified='Kuitansi / Nota / Invoice';
  const duplicate='Bukti Pembelian / Kwitansi';

  dokumenKetentuanByMetode = function(metode){
    const m=String(metode||'').toUpperCase();
    if(m==='BELANJA LANGSUNG') return [
      'Hasil Survey Harga',
      'Spesifikasi Teknis dan HPS',
      unified,
      'Berita Acara Pemeriksaan Barang/Pekerjaan',
      'Berita Acara Serah Terima',
      'Faktur Pembelian',
      'SPTJM',
      'Surat Permohonan Pembayaran',
      'Nota Dinas Pencairan',
      'Surat Perintah Pembayaran'
    ];
    if(m==='PENGADAAN LANGSUNG'||m==='TENDER MANUAL'){
      const out=[];
      tahapanDefFeV95(m).forEach(t=>t.dok.forEach(j=>{if(dokKeyV94(j)!==dokKeyV94(duplicate)&&!out.some(x=>dokKeyV94(x)===dokKeyV94(j)))out.push(j);}));
      return out;
    }
    return JENIS_DOKUMEN_SOP.filter(j=>dokKeyV94(j)!==dokKeyV94(duplicate));
  };
  dokumenKetentuanByNilai = function(jumlah){return dokumenKetentuanByMetode(metodePemilihanByNilai(jumlah));};
})();

/* =========================================================
   SIMPROV v126 - Revisi tampilan Perencanaan & modal Pengadaan Langsung
   - Non Pengadaan selalu menampilkan metode NON PENGADAAN.
   - Lihat Paket dipisah ke kolom tersendiri.
   - Modal Kelola Tahap dan Input HPS diperlebar.
   - Input HPS di dalam sistem dikembalikan khusus Spesifikasi Teknis dan HPS.
   Catatan: alur Pencatatan Non Pengadaan tidak diubah.
   ========================================================= */
function enhancePlanningTableV126(){
  const panels=[...document.querySelectorAll('#contentArea .panel, #contentArea section')];
  const panel=panels.find(p=>p.querySelector('table')&&/Data Perencanaan|Persetujuan Perencanaan|Pemeriksaan Data Perencanaan/i.test(p.textContent||''));
  if(!panel)return;
  const table=panel.querySelector('table');
  if(!table)return;
  const headRow=table.querySelector('thead tr');
  if(!headRow)return;
  const headers=[...headRow.children];
  let packageIndex=headers.findIndex(th=>String(th.textContent||'').trim().toUpperCase()==='PAKET');
  let actionIndex=headers.findIndex(th=>String(th.textContent||'').trim().toUpperCase()==='AKSI');
  if(actionIndex<0)actionIndex=headers.length-1;
  if(packageIndex<0){
    const th=document.createElement('th');
    th.textContent='Paket';
    th.className='paket-col-v126';
    headRow.insertBefore(th,headRow.children[actionIndex]);
    packageIndex=actionIndex;
  }
  table.querySelectorAll('tbody tr').forEach(tr=>{
    const cells=[...tr.children];
    if(!cells.length||tr.querySelector('td.empty'))return;
    const rowText=tr.textContent||'';
    const k=(dashboard?.perencanaan||[]).find(x=>rowText.includes(String(x.id_kegiatan||'')));
    if(!k)return;
    const isNon=isNonKategoriV81(k)||String(k.kategori||'').toUpperCase()==='NON PENGADAAN';
    const currentCells=[...tr.children];
    if(isNon&&currentCells[7])currentCells[7].innerHTML='<b>NON PENGADAAN</b>';
    let paketCell=tr.querySelector('td.paket-cell-v126');
    if(!paketCell){
      paketCell=document.createElement('td');
      paketCell.className='paket-cell-v126 nowrap';
      const last=tr.lastElementChild;
      tr.insertBefore(paketCell,last);
    }
    const oldButton=tr.lastElementChild?.querySelector('.btn-lihat-paket-v123');
    if(oldButton)paketCell.appendChild(oldButton);
    if(!paketCell.querySelector('.btn-lihat-paket-v123')&&String(k.status_perencanaan||'').toUpperCase()==='DISETUJUI'){
      const b=document.createElement('button');
      b.type='button';
      b.className='btn-mini btn-detail btn-lihat-paket-v123';
      b.textContent='Lihat Paket';
      b.onclick=()=>lihatPaketDariPerencanaanV123(k.id_kegiatan);
      paketCell.appendChild(b);
    }
  });
  table.classList.add('planning-table-v126');
}

const __renderPerencanaanV126Base=renderPerencanaan;
renderPerencanaan=function(){
  const r=__renderPerencanaanV126Base.apply(this,arguments);
  setTimeout(enhancePlanningTableV126,25);
  return r;
};

/* HPS dapat diisi langsung di sistem sekaligus tetap menyediakan format acuan. */
templateButtonsStageV123=function(k,stage){
  return `<div class="template-stage-grid-v123">${stage.dok.map(j=>{
    const source=TEMPLATE_ACUAN_PL_V123[j];
    const isHps=dokKeyV94(j)===dokKeyV94('Spesifikasi Teknis dan HPS');
    const actions=[];
    if(isHps)actions.push(`<button class="btn-green" type="button" onclick="bukaHpsPengadaanLangsungV123('${esc(k.id_kegiatan)}')">Isi HPS di Sistem</button>`);
    if(source)actions.push(`<button class="btn-soft" type="button" onclick="openTemplateSourceV123('${esc(source)}')">Buka Template</button>`);
    return `<article class="template-item-v123"><div><b>${esc(j)}</b><small>${isHps?'Dapat diisi langsung di sistem atau menggunakan format acuan.':(source?'Template acuan tersedia.':'Belum tersedia template acuan.')}</small></div><div class="action-group">${actions.join('')}</div></article>`;
  }).join('')}</div>`;
};

/* Pastikan modal HPS selalu memakai kelas lebar dan tidak membutuhkan geser horizontal. */
const __bukaHpsOptionalV126Base=bukaHpsOptionalV121;
bukaHpsOptionalV121=function(id){
  const r=__bukaHpsOptionalV126Base.apply(this,arguments);
  setTimeout(()=>{
    const modal=document.getElementById('hpsOptionalModalV121');
    const card=modal?.querySelector('.modal-card');
    if(card)card.classList.add('hps-modal-wide-v126');
    const tableWrap=modal?.querySelector('.table-wrap');
    if(tableWrap)tableWrap.classList.add('hps-table-wrap-v126');
  },0);
  return r;
};

/* =========================================================
   SIMPROV v133 - Baseline v131 + Surat, role akses terpisah,
   modal akses tetap di tengah, upload maksimal 2 MB,
   idle logout, dan tahapan Verifikator Keuangan/Bendahara.
   ========================================================= */
const MAX_UPLOAD_BYTES_V133 = 2 * 1024 * 1024;
let suratWorkspaceV133 = {loaded:false,loading:false,surat:[],bidangs:[],savedAt:0};
let suratTabV133 = 'MASUK';
let suratEditIdV133 = '';
let idleTimerV133 = null;
let idleWarningShownV133 = false;
let lastActivityV133 = Date.now();
let idleListenersBoundV133 = false;
const requestInFlightV133 = new Map();

function actualRoleV133(user=currentUser){
  let r=String(user?.role||user?.id_bidang||'').trim().toUpperCase().replace(/[\s-]+/g,'_');
  if(['SUPERADMIN','SUPER_ADMIN'].includes(r)) return 'ADMIN';
  if(['VERIFIKATOR','VERIFIKATOR_PBJ','VERIF_PBJ','PBJ'].includes(r)) return 'VERIFIKATOR_PBJ';
  if(['VERIFIKATOR_KEUANGAN','VERIF_KEUANGAN','KEUANGAN'].includes(r)) return 'VERIFIKATOR_KEUANGAN';
  if(['PIMPINAN','SEKDA','KETUA_UMUM','KETUA_HARIAN'].includes(r)) return 'PIMPINAN';
  if(r==='BENDAHARA') return 'BENDAHARA';
  if(r==='AUDITOR') return 'AUDITOR';
  if(r==='ADMIN') return 'ADMIN';
  return 'BIDANG';
}
function roleLabelV133(role=actualRoleV133()){
  return ({ADMIN:'Admin',VERIFIKATOR_PBJ:'Verifikator PBJ',VERIFIKATOR_KEUANGAN:'Verifikator Keuangan',BENDAHARA:'Bendahara',PIMPINAN:'Pimpinan',AUDITOR:'Auditor',BIDANG:'User Bidang'})[role]||role;
}
function isAdmin(){return actualRoleV133()==='ADMIN';}
function isPBJVerifierV65(){return ['ADMIN','VERIFIKATOR_PBJ'].includes(actualRoleV133());}
function isKeuangan(){return actualRoleV133()==='VERIFIKATOR_KEUANGAN';}
function isReviewer(){return ['PIMPINAN','AUDITOR'].includes(actualRoleV133());}
function canSeeAll(){return ['ADMIN','PIMPINAN','BENDAHARA','AUDITOR'].includes(actualRoleV133());}
function canManage(){return actualRoleV133()==='ADMIN';}
function isSuperAdminV65(){return actualRoleV133()==='ADMIN';}
function isVerifierV77(){return actualRoleV133()==='VERIFIKATOR_PBJ';}
function verifierUsersV65(){
  return (dashboard?.verifierUsers||[]).filter(u=>['VERIFIKATOR_PBJ','VERIFIKATOR_KEUANGAN','BENDAHARA','PIMPINAN','VERIFIKATOR'].includes(actualRoleV133(u))||['VERIFIKATOR_PBJ','VERIFIKATOR_KEUANGAN','BENDAHARA','PIMPINAN'].includes(String(u.role||'').toUpperCase()));
}

const __apiPostV133Base = apiPost;
apiPost = function(payload){
  const readOnly=['getDashboard','getPublicDashboard','getSuratWorkspaceV133','getVerifierAccounts','getSystemIdentity'].includes(payload?.action);
  if(!readOnly) return __apiPostV133Base(payload);
  const userKey=currentUser?.id_user||currentUser?.username||'public';
  const key=`${payload.action}|${userKey}|${payload.id_kegiatan||''}`;
  if(requestInFlightV133.has(key)) return requestInFlightV133.get(key);
  const req=__apiPostV133Base(payload).finally(()=>requestInFlightV133.delete(key));
  requestInFlightV133.set(key,req);
  return req;
};

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    if(!file) return reject(new Error('File belum dipilih.'));
    if(Number(file.size||0)>MAX_UPLOAD_BYTES_V133) return reject(new Error(`Ukuran ${file.name} melebihi 2 MB. Kompres file lalu unggah kembali.`));
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]);
    reader.onerror=()=>reject(new Error('File gagal dibaca.'));
    reader.readAsDataURL(file);
  });
}
function validateFileInputV133(input){
  const file=input?.files?.[0];
  if(file&&file.size>MAX_UPLOAD_BYTES_V133){
    alert(`Ukuran file maksimal 2 MB.\n\nFile: ${file.name}\nUkuran: ${(file.size/1024/1024).toFixed(2)} MB`);
    input.value='';
    return false;
  }
  return true;
}
document.addEventListener('change',e=>{if(e.target?.matches('input[type="file"]')) validateFileInputV133(e.target);},true);

function confirmActionV133({title='Konfirmasi Tindakan',message,confirmText='Ya, Lanjutkan',danger=false}={}){
  return new Promise(resolve=>{
    const old=document.getElementById('confirmModalV133');if(old)old.remove();
    const wrap=document.createElement('div');wrap.id='confirmModalV133';wrap.className='modal-backdrop confirm-v133';
    wrap.innerHTML=`<div class="modal-card confirm-card-v133 fade-up"><div class="confirm-icon-v133 ${danger?'danger':''}">${danger?'!':'✓'}</div><h3>${esc(title)}</h3><p>${esc(message||'Pastikan tindakan ini sudah benar.')}</p><div class="modal-actions"><button class="btn-soft" id="confirmNoV133">Tidak</button><button class="${danger?'btn-danger':'btn-green'}" id="confirmYesV133">${esc(confirmText)}</button></div></div>`;
    document.body.appendChild(wrap);
    const done=v=>{wrap.remove();resolve(v);};
    wrap.querySelector('#confirmNoV133').onclick=()=>done(false);
    wrap.querySelector('#confirmYesV133').onclick=()=>done(true);
    wrap.addEventListener('click',e=>{if(e.target===wrap)done(false);});
  });
}

function menuListV133(){
  const role=actualRoleV133();
  if(role==='ADMIN') return ['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pengadaan Langsung','Pencairan','Non Pengadaan','Surat','Manajemen Akses'];
  if(role==='VERIFIKATOR_PBJ') return ['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pengadaan Langsung','Pencairan','Non Pengadaan','Surat','Laporan'];
  if(role==='VERIFIKATOR_KEUANGAN') return ['Dashboard Monitoring','Pengadaan Langsung','Surat','Laporan'];
  if(role==='BENDAHARA') return ['Dashboard Monitoring','Pengadaan Langsung','Surat','Laporan'];
  if(role==='PIMPINAN'||role==='AUDITOR') return ['Dashboard Monitoring','Struktur Anggaran','Perencanaan','Pengadaan Langsung','Pencairan','Non Pengadaan','Surat','Laporan'];
  return ['Struktur Anggaran','Perencanaan','Pengadaan Langsung','Pencairan','Non Pengadaan','Surat','Laporan'];
}
renderMenu=function(){
  const menus=menuListV133();
  if(!menus.includes(activeMenu)) activeMenu=menus[0];
  const labels={Pencairan:'Pencatatan Pengadaan','Non Pengadaan':'Pencatatan Non Pengadaan'};
  document.getElementById('menuNav').innerHTML=menus.map(m=>`<button class="${activeMenu===m?'active':''}" onclick="setMenu('${m.replace(/'/g,"\\'")}')">${labels[m]||m}</button>`).join('');
};
const __setMenuV133Base=setMenu;
setMenu=function(m){
  activeMenu=m;perencanaanPage=1;pencairanPage=1;
  renderAll();
  if(m==='Surat') loadSuratWorkspaceV133(false);
};

function managedRoleNeedsBidangV133(role){return ['VERIFIKATOR_PBJ','VERIFIKATOR_KEUANGAN'].includes(String(role||'').toUpperCase());}
function managedRoleBadgeV133(role){
  const r=actualRoleV133({role});
  const cls=r==='VERIFIKATOR_PBJ'?'badge-blue':r==='VERIFIKATOR_KEUANGAN'?'badge-orange':r==='BENDAHARA'?'badge-green':'badge-gray';
  return `<span class="badge ${cls}">${esc(roleLabelV133(r).toUpperCase())}</span>`;
}
renderManajemenAkunV65=function(){
  const users=verifierUsersV65();
  const rows=users.map(u=>{
    const ids=String(u.bidang_akses||'').split(',').map(x=>x.trim()).filter(Boolean);
    const scope=ids.length?ids.map(id=>bidangName(id)).join(', '):'Akses sesuai fungsi role';
    return `<div class="admin-budget-card account-card-v133"><div class="admin-budget-info"><b>${esc(u.nama||'-')}</b><small>${esc(u.id_user||'')} • ${esc(u.username||'')}</small></div><div>${managedRoleBadgeV133(u.role)}</div><div class="account-scope-text"><small>Lingkup Penugasan</small><br>${esc(scope)}</div><div>${badge(u.status||'AKTIF')}</div><div><button class="btn-mini" onclick="openEditVerifierV65('${esc(u.id_user)}')">Edit</button></div></div>`;
  }).join('');
  const ppk=typeof ppkStructurePanelV102==='function'?ppkStructurePanelV102():'';
  document.getElementById('contentArea').innerHTML=`${ppk}<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Manajemen Akses dan Akun</h3><p class="panel-sub">Kelola Verifikator PBJ, Verifikator Keuangan, Bendahara, dan Pimpinan.</p></div><button class="btn-refresh" onclick="openCreateVerifierV65()">+ Buat Akun</button></div><div class="admin-budget-list">${rows||'<p class="muted">Belum ada akun yang dikelola.</p>'}</div></section><div id="verifierModalV65" class="modal-backdrop hidden"></div>`;
};
function verifierFormModalV65(u){
  const editing=!!u,selected=String(u?.bidang_akses||'').split(',').map(x=>x.trim()).filter(Boolean),modal=document.getElementById('verifierModalV65');
  if(!modal)return;
  const role=actualRoleV133(u||{role:'VERIFIKATOR_PBJ'});
  modal.className='modal-backdrop access-modal-v133';
  modal.innerHTML=`<div class="modal-card modal-wide access-card-v133 fade-up"><div class="modal-head"><div><h3>${editing?'Edit':'Buat'} Akun</h3><p>Hak akses menu mengikuti role yang dipilih.</p></div><button class="btn-soft" onclick="closeVerifierModalV65()">Tutup</button></div><div class="form-grid"><div class="field"><label>Nama Lengkap</label><input id="akunNama" value="${esc(u?.nama||'')}" placeholder="Nama pemilik akun"></div><div class="field"><label>Role</label><select id="akunRole" onchange="onManagedRoleChangeV133()"><option value="VERIFIKATOR_PBJ" ${role==='VERIFIKATOR_PBJ'?'selected':''}>Verifikator PBJ</option><option value="VERIFIKATOR_KEUANGAN" ${role==='VERIFIKATOR_KEUANGAN'?'selected':''}>Verifikator Keuangan</option><option value="BENDAHARA" ${role==='BENDAHARA'?'selected':''}>Bendahara</option><option value="PIMPINAN" ${role==='PIMPINAN'?'selected':''}>Pimpinan</option></select></div><div class="field"><label>Username</label><input id="akunUsername" value="${esc(u?.username||'')}" placeholder="username"></div><div class="field"><label>Password ${editing?'(kosongkan jika tidak diubah)':''}</label><input id="akunPassword" type="password" placeholder="Password akun"></div>${editing?`<div class="field"><label>Status</label><select id="akunStatus"><option value="AKTIF" ${String(u?.status).toUpperCase()==='AKTIF'?'selected':''}>AKTIF</option><option value="NONAKTIF" ${String(u?.status).toUpperCase()==='NONAKTIF'?'selected':''}>NONAKTIF</option></select></div>`:''}</div><div id="akunBidangWrapV133" class="field"><label>Pilih Bidang Penugasan</label><p class="field-help-v133">Wajib untuk Verifikator PBJ dan Verifikator Keuangan.</p><div class="account-scope-grid">${bidangChecksV65(selected)}</div></div><div class="modal-actions"><button class="btn-soft" onclick="closeVerifierModalV65()">Batal</button><button onclick="saveVerifierV65('${esc(u?.id_user||'')}')">Simpan Akun</button></div></div>`;
  onManagedRoleChangeV133();
}
function onManagedRoleChangeV133(){
  const role=document.getElementById('akunRole')?.value,wrap=document.getElementById('akunBidangWrapV133');
  if(wrap)wrap.classList.toggle('optional-scope-v133',!managedRoleNeedsBidangV133(role));
}
function closeVerifierModalV65(){const m=document.getElementById('verifierModalV65');if(m){m.className='modal-backdrop hidden';m.innerHTML='';}}
async function saveVerifierV65(id){
  const role=document.getElementById('akunRole')?.value||'',bidang_akses=[...document.querySelectorAll('input[name="akunBidang"]:checked')].map(x=>x.value);
  const data={id_user:id,nama:document.getElementById('akunNama')?.value.trim(),role,username:document.getElementById('akunUsername')?.value.trim(),password:document.getElementById('akunPassword')?.value||'',bidang_akses,status:document.getElementById('akunStatus')?.value||'AKTIF'};
  if(!data.nama||!data.username||(!id&&!data.password)){alert('Nama, username, dan password wajib diisi.');return;}
  if(managedRoleNeedsBidangV133(role)&&!bidang_akses.length){alert('Pilih minimal satu bidang penugasan.');return;}
  const ok=await confirmActionV133({title:id?'Simpan Perubahan Akun':'Buat Akun Baru',message:`Pastikan nama, role ${roleLabelV133(role)}, username, dan bidang penugasan sudah benar.`,confirmText:id?'Ya, Simpan':'Ya, Buat Akun'});if(!ok)return;
  showLoading('Menyimpan akun...');
  try{const r=await apiPost({action:id?'updateVerifierAccount':'saveVerifierAccount',user:currentUser,data});if(!r.success)throw new Error(r.message||'Gagal menyimpan akun');closeVerifierModalV65();await loadDashboard(false);renderAll();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}
}

function suratCacheKeyV133(){return `SIMPROV_SURAT_V133_${currentUser?.id_user||currentUser?.username||'guest'}`;}
function readSuratCacheV133(){try{const o=JSON.parse(sessionStorage.getItem(suratCacheKeyV133())||'null');return o&&o.data?o:null;}catch(e){return null;}}
function writeSuratCacheV133(data){try{sessionStorage.setItem(suratCacheKeyV133(),JSON.stringify({savedAt:Date.now(),data}));}catch(e){}}
async function loadSuratWorkspaceV133(force=false){
  if(suratWorkspaceV133.loading)return;
  const cached=readSuratCacheV133();
  if(!force&&cached?.data&&!suratWorkspaceV133.loaded){suratWorkspaceV133={...cached.data,loaded:true,loading:false,savedAt:cached.savedAt};if(activeMenu==='Surat')renderSuratV133();}
  suratWorkspaceV133.loading=true;if(activeMenu==='Surat'&&!suratWorkspaceV133.loaded)renderSuratV133();
  try{const r=await apiPost({action:'getSuratWorkspaceV133',user:currentUser});if(!r.success)throw new Error(r.message||'Gagal memuat surat');suratWorkspaceV133={loaded:true,loading:false,surat:r.surat||[],bidangs:r.bidangs||[],savedAt:Date.now()};writeSuratCacheV133(suratWorkspaceV133);if(activeMenu==='Surat')renderSuratV133();}catch(e){suratWorkspaceV133.loading=false;if(activeMenu==='Surat')showFastCacheNotice('Data surat belum dapat diperbarui: '+(e.message||e));}
}
function suratPipelineV133(s){
  const status=String(s.status_surat||'DRAFT').toUpperCase(),steps=['Draft','Diajukan','Disetujui','Didisposisi','Ditindaklanjuti','Selesai'];
  let active=1;if(status.includes('DIAJUKAN'))active=2;else if(status.includes('PERLU PERBAIKAN'))active=2;else if(status.includes('DIDISPOSISIKAN'))active=4;else if(status.includes('DITERUSKAN'))active=5;else if(status==='SELESAI')active=6;
  if(s.persetujuan_digital&&active<3)active=3;
  return `<div class="surat-pipeline-v133">${steps.map((x,i)=>`<div class="${i+1<active?'done':i+1===active?'active':''}"><span>${i+1}</span><b>${x}</b></div>`).join('')}</div>`;
}
function suratStatusChipV133(status){
  const s=String(status||'DRAFT').toUpperCase();let cls='gray';if(s==='SELESAI')cls='green';else if(s.includes('PERBAIKAN'))cls='red';else if(s.includes('DIAJUKAN')||s.includes('DISPOSISI')||s.includes('DITERUSKAN'))cls='blue';
  return `<span class="surat-status-v133 ${cls}">${esc(s)}</span>`;
}
function suratIsIncomingV133(s){
  const role=actualRoleV133(),uid=String(currentUser?.id_user||''),idb=String(currentUser?.id_bidang||'');
  if(role==='ADMIN'||role==='PIMPINAN')return String(s.status_surat||'').toUpperCase()!=='DRAFT';
  if(String(s.current_id_user||'')===uid)return true;
  if(String(s.current_role||'').toUpperCase()===role)return true;
  return role==='BIDANG'&&String(s.current_bidang||'')===idb;
}
function suratActionButtonsV133(s){
  const role=actualRoleV133(),status=String(s.status_surat||'').toUpperCase(),own=String(s.asal_id_user||'')===String(currentUser?.id_user||'');
  const out=[`<button class="btn-soft" onclick="printNotaDinasV133('${esc(s.id_surat)}')">Cetak Nota Dinas</button>`];
  if(own&&['DRAFT','PERLU PERBAIKAN'].includes(status))out.push(`<button onclick="editSuratV133('${esc(s.id_surat)}')">${status==='DRAFT'?'Lanjutkan Draft':'Perbaiki & Ajukan Ulang'}</button>`);
  if((role==='PIMPINAN'||role==='ADMIN')&&status==='DIAJUKAN KE PIMPINAN')out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','PIMPINAN')">Periksa & Disposisi</button>`);
  if((role==='VERIFIKATOR_KEUANGAN'||role==='ADMIN')&&status==='DIDISPOSISIKAN KE VERIFIKATOR KEUANGAN')out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','KEUANGAN')">Verifikasi Surat</button>`);
  if((role==='BENDAHARA'||role==='ADMIN')&&status==='DITERUSKAN KE BENDAHARA')out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','SELESAI')">Selesaikan Tindak Lanjut</button>`);
  if(role==='BIDANG'&&status==='DIDISPOSISIKAN KE BIDANG'&&String(s.current_bidang||'')===String(currentUser?.id_bidang||''))out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','SELESAI')">Tandai Selesai</button>`);
  return out.join('');
}
function suratCardV133(s){
  const bidangTujuan=suratWorkspaceV133.bidangs.find(b=>String(b.id_bidang)===String(s.tujuan_bidang))?.nama_bidang||s.tujuan_bidang||'-';
  return `<article class="surat-card-v133"><div class="surat-card-head-v133"><div><small>${esc(s.jenis_surat||'NOTA DINAS')} • ${esc(s.nomor_surat||'BELUM BERNOMOR')}</small><h4>${esc(s.perihal||'-')}</h4><p>Dari ${esc(s.asal_nama||'-')} • ${esc(s.klasifikasi||'UMUM')} • ${esc(formatDate(s.tanggal_surat||s.created_at)||'-')}</p></div>${suratStatusChipV133(s.status_surat)}</div>${suratPipelineV133(s)}<div class="surat-summary-v133"><p>${esc(s.isi_ringkas||'-')}</p><div><b>Tujuan/Disposisi:</b> ${esc(s.tujuan_role==='BIDANG'?bidangTujuan:(s.tujuan_role||'-'))}</div>${s.disposisi_catatan?`<div><b>Catatan:</b> ${esc(s.disposisi_catatan)}</div>`:''}${s.url_file?`<div><a href="${esc(s.url_file)}" target="_blank" rel="noopener">Buka lampiran: ${esc(s.nama_file||'Lampiran')}</a></div>`:''}</div><details class="surat-history-v133"><summary>Riwayat Surat</summary><pre>${esc(s.riwayat_surat||'Belum ada riwayat')}</pre></details><div class="action-group surat-actions-v133">${suratActionButtonsV133(s)}</div></article>`;
}
function suratFormV133(){
  const s=suratEditIdV133?suratWorkspaceV133.surat.find(x=>String(x.id_surat)===String(suratEditIdV133)):null;
  const today=new Date().toISOString().slice(0,10);
  return `<section class="panel fade-up premium-panel surat-form-panel-v133"><div class="panel-title-row"><div><h3>${s?'Perbaiki Nota Dinas':'Buat Surat'}</h3><p class="panel-sub">Jenis surat yang tersedia saat ini: Nota Dinas. Nomor surat mengikuti proses TND/SRIKANDI.</p></div>${s?`<button class="btn-soft" onclick="cancelEditSuratV133()">Batal Edit</button>`:''}</div><div class="form-grid"><div class="field"><label>Jenis Surat</label><input value="Nota Dinas" readonly></div><div class="field"><label>Nomor Nota Dinas</label><input id="suratNomorV133" value="${esc(s?.nomor_surat||'')}" placeholder="Nomor dari TND/SRIKANDI"></div><div class="field"><label>Tanggal Surat</label><input id="suratTanggalV133" type="date" value="${esc(normalizeDateForInputV61(s?.tanggal_surat)||today)}"></div><div class="field"><label>Sifat</label><select id="suratSifatV133"><option ${String(s?.sifat).toUpperCase()==='BIASA'?'selected':''}>BIASA</option><option ${String(s?.sifat).toUpperCase()==='PENTING'?'selected':''}>PENTING</option><option ${String(s?.sifat).toUpperCase()==='SEGERA'?'selected':''}>SEGERA</option></select></div><div class="field"><label>Klasifikasi</label><select id="suratKlasifikasiV133"><option value="UMUM" ${String(s?.klasifikasi).toUpperCase()!=='PENCAIRAN'?'selected':''}>Umum / Disposisi Bidang</option><option value="PENCAIRAN" ${String(s?.klasifikasi).toUpperCase()==='PENCAIRAN'?'selected':''}>Pencairan</option></select></div><div class="field span-2"><label>Perihal</label><input id="suratPerihalV133" value="${esc(s?.perihal||'')}" placeholder="Perihal Nota Dinas"></div><div class="field full"><label>Isi / Ringkasan Nota Dinas</label><textarea id="suratIsiV133" rows="7" placeholder="Tuliskan maksud, dasar, dan tindak lanjut yang dimohonkan">${esc(s?.isi_ringkas||'')}</textarea></div><div class="field full"><label>Lampiran (opsional, maksimal 2 MB)</label><input id="suratFileV133" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"></div></div><div class="surat-form-note-v133">Nota Dinas yang diajukan akan masuk ke Pimpinan. Nota Dinas pencairan yang disetujui diteruskan ke Verifikator Keuangan, kemudian Bendahara.</div><div class="action-group"><button class="btn-soft" onclick="saveSuratV133(false)">Simpan Draft</button><button onclick="saveSuratV133(true)">Ajukan ke Pimpinan</button></div></section>`;
}
function renderSuratV133(){
  const area=document.getElementById('contentArea');if(!area)return;
  if(!suratWorkspaceV133.loaded){area.innerHTML=`<section class="panel premium-panel surat-loading-v133"><h3>Surat</h3><div class="skeleton-v133"></div><div class="skeleton-v133 short"></div></section>`;return;}
  const all=suratWorkspaceV133.surat||[],incoming=all.filter(suratIsIncomingV133),own=all.filter(s=>String(s.asal_id_user||'')===String(currentUser?.id_user||''));
  const canCreate=!['PIMPINAN','VERIFIKATOR_KEUANGAN','BENDAHARA'].includes(actualRoleV133());
  if(!canCreate)suratTabV133='MASUK';
  const body=suratTabV133==='BUAT'?`${suratFormV133()}<section class="panel premium-panel"><h3>Surat Saya</h3><div class="surat-list-v133">${own.map(suratCardV133).join('')||'<p class="empty">Belum ada surat yang dibuat.</p>'}</div></section>`:`<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Surat Masuk</h3><p class="panel-sub">Daftar Nota Dinas yang memerlukan persetujuan, disposisi, atau tindak lanjut.</p></div><button class="btn-refresh" onclick="loadSuratWorkspaceV133(true)">Refresh</button></div><div class="surat-list-v133">${incoming.map(suratCardV133).join('')||'<p class="empty">Tidak ada surat masuk yang perlu ditindaklanjuti.</p>'}</div></section>`;
  area.innerHTML=`<section class="panel premium-panel surat-head-v133"><div class="panel-title-row"><div><h3>Surat</h3><p class="panel-sub">Pembuatan, persetujuan elektronik, disposisi, dan tindak lanjut Nota Dinas.</p></div></div><div class="surat-tabs-v133">${canCreate?`<button class="${suratTabV133==='BUAT'?'active':''}" onclick="setSuratTabV133('BUAT')">Buat Surat</button>`:''}<button class="${suratTabV133==='MASUK'?'active':''}" onclick="setSuratTabV133('MASUK')">Surat Masuk <span>${incoming.filter(x=>String(x.status_surat).toUpperCase()!=='SELESAI').length}</span></button></div></section>${body}<div id="suratActionModalV133" class="modal-backdrop hidden"></div>`;
}
function setSuratTabV133(tab){suratTabV133=tab;suratEditIdV133='';renderSuratV133();}
function editSuratV133(id){suratEditIdV133=id;suratTabV133='BUAT';renderSuratV133();setTimeout(()=>document.querySelector('.surat-form-panel-v133')?.scrollIntoView({behavior:'smooth',block:'start'}),50);}
function cancelEditSuratV133(){suratEditIdV133='';renderSuratV133();}
async function saveSuratV133(submit){
  const file=document.getElementById('suratFileV133')?.files?.[0];
  if(file&&file.size>MAX_UPLOAD_BYTES_V133){alert('Lampiran maksimal 2 MB.');return;}
  const data={id_surat:suratEditIdV133,submit,nomor_surat:document.getElementById('suratNomorV133')?.value.trim(),tanggal_surat:document.getElementById('suratTanggalV133')?.value,sifat:document.getElementById('suratSifatV133')?.value,klasifikasi:document.getElementById('suratKlasifikasiV133')?.value,perihal:document.getElementById('suratPerihalV133')?.value.trim(),isi_ringkas:document.getElementById('suratIsiV133')?.value.trim()};
  if(!data.perihal||!data.isi_ringkas){alert('Perihal dan isi Nota Dinas wajib diisi.');return;}
  if(submit){const ok=await confirmActionV133({title:'Ajukan Nota Dinas',message:'Nota Dinas akan dikirim kepada Pimpinan untuk diperiksa, disetujui, dan didisposisikan. Pastikan isi surat sudah benar.',confirmText:'Ya, Ajukan'});if(!ok)return;}
  showLoading(submit?'Mengajukan Nota Dinas...':'Menyimpan draft...');
  try{if(file){data.file_name=file.name;data.mime_type=file.type;data.file_base64=await fileToBase64(file);}const r=await apiPost({action:'saveSuratV133',user:currentUser,data});if(!r.success)throw new Error(r.message||'Gagal menyimpan surat');suratEditIdV133='';sessionStorage.removeItem(suratCacheKeyV133());await loadSuratWorkspaceV133(true);suratTabV133=submit?'MASUK':'BUAT';renderSuratV133();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}
}
function openSuratActionV133(id,mode){
  const s=suratWorkspaceV133.surat.find(x=>String(x.id_surat)===String(id)),m=document.getElementById('suratActionModalV133');if(!s||!m)return;
  const bidangOptions=(suratWorkspaceV133.bidangs||[]).map(b=>`<option value="${esc(b.id_bidang)}">${esc(b.nama_bidang)}</option>`).join('');
  let content='';
  if(mode==='PIMPINAN')content=`<div class="field"><label>Tujuan Disposisi</label>${String(s.klasifikasi).toUpperCase()==='PENCAIRAN'?'<input value="Verifikator Keuangan → Bendahara" readonly>':`<select id="suratTujuanBidangV133"><option value="">Pilih bidang tujuan</option>${bidangOptions}</select>`}</div><div class="field full"><label>Catatan Disposisi</label><textarea id="suratActionCatatanV133" rows="4" placeholder="Arahan Pimpinan"></textarea></div><div class="approval-statement-v133">Dengan memilih <b>Setujui & Disposisikan</b>, saya menyatakan Nota Dinas ini telah diperiksa dan disetujui secara elektronik melalui SIMPROV.</div><div class="modal-actions"><button class="btn-danger" onclick="submitSuratActionV133('${esc(id)}','KEMBALIKAN')">Kembalikan untuk Perbaikan</button><button class="btn-green" onclick="submitSuratActionV133('${esc(id)}','SETUJUI_DAN_DISPOSISI')">Setujui & Disposisikan</button></div>`;
  else if(mode==='KEUANGAN')content=`<div class="field full"><label>Catatan Verifikasi Keuangan</label><textarea id="suratActionCatatanV133" rows="4" placeholder="Catatan pemeriksaan atau arahan kepada Bendahara"></textarea></div><div class="modal-actions"><button class="btn-danger" onclick="submitSuratActionV133('${esc(id)}','KEMBALIKAN')">Kembalikan untuk Perbaikan</button><button class="btn-green" onclick="submitSuratActionV133('${esc(id)}','TERUSKAN_KE_BENDAHARA')">Teruskan ke Bendahara</button></div>`;
  else content=`<div class="field full"><label>Catatan Penyelesaian</label><textarea id="suratActionCatatanV133" rows="4" placeholder="Ringkasan tindak lanjut"></textarea></div><div class="modal-actions"><button class="btn-soft" onclick="closeSuratActionV133()">Batal</button><button class="btn-green" onclick="submitSuratActionV133('${esc(id)}','SELESAIKAN')">Tandai Selesai</button></div>`;
  m.className='modal-backdrop';m.innerHTML=`<div class="modal-card surat-action-card-v133 fade-up"><div class="modal-head"><div><h3>Tindak Lanjut Nota Dinas</h3><p>${esc(s.nomor_surat||'Belum bernomor')} • ${esc(s.perihal)}</p></div><button class="btn-soft" onclick="closeSuratActionV133()">Tutup</button></div>${content}</div>`;
}
function closeSuratActionV133(){const m=document.getElementById('suratActionModalV133');if(m){m.className='modal-backdrop hidden';m.innerHTML='';}}
async function submitSuratActionV133(id,keputusan){
  const catatan=document.getElementById('suratActionCatatanV133')?.value.trim()||'',tujuan_bidang=document.getElementById('suratTujuanBidangV133')?.value||'';
  if(keputusan==='KEMBALIKAN'&&!catatan){alert('Catatan perbaikan wajib diisi.');return;}
  const labels={SETUJUI_DAN_DISPOSISI:'menyetujui dan mendisposisikan Nota Dinas',TERUSKAN_KE_BENDAHARA:'meneruskan Nota Dinas kepada Bendahara',KEMBALIKAN:'mengembalikan Nota Dinas untuk perbaikan',SELESAIKAN:'menyelesaikan tindak lanjut Nota Dinas'};
  const ok=await confirmActionV133({title:'Konfirmasi Proses Surat',message:`Anda akan ${labels[keputusan]}. Tindakan dan nama petugas akan dicatat dalam riwayat surat.`,confirmText:'Ya, Proses',danger:keputusan==='KEMBALIKAN'});if(!ok)return;
  showLoading('Memperbarui status surat...');
  try{const r=await apiPost({action:'actionSuratV133',user:currentUser,id_surat:id,keputusan,catatan,tujuan_bidang});if(!r.success)throw new Error(r.message||'Gagal memproses surat');closeSuratActionV133();sessionStorage.removeItem(suratCacheKeyV133());await loadSuratWorkspaceV133(true);alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}
}
function printNotaDinasV133(id){
  const s=suratWorkspaceV133.surat.find(x=>String(x.id_surat)===String(id));if(!s)return;
  const w=window.open('','_blank');if(!w)return alert('Popup diblokir browser. Izinkan popup untuk mencetak Nota Dinas.');
  const approval=s.persetujuan_digital?`<div class="sign"><b>Pimpinan</b><div class="space"></div><u>${esc(s.disetujui_oleh||'-')}</u><small>${esc(s.persetujuan_digital)}</small></div>`:'';
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Nota Dinas ${esc(s.nomor_surat||'')}</title><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#111;font-size:12pt}.head{text-align:center;border-bottom:3px solid #173f70;padding-bottom:14px}.head h1{margin:0;color:#173f70}.title{text-align:center;margin:24px 0}.meta{width:100%;border-collapse:collapse}.meta td{padding:5px;vertical-align:top}.body{margin-top:24px;line-height:1.7;white-space:pre-wrap}.sign{margin-top:65px;margin-left:auto;width:280px;text-align:center}.space{height:70px}.sign small{display:block;color:#246293;margin-top:8px}.footer{position:fixed;bottom:0;font-size:9pt;color:#667}</style></head><body><div class="head"><h1>SIMPROV</h1><b>SISTEM INFORMASI MONITORING PERSIAPAN PORPROV KOTA BOGOR</b></div><div class="title"><h2>NOTA DINAS</h2><div>Nomor: ${esc(s.nomor_surat||'-')}</div></div><table class="meta"><tr><td width="120">Kepada</td><td>: ${esc(s.tujuan_role||'Pimpinan')}</td></tr><tr><td>Dari</td><td>: ${esc(s.asal_nama||'-')}</td></tr><tr><td>Tanggal</td><td>: ${esc(formatDate(s.tanggal_surat)||'-')}</td></tr><tr><td>Sifat</td><td>: ${esc(s.sifat||'BIASA')}</td></tr><tr><td>Perihal</td><td>: ${esc(s.perihal||'-')}</td></tr></table><div class="body">${esc(s.isi_ringkas||'')}</div>${approval}<div class="footer">Dokumen dibuat dan tercatat melalui SIMPROV • ${esc(s.id_surat)}</div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close();
}

const __renderContentV133Base=renderContent;
renderContent=function(){
  if(activeMenu==='Surat'){renderSuratV133();if(!suratWorkspaceV133.loaded)loadSuratWorkspaceV133(false);return;}
  return __renderContentV133Base();
};

function injectFinancePanelV133(k){
  const area=document.getElementById('contentArea');if(!area||!k)return;
  area.querySelector('#financeStagePanelV133')?.remove();
  const role=actualRoleV133(),st=String(k.status_pencairan||'').toUpperCase();
  let html='';
  if(st==='MENUNGGU VERIFIKASI KEUANGAN'){
    if(role==='VERIFIKATOR_KEUANGAN'||role==='ADMIN')html=`<h3>Verifikasi Keuangan</h3><p>Paket telah diverifikasi PBJ. Periksa kesesuaian nilai realisasi dan dokumen sebelum diteruskan kepada Bendahara.</p><div class="action-group"><button class="btn-danger" onclick="prosesKeuanganPaketV133('${esc(k.id_kegiatan)}','KEMBALIKAN')">Kembalikan ke Verifikator PBJ</button><button class="btn-green" onclick="prosesKeuanganPaketV133('${esc(k.id_kegiatan)}','SETUJUI')">Setujui & Teruskan ke Bendahara</button></div>`;
    else html=`<h3>Menunggu Verifikasi Keuangan</h3><p>Verifikasi PBJ telah selesai. Paket sedang diperiksa oleh Verifikator Keuangan.</p>`;
  }else if(st==='MENUNGGU BENDAHARA'){
    if(role==='BENDAHARA'||role==='ADMIN')html=`<h3>Penyelesaian Pembayaran</h3><p>Paket telah disetujui Verifikator Keuangan dan diteruskan kepada Bendahara.</p><button class="btn-green" onclick="selesaikanPembayaranPaketV133('${esc(k.id_kegiatan)}')">Tandai Pembayaran Selesai</button>`;
    else html=`<h3>Menunggu Bendahara</h3><p>Paket telah disetujui Verifikator Keuangan dan sedang ditindaklanjuti Bendahara.</p>`;
  }
  if(html)area.insertAdjacentHTML('beforeend',`<section id="financeStagePanelV133" class="panel fade-up premium-panel finance-stage-v133">${html}</section>`);
}
const __renderDetailPengadaanLangsungV133Base=renderDetailPengadaanLangsungV123;
renderDetailPengadaanLangsungV123=function(k){const r=__renderDetailPengadaanLangsungV133Base(k);setTimeout(()=>injectFinancePanelV133(k),0);return r;};
async function prosesKeuanganPaketV133(id,keputusan){
  let catatan='';if(keputusan==='KEMBALIKAN'){catatan=prompt('Tuliskan alasan pengembalian kepada Verifikator PBJ:')||'';if(!catatan.trim())return;}
  const ok=await confirmActionV133({title:keputusan==='SETUJUI'?'Setujui Paket':'Kembalikan Paket',message:keputusan==='SETUJUI'?'Paket akan diteruskan kepada Bendahara untuk penyelesaian pembayaran.':'Paket akan dikembalikan kepada Verifikator PBJ beserta catatan perbaikan.',confirmText:'Ya, Proses',danger:keputusan==='KEMBALIKAN'});if(!ok)return;
  showLoading('Memproses verifikasi keuangan...');try{const r=await apiPost({action:'verifikasiKeuanganPaketV133',user:currentUser,id_kegiatan:id,keputusan,catatan});if(!r.success)throw new Error(r.message||'Gagal memproses paket');await loadDashboard(false);renderAll();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}
}
async function selesaikanPembayaranPaketV133(id){
  const catatan=prompt('Catatan pembayaran (opsional):')||'';const ok=await confirmActionV133({title:'Selesaikan Pembayaran',message:'Paket akan dikunci sebagai SELESAI. Pastikan pembayaran dan pencatatan Bendahara telah benar.',confirmText:'Ya, Selesaikan'});if(!ok)return;
  showLoading('Menyelesaikan pembayaran...');try{const r=await apiPost({action:'selesaikanPembayaranPaketV133',user:currentUser,id_kegiatan:id,catatan});if(!r.success)throw new Error(r.message||'Gagal menyelesaikan pembayaran');await loadDashboard(false);renderAll();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}
}

uploadSemuaDokV96=async function(idKegiatan){
  const inputs=Array.from(document.querySelectorAll('.dok-file-v96')).filter(f=>f.files?.length);
  if(!inputs.length){alert('Pilih file pada baris dokumen terlebih dahulu.');return;}
  const oversized=inputs.find(inp=>inp.files[0].size>MAX_UPLOAD_BYTES_V133);if(oversized){alert(`File ${oversized.files[0].name} melebihi 2 MB.`);return;}
  showLoading(`Menyiapkan ${inputs.length} dokumen...`);
  try{
    const prepared=await Promise.all(inputs.map(async inp=>({inp,file:inp.files[0],base64:await fileToBase64(inp.files[0])})));
    let next=0,done=0,ok=0;const gagal=[];
    const worker=async()=>{while(true){const index=next++;if(index>=prepared.length)return;const {inp,file,base64}=prepared[index],jenis=inp.dataset.jenis,ctx=inp.dataset.ctx,isRevisi=inp.dataset.repair==='1'&&inp.dataset.idd;try{let r;if(isRevisi)r=ctx==='NON'?await apiPost({action:'revisiDokumenNonPengadaan',user:currentUser,id_dokumen_non:inp.dataset.idd,file_name:file.name,mime_type:file.type,file_base64:base64}):await apiPost({action:'revisiDokumen',user:currentUser,id_dokumen:inp.dataset.idd,file_name:file.name,mime_type:file.type,file_base64:base64});else r=await apiPost({action:ctx==='NON'?'uploadDokumenNonPengadaan':'uploadDokumen',user:currentUser,id_kegiatan:idKegiatan,jenis_dokumen:jenis,file_name:file.name,mime_type:file.type,file_base64:base64});if(!r.success)throw new Error(r.message||'Gagal upload');ok++;updateDokumenLokalV111(ctx,!!isRevisi,inp.dataset.idd,r.dokumen);}catch(e){gagal.push(`${jenis}: ${e.message||e}`);}finally{done++;const lt=document.getElementById('loadingText');if(lt)lt.innerText=`Mengunggah dokumen ${done}/${prepared.length}`;}}};
    await Promise.all(Array.from({length:Math.min(2,prepared.length)},worker));
    const kegiatan=kegiatanById(idKegiatan);if(kegiatan&&ok)kegiatan.status_pencairan='MENUNGGU VERIFIKASI DOKUMEN';writeDashboardCache(dashboard);renderAll();syncDashboardSilentV111();alert(`${ok} dokumen berhasil diunggah.${gagal.length?`\n\nGagal:\n- ${gagal.join('\n- ')}`:''}`);
  }catch(e){alert('Gagal menyiapkan/upload dokumen: '+(e.message||e));}finally{hideLoading();}
};

function resetIdleV133(){lastActivityV133=Date.now();idleWarningShownV133=false;document.getElementById('idleWarningV133')?.remove();}
function startIdleLogoutV133(){
  if(idleTimerV133)clearInterval(idleTimerV133);resetIdleV133();
  if(!idleListenersBoundV133){['pointerdown','keydown','touchstart','scroll'].forEach(ev=>document.addEventListener(ev,resetIdleV133,{passive:true}));idleListenersBoundV133=true;}
  idleTimerV133=setInterval(()=>{if(!currentUser)return;const idle=Date.now()-lastActivityV133;if(idle>=30*60*1000){autoLogoutV133();return;}if(idle>=28*60*1000&&!idleWarningShownV133){idleWarningShownV133=true;const d=document.createElement('div');d.id='idleWarningV133';d.className='idle-warning-v133';d.innerHTML='<b>Sesi akan berakhir dalam 2 menit karena tidak ada aktivitas.</b><button onclick="resetIdleV133()">Lanjutkan Sesi</button>';document.body.appendChild(d);}},30000);
}
function autoLogoutV133(){
  if(idleTimerV133)clearInterval(idleTimerV133);localStorage.removeItem('siporbo_user');sessionStorage.removeItem(suratCacheKeyV133());currentUser=null;dashboard=null;document.getElementById('idleWarningV133')?.remove();document.getElementById('appPage').classList.add('hidden');document.getElementById('loginPage').classList.remove('hidden');alert('Sesi berakhir otomatis setelah 30 menit tanpa aktivitas. Silakan login kembali.');
}
const __loginV133Base=login;
login=async function(){const r=await __loginV133Base.apply(this,arguments);if(currentUser)startIdleLogoutV133();return r;};
const __logoutV133Base=logout;
logout=async function(){const ok=await confirmActionV133({title:'Keluar dari SIMPROV',message:'Sesi dan cache akun pada perangkat ini akan dibersihkan.',confirmText:'Ya, Logout',danger:true});if(!ok)return;if(idleTimerV133)clearInterval(idleTimerV133);sessionStorage.removeItem(suratCacheKeyV133());return __logoutV133Base();};
setTimeout(()=>{if(currentUser)startIdleLogoutV133();},800);

function formatDate(v){
  if(!v)return '';
  try{return formatTanggalID(v);}catch(e){try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(v));}catch(_){return String(v);}}
}

/* =========================================================
   SIMPROV v134 - Revisi Surat, Header, Modal Access, Report UX
   ========================================================= */
(function(){
  function suratStripHtmlV134(html){
    return String(html||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
  }
  function sanitizeRichHtmlV134(html){
    let out=String(html||'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/on\w+\s*=\s*"[^"]*"/gi,'').replace(/on\w+\s*=\s*'[^']*'/gi,'').replace(/javascript:/gi,'');
    const allowed=/(<\/?(p|br|b|strong|i|em|u|ul|ol|li|div|span)[^>]*>)/gi;
    out=out.replace(/<(?!\/?(p|br|b|strong|i|em|u|ul|ol|li|div|span)\b)[^>]+>/gi,'');
    out=out.replace(/<(div|span)([^>]*)>/gi,'<$1>');
    out=out.replace(/<p><\/p>/gi,'<p><br></p>');
    return out.trim();
  }
  function ensureVerifierModalRootV134(){
    let modal=document.getElementById('verifierModalV65');
    if(modal && modal.parentElement!==document.body){ document.body.appendChild(modal); }
    if(!modal){
      modal=document.createElement('div');
      modal.id='verifierModalV65';
      modal.className='modal-backdrop hidden';
      document.body.appendChild(modal);
    }
    return modal;
  }
  const _renderManageV134 = renderManajemenAkunV65;
  renderManajemenAkunV65 = function(){
    _renderManageV134();
    ensureVerifierModalRootV134();
  };
  const _verifierFormModalV134 = verifierFormModalV65;
  verifierFormModalV65 = function(u){ ensureVerifierModalRootV134(); return _verifierFormModalV134(u); };
  openCreateVerifierV65 = function(){ verifierFormModalV65(null); };
  openEditVerifierV65 = function(id){ const u=verifierUsersV65().find(x=>String(x.id_user)===String(id)); if(u) verifierFormModalV65(u); };
  closeVerifierModalV65 = function(){ const m=ensureVerifierModalRootV134(); m.className='modal-backdrop hidden'; m.innerHTML=''; };

  function ppkGroupByBidangNameFrontV134(nama){
    const n=String(nama||'').toLowerCase();
    if(/kesekretariatan/.test(n)) return {key:'ketua_harian',label:'Ketua Harian',wakilKey:'wakil_ketua_harian',wakilLabel:'Wakil Ketua Harian'};
    if(/penyiaran|pelayanan media|akomodasi|konsumsi|pengarahan massa|kesehatan/.test(n)) return {key:'ketua_i',label:'Ketua I',wakilKey:'wakil_ketua_i',wakilLabel:'Wakil Ketua I'};
    if(/organisasi|hukum|keamanan|transportasi/.test(n)) return {key:'ketua_ii',label:'Ketua II',wakilKey:'wakil_ketua_ii',wakilLabel:'Wakil Ketua II'};
    if(/pertandingan|perwasitan|sarana|prasarana pertandingan|teknologi informasi|komunikasi/.test(n)) return {key:'ketua_iii',label:'Ketua III',wakilKey:'wakil_ketua_iii',wakilLabel:'Wakil Ketua III'};
    if(/kerjasama|usaha|pengadaan barang|pengadaan jasa/.test(n)) return {key:'sekretaris_umum',label:'Sekretaris Umum',wakilKey:'wakil_sekretaris',wakilLabel:'Wakil Sekretaris'};
    return {key:'ketua_umum',label:'Ketua Bidang',wakilKey:'sekretaris_umum',wakilLabel:'Wakil Ketua'};
  }
  function assignedVerifierNameV134(){
    const users=verifierUsersV65();
    const idb=String(currentUser?.id_bidang||'');
    const matched=users.find(u=>{
      const role=actualRoleV133(u);
      if(role!=='VERIFIKATOR_PBJ') return false;
      const scope=String(u.bidang_akses||'').split(',').map(x=>x.trim());
      return scope.includes(idb);
    });
    return matched?.nama || dashboard?.systemIdentity?.verifikator || 'belum diatur';
  }
  updateIdentityHeaderV77 = function(){
    const info=document.getElementById('userInfo'); if(!info) return;
    const i=dashboard?.systemIdentity||{};
    const group=ppkGroupByBidangNameFrontV134(currentUser?.nama_bidang||'');
    const ketua=i[group.key]||i.ketua_umum||'belum diatur';
    const wakil=i[group.wakilKey]||i.sekretaris_umum||'belum diatur';
    const ver=assignedVerifierNameV134();
    const vals=[`Ketua Bidang: ${ketua}`,`${group.wakilLabel}: ${wakil}`,`Verifikator: ${ver}`];
    let box=document.getElementById('systemIdentityV77');
    if(!box){ box=document.createElement('div'); box.id='systemIdentityV77'; box.className='system-identity-v77'; info.insertAdjacentElement('afterend',box); }
    box.innerHTML=vals.map(v=>`<span>${esc(v)}</span>`).join('');
  };

  function suratIncomingCountV134(list){
    return (list||[]).filter(x=>String(x.status_surat||'').toUpperCase()!=='SELESAI').length;
  }
  function suratEditorToolbarV134(){
    const btn=(cmd,label,title,extra='')=>`<button type="button" class="editor-btn-v134" onclick="execSuratEditorV134('${cmd}', ${extra||'null'})" title="${title}">${label}</button>`;
    return `<div class="surat-editor-toolbar-v134">${btn('bold','B','Bold')}${btn('italic','I','Italic')}${btn('underline','U','Underline')}${btn('insertUnorderedList','• List','List Bullet')}${btn('insertOrderedList','1. List','List Numbering')}${btn('formatBlock','Paragraf','Paragraf','\'p\'')}${btn('formatBlock','Judul','Subjudul','\'h4\'')}<button type="button" class="editor-btn-v134" onclick="clearSuratFormatV134()" title="Bersihkan format">Clear</button></div>`;
  }
  window.execSuratEditorV134=function(cmd,value){ const ed=document.getElementById('suratIsiEditorV134'); if(!ed) return; ed.focus(); try{ document.execCommand(cmd,false,value); }catch(e){} updateSuratPreviewValueV134(); };
  window.clearSuratFormatV134=function(){ const ed=document.getElementById('suratIsiEditorV134'); if(!ed) return; ed.focus(); try{ document.execCommand('removeFormat',false,null); }catch(e){} updateSuratPreviewValueV134(); };
  window.updateSuratPreviewValueV134=function(){ const hidden=document.getElementById('suratIsiV133'); const ed=document.getElementById('suratIsiEditorV134'); if(hidden&&ed) hidden.value=sanitizeRichHtmlV134(ed.innerHTML); };

  suratPipelineV133 = function(s){
    const status=String(s.status_surat||'DRAFT').toUpperCase();
    const steps=['Draft','Diajukan','Disetujui','Didisposisi','Tindak Lanjut','Selesai'];
    let active=1;
    if(status.includes('DIAJUKAN')) active=2;
    if(s.persetujuan_digital||status.includes('DIDISPOSISIKAN')||status.includes('DITERUSKAN')||status==='SELESAI') active=Math.max(active,3);
    if(status.includes('DIDISPOSISIKAN')) active=4;
    if(status.includes('DITERUSKAN')) active=5;
    if(status==='SELESAI') active=6;
    const returned=status.includes('PERBAIKAN');
    const returnBanner=returned?`<div class="surat-return-banner-v134"><b>Dikembalikan untuk perbaikan</b><span>${esc(s.disposisi_catatan||'Periksa catatan dan ajukan ulang setelah diperbaiki.')}</span></div>`:'';
    return `${returnBanner}<div class="surat-pipeline-v133">${steps.map((x,i)=>`<div class="${i+1<active?'done':i+1===active?'active':''}"><span>${i+1}</span><b>${x}</b></div>`).join('')}</div>`;
  };

  suratActionButtonsV133 = function(s){
    const role=actualRoleV133(),status=String(s.status_surat||'').toUpperCase(),own=String(s.asal_id_user||'')===String(currentUser?.id_user||'');
    const out=[`<button class="btn-soft" onclick="printNotaDinasV133('${esc(s.id_surat)}')">Lihat / Cetak Nota Dinas</button>`];
    if(own&&['DRAFT','PERLU PERBAIKAN'].includes(status)) out.push(`<button onclick="editSuratV133('${esc(s.id_surat)}')">${status==='DRAFT'?'Lanjutkan Draft':'Perbaiki & Ajukan Ulang'}</button>`);
    if((role==='PIMPINAN'||role==='ADMIN')&&status==='DIAJUKAN KE PIMPINAN') out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','PIMPINAN')">Periksa & Disposisi</button>`);
    if((role==='VERIFIKATOR_KEUANGAN'||role==='ADMIN')&&status==='DIDISPOSISIKAN KE VERIFIKATOR KEUANGAN') out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','KEUANGAN')">Verifikasi Surat</button>`);
    if((role==='BENDAHARA'||role==='ADMIN')&&status==='DITERUSKAN KE BENDAHARA') out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','SELESAI')">Selesaikan Tindak Lanjut</button>`);
    if(role==='BIDANG'&&status==='DIDISPOSISIKAN KE BIDANG'&&String(s.current_bidang||'')===String(currentUser?.id_bidang||'')) out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','SELESAI')">Tandai Selesai</button>`);
    return out.join('');
  };

  suratCardV133 = function(s){
    const bidangTujuan=suratWorkspaceV133.bidangs.find(b=>String(b.id_bidang)===String(s.tujuan_bidang))?.nama_bidang||s.tujuan_bidang||'-';
    const asalBidang=bidangName(s.asal_bidang)||s.asal_bidang||'-';
    const tujuanLabel=s.tujuan_role==='BIDANG'?bidangTujuan:(s.tujuan_role||'-');
    const summaryHtml=sanitizeRichHtmlV134(s.isi_ringkas||'')||'<p>-</p>';
    return `<article class="surat-card-v133"><div class="surat-card-head-v133"><div><small>${esc(s.jenis_surat||'NOTA DINAS')} • ${esc(s.nomor_surat||'BELUM BERNOMOR')}</small><h4>${esc(s.perihal||'-')}</h4><div class="surat-meta-grid-v134"><span><b>Pengirim:</b> ${esc(s.asal_nama||'-')}</span><span><b>Bidang:</b> ${esc(asalBidang)}</span><span><b>Klasifikasi:</b> ${esc(s.klasifikasi||'UMUM')}</span><span><b>Tanggal:</b> ${esc(formatDate(s.tanggal_surat||s.created_at)||'-')}</span><span><b>Tujuan:</b> ${esc(tujuanLabel)}</span><span><b>Status:</b> ${esc(s.status_surat||'DRAFT')}</span></div></div>${suratStatusChipV133(s.status_surat)}</div>${suratPipelineV133(s)}<div class="surat-summary-v133"><div class="surat-rich-view-v134">${summaryHtml}</div>${s.disposisi_catatan?`<div><b>Catatan Disposisi:</b> ${esc(s.disposisi_catatan)}</div>`:''}${s.url_file?`<div><a href="${esc(s.url_file)}" target="_blank" rel="noopener">Lampiran: ${esc(s.nama_file||'Lampiran')}</a></div>`:''}</div><details class="surat-history-v133"><summary>Riwayat Surat</summary><pre>${esc(s.riwayat_surat||'Belum ada riwayat')}</pre></details><div class="action-group surat-actions-v133">${suratActionButtonsV133(s)}</div></article>`;
  };

  suratFormV133 = function(){
    const s=suratWorkspaceV133.surat.find(x=>String(x.id_surat)===String(suratEditIdV133));
    const today=new Date().toISOString().slice(0,10);
    const initialHtml=sanitizeRichHtmlV134(s?.isi_ringkas||'<p></p>') || '<p></p>';
    return `<section class="panel fade-up premium-panel surat-form-panel-v133"><div class="panel-title-row"><div><h3>${s?'Perbaiki Nota Dinas':'Buat Surat'}</h3><p class="panel-sub">Jenis surat yang tersedia saat ini: Nota Dinas. Nomor surat mengikuti proses TND/SRIKANDI.</p></div>${s?`<button class="btn-soft" onclick="cancelEditSuratV133()">Batal Edit</button>`:''}</div><div class="form-grid"><div class="field"><label>Jenis Surat</label><input value="Nota Dinas" readonly></div><div class="field"><label>Nomor Nota Dinas</label><input id="suratNomorV133" value="${esc(s?.nomor_surat||'')}" placeholder="Contoh: 10234/NotaDinas/140726"></div><div class="field"><label>Tanggal Surat</label><input id="suratTanggalV133" type="date" value="${esc(normalizeDateForInputV61(s?.tanggal_surat)||today)}"></div><div class="field"><label>Sifat</label><select id="suratSifatV133"><option ${String(s?.sifat).toUpperCase()==='BIASA'?'selected':''}>BIASA</option><option ${String(s?.sifat).toUpperCase()==='PENTING'?'selected':''}>PENTING</option><option ${String(s?.sifat).toUpperCase()==='SEGERA'?'selected':''}>SEGERA</option></select></div><div class="field"><label>Klasifikasi</label><select id="suratKlasifikasiV133"><option value="UMUM" ${String(s?.klasifikasi).toUpperCase()!=='PENCAIRAN'?'selected':''}>Umum / Disposisi Bidang</option><option value="PENCAIRAN" ${String(s?.klasifikasi).toUpperCase()==='PENCAIRAN'?'selected':''}>Pencairan</option></select></div><div class="field span-2"><label>Perihal</label><input id="suratPerihalV133" value="${esc(s?.perihal||'')}" placeholder="Perihal Nota Dinas"></div><div class="field full"><label>Isi Nota Dinas</label>${suratEditorToolbarV134()}<div id="suratIsiEditorV134" class="surat-editor-v134" contenteditable="true" oninput="updateSuratPreviewValueV134()">${initialHtml}</div><input type="hidden" id="suratIsiV133" value="${esc(initialHtml)}"><small class="field-help-v133">Gunakan toolbar untuk bold, daftar, dan paragraf agar isi surat lebih rapi seperti editor dokumen.</small></div><div class="field full"><label>Lampiran (opsional, maksimal 2 MB)</label><input id="suratFileV133" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"></div></div><div class="surat-form-note-v133">Nota Dinas yang diajukan akan masuk ke Pimpinan. Nota Dinas pencairan yang disetujui diteruskan ke Verifikator Keuangan, kemudian Bendahara.</div><div class="action-group"><button class="btn-soft" onclick="saveSuratV133(false)">Simpan Draft</button><button onclick="saveSuratV133(true)">Ajukan ke Pimpinan</button></div></section>`;
  };

  renderSuratV133 = function(){
    const area=document.getElementById('contentArea');if(!area)return;
    if(!suratWorkspaceV133.loaded){area.innerHTML=`<section class="panel premium-panel surat-loading-v133"><h3>Surat</h3><div class="skeleton-v133"></div><div class="skeleton-v133 short"></div></section>`;return;}
    const role=actualRoleV133(),canCreate=(role==='BIDANG'||role==='ADMIN'||role==='VERIFIKATOR_PBJ'||role==='VERIFIKATOR_KEUANGAN'||role==='BENDAHARA'||role==='PIMPINAN');
    const all=suratWorkspaceV133.surat||[],incoming=all.filter(suratIsIncomingV133),own=all.filter(s=>String(s.asal_id_user||'')===String(currentUser?.id_user||''));
    const body=suratTabV133==='BUAT'?`${suratFormV133()}<section class="panel premium-panel" id="suratSayaPanelV134"><h3>Surat Saya</h3><p class="panel-sub">Surat yang sudah dibuat, diajukan, atau dikembalikan untuk perbaikan akan tampil di sini.</p><div class="surat-list-v133">${own.map(suratCardV133).join('')||'<p class="empty">Belum ada surat yang dibuat.</p>'}</div></section>`:`<section class="panel fade-up premium-panel"><div class="panel-title-row"><div><h3>Surat Masuk</h3><p class="panel-sub">Daftar Nota Dinas yang memerlukan persetujuan, disposisi, atau tindak lanjut.</p></div><button class="btn-refresh" onclick="loadSuratWorkspaceV133(true)">Refresh</button></div><div class="surat-list-v133 surat-incoming-list-v134">${incoming.map(suratCardV133).join('')||'<p class="empty">Tidak ada surat masuk yang perlu ditindaklanjuti.</p>'}</div></section>`;
    area.innerHTML=`<section class="panel premium-panel surat-head-v133"><div class="panel-title-row"><div><h3>Surat</h3><p class="panel-sub">Pembuatan, persetujuan elektronik, disposisi, dan tindak lanjut Nota Dinas.</p></div></div><div class="surat-tabs-v133">${canCreate?`<button class="${suratTabV133==='BUAT'?'active':''}" onclick="setSuratTabV133('BUAT')">Buat Surat</button>`:''}<button class="${suratTabV133==='MASUK'?'active':''}" onclick="setSuratTabV133('MASUK')">Surat Masuk <span>${suratIncomingCountV134(incoming)}</span></button></div></section>${body}<div id="suratActionModalV133" class="modal-backdrop hidden"></div>`;
    setTimeout(updateSuratPreviewValueV134,0);
  };

  saveSuratV133 = async function(submit){
    const file=document.getElementById('suratFileV133')?.files?.[0];
    const nomor=document.getElementById('suratNomorV133')?.value.trim()||'';
    const perihal=document.getElementById('suratPerihalV133')?.value.trim()||'';
    const tanggal=document.getElementById('suratTanggalV133')?.value||'';
    updateSuratPreviewValueV134();
    const isiHtml=sanitizeRichHtmlV134(document.getElementById('suratIsiV133')?.value||'');
    const isiText=suratStripHtmlV134(isiHtml);
    if(!perihal||!tanggal||!isiText){ alert('Perihal, tanggal, dan isi Nota Dinas wajib diisi.'); return; }
    if(file&&file.size>MAX_UPLOAD_BYTES_V133){ alert('Ukuran lampiran maksimal 2 MB.'); return; }
    const ok=await confirmActionV133({title:submit?'Ajukan Nota Dinas':'Simpan Draft Nota Dinas',message:submit?'Nota Dinas akan diajukan kepada Pimpinan dan tercatat pada Surat Saya.':'Draft akan disimpan dan masih dapat diedit kembali.',confirmText:submit?'Ya, Ajukan':'Ya, Simpan'}); if(!ok) return;
    const data={id_surat:suratEditIdV133,nomor_surat:nomor,tanggal_surat:tanggal,sifat:document.getElementById('suratSifatV133')?.value||'BIASA',klasifikasi:document.getElementById('suratKlasifikasiV133')?.value||'UMUM',perihal,isi_ringkas:isiHtml,submit};
    showLoading(submit?'Mengajukan Nota Dinas...':'Menyimpan draft Nota Dinas...');
    try{
      if(file){ data.file_name=file.name; data.mime_type=file.type; data.file_base64=await fileToBase64(file); }
      const r=await apiPost({action:'saveSuratV133',user:currentUser,data});
      if(!r.success) throw new Error(r.message||'Gagal menyimpan surat');
      suratEditIdV133=''; sessionStorage.removeItem(suratCacheKeyV133()); await loadSuratWorkspaceV133(true); suratTabV133='BUAT'; renderSuratV133();
      setTimeout(()=>document.getElementById('suratSayaPanelV134')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
      alert(r.message||'Nota Dinas berhasil diproses');
    }catch(e){ alert(e.message||String(e)); }finally{ hideLoading(); }
  };

  openSuratActionV133 = function(id,mode){
    const s=suratWorkspaceV133.surat.find(x=>String(x.id_surat)===String(id)),m=document.getElementById('suratActionModalV133'); if(!s||!m) return;
    const bidangOptions=(suratWorkspaceV133.bidangs||[]).map(b=>`<option value="${esc(b.id_bidang)}">${esc(b.nama_bidang)}</option>`).join('');
    let content='';
    if(mode==='PIMPINAN') content=`<div class="field"><label>Tujuan Disposisi</label>${String(s.klasifikasi).toUpperCase()==='PENCAIRAN'?'<input value="Verifikator Keuangan → Bendahara" readonly>':`<select id="suratTujuanBidangV133"><option value="">Pilih bidang tujuan</option>${bidangOptions}</select>`}</div><div class="field full"><label>Catatan Disposisi</label><textarea id="suratActionCatatanV133" rows="4" placeholder="Arahan Pimpinan"></textarea></div><div class="approval-statement-v133">Dengan memilih <b>Setujui & Disposisikan</b>, saya menyatakan Nota Dinas ini telah diperiksa, disetujui, dan diberi disposisi secara elektronik melalui SIMPROV.</div><div class="modal-actions"><button class="btn-danger" onclick="submitSuratActionV133('${esc(id)}','KEMBALIKAN')">Kembalikan untuk Perbaikan</button><button class="btn-green" onclick="submitSuratActionV133('${esc(id)}','SETUJUI_DAN_DISPOSISI')">Setujui & Disposisikan</button></div>`;
    else if(mode==='KEUANGAN') content=`<div class="field full"><label>Catatan Verifikasi Keuangan</label><textarea id="suratActionCatatanV133" rows="4" placeholder="Catatan pemeriksaan atau arahan kepada Bendahara"></textarea></div><div class="modal-actions"><button class="btn-danger" onclick="submitSuratActionV133('${esc(id)}','KEMBALIKAN')">Kembalikan untuk Perbaikan</button><button class="btn-green" onclick="submitSuratActionV133('${esc(id)}','TERUSKAN_KE_BENDAHARA')">Teruskan ke Bendahara</button></div>`;
    else content=`<div class="field full"><label>Catatan Penyelesaian</label><textarea id="suratActionCatatanV133" rows="4" placeholder="Ringkasan tindak lanjut"></textarea></div><div class="modal-actions"><button class="btn-soft" onclick="closeSuratActionV133()">Batal</button><button class="btn-green" onclick="submitSuratActionV133('${esc(id)}','SELESAIKAN')">Tandai Selesai</button></div>`;
    m.className='modal-backdrop';
    m.innerHTML=`<div class="modal-card surat-action-card-v133 fade-up"><div class="modal-head"><div><h3>Tindak Lanjut Nota Dinas</h3><p>${esc(s.nomor_surat||'Belum bernomor')} • ${esc(s.perihal)}</p></div><button class="btn-soft" onclick="closeSuratActionV133()">Tutup</button></div><div class="surat-action-meta-v134"><div><b>Pengirim</b><span>${esc(s.asal_nama||'-')}</span></div><div><b>Bidang</b><span>${esc(bidangName(s.asal_bidang)||s.asal_bidang||'-')}</span></div><div><b>Status Saat Ini</b><span>${esc(s.status_surat||'-')}</span></div></div>${content}</div>`;
  };

  printNotaDinasV133 = function(id){
    const s=suratWorkspaceV133.surat.find(x=>String(x.id_surat)===String(id)); if(!s) return;
    const w=window.open('','_blank'); if(!w) return alert('Popup diblokir browser. Izinkan popup untuk melihat/cetak Nota Dinas.');
    const bodyHtml=sanitizeRichHtmlV134(s.isi_ringkas||'<p>-</p>');
    const lampiranBlock=s.url_file?`<div class="page-break"></div><div class="lampiran-page"><h3>LAMPIRAN</h3><p><b>Nama File:</b> ${esc(s.nama_file||'Lampiran')}</p><p><b>Tautan Dokumen:</b> <a href="${esc(s.url_file)}" target="_blank" rel="noopener">${esc(s.url_file)}</a></p><p class="lampiran-note">Lampiran berada pada halaman setelah isi surat agar paket nota dinas dan lampiran tercatat dalam satu berkas cetak/digital.</p></div>`:'';
    const sender=`<div class="sign-box left"><div class="sign-title">Mengetahui / Menyetujui</div>${s.persetujuan_digital?`<div class="ttd-mark">TTE SIMPROV</div><div class="sign-name"><b>${esc(s.disetujui_oleh||'Pimpinan')}</b></div><div class="sign-role">Pimpinan</div><small>${esc(s.persetujuan_digital)}</small>`:`<div class="sign-space"></div><div class="sign-name"><b>Belum disetujui</b></div><div class="sign-role">Pimpinan</div>`}</div>`;
    const pengirim=`<div class="sign-box right"><div class="sign-title">Pengirim</div><div class="sign-space"></div><div class="sign-name"><b>${esc(s.asal_nama||'-')}</b></div><div class="sign-role">${esc(roleLabelV133(s.asal_role||'BIDANG'))}</div><small>TTE Pengirim • SIMPROV</small></div>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Nota Dinas ${esc(s.nomor_surat||'')}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Georgia, 'Times New Roman', serif;color:#111;font-size:12pt;line-height:1.48;margin:0}.toolbar{position:sticky;top:0;padding:10px 14px;background:#eef6fd;border-bottom:1px solid #d1e2ee;display:flex;justify-content:flex-end;gap:8px}.toolbar button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer}.print{background:#0f6fb3;color:#fff}.close{background:#e9eef3}.sheet{padding:12px 4px}.title{text-align:center;margin:0 0 18px}.title h2{margin:0 0 4px;font-size:18pt}.title .nomor{font-size:11pt}.meta{width:100%;border-collapse:collapse;margin-bottom:14px}.meta td{padding:1px 4px;vertical-align:top}.meta td:first-child{width:110px}.meta td:nth-child(2){width:12px}.isi{line-height:1.55;text-align:justify}.isi p{margin:0 0 10px}.isi ul,.isi ol{margin:0 0 10px 24px}.ttd-row{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:28px;align-items:end}.sign-box{text-align:center}.sign-title{font-weight:700;margin-bottom:8px}.ttd-mark{display:inline-block;padding:6px 10px;border:1px dashed #2563a6;border-radius:10px;color:#2563a6;font-size:10pt;font-weight:700}.sign-space{height:72px}.sign-name{margin-top:8px}.sign-role{font-size:10pt}.page-break{page-break-before:always}.lampiran-page h3{text-align:center;margin-top:0}.lampiran-note{font-size:10pt;color:#455}.footer{margin-top:18px;font-size:9.5pt;color:#566}@media print{.toolbar{display:none}.sheet{padding:0}}</style></head><body><div class="toolbar"><button class="close" onclick="window.close()">Tutup</button><button class="print" onclick="window.print()">Cetak / Simpan PDF</button></div><div class="sheet"><div class="title"><h2>NOTA DINAS</h2><div class="nomor">Nomor: ${esc(s.nomor_surat||'-')}</div></div><table class="meta"><tr><td>Kepada</td><td>:</td><td>${esc(s.tujuan_role==='BIDANG'?(suratWorkspaceV133.bidangs.find(b=>String(b.id_bidang)===String(s.tujuan_bidang))?.nama_bidang||s.tujuan_bidang||'-'):(s.tujuan_role||'PIMPINAN'))}</td></tr><tr><td>Dari</td><td>:</td><td>${esc(s.asal_nama||'-')} ${s.asal_bidang?`(${esc(bidangName(s.asal_bidang)||s.asal_bidang)})`:''}</td></tr><tr><td>Tanggal</td><td>:</td><td>${esc(formatDate(s.tanggal_surat)||'-')}</td></tr><tr><td>Sifat</td><td>:</td><td>${esc(s.sifat||'BIASA')}</td></tr><tr><td>Perihal</td><td>:</td><td>${esc(s.perihal||'-')}</td></tr></table><div class="isi">${bodyHtml}</div><div class="ttd-row">${sender}${pengirim}</div><div class="footer">Dokumen dibuat dan dicatat melalui SIMPROV • ID Surat: ${esc(s.id_surat||'-')}</div>${lampiranBlock}</div></body></html>`);
    w.document.close();
  };
})();

/* =========================================================
   SIMPROV v135 - Upload maksimal, progress 0-100%, modal di atas,
   verifikasi Pengadaan Langsung realtime, hapus dokumen duplikat.
   ========================================================= */
(function(){
  const MAX_UPLOAD_CONCURRENCY_V135 = 3;
  const uploadBusyV135 = new Set();
  let progressPulseV135 = null;
  let progressValueV135 = 0;
  let hideLoadingTimerV135 = null;

  function ensureLoadingProgressV135(){
    const overlay=document.getElementById('loadingOverlay');
    const card=overlay?.querySelector('.loader-card');
    if(!overlay||!card)return null;
    let wrap=document.getElementById('loadingProgressWrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='loadingProgressWrap';
      wrap.className='loading-progress-wrap hidden';
      wrap.innerHTML='<div class="loading-progress-head"><span id="loadingProgressDetail">Menyiapkan proses...</span><b id="loadingProgressPercent">0%</b></div><div class="loading-progress-track"><i id="loadingProgressBar" style="width:0%"></i></div>';
      card.appendChild(wrap);
    }
    return wrap;
  }
  function stopProgressPulseV135(){if(progressPulseV135){clearInterval(progressPulseV135);progressPulseV135=null;}}
  function setLoadingProgressV135(percent,detail,force=false){
    const wrap=ensureLoadingProgressV135();if(!wrap)return;
    let p=Math.max(0,Math.min(100,Math.round(Number(percent)||0)));
    if(!force&&p<progressValueV135)p=progressValueV135;
    progressValueV135=p;
    wrap.classList.remove('hidden');
    const bar=document.getElementById('loadingProgressBar'),pct=document.getElementById('loadingProgressPercent'),det=document.getElementById('loadingProgressDetail');
    if(bar)bar.style.width=p+'%';if(pct)pct.textContent=p+'%';if(det&&detail)det.textContent=detail;
  }
  function startProgressPulseV135(max=92){
    stopProgressPulseV135();
    progressPulseV135=setInterval(()=>{
      if(progressValueV135>=max)return;
      const step=progressValueV135<35?2:progressValueV135<70?1:.5;
      setLoadingProgressV135(Math.min(max,progressValueV135+step),'Memproses file di server...');
    },350);
  }
  function showProgressLoadingV135(text,{upload=true,detail='Menyiapkan file...'}={}){
    if(hideLoadingTimerV135){clearTimeout(hideLoadingTimerV135);hideLoadingTimerV135=null;}
    stopProgressPulseV135();progressValueV135=0;
    const overlay=document.getElementById('loadingOverlay');
    const txt=document.getElementById('loadingText'),sub=document.getElementById('loadingSubtext');
    if(txt)txt.textContent=text||'Memproses...';if(sub)sub.textContent=upload?'Jangan tutup halaman sampai proses selesai':'Mohon tunggu sebentar';
    overlay?.classList.remove('hidden');overlay?.classList.toggle('upload-mode-v135',!!upload);
    setLoadingProgressV135(0,detail,true);
  }
  async function finishProgressLoadingV135(detail='Selesai'){
    stopProgressPulseV135();setLoadingProgressV135(100,detail,true);
    await new Promise(r=>setTimeout(r,150));
    document.getElementById('loadingOverlay')?.classList.add('hidden');
    document.getElementById('loadingOverlay')?.classList.remove('upload-mode-v135');
  }
  function failProgressLoadingV135(){
    stopProgressPulseV135();
    document.getElementById('loadingOverlay')?.classList.add('hidden');
    document.getElementById('loadingOverlay')?.classList.remove('upload-mode-v135');
  }

  const showLoadingV135Base=showLoading;
  showLoading=function(text='Memproses...'){
    const isUpload=/upload|unggah|mengunggah/i.test(String(text));
    if(isUpload){showProgressLoadingV135(text,{upload:true});return;}
    stopProgressPulseV135();progressValueV135=0;
    ensureLoadingProgressV135()?.classList.add('hidden');
    document.getElementById('loadingOverlay')?.classList.remove('upload-mode-v135');
    return showLoadingV135Base(text);
  };
  const hideLoadingV135Base=hideLoading;
  hideLoading=function(){stopProgressPulseV135();return hideLoadingV135Base();};

  /* Fungsi lama yang menulis teks "1/8" otomatis ikut menggerakkan garis progres. */
  const loadingTextV135=document.getElementById('loadingText');
  if(loadingTextV135&&typeof MutationObserver!=='undefined'){
    new MutationObserver(()=>{
      const overlay=document.getElementById('loadingOverlay');
      if(!overlay||!overlay.classList.contains('upload-mode-v135'))return;
      const text=loadingTextV135.textContent||'';
      const m=text.match(/(\d+)\s*\/\s*(\d+)/);
      if(m){const cur=Number(m[1]),tot=Math.max(1,Number(m[2]));setLoadingProgressV135(Math.min(94,Math.round(((cur-1)/tot)*90)),text);}
    }).observe(loadingTextV135,{childList:true,characterData:true,subtree:true});
  }

  async function fastUploadBatchV135(items,{key='default',title='Mengunggah dokumen...',handler,onSuccess}={}){
    if(uploadBusyV135.has(key)){alert('Proses upload yang sama masih berjalan. Tunggu sampai selesai.');return {ok:0,gagal:['Upload masih berjalan']};}
    if(!items.length)return {ok:0,gagal:[]};
    const oversized=items.find(x=>x.file&&Number(x.file.size||0)>MAX_UPLOAD_BYTES_V133);
    if(oversized){alert(`File ${oversized.file.name} melebihi 2 MB.`);return {ok:0,gagal:[oversized.file.name]};}
    uploadBusyV135.add(key);showProgressLoadingV135(title,{upload:true,detail:'Membaca file 0/'+items.length});
    try{
      let prepDone=0;
      const prepared=await Promise.all(items.map(async item=>{
        const base64=await fileToBase64(item.file);
        prepDone++;setLoadingProgressV135(Math.round((prepDone/items.length)*20),`Membaca file ${prepDone}/${items.length}: ${item.file.name}`);
        return {...item,base64};
      }));
      let cursor=0,done=0,ok=0;const gagal=[],results=[];
      startProgressPulseV135(92);
      const worker=async()=>{
        while(true){
          const idx=cursor++;if(idx>=prepared.length)return;
          const item=prepared[idx];
          const txt=document.getElementById('loadingText');if(txt)txt.textContent=`Mengunggah ${idx+1}/${prepared.length}: ${item.label||item.file.name}`;
          try{
            const r=await handler(item,idx);
            if(!r?.success)throw new Error(r?.message||'Upload gagal');
            ok++;results.push({item,response:r});if(onSuccess)onSuccess(item,r);
          }catch(e){gagal.push(`${item.label||item.file.name}: ${e.message||e}`);}
          finally{done++;setLoadingProgressV135(20+Math.round((done/prepared.length)*80),`Selesai ${done}/${prepared.length} file`);}
        }
      };
      await Promise.all(Array.from({length:Math.min(MAX_UPLOAD_CONCURRENCY_V135,prepared.length)},worker));
      await finishProgressLoadingV135(gagal.length?`${ok} berhasil, ${gagal.length} gagal`:`${ok} file berhasil diunggah`);
      return {ok,gagal,results};
    }catch(e){failProgressLoadingV135();throw e;}
    finally{uploadBusyV135.delete(key);}
  }

  function setKegiatanUploadStatusV135(id,status='MENUNGGU VERIFIKASI DOKUMEN'){
    const k=kegiatanById(id);if(k)k.status_pencairan=status;
  }
  function localUploadSuccessV135(ctx,isRevisi,idDok,r){if(r?.dokumen)updateDokumenLokalV111(ctx,isRevisi,idDok,r.dokumen);}

  uploadSemuaDokV96=async function(idKegiatan){
    const inputs=Array.from(document.querySelectorAll('.dok-file-v96')).filter(f=>f.files?.length);
    if(!inputs.length){alert('Pilih file pada baris dokumen terlebih dahulu.');return;}
    const items=inputs.map(inp=>({inp,file:inp.files[0],label:inp.dataset.jenis||inp.files[0].name,ctx:inp.dataset.ctx||'PGD',isRevisi:inp.dataset.repair==='1'&&!!inp.dataset.idd,idDok:inp.dataset.idd||''}));
    try{
      const result=await fastUploadBatchV135(items,{key:'dok-stage-'+idKegiatan,title:`Mengunggah ${items.length} dokumen...`,handler:async item=>{
        if(item.isRevisi)return item.ctx==='NON'
          ?apiPost({action:'revisiDokumenNonPengadaan',user:currentUser,id_dokumen_non:item.idDok,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64})
          :apiPost({action:'revisiDokumen',user:currentUser,id_dokumen:item.idDok,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64});
        return apiPost({action:item.ctx==='NON'?'uploadDokumenNonPengadaan':'uploadDokumen',user:currentUser,id_kegiatan:idKegiatan,jenis_dokumen:item.label,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64});
      },onSuccess:(item,r)=>localUploadSuccessV135(item.ctx,item.isRevisi,item.idDok,r)});
      if(result.ok){setKegiatanUploadStatusV135(idKegiatan);writeDashboardCache(dashboard);refreshActivePLStageV135(idKegiatan);if(!document.getElementById('modalPLV123'))renderAll();syncDashboardSilentV111();}
      alert(`${result.ok} dokumen berhasil diunggah.${result.gagal.length?`\n\nGagal:\n- ${result.gagal.join('\n- ')}`:''}`);
    }catch(e){alert('Gagal mengunggah dokumen: '+(e.message||e));}
  };

  uploadDokumen=async function(){
    const idKegiatan=document.getElementById('dokKegiatan')?.value;
    if(!idKegiatan){alert('Tidak ada kegiatan yang bisa diunggah.');return;}
    const rows=[...document.querySelectorAll('.doc-upload-row')];
    const items=rows.map(row=>({jenis:row.querySelector('.jenisDok')?.value||'',file:row.querySelector('.fileDok')?.files?.[0]})).filter(x=>x.file);
    if(!items.length){alert('Pilih minimal 1 file dokumen.');return;}
    const picked=new Set();for(const item of items){const k=docTypeKey(item.jenis);if(!k||picked.has(k)){alert('Setiap jenis dokumen hanya boleh dipilih satu kali.');return;}picked.add(k);}
    try{
      const result=await fastUploadBatchV135(items.map(x=>({...x,label:x.jenis})),{key:'pencairan-'+idKegiatan,title:`Mengunggah ${items.length} dokumen pencairan...`,handler:item=>apiPost({action:'uploadDokumen',user:currentUser,id_kegiatan:idKegiatan,jenis_dokumen:item.jenis,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64}),onSuccess:(item,r)=>localUploadSuccessV135('PGD',false,'',r)});
      if(result.ok){setKegiatanUploadStatusV135(idKegiatan);writeDashboardCache(dashboard);renderAll();syncDashboardSilentV111();}
      alert(`${result.ok} dokumen berhasil diunggah.${result.gagal.length?`\nGagal:\n- ${result.gagal.join('\n- ')}`:''}`);
    }catch(e){alert(e.message||'Gagal upload dokumen.');}
  };

  uploadAllNonV83=async function(){
    const id=document.getElementById('nonKegiatanV83')?.value;if(!id){alert('Pilih kegiatan Non Pengadaan terlebih dahulu.');return;}
    const selected=[...document.querySelectorAll('.non-upload-row-v83')].map(r=>({jenis:r.querySelector('.jenisNonDokV83')?.value,file:r.querySelector('.fileNonDokV83')?.files?.[0]})).filter(x=>x.file);
    if(!selected.length){alert('Pilih minimal satu file dokumen.');return;}
    try{
      const result=await fastUploadBatchV135(selected.map(x=>({...x,label:x.jenis})),{key:'non-'+id,title:`Mengunggah ${selected.length} dokumen Non Pengadaan...`,handler:item=>apiPost({action:'uploadDokumenNonPengadaan',user:currentUser,id_kegiatan:id,jenis_dokumen:item.jenis,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64}),onSuccess:(item,r)=>localUploadSuccessV135('NON',false,'',r)});
      if(result.ok){setKegiatanUploadStatusV135(id);writeDashboardCache(dashboard);activeMenu='Non Pengadaan';renderAll();syncDashboardSilentV111();}
      alert(`${result.ok} dokumen Non Pengadaan berhasil diunggah.${result.gagal.length?`\nGagal:\n- ${result.gagal.join('\n- ')}`:''}`);
    }catch(e){alert(e.message||e);}
  };

  uploadNonV79=async function(id){
    const file=document.getElementById('fileNon_'+id)?.files?.[0],jenis=document.getElementById('jenisNon_'+id)?.value;if(!file){alert('Pilih file terlebih dahulu');return;}
    try{const result=await fastUploadBatchV135([{file,jenis,label:jenis}],{key:'non-single-'+id+'-'+jenis,title:'Mengunggah '+jenis+'...',handler:item=>apiPost({action:'uploadDokumenNonPengadaan',user:currentUser,id_kegiatan:id,jenis_dokumen:item.jenis,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64}),onSuccess:(item,r)=>localUploadSuccessV135('NON',false,'',r)});if(result.ok){writeDashboardCache(dashboard);renderAll();syncDashboardSilentV111();}alert(result.ok?'Dokumen berhasil diunggah.':result.gagal.join('\n'));}catch(e){alert(e.message||e);}
  };
  uploadInlineNonV93=async function(id,jenis){
    if(!canCreateHonorV93())return;
    const input=document.getElementById(`inlineNonFileV93_${CSS.escape(String(id))}_${jenis==='Tanda Terima'?'tt':'bp'}`),file=input?.files?.[0];if(!file){alert(`Pilih file ${jenis} terlebih dahulu.`);return;}
    try{const result=await fastUploadBatchV135([{file,jenis,label:jenis}],{key:'non-inline-'+id+'-'+jenis,title:'Mengunggah '+jenis+'...',handler:item=>apiPost({action:'uploadDokumenNonPengadaan',user:currentUser,id_kegiatan:id,jenis_dokumen:item.jenis,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64}),onSuccess:(item,r)=>localUploadSuccessV135('NON',false,'',r)});if(result.ok){activeMenu='Non Pengadaan';writeDashboardCache(dashboard);renderAll();syncDashboardSilentV111();}alert(result.ok?'Dokumen berhasil diunggah.':result.gagal.join('\n'));}catch(e){alert(e.message||e);}
  };
  uploadDokTahapV94=async function(idKegiatan,tahap){
    const jenis=document.getElementById(`plJenis-${idKegiatan}-${tahap}`)?.value,file=document.getElementById(`plFile-${idKegiatan}-${tahap}`)?.files?.[0];if(!jenis||!file){alert('Pilih jenis dokumen dan file dulu.');return;}
    try{const result=await fastUploadBatchV135([{file,jenis,label:jenis}],{key:'tahap-'+idKegiatan+'-'+tahap,title:'Mengunggah dokumen tahap '+tahap+'...',handler:item=>apiPost({action:'uploadDokumen',user:currentUser,id_kegiatan:idKegiatan,jenis_dokumen:item.jenis,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64}),onSuccess:(item,r)=>localUploadSuccessV135('PGD',false,'',r)});if(result.ok){writeDashboardCache(dashboard);renderAll();syncDashboardSilentV111();}alert(result.ok?'Dokumen berhasil diunggah.':result.gagal.join('\n'));}catch(e){alert(e.message||e);}
  };
  uploadDokBLV95=async function(id){
    const jenis=document.getElementById('blJenisDokV95')?.value,file=document.getElementById('blFileDokV95')?.files?.[0];if(!jenis||!file){alert('Pilih jenis dokumen dan file dulu.');return;}
    try{const result=await fastUploadBatchV135([{file,jenis,label:jenis}],{key:'bl-'+id+'-'+jenis,title:'Mengunggah dokumen...',handler:item=>apiPost({action:'uploadDokumen',user:currentUser,id_kegiatan:id,jenis_dokumen:item.jenis,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64}),onSuccess:(item,r)=>localUploadSuccessV135('PGD',false,'',r)});if(result.ok){writeDashboardCache(dashboard);renderAll();syncDashboardSilentV111();}alert(result.ok?'Dokumen berhasil diunggah.':result.gagal.join('\n'));}catch(e){alert(e.message||e);}
  };

  /* Hilangkan Bukti Pembelian/Kwitansi sebagai syarat terpisah. */
  const duplicateKeyV135=dokKeyV94('Bukti Pembelian / Kwitansi');
  const pembayaranV135=(typeof TAHAPAN_PL_V94!=='undefined'?TAHAPAN_PL_V94:[]).find(x=>Number(x.no)===7);
  if(pembayaranV135)pembayaranV135.dok=pembayaranV135.dok.filter(x=>dokKeyV94(x)!==duplicateKeyV135);
  const tahapanDefV135Base=tahapanDefFeV95;
  tahapanDefFeV95=function(metode){return tahapanDefV135Base(metode).map(t=>({...t,dok:(t.dok||[]).filter(x=>dokKeyV94(x)!==duplicateKeyV135)}));};

  /* Simpan konteks popup tahap agar sesudah verifikasi dapat dirender ulang tanpa reload penuh. */
  const openTahapPLV135Base=openTahapPLV123;
  openTahapPLV123=function(id,no){const r=openTahapPLV135Base(id,no);if(document.getElementById('modalPLV123'))window.__activePLStageV135={id:String(id),no:Number(no)};return r;};
  const closeModalPLV135Base=closeModalPLV123;
  closeModalPLV123=function(){closeModalPLV135Base();window.__activePLStageV135=null;};
  function refreshActivePLStageV135(id){
    const k=kegiatanById(id);if(!k)return;
    if(activeMenu==='Pengadaan Langsung'&&String(paketAktifV95||'')===String(id))renderDetailPengadaanLangsungV123(k);
    const ctx=window.__activePLStageV135;
    if(ctx&&String(ctx.id)===String(id)){const no=ctx.no;openTahapPLV135Base(id,no);window.__activePLStageV135={id:String(id),no:Number(no)};}
  }
  window.refreshActivePLStageV135=refreshActivePLStageV135;

  function findDocLocalV135(id,ctx){
    const key=ctx==='NON'?'dokumenNonPengadaan':'dokumen',field=ctx==='NON'?'id_dokumen_non':'id_dokumen';
    return (dashboard?.[key]||[]).find(d=>String(d[field])===String(id));
  }
  function applyVerificationLocalV135(id,status,ctx,catatan){
    const d=findDocLocalV135(id,ctx);if(!d)return null;
    const valid=status==='VALID';d.status_verifikasi=valid?'VALID DOKUMEN':'PERBAIKAN DOKUMEN';
    d.catatan_admin=catatan||'';d.catatan_verifikator=catatan||'';d.catatan_Verifikator=catatan||'';d.tanggal_verifikasi=new Date().toISOString();d.verifikasi_by=currentUser?.nama||currentUser?.username||'Verifikator';
    const note=`${new Date().toLocaleString('id-ID')} - ${d.verifikasi_by}: ${valid?'Dokumen valid':'Perbaikan diminta'+(catatan?' - '+catatan:'')}`;
    d.riwayat_dokumen=d.riwayat_dokumen?d.riwayat_dokumen+'\n'+note:note;
    return d;
  }
  function refreshAfterVerificationV135(d){
    if(!d)return;
    writeDashboardCache(dashboard);
    if(document.getElementById('modalPLV123'))refreshActivePLStageV135(d.id_kegiatan);
    else renderAll();
    syncDashboardSilentV111();
  }

  verifDokV96=async function(idDok,status,ctx){
    let catatan='';
    if(status==='PERBAIKAN'){catatan=prompt('Alasan perbaikan (wajib):')||'';if(!catatan.trim()){alert('Alasan perbaikan wajib diisi.');return;}}
    const ok=await confirmActionV133({title:status==='VALID'?'Validasi Dokumen':'Minta Perbaikan Dokumen',message:status==='VALID'?'Dokumen akan dinyatakan valid dan progres paket langsung diperbarui.':'Dokumen akan dikembalikan kepada User Bidang untuk diperbaiki.',confirmText:status==='VALID'?'Ya, Validasi':'Ya, Minta Perbaikan',danger:status==='PERBAIKAN'});if(!ok)return;
    showProgressLoadingV135(status==='VALID'?'Memvalidasi dokumen...':'Mengirim permintaan perbaikan...',{upload:false,detail:'Mengirim keputusan ke server...'});startProgressPulseV135(92);
    try{
      const r=ctx==='NON'
        ?await apiPost({action:'verifyDokumenNonPengadaan',user:currentUser,id_dokumen_non:idDok,status_verifikasi:status==='VALID'?'VALID DOKUMEN':'PERBAIKAN DOKUMEN',catatan_verifikator:catatan})
        :await apiPost({action:'verifyDokumen',user:currentUser,id_dokumen:idDok,status_verifikasi:status,catatan_admin:catatan});
      if(!r.success)throw new Error(r.message||'Gagal memperbarui dokumen');
      const d=applyVerificationLocalV135(idDok,status,ctx,catatan);refreshAfterVerificationV135(d);
      await finishProgressLoadingV135('Status dokumen berhasil diperbarui');alert(r.message||'Status dokumen diperbarui');
    }catch(e){failProgressLoadingV135();alert('Gagal: '+(e.message||e));}
  };

  revisiDokumen=async function(idDokumen){
    const input=document.getElementById(`revisi_${idDokumen}`),file=input?.files?.[0];if(!file){alert('Pilih file pengganti terlebih dahulu.');return;}
    try{const result=await fastUploadBatchV135([{file,label:file.name,idDok:idDokumen}],{key:'revisi-'+idDokumen,title:'Mengunggah ulang dokumen...',handler:item=>apiPost({action:'revisiDokumen',user:currentUser,id_dokumen:item.idDok,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64}),onSuccess:(item,r)=>localUploadSuccessV135('PGD',true,item.idDok,r)});if(result.ok){writeDashboardCache(dashboard);const d=findDocLocalV135(idDokumen,'PGD');if(d&&document.getElementById('modalPLV123'))refreshActivePLStageV135(d.id_kegiatan);else renderAll();syncDashboardSilentV111();}alert(result.ok?'Dokumen perbaikan berhasil diunggah.':result.gagal.join('\n'));}catch(e){alert(e.message||'Gagal upload ulang file dokumen.');}
  };
  revisiNonDokumenV90=async function(id){
    const input=document.getElementById('revisiNon_'+id),file=input?.files?.[0];if(!file){alert('Pilih file perbaikan terlebih dahulu.');return;}
    try{const result=await fastUploadBatchV135([{file,label:file.name,idDok:id}],{key:'revisi-non-'+id,title:'Mengunggah perbaikan dokumen...',handler:item=>apiPost({action:'revisiDokumenNonPengadaan',user:currentUser,id_dokumen_non:item.idDok,file_name:item.file.name,mime_type:item.file.type,file_base64:item.base64}),onSuccess:(item,r)=>localUploadSuccessV135('NON',true,item.idDok,r)});if(result.ok){writeDashboardCache(dashboard);renderAll();syncDashboardSilentV111();}alert(result.ok?'Dokumen perbaikan berhasil diunggah.':result.gagal.join('\n'));}catch(e){alert(e.message||e);}
  };

  bulkVerifV108=async function(status){
    const ceks=[...document.querySelectorAll('.dok-cek-v108[data-idd]:checked')];if(!ceks.length){alert('Ceklis dulu dokumen yang mau diverifikasi.');return;}
    let catatan='';if(status==='PERBAIKAN'){catatan=prompt('Alasan perbaikan untuk '+ceks.length+' dokumen terpilih (wajib):')||'';if(!catatan.trim()){alert('Alasan perbaikan wajib diisi.');return;}}
    const yakin=await confirmActionV133({title:status==='VALID'?'Validasi Dokumen Terpilih':'Minta Perbaikan Dokumen',message:`${ceks.length} dokumen akan diproses sekaligus dan tampilan diperbarui langsung.`,confirmText:status==='VALID'?'Ya, Validasi Semua':'Ya, Kembalikan',danger:status==='PERBAIKAN'});if(!yakin)return;
    showProgressLoadingV135('Memproses verifikasi dokumen...',{upload:false,detail:'0/'+ceks.length+' dokumen'});startProgressPulseV135(92);
    let cursor=0,done=0,ok=0;const gagal=[],affected=new Set();
    const worker=async()=>{while(true){const i=cursor++;if(i>=ceks.length)return;const c=ceks[i],idd=c.dataset.idd,ctx=c.dataset.ctx;try{const r=ctx==='NON'?await apiPost({action:'verifyDokumenNonPengadaan',user:currentUser,id_dokumen_non:idd,status_verifikasi:status==='VALID'?'VALID DOKUMEN':'PERBAIKAN DOKUMEN',catatan_verifikator:catatan}):await apiPost({action:'verifyDokumen',user:currentUser,id_dokumen:idd,status_verifikasi:status,catatan_admin:catatan});if(!r.success)throw new Error(r.message||'gagal');ok++;const d=applyVerificationLocalV135(idd,status,ctx,catatan);if(d)affected.add(String(d.id_kegiatan));}catch(e){gagal.push(e.message||String(e));}finally{done++;setLoadingProgressV135(Math.round((done/ceks.length)*100),`${done}/${ceks.length} dokumen selesai`);}}};
    try{await Promise.all(Array.from({length:Math.min(3,ceks.length)},worker));writeDashboardCache(dashboard);const id=[...affected][0];if(id&&document.getElementById('modalPLV123'))refreshActivePLStageV135(id);else renderAll();syncDashboardSilentV111();await finishProgressLoadingV135(`${ok} dokumen berhasil diproses`);alert(`${ok} dokumen berhasil ${status==='VALID'?'divalidasi':'dikembalikan untuk perbaikan'}.${gagal.length?`\nGagal:\n- ${gagal.join('\n- ')}`:''}`);}catch(e){failProgressLoadingV135();alert(e.message||e);}
  };
})();

/* =========================================================
   SIMPROV v136 - UI Surat terang, editor Nota Dinas,
   kartu surat ringkas, TTD pengirim, dan pimpinan bidang.
   ========================================================= */
(function(){
  function sanitizeSuratHtmlV136(html){
    let out=String(html||'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/on\w+\s*=\s*"[^"]*"/gi,'').replace(/on\w+\s*=\s*'[^']*'/gi,'').replace(/javascript:/gi,'');
    out=out.replace(/<(?!\/?(p|br|b|strong|i|em|u|ul|ol|li|div)\b)[^>]+>/gi,'');
    out=out.replace(/<(div)([^>]*)>/gi,'<$1>');
    return out.trim();
  }
  function stripSuratHtmlV136(html){
    const d=document.createElement('div');d.innerHTML=String(html||'');return (d.textContent||'').replace(/\s+/g,' ').trim();
  }
  function suratDateValueV136(s){
    const v=s?.created_at||s?.tanggal_surat||s?.updated_at||'';const t=new Date(v).getTime();return Number.isFinite(t)?t:Number(s?._row||0);
  }
  function sortSuratOldestV136(list){return [...(list||[])].sort((a,b)=>suratDateValueV136(a)-suratDateValueV136(b)||Number(a?._row||0)-Number(b?._row||0));}
  function isCombinedClassV136(v){const k=String(v||'').toUpperCase().replace(/[+&]/g,' DAN ').replace(/_/g,' ').replace(/\s+/g,' ').trim();return k==='UMUM DAN PENCAIRAN'||k==='GABUNGAN';}
  function roleListV136(v){return String(v||'').toUpperCase().split(/[,;+|]/).map(x=>x.trim()).filter(Boolean);}
  function bidangSuratV136(id){return (suratWorkspaceV133?.bidangs||[]).find(b=>String(b.id_bidang)===String(id))||{};}
  function senderSignatureNameV136(s){return s?.pengirim_ttd_nama||bidangSuratV136(s?.asal_bidang)?.nama_pimpinan_bidang||s?.asal_nama||'-';}
  function klasifikasiLabelV136(v){if(isCombinedClassV136(v))return 'Umum / Disposisi Bidang + Pencairan';return String(v||'UMUM').toUpperCase()==='PENCAIRAN'?'Pencairan':'Umum / Disposisi Bidang';}

  window.execSuratEditorV136=function(cmd,value=null){
    const ed=document.getElementById('suratIsiEditorV136');if(!ed)return;ed.focus();
    try{document.execCommand(cmd,false,value);}catch(e){console.warn('Editor command gagal',cmd,e);}
    updateSuratPreviewValueV136();
  };
  window.clearSuratEditorV136=function(){
    const ed=document.getElementById('suratIsiEditorV136');if(!ed)return;
    if(stripSuratHtmlV136(ed.innerHTML)&&!window.confirm('Kosongkan seluruh isi Nota Dinas?'))return;
    ed.innerHTML='<p><br></p>';ed.focus();updateSuratPreviewValueV136();
  };
  window.removeSuratFormatV136=function(){
    const ed=document.getElementById('suratIsiEditorV136');if(!ed)return;ed.focus();
    try{document.execCommand('removeFormat',false,null);}catch(e){}
    updateSuratPreviewValueV136();
  };
  window.handleSuratEditorKeydownV136=function(event){
    if(event.key!=='Tab')return;
    event.preventDefault();
    const sel=window.getSelection();let node=sel?.anchorNode;
    if(node?.nodeType===3)node=node.parentElement;
    const li=node?.closest?.('li');
    if(li){try{document.execCommand(event.shiftKey?'outdent':'indent',false,null);}catch(e){};updateSuratPreviewValueV136();return;}
    if(event.shiftKey)return;
    try{document.execCommand('insertHTML',false,'&nbsp;&nbsp;&nbsp;&nbsp;');}catch(e){document.execCommand('insertText',false,'    ');}
    updateSuratPreviewValueV136();
  };
  window.updateSuratPreviewValueV136=function(){
    const hidden=document.getElementById('suratIsiV133'),ed=document.getElementById('suratIsiEditorV136');
    if(hidden&&ed)hidden.value=sanitizeSuratHtmlV136(ed.innerHTML);
  };
  function suratEditorToolbarV136(){
    const b=(cmd,label,title,value='null')=>`<button type="button" class="editor-btn-v136" onclick="execSuratEditorV136('${cmd}',${value})" title="${title}">${label}</button>`;
    return `<div class="surat-editor-toolbar-v136">${b('bold','B','Tebal')}${b('italic','I','Miring')}${b('underline','U','Garis bawah')}${b('insertUnorderedList','• Daftar','Daftar poin')}${b('insertOrderedList','1. Daftar','Daftar nomor')}${b('indent','→ Menjorok','Tambah inden')}${b('outdent','← Kembali','Kurangi inden')}<button type="button" class="editor-btn-v136" onclick="removeSuratFormatV136()">Hapus Format</button><button type="button" class="editor-btn-v136 clear" onclick="clearSuratEditorV136()">Clear Isi</button></div>`;
  }

  suratFormV133=function(){
    const s=(suratWorkspaceV133?.surat||[]).find(x=>String(x.id_surat)===String(suratEditIdV133));
    const today=new Date().toISOString().slice(0,10),initial=sanitizeSuratHtmlV136(s?.isi_ringkas||'<p><br></p>')||'<p><br></p>',k=String(s?.klasifikasi||'UMUM').toUpperCase();
    return `<section class="panel fade-up premium-panel surat-form-panel-v133 surat-form-v136"><div class="panel-title-row"><div><h3>${s?'Perbaiki Nota Dinas':'Buat Surat'}</h3><p class="panel-sub">Isi Nota Dinas, tandatangani secara elektronik, lalu ajukan kepada Pimpinan.</p></div>${s?`<button class="btn-soft" onclick="cancelEditSuratV133()">Batal Edit</button>`:''}</div><div class="form-grid"><div class="field"><label>Jenis Surat</label><input value="Nota Dinas" readonly></div><div class="field"><label>Nomor Nota Dinas</label><input id="suratNomorV133" value="${esc(s?.nomor_surat||'')}" placeholder="Contoh: 10234/NotaDinas/140726"></div><div class="field"><label>Tanggal Surat</label><input id="suratTanggalV133" type="date" value="${esc(normalizeDateForInputV61(s?.tanggal_surat)||today)}"></div><div class="field"><label>Sifat</label><select id="suratSifatV133"><option ${String(s?.sifat).toUpperCase()==='BIASA'?'selected':''}>BIASA</option><option ${String(s?.sifat).toUpperCase()==='PENTING'?'selected':''}>PENTING</option><option ${String(s?.sifat).toUpperCase()==='SEGERA'?'selected':''}>SEGERA</option></select></div><div class="field"><label>Klasifikasi</label><select id="suratKlasifikasiV133"><option value="UMUM" ${k==='UMUM'?'selected':''}>Umum / Disposisi Bidang</option><option value="PENCAIRAN" ${k==='PENCAIRAN'?'selected':''}>Pencairan</option><option value="UMUM_DAN_PENCAIRAN" ${isCombinedClassV136(k)?'selected':''}>Umum / Disposisi Bidang + Pencairan</option></select></div><div class="field span-2"><label>Perihal</label><input id="suratPerihalV133" value="${esc(s?.perihal||'')}" placeholder="Perihal Nota Dinas"></div><div class="field full"><label>Isi Nota Dinas</label>${suratEditorToolbarV136()}<div id="suratIsiEditorV136" class="surat-editor-v136" contenteditable="true" spellcheck="true" oninput="updateSuratPreviewValueV136()" onkeydown="handleSuratEditorKeydownV136(event)">${initial}</div><input type="hidden" id="suratIsiV133" value="${esc(initial)}"><small class="field-help-v133">Tekan Tab untuk membuat paragraf menjorok. Shift+Tab mengurangi inden pada daftar.</small></div><div class="field full"><label>Lampiran (opsional, maksimal 2 MB)</label><input id="suratFileV133" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"></div></div><div class="surat-form-note-v133">Tanda tangan elektronik pengirim dicatat saat surat diajukan. Surat yang sudah diajukan langsung tampil pada bagian Surat Saya.</div><div class="action-group"><button class="btn-soft" onclick="saveSuratV133(false)">Simpan Draft</button><button class="surat-submit-v136" onclick="saveSuratV133(true)">TTD dan Ajukan ke Pimpinan</button></div></section>`;
  };

  suratIsIncomingV133=function(s){
    const role=actualRoleV133(),status=String(s?.status_surat||'DRAFT').toUpperCase(),roles=roleListV136(s?.current_role),idb=String(currentUser?.id_bidang||''),uid=String(currentUser?.id_user||''),own=String(s?.asal_id_user||'')===uid;
    if(status==='DRAFT'||own)return false;
    if(role==='ADMIN')return true;
    if(role==='PIMPINAN')return status==='DIAJUKAN KE PIMPINAN'||roles.includes('PIMPINAN');
    if(role==='BIDANG')return roles.includes('BIDANG')&&String(s?.current_bidang||'')===idb;
    return roles.includes(role)||String(s?.current_id_user||'')===uid;
  };

  suratPipelineV133=function(s){
    const status=String(s?.status_surat||'DRAFT').toUpperCase(),steps=['Draft','Diajukan','Disetujui','Didisposisi','Tindak Lanjut','Selesai'];
    let active=1;
    if(status.includes('DIAJUKAN')||status.includes('PERBAIKAN'))active=2;
    if(s?.persetujuan_digital||status.includes('DIDISPOSISIKAN')||status.includes('DITINDAKLANJUTI')||status.includes('DITERUSKAN')||status.includes('SELESAI'))active=3;
    if(status.includes('DIDISPOSISIKAN'))active=4;
    if(status.includes('TINDAK')||status.includes('DITERUSKAN')||status.includes('MENUNGGU'))active=5;
    if(status==='SELESAI')active=6;
    const returned=status.includes('PERBAIKAN')?`<div class="surat-return-banner-v134"><b>Dikembalikan untuk perbaikan</b><span>${esc(s?.disposisi_catatan||'Periksa catatan, perbaiki surat, lalu ajukan ulang.')}</span></div>`:'';
    return `${returned}<div class="surat-pipeline-v133">${steps.map((x,i)=>`<div class="${i+1<active?'done':i+1===active?'active':''}"><span>${i+1}</span><b>${x}</b></div>`).join('')}</div>`;
  };

  const suratActionButtonsBaseV136=suratActionButtonsV133;
  suratActionButtonsV133=function(s){
    if(!isCombinedClassV136(s?.klasifikasi))return suratActionButtonsBaseV136(s);
    const role=actualRoleV133(),status=String(s?.status_surat||'').toUpperCase(),own=String(s?.asal_id_user||'')===String(currentUser?.id_user||''),out=[];
    out.push(`<button class="btn-soft" onclick="printNotaDinasV133('${esc(s.id_surat)}')">Lihat / Cetak Nota Dinas</button>`);
    if(own&&['DRAFT','PERLU PERBAIKAN'].includes(status))out.push(`<button onclick="editSuratV133('${esc(s.id_surat)}')">${status==='DRAFT'?'Lanjutkan Draft':'Perbaiki & Ajukan Ulang'}</button>`);
    if((role==='PIMPINAN'||role==='ADMIN')&&status==='DIAJUKAN KE PIMPINAN')out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','PIMPINAN')">Periksa & Disposisi</button>`);
    if((role==='VERIFIKATOR_KEUANGAN'||role==='ADMIN')&&String(s?.tindak_lanjut_keuangan||'').toUpperCase()!=='SELESAI'&&!status.includes('DIAJUKAN'))out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','KEUANGAN')">Verifikasi Pencairan</button>`);
    if((role==='BENDAHARA'||role==='ADMIN')&&String(s?.tindak_lanjut_keuangan||'').toUpperCase()==='MENUNGGU BENDAHARA')out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','SELESAI_KEUANGAN')">Selesaikan Pencairan</button>`);
    if((role==='BIDANG'||role==='ADMIN')&&String(s?.tindak_lanjut_bidang||'').toUpperCase()!=='SELESAI'&&String(s?.current_bidang||'')&&(role==='ADMIN'||String(s.current_bidang)===String(currentUser?.id_bidang||'')))out.push(`<button class="btn-green" onclick="openSuratActionV133('${esc(s.id_surat)}','SELESAI_BIDANG')">Selesaikan Tindak Lanjut Bidang</button>`);
    return out.join('');
  };

  function suratCompactCardV136(s,no,mode){
    const asalBidang=bidangName(s?.asal_bidang)||bidangSuratV136(s?.asal_bidang)?.nama_bidang||s?.asal_bidang||'-';
    const tujuanBidang=bidangSuratV136(s?.tujuan_bidang)?.nama_bidang||s?.tujuan_bidang||'-';
    const pending=String(s?.status_surat||'').toUpperCase()==='DIAJUKAN KE PIMPINAN';
    const tujuan=pending?'Pimpinan':(isCombinedClassV136(s?.klasifikasi)?`${tujuanBidang} + Verifikator Keuangan`:(s?.tujuan_role==='BIDANG'?tujuanBidang:(s?.tujuan_role||'Pimpinan')));
    const html=sanitizeSuratHtmlV136(s?.isi_ringkas||'<p>-</p>');
    return `<details class="surat-package-card-v136"><summary><span class="surat-number-v136">${no}</span><div class="surat-summary-title-v136"><b>${esc(s?.perihal||'-')}</b><small>Surat ke-${no} • ${esc(formatDate(s?.tanggal_surat||s?.created_at)||'-')} • ${esc(s?.nomor_surat||'Belum bernomor')}</small>${mode==='MASUK'?`<em>Dari ${esc(s?.asal_nama||'-')} — ${esc(asalBidang)}</em>`:''}</div>${suratStatusChipV133(s?.status_surat)}</summary><div class="surat-package-detail-v136">${suratPipelineV133(s)}<div class="surat-meta-grid-v134"><span><b>Pengirim:</b> ${esc(s?.asal_nama||'-')}</span><span><b>Pimpinan Bidang:</b> ${esc(senderSignatureNameV136(s))}</span><span><b>Bidang:</b> ${esc(asalBidang)}</span><span><b>Klasifikasi:</b> ${esc(klasifikasiLabelV136(s?.klasifikasi))}</span><span><b>Tujuan:</b> ${esc(tujuan)}</span><span><b>Tanggal:</b> ${esc(formatDate(s?.tanggal_surat||s?.created_at)||'-')}</span></div><div class="surat-summary-v133"><div class="surat-rich-view-v134">${html}</div>${s?.disposisi_catatan?`<div><b>Catatan Disposisi:</b> ${esc(s.disposisi_catatan)}</div>`:''}${s?.url_file?`<div><button type="button" class="btn-soft surat-attachment-btn-v137" onclick="lihatLampiranSuratV137('${esc(s.id_surat)}')">Lihat Lampiran: ${esc(s.nama_file||'Lampiran')}</button></div>`:''}</div><details class="surat-history-v133"><summary>Riwayat Surat</summary><pre>${esc(s?.riwayat_surat||'Belum ada riwayat')}</pre></details><div class="action-group surat-actions-v133">${suratActionButtonsV133(s)}</div></div></details>`;
  }

  renderSuratV133=function(){
    const area=document.getElementById('contentArea');if(!area)return;
    if(!suratWorkspaceV133.loaded){area.innerHTML=`<section class="panel premium-panel surat-loading-v133"><h3>Surat</h3><div class="skeleton-v133"></div><div class="skeleton-v133 short"></div></section>`;return;}
    const role=actualRoleV133(),canCreate=['BIDANG','ADMIN','VERIFIKATOR_PBJ','VERIFIKATOR_KEUANGAN','BENDAHARA','PIMPINAN'].includes(role),all=suratWorkspaceV133.surat||[];
    const incoming=sortSuratOldestV136(all.filter(suratIsIncomingV133)),own=sortSuratOldestV136(all.filter(s=>String(s.asal_id_user||'')===String(currentUser?.id_user||'')));
    const ownCards=own.map((s,i)=>suratCompactCardV136(s,i+1,'SENDIRI')).join('');
    const incomingCards=incoming.map((s,i)=>suratCompactCardV136(s,i+1,'MASUK')).join('');
    const body=suratTabV133==='BUAT'?`${suratFormV133()}<section class="panel premium-panel surat-own-panel-v136" id="suratSayaPanelV134"><div class="panel-title-row"><div><h3>Surat Saya</h3><p class="panel-sub">Diurutkan dari surat paling lama. Klik kartu untuk melihat isi, pipeline, dan tindakan.</p></div><span class="surat-count-v136">${own.length} surat</span></div><div class="surat-package-list-v136">${ownCards||'<p class="empty">Belum ada surat yang dibuat.</p>'}</div></section>`:`<section class="panel fade-up premium-panel surat-inbox-v136"><div class="panel-title-row"><div><h3>Surat Masuk</h3><p class="panel-sub">Diurutkan dari surat paling lama agar tindak lanjut tidak terlewat.</p></div><button class="btn-refresh" onclick="loadSuratWorkspaceV133(true)">Refresh</button></div><div class="surat-package-list-v136">${incomingCards||'<p class="empty">Tidak ada surat masuk yang perlu ditindaklanjuti.</p>'}</div></section>`;
    area.innerHTML=`<div class="surat-page-v136"><section class="panel premium-panel surat-head-v133"><div class="panel-title-row"><div><h3>Surat</h3><p class="panel-sub">Pembuatan, tanda tangan elektronik, persetujuan, disposisi, dan tindak lanjut Nota Dinas.</p></div></div><div class="surat-tabs-v133">${canCreate?`<button class="${suratTabV133==='BUAT'?'active':''}" onclick="setSuratTabV133('BUAT')">Buat Surat</button>`:''}<button class="${suratTabV133==='MASUK'?'active':''}" onclick="setSuratTabV133('MASUK')">Surat Masuk <span>${incoming.filter(x=>String(x.status_surat).toUpperCase()!=='SELESAI').length}</span></button></div></section>${body}<div id="suratActionModalV133" class="modal-backdrop hidden"></div></div>`;
    setTimeout(updateSuratPreviewValueV136,0);
  };

  openSuratActionV133=function(id,mode){
    const s=(suratWorkspaceV133.surat||[]).find(x=>String(x.id_surat)===String(id)),m=document.getElementById('suratActionModalV133');if(!s||!m)return;
    const options=(suratWorkspaceV133.bidangs||[]).map(b=>`<option value="${esc(b.id_bidang)}">${esc(b.nama_bidang)}</option>`).join('');let content='';
    if(mode==='PIMPINAN'){
      const combined=isCombinedClassV136(s.klasifikasi),pencairan=String(s.klasifikasi).toUpperCase()==='PENCAIRAN';
      content=`<div class="field"><label>Tujuan Disposisi</label>${pencairan?'<input value="Verifikator Keuangan → Bendahara" readonly>':`<select id="suratTujuanBidangV133"><option value="">Pilih bidang tujuan</option>${options}</select>`}</div>${combined?'<div class="surat-route-note-v136">Surat juga akan diteruskan ke Verifikator Keuangan untuk jalur pencairan.</div>':''}<div class="field full"><label>Catatan Disposisi</label><textarea id="suratActionCatatanV133" rows="4" placeholder="Arahan Pimpinan"></textarea></div><div class="approval-statement-v133">Dengan memilih <b>Setujui & Disposisikan</b>, Pimpinan menyatakan surat telah diperiksa dan disetujui secara elektronik melalui SIMPROV.</div><div class="modal-actions"><button class="btn-danger" onclick="submitSuratActionV133('${esc(id)}','KEMBALIKAN')">Kembalikan untuk Perbaikan</button><button class="btn-green" onclick="submitSuratActionV133('${esc(id)}','SETUJUI_DAN_DISPOSISI')">Setujui & Disposisikan</button></div>`;
    }else if(mode==='KEUANGAN')content=`<div class="field full"><label>Catatan Verifikasi Keuangan</label><textarea id="suratActionCatatanV133" rows="4" placeholder="Catatan pemeriksaan atau arahan kepada Bendahara"></textarea></div><div class="modal-actions"><button class="btn-danger" onclick="submitSuratActionV133('${esc(id)}','KEMBALIKAN')">Kembalikan untuk Perbaikan</button><button class="btn-green" onclick="submitSuratActionV133('${esc(id)}','TERUSKAN_KE_BENDAHARA')">Teruskan ke Bendahara</button></div>`;
    else {const decision=mode==='SELESAI_BIDANG'?'SELESAIKAN_BIDANG':mode==='SELESAI_KEUANGAN'?'SELESAIKAN_KEUANGAN':'SELESAIKAN',title=mode==='SELESAI_BIDANG'?'Catatan Tindak Lanjut Bidang':mode==='SELESAI_KEUANGAN'?'Catatan Penyelesaian Pencairan':'Catatan Penyelesaian';content=`<div class="field full"><label>${title}</label><textarea id="suratActionCatatanV133" rows="4" placeholder="Ringkasan tindak lanjut"></textarea></div><div class="modal-actions"><button class="btn-soft" onclick="closeSuratActionV133()">Batal</button><button class="btn-green" onclick="submitSuratActionV133('${esc(id)}','${decision}')">Tandai Selesai</button></div>`;}
    m.className='modal-backdrop';m.innerHTML=`<div class="modal-card surat-action-card-v133 fade-up"><div class="modal-head"><div><h3>Tindak Lanjut Nota Dinas</h3><p>${esc(s.nomor_surat||'Belum bernomor')} • ${esc(s.perihal||'-')}</p></div><button class="btn-soft" onclick="closeSuratActionV133()">Tutup</button></div><div class="surat-action-meta-v134"><div><b>Pengirim</b><span>${esc(s.asal_nama||'-')}</span></div><div><b>Bidang</b><span>${esc(bidangName(s.asal_bidang)||bidangSuratV136(s.asal_bidang).nama_bidang||'-')}</span></div><div><b>Klasifikasi</b><span>${esc(klasifikasiLabelV136(s.klasifikasi))}</span></div><div><b>Status Saat Ini</b><span>${esc(s.status_surat||'-')}</span></div></div>${content}</div>`;
  };

  submitSuratActionV133=async function(id,keputusan){
    const catatan=document.getElementById('suratActionCatatanV133')?.value.trim()||'',tujuan_bidang=document.getElementById('suratTujuanBidangV133')?.value||'';
    const labels={SETUJUI_DAN_DISPOSISI:'menyetujui dan mendisposisikan Nota Dinas',TERUSKAN_KE_BENDAHARA:'meneruskan Nota Dinas kepada Bendahara',KEMBALIKAN:'mengembalikan Nota Dinas untuk perbaikan',SELESAIKAN:'menyelesaikan tindak lanjut Nota Dinas',SELESAIKAN_BIDANG:'menyelesaikan tindak lanjut bidang',SELESAIKAN_KEUANGAN:'menyelesaikan tindak lanjut pencairan'};
    if(keputusan==='KEMBALIKAN'&&!catatan){alert('Catatan perbaikan wajib diisi.');return;}
    const ok=await confirmActionV133({title:'Konfirmasi Proses Surat',message:`Anda akan ${labels[keputusan]||'memproses Nota Dinas'}. Nama petugas dan waktu proses akan dicatat dalam riwayat surat.`,confirmText:'Ya, Proses',danger:keputusan==='KEMBALIKAN'});if(!ok)return;
    showLoading('Memperbarui status surat...');
    try{const r=await apiPost({action:'actionSuratV133',user:currentUser,id_surat:id,keputusan,catatan,tujuan_bidang});if(!r.success)throw new Error(r.message||'Gagal memproses surat');closeSuratActionV133();sessionStorage.removeItem(suratCacheKeyV133());await loadSuratWorkspaceV133(true);renderSuratV133();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}
  };

  printNotaDinasV133=async function(id){
    const s=(suratWorkspaceV133.surat||[]).find(x=>String(x.id_surat)===String(id));if(!s)return;
    const w=window.open('','_blank');if(!w)return alert('Popup diblokir browser. Izinkan popup untuk melihat/cetak Nota Dinas.');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Menyiapkan Nota Dinas...</title><style>body{font-family:Arial,sans-serif;display:grid;place-items:center;min-height:90vh;color:#174f75}.load{padding:24px;border:1px solid #cfe1ed;border-radius:16px;background:#f7fcff}</style></head><body><div class="load">Menyiapkan Nota Dinas dan lampiran...</div></body></html>');w.document.close();
    let lampiranData=null;
    if(s.url_file){
      try{
        const r=await apiPost({action:'getSuratLampiranV137',user:currentUser,id_surat:id});
        if(r?.success&&r.base64)lampiranData=r;
      }catch(e){console.warn('Lampiran surat tidak dapat dimuat melalui sistem',e);}
    }
    const body=sanitizeSuratHtmlV136(s.isi_ringkas||'<p>-</p>'),senderName=senderSignatureNameV136(s),senderSigned=!!s.pengirim_ttd_digital||String(s.status_surat||'').toUpperCase()!=='DRAFT';
    const approval=`<div class="sign-box"><div class="sign-title">Mengetahui / Menyetujui</div>${s.persetujuan_digital?`<div class="ttd-mark">TTE SIMPROV</div><div class="sign-name"><b>${esc(s.disetujui_oleh||'Pimpinan')}</b></div><div class="sign-role">Pimpinan</div><small>${esc(s.persetujuan_digital)}</small>`:`<div class="sign-space"></div><div class="sign-name"><b>Belum disetujui</b></div><div class="sign-role">Pimpinan</div>`}</div>`;
    const sender=`<div class="sign-box"><div class="sign-title">Pengirim</div>${senderSigned?`<div class="ttd-mark">TTE SIMPROV</div><div class="sign-name"><b>${esc(senderName)}</b></div><div class="sign-role">Pimpinan Bidang</div><small>${esc(s.pengirim_ttd_digital||'Ditandatangani secara elektronik melalui SIMPROV')}</small>`:`<div class="sign-space"></div><div class="sign-name"><b>${esc(senderName)}</b></div><div class="sign-role">Pimpinan Bidang</div>`}</div>`;
    let lampiran='';
    if(s.url_file){
      const nama=esc(lampiranData?.file_name||s.nama_file||'Lampiran'),mime=String(lampiranData?.mime_type||'').toLowerCase();
      if(lampiranData?.base64){
        const dataUrl=`data:${lampiranData.mime_type||'application/octet-stream'};base64,${lampiranData.base64}`;
        const preview=mime.startsWith('image/')?`<img class="lampiran-img" src="${dataUrl}" alt="${nama}">`:mime==='application/pdf'?`<iframe class="lampiran-frame" src="${dataUrl}" title="${nama}"></iframe>`:`<div class="lampiran-file"><p>Pratinjau tidak tersedia untuk jenis file ini.</p><a download="${nama}" href="${dataUrl}">Unduh ${nama}</a></div>`;
        lampiran=`<div class="page-break"></div><section class="lampiran"><h3>LAMPIRAN NOTA DINAS</h3><p><b>Nama file:</b> ${nama}</p><p class="lampiran-note">Lampiran dimuat langsung melalui SIMPROV sehingga tidak memerlukan izin Google Drive terpisah.</p>${preview}</section>`;
      }else{
        lampiran=`<div class="page-break"></div><section class="lampiran"><h3>LAMPIRAN NOTA DINAS</h3><p><b>Nama file:</b> ${nama}</p><p class="lampiran-error">Lampiran belum dapat dimuat. Tutup halaman ini lalu coba kembali.</p></section>`;
      }
    }
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Nota Dinas ${esc(s.nomor_surat||'')}</title><style>@page{size:A4;margin:17mm}*{box-sizing:border-box}body{font-family:Georgia,'Times New Roman',serif;color:#111;font-size:12pt;line-height:1.5;margin:0}.toolbar{position:sticky;top:0;z-index:5;padding:10px;background:#eef8ff;display:flex;justify-content:flex-end;gap:8px}.toolbar button{border:1px solid #bcd8ea;border-radius:9px;padding:9px 14px;background:#f7fcff;color:#14517d;font-weight:700}.sheet{padding:10px 2px}.title{text-align:center;margin-bottom:18px}.title h2{margin:0 0 5px}.meta{width:100%;border-collapse:collapse;margin-bottom:18px}.meta td{padding:2px 4px;vertical-align:top}.meta td:first-child{width:105px}.meta td:nth-child(2){width:12px}.isi{text-align:justify;line-height:1.55}.isi p{margin:0 0 9px}.isi ul,.isi ol{margin:0 0 9px 25px}.ttd-row{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-top:34px}.sign-box{text-align:center}.sign-title{font-weight:700;margin-bottom:10px}.ttd-mark{display:inline-block;border:1px dashed #2673aa;color:#2673aa;border-radius:9px;padding:6px 10px;font-size:9.5pt;font-weight:700}.sign-space{height:66px}.sign-name{margin-top:10px}.sign-role{font-size:10pt}.sign-box small{display:block;color:#29648e;font-size:8.5pt;margin-top:5px}.footer{margin-top:28px;color:#607080;font-size:9pt}.page-break{page-break-before:always}.lampiran h3{text-align:center}.lampiran-note{font-size:10pt;color:#49687d}.lampiran-frame{width:100%;height:920px;border:1px solid #ccd8e2;margin-top:12px}.lampiran-img{display:block;max-width:100%;height:auto;margin:14px auto}.lampiran-file,.lampiran-error{padding:20px;border:1px solid #d4e2eb;border-radius:12px;background:#f7fbfe}.lampiran-file a{color:#126b9c;font-weight:700}@media print{.toolbar{display:none}.sheet{padding:0}.lampiran-frame{height:900px}}</style></head><body><div class="toolbar"><button onclick="window.close()">Tutup</button><button onclick="window.print()">Cetak / Simpan PDF</button></div><main class="sheet"><div class="title"><h2>NOTA DINAS</h2><div>Nomor: ${esc(s.nomor_surat||'-')}</div></div><table class="meta"><tr><td>Kepada</td><td>:</td><td>Pimpinan</td></tr><tr><td>Dari</td><td>:</td><td>${esc(senderName)} (${esc(bidangName(s.asal_bidang)||bidangSuratV136(s.asal_bidang).nama_bidang||'-')})</td></tr><tr><td>Tanggal</td><td>:</td><td>${esc(formatDate(s.tanggal_surat)||'-')}</td></tr><tr><td>Sifat</td><td>:</td><td>${esc(s.sifat||'BIASA')}</td></tr><tr><td>Klasifikasi</td><td>:</td><td>${esc(klasifikasiLabelV136(s.klasifikasi))}</td></tr><tr><td>Perihal</td><td>:</td><td>${esc(s.perihal||'-')}</td></tr></table><div class="isi">${body}</div><div class="ttd-row">${approval}${sender}</div><div class="footer">Dokumen dibuat, ditandatangani, dan dicatat melalui SIMPROV • ID Surat: ${esc(s.id_surat||'-')}</div>${lampiran}</main></body></html>`);w.document.close();
  };

  const renderManageBaseV136=renderManajemenAkunV65;
  renderManajemenAkunV65=function(){
    renderManageBaseV136();
    if(!isSuperAdminV65())return;
    const area=document.getElementById('contentArea');if(!area)return;
    const cards=(dashboard?.bidangs||[]).map(b=>`<label class="pimpinan-bidang-card-v136"><span><b>${esc(b.nama_bidang||'-')}</b><small>${esc(b.id_bidang||'')}</small></span><input class="pimpinan-bidang-input-v136" data-id="${esc(b.id_bidang)}" value="${esc(b.nama_pimpinan_bidang||'')}" placeholder="Nama pimpinan bidang"></label>`).join('');
    const panel=`<section class="panel fade-up premium-panel pimpinan-bidang-panel-v136"><div class="panel-title-row"><div><h3>Nama Pimpinan Setiap Bidang</h3><p class="panel-sub">Nama ini digunakan pada tanda tangan elektronik Nota Dinas dan dokumen yang dibuat oleh masing-masing bidang.</p></div><button class="btn-refresh" onclick="savePimpinanBidangV136()">Simpan Nama Pimpinan</button></div><div class="pimpinan-bidang-grid-v136">${cards||'<p class="empty">Belum ada data bidang.</p>'}</div></section>`;
    area.insertAdjacentHTML('afterbegin',panel);
  };
  window.savePimpinanBidangV136=async function(){
    const inputs=[...document.querySelectorAll('.pimpinan-bidang-input-v136')],empty=inputs.filter(x=>!x.value.trim());
    if(empty.length){alert(`Nama pimpinan belum diisi untuk ${empty.length} bidang. Lengkapi seluruh nama agar tanda tangan surat tidak kosong.`);empty[0].focus();return;}
    const items=inputs.map(x=>({id_bidang:x.dataset.id,nama_pimpinan:x.value.trim()}));
    const ok=await confirmActionV133({title:'Simpan Nama Pimpinan Bidang',message:`Nama pimpinan untuk ${items.length} bidang akan digunakan pada tanda tangan elektronik surat.`,confirmText:'Ya, Simpan'});if(!ok)return;
    showLoading('Menyimpan nama pimpinan bidang...');
    try{const r=await apiPost({action:'savePimpinanBidangV136',user:currentUser,data:{items}});if(!r.success)throw new Error(r.message||'Gagal menyimpan nama pimpinan bidang');await loadDashboard(false);renderAll();sessionStorage.removeItem(suratCacheKeyV133());alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}
  };
})();

/* TTD dan pengajuan surat memakai editor v136 secara langsung. */
saveSuratV133=async function(submit){
  const file=document.getElementById('suratFileV133')?.files?.[0],nomor=document.getElementById('suratNomorV133')?.value.trim()||'',perihal=document.getElementById('suratPerihalV133')?.value.trim()||'',tanggal=document.getElementById('suratTanggalV133')?.value||'';
  if(typeof updateSuratPreviewValueV136==='function')updateSuratPreviewValueV136();
  const isi=document.getElementById('suratIsiV133')?.value||'',tmp=document.createElement('div');tmp.innerHTML=isi;const isiText=(tmp.textContent||'').replace(/\s+/g,' ').trim();
  if(!perihal||!tanggal||!isiText){alert('Perihal, tanggal, dan isi Nota Dinas wajib diisi.');return;}
  if(submit&&!nomor){alert('Nomor Nota Dinas wajib diisi sebelum ditandatangani dan diajukan.');return;}
  if(file&&file.size>MAX_UPLOAD_BYTES_V133){alert('Ukuran lampiran maksimal 2 MB.');return;}
  const ok=await confirmActionV133({title:submit?'TTD dan Ajukan Nota Dinas':'Simpan Draft Nota Dinas',message:submit?'Dengan melanjutkan, Nota Dinas ditandatangani secara elektronik atas nama pimpinan bidang dan diajukan kepada Pimpinan. Pastikan isi surat sudah benar.':'Draft akan disimpan dan masih dapat diedit kembali.',confirmText:submit?'Ya, TTD & Ajukan':'Ya, Simpan'});if(!ok)return;
  const data={id_surat:suratEditIdV133,nomor_surat:nomor,tanggal_surat:tanggal,sifat:document.getElementById('suratSifatV133')?.value||'BIASA',klasifikasi:document.getElementById('suratKlasifikasiV133')?.value||'UMUM',perihal,isi_ringkas:isi,submit};
  showLoading(submit?'Menandatangani dan mengajukan Nota Dinas...':'Menyimpan draft Nota Dinas...');
  try{if(file){data.file_name=file.name;data.mime_type=file.type;data.file_base64=await fileToBase64(file);}const r=await apiPost({action:'saveSuratV133',user:currentUser,data});if(!r.success)throw new Error(r.message||'Gagal menyimpan surat');suratEditIdV133='';sessionStorage.removeItem(suratCacheKeyV133());await loadSuratWorkspaceV133(true);suratTabV133='BUAT';renderSuratV133();setTimeout(()=>document.getElementById('suratSayaPanelV134')?.scrollIntoView({behavior:'smooth',block:'start'}),80);alert(r.message||'Nota Dinas berhasil diproses');}catch(e){alert(e.message||String(e));}finally{hideLoading();}
};


/* =========================================================
   SIMPROV v137 - HPS modal foreground, lampiran surat aman,
   hapus surat belum selesai, dan panel admin dapat diminimalkan.
   ========================================================= */
(function(){
  window.lihatLampiranSuratV137=async function(id){
    const w=window.open('','_blank');
    if(!w){alert('Popup diblokir browser. Izinkan popup untuk melihat lampiran.');return;}
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Memuat lampiran...</title><style>body{font-family:Arial,sans-serif;display:grid;place-items:center;min-height:90vh;color:#174f75}</style></head><body>Memuat lampiran melalui SIMPROV...</body></html>');w.document.close();
    try{
      const r=await apiPost({action:'getSuratLampiranV137',user:currentUser,id_surat:id});
      if(!r?.success||!r.base64)throw new Error(r?.message||'Lampiran tidak dapat dimuat');
      const dataUrl=`data:${r.mime_type||'application/octet-stream'};base64,${r.base64}`;
      const mime=String(r.mime_type||'').toLowerCase(),name=esc(r.file_name||'Lampiran');
      if(mime==='application/pdf'){
        w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.bar{height:58px;display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#eef8ff;color:#174f75}.bar a,.bar button{padding:9px 13px;border:1px solid #bcd8ea;border-radius:9px;background:#fff;color:#14517d;font-weight:700;text-decoration:none}iframe{width:100%;height:calc(100vh - 58px);border:0}</style></head><body><div class="bar"><b>${name}</b><div><a download="${name}" href="${dataUrl}">Unduh</a> <button onclick="window.close()">Tutup</button></div></div><iframe src="${dataUrl}"></iframe></body></html>`);w.document.close();
      }else if(mime.startsWith('image/')){
        w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>body{margin:0;background:#eef3f7;text-align:center;font-family:Arial}.bar{padding:12px;background:#fff}.bar a{color:#14517d;font-weight:700}img{max-width:96vw;margin:18px auto;background:#fff;box-shadow:0 8px 30px #0002}</style></head><body><div class="bar"><a download="${name}" href="${dataUrl}">Unduh ${name}</a></div><img src="${dataUrl}" alt="${name}"></body></html>`);w.document.close();
      }else{
        w.location.href=dataUrl;
      }
    }catch(e){w.document.open();w.document.write(`<p style="font-family:Arial;padding:24px;color:#a33">${esc(e.message||String(e))}</p>`);w.document.close();}
  };

  const suratActionsBaseV137=suratActionButtonsV133;
  suratActionButtonsV133=function(s){
    let html=suratActionsBaseV137(s)||'';
    const own=String(s?.asal_id_user||'')===String(currentUser?.id_user||''),status=String(s?.status_surat||'DRAFT').toUpperCase();
    if(own&&status!=='SELESAI')html+=`<button type="button" class="btn-danger" onclick="hapusSuratV137('${esc(s.id_surat)}')">Hapus Surat</button>`;
    return html;
  };

  window.hapusSuratV137=async function(id){
    const s=(suratWorkspaceV133?.surat||[]).find(x=>String(x.id_surat)===String(id));if(!s)return;
    const ok=await confirmActionV133({title:'Hapus Nota Dinas',message:`Apakah Anda yakin ingin menghapus Nota Dinas “${s.perihal||s.nomor_surat||''}”? Surat dan lampirannya akan dihapus dan tidak dapat dikembalikan.`,confirmText:'Ya, Hapus Surat',danger:true});if(!ok)return;
    showLoading('Menghapus Nota Dinas...');
    try{
      const r=await apiPost({action:'deleteSuratV137',user:currentUser,id_surat:id});if(!r.success)throw new Error(r.message||'Gagal menghapus surat');
      suratWorkspaceV133.surat=(suratWorkspaceV133.surat||[]).filter(x=>String(x.id_surat)!==String(id));writeSuratCacheV133(suratWorkspaceV133);renderSuratV133();alert(r.message||'Nota Dinas berhasil dihapus');
    }catch(e){alert(e.message||String(e));}finally{hideLoading();}
  };

  window.toggleManagementPanelV137=function(btn){
    const panel=btn?.closest?.('.management-collapsible-v137');if(!panel)return;
    const collapsed=panel.classList.toggle('is-collapsed-v137');btn.textContent=collapsed?'Tampilkan':'Minimize';btn.setAttribute('aria-expanded',String(!collapsed));
  };
  function setupManagementPanelsV137(){
    if(!isSuperAdminV65())return;
    const area=document.getElementById('contentArea');if(!area)return;
    [...area.querySelectorAll(':scope > section.panel')].forEach(panel=>{
      const title=String(panel.querySelector('h3')?.textContent||'').trim(),keepOpen=title.toUpperCase().includes('MANAJEMEN AKSES DAN AKUN');
      let header=panel.querySelector(':scope > .panel-title-row, :scope > .panel-head');
      if(!header)return;
      panel.classList.add('management-collapsible-v137');header.classList.add('management-header-v137');
      if(!header.querySelector('.management-toggle-v137'))header.insertAdjacentHTML('beforeend',`<button type="button" class="btn-soft management-toggle-v137" aria-expanded="${keepOpen?'true':'false'}" onclick="toggleManagementPanelV137(this)">${keepOpen?'Minimize':'Tampilkan'}</button>`);
      panel.classList.toggle('is-collapsed-v137',!keepOpen);
    });
  }
  const renderManageBaseV137=renderManajemenAkunV65;
  renderManajemenAkunV65=function(){renderManageBaseV137();setupManagementPanelsV137();};
})();


/* =========================================================
   SIMPROV v138 - Pengajuan Pembayaran berbasis SOP dan template asli
   ========================================================= */
let paymentWorkspaceV138={loaded:false,loading:false,pengajuan:[],dokumen:[],kegiatan:[],bidang:[],identity:{},doc_types:[]};
let paymentTabV138='DAFTAR';
let paymentEditIdV138='';
let paymentPrefillActivityV138='';
const PAYMENT_DOC_TYPES_V138=['Invoice Tagihan','Kuitansi/Tanda Terima Pembayaran','Daftar Hadir/Absensi','Fotokopi NPWP & KTP Penerima','Rekening Bank Penerima','LPJ Kegiatan/Foto Dokumentasi','Dokumen Pendukung Lain'];

function parseJsonV138(v,fallback=[]){try{const x=JSON.parse(v||'[]');return Array.isArray(x)?x:fallback;}catch(e){return fallback;}}
function paymentByIdV138(id){return (paymentWorkspaceV138.pengajuan||[]).find(x=>String(x.id_pengajuan)===String(id));}
function paymentDocsV138(id){return (paymentWorkspaceV138.dokumen||[]).filter(x=>String(x.id_pengajuan)===String(id));}
function paymentActivityV138(id){return (paymentWorkspaceV138.kegiatan||[]).find(x=>String(x.id_kegiatan)===String(id))||(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));}
function paymentStatusClassV138(s){s=String(s||'').toUpperCase();if(s==='SELESAI')return 'done';if(s.includes('PERBAIKAN'))return 'repair';if(s.includes('MENUNGGU'))return 'waiting';return 'draft';}
function paymentStatusLabelV138(s){return String(s||'DRAFT').replace(/_/g,' ');}
function paymentDocKeyV138(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function paymentRequiredDocsV138(p){const a=['Invoice Tagihan','Daftar Hadir/Absensi','Fotokopi NPWP & KTP Penerima','Rekening Bank Penerima','LPJ Kegiatan/Foto Dokumentasi'];if(String(p?.reimbursement)==='1')a.splice(1,0,'Kuitansi/Tanda Terima Pembayaran');return a;}
function paymentDocV138(p,jenis){return paymentDocsV138(p.id_pengajuan).find(d=>paymentDocKeyV138(d.jenis_dokumen)===paymentDocKeyV138(jenis));}
function paymentTotalRincianV138(rows){return (rows||[]).reduce((n,x)=>n+toNumber(x.jumlah),0);}
function paymentDateInputV138(v){return normalizeDateForInputV61(v)||'';}
function numberWordsV138(n){
  n=Math.floor(Math.abs(Number(n)||0));const s=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
  const f=x=>x<12?s[x]:x<20?f(x-10)+' belas':x<100?f(Math.floor(x/10))+' puluh '+f(x%10):x<200?'seratus '+f(x-100):x<1000?f(Math.floor(x/100))+' ratus '+f(x%100):x<2000?'seribu '+f(x-1000):x<1e6?f(Math.floor(x/1000))+' ribu '+f(x%1000):x<1e9?f(Math.floor(x/1e6))+' juta '+f(x%1e6):x<1e12?f(Math.floor(x/1e9))+' miliar '+f(x%1e9):f(Math.floor(x/1e12))+' triliun '+f(x%1e12);
  return (n?f(n):'nol').replace(/\s+/g,' ').trim().replace(/^./,c=>c.toUpperCase())+' Rupiah';
}
async function loadPaymentWorkspaceV138(force=false){
  if(paymentWorkspaceV138.loading)return;if(paymentWorkspaceV138.loaded&&!force){renderPaymentWorkspaceV138();return;}paymentWorkspaceV138.loading=true;
  try{const r=await apiPost({action:'getPaymentWorkspaceV138',user:currentUser});if(!r.success)throw new Error(r.message||'Gagal memuat pengajuan pembayaran');paymentWorkspaceV138={...r,loaded:true,loading:false};renderPaymentWorkspaceV138();}catch(e){paymentWorkspaceV138.loading=false;document.getElementById('contentArea').innerHTML=`<section class="panel"><h3>Pengajuan Pembayaran</h3><p class="error">${esc(e.message||String(e))}</p><button onclick="loadPaymentWorkspaceV138(true)">Coba Lagi</button></section>`;}
}
function setPaymentTabV138(tab){paymentTabV138=tab;paymentEditIdV138='';renderPaymentWorkspaceV138();}
function openPaymentFormV138(id='',activity=''){paymentEditIdV138=id;paymentPrefillActivityV138=activity||paymentByIdV138(id)?.id_kegiatan||'';paymentTabV138='FORM';renderPaymentWorkspaceV138();window.scrollTo({top:0,behavior:'smooth'});}
function closePaymentFormV138(){paymentEditIdV138='';paymentPrefillActivityV138='';paymentTabV138='DAFTAR';renderPaymentWorkspaceV138();}

function paymentTimelineV138(p){
  const status=String(p?.status_pengajuan||'DRAFT').toUpperCase();let step=1;if(status==='MENUNGGU VERIFIKASI KEUANGAN')step=2;else if(status==='MENUNGGU PERSETUJUAN PIMPINAN')step=3;else if(status==='MENUNGGU PERINTAH KETUA HARIAN')step=4;else if(status==='MENUNGGU PEMBAYARAN BENDAHARA')step=5;else if(status==='SELESAI')step=6;else if(status.includes('PERBAIKAN'))step=1;
  const labels=['Bidang','Verifikator Keuangan','Ketua/Sekretaris Umum','Ketua Harian','Bendahara','Selesai'];return `<div class="payment-timeline-v138">${labels.map((x,i)=>`<div class="${i+1<step?'done':i+1===step?'active':''}"><span>${i+1}</span><b>${x}</b></div>`).join('')}</div>`;
}
function paymentOriginalDocsV138(p){
  const docs=paymentDocsV138(p.id_pengajuan);return `<div class="payment-doc-grid-v138">${PAYMENT_DOC_TYPES_V138.map(j=>{const list=docs.filter(d=>paymentDocKeyV138(d.jenis_dokumen)===paymentDocKeyV138(j));const required=paymentRequiredDocsV138(p).some(x=>paymentDocKeyV138(x)===paymentDocKeyV138(j));return `<article><div><b>${esc(j)}</b>${required?'<small class="required-v138">Wajib</small>':'<small>Opsional</small>'}</div>${list.length?list.map(d=>`<a class="btn-soft" href="${esc(d.url_file)}" target="_blank" rel="noopener">Buka Dokumen Asli</a>`).join(''):'<span class="muted">Belum diunggah</span>'}</article>`;}).join('')}</div>`;
}
function paymentGeneratedButtonsV138(p){
  const s=String(p.status_pengajuan||'').toUpperCase(),buttons=[`<button class="btn-soft" onclick="printPaymentDocV138('${esc(p.id_pengajuan)}','ND_BIDANG')">Nota Dinas Bidang</button>`,`<button class="btn-soft" onclick="printPaymentDocV138('${esc(p.id_pengajuan)}','SPTJM')">SPTJM</button>`];
  if(!['DRAFT','MENUNGGU VERIFIKASI KEUANGAN','PERBAIKAN BIDANG'].includes(s))buttons.push(`<button class="btn-soft" onclick="printPaymentDocV138('${esc(p.id_pengajuan)}','VERIFIKASI')">Lembar Verifikasi</button>`);
  if(['MENUNGGU PERINTAH KETUA HARIAN','MENUNGGU PEMBAYARAN BENDAHARA','SELESAI'].includes(s))buttons.push(`<button class="btn-soft" onclick="printPaymentDocV138('${esc(p.id_pengajuan)}','ND_PIMPINAN')">Nota Dinas ke Ketua Harian</button>`);
  if(['MENUNGGU PEMBAYARAN BENDAHARA','SELESAI'].includes(s))buttons.push(`<button class="btn-soft" onclick="printPaymentDocV138('${esc(p.id_pengajuan)}','SP2')">Surat Perintah Pemindahbukuan</button>`);
  if(p.bukti_bayar_url)buttons.push(`<a class="btn-green" href="${esc(p.bukti_bayar_url)}" target="_blank" rel="noopener">Buka Bukti Pembayaran</a>`);
  return `<div class="action-group payment-generated-v138">${buttons.join('')}</div>`;
}
function paymentActionButtonsV138(p){
  const role=actualRoleV133(),s=String(p.status_pengajuan||'').toUpperCase(),out=[];
  if((role==='BIDANG'||role==='ADMIN')&&['DRAFT','PERBAIKAN BIDANG'].includes(s)){out.push(`<button onclick="openPaymentFormV138('${esc(p.id_pengajuan)}')">Edit & Lengkapi</button>`,`<button class="btn-green" onclick="submitPaymentV138('${esc(p.id_pengajuan)}')">Ajukan Verifikasi</button>`,`<button class="btn-danger" onclick="deletePaymentV138('${esc(p.id_pengajuan)}')">Hapus Draft</button>`);}
  if((role==='VERIFIKATOR_KEUANGAN'||role==='ADMIN')&&s==='MENUNGGU VERIFIKASI KEUANGAN')out.push(`<button class="btn-danger" onclick="verifyPaymentV138('${esc(p.id_pengajuan)}','KEMBALIKAN')">Kembalikan</button>`,`<button class="btn-green" onclick="verifyPaymentV138('${esc(p.id_pengajuan)}','VALID')">Berkas Lengkap & Sah</button>`);
  if((role==='PIMPINAN'||role==='ADMIN')&&s==='MENUNGGU PERSETUJUAN PIMPINAN')out.push(`<button class="btn-danger" onclick="approvePaymentModalV138('${esc(p.id_pengajuan)}','KEMBALIKAN')">Kembalikan</button>`,`<button class="btn-green" onclick="approvePaymentModalV138('${esc(p.id_pengajuan)}','SETUJUI')">Setujui & Buat Nota Dinas</button>`);
  if((role==='PIMPINAN'||role==='ADMIN')&&s==='MENUNGGU PERINTAH KETUA HARIAN')out.push(`<button class="btn-green" onclick="issueSP2ModalV138('${esc(p.id_pengajuan)}')">Terbitkan Surat Perintah Pemindahbukuan</button>`);
  if((role==='BENDAHARA'||role==='ADMIN')&&s==='MENUNGGU PEMBAYARAN BENDAHARA')out.push(`<button class="btn-green" onclick="completePaymentModalV138('${esc(p.id_pengajuan)}')">Catat Pembayaran</button>`);
  return `<div class="action-group payment-actions-v138">${out.join('')}</div>`;
}
function paymentCardV138(p){
  const bidang=(paymentWorkspaceV138.bidang||[]).find(b=>String(b.id_bidang)===String(p.id_bidang));return `<details class="payment-card-v138"><summary><div><b>${esc(p.nama_kegiatan||'-')}</b><small>${esc(p.id_pengajuan)} • ${esc(bidang?.nama_bidang||p.id_bidang||'-')}</small></div><span class="payment-status-v138 ${paymentStatusClassV138(p.status_pengajuan)}">${esc(paymentStatusLabelV138(p.status_pengajuan))}</span></summary><div class="payment-card-body-v138">${paymentTimelineV138(p)}<div class="payment-meta-v138"><span><b>Nilai:</b> ${rupiah(p.jumlah_pengajuan)}</span><span><b>Nota Dinas:</b> ${esc(p.nomor_nd_bidang||'-')}</span><span><b>Tahap:</b> ${esc(p.tahap_aktif||'-')}</span><span><b>Terakhir:</b> ${esc(formatDate(p.updated_at)||'-')}</span></div><h4>Dokumen Sistem</h4>${paymentGeneratedButtonsV138(p)}<h4>Dokumen Pendukung Asli</h4><p class="panel-sub">Tombol di bawah membuka file asli yang diunggah, bukan tampilan lampiran buatan sistem.</p>${paymentOriginalDocsV138(p)}${p.catatan_verifikasi?`<div class="payment-note-v138"><b>Catatan:</b> ${esc(p.catatan_verifikasi)}</div>`:''}<details class="surat-history-v133"><summary>Riwayat Pengajuan</summary><pre>${esc(p.riwayat||'Belum ada riwayat')}</pre></details>${paymentActionButtonsV138(p)}</div></details>`;
}
function paymentListV138(){
  const role=actualRoleV133(),rows=[...(paymentWorkspaceV138.pengajuan||[])].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));let title='Daftar Pengajuan Pembayaran';if(role==='VERIFIKATOR_KEUANGAN')title='Antrean Verifikasi Permohonan Pembayaran';if(role==='PIMPINAN')title='Antrean Persetujuan dan Perintah Pembayaran';if(role==='BENDAHARA')title='Antrean Pembayaran Bendahara';
  return `<section class="panel premium-panel"><div class="panel-title-row"><div><h3>${title}</h3><p class="panel-sub">Alur mengikuti SOP: Bidang → Verifikator Keuangan → Ketua/Sekretaris Umum → Ketua Harian → Bendahara.</p></div><button class="btn-refresh" onclick="loadPaymentWorkspaceV138(true)">Refresh</button></div><div class="payment-list-v138">${rows.map(paymentCardV138).join('')||'<p class="empty">Belum ada pengajuan pembayaran.</p>'}</div></section>`;
}
function paymentRincianRowsHtmlV138(rows){rows=rows?.length?rows:[{uraian:'',jumlah:0}];return rows.map((x,i)=>`<div class="payment-row-v138 payment-rincian-row-v138"><input class="pay-rincian-uraian" value="${esc(x.uraian||'')}" placeholder="Rincian belanja"><input class="pay-rincian-jumlah" inputmode="numeric" value="${toNumber(x.jumlah)?Number(toNumber(x.jumlah)).toLocaleString('id-ID'):''}" oninput="onRupiahInputV96(this);syncPaymentTotalV138()" placeholder="Jumlah (Rp)"><button type="button" class="btn-danger" onclick="this.parentElement.remove();syncPaymentTotalV138()">Hapus</button></div>`).join('');}
function paymentAccountRowsHtmlV138(rows){rows=rows?.length?rows:[{uraian:'',nama_rekening:'',nama_bank:'',nomor_rekening:'',jumlah:0}];return rows.map(x=>`<div class="payment-account-row-v138"><input class="pay-acc-uraian" value="${esc(x.uraian||'')}" placeholder="Uraian/peruntukan"><input class="pay-acc-name" value="${esc(x.nama_rekening||'')}" placeholder="Nama rekening tujuan"><input class="pay-acc-bank" value="${esc(x.nama_bank||'')}" placeholder="Nama bank"><input class="pay-acc-number" value="${esc(x.nomor_rekening||'')}" placeholder="Nomor rekening"><input class="pay-acc-amount" inputmode="numeric" value="${toNumber(x.jumlah)?Number(toNumber(x.jumlah)).toLocaleString('id-ID'):''}" oninput="onRupiahInputV96(this)" placeholder="Jumlah"><button type="button" class="btn-danger" onclick="this.parentElement.remove()">Hapus</button></div>`).join('');}
function paymentUploadRowsV138(p){
  const docs=paymentDocsV138(p.id_pengajuan);return PAYMENT_DOC_TYPES_V138.map(j=>{const list=docs.filter(d=>paymentDocKeyV138(d.jenis_dokumen)===paymentDocKeyV138(j)),required=paymentRequiredDocsV138(p).some(x=>paymentDocKeyV138(x)===paymentDocKeyV138(j));return `<tr><td>${esc(j)} ${required?'<b class="required-v138">*</b>':''}</td><td>${list.length?list.map(d=>`<a href="${esc(d.url_file)}" target="_blank" rel="noopener">${esc(d.nama_file||'Buka Dokumen Asli')}</a>`).join('<br>'):'Belum diunggah'}</td><td><input type="file" class="payment-file-v138" data-jenis="${esc(j)}" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"></td></tr>`;}).join('');
}
function paymentFormV138(){
  const p=paymentByIdV138(paymentEditIdV138),activities=paymentWorkspaceV138.kegiatan||[],selected=p?.id_kegiatan||paymentPrefillActivityV138||'',act=activities.find(x=>String(x.id_kegiatan)===String(selected)),rincian=parseJsonV138(p?.rincian_json),rekening=parseJsonV138(p?.rekening_json),today=new Date().toISOString().slice(0,10),amount=toNumber(p?.jumlah_pengajuan||act?.jumlah||0),role=actualRoleV133();
  const opts=activities.map(k=>`<option value="${esc(k.id_kegiatan)}" ${String(k.id_kegiatan)===String(selected)?'selected':''} ${!k.payment_ready&&!p?'disabled':''}>${esc(k.nama_kegiatan)} — ${rupiah(k.jumlah)}${k.payment_ready?'':' (belum siap)'}</option>`).join('');
  return `<section class="panel premium-panel payment-form-v138"><div class="panel-title-row"><div><h3>${p?'Edit Pengajuan Pembayaran':'Buat Pengajuan Pembayaran'}</h3><p class="panel-sub">Surat dan lembar verifikasi dibuat otomatis mengikuti template yang diberikan.</p></div><button class="btn-soft" onclick="closePaymentFormV138()">Kembali</button></div><div class="form-grid"><div class="field span-2"><label>Kegiatan *</label><select id="payActivityV138" ${p?'disabled':''} onchange="paymentPrefillActivityV138=this.value;renderPaymentWorkspaceV138()"><option value="">Pilih kegiatan</option>${opts}</select>${act&&!act.payment_ready?`<small class="error">${esc(act.payment_reason)}</small>`:''}</div><div class="field"><label>Nomor Nota Dinas Bidang *</label><input id="payNdNoV138" value="${esc(p?.nomor_nd_bidang||'')}" placeholder=".../ND-.../PB-PORPROV/.../2026"></div><div class="field"><label>Tanggal Nota Dinas *</label><input id="payNdDateV138" type="date" value="${esc(paymentDateInputV138(p?.tanggal_nd_bidang)||today)}"></div><div class="field"><label>Sifat</label><select id="paySifatV138"><option ${String(p?.sifat||'PENTING').toUpperCase()==='PENTING'?'selected':''}>PENTING</option><option ${String(p?.sifat).toUpperCase()==='SEGERA'?'selected':''}>SEGERA</option></select></div><div class="field"><label>Nomor SPTJM *</label><input id="paySptjmNoV138" value="${esc(p?.nomor_sptjm||'')}" placeholder="Nomor SPTJM"></div><div class="field"><label>Hari/Tanggal Kegiatan *</label><input id="payEventDateV138" value="${esc(p?.hari_tanggal_kegiatan||'')}" placeholder="Contoh: Senin, 14 Juli 2026"></div><div class="field"><label>Tempat Kegiatan *</label><input id="payPlaceV138" value="${esc(p?.tempat_kegiatan||'')}" placeholder="Lokasi kegiatan"></div><div class="field"><label>Nama Penandatangan Bidang *</label><input id="paySignerNameV138" value="${esc(p?.nama_pengaju||currentUser?.nama||'')}" placeholder="Nama lengkap"></div><div class="field"><label>Jabatan Penandatangan *</label><input id="paySignerRoleV138" value="${esc(p?.jabatan_pengaju||'Kepala Bidang/Bagian')}" placeholder="Kepala Bidang/Bagian"></div><div class="field span-2"><label><input id="payReimburseV138" type="checkbox" ${String(p?.reimbursement)==='1'?'checked':''}> Pembayaran bersifat reimbursement (Kuitansi/Tanda Terima menjadi wajib)</label></div></div><div class="payment-section-v138"><div class="panel-title-row"><div><h4>Rincian Penggunaan Anggaran</h4><p class="panel-sub">Total otomatis menjadi jumlah pengajuan.</p></div><button class="btn-soft" type="button" onclick="document.getElementById('payRincianRowsV138').insertAdjacentHTML('beforeend',paymentRincianRowsHtmlV138([{uraian:'',jumlah:0}]))">Tambah Rincian</button></div><div id="payRincianRowsV138">${paymentRincianRowsHtmlV138(rincian)}</div><div class="payment-total-v138"><span>Jumlah Pengajuan</span><input id="payAmountV138" value="${amount?Number(amount).toLocaleString('id-ID'):''}" readonly><small id="payTerbilangV138">${esc(p?.terbilang||numberWordsV138(amount))}</small></div></div><div class="payment-section-v138"><div class="panel-title-row"><div><h4>Rekening Tujuan untuk Surat Perintah Pemindahbukuan</h4><p class="panel-sub">Dapat memuat satu atau beberapa penerima.</p></div><button class="btn-soft" type="button" onclick="document.getElementById('payAccountRowsV138').insertAdjacentHTML('beforeend',paymentAccountRowsHtmlV138([{uraian:'',nama_rekening:'',nama_bank:'',nomor_rekening:'',jumlah:0}]))">Tambah Rekening</button></div><div id="payAccountRowsV138">${paymentAccountRowsHtmlV138(rekening)}</div></div><div class="action-group"><button class="btn-green" onclick="savePaymentDraftV138()">Simpan Draft</button>${p?`<button class="btn-danger" onclick="deletePaymentV138('${esc(p.id_pengajuan)}')">Hapus Draft</button>`:''}</div></section>${p?`<section class="panel premium-panel"><div class="panel-title-row"><div><h3>Dokumen Pendukung</h3><p class="panel-sub">Maksimal 2 MB per file. Pilih beberapa file lalu unggah dalam satu proses.</p></div><button class="btn-green" onclick="uploadPaymentDocsV138('${esc(p.id_pengajuan)}')">Upload Dokumen Terpilih</button></div><div class="table-wrap"><table><thead><tr><th>Jenis Dokumen</th><th>Dokumen Asli</th><th>Pilih File</th></tr></thead><tbody>${paymentUploadRowsV138(p)}</tbody></table></div><div class="payment-generated-box-v138"><h4>Dokumen yang Dibuat Sistem</h4>${paymentGeneratedButtonsV138(p)}</div><div class="action-group"><button class="btn-green" onclick="submitPaymentV138('${esc(p.id_pengajuan)}')">Simpan & Ajukan Verifikasi</button></div></section>`:''}`;
}
function syncPaymentTotalV138(){const rows=[...document.querySelectorAll('.payment-rincian-row-v138')],total=rows.reduce((n,r)=>n+toNumber(r.querySelector('.pay-rincian-jumlah')?.value),0),a=document.getElementById('payAmountV138'),t=document.getElementById('payTerbilangV138');if(a)a.value=Number(total).toLocaleString('id-ID');if(t)t.textContent=numberWordsV138(total);}
function collectPaymentFormV138(){
  const rincian=[...document.querySelectorAll('.payment-rincian-row-v138')].map(r=>({uraian:r.querySelector('.pay-rincian-uraian')?.value.trim()||'',jumlah:toNumber(r.querySelector('.pay-rincian-jumlah')?.value)})).filter(x=>x.uraian&&x.jumlah>0);const rekening=[...document.querySelectorAll('.payment-account-row-v138')].map(r=>({uraian:r.querySelector('.pay-acc-uraian')?.value.trim()||'',nama_rekening:r.querySelector('.pay-acc-name')?.value.trim()||'',nama_bank:r.querySelector('.pay-acc-bank')?.value.trim()||'',nomor_rekening:r.querySelector('.pay-acc-number')?.value.trim()||'',jumlah:toNumber(r.querySelector('.pay-acc-amount')?.value)})).filter(x=>x.uraian||x.nama_rekening||x.nomor_rekening||x.jumlah);const total=paymentTotalRincianV138(rincian);
  return {id_pengajuan:paymentEditIdV138,id_kegiatan:document.getElementById('payActivityV138')?.value||paymentPrefillActivityV138,nomor_nd_bidang:document.getElementById('payNdNoV138')?.value.trim()||'',tanggal_nd_bidang:document.getElementById('payNdDateV138')?.value||'',sifat:document.getElementById('paySifatV138')?.value||'PENTING',nomor_sptjm:document.getElementById('paySptjmNoV138')?.value.trim()||'',hari_tanggal_kegiatan:document.getElementById('payEventDateV138')?.value.trim()||'',tempat_kegiatan:document.getElementById('payPlaceV138')?.value.trim()||'',nama_pengaju:document.getElementById('paySignerNameV138')?.value.trim()||'',jabatan_pengaju:document.getElementById('paySignerRoleV138')?.value.trim()||'',reimbursement:!!document.getElementById('payReimburseV138')?.checked,jumlah_pengajuan:total,terbilang:numberWordsV138(total),rincian,rekening};
}
async function savePaymentDraftV138(){const data=collectPaymentFormV138();if(!data.id_kegiatan||!data.rincian.length){alert('Pilih kegiatan dan isi minimal satu rincian belanja.');return;}if(data.rekening.length&&!data.rekening.every(x=>x.uraian&&x.nama_rekening&&x.nama_bank&&x.nomor_rekening&&x.jumlah>0)){alert('Lengkapi seluruh data rekening tujuan atau hapus baris yang belum digunakan.');return;}const ok=await confirmActionV133({title:'Simpan Draft Pengajuan',message:'Data Nota Dinas, SPTJM, rincian anggaran, dan rekening tujuan akan disimpan sebagai draft.',confirmText:'Ya, Simpan'});if(!ok)return;showLoading('Menyimpan draft pengajuan...');try{const r=await apiPost({action:'savePaymentDraftV138',user:currentUser,data});if(!r.success)throw new Error(r.message||'Gagal menyimpan draft');paymentEditIdV138=r.id_pengajuan;await loadPaymentWorkspaceV138(true);paymentTabV138='FORM';paymentEditIdV138=r.id_pengajuan;renderPaymentWorkspaceV138();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}}
async function uploadPaymentDocsV138(id){const inputs=[...document.querySelectorAll('.payment-file-v138')].filter(x=>x.files?.length);if(!inputs.length)return alert('Pilih minimal satu file.');const docs=[];showLoading(`Menyiapkan 0/${inputs.length} dokumen...`);try{for(let i=0;i<inputs.length;i++){const inp=inputs[i],file=inp.files[0];if(file.size>MAX_UPLOAD_BYTES_V133)throw new Error(`${file.name} melebihi 2 MB`);document.getElementById('loadingText').innerText=`Menyiapkan ${i+1}/${inputs.length}: ${file.name}`;docs.push({jenis_dokumen:inp.dataset.jenis,file_name:file.name,mime_type:file.type,file_base64:await fileToBase64(file)});}document.getElementById('loadingText').innerText=`Mengunggah ${docs.length} dokumen dalam satu proses...`;const r=await apiPost({action:'uploadPaymentDocsBatchV138',user:currentUser,id_pengajuan:id,dokumen:docs});if(!r.success)throw new Error(r.message||'Gagal upload');document.getElementById('loadingText').innerText=`Selesai ${docs.length}/${docs.length}`;await loadPaymentWorkspaceV138(true);paymentTabV138='FORM';paymentEditIdV138=id;renderPaymentWorkspaceV138();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}}
async function submitPaymentV138(id){const p=paymentByIdV138(id);const missing=paymentRequiredDocsV138(p).filter(j=>!paymentDocV138(p,j));if(missing.length)return alert('Dokumen wajib belum lengkap:\n- '+missing.join('\n- '));const ok=await confirmActionV133({title:'Ajukan Permohonan Pembayaran',message:'Nota Dinas, SPTJM, dan seluruh dokumen pendukung akan dikirim kepada Verifikator Keuangan. Data tidak dapat diedit sampai dikembalikan.',confirmText:'Ya, Ajukan'});if(!ok)return;showLoading('Mengajukan permohonan pembayaran...');try{const r=await apiPost({action:'submitPaymentV138',user:currentUser,id_pengajuan:id});if(!r.success)throw new Error(r.message||'Gagal mengajukan');await loadPaymentWorkspaceV138(true);await loadDashboard(false);renderAll();suratTabV133='PEMBAYARAN';renderPaymentWorkspaceV138();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}}
async function verifyPaymentV138(id,keputusan){let catatan='';if(keputusan==='KEMBALIKAN'){catatan=prompt('Alasan pengembalian kepada Bidang:')||'';if(!catatan.trim())return;}const ok=await confirmActionV133({title:keputusan==='VALID'?'Berkas Lengkap dan Sah':'Kembalikan Pengajuan',message:keputusan==='VALID'?'Seluruh dokumen akan ditandai valid dan Lembar Verifikasi diterbitkan.':'Pengajuan dikembalikan kepada Bidang untuk diperbaiki.',confirmText:'Ya, Proses',danger:keputusan!=='VALID'});if(!ok)return;showLoading('Memproses verifikasi...');try{const r=await apiPost({action:'verifyPaymentV138',user:currentUser,id_pengajuan:id,keputusan,catatan});if(!r.success)throw new Error(r.message||'Gagal verifikasi');await loadPaymentWorkspaceV138(true);renderPaymentWorkspaceV138();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}}
function paymentModalV138(title,body){document.getElementById('paymentActionModalV138')?.remove();const m=document.createElement('div');m.id='paymentActionModalV138';m.className='modal-backdrop';m.innerHTML=`<div class="modal-card payment-modal-v138"><div class="modal-head"><h3>${esc(title)}</h3><button class="btn-soft" onclick="document.getElementById('paymentActionModalV138').remove()">Tutup</button></div>${body}</div>`;document.body.appendChild(m);}
function approvePaymentModalV138(id,mode){if(mode==='KEMBALIKAN'){const c=prompt('Alasan pengembalian kepada Bidang:')||'';if(c.trim())approvePaymentV138(id,'KEMBALIKAN',{catatan:c});return;}const p=paymentByIdV138(id),today=new Date().toISOString().slice(0,10);paymentModalV138('Persetujuan dan Nota Dinas kepada Ketua Harian',`<div class="form-grid"><div class="field"><label>Nomor Nota Dinas *</label><input id="payPimpinanNoV138" placeholder=".../ND-.../PB-PORPROV/.../2026"></div><div class="field"><label>Tanggal Nota Dinas *</label><input id="payPimpinanDateV138" type="date" value="${today}"></div><div class="field span-2"><label>Jabatan Penandatangan</label><input id="payPimpinanRoleV138" value="${esc(p.jabatan_tujuan||'Ketua/Sekretaris Umum')}"></div></div><div class="modal-actions"><button class="btn-soft" onclick="document.getElementById('paymentActionModalV138').remove()">Batal</button><button class="btn-green" onclick="approvePaymentV138('${esc(id)}','SETUJUI',{nomor_nd_pimpinan:document.getElementById('payPimpinanNoV138').value,tanggal_nd_pimpinan:document.getElementById('payPimpinanDateV138').value,pimpinan_jabatan:document.getElementById('payPimpinanRoleV138').value})">Setujui & Buat Nota Dinas</button></div>`);}
async function approvePaymentV138(id,keputusan,extra={}){const ok=await confirmActionV133({title:keputusan==='SETUJUI'?'Setujui Permohonan Pembayaran':'Kembalikan Pengajuan',message:keputusan==='SETUJUI'?'Lembar Verifikasi disetujui dan Nota Dinas kepada Ketua Harian akan diterbitkan.':'Pengajuan akan dikembalikan kepada Bidang.',confirmText:'Ya, Proses',danger:keputusan!=='SETUJUI'});if(!ok)return;showLoading('Memproses persetujuan...');try{const r=await apiPost({action:'approvePaymentV138',user:currentUser,id_pengajuan:id,keputusan,...extra});if(!r.success)throw new Error(r.message||'Gagal memproses');document.getElementById('paymentActionModalV138')?.remove();await loadPaymentWorkspaceV138(true);renderPaymentWorkspaceV138();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}}
function issueSP2ModalV138(id){const p=paymentByIdV138(id),today=new Date().toISOString().slice(0,10),kh=paymentWorkspaceV138.identity?.ketua_harian||currentUser?.nama||'';paymentModalV138('Surat Perintah Pemindahbukuan',`<div class="form-grid"><div class="field"><label>Nomor SP2 *</label><input id="paySp2NoV138" placeholder=".../PB-PORPROV/SP2/.../2026"></div><div class="field"><label>Tanggal Perintah *</label><input id="paySp2DateV138" type="date" value="${today}"></div><div class="field"><label>Nama Rekening Sumber *</label><input id="paySourceNameV138" placeholder="Nama rekening PB Porprov"></div><div class="field"><label>Nomor Rekening Sumber *</label><input id="paySourceNoV138" placeholder="Nomor rekening"></div><div class="field span-2"><label>Nama Ketua Harian</label><input id="payKhNameV138" value="${esc(kh)}"></div></div><div class="modal-actions"><button class="btn-soft" onclick="document.getElementById('paymentActionModalV138').remove()">Batal</button><button class="btn-green" onclick="issueSP2V138('${esc(id)}')">Terbitkan SP2</button></div>`);}
async function issueSP2V138(id){const data={nomor_sp2:document.getElementById('paySp2NoV138').value.trim(),tanggal_perintah:document.getElementById('paySp2DateV138').value,nama_rekening_sumber:document.getElementById('paySourceNameV138').value.trim(),nomor_rekening_sumber:document.getElementById('paySourceNoV138').value.trim(),ketua_harian_nama:document.getElementById('payKhNameV138').value.trim()};if(!data.nomor_sp2||!data.tanggal_perintah||!data.nama_rekening_sumber||!data.nomor_rekening_sumber)return alert('Lengkapi seluruh data SP2.');const ok=await confirmActionV133({title:'Terbitkan Surat Perintah Pemindahbukuan',message:'Ketua Harian akan memerintahkan Bendahara Umum melakukan pembayaran sesuai rincian rekening tujuan.',confirmText:'Ya, Terbitkan'});if(!ok)return;showLoading('Menerbitkan SP2...');try{const r=await apiPost({action:'issuePaymentOrderV138',user:currentUser,id_pengajuan:id,...data});if(!r.success)throw new Error(r.message||'Gagal menerbitkan SP2');document.getElementById('paymentActionModalV138')?.remove();await loadPaymentWorkspaceV138(true);renderPaymentWorkspaceV138();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}}
function completePaymentModalV138(id){const today=new Date().toISOString().slice(0,10);paymentModalV138('Catat Pembayaran Bendahara',`<div class="form-grid"><div class="field"><label>Tanggal Pembayaran *</label><input id="payPaidDateV138" type="date" value="${today}"></div><div class="field"><label>Bukti Pembayaran * (maks. 2 MB)</label><input id="payPaidFileV138" type="file" accept=".pdf,.jpg,.jpeg,.png"></div><div class="field span-2"><label>Catatan Pembayaran</label><textarea id="payPaidNoteV138" rows="3"></textarea></div></div><div class="modal-actions"><button class="btn-soft" onclick="document.getElementById('paymentActionModalV138').remove()">Batal</button><button class="btn-green" onclick="completePaymentV138('${esc(id)}')">Simpan Pembayaran</button></div>`);}
async function completePaymentV138(id){const file=document.getElementById('payPaidFileV138')?.files?.[0];if(!file)return alert('Bukti pembayaran wajib dipilih.');if(file.size>MAX_UPLOAD_BYTES_V133)return alert('Bukti pembayaran maksimal 2 MB.');const ok=await confirmActionV133({title:'Selesaikan Pembayaran',message:'Bukti pembayaran akan disimpan dan paket dikunci sebagai SELESAI.',confirmText:'Ya, Selesaikan'});if(!ok)return;showLoading('Mengunggah bukti dan menyelesaikan pembayaran...');try{const r=await apiPost({action:'completePaymentV138',user:currentUser,id_pengajuan:id,tanggal_bayar:document.getElementById('payPaidDateV138').value,catatan:document.getElementById('payPaidNoteV138').value.trim(),file_name:file.name,mime_type:file.type,file_base64:await fileToBase64(file)});if(!r.success)throw new Error(r.message||'Gagal menyelesaikan pembayaran');document.getElementById('paymentActionModalV138')?.remove();await loadPaymentWorkspaceV138(true);await loadDashboard(false);suratTabV133='PEMBAYARAN';renderAll();renderPaymentWorkspaceV138();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}}
async function deletePaymentV138(id){const ok=await confirmActionV133({title:'Hapus Draft Pengajuan',message:'Draft dan seluruh dokumen pendukung yang sudah diunggah akan dihapus permanen.',confirmText:'Ya, Hapus',danger:true});if(!ok)return;showLoading('Menghapus draft...');try{const r=await apiPost({action:'deletePaymentDraftV138',user:currentUser,id_pengajuan:id});if(!r.success)throw new Error(r.message||'Gagal menghapus');paymentEditIdV138='';paymentTabV138='DAFTAR';await loadPaymentWorkspaceV138(true);renderPaymentWorkspaceV138();alert(r.message);}catch(e){alert(e.message||String(e));}finally{hideLoading();}}

function renderPaymentWorkspaceV138(){
  const area=document.getElementById('contentArea');if(!area)return;if(!paymentWorkspaceV138.loaded){area.innerHTML='<section class="panel premium-panel"><h3>Pengajuan Pembayaran</h3><div class="skeleton-v133"></div><div class="skeleton-v133 short"></div></section>';if(!paymentWorkspaceV138.loading)loadPaymentWorkspaceV138(false);return;}
  const role=actualRoleV133(),canCreate=role==='BIDANG'||role==='ADMIN';if(paymentTabV138==='FORM'&&!canCreate)paymentTabV138='DAFTAR';
  area.innerHTML=`<div class="payment-page-v138"><section class="panel premium-panel payment-head-v138"><div class="panel-title-row"><div><h3>Pengajuan Pembayaran</h3><p class="panel-sub">Nota Dinas, SPTJM, Lembar Verifikasi, Nota Dinas kepada Ketua Harian, dan Surat Perintah Pemindahbukuan dibuat langsung di SIMPROV.</p></div></div><div class="surat-tabs-v133"><button onclick="suratTabV133='BUAT';renderSuratV133()">Nota Dinas Umum</button><button onclick="suratTabV133='MASUK';renderSuratV133()">Surat Masuk</button><button class="active" onclick="setPaymentTabV138('DAFTAR')">Pengajuan Pembayaran</button>${canCreate?`<button class="${paymentTabV138==='FORM'?'active':''}" onclick="openPaymentFormV138()">Buat Pengajuan</button>`:''}</div></section><section class="payment-sop-note-v138"><b>Pedoman SOP:</b> Bidang membuat Nota Dinas dan SPTJM → Verifikator Keuangan membuat Lembar Verifikasi → Ketua/Sekretaris Umum menyetujui dan membuat Nota Dinas kepada Ketua Harian → Ketua Harian menerbitkan SP2 → Bendahara membayar.</section>${paymentTabV138==='FORM'?paymentFormV138():paymentListV138()}<div id="paymentActionModalHostV138"></div></div>`;setTimeout(syncPaymentTotalV138,0);
}

const renderSuratBaseV138=renderSuratV133;
renderSuratV133=function(){
  if(suratTabV133==='PEMBAYARAN'){renderPaymentWorkspaceV138();if(!paymentWorkspaceV138.loaded)loadPaymentWorkspaceV138(false);return;}
  renderSuratBaseV138();const tabs=document.querySelector('.surat-tabs-v133');if(tabs&&!tabs.querySelector('.payment-tab-btn-v138'))tabs.insertAdjacentHTML('beforeend',`<button class="payment-tab-btn-v138" onclick="suratTabV133='PEMBAYARAN';renderSuratV133()">Pengajuan Pembayaran</button>`);
};
const setSuratTabBaseV138=setSuratTabV133;
setSuratTabV133=function(tab){if(tab==='PEMBAYARAN'){suratTabV133=tab;suratEditIdV133='';renderSuratV133();return;}return setSuratTabBaseV138(tab);};

/* Tahap 7 Pengadaan Langsung memakai modul SOP pembayaran tanpa mengubah tahap 1-6. */
const tahapStateBaseV138=tahapStatePLV123;
tahapStatePLV123=function(k){const states=tahapStateBaseV138(k),s7=states.find(x=>Number(x.no)===7),p=(dashboard?.pengajuanPembayaranV138||[]).find(x=>String(x.id_kegiatan)===String(k.id_kegiatan));if(!s7||!p)return states;const st=String(p.status_pengajuan||'').toUpperCase(),labels=['Nota Dinas Bidang','SPTJM','Lembar Verifikasi','Nota Dinas ke Ketua Harian','Surat Perintah Pemindahbukuan','Bukti Pembayaran'];let count=2;if(['MENUNGGU VERIFIKASI KEUANGAN','PERBAIKAN BIDANG','DRAFT'].includes(st))count=2;else if(st==='MENUNGGU PERSETUJUAN PIMPINAN')count=3;else if(st==='MENUNGGU PERINTAH KETUA HARIAN')count=4;else if(st==='MENUNGGU PEMBAYARAN BENDAHARA')count=5;else if(st==='SELESAI')count=6;Object.assign(s7,{dok:labels,docs:labels.map((jenis,i)=>({jenis,doc:i<count?{url_file:'#',status_verifikasi:st==='SELESAI'?'VALID DOKUMEN':'MENUNGGU'}:null})),uploaded:!['DRAFT','PERBAIKAN BIDANG'].includes(st),valid:st==='SELESAI',repair:st.includes('PERBAIKAN'),waitingRepair:false,countUpload:count,countValid:st==='SELESAI'?6:Math.max(0,count-1)});return states;};
const openTahapBaseV138=openTahapPLV123;
openTahapPLV123=function(id,no){if(Number(no)===7){const k=kegiatanById(id),states=tahapStateBaseV138(k),preValid=priorStagesValidPLV123(states),oldStage=states.find(x=>Number(x.no)===7),p=(dashboard?.pengajuanPembayaranV138||[]).find(x=>String(x.id_kegiatan)===String(id));if(!preValid&&!isPBJVerifierV65()&&!canManage()){alert('Tahap Pembayaran dibuka setelah seluruh dokumen Tahap 1 sampai Tahap 6 dinyatakan valid oleh Verifikator PBJ.');return;}if(!p&&oldStage?.countUpload>0)return openTahapBaseV138(id,no);paymentPrefillActivityV138=id;paymentEditIdV138=p?.id_pengajuan||'';paymentTabV138=p?'DAFTAR':'FORM';suratTabV133='PEMBAYARAN';activeMenu='Surat';renderAll();loadPaymentWorkspaceV138(false).then?.(()=>{});return;}return openTahapBaseV138(id,no);};

/* Lampiran Nota Dinas umum dibuka sebagai file asli; cetak tidak lagi menempelkan preview buruk. */
lihatLampiranSuratV137=function(id){const s=(suratWorkspaceV133?.surat||[]).find(x=>String(x.id_surat)===String(id));if(!s?.url_file)return alert('Lampiran tidak ditemukan.');const w=window.open(s.url_file,'_blank','noopener');if(!w)alert('Popup diblokir browser. Izinkan popup untuk membuka dokumen asli.');};
printNotaDinasV133=function(id){const s=(suratWorkspaceV133?.surat||[]).find(x=>String(x.id_surat)===String(id));if(!s)return;const w=window.open('about:blank','_blank');if(!w)return alert('Popup diblokir browser.');const body=typeof sanitizeSuratHtmlV136==='function'?sanitizeSuratHtmlV136(s.isi_ringkas||'<p>-</p>'):esc(s.isi_ringkas||'-'),attachment=s.url_file?`<p class="attachment"><b>Lampiran:</b> <a href="${esc(s.url_file)}" target="_blank">Buka Dokumen Asli — ${esc(s.nama_file||'Lampiran')}</a></p>`:'';w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Nota Dinas ${esc(s.nomor_surat||'')}</title><style>@page{size:A4;margin:18mm 20mm}body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.45;color:#000}.toolbar{position:sticky;top:0;background:#eef7ff;padding:10px;text-align:right}.toolbar button{margin-left:6px;padding:8px 12px}.title{text-align:center;text-decoration:underline;font-weight:bold;font-size:14pt}.meta{width:100%;border-collapse:collapse;margin:20px 0}.meta td{vertical-align:top;padding:2px}.meta td:first-child{width:110px}.isi{text-align:justify}.attachment{margin-top:20px;padding:12px;border:1px solid #bbb}.sign{text-align:center;width:300px;margin:45px 0 0 auto}.space{height:65px}@media print{.toolbar{display:none}}</style></head><body><div class="toolbar"><button onclick="window.close()">Tutup</button><button onclick="window.print()">Cetak / Simpan PDF</button></div><div class="title">NOTA DINAS</div><table class="meta"><tr><td>Kepada Yth</td><td>:</td><td>${esc(s.tujuan_role||'Pimpinan')}</td></tr><tr><td>Dari</td><td>:</td><td>${esc(s.asal_nama||'-')}</td></tr><tr><td>Nomor</td><td>:</td><td>${esc(s.nomor_surat||'-')}</td></tr><tr><td>Tanggal</td><td>:</td><td>${esc(formatDate(s.tanggal_surat)||'-')}</td></tr><tr><td>Sifat</td><td>:</td><td>${esc(s.sifat||'PENTING')}</td></tr><tr><td>Perihal</td><td>:</td><td>${esc(s.perihal||'-')}</td></tr></table><div class="isi">${body}</div>${attachment}<div class="sign">${esc(s.asal_nama||'-')}<div class="space"></div><b>${esc(s.pengirim_ttd_nama||s.asal_nama||'-')}</b></div></body></html>`);w.document.close();};

function paymentPrintShellV138(title,body){return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:17mm 19mm}*{box-sizing:border-box}body{font-family:'Times New Roman',serif;color:#000;font-size:11pt;line-height:1.35;margin:0}.toolbar{position:sticky;top:0;z-index:9;background:#edf7ff;padding:10px;text-align:right}.toolbar button{padding:8px 13px;margin-left:6px;border:1px solid #9bbad0;border-radius:7px;background:white;font-weight:bold}.doc{max-width:180mm;margin:auto}.doc-title{text-align:center;text-decoration:underline;font-size:13pt;font-weight:bold;margin:0 0 20px}.kop{text-align:center;border-bottom:3px solid #000;padding-bottom:8px;margin-bottom:18px;font-weight:bold}.meta{width:100%;border-collapse:collapse;margin-bottom:15px}.meta td{padding:1px 3px;vertical-align:top}.meta td:first-child{width:115px}.meta td:nth-child(2){width:12px}.body{text-align:justify}.body p{margin:0 0 8px}.simple-table,.check-table,.sp2-table{width:100%;border-collapse:collapse;margin:10px 0}.simple-table th,.simple-table td,.check-table th,.check-table td,.sp2-table th,.sp2-table td{border:1px solid #000;padding:5px;vertical-align:top}.simple-table th,.check-table th{text-align:center}.sp2-table th{background:#1f416d;color:#fff;text-align:center}.sign-right{width:310px;margin:35px 0 0 auto;text-align:center}.sign-two{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:35px;text-align:center}.sign-space{height:65px}.tte{font-size:9pt;color:#1d5f89}.page-break{page-break-before:always}.doc-links a{color:#000;text-decoration:underline}.small{font-size:9pt}.center{text-align:center}.sp2-head{text-align:center}.sp2-total{font-weight:bold;background:#dff9f5}.nowrap{white-space:nowrap}@media print{.toolbar{display:none}.doc{max-width:none}}</style></head><body><div class="toolbar"><button onclick="window.close()">Tutup</button><button onclick="window.print()">Cetak / Simpan PDF</button></div><main class="doc">${body}</main></body></html>`;}
function paymentAttachmentLinkV138(p,jenis,label){const d=paymentDocV138(p,jenis);return d?`<a href="${esc(d.url_file)}" target="_blank">${esc(label||jenis)}</a>`:esc(label||jenis);}
function paymentSignatureV138(name,role,signed=true){return `<div>${esc(role||'')}<div class="sign-space"></div>${signed?'<div class="tte">Ditandatangani elektronik melalui SIMPROV</div>':''}<b>${esc(name||'[NAMA LENGKAP]')}</b></div>`;}
function paymentPrintDataV138(id){const p=paymentByIdV138(id),activity=paymentActivityV138(p?.id_kegiatan),bidang=(paymentWorkspaceV138.bidang||[]).find(b=>String(b.id_bidang)===String(p?.id_bidang));return {p,activity,bidang,rincian:parseJsonV138(p?.rincian_json),rekening:parseJsonV138(p?.rekening_json)};}
function printPaymentDocV138(id,type){const {p,activity,bidang,rincian,rekening}=paymentPrintDataV138(id);if(!p)return alert('Pengajuan tidak ditemukan.');let body='',title='';const amount=toNumber(p.jumlah_pengajuan),terbilang=p.terbilang||numberWordsV138(amount),lampCount=paymentDocsV138(id).length+1,bidangNameText=bidang?.nama_bidang||p.id_bidang||'-';
  if(type==='ND_BIDANG'){title='Nota Dinas Permohonan Pembayaran';body=`<h1 class="doc-title">NOTA DINAS PERMOHONAN PEMBAYARAN</h1><table class="meta"><tr><td>Kepada Yth</td><td>:</td><td>${esc(p.jabatan_tujuan||'Ketua/Sekretaris Umum PB Porprov')}</td></tr><tr><td>Dari</td><td>:</td><td>${esc(p.jabatan_pengaju||'Kepala Bidang/Bagian')}</td></tr><tr><td>Nomor</td><td>:</td><td>${esc(p.nomor_nd_bidang||'-')}</td></tr><tr><td>Tanggal</td><td>:</td><td>${esc(formatDate(p.tanggal_nd_bidang)||'-')}</td></tr><tr><td>Sifat</td><td>:</td><td>${esc(p.sifat||'Penting')}</td></tr><tr><td>Lampiran</td><td>:</td><td>${lampCount} Lembar (Kwitansi/Bukti Pembayaran atau Berkas Pendukung)</td></tr><tr><td>Perihal</td><td>:</td><td>Permohonan Pembayaran Kegiatan ${esc(p.nama_kegiatan||'-')}</td></tr></table><div class="body"><p>Dengan hormat,</p><p>Sehubungan dengan pelaksanaan program kerja Bidang/Bagian ${esc(bidangNameText)} PB Porprov Jawa Barat XV Tahun 2026, khususnya terkait dengan kegiatan ${esc(p.nama_kegiatan||'-')} yang telah/akan dilaksanakan pada:</p><table class="meta"><tr><td>Hari / Tanggal</td><td>:</td><td>${esc(p.hari_tanggal_kegiatan||'-')}</td></tr><tr><td>Tempat</td><td>:</td><td>${esc(p.tempat_kegiatan||'-')}</td></tr></table><p>Maka bersama ini kami ajukan permohonan pembayaran sebesar <b>${rupiah(amount)}</b> (${esc(terbilang)}) untuk keperluan pos anggaran tersebut.</p><p>Adapun rincian penggunaan anggaran secara ringkas adalah sebagai berikut:</p><table class="simple-table"><thead><tr><th>No.</th><th>Rincian Belanja</th><th>Jumlah (Rp)</th></tr></thead><tbody>${rincian.map((x,i)=>`<tr><td class="center">${i+1}</td><td>${esc(x.uraian)}</td><td class="nowrap">${rupiah(x.jumlah)}</td></tr>`).join('')}<tr><th colspan="2">Total</th><th>${rupiah(amount)}</th></tr></tbody></table><p>Sebagai bahan pertimbangan dan verifikasi, bersama Nota Dinas ini kami lampirkan dokumen pendukung (SPJ Singkat) yang terdiri dari:</p><ol class="doc-links"><li>${paymentAttachmentLinkV138(p,'Invoice Tagihan','Invoice Tagihan')}</li><li>${paymentAttachmentLinkV138(p,'Kuitansi/Tanda Terima Pembayaran','Kuitansi/Tanda Terima Pembayaran (bermaterai jika memenuhi syarat) (bagi yang sifatnya reimbursement)')}</li><li>${paymentAttachmentLinkV138(p,'Daftar Hadir/Absensi','Daftar Hadir/Absensi')}</li><li>${paymentAttachmentLinkV138(p,'Fotokopi NPWP & KTP Penerima','Fotokopi NPWP & KTP Penerima (untuk keperluan pajak PPh 21)')}</li><li>${paymentAttachmentLinkV138(p,'Rekening Bank Penerima','Rekening Bank Penerima (Nomor Rekening & Nama Bank jelas)')}</li><li>${paymentAttachmentLinkV138(p,'LPJ Kegiatan/Foto Dokumentasi','Laporan Pertanggungjawaban (LPJ) Kegiatan Singkat/Foto Dokumentasi Kegiatan')}</li><li>Surat Pernyataan Tanggungjawab Mutlak</li><li>${paymentAttachmentLinkV138(p,'Dokumen Pendukung Lain','Dokumen Pendukung Lain (jika ada)')}</li></ol><p>Demikian permohonan ini kami sampaikan. Atas perhatian, arahan, dan persetujuan Bapak/Ibu, kami ucapkan terima kasih.</p></div><div class="sign-right">PB PORPROV JAWA BARAT XV TAHUN 2026<br>${paymentSignatureV138(p.nama_pengaju,p.jabatan_pengaju,true)}</div>`;}
  if(type==='SPTJM'){title='Surat Pernyataan Tanggung Jawab Mutlak';body=`<div class="kop">PANITIA BESAR PEKAN OLAHRAGA PROVINSI JAWA BARAT XV TAHUN 2026</div><h1 class="doc-title">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK</h1><p class="center">Nomor: ${esc(p.nomor_sptjm||'-')}</p><div class="body"><p>Yang bertanda tangan dibawah ini:</p><table class="meta"><tr><td>Nama</td><td>:</td><td>${esc(p.nama_pengaju||'-')}</td></tr><tr><td>Jabatan</td><td>:</td><td>${esc(p.jabatan_pengaju||'-')} pada PB Kota Bogor Porprov Jawa Barat XV Tahun 2026</td></tr></table><p>Sehubungan dengan Nota Dinas Permohonan Pembayaran Nomor ${esc(p.nomor_nd_bidang||'-')} tanggal ${esc(formatDate(p.tanggal_nd_bidang)||'-')} sebesar ${rupiah(amount)} (terbilang ${esc(terbilang)}) pada Bidang/Bagian ${esc(bidangNameText)} PB Kota Bogor Porprov Jawa Barat XV Tahun 2026, menyatakan dengan sesungguhnya bahwa saya bertanggungjawab penuh atas:</p><ol><li>Jumlah anggaran tersebut akan dipergunakan untuk membiayai keperluan belanja dalam mendukung Program dan Kegiatan Bidang/Bagian ${esc(bidangNameText)} pada PB Kota Bogor Porprov Jawa Barat XV Tahun 2026.</li><li>Jumlah anggaran tersebut tidak akan dipergunakan untuk membiayai pengeluaran selain dari keperluan belanja dalam mendukung Program dan Kegiatan Bidang/Bagian ${esc(bidangNameText)} PB Kota Bogor Porprov Jawa Barat XV Tahun 2026.</li><li>Bukti-bukti pengeluaran belanja disampaikan kepada Ketua Harian PB Kota Bogor Porprov Jawa Barat XV Tahun 2026 melalui Bendahara Umum PB Kota Bogor Porprov Jawa Barat XV Tahun 2026 sesuai dengan ketentuan yang berlaku untuk keperluan pemeriksaan Internal/Eksternal sebagai Bukti Pertanggungjawaban Keuangan.</li></ol><p>Apabila di kemudian hari, atas penggunaan anggaran tersebut mengakibatkan kerugian daerah, maka saya bersedia dikenakan sanksi mengembalikan kerugian daerah dan/atau diproses hukum sesuai dengan ketentuan peraturan perundang-undangan.</p><p>Demikian surat pernyataan ini dibuat untuk melengkapi persyaratan permohonan Pembayaran.</p></div><div class="sign-right">Bogor, ${esc(formatDate(p.tanggal_nd_bidang)||'........ 2026')}<br>${paymentSignatureV138(p.nama_pengaju,p.jabatan_pengaju,true)}</div>`;}
  if(type==='VERIFIKASI'){title='Lembar Verifikasi Permohonan Pembayaran';const required=[['Nota Dinas Permohonan Pembayaran dari Kepala Bidang/Bagian',true],['Invoice Tagihan',!!paymentDocV138(p,'Invoice Tagihan')],['Kuitansi / Tanda Terima Pembayaran (bermaterai jika memenuhi syarat)',String(p.reimbursement)!=='1'||!!paymentDocV138(p,'Kuitansi/Tanda Terima Pembayaran'),String(p.reimbursement)==='1'?'Wajib untuk reimbursement':'Tidak dipersyaratkan'],['Daftar Hadir / Absensi',!!paymentDocV138(p,'Daftar Hadir/Absensi')],['Fotokopi NPWP & KTP Penerima (untuk keperluan pajak PPh 21)',!!paymentDocV138(p,'Fotokopi NPWP & KTP Penerima')],['Rekening Bank Penerima (Nomor Rekening & Nama Bank jelas)',!!paymentDocV138(p,'Rekening Bank Penerima')],['Laporan Pertanggungjawaban (LPJ) Kegiatan Singkat/Foto Dokumentasi Kegiatan',!!paymentDocV138(p,'LPJ Kegiatan/Foto Dokumentasi')],['Surat Pernyataan Tanggungjawab Mutlak',true],['Dokumen Pendukung Lain (jika ada)',!!paymentDocV138(p,'Dokumen Pendukung Lain')]];body=`<h1 class="doc-title">LEMBAR VERIFIKASI PERMOHONAN PEMBAYARAN</h1><h3 class="center">PB KOTA BOGOR PEKAN OLAHRAGA PROVINSI JAWA BARAT XV 2026</h3><h4>I. IDENTITAS PEMOHON</h4><ul><li>Nama Bidang/Bagian: ${esc(bidangNameText)}</li><li>Nama Kegiatan/Uraian: ${esc(p.nama_kegiatan||'-')}</li><li>Nomor Pengajuan Surat: ${esc(p.nomor_nd_bidang||'-')}</li><li>Tanggal Pengajuan: ${esc(formatDate(p.tanggal_nd_bidang)||'-')}</li><li>Jumlah Anggaran yang Diajukan: ${rupiah(amount)}<br>(Terbilang: ${esc(terbilang)})</li></ul><h4>II. CHECKLIST KELENGKAPAN DOKUMEN (Diisi oleh Wakil Ketua/Wakil Sekretaris)</h4><table class="check-table"><thead><tr><th>No.</th><th>Jenis Dokumen Kelengkapan</th><th>Ada</th><th>Tidak Ada</th><th>Catatan</th></tr></thead><tbody>${required.map((x,i)=>`<tr><td class="center">${i+1}</td><td>${x[0]}</td><td class="center">${x[1]?'✓':''}</td><td class="center">${x[1]?'':'✓'}</td><td>${x[2]|| (x[1]?'Lengkap':'-')}</td></tr>`).join('')}</tbody></table><h4>III. HASIL VERIFIKASI DAN REKOMENDASI</h4><p>☒ BERKAS LENGKAP DAN SAH</p><p>☐ DITUNDA / DIKEMBALIKAN</p><p>Alasan Pengembalian: ${esc(p.catatan_verifikasi||'-')}</p><div class="sign-two"><div>PB PORPROV JAWA BARAT XV TAHUN 2026<br>${paymentSignatureV138(p.verifikator_nama,p.verifikator_jabatan,true)}</div><div>SETUJU DIBAYAR<br>${paymentSignatureV138(p.pimpinan_penyetuju||'[NAMA LENGKAP]',p.pimpinan_jabatan||'KETUA/SEKRETARIS UMUM',!!p.pimpinan_penyetuju)}</div></div>`;}
  if(type==='ND_PIMPINAN'){title='Nota Dinas Permohonan Pembayaran kepada Ketua Harian';body=`<h1 class="doc-title">NOTA DINAS PERMOHONAN PEMBAYARAN</h1><table class="meta"><tr><td>Kepada Yth</td><td>:</td><td>Ketua Harian PB Porprov</td></tr><tr><td>Dari</td><td>:</td><td>${esc(p.pimpinan_jabatan||p.jabatan_tujuan||'Ketua/Sekretaris Umum')}</td></tr><tr><td>Nomor</td><td>:</td><td>${esc(p.nomor_nd_pimpinan||'-')}</td></tr><tr><td>Tanggal</td><td>:</td><td>${esc(formatDate(p.tanggal_nd_pimpinan)||'-')}</td></tr><tr><td>Sifat</td><td>:</td><td>${esc(p.sifat||'Penting')}</td></tr><tr><td>Lampiran</td><td>:</td><td>${lampCount+1} Lembar (Kwitansi & Berkas Pendukung)</td></tr><tr><td>Perihal</td><td>:</td><td>Permohonan Pembayaran / Pencairan Dana Kegiatan ${esc(p.nama_kegiatan||'-')}</td></tr></table><div class="body"><p>Dengan hormat,</p><p>Sehubungan dengan pelaksanaan program kerja ${esc(p.pimpinan_jabatan||p.jabatan_tujuan||'Ketua/Sekretaris Umum')} pada Bidang/Bagian ${esc(bidangNameText)} PB Kota Bogor Porprov Jawa Barat XV Tahun 2026, khususnya terkait dengan kegiatan ${esc(p.nama_kegiatan||'-')} yang telah/akan dilaksanakan pada:</p><table class="meta"><tr><td>Hari / Tanggal</td><td>:</td><td>${esc(p.hari_tanggal_kegiatan||'-')}</td></tr><tr><td>Tempat</td><td>:</td><td>${esc(p.tempat_kegiatan||'-')}</td></tr></table><p>Maka bersama ini kami ajukan permohonan pembayaran/pencairan dana sebesar <b>${rupiah(amount)}</b> (${esc(terbilang)}) untuk keperluan pos anggaran tersebut.</p><p>Sebagai bahan pertimbangan, bersama Nota Dinas ini kami lampirkan dokumen pendukung yang terdiri dari:</p><ol><li>Nota Dinas Permohonan Pembayaran Kepada Ketua atau Sekretaris Umum</li><li>Dokumen pendukung pelaksanaan kegiatan (bagi yang sifatnya reimbursement)</li><li>Surat Pernyataan Tanggungjawab Mutlak</li><li>Daftar Rekening Penerima</li><li>Kwitansi (bagi yang sifatnya reimbursement)</li><li>Lembar Verifikasi Permohonan Pembayaran yang telah disetujui</li></ol><p>Demikian permohonan ini kami sampaikan. Atas perhatian, arahan, dan persetujuan Bapak kami ucapkan terima kasih.</p></div><div class="sign-right">PB PORPROV JAWA BARAT XV TAHUN 2026<br>${paymentSignatureV138(p.pimpinan_penyetuju,p.pimpinan_jabatan,true)}</div>`;}
  if(type==='SP2'){title='Surat Perintah Pemindahbukuan';const rows=[...rekening].slice(0,5);while(rows.length<5)rows.push({});const total=rekening.reduce((n,x)=>n+toNumber(x.jumlah),0)||amount;body=`<div class="sp2-head"><h3>PANITIA BESAR PEKAN OLAHRAGA PROVINSI JAWA BARAT XV TAHUN 2026</h3><h2>SURAT PERINTAH PEMINDAHBUKUAN</h2><i>Nomor: ${esc(p.nomor_sp2||'-')}</i></div><table class="meta" style="margin-top:25px"><tr><td><b>Kepada Yth</b></td><td>:</td><td>Bendahara Umum PB Porprov</td><td style="width:150px"><b>Tanggal Perintah</b></td><td>:</td><td>${esc(formatDate(p.tanggal_perintah)||'-')}</td></tr><tr><td></td><td></td><td>Di Tempat</td><td><b>Sifat</b></td><td>:</td><td>${esc(p.sifat||'Penting')}</td></tr></table><p>Berdasarkan Nota Dinas Permohonan Pembayaran kepada Ketua Harian nomor ${esc(p.nomor_nd_pimpinan||'-')} tanggal ${esc(formatDate(p.tanggal_nd_pimpinan)||'-')}, dengan ini diperintahkan untuk melakukan pemindahbukuan dari:</p><table class="meta"><tr><td>Nama Rekening</td><td>:</td><td>${esc(p.nama_rekening_sumber||'-')}</td></tr><tr><td>No Rekening</td><td>:</td><td>${esc(p.nomor_rekening_sumber||'-')}</td></tr></table><p>dengan rincian sebagai berikut:</p><table class="sp2-table"><thead><tr><th>No.</th><th>Uraian / Peruntukan Dana</th><th>Nama Rekening Tujuan</th><th>Nomor Rekening Tujuan</th><th>Jumlah (Rp)</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td class="center">${i+1}</td><td>${esc(x.uraian||'')}</td><td>${esc((x.nama_rekening||'')+(x.nama_bank?' — '+x.nama_bank:''))}</td><td>${esc(x.nomor_rekening||'')}</td><td>${x.jumlah?rupiah(x.jumlah):''}</td></tr>`).join('')}<tr class="sp2-total"><td colspan="4" style="text-align:right">TOTAL JUMLAH PEMINDAHBUKUAN</td><td>${rupiah(total)}</td></tr></tbody></table><p><i>Terbilang: ${esc(numberWordsV138(total))}</i></p><div class="sign-two"><div>Pihak Yang Memerintahkan,<br>${paymentSignatureV138(p.ketua_harian_nama,'Ketua Harian PB Porprov',true)}</div><div>Pihak Yang Menerima Perintah,<br>${paymentSignatureV138(p.bendahara_nama||'[NAMA LENGKAP]','Bendahara Umum PB Porprov',!!p.bendahara_nama)}</div></div>`;}
  const w=window.open('about:blank','_blank');if(!w)return alert('Popup diblokir browser. Izinkan popup untuk mencetak surat.');w.document.open();w.document.write(paymentPrintShellV138(title,body));w.document.close();}

/* =========================================================
   SIMPROV v139 - Penyempurnaan Pengajuan Pembayaran
   - Default langsung Buat Pengajuan untuk Bidang/Admin
   - Validasi pagu rincian dan rekening
   - Kegiatan yang sudah pernah diajukan tidak ditampilkan lagi
   - Upload progress 0-100% dan hasil langsung tampil
   - TTE Bidang + cetak surat berkop SIMPROV
   - Perbaikan cetak Surat Saya yang menampilkan tag HTML mentah
   ========================================================= */
(function(){
  const PAYMENT_PATCH_VERSION_V139='139.0.0';
  let paymentUploadBusyV139=false;
  let paymentUploadPulseV139=null;
  let paymentPrintContextV139=null;

  function isPaymentCreatorV139(){const r=actualRoleV133();return r==='BIDANG'||r==='ADMIN';}
  function paymentCurrentActivityV139(){
    const id=document.getElementById('payActivityV138')?.value||paymentPrefillActivityV138||paymentByIdV138(paymentEditIdV138)?.id_kegiatan||'';
    return (paymentWorkspaceV138.kegiatan||[]).find(k=>String(k.id_kegiatan)===String(id));
  }
  function paymentBudgetV139(){return toNumber(paymentCurrentActivityV139()?.jumlah||0);}
  function paymentUsedActivityIdsV139(currentPayment){
    const currentId=String(currentPayment?.id_pengajuan||'');
    return new Set((paymentWorkspaceV138.pengajuan||[]).filter(p=>String(p.id_pengajuan)!==currentId).map(p=>String(p.id_kegiatan||'')).filter(Boolean));
  }
  function paymentAvailableActivitiesV139(currentPayment){
    const used=paymentUsedActivityIdsV139(currentPayment);
    return (paymentWorkspaceV138.kegiatan||[]).filter(k=>!used.has(String(k.id_kegiatan))||String(k.id_kegiatan)===String(currentPayment?.id_kegiatan||''));
  }
  function paymentAccountTotalV139(){
    return [...document.querySelectorAll('.payment-account-row-v138')].reduce((n,r)=>n+toNumber(r.querySelector('.pay-acc-amount')?.value),0);
  }
  function paymentRincianTotalV139(){
    return [...document.querySelectorAll('.payment-rincian-row-v138')].reduce((n,r)=>n+toNumber(r.querySelector('.pay-rincian-jumlah')?.value),0);
  }
  function paymentSetBudgetMessageV139(){
    const budget=paymentBudgetV139(),rincian=paymentRincianTotalV139(),rekening=paymentAccountTotalV139();
    const amount=document.getElementById('payAmountV138'),words=document.getElementById('payTerbilangV138'),acc=document.getElementById('payAccountTotalV139');
    if(amount)amount.value=Number(rincian).toLocaleString('id-ID');
    if(words)words.textContent=numberWordsV138(rincian);
    if(acc)acc.textContent=`Total rekening: ${rupiah(rekening)} dari jumlah pengajuan ${rupiah(rincian)}`;
    const rinWarn=document.getElementById('payBudgetWarningV139'),accWarn=document.getElementById('payAccountWarningV139');
    if(rinWarn){
      if(budget>0&&rincian>budget){rinWarn.textContent=`Jumlah rincian melebihi pagu kegiatan sebesar ${rupiah(rincian-budget)}.`;rinWarn.className='payment-budget-warning-v139 danger';}
      else{rinWarn.textContent=budget?`Sisa pagu kegiatan setelah pengajuan: ${rupiah(Math.max(0,budget-rincian))}.`:'Pilih kegiatan untuk melihat batas pagu.';rinWarn.className='payment-budget-warning-v139';}
    }
    if(accWarn){
      if(budget>0&&rekening>budget){accWarn.textContent=`Total rekening melebihi pagu kegiatan sebesar ${rupiah(rekening-budget)}.`;accWarn.className='payment-budget-warning-v139 danger';}
      else if(rekening>rincian&&rincian>0){accWarn.textContent=`Total rekening melebihi jumlah pengajuan sebesar ${rupiah(rekening-rincian)}.`;accWarn.className='payment-budget-warning-v139 danger';}
      else if(rekening&&rekening!==rincian){accWarn.textContent=`Total rekening harus sama dengan jumlah pengajuan saat akan diajukan. Selisih ${rupiah(Math.abs(rincian-rekening))}.`;accWarn.className='payment-budget-warning-v139 warn';}
      else{accWarn.textContent=rekening?'Total rekening sudah sesuai dengan jumlah pengajuan.':'Isi minimal satu rekening penerima sebelum TTE dan pengajuan verifikasi.';accWarn.className='payment-budget-warning-v139';}
    }
    const saveBtn=document.getElementById('paySaveButtonV139');
    if(saveBtn){const invalid=!paymentCurrentActivityV139()||(budget>0&&rincian>budget)||(budget>0&&rekening>budget)||(rekening>rincian&&rincian>0);saveBtn.disabled=invalid;}
  }
  window.syncPaymentTotalV138=paymentSetBudgetMessageV139;
  window.syncPaymentAccountTotalV139=paymentSetBudgetMessageV139;

  paymentRincianRowsHtmlV138=function(rows){
    rows=rows?.length?rows:[{uraian:'',jumlah:0}];
    return rows.map(x=>`<div class="payment-row-v138 payment-rincian-row-v138"><input class="pay-rincian-uraian" value="${esc(x.uraian||'')}" placeholder="Contoh: Konsumsi rapat koordinasi"><input class="pay-rincian-jumlah" inputmode="numeric" value="${toNumber(x.jumlah)?Number(toNumber(x.jumlah)).toLocaleString('id-ID'):''}" oninput="onRupiahInputV96(this);syncPaymentTotalV138()" placeholder="Jumlah (Rp)"><button type="button" class="btn-danger" onclick="this.parentElement.remove();syncPaymentTotalV138()">Hapus</button></div>`).join('');
  };
  paymentAccountRowsHtmlV138=function(rows){
    rows=rows?.length?rows:[{uraian:'',nama_rekening:'',nama_bank:'',nomor_rekening:'',jumlah:0}];
    return rows.map(x=>`<div class="payment-account-row-v138"><input class="pay-acc-uraian" value="${esc(x.uraian||'')}" placeholder="Uraian/peruntukan"><input class="pay-acc-name" value="${esc(x.nama_rekening||'')}" placeholder="Nama rekening tujuan"><input class="pay-acc-bank" value="${esc(x.nama_bank||'')}" placeholder="Nama bank"><input class="pay-acc-number" value="${esc(x.nomor_rekening||'')}" placeholder="Nomor rekening"><input class="pay-acc-amount" inputmode="numeric" value="${toNumber(x.jumlah)?Number(toNumber(x.jumlah)).toLocaleString('id-ID'):''}" oninput="onRupiahInputV96(this);syncPaymentAccountTotalV139()" placeholder="Jumlah (Rp)"><button type="button" class="btn-danger" onclick="this.parentElement.remove();syncPaymentAccountTotalV139()">Hapus</button></div>`).join('');
  };

  function paymentNoActivityInfoV139(){
    return `<div class="payment-empty-activity-v139"><b>Belum ada kegiatan yang dapat dipilih.</b><span>Kegiatan yang sudah pernah dibuatkan pengajuan pembayaran tidak ditampilkan kembali. Pastikan kegiatan lain sudah disetujui dan dokumen proses PBJ telah valid.</span></div>`;
  }

  paymentFormV138=function(){
    const p=paymentByIdV138(paymentEditIdV138),allActivities=paymentWorkspaceV138.kegiatan||[],activities=paymentAvailableActivitiesV139(p),selected=p?.id_kegiatan||paymentPrefillActivityV138||'',act=allActivities.find(x=>String(x.id_kegiatan)===String(selected)),rincian=parseJsonV138(p?.rincian_json),rekening=parseJsonV138(p?.rekening_json),today=new Date().toISOString().slice(0,10),amount=toNumber(p?.jumlah_pengajuan||0),budget=toNumber(act?.jumlah||0);
    const opts=activities.map(k=>`<option value="${esc(k.id_kegiatan)}" ${String(k.id_kegiatan)===String(selected)?'selected':''} ${!k.payment_ready&&!p?'disabled':''}>${esc(k.nama_kegiatan)} — ${rupiah(k.jumlah)}${k.payment_ready?'':' (belum siap)'}</option>`).join('');
    const noActivity=!activities.length&&!p;
    return `<section class="panel premium-panel payment-form-v138"><div class="panel-title-row"><div><h3>${p?'Edit Pengajuan Pembayaran':'Buat Pengajuan Pembayaran'}</h3><p class="panel-sub">Surat dan lembar verifikasi dibuat otomatis mengikuti template yang diberikan.</p></div>${p?'<button class="btn-soft" onclick="closePaymentFormV138()">Kembali ke Daftar</button>':''}</div>${noActivity?paymentNoActivityInfoV139():''}<div class="form-grid"><div class="field span-2"><label>Kegiatan *</label><select id="payActivityV138" ${p?'disabled':''} onchange="paymentPrefillActivityV138=this.value;renderPaymentWorkspaceV138()"><option value="">Pilih kegiatan</option>${opts}</select>${act?`<div class="payment-budget-card-v139"><span>Pagu kegiatan</span><b>${rupiah(budget)}</b><small>${act.payment_ready?'Siap dibuatkan pengajuan pembayaran':esc(act.payment_reason||'Belum siap')}</small></div>`:''}${act&&!act.payment_ready?`<small class="error">${esc(act.payment_reason)}</small>`:''}</div><div class="field"><label>Nomor Nota Dinas Bidang *</label><input id="payNdNoV138" value="${esc(p?.nomor_nd_bidang||'')}" placeholder=".../ND-.../PB-PORPROV/.../2026"></div><div class="field"><label>Tanggal Nota Dinas *</label><input id="payNdDateV138" type="date" value="${esc(paymentDateInputV138(p?.tanggal_nd_bidang)||today)}"></div><div class="field"><label>Sifat</label><select id="paySifatV138"><option ${String(p?.sifat||'PENTING').toUpperCase()==='PENTING'?'selected':''}>PENTING</option><option ${String(p?.sifat).toUpperCase()==='SEGERA'?'selected':''}>SEGERA</option></select></div><div class="field"><label>Nomor SPTJM *</label><input id="paySptjmNoV138" value="${esc(p?.nomor_sptjm||'')}" placeholder="Nomor SPTJM"></div><div class="field"><label>Hari/Tanggal Kegiatan *</label><input id="payEventDateV138" value="${esc(p?.hari_tanggal_kegiatan||'')}" placeholder="Contoh: Senin, 14 Juli 2026"></div><div class="field"><label>Tempat Kegiatan *</label><input id="payPlaceV138" value="${esc(p?.tempat_kegiatan||'')}" placeholder="Lokasi kegiatan"></div><div class="field"><label>Nama Penandatangan Bidang *</label><input id="paySignerNameV138" value="${esc(p?.nama_pengaju||currentUser?.nama||'')}" placeholder="Nama lengkap"></div><div class="field"><label>Jabatan Penandatangan *</label><input id="paySignerRoleV138" value="${esc(p?.jabatan_pengaju||'Kepala Bidang/Bagian')}" placeholder="Kepala Bidang/Bagian"></div><div class="field span-2"><label><input id="payReimburseV138" type="checkbox" ${String(p?.reimbursement)==='1'?'checked':''}> Pembayaran bersifat reimbursement (Kuitansi/Tanda Terima menjadi wajib)</label></div></div><div class="payment-section-v138"><div class="panel-title-row"><div><h4>Rincian Penggunaan Anggaran</h4><p class="panel-sub">Masukkan seluruh rincian belanja yang diajukan. Jumlah rincian dihitung otomatis dan tidak boleh melebihi pagu kegiatan ${budget?rupiah(budget):''}.</p></div><button class="btn-soft" type="button" onclick="document.getElementById('payRincianRowsV138').insertAdjacentHTML('beforeend',paymentRincianRowsHtmlV138([{uraian:'',jumlah:0}]));syncPaymentTotalV138()">Tambah Rincian</button></div><div id="payRincianRowsV138">${paymentRincianRowsHtmlV138(rincian)}</div><div class="payment-total-v138"><span>Jumlah Pengajuan</span><input id="payAmountV138" value="${amount?Number(amount).toLocaleString('id-ID'):''}" readonly><small id="payTerbilangV138">${esc(p?.terbilang||numberWordsV138(amount))}</small></div><div id="payBudgetWarningV139" class="payment-budget-warning-v139"></div></div><div class="payment-section-v138"><div class="panel-title-row"><div><h4>Rekening Tujuan untuk Surat Perintah Pemindahbukuan</h4><p class="panel-sub">Masukkan rekening setiap penerima. Total seluruh rekening harus sama dengan jumlah pengajuan dan tidak boleh melebihi pagu kegiatan.</p></div><button class="btn-soft" type="button" onclick="document.getElementById('payAccountRowsV138').insertAdjacentHTML('beforeend',paymentAccountRowsHtmlV138([{uraian:'',nama_rekening:'',nama_bank:'',nomor_rekening:'',jumlah:0}]));syncPaymentAccountTotalV139()">Tambah Rekening</button></div><div id="payAccountRowsV138">${paymentAccountRowsHtmlV138(rekening)}</div><div id="payAccountTotalV139" class="payment-account-total-v139">Total rekening: ${rupiah(paymentTotalRincianV138(rekening))}</div><div id="payAccountWarningV139" class="payment-budget-warning-v139"></div></div><div class="action-group"><button id="paySaveButtonV139" class="btn-green" onclick="savePaymentDraftV138()" ${noActivity?'disabled':''}>${p?'Simpan Perubahan':'Simpan & Buat'}</button>${p?`<button class="btn-danger" onclick="deletePaymentV138('${esc(p.id_pengajuan)}')">Hapus Pengajuan</button>`:''}</div></section>${p?`<section class="panel premium-panel"><div class="panel-title-row"><div><h3>Dokumen Pendukung</h3><p class="panel-sub">Maksimal 2 MB per file. Dokumen yang berhasil diunggah langsung tampil pada kolom Dokumen Asli.</p></div><button id="payUploadButtonV139" class="btn-green" onclick="uploadPaymentDocsV138('${esc(p.id_pengajuan)}')">Upload Dokumen Terpilih</button></div><div class="table-wrap"><table><thead><tr><th>Jenis Dokumen</th><th>Dokumen Asli</th><th>Pilih File</th></tr></thead><tbody>${paymentUploadRowsV138(p)}</tbody></table></div><div class="payment-generated-box-v138"><h4>Dokumen yang Dibuat Sistem</h4>${paymentGeneratedButtonsV138(p)}</div><div class="action-group"><button class="btn-green payment-tte-submit-v139" onclick="submitPaymentV138('${esc(p.id_pengajuan)}')">TTE &amp; Ajukan Verifikasi</button></div></section>`:''}`;
  };

  function paymentValidationV139(data){
    const act=(paymentWorkspaceV138.kegiatan||[]).find(k=>String(k.id_kegiatan)===String(data.id_kegiatan)),budget=toNumber(act?.jumlah||0),rincianTotal=paymentTotalRincianV138(data.rincian),rekeningTotal=paymentTotalRincianV138(data.rekening);
    if(!data.id_kegiatan)return 'Pilih kegiatan terlebih dahulu.';
    if(!data.rincian.length)return 'Isi minimal satu rincian penggunaan anggaran.';
    if(budget>0&&rincianTotal>budget)return `Jumlah pengajuan ${rupiah(rincianTotal)} melebihi pagu kegiatan ${rupiah(budget)}.`;
    if(budget>0&&rekeningTotal>budget)return `Total rekening tujuan ${rupiah(rekeningTotal)} melebihi pagu kegiatan ${rupiah(budget)}.`;
    if(rekeningTotal>rincianTotal)return `Total rekening tujuan ${rupiah(rekeningTotal)} tidak boleh melebihi jumlah pengajuan ${rupiah(rincianTotal)}.`;
    if(data.rekening.length&&!data.rekening.every(x=>x.uraian&&x.nama_rekening&&x.nama_bank&&x.nomor_rekening&&x.jumlah>0))return 'Lengkapi seluruh data rekening tujuan atau hapus baris yang belum digunakan.';
    return '';
  }

  async function savePaymentCoreV139({silent=false}={}){
    const data=collectPaymentFormV138(),err=paymentValidationV139(data);if(err){if(!silent)alert(err);throw new Error(err);}
    if(!silent){const ok=await confirmActionV133({title:paymentEditIdV138?'Simpan Perubahan Pengajuan':'Simpan & Buat Pengajuan',message:paymentEditIdV138?'Perubahan data pengajuan akan disimpan.':'Data Nota Dinas, SPTJM, rincian anggaran, dan rekening tujuan akan dibuat sebagai pengajuan yang masih dapat dilengkapi sebelum TTE.',confirmText:paymentEditIdV138?'Ya, Simpan Perubahan':'Ya, Simpan & Buat'});if(!ok)return null;showLoading(paymentEditIdV138?'Menyimpan perubahan...':'Membuat pengajuan pembayaran...');}
    try{
      const r=await apiPost({action:'savePaymentDraftV138',user:currentUser,data});if(!r.success)throw new Error(r.message||'Gagal menyimpan pengajuan');
      paymentEditIdV138=r.id_pengajuan;paymentPrefillActivityV138=data.id_kegiatan;
      if(r.pengajuan){const other=(paymentWorkspaceV138.pengajuan||[]).filter(x=>String(x.id_pengajuan)!==String(r.id_pengajuan));paymentWorkspaceV138.pengajuan=[...other,r.pengajuan];}
      paymentTabV138='FORM';renderPaymentWorkspaceV138();
      if(!silent)alert(r.message||'Pengajuan berhasil dibuat. Silakan unggah dokumen pendukung.');
      return r.id_pengajuan;
    }catch(e){if(!silent)alert(e.message||String(e));throw e;}finally{if(!silent)hideLoading();}
  }
  savePaymentDraftV138=async function(){try{await savePaymentCoreV139({silent:false});}catch(e){}};

  function paymentEnsureProgressV139(){
    const overlay=document.getElementById('loadingOverlay'),card=overlay?.querySelector('.loader-card');if(!overlay||!card)return null;
    let wrap=document.getElementById('loadingProgressWrap');if(!wrap){wrap=document.createElement('div');wrap.id='loadingProgressWrap';wrap.className='loading-progress-wrap';wrap.innerHTML='<div class="loading-progress-head"><span id="loadingProgressDetail">Menyiapkan proses...</span><b id="loadingProgressPercent">0%</b></div><div class="loading-progress-track"><i id="loadingProgressBar" style="width:0%"></i></div>';card.appendChild(wrap);}wrap.classList.remove('hidden');return wrap;
  }
  function paymentSetProgressV139(percent,detail){
    paymentEnsureProgressV139();const p=Math.max(0,Math.min(100,Math.round(percent||0))),bar=document.getElementById('loadingProgressBar'),pct=document.getElementById('loadingProgressPercent'),det=document.getElementById('loadingProgressDetail');if(bar)bar.style.width=p+'%';if(pct)pct.textContent=p+'%';if(det)det.textContent=detail||'';
  }
  function paymentStartPulseV139(){let p=36;clearInterval(paymentUploadPulseV139);paymentUploadPulseV139=setInterval(()=>{p=Math.min(91,p+(p<65?2:1));paymentSetProgressV139(p,'Mengirim dan menyimpan dokumen ke Google Drive...');},420);}
  function paymentStopPulseV139(){if(paymentUploadPulseV139){clearInterval(paymentUploadPulseV139);paymentUploadPulseV139=null;}}

  uploadPaymentDocsV138=async function(id){
    if(paymentUploadBusyV139)return alert('Upload masih berjalan. Tunggu sampai proses selesai.');
    const inputs=[...document.querySelectorAll('.payment-file-v138')].filter(x=>x.files?.length);if(!inputs.length)return alert('Pilih minimal satu file.');
    const totalBytes=inputs.reduce((n,x)=>n+(x.files?.[0]?.size||0),0);if(totalBytes>12*1024*1024)return alert('Total ukuran dokumen maksimal 12 MB dalam satu proses.');
    paymentUploadBusyV139=true;const btn=document.getElementById('payUploadButtonV139');if(btn)btn.disabled=true;
    showLoading('Upload dokumen pendukung...');document.getElementById('loadingOverlay')?.classList.add('upload-mode-v135');paymentSetProgressV139(0,`Menyiapkan 0/${inputs.length} dokumen`);
    try{
      const docs=[];for(let i=0;i<inputs.length;i++){const inp=inputs[i],file=inp.files[0];if(file.size>MAX_UPLOAD_BYTES_V133)throw new Error(`${file.name} melebihi 2 MB`);const base64=await fileToBase64(file);docs.push({jenis_dokumen:inp.dataset.jenis,file_name:file.name,mime_type:file.type,file_base64:base64});paymentSetProgressV139(Math.round(((i+1)/inputs.length)*30),`Membaca ${i+1}/${inputs.length}: ${file.name}`);}
      paymentSetProgressV139(35,`Mengunggah 0/${docs.length} dokumen`);paymentStartPulseV139();
      const r=await apiPost({action:'uploadPaymentDocsBatchV138',user:currentUser,id_pengajuan:id,dokumen:docs});paymentStopPulseV139();if(!r.success)throw new Error(r.message||'Gagal upload');
      if(Array.isArray(r.dokumen)){const other=(paymentWorkspaceV138.dokumen||[]).filter(d=>String(d.id_pengajuan)!==String(id));paymentWorkspaceV138.dokumen=[...other,...r.dokumen];}
      paymentSetProgressV139(100,`${docs.length}/${docs.length} dokumen berhasil diunggah`);paymentTabV138='FORM';paymentEditIdV138=id;renderPaymentWorkspaceV138();await new Promise(res=>setTimeout(res,350));hideLoading();alert(r.message||`${docs.length} dokumen berhasil diunggah`);
    }catch(e){paymentStopPulseV139();hideLoading();alert(e.message||String(e));}
    finally{paymentUploadBusyV139=false;if(btn)btn.disabled=false;document.getElementById('loadingOverlay')?.classList.remove('upload-mode-v135');}
  };

  submitPaymentV138=async function(id){
    try{id=await savePaymentCoreV139({silent:true})||id;}catch(e){return alert(e.message||String(e));}
    const p=paymentByIdV138(id),missing=paymentRequiredDocsV138(p).filter(j=>!paymentDocV138(p,j));if(missing.length)return alert('Dokumen wajib belum lengkap:\n- '+missing.join('\n- '));
    const data=collectPaymentFormV138(),rekeningTotal=paymentTotalRincianV138(data.rekening);if(!data.rekening.length)return alert('Isi minimal satu rekening penerima.');if(Math.abs(rekeningTotal-data.jumlah_pengajuan)>0.5)return alert(`Total rekening tujuan harus sama dengan jumlah pengajuan. Selisih ${rupiah(Math.abs(rekeningTotal-data.jumlah_pengajuan))}.`);
    const ok=await confirmActionV133({title:'TTE & Ajukan Verifikasi',message:'Nota Dinas Bidang dan SPTJM akan ditandatangani secara elektronik atas nama penandatangan bidang, kemudian seluruh pengajuan dikirim kepada Verifikator Keuangan. Pastikan data dan dokumen sudah benar.',confirmText:'Ya, TTE & Ajukan'});if(!ok)return;
    showLoading('Menandatangani dan mengajukan verifikasi...');try{const r=await apiPost({action:'submitPaymentV138',user:currentUser,id_pengajuan:id});if(!r.success)throw new Error(r.message||'Gagal mengajukan');await loadPaymentWorkspaceV138(true);paymentTabV138='DAFTAR';renderPaymentWorkspaceV138();alert(r.message||'Pengajuan berhasil ditandatangani dan dikirim ke Verifikator Keuangan.');}catch(e){alert(e.message||String(e));}finally{hideLoading();}
  };

  paymentActionButtonsV138=function(p){
    const role=actualRoleV133(),s=String(p.status_pengajuan||'').toUpperCase(),out=[];
    if((role==='BIDANG'||role==='ADMIN')&&['DRAFT','PERBAIKAN BIDANG'].includes(s)){out.push(`<button onclick="openPaymentFormV138('${esc(p.id_pengajuan)}')">Edit & Lengkapi</button>`,`<button class="btn-green" onclick="openPaymentFormV138('${esc(p.id_pengajuan)}')">TTE & Ajukan Verifikasi</button>`,`<button class="btn-danger" onclick="deletePaymentV138('${esc(p.id_pengajuan)}')">Hapus Pengajuan</button>`);}
    if((role==='VERIFIKATOR_KEUANGAN'||role==='ADMIN')&&s==='MENUNGGU VERIFIKASI KEUANGAN')out.push(`<button class="btn-danger" onclick="verifyPaymentV138('${esc(p.id_pengajuan)}','KEMBALIKAN')">Kembalikan</button>`,`<button class="btn-green" onclick="verifyPaymentV138('${esc(p.id_pengajuan)}','VALID')">Berkas Lengkap & Sah</button>`);
    if((role==='PIMPINAN'||role==='ADMIN')&&s==='MENUNGGU PERSETUJUAN PIMPINAN')out.push(`<button class="btn-danger" onclick="approvePaymentModalV138('${esc(p.id_pengajuan)}','KEMBALIKAN')">Kembalikan</button>`,`<button class="btn-green" onclick="approvePaymentModalV138('${esc(p.id_pengajuan)}','SETUJUI')">Setujui & Buat Nota Dinas</button>`);
    if((role==='PIMPINAN'||role==='ADMIN')&&s==='MENUNGGU PERINTAH KETUA HARIAN')out.push(`<button class="btn-green" onclick="issueSP2ModalV138('${esc(p.id_pengajuan)}')">Terbitkan Surat Perintah Pemindahbukuan</button>`);
    if((role==='BENDAHARA'||role==='ADMIN')&&s==='MENUNGGU PEMBAYARAN BENDAHARA')out.push(`<button class="btn-green" onclick="completePaymentModalV138('${esc(p.id_pengajuan)}')">Catat Pembayaran</button>`);
    return `<div class="action-group payment-actions-v138">${out.join('')}</div>`;
  };

  window.openPaymentWorkspaceV139=function(tab){
    suratTabV133='PEMBAYARAN';paymentEditIdV138='';paymentPrefillActivityV138='';paymentTabV138=tab||(isPaymentCreatorV139()?'FORM':'DAFTAR');renderSuratV133();if(!paymentWorkspaceV138.loaded)loadPaymentWorkspaceV138(false);
  };
  const renderSuratBeforeV139=renderSuratV133;
  renderSuratV133=function(){
    if(suratTabV133==='PEMBAYARAN'){renderPaymentWorkspaceV138();if(!paymentWorkspaceV138.loaded)loadPaymentWorkspaceV138(false);return;}
    renderSuratBeforeV139();const btn=document.querySelector('.payment-tab-btn-v138');if(btn){btn.setAttribute('onclick',"openPaymentWorkspaceV139()");btn.textContent='Pengajuan Pembayaran';}
  };

  renderPaymentWorkspaceV138=function(){
    const area=document.getElementById('contentArea');if(!area)return;if(!paymentWorkspaceV138.loaded){area.innerHTML='<section class="panel premium-panel"><h3>Pengajuan Pembayaran</h3><div class="skeleton-v133"></div><div class="skeleton-v133 short"></div></section>';if(!paymentWorkspaceV138.loading)loadPaymentWorkspaceV138(false);return;}
    const canCreate=isPaymentCreatorV139();if(paymentTabV138==='FORM'&&!canCreate)paymentTabV138='DAFTAR';
    area.innerHTML=`<div class="payment-page-v138"><section class="panel premium-panel payment-head-v138"><div class="panel-title-row"><div><h3>Pengajuan Pembayaran</h3><p class="panel-sub">Nota Dinas, SPTJM, Lembar Verifikasi, Nota Dinas kepada Ketua Harian, dan Surat Perintah Pemindahbukuan dibuat langsung di SIMPROV.</p></div></div><div class="surat-tabs-v133 payment-tabs-v139"><button onclick="suratTabV133='BUAT';renderSuratV133()">Nota Dinas Umum</button><button onclick="suratTabV133='MASUK';renderSuratV133()">Surat Masuk</button><button class="${paymentTabV138==='DAFTAR'?'active':''}" onclick="setPaymentTabV138('DAFTAR')">Pengajuan Pembayaran</button>${canCreate?`<button class="${paymentTabV138==='FORM'?'active':''}" onclick="openPaymentFormV138()">Buat Pengajuan</button>`:''}</div></section><section class="payment-sop-note-v138"><b>Pedoman SOP:</b> Bidang membuat Nota Dinas dan SPTJM → Verifikator Keuangan membuat Lembar Verifikasi → Ketua/Sekretaris Umum menyetujui dan membuat Nota Dinas kepada Ketua Harian → Ketua Harian menerbitkan SP2 → Bendahara membayar.</section>${paymentTabV138==='FORM'?paymentFormV138():paymentListV138()}<div id="paymentActionModalHostV138"></div></div>`;setTimeout(paymentSetBudgetMessageV139,0);
  };

  function simprovLogoUrlV139(){try{return new URL('logo-siporbo.png',window.location.href).href;}catch(e){return 'logo-siporbo.png';}}
  function simprovPrintHeaderV139(){return `<header class="simprov-print-head-v139"><img src="${esc(simprovLogoUrlV139())}" alt="Logo SIMPROV"><div><b>SIMPROV</b><span>Sistem Informasi Monitoring Persiapan PORPROV Kota Bogor</span><small>Dokumen resmi dibuat dan tercatat melalui SIMPROV</small></div></header>`;}

  paymentPrintShellV138=function(title,body){return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:14mm 18mm 17mm}*{box-sizing:border-box}body{font-family:'Times New Roman',serif;color:#000;font-size:11pt;line-height:1.35;margin:0}.toolbar{position:sticky;top:0;z-index:9;background:#edf7ff;padding:10px;text-align:right}.toolbar button{padding:8px 13px;margin-left:6px;border:1px solid #9bbad0;border-radius:7px;background:white;font-weight:bold}.doc{max-width:180mm;margin:auto}.simprov-print-head-v139{display:flex;align-items:center;gap:13px;border-bottom:3px solid #174a79;padding:0 0 9px;margin-bottom:18px;color:#123e67}.simprov-print-head-v139 img{width:45px;height:45px;object-fit:contain}.simprov-print-head-v139 div{display:flex;flex-direction:column}.simprov-print-head-v139 b{font-family:Arial,sans-serif;font-size:18pt;line-height:1}.simprov-print-head-v139 span{font-family:Arial,sans-serif;font-size:9.5pt;font-weight:bold;margin-top:3px}.simprov-print-head-v139 small{font-family:Arial,sans-serif;font-size:7.5pt;margin-top:2px}.doc-title{text-align:center;text-decoration:underline;font-size:13pt;font-weight:bold;margin:0 0 20px}.kop{display:none}.meta{width:100%;border-collapse:collapse;margin-bottom:15px}.meta td{padding:1px 3px;vertical-align:top}.meta td:first-child{width:115px}.meta td:nth-child(2){width:12px}.body{text-align:justify}.body p{margin:0 0 8px}.simple-table,.check-table,.sp2-table{width:100%;border-collapse:collapse;margin:10px 0}.simple-table th,.simple-table td,.check-table th,.check-table td,.sp2-table th,.sp2-table td{border:1px solid #000;padding:5px;vertical-align:top}.simple-table th,.check-table th{text-align:center}.sp2-table th{background:#1f416d;color:#fff;text-align:center}.sign-right{width:310px;margin:35px 0 0 auto;text-align:center}.sign-two{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:35px;text-align:center}.sign-space{height:58px}.tte{font-size:9pt;color:#1d5f89}.tte-box-v139{display:inline-block;border:1px dashed #1e6e9d;border-radius:8px;padding:5px 9px;color:#155f8c;font-family:Arial,sans-serif;font-size:8.5pt;font-weight:bold;margin:4px 0}.tte-time-v139{display:block;font-size:7.5pt;font-weight:normal;margin-top:2px}.tte-pending-v139{font-size:8pt;color:#777;margin:4px 0}.page-break{page-break-before:always}.doc-links a{color:#000;text-decoration:underline}.small{font-size:9pt}.center{text-align:center}.sp2-head{text-align:center}.sp2-total{font-weight:bold;background:#dff9f5}.nowrap{white-space:nowrap}@media print{.toolbar{display:none}.doc{max-width:none}}</style></head><body><div class="toolbar"><button onclick="window.close()">Tutup</button><button onclick="window.print()">Cetak / Simpan PDF</button></div><main class="doc">${simprovPrintHeaderV139()}${body}</main></body></html>`;};

  const paymentSignatureBeforeV139=paymentSignatureV138;
  paymentSignatureV138=function(name,role,signed=true){
    const ctx=paymentPrintContextV139,p=ctx?.p||{},isBidangDoc=['ND_BIDANG','SPTJM'].includes(ctx?.type)&&String(name||'')===String(p.nama_pengaju||'');
    const validSigned=isBidangDoc?!!p.tte_bidang_oleh:!!signed,who=isBidangDoc?(p.tte_bidang_oleh||name):name,when=isBidangDoc?(p.tte_bidang_waktu||''):'';
    return `<div>${esc(role||'')}<div class="sign-space"></div>${validSigned?`<div class="tte-box-v139">TTE SIMPROV${when?`<span class="tte-time-v139">${esc(formatDate(when)||when)}</span>`:''}</div>`:'<div class="tte-pending-v139">Belum ditandatangani elektronik</div>'}<br><b>${esc(who||'[NAMA LENGKAP]')}</b></div>`;
  };
  const printPaymentBeforeV139=printPaymentDocV138;
  printPaymentDocV138=function(id,type){paymentPrintContextV139={p:paymentByIdV138(id),type};try{return printPaymentBeforeV139(id,type);}finally{setTimeout(()=>{paymentPrintContextV139=null;},0);}};

  function decodeSuratHtmlV139(raw){
    let s=String(raw||'');for(let i=0;i<3;i++){const ta=document.createElement('textarea');ta.innerHTML=s;const d=ta.value;if(d===s)break;s=d;}
    if(!/[<>]/.test(s))return `<p>${esc(s).replace(/\n/g,'<br>')}</p>`;
    const parsed=new DOMParser().parseFromString(`<div id="suratRootV139">${s}</div>`,'text/html'),root=parsed.getElementById('suratRootV139');if(!root)return `<p>${esc(s)}</p>`;
    root.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach(x=>x.remove());
    root.querySelectorAll('*').forEach(el=>{[...el.attributes].forEach(a=>{const n=a.name.toLowerCase();if(n.startsWith('on')||n.startsWith('data-')||n==='id'||n==='class'||n==='role'||n.startsWith('aria-'))el.removeAttribute(a.name);});if(el.hasAttribute('style')){const st=el.style,keep=[];['textAlign','fontWeight','fontStyle','textDecoration','marginLeft'].forEach(k=>{if(st[k])keep.push(k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+':'+st[k]);});if(keep.length)el.setAttribute('style',keep.join(';'));else el.removeAttribute('style');}});
    return root.innerHTML||'<p>-</p>';
  }
  printNotaDinasV133=function(id){
    const s=(suratWorkspaceV133?.surat||[]).find(x=>String(x.id_surat)===String(id));if(!s)return alert('Surat tidak ditemukan.');const w=window.open('about:blank','_blank');if(!w)return alert('Popup diblokir browser. Izinkan popup untuk mencetak surat.');
    const body=decodeSuratHtmlV139(s.isi_ringkas||'<p>-</p>'),tujuan=s.tujuan_role==='BIDANG'?(suratWorkspaceV133?.bidangs||[]).find(b=>String(b.id_bidang)===String(s.tujuan_bidang))?.nama_bidang||s.tujuan_bidang||'-':(s.tujuan_role||'Pimpinan'),senderName=s.pengirim_ttd_nama||s.asal_nama||'-',signed=!!(s.pengirim_ttd_digital||s.tanggal_diajukan||String(s.status_surat||'').toUpperCase()!=='DRAFT'),attachment=s.url_file?`<p class="attachment"><b>Lampiran:</b> <a href="${esc(s.url_file)}" target="_blank" rel="noopener">Buka Dokumen Asli — ${esc(s.nama_file||'Lampiran')}</a></p>`:'';
    const approval=s.persetujuan_digital?`<div class="sign-box"><b>Mengetahui / Menyetujui</b><div class="sign-space"></div><div class="tte-box-v139">TTE SIMPROV</div><br><b>${esc(s.disetujui_oleh||'Pimpinan')}</b><small>${esc(s.persetujuan_digital)}</small></div>`:'';
    w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Nota Dinas ${esc(s.nomor_surat||'')}</title><style>@page{size:A4;margin:14mm 18mm 17mm}*{box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.45;color:#000;margin:0}.toolbar{position:sticky;top:0;z-index:5;background:#eef7ff;padding:10px;text-align:right}.toolbar button{margin-left:6px;padding:8px 12px;border:1px solid #bdd3e2;border-radius:8px;background:white;font-weight:bold}.sheet{max-width:180mm;margin:auto}.simprov-print-head-v139{display:flex;align-items:center;gap:13px;border-bottom:3px solid #174a79;padding:0 0 9px;margin-bottom:18px;color:#123e67}.simprov-print-head-v139 img{width:45px;height:45px;object-fit:contain}.simprov-print-head-v139 div{display:flex;flex-direction:column}.simprov-print-head-v139 b{font-family:Arial,sans-serif;font-size:18pt;line-height:1}.simprov-print-head-v139 span{font-family:Arial,sans-serif;font-size:9.5pt;font-weight:bold;margin-top:3px}.simprov-print-head-v139 small{font-family:Arial,sans-serif;font-size:7.5pt;margin-top:2px}.title{text-align:center;text-decoration:underline;font-weight:bold;font-size:14pt;margin:0 0 20px}.meta{width:100%;border-collapse:collapse;margin:16px 0}.meta td{vertical-align:top;padding:2px}.meta td:first-child{width:110px}.meta td:nth-child(2){width:12px}.isi{text-align:justify}.isi p{margin:0 0 9px}.isi ol,.isi ul{margin:0 0 9px 25px}.attachment{margin-top:20px;padding:12px;border:1px solid #bbb;border-radius:8px}.ttd-row{display:grid;grid-template-columns:${approval?'1fr 1fr':'1fr'};gap:50px;margin-top:35px}.sign-box{text-align:center;${approval?'':'max-width:310px;margin-left:auto'}}.sign-space{height:58px}.tte-box-v139{display:inline-block;border:1px dashed #1e6e9d;border-radius:8px;padding:5px 9px;color:#155f8c;font-family:Arial,sans-serif;font-size:8.5pt;font-weight:bold;margin:4px 0}.sign-box small{display:block;color:#386883;font-size:8pt;margin-top:4px}.footer{margin-top:28px;color:#607080;font-size:8.5pt}@media print{.toolbar{display:none}.sheet{max-width:none}}</style></head><body><div class="toolbar"><button onclick="window.close()">Tutup</button><button onclick="window.print()">Cetak / Simpan PDF</button></div><main class="sheet">${simprovPrintHeaderV139()}<div class="title">NOTA DINAS</div><table class="meta"><tr><td>Kepada Yth</td><td>:</td><td>${esc(tujuan)}</td></tr><tr><td>Dari</td><td>:</td><td>${esc(s.asal_nama||'-')}${s.asal_bidang?` (${esc(bidangName(s.asal_bidang)||s.asal_bidang)})`:''}</td></tr><tr><td>Nomor</td><td>:</td><td>${esc(s.nomor_surat||'-')}</td></tr><tr><td>Tanggal</td><td>:</td><td>${esc(formatDate(s.tanggal_surat)||'-')}</td></tr><tr><td>Sifat</td><td>:</td><td>${esc(s.sifat||'PENTING')}</td></tr><tr><td>Perihal</td><td>:</td><td>${esc(s.perihal||'-')}</td></tr></table><div class="isi">${body}</div>${attachment}<div class="ttd-row">${approval}<div class="sign-box"><b>Pengirim</b><div class="sign-space"></div>${signed?'<div class="tte-box-v139">TTE SIMPROV</div><br>':''}<b>${esc(senderName)}</b><small>${esc(s.pengirim_ttd_digital||'Ditandatangani secara elektronik melalui SIMPROV')}</small></div></div><div class="footer">Dokumen dibuat dan dicatat melalui SIMPROV • ID Surat: ${esc(s.id_surat||'-')}</div></main></body></html>`);w.document.close();
  };

  window.__SIMPROV_PAYMENT_PATCH_VERSION__=PAYMENT_PATCH_VERSION_V139;
})();

/* =========================================================
   SIMPROV v140 - Stabilitas menu Surat, navigasi pembayaran,
   editor Nota Dinas lengkap, cetak tujuan asli, dan respons
   cepat saat membuat perencanaan.
   ========================================================= */
(function(){
  const SIMPROV_PATCH_V140='1400-surat-payment-editor-fast-planning';

  /* 1. Loading menu Surat tampil sejak tombol diklik sampai workspace siap. */
  const setMenuBeforeV140=setMenu;
  setMenu=function(menu){
    if(String(menu)==='Surat'){
      showLoading('Memuat menu Surat...');
      const alreadyLoaded=!!(suratWorkspaceV133&&suratWorkspaceV133.loaded);
      const result=setMenuBeforeV140(menu);
      if(alreadyLoaded)setTimeout(()=>hideLoading(),120);
      return result;
    }
    return setMenuBeforeV140(menu);
  };
  const loadSuratBeforeV140=loadSuratWorkspaceV133;
  loadSuratWorkspaceV133=async function(force=false){
    try{return await loadSuratBeforeV140(force);}
    finally{if(activeMenu==='Surat')setTimeout(()=>hideLoading(),80);}
  };

  /* 2-3. Navigasi Pengajuan Pembayaran dibuat konsisten dan tombol Buat
     Pengajuan dipindah ke daftar, bersebelahan dengan Refresh. */
  function canCreatePaymentV140(){return ['BIDANG','ADMIN'].includes(actualRoleV133());}
  paymentListV138=function(){
    const role=actualRoleV133();
    const rows=[...(paymentWorkspaceV138.pengajuan||[])].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
    let title='Daftar Pengajuan Pembayaran';
    if(role==='VERIFIKATOR_KEUANGAN')title='Antrean Verifikasi Permohonan Pembayaran';
    if(role==='PIMPINAN')title='Antrean Persetujuan dan Perintah Pembayaran';
    if(role==='BENDAHARA')title='Antrean Pembayaran Bendahara';
    return `<section class="panel premium-panel payment-list-panel-v140"><div class="panel-title-row"><div><h3>${title}</h3><p class="panel-sub">Alur mengikuti SOP: Bidang → Verifikator Keuangan → Ketua/Sekretaris Umum → Ketua Harian → Bendahara.</p></div><div class="action-group payment-list-head-actions-v140"><button class="btn-refresh" onclick="loadPaymentWorkspaceV138(true)">Refresh</button>${canCreatePaymentV140()?'<button class="btn-primary-v140" onclick="openPaymentFormV138()">Buat Pengajuan</button>':''}</div></div><div class="payment-list-v138">${rows.map(paymentCardV138).join('')||'<p class="empty">Belum ada pengajuan pembayaran.</p>'}</div></section>`;
  };

  const paymentFormBeforeV140=paymentFormV138;
  paymentFormV138=function(){
    let html=paymentFormBeforeV140();
    if(!/Kembali(?: ke Daftar)?/.test(html)){
      html=html.replace(/(<div class="panel-title-row"><div>[\s\S]*?<\/div>)(<\/div>)/,`$1<button class="btn-soft" onclick="closePaymentFormV138()">Kembali</button>$2`);
    }
    return html;
  };

  renderPaymentWorkspaceV138=function(){
    const area=document.getElementById('contentArea');if(!area)return;
    if(!paymentWorkspaceV138.loaded){
      area.innerHTML='<section class="panel premium-panel"><h3>Pengajuan Pembayaran</h3><div class="skeleton-v133"></div><div class="skeleton-v133 short"></div></section>';
      if(!paymentWorkspaceV138.loading)loadPaymentWorkspaceV138(false);
      return;
    }
    const canCreate=canCreatePaymentV140();
    if(paymentTabV138==='FORM'&&!canCreate)paymentTabV138='DAFTAR';
    area.innerHTML=`<div class="payment-page-v138"><section class="panel premium-panel payment-head-v138"><div class="panel-title-row"><div><h3>Pengajuan Pembayaran</h3><p class="panel-sub">Nota Dinas, SPTJM, Lembar Verifikasi, Nota Dinas kepada Ketua Harian, dan Surat Perintah Pemindahbukuan dibuat langsung di SIMPROV.</p></div></div><div class="surat-tabs-v133 payment-tabs-v140"><button onclick="suratTabV133='BUAT';renderSuratV133()">Buat Surat</button><button onclick="suratTabV133='MASUK';renderSuratV133()">Surat Masuk <span>${typeof suratIncomingCountV134==='function'?suratIncomingCountV134((suratWorkspaceV133?.surat||[]).filter(suratIsIncomingV133)):''}</span></button><button class="active" onclick="setPaymentTabV138('DAFTAR')">Pengajuan Pembayaran</button></div></section><section class="payment-sop-note-v138"><b>Pedoman SOP:</b> Bidang membuat Nota Dinas dan SPTJM → Verifikator Keuangan membuat Lembar Verifikasi → Ketua/Sekretaris Umum menyetujui dan membuat Nota Dinas kepada Ketua Harian → Ketua Harian menerbitkan SP2 → Bendahara membayar.</section>${paymentTabV138==='FORM'?paymentFormV138():paymentListV138()}<div id="paymentActionModalHostV138"></div></div>`;
    setTimeout(()=>{if(typeof syncPaymentTotalV138==='function')syncPaymentTotalV138();},0);
  };

  /* 4-6. Editor Nota Dinas lengkap dan cetak selalu memakai tujuan asli
     (Pimpinan), bukan posisi routing/disposisi terakhir. */
  function combinedClassV140(v){
    const k=String(v||'').toUpperCase().replace(/[+&]/g,' DAN ').replace(/_/g,' ').replace(/\s+/g,' ').trim();
    return k==='UMUM DAN PENCAIRAN'||k==='GABUNGAN';
  }
  function sanitizeSuratHtmlV140(html){
    const doc=new DOMParser().parseFromString(`<div id="root-v140">${String(html||'')}</div>`,'text/html');
    const root=doc.getElementById('root-v140');if(!root)return '<p><br></p>';
    root.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta').forEach(x=>x.remove());
    const allowed=new Set(['P','BR','B','STRONG','I','EM','U','UL','OL','LI','DIV','SPAN','H1','H2','H3','H4','H5','H6','BLOCKQUOTE']);
    [...root.querySelectorAll('*')].forEach(el=>{
      if(!allowed.has(el.tagName)){el.replaceWith(...el.childNodes);return;}
      [...el.attributes].forEach(a=>{if(a.name!=='style')el.removeAttribute(a.name);});
      if(el.hasAttribute('style')){
        const keep=[];
        const align=el.style.textAlign;if(['left','right','center','justify'].includes(align))keep.push(`text-align:${align}`);
        const ml=el.style.marginLeft;if(ml&&/^\d+(\.\d+)?(px|pt|em|rem|%)$/.test(ml))keep.push(`margin-left:${ml}`);
        if(el.style.fontWeight)keep.push(`font-weight:${el.style.fontWeight}`);
        if(el.style.fontStyle)keep.push(`font-style:${el.style.fontStyle}`);
        if(el.style.textDecoration)keep.push(`text-decoration:${el.style.textDecoration}`);
        if(keep.length)el.setAttribute('style',keep.join(';'));else el.removeAttribute('style');
      }
    });
    return root.innerHTML.trim()||'<p><br></p>';
  }
  window.updateSuratPreviewValueV136=function(){
    const hidden=document.getElementById('suratIsiV133'),ed=document.getElementById('suratIsiEditorV136');
    if(hidden&&ed)hidden.value=sanitizeSuratHtmlV140(ed.innerHTML);
  };
  window.execSuratEditorV136=function(cmd,value=null){
    const ed=document.getElementById('suratIsiEditorV136');if(!ed)return;
    ed.focus();try{document.execCommand(cmd,false,value);}catch(e){console.warn('Editor command gagal',cmd,e);}updateSuratPreviewValueV136();
  };
  function editorButtonV140(cmd,label,title,value='null'){
    return `<button type="button" class="editor-btn-v136" onmousedown="event.preventDefault()" onclick="execSuratEditorV136('${cmd}',${value})" title="${title}" aria-label="${title}">${label}</button>`;
  }
  function suratEditorToolbarV140(){
    return `<div class="surat-editor-toolbar-v136 surat-editor-toolbar-v140"><div class="editor-group-v140">${editorButtonV140('undo','↶','Undo')}${editorButtonV140('redo','↷','Redo')}</div><div class="editor-group-v140">${editorButtonV140('bold','B','Tebal')}${editorButtonV140('italic','I','Miring')}${editorButtonV140('underline','U','Garis bawah')}</div><div class="editor-group-v140">${editorButtonV140('justifyLeft','≡','Rata kiri')}${editorButtonV140('justifyCenter','≣','Rata tengah')}${editorButtonV140('justifyRight','≡→','Rata kanan')}${editorButtonV140('justifyFull','☰','Rata kiri-kanan')}</div><div class="editor-group-v140">${editorButtonV140('insertUnorderedList','• Daftar','Daftar poin')}${editorButtonV140('insertOrderedList','1. Daftar','Daftar nomor')}${editorButtonV140('indent','→ Menjorok','Tambah inden')}${editorButtonV140('outdent','← Kembali','Kurangi inden')}</div><div class="editor-group-v140"><button type="button" class="editor-btn-v136" onmousedown="event.preventDefault()" onclick="removeSuratFormatV136()" title="Hapus format">Hapus Format</button><button type="button" class="editor-btn-v136 clear" onclick="clearSuratEditorV136()" title="Kosongkan isi">Clear Isi</button></div></div>`;
  }
  suratFormV133=function(){
    const s=(suratWorkspaceV133?.surat||[]).find(x=>String(x.id_surat)===String(suratEditIdV133));
    const today=new Date().toISOString().slice(0,10),initial=sanitizeSuratHtmlV140(s?.isi_ringkas||'<p><br></p>'),k=String(s?.klasifikasi||'UMUM').toUpperCase();
    return `<section class="panel fade-up premium-panel surat-form-panel-v133 surat-form-v136"><div class="panel-title-row"><div><h3>${s?'Perbaiki Nota Dinas':'Buat Surat'}</h3><p class="panel-sub">Isi Nota Dinas, tandatangani secara elektronik, lalu ajukan kepada Pimpinan.</p></div>${s?`<button class="btn-soft" onclick="cancelEditSuratV133()">Batal Edit</button>`:''}</div><div class="form-grid"><div class="field"><label>Jenis Surat</label><input value="Nota Dinas" readonly></div><div class="field"><label>Nomor Nota Dinas</label><input id="suratNomorV133" value="${esc(s?.nomor_surat||'')}" placeholder="Contoh: 10234/NotaDinas/140726"></div><div class="field"><label>Tanggal Surat</label><input id="suratTanggalV133" type="date" value="${esc(normalizeDateForInputV61(s?.tanggal_surat)||today)}"></div><div class="field"><label>Sifat</label><select id="suratSifatV133"><option ${String(s?.sifat).toUpperCase()==='BIASA'?'selected':''}>BIASA</option><option ${String(s?.sifat).toUpperCase()==='PENTING'?'selected':''}>PENTING</option><option ${String(s?.sifat).toUpperCase()==='SEGERA'?'selected':''}>SEGERA</option></select></div><div class="field"><label>Klasifikasi</label><select id="suratKlasifikasiV133"><option value="UMUM" ${k==='UMUM'?'selected':''}>Umum / Disposisi Bidang</option><option value="PENCAIRAN" ${k==='PENCAIRAN'?'selected':''}>Pencairan</option><option value="UMUM_DAN_PENCAIRAN" ${combinedClassV140(k)?'selected':''}>Umum / Disposisi Bidang + Pencairan</option></select></div><div class="field span-2"><label>Perihal</label><input id="suratPerihalV133" value="${esc(s?.perihal||'')}" placeholder="Perihal Nota Dinas"></div><div class="field full"><label>Isi Nota Dinas</label>${suratEditorToolbarV140()}<div id="suratIsiEditorV136" class="surat-editor-v136" contenteditable="true" spellcheck="true" oninput="updateSuratPreviewValueV136()" onkeydown="handleSuratEditorKeydownV136(event)">${initial}</div><input type="hidden" id="suratIsiV133" value="${esc(initial)}"><small class="field-help-v133">Tersedia tebal, miring, garis bawah, daftar, inden, rata kiri/tengah/kanan/kiri-kanan, undo, dan redo. Tekan Tab untuk membuat paragraf menjorok.</small></div><div class="field full"><label>Lampiran (opsional, maksimal 2 MB)</label><input id="suratFileV133" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"></div></div><div class="surat-form-note-v133">Tanda tangan elektronik pengirim dicatat saat surat diajukan. Surat yang sudah diajukan langsung tampil pada bagian Surat Saya.</div><div class="action-group"><button class="btn-soft" onclick="saveSuratV133(false)">Simpan Draft</button><button class="surat-submit-v136" onclick="saveSuratV133(true)">TTD dan Ajukan ke Pimpinan</button></div></section>`;
  };

  function decodeSuratV140(raw){
    let value=String(raw||'');
    for(let i=0;i<3;i++){const ta=document.createElement('textarea');ta.innerHTML=value;const next=ta.value;if(next===value)break;value=next;}
    if(!/[<>]/.test(value))return `<p>${esc(value).replace(/\n/g,'<br>')}</p>`;
    return sanitizeSuratHtmlV140(value);
  }
  function logoUrlV140(){try{return new URL('logo-siporbo.png',window.location.href).href;}catch(e){return 'logo-siporbo.png';}}
  printNotaDinasV133=function(id){
    const s=(suratWorkspaceV133?.surat||[]).find(x=>String(x.id_surat)===String(id));if(!s)return alert('Surat tidak ditemukan.');
    const w=window.open('about:blank','_blank');if(!w)return alert('Popup diblokir browser. Izinkan popup untuk mencetak surat.');
    const body=decodeSuratV140(s.isi_ringkas||'<p>-</p>');
    const senderName=s.pengirim_ttd_nama||s.asal_nama||'-';
    const signed=!!(s.pengirim_ttd_digital||s.tanggal_diajukan||String(s.status_surat||'').toUpperCase()!=='DRAFT');
    const approval=s.persetujuan_digital?`<div class="sign-box"><b>Mengetahui / Menyetujui</b><div class="sign-space"></div><div class="tte-box-v140">TTE SIMPROV</div><br><b>${esc(s.disetujui_oleh||'Pimpinan')}</b><small>${esc(s.persetujuan_digital)}</small></div>`:'';
    const attachment=s.url_file?`<div class="attachment-v140"><b>Lampiran:</b> <a href="${esc(s.url_file)}" target="_blank" rel="noopener">Buka Dokumen Asli — ${esc(s.nama_file||'Lampiran')}</a></div>`:'';
    w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Nota Dinas ${esc(s.nomor_surat||'')}</title><style>@page{size:A4;margin:14mm 18mm 17mm}*{box-sizing:border-box}body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.45;color:#000;margin:0}.toolbar{position:sticky;top:0;z-index:5;background:#eef7ff;padding:10px;text-align:right}.toolbar button{margin-left:6px;padding:8px 12px;border:1px solid #bdd3e2;border-radius:8px;background:white;font-weight:bold}.sheet{max-width:180mm;margin:auto}.print-head{display:flex;align-items:center;gap:13px;border-bottom:3px solid #174a79;padding:0 0 9px;margin-bottom:18px;color:#123e67}.print-head img{width:45px;height:45px;object-fit:contain}.print-head div{display:flex;flex-direction:column}.print-head b{font-family:Arial,sans-serif;font-size:18pt;line-height:1}.print-head span{font-family:Arial,sans-serif;font-size:9.5pt;font-weight:bold;margin-top:3px}.print-head small{font-family:Arial,sans-serif;font-size:7.5pt;margin-top:2px}.title{text-align:center;text-decoration:underline;font-weight:bold;font-size:14pt;margin:0 0 20px}.meta{width:100%;border-collapse:collapse;margin:16px 0}.meta td{vertical-align:top;padding:2px}.meta td:first-child{width:110px}.meta td:nth-child(2){width:12px}.isi{line-height:1.5}.isi p{margin:0 0 9px}.isi ol,.isi ul{margin:0 0 9px 25px}.ttd-row{display:grid;grid-template-columns:${approval?'1fr 1fr':'1fr'};gap:50px;margin-top:35px}.sign-box{text-align:center;${approval?'':'max-width:310px;margin-left:auto'}}.sign-space{height:58px}.tte-box-v140{display:inline-block;border:1px dashed #1e6e9d;border-radius:8px;padding:5px 9px;color:#155f8c;font-family:Arial,sans-serif;font-size:8.5pt;font-weight:bold;margin:4px 0}.sign-box small{display:block;color:#386883;font-size:8pt;margin-top:4px}.attachment-v140{margin-top:28px;padding:11px 12px;border:1px solid #bbb;border-radius:8px;page-break-inside:avoid}.footer{margin-top:22px;color:#607080;font-size:8.5pt}@media print{.toolbar{display:none}.sheet{max-width:none}}</style></head><body><div class="toolbar"><button onclick="window.close()">Tutup</button><button onclick="window.print()">Cetak / Simpan PDF</button></div><main class="sheet"><header class="print-head"><img src="${esc(logoUrlV140())}" alt="Logo SIMPROV"><div><b>SIMPROV</b><span>Sistem Informasi Monitoring Persiapan PORPROV Kota Bogor</span><small>Dokumen resmi dibuat dan tercatat melalui SIMPROV</small></div></header><div class="title">NOTA DINAS</div><table class="meta"><tr><td>Kepada Yth</td><td>:</td><td>${esc(s.tujuan_asli_nama||'Pimpinan')}</td></tr><tr><td>Dari</td><td>:</td><td>${esc(s.asal_nama||'-')}${s.asal_bidang?` (${esc(bidangName(s.asal_bidang)||s.asal_bidang)})`:''}</td></tr><tr><td>Nomor</td><td>:</td><td>${esc(s.nomor_surat||'-')}</td></tr><tr><td>Tanggal</td><td>:</td><td>${esc(formatDate(s.tanggal_surat)||'-')}</td></tr><tr><td>Sifat</td><td>:</td><td>${esc(s.sifat||'PENTING')}</td></tr><tr><td>Perihal</td><td>:</td><td>${esc(s.perihal||'-')}</td></tr></table><div class="isi">${body}</div><div class="ttd-row">${approval}<div class="sign-box"><b>Pengirim</b><div class="sign-space"></div>${signed?'<div class="tte-box-v140">TTE SIMPROV</div><br>':''}<b>${esc(senderName)}</b><small>${esc(s.pengirim_ttd_digital||'Ditandatangani secara elektronik melalui SIMPROV')}</small></div></div>${attachment}<div class="footer">Dokumen dibuat dan dicatat melalui SIMPROV • ID Surat: ${esc(s.id_surat||'-')}</div></main></body></html>`);w.document.close();
  };

  /* 7. Ringkasan Pengadaan Langsung tidak lagi menampilkan kolom Penyedia. */
  const renderDetailPLBeforeV140=renderDetailPengadaanLangsungV123;
  renderDetailPengadaanLangsungV123=function(k){
    const result=renderDetailPLBeforeV140(k);
    const summary=document.querySelector('.summary-pl-v123');
    if(summary){[...summary.children].forEach(card=>{if(String(card.querySelector('span')?.textContent||'').trim().toUpperCase()==='PENYEDIA')card.remove();});summary.classList.add('summary-pl-v140');}
    return result;
  };
  renderDetailPengadaanLangsungV95=function(k){return renderDetailPengadaanLangsungV123(k);};

  /* 8. Setelah backend menyimpan, paket baru langsung dimasukkan ke state
     lokal. Sinkronisasi penuh tetap berjalan diam-diam sebagai verifikasi. */
  window.applyCreatedPlanningV140=function(response,data){
    if(!response?.success)return;
    dashboard=dashboard||{};dashboard.perencanaan=dashboard.perencanaan||[];
    const created=response.perencanaan||{id_kegiatan:response.id_kegiatan,id_bidang:currentUser?.id_bidang,nama_kegiatan:data.nama_kegiatan,keterangan:data.keterangan||'',rincian_kebutuhan:data.rincian_kebutuhan||'',volume:data.volume,satuan:data.satuan,harga_satuan:data.harga_satuan,jumlah:toNumber(data.volume)*toNumber(data.harga_satuan),metode_pemilihan:data.metode_pemilihan||metodePemilihanByNilai(toNumber(data.volume)*toNumber(data.harga_satuan)),waktu_pemilihan:data.waktu_pemilihan,status_perencanaan:'DIAJUKAN',tanggal_input:new Date().toISOString(),input_by:currentUser?.nama||'',status_pencairan:String(data.kategori).toUpperCase()==='NON PENGADAAN'?'MENUNGGU PERSETUJUAN PBJ':'BELUM ADA DOKUMEN',kategori:data.kategori||'PENGADAAN',jenis_non_pengadaan:data.jenis_non_pengadaan||''};
    if(!dashboard.perencanaan.some(x=>String(x.id_kegiatan)===String(created.id_kegiatan)))dashboard.perencanaan.unshift(created);
    dashboard.rekap=dashboard.rekap||[];
    const rec=dashboard.rekap.find(x=>String(x.id_bidang)===String(currentUser?.id_bidang));
    if(rec)rec.total_perencanaan=dashboard.perencanaan.filter(x=>String(x.id_bidang)===String(currentUser?.id_bidang)).reduce((n,x)=>n+toNumber(x.jumlah||toNumber(x.volume)*toNumber(x.harga_satuan)),0);
    ['namaKegiatan','keterangan','volume','satuan','harga','waktuPemilihan'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const total=document.getElementById('totalPreview');if(total)total.value='Rp0';
    const metode=document.getElementById('metodePemilihan');if(metode)metode.value='';
    const msg=document.getElementById('saveMsg');if(msg)msg.textContent=response.message||'Perencanaan berhasil diajukan';
    writeDashboardCache(dashboard);renderAll();showFastCacheNotice('Perencanaan berhasil dibuat. Data terbaru sedang disinkronkan.');
    setTimeout(()=>{try{syncDashboardSilentV111();}catch(e){}},100);
  };

  window.__SIMPROV_PATCH_VERSION_V140__=SIMPROV_PATCH_V140;
})();


/* === SIMPROV v140.1 — payment default list + stable incoming count === */
(function(){
  window.openPaymentWorkspaceV139=function(tab){
    suratTabV133='PEMBAYARAN';
    paymentEditIdV138='';
    paymentPrefillActivityV138='';
    paymentTabV138=tab||'DAFTAR';
    renderSuratV133();
    if(!paymentWorkspaceV138.loaded)loadPaymentWorkspaceV138(false);
  };

  const __renderPaymentWorkspaceV140List=renderPaymentWorkspaceV138;
  renderPaymentWorkspaceV138=function(){
    __renderPaymentWorkspaceV140List();
    const incomingBtn=document.querySelector('.payment-tabs-v140 button:nth-child(2) span');
    if(incomingBtn){
      const count=(suratWorkspaceV133?.surat||[])
        .filter(x=>typeof suratIsIncomingV133==='function' ? suratIsIncomingV133(x) : false)
        .filter(x=>String(x.status_surat||'').toUpperCase()!=='SELESAI').length;
      incomingBtn.textContent=count?` (${count})`:'';
    }
  };
})();

/* =========================================================
   SIMPROV v141 - Perencanaan Super Cepat & Near-Realtime
   Prinsip: optimistic UI, endpoint ringan, polling adaptif,
   tanpa reload dashboard penuh setelah aksi perencanaan.
   ========================================================= */
(function(){
  const PLANNING_RT_VERSION_V141='141.0';
  let planningRevisionV141='';
  let planningSyncInFlightV141=false;
  let planningSyncTimerV141=null;
  let planningPendingRenderV141=false;
  let planningLastSyncAtV141=0;

  function isPlanningMenuV141(){return String(activeMenu||'').toUpperCase()==='PERENCANAAN';}
  function planningCacheKeyV141(){const u=currentUser||{};return 'SIMPROV_PLANNING_RT_V141_'+(u.id_user||u.username||u.id_bidang||'guest');}
  function savePlanningCacheV141(payload){try{localStorage.setItem(planningCacheKeyV141(),JSON.stringify({savedAt:Date.now(),payload:payload}));}catch(e){}}
  function readPlanningCacheV141(){try{return JSON.parse(localStorage.getItem(planningCacheKeyV141())||'null');}catch(e){return null;}}
  function planningFingerprintV141(rows){return JSON.stringify((rows||[]).map(x=>[x.id_kegiatan,x.nama_kegiatan,x.volume,x.satuan,x.harga_satuan,x.jumlah,x.status_perencanaan,x.alasan_penolakan,x.alasan_perubahan,x.perubahan_ke,x.riwayat_perubahan,x.waktu_pemilihan,x.status_pencairan]));}
  function planningBusyV141(){
    if(document.hidden)return true;
    if(document.querySelector('#editModal:not(.hidden),.modal:not(.hidden),.modal-backdrop:not(.hidden)'))return true;
    const a=document.activeElement,root=document.getElementById('contentArea');
    return !!(a&&root&&root.contains(a)&&(a.matches('input,textarea,select,[contenteditable="true"]')));
  }
  function planningFormSnapshotV141(){
    const root=document.getElementById('contentArea'),out={};if(!root)return out;
    root.querySelectorAll('input[id],select[id],textarea[id],[contenteditable="true"][id]').forEach(el=>{out[el.id]={value:el.matches('[contenteditable="true"]')?el.innerHTML:el.value,checked:!!el.checked,type:el.type||'',html:el.matches('[contenteditable="true"]')};});
    return out;
  }
  function restorePlanningFormV141(snap){Object.keys(snap||{}).forEach(id=>{const el=document.getElementById(id),v=snap[id];if(!el)return;if(v.html)el.innerHTML=v.value;else{el.value=v.value;if(v.type==='checkbox'||v.type==='radio')el.checked=v.checked;}});}
  function planningStatusBadgeV141(text,mode){
    let el=document.getElementById('planningRealtimeV141');
    if(!el){
      const panel=[...document.querySelectorAll('#contentArea .panel')].find(p=>p.querySelector('table')&&/Perencanaan/i.test(p.textContent||''));
      const heading=panel?.querySelector('h3');if(!heading)return;
      el=document.createElement('span');el.id='planningRealtimeV141';el.className='planning-realtime-v141';heading.insertAdjacentElement('afterend',el);
    }
    el.className='planning-realtime-v141 '+(mode||'ok');el.textContent=text||'Realtime aktif';
  }
  function recomputePlanningRekapV141(idBidang){
    if(!dashboard)return;dashboard.rekap=Array.isArray(dashboard.rekap)?dashboard.rekap:[];
    const ids=idBidang?[String(idBidang)]:[...new Set((dashboard.perencanaan||[]).map(x=>String(x.id_bidang||'')))];
    ids.forEach(id=>{let rec=dashboard.rekap.find(x=>String(x.id_bidang)===id);if(!rec){const b=(dashboard.bidangs||[]).find(x=>String(x.id_bidang)===id)||{};rec={id_bidang:id,nama_bidang:b.nama_bidang||id,pagu:toNumber(b.pagu),status_akses:b.status_akses||'BUKA'};dashboard.rekap.push(rec);}const rows=(dashboard.perencanaan||[]).filter(x=>String(x.id_bidang)===id);rec.total_perencanaan=rows.reduce((n,x)=>n+toNumber(x.jumlah||toNumber(x.volume)*toNumber(x.harga_satuan)),0);rec.jumlah_kegiatan=rows.length;rec.kegiatan_disetujui=rows.filter(x=>String(x.status_perencanaan||'').toUpperCase()==='DISETUJUI').length;});
  }
  function applyPlanningRowV141(row,fallback){
    if(!dashboard)return null;dashboard.perencanaan=Array.isArray(dashboard.perencanaan)?dashboard.perencanaan:[];
    const data=normalizeDashboardData({perencanaan:[Object.assign({},fallback||{},row||{})]}).perencanaan[0];
    const idx=dashboard.perencanaan.findIndex(x=>String(x.id_kegiatan)===String(data.id_kegiatan));
    if(idx>=0)dashboard.perencanaan[idx]=Object.assign({},dashboard.perencanaan[idx],data);else dashboard.perencanaan.unshift(data);
    recomputePlanningRekapV141(data.id_bidang);writeDashboardCache(dashboard);return data;
  }
  function removePlanningRowV141(id){if(!dashboard)return;const old=(dashboard.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));dashboard.perencanaan=(dashboard.perencanaan||[]).filter(x=>String(x.id_kegiatan)!==String(id));if(old)recomputePlanningRekapV141(old.id_bidang);writeDashboardCache(dashboard);}
  function renderPlanningRealtimeV141(force){
    if(!isPlanningMenuV141())return;
    if(!force&&planningBusyV141()){planningPendingRenderV141=true;planningStatusBadgeV141('Data baru tersedia • diterapkan setelah selesai mengetik','wait');return;}
    const snap=planningFormSnapshotV141(),y=window.scrollY;
    try{renderSummary();renderPerencanaan();restorePlanningFormV141(snap);planningPendingRenderV141=false;planningStatusBadgeV141('Realtime • baru saja diperbarui','ok');requestAnimationFrame(()=>window.scrollTo(0,y));}catch(e){console.warn('PLANNING_RENDER_V141',e);}
  }
  async function planningApiV141(){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{const res=await fetch(API_URL,{method:'POST',body:JSON.stringify({action:'getPerencanaanRealtimeV141',user:currentUser}),signal:controller.signal});const txt=await res.text();if(!res.ok)throw new Error('HTTP '+res.status);return JSON.parse(txt);}finally{clearTimeout(timer);}
  }
  function mergePlanningPayloadV141(r,forceRender){
    if(!r?.success||!dashboard)return false;
    const before=planningFingerprintV141(dashboard.perencanaan||[]),after=planningFingerprintV141(r.perencanaan||[]),changed=before!==after;
    dashboard.perencanaan=normalizeDashboardData({perencanaan:r.perencanaan||[]}).perencanaan;
    (r.rekap||[]).forEach(n=>{let old=(dashboard.rekap||[]).find(x=>String(x.id_bidang)===String(n.id_bidang));if(old)Object.assign(old,n);else{dashboard.rekap=dashboard.rekap||[];dashboard.rekap.push(n);}});
    planningRevisionV141=r.revision||planningRevisionV141;planningLastSyncAtV141=Date.now();writeDashboardCache(dashboard);savePlanningCacheV141(r);
    if(changed||forceRender)renderPlanningRealtimeV141(forceRender);
    else if(isPlanningMenuV141())planningStatusBadgeV141('Realtime • data sudah terbaru','ok');
    return changed;
  }
  async function syncPlanningRealtimeV141(opts){
    opts=opts||{};if(!currentUser||planningSyncInFlightV141)return false;
    planningSyncInFlightV141=true;if(isPlanningMenuV141())planningStatusBadgeV141(opts.silent?'Memeriksa pembaruan...':'Sinkronisasi data terbaru...','sync');
    try{const r=await planningApiV141();if(!r.success)throw new Error(r.message||'Gagal sinkronisasi');return mergePlanningPayloadV141(r,!!opts.forceRender);}catch(e){if(isPlanningMenuV141())planningStatusBadgeV141('Realtime aktif • koneksi akan dicoba ulang','warn');console.warn('PLANNING_SYNC_V141',e);return false;}finally{planningSyncInFlightV141=false;}
  }
  function schedulePlanningSyncV141(delay){clearTimeout(planningSyncTimerV141);planningSyncTimerV141=setTimeout(async()=>{if(currentUser&&isPlanningMenuV141()&&!document.hidden)await syncPlanningRealtimeV141({silent:true});schedulePlanningSyncV141(isPlanningMenuV141()?5000:20000);},Math.max(250,delay||7000));}
  function announcePlanningChangeV141(){try{localStorage.setItem('SIMPROV_PLANNING_SIGNAL_V141',JSON.stringify({at:Date.now(),by:currentUser?.id_user||currentUser?.username||''}));}catch(e){}schedulePlanningSyncV141(500);}

  const baseSetMenuV141=setMenu;
  setMenu=function(m){
    const planning=String(m||'').toUpperCase()==='PERENCANAAN';
    if(planning){const cache=readPlanningCacheV141();if(cache?.payload&&dashboard){mergePlanningPayloadV141(cache.payload,false);}}
    baseSetMenuV141(m);
    if(planning){planningStatusBadgeV141('Realtime • menyiapkan data terbaru','sync');syncPlanningRealtimeV141({silent:true});schedulePlanningSyncV141(5000);}
  };

  const baseApplyCreatedV141=window.applyCreatedPlanningV140;
  window.applyCreatedPlanningV140=function(response,data){baseApplyCreatedV141(response,data);recomputePlanningRekapV141(currentUser?.id_bidang);writeDashboardCache(dashboard);renderPlanningRealtimeV141(true);announcePlanningChangeV141();};

  submitEditPerencanaan=async function(){
    const mode=document.getElementById('editMode')?.value||'normal',id=document.getElementById('editIdKegiatan')?.value||'',waktu=document.getElementById('editWaktuPemilihan')?.value||'';
    if(!waktu){alert('Waktu pemilihan wajib diisi.');return;}
    const old=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id))||{};
    const data={id_kegiatan:id,mode,nama_kegiatan:document.getElementById('editNamaKegiatan')?.value||'',rincian_kebutuhan:'',keterangan:document.getElementById('editKeterangan')?.value||'',volume:toNumber(document.getElementById('editVolume')?.value),satuan:document.getElementById('editSatuan')?.value||'',harga_satuan:toNumber(document.getElementById('editHarga')?.value),waktu_pemilihan:waktu,alasan_perubahan:document.getElementById('editAlasanPerubahan')?.value||'',kategori:old.kategori||'PENGADAAN',jenis_non_pengadaan:old.jenis_non_pengadaan||''};
    const jumlah=data.volume*data.harga_satuan,cek=cekPaguFrontend(jumlah,id);if(!cek.ok){alert(cek.message);return;}
    showLoading('Menyimpan perubahan...');
    try{const r=await apiPost({action:'updatePerencanaan',user:currentUser,data});if(!r.success)throw new Error(r.message||'Gagal menyimpan perubahan');const fallback=Object.assign({},old,data,{jumlah,metode_pemilihan:data.kategori==='NON PENGADAAN'?'':metodePemilihanByNilai(jumlah),status_perencanaan:mode==='change'?'PERUBAHAN_DIAJUKAN':'DIAJUKAN',perubahan_ke:mode==='change'?toNumber(old.perubahan_ke)+1:toNumber(old.perubahan_ke)});applyPlanningRowV141(r.perencanaan,fallback);closeEditModal();hideLoading();renderPlanningRealtimeV141(true);showFastCacheNotice(r.message||'Perencanaan berhasil diperbarui');announcePlanningChangeV141();syncPlanningRealtimeV141({silent:true});}catch(e){hideLoading();alert(e.message||String(e));}
  };

  setujui=async function(id){
    const old=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id))||{};showLoading('Menyetujui perencanaan...');
    try{const r=await apiPost({action:'setujuiPerencanaan',user:currentUser,id_kegiatan:id});if(!r.success)throw new Error(r.message||'Gagal menyetujui');applyPlanningRowV141(r.perencanaan,Object.assign({},old,{status_perencanaan:'DISETUJUI',alasan_penolakan:''}));hideLoading();renderPlanningRealtimeV141(true);showFastCacheNotice(r.message||'Perencanaan disetujui');announcePlanningChangeV141();syncPlanningRealtimeV141({silent:true});}catch(e){hideLoading();alert(e.message||String(e));}
  };

  tolak=async function(id){
    const catatan=prompt('Alasan perbaikan wajib diisi:');if(!catatan||!catatan.trim())return;
    const old=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id))||{};showLoading('Mengembalikan perencanaan...');
    try{const r=await apiPost({action:'tolakPerencanaan',user:currentUser,id_kegiatan:id,catatan:catatan.trim()});if(!r.success)throw new Error(r.message||'Gagal mengembalikan');applyPlanningRowV141(r.perencanaan,Object.assign({},old,{status_perencanaan:'DITOLAK',alasan_penolakan:catatan.trim()}));hideLoading();renderPlanningRealtimeV141(true);showFastCacheNotice(r.message||'Perencanaan dikembalikan');announcePlanningChangeV141();syncPlanningRealtimeV141({silent:true});}catch(e){hideLoading();alert(e.message||String(e));}
  };

  hapusPerencanaan=async function(id){
    const k=(dashboard?.perencanaan||[]).find(x=>String(x.id_kegiatan)===String(id));if(k&&isKegiatanLocked(k)){alert('Kegiatan sudah terkunci karena dokumen pencairan sudah divalidasi.');return;}if(!aksesPerencanaanTerbuka()){alert('Akses perencanaan bidang sedang ditutup Verifikator.');return;}if(!confirm('Hapus perencanaan ini? Data yang dihapus tidak dapat dikembalikan.'))return;
    showLoading('Menghapus perencanaan...');try{const r=await apiPost({action:'deletePerencanaan',user:currentUser,id_kegiatan:id});if(!r.success)throw new Error(r.message||'Gagal menghapus');removePlanningRowV141(id);hideLoading();renderPlanningRealtimeV141(true);showFastCacheNotice(r.message||'Perencanaan berhasil dihapus');announcePlanningChangeV141();syncPlanningRealtimeV141({silent:true});}catch(e){hideLoading();alert(e.message||String(e));}
  };

  if(typeof syncDashboardSilentV111==='function'){
    const baseSilentV141=syncDashboardSilentV111;
    syncDashboardSilentV111=function(){if(isPlanningMenuV141())return syncPlanningRealtimeV141({silent:true});return baseSilentV141.apply(this,arguments);};
  }

  document.addEventListener('focusout',()=>{if(planningPendingRenderV141)setTimeout(()=>renderPlanningRealtimeV141(false),100);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isPlanningMenuV141())syncPlanningRealtimeV141({silent:true});});
  window.addEventListener('focus',()=>{if(isPlanningMenuV141()&&Date.now()-planningLastSyncAtV141>3000)syncPlanningRealtimeV141({silent:true});});
  window.addEventListener('storage',e=>{if(e.key==='SIMPROV_PLANNING_SIGNAL_V141'&&currentUser)syncPlanningRealtimeV141({silent:true});});
  schedulePlanningSyncV141(5000);
  window.__SIMPROV_PLANNING_RT_V141__={version:PLANNING_RT_VERSION_V141,sync:syncPlanningRealtimeV141};
})();

/* =========================================================
   SIMPROV v143 - Tampilan pasti terbaru setelah aksi (aman, aditif)
   ---------------------------------------------------------
   MASALAH: setelah melakukan aksi (verifikasi, pencairan, upload,
   pembayaran, dll), loadDashboard sempat menampilkan data dari cache
   lama sepersekian detik sebelum data terbaru dari server muncul.
   Pada koneksi lambat, "kedip data lama" ini terasa seperti tampilan
   belum ter-update.

   PERBAIKAN: setelah sebuah aksi TULIS berhasil, cache dashboard
   dibuang. Dengan begitu loadDashboard berikutnya langsung memakai
   data terbaru dari server, tanpa menampilkan cache lama dulu.

   TIDAK MENYENTUH:
   - Mesin realtime Perencanaan v141 (savePerencanaan, updatePerencanaan,
     setujui/tolak/deletePerencanaan, getPerencanaanRealtimeV141) -
     semua itu DIKECUALIKAN agar realtime-nya tetap seperti semula.
   - Aksi baca (getDashboard dll) tidak diapa-apakan.
   - Nama action, format request/response, dan data - tidak berubah.

   AMAN: hanya menghapus cache SETELAH server memastikan aksi berhasil.
   Kalau aksi gagal, cache tidak disentuh. Kalau penghapusan cache
   gagal pun, tidak fatal (dibungkus try/catch).
   ========================================================= */
(function(){
  if(typeof apiPost !== 'function' || typeof cacheKeyDashboard !== 'function') return;

  // Aksi yang TIDAK boleh memicu penghapusan cache:
  // - aksi baca (tidak mengubah data)
  // - aksi perencanaan (sudah dikelola mesin realtime sendiri)
  var LEWATI_V143 = {
    getDashboard:1, getPublicDashboard:1, getPbjDataV94:1,
    getPaymentWorkspaceV138:1, getSuratWorkspaceV133:1, getSuratLampiranV137:1,
    getSystemIdentity:1, getVerifierAccounts:1, login:1,
    getPerencanaanRealtimeV141:1, savePerencanaan:1, updatePerencanaan:1,
    setujuiPerencanaan:1, tolakPerencanaan:1, deletePerencanaan:1
  };

  var __apiPostBaseV143 = apiPost;
  apiPost = function(payload){
    var hasil = __apiPostBaseV143(payload);
    try{
      var a = payload && payload.action;
      if(a && !LEWATI_V143[a] && hasil && typeof hasil.then === 'function'){
        hasil.then(function(r){
          if(r && r.success){
            try{ localStorage.removeItem(cacheKeyDashboard()); }catch(e){}
          }
        }).catch(function(){ /* biarkan handler asli yang menangani error */ });
      }
    }catch(e){ /* jangan sampai membungkus apiPost bikin error */ }
    return hasil;   // kembalikan promise yang SAMA -> handler lama tetap jalan
  };
})();


/* =========================================================
   SIMPROV v144 - Optimasi Stabil Tanpa Mengubah Alur
   ---------------------------------------------------------
   1) Menghapus request PBJ tambahan yang sudah tidak memiliki route
      backend. Data penyedia/proses sudah ikut dalam getDashboard.
   2) Menyamakan alias data lama/baru agar menu Pengadaan Langsung
      tetap membaca payload dashboard utama.
   3) Single-flight untuk semua action baca penting.
   4) Mencegah response baca lama menimpa hasil aksi tulis terbaru.
   5) Sinkronisasi lintas-tab hanya saat user aman/idle, sehingga
      tampilan lebih realtime tanpa mengganggu form yang sedang diisi.
   Semua perubahan bersifat aditif dan memakai fallback ke fungsi lama.
   ========================================================= */
(function(){
  const PATCH_VERSION_V144='144.0';

  /* Payload backend v96 sudah mengirim penyedia/proses di getDashboard.
     Alias dipertahankan supaya fungsi lama tidak perlu diubah. */
  const normalizeBaseV144=normalizeDashboardData;
  normalizeDashboardData=function(payload){
    const out=normalizeBaseV144(payload||{});
    if(!Array.isArray(out.penyediaV94)) out.penyediaV94=Array.isArray(out.penyedia)?out.penyedia:[];
    if(!Array.isArray(out.prosesPengadaanV96)) out.prosesPengadaanV96=Array.isArray(out.prosesPengadaan)?out.prosesPengadaan:[];
    if(!Array.isArray(out.dokumenGeneratePengadaanV96)) out.dokumenGeneratePengadaanV96=Array.isArray(out.dokumenGeneratePengadaan)?out.dokumenGeneratePengadaan:[];
    if(!Array.isArray(out.pbjTahapanV94)) out.pbjTahapanV94=[];
    return out;
  };

  /* v94/v96 masih memanggil getPbjDataV94, padahal backend sekarang
     memasukkan data tersebut ke getDashboard. Gunakan core dashboard
     sebelum wrapper v94 agar satu kali buka dashboard hanya satu request. */
  const loadDashboardFallbackV144=loadDashboard;
  loadDashboard=async function(withLoader=true){
    if(typeof __loadDashboardV94Base==='function'){
      await __loadDashboardV94Base(withLoader);
      if(dashboard) dashboard=normalizeDashboardData(dashboard);
      return;
    }
    return loadDashboardFallbackV144(withLoader);
  };

  const READ_ACTIONS_V144=new Set([
    'login','getDashboard','getPublicDashboard','getSuratWorkspaceV133',
    'getSuratLampiranV137','getVerifierAccounts','getSystemIdentity',
    'getPaymentWorkspaceV138','getPerencanaanRealtimeV141','forceDriveAuth'
  ]);
  const PLANNING_WRITE_V144=new Set([
    'savePerencanaan','updatePerencanaan','setujuiPerencanaan',
    'tolakPerencanaan','deletePerencanaan'
  ]);
  const readInFlightV144=new Map();
  let dataEpochV144=0;
  const apiPostBaseV144=apiPost;
  const SIGNAL_KEY_V144='SIMPROV_DATA_SIGNAL_V144';

  function requestKeyV144(payload){
    const u=currentUser||{};
    return [payload?.action||'',u.id_user||u.username||'public',payload?.username||'',payload?.id_kegiatan||'',payload?.id_pengajuan||'',payload?.id_surat||''].join('|');
  }
  function invalidateCachesV144(action){
    try{ if(typeof cacheKeyDashboard==='function') localStorage.removeItem(cacheKeyDashboard()); }catch(e){}
    try{
      if(/Surat/i.test(action||'') && typeof suratCacheKeyV133==='function') sessionStorage.removeItem(suratCacheKeyV133());
    }catch(e){}
  }
  function broadcastWriteV144(action){
    try{
      localStorage.setItem(SIGNAL_KEY_V144,JSON.stringify({at:Date.now(),action:action||'',by:currentUser?.id_user||currentUser?.username||''}));
    }catch(e){}
  }

  apiPost=function(payload){
    const action=String(payload?.action||'');
    const isRead=READ_ACTIONS_V144.has(action);
    if(!isRead){
      const result=apiPostBaseV144(payload);
      if(result&&typeof result.then==='function'){
        result.then(r=>{
          if(r&&r.success){
            dataEpochV144++;
            invalidateCachesV144(action);
            if(!PLANNING_WRITE_V144.has(action)) broadcastWriteV144(action);
          }
        }).catch(()=>{});
      }
      return result;
    }

    const key=requestKeyV144(payload);
    if(readInFlightV144.has(key)) return readInFlightV144.get(key);
    const startedEpoch=dataEpochV144;
    const request=Promise.resolve(apiPostBaseV144(payload)).then(async r=>{
      /* Bila ada aksi tulis selesai saat request baca masih berjalan,
         response pertama berpotensi berasal dari snapshot lama. Ambil
         ulang sekali agar handler selalu menerima data sesudah penulisan. */
      if(action!=='login' && r&&r.success && startedEpoch!==dataEpochV144){
        await new Promise(resolve=>setTimeout(resolve,0));
        return apiPostBaseV144(Object.assign({},payload,{_fresh_v144:Date.now()}));
      }
      return r;
    }).finally(()=>readInFlightV144.delete(key));
    readInFlightV144.set(key,request);
    return request;
  };

  /* Sinkronisasi lintas tab/perangkat browser. Refresh hanya diterapkan
     ketika user tidak mengetik, tidak membuka modal, dan tidak upload. */
  let remoteDirtyV144=false;
  let remoteTimerV144=null;
  function uiBusyV144(){
    if(document.hidden) return true;
    const loading=document.getElementById('loadingOverlay');
    if(loading&&!loading.classList.contains('hidden')) return true;
    if(document.querySelector('.modal-backdrop:not(.hidden),.modal:not(.hidden),#confirmModalV133,.upload-progress-v135')) return true;
    const a=document.activeElement;
    if(a&&a.matches('input,textarea,select,[contenteditable="true"]')) return true;
    const idleFor=Date.now()-(typeof lastActivityV133==='number'?lastActivityV133:0);
    return idleFor<8000;
  }
  function scheduleRemoteRefreshV144(delay=1500){
    clearTimeout(remoteTimerV144);
    remoteTimerV144=setTimeout(applyRemoteRefreshV144,delay);
  }
  async function applyRemoteRefreshV144(){
    if(!remoteDirtyV144||!currentUser) return;
    if(uiBusyV144()){ scheduleRemoteRefreshV144(4000); return; }
    try{
      if(String(activeMenu||'').toUpperCase()==='PERENCANAAN' && window.__SIMPROV_PLANNING_RT_V141__?.sync){
        await window.__SIMPROV_PLANNING_RT_V141__.sync({silent:true});
      }else if(String(activeMenu||'').toUpperCase()==='SURAT'){
        if(typeof suratTabV133!=='undefined' && suratTabV133==='BUAT'){ scheduleRemoteRefreshV144(5000); return; }
        if(typeof suratTabV133!=='undefined' && suratTabV133==='PEMBAYARAN'){
          if(typeof paymentTabV138!=='undefined' && paymentTabV138==='FORM'){ scheduleRemoteRefreshV144(5000); return; }
          if(typeof loadPaymentWorkspaceV138==='function') await loadPaymentWorkspaceV138(true);
        }else if(typeof loadSuratWorkspaceV133==='function'){
          await loadSuratWorkspaceV133(true);
        }
      }else{
        const oldScroll=window.scrollY;
        const r=await apiPost({action:'getDashboard',user:currentUser});
        if(r?.success){
          dashboard=normalizeDashboardData(r);
          writeDashboardCache(dashboard);
          renderAll();
          requestAnimationFrame(()=>window.scrollTo(0,oldScroll));
        }
      }
      remoteDirtyV144=false;
      if(typeof showFastCacheNotice==='function') showFastCacheNotice('Data terbaru dari pengguna lain sudah disinkronkan.');
    }catch(e){
      console.warn('REMOTE_SYNC_V144',e);
      scheduleRemoteRefreshV144(8000);
    }
  }
  window.addEventListener('storage',e=>{
    if(e.key!==SIGNAL_KEY_V144||!e.newValue||!currentUser) return;
    try{ if(typeof cacheKeyDashboard==='function') localStorage.removeItem(cacheKeyDashboard()); }catch(err){}
    remoteDirtyV144=true;
    scheduleRemoteRefreshV144(1200);
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&remoteDirtyV144)scheduleRemoteRefreshV144(500);});
  window.addEventListener('focus',()=>{if(remoteDirtyV144)scheduleRemoteRefreshV144(500);});

  window.__SIMPROV_OPTIMIZATION_V144__={version:PATCH_VERSION_V144,refresh:()=>{remoteDirtyV144=true;scheduleRemoteRefreshV144(0);}};
})();
