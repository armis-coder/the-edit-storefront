"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { LightField } from "./components/light-field";
import { ProductCard } from "./components/product-card";
import { ProductMedia } from "./components/product-media";
import { StoreFooter } from "./components/store-footer";
import { StoreHeader } from "./components/store-header";
import type { Collection, Product } from "@/lib/commerce/types";

const standards = [
  { number: "01", title: "Curated, not crowded", body: "Every object has to justify its place through function, construction, character or uncommon value." },
  { number: "02", title: "Sellers are screened", body: "We compare listings, inspect seller history and remove products that do not meet the stated standard." },
  { number: "03", title: "The details stay clear", body: "Materials, dimensions, fulfilment route and caveats are presented plainly before you commit." },
];

type HomeClientProps = {
  categories: Collection[];
  products: Product[];
};

export function HomeClient({ categories, products }: HomeClientProps) {
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);

  async function submitNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubscribeBusy(true); setSubscribeError("");
    try {
      const response = await fetch("/api/store/subscribe",{ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), consent: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSubscribed(true);
    } catch(error) { setSubscribeError((error as Error).message); }
    finally { setSubscribeBusy(false); }
  }

  return (
    <main>
      <StoreHeader />

      <section id="top" className="atelier-hero" aria-label="The Edit introduction">
        <div className="atelier-hero-top"><span>INDEPENDENT CURATION</span><span>LAHORE, PK / EST. 2026</span></div>
        <LightField paused={motionPaused} />
        <div className="atelier-hero-copy">
          <p className="eyebrow">Objects with intent.</p>
          <h1>Built to<br /><span>be kept.</span></h1>
          <p className="atelier-description">Considered gear. Distinctive objects.<br />A better edit of the everyday.</p>
          <div className="atelier-actions">
            <Link className="button button-primary" href="/collections/current-edit">Explore the edit</Link>
            <a className="text-link" href="#standard">Our point of view</a>
          </div>
        </div>
        <aside className="atelier-hero-note" aria-label="Our selection principles">
          <p className="eyebrow">THE SELECTION STANDARD</p>
          <h2>Fewer things.<br />More considered.</h2>
          <div><span>01</span>Purpose</div><div><span>02</span>Construction</div><div><span>03</span>Value</div>
          <a className="text-link" href="#standard">Why it makes the edit</a>
        </aside>
        <div className="atelier-hero-bottom">
          <span>TOOLS / ACCESSORIES / COLLECTOR OBJECTS</span>
          <button className="motion-toggle" type="button" aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)}>
            {motionPaused ? "Resume motion" : "Pause motion"}<i className={motionPaused ? "is-paused" : ""} aria-hidden="true" />
          </button>
          <a href="#categories">Discover the collection</a>
        </div>
      </section>

      <section id="categories" className="section categories-section">
        <div className="section-heading">
          <div><p className="eyebrow">Browse by collection</p><h2>Start with what<br />you carry.</h2></div>
          <p>Fewer options. Better finds. Each collection is edited around usefulness, material quality and visual character.</p>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <Link
              className="category-card"
              href={`/collections/${category.handle}`}
              key={category.id}
            >
              <div className="category-image">
                <ProductMedia image={category.image} />
              </div>
              <div className="category-meta">
                <span>{category.index}</span>
                <div>
                  <h3>{category.title}</h3>
                  <p>{category.note}</p>
                </div>

              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="shop" className="section products-section">
        <div className="products-heading">
          <div>
            <p className="eyebrow"><span>Edition 001</span> / The selection</p>
            <h2>The current edit.</h2>
          </div>
          <div className="products-heading-aside">
            <p>Useful tools, quiet accessories and pieces with a point of view. Each one earns its place.</p>
            <Link className="text-link" href="/collections/current-edit">View the full collection</Link>
          </div>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </section>

      <section className="collector-feature">
        <div className="collector-image" role="img" aria-label="A considered selection of men's carry objects" />
        <div className="collector-copy">
          <p className="eyebrow"><span>The collector&apos;s cut</span> / Vol. 01</p>
          <h2>Restraint is part<br />of the standard.</h2>
          <p>A good collection is not built by buying everything. It is built by finding the few objects that earn their place—through utility, material, story or presence.</p>
          <ul>
            <li><span>01</span>Purpose before novelty</li>
            <li><span>02</span>Materials explained plainly</li>
            <li><span>03</span>Value judged in local context</li>
          </ul>
          <a className="button button-outline" href="#standard">Read our standard </a>
        </div>
      </section>

      <section id="standard" className="section standard-section">
        <div className="standard-intro">
          <p className="eyebrow"><span>The advantage</span> / Curation</p>
          <h2>We do the digging.<br /><em>You get the find.</em></h2>
          <p>Interesting products are easy to list. Good products at a fair landed price are harder to find. That research is the product behind the product.</p>
        </div>
        <div className="standards-grid">
          {standards.map((standard) => (
            <article key={standard.number}>
              <span>{standard.number}</span>
              <h3>{standard.title}</h3>
              <p>{standard.body}</p>
            </article>
          ))}
        </div>
        <div className="process-strip" aria-label="Curation process">
          {[
            ["Discover", "Interesting object"],
            ["Compare", "Price and source"],
            ["Screen", "Quality and seller"],
            ["Present", "Clear buying context"],
          ].map(([step, detail], index) => <div key={step}><span>0{index + 1}</span><strong>{step}</strong><small>{detail}</small></div>)}
        </div>
      </section>

      <section id="journal" className="section journal-section">
        <div className="journal-heading">
          <div><p className="eyebrow">Journal / Field notes</p><h2>Buy with context.</h2></div>
          <p>Guides, comparisons and object stories make the curation useful before—and after—the purchase.</p>
        </div>
        <div className="journal-grid">
          <article className="journal-card journal-feature">
            <div className="journal-content"><span>EDC 101 · 6 min read</span><h3>What actually belongs in a first everyday carry?</h3><a href="#journal">Read field note </a></div>
          </article>
          <article className="journal-card journal-small journal-care">
            <div className="journal-content"><span>Care guide · 4 min read</span><h3>Keeping steel clean in Lahore humidity.</h3><a href="#journal">Read guide </a></div>
          </article>
          <article className="journal-card journal-small journal-value">
            <div className="journal-content"><span>Behind the edit · 3 min read</span><h3>How we judge value beyond the listing price.</h3><a href="#journal">Our method </a></div>
          </article>
        </div>

        <div className="social-heading">
          <div><span>@THEEDIT.PK</span><h3>Objects in use. Details up close.</h3></div>
          <a className="text-link" href="#newsletter">Follow the collection</a>
        </div>
        <div className="social-grid" aria-label="Representative social content">
          <div className="social-tile social-hero"><span>FIELD / 01</span></div>
          <div className="social-tile product-sprite sprite-1"><span>DETAIL / 02</span></div>
          <div className="social-tile product-sprite sprite-4"><span>OBJECT / 03</span></div>
          <div className="social-tile product-sprite sprite-5"><span>CARRY / 04</span></div>
        </div>
      </section>

      <section id="newsletter" className="newsletter-section">
        <p className="eyebrow"><span>Private list</span> / No clutter</p>
        <h2>Get the next drop.</h2>
        <p>New finds, field notes and limited restocks. Sent only when there is something worth opening.</p>
        {subscribed ? (
          <div className="subscribe-success" role="status">You’re on the list. We’ll be in touch when the next edit is ready.</div>
        ) : (
          <form onSubmit={submitNewsletter}>
            <label className="sr-only" htmlFor="newsletter-email">Email address</label>
            <input id="newsletter-email" name="email" type="email" placeholder="YOUR EMAIL ADDRESS" required />
            <button type="submit" disabled={subscribeBusy}>{subscribeBusy ? "Joining…" : "Join the list"}</button>
          </form>
        )}
        {subscribeError && <p role="alert">{subscribeError}</p>}
        <small>By joining, you agree to receive collection updates. <Link href="/policies/privacy">Privacy policy</Link>.</small>
      </section>

      <StoreFooter />
    </main>
  );
}
