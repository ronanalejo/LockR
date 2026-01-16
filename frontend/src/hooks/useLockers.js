import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

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
    autoRefetch = true
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

      // build query params
      const params = new URLSearchParams();
      if (filterParams.floor) params.append('floor', filterParams.floor);
      if (filterParams.status) params.append('status', filterParams.status);

      const queryString = params.toString();
      const url = `/api/lockers${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // only update state if component is still mounted
      if (isMountedRef.current) {
        setLockers(data.lockers || data);
        setLastFetch(new Date());
        setLoading(false);
      }
    } catch (err) {
      // ignore abort errors
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }

      if (isMountedRef.current) {
        setError(err.message || 'Failed to fetch lockers');
        setLoading(false);
      }
    }
  }, []);

  /**
   * Debounced fetch function
   */
  const debouncedFetch = useCallback((filterParams) => {
    // clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchLockers(filterParams);
    }, debounceMs);
  }, [fetchLockers, debounceMs]);

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
      filtered = filtered.filter(locker => 
        locker.floor?.toString() === floor.toString()
      );
    }

    if (status) {
      filtered = filtered.filter(locker => 
        locker.status?.toLowerCase() === status.toLowerCase()
      );
    }

    return filtered;
  }, [lockers, floor, status]);

  /**
   * Get lockers by specific filter
   */
  const getLockersByFloor = useCallback((floorNumber) => {
    return lockers.filter(locker => 
      locker.floor?.toString() === floorNumber.toString()
    );
  }, [lockers]);

  const getLockersByStatus = useCallback((statusType) => {
    return lockers.filter(locker => 
      locker.status?.toLowerCase() === statusType.toLowerCase()
    );
  }, [lockers]);

  const getLockerById = useCallback((lockerId) => {
    return lockers.find(locker => 
      locker.id?.toString() === lockerId.toString()
    );
  }, [lockers]);

  /**
   * Statistics helpers
   */
  const stats = useMemo(() => {
    const total = lockers.length;
    const occupied = lockers.filter(l => l.status === 'occupied').length;
    const available = lockers.filter(l => l.status === 'available').length;
    const maintenance = lockers.filter(l => l.status === 'maintenance').length;

    return {
      total,
      occupied,
      available,
      maintenance,
      occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(2) : 0
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
  }, []); // only on mount

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
    isRefetching: loading && lockers.length > 0
  };
};

export default useLockers;