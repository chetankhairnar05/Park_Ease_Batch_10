/**
 * export-utils.js
 * Centralized logic for CSV generation and Date Filtering
 */

const ExportUtils = {
  /**
   * Filters a list of objects based on a date range.
   * @param {Array} data - The list of objects (e.g., bookings).
   * @param {String} dateKey - The key in the object containing the date string (e.g., 'bookingTime').
   * @param {String} startDate - YYYY-MM-DD from input.
   * @param {String} endDate - YYYY-MM-DD from input.
   */
  filterByDate: (data, dateKey, startDate, endDate) => {
    if (!startDate && !endDate) return data; // No filter

    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    return data.filter((item) => {
      // Handle multiple potential time keys if necessary, or just the specific one passed
      const itemDateStr = item[dateKey] || item.reservationTime || item.time;
      if (!itemDateStr) return false;

      const itemTime = new Date(itemDateStr).getTime();

      if (start && itemTime < start) return false;
      if (end && itemTime > end) return false;
      return true;
    });
  },

  /**
   * Converts JSON data to CSV and triggers download.
   * @param {Array} data - Filtered data list.
   * @param {Array} headers - Array of column headers: ["ID", "Date", "Amount"]
   * @param {Array} keys - Array of keys corresponding to headers: ["id", "date", "amount"]
   * @param {String} filename - Name of the file (e.g., 'history.csv')
   */
  downloadCSV: (data, headers, keys, filename) => {
    if (!data || !data.length) {
      alert("No data to export.");
      return;
    }

    const csvRows = [];

    // 1. Add Headers
    csvRows.push(headers.join(","));

    // 2. Add Data
    data.forEach((row) => {
      const values = keys.map((key) => {
        let val = row[key];

        // Format logic
        if (val === null || val === undefined) val = "";

        // Check if it looks like a date string? (Optional, usually we format before passing here)

        // Escape quotes and commas
        const stringVal = String(val);
        if (
          stringVal.includes(",") ||
          stringVal.includes('"') ||
          stringVal.includes("\n")
        ) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      });
      csvRows.push(values.join(","));
    });

    // 3. Create Blob and Link
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};
