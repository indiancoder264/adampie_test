
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { deleteTipAction } from "@/lib/actions";

type TipForTable = {
  id: string;
  userName: string;
  tip: string;
  recipeName: string;
  recipeId: string;
};

type TipsTableProps = {
  tips: TipForTable[];
};

export function TipsTable({ tips }: TipsTableProps) {
  const { toast } = useToast();

  const handleDelete = async (recipeId: string, tipId: string) => {
    const result = await deleteTipAction(recipeId, tipId);
    if (result.success) {
      toast({
        title: "Tip Deleted",
        description: "The tip has been removed.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Moderate Tips</CardTitle>
        <CardDescription>Review and remove user-submitted tips.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Recipe</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tips.map((tip) => (
              <TableRow key={tip.id}>
                <TableCell className="font-medium">{tip.userName}</TableCell>
                <TableCell className="max-w-sm truncate">{tip.tip}</TableCell>
                <TableCell>{tip.recipeName}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(tip.recipeId, tip.id)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
