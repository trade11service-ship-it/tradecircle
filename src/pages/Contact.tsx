import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { setMetaTags, SEO_CONFIG } from "@/lib/seo";

export default function Contact() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMetaTags(SEO_CONFIG.contact);
  }, []);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user?.id ?? null,
      name: name.trim().slice(0, 120),
      email: trimmedEmail.slice(0, 200),
      message: message.trim().slice(0, 5000),
    });
    setSending(false);
    if (error) {
      toast.error("Could not send your message. Please try again.");
      return;
    }
    toast.success("Thanks! Your message has been sent — we'll get back to you by email.");
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-muted">
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
              onClick={handleSubmit}
              disabled={sending || !name.trim() || !email.trim() || !message.trim()}
            >
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
