import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

/**
 * Custom hook for managing admin operations
 * Handles endorsement queue, approval queue, and reservation actions
 */
export const useAdmin = () => {
  const queryClient = useQueryClient();
  const [pollingInterval, setPollingInterval] = useState(30000); // 30 seconds default

  // Fetch endorsement queue (pending endorsements)
  const {
    data: endorsementQueue = [],
    isLoading: isLoadingEndorsements,
    error: endorsementError,
    refetch: refetchEndorsements,
  } = useQuery({
    queryKey: ["endorsementQueue"],
    queryFn: async () => {
      const response = await api.get("/admin/endorsements/pending");
      return response.data;
    },
    refetchInterval: pollingInterval,
    staleTime: 20000, // Consider data stale after 20 seconds
    cacheTime: 300000, // Keep in cache for 5 minutes
  });

  // Fetch approval queue (pending approvals)
  const {
    data: approvalQueue = [],
    isLoading: isLoadingApprovals,
    error: approvalError,
    refetch: refetchApprovals,
  } = useQuery({
    queryKey: ["approvalQueue"],
    queryFn: async () => {
      const response = await api.get("/admin/reservations/pending");
      return response.data;
    },
    refetchInterval: pollingInterval,
    staleTime: 20000,
    cacheTime: 300000,
  });

  // Fetch all reservations (with filters - optional)
  const useReservations = (filters = {}) => {
    return useQuery({
      queryKey: ["reservations", filters],
      queryFn: async () => {
        const params = new URLSearchParams(filters);
        const response = await api.get(`/admin/reservations?${params}`);
        return response.data;
      },
      staleTime: 30000,
      cacheTime: 300000,
    });
  };

  // Approve endorsement mutation
  const approveEndorsementMutation = useMutation({
    mutationFn: async ({ reservationId, notes }) => {
      const response = await api.post(
        `/admin/endorsements/${reservationId}/approve`,
        {
          notes,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ["endorsementQueue"] });
      queryClient.invalidateQueries({ queryKey: ["approvalQueue"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  // Reject endorsement mutation
  const rejectEndorsementMutation = useMutation({
    mutationFn: async ({ reservationId, reason }) => {
      const response = await api.post(
        `/admin/endorsements/${reservationId}/reject`,
        {
          reason,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["endorsementQueue"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  // Approve reservation mutation
  const approveReservationMutation = useMutation({
    mutationFn: async ({ reservationId, notes }) => {
      const response = await api.post(
        `/admin/reservations/${reservationId}/approve`,
        {
          notes,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvalQueue"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  // Reject reservation mutation
  const rejectReservationMutation = useMutation({
    mutationFn: async ({ reservationId, reason }) => {
      const response = await api.post(
        `/admin/reservations/${reservationId}/reject`,
        {
          reason,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvalQueue"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  // Cancel reservation mutation
  const cancelReservationMutation = useMutation({
    mutationFn: async ({ reservationId, reason }) => {
      const response = await api.post(
        `/admin/reservations/${reservationId}/cancel`,
        {
          reason,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["approvalQueue"] });
    },
  });

  // Convenience methods with error handling
  const approveEndorsement = useCallback(
    async (reservationId, notes = "") => {
      try {
        await approveEndorsementMutation.mutateAsync({ reservationId, notes });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error.response?.data?.message || "Failed to approve endorsement",
        };
      }
    },
    [approveEndorsementMutation]
  );

  const rejectEndorsement = useCallback(
    async (reservationId, reason) => {
      try {
        await rejectEndorsementMutation.mutateAsync({ reservationId, reason });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error.response?.data?.message || "Failed to reject endorsement",
        };
      }
    },
    [rejectEndorsementMutation]
  );

  const approveReservation = useCallback(
    async (reservationId, notes = "") => {
      try {
        await approveReservationMutation.mutateAsync({ reservationId, notes });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error.response?.data?.message || "Failed to approve reservation",
        };
      }
    },
    [approveReservationMutation]
  );

  const rejectReservation = useCallback(
    async (reservationId, reason) => {
      try {
        await rejectReservationMutation.mutateAsync({ reservationId, reason });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error.response?.data?.message || "Failed to reject reservation",
        };
      }
    },
    [rejectReservationMutation]
  );

  const cancelReservation = useCallback(
    async (reservationId, reason) => {
      try {
        await cancelReservationMutation.mutateAsync({ reservationId, reason });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error.response?.data?.message || "Failed to cancel reservation",
        };
      }
    },
    [cancelReservationMutation]
  );

  // Manual refetch all data
  const refetchAll = useCallback(() => {
    refetchEndorsements();
    refetchApprovals();
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
  }, [refetchEndorsements, refetchApprovals, queryClient]);

  // Control polling
  const startPolling = useCallback((interval = 30000) => {
    setPollingInterval(interval);
  }, []);

  const stopPolling = useCallback(() => {
    setPollingInterval(0);
  }, []);

  return {
    // queue data
    endorsementQueue,
    approvalQueue,

    // loading states
    isLoadingEndorsements,
    isLoadingApprovals,
    isLoading: isLoadingEndorsements || isLoadingApprovals,

    // error states
    endorsementError,
    approvalError,
    hasError: endorsementError || approvalError,

    // action methods
    approveEndorsement,
    rejectEndorsement,
    approveReservation,
    rejectReservation,
    cancelReservation,

    // action loading states
    isApprovingEndorsement: approveEndorsementMutation.isPending,
    isRejectingEndorsement: rejectEndorsementMutation.isPending,
    isApprovingReservation: approveReservationMutation.isPending,
    isRejectingReservation: rejectReservationMutation.isPending,
    isCancellingReservation: cancelReservationMutation.isPending,
    isPerformingAction:
      approveEndorsementMutation.isPending ||
      rejectEndorsementMutation.isPending ||
      approveReservationMutation.isPending ||
      rejectReservationMutation.isPending ||
      cancelReservationMutation.isPending,

    // refetch methods
    refetchEndorsements,
    refetchApprovals,
    refetchAll,

    // polling control
    startPolling,
    stopPolling,
    pollingInterval,

    // custom query hook
    useReservations,
  };
};

export default useAdmin;
