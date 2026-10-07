// The <html>/<body> shell lives in app/[locale]/layout.tsx so it can set `lang`.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
