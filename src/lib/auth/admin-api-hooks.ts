import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { getAccessToken } from "./api-hooks";
import type { Role, User } from "./types";

const STAFF_KEY = ["admin", "staff"];

function toUser(value: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  specialty: string | null;
  matricNumber?: string;
  createdAt: string;
}): User {
  return {
    id: value.id,
    email: value.email,
    fullName: value.fullName,
    role: value.role.toLowerCase() as Role,
    specialty: value.specialty ?? undefined,
    matricNumber: value.matricNumber,
    createdAt: value.createdAt,
  };
}

export function useStaffList() {
  const token = getAccessToken();
  return useQuery({
    queryKey: STAFF_KEY,
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.admin.listStaff(token);
      return result.users.map(toUser);
    },
    enabled: !!token,
    refetchInterval: 15000,
    retry: 1,
  });
}

export function useCreateStaff() {
  const token = getAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fullName: string;
      email: string;
      password: string;
      role: Exclude<Role, "patient">;
      specialty?: string;
    }) => {
      if (!token) throw new Error("Not authenticated");
      const result = await api.admin.createStaff(token, {
        ...payload,
        role: payload.role.toUpperCase(),
      });
      return toUser(result.user);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STAFF_KEY }),
  });
}

export function useDeleteStaff() {
  const token = getAccessToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error("Not authenticated");
      await api.admin.deleteStaff(token, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STAFF_KEY }),
  });
}
