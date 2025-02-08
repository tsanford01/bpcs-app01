import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Review, Customer } from "@shared/schema";

export default function Reviews() {
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const pendingReviews = reviews.filter((review) => review.status === "pending");
  const approvedReviews = reviews.filter((review) => review.status === "approved");
  const rejectedReviews = reviews.filter((review) => review.status === "rejected");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          Manage and moderate customer feedback
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Reviews</CardTitle>
            <CardDescription>
              Reviews awaiting moderation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingReviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No pending reviews
                </p>
              ) : (
                pendingReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    customer={customers.find((c) => c.id === review.customerId)}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Published Reviews</CardTitle>
            <CardDescription>
              Approved customer feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvedReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  customer={customers.find((c) => c.id === review.customerId)}
                  showActions={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  customer,
  showActions = true,
}: {
  review: Review;
  customer?: Customer;
  showActions?: boolean;
}) {
  const { toast } = useToast();

  const updateReview = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/reviews/${review.id}`, {
        status,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: "Review updated",
        description: "The review status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium">{customer?.name}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(review.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex">
          {Array(review.rating)
            .fill(null)
            .map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4 text-yellow-500 fill-current"
              />
            ))}
        </div>
      </div>
      <p className="text-sm mb-4">{review.text}</p>
      {showActions && review.status === "pending" && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-green-600"
            onClick={() => updateReview.mutate("approved")}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600"
            onClick={() => updateReview.mutate("rejected")}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
      {!showActions && (
        <div className="flex items-center text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
          Published
        </div>
      )}
    </div>
  );
}
