import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollectionBrowser } from "@/app/commerce/collection-browser";
import { ProductMedia } from "@/app/components/product-media";
import { StoreFooter } from "@/app/components/store-footer";
import { StoreHeader } from "@/app/components/store-header";
import { getCommerceProvider } from "@/lib/commerce/provider";
export const dynamic = "force-dynamic";

type CollectionPageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params;
  const collection = await getCommerceProvider().getCollection(handle);
  if (!collection) return { title: "Collection not found | The Edit" };

  return {
    title: `${collection.title} | The Edit`,
    description: collection.description,
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { handle } = await params;
  const commerce = getCommerceProvider();
  const [collection, collections] = await Promise.all([
    commerce.getCollection(handle),
    commerce.getCollections(),
  ]);
  if (!collection) notFound();

  return (
    <main className="commerce-page">
      <StoreHeader />
      <section className="collection-hero">
        <nav className="breadcrumbs breadcrumbs-on-dark" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span aria-current="page">Collections</span>
        </nav>
        <div className="collection-hero-index">{collection.index}</div>
        <div className="collection-hero-copy">
          <p className="eyebrow">
            <span>Curated collection</span> / {collection.note}
          </p>
          <h1>{collection.title}</h1>
          <p>{collection.description}</p>
        </div>
        <div className="collection-hero-image">
          <ProductMedia image={collection.image} eager />
        </div>
      </section>

      <section className="section collection-catalogue">
        <nav className="collection-tabs" aria-label="Shop collections">
          {collections.map((item) => (
            <Link key={item.id} href={`/collections/${item.handle}`} aria-current={item.handle === handle ? "page" : undefined}>
              {item.handle === "current-edit" ? "All objects" : item.title}
            </Link>
          ))}
        </nav>
        <CollectionBrowser key={handle} products={collection.products} />
      </section>
      <StoreFooter />
    </main>
  );
}
