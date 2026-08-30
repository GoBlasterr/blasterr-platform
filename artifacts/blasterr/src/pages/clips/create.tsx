import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  useCreateClip, 
  ClipInputStyle, 
  ClipInputCaptionStyle, 
  ClipInputCaptionPosition, 
  ClipInputCaptionAnimation, 
  ClipInputDuration, 
  ClipInputBrandingStyle 
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wand2, Settings2, Clapperboard, Type, AlignCenter, Layout } from "lucide-react";

const clipFormSchema = z.object({
  title: z.string().max(120, "Maximum 120 characters").optional(),
  description: z.string().max(500, "Maximum 500 characters").optional(),
  style: z.nativeEnum(ClipInputStyle),
  duration: z.coerce.number(),
  captionStyle: z.nativeEnum(ClipInputCaptionStyle).optional(),
  captionPosition: z.nativeEnum(ClipInputCaptionPosition).optional(),
  captionAnimation: z.nativeEnum(ClipInputCaptionAnimation).optional(),
  background: z.string().max(80).optional(),
  brandingStyle: z.nativeEnum(ClipInputBrandingStyle).optional(),
  ctaText: z.string().max(120).optional(),
});

export default function CreateClip() {
  const { blastId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createClipMutation = useCreateClip();

  const form = useForm<z.infer<typeof clipFormSchema>>({
    resolver: zodResolver(clipFormSchema),
    defaultValues: {
      title: "",
      description: "",
      style: "BREAKING",
      duration: 15,
      captionStyle: "bold",
      captionPosition: "center",
      captionAnimation: "pop",
      background: "cosmic-dark",
      brandingStyle: "minimal",
      ctaText: "Check out my profile for more",
    },
  });

  const onSubmit = (values: z.infer<typeof clipFormSchema>) => {
    if (!blastId) return;

    createClipMutation.mutate(
      {
        data: {
          blastId,
          ...values,
          duration: values.duration as any,
        }
      },
      {
        onSuccess: (data) => {
          toast({ title: "Clip render queued!" });
          setLocation("/clips");
        },
        onError: () => {
          toast({ title: "Failed to queue render", variant: "destructive" });
        }
      }
    );
  };

  const watchStyle = form.watch("style");
  const watchDuration = form.watch("duration");
  const watchCaptionStyle = form.watch("captionStyle");

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Wand2 className="w-8 h-8 text-primary" />
        <h1 className="font-display font-bold text-3xl text-white">Clip Studio</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-8 items-start">
        
        {/* Left Col: Preview */}
        <div className="md:sticky top-6">
          <div className="aspect-[9/16] w-full max-w-[360px] mx-auto bg-[#0a0a0a] rounded-3xl border-4 border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-8 text-center shadow-[0_0_40px_-15px_rgba(229,244,3,0.2)]">
            <div className="absolute inset-0 cosmic-noise opacity-50 mix-blend-screen"></div>
            
            {/* Safe area guides */}
            <div className="absolute inset-x-4 top-12 bottom-20 border border-white/10 border-dashed rounded-xl pointer-events-none opacity-50"></div>
            
            <div className="z-10 w-full flex flex-col gap-6">
              <div className="text-3xl font-display font-black uppercase tracking-tighter leading-none neon-glow text-white">
                <span className="text-primary block mb-2">{watchStyle}</span>
                BLAST PREVIEW
              </div>
              
              <div className="bg-black/80 backdrop-blur border border-white/10 rounded-xl p-4 mt-8">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 border-b border-white/10 pb-2">
                  <span>Targeting</span>
                  <span className="text-primary">{watchDuration}s</span>
                </div>
                <div className="text-sm font-medium text-white/90">
                  {watchCaptionStyle === 'minimal' ? "Clean aesthetic" : "Bold impact typography"}
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <div className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(229,244,3,0.5)]">
                BLASTERR
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Form */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl border-white/5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-display font-bold text-white border-b border-white/10 pb-2">
                  <Layout className="w-5 h-5 text-primary" /> Basic Info
                </div>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Clip Title (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Catchy title for the feed..." className="bg-black/50 border-white/10 focus-visible:ring-primary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What's this clip about?" className="resize-none bg-black/50 border-white/10 focus-visible:ring-primary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-display font-bold text-white border-b border-white/10 pb-2">
                  <Clapperboard className="w-5 h-5 text-primary" /> Production
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Video Style</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/50 border-white/10">
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-white/10">
                            {Object.values(ClipInputStyle).map(style => (
                              <SelectItem key={style} value={style} className="cursor-pointer">{style}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Duration (seconds)</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                          <FormControl>
                            <SelectTrigger className="bg-black/50 border-white/10">
                              <SelectValue placeholder="Duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-white/10">
                            <SelectItem value="15" className="cursor-pointer">15 Seconds</SelectItem>
                            <SelectItem value="30" className="cursor-pointer">30 Seconds</SelectItem>
                            <SelectItem value="45" className="cursor-pointer">45 Seconds</SelectItem>
                            <SelectItem value="60" className="cursor-pointer">60 Seconds</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-display font-bold text-white border-b border-white/10 pb-2">
                  <Type className="w-5 h-5 text-primary" /> Typography & Captions
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="captionStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Font Style</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/50 border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-white/10">
                            {Object.values(ClipInputCaptionStyle).map(v => <SelectItem key={v} value={v} className="cursor-pointer">{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="captionPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Position</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/50 border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-white/10">
                            {Object.values(ClipInputCaptionPosition).map(v => <SelectItem key={v} value={v} className="cursor-pointer">{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="captionAnimation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Animation</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/50 border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-white/10">
                            {Object.values(ClipInputCaptionAnimation).map(v => <SelectItem key={v} value={v} className="cursor-pointer">{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-display font-bold text-white border-b border-white/10 pb-2">
                  <Settings2 className="w-5 h-5 text-primary" /> Branding
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brandingStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Watermark</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-black/50 border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-white/10">
                            {Object.values(ClipInputBrandingStyle).map(v => <SelectItem key={v} value={v} className="cursor-pointer">{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ctaText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">End Card Text</FormLabel>
                        <FormControl>
                          <Input className="bg-black/50 border-white/10 focus-visible:ring-primary" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl neon-border hover:shadow-[0_0_20px_rgba(229,244,3,0.4)] transition-all"
                  disabled={createClipMutation.isPending}
                >
                  {createClipMutation.isPending ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Queuing Render...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-6 h-6 mr-2" />
                      Generate Clip
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
