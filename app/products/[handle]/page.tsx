import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductPurchasePanel } from "@/app/commerce/product-purchase-panel";
import { ProductCard } from "@/app/components/product-card";
import { ProductMedia } from "@/app/components/product-media";
import { StoreFooter } from "@/app/components/store-footer";
import { StoreHeader } from "@/app/components/store-header";
import { getCommerceProvider } from "@/lib/commerce/provider";
export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = await getCommerceProvider().getProduct(handle);
  if (!product) return { title: "Object not found | The Edit" };

  return {
    title: product.seo.title,
    description: product.seo.description,
    openGraph: {
      title: product.seo.title,
      description: product.seo.description,
      images: product.featuredImage.crop
        ? []
        : [{ url: product.featuredImage.url, alt: product.featuredImage.altText }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.seo.title,
      description: product.seo.description,
      images: product.featuredImage.crop ? [] : [product.featuredImage.url],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;
  const commerce = getCommerceProvider();
  const product = await commerce.getProduct(handle);
  if (!product) notFound();

  const related = (await commerce.getProducts({ first: 8 }))
    .filter((candidate) => candidate.handle !== product.handle)
    .filter((candidate) =>
      candidate.collectionHandles.some((collection) =>
        product.collectionHandles.includes(collection),
      ),
    )
    .slice(0, 3);
  const collectionHandle =
    product.collectionHandles.find((collection) => collection !== "current-edit") ??
    "current-edit";
  const galleryImages = product.images.filter((image, index, images) =>
    images.findIndex((candidate) => candidate.url === image.url && candidate.crop === image.crop) === index,
  );
  const isMock = commerce.name === "mock";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.featuredImage.crop ? undefined : product.images.map((image) => image.url),
    sku: product.variants[0]?.id,
    brand: { "@type": "Brand", name: product.vendor },
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      priceCurrency: variant.price.currencyCode,
      price: variant.price.amount,
      availability: variant.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    })),
  };

  return (
    <main className="commerce-page">
      <StoreHeader />
      {!isMock && <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />}

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href={`/collections/${collectionHandle}`}>Collection</Link>
        <span>/</span>
        <span aria-current="page">{product.title}</span>
      </nav>

      <section className="product-detail">
        <div className="product-gallery">
          <div className="product-detail-media">
            {galleryImages.map((image, index) => (
              <ProductMedia key={`${image.url}-${index}`} image={image} eager={index === 0} />
            ))}
          </div>
          <p className="product-image-caption"><span>THE / EDIT — OBJECT STUDY</span>{isMock ? "Representative imagery" : product.productType}</p>
          <div className="product-curator-note">
            <span>AT A GLANCE</span>
            <p>{product.editorial.dimensions}</p>
          </div>
        </div>

        <div className="product-detail-copy">
          <p className="eyebrow">
            <span>The current edit</span> / {product.productType}
          </p>
          {product.badge && <span className="detail-badge">{product.badge}</span>}
          <h1>{product.title}</h1>
          <p className="product-intro">{product.description}</p>
          <ProductPurchasePanel key={product.id} product={product} isMock={isMock} />
        </div>
      </section>

      <section className="product-standard" id="object-notes">
        <div className="product-standard-heading">
          <p className="eyebrow">
            <span>Object notes</span> / Before you commit
          </p>
          <h2>The details stay clear.</h2>
        </div>
        <div className="product-facts">
          <article>
            <span>01 / WHY IT MADE THE EDIT</span>
            <h3>Selected with a reason.</h3>
            <p>{product.editorial.curationNote}</p>
          </article>
          <article>
            <span>02 / CONSTRUCTION</span>
            <h3>What it is made from.</h3>
            <ul>
              {product.editorial.materials.map((material) => (
                <li key={material}>{material}</li>
              ))}
              <li>{product.editorial.dimensions}</li>
            </ul>
          </article>
          <article>
            <span>03 / BUYING CONTEXT</span>
            <h3>What to expect.</h3>
            <p>{product.editorial.dispatchEstimate}</p>
            {product.editorial.caveats.map((caveat) => (
              <p key={caveat}>{caveat}</p>
            ))}
          </article>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section related-section">
          <div className="related-heading">
            <div>
              <p className="eyebrow">Continue the collection</p>
              <h2>Objects with similar intent.</h2>
            </div>
            <Link className="text-link" href="/collections/current-edit">
              View the full edit
            </Link>
          </div>
          <div className="product-grid related-grid">
            {related.map((candidate) => (
              <ProductCard key={candidate.id} product={candidate} />
            ))}
          </div>
        </section>
      )}

      <StoreFooter />
    </main>
  );
}
