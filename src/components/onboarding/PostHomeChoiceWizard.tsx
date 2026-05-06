interface Props {
  onScanNetwork: () => void;
  onAddItem: () => void;
  onSkip: () => void;
}

interface ChoiceCard {
  icon: string;
  title: string;
  description: string;
  action: () => void;
  highlight?: boolean;
}

export default function PostHomeChoiceWizard({ onScanNetwork, onAddItem, onSkip }: Props) {
  const cards: ChoiceCard[] = [
    {
      icon: "🔍",
      title: "Scan Network for Devices",
      description:
        "Automatically discover computers, cameras, routers, and IoT devices on your home network.",
      action: onScanNetwork,
      highlight: true,
    },
    {
      icon: "📦",
      title: "Add Your First Item",
      description: "Manually add your first inventory item to get started.",
      action: onAddItem,
    },
    {
      icon: "⏭️",
      title: "Skip for Now",
      description: "You can add items or scan your network at any time from the dashboard.",
      action: onSkip,
    },
  ];

  return (
    <div className="wizard-overlay">
      <div className="wizard-card" style={{ maxWidth: "520px" }}>
        <div className="wizard-header">
          <h2>🎉 Your home is set up!</h2>
          <p>What would you like to do next?</p>
        </div>

        <div className="wizard-body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {cards.map((card) => (
            <button
              key={card.title}
              onClick={card.action}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                padding: "1rem 1.25rem",
                border: card.highlight
                  ? "2px solid var(--color-primary, #6366f1)"
                  : "1px solid var(--border-color, #e5e7eb)",
                borderRadius: "10px",
                background: card.highlight
                  ? "var(--color-primary-subtle, #eef2ff)"
                  : "var(--card-bg, #fff)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 2px 8px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <span style={{ fontSize: "1.75rem", lineHeight: 1, flexShrink: 0 }}>{card.icon}</span>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    color: card.highlight ? "var(--color-primary, #6366f1)" : "var(--text-color, #111)",
                  }}
                >
                  {card.title}
                </p>
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.85rem",
                    color: "var(--muted, #6b7280)",
                    lineHeight: 1.4,
                  }}
                >
                  {card.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
