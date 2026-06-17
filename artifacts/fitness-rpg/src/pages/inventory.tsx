import { useGetInventory, useGetStoreItems, usePurchaseStoreItem } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Coins, Backpack } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const { data: inventory, isLoading: isLoadingInv } = useGetInventory();
  const { data: store, isLoading: isLoadingStore } = useGetStoreItems();
  const purchase = usePurchaseStoreItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handlePurchase = (itemId: number) => {
    purchase.mutate({ data: { itemId, quantity: 1 } }, {
      onSuccess: (res) => {
        toast({ title: "Item Acquired", description: res.message });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      },
      onError: (err: any) => {
        toast({ title: "Purchase Failed", description: err.message || "Not enough gold", variant: "destructive" });
      }
    });
  };

  if (isLoadingInv || isLoadingStore) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inventory & Store" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Inventory & Store" />

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-black/40 border border-border/50 h-12">
          <TabsTrigger value="inventory" className="data-[state=active]:bg-card data-[state=active]:text-primary">
            <Backpack className="w-4 h-4 mr-2" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="store" className="data-[state=active]:bg-card data-[state=active]:text-gold">
            <Coins className="w-4 h-4 mr-2" /> Store
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory" className="pt-4 space-y-3">
          {inventory?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-border/50 rounded-lg bg-card/20">
              Your bag is empty.
            </div>
          ) : (
            inventory?.map(item => (
              <Card key={item.id} className="border-border/50 bg-card/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{item.itemName}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="font-mono text-sm border border-border/50 px-2 py-1 rounded bg-black/40">
                    x{item.quantity}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="store" className="pt-4 space-y-3">
          {store?.map(item => (
            <Card key={item.id} className="border-border/50 bg-card/50">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{item.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="font-mono text-sm text-gold font-bold">{item.goldCost} G</div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs border-gold/30 hover:bg-gold/10 hover:text-gold"
                    onClick={() => handlePurchase(item.id)}
                    disabled={purchase.isPending}
                  >
                    Buy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
