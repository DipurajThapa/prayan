import { Seo } from "@/components/brand/Seo";
import { BrandButton } from "@/components/brand/BrandButton";

export default function NotFound() {
  return (
    <section className="container-x flex min-h-[60vh] flex-col items-start justify-center py-20" data-testid="not-found">
      <Seo title="Page not found" path="/404" description="The page you are looking for does not exist." noindex />
      <p className="eyebrow mb-4">404</p>
      <h1 className="font-display text-4xl font-extrabold text-midnight sm:text-5xl">We could not find that page.</h1>
      <p className="lead mt-4 max-w-lg">The link may be out of date. You can explore properties or head back to the homepage.</p>
      <div className="mt-8 flex gap-3">
        <BrandButton to="/properties" data-testid="notfound-explore-btn">Explore Properties</BrandButton>
        <BrandButton to="/" variant="secondary" data-testid="notfound-home-btn">Back to Home</BrandButton>
      </div>
    </section>
  );
}
