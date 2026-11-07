import { HomeView } from "@/components/site/HomeView";

// The view /?coleccion=escolar is rewritten to (next.config.ts), so it is prerendered
// and cached like the home page. Visitors never see this address.
export default function Page() {
  return <HomeView collection="escolar" />;
}
