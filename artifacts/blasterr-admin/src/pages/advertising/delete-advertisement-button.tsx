import { useState } from "react";
import {
  getListAdminAdvertisementsQueryKey,
  useDeleteAdminAdvertisement,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteAdvertisementButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMutation = useDeleteAdminAdvertisement();

  const deleteAdvertisement = () => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({
            title: "Advertisement deleted",
            description: "It was removed from ad listings. Delivery and billing history are retained.",
          });
          queryClient.invalidateQueries({ queryKey: getListAdminAdvertisementsQueryKey() });
          setOpen(false);
        },
        onError: (error: any) => {
          toast({
            title: "Delete failed",
            description: error.message || "The advertisement could not be deleted.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete advertisement"
          title="Delete advertisement"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this advertisement?</DialogTitle>
          <DialogDescription>
            The ad will be removed from active admin listings and stop delivering. Its delivery,
            review, and billing history will remain available for reporting and audit.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={deleteAdvertisement} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}