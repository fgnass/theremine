import { useEffect, useRef } from "preact/hooks";
import { Header } from "./components/Header";
import { Instructions } from "./components/Instructions";
import { PlayArea } from "./components/PlayArea";
import { SettingsModal } from "./components/SettingsModal";
import { CameraModal } from "./components/CameraModal";
import { HandPointer } from "./components/HandPointer";
import { ThereminEngine } from "./lib/theremin-engine";
import "./style.css";
import {
  isRunning,
  isStarting,
  startFailed,
  statusMessage,
  currentNote,
  currentFrequency,
  settingsOpen,
  cameraModalOpen,
  pointerState,
  pointerState2,
} from "./state/appState";

export function App() {
  const videoRef = useRef(null);
  const engineRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Screenshot mode: render the running UI (and optionally the settings modal)
  // without starting the camera, for the portfolio screenshot script.
  // `?screenshot` → main play area; `?screenshot=settings` → settings open.
  useEffect(() => {
    const mode = new URLSearchParams(location.search).get("screenshot");
    if (mode === null) return;
    isRunning.value = true;
    // Show the note dial lit rather than idle in portfolio shots. `playoff`
    // leaves it dark, for checking the powered-off state.
    if (mode !== "playoff") {
      currentFrequency.value = 440;
      currentNote.value = "A4";
    }
    if (mode === "settings") {
      settingsOpen.value = true;
    }
  }, []);

  useEffect(() => {
    // Initialize theremin engine
    engineRef.current = new ThereminEngine(videoRef.current, {
      onNoteChange: (note, frequency) => {
        currentNote.value = note;
        currentFrequency.value = frequency;
      },
      onPointerUpdate: (state, state2) => {
        pointerState.value = state;
        if (state2) {
          pointerState2.value = state2;
        } else {
          pointerState2.value = { ...pointerState2.value, visible: false };
        }
      },
      onStatusChange: (message) => {
        if (typeof message === "string" && message.length) {
          statusMessage.value = message;
        }
      },
    });

    return () => {
      engineRef.current?.cleanup();
      // Release wake lock on cleanup
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Request wake lock when app is running
  useEffect(() => {
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator && isRunning.value) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch (err) {
          console.warn("Failed to acquire wake lock:", err);
        }
      }
    };

    // The browser releases the screen wake lock whenever the tab is hidden,
    // so re-acquire it when we become visible again while still running.
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isRunning.value) {
        requestWakeLock();
      }
    };

    if (isRunning.value) {
      requestWakeLock();
      document.addEventListener("visibilitychange", handleVisibility);
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isRunning.value]);

  const handleStart = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    if (isRunning.value || isStarting.value) return;

    isStarting.value = true;
    startFailed.value = false;

    try {
      await engineRef.current.start();
      isRunning.value = true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      startFailed.value = true;
      statusMessage.value = `Couldn't access the camera: ${message}\n\nCheck that no other app is using the camera and that this site is allowed to use it, then try again.`;
    } finally {
      isStarting.value = false;
    }
  };

  const handleSurfacePointerDown = (event) => {
    if (isRunning.value || isStarting.value) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    handleStart();
  };

  return (
    <main class="theremin" onPointerDown={handleSurfacePointerDown}>
      <Header />

      {!isRunning.value && (
        <Instructions
          status={statusMessage.value}
          onStart={handleStart}
          disabled={isStarting.value}
          failed={startFailed.value}
        />
      )}

      {isRunning.value && <PlayArea />}

      <SettingsModal
        open={settingsOpen.value}
        onClose={() => (settingsOpen.value = false)}
      />

      <CameraModal
        open={cameraModalOpen.value}
        onClose={() => (cameraModalOpen.value = false)}
      />

      <HandPointer state={pointerState.value} />
      <HandPointer state={pointerState2.value} />

      <video
        ref={videoRef}
        class="theremin__video"
        playsinline
        muted
        autoplay
      />
    </main>
  );
}
