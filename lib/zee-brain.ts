"use client";

import { useState, useEffect, useCallback } from "react";
export * from "./zee-brain-core";
import {
  ZeeBrainState,
  INITIAL_ZEE_BRAIN,
  loadZeeBrain,
  saveZeeBrain,
  BRAIN_EVENT,
  LifeCategory,
  MemoryBankItem,
  analyzeUserStoryWithZee,
  CrossPageActivityLog,
  CATEGORY_META,
  GalleryMediaItem,
  ConnectedSource,
  LikedReelDNA,
  HeaderTab,
} from "./zee-brain-core";

export function useZeeBrain() {
  const [brain, setBrain] = useState<ZeeBrainState>(INITIAL_ZEE_BRAIN);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = loadZeeBrain();
    setBrain(initial);
    setHydrated(true);

    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<ZeeBrainState>;
      if (custom.detail) {
        setBrain(custom.detail);
      } else {
        setBrain(loadZeeBrain());
      }
    };

    window.addEventListener(BRAIN_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(BRAIN_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const updateBrain = useCallback(
    (updater: (prev: ZeeBrainState) => ZeeBrainState) => {
      setBrain((prev) => {
        const current = loadZeeBrain() || prev;
        const updated = updater(current);
        return saveZeeBrain(updated);
      });
    },
    []
  );

  const addSpokenOrTypedMemory = useCallback(
    (
      text: string,
      category?: LifeCategory,
      source: MemoryBankItem["source"] = "voice_mic",
      metaAnalysis?: any,
      audioUrl?: string,
      conversationId?: string
    ) => {
      const analysis = analyzeUserStoryWithZee(
        text,
        category,
        source,
        { ...metaAnalysis, conversationId: conversationId || metaAnalysis?.conversationId },
        audioUrl
      );
      updateBrain((prev) => {
        if (metaAnalysis?.finalizedScriptId && prev.memories.some((memory) => memory.finalizedScriptId === metaAnalysis.finalizedScriptId)) {
          return prev;
        }
        const nextMemories = [analysis.memory, ...prev.memories];
        const nextSyncScore = Math.min(99, prev.virtualYou.twinSyncScore + 1);
        const nextWarmth = Math.min(100, prev.virtualYou.warmthLevel + 1);
        const nextValues = analysis.extractedTrait
          ? Array.from(
              new Set([analysis.extractedTrait, ...prev.virtualYou.coreValues])
            ).slice(0, 6)
          : prev.virtualYou.coreValues;

        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page: "u",
          pageLabel: "You • Personal memory",
          action: `Absorbed ${CATEGORY_META[analysis.memory.category].label}: "${analysis.memory.title}"`,
          timestamp: "Just now",
        };

        return {
          ...prev,
          virtualYou: {
            ...prev.virtualYou,
            twinSyncScore: nextSyncScore,
            warmthLevel: nextWarmth,
            voiceCadence: analysis.voiceCadenceNote || prev.virtualYou.voiceCadence,
            coreValues: nextValues,
          },
          memories: nextMemories,
          activityLogs: [nextLog, ...prev.activityLogs].slice(0, 20),
        };
      });
      return analysis.memory;
    },
    [updateBrain]
  );

  const addGalleryItems = useCallback(
    (items: GalleryMediaItem[], sourceLabel = "Creative Vault Sync") => {
      updateBrain((prev) => {
        const nextGallery = [...items, ...prev.gallery];
        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page: "u",
          pageLabel: "You • Visual Vault",
          action: `${sourceLabel}: Curated ${items.length} visual supply file(s)`,
          timestamp: "Just now",
        };
        return {
          ...prev,
          gallery: nextGallery,
          virtualYou: {
            ...prev.virtualYou,
            twinSyncScore: Math.min(99, prev.virtualYou.twinSyncScore + 1),
          },
          activityLogs: [nextLog, ...prev.activityLogs].slice(0, 20),
        };
      });
    },
    [updateBrain]
  );

  const importWhatsAppMemories = useCallback(
    (items: MemoryBankItem[]) => {
      if (!items.length) return 0;
        const knownIds = new Set(brain.memories.map((memory) => memory.id));
        const incomingIds = new Set<string>();
        const importedCount = items.filter((memory) => {
          if (knownIds.has(memory.id) || incomingIds.has(memory.id)) return false;
          incomingIds.add(memory.id);
          return true;
        }).length;
      updateBrain((prev) => {
          const latestIds = new Set(prev.memories.map((memory) => memory.id));
          const freshIds = new Set<string>();
          const fresh = items.filter((memory) => {
            if (latestIds.has(memory.id) || freshIds.has(memory.id)) return false;
            freshIds.add(memory.id);
            return true;
          });
        if (!fresh.length) return prev;
        return {
          ...prev,
          memories: [...fresh, ...prev.memories],
          activityLogs: [
            {
              id: `act-${Date.now()}`,
              page: "u" as HeaderTab,
              pageLabel: "You • WhatsApp Memory",
              action: `Synced ${fresh.length} WhatsApp ${fresh.length === 1 ? "story" : "stories"} into the memory gallery`,
              timestamp: "Just now",
            },
            ...prev.activityLogs,
          ].slice(0, 20),
        };
      });
      return importedCount;
    },
      [brain.memories, updateBrain]
  );

  const toggleSourceConnection = useCallback(
    (sourceId: ConnectedSource["id"], customHandle?: string) => {
      updateBrain((prev) => {
        const nextSources = prev.sources.map((s) => {
          if (s.id !== sourceId) return s;
          const nextConnected = !s.connected;
          return {
            ...s,
            connected: nextConnected,
            handleOrPath: customHandle || s.handleOrPath,
            lastSynced: nextConnected ? "Live Neural Link" : "Paused",
            syncedCount: nextConnected ? Math.max(24, s.syncedCount + 12) : s.syncedCount,
          };
        });
        const target = nextSources.find((s) => s.id === sourceId);
        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page: "u",
          pageLabel: "You • Neural Feeds",
          action: `${target?.connected ? "Linked" : "Paused"} ${target?.name || sourceId}`,
          timestamp: "Just now",
        };
        return {
          ...prev,
          sources: nextSources,
          activityLogs: [nextLog, ...prev.activityLogs].slice(0, 20),
        };
      });
    },
    [updateBrain]
  );

  const scanLikedReel = useCallback(
    (inputUrlOrNote: string, metaScan?: Partial<LikedReelDNA>) => {
      const clean = inputUrlOrNote.trim();
      if (!clean) return null;
      const isPublicLink = /^https:\/\//i.test(clean);
      const analysisUnavailable = !metaScan;
      const referenceUnavailable = isPublicLink && (!metaScan || metaScan.referenceRead === false);

      let detectedFormat = analysisUnavailable || referenceUnavailable ? "auto" : metaScan?.detectedFormat || "storyExplainer";
      let creatorStyle: string;
      let hookPattern =
        analysisUnavailable || referenceUnavailable ? "Add notes about the opening, tone, and story structure" : metaScan?.hookPattern || "A clear opening followed by a grounded story";
      let pacingBpm =
        analysisUnavailable || referenceUnavailable ? "Unknown" : metaScan?.pacingBpm || "Unknown";
      let captionStyle =
        analysisUnavailable || referenceUnavailable ? "Unknown" : metaScan?.captionStyle || "Unknown";

      // Keep saved guidance about reusable format, never about the source creator.
      creatorStyle = analysisUnavailable || referenceUnavailable ? "Style reference notes" : `Original ${detectedFormat} structure`;

      const scanned: LikedReelDNA = {
        id: `reel-${Date.now()}`,
        inputUrlOrNote: clean,
        referenceRead: metaScan?.referenceRead,
        creatorStyle,
        detectedFormat,
        hookPattern,
        pacingBpm,
        captionStyle,
        readingPatternMatch:
          metaScan?.readingPatternMatch ||
          analysisUnavailable ? "Saved as notes only; no style was guessed" : "Saved as an original format preference",
        scannedAt: "Just now",
      };

      updateBrain((prev) => {
        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page: "u",
          pageLabel: "You • Taste Decoder",
          action: `Decoded liked reel → Locked "${detectedFormat}" (${creatorStyle})`,
          timestamp: "Just now",
        };
        return {
          ...prev,
          likedReels: [scanned, ...prev.likedReels],
          virtualYou: {
            ...prev.virtualYou,
            preferredFormat: detectedFormat,
            signatureHookStyle: hookPattern,
            twinSyncScore: Math.min(99, prev.virtualYou.twinSyncScore + 2),
          },
          activityLogs: [nextLog, ...prev.activityLogs].slice(0, 20),
        };
      });

      return scanned;
    },
    [updateBrain]
  );

  const recordPageActivity = useCallback(
    (page: HeaderTab, pageLabel: string, action: string, topic?: string) => {
      updateBrain((prev) => {
        const nextLog: CrossPageActivityLog = {
          id: `act-${Date.now()}`,
          page,
          pageLabel,
          action,
          timestamp: "Just now",
        };
        return {
          ...prev,
          activeTab: page,
          variables: {
            ...prev.variables,
            "app.activeStage": pageLabel,
            "app.lastTopic": topic || prev.variables["app.lastTopic"],
          },
          activityLogs: [
            nextLog,
            ...prev.activityLogs.filter((l) => l.action !== action),
          ].slice(0, 20),
        };
      });
    },
    [updateBrain]
  );

  return {
    brain,
    hydrated,
    updateBrain,
    addSpokenOrTypedMemory,
    importWhatsAppMemories,
    addGalleryItems,
    toggleSourceConnection,
    scanLikedReel,
    recordPageActivity,
  };
}
