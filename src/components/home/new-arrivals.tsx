import { ProductCard } from "@/components/product/product-card";
import { ProductGrid } from "@/components/ui/product-grid";
import { SectionHeader } from "@/components/ui/section-header";
import { TextLink } from "@/components/ui/text-link";
import { getNewArrivals } from "@/lib/products";

export async function NewArrivals() {
  const newArrivals = await getNewArrivals();
  return (
    <section aria-labelledby="new-arrivals-title" className="container-page pb-section">
      <SectionHeader
        id="new-arrivals-title"
        eyebrow="Just in"
        title="New arrivals"
        action={
          <TextLink href="/new-in" variant="cta">
            View all
          </TextLink>
        }
      />
      <ProductGrid layout="feature">
        {newArrivals.map((product) => (
          <li key={product.slug}>
            <ProductCard product={product} />
          </li>
        ))}
      </ProductGrid>
    </section>
  );
}
