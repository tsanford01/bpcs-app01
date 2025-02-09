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
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, MapPin } from "lucide-react";
import { Appointment, CustomerWithRelations } from "@shared/schema";

// Fix Leaflet marker icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl;

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Simple geocoding function (this would ideally use a proper geocoding service)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    );
    const data = await response.json();
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export default function Routes() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [locations, setLocations] = useState<Map<string, { lat: number; lng: number }>>(new Map());

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: customers = [] } = useQuery<CustomerWithRelations[]>({
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

  // Geocode addresses when appointments or customers change
  useEffect(() => {
    const geocodeAddresses = async () => {
      const newLocations = new Map<string, { lat: number; lng: number }>();

      for (const apt of dayAppointments) {
        const customer = customers.find((c) => c.id === apt.customerId);
        const primaryAddress = customer?.addresses?.find(addr => addr.isPrimary) || customer?.addresses?.[0];

        if (primaryAddress) {
          const addressString = `${primaryAddress.address}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.zipCode}`;
          if (!locations.has(addressString)) {
            const coords = await geocodeAddress(addressString);
            if (coords) {
              newLocations.set(addressString, coords);
            }
          } else {
            newLocations.set(addressString, locations.get(addressString)!);
          }
        }
      }

      setLocations(newLocations);
    };

    geocodeAddresses();
  }, [dayAppointments, customers]);

  // Calculate map center based on all locations
  const getMapCenter = () => {
    if (locations.size === 0) {
      return [40.3484, -111.7786] as L.LatLngExpression; // Default center
    }

    const coords = Array.from(locations.values());
    const center = coords.reduce(
      (acc, curr) => ({
        lat: acc.lat + curr.lat / coords.length,
        lng: acc.lng + curr.lng / coords.length,
      }),
      { lat: 0, lng: 0 }
    );

    return [center.lat, center.lng] as L.LatLngExpression;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
        <p className="text-muted-foreground">
          Plan and optimize your service routes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <Card className="md:col-span-4 h-fit">
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Select date to view appointments</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="border rounded-lg mb-4"
            />
            <ScrollArea className="h-[400px] pr-4">
              {dayAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center">
                  No appointments for this day
                </p>
              ) : (
                dayAppointments.map((apt) => {
                  const customer = customers.find((c) => c.id === apt.customerId);
                  const primaryAddress = customer?.addresses?.find(addr => addr.isPrimary) || customer?.addresses?.[0];

                  return (
                    <div
                      key={apt.id}
                      className="p-4 border rounded-lg mb-2 last:mb-0"
                    >
                      <p className="font-medium">{customer?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(apt.date), "h:mm a")}
                      </p>
                      {primaryAddress && (
                        <p className="text-sm flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {`${primaryAddress.address}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.zipCode}`}
                        </p>
                      )}
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
                center={getMapCenter()}
                zoom={11}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {dayAppointments.map((apt) => {
                  const customer = customers.find((c) => c.id === apt.customerId);
                  const primaryAddress = customer?.addresses?.find(addr => addr.isPrimary) || customer?.addresses?.[0];

                  if (!primaryAddress) return null;

                  const addressString = `${primaryAddress.address}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.zipCode}`;
                  const location = locations.get(addressString);

                  if (!location) return null;

                  return (
                    <Marker 
                      key={apt.id} 
                      position={[location.lat, location.lng] as L.LatLngExpression}
                    >
                      <Popup>
                        <div>
                          <p className="font-medium">{customer?.name}</p>
                          <p className="text-sm">
                            {format(new Date(apt.date), "h:mm a")}
                          </p>
                          <p className="text-sm">{addressString}</p>
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