export default function ProductLoading() {
  return (
    <main className="commerce-loading" aria-label="Loading object">
      <div className="loading-header" />
      <div className="loading-product-grid">
        <div className="loading-block loading-media" />
        <div className="loading-copy">
          <div className="loading-line short" />
          <div className="loading-line title" />
          <div className="loading-line" />
          <div className="loading-line" />
          <div className="loading-block loading-action" />
        </div>
      </div>
      <span className="sr-only">Loading product details</span>
    </main>
  );
}
