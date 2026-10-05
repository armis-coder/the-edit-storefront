import { HomeClient } from "./home-client";
import { getCommerceProvider } from "@/lib/commerce/provider";

export default async function Home() {
  const commerce = getCommerceProvider();
  const [products, collections] = await Promise.all([
    commerce.getProducts({ collectionHandle: "current-edit", first: 6 }),
    commerce.getCollections(),
  ]);
  const featuredCollections = collections.filter((collection) =>
    [
      "everyday-carry",
      "time-and-carry",
      "collector-masks",
      "blades-and-tools",
    ].includes(collection.handle),
  );

  return <HomeClient categories={featuredCollections} products={products} />;
}
