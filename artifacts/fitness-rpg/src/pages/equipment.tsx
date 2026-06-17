import { useGetEquipment } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";

export default function Equipment() {
  const { data: equipment, isLoading } = useGetEquipment();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Armory" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Armory" subtitle="Your available weapons" />

      <div className="grid grid-cols-1 gap-3">
        {equipment?.map(item => (
          <Card key={item.id} className={`border-border/50 ${item.available ? 'bg-card/50' : 'bg-black/40 opacity-60'}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{item.name}</h3>
                <span className="text-[10px] font-mono uppercase text-muted-foreground border border-border/50 px-1.5 py-0.5 rounded-sm mt-1 inline-block">
                  {item.category}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {item.available ? (
                   <span className="text-xs flex items-center gap-1 text-success"><Check className="w-3 h-3"/> Equipped</span>
                ) : (
                   <span className="text-xs flex items-center gap-1 text-muted-foreground"><X className="w-3 h-3"/> Locked</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
