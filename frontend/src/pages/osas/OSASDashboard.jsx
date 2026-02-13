import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import DataTable from "../../components/osas/DataTable";
import FilterButtons from "../../components/osas/FilterButtons";
import adminService from "../../services/adminService";
import {
  showError,
  showLoading,
  closeAlert,
  showConfirm,
  showSuccess,
} from "../../utils/notifications";
import "../../assets/css/osasDashboard.css";
import useSocket from "../../hooks/useSocket";

const OSASDashboard = () => {
  const [activeTab, setActiveTab] = useState("endorsement");
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  });

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.department !== "OSAS") {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, navigate]);

  const updateStats = useCallback((data) => {
    setStats({
      total: data.length,
      pendingEndorsements: data.filter(
        (r) => r.forEndorsement && !r.forApproval,
      ).length,
      pendingApprovals: data.filter((r) => r.forApproval && !r.isActive).length,
      occupied: data.filter((r) => r.isActive).length,
    });
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
          updateStats(response.data || []);
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
    [activeTab, updateStats],
  );

  // Real-time WebSocket updates from other dashboards
  useSocket(
    "osas",
    useCallback(() => {
      fetchData(false);
    }, [fetchData]),
  );

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

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

  const handleAction = async (action, reservationId) => {
    // For approve-reservation, check if proof of payment exists
    if (action === "approve-reservation") {
      const reservation = reservations.find(
        (r) => r.referralSlipNo === reservationId,
      );
      if (
        reservation &&
        !reservation.proofOfPayment &&
        !reservation.dropboxReceipt
      ) {
        showError(
          "Reservation Approval Failed",
          "Proof of Payment is required before approval.",
        );
        return;
      }
    }

    // SweetAlert2 confirmation before any approve/reject action
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
          response = await adminService.approveEndorsement(reservationId);
          break;
        case "reject-endorsement":
          response = await adminService.rejectEndorsement(
            reservationId,
            "Rejected by OSAS",
          );
          break;
        case "approve-reservation":
          response = await adminService.approveReservation(reservationId);
          break;
        case "reject-reservation":
          response = await adminService.rejectReservation(
            reservationId,
            "Rejected by OSAS",
          );
          break;
        default:
          break;
      }

      closeAlert();

      if (response && response.success) {
        showSuccess(
          "Success",
          response.message || "Action completed successfully",
        );
        await fetchData(false);
      }
    } catch (error) {
      closeAlert();
      showError("Error", error.message || "Action failed");
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
  ];

  return (
    <div className="osas-dashboard">
      <div className="osas-sidebar">
        <div className="osas-sidebar-logo">
          <div className="osas-logo-container">
            <div className="osas-logo-icon">
              <div className="osas-logo-icon-inner"></div>
            </div>
            <div className="osas-logo-text">iACADEMY OSAS</div>
          </div>
        </div>

        <div className="osas-user-info">
          <p className="osas-user-name">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="osas-user-role">OSAS Administrator</p>
        </div>

        <button className="osas-logout-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      <div className="osas-main-content">
        <div className="osas-header">
          <h1 className="osas-header-title">Locker Reservation Management</h1>
          {isRefreshing && (
            <div className="refresh-indicator">
              <div className="refresh-spinner"></div>
              <span>Updating...</span>
            </div>
          )}
        </div>

        <div className="osas-stats-cards">
          <div className="stat-card">
            <div className="stat-icon total"></div>
            <div className="stat-content">
              <p className="stat-label">Total Reservations</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>
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
        </div>

        <div className="osas-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`osas-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
            </button>
          ))}
        </div>

        {activeTab !== "floorplan" && (
          <FilterButtons
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
          />
        )}

        <div className="osas-content-area">
          {activeTab === "floorplan" ? (
            <div className="floor-plan-placeholder">
              <p>Floor Plan view coming soon</p>
            </div>
          ) : (
            <DataTable
              data={filteredReservations}
              loading={loading}
              activeTab={activeTab}
              onAction={handleAction}
              onRefresh={() => fetchData(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OSASDashboard;
