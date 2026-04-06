import { motion } from "framer-motion";
import { Terminal, Github, Code, Box, Cpu } from "lucide-react";

const CODE_SNIPPET = `// Deploy Autonomous Cluster
const cluster = await zorvexa.deploy({
  provider: 'aws',
  region: 'us-east-1',
  scaling: {
    mode: 'autonomous',
    optimizeFor: 'cost'
  }
});

// Self-healing is active by default
cluster.on('anomaly', async (event) => {
  return ai.remediate(event);
});`;

export default function DeveloperExperience() {
  return (
    <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Documentation / Content */}
          <div className="max-w-xl">
             <h2 className="text-sm font-black uppercase tracking-[0.35em] text-indigo-500 mb-6">Developer First</h2>
             <p className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-6 leading-tight">
                Your Infrastructure <br /> is an <span className="text-indigo-500 italic underline">API.</span>
             </p>
             <p className="text-slate-400 text-lg leading-relaxed mb-10">
                Zorvexa exposes every autonomous action through a clean, type-safe SDK. Integrate AI self-healing directly into your CI/CD pipelines or export generated HCL/YAML with one click.
             </p>
             
             <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                   <div className="mt-1 p-2 bg-white/5 rounded-lg border border-white/10">
                      <Box className="h-4 w-4 text-emerald-400" />
                   </div>
                   <div>
                      <h4 className="text-sm font-bold text-white tracking-widest uppercase">Kubernetes Native</h4>
                      <p className="text-xs text-slate-500 mt-1">Export clean YAML for EKS/GKE targets.</p>
                   </div>
                </div>
                <div className="flex items-start space-x-3">
                   <div className="mt-1 p-2 bg-white/5 rounded-lg border border-white/10">
                      <Cpu className="h-4 w-4 text-indigo-400" />
                   </div>
                   <div>
                      <h4 className="text-sm font-bold text-white tracking-widest uppercase">HCL Generation</h4>
                      <p className="text-xs text-slate-500 mt-1">Production-ready Terraform outputs.</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Code Window */}
          <motion.div 
             initial={{ opacity: 0, x: 30 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             className="relative rounded-3xl bg-[#010409] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.4)] overflow-hidden"
          >
             <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
                <div className="flex items-center space-x-3">
                   <Code className="h-4 w-4 text-indigo-500" />
                   <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">zorvexa-sdk / autonomous-deploy.ts</span>
                </div>
                <div className="flex space-x-1.5 opacity-50">
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                   <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                </div>
             </div>
             
             <div className="p-8 font-mono text-sm sm:text-base leading-relaxed overflow-x-auto scrollbar-hide">
                <pre className="text-slate-300">
                  <code dangerouslySetInnerHTML={{ 
                    __html: CODE_SNIPPET
                      .replace(/\/\/.*/g, '<span class="text-slate-600 italic">$&</span>')
                      .replace(/\b(const|await|async|import|from|export|return)\b/g, '<span class="text-indigo-400">$1</span>')
                      .replace(/'[^']*'/g, '<span class="text-emerald-400">$&</span>')
                  }} />
                </pre>
             </div>

             {/* Github Integration Bar */}
             <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-3 grayscale opacity-50">
                   <Github className="h-4 w-4" />
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connect GitHub Action</span>
                </div>
                <div className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/20 font-bold uppercase">v2.4.1-STABLE</div>
             </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
