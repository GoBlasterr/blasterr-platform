import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { User, Bell, Shield, Paintbrush, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Settings() {
  const { data: user } = useGetCurrentUser();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 glass-panel border-b border-white/10 p-4 md:px-6">
        <h2 className="font-display font-bold text-2xl text-white">System Settings</h2>
      </div>

      <div className="flex-1 p-4 md:p-6 max-w-3xl w-full">
        {/* Profile Settings */}
        <section className="mb-10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-white/5 pb-2">
            <User className="w-5 h-5 text-primary" /> Profile Configuration
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-20 h-20 border border-white/10">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-full">
                Change Avatar
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase text-xs tracking-wider">Display Name</Label>
                <Input defaultValue={user?.displayName} className="bg-card border-white/10 h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground uppercase text-xs tracking-wider">Username</Label>
                <Input defaultValue={user?.username} className="bg-card border-white/10 h-12 rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Bio</Label>
              <Textarea defaultValue={user?.bio} className="bg-card border-white/10 min-h-[100px] rounded-xl resize-none" />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Location</Label>
              <Input defaultValue={user?.location} className="bg-card border-white/10 h-12 rounded-xl max-w-sm" />
            </div>

            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8">
              Save Profile
            </Button>
          </div>
        </section>

        {/* Notifications */}
        <section className="mb-10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-white/5 pb-2">
            <Bell className="w-5 h-5 text-blue-400" /> Comm Alerts
          </h3>
          
          <div className="space-y-6 bg-card border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive alerts on your device</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Email Digests</p>
                <p className="text-sm text-muted-foreground">Daily summary of top blasts</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Mentions & Replies</p>
                <p className="text-sm text-muted-foreground">When someone engages with your blasts</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="mb-10">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white mb-6 border-b border-white/5 pb-2">
            <Shield className="w-5 h-5 text-red-400" /> Security & Privacy
          </h3>
          
          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-start h-12 border-white/10 hover:bg-white/5 text-white rounded-xl">
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start h-12 border-white/10 hover:bg-white/5 text-white rounded-xl">
              Two-Factor Authentication (2FA)
            </Button>
            <Button variant="outline" className="w-full justify-start h-12 border-white/10 hover:bg-white/5 text-white rounded-xl">
              Manage Blocked Users
            </Button>
          </div>
        </section>

        <section className="border-t border-white/5 pt-8 mb-24 md:mb-8">
           <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl w-full sm:w-auto">
             <LogOut className="w-4 h-4 mr-2" /> Disconnect Session
           </Button>
        </section>
      </div>
    </div>
  );
}
