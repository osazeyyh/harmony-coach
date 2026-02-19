import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Mic, FileMusic, Headphones } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-14 items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Music className="h-5 w-5 text-primary" />
            <span>Harmony Coach</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero section */}
        <section className="py-20 md:py-32 px-4">
          <div className="container max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Understand Harmony.
              <br />
              <span className="text-muted-foreground">Sing It Confidently.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Analyze sheet music and audio to see chords, learn harmony parts,
              and practice with real-time pitch feedback. Built for choir
              singers, students, and music teachers.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/analyze/audio">
                <Button size="lg" className="w-full sm:w-auto">
                  <Mic className="mr-2 h-4 w-4" />
                  Analyze Audio
                </Button>
              </Link>
              <Link href="/analyze/sheet">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <FileMusic className="mr-2 h-4 w-4" />
                  Analyze Sheet Music
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container max-w-5xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-10">
              Three Ways to Learn Harmony
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="rounded-full w-10 h-10 bg-primary/10 flex items-center justify-center mb-4">
                    <Mic className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Audio Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Record a melody or upload audio. See detected chords, key,
                    and a simplified score with chord symbols and Roman numeral
                    labels.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="rounded-full w-10 h-10 bg-primary/10 flex items-center justify-center mb-4">
                    <FileMusic className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Sheet Music Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload MusicXML or MIDI files. See clean notation with chord
                    symbols, color-coded harmony, and functional labels. Click
                    any bar to hear it.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="rounded-full w-10 h-10 bg-primary/10 flex items-center justify-center mb-4">
                    <Headphones className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Harmony Practice</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a melody or harmony part and practice along with
                    real-time pitch tracking. Get bar-by-bar feedback on
                    intonation and rhythm.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 px-4">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-10">
              How It Works
            </h2>
            <div className="space-y-8">
              {[
                {
                  step: "1",
                  title: "Input a Song",
                  desc: "Record your voice, upload an audio file, or import sheet music (MusicXML/MIDI).",
                },
                {
                  step: "2",
                  title: "See the Harmony",
                  desc: "The app detects chords, key, and melody — then displays everything on an interactive score with chord symbols and Roman numeral labels.",
                },
                {
                  step: "3",
                  title: "Practice Your Part",
                  desc: "Choose melody or a suggested harmony line. Practice with guided steps: listen first, sing with support, then sing alone with real-time pitch feedback.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <span>Harmony Coach</span>
          </div>
          <p>Built for musicians who want to understand and create harmony.</p>
        </div>
      </footer>
    </div>
  );
}
