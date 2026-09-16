import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetBusiness, useSubmitBusinessClaim, BusinessClaimInputVerificationMethod } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ShieldCheck, Mail, Globe, FileText, CheckCircle2, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/seo";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const claimSchema = z.object({
  verificationMethod: z.enum([
    BusinessClaimInputVerificationMethod.business_email,
    BusinessClaimInputVerificationMethod.website,
    BusinessClaimInputVerificationMethod.documentation,
    BusinessClaimInputVerificationMethod.admin_review
  ]),
  evidence: z.string().max(2000, "Evidence is too long").optional(),
});

export default function BusinessClaim() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const slug = params.slug || "";
  const { toast } = useToast();
  
  const { data: business, isLoading } = useGetBusiness(slug);
  const submitClaim = useSubmitBusinessClaim();
  
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof claimSchema>>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      verificationMethod: BusinessClaimInputVerificationMethod.business_email,
      evidence: "",
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-1/3 mb-8" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-12 w-full mb-4" />
      </div>
    );
  }

  if (!business) {
    return <div className="p-12 text-center">Business not found</div>;
  }

  const onSubmit = (values: z.infer<typeof claimSchema>) => {
    submitClaim.mutate(
      { targetId: business.id, data: values },
      {
        onSuccess: () => {
          setSubmitted(true);
        },
        onError: (err: any) => {
          toast({
            title: "Failed to submit claim",
            description: err.message || "An error occurred while submitting your claim.",
            variant: "destructive"
          });
        }
      }
    );
  };

  if (submitted) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-black text-white mb-2">Claim Submitted</h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          We've received your claim for <strong>{business.name}</strong>. Our team will review your evidence and update your status shortly.
        </p>
        <Button onClick={() => setLocation(`/business/${business.slug}`)} className="rounded-full">
          Return to Business
        </Button>
      </div>
    );
  }

  return (
    <>
      <Seo title={`Claim ${business.name} | BLASTERR`} description="Claim your business to manage your presence on BLASTERR." />
      <div className="flex flex-col min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/business/${business.slug}`)}
            className="rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-display font-bold text-xl text-white">Claim Business</span>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 max-w-2xl mx-auto w-full">
          <div className="mb-8 flex items-center gap-4 bg-card p-4 rounded-2xl border border-white/5">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/50 shrink-0">
              {business.imageUrl ? (
                <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Briefcase className="w-6 h-6" /></div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{business.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">Select a verification method to prove ownership.</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="verificationMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Verification Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl focus:ring-primary/50">
                          <SelectValue placeholder="Select a method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-white/10">
                        <SelectItem value={BusinessClaimInputVerificationMethod.business_email}>
                          <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> Business Email</div>
                        </SelectItem>
                        <SelectItem value={BusinessClaimInputVerificationMethod.website}>
                          <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /> Website Domain</div>
                        </SelectItem>
                        <SelectItem value={BusinessClaimInputVerificationMethod.documentation}>
                          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /> Official Documentation</div>
                        </SelectItem>
                        <SelectItem value={BusinessClaimInputVerificationMethod.admin_review}>
                          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-muted-foreground" /> Manual Admin Review</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Evidence & Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide your business email, website URL, or links to documentation..." 
                        className="min-h-[120px] bg-black/40 border-white/10 rounded-xl resize-none focus-visible:ring-primary/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 text-lg shadow-[0_0_20px_rgba(229,244,3,0.3)]"
                disabled={submitClaim.isPending}
              >
                {submitClaim.isPending ? "Submitting..." : "Submit Claim"}
              </Button>
            </form>
          </Form>
        </main>
      </div>
    </>
  );
}
