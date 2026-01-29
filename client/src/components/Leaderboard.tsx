import { useScores } from '@/hooks/use-scores';
import { Trophy, Loader2 } from 'lucide-react';

export function Leaderboard() {
  const { data: scores, isLoading, error } = useScores();

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-6 backdrop-blur-md h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-6 h-6 text-accent animate-pulse" />
        <h2 className="text-xl text-white">HIGH SCORES</h2>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="text-destructive text-center py-4">Failed to load scores</div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {scores?.length === 0 ? (
            <div className="text-muted-foreground text-center italic py-4">No scores yet. Be the first!</div>
          ) : (
            scores?.map((score, index) => (
              <div 
                key={score.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:bg-white/5
                  ${index === 0 ? 'bg-accent/10 border-accent/50 text-accent shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 
                    index === 1 ? 'border-white/20 text-white' : 
                    index === 2 ? 'border-white/10 text-white/90' : 
                    'border-transparent text-muted-foreground'}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-sm ${index < 3 ? 'font-bold' : ''}`}>
                    #{index + 1}
                  </span>
                  <span className="font-display text-sm tracking-wider truncate max-w-[120px]">
                    {score.name}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono font-bold">{score.score.toLocaleString()}</span>
                  <span className="text-[10px] uppercase opacity-60">Lvl {score.level}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
