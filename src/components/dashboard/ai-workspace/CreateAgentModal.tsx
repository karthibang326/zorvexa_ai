import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Zap, Activity, Coins, ClipboardList } from "lucide-react";

const agentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["monitoring", "security", "cost", "deployment"]),
  objective: z.string().min(5, "Objective must be at least 5 characters"),
  cluster: z.string().min(2, "Cluster is required"),
  namespace: z.string().min(2, "Namespace is required"),
  service: z.string().min(2, "Service is required"),
  autoRemediation: z.boolean().default(false),
  logsSource: z.string().default("loki"),
  metricsSource: z.string().default("prometheus"),
});

type AgentFormValues = z.infer<typeof agentSchema>;

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgentFormValues) => Promise<void>;
}

export const CreateAgentModal = ({ isOpen, onClose, onSubmit }: CreateAgentModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      type: "monitoring",
      objective: "",
      cluster: "us-east-1-prod",
      namespace: "default",
      service: "",
      autoRemediation: false,
      logsSource: "loki",
      metricsSource: "prometheus",
    },
  });

  const handleSubmit = async (values: AgentFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-card border-border-subtle rounded-3xl shadow-2xl overflow-hidden p-0">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-glow-accent to-primary" />
        
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-black uppercase tracking-widest italic text-foreground flex items-center gap-3">
             <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <ShieldCheck className="w-6 h-6 text-primary" />
             </div>
             Create Sentinel Agent
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60 italic pt-2">
            Initialize an autonomous agent for continuous infrastructure oversight
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-8 pt-0 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase font-black tracking-widest italic opacity-70">Agent Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. LatencyGuard-01" {...field} className="bg-muted/50 border-border h-11 rounded-xl text-sm font-bold italic" />
                    </FormControl>
                    <FormMessage className="text-[9px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase font-black tracking-widest italic opacity-70">Specialization</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 border-border h-11 rounded-xl text-sm font-bold italic">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border rounded-xl">
                        <SelectItem value="monitoring" className="font-bold italic flex items-center gap-2"><div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Monitoring</div></SelectItem>
                        <SelectItem value="security" className="font-bold italic flex items-center gap-2"><div className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Security</div></SelectItem>
                        <SelectItem value="cost" className="font-bold italic flex items-center gap-2"><div className="flex items-center gap-2"><Coins className="w-3.5 h-3.5" /> Cost</div></SelectItem>
                        <SelectItem value="deployment" className="font-bold italic flex items-center gap-2"><div className="flex items-center gap-2"><ClipboardList className="w-3.5 h-3.5" /> Deployment</div></SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] uppercase font-black tracking-widest italic opacity-70">Strategic Objective</FormLabel>
                  <FormControl>
                    <Input placeholder="Describe the mission of this agent..." {...field} className="bg-muted/50 border-border h-11 rounded-xl text-sm font-bold italic" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="cluster"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase font-black tracking-widest italic opacity-70">Cluster</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-muted/50 border-border h-11 rounded-xl text-[12px] font-bold italic" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="namespace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase font-black tracking-widest italic opacity-70">Namespace</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-muted/50 border-border h-11 rounded-xl text-[12px] font-bold italic" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] uppercase font-black tracking-widest italic opacity-70">Service</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-muted/50 border-border h-11 rounded-xl text-[12px] font-bold italic" placeholder="auth-svc" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-[12px] uppercase font-black tracking-widest italic text-foreground flex items-center gap-2">
                   <Zap className="w-4 h-4 text-glow-accent" />
                   Auto Remediation
                </FormLabel>
                <p className="text-[9px] font-bold uppercase opacity-60 italic">Allow agent to execute corrective actions automatically</p>
              </div>
              <FormField
                control={form.control}
                name="autoRemediation"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose}
                className="text-[10px] font-black uppercase tracking-widest italic rounded-xl px-6"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-black uppercase tracking-widest italic h-11 px-8 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : "Create Agent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
