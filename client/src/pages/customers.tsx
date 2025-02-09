import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import {
  Search,
  Plus,
  LayoutGrid,
  Table,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { z } from "zod";
import {
  Customer,
  CustomerAddress,
  CustomerContact,
  PaymentMethod,
} from "@shared/schema";
import InputMask from 'react-input-mask';
import { ChevronRight, ChevronLeft } from "lucide-react";
import cn from 'classnames';

type CustomerWithRelations = Customer & {
  addresses?: CustomerAddress[];
  contacts?: CustomerContact[];
  paymentMethods?: PaymentMethod[];
};

type ViewMode = "grid" | "table";
type CustomerStatus = "active" | "inactive" | "pending" | "suspended";
type ServicePlan = "monthly" | "quarterly" | "yearly";

const newCustomerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  notes: z.string().optional(),
  birthday: z.string().optional(),
  servicePlan: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  preferredContactTime: z.enum(["morning", "afternoon", "evening"]).optional(),
  communicationFrequency: z.enum(["weekly", "monthly", "quarterly"]).optional(),
  tags: z.array(z.string()).default([]),
  serviceAddons: z.array(z.string()).default([]),
  contact: z.object({
    type: z.enum(["phone", "email"]),
    value: z.string().min(1, "Contact value is required").refine((val, ctx) => {
      if (ctx.path[ctx.path.length - 2] === "phone") {
        // Validate format: (123) 456-7890 or 123-456-7890
        if (!/^\(\d{3}\)\s?\d{3}-\d{4}$|^\d{3}-\d{3}-\d{4}$/.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Phone number must be in format: (123) 456-7890 or 123-456-7890",
          });
          return false;
        }
      } else if (ctx.path[ctx.path.length - 2] === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter a valid email address",
          });
          return false;
        }
      }
      return true;
    }),
  }),
  address: z.object({
    type: z.enum(["service", "billing"]),
    address: z.string().min(5, "Address must be at least 5 characters"),
    city: z.string().min(2, "City must be at least 2 characters"),
    state: z.string().length(2, "State must be a 2-letter code"),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
    specialInstructions: z.string().optional(),
  }),
});

function CustomerOnboardingWizard({
  onClose
}: {
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof newCustomerFormSchema>>({
    resolver: zodResolver(newCustomerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      notes: "",
      birthday: undefined,
      servicePlan: undefined,
      preferredContactTime: undefined,
      communicationFrequency: undefined,
      tags: [],
      serviceAddons: [],
      contact: {
        type: "phone",
        value: "",
      },
      address: {
        type: "service",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        specialInstructions: "",
      },
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (data: z.infer<typeof newCustomerFormSchema>) => {
      const res = await apiRequest("POST", "/api/customers", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create customer");
      }
      return res.json();
    },
    onSuccess: () => {
      onClose();
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const steps = [
    {
      title: "Basic Information",
      description: "Enter the customer's basic details",
      fields: ["name", "email", "notes", "birthday"],
      component: (
        <div className="space-y-4">
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
                  <Input {...field} type="email" />
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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="birthday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birthday (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : null;
                      field.onChange(date?.toISOString() || null);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
    },
    {
      title: "Contact Information",
      description: "Add contact details and address",
      fields: ["contact.type", "contact.value", "address"],
      component: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="contact.type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact.value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {form.watch("contact.type") === "email" ? "Email Address" : "Phone Number"}
                </FormLabel>
                <FormControl>
                  {form.watch("contact.type") === "phone" ? (
                    <InputMask
                      mask="(999) 999-9999"
                      value={field.value}
                      onChange={field.onChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="(555) 555-5555"
                    />
                  ) : (
                    <Input {...field} type="email" />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address.type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select address type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="service">Service Address</SelectItem>
                    <SelectItem value="billing">Billing Address</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="address.address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address.zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Service Details",
      description: "Choose service plan and add-ons",
      fields: ["servicePlan", "serviceAddons"],
      component: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="servicePlan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Plan</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service plan" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serviceAddons"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Add-ons</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Comma-separated list of add-ons"
                    value={field.value?.join(", ") ?? ""}
                    onChange={(e) => field.onChange(e.target.value.split(",").map(v => v.trim()).filter(Boolean))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
    },
    {
      title: "Communication Preferences",
      description: "Set communication preferences and tags",
      fields: ["preferredContactTime", "communicationFrequency", "tags"],
      component: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="preferredContactTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Contact Time</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preferred time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="communicationFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Communication Frequency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Comma-separated list of tags"
                    value={field.value?.join(", ") ?? ""}
                    onChange={(e) => field.onChange(e.target.value.split(",").map(v => v.trim()).filter(Boolean))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const isFirstStep = step === 0;

  const next = async () => {
    const fields = steps[step].fields;
    const result = await form.trigger(fields as any);
    if (result) {
      if (isLastStep) {
        form.handleSubmit((data) => createCustomer.mutate(data))();
      } else {
        setStep(s => s + 1);
      }
    }
  };

  const prev = () => {
    if (!isFirstStep) {
      setStep(s => s - 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {currentStep.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {currentStep.description}
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-between">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                index <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          {currentStep.component}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prev}
              disabled={isFirstStep}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <Button
              type="button"
              onClick={next}
              disabled={createCustomer.isPending}
            >
              {isLastStep ? (
                createCustomer.isPending ? "Creating..." : "Create Customer"
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function Customers() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">("all");
  const [servicePlanFilter, setServicePlanFilter] = useState<ServicePlan | "all">("all");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof newCustomerFormSchema>>({
    resolver: zodResolver(newCustomerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      notes: "",
      birthday: undefined,
      servicePlan: undefined,
      preferredContactTime: undefined,
      communicationFrequency: undefined,
      tags: [],
      serviceAddons: [],
      contact: {
        type: "phone",
        value: "",
      },
      address: {
        type: "service",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        specialInstructions: "",
      },
    },
  });

  const { data: customers = [] } = useQuery<CustomerWithRelations[]>({
    queryKey: ["/api/customers"],
  });

  const createCustomer = useMutation({
    mutationFn: async (data: z.infer<typeof newCustomerFormSchema>) => {
      const res = await apiRequest("POST", "/api/customers", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create customer");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsAddingCustomer(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = customers.filter((customer) => {
    if (
      searchQuery &&
      !customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (statusFilter !== "all" && customer.status !== statusFilter) {
      return false;
    }

    if (
      servicePlanFilter !== "all" &&
      customer.servicePlan !== servicePlanFilter
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer relationships
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode("table")}
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <div className="p-2 space-y-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as CustomerStatus | "all")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Service Plan</label>
                    <Select
                      value={servicePlanFilter}
                      onValueChange={(value) => setServicePlanFilter(value as ServicePlan | "all")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button onClick={() => setIsAddingCustomer(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="relative">
              <CardHeader>
                <CardTitle>{customer.name}</CardTitle>
                <CardDescription>{customer.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className="text-sm font-medium">{customer.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <span className="text-sm font-medium">
                      {customer.servicePlan || "No plan"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Services</span>
                    <span className="text-sm font-medium">
                      {customer.serviceCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Email</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Plan</th>
                <th className="py-3 px-4 text-left">Services</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b">
                  <td className="py-3 px-4">{customer.name}</td>
                  <td className="py-3 px-4">{customer.email}</td>
                  <td className="py-3 px-4">{customer.status}</td>
                  <td className="py-3 px-4">{customer.servicePlan || "No plan"}</td>
                  <td className="py-3 px-4">{customer.serviceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
        <SheetContent className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Add New Customer</SheetTitle>
            <SheetDescription>
              Add a new customer to your database
            </SheetDescription>
          </SheetHeader>

          <CustomerOnboardingWizard onClose={() => setIsAddingCustomer(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}