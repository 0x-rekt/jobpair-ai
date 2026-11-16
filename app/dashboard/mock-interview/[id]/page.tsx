"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Phone,
  PhoneOff,
  Mic,
  User,
  Bot,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import {
  Participant,
  Room,
  RoomEvent,
  Track,
  type TranscriptionSegment,
} from "livekit-client";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
  ERROR = "ERROR",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
  timestamp?: Date;
}

interface InterviewDetails {
  id: string;
  userId: string;
  jobRole: string;
  jobDescription: string;
  level: string;
  type: string;
  questions: string[];
  createdAt: string;
}

const MockInterviewPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();

  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [interviewDetails, setInterviewDetails] =
    useState<InterviewDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [room] = useState(() => new Room());

  const getInterviewDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/generate-questions?id=${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch interview details");
      }
      const data = await res.json();
      setInterviewDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === CallStatus.ACTIVE) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    const onConnected = () => {
      setCallStatus(CallStatus.ACTIVE);
      setCallDuration(0);
    };

    const onDisconnected = () => {
      setCallStatus(CallStatus.FINISHED);
      setIsSpeaking(false);
    };

    const onTranscription = (
      segments: TranscriptionSegment[],
      participant?: Participant,
    ) => {
      for (const segment of segments) {
        if (!segment.final || !segment.text.trim()) continue;
        setMessages((prev) => [
          ...prev,
          {
            role:
              participant?.identity === room.localParticipant.identity
                ? "user"
                : "assistant",
            content: segment.text,
            timestamp: new Date(),
          },
        ]);
      }
    };

    const onActiveSpeakersChanged = (speakers: Participant[]) => {
      setIsSpeaking(
        speakers.some(
          (speaker) => speaker.identity !== room.localParticipant.identity,
        ),
      );
    };

    const onRoomError = (err: Error) => {
      console.error("LiveKit error:", err);
      setCallStatus(CallStatus.ERROR);
      setError("Voice connection failed. Please try again.");
    };

    const onTrackSubscribed = (
      track: Track,
      _publication: unknown,
      _participant: Participant,
    ) => {
      if (track.kind === Track.Kind.Audio) {
        track.attach();
      }
    };

    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.TranscriptionReceived, onTranscription);
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.MediaDevicesError, onRoomError);

    return () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.TranscriptionReceived, onTranscription);
      room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.MediaDevicesError, onRoomError);
    };
  }, [room]);

  useEffect(() => {
    if (
      callStatus === CallStatus.FINISHED &&
      interviewDetails &&
      messages.length > 0
    ) {
      generateFeedback(messages);
    }
  }, [callStatus, messages, interviewDetails]);

  const generateFeedback = async (messages: SavedMessage[]) => {
    setIsGeneratingFeedback(true);

    try {
      const res = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: messages,
          interviewId: interviewDetails?.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.feedback) {
        router.push(`/dashboard/mock-interview/${id}/feedback`);
      } else {
        throw new Error("Failed to generate feedback");
      }
    } catch (err) {
      console.error("Feedback generation error:", err);
      setError("Failed to generate feedback. Please try again.");
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);
    setError(null);

    const formattedQuestions = interviewDetails?.questions
      ?.map((q: string) => `- ${q}`)
      .join("\n");

    try {
      const roomName = `interview-${interviewDetails?.id}-${crypto.randomUUID()}`;
      const tokenResponse = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          username: user?.firstName ?? "Candidate",
          questions: formattedQuestions,
        }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error ?? "Failed to create voice session");
      }

      await room.connect(tokenData.serverUrl, tokenData.participantToken);
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (error) {
      console.error("Failed to start LiveKit call:", error);
      setCallStatus(CallStatus.ERROR);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to start the call. Please try again.",
      );
    }
  };

  const handleDisconnect = () => {
    room.disconnect();
    setCallStatus(CallStatus.FINISHED);
  };

  useEffect(
    () => () => {
      void room.disconnect();
    },
    [room],
  );

  useEffect(() => {
    if (id) {
      getInterviewDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (error && !interviewDetails) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isGeneratingFeedback) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Interview Completed!</h2>
            <p className="text-muted-foreground">
              Generating your personalized feedback...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mt-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Mock Interview Session</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{interviewDetails?.level}</Badge>
          <Badge variant="outline">{interviewDetails?.type}</Badge>
          <span>•</span>
          <span>{interviewDetails?.jobRole}</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src="/ai-avatar.png" alt="AI Interviewer" />
                      <AvatarFallback>
                        <Bot className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                    {isSpeaking && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Interviewer</h3>
                    <p className="text-sm text-muted-foreground">
                      {isSpeaking ? "Speaking..." : "Listening"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={user?.imageUrl || "/placeholder.svg"}
                      alt={user?.firstName || "User"}
                    />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">
                      {user?.firstName || "You"}
                    </h3>
                    <p className="text-sm text-muted-foreground">Candidate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      callStatus === CallStatus.ACTIVE
                        ? "bg-green-500 animate-pulse"
                        : callStatus === CallStatus.CONNECTING
                        ? "bg-yellow-500 animate-pulse"
                        : callStatus === CallStatus.FINISHED
                        ? "bg-gray-500"
                        : "bg-red-500"
                    }`}
                  />
                  <div>
                    <p className="font-medium">
                      {callStatus === CallStatus.INACTIVE && "Ready to start"}
                      {callStatus === CallStatus.CONNECTING && "Connecting..."}
                      {callStatus === CallStatus.ACTIVE &&
                        "Interview in progress"}
                      {callStatus === CallStatus.FINISHED &&
                        "Interview completed"}
                      {callStatus === CallStatus.ERROR && "Connection error"}
                    </p>
                    {callStatus === CallStatus.ACTIVE && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(callDuration)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {(() => {
                    switch (callStatus) {
                      case CallStatus.INACTIVE:
                      case CallStatus.ERROR:
                        return (
                          <Button
                            onClick={handleCall}
                            size="lg"
                            className="hover:cursor-pointer"
                          >
                            <Phone className="h-4 w-4 mr-2 " />
                            Start Interview
                          </Button>
                        );
                      case CallStatus.CONNECTING:
                        return (
                          <Button disabled size="lg">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </Button>
                        );
                      case CallStatus.ACTIVE:
                        return (
                          <Button
                            onClick={handleDisconnect}
                            variant="destructive"
                            size="lg"
                            className="hover:cursor-pointer"
                          >
                            <PhoneOff className="h-4 w-4 mr-2" />
                            End Interview
                          </Button>
                        );
                      case CallStatus.FINISHED:
                        return null;
                      default:
                        return null;
                    }
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Live Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div key={index} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          {message.role === "assistant" ? (
                            <AvatarFallback>
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          ) : (
                            <AvatarImage
                              src={user?.imageUrl || "/placeholder.svg"}
                            />
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {message.role === "assistant"
                                ? "AI Interviewer"
                                : "You"}
                            </span>
                            {message.timestamp && (
                              <span className="text-xs text-muted-foreground">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Position
                </p>
                <p className="font-medium">{interviewDetails?.jobRole}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Level
                </p>
                <Badge variant="secondary">{interviewDetails?.level}</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Type
                </p>
                <Badge variant="outline">{interviewDetails?.type}</Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Questions
                </p>
                <p className="font-medium">
                  {interviewDetails?.questions?.length || 0} prepared
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interview Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Mic className="h-4 w-4 mt-0.5 text-blue-500" />
                <p>Speak clearly and at a moderate pace</p>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 text-green-500" />
                <p>Take your time to think before answering</p>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 text-purple-500" />
                <p>Provide specific examples when possible</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MockInterviewPage;
