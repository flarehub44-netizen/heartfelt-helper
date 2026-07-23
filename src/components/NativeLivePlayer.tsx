import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Video, VideoOff, Mic, MicOff, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface Props {
  liveId: string;
  isHost: boolean;
  onEnd?: () => void;
}

export function NativeLivePlayer({ liveId, isHost, onEnd }: Props) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const myIdRef = useRef<string>(crypto.randomUUID());
  const remoteConnectedRef = useRef(false);
  const liveEndedRef = useRef(false);
  const sendRef = useRef<((event: string, payload: Record<string, unknown>) => void) | null>(null);
  const onEndRef = useRef(onEnd);
  const [viewers, setViewers] = useState(0);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(!isHost);
  const [viewerStatus, setViewerStatus] = useState("Aguardando o criador iniciar a câmera...");
  const [hostPreparing, setHostPreparing] = useState(isHost);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const myId = myIdRef.current;
    remoteConnectedRef.current = false;
    liveEndedRef.current = false;
    setError(null);
    setWaiting(!isHost);
    setHostPreparing(isHost);
    setViewerStatus("Aguardando o criador iniciar a câmera...");

    const channel = supabase.channel(`live:${liveId}`, {
      config: { broadcast: { self: false } },
    });
    let joinRetry: number | undefined;

    const send = (event: string, payload: Record<string, unknown>) =>
      void channel.send({ type: "broadcast", event, payload });
    sendRef.current = send;

    const closePeers = () => {
      Object.values(peersRef.current).forEach((p) => p.close());
      peersRef.current = {};
      setViewers(0);
    };

    const createPeer = (remoteId: string): RTCPeerConnection => {
      peersRef.current[remoteId]?.close();
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current[remoteId] = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send("ice", { from: myId, to: remoteId, candidate: e.candidate.toJSON() });
        }
      };

      if (!isHost) {
        pc.ontrack = (e) => {
          if (remoteVideoRef.current && e.streams[0]) {
            remoteVideoRef.current.srcObject = e.streams[0];
            remoteVideoRef.current.play().catch(() => {
              setViewerStatus("Toque no vídeo para assistir à transmissão.");
            });
            remoteConnectedRef.current = true;
            setWaiting(false);
            setViewerStatus("Conectado à transmissão");
          }
        };
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected" && !isHost) {
          remoteConnectedRef.current = true;
          setWaiting(false);
          setViewerStatus("Conectado à transmissão");
        }

        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          pc.close();
          delete peersRef.current[remoteId];
          setViewers(Object.keys(peersRef.current).length);
          if (!isHost && !liveEndedRef.current) {
            remoteConnectedRef.current = false;
            setWaiting(true);
            setViewerStatus("Conexão interrompida. Tentando reconectar...");
            send("join", { from: myId });
          }
        }
      };

      if (isHost && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) =>
          pc.addTrack(t, localStreamRef.current!),
        );
      }
      return pc;
    };

    channel
      .on("broadcast", { event: "join" }, async ({ payload }) => {
        if (!isHost) return;
        if (!localStreamRef.current) return;
        const remoteId = payload.from as string;
        const pc = createPeer(remoteId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        setViewers(Object.keys(peersRef.current).length);
        send("offer", { from: myId, to: remoteId, sdp: pc.localDescription });
        if (isHost) {
          const count = Object.keys(peersRef.current).length;
          void supabase.rpc("report_live_viewers" as never, {
            p_live_id: liveId,
            p_viewers: count,
          } as never);
        }
      })
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (isHost) return;
        if (payload.to !== myId) return;
        const remoteId = payload.from as string;
        const pc = createPeer(remoteId);
        await pc.setRemoteDescription(payload.sdp as RTCSessionDescriptionInit);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send("answer", { from: myId, to: remoteId, sdp: pc.localDescription });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.to !== myId) return;
        const pc = peersRef.current[payload.from as string];
        if (pc) await pc.setRemoteDescription(payload.sdp as RTCSessionDescriptionInit);
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload.to !== myId) return;
        const pc = peersRef.current[payload.from as string];
        if (pc && payload.candidate) {
          try {
            await pc.addIceCandidate(payload.candidate as RTCIceCandidateInit);
          } catch {
            /* noop */
          }
        }
      })
      .on("broadcast", { event: "host-ready" }, ({ payload }) => {
        if (isHost) return;
        // Re-announce when host comes online
        setViewerStatus("Criador online. Conectando...");
        send("join", { from: myId, hostId: payload.from });
      })
      .on("broadcast", { event: "host-left" }, () => {
        if (isHost) return;
        remoteConnectedRef.current = false;
        closePeers();
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setWaiting(true);
        setViewerStatus("Transmissão pausada. Aguardando o criador voltar...");
      })
      .on("broadcast", { event: "host-ended" }, () => {
        if (isHost) return;
        liveEndedRef.current = true;
        remoteConnectedRef.current = false;
        closePeers();
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setWaiting(true);
        setViewerStatus("Live encerrada pelo criador.");
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        if (isHost) {
          try {
            setHostPreparing(true);
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: true,
            });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            await localVideoRef.current?.play().catch(() => undefined);
            setHostPreparing(false);
            send("host-ready", { from: myId });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "permissão negada";
            setHostPreparing(false);
            setError("Não foi possível acessar câmera/microfone: " + msg);
            onEndRef.current?.();
          }
        } else {
          setViewerStatus("Aguardando o criador iniciar a câmera...");
          send("join", { from: myId });
          joinRetry = window.setInterval(() => {
            if (!remoteConnectedRef.current && !liveEndedRef.current) {
              send("join", { from: myId });
            }
          }, 4000);
        }
      });

    return () => {
      if (joinRetry) window.clearInterval(joinRetry);
      if (isHost && localStreamRef.current) {
        send("host-left", { from: myId });
      }
      closePeers();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      sendRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [liveId, isHost]);

  const toggleCam = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setCamOn(t.enabled);
    }
  };
  const toggleMic = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setMicOn(t.enabled);
    }
  };

  const handleEnd = () => {
    liveEndedRef.current = true;
    Object.values(peersRef.current).forEach((p) => p.close());
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    sendRef.current?.("host-ended", { from: myIdRef.current });
    onEndRef.current?.();
  };

  return (
    <div className="bg-black">
      <div className="aspect-video w-full relative">
        {isHost ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        )}

        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1 text-[11px] font-bold text-white">
          <Radio className="h-3 w-3 animate-pulse" /> AO VIVO
        </div>
        {isHost && (
          <div className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
            👁 {viewers}
          </div>
        )}

        {waiting && !isHost && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
            <Radio className="h-8 w-8 text-red-400 animate-pulse" />
            <p className="text-sm text-white">{viewerStatus}</p>
          </div>
        )}

        {hostPreparing && isHost && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-white">Preparando câmera e microfone...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4 text-center text-sm text-white">
            {error}
          </div>
        )}
      </div>

      {isHost && (
        <div className="flex items-center justify-center gap-2 bg-black/90 p-2">
          <Button size="sm" variant={camOn ? "secondary" : "destructive"} onClick={toggleCam}>
            {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant={micOn ? "secondary" : "destructive"} onClick={toggleMic}>
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          {onEnd && (
            <Button size="sm" variant="destructive" onClick={handleEnd}>
              Encerrar live
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
