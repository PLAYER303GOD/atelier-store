import { EditorialStory } from "@/components/home/editorial-story";
import { FeaturedCollections } from "@/components/home/featured-collections";
import { Hero } from "@/components/home/hero";
import { NewArrivals } from "@/components/home/new-arrivals";
import { Services } from "@/components/home/services";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedCollections />
      <NewArrivals />
      <EditorialStory />
      <Services />
    </>
  );
}
