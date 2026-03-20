import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Spinner, Badge } from "flowbite-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import DataTable from "../../components/osas/DataTable";
import SemesterPeriodModal from "../../components/common/SemesterPeriodModal";
import FloorPlanManager from "../../components/osas/FloorPlanManager";
import adminService from "../../services/adminService";
import {
  showError,
  showLoading,
  closeAlert,
  showConfirm,
  showSuccess,
} from "../../utils/notifications";
import AcademicPeriodList from "../../components/osas/AcademicPeriodList";
import "../../assets/css/academicPeriodList.css";
import "../../assets/css/osasDashboard.css";
import useSocket from "../../hooks/useSocket";
import iACLogo from "../../assets/images/logos/Logo DARKBLUE.png";

const OSASDashboard = () => {
  const [activeTab, setActiveTab] = useState("endorsement");
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [modalAcademicLevel, setModalAcademicLevel] = useState("");
  const [missingLevels, setMissingLevels] = useState([]);
  const [editSemesterData, setEditSemesterData] = useState(null);
  const [apRefreshKey, setApRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    floor: "",
    dateRange: { start: "", end: "" },
    search: "",
    status: "",
  });
  const [stats, setStats] = useState({
    total: 0,
    pendingEndorsements: 0,
    pendingApprovals: 0,
    occupied: 0,
    resolved: 0,
  });

  const [isNavOpen, setIsNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.department !== "OSAS") {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const [endorsementRes, approvalRes, occupiedRes, historyRes] =
        await Promise.all([
          adminService.getEndorsementQueue(),
          adminService.getApprovalQueue(),
          adminService.getOccupiedLockers(),
          adminService.getReservationHistory(),
        ]);

      setStats({
        pendingEndorsements: endorsementRes.success
          ? (endorsementRes.data || []).length
          : 0,
        pendingApprovals: approvalRes.success
          ? (approvalRes.data || []).length
          : 0,
        occupied: occupiedRes.success ? (occupiedRes.data || []).length : 0,
        resolved: historyRes.success ? (historyRes.data || []).length : 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchData = useCallback(
    async (showLoadingIndicator = false) => {
      try {
        if (showLoadingIndicator) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }

        let response;

        switch (activeTab) {
          case "endorsement":
            response = await adminService.getEndorsementQueue();
            break;
          case "approval":
            response = await adminService.getApprovalQueue();
            break;
          case "occupied":
            response = await adminService.getOccupiedLockers();
            break;
          case "history":
            response = await adminService.getReservationHistory();
            break;
          default:
            response = await adminService.getEndorsementQueue();
        }

        if (response.success) {
          setReservations(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        if (showLoadingIndicator) {
          showError("Error", error.message || "Failed to fetch reservations");
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab],
  );

  useSocket(
    "osas",
    useCallback(() => {
      fetchData(false);
      fetchStats();
    }, [fetchData, fetchStats]),
  );

  useEffect(() => {
    fetchData(true);
    fetchStats();
    const interval = setInterval(() => {
      fetchData(false);
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData, fetchStats]);

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (
        filters.floor &&
        reservation.floorNumber !== parseInt(filters.floor)
      ) {
        return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const studentName =
          `${reservation.studentFirstName} ${reservation.studentLastName}`.toLowerCase();
        const referralNo = reservation.referralSlipNo?.toString() || "";
        return (
          studentName.includes(searchLower) || referralNo.includes(searchLower)
        );
      }
      if (filters.dateRange.start || filters.dateRange.end) {
        const reservationDate = new Date(reservation.createdAt);
        if (
          filters.dateRange.start &&
          reservationDate < new Date(filters.dateRange.start)
        ) {
          return false;
        }
        if (
          filters.dateRange.end &&
          reservationDate > new Date(filters.dateRange.end)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reservations, filters]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      floor: "",
      dateRange: { start: "", end: "" },
      search: "",
      status: "",
    });
  }, []);

  const handleLogout = async () => {
    const result = await showConfirm("You will be logged out. Continue?");
    if (result.isConfirmed) {
      logout();
      navigate("/login");
    }
  };

  const handleAction = async (action, reservationIdOrIds) => {
    // --- Bulk / mass actions ---
    const isBulkAction =
      action.startsWith("approve-all") ||
      action.startsWith("reject-all") ||
      action.startsWith("mass-approve") ||
      action.startsWith("mass-reject");

    if (isBulkAction) {
      const isApprove =
        action.startsWith("approve-all") || action.startsWith("mass-approve");
      const isEndorsement = action.includes("endorsement");

      let targetIds;
      if (action.startsWith("approve-all") || action.startsWith("reject-all")) {
        targetIds = reservations.map((r) => r.referralSlipNo);
      } else {
        targetIds = reservationIdOrIds || [];
      }

      if (targetIds.length === 0) {
        showError("No Items", "There are no items to process.");
        return;
      }

      const actionLabel = isApprove ? "approve" : "reject";
      const typeLabel = isEndorsement ? "endorsement" : "reservation";

      const isMassAction =
        action.startsWith("mass-approve") || action.startsWith("mass-reject");

      if (!isMassAction) {
        const result = await showConfirm(
          `Are you sure you want to ${actionLabel} ${targetIds.length} ${typeLabel}(s)?`,
        );
        if (!result.isConfirmed) return;
      }

      showLoading("Processing...", "Please wait");

      let successCount = 0;
      let failCount = 0;

      for (const id of targetIds) {
        try {
          if (isEndorsement) {
            if (isApprove) await adminService.approveEndorsement(id);
            else await adminService.rejectEndorsement(id, "Rejected by OSAS");
          } else {
            if (isApprove) await adminService.approveReservation(id);
            else await adminService.rejectReservation(id, "Rejected by OSAS");
          }
          successCount++;
        } catch {
          failCount++;
        }
      }

      closeAlert();
      showSuccess(
        "Completed",
        `${successCount} processed successfully${
          failCount > 0 ? `, ${failCount} failed` : ""
        }`,
      );
      await fetchData(false);
      return;
    }

    // --- Duplicate marking ---
    if (action === "mark-duplicate-yes" || action === "mark-duplicate-no") {
      const isDuplicate = action === "mark-duplicate-yes";
      const result = await showConfirm(
        `Mark this reservation as ${isDuplicate ? "a duplicate" : "not a duplicate"}?`,
      );
      if (!result.isConfirmed) return;

      setReservations((prev) =>
        prev.map((r) =>
          r.referralSlipNo === reservationIdOrIds
            ? { ...r, duplicate: isDuplicate }
            : r,
        ),
      );

      try {
        showLoading("Processing...", "Please wait");
        const response = await adminService.markDuplicate(
          reservationIdOrIds,
          isDuplicate,
        );
        closeAlert();
        if (response && response.success) {
          showSuccess("Success", response.message || "Reservation updated.");
          await fetchData(false);
        }
      } catch (error) {
        setReservations((prev) =>
          prev.map((r) =>
            r.referralSlipNo === reservationIdOrIds
              ? { ...r, duplicate: !isDuplicate }
              : r,
          ),
        );
        closeAlert();
        showError(
          "Error",
          error.message || "Failed to update duplicate status.",
        );
      }
      return;
    }

    // --- Single-item receipt check ---
    if (action === "approve-reservation") {
      const reservation = reservations.find(
        (r) => r.referralSlipNo === reservationIdOrIds,
      );
      if (
        reservation &&
        !reservation.proofOfPayment &&
        !reservation.dropboxReceipt
      ) {
        showError(
          "Reservation Approval Failed",
          "Receipt is required before approval.",
        );
        return;
      }
    }

    const confirmMessages = {
      "approve-endorsement":
        "Are you sure you want to approve this endorsement?",
      "reject-endorsement": "Are you sure you want to reject this endorsement?",
      "approve-reservation":
        "Are you sure you want to approve this reservation?",
      "reject-reservation": "Are you sure you want to reject this reservation?",
    };

    const confirmMsg = confirmMessages[action];
    if (confirmMsg) {
      const result = await showConfirm(confirmMsg);
      if (!result.isConfirmed) return;
    }

    try {
      showLoading("Processing...", "Please wait");
      let response;

      switch (action) {
        case "approve-endorsement":
          response = await adminService.approveEndorsement(reservationIdOrIds);
          break;
        case "reject-endorsement":
          response = await adminService.rejectEndorsement(
            reservationIdOrIds,
            "Rejected by OSAS",
          );
          break;
        case "approve-reservation":
          response = await adminService.approveReservation(reservationIdOrIds);
          break;
        case "reject-reservation":
          response = await adminService.rejectReservation(
            reservationIdOrIds,
            "Rejected by OSAS",
          );
          break;
        default:
          break;
      }

      closeAlert();

      if (response && response.requiresSemesterPeriod) {
        await showError("Cannot Approve", response.message);
        return;
      }

      if (response && response.success) {
        showSuccess(
          "Success",
          response.message || "Action completed successfully",
        );
        await fetchData(false);
      }
    } catch (error) {
      closeAlert();
      if (error.response?.data?.requiresSemesterPeriod) {
        showError("Cannot Approve", error.response.data.message);
      } else {
        showError("Error", error.message || "Action failed");
      }
    }
  };

  const tabs = [
    {
      id: "endorsement",
      label: "For Endorsement",
      count: stats.pendingEndorsements,
    },
    { id: "approval", label: "For Approval", count: stats.pendingApprovals },
    { id: "occupied", label: "Occupied", count: stats.occupied },
    { id: "history", label: "History", count: 0 },
    { id: "floorplan", label: "Floor Plan", count: 0 },
    { id: "academic-period", label: "Academic Period", count: 0 },
  ];

  return (
    <div className="osas-dashboard">
      {/* Navbar */}
      <nav className="osas-navbar">
        <div className="osas-navbar-inner">
          {/* Left: Logo + User Info */}
          <div className="osas-navbar-left">
            <div className="osas-logo-container">
              <img
                src={iACLogo}
                alt="iACADEMY Logo"
                className="osas-navbar-logo-img"
              />
              <span className="osas-logo-text">iACADEMY</span>
            </div>
            <div className="osas-navbar-user">
              <p className="osas-user-name">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="osas-user-role">OSAS Administrator</p>
            </div>
          </div>

          {/* Center: Tabs (desktop) */}
          <div className="osas-navbar-tabs-desktop">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`osas-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsNavOpen(false);
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="tab-badge">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Right: Logout + Hamburger */}
          <div className="osas-navbar-right">
            {isRefreshing && (
              <div className="refresh-indicator">
                <div className="refresh-spinner"></div>
                <span>Updating...</span>
              </div>
            )}
            <button className="osas-logout-button" onClick={handleLogout}>
              Log Out
            </button>
            <button
              className="osas-hamburger"
              onClick={() => setIsNavOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                  d="M5 7h14M5 12h14M5 17h14"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {isNavOpen && (
          <div className="osas-navbar-tabs-mobile">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`osas-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsNavOpen(false);
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="tab-badge">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="osas-main-content">
        <div className="osas-header">
          <h1 className="osas-header-title">Locker Reservation Management</h1>
        </div>

        <div className="osas-stats-cards">
          <div className="stat-card">
            <div className="stat-icon endorsement"></div>
            <div className="stat-content">
              <p className="stat-label">Pending Endorsements</p>
              <p className="stat-value">{stats.pendingEndorsements}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon approval"></div>
            <div className="stat-content">
              <p className="stat-label">Pending Approvals</p>
              <p className="stat-value">{stats.pendingApprovals}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon occupied"></div>
            <div className="stat-content">
              <p className="stat-label">Occupied Lockers</p>
              <p className="stat-value">{stats.occupied}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon resolved"></div>
            <div className="stat-content">
              <p className="stat-label">Resolved Reservations</p>
              <p className="stat-value">{stats.resolved}</p>
            </div>
          </div>
        </div>

        <div
          className={`osas-content-area${["endorsement", "approval", "occupied", "history"].includes(activeTab) ? " osas-content-area--table" : ""}${activeTab === "floorplan" ? " osas-content-area--floorplan" : ""}`}
        >
          {activeTab === "academic-period" ? (
            <>
              <div className="ap-header-bar">
                <button
                  className="ap-add-btn"
                  onClick={() => {
                    setEditSemesterData(null);
                    setModalAcademicLevel("");
                    setMissingLevels([]);
                    setShowSemesterModal(true);
                  }}
                >
                  Add
                </button>
              </div>
              <AcademicPeriodList
                onEdit={(record) => {
                  setEditSemesterData(record);
                  setShowSemesterModal(true);
                }}
                onRefreshKey={apRefreshKey}
              />
            </>
          ) : activeTab === "floorplan" ? (
            <FloorPlanManager onLockerChange={() => fetchData(true)} />
          ) : (
            <DataTable
              data={filteredReservations}
              loading={loading}
              activeTab={activeTab}
              onAction={handleAction}
              onRefresh={() => fetchData(true)}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />
          )}
        </div>
      </div>

      <SemesterPeriodModal
        isOpen={showSemesterModal}
        onClose={() => {
          setShowSemesterModal(false);
          setModalAcademicLevel("");
          setMissingLevels([]);
          setEditSemesterData(null);
        }}
        onSave={() => {
          setShowSemesterModal(false);
          setModalAcademicLevel("");
          setMissingLevels([]);
          setEditSemesterData(null);
          setApRefreshKey((prev) => prev + 1);
          fetchData(true);
        }}
        editData={editSemesterData}
        academicLevel={modalAcademicLevel}
        missingLevels={missingLevels}
      />
    </div>
  );
};

export default OSASDashboard;
