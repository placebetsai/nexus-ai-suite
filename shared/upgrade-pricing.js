import React, { useState } from "react";
import DemoCheckout from "./demo-checkout";

const TIERS = [
  {
    name: "Free",
    price: 0,
    priceLabel: "Free",
    features: [
      "Basic features",
      "Community support",
      "1 project",
      "Limited AI suggestions",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    name: "Pro",
    price: 9.99,
    priceLabel: "$9.99",
    period: "month",
    features: [
      "All features",
      "Priority AI",
      "Unlimited projects",
      "Email support",
      "Advanced analytics",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Business",
    price: 29.99,
    priceLabel: "$29.99",
    period: "month",
    features: [
      "Everything in Pro",
      "Team features",
      "API access",
      "Priority support",
      "Custom integrations",
      "Admin dashboard",
    ],
    cta: "Upgrade to Business",
  },
];

function PricingCard({ tier, onSelect }) {
  return (
    <div
      style={{
        border: tier.popular ? "2px solid #007bff" : "1px solid #e0e0e0",
        borderRadius: 10,
        padding: 24,
        flex: "1 1 260px",
        maxWidth: 320,
        position: "relative",
        background: "#fff",
      }}
    >
      {tier.popular && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#007bff",
            color: "#fff",
            padding: "2px 12px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Most Popular
        </div>
      )}

      <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>{tier.name}</h3>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 32, fontWeight: 700 }}>{tier.priceLabel}</span>
        {tier.period && <span style={{ color: "#666", fontSize: 14 }}> / {tier.period}</span>}
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px" }}>
        {tier.features.map((f) => (
          <li key={f} style={{ padding: "4px 0", fontSize: 14, color: "#444" }}>
            ✓ {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => !tier.disabled && onSelect(tier)}
        disabled={tier.disabled}
        style={{
          width: "100%",
          padding: "10px 0",
          background: tier.disabled ? "#e9ecef" : tier.popular ? "#007bff" : "#333",
          color: tier.disabled ? "#888" : "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 15,
          fontWeight: 600,
          cursor: tier.disabled ? "default" : "pointer",
        }}
      >
        {tier.cta}
      </button>
    </div>
  );
}

export default function UpgradePricing({ currentPlan, onSelectPlan }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(tier) {
    setSelected(tier);
  }

  if (selected) {
    return (
      <DemoCheckout
        plan={selected.name}
        amount={selected.price}
        onSuccess={() => {
          if (onSelectPlan) onSelectPlan(selected.name);
          setSelected(null);
        }}
      />
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "24px 0" }}>
      <h2 style={{ textAlign: "center", margin: "0 0 8px" }}>Choose Your Plan</h2>
      <p style={{ textAlign: "center", color: "#666", margin: "0 0 24px", fontSize: 14 }}>
        Demo Mode — No real charges
      </p>
      <div
        style={{
          display: "flex",
          gap: 20,
          justifyContent: "center",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {TIERS.map((tier) => (
          <PricingCard key={tier.name} tier={tier} onSelect={handleSelect} />
        ))}
      </div>
    </div>
  );
}

export { TIERS };
