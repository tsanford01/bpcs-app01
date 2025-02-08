import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Phone, Mail, MapPin, Gift, Calendar, Tag, CreditCard, History } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Customer,
  InsertCustomer,
  insertCustomerSchema,
} from "@shared/schema";

const CUSTOMERS_PER_PAGE = 12;

export default function Customers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = customers.filter(
    (customer) => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase()) ||
        customer.phone.includes(search) ||
        customer.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    }
  );

  const paginatedCustomers = filteredCustomers.slice(
    (page - 1) * CUSTOMERS_PER_PAGE,
    page * CUSTOMERS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <NewCustomerDialog />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginatedCustomers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onClick={() => setSelectedCustomer(customer)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i + 1}
                variant={page === i + 1 ? "default" : "outline"}
                onClick={() => setPage(i + 1)}
                className="w-8 h-8 p-0"
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}

function CustomerCard({
  customer,
  onClick,
}: {
  customer: Customer;
  onClick: () => void;
}) {
  return (
    <Card className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={onClick}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{customer.name}</CardTitle>
            <CardDescription>Customer since {new Date(customer.customerSince).toLocaleDateString()}</CardDescription>
          </div>
          <Badge variant={customer.status === "active" ? "default" : "secondary"}>
            {customer.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-sm">
          <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
          {customer.phone}
        </div>
        <div className="flex items-center text-sm">
          <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
          {customer.email}
        </div>
        <div className="flex items-center text-sm">
          <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
          {customer.address}
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex flex-wrap gap-1">
          {customer.tags?.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}

function CustomerDetails({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-[100vw]">
        <SheetHeader>
          <SheetTitle>{customer.name}</SheetTitle>
          <SheetDescription>
            Customer #{customer.id} • {customer.status}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          <Tabs defaultValue="info" className="mt-6">
            <TabsList>
              <TabsTrigger value="info">Information</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Contact Information</h4>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{customer.email}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{customer.address}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Personal Information</h4>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Gift className="w-4 h-4 mr-2" />
                    <span>
                      {customer.birthday
                        ? new Date(customer.birthday).toLocaleDateString()
                        : "No birthday set"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Customer since {new Date(customer.customerSince).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Preferences</h4>
                <div className="grid gap-2">
                  {customer.preferences && (
                    <>
                      <div>Preferred Contact: {customer.preferences.preferredContactMethod}</div>
                      <div>Communication: {customer.preferences.communicationFrequency}</div>
                      <div>
                        Service Preferences:
                        <div className="flex flex-wrap gap-1 mt-1">
                          {customer.preferences.servicePreferences.map((pref, i) => (
                            <Badge key={i} variant="secondary">
                              {pref}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {customer.tags?.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {customer.notes && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground">{customer.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Payment Methods</h4>
                  <Button variant="outline" size="sm">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Add New
                  </Button>
                </div>
                <div className="space-y-2">
                  {customer.paymentMethods?.map((method, index) => (
                    <Card key={index}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center">
                          <CreditCard className="w-4 h-4 mr-2" />
                          <div>
                            <p className="font-medium">{method.type}</p>
                            <p className="text-sm text-muted-foreground">
                              ending in {method.last4}
                            </p>
                          </div>
                        </div>
                        {method.expiryDate && (
                          <p className="text-sm text-muted-foreground">
                            Expires {method.expiryDate}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Payment Statistics</h4>
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Spent</span>
                    <span className="font-medium">${customer.totalSpent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Services Used</span>
                    <span className="font-medium">{customer.serviceCount}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Service History</h4>
                  <Button variant="outline" size="sm">
                    <History className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </div>
                {/* Service history would be implemented here */}
                <p className="text-sm text-muted-foreground">
                  Service history implementation coming soon...
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function NewCustomerDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      tags: [],
      paymentMethods: [],
      preferences: {
        preferredContactMethod: "email",
        servicePreferences: [],
        communicationFrequency: "monthly",
      },
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", {
        ...data,
        notes: data.notes || null,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create customer");
      }
      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Customer added",
        description: "The customer has been added successfully",
      });
    },
    onError: (error) => {
      console.error("Customer creation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Customer
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add New Customer</SheetTitle>
          <SheetDescription>
            Create a new customer record in your database
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createCustomer.mutate(data))}
            className="space-y-4 mt-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createCustomer.isPending}
            >
              Add Customer
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}