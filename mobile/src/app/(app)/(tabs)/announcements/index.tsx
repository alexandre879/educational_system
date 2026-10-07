import { useQuery } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable } from "react-native";

import { fetchAnnouncements } from "@/api/endpoints";
import { useCurrentUser } from "@/auth/AuthProvider";
import { Chip, ChipRow } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { AnnouncementCard } from "@/features/announcements/AnnouncementCard";
import { useI18n } from "@/i18n";
import { localize } from "@/lib/localize";
import { useTheme } from "@/theme";

export default function AnnouncementsScreen() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const user = useCurrentUser();
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);

  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["announcements", subjectId ?? "all"],
    queryFn: () => fetchAnnouncements(subjectId),
    placeholderData: (previous) => previous,
  });

  const subjects = data?.subjects ?? [];

  return (
    <>
      {user.role === "teacher" ? (
        <Stack.Screen
          options={{
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("announcements.add")}
                onPress={() => router.push("/announcements/new")}
                hitSlop={12}
                style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }}
              >
                <Icon name="add" size={18} color={colors.onPrimary} />
              </Pressable>
            ),
          }}
        />
      ) : null}

      <Screen onRefresh={refetch} refreshing={isRefetching}>
        {subjects.length > 0 ? (
          <ChipRow>
            <Chip label={t("common.allSubjects")} selected={subjectId === undefined} onPress={() => setSubjectId(undefined)} />
            {subjects.map((subject) => (
              <Chip
                key={subject.id}
                label={localize(subject.name, language)}
                selected={subjectId === subject.id}
                onPress={() => setSubjectId(subject.id)}
              />
            ))}
          </ChipRow>
        ) : null}

        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data.announcements.length === 0 ? (
          <EmptyState icon="announcements" title={t("announcements.empty")} />
        ) : (
          data.announcements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))
        )}
      </Screen>
    </>
  );
}
