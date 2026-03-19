import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import lockerService from "../services/lockerService";

/**
 * Custom hook for locker state management
 * @param {Object} options - Configuration options
 * @param {string} options.floor - Filter by floor (optional)
 * @param {string} options.status - Filter by status (occupied, available, maintenance)
 * @param {number} options.debounceMs - Debounce delay for filters (default: 300ms)
 * @param {boolean} options.autoRefetch - Auto refetch on mount (default: true)
 * @returns {Object} Locker state and methods
 */
const useLockers = (options = {}) => {
  const {
    floor = null,
    status = null,
    debounceMs = 300,
    autoRefetch = true,
  } = options;

  // State management
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  // Refs for cleanup and debouncing
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * fetch lockers from API
   */
  const fetchLockers = useCallback(async (filterParams = {}) => {
    // cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      let result;

      if (filterParams.floor) {
        // Fetch lockers for specific floor
        result = await lockerService.getLockersByFloor(
          Number(filterParams.floor),
        );
      } else if (
        filterParams.status === "available" ||
        filterParams.status === "Available"
      ) {
        // Fetch only available lockers
        result = await lockerService.getAvailableLockers();
      } else {
        // Fetch all lockers
        result = await lockerService.getAllLockers();
      }

      // only update state if component is still mounted
      if (isMountedRef.current) {
        if (result.success) {
          // Handle array or object response
          const lockersData = Array.isArray(result.data)
            ? result.data
            : result.data.lockers || result.data;
          setLockers(lockersData);
          setLastFetch(new Date());
        } else {
          throw new Error(result.message || "Failed to fetch lockers");
        }
        setLoading(false);
      }
    } catch (err) {
      // ignore abort errors
      if (err.name === "AbortError") {
        return;
      }

      if (isMountedRef.current) {
        setError(err.message || "Failed to fetch lockers");
        setLoading(false);
      }
    }
  }, []);

  /**
   * Debounced fetch function
   */
  const debouncedFetch = useCallback(
    (filterParams) => {
      // clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // set new timer
      debounceTimerRef.current = setTimeout(() => {
        fetchLockers(filterParams);
      }, debounceMs);
    },
    [fetchLockers, debounceMs],
  );

  /**
   * Manual refetch method
   */
  const refetch = useCallback(() => {
    const filterParams = {};
    if (floor) filterParams.floor = floor;
    if (status) filterParams.status = status;

    fetchLockers(filterParams);
  }, [fetchLockers, floor, status]);

  /**
   * Filter lockers client-side (cached filtering)
   */
  const filteredLockers = useMemo(() => {
    let filtered = [...lockers];

    if (floor) {
      filtered = filtered.filter(
        (locker) => locker.floorNumber?.toString() === floor.toString(),
      );
    }

    if (status) {
      filtered = filtered.filter(
        (locker) => locker.status?.toLowerCase() === status.toLowerCase(),
      );
    }

    return filtered;
  }, [lockers, floor, status]);

  /**
   * Get lockers by specific filter
   */
  const getLockersByFloor = useCallback(
    (floorNumber) => {
      return lockers.filter(
        (locker) => locker.floorNumber?.toString() === floorNumber.toString(),
      );
    },
    [lockers],
  );

  const getLockersByStatus = useCallback(
    (statusType) => {
      return lockers.filter(
        (locker) => locker.status?.toLowerCase() === statusType.toLowerCase(),
      );
    },
    [lockers],
  );

  const getLockerById = useCallback(
    (lockerId) => {
      return lockers.find(
        (locker) => locker.lockerID?.toString() === lockerId.toString(),
      );
    },
    [lockers],
  );

  /**
   * Statistics helpers
   */
  const stats = useMemo(() => {
    const total = lockers.length;
    const occupied = lockers.filter(
      (l) => l.status?.toLowerCase() === "occupied",
    ).length;
    const available = lockers.filter(
      (l) => l.status?.toLowerCase() === "available",
    ).length;
    const reserved = lockers.filter(
      (l) => l.status?.toLowerCase() === "reserved",
    ).length;
    const unavailable = lockers.filter(
      (l) => l.status?.toLowerCase() === "unavailable",
    ).length;

    return {
      total,
      occupied,
      available,
      reserved,
      unavailable,
      occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(2) : 0,
    };
  }, [lockers]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (autoRefetch) {
      const filterParams = {};
      if (floor) filterParams.floor = floor;
      if (status) filterParams.status = status;

      fetchLockers(filterParams);
    }
  }, [autoRefetch]);

  /**
   * Debounced fetch when filters change
   */
  useEffect(() => {
    if (!autoRefetch) return;

    const filterParams = {};
    if (floor) filterParams.floor = floor;
    if (status) filterParams.status = status;

    // Skip initial fetch (already done in previous useEffect)
    if (lastFetch) {
      debouncedFetch(filterParams);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [floor, status, autoRefetch, debouncedFetch, lastFetch]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // cancel ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // data
    lockers: filteredLockers,
    allLockers: lockers,

    // state
    loading,
    error,
    lastFetch,

    // statistics
    stats,

    // methods
    refetch,
    getLockersByFloor,
    getLockersByStatus,
    getLockerById,

    // utilities
    isEmpty: lockers.length === 0,
    hasError: error !== null,
    isRefetching: loading && lockers.length > 0,
  };
};

export default useLockers;
