import React, { useState, useMemo } from "react";
import PDFViewerModal from "../common/PDFViewerModal";
import "../../assets/css/dataTable.css";

const ITEMS_PER_PAGE = 10;

const FinanceDataTable = ({
  data = [],
  loading = false,
  activeTab = "for-payment",
  onAction,
  onRefresh,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDocument, setSelectedDocument] = useState(null);

  /* ===============================
     Column Configuration
  =============================== */

  const columns = useMemo(() => {
    const baseColumns = [
      { key: "lockerID", label: "Locker ID", sortable: true },
      { key: "referralSlipNo", label: "Referral No.", sortable: true },
      { key: "studentName", label: "Student Name", sortable: true },
      { key: "agreement", label: "Agreement", sortable: true },
      {
        key: "agreementDuration",
        label: "Agreement Duration",
        sortable: true,
      },
      { key: "receipt", label: "Receipt", sortable: false },
      {
        key: "paymentAdviceSlip",
        label: "Payment Advice Slip",
        sortable: false,
      },
      { key: "endorsedBy", label: "Endorsed By", sortable: false },
    ];

    return baseColumns;
  }, [activeTab]);

  /* ===============================
     Sorting
  =============================== */

  const handleSort = (key) => {
    if (!columns.find((col) => col.key === key)?.sortable) return;

    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      let aValue = getCellValue(a, sortConfig.key);
      let bValue = getCellValue(b, sortConfig.key);

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortConfig]);

  /* ===============================
     Pagination
  =============================== */

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const changePage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  /* ===============================
     Helpers
  =============================== */

  function getAgreementDuration(start, end) {
    if (!start || !end) return "-";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days`;
  }

  function getCellValue(row, key) {
    switch (key) {
      case "studentName":
        return `${row.studentFirstName || ""} ${
          row.studentLastName || ""
        }`.toLowerCase();

      case "agreementDuration":
        return getAgreementDuration(
          row.agreementDateStart,
          row.agreementDateEnd,
        );

      default:
        return row[key] || "";
    }
  }

  const renderCell = (row, columnKey) => {
    switch (columnKey) {
      case "studentName":
        return `${row.studentFirstName} ${row.studentLastName}`;

      case "agreement":
        return row.agreementType || "Standard";

      case "agreementDuration":
        return getAgreementDuration(
          row.agreementDateStart,
          row.agreementDateEnd,
        );

      case "receipt":
        return row.receiptUrl ? (
          <button
            className="btn-view-doc"
            onClick={() => setSelectedDocument(row.receiptUrl)}
          >
            View
          </button>
        ) : (
          "-"
        );

      case "paymentAdviceSlip":
        return row.paymentAdviceSlipUrl ? (
          <button
            className="btn-view-doc"
            onClick={() =>
              setSelectedDocument(row.paymentAdviceSlipUrl)
            }
          >
            View
          </button>
        ) : (
          "-"
        );

      case "endorsedBy":
        return row.endorsedByName || "-";

      default:
        return row[columnKey] || "-";
    }
  };

  /* ===============================
     Loading State
  =============================== */

  if (loading) {
    return (
      <div className="table-loading">
        <div className="loading-spinner"></div>
        <p>Loading finance data...</p>
      </div>
    );
  }

  /* ===============================
     Empty State
  =============================== */

  if (!loading && data.length === 0) {
    return (
      <div className="table-empty">
        <div className="empty-icon"></div>
        <h3>No Records Found</h3>
        <p>No finance records available for this tab.</p>
      </div>
    );
  }

  /* ===============================
     Render
  =============================== */

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h3>
          {activeTab === "for-payment"
            ? "For Payment Records"
            : "Payment History"}
        </h3>
        <button className="btn-refresh" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable ? "sortable" : ""}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sortConfig.key === col.key && (
                    <span className="sort-indicator">
                      {sortConfig.direction === "asc" ? " ▲" : " ▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {renderCell(row, col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Prev
          </button>

          <div className="pagination-numbers">
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  className={`pagination-number ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => changePage(page)}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            className="pagination-btn"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* PDF Modal */}
      {selectedDocument && (
        <PDFViewerModal
          fileUrl={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
};

export default FinanceDataTable;
