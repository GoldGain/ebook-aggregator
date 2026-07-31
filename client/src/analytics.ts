const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim().replace(/\/$/, "");
const analyticsWebsiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID?.trim();

if (analyticsEndpoint && analyticsWebsiteId && typeof document !== "undefined") {
  const script = document.createElement("script");
  script.defer = true;
  script.src = `${analyticsEndpoint}/umami`;
  script.dataset.websiteId = analyticsWebsiteId;
  document.head.appendChild(script);
}
