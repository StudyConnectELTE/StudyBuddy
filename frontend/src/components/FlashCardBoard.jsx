import { useState, useEffect } from "react";
import { Plus, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/Dialog";
import { FlashCardDeck } from "./FlashCardDeck";
import { flashcardService } from "../service/api";
import { toast } from "sonner";

export function FlashCardBoard() {
  const navigate = useNavigate();

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  const [dialogOpen, setDialogOpen] = useState(false);

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDecks = async () => {
      setLoading(true);
      try {
        const data = await flashcardService.getDecks();
        setDecks(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Nem sikerült betölteni a paklikat.");
      } finally {
        setLoading(false);
      }
    };

    loadDecks();
  }, []);
  const handleGoHome = () => {
    navigate("/");
  };

  const handleCreateDeck = async () => {
    if (!newName.trim()) {
      toast.error("A pakli neve kötelező.");
      return;
    }
    if (!newSubject.trim()) {
      toast.error("A tantárgy kötelező.");
      return;
    }
  
    try {
      const created = await flashcardService.createDeck({
        name: newName.trim(),
        subject: newSubject.trim(),
        description: newDescription.trim() || null,
        color: newColor,
      });
  
      
      setDecks((prev) => [created, ...prev]);
      setNewName("");
      setNewDescription("");
      setNewSubject("");
      setNewColor("#3b82f6");
      setDialogOpen(false);
      toast.success("Pakli sikeresen létrehozva!");
    } catch (err) {
      console.error(err);
      toast.error("Nem sikerült létrehozni a paklit.");
    }
  };

  const presetColors = [
    "#3b82f6", // kék
    "#10b981", // zöld
    "#89F336", // világos zöld
    "#f97316", // narancs
    "#fcf403", // sárga
    "#8b5cf6", // lila
    "#ec4899", // pink
    "#663C1F", // barna
    "#898989", // szürke
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Home gomb */}
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoHome}
            className="flex items-center gap-2 border-[#3b82f6]/30 hover:bg-[#3b82f6]/5 hover:border-[#3b82f6] transition-all duration-300"
          >
            <Home className="w-4 h-4" />
            Vissza a kezdőlapra
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">FlashCard paklik</h1>
          <p className="text-muted-foreground">
            Hozz létre kártyapaklikat a tantárgyaidhoz, és gyakorolj aktív ismétléssel.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Új pakli kártya */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="
                  h-full min-h-[220px]
                  bg-card
                  border-2 border-dashed border-border
                  rounded-3xl
                  flex flex-col items-center justify-center
                  text-muted-foreground
                  hover:border-[#3b82f6]
                  hover:text-[#3b82f6]
                  hover:bg-[#3b82f6]/5
                  transition-all duration-300
                "
              >
                <Plus className="w-8 h-8 mb-2" />
                <span>Új pakli létrehozása</span>
              </button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Új FlashCard pakli</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Pakli neve *
                  </label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Pl. Analízis – definíciók"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tantárgy *
                  </label>
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Pl. Analízis 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Leírás (opcionális)
                  </label>
                  <Input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Rövid leírás a paklihoz"
                  />
                </div>

                {/* Színválasztó */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Szín (pakli kiemeléséhez)
                  </label>
                  <div className="flex gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className={`
                          w-8 h-8 rounded-full border-2
                          transition-all duration-200
                          ${
                            newColor === color
                              ? "border-black/70 scale-110"
                              : "border-transparent"
                          }
                        `}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    onClick={handleCreateDeck}
                    className="
                      bg-gradient-to-r bg-[#012851]
                      hover-[#012851]/90
                      text-white
                    "
                  >
                    Létrehozás
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Meglévő paklik */}
          {decks.map((deck) => (
            <FlashCardDeck
              key={deck.id}
              name={deck.name}
              description={deck.description}
              subject={deck.subject}
              color={deck.color}
              cardCount={deck.cardCount}
              onClick={() => {
                console.log("Study deck", deck.id);
                // navigate(`/flashcards/decks/${deck.id}/study`);
              }}
            />
          ))}

          {decks.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              Még nincs egy paklid sem. Kezdd az elsővel a bal oldali plusz gombbal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}