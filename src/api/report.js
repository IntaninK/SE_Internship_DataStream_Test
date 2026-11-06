(function () {
  const typeEl = document.getElementById("reportType");
  const startEl = document.getElementById("startDate");
  const endEl = document.getElementById("endDate");
  const btn = document.getElementById("downloadBtn");
  const msg = document.getElementById("reportMsg");

  const fmt = (d) => d.toISOString().slice(0, 10);

  // default range: last 30 days
  endEl.value = fmt(new Date());
  startEl.value = fmt(new Date(Date.now() - 30 * 86400000));

  async function downloadReport() {
    const type = typeEl.value;
    const start = startEl.value;
    const end = endEl.value;

    if (!start || !end || start > end) {
      msg.textContent = "กรุณาเลือกช่วงวันที่ให้ถูกต้อง";
      return;
    }

    msg.textContent = "กำลังสร้างรายงาน...";
    btn.disabled = true;

    try {
      const res = await fetch(
        `/api/admin/analytics/export.csv?type=${encodeURIComponent(type)}&start=${start}&end=${end}`
      );
      if (!res.ok) throw new Error(res.status);

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ga-${type}-${start}_${end}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);

      msg.textContent = "ดาวน์โหลดเรียบร้อย";
    } catch (e) {
      msg.textContent = "สร้างรายงานไม่สำเร็จ (" + e.message + ")";
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener("click", downloadReport);
})();