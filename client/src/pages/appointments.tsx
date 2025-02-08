import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Appointment,
  Customer,
  insertAppointmentSchema,
  InsertAppointment,
} from "@shared/schema";

// Utility function to format date for input
function formatDateForInput(date: Date): string {
  return date.toLocaleString('sv-SE').slice(0, 16);
}

// Utility function to parse input date with strict 15-minute intervals
function parseInputDate(dateString: string): Date {
  const date = new Date(dateString);
  // Round to nearest 15 minutes
  const minutes = date.getMinutes();
  const remainder = minutes % 15;
  const roundedMinutes = remainder < 8 ? minutes - remainder : minutes + (15 - remainder);

  date.setMinutes(roundedMinutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function AppointmentItem({
  appointment,
  customer
}: {
  appointment: Appointment;
  customer: Customer | undefined;
}) {
  const [isRescheduling, setIsRescheduling] = useState(false);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <p className="font-medium">{customer?.name}</p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(appointment.date), "h:mm a")} - {appointment.serviceType}
        </p>
        <p className="text-sm text-muted-foreground">
          {customer?.address}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRescheduling(true)}
        >
          Reschedule
        </Button>
        <AppointmentStatusButton appointment={appointment} />
      </div>
      {isRescheduling && (
        <RescheduleDialog
          appointment={appointment}
          isOpen={isRescheduling}
          onClose={() => setIsRescheduling(false)}
        />
      )}
    </div>
  );
}

function RescheduleDialog({
  appointment,
  isOpen,
  onClose
}: {
  appointment: Appointment;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      customerId: appointment.customerId,
      date: appointment.date,
      serviceType: appointment.serviceType,
      status: appointment.status,
      notes: appointment.notes || '',
      location: appointment.location as { lat: number; lng: number } | null
    }
  });

  const updateAppointment = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const payload = {
        date: data.date,
      };

      const res = await apiRequest("PATCH", `/api/appointments/${appointment.id}`, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update appointment');
      }
      return res.json();
    },
    onSuccess: () => {
      onClose();
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment rescheduled",
        description: "The appointment has been rescheduled successfully",
      });
    },
    onError: (error) => {
      console.error('Appointment update error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Update the appointment date and time
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => updateAppointment.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      step={900} // 15 minutes in seconds
                      {...field}
                      onChange={(e) => {
                        const inputDate = e.target.value;
                        if (inputDate) {
                          const date = parseInputDate(inputDate);
                          field.onChange(date.toISOString());
                        }
                      }}
                      value={field.value ? formatDateForInput(new Date(field.value)) : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={updateAppointment.isPending}
            >
              Update Appointment
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function NewAppointmentDialog({ customers }: { customers: Customer[] }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      customerId: undefined,
      date: new Date().toISOString(),
      serviceType: undefined,
      status: 'pending',
      notes: '',
      location: { lat: 0, lng: 0 }
    }
  });

  const createAppointment = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const res = await apiRequest("POST", "/api/appointments", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create appointment');
      }
      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment created",
        description: "The appointment has been scheduled successfully",
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Create a new service appointment for a customer
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createAppointment.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={customer.id.toString()}
                        >
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      step={900} // 15 minutes in seconds
                      {...field}
                      onChange={(e) => {
                        const inputDate = e.target.value;
                        if (inputDate) {
                          const date = parseInputDate(inputDate);
                          field.onChange(date.toISOString());
                        }
                      }}
                      value={field.value ? formatDateForInput(new Date(field.value)) : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General Pest Control</SelectItem>
                      <SelectItem value="termite">Termite Treatment</SelectItem>
                      <SelectItem value="rodent">Rodent Control</SelectItem>
                      <SelectItem value="mosquito">Mosquito Treatment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createAppointment.isPending}
            >
              Create Appointment
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentStatusButton({ appointment }: { appointment: Appointment }) {
  const { toast } = useToast();

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/appointments/${appointment.id}`, {
        status,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Status updated",
        description: "The appointment status has been updated",
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
    <Select
      value={appointment.status}
      onValueChange={(status) => updateStatus.mutate(status)}
    >
      <SelectTrigger className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="confirmed">Confirmed</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function Appointments() {
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    return (
      aptDate.getDate() === selectedDate.getDate() &&
      aptDate.getMonth() === selectedDate.getMonth() &&
      aptDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage your service schedule</p>
        </div>
        <NewAppointmentDialog customers={customers} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="border rounded-lg"
          />
        </div>

        <div className="md:col-span-1 lg:col-span-2 border rounded-lg p-4">
          <h2 className="font-semibold mb-4">
            Appointments for {format(selectedDate, "MMMM d, yyyy")}
          </h2>
          <div className="space-y-4">
            {dayAppointments.length === 0 ? (
              <p className="text-muted-foreground">No appointments scheduled</p>
            ) : (
              dayAppointments.map((apt) => (
                <AppointmentItem
                  key={apt.id}
                  appointment={apt}
                  customer={customers.find((c) => c.id === apt.customerId)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}