import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  Calendar,
  DollarSign,
  MessageSquare,
  Star,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { Appointment, Customer, Message, Review } from "@shared/schema";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    aptDate.setHours(0, 0, 0, 0);
    return aptDate.getTime() === today.getTime();
  });

  const pendingReviews = reviews.filter(
    (review) => review.status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your pest control business
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <Link href="/appointments">
              <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary">
                View schedule
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <Link href="/customers">
              <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary">
                View all customers
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviews}</div>
            <Link href="/reviews">
              <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary">
                Manage reviews
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
            <CardDescription>Latest scheduled services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.slice(0, 5).map((apt) => {
              const customer = customers.find((c) => c.id === apt.customerId);
              return (
                <div
                  key={apt.id}
                  className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{customer?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(apt.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-sm ${
                      apt.status === "completed"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>Latest customer feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviews.slice(0, 5).map((review) => {
              const customer = customers.find((c) => c.id === review.customerId);
              return (
                <div
                  key={review.id}
                  className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{customer?.name}</p>
                    <div className="flex items-center text-yellow-500">
                      {Array(review.rating)
                        .fill(null)
                        .map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                    </div>
                  </div>
                  <span
                    className={`text-sm ${
                      review.status === "approved"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {review.status}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}