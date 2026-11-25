import { Link, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { type Product } from "@/data/catalog";
import { useCategories } from "@/hooks/useCategories";
import { useAbode } from "@/hooks/useAbode";
import { useCommission } from "@/hooks/useCommission";
import { useShopEyebrow } from "@/hooks/useShopEyebrow";
import { useProducts, useProductsQuery } from "@/hooks/useProducts";
import { useCategoriesQuery } from "@/hooks/useCategories";
import { useSeo } from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import type { StoreOutletContext } from "@/layouts/StoreLayout";

const sorts = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "New" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
] as const;

function sortProducts(list: Product[], sort: string) {
  const next = [...list];
  if (sort === "price-asc") return next.sort((a, b) => a.priceFils - b.priceFils);
  if (sort === "price-desc") return next.sort((a, b) => b.priceFils - a.priceFils);
  if (sort === "newest") return next.sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
  return next.sort((a, b) => Number(Boolean(b.isBestseller)) - Number(Boolean(a.isBestseller)) || a.name.localeCompare(b.name));
}

export function ShopPage({ mode = "all" }: { mode?: "all" | "new" | "collection" | "index" }) {
  const { openQuickView } = useOutletContext<StoreOutletContext>();
  const productsQuery = useProductsQuery();
  const categoriesQuery = useCategoriesQuery();
  const catalog = useProducts();
  const published = useCategories();
  const commission = useCommission();
  const abode = useAbode();
  const shopEyebrow = useShopEyebrow();
  const bespoke = published.find((item) => item.slug === "bespoke-designs");
  const { slug = "" } = useParams();
  const collection = published.find((item) => item.slug === slug);

  const title =
    mode === "new"
      ? "New arrivals"
      : mode === "index"
        ? "Collections"
        : collection
          ? collection.name
          : "Shop";

  useSeo(`${title} — PERIS`, "Browse the PERIS edit of abayas. Sample pieces until the house archive is published.");

  const [params, setParams] = useSearchParams();
  const color = params.get("color") ?? "";
  const sort = params.get("sort") ?? "featured";

  const scoped =
    mode === "new"
      ? catalog.filter((product) => product.isNew)
      : mode === "collection"
        ? collection
          ? catalog.filter((product) => product.collection === collection.slug)
          : []
        : mode === "index"
          ? []
          : catalog;

  const colors = [...new Map(scoped.flatMap((product) => product.colors).map((item) => [item.name, item])).values()];
  const list = sortProducts(
    color ? scoped.filter((product) => product.colors.some((item) => item.name === color)) : scoped,
    sort,
  );

  function setFilter(key: "color" | "sort", value: string) {
    const next = new URLSearchParams(params);
    if (!value || (key === "sort" && value === "featured")) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <header className="page-intro">
        <p className="eyebrow">{mode === "index" ? abode : shopEyebrow}</p>
        <h1>{title}</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          {collection
            ? collection.description
            : mode === "new"
              ? "The latest sample to enter the edit."
              : "A short sample edit, photographed as studies until PERIS publishes its own archive. Prices are placeholders."}
        </p>
      </header>
      {mode === "index" ? (
        <div className="collection-grid" style={{ minHeight: 0 }}>
          {published
            .filter((item) => item.image)
            .map((item) => (
              <Link key={item.slug} to={`/collections/${item.slug}`} className="collection-tile">
                <img src={item.image} alt="" style={{ objectPosition: item.position }} />
                <div className="collection-copy">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
              </Link>
            ))}
          {bespoke ? (
            <Link to="/bespoke" className="collection-tile collection-bespoke">
              <p className="eyebrow">{commission}</p>
              <h3>{bespoke.name}</h3>
              <p>{bespoke.description}</p>
            </Link>
          ) : null}
        </div>
      ) : mode === "collection" && !collection ? (
        <p>
          That collection is not in this edit. <Link to="/collections">View collections</Link>
        </p>
      ) : (
        <>
          <div className="shop-tools">
            <div className="shop-filters" role="group" aria-label="Color">
              <button type="button" aria-pressed={color === ""} onClick={() => setFilter("color", "")}>
                All colors
              </button>
              {colors.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  aria-pressed={color === item.name}
                  onClick={() => setFilter("color", item.name)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <label className="shop-sort">
              Sort
              <select value={sorts.some((item) => item.value === sort) ? sort : "featured"} onChange={(event) => setFilter("sort", event.target.value)}>
                {sorts.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {productsQuery.isPending || categoriesQuery.isPending ? (
            <p className="shop-empty">Opening the edit.</p>
          ) : list.length === 0 ? (
            <p className="shop-empty">
              {productsQuery.isError
                ? "The atelier catalog could not be opened."
                : "Nothing in this edit matches that selection."}
            </p>
          ) : null}
          <div className="product-grid">
            {list.map((product) => (
              <ProductCard key={product.id} product={product} onQuickView={openQuickView} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
