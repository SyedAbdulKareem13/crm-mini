/**
 * App-shell page transition: templates re-mount on every navigation, so each
 * page enters with a soft fade-and-rise (CSS-only; disabled for reduced motion).
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="mz-page">{children}</div>;
}
