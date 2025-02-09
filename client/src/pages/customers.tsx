import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Gift,
  Calendar,
  Tag,
  CreditCard,
  History,
  LayoutGrid,
  Table,
  AlertCircle,
  Filter,
} from "lucide-react";
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
  CustomerAddress,
  CustomerContact,
  PaymentMethod,
  InsertCustomer,
  insertCustomerSchema,
} from "@shared/schema";
import * as z from 'zod';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

type CustomerWithRelations = Customer & {
  addresses?: CustomerAddress[];
  contacts?: CustomerContact[];
  paymentMethods?: PaymentMethod[];
};

type ViewMode = "grid" | "table";

const CUSTOMERS_PER_PAGE = 12;

type CustomerStatus = "active" | "inactive" | "pending" | "suspended";
type ServicePlan = "monthly" | "quarterly" | "yearly";

interface CustomerDetailsProps {
  customer: CustomerWithRelations;
  onClose: () => void;
  onUpdate: (customer: CustomerWithRelations) => void;
}

function CustomerDetails({ customer, onClose, onUpdate }: CustomerDetailsProps) {
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch fresh customer data with configured refetch interval
  const { data: currentCustomer, refetch } = useQuery<CustomerWithRelations>({
    queryKey: ["/api/customers", customer.id],
    enabled: !!customer.id,
    refetchInterval: 1000, // Refetch every second while the details are open
    onSuccess: onUpdate,
  });

  const contactFormSchema = z.object({
    type: z.enum(["phone", "email"], {
      required_error: "Please select a contact type",
    }),
    value: z.string()
      .min(1, "Contact value is required")
      .refine((val) => {
        if (addContactForm.watch("type") === "email") {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        }
        return /^\+?[\d\s-()]+$/.test(val);
      }, {
        message: "Please enter a valid email address or phone number",
      }),
  });

  const addContactForm = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      type: "phone",
      value: "",
    },
  });

  const addContact = useMutation({
    mutationFn: async (data: { type: string; value: string }) => {
      const res = await apiRequest("POST", `/api/customers/${customer.id}/contacts`, {
        ...data,
        customerId: customer.id,
        isPrimary: !(currentCustomer?.contacts ?? []).length,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add contact");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsAddingContact(false);
      addContactForm.reset();
      // Invalidate queries and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id] });
      refetch();
      toast({
        title: "Contact added",
        description: "The contact has been added successfully",
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

  const addAddressForm = useForm<{
    type: "service" | "billing";
    address: string;
    city: string;
    state: string;
    zipCode: string;
    specialInstructions?: string;
  }>({
    resolver: zodResolver(
      z.object({
        type: z.enum(["service", "billing"]),
        address: z.string().min(1, "Address is required"),
        city: z.string().min(1, "City is required"),
        state: z.string().min(1, "State is required"),
        zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
        specialInstructions: z.string().optional(),
      })
    ),
    defaultValues: {
      type: "service",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      specialInstructions: "",
    },
  });

  const addAddress = useMutation({
    mutationFn: async (data: {
      type: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      specialInstructions?: string;
    }) => {
      const res = await apiRequest("POST", `/api/customers/${customer.id}/addresses`, {
        ...data,
        customerId: customer.id,
        isPrimary: !(currentCustomer?.addresses ?? []).length,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add address");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsAddingAddress(false);
      addAddressForm.reset();
      // Invalidate both queries
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id] });
      refetch();
      toast({
        title: "Address added",
        description: "The address has been added successfully",
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

  const addPaymentForm = useForm<{
    type: string;
    last4: string;
    autopayEnabled: boolean;
  }>({
    resolver: zodResolver(
      z.object({
        type: z.enum(["credit_card", "bank_account", "other"]),
        last4: z.string().length(4, "Must be last 4 digits"),
        autopayEnabled: z.boolean(),
      })
    ),
    defaultValues: {
      type: "credit_card",
      last4: "",
      autopayEnabled: false,
    },
  });

  const addPayment = useMutation({
    mutationFn: async (data: {
      type: string;
      last4: string;
      autopayEnabled: boolean;
    }) => {
      const res = await apiRequest("POST", `/api/customers/${customer.id}/payment-methods`, {
        ...data,
        customerId: customer.id,
        isPrimary: !(currentCustomer?.paymentMethods ?? []).length,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add payment method");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsAddingPayment(false);
      addPaymentForm.reset();
      // Invalidate both the customer list and the specific customer's data
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customer.id] });
      refetch();
      toast({
        title: "Payment method added",
        description: "The payment method has been added successfully",
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
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-[100vw]">
        <SheetHeader>
          <SheetTitle>{currentCustomer?.name ?? customer.name}</SheetTitle>
          <SheetDescription>
            Customer #{currentCustomer?.id ?? customer.id} • {currentCustomer?.status ?? customer.status}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          <Tabs defaultValue="info" className="mt-6">
            <TabsList>
              <TabsTrigger value="info">Information</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Basic Information</h4>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{currentCustomer?.email ?? customer.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Gift className="w-4 h-4 mr-2" />
                    <span>
                      {currentCustomer?.birthday
                        ? new Date(currentCustomer.birthday).toLocaleDateString()
                        : "No birthday set"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      Customer since {new Date(currentCustomer?.customerSince ?? customer.customerSince).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Service Plan</h4>
                <div className="grid gap-2">
                  <div>Plan: {(currentCustomer?.servicePlan ?? customer.servicePlan) || "No plan"}</div>
                  {currentCustomer?.contractStartDate && (
                    <div>
                      Contract Start: {new Date(currentCustomer.contractStartDate).toLocaleDateString()}
                    </div>
                  )}
                  {currentCustomer?.contractEndDate && (
                    <div>
                      Contract End: {new Date(currentCustomer.contractEndDate).toLocaleDateString()}
                    </div>
                  )}
                  {currentCustomer?.serviceAddons?.length > 0 && (
                    <div>
                      Add-ons:
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentCustomer.serviceAddons.map((addon, i) => (
                          <Badge key={i} variant="secondary">
                            {addon}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Communication Preferences</h4>
                <div className="grid gap-2">
                  <div>
                    Preferred Time: {(currentCustomer?.preferredContactTime ?? customer.preferredContactTime) || "Not set"}
                  </div>
                  <div>
                    Frequency: {(currentCustomer?.communicationFrequency ?? customer.communicationFrequency) || "Not set"}
                  </div>
                  {currentCustomer?.lastContactDate && (
                    <div>
                      Last Contact: {new Date(currentCustomer.lastContactDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {(currentCustomer?.tags ?? customer.tags)?.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {currentCustomer?.notes && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground">{currentCustomer.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contacts" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Contact Methods</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingContact(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
                <div className="space-y-2">
                  {(currentCustomer?.contacts ?? customer.contacts)?.map((contact, index) => (
                    <Card key={index}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center">
                          {contact.type === "phone" ? (
                            <Phone className="w-4 h-4 mr-2" />
                          ) : (
                            <Mail className="w-4 h-4 mr-2" />
                          )}
                          <div>
                            <p className="font-medium capitalize">{contact.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {contact.value}
                            </p>
                          </div>
                        </div>
                        {contact.isPrimary && (
                          <Badge>Primary</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Sheet open={isAddingContact} onOpenChange={setIsAddingContact}>
                <SheetContent side="right" className="w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Add New Contact</SheetTitle>
                    <SheetDescription>
                      Add a new contact method for {currentCustomer?.name ?? customer.name}
                    </SheetDescription>
                  </SheetHeader>

                  <Form {...addContactForm}>
                    <form
                      onSubmit={addContactForm.handleSubmit((data) => addContact.mutate(data))}
                      className="space-y-4 mt-4"
                    >
                      <FormField
                        control={addContactForm.control}
                        name="type"
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
                        control={addContactForm.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Value</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type={addContactForm.watch("type") === "email" ? "email" : "tel"}
                                placeholder={addContactForm.watch("type") === "email" ? "Email address" : "Phone number"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={addContact.isPending}
                      >
                        {addContact.isPending ? "Adding..." : "Add Contact"}
                      </Button>
                    </form>
                  </Form>
                </SheetContent>
              </Sheet>
            </TabsContent>
            <TabsContent value="addresses" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Addresses</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingAddress(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Address
                  </Button>
                </div>
                <div className="space-y-2">
                  {(currentCustomer?.addresses ?? customer.addresses)?.map((address, index) => (
                    <Card key={index}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          <div>
                            <p className="font-medium capitalize">{address.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {address.address}, {address.city}, {address.state} {address.zipCode}
                            </p>
                            {address.specialInstructions && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Note: {address.specialInstructions}
                              </p>
                            )}
                          </div>
                        </div>
                        {address.isPrimary && (
                          <Badge>Primary</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Sheet open={isAddingAddress} onOpenChange={setIsAddingAddress}>
                <SheetContent side="right" className="w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Add New Address</SheetTitle>
                    <SheetDescription>
                      Add a new address for {currentCustomer?.name ?? customer.name}
                    </SheetDescription>
                  </SheetHeader>

                  <Form {...addAddressForm}>
                    <form
                      onSubmit={addAddressForm.handleSubmit((data) => addAddress.mutate(data))}
                      className="space-y-4 mt-4"
                    >
                      <FormField
                        control={addAddressForm.control}
                        name="type"
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
                                <SelectItem value="service">Service</SelectItem>
                                <SelectItem value="billing">Billing</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addAddressForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter street address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addAddressForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addAddressForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addAddressForm.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter ZIP code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addAddressForm.control}
                        name="specialInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Instructions (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter anyspecial instructions" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={addAddress.isPending}
                      >
                        {addAddress.isPending ? "Adding..." : "Add Address"}
                      </Button>
                    </form>
                  </Form>
                </SheetContent>
              </Sheet>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Payment Methods</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingPayment(true)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Add New
                  </Button>
                </div>
                <div className="space-y-2">
                  {(currentCustomer?.paymentMethods ?? customer.paymentMethods)?.map((method, index) => (
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
                        <div className="flex items-center gap-2">
                          {method.isPrimary && (
                            <Badge>Primary</Badge>
                          )}
                          {method.autopayEnabled && (
                            <Badge variant="secondary">Autopay</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Sheet open={isAddingPayment} onOpenChange={setIsAddingPayment}>
                  <SheetContent side="right" className="w-[400px]">
                    <SheetHeader>
                      <SheetTitle>Add Payment Method</SheetTitle>
                      <SheetDescription>
                        Add a new payment method for {currentCustomer?.name ?? customer.name}
                      </SheetDescription>
                    </SheetHeader>

                    <Form {...addPaymentForm}>
                      <form
                        onSubmit={addPaymentForm.handleSubmit((data) => addPayment.mutate(data))}
                        className="space-y-4 mt-4"
                      >
                        <FormField
                          control={addPaymentForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select payment type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="credit_card">Credit Card</SelectItem>
                                  <SelectItem value="bank_account">Bank Account</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addPaymentForm.control}
                          name="last4"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last 4 Digits</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter last 4 digits"
                                  maxLength={4}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addPaymentForm.control}
                          name="autopayEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Enable Autopay
                                </FormLabel>
                                <FormDescription>
                                  Automatically process payments for recurring services
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={addPayment.isPending}
                        >
                          {addPayment.isPending ? "Adding..." : "Add Payment Method"}
                        </Button>
                      </form>
                    </Form>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Payment Statistics</h4>
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Spent</span>
                    <span className="font-medium">${currentCustomer?.totalSpent ?? customer.totalSpent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Services Used</span>
                    <span className="font-medium">{currentCustomer?.serviceCount ?? customer.serviceCount}</span>
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
  const [currentTab, setCurrentTab] = useState("basic");

  const form = useForm<InsertCustomer & {
    address: {
      type: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      specialInstructions?: string;
    };
    contact: {
      type: string;
      value: string;
    };
  }>({
    resolver: zodResolver(insertCustomerSchema.extend({
      address: z.object({
        type: z.enum(["billing", "service"]),
        address: z.string().min(1, "Address is required"),
        city: z.string().min(1, "City is required"),
        state: z.string().min(1, "State is required"),
        zipCode: z.string().min(5, "ZIP code must be at least 5 characters"),
        specialInstructions: z.string().optional(),
      }),
      contact: z.object({
        type: z.enum(["phone", "email"]),
        value: z.string().min(1, "Contact value is required"),
      }),
    })),
    defaultValues: {
      tags: [],
      serviceAddons: [],
      status: "active",
      address: {
        type: "service",
        address: "",
        city: "",
        state: "",
        zipCode: "",
      },
      contact: {
        type: "phone",
        value: "",
      },
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (data: InsertCustomer & {
      address: any;
      contact: any;
    }) => {
      const { address, contact, ...customerData } = data;

      // Create the customer first
      const customerRes = await apiRequest("POST", "/api/customers", customerData);
      if (!customerRes.ok) {
        const error = await customerRes.json();
        throw new Error(error.message || "Failed to create customer");
      }
      const customer = await customerRes.json();

      // Create the address
      const addressRes = await apiRequest("POST", "/api/customer-addresses", {
        ...address,
        customerId: customer.id,
        isPrimary: true,
      });
      if (!addressRes.ok) {
        throw new Error("Failed to create address");
      }

      // Create the contact
      const contactRes = await apiRequest("POST", "/api/customer-contacts", {
        ...contact,
        customerId: customer.id,
        isPrimary: true,
      });
      if (!contactRes.ok) {
        throw new Error("Failed to create contact");
      }

      return customer;
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
      <SheetContent className="w-[400px] sm:w-[640px] sm:max-w-[100vw]">
        <SheetHeader>
          <SheetTitle>Add New Customer</SheetTitle>
          <SheetDescription>
            Create a new customer record with all required information
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createCustomer.mutate(data))}
            className="space-y-4 mt-4"
          >
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="service">Service</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
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
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birthday (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : null;
                            field.onChange(date?.toISOString() || null);
                          }}
                        />
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
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
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
                      <FormLabel>Contact Value</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type={form.watch("contact.type") === "email" ? "email" : "tel"}
                          placeholder={form.watch("contact.type") === "email" ? "Email address" : "Phone number"}
                        />
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
                          <SelectItem value="billing">Billing Address</SelectItem>
                          <SelectItem value="service">Service Address</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <Input {...field} />
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

                <FormField
                  control={form.control}
                  name="address.specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="service" className="space-y-4">
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
              </TabsContent>

              <TabsContent value="preferences" className="space-y-4">
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
              </TabsContent>
            </Tabs>

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                "Creating..."
              ) : (
                "Create Customer"
              )}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// Keep existing imports and component definitions...

export default function Customers() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithRelations | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">("all");
  const [servicePlanFilter, setServicePlanFilter] = useState<ServicePlan | "all">("all");
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const { toast } = useToast();

  const { data: customers = [] } = useQuery<CustomerWithRelations[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = !searchQuery ||
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    const matchesServicePlan = servicePlanFilter === "all" || customer.servicePlan === servicePlanFilter;
    return matchesSearch && matchesStatus && matchesServicePlan;
  });

  const paginatedCustomers = filteredCustomers.slice(
    (page - 1) * CUSTOMERS_PER_PAGE,
    page * CUSTOMERS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Manage your customer relationships
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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
          <Button onClick={() => setShowNewCustomerDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedCustomers.map((customer) => {
            const primaryAddress = customer.addresses?.find(addr => addr.isPrimary) || customer.addresses?.[0];

            return (
              <Card
                key={customer.id}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => setSelectedCustomer(customer)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{customer.name}</span>
                    {customer.requiresAttention && (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                  </CardTitle>
                  <CardDescription>{customer.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge>{customer.status}</Badge>
                      {customer.servicePlan && (
                        <Badge variant="outline">{customer.servicePlan}</Badge>
                      )}
                    </div>
                    {primaryAddress && (
                      <div className="text-sm text-muted-foreground flex items-start">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                        <span>
                          {primaryAddress.address}, {primaryAddress.city}, {primaryAddress.state} {primaryAddress.zipCode}
                        </span>
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Total Spent:</span>
                        <span>${customer.totalSpent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Services:</span>
                        <span>{customer.serviceCount}</span>
                      </div>
                      {customer.nextServiceDate && (
                        <div className="flex justify-between">
                          <span>Next Service:</span>
                          <span>
                            {new Date(customer.nextServiceDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {customer.tags && customer.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Service Plan</th>
                <th>Total Spent</th>
                <th>Services</th>
                <th>Next Service</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <td>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.email}
                      </p>
                    </div>
                  </td>
                  <td>
                    <Badge>{customer.status}</Badge>
                  </td>
                  <td>
                    {customer.servicePlan ? (
                      <Badge variant="outline">{customer.servicePlan}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td>${customer.totalSpent}</td>
                  <td>{customer.serviceCount}</td>
                  <td>
                    {customer.nextServiceDate ? (
                      new Date(customer.nextServiceDate).toLocaleDateString()
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onUpdate={(updated) => {
            // Update the selected customer with fresh data
            setSelectedCustomer(updated);
          }}
        />
      )}

      {showNewCustomerDialog && (
        <NewCustomerDialog
          open={showNewCustomerDialog}
          onOpenChange={setShowNewCustomerDialog}
        />
      )}
    </div>
  );
}