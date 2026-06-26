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
  const [viewers, setViewers] = useState(0);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(!isHost);
  const [hostPreparing, setHostPreparing] = useState(isHost);

  useEffect(() => {
    const myId = myIdRef.current;
    const channel = supabase.channel(`live:${liveId}`, {
      config: { broadcast: { self: false } },
    });

    const send = (event: string, payload: Record<string, unknown>) =>
      channel.send({ type: "broadcast", event, payload });

    const createPeer = (remoteId: string): RTCPeerConnection => {
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
            setWaiting(false);
          }
        };
      }

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          pc.close();
          delete peersRef.current[remoteId];
          setViewers(Object.keys(peersRef.current).length);
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
        send("join", { from: myId, hostId: payload.from });
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
            setHostPreparing(false);
            send("host-ready", { from: myId });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "permissão negada";
            setHostPreparing(false);
            setError("Não foi possível acessar câmera/microfone: " + msg);
          }
        } else {
          send("join", { from: myId });
        }
      });

    return () => {
      Object.values(peersRef.current).forEach((p) => p.close());
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
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
            <p className="text-sm text-white">Conectando à transmissão...</p>
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
            <Button size="sm" variant="destructive" onClick={onEnd}>
              Encerrar live
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
