"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useCart } from "@/app/commerce/cart-context";
import { useModalDialog } from "@/app/commerce/use-modal-dialog";

import { Icon } from "./icons";

const navigation = [
  ["Shop the edit", "/collections/current-edit"],
  ["Collections", "/#categories"],
  ["Our standard", "/#standard"],
  ["Field notes", "/#journal"],
] as const;

export function StoreHeader() {
  const router = useRouter();
  const { itemCount, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const menuRef = useModalDialog(menuOpen);
  const searchRef = useModalDialog(searchOpen);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("q") ?? "").trim();
    setSearchOpen(false);
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <>
      <div className="announcement">
        <p>Curated in Lahore. Designed for nationwide delivery.</p>
        <span>New objects added in considered drops</span>
      </div>

      <header className="site-header">
        <button
          className="icon-button mobile-menu-button"
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          aria-controls="store-navigation"
          onClick={() => setMenuOpen(true)}
          type="button"
        >
          <Icon name="menu" />
        </button>
        <Link className="wordmark" href="/#top" aria-label="The Edit home">
          <span>THE / EDIT</span>

        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link key={label} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Search"
            aria-haspopup="dialog"
            onClick={() => setSearchOpen(true)}
            type="button"
          >
            <Icon name="search" />
          </button>
          <button
            className="bag-button"
            aria-label={`Shopping bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            onClick={openCart}
            type="button"
          >
            <Icon name="bag" />
            <span>{itemCount}</span>
          </button>
        </div>
      </header>

      <dialog
        ref={menuRef}
        id="store-navigation"
        className={`mobile-drawer ${menuOpen ? "is-open" : ""}`}
        aria-label="Navigation"
        onCancel={() => setMenuOpen(false)}
      >
        <button
          className="drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          type="button"
          tabIndex={-1}
        />
        <div className="drawer-panel">
          <div className="drawer-top">
            <span>THE / EDIT</span>
            <button
              className="icon-button"
              aria-label="Close navigation"
              onClick={() => setMenuOpen(false)}
              type="button"
              data-dialog-focus
            >
              <Icon name="close" />
            </button>
          </div>
          <nav>
            <Link href="/search" className="drawer-search" onClick={() => setMenuOpen(false)}>
              <Icon name="search" /> Search the collection
            </Link>
            {navigation.map(([label, href], index) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
              >
                <span>0{index + 1}</span>
                {label}

              </Link>
            ))}
          </nav>
          <p>
            Curated in Lahore.
            <br />
            Objects worth keeping.
          </p>
        </div>
      </dialog>

      <dialog
        ref={searchRef}
        className={`search-overlay ${searchOpen ? "is-open" : ""}`}
        aria-label="Search the collection"
        onCancel={() => setSearchOpen(false)}
      >
        <div className="search-top">
          <span>SEARCH THE EDIT</span>
          <button
            className="icon-button"
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>
        <form onSubmit={submitSearch}>
          <label htmlFor="site-search">What are you looking for?</label>
          <div>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder="Knife, mask, wallet..."
              autoComplete="off"
              data-dialog-focus
            />
            <button aria-label="Submit search" type="submit">
              <Icon name="search" />
            </button>
          </div>
        </form>
        <div className="search-suggestions">
          <span>Explore an edit</span>
          <Link href="/collections/everyday-carry" onClick={() => setSearchOpen(false)}>Everyday carry</Link>
          <Link href="/collections/collector-masks" onClick={() => setSearchOpen(false)}>Collector objects</Link>
          <Link href="/collections/under-3000" onClick={() => setSearchOpen(false)}>Under PKR 3,000</Link>
        </div>
      </dialog>
    </>
  );
}
