import { useOutletContext, useSearchParams } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useSearchEyebrow } from "@/hooks/useSearchEyebrow";
import { useSeo } from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import type { StoreOutletContext } from "@/layouts/StoreLayout";

export function SearchPage() {
  const searchEyebrow = useSearchEyebrow();
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const catalog = useProducts();
  const needle = query.trim().toLowerCase();
  const results = needle
    ? catalog.filter((product) =>
        [product.name, product.sku, product.fabric, product.description, product.collection].join(" ").toLowerCase().includes(needle),
      )
    : catalog;
  const { openQuickView } = useOutletContext<StoreOutletContext>();
  useSeo(`Search — PERIS`);

  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <header className="page-intro">
        <p className="eyebrow">{searchEyebrow}</p>
        <h1>{query ? `Results for “${query}”` : "Search the edit"}</h1>
      </header>
      {results.length === 0 ? (
        <p className="lede">Nothing in the sample edit matches that search.</p>
      ) : (
        <div className="product-grid">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} onQuickView={openQuickView} />
          ))}
        </div>
      )}
    </div>
  );
}
