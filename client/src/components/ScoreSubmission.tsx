import { useState } from "react";
import { useSubmitScore } from "@/hooks/use-scores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { motion } from "framer-motion";

interface ScoreSubmissionProps {
  score: number;
  level: number;
  onComplete: () => void;
}

export function ScoreSubmission({ score, level, onComplete }: ScoreSubmissionProps) {
  const [name, setName] = useState("");
  const { mutate: submit, isPending } = useSubmitScore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    submit(
      { name, score, level },
      {
        onSuccess: () => {
          onComplete();
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border-2 border-primary/50 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      
      <h2 className="text-2xl font-display text-primary mb-2">GAME OVER</h2>
      <p className="text-muted-foreground mb-6 font-mono">You reached Level {level}</p>
      
      <div className="text-5xl font-mono font-bold text-white mb-8 text-neon-pink">
        {score.toLocaleString()}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div className="space-y-2">
          <label htmlFor="name" className="text-xs uppercase tracking-widest text-secondary">
            Enter Pilot Name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
            placeholder="AAA"
            className="text-center font-display text-xl bg-black/50 border-secondary/30 focus:border-secondary focus:ring-secondary/50 h-14 tracking-[0.2em]"
            autoFocus
            maxLength={10}
            disabled={isPending}
          />
        </div>

        <Button
          type="submit"
          disabled={!name.trim() || isPending}
          className="w-full h-12 text-lg font-bold bg-secondary hover:bg-secondary/90 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
        >
          {isPending ? <Loader2 className="animate-spin" /> : "SUBMIT SCORE"}
        </Button>
        
        <button 
          type="button" 
          onClick={onComplete}
          className="text-xs text-muted-foreground hover:text-white mt-4 underline decoration-dotted"
        >
          Skip Submission
        </button>
      </form>
    </motion.div>
  );
}
