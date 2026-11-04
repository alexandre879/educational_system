import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";

import { fetchAnnouncements } from "@/api/endpoints";
import { useCurrentUser } from "@/auth/AuthProvider";
import { Chip, ChipRow } from "@/components/Controls";
import { Screen, TitleAction } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { AnnouncementCard } from "@/features/announcements/AnnouncementCard";
import { useI18n } from "@/i18n";
import { localize } from "@/lib/localize";

export default function AnnouncementsScreen() {
  const { t, language } = useI18n();
  const user = useCurrentUser();
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);

  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["announcements", subjectId ?? "all"],
    queryFn: () => fetchAnnouncements(subjectId),
    placeholderData: (previous) => previous,
  });

  const subjects = data?.subjects ?? [];

  return (
    <Screen
      title={t("announcements.title")}
      actions={
        user.role === "teacher" ? (
          <TitleAction icon="add" label={t("announcements.add")} onPress={() => router.push("/announcements/new")} />
        ) : undefined
      }
      onRefresh={refetch}
      refreshing={isRefetching}
    >
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
  );
}
