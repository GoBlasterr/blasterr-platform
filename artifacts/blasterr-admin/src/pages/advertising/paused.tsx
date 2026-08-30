import FilteredAdsPage from "./filtered-ads";

export default function PausedAdsPage() {
  return <FilteredAdsPage status="paused" title="Paused Ads" description="Ads that have been paused manually or by budget limits." />;
}
