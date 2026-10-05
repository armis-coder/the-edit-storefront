export default function CollectionLoading() {
  return (
    <main className="commerce-loading" aria-label="Loading collection">
      <div className="loading-header" />
      <div className="loading-collection-hero">
        <div className="loading-line short" />
        <div className="loading-line title" />
        <div className="loading-line" />
      </div>
      <div className="loading-card-grid">
        {[0, 1, 2].map((item) => (
          <div className="loading-block loading-card" key={item} />
        ))}
      </div>
      <span className="sr-only">Loading collection</span>
    </main>
  );
}
