import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Rocket, GitBranch, Server, Shield, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface NewDeploymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewDeploymentDialog = ({ open, onOpenChange }: NewDeploymentDialogProps) => {
  const [serviceName, setServiceName] = useState("");
  const [branch, setBranch] = useState("");
  const [environment, setEnvironment] = useState("");
  const [strategy, setStrategy] = useState("");
  const [version, setVersion] = useState("");
  const [replicas, setReplicas] = useState("3");
  const [notes, setNotes] = useState("");
  const [autoRollback, setAutoRollback] = useState(true);
  const [healthCheck, setHealthCheck] = useState(true);
  const [notifySlack, setNotifySlack] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeploy = async () => {
    if (!serviceName || !branch || !environment || !strategy) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    // Simulate deployment
    await new Promise(r => setTimeout(r, 2000));
    setIsSubmitting(false);
    toast.success(`Deployment started: ${serviceName} → ${environment}`, {
      description: `Branch: ${branch} • Strategy: ${strategy}`,
    });
    onOpenChange(false);
    // Reset
    setServiceName(""); setBranch(""); setEnvironment(""); setStrategy(""); setVersion(""); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Rocket className="w-5 h-5 text-primary" />
            New Deployment
          </DialogTitle>
          <DialogDescription>
            Configure and trigger a new deployment to your infrastructure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Service & Version */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" /> Service Configuration
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="service" className="text-xs">Service Name *</Label>
                <Select value={serviceName} onValueChange={setServiceName}>
                  <SelectTrigger id="service"><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api-gateway">api-gateway</SelectItem>
                    <SelectItem value="auth-service">auth-service</SelectItem>
                    <SelectItem value="worker-pool">worker-pool</SelectItem>
                    <SelectItem value="ml-inference">ml-inference</SelectItem>
                    <SelectItem value="data-pipeline">data-pipeline</SelectItem>
                    <SelectItem value="cdn-edge">cdn-edge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="version" className="text-xs">Version Tag</Label>
                <Input id="version" placeholder="e.g. v3.2.1" value={version} onChange={e => setVersion(e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Branch & Environment */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" /> Source & Target
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch" className="text-xs">Git Branch *</Label>
                <Input id="branch" placeholder="e.g. main, feat/new-api" value={branch} onChange={e => setBranch(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="env" className="text-xs">Environment *</Label>
                <Select value={environment} onValueChange={setEnvironment}>
                  <SelectTrigger id="env"><SelectValue placeholder="Select environment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="canary">Canary</SelectItem>
                    <SelectItem value="preview">Preview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Strategy & Replicas */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Deployment Strategy
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="strategy" className="text-xs">Strategy *</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger id="strategy"><SelectValue placeholder="Select strategy" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rolling">Rolling Update</SelectItem>
                    <SelectItem value="blue-green">Blue-Green</SelectItem>
                    <SelectItem value="canary">Canary (10% → 50% → 100%)</SelectItem>
                    <SelectItem value="recreate">Recreate (downtime)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="replicas" className="text-xs">Replicas</Label>
                <Input id="replicas" type="number" min="1" max="50" value={replicas} onChange={e => setReplicas(e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Safety & Notifications */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Safety & Notifications
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-Rollback</p>
                  <p className="text-xs text-muted-foreground">Automatically rollback if health checks fail</p>
                </div>
                <Switch checked={autoRollback} onCheckedChange={setAutoRollback} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Health Check Gate</p>
                  <p className="text-xs text-muted-foreground">Wait for passing health checks before promoting</p>
                </div>
                <Switch checked={healthCheck} onCheckedChange={setHealthCheck} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Slack Notification</p>
                  <p className="text-xs text-muted-foreground">Post deployment status to #deployments channel</p>
                </div>
                <Switch checked={notifySlack} onCheckedChange={setNotifySlack} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">Deployment Notes</Label>
            <Textarea
              id="notes"
              placeholder="What changed? Any special instructions for this deploy..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Production Warning */}
          {environment === "production" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Production Deployment</p>
                <p className="text-xs text-muted-foreground">This will deploy to live production infrastructure. Ensure all tests pass and changes are reviewed.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleDeploy} disabled={isSubmitting} className="font-semibold">
            {isSubmitting ? (
              <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" /> Deploying...</>
            ) : (
              <><Rocket className="w-4 h-4 mr-1" /> Deploy</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewDeploymentDialog;
