export function FlashCardDeck(props) {
    const { name, description, subject, color, cardCount, onClick } = props;
  
    const accent = color || "#012851";
  
    return (
      <button
        type="button"
        onClick={onClick}
        className="
          bg-card
          border border-border
          rounded-3xl
          shadow-sm hover:shadow-lg
          hover:border-[#3b82f6]/60
          transition-all duration-300
          flex flex-col items-center
          text-center
          w-full max-w-xs mx-auto
          min-h-[220px]
          px-5 py-6
          cursor-pointer
          relative
          overflow-hidden
        "
        style={{
          boxShadow: `0 8px 20px 0 ${accent}22`,
        }}
      >
        {/* Felső rész: cím + tantárgy */}
        <div className="w-full mb-4">
          <h3 className="text-base font-semibold mb-1 line-clamp-2">
            {name}
          </h3>
          {subject && (
            <p className="text-sm font-medium" style={{ color: accent }}>
              {subject}
            </p>
          )}
        </div>
  
        {/* Leírás (ha van) */}
        {description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
            {description}
          </p>
        )}
  
        {/* Spacer */}
        <div className="flex-1" />
  
        {/* Kártyaszám */}
        <div className="pt-2 w-full">
          <p className="text-xs text-muted-foreground">
            {cardCount ?? 0} kártya
          </p>
        </div>
  
        {/* Vékony színes csík az alján */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl"
          style={{ backgroundColor: accent }}
        />
      </button>
    );
  }