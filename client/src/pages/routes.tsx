import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, MapPin } from "lucide-react";
import { Appointment, Customer } from "@shared/schema";

// Fix Leaflet marker icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export default function Routes() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const dayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    return (
      aptDate.getDate() === selectedDate.getDate() &&
      aptDate.getMonth() === selectedDate.getMonth() &&
      aptDate.getFullYear() === selectedDate.getFullYear()
    );
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
        <p className="text-muted-foreground">
          Plan and optimize your service routes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Select date to view appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="border rounded-lg mb-4"
            />
            <ScrollArea className="h-[400px]">
              {dayAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center">
                  No appointments for this day
                </p>
              ) : (
                dayAppointments.map((apt) => {
                  const customer = customers.find((c) => c.id === apt.customerId);
                  return (
                    <div
                      key={apt.id}
                      className="p-4 border rounded-lg mb-2 last:mb-0"
                    >
                      <p className="font-medium">{customer?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(apt.date), "h:mm a")}
                      </p>
                      <p className="text-sm flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {customer?.address}
                      </p>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-8">
          <CardHeader>
            <CardTitle>Route Map</CardTitle>
            <CardDescription>
              View appointments locations for {format(selectedDate, "MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[600px] rounded-lg overflow-hidden">
              <MapContainer
                center={[40.7128, -74.0060]} // Default to NYC
                zoom={11}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {dayAppointments.map((apt) => {
                  const customer = customers.find((c) => c.id === apt.customerId);
                  if (!apt.location) return null;
                  const location = apt.location as { lat: number; lng: number };

                  return (
                    <Marker key={apt.id} position={[location.lat, location.lng]}>
                      <Popup>
                        <div>
                          <p className="font-medium">{customer?.name}</p>
                          <p className="text-sm">
                            {format(new Date(apt.date), "h:mm a")}
                          </p>
                          <p className="text-sm">{customer?.address}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}