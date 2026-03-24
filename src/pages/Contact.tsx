import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-extrabold text-foreground">Contact Us</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Share feedback, support issues, or advisor complaints.
          </p>
          <div className="mt-5 space-y-3">
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Textarea
              placeholder="Write your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[140px]"
            />
            <Button
              onClick={() => {
                toast.success("Thanks! Your message has been noted.");
                setName("");
                setEmail("");
                setMessage("");
              }}
              disabled={!name.trim() || !email.trim() || !message.trim()}
            >
              Send Message
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
