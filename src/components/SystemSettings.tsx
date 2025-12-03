import React, { useState } from "react";
import LocaleSettings from "./LocaleSettings";
import Status from "./Status";

// No-op function for embedded components that don't need close handlers
const noop = () => {};

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"locale" | "status">("locale");

  return (
    <div>
      <section className="panel">
        <div className="panel-header">
          <h2>System Settings</h2>
        </div>
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === "locale" ? "active" : ""}`}
            onClick={() => setActiveTab("locale")}
          >
            🌐 Locale & Currency
          </button>
          <button
            className={`settings-tab ${activeTab === "status" ? "active" : ""}`}
            onClick={() => setActiveTab("status")}
          >
            ⚙️ Service Status
          </button>
        </div>
      </section>

      {activeTab === "locale" && (
        <div style={{ marginTop: "1rem" }}>
          <LocaleSettings onClose={noop} embedded={true} />
        </div>
      )}

      {activeTab === "status" && (
        <div style={{ marginTop: "1rem" }}>
          <Status />
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
