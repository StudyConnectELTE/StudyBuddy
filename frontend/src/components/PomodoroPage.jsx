export function PomodoroPage() {
  return (
    <div className="min-h-screen bg-background pt-0 md:pt-0">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-foreground">Pomodoro Timer</h1>
          <p className="text-muted-foreground mt-1">
            25 perc fókusz, 5 perc pihenő — ismételd, és tartsd a tempót.
          </p>
        </div>
      </div>
    </div>
  );
}
