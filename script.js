const API_URL = "https://script.google.com/macros/s/AKfycbx33aFCfQSa_gH_5h_-Qlq-OcifA5TWh9OBTEI4am3wr5UC7EyDhsFoaCYLott2iC45/exec";

let siswaData = [];

/* ---------- LOAD DATA ---------- */
async function loadData(){
  try{
    const res = await fetch(API_URL + "?t=" + Date.now());
    siswaData = await res.json();
    input.disabled = false;
    input.placeholder = "Ketik nama siswa...";
    return siswaData;
  }catch(err){
    input.placeholder = "Gagal memuat data (refresh halaman)";
    console.error(err);
    throw err;
  }
}

/* ---------- MENU NAV ---------- */
const menu = document.getElementById("menu");
const searchArea = document.getElementById("searchArea");
const wakelArea = document.getElementById("wakelArea");
const wakelContent = document.getElementById("wakelContent");

document.getElementById("btnCari").onclick = ()=>{
  menu.style.display="none";
  searchArea.style.display="block";
  addFloatingRefreshButton("search");
};

document.getElementById("backBtn").onclick = ()=>{
  searchArea.style.display="none";
  menu.style.display="flex";
  document.getElementById("suggestions").innerHTML="";
  document.getElementById("searchInput").value="";
  removeFloatingButtons();
};

document.getElementById("btnWakel").onclick = async () => {
  showLoading("Memuat data kelas...");
  
  if (siswaData.length === 0) {
    try {
      await loadData();
    } catch (err) {
      hideLoading();
      alert("Gagal memuat data. Silakan coba lagi.");
      return;
    }
  }
  
  await new Promise(r => setTimeout(r, 300));
  hideLoading();
  
  menu.style.display = "none";
  wakelArea.style.display = "block";
  renderWakelView();
};

/* ---------- RUPIAH FORMAT ---------- */
function rupiah(angka){
  angka = Number(angka) || 0;
  return "Rp " + angka.toLocaleString("id-ID");
}

/* ---------- WAKEL VIEW ---------- */
function renderWakelView(){
  removeFloatingButtons();
  
  wakelContent.innerHTML = "";
  wakelContent.dataset.currentKelas = "";

  addFloatingBackButton(() => {
    wakelArea.style.display = "none";
    menu.style.display = "flex";
    wakelContent.innerHTML = "";
    removeFloatingButtons();
  });

  // REMOVED: addFloatingRefreshButton("wakel");

  const allClasses = [...new Set(
    siswaData.map(s => s.kelas).filter(k => k)
  )].sort();

  const groups = {
    'X': [],
    'XI': [],
    'XII': [],
    'Lainnya': []
  };

  allClasses.forEach(kelas => {
    const grade = kelas.trim().split(' ')[0];
    if (groups[grade]) {
      groups[grade].push(kelas);
    } else {
      groups['Lainnya'].push(kelas);
    }
  });

  Object.keys(groups).forEach(grade => {
    const classes = groups[grade];
    if (classes.length === 0) return;

    const gradeHeader = document.createElement("div");
    gradeHeader.style.cssText = `
      font-weight: 700;
      font-size: 18px;
      margin: 20px 0 10px 0;
      padding: 10px 16px;
      background: #2d6cdf;
      color: white;
      border-radius: 8px;
      text-align: left;
    `;
    gradeHeader.textContent = `Kelas ${grade}`;
    wakelContent.appendChild(gradeHeader);

    const classContainer = document.createElement("div");
    classContainer.style.cssText = "display: flex; flex-wrap: wrap; gap: 16px;";

    classes.forEach(kelas => {
      const allStudents = siswaData.filter(s => s.kelas === kelas);
      
      const studentsBermasalah = [];
      const studentsAman = [];
      
      allStudents.forEach(s => {
        const sisa = Math.abs(parseFloat(s.sisaDenda) || 0);
        
        let syarat = s.syaratKhusus;
        if (typeof syarat === 'boolean') {
          syarat = syarat;
        } else if (typeof syarat === 'string') {
          syarat = syarat.toLowerCase().trim() === 'true' || syarat.toLowerCase().trim() === 'yes' || syarat === '1';
        } else {
          syarat = false;
        }
        
        const isAman = (sisa === 0 && syarat === true);
        
        if (isAman) {
          studentsAman.push(s);
        } else {
          studentsBermasalah.push(s);
        }
      });

      if(studentsBermasalah.length === 0 && studentsAman.length === 0) return;

      const totalDenda = studentsBermasalah.reduce((sum, s) => {
        return sum + (Math.abs(parseFloat(s.sisaDenda) || 0));
      }, 0);

      const btn = document.createElement("button");
      btn.className = "iconBtn";
      btn.style.cssText = `
        width: calc(50% - 8px);
        height: 100px;
        background: ${studentsBermasalah.length > 0 ? "#CC8B08" : "#1e8e3e"};
        flex-direction: column;
        font-size: 14px;
      `;

      btn.innerHTML = `
        <div style="font-weight:700; color:white; font-size:16px;">${kelas}</div>
        <div style="color:white; margin-top:6px; font-size:12px;">
          ${studentsBermasalah.length > 0 ? `Bermasalah: ${studentsBermasalah.length}` : 'Semua Aman ✅'}
        </div>
        ${studentsBermasalah.length > 0 ? `<div style="color:white; margin-top:4px; font-size:11px;">Total: ${rupiah(totalDenda)}</div>` : ''}
      `;

      btn.onclick = () => {
        removeFloatingButtons();
        showClassStudents(kelas, studentsBermasalah, studentsAman);
      };

      classContainer.appendChild(btn);
    });

    wakelContent.appendChild(classContainer);
  });

  const spacer = document.createElement("div");
  spacer.style.height = "80px";
  wakelContent.appendChild(spacer);
}

/* ---------- SHOW CLASS STUDENTS ---------- */
function showClassStudents(kelas, studentsBermasalah, studentsAman){
  wakelContent.innerHTML = "";
  wakelContent.dataset.currentKelas = kelas;
  wakelContent.dataset.currentStudents = JSON.stringify(studentsBermasalah);

  // Main container
  const mainContainer = document.createElement("div");
  mainContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  `;

  // Header row with title and toggle button
  const headerRow = document.createElement("div");
  headerRow.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin: 0 0 10px 0;
    gap: 10px;
  `;

  // Title header (left side)
  const header = document.createElement("div");
  header.id = "mainHeader";
  header.style.cssText = `
    background: #CC8B08;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    text-align: left;
    flex: 1;
    box-sizing: border-box;
  `;
  header.textContent = `${kelas} - ${studentsBermasalah.length} Siswa Bermasalah`;
  headerRow.appendChild(header);

  // Toggle button (right side)
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "btnToggleAman";
  toggleBtn.style.cssText = `
    background: #1e8e3e;
    color: white;
    border: none;
    padding: 12px 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    transition: all 0.2s;
  `;
  toggleBtn.textContent = `📋 Aman (${studentsAman.length})`;
  
  toggleBtn.onmouseover = () => {
    toggleBtn.style.transform = "translateY(-2px)";
    toggleBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
  };
  toggleBtn.onmouseout = () => {
    toggleBtn.style.transform = "translateY(0)";
    toggleBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  };
  
  headerRow.appendChild(toggleBtn);
  mainContainer.appendChild(headerRow);

  // List container for bermasalah students
  const listContainer = document.createElement("div");
  listContainer.className = "list-container";
  listContainer.id = "listBermasalah";
  listContainer.style.width = "100%";

  studentsBermasalah.forEach((s) => {
    const sisa = Math.abs(parseFloat(s.sisaDenda) || 0);
    
    let syarat = s.syaratKhusus;
    if (typeof syarat === 'boolean') {
      syarat = syarat;
    } else if (typeof syarat === 'string') {
      syarat = syarat.toLowerCase().trim() === 'true' || syarat.toLowerCase().trim() === 'yes' || syarat === '1';
    } else {
      syarat = false;
    }
    
    const isAman = (sisa === 0 && syarat === true);
    
    const div = document.createElement("div");
    div.className = isAman ? "list-item safe" : "list-item";

    let rowsHtml = `
      <div class="list-item-row">
        <span class="list-item-label">Kelas:</span>
        <span class="list-item-value">${s.kelas}</span>
      </div>
      <div class="list-item-row">
        <span class="list-item-label">Ekstra:</span>
        <span class="list-item-value">${s.ekstra}</span>
      </div>
    `;

    if (!isAman) {
      rowsHtml += `
        <div class="list-item-row">
          <span class="list-item-label">Sisa Denda:</span>
          <span class="list-item-value list-item-denda">-${rupiah(sisa)}</span>
        </div>
        <div class="list-item-row">
          <span class="list-item-label">Status:</span>
          <span class="list-item-value" style="color: #d93025; font-weight: 600;">
            ${!syarat ? 'Ada Tanggungan' : 'Tidak ada tanggungan'}
          </span>
        </div>
      `;
    } else {
      rowsHtml += `
        <div class="list-item-row">
          <span class="list-item-label">Status:</span>
          <span class="list-item-value list-item-aman">Tidak ada tanggungan</span>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="list-item-header">
        <span class="list-item-name">${s.nama}</span>
        <span class="badge ${isAman ? 'green':'red'}">${isAman ? 'AMAN' : 'TANGGUNGAN'}</span>
      </div>
      ${rowsHtml}
    `;

    div.onclick = () => showAttendance(s);
    listContainer.appendChild(div);
  });

  mainContainer.appendChild(listContainer);

  // Aman list container (hidden by default) - NO SEPARATE HEADER
  const amanListContainer = document.createElement("div");
  amanListContainer.id = "listAman";
  amanListContainer.style.display = "none";
  amanListContainer.style.width = "100%";

  studentsAman.forEach((s) => {
    const div = document.createElement("div");
    div.className = "list-item safe";

    div.innerHTML = `
      <div class="list-item-header">
        <span class="list-item-name">${s.nama}</span>
        <span class="badge green">AMAN</span>
      </div>
      <div class="list-item-row">
        <span class="list-item-label">Kelas:</span>
        <span class="list-item-value">${s.kelas}</span>
      </div>
      <div class="list-item-row">
        <span class="list-item-label">Ekstra:</span>
        <span class="list-item-value">${s.ekstra}</span>
      </div>
      <div class="list-item-row">
        <span class="list-item-label">Status:</span>
        <span class="list-item-value list-item-aman">Tidak ada tanggungan</span>
      </div>
    `;

    div.onclick = () => showAttendance(s);
    amanListContainer.appendChild(div);
  });

  mainContainer.appendChild(amanListContainer);

  // Toggle button click handler
  toggleBtn.onclick = () => {
    const amanList = document.getElementById("listAman");
    const bermasalahList = document.getElementById("listBermasalah");
    const mainHeader = document.getElementById("mainHeader");
    
    if (amanList.style.display === "none") {
      // Show AMAN list, hide bermasalah list
      amanList.style.display = "block";
      bermasalahList.style.display = "none";
      
      // Update button text and style (same position)
      toggleBtn.textContent = `📋 Bermasalah (${studentsBermasalah.length})`;
      toggleBtn.style.background = "#CC8B08";
      
      // Update header
      mainHeader.style.background = "#1e8e3e";
      mainHeader.textContent = `${kelas} - ${studentsAman.length} Siswa Aman`;
    } else {
      // Show bermasalah list, hide AMAN list
      amanList.style.display = "none";
      bermasalahList.style.display = "block";
      
      // Update button text and style (same position)
      toggleBtn.textContent = `📋 Aman (${studentsAman.length})`;
      toggleBtn.style.background = "#1e8e3e";
      
      // Update header
      mainHeader.style.background = "#CC8B08";
      mainHeader.textContent = `${kelas} - ${studentsBermasalah.length} Siswa Bermasalah`;
    }
  };

  // Spacer for floating buttons
  const spacer = document.createElement("div");
  spacer.style.height = "100px";
  mainContainer.appendChild(spacer);

  wakelContent.appendChild(mainContainer);

  addFloatingButtonsForDetail(kelas, studentsBermasalah, studentsAman);
}

/* ---------- SEARCH ---------- */
const input = document.getElementById("searchInput");
input.disabled = true;
input.placeholder = "Memuat data siswa...";
const suggestions = document.getElementById("suggestions");

input.addEventListener("input", ()=>{
  const keyword = input.value.toLowerCase();
  suggestions.innerHTML="";

  if(keyword.length < 2) return;

  const results = siswaData.filter(s =>
    s.nama.toLowerCase().includes(keyword)
  ).slice(0,15);

  results.forEach(s=>{
    const div = document.createElement("div");
    div.className="suggestion";

    const sisa = Math.abs(parseFloat(s.sisaDenda) || 0);
    
    let syarat = s.syaratKhusus;
    if (typeof syarat === 'boolean') {
      syarat = syarat;
    } else if (typeof syarat === 'string') {
      syarat = syarat.toLowerCase().trim() === 'true' || syarat.toLowerCase().trim() === 'yes' || syarat === '1';
    } else {
      syarat = false;
    }

    const aman = (sisa === 0 && syarat === true);
    const statusText = aman ? "AMAN" : "TANGGUNGAN";
    const tanggunganText = syarat === true ? "Tidak ada tanggungan" : "Ada tanggungan";

    div.innerHTML = `
      <div class="info">
        <div class="name-row">
          <span class="name">${s.nama}</span>
          <span class="badge ${aman ? 'green':'red'}">${statusText}</span>
        </div>
        <div class="meta">${s.kelas}</div>
        <div class="meta">${s.ekstra}</div>
        ${!aman ? `
          <div class="sisa">Sisa Denda : -${rupiah(sisa)}</div>
          <div style="font-size:12px; margin-top:4px; color:#666;">
            ${tanggunganText}
          </div>
        ` : ``}
      </div>
    `;

    div.onclick = ()=>showAttendance(s);
    suggestions.appendChild(div);
  });
});

/* ---------- POPUP ---------- */
const overlay = document.getElementById("overlay");
const detailBox = document.getElementById("detailBox");

overlay.addEventListener("click",(e)=>{
  if(e.target === overlay){
    overlay.classList.add("hidden");
  }
});

function showAttendance(s){
  let html = `
    <h3 style="margin-top:0">${s.nama}</h3>
    <div style="margin-bottom:10px; font-size:14px; color:#666;">
      ${s.kelas} • ${s.ekstra}
    </div>
    <hr>
  `;

  if(!s.absensi || s.absensi.length === 0){
    html += `<p>Tidak ada data absensi</p>`;
  }else{
    s.absensi.forEach(a=>{
      html += `
        <div class="absenRow">
          <div class="absenTanggal">${a.tanggal}</div>
          <div class="absenStatus">${a.status || '-'}</div>
        </div>
      `;
    });
  }
  
  const sisa = Math.abs(parseFloat(s.sisaDenda) || 0);
  
  let syarat = s.syaratKhusus;
  if (typeof syarat === 'boolean') {
    syarat = syarat;
  } else if (typeof syarat === 'string') {
    syarat = syarat.toLowerCase().trim() === 'true' || syarat.toLowerCase().trim() === 'yes' || syarat === '1';
  } else {
    syarat = false;
  }
  
  html += `
    <hr style="margin:15px 0;">
    <div style="display:flex; gap:12px; justify-content:space-between;">
      <div style="flex:1; background:#fff3f3; padding:12px; border-radius:10px;">
        <div style="font-size:12px; color:#888;">SISA DENDA</div>
        <div style="font-size:18px; font-weight:bold;">
          -${rupiah(sisa)}
        </div>
      </div>
      <div style="flex:1; background:#f4f4f4; padding:12px; border-radius:10px;">
        <div style="font-size:12px; color:#888;">SYARAT KHUSUS</div>
        <div style="font-weight:bold;">
          ${syarat ? "AMAN" : "TANGGUNGAN"}
        </div>
      </div>
    </div>
  `;
  
  detailBox.innerHTML = html;
  overlay.classList.remove("hidden");
}

/* ---------- FLOATING BUTTONS ---------- */
function removeFloatingButtons() {
  document.querySelectorAll('.floating-btn').forEach(btn => btn.remove());
}

function addFloatingBackButton(onClick) {
  const backBtn = document.createElement('button');
  backBtn.className = 'floating-btn back-float';
  backBtn.title = 'Kembali';
  backBtn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
    </svg>
  `;
  backBtn.onclick = onClick;
  
  document.body.appendChild(backBtn);
}

function addFloatingRefreshButton(context) {
  if (document.querySelector('.refresh-float')) return;
  
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'floating-btn refresh-float';
  refreshBtn.id = 'refreshBtn';
  refreshBtn.title = 'Refresh Data';
  refreshBtn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
  `;
  
  refreshBtn.onclick = async () => {
    refreshBtn.classList.add('spinning');
    refreshBtn.disabled = true;
    
    try {
      await loadData();
      
      if (context === "wakel") {
        const currentKelas = wakelContent.dataset.currentKelas;
        if (currentKelas) {
          const allStudents = siswaData.filter(s => s.kelas === currentKelas);
          const studentsBermasalah = [];
          const studentsAman = [];
          
          allStudents.forEach(s => {
            const sisa = Math.abs(parseFloat(s.sisaDenda) || 0);
            
            let syarat = s.syaratKhusus;
            if (typeof syarat === 'boolean') {
              syarat = syarat;
            } else if (typeof syarat === 'string') {
              syarat = syarat.toLowerCase().trim() === 'true' || syarat.toLowerCase().trim() === 'yes' || syarat === '1';
            } else {
              syarat = false;
            }
            
            const isAman = (sisa === 0 && syarat === true);
            
            if (isAman) {
              studentsAman.push(s);
            } else {
              studentsBermasalah.push(s);
            }
          });
          
          showClassStudents(currentKelas, studentsBermasalah, studentsAman);
        } else {
          renderWakelView();
        }
      } else if (context === "search") {
        const keyword = input.value;
        if (keyword.length >= 2) {
          input.dispatchEvent(new Event('input'));
        }
      }
      
      showToast("Data berhasil diperbarui!");
    } catch (err) {
      showToast("Gagal memperbarui data", "error");
      console.error(err);
    } finally {
      refreshBtn.classList.remove('spinning');
      refreshBtn.disabled = false;
    }
  };
  
  document.body.appendChild(refreshBtn);
}

function addFloatingButtonsForDetail(kelas, studentsBermasalah, studentsAman) {
  addFloatingBackButton(() => {
    removeFloatingButtons();
    renderWakelView();
  });

  addFloatingRefreshButton("wakel");

  const waBtn = document.createElement('button');
  waBtn.className = 'floating-btn whatsapp-float';
  waBtn.title = 'Kirim ke WhatsApp';
  waBtn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  `;
  waBtn.onclick = () => generateWhatsAppMessage(kelas, studentsBermasalah);

  document.body.appendChild(waBtn);
}

/* ---------- WHATSAPP MESSAGE ---------- */
function generateWhatsAppMessage(kelas, students) {
  const bermasalah = students.filter(s => {
    const sisa = Math.abs(parseFloat(s.sisaDenda) || 0);
    
    let syarat = s.syaratKhusus;
    if (typeof syarat === 'boolean') {
      syarat = syarat;
    } else if (typeof syarat === 'string') {
      syarat = syarat.toLowerCase().trim() === 'true' || syarat.toLowerCase().trim() === 'yes' || syarat === '1';
    } else {
      syarat = false;
    }
    
    const isAman = (sisa === 0 && syarat === true);
    return !isAman;
  });

  if (bermasalah.length === 0) {
    alert('Tidak ada siswa bermasalah di kelas ini!');
    return;
  }

  let message = `*${kelas}*\n`;
  message += `Total: ${bermasalah.length} siswa bermasalah\n\n`;

  bermasalah.forEach((s, index) => {
    const sisa = Math.abs(parseFloat(s.sisaDenda) || 0);
    
    let syarat = s.syaratKhusus;
    if (typeof syarat === 'boolean') {
      syarat = syarat;
    } else if (typeof syarat === 'string') {
      syarat = syarat.toLowerCase().trim() === 'true' || syarat.toLowerCase().trim() === 'yes' || syarat === '1';
    } else {
      syarat = false;
    }
    
    const hasSisa = sisa > 0;
    const hasSyarat = syarat === true;
    
    let line = `${index + 1}. ${s.nama}`;
    
    if (hasSisa && hasSyarat) {
      line += ` - -${rupiah(sisa)}`;
    } 
    else if (hasSisa && !hasSyarat) {
      line += ` - -${rupiah(sisa)} - syarat khusus`;
    } 
    else if (!hasSisa && !hasSyarat) {
      line += ` - syarat khusus`;
    }
    
    message += line + '\n';
  });

  const encodedMessage = encodeURIComponent(message);
  const waUrl = `https://wa.me/?text=${encodedMessage}`;
  
  window.open(waUrl, '_blank');
}

/* ---------- LOADING & TOAST ---------- */
function showLoading(text = "Memuat...") {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loadingDialog';
  
  overlay.innerHTML = `
    <div class="loading-box">
      <div class="spinner"></div>
      <div class="loading-text">${text}</div>
      <div class="loading-sub">Mohon tunggu sebentar</div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

function hideLoading() {
  const loader = document.getElementById('loadingDialog');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 300);
  }
}

function showToast(message, type = "success") {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ---------- INITIALIZATION ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
loadData();
