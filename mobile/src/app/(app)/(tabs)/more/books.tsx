import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator } from "react-native";

import { errorStatus } from "@/api/client";
import { fetchMySubjects, fetchSubjectBook } from "@/api/endpoints";
import type { MySubject } from "@/api/types";
import { ListGroup, ListRow } from "@/components/Controls";
import { Screen } from "@/components/Screen";
import { actionErrorMessage, EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n";
import { localize } from "@/lib/localize";
import { subjectColor, useTheme } from "@/theme";

export default function BooksScreen() {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const [opening, setOpening] = useState<number | null>(null);

  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: ["mySubjects"],
    queryFn: fetchMySubjects,
  });

  const open = async (subject: MySubject) => {
    setOpening(subject.pk);
    try {
      const book = await fetchSubjectBook(subject.pk, subject.grade__pk);
      if (!book.pdf_url) {
        toast(t("books.noPdf"), "error");
        return;
      }
      // In-app browser: renders PDFs on iOS and hands them to a PDF viewer on Android.
      await WebBrowser.openBrowserAsync(book.pdf_url, { controlsColor: colors.primary });
    } catch (openError) {
      toast(errorStatus(openError) === 404 ? t("books.noPdf") : actionErrorMessage(openError, t, t("books.openFailed")), "error");
    } finally {
      setOpening(null);
    }
  };

  return (
    <Screen onRefresh={refetch} refreshing={isRefetching}>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.length === 0 ? (
        <EmptyState icon="books" title={t("books.empty")} />
      ) : (
        <ListGroup>
          {data.map((subject) => (
            <ListRow
              key={subject.pk}
              icon="pdf"
              iconColor={subjectColor(subject.pk)}
              title={localize(subject.name, language)}
              subtitle={`${t("common.grade")} ${subject.grade__name} ${localize(subject.grade__category__name, language)}`.trim()}
              onPress={opening === null ? () => open(subject) : undefined}
              right={opening === subject.pk ? <ActivityIndicator color={colors.primary} /> : undefined}
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}
