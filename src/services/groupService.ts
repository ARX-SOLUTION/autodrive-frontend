import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/api/axiosInstance";
import { useAuthStore } from "@/store/authStore";
import { Group, GroupOverview, GroupsById } from "@/types/group";

export const useGroups = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  const isCrossTenantRole = role === "owner" || role === "dev";
  return useQuery<Group[]>({
    queryKey: ["groups", branchId],
    queryFn: async () => {
      try {
        const { data: res } = await axiosInstance.get("/groups");
        const arr = res?.data;
        if (Array.isArray(arr)) return arr;
        if (Array.isArray(res)) return res;
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!branchId || isCrossTenantRole,
  });
};

export const useGroupsOverview = () => {
  const branchId = useAuthStore((s) => s.user?.branch_id);
  const role = useAuthStore((s) => s.user?.role);
  const isCrossTenantRole = role === "owner" || role === "dev";
  return useQuery<GroupOverview[]>({
    queryKey: ["groups-overview", branchId],
    queryFn: async () => {
      try {
        const { data: res } = await axiosInstance.get("/groups/overview");
        const arr = res?.data;
        if (Array.isArray(arr)) return arr;
        if (Array.isArray(res)) return res;
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!branchId || isCrossTenantRole,
  });
};

export const useGroupsById = ({ id }: { id: string }) =>
  useQuery<GroupsById>({
    queryKey: ["groups", "detail", id],
    queryFn: async () =>
      axiosInstance
        .get(`/groups/${id}`)
        .then(({ data }) => data?.data || data)
        .catch(() => null),
    enabled: !!id,
  });

export const useCreateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (group: {
      name: string;
      branchId: string;
      courseType: string;
    }) => {
      const { data } = await axiosInstance.post("/groups", group);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["groups-overview"] });
    },
  });
};

export const useUpdateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...group
    }: {
      id: string;
      name?: string;
      branchId?: string;
      courseType?: string;
    }) => {
      const { data } = await axiosInstance.patch(`/groups/${id}`, group);
      return data?.data || data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["groups-overview"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
};

export const useDeleteGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/groups/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["groups-overview"] });
    },
  });
};
