import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  useCreateBlast,
  useSearch,
  getGetFeedQueryKey,
  getSearchQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Image as ImageIcon, MapPin, Target as TargetIcon, Search, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce"; // We'll create this

const blastSchema = z.object({
  content: z.string().min(1, "Enter some text").max(1000, "Too long"),
  targetId: z.string().min(1, "Select a target"),
});

export default function CreateBlast() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateBlast();
  
  const [targetQuery, setTargetQuery] = useState("");
  const debouncedQuery = useDebounce(targetQuery, 300);
  const searchParams = { q: debouncedQuery, type: 'targets' as const };
  const { data: searchResults, isLoading: isSearching } = useSearch(searchParams, {
    query: {
      enabled: debouncedQuery.length > 2,
      queryKey: getSearchQueryKey(searchParams),
    },
  });
  
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  const form = useForm<z.infer<typeof blastSchema>>({
    resolver: zodResolver(blastSchema),
    defaultValues: {
      content: "",
      targetId: "",
    },
  });

  const onSubmit = (values: z.infer<typeof blastSchema>) => {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          toast({ title: "Blast fired successfully!" });
          setLocation("/home");
        },
        onError: () => {
          toast({ title: "Failed to fire Blast", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative z-10">
      <header className="sticky top-0 z-30 glass-panel border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/home")} className="rounded-full hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-display font-bold text-xl text-white">Create Blast</span>
        </div>
        <Button 
          onClick={form.handleSubmit(onSubmit)} 
          disabled={!form.formState.isValid || createMutation.isPending}
          className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 px-6 shadow-[0_0_15px_rgba(204,255,0,0.3)] disabled:opacity-50"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fire"}
        </Button>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <Form {...form}>
          <form className="space-y-6 max-w-2xl mx-auto">
            
            {/* Target Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <TargetIcon className="w-4 h-4" /> Select Target
              </label>
              
              {selectedTarget ? (
                <div className="flex items-center justify-between p-4 rounded-xl border border-primary/50 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                       {selectedTarget.imageUrl ? <img src={selectedTarget.imageUrl} className="w-full h-full object-cover rounded" /> : <TargetIcon className="w-5 h-5 text-primary" />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{selectedTarget.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedTarget.type}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedTarget(null); form.setValue("targetId", ""); }} className="text-muted-foreground hover:text-white">
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search for a person, place, product..." 
                      className="pl-9 bg-card border-white/10 h-12 rounded-xl"
                      value={targetQuery}
                      onChange={e => setTargetQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Dropdown results mock */}
                  {targetQuery.length > 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {isSearching ? (
                        <div className="p-4 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                      ) : searchResults?.targets?.length ? (
                        searchResults.targets.map(t => (
                          <div 
                            key={t.id} 
                            className="p-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0"
                            onClick={() => {
                              setSelectedTarget(t);
                              form.setValue("targetId", t.id);
                              setTargetQuery("");
                            }}
                          >
                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                              {t.imageUrl ? <img src={t.imageUrl} className="w-full h-full object-cover rounded" /> : <TargetIcon className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className="font-medium text-white">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.type}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No targets found. <Button variant="link" className="text-primary px-1 h-auto py-0">Create new target</Button>
                        </div>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </div>
              )}
            </div>

            {/* Content Input */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="What's your read on this target?" 
                        className="min-h-[150px] resize-none bg-transparent border-0 focus-visible:ring-0 px-0 text-xl text-white placeholder:text-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          </form>
        </Form>
      </main>

      {/* Toolbar */}
      <div className="sticky bottom-0 border-t border-white/10 bg-background/80 backdrop-blur-xl p-4 md:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10">
              <ImageIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-10 w-10">
              <MapPin className="w-5 h-5" />
            </Button>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            {form.watch("content").length} / 1000
          </div>
        </div>
      </div>
    </div>
  );
}
