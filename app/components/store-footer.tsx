import Link from "next/link";

export function StoreFooter() {
  return (
    <footer>
      <div className="footer-main">
        <Link className="footer-mark" href="/#top">
          <span>THE / EDIT</span>
          <small>CURATED MEN&apos;S GOODS</small>
        </Link>
        <div className="footer-links">
          <div>
            <span>Shop</span>
            <Link href="/collections/current-edit">New arrivals</Link>
            <Link href="/#categories">Collections</Link>
            <Link href="/collections/under-3000">Objects under PKR 3,000</Link>
          </div>
          <div>
            <span>Read</span>
            <Link href="/#standard">Our standard</Link>
            <Link href="/#journal">Field notes</Link>
            <Link href="/#journal">Care guides</Link>
          </div>
          <div>
            <span>Help</span>
            <Link href="/policies/delivery">Delivery</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/policies/returns">Returns & refunds</Link>
            <Link href="/policies/privacy">Privacy</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          Objects chosen for purpose, construction and value. Read each
          product’s dispatch details and our delivery policy before ordering.
        </p>
        <span>© 2026 / THE EDIT</span>
      </div>
    </footer>
  );
}
