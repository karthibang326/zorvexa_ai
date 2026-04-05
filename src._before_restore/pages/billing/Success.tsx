import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Success = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: Refresh subscription status here
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-20 px-4">
        <motion.div 
          className="max-w-md w-full glass p-10 rounded-3xl border border-primary/20 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-4 tracking-tight">Payment Successful!</h1>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Welcome to the Pro plan. Your account has been upgraded and you now have full access to all premium features.
          </p>
          <Button 
            onClick={() => navigate("/dashboard")} 
            className="w-full py-6 font-bold text-lg glow-primary"
          >
            Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Success;
