"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, FileMusic, Music, TrendingUp } from "lucide-react";

// Placeholder data — will be replaced with Supabase queries
const recentSongs: Array<{
  id: string;
  title: string;
  sourceType: string;
  key: string;
  createdAt: string;
}> = [];

const recentSessions: Array<{
  id: string;
  songTitle: string;
  part: string;
  pitchAccuracy: number;
  createdAt: string;
}> = [];

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Your songs, practice sessions, and progress at a glance.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <Link href="/analyze/audio">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-full w-10 h-10 bg-primary/10 flex items-center justify-center">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Analyze Audio</p>
                  <p className="text-sm text-muted-foreground">
                    Record or upload audio to detect chords and melody
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/analyze/sheet">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-full w-10 h-10 bg-primary/10 flex items-center justify-center">
                  <FileMusic className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Analyze Sheet Music</p>
                  <p className="text-sm text-muted-foreground">
                    Upload MusicXML or MIDI to see notation and chords
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats summary */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Songs Analyzed</CardDescription>
              <CardTitle className="text-3xl">
                {recentSongs.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Practice Sessions</CardDescription>
              <CardTitle className="text-3xl">
                {recentSessions.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. Pitch Accuracy</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {recentSessions.length > 0
                  ? `${Math.round(
                      recentSessions.reduce(
                        (s, r) => s + r.pitchAccuracy,
                        0
                      ) / recentSessions.length
                    )}%`
                  : "--"}
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Recent songs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Recent Songs</CardTitle>
            <CardDescription>
              Songs you&apos;ve analyzed recently
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSongs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="mb-3">No songs analyzed yet</p>
                <div className="flex gap-2 justify-center">
                  <Link href="/analyze/audio">
                    <Button variant="outline" size="sm">
                      Record Audio
                    </Button>
                  </Link>
                  <Link href="/analyze/sheet">
                    <Button variant="outline" size="sm">
                      Upload Sheet Music
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSongs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{song.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {song.key} &middot; {song.createdAt}
                      </p>
                    </div>
                    <Badge variant="secondary">{song.sourceType}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent practice sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Practice</CardTitle>
            <CardDescription>
              Your latest practice sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>
                  No practice sessions yet. Analyze a song first, then
                  practice!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{session.songTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.part} &middot; {session.createdAt}
                      </p>
                    </div>
                    <Badge
                      variant={
                        session.pitchAccuracy >= 80
                          ? "default"
                          : session.pitchAccuracy >= 60
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {session.pitchAccuracy}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
