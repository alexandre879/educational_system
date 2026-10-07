import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

import { search } from "@/api/endpoints";
import { useCurrentUser } from "@/auth/AuthProvider";
import { AppText } from "@/components/AppText";
import { SectionHeader } from "@/components/Card";
import { ListGroup, ListRow } from "@/components/Controls";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState } from "@/components/States";
import { useI18n } from "@/i18n";
import { formatDay } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { radius, spacing, subjectColor, useTheme } from "@/theme";

const MIN_LENGTH = 2;

/** One search box over subjects, exams, announcements and homework the user can see. */
export default function SearchScreen() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const user = useCurrentUser();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");

  // Wait until typing pauses before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const enabled = query.length >= MIN_LENGTH;
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["search", query],
    queryFn: () => search(query),
    enabled,
    placeholderData: keepPreviousData,
  });

  const results = enabled ? data : undefined;
  const count = results
    ? results.subjects.length + results.exams.length + results.announcements.length + results.exercises.length
    : 0;

  return (
    <Screen>
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("search.placeholder")}
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: colors.text }]}
        />
        {isFetching && enabled ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        {text ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={() => setText("")} hitSlop={8}>
            <Icon name="cross" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {!enabled ? (
        <AppText variant="caption" tone="muted" center>
          {t("search.hint")}
        </AppText>
      ) : error && !results ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : results && count === 0 ? (
        <EmptyState icon="search" title={t("search.noResults", { query })} />
      ) : results ? (
        <>
          {results.exercises.length ? (
            <>
              <SectionHeader title={t("search.exercises")} />
              <ListGroup>
                {results.exercises.map((item) => (
                  <ListRow
                    key={`exercise-${item.id}`}
                    icon="exercises"
                    iconColor={subjectColor(item.subject__id)}
                    title={item.title}
                    subtitle={[localize(item.subject__name, language), formatDay(item.date, t)].filter(Boolean).join(" · ")}
                    onPress={() => router.push({ pathname: "/exercises", params: { date: item.date } })}
                  />
                ))}
              </ListGroup>
            </>
          ) : null}

          {results.announcements.length ? (
            <>
              <SectionHeader title={t("search.announcements")} />
              <ListGroup>
                {results.announcements.map((item) => (
                  <ListRow
                    key={`announcement-${item.pk}`}
                    icon="announcements"
                    iconColor={subjectColor(item.subject__pk)}
                    title={item.title}
                    subtitle={item.content.slice(0, 80)}
                    onPress={() =>
                      router.push({ pathname: "/announcements/[id]", params: { id: String(item.pk) } })
                    }
                  />
                ))}
              </ListGroup>
            </>
          ) : null}

          {results.exams.length ? (
            <>
              <SectionHeader title={t("search.exams")} />
              <ListGroup>
                {results.exams.map((item) => (
                  <ListRow
                    key={`exam-${item.pk}`}
                    icon="exams"
                    iconColor={subjectColor(item.subject__pk)}
                    title={localize(item.title, language)}
                    subtitle={localize(item.subject__name, language)}
                    onPress={() => router.push(user.role === "teacher" ? "/more/exams" : "/study")}
                  />
                ))}
              </ListGroup>
            </>
          ) : null}

          {results.subjects.length ? (
            <>
              <SectionHeader title={t("search.subjects")} />
              <ListGroup>
                {results.subjects.map((item) => (
                  <ListRow
                    key={`subject-${item.pk}`}
                    icon="books"
                    iconColor={subjectColor(item.pk)}
                    title={localize(item.name, language)}
                    subtitle={`${t("common.grade")} ${item.grade__name} ${localize(item.grade__category__name, language)}`.trim()}
                    onPress={() => router.push("/more/books")}
                  />
                ))}
              </ListGroup>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.sm },
});
