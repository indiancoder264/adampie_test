
"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { addOrUpdateTipAction } from "@/lib/actions";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Heart, RotateCw } from "lucide-react";
import type { Recipe, Tip } from "@/lib/recipes";

function TipDisplay({ tip }: { tip: Omit<Tip, 'user_id' | 'created_at'> & {updated_at: string, user_name: string} }) {
  const [displayDate, setDisplayDate] = React.useState("");

  React.useEffect(() => {
    setDisplayDate(new Date(tip.updated_at).toLocaleDateString());
  }, [tip.updated_at]);

  return (
    <div className="p-4 bg-muted rounded-lg">
      <div className="flex justify-between items-start mb-1">
        <p className="font-bold">{tip.user_name}</p>
        <div className="text-right flex-shrink-0 ml-2">
          <StarRating rating={tip.rating} readOnly={true} className="justify-end" />
          {displayDate && (
            <p className="text-xs text-muted-foreground mt-1">
              on {displayDate}
            </p>
          )}
        </div>
      </div>
      <p className="text-muted-foreground">“{tip.tip}”</p>
    </div>
  );
}

export function RecipeInteraction({ 
  recipeId, 
  steps,
  initialTips,
}: { 
  recipeId: string;
  steps?: Recipe['steps'];
  initialTips?: Recipe['tips']; 
}) {
  const { user, toggleFavorite } = useAuth();
  const { toast } = useToast();

  const isFavorite = user?.favorites.includes(recipeId || "");

  const [rating, setRating] = React.useState(0);
  const [tip, setTip] = React.useState("");
  const [cookingStarted, setCookingStarted] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [finishedCooking, setFinishedCooking] = React.useState(false);
  const [isCurrentStepConfirmed, setIsCurrentStepConfirmed] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tips, setTips] = React.useState(initialTips || []);
  
  const userTip = React.useMemo(() => {
    if (!user) return undefined;
    return tips.find((t) => t.user_id === user.id);
  }, [tips, user]);
  
  React.useEffect(() => {
    setCookingStarted(!!userTip);
    setFinishedCooking(!!userTip);
    if (userTip) {
      setRating(userTip.rating);
      setTip(userTip.tip);
    } else {
      setRating(0);
      setTip("");
    }
  }, [userTip]);
  
  // This effect handles the initial state if no steps are provided (e.g., when used just for the heart icon).
  React.useEffect(() => {
      if (!steps || steps.length === 0) {
          setCookingStarted(true);
          setFinishedCooking(true);
      }
  }, [steps]);


  if (!steps) {
      return (
          <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => toggleFavorite(recipeId)}
          >
              <Heart className={cn("h-8 w-8 transition-colors", isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
              <span className="sr-only">Favorite</span>
          </Button>
      );
  }

  const totalSteps = steps.length;

  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
      setIsCurrentStepConfirmed(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setIsCurrentStepConfirmed(false);
    }
  };

  const handleFinishCooking = () => {
    setFinishedCooking(true);
  };

  const handleStartOver = () => {
    setCurrentStep(0);
    setFinishedCooking(false);
    setIsCurrentStepConfirmed(false);
  };

  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Error", description: "Please select a rating.", variant: "destructive" });
      return;
    }
    if (tip.trim() === "") {
      toast({ title: "Error", description: "Please write a tip.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to submit a tip.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const result = await addOrUpdateTipAction(recipeId, { tip, rating }, user);
    setIsSubmitting(false);
    
    if (result.success && result.newTip) {
      // Optimistically update the UI with the new/updated tip
      const existingIndex = tips.findIndex(t => t.id === result.newTip!.id);
      if (existingIndex > -1) {
        setTips(currentTips => {
            const newTips = [...currentTips];
            newTips[existingIndex] = result.newTip!;
            return newTips;
        });
      } else {
        setTips(currentTips => [result.newTip!, ...currentTips]);
      }
      toast({ title: "Success!", description: "Your tip and rating have been submitted." });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  return (
    <>
      <div>
        {!cookingStarted ? (
          <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[280px]">
            <CardHeader>
              <h3 className="font-headline text-2xl md:text-3xl">Ready to Cook?</h3>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">Shall we start the step-by-step guide?</p>
              <Button onClick={() => setCookingStarted(true)}>Start Cooking</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-2xl md:text-3xl">
                  Step {currentStep + 1} / {totalSteps}
                </h3>
                {currentStep > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <RotateCw className="w-5 h-5 text-muted-foreground" />
                        <span className="sr-only">Start Over</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to start over?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your current cooking progress will be lost and you will return to step 1.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleStartOver}>
                          Yes, Start Over
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-lg text-foreground/80 min-h-[120px]">
              <p className="mb-6">{steps[currentStep].description}</p>
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id={`step-confirm-${currentStep}`}
                  checked={isCurrentStepConfirmed}
                  onCheckedChange={(checked) => setIsCurrentStepConfirmed(!!checked)}
                />
                <label
                  htmlFor={`step-confirm-${currentStep}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I have completed this step
                </label>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button onClick={handlePrevStep} disabled={currentStep === 0} variant="outline">
                Previous Step
              </Button>

              {currentStep < totalSteps - 1 ? (
                <Button onClick={handleNextStep} disabled={!isCurrentStepConfirmed}>
                  Next Step
                </Button>
              ) : (
                <Button onClick={handleFinishCooking} disabled={!isCurrentStepConfirmed || finishedCooking}>
                  I&apos;m Done!
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
      </div>

      <div className="mt-12">
        <h2 className="font-headline text-3xl md:text-4xl mb-6 text-center">
          Ratings &amp; Tips
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <h3 className="font-headline text-2xl">Community Tips</h3>
            </CardHeader>
            <CardContent>
              {tips && tips.length > 0 ? (
                <ScrollArea className="h-72">
                  <div className="space-y-4 pr-4">
                    {tips.map((t) => (
                      <TipDisplay key={t.id} tip={t} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-72 items-center justify-center">
                  <p className="text-muted-foreground">No tips yet. Be the first to add one!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {finishedCooking ? (
            <Card>
              <CardHeader>
                <h3 className="font-headline text-2xl">
                  {userTip ? "Edit Your Tip & Rating" : "Leave a Tip & Rating"}
                </h3>
              </CardHeader>
              <CardContent>
                {user ? (
                  <form onSubmit={handleSubmitTip} className="space-y-4">
                    <div>
                      <label className="text-lg font-medium mb-2 block">Your Rating</label>
                      <StarRating rating={rating} onRate={setRating} readOnly={false} />
                    </div>

                    <div>
                      <label htmlFor="tip" className="text-lg font-medium mb-2 block">Your Tip</label>
                      <Textarea id="tip" placeholder="Share your cooking tip or suggestion…" value={tip} onChange={(e) => setTip(e.target.value)} />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : (userTip ? "Update Tip" : "Submit Tip")}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center p-8 bg-muted rounded-lg">
                    <p className="mb-4 text-lg">You must be logged in to leave a tip.</p>
                    <Button asChild>
                      <Link href="/login">Log In</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center p-8 bg-muted rounded-lg flex flex-col items-center justify-center h-full">
              <p className="text-lg font-medium">Complete all cooking steps to leave a rating and tip.</p>
              <p className="text-muted-foreground">Follow the instructions above and click “I&apos;m Done!” to finish.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
