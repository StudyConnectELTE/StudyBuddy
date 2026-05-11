import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/Dialog";

export function FlashCardStudy({ deckId, onBackToDecks, onEditDeck }) {
  // Dummy kártyák – később API-ból jönnek
  const [cards] = useState([
    { id: 1, question: "Magyarázd el részletesen, hogyan működik a HTTP protokoll egy modern webalkalmazásban a böngésző kérésétől a szerver válaszáig, térj ki a DNS feloldásra, a TCP kapcsolat felépítésére, a HTTPS titkosítás fő lépéseire, a HTTP státuszkódok szerepére, a cache-elésre (ETag, Last-Modified, Cache-Control), és arra is, hogyan befolyásolják a fejlécek (pl. Authorization, Content-Type, Accept, CORS-sal kapcsolatos headerek) a kliens és a szerver közötti kommunikációt.Magyarázd el részletesen, hogyan működik a HTTP protokoll egy modern webalkalmazásban a böngésző kérésétől a szerver válaszáig, térj ki a DNS feloldásra, a TCP kapcsolat felépítésére, a HTTPS titkosítás fő lépéseire, a HTTP státuszkódok szerepére, a cache-elésre (ETag, Last-Modified, Cache-Control), és arra is, hogyan befolyásolják a fejlécek (pl. Authorization, Content-Type, Accept, CORS-sal kapcsolatos headerek) a kliens és a szerver közötti kommunikációt.", answer: "Ez az 1. válasz" },
    { id: 2, question: "Mi a 2. definíció?", answer: "Ez a 2. válasz" },
    { id: 3, question: "Mi a 3. definíció?", answer: "Ez a 3. válasz" },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState(cards.map(() => null)); // null | "correct" | "wrong"
  const [showSummary, setShowSummary] = useState(false);

  const currentCard = cards[currentIndex];

  const handleReveal = () => {
    setShowAnswer((prev) => !prev);
  };

  const handleAnswer = (isCorrect) => {
    const newResults = [...results];
    newResults[currentIndex] = isCorrect ? "correct" : "wrong";
    setResults(newResults);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      // utolsó kártya → összegző modal
      setShowSummary(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setResults(cards.map(() => null));
    setShowSummary(false);
  };

  const correctCount = results.filter((r) => r === "correct").length;
  const wrongCount = results.filter((r) => r === "wrong").length;
  const totalAnswered = correctCount + wrongCount;
  const accuracy =
    totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-5xl flex flex-col h-full">
        {/* Felső sáv */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={onBackToDecks}
            className="rounded-lg"
          >
            ← Vissza a paklikhoz
          </Button>
        </div>

        {/* Fő tartalom – középre igazítva */}
        <div className="flex-1 flex items-center justify-center md:p-12">
          <div className="flex-1 flex flex-col items-center">
            {/* Flip wrapper */}
            <div
              className="
                w-full max-w-xl mb-6
                [perspective:1200px]
              "
              onClick={handleReveal}
            >
              <div
                className={`
                    relative
                    bg-card
                    border border-border rounded-3xl
                    shadow-md
                    w-full
                    min-h-[280px]
                    px-8 py-10
                    text-center
                    cursor-pointer
                    hover:shadow-lg
                    transition-transform duration-1000
                    [transform-style:preserve-3d]
                `}
                style={{
                    transform: showAnswer ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* FRONT – kérdés */}
                <div
                    className="
                    flex flex-col items-center
                    [backface-visibility:hidden]
                    [transform:rotateY(0deg)]
                    "
                    style={{ transform: "rotateY(0deg)" }}
                >
                    <p className="w-full text-left text-sm text-muted-foreground mb-4">
                    Kártya {currentIndex + 1} / {cards.length}
                    </p>
                    <h2 className="text-lg font-semibold mb-4">Kérdés</h2>
                    <p className="text-base text-left whitespace-pre-wrap">
                    {currentCard.question}
                    </p>
                    <p className="mt-4 text-xs text-muted-foreground">
                    Kattints a kártyára a válasz megjelenítéséhez.
                    </p>
                </div>

                {/* BACK – válasz */}
                <div
                    className="
                    absolute inset-0
                    flex flex-col items-center
                    bg-card rounded-3xl
                    [backface-visibility:hidden]
                    [transform:rotateY(180deg)]
                    px-8 py-10
                    "
                    style={{ transform: "rotateY(180deg)" }}
                >
                    <p className="w-full text-left text-sm text-muted-foreground mb-4">
                    Kártya {currentIndex + 1} / {cards.length}
                    </p>
                    <h2 className="text-lg font-semibold mb-4">Válasz</h2>
                    <p className="text-base text-left whitespace-pre-wrap">
                    {currentCard.answer}
                    </p>
                    <p className="mt-4 text-xs text-muted-foreground">
                    Kattints a kártyára a kérdés újbóli megjelenítéséhez.
                    </p>
                </div>
              </div>
            </div>

            
            {/* jó/rossz gombok */}
            <div className="flex gap-4 mb-8">
              <Button
                variant="outline"
                className="w-24 h-10 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => handleAnswer(false)}
              >
                ✕
              </Button>
              <Button
                className="w-24 h-10 bg-green-500 hover:bg-green-600 text-white"
                onClick={() => handleAnswer(true)}
              >
                ✓
              </Button>
            </div>

            {/* vízszintes eredmény sáv a kártya alatt */}
            <div className="w-full max-w-xl mb-6">
              <div className="flex justify-center gap-2">
                {cards.map((card, index) => {
                  const state = results[index];
                  const isCurrent = index === currentIndex;

                  let bg = "bg-muted";
                  if (state === "correct") bg = "bg-green-100";
                  if (state === "wrong") bg = "bg-red-100";

                  let border = "";
                  if (isCurrent) border = "ring-2 ring-blue-500";

                  return (
                    <div
                      key={card.id}
                      className={`
                        flex flex-col items-center justify-center
                        w-9 h-9 rounded-full text-xs
                        ${bg} ${border}
                      `}
                    >
                      <span className="font-medium">{index + 1}</span>
                      {state === "correct" && (
                        <span className="text-[10px] text-green-600">✓</span>
                      )}
                      {state === "wrong" && (
                        <span className="text-[10px] text-red-600">✕</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>


            {/* Kártyapakli szerkesztése gomb – bal oldalon */}
            <div className="w-full max-w-3xl mb-4 flex justify-start">
              <Button
                variant="outline"
                onClick={() => onEditDeck && onEditDeck(deckId)}
                className="rounded-lg border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 hover:border-[#3b82f6]"
              >
                Kártyapakli szerkesztése
              </Button>
            </div>

            {/* halványszürke vízszintes csík */}
            <div className="w-full max-w-3xl border-t border-muted my-2" />

            {/* lenyitható lista a kérdésekkel és válaszokkal */}
            <details className="w-full max-w-xl bg-card/60 border border-border/60 rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Pakli kártyái (kérdések és válaszok)
              </summary>

              <div className="mt-3 space-y-3">
                {cards.map((card, index) => (
                  <div
                    key={card.id}
                    className="p-3 rounded-lg bg-background/60 border border-border/40"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      Kártya {index + 1}
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">Kérdés: </span>
                      {card.question}
                    </div>
                    <div className="text-sm mt-1">
                      <span className="font-semibold">Válasz: </span>
                      {card.answer}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>

        {/* Összegző modal */}
        <Dialog open={showSummary} onOpenChange={setShowSummary}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tanulókör vége</DialogTitle>
              <DialogDescription>
                Eredményed ebben a körben:
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              <p>
                Helyes válaszok:{" "}
                <span className="font-semibold">{correctCount}</span>
              </p>
              <p>
                Rossz válaszok:{" "}
                <span className="font-semibold">{wrongCount}</span>
              </p>
              <p>
                Pontosság:{" "}
                <span className="font-semibold">{accuracy}%</span>
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSummary(false)}
              >
                Bezárás
              </Button>
              <Button
                className="bg-gradient-to-r bg-[#012851]  hover-[#012851]/90  text-white"
                onClick={handleRestart}
              >
                Újrakezdés
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}