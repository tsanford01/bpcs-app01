import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  Map,
  Star,
  Menu
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/appointments", icon: Calendar, label: "Appointments" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/routes", icon: Map, label: "Routes" },
  { href: "/reviews", icon: Star, label: "Reviews" }
];

export default function MobileNav() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-background">
      <div className="grid grid-cols-5 gap-1">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex flex-col items-center justify-center py-2",
                  location === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </a>
            </Link>
          )}
        )}
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-full">
              <div className="flex flex-col items-center justify-center">
                <Menu className="w-5 h-5" />
                <span className="text-xs mt-1">More</span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              {navItems.slice(4).map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <a className="flex items-center px-3 py-2 text-sm">
                      <Icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </a>
                  </Link>
                );
              })}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => logoutMutation.mutate()}
              >
                Logout
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
