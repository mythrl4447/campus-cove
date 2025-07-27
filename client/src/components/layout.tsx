// layout wrapper

import { useAuth } from "@/hooks/use-auth";
import Navigation from "./navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuth();

  // show plain layout for non-auth users
  if (!isAuthenticated) {
    return <div className="min-h-screen campus-bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen campus-bg-gray-50">
      <Navigation />
      <main>{children}</main>
    </div>
  );
}
