/** Signed-in principal lacks the Users Action for this URL. The URL stays. */
export function UnauthorizedEmpty() {
  return (
    <div className="content-area" data-testid="unauthorized-empty">
      <h1 className="heading-page">Unauthorized</h1>
      <p className="text-body">You do not have access to this page.</p>
    </div>
  );
}
