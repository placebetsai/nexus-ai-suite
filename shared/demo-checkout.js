import React, { useState, useEffect } from "react";

const STORAGE_KEY = "demo_purchases";

function getStoredPurchases() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function storePurchase(purchase) {
  const purchases = getStoredPurchases();
  purchases.push({ ...purchase, timestamp: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
}

function Banner() {
  return (
    <div
      style={{
        background: "#fff3cd",
        color: "#856404",
        padding: "8px 16px",
        textAlign: "center",
        fontWeight: 600,
        fontSize: 13,
        borderBottom: "1px solid #ffc107",
      }}
    >
      Demo Mode - No real charges
    </div>
  );
}

function SuccessCheckmark() {
  return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "#28a745",
          margin: "0 auto 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "demoScaleIn 0.4s ease-out",
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h3 style={{ margin: 0, color: "#28a745" }}>Payment Successful!</h3>
      <p style={{ color: "#666", marginTop: 8 }}>Thank you for your demo purchase.</p>
    </div>
  );
}

function ProcessingSpinner() {
  return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <div
        style={{
          width: 48,
          height: 48,
          border: "4px solid #e9ecef",
          borderTopColor: "#007bff",
          borderRadius: "50%",
          margin: "0 auto 16px",
          animation: "demoSpin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#666" }}>Processing payment...</p>
    </div>
  );
}

export default function DemoCheckout({ plan, amount, onSuccess }) {
  const [step, setStep] = useState("form"); // form | processing | success
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes demoSpin { to { transform: rotate(360deg); } }
      @keyframes demoScaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  function formatCardNumber(val) {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(val) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  function handlePay() {
    setStep("processing");
    setTimeout(() => {
      storePurchase({ plan, amount, cardLast4: cardNumber.replace(/\s/g, "").slice(-4) });
      setStep("success");
      if (onSuccess) onSuccess();
    }, 2000);
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ced4da",
    borderRadius: 6,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <Banner />
      <div style={{ padding: 24 }}>
        <h2 style={{ margin: "0 0 4px" }}>
          {step === "success" ? "Done" : `Upgrade to ${plan}`}
        </h2>
        {step === "form" && (
          <p style={{ color: "#666", margin: "0 0 20px", fontSize: 14 }}>
            ${amount}/month — charged monthly in demo
          </p>
        )}

        {step === "form" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Card Number</label>
              <input
                style={inputStyle}
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Expiry</label>
                <input
                  style={inputStyle}
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>CVV</label>
                <input
                  style={inputStyle}
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                />
              </div>
            </div>
            <button
              onClick={handlePay}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Pay Now — ${amount}
            </button>
          </div>
        )}

        {step === "processing" && <ProcessingSpinner />}
        {step === "success" && <SuccessCheckmark />}
      </div>
    </div>
  );
}

export { getStoredPurchases, Banner };
