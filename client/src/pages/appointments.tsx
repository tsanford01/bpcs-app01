import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfDay, addMinutes, isSameDay, isWithinInterval } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Constants for time slots
const BUSINESS_HOURS_START = 8; // 8 AM
const BUSINESS_HOURS_END = 18; // 6 PM
const TIME_SLOT_DURATION = 15; // 15 minutes
const APPOINTMENT_DURATION = 60; // 1 hour

interface TimeSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
  appointment?: Appointment;
}

function TimeGrid({
  selectedDate,
  appointments,
  onSelectSlot,
  customers
}: {
  selectedDate: Date;
  appointments: Appointment[];
  onSelectSlot: (slot: TimeSlot) => void;
  customers: Customer[];
}) {
  const [hoveredSlot, setHoveredSlot] = useState<TimeSlot | null>(null);

  // Calculate if a slot would overlap with existing appointments
  const wouldOverlap = (slot: TimeSlot) => {
    if (!slot) return false;

    // Calculate the end time for a full hour appointment
    const appointmentEnd = addMinutes(slot.start, APPOINTMENT_DURATION);

    return appointments.some(apt => {
      // Skip cancelled appointments
      if (apt.status === 'cancelled') return false;

      const aptStart = new Date(apt.date);
      const aptEnd = addMinutes(aptStart, APPOINTMENT_DURATION);
      return (
        isSameDay(aptStart, selectedDate) &&
        (
          // Check if appointment start falls within existing appointment
          (slot.start >= aptStart && slot.start < aptEnd) ||
          // Check if appointment end falls within existing appointment
          (appointmentEnd > aptStart && appointmentEnd <= aptEnd) ||
          // Check if appointment completely encompasses existing appointment
          (slot.start <= aptStart && appointmentEnd >= aptEnd)
        )
      );
    });
  };

  const timeSlots = useMemo(() => {
    const slots: { [hour: number]: TimeSlot[] } = {};

    // Initialize slots for each hour
    for (let hour = BUSINESS_HOURS_START; hour < BUSINESS_HOURS_END; hour++) {
      slots[hour] = [];
      const startTime = new Date(selectedDate);
      startTime.setHours(hour, 0, 0, 0);

      // Create 4 slots per hour (15 minutes each)
      for (let minute = 0; minute < 60; minute += TIME_SLOT_DURATION) {
        const slot: TimeSlot = {
          start: new Date(startTime),
          end: addMinutes(new Date(startTime), TIME_SLOT_DURATION),
          isAvailable: true
        };

        // Check for overlapping appointments
        const overlappingAppointment = appointments.find(apt => {
          // Skip cancelled appointments
          if (apt.status === 'cancelled') return false;

          const aptStart = new Date(apt.date);
          const aptEnd = addMinutes(aptStart, APPOINTMENT_DURATION);
          return (
            isSameDay(aptStart, selectedDate) &&
            (
              // Check if slot falls within appointment time
              (slot.start >= aptStart && slot.start < aptEnd)
            )
          );
        });

        if (overlappingAppointment) {
          slot.isAvailable = false;
          slot.appointment = overlappingAppointment;
        }

        slots[hour].push(slot);
        startTime.setMinutes(startTime.getMinutes() + TIME_SLOT_DURATION);
      }
    }
    return slots;
  }, [selectedDate, appointments]);

  return (
    <div className="border rounded-lg p-4">
      <div className="grid grid-cols-[100px_1fr] gap-4">
        <div></div>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[0, 15, 30, 45].map((minute) => (
            <div key={minute} className="text-center text-sm text-muted-foreground">
              :{minute.toString().padStart(2, '0')}
            </div>
          ))}
        </div>
        {Object.entries(timeSlots).map(([hour, slots]) => (
          <div key={hour} className="contents">
            <div className="text-sm font-medium">
              {format(slots[0].start, 'h a')}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot, index) => {
                const customer = slot.appointment
                  ? customers.find(c => c.id === slot.appointment?.customerId)
                  : undefined;

                const isHovered = hoveredSlot &&
                  slot.start >= hoveredSlot.start &&
                  slot.start < addMinutes(hoveredSlot.start, APPOINTMENT_DURATION);

                const hasOverlap = isHovered && wouldOverlap(hoveredSlot);

                return (
                  <div
                    key={index}
                    onClick={() => slot.isAvailable && !hasOverlap && onSelectSlot(slot)}
                    onMouseEnter={() => slot.isAvailable && setHoveredSlot(slot)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    className={cn(
                      "h-12 rounded-md border p-1 cursor-pointer transition-colors relative group",
                      slot.isAvailable
                        ? isHovered
                          ? hasOverlap
                            ? "bg-red-200 border-red-300"
                            : "bg-green-200 border-green-300"
                          : "hover:bg-accent hover:text-accent-foreground"
                        : "bg-primary/20 cursor-not-allowed"
                    )}
                  >
                    {slot.appointment && slot.appointment.status !== 'cancelled' && (
                      <div className="absolute inset-1 rounded bg-primary/30 p-1">
                        <p className="text-xs font-medium truncate">
                          {customer?.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {slot.appointment.serviceType}
                        </p>
                      </div>
                    )}
                    {slot.isAvailable && !hasOverlap && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-accent/50 rounded-md">
                        <Plus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewAppointmentDialog({
  customers,
  selectedTimeSlot,
  onClose
}: {
  customers: Customer[];
  selectedTimeSlot?: TimeSlot;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<InsertAppointment>({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      customerId: undefined,
      date: selectedTimeSlot?.start.toISOString() || new Date().toISOString(),
      serviceType: undefined,
      status: 'pending',
      notes: '',
      // Set a default location for Utah County
      location: { lat: 40.3484, lng: -111.7786 }
    }
  });

  // Use the provided selectedTimeSlot
  useEffect(() => {
    if (selectedTimeSlot) {
      form.setValue('date', selectedTimeSlot.start.toISOString());
    }
  }, [selectedTimeSlot, form]);

  const createAppointment = useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const customer = customers.find(c => c.id === data.customerId);

      // If customer has a location, use it, otherwise use the default
      if (customer?.location) {
        data.location = customer.location;
      }

      const res = await apiRequest("POST", "/api/appointments", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create appointment');
      }
      return res.json();
    },
    onSuccess: () => {
      onClose();
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
                <FormLabel>Selected Time Slot</FormLabel>
                <FormControl>
                  <div className="p-3 rounded-md bg-muted">
                    <p className="text-sm">
                      {selectedTimeSlot ? (
                        format(selectedTimeSlot.start, "PPP 'at' h:mm a")
                      ) : (
                        "No time slot selected"
                      )}
                    </p>
                  </div>
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
  );
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

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      // Create a Date object in local timezone
      const date = new Date(value);
      form.setValue('date', date.toISOString());
    }
  };

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
                      step={900} // 15 minutes
                      onChange={handleDateTimeChange}
                      value={
                        field.value
                          ? new Date(field.value).toLocaleString('sv-SE').slice(0, 16)
                          : ''
                      }
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Filter appointments for the selected date
  const selectedDateAppointments = useMemo(() => {
    return appointments.filter(apt =>
      isSameDay(new Date(apt.date), selectedDate) && apt.status !== 'cancelled'
    ).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [appointments, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage your service schedule</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
            disabled={(date) =>
              date < startOfDay(new Date())
            }
          />

          <div className="rounded-lg border p-3">
            <h3 className="font-medium mb-2">Selected Date</h3>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "PPPP")}
            </p>
          </div>

          {/* Add list of appointments for selected date */}
          <div className="rounded-lg border p-3">
            <h3 className="font-medium mb-2">Scheduled Appointments</h3>
            <div className="space-y-2">
              {selectedDateAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No appointments scheduled for this date
                </p>
              ) : (
                selectedDateAppointments.map(apt => {
                  const customer = customers.find(c => c.id === apt.customerId);
                  return (
                    <div key={apt.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{format(new Date(apt.date), "h:mm a")}</p>
                          <p>{customer?.name}</p>
                          <p className="text-muted-foreground">{apt.serviceType}</p>
                        </div>
                        <AppointmentStatusButton appointment={apt} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Available Time Slots</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                disabled={selectedDate <= startOfDay(new Date())}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TimeGrid
            selectedDate={selectedDate}
            appointments={appointments}
            customers={customers}
            onSelectSlot={(slot) => {
              setSelectedTimeSlot(slot);
              setIsDialogOpen(true);
            }}
          />
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <NewAppointmentDialog
          customers={customers}
          selectedTimeSlot={selectedTimeSlot}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedTimeSlot(undefined);
          }}
        />
      </Dialog>
    </div>
  );
}