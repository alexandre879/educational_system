// export const dropdownItems = [
//   { key: "profile", label: "PROFILE" },
//   { key: "logout", danger: true, label: "LOG OUT" },
//   ];


import type { MenuProps } from "antd";

export const getDropdownItems = (t: (key: string) => string): MenuProps["items"] => [
  { key: "profile", label: t("menu.profile") },
  { key: "logout", danger: true, label: t("menu.logout") }
];