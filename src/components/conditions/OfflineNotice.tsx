export function OfflineNotice() {
  return (
    <div className="offline-notice" role="status">
      <span aria-hidden="true">△</span>
      <p>
        <strong>You’re offline.</strong> Showing saved conditions where
        available; refresh after the connection returns.
      </p>
    </div>
  );
}
