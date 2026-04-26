import { useEffect, useState } from "react";
import LegacyApp from "./LegacyApp";
import VGCApp from "./VGCApp";

const FORMAT_KEY = "pkm-bh-format";

function App() {
  const [format, setFormat] = useState<"vgc" | "legacy">(() => {
    return localStorage.getItem(FORMAT_KEY) === "legacy" ? "legacy" : "vgc";
  });

  useEffect(() => {
    localStorage.setItem(FORMAT_KEY, format);
  }, [format]);

  return (
    <div>
      <div className="format-switcher">
        <button
          type="button"
          className={format === "vgc" ? "format-tab format-tab-active" : "format-tab"}
          onClick={() => setFormat("vgc")}
        >
          VGC 2v2
        </button>
        <button
          type="button"
          className={format === "legacy" ? "format-tab format-tab-active" : "format-tab"}
          onClick={() => setFormat("legacy")}
        >
          1v1 Legacy
        </button>
      </div>
      {format === "vgc" ? <VGCApp /> : <LegacyApp />}
    </div>
  );
}

export default App;