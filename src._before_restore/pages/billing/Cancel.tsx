import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Cancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-20 px-4">
        <motion.div 
          className="max-w-md w-full glass p-10 rounded-3xl border border-destructive/20 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-8">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold mb-4 tracking-tight">Checkout Canceled</h1>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Payment was not completed. Your account remains on the Starter plan. 
            If you have any questions, please contact our support team.
          </p>
          <Button 
            variant="outline"
            onClick={() => navigate("/#pricing")} 
            className="w-full py-6 font-bold text-lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" /> Back to Pricing
          </Button>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Cancel;
