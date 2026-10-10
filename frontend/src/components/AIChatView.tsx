import { useState } from "react";

const BASE = import.meta.env.VITE_API ?? "";

export default function AIChatView() {
  const [messages, setMessages] = useState<{ role: "user" | "ai", text: string }[]>([
    { role: "ai", text: "Hello! I am your GPT-4o powered Digital Twin security advisor. You can ask me to summarize findings, analyze specific vulnerabilities, or suggest novel attack vectors." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const q = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.answer || "AI unavailable." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: "Error connecting to AI backend." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", padding: 0, overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? "var(--ink)" : "var(--panel2)",
            color: m.role === "user" ? "#fff" : "var(--ink)",
            padding: "12px 18px",
            borderRadius: 12,
            maxWidth: "80%",
            lineHeight: 1.5,
            fontSize: 14
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, marginBottom: 4, textTransform: "uppercase" }}>
              {m.role === "user" ? "You" : "GPT-4o Advisor"}
            </div>
            <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", background: "var(--panel2)", padding: "12px 18px", borderRadius: 12, fontSize: 14, color: "var(--muted)" }}>
            Analyzing the digital twin...
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} style={{ display: "flex", padding: 16, borderTop: "1px solid var(--line)", background: "var(--bg)" }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the AI about the security posture..." 
          style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel)", color: "var(--ink)", fontSize: 14 }}
          disabled={loading}
        />
        <button type="submit" disabled={loading} style={{ marginLeft: 12, padding: "0 24px", background: "var(--ink)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
          Send
        </button>
      </form>
    </div>
  );
}
