"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "../components/icons";

export function SearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  return (
    <form className="catalogue-search" onSubmit={submit}>
      <label htmlFor="catalogue-search">Search the collection</label>
      <div>
        <input
          id="catalogue-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Object, material or purpose"
          autoComplete="off"
        />
        <button type="submit" aria-label="Search">
          <Icon name="search" />
        </button>
      </div>
    </form>
  );
}
