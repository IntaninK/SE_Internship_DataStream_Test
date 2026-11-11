(function () {
  const PAGE_SIZE = 8;

  const typeEl = document.getElementById("reportType");
  const startEl = document.getElementById("startDate");
  const endEl = document.getElementById("endDate");
  const formatEl = document.getElementById("formatType");
  const btn = document.getElementById("downloadBtn");
  const msg = document.getElementById("reportMsg");
  const previewWrap = document.getElementById("previewWrap");
  const previewTable = document.getElementById("previewTable");
  const pager = document.getElementById("pager");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  

  let headers = [];
  let allRows = [];
  let currentPage = 1;
  let sortCol = null;   // which column is sorted (index 0, 1, 2...), null = not sorted
  let sortDir = "asc";  // "asc" or "desc"

  // local date as YYYY-MM-DD (toISOString uses UTC and can be a day off in Thailand)
  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const esc = (v) =>
    String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // default range: last 30 days, ending yesterday (today's data is still incomplete)
  endEl.value = ymd(new Date(Date.now() - 86400000));
  startEl.value = ymd(new Date(Date.now() - 30 * 86400000));

  function validRange() {
    return startEl.value && endEl.value && startEl.value <= endEl.value;
  }

  async function downloadReport() {
    const type = typeEl.value;
    const start = startEl.value;
    const end = endEl.value;
    const format = formatEl.value; // read at click time

    if (!validRange()) {
      msg.textContent = "กรุณาเลือกช่วงวันที่ให้ถูกต้อง";
      return;
    }

    msg.textContent = "กำลังสร้างรายงาน...";
    btn.disabled = true;

    try {
      const res = await fetch(
        `/api/admin/analytics/export.csv?type=${encodeURIComponent(type)}&start=${start}&end=${end}&format=${format}`
      );
      if (!res.ok) throw new Error(res.status);

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ga-${type}-${start}_${end}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);

      msg.textContent = "ดาวน์โหลดเรียบร้อย";
    } catch (e) {
      msg.textContent = "สร้างรายงานไม่สำเร็จ (" + e.message + ")";
    } finally {
      btn.disabled = false;
    }
  }

  function getSortedRows() {
    if (sortCol === null) return allRows;       // no sorting chosen: original order
    const dir = sortDir === "asc" ? 1 : -1;     // flips the result for descending
    return [...allRows].sort((a, b) => {
      const x = a[sortCol];
      const y = b[sortCol];
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return String(x).localeCompare(String(y), "th") * dir;
    });
  }
  // draw only the current page of rows
    function renderPage() {
    const rows = getSortedRows();                               // changed: sorted rows
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const slice = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const arrow = (i) =>
      sortCol === i ? (sortDir === "asc" ? " ▲" : " ▼") : ' <span class="sort-hint">⇅</span>';

    previewTable.innerHTML =
      "<thead><tr>" +
      headers
        .map(
          (h, i) =>
          `<th class="sortable${sortCol === i ? " active" : ""}" data-col="${i}" title="คลิกเพื่อเรียงลำดับ">${esc(h)}${arrow(i)}</th>`
        )
        .join("") +
      "</tr></thead><tbody>" +
      slice
        .map(
          (r) =>
            "<tr>" +
            r.map((v) => `<td style="padding:8px 12px; border-top:1px solid #E5E7EB;">${esc(v)}</td>`).join("") +
            "</tr>"
        )
        .join("") +
      "</tbody>";

    pager.style.display = totalPages > 1 ? "flex" : "none";
    pageInfo.textContent = `หน้า ${currentPage} / ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }

  async function loadPreview() {
    if (!validRange()) {
      msg.textContent = "กรุณาเลือกช่วงวันที่ให้ถูกต้อง";
      return;
    }
    msg.textContent = "กำลังโหลดตัวอย่าง...";
    try {
      const res = await fetch(
        `/api/admin/analytics/export.csv?type=${encodeURIComponent(typeEl.value)}&start=${startEl.value}&end=${endEl.value}&format=json`
      );
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();

      headers = data.headers;
      allRows = data.rows;
      currentPage = 1;

      if (allRows.length === 0) {
        previewWrap.style.display = "none";
        pager.style.display = "none";
        msg.textContent = "ไม่พบข้อมูลในช่วงที่เลือก";
        return;
      }

      previewWrap.style.display = "block";
      msg.textContent = `พบ ${allRows.length} แถว`;
      renderPage();
    } catch (e) {
      msg.textContent = "โหลดตัวอย่างไม่สำเร็จ (" + e.message + ")";
    }
  }

  // quick ranges: 1 = yesterday only, 7 / 30 = last N days ending yesterday
  document.querySelectorAll("[data-range]").forEach((b) => {
    b.addEventListener("click", () => {
      const n = Number(b.dataset.range);
      startEl.value = ymd(new Date(Date.now() - n * 86400000));
      endEl.value = ymd(new Date(Date.now() - 86400000));
      loadPreview();
    });
  });

  prevBtn.addEventListener("click", () => { currentPage--; renderPage(); });
  nextBtn.addEventListener("click", () => { currentPage++; renderPage(); });

  [typeEl, startEl, endEl].forEach((el) => el.addEventListener("change", loadPreview));
  btn.addEventListener("click", downloadReport);
  
  previewTable.addEventListener("click", (e) => {
    const th = e.target.closest("th[data-col]");   // did the click land on (or inside) a header cell?
    if (!th) return;                               // no: ignore it

    const col = Number(th.dataset.col);
    if (sortCol === col) {
      sortDir = sortDir === "asc" ? "desc" : "asc"; // same column again: flip the direction
    } else {
      sortCol = col;                                // new column: start ascending
      sortDir = "asc";
    }
    currentPage = 1;                                // go back to page 1 after sorting
    renderPage();
  });

  loadPreview();
})();