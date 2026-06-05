import { RankingContent } from "@/features/ranking/components/ranking-content";

export default function RankingPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">Ranking</h1>
        <p className="text-sm text-muted-foreground">Classificação do bolão</p>
      </header>

      <RankingContent />
    </div>
  );
}
