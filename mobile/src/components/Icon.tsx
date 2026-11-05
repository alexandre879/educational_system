import { SymbolView } from "expo-symbols";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";

// One name per concept, mapped to SF Symbols (iOS) and Material Symbols (Android).
export const ICONS = {
  home: { ios: "house.fill", android: "home" },
  exams: { ios: "doc.text.fill", android: "quiz" },
  attendance: { ios: "checklist", android: "fact_check" },
  schedule: { ios: "calendar", android: "calendar_month" },
  exercises: { ios: "book.fill", android: "menu_book" },
  announcements: { ios: "megaphone.fill", android: "campaign" },
  more: { ios: "ellipsis.circle.fill", android: "more_horiz" },
  books: { ios: "books.vertical.fill", android: "library_books" },
  leaderboard: { ios: "trophy.fill", android: "emoji_events" },
  assistant: { ios: "sparkles", android: "auto_awesome" },
  profile: { ios: "person.crop.circle.fill", android: "account_circle" },
  settings: { ios: "gearshape.fill", android: "settings" },
  signOut: { ios: "rectangle.portrait.and.arrow.right", android: "logout" },
  chevronRight: { ios: "chevron.right", android: "chevron_right" },
  chevronLeft: { ios: "chevron.left", android: "chevron_left" },
  check: { ios: "checkmark.circle.fill", android: "check_circle" },
  cross: { ios: "xmark.circle.fill", android: "cancel" },
  add: { ios: "plus", android: "add" },
  send: { ios: "arrow.up.circle.fill", android: "send" },
  comment: { ios: "bubble.left.fill", android: "chat_bubble" },
  timer: { ios: "timer", android: "timer" },
  star: { ios: "star.fill", android: "star" },
  camera: { ios: "camera.fill", android: "photo_camera" },
  language: { ios: "globe", android: "language" },
  appearance: { ios: "circle.lefthalf.filled", android: "contrast" },
  bell: { ios: "bell.fill", android: "notifications" },
  clock: { ios: "clock", android: "schedule" },
  location: { ios: "mappin.and.ellipse", android: "location_on" },
  person: { ios: "person.fill", android: "person" },
  school: { ios: "graduationcap.fill", android: "school" },
  warning: { ios: "exclamationmark.triangle.fill", android: "warning" },
  offline: { ios: "wifi.slash", android: "wifi_off" },
  inbox: { ios: "tray", android: "inbox" },
  close: { ios: "xmark", android: "close" },
  pdf: { ios: "doc.richtext", android: "picture_as_pdf" },
  telegram: { ios: "paperplane.fill", android: "send" },
  calendar: { ios: "calendar.badge.clock", android: "event" },
  marks: { ios: "star.circle.fill", android: "stars" },
  gradebook: { ios: "tablecells.fill", android: "table_view" },
  search: { ios: "magnifyingglass", android: "search" },
  flame: { ios: "flame.fill", android: "local_fire_department" },
  results: { ios: "chart.bar.fill", android: "bar_chart" },
  lock: { ios: "lock.fill", android: "lock" },
  biometrics: { ios: "faceid", android: "fingerprint" },
  trash: { ios: "trash", android: "delete" },
  circle: { ios: "circle", android: "radio_button_unchecked" },
  checkmark: { ios: "checkmark", android: "check" },
  minus: { ios: "minus", android: "remove" },
  reply: { ios: "arrowshape.turn.up.left.fill", android: "reply" },
  edit: { ios: "pencil", android: "edit" },
  copy: { ios: "doc.on.doc", android: "content_copy" },
  arrowDown: { ios: "arrow.down", android: "arrow_downward" },
  blocked: { ios: "nosign", android: "block" },
  eye: { ios: "eye.fill", android: "visibility" },
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 22, color, style }: IconProps) {
  return (
    <SymbolView
      // The web build uses the same Material Symbols as Android.
      name={{ ...ICONS[name], web: ICONS[name].android }}
      size={size}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
    />
  );
}
