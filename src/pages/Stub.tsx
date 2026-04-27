import { PageHeader } from "@/components/layout/PageHeader";
import { Sparkles } from "lucide-react";

export function Stub({ title, hint }: { title: string; hint: string }) {
  return (
    <>
      <PageHeader title={title} description="Do zbudowania w samolocie ✈️" />
      <div className="p-6">
        <div className="rounded-lg border border-dashed p-10 text-center max-w-2xl mx-auto">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
            {hint}
          </p>
        </div>
      </div>
    </>
  );
}
