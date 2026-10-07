import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { createAnnouncement, fetchAnnouncements } from "@/api/endpoints";
import type { AnnouncementSubject } from "@/api/types";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { SelectSheet } from "@/components/SelectSheet";
import { actionErrorMessage, ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n";
import { localize } from "@/lib/localize";
import { radius, spacing, useTheme } from "@/theme";

export default function NewAnnouncementScreen() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();

  // The list endpoint also returns the subjects this teacher may post to.
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["announcements", "all"],
    queryFn: () => fetchAnnouncements(),
  });

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const subjects = data?.subjects ?? [];
  const subject = subjects.find((s) => s.id === subjectId);
  const label = (s: AnnouncementSubject) =>
    `${localize(s.name, language)} · ${s.grade.grade_name} ${localize(s.grade.grade_category_name, language)}`.trim();

  const post = useMutation({
    mutationFn: () =>
      createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        subject_id: subject!.id,
        grade_id: subject!.grade.grade_id,
        category_id: subject!.grade.grade_category_id,
      }),
    onSuccess: async () => {
      toast(t("announcements.posted"));
      await queryClient.invalidateQueries({ queryKey: ["announcements"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.back();
    },
    onError: (postError) => toast(actionErrorMessage(postError, t, t("announcements.postFailed")), "error"),
  });

  if (isPending) return <LoadingState variant="spinner" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <Screen>
      <AppText variant="caption" tone="secondary">
        {t("announcements.subjectLabel")}
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={() => setPickerOpen(true)}
        style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <AppText tone={subject ? "text" : "muted"} style={styles.flex} numberOfLines={1}>
          {subject ? label(subject) : t("announcements.subjectPlaceholder")}
        </AppText>
        <Icon name="chevronRight" size={16} color={colors.textMuted} />
      </Pressable>

      <TextField
        label={t("announcements.titleLabel")}
        placeholder={t("announcements.titlePlaceholder")}
        value={title}
        onChangeText={setTitle}
        maxLength={255}
      />
      <TextField
        label={t("announcements.contentLabel")}
        placeholder={t("announcements.contentPlaceholder")}
        value={content}
        onChangeText={setContent}
        multiline
      />

      <Button
        title={t("announcements.post")}
        icon="announcements"
        onPress={() => post.mutate()}
        loading={post.isPending}
        disabled={!subject || !title.trim() || !content.trim()}
      />

      <SelectSheet
        visible={pickerOpen}
        title={t("announcements.subjectPlaceholder")}
        options={subjects.map((s) => ({ value: s.id, label: label(s) }))}
        selected={subjectId}
        onSelect={setSubjectId}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
