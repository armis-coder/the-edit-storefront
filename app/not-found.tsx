import Link from "next/link";

import { StoreFooter } from "./components/store-footer";
import { StoreHeader } from "./components/store-header";

export default function NotFound() {
  return (
    <main className="commerce-page">
      <StoreHeader />
      <section className="commerce-message-page">
        <span>404 / NOT IN THE EDIT</span>
        <h1>This object isn&apos;t here.</h1>
        <p>
          It may have left the collection, changed its handle or never made the
          final cut.
        </p>
        <Link href="/collections/current-edit">
          Return to the current edit
        </Link>
      </section>
      <StoreFooter />
    </main>
  );
}
