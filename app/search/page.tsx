import type { Metadata } from "next";
import Link from "next/link";

import { CollectionBrowser } from "@/app/commerce/collection-browser";
import { SearchForm } from "@/app/commerce/search-form";
import { StoreFooter } from "@/app/components/store-footer";
import { StoreHeader } from "@/app/components/store-header";
import { getCommerceProvider } from "@/lib/commerce/provider";

export const metadata: Metadata = {
  title: "Search the collection | The Edit",
  description: "Search The Edit’s curated representative collection.",
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] : params.q ?? "";
  const products = await getCommerceProvider().getProducts({
    query,
    first: 48,
  });

  return (
    <main className="commerce-page search-page">
      <StoreHeader />
      <section className="search-hero">
        <nav className="breadcrumbs breadcrumbs-on-dark" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span aria-current="page">Search</span>
        </nav>
        <p className="eyebrow">
          <span>Catalogue search</span> / Purpose, material, object
        </p>
        <h1>{query ? `Results for “${query}”` : "Find an object."}</h1>
        <SearchForm key={query} initialQuery={query} />
      </section>
      <section className="section collection-catalogue search-results">
        {query && products.length === 0 ? (
          <div className="commerce-empty-state search-empty">
            <span>NO OBJECTS FOUND</span>
            <h2>Try a broader term.</h2>
            <p>
              Search by object, material or purpose—for example wallet, steel or
              everyday carry.
            </p>
            <Link className="empty-browse-link" href="/collections/current-edit">Browse all objects</Link>
          </div>
        ) : (
          <CollectionBrowser key={query} products={products} />
        )}
      </section>
      <StoreFooter />
    </main>
  );
}
