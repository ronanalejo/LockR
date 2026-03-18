import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Spinner, Badge } from "flowbite-react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import FinanceDataTable from "../../components/finance/FinanceDataTable";
import FilterButtons from "../../components/osas/FilterButtons";
import financeService from "../../services/financeService";
import {
  showError,
  showLoading,
  closeAlert,
  showConfirm,
  showSuccess,
} from "../../utils/notifications";
import "../../assets/css/financeDashboard.css";
import useSocket from "../../hooks/useSocket";

const FinanceDashboard = () => {
  const [activeTab, setActiveTab] = useState("for-payment");
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
    pendingPayments: 0,
    verifiedPayments: 0,
  });

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  /**
   * Role-based access control
   */
  useEffect(() => {
    if (user && user.department !== "Finance") {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, navigate]);

  /**
   * Fetch data (initial + polling)
   */
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
          case "for-payment":
            response = await financeService.getPendingPayments();
            break;
          case "history":
            response = await financeService.getPaymentHistory();
            break;
          default:
            response = await financeService.getPendingPayments();
        }

        if (response?.success) {
          setReservations(response.data || []);
        }
      } catch (error) {
        console.error("Finance fetch error:", error);
        if (showLoadingIndicator) {
          showError("Error", error.message || "Failed to fetch finance data");
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab],
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await financeService.getDashboardStats();
      if (response.success && response.data) {
        const data = response.data;
        setStats({
          total: (Number(data.pending) || 0) + (Number(data.verified) || 0),
          pendingPayments: Number(data.pending) || 0,
          verifiedPayments: Number(data.verified) || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching finance stats:", error);
    }
  }, []);

  // Real-time WebSocket updates from other dashboards
  useSocket(
    "finance",
    useCallback(() => {
      fetchData(false);
      fetchStats();
    }, [fetchData, fetchStats]),
  );

  /**
   * Initial load + 10s polling (fallback if WebSocket disconnects)
   */
  useEffect(() => {
    fetchData(true);
    fetchStats();
    const dataInterval = setInterval(() => fetchData(false), 10000);
    const statsInterval = setInterval(() => fetchStats(), 10000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(statsInterval);
    };
  }, [fetchData, fetchStats]);

  /**
   * Apply filters
   */
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
        const referenceNo = reservation.referenceNo?.toString() || "";

        return (
          studentName.includes(searchLower) || referenceNo.includes(searchLower)
        );
      }

      if (filters.dateRange.start || filters.dateRange.end) {
        const createdAt = new Date(reservation.createdAt);

        if (
          filters.dateRange.start &&
          createdAt < new Date(filters.dateRange.start)
        ) {
          return false;
        }

        if (
          filters.dateRange.end &&
          createdAt > new Date(filters.dateRange.end)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [reservations, filters]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      floor: "",
      dateRange: { start: "", end: "" },
      search: "",
      status: "",
    });
  }, []);

  /**
   * Logout
   */
  const handleLogout = async () => {
    const result = await showConfirm("You will be logged out. Continue?");
    if (result.isConfirmed) {
      logout();
      navigate("/login");
    }
  };

  /**
   * Finance actions (verify / reject payment)
   */
  const handleAction = async (action, reservationId) => {
    try {
      showLoading("Processing...", "Please wait");

      let response;

      switch (action) {
        case "verify-payment":
          response = await financeService.verifyPayment(reservationId);
          break;
        case "reject-payment":
          response = await financeService.rejectPayment(
            reservationId,
            "Rejected by Finance",
          );
          break;
        default:
          break;
      }

      closeAlert();

      if (response?.success) {
        showSuccess("Success", response.message || "Action successful");
        fetchData(false);
      }
    } catch (error) {
      closeAlert();
      showError("Error", error.message || "Action failed");
    }
  };

  const tabs = [
    {
      id: "for-payment",
      label: "For Payment",
      count: stats.pendingPayments,
    },
    {
      id: "history",
      label: "History",
      count: 0,
    },
  ];

  return (
    <div className="finance-dashboard">
      {/* Sidebar */}
      <div className="finance-sidebar">
        <div className="finance-sidebar-logo">
          <div className="finance-logo-container">
            <div className="finance-logo-icon">
              <div className="finance-logo-icon-inner"></div>
            </div>
            <div className="finance-logo-text">LockR Finance</div>
          </div>
        </div>

        <div className="finance-user-info">
          <p className="finance-user-name">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="finance-user-role">Finance Administrator</p>
        </div>

        <button className="finance-logout-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      {/* Main */}
      <div className="finance-main-content">
        <div className="finance-header">
          <h1 className="finance-header-title">Finance Payment Management</h1>

          {isRefreshing && (
            <div className="refresh-indicator">
              <Spinner size="sm" color="white" aria-label="Refreshing data" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="finance-stats-cards">
          <div className="stat-card">
            <div className="stat-icon total"></div>
            <div className="stat-content">
              <p className="stat-label">Total Reservations</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending"></div>
            <div className="stat-content">
              <p className="stat-label">Pending Payments</p>
              <p className="stat-value">{stats.pendingPayments}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon verified"></div>
            <div className="stat-content">
              <p className="stat-label">Verified Payments</p>
              <p className="stat-value">{stats.verifiedPayments}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="finance-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`finance-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge color="failure" className="ml-2 tab-badge">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        <FilterButtons
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />

        <div className="finance-content-area">
          <FinanceDataTable
            data={filteredReservations}
            loading={loading}
            activeTab={activeTab}
            onAction={handleAction}
            onRefresh={() => fetchData(true)}
          />
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
