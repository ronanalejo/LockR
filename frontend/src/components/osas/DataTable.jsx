import React, { useState, useMemo } from "react";
import CountdownTimer from "./CountdownTimer";
import PDFViewerModal from "./PDFViewerModal";
import "../../assets/css/dataTable.css";
import { API_BASE_URL } from "../../config/api";

const DataTable = ({ data, loading, activeTab, onAction, onRefresh }) => {
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const itemsPerPage = 10;

  const columns = useMemo(() => {
    const commonColumns = [
      { key: "referralSlipNo", label: "Referral No.", sortable: true },
      { key: "lockerID", label: "Locker ID", sortable: true },
      { key: "floorNumber", label: "Floor No.", sortable: true },
      { key: "studentName", label: "Student Name", sortable: true },
      { key: "agreement", label: "Agreement", sortable: true },
    ];

    switch (activeTab) {
      case "endorsement":
        return [
          ...commonColumns,
          {
            key: "reservationTimer",
            label: "Reservation Timer",
            sortable: false,
          },
          {
            key: "applicationForm",
            label: "Application Form",
            sortable: false,
          },
          { key: "actions", label: "Validate?", sortable: false },
        ];
      case "approval":
        return [
          ...commonColumns,
          {
            key: "reservationTimer",
            label: "Reservation Timer",
            sortable: false,
          },
          { key: "endorsedBy", label: "Endorsed By", sortable: false },
          {
            key: "applicationForm",
            label: "Application Form",
            sortable: false,
          },
          {
            key: "paymentAdviceSlip",
            label: "Payment Advice Slip",
            sortable: false,
          },
          { key: "proofOfPayment", label: "Proof of Payment", sortable: false },
          { key: "actions", label: "Approve?", sortable: false },
        ];
      case "occupied":
        return [
          ...commonColumns,
          {
            key: "agreementPeriod",
            label: "Agreement Period",
            sortable: false,
          },
          { key: "endorsedBy", label: "Endorsed By", sortable: false },
          {
            key: "applicationForm",
            label: "Application Form",
            sortable: false,
          },
          {
            key: "paymentAdviceSlip",
            label: "Payment Advice Slip",
            sortable: false,
          },
          { key: "proofOfPayment", label: "Proof of Payment", sortable: false },
          { key: "duplicate", label: "Duplicate?", sortable: false },
        ];
      case "history":
        return [
          ...commonColumns,
          {
            key: "agreementPeriod",
            label: "Agreement Period",
            sortable: false,
          },
          { key: "endorsedBy", label: "Endorsed By", sortable: false },
          {
            key: "applicationForm",
            label: "Application Form",
            sortable: false,
          },
          {
            key: "paymentAdviceSlip",
            label: "Payment Advice Slip",
            sortable: false,
          },
          { key: "duplicate", label: "Duplicate?", sortable: false },
        ];
      default:
        return commonColumns;
    }
  }, [activeTab]);

  const sortedData = useMemo(() => {
    let sortableData = [...data];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "studentName") {
          aValue = `${a.studentFirstName} ${a.studentLastName}`;
          bValue = `${b.studentFirstName} ${b.studentLastName}`;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatAgreement = (agreement) => {
    const agreementMap = {
      1: "1 Semester/Term",
      2: "2 Semesters/Terms",
      3: "1 School Year",
    };
    return agreementMap[agreement] || agreement;
  };

  const formatPeriod = (startDate, endDate) => {
    if (!startDate || !endDate) return "N/A";
    const opts = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    const start = new Date(startDate).toLocaleString("en-US", opts);
    const end = new Date(endDate).toLocaleString("en-US", opts);
    return `${start} - ${end}`;
  };

  const renderCellContent = (reservation, column) => {
    switch (column.key) {
      case "studentName":
        return `${reservation.studentFirstName} ${reservation.studentLastName}`;
      case "agreement":
        return formatAgreement(reservation.agreement);
      case "reservationTimer":
        return (
          <CountdownTimer
            startTime={reservation.reservationTimeStart}
            endTime={reservation.reservationTimeEnd}
          />
        );
      case "endorsedBy":
        if (reservation.endorsedByFirstName && reservation.endorsedByLastName) {
          return `${reservation.endorsedByFirstName} ${reservation.endorsedByLastName}`;
        }
        return reservation.employeeID || "N/A";
      case "applicationForm":
        console.log("Application Form Path:", {
          referralSlipNo: reservation.referralSlipNo,
          path: reservation.lockerApplicationFormAgreement,
        });

        return reservation.lockerApplicationFormAgreement ? (
          <button
            className="btn-view-doc"
            onClick={() => {
              setSelectedReservation(reservation);
              setShowPDFModal(true);
            }}
          >
            View
          </button>
        ) : (
          "N/A"
        );
      case "proofOfPayment":
        if (reservation.proofOfPayment || reservation.dropboxReceipt) {
          const proofPath =
            reservation.proofOfPayment || reservation.dropboxReceipt;
          const uploadsBaseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
          return (
            <button
              className="btn-view-doc"
              onClick={() =>
                window.open(`${uploadsBaseUrl}/uploads/${proofPath}`, "_blank")
              }
            >
              View
            </button>
          );
        }
        return "N/A";
      case "paymentAdviceSlip":
        if (
          reservation.pdfPaymentAdviceSlip ||
          reservation.pdfPaymentAdviceSlipOSAS
        ) {
          const slipPath =
            reservation.pdfPaymentAdviceSlipOSAS ||
            reservation.pdfPaymentAdviceSlip;
          const uploadsBaseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
          return (
            <button
              className="btn-view-doc"
              onClick={() =>
                window.open(`${uploadsBaseUrl}/uploads/${slipPath}`, "_blank")
              }
            >
              View
            </button>
          );
        }
        return "N/A";
      case "agreementPeriod":
        return formatPeriod(
          reservation.agreementDateStart,
          reservation.agreementDateEnd,
        );
      case "duplicate":
        return (
          <span
            className={`duplicate-badge ${reservation.duplicate ? "yes" : "no"}`}
          >
            {reservation.duplicate ? "Yes" : "No"}
          </span>
        );
      case "actions":
        return renderActions(reservation);
      default:
        return reservation[column.key] || "N/A";
    }
  };

  const renderActions = (reservation) => {
    if (activeTab === "endorsement") {
      return (
        <div className="action-buttons">
          <button
            className="btn-approve"
            onClick={() =>
              onAction("approve-endorsement", reservation.referralSlipNo)
            }
          >
            Approve
          </button>
          <button
            className="btn-reject"
            onClick={() =>
              onAction("reject-endorsement", reservation.referralSlipNo)
            }
          >
            Reject
          </button>
        </div>
      );
    }
    if (activeTab === "approval") {
      return (
        <div className="action-buttons">
          <button
            className="btn-approve"
            onClick={() =>
              onAction("approve-reservation", reservation.referralSlipNo)
            }
          >
            Approve
          </button>
          <button
            className="btn-reject"
            onClick={() =>
              onAction("reject-reservation", reservation.referralSlipNo)
            }
          >
            Reject
          </button>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="table-loading">
        <div className="loading-spinner"></div>
        <p>Loading reservations...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-empty">
        <div className="empty-icon"></div>
        <h3>No Reservations Found</h3>
        <p>There are no reservations in this category</p>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <div className="table-header">
        <h3>
          Showing {paginatedData.length} of {sortedData.length} reservations
        </h3>
        <button className="btn-refresh" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable && handleSort(column.key)}
                  className={column.sortable ? "sortable" : ""}
                >
                  {column.label}
                  {column.sortable && sortConfig.key === column.key && (
                    <span className="sort-indicator">
                      {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((reservation) => (
              <tr key={reservation.referralSlipNo}>
                {columns.map((column) => (
                  <td key={`${reservation.referralSlipNo}-${column.key}`}>
                    {renderCellContent(reservation, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </button>
          <div className="pagination-numbers">
            {[...Array(totalPages)].map((_, idx) => (
              <button
                key={idx}
                className={`pagination-number ${currentPage === idx + 1 ? "active" : ""}`}
                onClick={() => handlePageChange(idx + 1)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <button
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}

      {showPDFModal && selectedReservation && (
        <PDFViewerModal
          pdfUrl={selectedReservation.lockerApplicationFormAgreement}
          onClose={() => {
            setShowPDFModal(false);
            setSelectedReservation(null);
          }}
          title={`Application Form and Locker Usage Agreement - ${selectedReservation.referralSlipNo}`}
        />
      )}
    </div>
  );
};

export default DataTable;
