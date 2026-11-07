import { HomeView } from "@/components/site/HomeView";

// Prerendered, with the catalog read from the cache (spec 002, 2026-11-06
// amendment, criteria 97 to 99); the panel refreshes it on every save. The
// collection views are app/colecciones/*, see components/site/HomeView.tsx.
export default function Home() {
  return <HomeView collection={null} />;
}
