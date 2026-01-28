export const ExportUtils = {
  filterByDate: (data, dateKey, startDate, endDate) => {
    if (!startDate && !endDate) return data;

    const start = startDate
      ? new Date(startDate).setHours(0, 0, 0, 0)
      : -Infinity;
    const end = endDate
      ? new Date(endDate).setHours(23, 59, 59, 999)
      : Infinity;

    return data.filter((item) => {
      // Handle different date key formats (b.bookingTime or b.reservationTime)
      const dateStr = item[dateKey] || item.bookingTime;
      if (!dateStr) return false;
      const itemTime = new Date(dateStr).getTime();
      return itemTime >= start && itemTime <= end;
    });
  },

  downloadCSV: (data, headers, keys, filename) => {
    if (!data || !data.length) {
      alert("No data to export");
      return;
    }

    const csvContent = [
      headers.join(","), // Header Row
      ...data.map((row) =>
        keys
          .map((key) => {
            let val =
              row[key] === null || row[key] === undefined ? "" : row[key];
            // Escape quotes and wrap in quotes if it contains commas
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
