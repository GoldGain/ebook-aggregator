import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import BookDetail from "./pages/BookDetail";
import Bookshelf from "./pages/Bookshelf";
import Admin from "./pages/Admin";
import DownloadHistory from "./pages/DownloadHistory";
import Import from "./pages/Import";
import Search from "./pages/Search";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/catalog"} component={Catalog} />
      <Route path={"/book/:id"} component={BookDetail} />
      <Route path={"/bookshelf"} component={Bookshelf} />
      <Route path={"/downloads"} component={DownloadHistory} />
      <Route path={"/import"} component={Import} />
      <Route path={"/search"} component={Search} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - Dark theme is set as default for neon-noir aesthetic
// - Color palette is defined in index.css with CSS variables
// - Theme is not switchable for this design

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
