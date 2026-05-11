import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { flashcardService, getApiErrorMessage } from "../service/api";
import { toast } from "sonner";

export function FlashCardEdit({ deckId, onBackToStudy, onBackToDecks }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  // Pakli kártyáinak betöltése
  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        const data = await flashcardService.getCards(deckId);
        setCards(data || []);
      } catch (err) {
        console.error("Card load error:", err);
        toast.error("Nem sikerült betölteni a kártyákat", {
          description: getApiErrorMessage(err),
        });
      } finally {
        setLoading(false);
      }
    };

    if (deckId) {
      loadCards();
    }
  }, [deckId]);

  const handleAddCard = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.warning("Töltsd ki a kérdést és a választ is.");
      return;
    }

    try {
      setSaving(true);
      const created = await flashcardService.createCard(deckId, {
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      });

      setCards((prev) => [...prev, created]);
      setNewQuestion("");
      setNewAnswer("");

      toast.success("Kártya hozzáadva a paklihoz.");
    } catch (err) {
      console.error("Create card error:", err);
      toast.error("Nem sikerült létrehozni a kártyát", {
        description: getApiErrorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  // opcionális: törlés
  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Biztosan törlöd ezt a kártyát?")) return;

    try {
      await flashcardService.deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      toast.success("Kártya törölve.");
    } catch (err) {
      console.error("Delete card error:", err);
      toast.error("Nem sikerült törölni a kártyát", {
        description: getApiErrorMessage(err),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Felső navigáció */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onBackToStudy}
              className="rounded-lg"
            >
              ← Vissza a tanuláshoz
            </Button>
            <Button
              variant="outline"
              onClick={onBackToDecks}
              className="rounded-lg"
            >
              Paklikhoz
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            Pakli ID: {deckId}
          </span>
        </div>

        <h1 className="text-xl font-semibold mb-4">Kártyák szerkesztése</h1>

        {/* Új kártya hozzáadása */}
        <div className="mb-6 p-4 rounded-xl border border-border bg-card/60 space-y-3">
          <h2 className="text-sm font-medium mb-2">Új kártya hozzáadása</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium mb-1">
                Kérdés
              </label>
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Írd be a kérdést..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Válasz
              </label>
              <Input
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Írd be a választ..."
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleAddCard}
              disabled={saving}
              className="
                bg-gradient-to-r bg-[#012851] 
                hover-[#012851]/90
                text-white
              "
            >
              {saving ? "Mentés..." : "Kártya hozzáadása"}
            </Button>
          </div>
        </div>

        {/* Pakli tartalmának listája */}
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Kártyák betöltése...
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card, index) => (
              <div
                key={card.id}
                className="p-4 rounded-xl border border-border bg-card/60"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs text-muted-foreground">
                    Kártya {index + 1} (ID: {card.id})
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteCard(card.id)}
                  >
                    ✕
                  </Button>
                </div>
                <div className="text-sm mb-1">
                  <span className="font-semibold">Kérdés: </span>
                  <span className="whitespace-pre-wrap">
                    {card.question}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Válasz: </span>
                  <span className="whitespace-pre-wrap">
                    {card.answer}
                  </span>
                </div>
              </div>
            ))}

            {cards.length === 0 && !loading && (
              <div className="text-sm text-muted-foreground text-center py-8">
                Még nincs egy kártya sem ebben a pakliban. Adj hozzá az oldal tetején.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}