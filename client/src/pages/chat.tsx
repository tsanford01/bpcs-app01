import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Customer, Message } from "@shared/schema";
import { Send } from "lucide-react";

export default function Chat() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedCustomer?.id],
    enabled: !!selectedCustomer,
  });

  const { sendMessage } = useWebSocket((data) => {
    if (data.customerId === selectedCustomer?.id) {
      refetchMessages();
    }
  });

  const handleSendMessage = () => {
    if (!selectedCustomer || !newMessage.trim()) return;
    
    sendMessage({
      customerId: selectedCustomer.id,
      content: newMessage,
      fromCustomer: false,
      timestamp: new Date(),
    });
    
    setNewMessage("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
        <p className="text-muted-foreground">
          Communicate with your customers
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>Select a customer to chat with</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className={`p-4 cursor-pointer hover:bg-accent rounded-lg mb-2 ${
                    selectedCustomer?.id === customer.id
                      ? "bg-accent"
                      : ""
                  }`}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.email}
                  </p>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-8">
          <CardHeader>
            <CardTitle>
              {selectedCustomer ? selectedCustomer.name : "Select a customer"}
            </CardTitle>
            {selectedCustomer && (
              <CardDescription>{selectedCustomer.email}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedCustomer ? (
              <>
                <ScrollArea className="h-[500px] mb-4">
                  <div className="space-y-4">
                    {messages.map((message, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          message.fromCustomer ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.fromCustomer
                              ? "bg-accent"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                Select a customer to start chatting
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
