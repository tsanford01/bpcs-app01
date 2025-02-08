import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  Map,
  Star,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/appointments", icon: Calendar, label: "Appointments" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/routes", icon: Map, label: "Routes" },
  { href: "/reviews", icon: Star, label: "Reviews" }
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar border-r">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center h-16 px-4 border-b">
          <h1 className="text-xl font-semibold text-sidebar-foreground">
            Beckham Pest Control
          </h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name}
              </p>
              <p className="text-sm text-sidebar-foreground/60 truncate">
                {user?.username}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}