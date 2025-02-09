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
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Tag,
  History,
  FileText,
  CreditCard,
  AlertCircle,
  Star,
  UserPlus,
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
  MoreVertical,
  Edit,
  MessageSquare,
  Power,
  Home,
  Gift,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Customer,
  CustomerAddress,
  CustomerContact,
  ServiceHistory,
  PaymentMethod,
  CustomerDocument,
  InsertCustomer,
  insertCustomerSchema,
} from "@shared/schema";

const CUSTOMERS_PER_PAGE = 12;

type ViewMode = "grid" | "list";
type SortField = "name" | "customerSince" | "nextServiceDate" | "totalSpent";
type SortOrder = "asc" | "desc";

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "name", order: "asc" });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: selectedCustomerAddresses = [] } = useQuery<CustomerAddress[]>({
    queryKey: ["/api/customers", selectedCustomer?.id, "addresses"],
    enabled: !!selectedCustomer,
  });

  const { data: selectedCustomerContacts = [] } = useQuery<CustomerContact[]>({
    queryKey: ["/api/customers", selectedCustomer?.id, "contacts"],
    enabled: !!selectedCustomer,
  });

  const { data: selectedCustomerHistory = [] } = useQuery<ServiceHistory[]>({
    queryKey: ["/api/customers", selectedCustomer?.id, "service-history"],
    enabled: !!selectedCustomer,
  });

  const { data: selectedCustomerPaymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/customers", selectedCustomer?.id, "payment-methods"],
    enabled: !!selectedCustomer,
  });

  const { data: selectedCustomerDocuments = [] } = useQuery<CustomerDocument[]>({
    queryKey: ["/api/customers", selectedCustomer?.id, "documents"],
    enabled: !!selectedCustomer,
  });

  const filteredCustomers = customers.filter(
    (customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase()) ||
        customer.tags?.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase())
        );

      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      const matchesCity = !cityFilter || (selectedCustomerAddresses.length > 0 && selectedCustomerAddresses.some(addr => 
        addr.city.toLowerCase().includes(cityFilter.toLowerCase())
      ));
      const matchesPlan = !planFilter || customer.servicePlan === planFilter;
      const matchesDate = !dateFilter || (customer.nextServiceDate && new Date(customer.nextServiceDate) <= new Date(dateFilter));

      return matchesSearch && matchesStatus && matchesCity && matchesPlan && matchesDate;
    }
  );

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const { field, order } = sortConfig;
    let compareResult = 0;

    switch (field) {
      case "name":
        compareResult = a.name.localeCompare(b.name);
        break;
      case "customerSince":
        compareResult = new Date(a.customerSince).getTime() - new Date(b.customerSince).getTime();
        break;
      case "nextServiceDate":
        compareResult = (a.nextServiceDate ? new Date(a.nextServiceDate).getTime() : 0) -
                       (b.nextServiceDate ? new Date(b.nextServiceDate).getTime() : 0);
        break;
      case "totalSpent":
        compareResult = (a.totalSpent || 0) - (b.totalSpent || 0);
        break;
    }

    return order === "asc" ? compareResult : -compareResult;
  });

  const paginatedCustomers = sortedCustomers.slice(
    (page - 1) * CUSTOMERS_PER_PAGE,
    page * CUSTOMERS_PER_PAGE
  );

  const totalPages = Math.ceil(sortedCustomers.length / CUSTOMERS_PER_PAGE);
  const requiresAttention = filteredCustomers.filter((c) => c.requiresAttention).length;
  const vipCustomers = filteredCustomers.filter((c) => c.vipCustomer).length;

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const updateCustomerStatus = useMutation({
    mutationFn: async (data: { customerId: string; newStatus: string }) => {
      const res = await apiRequest("PATCH", `/api/customers/${data.customerId}/status`, { status: data.newStatus });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update customer status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error) => {
      console.error("Customer status update error:", error);
    },
  });

  const sendMessageToCustomer = useMutation({
    mutationFn: async (data: { customerId: string; message: string }) => {
      const res = await apiRequest("POST", `/api/customers/${data.customerId}/messages`, { message: data.message });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      // Optionally add success message
    },
    onError: (error) => {
      console.error("Message sending error:", error);
    },
  });


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-md border">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="px-3"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="px-3"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <NewCustomerDialog />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requires Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requiresAttention}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vipCustomers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
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
          <Popover open={showAdvancedSearch} onOpenChange={setShowAdvancedSearch}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Status</h4>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">City</h4>
                  <Input
                    placeholder="Filter by city"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Service Plan</h4>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Plans</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Next Service Before</h4>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onClick={() => setSelectedCustomer(customer)}
              onStatusChange={(newStatus) => updateCustomerStatus.mutate({ customerId: customer.id, newStatus })}
              onSendMessage={() => {
                // Implement send message action
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="bg-muted/50">
                <th className="py-3 px-4 text-left text-sm font-medium">
                  <button
                    className="flex items-center space-x-1"
                    onClick={() => handleSort("name")}
                  >
                    <span>Customer</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium">Contact</th>
                <th className="py-3 px-4 text-left text-sm font-medium">
                  <button
                    className="flex items-center space-x-1"
                    onClick={() => handleSort("customerSince")}
                  >
                    <span>Customer Since</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="py-3 px-4 text-left text-sm font-medium">Status</th>
                <th className="py-3 px-4 text-left text-sm font-medium">
                  <button
                    className="flex items-center space-x-1"
                    onClick={() => handleSort("totalSpent")}
                  >
                    <span>Total Spent</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {paginatedCustomers.map((customer) => (
                <CustomerTableRow
                  key={customer.id}
                  customer={customer}
                  onClick={() => setSelectedCustomer(customer)}
                  onStatusChange={(newStatus) => updateCustomerStatus.mutate({ customerId: customer.id, newStatus })}
                  onSendMessage={() => sendMessageToCustomer.mutate({customerId: customer.id, message: ""})} // needs message input
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          addresses={selectedCustomerAddresses}
          contacts={selectedCustomerContacts}
          serviceHistory={selectedCustomerHistory}
          paymentMethods={selectedCustomerPaymentMethods}
          documents={selectedCustomerDocuments}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}

function CustomerCard({
  customer,
  onClick,
  onStatusChange,
  onSendMessage,
}: {
  customer: Customer;
  onClick: () => void;
  onStatusChange: (status: string) => void;
  onSendMessage: () => void;
}) {
  const { data: contacts = [] } = useQuery<CustomerContact[]>({
    queryKey: ["/api/customers", customer.id, "contacts"],
  });

  const { data: addresses = [] } = useQuery<CustomerAddress[]>({
    queryKey: ["/api/customers", customer.id, "addresses"],
  });

  const primaryAddress = addresses.find((addr) => addr.isPrimary);
  const primaryEmail = contacts.find(
    (c) => c.type === "email" && c.isPrimary
  )?.value;
  const primaryPhone = contacts.find(
    (c) => c.type === "phone" && c.isPrimary
  )?.value;

  return (
    <Card
      className={`relative hover:bg-accent/50 cursor-pointer transition-colors ${
        customer.requiresAttention ? "border-yellow-500" : customer.vipCustomer ? "border-purple-500" : ""
      }`}
    >
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick}>
              <Edit className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSendMessage}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange(customer.status === "active" ? "inactive" : "active")}>
              <Power className="h-4 w-4 mr-2" />
              {customer.status === "active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardHeader className="pt-8" onClick={onClick}>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Home className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              {customer.name}
              {customer.vipCustomer && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </CardTitle>
            <CardDescription>
              Customer since {new Date(customer.customerSince).toLocaleDateString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2" onClick={onClick}>
        {primaryEmail && (
          <div className="flex items-center text-sm">
            <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
            {primaryEmail}
          </div>
        )}
        {primaryPhone && (
          <div className="flex items-center text-sm">
            <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
            {primaryPhone}
          </div>
        )}
        {primaryAddress && (
          <div className="flex items-center text-sm">
            <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
            {primaryAddress.address}
          </div>
        )}
        {customer.nextServiceDate && (
          <div className="flex items-center text-sm">
            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
            Next Service: {new Date(customer.nextServiceDate).toLocaleDateString()}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={customer.status === "active" ? "default" : "secondary"}
            className="mr-2"
          >
            {customer.status}
          </Badge>
          {customer.tags?.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {customer.servicePlan && (
            <Badge variant="secondary" className="text-xs">
              {customer.servicePlan}
            </Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

function CustomerTableRow({
  customer,
  onClick,
  onStatusChange,
  onSendMessage,
}: {
  customer: Customer;
  onClick: () => void;
  onStatusChange: (status: string) => void;
  onSendMessage: () => void;
}) {
  const { data: contacts = [] } = useQuery<CustomerContact[]>({
    queryKey: ["/api/customers", customer.id, "contacts"],
  });

  const primaryEmail = contacts.find(
    (c) => c.type === "email" && c.isPrimary
  )?.value;
  const primaryPhone = contacts.find(
    (c) => c.type === "phone" && c.isPrimary
  )?.value;

  return (
    <tr className="hover:bg-muted/50">
      <td className="py-3 px-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Home className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">{customer.name}</div>
            <div className="text-sm text-muted-foreground">#{customer.id}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="space-y-1">
          {primaryEmail && <div className="text-sm">{primaryEmail}</div>}
          {primaryPhone && <div className="text-sm">{primaryPhone}</div>}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm">
          {new Date(customer.customerSince).toLocaleDateString()}
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge
          variant={customer.status === "active" ? "default" : "secondary"}
        >
          {customer.status}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm font-medium">${customer.totalSpent || 0}</div>
      </td>
      <td className="py-3 px-4">
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" size="sm" onClick={onClick}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onSendMessage}>
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStatusChange(customer.status === "active" ? "inactive" : "active")}
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CustomerDetails({
  customer,
  addresses,
  contacts,
  serviceHistory,
  paymentMethods,
  documents,
  onClose,
}: {
  customer: Customer;
  addresses: CustomerAddress[];
  contacts: CustomerContact[];
  serviceHistory: ServiceHistory[];
  paymentMethods: PaymentMethod[];
  documents: CustomerDocument[];
  onClose: () => void;
}) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-[100vw]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{customer.name}</SheetTitle>
              <SheetDescription>
                Customer #{customer.id} • {customer.status}
              </SheetDescription>
            </div>
            {customer.vipCustomer && (
              <Badge variant="secondary" className="bg-purple-100">
                <Star className="w-3 h-3 mr-1 text-purple-500" />
                VIP
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          <Tabs defaultValue="info" className="mt-6">
            <TabsList>
              <TabsTrigger value="info">Information</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Customer since {new Date(customer.customerSince).toLocaleDateString()}</span>
                    </div>
                    {customer.birthday && (
                      <div className="flex items-center">
                        <Gift className="w-4 h-4 mr-2" />
                        <span>Birthday: {new Date(customer.birthday).toLocaleDateString()}</span>
                      </div>
                    )}
                    {customer.notes && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground">{customer.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customer.servicePlan ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Current Plan</span>
                        <Badge>{customer.servicePlan}</Badge>
                      </div>
                      {customer.contractStartDate && customer.contractEndDate && (
                        <div className="text-sm text-muted-foreground">
                          Contract period: {new Date(customer.contractStartDate).toLocaleDateString()} - {new Date(customer.contractEndDate).toLocaleDateString()}
                        </div>
                      )}
                      {customer.serviceAddons?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Add-ons</h4>
                          <div className="flex flex-wrap gap-1">
                            {customer.serviceAddons.map((addon, index) => (
                              <Badge key={index} variant="secondary">
                                {addon}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active service plan</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contact methods added</p>
                  ) : (
                    contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
                      >
                        <div className="flex items-center">
                          {contact.type === "email" ? (
                            <Mail className="w-4 h-4 mr-2" />
                          ) : (
                            <Phone className="w-4 h-4 mr-2" />
                          )}
                          <div>
                            <p className="font-medium">{contact.value}</p>
                            <p className="text-sm text-muted-foreground">
                              {contact.type} {contact.isPrimary && "• Primary"}
                            </p>
                          </div>
                        </div>
                        {contact.contactNotes && (
                          <Badge variant="outline" className="text-xs">
                            {contact.contactNotes}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Addresses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addresses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No addresses added</p>
                  ) : (
                    addresses.map((address) => (
                      <div
                        key={address.id}
                        className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
                      >
                        <div>
                          <p className="font-medium">
                            {address.type} {address.isPrimary && "• Primary"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.address}, {address.city}, {address.state} {address.zipCode}
                          </p>
                          {address.specialInstructions && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Note: {address.specialInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Service History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {serviceHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No service history available</p>
                  ) : (
                    serviceHistory.map((service) => (
                      <div
                        key={service.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{service.serviceType}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(service.date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={service.paid ? "default" : "destructive"}>
                            {service.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>
                        {service.findings && (
                          <p className="text-sm">
                            <span className="font-medium">Findings:</span> {service.findings}
                          </p>
                        )}
                        {service.recommendations && (
                          <p className="text-sm">
                            <span className="font-medium">Recommendations:</span> {service.recommendations}
                          </p>
                        )}
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Technician: {service.technician}</span>
                          <span>Cost: ${service.cost}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payment methods added</p>
                  ) : (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
                      >
                        <div className="flex items-center">
                          <CreditCard className="w-4 h-4 mr-2" />
                          <div>
                            <p className="font-medium">
                              {method.type} ending in {method.last4}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {method.isPrimary && "Primary •"}
                              {method.expiryDate && ` Expires ${method.expiryDate}`}
                            </p>
                          </div>
                        </div>
                        {method.autopayEnabled && (
                          <Badge variant="secondary">Autopay</Badge>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Billing Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Spent</span>
                    <span className="font-medium">${customer.totalSpent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Service Count</span>
                    <span className="font-medium">{customer.serviceCount}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No documents available</p>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
                      >
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          <div>
                            <p className="font-medium">{doc.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              {doc.type} • Uploaded on {new Date(doc.uploadDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
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
      serviceAddons: [],
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const res = await apiRequest("POST", "/api/customers", data);
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