import type { MenuProps } from "antd";
import { SearchKind } from "./interface";
import { DefaultOptionType } from "rc-select/lib/Select";


export const getDropdownItems = (t: (key: string) => string): MenuProps["items"] => [
  { key: "profile", label: t("menu.profile") },
  { key: "logout", danger: true, label: t("menu.logout") }
];



export type SearchAutoOption = DefaultOptionType & {
  kind: SearchKind;
  id: number;
};