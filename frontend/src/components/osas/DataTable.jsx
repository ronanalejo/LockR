import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { showConfirm } from "../../utils/notifications";
import { debounce } from "lodash";
import CountdownTimer from "./CountdownTimer";
import PDFViewerModal from "./PDFViewerModal";
import "../../assets/css/dataTable.css";
import { API_BASE_URL } from "../../config/api";

const DataTable = ({
  data,
  loading,
  activeTab,
  onAction,
  onRefresh,
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [openRowDropdown, setOpenRowDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters?.search || "");
  const [showMassModal, setShowMassModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [genericPdfUrl, setGenericPdfUrl] = useState(null);
  const [genericPdfTitle, setGenericPdfTitle] = useState("");

  const itemsPerPage = 10;
  const actionsDropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const uploadsBaseUrl = API_BASE_URL.replace(/\/api\/?$/, "");

  // Reset page and search when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setLocalSearch(filters?.search || "");
    setOpenRowDropdown(null);
  }, [activeTab]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        actionsDropdownRef.current &&
        !actionsDropdownRef.current.contains(e.target)
      ) {
        setShowActionsDropdown(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target)
      ) {
        setShowFilterDropdown(false);
      }
      setOpenRowDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const debouncedSearch = useCallback(
    debounce((value) => {
      onFilterChange({ search: value });
    }, 500),
    [onFilterChange],
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearch(value);
    debouncedSearch(value);
  };

  const columns = useMemo(() => {
    const commonColumns = [
      { key: "referralSlipNo", label: "Referral No.", sortable: true },
      { key: "lockerID", label: "Locker Number", sortable: true },
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
          { key: "actions", label: "Actions", sortable: false },
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
          { key: "proofOfPayment", label: "Receipt", sortable: false },
          { key: "actions", label: "Actions", sortable: false },
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
          { key: "proofOfPayment", label: "Receipt", sortable: false },
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
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
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
      case "proofOfPayment": {
        const proofPath =
          reservation.proofOfPayment || reservation.dropboxReceipt;
        return proofPath ? (
          <button
            className="btn-view-doc"
            onClick={() => {
              setGenericPdfUrl(proofPath);
              setGenericPdfTitle(`Receipt - ${reservation.referralSlipNo}`);
            }}
          >
            View
          </button>
        ) : (
          "N/A"
        );
      }
      case "paymentAdviceSlip": {
        const slipPath =
          reservation.pdfPaymentAdviceSlipOSAS ||
          reservation.pdfPaymentAdviceSlip;
        return slipPath ? (
          <button
            className="btn-view-doc"
            onClick={() => {
              setGenericPdfUrl(slipPath);
              setGenericPdfTitle(
                `Payment Advice Slip - ${reservation.referralSlipNo}`,
              );
            }}
          >
            View
          </button>
        ) : (
          "N/A"
        );
      }
      case "agreementPeriod":
        return formatPeriod(
          reservation.agreementDateStart,
          reservation.agreementDateEnd,
        );
      case "duplicate": {
        if (activeTab === "occupied") {
          const dupId = reservation.referralSlipNo;
          const isDupOpen = openRowDropdown === dupId;

          const toggleDupDropdown = (e) => {
            e.stopPropagation();
            if (isDupOpen) {
              setOpenRowDropdown(null);
              return;
            }
            const rect = e.currentTarget.getBoundingClientRect();
            setDropdownPosition({
              x: rect.right - 144,
              y: rect.bottom + 4,
            });
            setOpenRowDropdown(dupId);
          };

          return (
            <div className="flex items-center gap-2">
              <span
                className={`duplicate-badge ${reservation.duplicate ? "yes" : "no"}`}
              >
                {reservation.duplicate ? "Yes" : "No"}
              </span>
              <div className="relative">
                <button
                  onClick={toggleDupDropdown}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="inline-flex items-center p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  style={{
                    background: "none",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                  }}
                  type="button"
                >
                  <svg
                    className="w-4 h-4"
                    aria-hidden="true"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </button>
                {isDupOpen && (
                  <div
                    style={{
                      position: "fixed",
                      top: dropdownPosition.y,
                      left: dropdownPosition.x,
                      zIndex: 9999,
                    }}
                    className="w-36 bg-white rounded divide-y divide-gray-100 shadow border border-gray-100"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <ul className="list-none py-1 text-sm text-gray-700">
                      <li>
                        <button
                          className="block w-full text-left py-2 px-4 hover:bg-gray-100"
                          style={{
                            background: "none",
                            border: "none",
                            outline: "none",
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenRowDropdown(null);
                            onAction("mark-duplicate-yes", dupId);
                          }}
                        >
                          Yes
                        </button>
                      </li>
                      <li>
                        <button
                          className="block w-full text-left py-2 px-4 hover:bg-gray-100"
                          style={{
                            background: "none",
                            border: "none",
                            outline: "none",
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenRowDropdown(null);
                            onAction("mark-duplicate-no", dupId);
                          }}
                        >
                          No
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        }
        return (
          <span
            className={`duplicate-badge ${reservation.duplicate ? "yes" : "no"}`}
          >
            {reservation.duplicate ? "Yes" : "No"}
          </span>
        );
      }
      case "actions":
        return renderRowActions(reservation);
      default:
        return reservation[column.key] || "N/A";
    }
  };

  const renderRowActions = (reservation) => {
    const id = reservation.referralSlipNo;
    const isOpen = openRowDropdown === id;

    const toggleDropdown = (e) => {
      e.stopPropagation();
      if (isOpen) {
        setOpenRowDropdown(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        x: rect.right - 144,
        y: rect.bottom + 4,
      });
      setOpenRowDropdown(id);
    };

    const threeDotBtn = (
      <button
        onClick={toggleDropdown}
        className="inline-flex items-center p-0.5 text-sm font-medium text-center text-gray-500 hover:text-gray-800 rounded-lg focus:outline-none"
        type="button"
      >
        <svg
          className="w-5 h-5"
          aria-hidden="true"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      </button>
    );

    if (activeTab === "occupied") {
      return (
        <div className="flex items-center justify-end">
          {threeDotBtn}
          {isOpen && (
            <div
              style={{
                position: "fixed",
                top: dropdownPosition.y,
                left: dropdownPosition.x,
                zIndex: 9999,
              }}
              className="w-36 bg-white rounded divide-y divide-gray-100 shadow border border-gray-100"
            >
              <ul className="py-1 text-sm text-gray-700">
                <li>
                  <button
                    className="block w-full text-left py-2 px-4 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRowDropdown(null);
                      onAction("mark-duplicate-yes", id);
                    }}
                  >
                    Yes
                  </button>
                </li>
                <li>
                  <button
                    className="block w-full text-left py-2 px-4 hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRowDropdown(null);
                      onAction("mark-duplicate-no", id);
                    }}
                  >
                    No
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "endorsement" || activeTab === "approval") {
      const approveAction =
        activeTab === "endorsement"
          ? "approve-endorsement"
          : "approve-reservation";
      const rejectAction =
        activeTab === "endorsement"
          ? "reject-endorsement"
          : "reject-reservation";

      return (
        <div className="flex items-center justify-end">
          {threeDotBtn}
          {isOpen && (
            <div
              style={{
                position: "fixed",
                top: dropdownPosition.y,
                left: dropdownPosition.x,
                zIndex: 9999,
              }}
              className="w-36 bg-white rounded divide-y divide-gray-100 shadow border border-gray-100"
            >
              <ul className="list-none py-1 text-sm text-gray-700">
                <li>
                  <button
                    className="block w-full text-left py-2 px-4 hover:bg-gray-100 text-green-700 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRowDropdown(null);
                      onAction(approveAction, id);
                    }}
                  >
                    Approve
                  </button>
                </li>
                <li>
                  <button
                    className="block w-full text-left py-2 px-4 hover:bg-gray-100 text-red-600 font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRowDropdown(null);
                      onAction(rejectAction, id);
                    }}
                  >
                    Reject
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const showActionsMenu =
    activeTab === "endorsement" || activeTab === "approval";

  const approveAllAction =
    activeTab === "endorsement"
      ? "approve-all-endorsements"
      : "approve-all-approvals";
  const rejectAllAction =
    activeTab === "endorsement"
      ? "reject-all-endorsements"
      : "reject-all-approvals";
  const massApproveAction =
    activeTab === "endorsement"
      ? "mass-approve-endorsements"
      : "mass-approve-approvals";
  const massRejectAction =
    activeTab === "endorsement"
      ? "mass-reject-endorsements"
      : "mass-reject-approvals";

  const modalColumns = useMemo(
    () => columns.filter((c) => c.key !== "actions"),
    [columns],
  );

  return (
    <div className="w-full flex flex-col" style={{ height: "100%" }}>
      {/* Toolbar */}
      <div
        className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4 border-b border-gray-200"
        style={{ flexShrink: 0 }}
      >
        {/* Search */}
        <div className="w-full md:w-1/2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={handleSearchChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2 outline-none"
              placeholder="Search by student name or referral number"
            />
          </div>
        </div>

        {/* Right controls */}
        <div className="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 items-stretch md:items-center justify-end md:space-x-3 flex-shrink-0">
          {/* Actions dropdown */}
          {showActionsMenu && (
            <div className="relative" ref={actionsDropdownRef}>
              <button
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                className="w-full md:w-auto flex items-center justify-center py-2 px-4 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200"
                type="button"
              >
                <svg
                  className="-ml-1 mr-1.5 w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    clipRule="evenodd"
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  />
                </svg>
                Actions
              </button>
              {showActionsDropdown && (
                <div className="absolute right-0 top-10 z-20 w-44 bg-white rounded shadow">
                  <ul className="list-none py-0 text-sm text-gray-700 divide-y divide-gray-200">
                    <li>
                      <button
                        className="block w-full text-left py-2 px-4 bg-transparent border-0 hover:bg-gray-100 text-green-700 font-medium cursor-pointer"
                        onClick={() => {
                          setShowActionsDropdown(false);
                          onAction(approveAllAction, null);
                        }}
                      >
                        Approve all
                      </button>
                    </li>
                    <li>
                      <button
                        className="block w-full text-left py-2 px-4 bg-transparent border-0 hover:bg-gray-100 text-red-600 font-medium cursor-pointer"
                        onClick={() => {
                          setShowActionsDropdown(false);
                          onAction(rejectAllAction, null);
                        }}
                      >
                        Reject all
                      </button>
                    </li>
                    <li>
                      <button
                        className="block w-full text-left py-2 px-4 bg-transparent border-0 hover:bg-gray-100 text-blue-700 font-medium cursor-pointer"
                        onClick={() => {
                          setShowActionsDropdown(false);
                          setSelectedRows(new Set());
                          setShowMassModal(true);
                        }}
                      >
                        Mass Approve/Reject
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Filter dropdown */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full md:w-auto flex items-center justify-center py-2 px-4 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="h-4 w-4 mr-2 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                  clipRule="evenodd"
                />
              </svg>
              Filter
              <svg
                className="-mr-1 ml-1.5 w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                />
              </svg>
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 top-10 z-20 w-64 p-3 bg-white rounded-lg shadow">
                <h6 className="mb-2 text-sm font-semibold text-gray-900">
                  Floor
                </h6>
                <div className="flex flex-wrap gap-2 mb-4">
                  {[6, 7, 9, 10].map((floor) => (
                    <button
                      key={floor}
                      onClick={() =>
                        onFilterChange({
                          floor:
                            filters.floor === floor.toString()
                              ? ""
                              : floor.toString(),
                        })
                      }
                      className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${
                        filters.floor === floor.toString()
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Floor {floor}
                    </button>
                  ))}
                </div>
                <h6 className="mb-2 text-sm font-semibold text-gray-900">
                  Date Range
                </h6>
                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      From
                    </label>
                    <input
                      type="date"
                      value={filters.dateRange?.start || ""}
                      onChange={(e) =>
                        onFilterChange({
                          dateRange: {
                            ...filters.dateRange,
                            start: e.target.value,
                          },
                        })
                      }
                      className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      To
                    </label>
                    <input
                      type="date"
                      value={filters.dateRange?.end || ""}
                      onChange={(e) =>
                        onFilterChange({
                          dateRange: {
                            ...filters.dateRange,
                            end: e.target.value,
                          },
                        })
                      }
                      className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClearFilters();
                    setLocalSearch("");
                    setShowFilterDropdown(false);
                  }}
                  className="w-full py-1.5 px-3 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        style={{ overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0 }}
      >
        <table
          className="w-full text-sm text-left text-gray-500"
          style={{ minWidth: "700px" }}
        >
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 ${
                    column.sortable
                      ? "cursor-pointer select-none hover:bg-gray-100"
                      : ""
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.label}
                  {column.sortable && sortConfig.key === column.key && (
                    <span className="ml-1">
                      {sortConfig.direction === "asc" ? "\u2191" : "\u2193"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center">
                  <div className="table-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading reservations...</p>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="table-empty">
                    <div className="empty-icon"></div>
                    <h3>No Reservations Found</h3>
                    <p>There are no reservations in this category</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((reservation) => (
                <tr
                  key={reservation.referralSlipNo}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  {columns.map((column) => (
                    <td
                      key={`${reservation.referralSlipNo}-${column.key}`}
                      className={`px-4 py-3 ${
                        column.key === "actions"
                          ? "flex items-center justify-end"
                          : ""
                      }`}
                    >
                      {renderCellContent(reservation, column)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer — always visible */}
      <nav
        className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4 border-t border-gray-200 bg-white"
        style={{
          flexShrink: 0,
          borderBottomLeftRadius: "12px",
          borderBottomRightRadius: "12px",
        }}
        aria-label="Table navigation"
      >
        <span className="text-sm font-normal text-gray-500">
          Showing{" "}
          <span className="font-semibold text-gray-900">
            {sortedData.length === 0
              ? "0"
              : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(
                  currentPage * itemsPerPage,
                  sortedData.length,
                )}`}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-gray-900">
            {sortedData.length}
          </span>
        </span>
        <ul className="inline-flex items-stretch -space-x-px list-none">
          <li>
            <button
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <svg
                className="w-5 h-5"
                aria-hidden="true"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </li>
          {[...Array(Math.max(totalPages, 1))].map((_, idx) => (
            <li key={idx}>
              <button
                onClick={() => handlePageChange(idx + 1)}
                disabled={sortedData.length === 0}
                className={`flex items-center justify-center text-sm py-2 px-3 leading-tight border ${
                  currentPage === idx + 1
                    ? "z-10 text-blue-600 bg-blue-50 border-blue-300"
                    : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                {idx + 1}
              </button>
            </li>
          ))}
          <li>
            <button
              disabled={currentPage === totalPages || sortedData.length === 0}
              onClick={() => handlePageChange(currentPage + 1)}
              className="flex items-center justify-center h-full py-1.5 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <svg
                className="w-5 h-5"
                aria-hidden="true"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </li>
        </ul>
      </nav>

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

      {genericPdfUrl && (
        <PDFViewerModal
          pdfUrl={genericPdfUrl}
          onClose={() => {
            setGenericPdfUrl(null);
            setGenericPdfTitle("");
          }}
          title={genericPdfTitle}
        />
      )}

      {genericPdfUrl && (
        <PDFViewerModal
          pdfUrl={genericPdfUrl}
          onClose={() => {
            setGenericPdfUrl(null);
            setGenericPdfTitle("");
          }}
          title={genericPdfTitle}
        />
      )}
      {showMassModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              width: "95vw",
              maxWidth: window.innerWidth * 0.95,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#111827",
                  margin: 0,
                }}
              >
                Mass Approve / Reject Reservations
              </h2>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                {selectedRows.size} selected
              </span>
            </div>

            {/* Modal Table */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 0,
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    <th
                      style={{
                        padding: "10px 14px",
                        width: 44,
                        textAlign: "center",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{ cursor: "pointer" }}
                        checked={
                          sortedData.length > 0 &&
                          selectedRows.size === sortedData.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(
                              new Set(sortedData.map((r) => r.referralSlipNo)),
                            );
                          } else {
                            setSelectedRows(new Set());
                          }
                        }}
                      />
                    </th>
                    {modalColumns.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          fontWeight: 600,
                          color: "#374151",
                          borderBottom: "1px solid #e5e7eb",
                          whiteSpace: "nowrap",
                          minWidth: 0,
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={modalColumns.length + 1}
                        style={{
                          textAlign: "center",
                          padding: 32,
                          color: "#6b7280",
                        }}
                      >
                        No reservations found.
                      </td>
                    </tr>
                  ) : (
                    sortedData.map((row, idx) => (
                      <tr
                        key={row.referralSlipNo}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          background: selectedRows.has(row.referralSlipNo)
                            ? "#eff6ff"
                            : idx % 2 === 0
                              ? "#fff"
                              : "#f9fafb",
                          cursor: "pointer",
                        }}
                        onClick={(e) => {
                          if (e.target.closest("button")) return;
                          const next = new Set(selectedRows);
                          if (next.has(row.referralSlipNo)) {
                            next.delete(row.referralSlipNo);
                          } else {
                            next.add(row.referralSlipNo);
                          }
                          setSelectedRows(next);
                        }}
                      >
                        <td
                          style={{ padding: "10px 14px", textAlign: "center" }}
                        >
                          <input
                            type="checkbox"
                            style={{ cursor: "pointer" }}
                            checked={selectedRows.has(row.referralSlipNo)}
                            onChange={() => {
                              const next = new Set(selectedRows);
                              if (next.has(row.referralSlipNo)) {
                                next.delete(row.referralSlipNo);
                              } else {
                                next.add(row.referralSlipNo);
                              }
                              setSelectedRows(next);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        {modalColumns.map((col) => (
                          <td
                            key={col.key}
                            style={{ padding: "10px 14px", color: "#374151" }}
                          >
                            {(() => {
                              switch (col.key) {
                                case "studentName":
                                  return (
                                    `${row.studentFirstName || ""} ${row.studentLastName || ""}`.trim() ||
                                    "-"
                                  );
                                case "agreement":
                                  return (
                                    row.agreementType || row.agreement || "-"
                                  );
                                case "reservationTimer":
                                  return renderCellContent(row, {
                                    key: "reservationTimer",
                                  });
                                case "applicationForm":
                                  return renderCellContent(row, {
                                    key: "applicationForm",
                                  });
                                case "paymentAdviceSlip": {
                                  const slipPath =
                                    row.pdfPaymentAdviceSlipOSAS ||
                                    row.pdfPaymentAdviceSlip;
                                  if (!slipPath) return "-";
                                  return (
                                    <button
                                      className="btn-view-doc"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setGenericPdfUrl(slipPath);
                                        setGenericPdfTitle(
                                          `Payment Advice Slip - ${row.referralSlipNo}`,
                                        );
                                      }}
                                    >
                                      View
                                    </button>
                                  );
                                }
                                case "proofOfPayment": {
                                  const proofPath =
                                    row.proofOfPayment || row.dropboxReceipt;
                                  if (!proofPath) return "-";
                                  return (
                                    <button
                                      className="btn-view-doc"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setGenericPdfUrl(proofPath);
                                        setGenericPdfTitle(
                                          `Receipt - ${row.referralSlipNo}`,
                                        );
                                      }}
                                    >
                                      View
                                    </button>
                                  );
                                }
                                case "endorsedBy":
                                  return row.endorsedByFirstName
                                    ? `${row.endorsedByFirstName} ${row.endorsedByLastName || ""}`.trim()
                                    : "-";
                                case "agreementPeriod":
                                  if (!row.agreementDateStart) return "-";
                                  return `${new Date(row.agreementDateStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${row.agreementDateEnd ? new Date(row.agreementDateEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}`;
                                default:
                                  return row[col.key] != null
                                    ? String(row[col.key])
                                    : "-";
                              }
                            })()}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Generic PDF/Image viewer triggered from inside the modal */}
            {genericPdfUrl && (
              <PDFViewerModal
                pdfUrl={genericPdfUrl}
                onClose={() => {
                  setGenericPdfUrl(null);
                  setGenericPdfTitle("");
                }}
                title={genericPdfTitle}
              />
            )}

            {/* Modal Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                background: "#fff",
              }}
            >
              <button
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "none",
                  background: selectedRows.size === 0 ? "#d1fae5" : "#059669",
                  color: selectedRows.size === 0 ? "#6b7280" : "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: selectedRows.size === 0 ? "not-allowed" : "pointer",
                }}
                disabled={selectedRows.size === 0}
                onClick={async () => {
                  const ids = Array.from(selectedRows);
                  const result = await showConfirm(
                    `Are you sure you want to approve ${ids.length} reservation(s)?`,
                  );
                  if (result.isConfirmed) {
                    setShowMassModal(false);
                    setSelectedRows(new Set());
                    onAction(massApproveAction, ids);
                  }
                }}
              >
                Approve
              </button>
              <button
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "none",
                  background: selectedRows.size === 0 ? "#fee2e2" : "#dc2626",
                  color: selectedRows.size === 0 ? "#6b7280" : "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: selectedRows.size === 0 ? "not-allowed" : "pointer",
                }}
                disabled={selectedRows.size === 0}
                onClick={async () => {
                  const ids = Array.from(selectedRows);
                  const result = await showConfirm(
                    `Are you sure you want to reject ${ids.length} reservation(s)?`,
                  );
                  if (result.isConfirmed) {
                    setShowMassModal(false);
                    setSelectedRows(new Set());
                    onAction(massRejectAction, ids);
                  }
                }}
              >
                Reject
              </button>
              <button
                style={{
                  padding: "8px 18px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
                onClick={async () => {
                  if (selectedRows.size === 0) {
                    setShowMassModal(false);
                    return;
                  }
                  const result = await showConfirm(
                    "Cancel the mass action? Your current selection will be lost.",
                  );
                  if (result.isConfirmed) {
                    setShowMassModal(false);
                    setSelectedRows(new Set());
                  }
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
