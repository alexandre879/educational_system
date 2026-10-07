import { useQuery } from "@tanstack/react-query";

import { fetchDashboard } from "@/api/endpoints";
import { useCurrentUser } from "@/auth/AuthProvider";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/States";
import { AdminHome, ParentHome, TeacherHome } from "@/features/home/OtherHomes";
import { StudentHome } from "@/features/home/StudentHome";

export default function HomeScreen() {
  const user = useCurrentUser();
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["dashboard", user.id],
    queryFn: fetchDashboard,
  });

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching} headerless>
      {isPending ? (
        <LoadingState />
      ) : error || !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.me.role === "teacher" ? (
        <TeacherHome data={data} />
      ) : data.me.role === "admin" ? (
        <AdminHome data={data} />
      ) : data.me.role === "parent" ? (
        <ParentHome data={data} />
      ) : (
        <StudentHome data={data} />
      )}
    </Screen>
  );
}
