import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Briefcase } from "lucide-react";
import { BusinessProfileInputCategory, getListOwnedBusinessesQueryKey, useCreateBusinessProfile, useListOwnedBusinesses } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";

const categories = Object.values(BusinessProfileInputCategory);

export default function CreateBusinessProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: ownedBusinesses } = useListOwnedBusinesses({
    query: {
      enabled: !!currentUser,
      queryKey: [...getListOwnedBusinessesQueryKey(), currentUser?.id ?? "guest"],
    },
  });
  const createBusiness = useCreateBusinessProfile();
  const [form, setForm] = useState({
    name: "",
    location: "",
    category: BusinessProfileInputCategory.Services,
    description: "",
    website: "",
    email: "",
    phone: "",
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createBusiness.mutate(
      { data: form },
      {
        onSuccess: (business) => {
          queryClient.invalidateQueries({ queryKey: getListOwnedBusinessesQueryKey() });
          setLocation(`/business/${business.id}/center`);
        },
        onError: (error) => {
          const message = (error as any)?.data?.error || error.message || "Business profile could not be created.";
          toast({ title: "Unable to create business profile", description: message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/10 px-4 py-3 glass-panel">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-xl font-bold text-white">Create a Business Target</h1>
          <p className="text-xs text-muted-foreground">Your personal profile will own this business page.</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <Briefcase className="mb-3 h-7 w-7 text-primary" />
          <h2 className="font-display text-xl font-bold text-white">Build your business presence</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            This creates a separate public Business Target page. You can manage it through Business Center without changing your personal profile.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-white/10 bg-card/70 p-5 md:p-7">
          <Field label="Business name">
            <Input required maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your business name" />
          </Field>
          <Field label="City or location">
            <Input required maxLength={160} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Charlotte, NC" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(category) => setForm({ ...form, category: category as typeof form.category })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="About the business">
            <Textarea required maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell people what your business does." className="min-h-28" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Website (optional)"><Input maxLength={500} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" /></Field>
            <Field label="Business email (optional)"><Input type="email" maxLength={320} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hello@example.com" /></Field>
          </div>
          <Field label="Phone (optional)"><Input maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Business phone number" /></Field>
          <Button type="submit" disabled={createBusiness.isPending || ownedBusinesses?.canCreate === false} className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground">
            {ownedBusinesses?.canCreate === false ? "5 Page Limit Reached" : createBusiness.isPending ? "Creating business page…" : "Create Business Target"}
          </Button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-white">{label}</span>{children}</label>;
}